// Nye imports (hvis du trenger dem senere) pluss eksisterende
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WorkspaceLayout, HistoryItem } from '../WorkspaceLayout';
import { 
  FileText, Settings, Sparkles, Save, CheckCircle2, FileEdit, AlertCircle, Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Underline, Eye, Edit3, Check, RotateCcw, BookOpen, Copy, Download, ChevronRight, ChevronLeft, PanelRightClose, Send, Archive, User,
  Folder, FolderOpen, FolderPlus, Plus, Trash2, X, ArrowUp, ArrowDown, BookMarked, Users, Share2, MessageSquare, Clock, ShieldCheck,
  Undo2, Redo2, StickyNote
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { markdownToHtml, htmlToMarkdown } from '../../lib/wysiwygConverter';
import { CitationAssistantModal } from './CitationAssistantModal';
import { analyzeWithSystemPrompt, analyzeAssignmentText, chatWithSuperveileder } from '../../services/geminiService';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDocs, query, where, deleteDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase'; 
import { DocumentExportModal } from './DocumentExportModal';
import { ShareToCollabModal } from './ShareToCollabModal';
import { PeerReviewShareModal } from './PeerReviewShareModal';
import { DocumentHistoryModal } from './DocumentHistoryModal';
import { saveDocumentSnapshot } from '../../lib/documentBackup';
import { MarginComment, SharedReviewData } from '../PeerReviewReader';

// STEG 1: Nytt interface for mapper
export interface FolderItem {
  id: string;
  name: string;
  isExpanded: boolean; // Styrer om mappen er åpen eller lukket i menyen
  createdAt: string;
}

export interface DocumentItem extends HistoryItem {
  id: string;
  title: string;
  subtitle?: string;
  isPinned?: boolean;
  folderId?: string; // STEG 1: Hvilken mappe dokumentet ligger i (optional for rot-filer)
  content: string;
  taskPrompt: string;
  template: string;
  targetWords: number;
  updatedAt: string;
  outline?: { id: number; title: string; subItems: string[] }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

export interface ProcessLogEntry {
  id: string;
  userId: string;
  folderId?: string | null;
  folderName?: string | null;
  documentId: string;
  documentTitle: string;
  category: string;
  situation: string;
  reflection: string;
  sources?: string;
  createdAt?: any;
  updatedAt?: string;
}

const STORAGE_KEY = 'blu_writing_workshop_docs_v2';
const FOLDERS_STORAGE_KEY = 'blu_writing_workshop_folders_v1';

// STEG 1: Mock-data for mapper
const INITIAL_FOLDERS: FolderItem[] = [
  { id: 'f1', name: 'Praksis H26', isExpanded: true, createdAt: new Date().toISOString() },
  { id: 'f2', name: 'Pedagogikk', isExpanded: false, createdAt: new Date().toISOString() }
];

const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: '1',
    title: 'Tolkning av medvirkning i barnehagen',
    subtitle: 'Refleksjonsnotat • Sist endret i dag',
    isPinned: true,
    folderId: 'f2', // Ligger i "Pedagogikk"-mappen
    template: 'Refleksjonsnotat',
    targetWords: 1500,
    taskPrompt: 'Drøft hvordan barns rett til medvirkning kan ivaretas i hverdagsaktiviteter i barnehagen med utgangspunkt i Rammeplanen og FN-konvensjonen om barnets rettigheter.',
    content: `# Tolkning av barns medvirkning i barnehagehverdagen\n\nBarnehagen skal anerkjenne og ivareta barndommens egenverdi. Barn har rett til å gi uttrykk for sine synspunkter på barnehagens daglige virksomhet, jf. Barnehageloven § 3.\n\n## Teoretisk forankring\nMedvirkning handler ikke bare om formelle valg, men om å bli lyttet til og tatt på alvor i de små, uformelle stundene:\n- **Anerkjennelse:** Personalets evne til å lytte med et "tredje øre" (Bae, 2012).\n- **Demokratisk praksis:** Barn som aktive samfunnsborgere i fellesskapet.\n\n## Didaktisk refleksjon\nI samlingsstunden observerte jeg hvordan en treåring viste motstand mot en planlagt aktivitet. I stedet for å korrigere, valgte vi å undersøke barnets intensjon...`,
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Ideer til utedag for 3-åringer',
    subtitle: 'Praksisoppgave • Sist endret i går',
    isPinned: false,
    folderId: 'f1', // Ligger i "Praksis H26"-mappen
    template: 'Praksisfortelling',
    targetWords: 800,
    taskPrompt: 'Planlegg og begrunn et pedagogisk opplegg i naturen for de yngste barna med fokus på sanser og motorisk mestring.',
    content: `# Utedag med sanseopplevelser i skogen\n\n## Mål for opplegget\nBarna skal få erfare naturens mangfold gjennom berøring, bevegelse og utforskning i ulendt terreng.\n\n### Planlagte aktiviteter:\n- Samle kongler og blader til et felles naturmosaikk\n- Balansere på falne trestammer med støtte fra pedagogen\n- Lytte til skogens lyder under samlingsstund under grantrærne`,
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '3',
    title: 'Notater til bachelor',
    subtitle: 'Bacheloroppgave • Sist endret akkurat nå',
    isPinned: false,
    folderId: undefined, // Ligger løst utenfor mapper (i roten)
    template: 'Bacheloroppgave',
    targetWords: 8000,
    taskPrompt: 'Problemstilling...',
    content: `# Arbeidstittel\n\nLitt rotete notater...`,
    updatedAt: new Date().toISOString()
  }
];

export function WritingWorkshop(_props?: { [key: string]: any }) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDocId, setActiveDocId] = useState<string>('');

  // Legg til dette rett under setDocuments / setActiveDocId
  const [folders, setFolders] = useState<FolderItem[]>(() => {
    try {
      const saved = localStorage.getItem(FOLDERS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse folders from localStorage', e);
    }
    return INITIAL_FOLDERS;
  });

  // Legg til en useEffect for å lagre mapper lokalt i mellomtiden
  useEffect(() => {
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error('Failed to save folders', e);
    }
  }, [folders]);

  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Henter dokumenter og mapper fra Firestore ved innlasting
  useEffect(() => {
    const fetchData = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        setDocuments(INITIAL_DOCUMENTS);
        setFolders(INITIAL_FOLDERS);
        setIsLoadingDocs(false);
        return;
      }

      try {
        // Hent dokumenter
        const docQ = query(collection(db, 'documents'), where('userId', '==', user.uid));
        const docSnapshot = await getDocs(docQ);
        if (!docSnapshot.empty) {
          const fetchedDocs = docSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentItem));
          fetchedDocs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          setDocuments(fetchedDocs);
          setActiveDocId(fetchedDocs[0].id);
        } else {
          setDocuments(INITIAL_DOCUMENTS);
          setActiveDocId(INITIAL_DOCUMENTS[0].id);
        }

        // Hent mapper
        const folderQ = query(collection(db, 'folders'), where('userId', '==', user.uid));
        const folderSnapshot = await getDocs(folderQ);
        if (!folderSnapshot.empty) {
          const fetchedFolders = folderSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FolderItem));
          setFolders(fetchedFolders);
        } else {
          setFolders([]); // Tom hvis brukeren ikke har laget mapper enda
        }
      } catch (error) {
        console.error("Feil ved henting av data fra skyen:", error);
      } finally {
        setIsLoadingDocs(false);
      }
    };

    fetchData();

    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchData();
      }
    });

    return () => unsubscribe();
  }, []);

  // Sjekker om det ligger et importert utkast fra Didaktisk Planlegger (eller andre moduler)
  useEffect(() => {
    try {
      const pendingRaw = localStorage.getItem('blu_pending_workshop_import');
      if (pendingRaw) {
        const payload = JSON.parse(pendingRaw);
        if (payload && payload.title) {
          localStorage.removeItem('blu_pending_workshop_import');
          const newDocId = 'imported_' + Date.now();
          const newDoc: DocumentItem = {
            id: newDocId,
            title: payload.title,
            content: payload.content || '',
            template: payload.template || 'Praksisfortelling/Praksisoppgave',
            taskPrompt: payload.taskPrompt || '',
            targetWords: payload.targetWords || 1500,
            updatedAt: new Date().toISOString()
          };

          setDocuments(prev => [newDoc, ...prev.filter(d => d.id !== newDocId)]);
          setActiveDocId(newDocId);
          saveDocToFirebase(newDoc);
        }
      }
    } catch (err) {
      console.error('Feil ved lesing av importert dokument i Skriveverksted:', err);
    }
  }, []);

  // Hjelpefunksjon for å lagre et spesifikt dokument til skyen
  const saveDocToFirebase = async (docToSave: DocumentItem) => {
    try {
      const user = getAuth().currentUser;
      if (!user) return;
      
      const docRef = doc(db, 'documents', docToSave.id);
      await setDoc(docRef, { ...docToSave, userId: user.uid }, { merge: true });
    } catch (error) {
      console.error("Feil ved lagring av dokument:", error);
    }
  };

  // Ny hjelpefunksjon for å lagre mapper
  const saveFolderToFirebase = async (folder: FolderItem) => {
    try {
      const user = getAuth().currentUser;
      if (!user) return;
      
      const folderRef = doc(db, 'folders', folder.id);
      await setDoc(folderRef, { ...folder, userId: user.uid }, { merge: true });
    } catch (error) {
      console.error("Feil ved lagring av mappe:", error);
    }
  };

  // State for Ny Mappe modal
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    const newFolder: FolderItem = {
      id: 'folder_' + Date.now(),
      name: newFolderName.trim(),
      isExpanded: true,
      createdAt: new Date().toISOString()
    };
    
    setFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
    setIsCreatingFolder(false);
    
    // Lagre til skyen
    await saveFolderToFirebase(newFolder);
  };

  const handleMoveDoc = (docId: string, folderId: string | undefined) => {
    setDocuments(prev => {
      const updatedDocs = prev.map(d => {
        if (d.id === docId) {
          const updated = { ...d, folderId, updatedAt: new Date().toISOString() };
          // Lagrer umiddelbart til skyen når et dokument flyttes
          saveDocToFirebase(updated); 
          return updated;
        }
        return d;
      });
      return updatedDocs;
    });
  };

  const [viewMode, setViewMode] = useState<'editor' | 'setup' | 'quality-check'>('editor');
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPeerReviewShareModalOpen, setIsPeerReviewShareModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(() => new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }));
  const [lastLocalSyncTime, setLastLocalSyncTime] = useState<string | null>(() => new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }));
  const [syncState, setSyncState] = useState<'synced' | 'saving' | 'offline'>('synced');

  const [peerComments, setPeerComments] = useState<MarginComment[]>([]);
  const [peerReviewData, setPeerReviewData] = useState<SharedReviewData | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [outline, setOutline] = useState<{ id: number; title: string; subItems: string[] }[]>([]);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [activeSubItemInput, setActiveSubItemInput] = useState<{ chapterIdx: number; text: string } | null>(null);

  // State for sidepanel
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<'superveileder' | 'prosesslogg' | 'respons'>('superveileder');

  // Lytt til kommentarer og respons fra medstudenter for det aktive dokumentet i sanntid
  useEffect(() => {
    if (!activeDocId) {
      setPeerComments([]);
      return;
    }

    const reviewId = `rev_${activeDocId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const docRef = doc(db, 'shared_reviews', reviewId);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as SharedReviewData;
          setPeerReviewData(data);
          setPeerComments(Array.isArray(data.comments) ? data.comments : []);
        } else {
          // Fallback til lokal lagring
          const cached = localStorage.getItem(`blu_shared_review_${reviewId}`);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              setPeerReviewData(parsed);
              setPeerComments(Array.isArray(parsed.comments) ? parsed.comments : []);
            } catch {}
          } else {
            setPeerReviewData(null);
            setPeerComments([]);
          }
        }
      },
      () => {
        const cached = localStorage.getItem(`blu_shared_review_${reviewId}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setPeerReviewData(parsed);
            setPeerComments(Array.isArray(parsed.comments) ? parsed.comments : []);
          } catch {}
        }
      }
    );

    return () => unsubscribe();
  }, [activeDocId]);
  
  const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content: 'Hei! Jeg er Superveilederen. Står du fast med oppgaven din, eller ønsker du at vi drøfter teksten sammen?'
  };

  // State for Superveileder Chat
  const [chatMode, setChatMode] = useState('Auto');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatSyncing, setIsChatSyncing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatLoading]);

  // STEG 5: State for Prosesslogg
  const [logCategory, setLogCategory] = useState('Praksisfortelling');
  const [logSituation, setLogSituation] = useState('');
  const [logReflection, setLogReflection] = useState('');
  const [logSources, setLogSources] = useState('');
  const [logSaveNotice, setLogSaveNotice] = useState<string | null>(null);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [savedProcessLogs, setSavedProcessLogs] = useState<ProcessLogEntry[]>([]);
  const [isProcessLogsLoading, setIsProcessLogsLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const templates: Record<string, { id: number; title: string; subItems: string[] }[]> = {
    'Refleksjons- og diskusjonsoppgave': [
      { id: 1, title: 'Introduksjon', subItems: [] },
      { id: 2, title: 'Situasjonsbeskrivelse', subItems: [] },
      { id: 3, title: 'Drøfting', subItems: ['Ulike perspektiver'] },
      { id: 4, title: 'Teoretisk forankring', subItems: [] },
      { id: 5, title: 'Oppsummering', subItems: [] },
      { id: 6, title: 'Litteraturliste', subItems: [] }
    ],
    'Refleksjonsnotat': [
      { id: 1, title: 'Praksisfortelling', subItems: [] },
      { id: 2, title: 'Egne reaksjoner', subItems: [] },
      { id: 3, title: 'Faglig analyse', subItems: [] },
      { id: 4, title: 'Kritisk refleksjon', subItems: [] },
      { id: 5, title: 'Litteraturliste', subItems: [] }
    ],
    'Observasjon og dokumentasjon': [
      { id: 1, title: 'Mål og hensikt', subItems: [] },
      { id: 2, title: 'Observasjonsmetode', subItems: [] },
      { id: 3, title: 'Selve observasjonen (Data)', subItems: [] },
      { id: 4, title: 'Tolkning og analyse', subItems: [] },
      { id: 5, title: 'Litteraturliste', subItems: [] }
    ],
    'Pedagogisk planlegging og vurdering': [
      { id: 1, title: 'Didaktisk plan', subItems: [] },
      { id: 2, title: 'Gjennomføring', subItems: [] },
      { id: 3, title: 'Evaluering', subItems: [] },
      { id: 4, title: 'Litteraturliste', subItems: [] }
    ],
    'Bacheloroppgave': [
      { id: 1, title: 'Innledning', subItems: ['Problemstilling', 'Begrunnelse', 'Avgrensning'] },
      { id: 2, title: 'Teori og tidligere forskning', subItems: [] },
      { id: 3, title: 'Metode og etikk', subItems: ['Design', 'Utvalg', 'Analyse'] },
      { id: 4, title: 'Forskningsetiske vurderinger', subItems: ['Anonymisering', 'Samtykke'] },
      { id: 5, title: 'Resultater', subItems: ['Presentasjon av funn'] },
      { id: 6, title: 'Litteraturliste', subItems: [] }
    ],
    'Prosjektarbeid': [
      { id: 1, title: 'Innledning', subItems: [] }, 
      { id: 2, title: 'Gjennomføring', subItems: [] }, 
      { id: 3, title: 'Avslutning', subItems: [] },
      { id: 4, title: 'Litteraturliste', subItems: [] }
    ],
    'Fagtekst': [
      { id: 1, title: 'Innledning', subItems: [] }, 
      { id: 2, title: 'Hoveddel', subItems: [] }, 
      { id: 3, title: 'Avslutning', subItems: [] },
      { id: 4, title: 'Litteraturliste', subItems: [] }
    ],
    'Obligatorisk arbeidskrav': [
      { id: 1, title: 'Innledning', subItems: [] }, 
      { id: 2, title: 'Hoveddel', subItems: [] }, 
      { id: 3, title: 'Avslutning', subItems: [] },
      { id: 4, title: 'Litteraturliste', subItems: [] }
    ],
    'Praksisfortelling/Praksisoppgave': [
      { id: 1, title: 'Kontekst', subItems: [] }, 
      { id: 2, title: 'Fortelling', subItems: [] }, 
      { id: 3, title: 'Refleksjon', subItems: [] },
      { id: 4, title: 'Litteraturliste', subItems: [] }
    ],
    'Notater & Kladdeblokk': [
      { id: 1, title: 'Notater, idéer og kladder', subItems: [] }
    ],
    'Egendefinert struktur': [
      { id: 1, title: 'Nytt kapittel', subItems: [] },
      { id: 2, title: 'Litteraturliste', subItems: [] }
    ]
  };

  const activeDoc = documents.find(d => d.id === activeDocId) || documents[0] || {
    id: 'temp',
    title: 'Nytt dokument',
    content: '',
    taskPrompt: '',
    template: 'Refleksjonsnotat',
    targetWords: 1000,
    updatedAt: new Date().toISOString()
  };

  const activeFolder = folders.find(f => f.id === activeDoc?.folderId);
  const activeContextKey = activeDoc?.folderId 
    ? `folder_${activeDoc.folderId}` 
    : (activeDoc?.id ? `doc_${activeDoc.id}` : 'global');
  const activeContextTitle = activeDoc?.folderId 
    ? (activeFolder?.name || 'Aktiv mappe') 
    : (activeDoc?.title || 'Aktiv oppgave');

  // Superveilederen: Sanntids-synkronisering og automatisk lagring knyttet til aktiv mappe / oppgave
  useEffect(() => {
    if (!activeContextKey) return;

    const auth = getAuth();
    const user = auth.currentUser;

    // 1. Last umiddelbart fra lokal hurtigbuffer for null ventetid
    const localKey = `blu_superveileder_${user?.uid || 'guest'}_${activeContextKey}`;
    try {
      const cached = localStorage.getItem(localKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        } else {
          setMessages([DEFAULT_WELCOME_MESSAGE]);
        }
      } else {
        setMessages([DEFAULT_WELCOME_MESSAGE]);
      }
    } catch {
      setMessages([DEFAULT_WELCOME_MESSAGE]);
    }

    if (!user) return;

    // 2. Koble på sanntidslytter mot Firebase Firestore
    setIsChatSyncing(true);
    const chatDocRef = doc(db, 'users', user.uid, 'superveileder_chats', activeContextKey);
    const unsubscribe = onSnapshot(chatDocRef, (snapshot) => {
      setIsChatSyncing(false);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data?.messages) && data.messages.length > 0) {
          setMessages(data.messages);
          try {
            localStorage.setItem(localKey, JSON.stringify(data.messages));
          } catch {}
        }
      }
    }, (error) => {
      console.warn("Lokal modus for Superveileder-chat:", error);
      setIsChatSyncing(false);
    });

    return () => unsubscribe();
  }, [activeContextKey]);

  // Prosesslogg: Henter alle prosesslogger for brukeren og sorterer etter dato
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      setSavedProcessLogs([]);
      return;
    }

    setIsProcessLogsLoading(true);
    const q = query(
      collection(db, 'processLogs'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsProcessLogsLoading(false);
      const logs: ProcessLogEntry[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as ProcessLogEntry));

      logs.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (new Date(a.updatedAt || 0).getTime());
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (new Date(b.updatedAt || 0).getTime());
        return timeB - timeA;
      });

      setSavedProcessLogs(logs);
    }, (err) => {
      console.warn("Kunne ikke lytte på prosesslogger:", err);
      setIsProcessLogsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const contextProcessLogs = savedProcessLogs.filter(log => {
    if (activeDoc?.folderId) {
      return log.folderId === activeDoc.folderId || log.documentId === activeDoc.id;
    }
    return log.documentId === activeDoc.id;
  });

  const saveChatToFirebase = async (newMessages: ChatMessage[]) => {
    const user = getAuth().currentUser;
    const localKey = `blu_superveileder_${user?.uid || 'guest'}_${activeContextKey}`;
    
    // Alltid lagre lokalt først for umiddelbar respons
    try {
      localStorage.setItem(localKey, JSON.stringify(newMessages));
    } catch {}

    if (!user) return;

    try {
      const chatDocRef = doc(db, 'users', user.uid, 'superveileder_chats', activeContextKey);
      await setDoc(chatDocRef, {
        userId: user.uid,
        contextId: activeContextKey,
        folderId: activeDoc?.folderId || null,
        folderName: activeFolder?.name || null,
        documentId: activeDoc?.id || null,
        documentTitle: activeDoc?.title || null,
        messages: newMessages,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error("Feil ved lagring av Superveileder-chat til skyen:", err);
    }
  };

  const handleClearChat = async () => {
    const targetLabel = activeDoc?.folderId ? `mappen «${activeFolder?.name || 'Aktiv mappe'}»` : `oppgaven «${activeDoc?.title || 'Aktiv oppgave'}»`;
    if (!window.confirm(`Er du sikker på at du vil starte en ny samtale for ${targetLabel}? Tidligere samtalehistorikk for denne vil bli tømt.`)) {
      return;
    }
    const freshMessages = [DEFAULT_WELCOME_MESSAGE];
    setMessages(freshMessages);
    await saveChatToFirebase(freshMessages);
  };

  // Offline-deteksjon og automatisk gjenoppretting av nettkobling (Punkt 5)
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncState('saving');
      if (activeDoc) {
        saveDocToFirebase(activeDoc)
          .then(() => {
            setSyncState('synced');
            setLastCloudSyncTime(new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }));
          })
          .catch(() => setSyncState('synced'));
      } else {
        setSyncState('synced');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncState('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeDoc]);

  const handleUpdateActiveDoc = (fields: Partial<DocumentItem>) => {
    setDocuments(prev => {
      const updatedDocs = prev.map(d => {
        if (d.id === activeDocId) {
          const updatedDoc = { ...d, ...fields, updatedAt: new Date().toISOString() };
          
          // 1. Alltid umiddelbar lokal backup og øyeblikksbilde i nettleseren (Punkt 5)
          const localTime = new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
          setLastLocalSyncTime(localTime);
          saveDocumentSnapshot(
            updatedDoc.id, 
            updatedDoc.title, 
            typeof updatedDoc.content === 'string' ? updatedDoc.content : '', 
            'autosave'
          );

          if (!navigator.onLine) {
            setSyncState('offline');
            return updatedDoc;
          }

          // 2. Skysynkronisering (debounced)
          setSyncState('saving');
          if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
          }
          
          saveTimerRef.current = setTimeout(async () => {
            try {
              await saveDocToFirebase(updatedDoc);
              setSyncState('synced');
              setLastCloudSyncTime(new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }));
            } catch (e) {
              console.warn('Kunne ikke synkronisere til Firestore akkurat nå, lokal kopi er sikret:', e);
              setSyncState('offline');
            }
          }, 3500);
          
          return updatedDoc;
        }
        return d;
      });
      return updatedDocs;
    });
  };

  const getCurrentOutline = () => {
    if (outline.length > 0) return outline;
    if (activeDoc.outline && Array.isArray(activeDoc.outline) && activeDoc.outline.length > 0) return activeDoc.outline;
    const key = selectedTemplate || activeDoc.template || 'Refleksjonsnotat';
    return templates[key] || templates['Refleksjonsnotat'] || [];
  };

  // Synkroniser outline når aktivt dokument endres
  useEffect(() => {
    if (activeDoc?.outline && Array.isArray(activeDoc.outline) && activeDoc.outline.length > 0) {
      setOutline(activeDoc.outline);
    } else {
      const key = selectedTemplate || activeDoc?.template || 'Refleksjonsnotat';
      if (templates[key]) {
        setOutline([...templates[key]]);
      } else {
        setOutline([]);
      }
    }
  }, [activeDocId]);

  const handleSelectTemplate = (templateName: string) => {
    setSelectedTemplate(templateName);
    const newOutline = templates[templateName]
      ? [...templates[templateName]]
      : [{ id: Date.now(), title: 'Innledning', subItems: [] }];
    setOutline(newOutline);
    handleUpdateActiveDoc({ template: templateName, outline: newOutline });
  };

  const handleAddChapter = (titleToAdd?: string) => {
    const title = (titleToAdd || newChapterTitle).trim();
    if (!title) return;
    const baseList = [...getCurrentOutline()];
    const updated = [...baseList, { id: Date.now(), title, subItems: [] }];
    setOutline(updated);
    handleUpdateActiveDoc({ outline: updated });
    setNewChapterTitle('');
  };

  const handleUpdateChapter = (index: number, newTitle: string) => {
    const baseList = [...getCurrentOutline()];
    if (baseList[index]) {
      baseList[index] = { ...baseList[index], title: newTitle };
      setOutline(baseList);
      handleUpdateActiveDoc({ outline: baseList });
    }
  };

  const handleRemoveChapter = (index: number) => {
    const baseList = [...getCurrentOutline()];
    const updated = baseList.filter((_, i) => i !== index);
    setOutline(updated);
    handleUpdateActiveDoc({ outline: updated });
  };

  const handleMoveChapterUp = (index: number) => {
    if (index <= 0) return;
    const baseList = [...getCurrentOutline()];
    const [movedItem] = baseList.splice(index, 1);
    baseList.splice(index - 1, 0, movedItem);
    setOutline(baseList);
    handleUpdateActiveDoc({ outline: baseList });
  };

  const handleMoveChapterDown = (index: number) => {
    const baseList = [...getCurrentOutline()];
    if (index >= baseList.length - 1) return;
    const [movedItem] = baseList.splice(index, 1);
    baseList.splice(index + 1, 0, movedItem);
    setOutline(baseList);
    handleUpdateActiveDoc({ outline: baseList });
  };

  const handleAddSubItem = (chapterIdx: number, subItemText: string) => {
    if (!subItemText.trim()) return;
    const baseList = [...getCurrentOutline()];
    if (baseList[chapterIdx]) {
      baseList[chapterIdx] = {
        ...baseList[chapterIdx],
        subItems: [...baseList[chapterIdx].subItems, subItemText.trim()]
      };
      setOutline(baseList);
      handleUpdateActiveDoc({ outline: baseList });
    }
  };

  const handleRemoveSubItem = (chapterIdx: number, subItemIdx: number) => {
    const baseList = [...getCurrentOutline()];
    if (baseList[chapterIdx]) {
      baseList[chapterIdx] = {
        ...baseList[chapterIdx],
        subItems: baseList[chapterIdx].subItems.filter((_, i) => i !== subItemIdx)
      };
      setOutline(baseList);
      handleUpdateActiveDoc({ outline: baseList });
    }
  };

  const handleApplyOutline = () => {
    const listToApply = getCurrentOutline();
    if (!listToApply.length) return;
    let generatedMarkdown = `\n\n# Disposisjon: ${selectedTemplate || activeDoc.template || activeDoc.title}\n\n`;
    listToApply.forEach(sec => {
      generatedMarkdown += `## ${sec.title}\n\n[Skriv innhold her...]\n\n`;
      sec.subItems.forEach(sub => {
        generatedMarkdown += `### ${sub}\n\n[Underpunkt-innhold...]\n\n`;
      });
    });
    handleUpdateActiveDoc({ content: (activeDoc.content ? activeDoc.content + '\n' : '') + generatedMarkdown });
    setViewMode('editor');
  };

  const handleSendMessage = async (textOverride?: string) => {
    const userText = (textOverride || chatInput).trim();
    if (!userText || isChatLoading) return;

    if (!textOverride) {
      setChatInput(''); 
    }

    // Filtrer ut feilmeldinger fra samtalen så de ikke forurenser konteksten
    const cleanHistory = messages.filter(m => !m.isError && !(typeof m.content === 'string' && (m.content.includes("stor pågang") || m.content.includes("Kapasitetsgrensen") || m.content.includes("429 Rate limit"))));

    const isRetry = Boolean(textOverride);
    const lastIsSameUser = isRetry && cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === 'user';

    const currentMessages: ChatMessage[] = lastIsSameUser 
      ? cleanHistory 
      : [...cleanHistory, { id: Date.now().toString(), role: 'user', content: userText }];
    
    setMessages(currentMessages);
    setIsChatLoading(true);

    // Lagrer samtalen umiddelbart til skyen og lokal buffer
    saveChatToFirebase(currentMessages);

    try {
      // Kaller Gemini og sender med historikk, valgt modus og teksten studenten jobber med
      const responseText = await chatWithSuperveileder({
        messages: currentMessages,
        mode: chatMode,
        docContent: typeof activeDoc.content === 'string' ? activeDoc.content : '',
        docTitle: activeDoc.title,
        taskPrompt: activeDoc.taskPrompt || ''
      });

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText
      };
      
      const finalMessages = [...currentMessages.filter(m => !m.isError), aiResponse];
      setMessages(finalMessages);
      saveChatToFirebase(finalMessages);
    } catch (error: any) {
      console.error("Feil ved kommunikasjon med Gemini:", error);
      const errMsg = error?.message || (typeof error === 'string' ? error : '');
      const displayMsg = errMsg 
        ? errMsg 
        : "Superveilederen opplever stor pågang akkurat nå. Vent noen sekunder og prøv igjen.";
      const errorMessages = [...currentMessages, {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: displayMsg,
        isError: true
      }];
      setMessages(errorMessages);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!activeDoc.content || typeof activeDoc.content !== 'string' || !activeDoc.content.trim()) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const systemPrompt = `Du er en erfaren sensor og veileder ved barnehagelærerutdanningen (BLU). Gi en grundig, konstruktiv og akademisk vurdering av studentens oppgaveutkast.
Strukturer tilbakemeldingen med Markdown-overskrifter:
### 🌟 Helhetsinntrykk og faglige styrker
### 📊 Vurdering mot akademiske kriterier (Rød tråd, teori og praksis, rammeplan, drøfting og kildebruk)
### 🛠️ Konkrete forbedringspunkter for neste utkast
### 🎯 Veiledende nivå`;

      const prompt = `Oppgavetekst / Problemstilling: ${activeDoc.taskPrompt || 'Ikke oppgitt'}
Oppgavetype: ${activeDoc.template || 'Refleksjonsnotat'}

Studenttekst:
${activeDoc.content}`;

      const result = await analyzeWithSystemPrompt(prompt, systemPrompt);
      const resultText = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      setAnalysisResult(resultText);
    } catch (err: any) {
      console.error(err);
      setAnalysisResult(err?.message || "Kunne ikke fullføre analysen. Prøv igjen senere.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [editorMode, setEditorMode] = useState<'wysiwyg' | 'markdown'>('wysiwyg');
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [activeHeading, setActiveHeading] = useState<'h1' | 'h2' | 'h3' | 'p' | null>(null);
  const [activeStyles, setActiveStyles] = useState<{
    bold: boolean;
    italic: boolean;
    underline: boolean;
    ul: boolean;
    ol: boolean;
    quote: boolean;
  }>({
    bold: false,
    italic: false,
    underline: false,
    ul: false,
    ol: false,
    quote: false
  });

  const wysiwygRef = useRef<HTMLDivElement>(null);
  const activeDocContentRef = useRef<string>('');
  activeDocContentRef.current = typeof activeDoc?.content === 'string' ? activeDoc.content : '';

  const wysiwygCallbackRef = useCallback((node: HTMLDivElement | null) => {
    wysiwygRef.current = node;
    if (node) {
      const targetHtml = markdownToHtml(activeDocContentRef.current);
      if (node.innerHTML !== targetHtml) {
        node.innerHTML = targetHtml;
      }
    }
  }, []);

  const isUserTypingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sjekker aktiv formatering for verktøylinje-knapper i sanntid
  const checkActiveFormatting = useCallback(() => {
    if (editorMode !== 'wysiwyg' || !wysiwygRef.current) return;
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode) return;

    let node: Node | null = selection.anchorNode;
    let foundHeading: 'h1' | 'h2' | 'h3' | 'p' | null = null;
    let isQuote = false;

    while (node && node !== wysiwygRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = (node as HTMLElement).tagName.toLowerCase();
        if (tag === 'h1') foundHeading = 'h1';
        else if (tag === 'h2') foundHeading = 'h2';
        else if (tag === 'h3') foundHeading = 'h3';
        else if (tag === 'blockquote') isQuote = true;
      }
      node = node.parentNode;
    }

    setActiveHeading(foundHeading);
    setActiveStyles({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      ul: document.queryCommandState('insertUnorderedList'),
      ol: document.queryCommandState('insertOrderedList'),
      quote: isQuote
    });
  }, [editorMode]);

  // ==========================================
  // ANGRE (UNDO) & GJENTA (REDO) HISTORIKK
  // ==========================================
  const historyStackRef = useRef<{ id: string; content: string }[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const typingDebounceTimerRef = useRef<any>(null);
  const isHistoryNavigatingRef = useRef(false);

  // Initialiser historikk når et dokument lastes inn eller byttes
  useEffect(() => {
    if (!activeDoc?.id) return;
    if (typingDebounceTimerRef.current) {
      clearTimeout(typingDebounceTimerRef.current);
      typingDebounceTimerRef.current = null;
    }
    const initialContent = typeof activeDoc.content === 'string' ? activeDoc.content : '';
    historyStackRef.current = [{ id: activeDoc.id, content: initialContent }];
    historyIndexRef.current = 0;
    setCanUndo(false);
    setCanRedo(false);
  }, [activeDoc?.id]);

  // Lagre øyeblikksbilde i historikkstakken
  const pushHistorySnapshot = useCallback((newContent: string, immediate = false) => {
    if (isHistoryNavigatingRef.current) return;

    const stack = historyStackRef.current;
    const currentIndex = historyIndexRef.current;
    const currentItem = currentIndex >= 0 && currentIndex < stack.length ? stack[currentIndex] : null;

    if (currentItem && currentItem.content === newContent) return;

    const commitSnapshot = () => {
      if (isHistoryNavigatingRef.current) return;
      const currentStack = historyStackRef.current;
      const cIndex = historyIndexRef.current;
      const truncated = currentStack.slice(0, cIndex + 1);
      truncated.push({ id: activeDoc?.id || '', content: newContent });
      if (truncated.length > 50) {
        truncated.shift();
      }
      historyStackRef.current = truncated;
      historyIndexRef.current = truncated.length - 1;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(false);
    };

    if (immediate) {
      if (typingDebounceTimerRef.current) {
        clearTimeout(typingDebounceTimerRef.current);
        typingDebounceTimerRef.current = null;
      }
      commitSnapshot();
    } else {
      if (typingDebounceTimerRef.current) {
        clearTimeout(typingDebounceTimerRef.current);
      }
      typingDebounceTimerRef.current = setTimeout(commitSnapshot, 400);
    }
  }, [activeDoc?.id]);

  // Registrer løpende endringer i dokumentinnhold for angre-historikk
  useEffect(() => {
    if (isHistoryNavigatingRef.current || !activeDoc?.id) return;
    const currentContent = typeof activeDoc.content === 'string' ? activeDoc.content : '';
    pushHistorySnapshot(currentContent, false);
  }, [activeDoc?.content, activeDoc?.id, pushHistorySnapshot]);

  // Angre-handling (Word-stil)
  const handleUndo = useCallback(() => {
    const currentDocContent = typeof activeDoc?.content === 'string' ? activeDoc.content : '';

    if (typingDebounceTimerRef.current) {
      clearTimeout(typingDebounceTimerRef.current);
      typingDebounceTimerRef.current = null;
      const currentIndex = historyIndexRef.current;
      const topItem = currentIndex >= 0 ? historyStackRef.current[currentIndex] : null;
      if (topItem && topItem.content !== currentDocContent) {
        const truncated = historyStackRef.current.slice(0, currentIndex + 1);
        truncated.push({ id: activeDoc?.id || '', content: currentDocContent });
        historyStackRef.current = truncated;
        historyIndexRef.current = truncated.length - 1;
      }
    }

    const stack = historyStackRef.current;
    const currentIndex = historyIndexRef.current;

    if (currentIndex <= 0) return;

    const targetIndex = currentIndex - 1;
    const targetItem = stack[targetIndex];
    if (!targetItem) return;

    historyIndexRef.current = targetIndex;
    setCanUndo(targetIndex > 0);
    setCanRedo(true);

    isHistoryNavigatingRef.current = true;
    isUserTypingRef.current = false;

    handleUpdateActiveDoc({ content: targetItem.content });

    if (editorMode === 'wysiwyg' && wysiwygRef.current) {
      const targetHtml = markdownToHtml(targetItem.content);
      if (wysiwygRef.current.innerHTML !== targetHtml) {
        wysiwygRef.current.innerHTML = targetHtml;
      }
      wysiwygRef.current.focus();
    } else if (textareaRef.current) {
      textareaRef.current.value = targetItem.content;
      textareaRef.current.focus();
    }

    checkActiveFormatting();

    setTimeout(() => {
      isHistoryNavigatingRef.current = false;
    }, 120);
  }, [activeDoc?.content, activeDoc?.id, editorMode, checkActiveFormatting]);

  // Gjenta/Gjør om-handling (Word-stil)
  const handleRedo = useCallback(() => {
    const stack = historyStackRef.current;
    const currentIndex = historyIndexRef.current;

    if (currentIndex < 0 || currentIndex >= stack.length - 1) return;

    const targetIndex = currentIndex + 1;
    const targetItem = stack[targetIndex];
    if (!targetItem) return;

    historyIndexRef.current = targetIndex;
    setCanUndo(true);
    setCanRedo(targetIndex < stack.length - 1);

    isHistoryNavigatingRef.current = true;
    isUserTypingRef.current = false;

    handleUpdateActiveDoc({ content: targetItem.content });

    if (editorMode === 'wysiwyg' && wysiwygRef.current) {
      const targetHtml = markdownToHtml(targetItem.content);
      if (wysiwygRef.current.innerHTML !== targetHtml) {
        wysiwygRef.current.innerHTML = targetHtml;
      }
      wysiwygRef.current.focus();
    } else if (textareaRef.current) {
      textareaRef.current.value = targetItem.content;
      textareaRef.current.focus();
    }

    checkActiveFormatting();

    setTimeout(() => {
      isHistoryNavigatingRef.current = false;
    }, 120);
  }, [editorMode, checkActiveFormatting]);

  // Snarveier for Ctrl+Z og Ctrl+Y
  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      handleRedo();
    }
  };

  // Global tastelytter for Ctrl+Z / Ctrl+Y når skriveflaten er aktiv
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'editor' || editorTab !== 'write') return;
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT') return;
      if (target && target.tagName === 'TEXTAREA' && target !== textareaRef.current) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [viewMode, editorTab, handleUndo, handleRedo]);

  // Synkroniserer fra activeDoc.content til WYSIWYG når dokumentet lastes, importeres eller oppdateres eksternt
  useEffect(() => {
    if (!wysiwygRef.current) return;
    if (isUserTypingRef.current) return;

    const currentDocContent = typeof activeDoc?.content === 'string' ? activeDoc.content : '';
    const targetHtml = markdownToHtml(currentDocContent);

    if (wysiwygRef.current.innerHTML !== targetHtml) {
      wysiwygRef.current.innerHTML = targetHtml;
    }
  }, [activeDoc?.id, activeDoc?.content, editorMode]);

  // Håndterer endringer i WYSIWYG uten å miste markørposisjon
  const handleWysiwygInput = () => {
    if (!wysiwygRef.current) return;
    isUserTypingRef.current = true;
    const html = wysiwygRef.current.innerHTML;
    const md = htmlToMarkdown(html);
    handleUpdateActiveDoc({ content: md });
    checkActiveFormatting();
    setTimeout(() => {
      isUserTypingRef.current = false;
    }, 150);
  };

  const applyFormatting = (type: string) => {
    const currentDocContent = typeof activeDoc?.content === 'string' ? activeDoc.content : '';
    pushHistorySnapshot(currentDocContent, true);

    if (editorMode === 'wysiwyg' && wysiwygRef.current) {
      wysiwygRef.current.focus();

      switch (type) {
        case 'bold':
          document.execCommand('bold', false);
          break;
        case 'italic':
          document.execCommand('italic', false);
          break;
        case 'underline':
          document.execCommand('underline', false);
          break;
        case 'h1':
          if (activeHeading === 'h1') {
            document.execCommand('formatBlock', false, '<p>');
          } else {
            document.execCommand('formatBlock', false, '<h1>');
          }
          break;
        case 'h2':
          if (activeHeading === 'h2') {
            document.execCommand('formatBlock', false, '<p>');
          } else {
            document.execCommand('formatBlock', false, '<h2>');
          }
          break;
        case 'h3':
          if (activeHeading === 'h3') {
            document.execCommand('formatBlock', false, '<p>');
          } else {
            document.execCommand('formatBlock', false, '<h3>');
          }
          break;
        case 'list':
          document.execCommand('insertUnorderedList', false);
          break;
        case 'orderedList':
          document.execCommand('insertOrderedList', false);
          break;
        case 'quote':
          if (activeStyles.quote) {
            document.execCommand('formatBlock', false, '<p>');
          } else {
            document.execCommand('formatBlock', false, '<blockquote>');
          }
          break;
        default:
          break;
      }

      handleWysiwygInput();
      checkActiveFormatting();
      return;
    }

    // Markdown textarea fallback (hvis studenten har valgt råtekst-modus)
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = typeof activeDoc.content === 'string' ? activeDoc.content : '';
    const selectedText = text.substring(start, end);
    let replacement = '';
    let newStart = start;
    let newEnd = end;

    switch (type) {
      case 'bold': replacement = `**${selectedText || 'fet tekst'}**`; newStart = start + 2; newEnd = selectedText ? end + 2 : start + 10; break;
      case 'italic': replacement = `*${selectedText || 'kursiv tekst'}*`; newStart = start + 1; newEnd = selectedText ? end + 1 : start + 13; break;
      case 'underline': replacement = `<u>${selectedText || 'understreket'}</u>`; newStart = start + 3; newEnd = selectedText ? end + 3 : start + 15; break;
      case 'h1': replacement = `\n# ${selectedText || 'Overskrift 1'}\n`; newStart = start + replacement.length; newEnd = newStart; break;
      case 'h2': replacement = `\n## ${selectedText || 'Overskrift 2'}\n`; newStart = start + replacement.length; newEnd = newStart; break;
      case 'h3': replacement = `\n### ${selectedText || 'Overskrift 3'}\n`; newStart = start + replacement.length; newEnd = newStart; break;
      case 'list': replacement = `\n- ${selectedText || 'Punkt 1'}\n- Punkt 2\n`; newStart = start + replacement.length; newEnd = newStart; break;
      case 'orderedList': replacement = `\n1. ${selectedText || 'Første punkt'}\n2. Andre punkt\n`; newStart = start + replacement.length; newEnd = newStart; break;
      case 'quote': replacement = `\n> ${selectedText || 'Sitat'}\n`; newStart = start + replacement.length; newEnd = newStart; break;
      default: return;
    }

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    handleUpdateActiveDoc({ content: newContent });
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(newStart, newEnd); }, 10);
  };

  /**
   * KILDEASSISTENT:
   * 1. Setter inn inTextCitation ved markøren (f.eks. "(Bae, 2012)")
   * 2. Legger fullReference automatisk til under "## Litteraturliste" bakerst i dokumentet
   */
  const handleInsertCitation = (inTextCitation: string, fullReference: string) => {
    // 1. Sett inn in-text citation i teksten
    if (editorMode === 'wysiwyg' && wysiwygRef.current) {
      wysiwygRef.current.focus();
      // Sett inn som fet eller markert henvisning
      document.execCommand('insertText', false, `${inTextCitation} `);
    } else if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = typeof activeDoc.content === 'string' ? activeDoc.content : '';
      const newText = text.substring(0, start) + `${inTextCitation} ` + text.substring(end);
      handleUpdateActiveDoc({ content: newText });
    }

    // 2. Oppdater / legg til i litteraturlisten bakerst i oppgaven
    setTimeout(() => {
      let currentContent = '';
      if (editorMode === 'wysiwyg' && wysiwygRef.current) {
        currentContent = htmlToMarkdown(wysiwygRef.current.innerHTML);
      } else {
        currentContent = typeof activeDoc.content === 'string' ? activeDoc.content : '';
      }

      const hasRefHeading = /(?:^|\n)(?:#{1,3}\s+)?(?:Litteraturliste|Kildeliste|Referanser|Referanseliste)/i.test(currentContent);
      
      // Sjekk om referansen allerede finnes i teksten
      const authorPart = fullReference.split('(')[0].trim();
      const alreadyInList = currentContent.toLowerCase().includes(authorPart.toLowerCase());

      let updatedContent = currentContent;

      if (!alreadyInList) {
        if (hasRefHeading) {
          // Finn litteraturliste-overskriften og legg kilden til under den
          const refHeadingRegex = /((?:^|\n)(?:#{1,3}\s+)?(?:Litteraturliste|Kildeliste|Referanser|Referanseliste)[^\n]*\n)/i;
          updatedContent = currentContent.replace(refHeadingRegex, `$1${fullReference}\n\n`);
        } else {
          // Legg til litteraturliste bakerst i dokumentet
          updatedContent = `${currentContent.trim()}\n\n## Litteraturliste\n\n${fullReference}\n`;
        }

        handleUpdateActiveDoc({ content: updatedContent });

        if (editorMode === 'wysiwyg' && wysiwygRef.current) {
          wysiwygRef.current.innerHTML = markdownToHtml(updatedContent);
        }
      }
    }, 100);
  };

  const handleSaveProcessLog = async () => {
    // Sjekk at de viktigste feltene er fylt ut
    if (!logSituation.trim() && !logReflection.trim()) {
      alert("Vennligst fyll ut situasjonsbeskrivelse eller didaktisk refleksjon før du lagrer.");
      return;
    }

    setIsSavingLog(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        alert("Du må være logget inn for å lagre logger.");
        setIsSavingLog(false);
        return;
      }

      // Lagrer til "processLogs" i Firestore med både mappe- og dokumentkobling
      await addDoc(collection(db, 'processLogs'), {
        userId: user.uid,
        folderId: activeDoc?.folderId || null,
        folderName: activeFolder?.name || null,
        documentId: activeDoc.id,
        documentTitle: activeDoc.title,
        category: logCategory,
        situation: logSituation,
        reflection: logReflection,
        sources: logSources,
        createdAt: serverTimestamp(),
        updatedAt: new Date().toISOString()
      });

      // Tømmer skjemaet etter vellykket lagring
      setLogSituation('');
      setLogReflection('');
      setLogSources('');
      const targetName = activeDoc?.folderId ? `mappen «${activeFolder?.name}»` : `oppgaven «${activeDoc.title}»`;
      setLogSaveNotice(`Prosesslogg for ${targetName} er lagret!`);
      setTimeout(() => setLogSaveNotice(null), 3500);
    } catch (error) {
      console.error("Feil ved lagring av prosesslogg:", error);
      alert("Kunne ikke lagre loggen til skyen. Prøv igjen senere.");
    } finally {
      setIsSavingLog(false);
    }
  };

  const handleDeleteProcessLog = async (logId: string) => {
    if (!window.confirm("Er du sikker på at du vil slette denne prosessloggen?")) return;
    try {
      await deleteDoc(doc(db, 'processLogs', logId));
    } catch (err) {
      console.error("Feil ved sletting av prosesslogg:", err);
    }
  };

  const handleInsertLogIntoDoc = (log: ProcessLogEntry) => {
    const formatted = `\n\n### Prosesslogg: ${log.category}\n**Situasjonsbeskrivelse:**\n${log.situation}\n\n**Didaktisk refleksjon:**\n${log.reflection}\n${log.sources ? `\n**Kilder & Teori:**\n${log.sources}\n` : ''}`;
    handleUpdateActiveDoc({
      content: (activeDoc.content ? activeDoc.content + '\n' : '') + formatted
    });
    setLogSaveNotice("Satt inn i teksten!");
    setTimeout(() => setLogSaveNotice(null), 2500);
  };

  const handleCreateNote = () => {
    const newId = Date.now().toString();
    const newDoc: DocumentItem = { 
      id: newId, 
      title: 'Uten tittel (Notat)', 
      subtitle: 'Notater & Kladdeblokk • Sist endret nå', 
      content: '# Notater & Idéer\n\n- Skriv fritt ned råtanker, stikkord, sitater og kladder her...\n', 
      taskPrompt: 'Fritt notatdokument for idémyldring, stikkord og arbeidsnotater.', 
      template: 'Notater & Kladdeblokk', 
      targetWords: 0, 
      updatedAt: new Date().toISOString() 
    };
    setDocuments(prev => [newDoc, ...prev]);
    setActiveDocId(newId);
    setViewMode('editor');
    saveDocToFirebase(newDoc);
  };

  const wordCount = (typeof activeDoc.content === 'string' && activeDoc.content.trim()) 
    ? activeDoc.content.trim().split(/\s+/).length 
    : 0;
  const wordProgress = Math.min(100, Math.round((wordCount / (activeDoc.targetWords || 1000)) * 100));

  if (isLoadingDocs) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Laster arbeidsflate...</p>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceLayout
      title="Skriveverksted"
      subtitle="Strukturer, skriv og analyser dine barnehagepedagogiske oppgaver"
      icon={<FileText className="w-6 h-6" />}
      actionButtonLabel="Ny oppgave"
      secondaryActionButtonLabel="Nytt notat / kladd"
      onSecondaryActionClick={handleCreateNote}
      secondaryActionButtonIcon={<StickyNote className="w-3.5 h-3.5 text-amber-400" />}
      folders={folders}
      onAddFolder={() => setIsCreatingFolder(true)}
      onMoveToFolder={handleMoveDoc}
      onActionClick={() => {
        const newId = Date.now().toString();
        const newDoc: DocumentItem = { id: newId, title: 'Nytt dokument', content: '# Nytt dokument\n\nSkriv inn teksten din her...', taskPrompt: '', template: 'Refleksjonsnotat', targetWords: 1500, updatedAt: new Date().toISOString() };
        setDocuments(prev => [newDoc, ...prev]);
        setActiveDocId(newId);
        setViewMode('setup');
        saveDocToFirebase(newDoc); // Lagrer det nye dokumentet i skyen
      }}
      historyItems={documents.map(d => ({
        ...d,
        icon: d.template === 'Notater & Kladdeblokk'
          ? <StickyNote className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          : <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      }))}
      activeItemId={activeDocId}
      historySectionTitle="Mine oppgaver"
      onItemClick={(id: string) => { setActiveDocId(id); setViewMode('editor'); }}
      onPinItem={(id: string, isPinned: boolean) => {
        setDocuments(prev => prev.map(d => {
          if (d.id === id) {
            const updated = { ...d, isPinned };
            saveDocToFirebase(updated);
            return updated;
          }
          return d;
        }));
      }}
      onRenameItem={(id: string, newTitle: string) => {
        setDocuments(prev => prev.map(d => {
          if (d.id === id) {
            const updated = { ...d, title: newTitle, updatedAt: new Date().toISOString() };
            saveDocToFirebase(updated);
            return updated;
          }
          return d;
        }));
      }}
      onDeleteItem={async (id: string) => {
        setDocuments(prev => prev.filter(d => d.id !== id));
        if (activeDocId === id) { 
          const remaining = documents.filter(d => d.id !== id); 
          if (remaining.length > 0) setActiveDocId(remaining[0].id); 
        }
        
        // Sletter dokumentet fra skyen
        try {
          await deleteDoc(doc(db, 'documents', id));
        } catch (error) {
          console.error("Kunne ikke slette fra skyen:", error);
        }
      }}
    >
      <div className="flex h-full w-full gap-4 relative overflow-hidden">
        
        {/* SENTER: Skriveflaten */}
        <div className="flex-1 flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden min-w-0 transition-all duration-300">
          <div className="px-4 sm:px-6 py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
            <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-xl shrink-0">
              <button 
                type="button"
                onClick={() => setViewMode('editor')} 
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'editor' 
                    ? 'bg-white text-indigo-600 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileEdit className="w-3.5 h-3.5 inline mr-1.5" />
                <span>Skriveflate</span>
              </button>
              <button 
                type="button"
                onClick={() => setViewMode('setup')} 
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'setup' 
                    ? 'bg-white text-indigo-600 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Settings className="w-3.5 h-3.5 inline mr-1.5" />
                <span>Oppgaveoppsett</span>
              </button>
              <button 
                type="button"
                onClick={() => { setViewMode('quality-check'); if (!analysisResult) handleRunAnalysis(); }} 
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'quality-check' 
                    ? 'bg-white text-indigo-600 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-1.5 text-amber-500" />
                <span>Kvalitetssjekk</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500 flex-wrap">
              {/* SIKKERHET OG SYNKRONISERINGSINDIKATOR (KOMPAKT & DEFORMASJONSFRI) */}
              <div 
                onClick={() => setIsHistoryModalOpen(true)}
                className="h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/90 transition-all cursor-pointer select-none group shrink-0 whitespace-nowrap shadow-2xs"
                title={`Lagret i skyen og lokal kopi OK (kl. ${lastCloudSyncTime || lastLocalSyncTime || 'nylig'}). Klikk for versjonshistorikk og gjenoppretting.`}
              >
                {syncState === 'saving' ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    <span className="text-[11px] font-semibold text-amber-800 whitespace-nowrap">
                      Lagrer...
                    </span>
                  </>
                ) : !isOnline || syncState === 'offline' ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-amber-800 whitespace-nowrap">
                      Frakoblet (lokal OK)
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-xs ring-2 ring-emerald-500/20" />
                    <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                      Lagret {lastCloudSyncTime ? `kl. ${lastCloudSyncTime}` : (lastLocalSyncTime ? `kl. ${lastLocalSyncTime}` : '')}
                    </span>
                  </>
                )}

                <RotateCcw className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 transition-colors ml-0.5 shrink-0" />
              </div>

              {/* Ordteller & Fremdrift */}
              {activeDoc.template === 'Notater & Kladdeblokk' ? (
                <div className="h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50/90 border border-amber-200/90 shrink-0 whitespace-nowrap shadow-2xs text-[11px] font-bold text-amber-900">
                  <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                  <span>{wordCount} ord (Kladdeblokk)</span>
                </div>
              ) : (
                <div className="h-8 inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white border border-slate-200/80 shrink-0 whitespace-nowrap shadow-2xs text-[11px] font-medium text-slate-600">
                  <span>{wordCount} / {activeDoc.targetWords || 1500} ord ({wordProgress}%)</span>
                  <div className="w-14 sm:w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden shrink-0">
                    <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${wordProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0 hidden sm:block" />
              
              {/* Eksport-pille */}
              <button 
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="h-8 inline-flex items-center justify-center gap-1.5 px-3 py-1 font-bold rounded-xl transition-all shadow-2xs bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-600 text-xs cursor-pointer shrink-0 whitespace-nowrap"
                title="Eksporter til Word (.docx) eller PDF (.pdf) med forside og innholdsfortegnelse"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Eksporter</span>
              </button>

              {/* Del til kollokvie-pille (Samme faste høyde, padding og utforming) */}
              <button 
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="h-8 inline-flex items-center justify-center gap-1.5 px-3 py-1 font-bold rounded-xl transition-all shadow-2xs bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-700 text-xs cursor-pointer shrink-0 whitespace-nowrap"
                title="Del utkast til kollokviegruppe i Basen for hverandrevurdering eller felles RAG-kunnskapsbase"
              >
                <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Del til kollokvie</span>
              </button>

              {/* Leselenke-pille */}
              <button 
                type="button"
                onClick={() => setIsPeerReviewShareModalOpen(true)}
                className="h-8 inline-flex items-center justify-center gap-1.5 px-3 py-1 font-bold rounded-xl transition-all shadow-2xs bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-slate-700 hover:text-purple-700 text-xs cursor-pointer shrink-0 whitespace-nowrap relative"
                title="Generer og administrer leselenke for hverandrevurdering med margkommentarer"
              >
                <Share2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Leselenke</span>
                {peerComments.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded-full text-[10px] font-bold">
                    {peerComments.length}
                  </span>
                )}
              </button>

              <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0 hidden sm:block" />
              
              {/* Vis / Skjul Superveileder-pille */}
              <button 
                type="button"
                onClick={() => {
                  setIsPanelOpen(!isPanelOpen);
                  if (!isPanelOpen && activePanelTab !== 'superveileder') setActivePanelTab('superveileder');
                }} 
                className={`h-8 inline-flex items-center justify-center gap-1.5 px-3 py-1 font-bold rounded-xl transition-all shadow-2xs text-xs shrink-0 whitespace-nowrap cursor-pointer ${
                  isPanelOpen 
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100/70' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                }`}
                title={isPanelOpen ? 'Skjul Superveileder' : 'Vis Superveileder'}
              >
                <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isPanelOpen ? 'text-indigo-600' : 'text-white'}`} />
                <span>{isPanelOpen ? 'Skjul veileder' : 'Vis Superveileder'}</span>
                {isPanelOpen && (
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* View Mode: Editor */}
          {viewMode === 'editor' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-6 py-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-white">
                <div className="flex items-center gap-1 text-slate-700">
                  {/* Angre (Undo) og Gjenta (Redo) - Som i Microsoft Word */}
                  <button 
                    type="button"
                    onClick={handleUndo} 
                    disabled={!canUndo}
                    title={canUndo ? "Angre siste endring (Ctrl+Z)" : "Ingenting å angre (Ctrl+Z)"} 
                    className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
                      canUndo 
                        ? 'hover:bg-slate-100 text-slate-700 hover:text-slate-900 active:scale-95 cursor-pointer' 
                        : 'text-slate-300 cursor-not-allowed opacity-40'
                    }`}
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button 
                    type="button"
                    onClick={handleRedo} 
                    disabled={!canRedo}
                    title={canRedo ? "Gjør om / Gjenta (Ctrl+Y)" : "Ingenting å gjøre om (Ctrl+Y)"} 
                    className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
                      canRedo 
                        ? 'hover:bg-slate-100 text-slate-700 hover:text-slate-900 active:scale-95 cursor-pointer' 
                        : 'text-slate-300 cursor-not-allowed opacity-40'
                    }`}
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-slate-200 mx-1" />

                  <button 
                    type="button"
                    onClick={() => applyFormatting('bold')} 
                    title="Fet (Ctrl+B)" 
                    className={`p-1.5 rounded-lg transition-all ${activeStyles.bold ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => applyFormatting('italic')} 
                    title="Kursiv (Ctrl+I)" 
                    className={`p-1.5 rounded-lg transition-all ${activeStyles.italic ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => applyFormatting('underline')} 
                    title="Understreket" 
                    className={`p-1.5 rounded-lg transition-all ${activeStyles.underline ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                  >
                    <Underline className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                  <button 
                    type="button"
                    onClick={() => applyFormatting('h1')} 
                    title="Overskrift 1 (14 pt, starter alltid på ny side i Word/PDF)" 
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      activeHeading === 'h1' ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Heading1 className="w-4 h-4" />
                    <span className="text-[11px]">H1</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => applyFormatting('h2')} 
                    title="Overskrift 2 (12 pt, 12 pkt etter)" 
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      activeHeading === 'h2' ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Heading2 className="w-4 h-4" />
                    <span className="text-[11px]">H2</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => applyFormatting('h3')} 
                    title="Overskrift 3 (12 pt kursiv, 6 pkt etter)" 
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      activeHeading === 'h3' ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Heading3 className="w-4 h-4" />
                    <span className="text-[11px]">H3</span>
                  </button>
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                  <button 
                    type="button"
                    onClick={() => applyFormatting('list')} 
                    title="Punktliste" 
                    className={`p-1.5 rounded-lg transition-all ${activeStyles.ul ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:bg-slate-100 text-slate-700'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => applyFormatting('orderedList')} 
                    title="Nummerert liste" 
                    className={`p-1.5 rounded-lg transition-all ${activeStyles.ol ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:bg-slate-100 text-slate-700'}`}
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => applyFormatting('quote')} 
                    title="Sitatblokk (1,27 cm innrykk for sitater over 40 ord)" 
                    className={`p-1.5 rounded-lg transition-all ${activeStyles.quote ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:bg-slate-100 text-slate-700'}`}
                  >
                    <Quote className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                  <button
                    type="button"
                    onClick={() => setIsCitationModalOpen(true)}
                    title="Kildeassistent & Litteraturliste (APA 7)"
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <BookMarked className="w-3.5 h-3.5 text-indigo-600" />
                    <span>+ Sett inn kilde</span>
                  </button>
                </div>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold gap-0.5">
                  <button 
                    type="button"
                    onClick={() => { setEditorTab('write'); setEditorMode('wysiwyg'); }} 
                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                      editorTab === 'write' && editorMode === 'wysiwyg' 
                        ? 'bg-white text-indigo-600 shadow-2xs font-bold' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Visuell redigering i Word-stil uten formateringskoder som #"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Visuell (Word)</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => { setEditorTab('write'); setEditorMode('markdown'); }} 
                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                      editorTab === 'write' && editorMode === 'markdown' 
                        ? 'bg-white text-indigo-600 shadow-2xs font-bold' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Råtekst med Markdown-koder (#, ##, ###)"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Markdown (#)</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setEditorTab('preview')} 
                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                      editorTab === 'preview' 
                        ? 'bg-white text-indigo-600 shadow-2xs font-bold' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Forhåndsvis ferdig formatert oppgave"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Forhåndsvis</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100/50">
                <div className="max-w-3xl mx-auto space-y-4">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 px-6 py-4">
                    <input 
                      type="text" 
                      value={activeDoc.title} 
                      onChange={(e) => handleUpdateActiveDoc({ title: e.target.value })} 
                      placeholder="Oppgavetittel..." 
                      className="w-full text-2xl md:text-3xl font-bold text-slate-900 border-none bg-transparent focus:outline-none placeholder:text-slate-300" 
                    />
                  </div>

                  {editorTab === 'write' ? (
                    editorMode === 'wysiwyg' ? (
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-8 md:p-12 min-h-[650px] transition-all">
                        <div
                          ref={wysiwygCallbackRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={handleWysiwygInput}
                          onKeyDown={handleEditorKeyDown}
                          onKeyUp={checkActiveFormatting}
                          onMouseUp={checkActiveFormatting}
                          onSelect={checkActiveFormatting}
                          className="academic-editor-surface w-full focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-6 md:p-8 min-h-[650px]">
                        <textarea 
                          ref={textareaRef} 
                          value={typeof activeDoc.content === 'string' ? activeDoc.content : ''} 
                          onChange={(e) => handleUpdateActiveDoc({ content: e.target.value })} 
                          onKeyDown={handleEditorKeyDown}
                          placeholder="Begynn å skrive oppgaven din her..." 
                          className="w-full bg-transparent resize-none border-none focus:outline-none text-slate-800 text-base leading-relaxed placeholder:text-slate-300 min-h-[600px] font-mono" 
                        />
                      </div>
                    )
                  ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-8 md:p-12 min-h-[650px]">
                      <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed">
                        <ReactMarkdown>
                          {typeof activeDoc.content === 'string' ? (activeDoc.content || '*Ingen tekst skrevet enda.*') : '*Ingen tekst skrevet enda.*'}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* View Mode: Setup & Mal */}
          {viewMode === 'setup' && (
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto space-y-8">
                <div><h3 className="text-lg font-bold text-slate-900 mb-1">Oppgaveinnstillinger</h3><p className="text-sm text-slate-500">Definer rammer, problemstilling og struktur for denne oppgaven.</p></div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Oppgavetekst / Problemstilling</label>
                    <textarea value={activeDoc.taskPrompt || ''} onChange={(e) => handleUpdateActiveDoc({ taskPrompt: e.target.value })} rows={4} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Mål for ordantall</label>
                      <input type="number" value={activeDoc.targetWords || 1500} onChange={(e) => handleUpdateActiveDoc({ targetWords: parseInt(e.target.value) || 0 })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Oppgavetype</label>
                      <select value={activeDoc.template || 'Refleksjonsnotat'} onChange={(e) => { handleUpdateActiveDoc({ template: e.target.value }); handleSelectTemplate(e.target.value); }} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {Object.keys(templates).map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                    </div>
                  </div>
                  {activeDoc.template === 'Notater & Kladdeblokk' && (
                    <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-start gap-3">
                      <StickyNote className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-950 leading-relaxed">
                        <strong className="block font-bold mb-0.5 text-amber-900">Fritt notatdokument</strong>
                        Dette dokumentet er satt opp som en åpen kladdeblokk. Du trenger ingen rigid akademisk disposisjon eller fastsatt ordtallsmål. Skriv fritt ned råtekst, sitater, observasjonsnotater og idéer.
                      </div>
                    </div>
                  )}
                </div>
                <div className="pt-6 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-600" /> 
                      Strukturforslag for: {selectedTemplate || activeDoc.template || 'Valgt oppgavetype'}
                    </h4>
                    {activeDoc.template === 'Egendefinert struktur' && (
                      <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                        Egendefinert oppsett
                      </span>
                    )}
                    {activeDoc.template === 'Notater & Kladdeblokk' && (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/70 px-2.5 py-0.5 rounded-full border border-amber-200">
                        Fri disposisjon
                      </span>
                    )}
                  </div>

                  {activeDoc.template === 'Notater & Kladdeblokk' ? (
                    <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/60 text-xs text-slate-700 space-y-1 mb-4">
                      <p className="font-bold text-amber-900 flex items-center gap-1.5">
                        <StickyNote className="w-4 h-4 text-amber-600" />
                        Fri strukturering for kladder & notater
                      </p>
                      <p className="text-slate-600 leading-relaxed">
                        Kladder krever ingen obligatoriske akademiske kapitler (som innledning, analyse, konklusjon). Du kan fritt strukturere med overskrifter (# og ##) eller punktlister direkte i skriveflaten når du har behov for det.
                      </p>
                    </div>
                  ) : activeDoc.template === 'Egendefinert struktur' ? (
                    <p className="text-xs text-slate-500 mb-4">
                      Definer dine egne kapitler og underpunkter. Du kan skrive inn kapitteltitler direkte, flytte dem opp og ned med pilene, legge til nye kapitler eller fjerne etter behov.
                    </p>
                  ) : (
                    <div className="flex items-center justify-between gap-3 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                      <p className="text-xs text-slate-500">
                        Standard oppsett for denne oppgavetypen. Vil du flytte eller legge til egne kapitler?
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const current = getCurrentOutline();
                          handleSelectTemplate('Egendefinert struktur');
                          handleUpdateActiveDoc({ template: 'Egendefinert struktur', outline: [...current] });
                          setOutline([...current]);
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-2xs whitespace-nowrap"
                      >
                        Tilpass struktur
                      </button>
                    </div>
                  )}

                  <div className="space-y-2.5 mb-4">
                    {getCurrentOutline().length === 0 ? (
                      <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                        <p className="text-xs text-slate-500 mb-2">Ingen kapitler er lagt til ennå.</p>
                        <button
                          type="button"
                          onClick={() => handleAddChapter('Innledning')}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs"
                        >
                          + Legg til innledning
                        </button>
                      </div>
                    ) : (
                      getCurrentOutline().map((sec, idx) => (
                        <div key={sec.id || idx} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 transition-all">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                {idx + 1}
                              </span>
                              {activeDoc.template === 'Egendefinert struktur' ? (
                                <input
                                  type="text"
                                  value={sec.title}
                                  onChange={(e) => handleUpdateChapter(idx, e.target.value)}
                                  placeholder="Skriv kapittelnavn..."
                                  className="w-full bg-white px-3 py-1 text-sm font-semibold text-slate-800 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                              ) : (
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">{sec.title}</p>
                                  {sec.subItems.length > 0 && <p className="text-xs text-slate-500">Underpunkter: {sec.subItems.join(', ')}</p>}
                                </div>
                              )}
                            </div>

                            {activeDoc.template === 'Egendefinert struktur' && (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {/* Flytt kapittel opp og ned */}
                                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveChapterUp(idx)}
                                    disabled={idx === 0}
                                    title={idx === 0 ? "Øverste kapittel" : "Flytt kapittel opp"}
                                    aria-label="Flytt kapittel opp"
                                    className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:text-slate-300 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded transition-colors"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveChapterDown(idx)}
                                    disabled={idx === getCurrentOutline().length - 1}
                                    title={idx === getCurrentOutline().length - 1 ? "Nederste kapittel" : "Flytt kapittel ned"}
                                    aria-label="Flytt kapittel ned"
                                    className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:text-slate-300 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded transition-colors"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSubItemInput(prev => prev?.chapterIdx === idx ? null : { chapterIdx: idx, text: '' });
                                  }}
                                  title="Legg til underpunkt"
                                  className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-200/60 rounded-md transition-colors"
                                >
                                  + Underpunkt
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveChapter(idx)}
                                  title="Slett kapittel"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Underpunkter */}
                          {sec.subItems.length > 0 && (
                            <div className="pl-9 flex flex-wrap gap-1.5 pt-0.5">
                              {sec.subItems.map((sub, sIdx) => (
                                <span key={sIdx} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-slate-200 text-slate-700 text-xs rounded-md shadow-2xs">
                                  <span>{sub}</span>
                                  {activeDoc.template === 'Egendefinert struktur' && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSubItem(idx, sIdx)}
                                      className="text-slate-400 hover:text-rose-500 ml-0.5"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Input for nytt underpunkt */}
                          {activeDoc.template === 'Egendefinert struktur' && activeSubItemInput?.chapterIdx === idx && (
                            <div className="pl-9 pt-1.5 flex items-center gap-2">
                              <input
                                type="text"
                                value={activeSubItemInput.text}
                                onChange={(e) => setActiveSubItemInput({ chapterIdx: idx, text: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddSubItem(idx, activeSubItemInput.text);
                                    setActiveSubItemInput({ chapterIdx: idx, text: '' });
                                  }
                                }}
                                placeholder="Skriv underpunkt og trykk Enter..."
                                className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  handleAddSubItem(idx, activeSubItemInput.text);
                                  setActiveSubItemInput({ chapterIdx: idx, text: '' });
                                }}
                                className="px-2.5 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                              >
                                Legg til
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveSubItemInput(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Legg til nytt kapittel for egendefinert struktur */}
                  {activeDoc.template === 'Egendefinert struktur' && (
                    <div className="space-y-3 mb-6 p-4 bg-slate-50/80 border border-dashed border-slate-300 rounded-xl">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newChapterTitle}
                          onChange={(e) => setNewChapterTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddChapter();
                            }
                          }}
                          placeholder="Navn på nytt kapittel (f.eks. Drøfting, Teori, Metode)..."
                          className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddChapter()}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Plus className="w-4 h-4" /> Legg til kapittel
                        </button>
                      </div>

                      {/* Hurtigvalg for vanlige BLU-kapitler */}
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Forslag til kapitler (klikk for å legge til):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            'Innledning',
                            'Teoretisk rammeverk',
                            'Metode og etikk',
                            'Praksisfortelling',
                            'Didaktisk refleksjon',
                            'Drøfting',
                            'Rammeplanforankring',
                            'Konklusjon'
                          ].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleAddChapter(preset)}
                              className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-600 border border-slate-200 rounded-lg transition-all shadow-2xs flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3 text-indigo-500" /> {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <button onClick={handleApplyOutline} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" /> Sett inn struktur i oppgaveteksten</button>
                </div>

                {/* Innholdsfortegnelse under oppgavestrukturen (skille på hoved- og underkapittel) */}
                <div className="pt-6 border-t border-slate-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <List className="w-4 h-4 text-indigo-600" /> 
                        Innholdsfortegnelse for oppgaven
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                          Som i Word
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Automatisk oppsett basert på oppgavestrukturen din med tydelig skille mellom hovedkapitler og underkapitler.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsExportModalOpen(true)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Eksporter oppgave (Word / PDF)
                    </button>
                  </div>

                  {/* Forhåndsvisningskort for innholdsfortegnelsen */}
                  <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/90 space-y-3">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      <span>Kapittelstruktur</span>
                      <span>Formatert sidetall</span>
                    </div>

                    {getCurrentOutline().length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center italic">
                        Ingen kapitler er definert ennå. Velg en mal eller legg til kapitler ovenfor for å generere innholdsfortegnelse.
                      </p>
                    ) : (
                      <div className="space-y-1.5 py-1">
                        {getCurrentOutline().map((ch, idx) => (
                          <div key={ch.id || idx} className="space-y-1">
                            {/* Hovedkapittel (Nivå 1 - Fet, tydelig markert) */}
                            <div className="flex items-baseline justify-between text-xs font-bold text-slate-900 pt-1.5">
                              <span className="flex-shrink-0">{idx + 1}. {ch.title}</span>
                              <span className="flex-1 mx-2 border-b border-dotted border-slate-300 relative top-[-3px]" />
                              <span className="flex-shrink-0 text-slate-500 font-semibold">Side {idx + 3}</span>
                            </div>

                            {/* Underkapitler (Nivå 2 - Innrykket med normal vekt, slik som i Word) */}
                            {ch.subItems && ch.subItems.length > 0 && ch.subItems.map((sub, sIdx) => (
                              <div key={sIdx} className="flex items-baseline justify-between text-xs font-normal text-slate-600 pl-6">
                                <span className="flex-shrink-0 text-slate-700">{idx + 1}.{sIdx + 1} {sub}</span>
                                <span className="flex-1 mx-2 border-b border-dotted border-slate-200 relative top-[-3px]" />
                                <span className="flex-shrink-0 text-slate-400 font-normal">Side {idx + 3}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-slate-500">
                      💡 Ved eksport legges innholdsfortegnelsen inn som en egen dedikert side med ekte Word tab-stops og prikket lederlinje.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsExportModalOpen(true)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      Tilpass forside og eksporter <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View Mode: Quality Check */}
          {viewMode === 'quality-check' && (
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <div><h3 className="text-lg font-bold text-slate-900 mb-1">Akademisk kvalitetssjekk</h3><p className="text-sm text-slate-500">Automatisk analyse basert på barnehagefaglige vurderingskriterier.</p></div>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsShareModalOpen(true)}
                      className="px-3.5 py-2 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-emerald-600" /> Del til kollokviet
                    </button>
                    <button onClick={handleRunAnalysis} disabled={isAnalyzing} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2"><Sparkles className="w-4 h-4" /> {isAnalyzing ? 'Analyserer tekst...' : 'Kjør ny analyse'}</button>
                  </div>
                </div>
                {isAnalyzing && <div className="p-12 text-center space-y-4 bg-slate-50 rounded-2xl border border-slate-200"><div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-sm font-medium text-slate-600">Leser gjennom oppgaven, sjekker rød tråd og teoretisk forankring...</p></div>}
                {!isAnalyzing && analysisResult && <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4"><div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider"><CheckCircle2 className="w-4 h-4" /> Analyse fullført</div><div className="prose prose-slate max-w-none text-sm leading-relaxed"><ReactMarkdown>{typeof analysisResult === 'string' ? analysisResult : JSON.stringify(analysisResult, null, 2)}</ReactMarkdown></div></div>}
                {!isAnalyzing && !analysisResult && <div className="p-12 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200"><AlertCircle className="w-8 h-8 text-slate-400 mx-auto" /><p className="text-sm text-slate-600">Ingen analyse utført for dette utkastet ennå.</p><button onClick={handleRunAnalysis} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Start analyse nå</button></div>}
              </div>
            </div>
          )}
        </div>

        {/* HØYRE SIDEPANEL: SUPERVEILEDEREN */}
        {isPanelOpen && (
          <aside className="w-[420px] bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col flex-shrink-0 overflow-hidden animate-in slide-in-from-right-8 duration-300">
            {/* Interne faner og lukkepil */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 pl-1 pr-2">
              <div className="flex flex-1 min-w-0">
                <button 
                  type="button"
                  onClick={() => setActivePanelTab('superveileder')}
                  className={`flex-1 py-3 px-2 text-xs font-semibold text-center border-b-2 transition-colors truncate cursor-pointer ${
                    activePanelTab === 'superveileder' 
                      ? 'text-indigo-600 border-indigo-600 bg-white' 
                      : 'text-slate-500 border-transparent hover:text-slate-700'
                  }`}
                >
                  Superveilederen
                </button>
                <button 
                  type="button"
                  onClick={() => setActivePanelTab('prosesslogg')}
                  className={`flex-1 py-3 px-2 text-xs font-semibold text-center border-b-2 transition-colors truncate cursor-pointer ${
                    activePanelTab === 'prosesslogg' 
                      ? 'text-indigo-600 border-indigo-600 bg-white' 
                      : 'text-slate-500 border-transparent hover:text-slate-700'
                  }`}
                >
                  Prosesslogg
                </button>
                <button 
                  type="button"
                  onClick={() => setActivePanelTab('respons')}
                  className={`flex-1 py-3 px-2 text-xs font-semibold text-center border-b-2 transition-colors flex items-center justify-center gap-1 truncate cursor-pointer ${
                    activePanelTab === 'respons' 
                      ? 'text-purple-600 border-purple-600 bg-white' 
                      : 'text-slate-500 border-transparent hover:text-slate-700'
                  }`}
                >
                  <span>Respons</span>
                  {peerComments.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold">
                      {peerComments.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Liten uttrekkspil-knapp i toppen av fanelinjen */}
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ml-1"
                title="Skjul Superveilederen (Lukk uttrekksmeny)"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            
            <div className="flex-1 flex flex-col bg-slate-50/30 overflow-hidden">
              {activePanelTab === 'superveileder' ? (
                // SUPERVEILEDER CHAT UI
                <div className="flex flex-col h-full">
                  {/* Kontekst-indikator for Superveileder */}
                  <div className="px-3.5 py-2 border-b border-slate-200/80 bg-slate-100/70 flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 min-w-0 text-xs text-slate-700">
                      {activeDoc?.folderId ? (
                        <>
                          <Folder className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="font-bold text-slate-800 truncate" title={`Samtale knyttet til mappen: ${activeFolder?.name || 'Aktiv mappe'}`}>
                            Mappe: {activeFolder?.name || 'Aktiv mappe'}
                          </span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="font-bold text-slate-800 truncate" title={`Samtale for oppgaven: ${activeDoc?.title || 'Aktiv oppgave'}`}>
                            Oppgave: {activeDoc?.title || 'Uten tittel'}
                          </span>
                        </>
                      )}
                      {isChatSyncing && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Synkroniserer samtale med skyen..." />
                      )}
                    </div>
                    {messages.length > 1 && (
                      <button
                        type="button"
                        onClick={handleClearChat}
                        className="text-[11px] text-slate-500 hover:text-red-600 px-2 py-0.5 rounded-lg hover:bg-red-50 font-semibold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                        title="Start ny samtale for denne konteksten"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Nullstill</span>
                      </button>
                    )}
                  </div>

                  <div className="px-2.5 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-center gap-1.5 flex-wrap shrink-0">
                    {['Auto', 'Sokratisk', 'Rammeplan', 'APA', 'Metode', 'Lytte'].map(mode => (
                      <button 
                        key={mode} 
                        onClick={() => setChatMode(mode)} 
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                          chatMode === mode 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {messages.map((msg) => {
                      const isErrorMsg = msg.isError || (msg.role === 'assistant' && typeof msg.content === 'string' && (
                        msg.content.includes("Kapasitetsgrensen for forespørsler er midlertidig nådd") ||
                        msg.content.includes("429 Rate limit") ||
                        msg.content.includes("stor pågang") ||
                        msg.content.includes("opplever stor pågang")
                      ));

                      if (isErrorMsg) {
                        return (
                          <div key={msg.id} className="flex gap-2.5 justify-start">
                            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="max-w-[88%] bg-amber-50/90 border border-amber-200 text-amber-950 p-3.5 rounded-2xl rounded-tl-none text-xs space-y-2 shadow-2xs">
                              <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                                <span>Midlertidig pause / stor pågang</span>
                              </div>
                              <p className="text-amber-800 leading-relaxed font-normal">
                                Superveilederen er opptatt akkurat nå fordi mange studenter skriver samtidig. Prøv igjen om et øyeblikk.
                              </p>
                              <div className="flex items-center gap-2 pt-1 border-t border-amber-200/60">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                                    if (lastUserMsg) {
                                      handleSendMessage(lastUserMsg.content);
                                    }
                                  }}
                                  disabled={isChatLoading}
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer text-xs shadow-2xs transition-colors"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Prøv igjen nå
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMessages(prev => prev.filter(m => m.id !== msg.id))}
                                  className="px-2.5 py-1.5 text-amber-800 hover:bg-amber-100 rounded-xl font-semibold cursor-pointer text-xs transition-colors"
                                >
                                  Lukk
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          {msg.role === 'assistant' && (
                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                              msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-xs'
                            }`}
                          >
                            {msg.role === 'assistant' ? (
                              <div className="prose prose-slate prose-sm max-w-none">
                                <ReactMarkdown>{typeof msg.content === 'string' ? msg.content : ''}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {isChatLoading && (
                      <div className="flex gap-2.5 justify-start">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                        </div>
                        <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-xs flex items-center gap-1.5 text-xs text-slate-500">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                          <span className="ml-1 font-medium">Superveilederen tenker...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="p-3 border-t border-slate-200 bg-white shrink-0">
                    <div className="relative">
                      <textarea 
                        value={chatInput} 
                        onChange={(e) => setChatInput(e.target.value)} 
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={isChatLoading}
                        placeholder={`Spør om ${chatMode.toLowerCase()} eller be om tilbakemelding...`} 
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-60" 
                        rows={2} 
                      />
                      <button 
                        type="button"
                        onClick={() => handleSendMessage()}
                        disabled={!chatInput.trim() || isChatLoading}
                        className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

              ) : activePanelTab === 'prosesslogg' ? (
                // STEG 5: PROSESSLOGG SKJEMA & LOGGARKIV UI
                <div className="flex flex-col h-full overflow-y-auto p-5 space-y-6 custom-scrollbar">
                  {/* Kontekst-indikator for Prosesslogg */}
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200/70 rounded-2xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {activeDoc?.folderId ? (
                        <Folder className="w-4 h-4 text-indigo-600 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      )}
                      <div className="text-xs truncate">
                        <span className="text-indigo-900 font-bold block truncate">
                          {activeDoc?.folderId ? `Mappe: ${activeFolder?.name || 'Aktiv mappe'}` : `Oppgave: ${activeDoc.title}`}
                        </span>
                        <span className="text-indigo-600/80 text-[10px] block">
                          Logger lagres og knyttes automatisk til denne konteksten
                        </span>
                      </div>
                    </div>
                  </div>

                  {logSaveNotice && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{logSaveNotice}</span>
                    </div>
                  )}

                  <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Ny prosesslogg</span>
                    </h4>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Kategori</label>
                      <select 
                        value={logCategory}
                        onChange={(e) => setLogCategory(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                      >
                        <option value="Praksisfortelling">Praksisfortelling</option>
                        <option value="Didaktisk refleksjon">Didaktisk refleksjon</option>
                        <option value="Observasjon">Observasjon</option>
                        <option value="Teorikobling">Teorikobling</option>
                        <option value="Etisk dilemma">Etisk dilemma</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Situasjonsbeskrivelse / Hva skjedde?</label>
                      <textarea 
                        value={logSituation}
                        onChange={(e) => setLogSituation(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs resize-none"
                        placeholder="Beskriv en konkret hendelse fra barnehagen, hva barna sa/gjorde, og din egen rolle..."
                        rows={4}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Didaktisk refleksjon / Hva lærte jeg?</label>
                      </div>
                      <textarea 
                        value={logReflection}
                        onChange={(e) => setLogReflection(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs resize-none"
                        placeholder="Reflekter over hvorfor situasjonen utviklet seg slik, og hvordan din pedagogiske væremåte påvirket utfallet..."
                        rows={4}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Faglige kilder & Rammeplan-forankring</label>
                      <textarea 
                        value={logSources}
                        onChange={(e) => setLogSources(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs resize-none"
                        placeholder="F.eks. Bae (2012), Rammeplanen kap. 3..."
                        rows={2}
                      />
                    </div>

                    <button 
                      type="button"
                      onClick={handleSaveProcessLog}
                      disabled={isSavingLog}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-70 transition-all shadow-md flex justify-center items-center gap-2 cursor-pointer text-xs"
                    >
                      {isSavingLog ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Archive className="w-4 h-4" />
                      )}
                      {isSavingLog ? 'Lagrer i skyen...' : 'Lagre prosesslogg'}
                    </button>
                  </div>

                  {/* Tidligere lagrede prosesslogger for denne mappen/oppgaven */}
                  <div className="pt-2 border-t border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <BookMarked className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Lagrede logger for {activeDoc?.folderId ? 'mappen' : 'oppgaven'} ({contextProcessLogs.length})</span>
                      </h4>
                    </div>

                    {isProcessLogsLoading ? (
                      <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <span>Laster prosesslogger fra skyen...</span>
                      </div>
                    ) : contextProcessLogs.length === 0 ? (
                      <div className="p-4 bg-white border border-slate-200/80 rounded-2xl text-center text-xs text-slate-500 italic">
                        Ingen logger lagret for denne {activeDoc?.folderId ? 'mappen' : 'oppgaven'} enda. Fyll ut skjemaet over for å lagre din didaktiske refleksjon.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {contextProcessLogs.map(log => {
                          const isExpanded = expandedLogId === log.id;
                          return (
                            <div key={log.id} className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                                    {log.category}
                                  </span>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : (log.updatedAt ? new Date(log.updatedAt).toLocaleDateString('nb-NO') : 'Nylig')}
                                    {log.documentTitle && <span className="ml-1 text-slate-500">• {log.documentTitle}</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleInsertLogIntoDoc(log)}
                                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Sett inn i oppgaven"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Sett inn</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProcessLog(log.id)}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                                    title="Slett logg"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="text-xs text-slate-700 space-y-1.5">
                                <div>
                                  <strong className="text-slate-900 block font-semibold text-[11px]">Situasjon:</strong>
                                  <p className={`text-slate-600 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                                    {log.situation || '–'}
                                  </p>
                                </div>
                                <div>
                                  <strong className="text-slate-900 block font-semibold text-[11px]">Refleksjon:</strong>
                                  <p className={`text-slate-600 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                                    {log.reflection || '–'}
                                  </p>
                                </div>
                                {log.sources && (
                                  <div>
                                    <strong className="text-slate-900 block font-semibold text-[11px]">Kilder:</strong>
                                    <p className="text-slate-500 italic">
                                      {log.sources}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {(log.situation?.length > 100 || log.reflection?.length > 100) && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                  className="text-[10px] text-indigo-600 font-bold hover:underline pt-0.5 block cursor-pointer"
                                >
                                  {isExpanded ? '▲ Vis mindre' : '▼ Les hele loggen'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                // STEG 6: MEDSTUDENT-RESPONS / MARGINKOMMENTARER
                <div className="flex flex-col h-full overflow-hidden bg-slate-50/40">
                  <div className="p-3.5 bg-white border-b border-slate-200/80 space-y-2.5 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span>Medstudent-respons i margen</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                        {peerComments.length} innspill
                      </span>
                    </div>

                    <div className="p-2 bg-purple-50/70 border border-purple-200/60 rounded-xl text-[11px] text-purple-950">
                      <strong>Tilknyttet:</strong> {activeDoc?.folderId ? `📁 ${activeFolder?.name || 'Mappe'} / ` : ''}📄 {activeDoc.title}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const reviewId = `rev_${activeDoc.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
                          const url = `${window.location.origin}${window.location.pathname}?review=${reviewId}`;
                          navigator.clipboard.writeText(url);
                          setSaveStatus('Leselenke kopiert!');
                          setTimeout(() => setSaveStatus(null), 2500);
                        }}
                        className="flex-1 py-1.5 px-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Kopier leselenke for medstudenter"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Kopier leselenke</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsPeerReviewShareModalOpen(true)}
                        className="py-1.5 px-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Innstillinger for leselenken"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-500" />
                        <span>Innstillinger</span>
                      </button>
                    </div>
                  </div>

                  {/* Comments list */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {peerComments.length === 0 ? (
                      <div className="p-8 text-center space-y-3">
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-800">Ingen tilbakemeldinger ennå</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                          Kopier leselenken ovenfor og send den til en medstudent eller i kollokviegruppa for å få respons direkte i margen.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsPeerReviewShareModalOpen(true)}
                          className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Del leselenke nå
                        </button>
                      </div>
                    ) : (
                      peerComments.map(c => (
                        <div
                          key={c.id}
                          className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                            c.resolved 
                              ? 'bg-slate-50/70 border-slate-200 opacity-60' 
                              : 'bg-white border-slate-200 shadow-2xs hover:border-purple-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold">
                                {c.authorName.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-800 text-[11px]">{c.authorName}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {c.tag && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  c.tag === 'rammeplan'
                                    ? 'bg-purple-100 text-purple-800'
                                    : c.tag === 'teori'
                                    ? 'bg-blue-100 text-blue-800'
                                    : c.tag === 'ros'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {c.tag}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                {new Date(c.createdAt).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          {c.selectedText && (
                            <div className="p-2 bg-slate-50 border-l-2 border-purple-400 rounded text-[11px] text-slate-600 italic">
                              «{c.selectedText}»
                            </div>
                          )}

                          <p className={`text-slate-800 text-xs leading-relaxed ${c.resolved ? 'line-through text-slate-500' : ''}`}>
                            {c.text}
                          </p>

                          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                            {c.paragraphIndex !== undefined ? (
                              <span className="text-slate-400">Avsnitt #{c.paragraphIndex + 1}</span>
                            ) : <span />}

                            <button
                              type="button"
                              onClick={async () => {
                                const reviewId = `rev_${activeDoc.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
                                const updated = peerComments.map(item => item.id === c.id ? { ...item, resolved: !item.resolved } : item);
                                setPeerComments(updated);
                                try {
                                  await updateDoc(doc(db, 'shared_reviews', reviewId), {
                                    comments: updated,
                                    updatedAt: new Date().toISOString()
                                  });
                                } catch {}
                              }}
                              className={`flex items-center gap-1 font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer ${
                                c.resolved 
                                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' 
                                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{c.resolved ? 'Innarbeidet' : 'Merk som innarbeidet'}</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

      </div>

      {/* OPPRETT NY MAPPE MODAL */}
      {isCreatingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-slate-800">Opprett ny mappe</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Hold orden i fagtekster, praksisfortellinger og logger.
              </p>
            </div>
            <div className="pt-2">
              <input 
                type="text" 
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                placeholder="F.eks. Praksis H26"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName('');
                  }} 
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Avbryt
                </button>
                <button 
                  onClick={handleCreateFolder} 
                  disabled={!newFolderName.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20"
                >
                  Opprett mappe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* DOKUMENT EKSPORT MODAL (WORD / PDF MED FORSIDE, INNHOLDSFORTEGNELSE OG FORMELL SJEKKLISTE) */}
      <DocumentExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        documentTitle={activeDoc.title}
        documentContent={typeof activeDoc.content === 'string' ? activeDoc.content : ''}
        documentType={activeDoc.template || selectedTemplate || 'Refleksjonsnotat'}
        taskPrompt={activeDoc.taskPrompt || ''}
        targetWords={activeDoc.targetWords || 1500}
        outline={getCurrentOutline()}
        userProfile={{
          name: _props?.user?.displayName || _props?.profile?.name || getAuth().currentUser?.displayName || '',
          candidateId: _props?.profile?.candidateId || _props?.profile?.studentId || '',
          institution: _props?.profile?.studiested || _props?.profile?.college || _props?.settings?.studiested || 'Høgskolen i Innlandet'
        }}
        onUpdateDocument={(fields) => handleUpdateActiveDoc(fields)}
      />

      {/* KILDEASSISTENT & LITTERATURLISTE MODAL (APA 7) */}
      <CitationAssistantModal
        isOpen={isCitationModalOpen}
        onClose={() => setIsCitationModalOpen(false)}
        onInsertCitation={handleInsertCitation}
        existingText={typeof activeDoc.content === 'string' ? activeDoc.content : ''}
      />

      {/* DEL TIL KOLLOKVIEGRUPPE / BASEN MODAL */}
      <ShareToCollabModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        document={activeDoc}
        currentUser={_props?.user || getAuth().currentUser}
        onNavigateToBasen={() => {
          if (typeof _props?.setActiveTab === 'function') {
            _props.setActiveTab('collaboration');
          }
        }}
      />

      {/* HVERANDREVURDERING & LESELENKE MODAL */}
      <PeerReviewShareModal
        isOpen={isPeerReviewShareModalOpen}
        onClose={() => setIsPeerReviewShareModalOpen(false)}
        document={activeDoc}
        currentUser={_props?.user || getAuth().currentUser}
        onOpenReader={(revId) => {
          if (typeof _props?.setActiveTab === 'function') {
            localStorage.setItem('blu_active_review_id', revId);
            _props.setActiveTab('peer-review');
          } else {
            window.location.href = `?review=${revId}`;
          }
        }}
      />

      {/* VERSJONSHISTORIKK & ANGRE MODAL (PUNKT 5) */}
      <DocumentHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        docId={activeDoc.id}
        currentTitle={activeDoc.title}
        currentContent={typeof activeDoc.content === 'string' ? activeDoc.content : ''}
        onRestoreVersion={(title, content) => {
          handleUpdateActiveDoc({ title, content });
          setSaveStatus('Tidligere versjon gjenopprettet!');
        }}
        lastCloudSyncTime={lastCloudSyncTime}
        isOnline={isOnline}
      />
    </WorkspaceLayout>
  );
}

export default WritingWorkshop;
