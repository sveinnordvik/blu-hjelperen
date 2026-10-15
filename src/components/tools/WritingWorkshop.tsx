// Nye imports (hvis du trenger dem senere) pluss eksisterende
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WorkspaceLayout, HistoryItem, FOLDER_COLORS } from '../WorkspaceLayout';
import { 
  FileText, Settings, Sparkles, Save, CheckCircle2, FileEdit, AlertCircle, Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Underline, Eye, Edit3, Check, RotateCcw, BookOpen, Copy, Download, ChevronRight, ChevronLeft, PanelRightClose, Send, Archive, User,
  Folder, FolderOpen, FolderPlus, Plus, Trash2, X, ArrowUp, ArrowDown, BookMarked, Users, Share2, MessageSquare, Clock, ShieldCheck,
  Undo2, Redo2, StickyNote, Brain, Scissors,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Highlighter, Indent, Outdent, Baseline,
  Search, Replace, BarChart3, Type, ChevronUp, ChevronDown,
  Maximize2, Minimize2, Sun, Moon, Code,
  ZoomIn, ZoomOut, Pin, PinOff, SlidersHorizontal, Layers
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { markdownToHtml, htmlToMarkdown, capitalizeListItemText } from '../../lib/wysiwygConverter';
import { CitationAssistantModal } from './CitationAssistantModal';
import { analyzeWithSystemPrompt, analyzeAssignmentText, chatWithSuperveileder } from '../../services/geminiService';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDocs, query, where, deleteDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase'; 
import { DocumentExportModal } from './DocumentExportModal';
import { FolderExportModal } from './FolderExportModal';
import { FolderContextModal } from './FolderContextModal';
import { ShareToCollabModal } from './ShareToCollabModal';
import { PeerReviewShareModal } from './PeerReviewShareModal';
import { DocumentHistoryModal } from './DocumentHistoryModal';
import { saveDocumentSnapshot } from '../../lib/documentBackup';
import { MarginComment, SharedReviewData } from '../PeerReviewReader';

// STEG 1: Nytt interface for mapper
export interface FolderItem {
  id: string;
  name: string;
  color?: string;
  isArchived?: boolean;
  isExpanded: boolean; // Styrer om mappen er åpen eller lukket i menyen
  customContext?: string; // Felles KI-mappekontekst
  focusArea?: string;
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
  fontFamily?: 'times' | 'calibri' | 'arial' | 'georgia'; // Valgt skrifttype
  fontSize?: string; // Valgt skriftstørrelse (f.eks. '12')
  lineSpacing?: '1.0' | '1.15' | '1.5' | '2.0'; // Valgt linjeavstand
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

const STORAGE_KEY = 'blu_active_document_id';
const FOLDERS_STORAGE_KEY = 'blu_workshop_folders';
const DOCUMENTS_STORAGE_KEY = 'blu_workshop_documents_cache_v2';

export function WritingWorkshop(_props?: { [key: string]: any }) {
  const isFullscreen = _props?.isFullscreen ?? false;
  const setIsFullscreen = _props?.setIsFullscreen;

  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    try {
      const saved = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse documents from localStorage', e);
    }
    return INITIAL_DOCUMENTS;
  });

  const [activeDocId, setActiveDocId] = useState<string>(() => {
    try {
      const savedActiveId = localStorage.getItem('blu_active_document_id');
      if (savedActiveId) return savedActiveId;
    } catch (e) {}
    return '1';
  });

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

  // Lagre dokumenter og mapper lokalt for umiddelbar respons
  useEffect(() => {
    if (documents.length > 0) {
      try {
        localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(documents));
      } catch (e) {
        console.error('Failed to save documents to localStorage', e);
      }
    }
  }, [documents]);

  useEffect(() => {
    if (activeDocId) {
      try {
        localStorage.setItem('blu_active_document_id', activeDocId);
      } catch (e) {}
    }
  }, [activeDocId]);

  useEffect(() => {
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error('Failed to save folders', e);
    }
  }, [folders]);

  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestDocToSaveRef = useRef<DocumentItem | null>(null);

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (latestDocToSaveRef.current) {
        saveDocToFirebase(latestDocToSaveRef.current);
      }
    };
  }, []);

  // Henter dokumenter og mapper fra Firestore ved innlasting
  useEffect(() => {
    const fetchData = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        if (!documents || documents.length === 0) {
          setDocuments(INITIAL_DOCUMENTS);
        }
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
          try {
            localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(fetchedDocs));
          } catch (e) {}

          const savedActiveId = localStorage.getItem('blu_active_document_id');
          const targetExists = savedActiveId && fetchedDocs.some(d => d.id === savedActiveId);
          if (targetExists) {
            setActiveDocId(savedActiveId);
          } else if (fetchedDocs.length > 0) {
            setActiveDocId(fetchedDocs[0].id);
          }
        } else {
          // Hvis det er første gang brukeren logger inn og ikke har noen dokumenter i skyen
          if (documents.length > 0) {
            // Last opp eksisterende startdokumenter til skyen
            documents.forEach(d => saveDocToFirebase(d));
          }
        }

        // Hent mapper
        const folderQ = query(collection(db, 'folders'), where('userId', '==', user.uid));
        const folderSnapshot = await getDocs(folderQ);
        if (!folderSnapshot.empty) {
          const fetchedFolders = folderSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FolderItem));
          setFolders(fetchedFolders);
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
  const [newFolderColor, setNewFolderColor] = useState('indigo');

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    const newFolder: FolderItem = {
      id: 'folder_' + Date.now(),
      name: newFolderName.trim(),
      color: newFolderColor,
      isExpanded: true,
      createdAt: new Date().toISOString()
    };
    
    setFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
    setNewFolderColor('indigo');
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

  const handleDeleteFolder = async (folderId: string) => {
    // 1. Fjern mappen fra state
    setFolders(prev => prev.filter(f => f.id !== folderId));
    
    // 2. Flytt eventuelle dokumenter i mappen ut til roten så ingen data går tapt
    setDocuments(prev => prev.map(d => {
      if (d.folderId === folderId) {
        const unlinked = { ...d, folderId: undefined, updatedAt: new Date().toISOString() };
        saveDocToFirebase(unlinked);
        return unlinked;
      }
      return d;
    }));

    // 3. Slett fra Firestore
    try {
      await deleteDoc(doc(db, 'folders', folderId));
    } catch (err) {
      console.error("Feil ved sletting av mappe fra Firestore:", err);
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    if (!newName.trim()) return;
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        const updated = { ...f, name: newName.trim() };
        saveFolderToFirebase(updated);
        return updated;
      }
      return f;
    }));
  };

  const handleUpdateFolderColor = async (folderId: string, color: string) => {
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        const updated = { ...f, color };
        saveFolderToFirebase(updated);
        return updated;
      }
      return f;
    }));
  };

  const handleReorderFolders = (newFolders: FolderItem[]) => {
    setFolders(newFolders);
  };

  const handleDuplicateDoc = (docId: string) => {
    const original = documents.find(d => d.id === docId);
    if (!original) return;
    const newId = Date.now().toString();
    const duplicated: DocumentItem = {
      ...original,
      id: newId,
      title: `${original.title} (kopi)`,
      subtitle: original.subtitle ? `${original.subtitle} • Kopi` : undefined,
      updatedAt: new Date().toISOString()
    };
    setDocuments(prev => [duplicated, ...prev]);
    setActiveDocId(newId);
    saveDocToFirebase(duplicated);
  };

  const [folderToExportId, setFolderToExportId] = useState<string | null>(null);

  const handleArchiveDoc = (docId: string, isArchived: boolean) => {
    setDocuments(prev => prev.map(d => {
      if (d.id === docId) {
        const updated = { ...d, isArchived, updatedAt: new Date().toISOString() };
        saveDocToFirebase(updated);
        return updated;
      }
      return d;
    }));
  };

  const handleArchiveFolder = (folderId: string, isArchived: boolean) => {
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        const updated = { ...f, isArchived };
        saveFolderToFirebase(updated);
        return updated;
      }
      return f;
    }));
  };

  const [folderForContextModalId, setFolderForContextModalId] = useState<string | null>(null);

  const handleSaveFolderContext = async (folderId: string, customContext: string, focusArea?: string) => {
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        const updated = { ...f, customContext, focusArea };
        saveFolderToFirebase(updated);
        return updated;
      }
      return f;
    }));
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
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSpacingMenu, setShowSpacingMenu] = useState(false);

  // STEG 3: Søk og erstatt state
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [isDocStatsModalOpen, setIsDocStatsModalOpen] = useState(false);

  // STEG 4: Fokusmodus / Zen-mode state
  const [isZenMode, setIsZenMode] = useState(false);
  const [zenTheme, setZenTheme] = useState<'dark' | 'light'>('dark');
  const [zenWidth, setZenWidth] = useState<'normal' | 'wide' | 'xl' | 'full'>('wide');
  const [zenFontSize, setZenFontSize] = useState<'md' | 'lg' | 'xl' | '2xl'>('xl');
  const [zenViewMode, setZenViewMode] = useState<'normal' | 'markdown'>('normal'); // 'normal' = Visuell Word-stil (slik som skriveflaten), 'markdown' = Ren tekst / rå markdown

  // ZOOM / FORSTØRRELSE (Word-stil 50% - 200%)
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // BREDDE FOR SKRIVEFLATEN ('a4' = klassisk A4 794px, 'wide' = bred flate 1020px, 'full' = full bredde 1240px)
  const [editorPageWidth, setEditorPageWidth] = useState<'a4' | 'wide' | 'full'>(() => {
    try {
      const saved = localStorage.getItem('blu_editor_page_width');
      if (saved === 'a4' || saved === 'wide' || saved === 'full') return saved;
    } catch (e) {}
    return 'wide'; // Standard: bred for optimal oversikt og skriveflate
  });

  // VERKTØYLINJE-MODUS (Word-stil: 'full' (2 linjer) | 'compact' (1 linje) | 'hidden' (helt skjult))
  type ToolbarMode = 'full' | 'compact' | 'hidden';
  const [toolbarMode, setToolbarMode] = useState<ToolbarMode>(() => {
    try {
      const saved = localStorage.getItem('blu_toolbar_mode');
      if (saved === 'full' || saved === 'compact' || saved === 'hidden') return saved;
    } catch (e) {}
    return 'full';
  });
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);
  const [isRibbonMenuOpen, setIsRibbonMenuOpen] = useState(false);
  const toolbarHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('blu_toolbar_mode', toolbarMode);
    } catch (e) {}
  }, [toolbarMode]);

  const handleToolbarTriggerMouseEnter = () => {
    if (toolbarHoverTimeoutRef.current) {
      clearTimeout(toolbarHoverTimeoutRef.current);
      toolbarHoverTimeoutRef.current = null;
    }
    setIsToolbarHovered(true);
  };

  const handleToolbarMouseLeave = () => {
    if (toolbarHoverTimeoutRef.current) {
      clearTimeout(toolbarHoverTimeoutRef.current);
    }
    toolbarHoverTimeoutRef.current = setTimeout(() => {
      setIsToolbarHovered(false);
      setIsRibbonMenuOpen(false);
    }, 380);
  };

  const handleToolbarContainerMouseEnter = () => {
    if (toolbarHoverTimeoutRef.current) {
      clearTimeout(toolbarHoverTimeoutRef.current);
      toolbarHoverTimeoutRef.current = null;
    }
    setIsToolbarHovered(true);
  };

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
          latestDocToSaveRef.current = updatedDoc;
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
          }, 800);
          
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
    justifyLeft: boolean;
    justifyCenter: boolean;
    justifyRight: boolean;
    justifyFull: boolean;
  }>({
    bold: false,
    italic: false,
    underline: false,
    ul: false,
    ol: false,
    quote: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false
  });

  const wysiwygRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeDocContentRef = useRef<string>('');
  activeDocContentRef.current = typeof activeDoc?.content === 'string' ? activeDoc.content : '';

  const zenWysiwygRef = useRef<HTMLDivElement>(null);

  const getActiveEditorElement = (): HTMLDivElement | null => {
    if (isZenMode && zenViewMode === 'normal') {
      return zenWysiwygRef.current;
    }
    return wysiwygRef.current;
  };

  const isUserTypingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sjekker aktiv formatering for verktøylinje-knapper i sanntid på tvers av alle A4-ark
  const checkActiveFormatting = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode) return;

    let node: Node | null = selection.anchorNode;
    let foundHeading: 'h1' | 'h2' | 'h3' | 'p' | null = null;
    let isQuote = false;

    while (node && !(node as HTMLElement)?.classList?.contains('academic-editor-surface')) {
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
      quote: isQuote,
      justifyLeft: document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight: document.queryCommandState('justifyRight'),
      justifyFull: document.queryCommandState('justifyFull')
    });
  }, []);

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

    const isWysiwygActive = editorMode === 'wysiwyg' || (isZenMode && zenViewMode === 'normal');
    const activeEditor = getActiveEditorElement();

    if (isWysiwygActive && activeEditor) {
      const targetHtml = markdownToHtml(targetItem.content);
      if (activeEditor.innerHTML !== targetHtml) {
        activeEditor.innerHTML = targetHtml;
      }
      activeEditor.focus();
    } else if (textareaRef.current) {
      textareaRef.current.value = targetItem.content;
      textareaRef.current.focus();
    }

    checkActiveFormatting();

    setTimeout(() => {
      isHistoryNavigatingRef.current = false;
    }, 120);
  }, [activeDoc?.content, activeDoc?.id, editorMode, isZenMode, zenViewMode, checkActiveFormatting]);

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

    const isWysiwygActive = editorMode === 'wysiwyg' || (isZenMode && zenViewMode === 'normal');
    const activeEditor = getActiveEditorElement();

    if (isWysiwygActive && activeEditor) {
      const targetHtml = markdownToHtml(targetItem.content);
      if (activeEditor.innerHTML !== targetHtml) {
        activeEditor.innerHTML = targetHtml;
      }
      activeEditor.focus();
    } else if (textareaRef.current) {
      textareaRef.current.value = targetItem.content;
      textareaRef.current.focus();
    }

    checkActiveFormatting();

    setTimeout(() => {
      isHistoryNavigatingRef.current = false;
    }, 120);
  }, [editorMode, isZenMode, zenViewMode, checkActiveFormatting]);

  // Sikrer at alle kulepunkter og setninger etter punktum automatisk får stor forbokstav (Word-regel)
  const capitalizeListItemsInEditor = (container: HTMLElement | null) => {
    if (!container) return;

    // 1. Kulepunkter og lister: første bokstav alltid stor
    const listItems = container.querySelectorAll('li');
    listItems.forEach(li => {
      const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT, null);
      let textNode = walker.nextNode() as Text | null;
      while (textNode) {
        if (textNode.parentElement?.closest('li') !== li) {
          textNode = walker.nextNode() as Text | null;
          continue;
        }
        const val = textNode.nodeValue || '';
        const match = val.match(/^(\s*)([a-zæøå])/);
        if (match) {
          const leadingSpaces = match[1];
          const lowerChar = match[2];
          const upperChar = lowerChar.toLocaleUpperCase('nb-NO');
          textNode.nodeValue = leadingSpaces + upperChar + val.slice(leadingSpaces.length + 1);
          break;
        } else if (val.trim().length > 0) {
          break;
        }
        textNode = walker.nextNode() as Text | null;
      }
    });

    // 2. Stor bokstav etter punktum, utropstegn og spørsmålstegn i alle avsnitt og blokker
    const sel = window.getSelection();
    const activeTextNode = sel && sel.rangeCount > 0 ? sel.anchorNode : null;
    const activeOffset = sel && sel.rangeCount > 0 ? sel.anchorOffset : 0;

    const allBlocks = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, li');
    allBlocks.forEach(block => {
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null);
      let textNode = walker.nextNode() as Text | null;
      while (textNode) {
        const val = textNode.nodeValue || '';
        if (/[.!?]["'»”)]?\s+[a-zæøå]/.test(val)) {
          const updatedVal = val.replace(/([.!?]["'»”)]?\s+)([a-zæøå])/g, (_match, prefix, char) => {
            return prefix + char.toLocaleUpperCase('nb-NO');
          });

          if (updatedVal !== val) {
            const isCurrentCaretNode = textNode === activeTextNode;
            textNode.nodeValue = updatedVal;
            if (isCurrentCaretNode && sel) {
              try {
                const newRange = document.createRange();
                newRange.setStart(textNode, Math.min(activeOffset, updatedVal.length));
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);
              } catch {}
            }
          }
        }
        textNode = walker.nextNode() as Text | null;
      }
    });
  };

  // Hjelpefunksjon for å auto-kapitalisere kulepunkter og setninger etter punktum i råtekst (f.eks. Zen-modus)
  const autoCapitalizeMarkdownBullets = (text: string): string => {
    if (!text) return text;
    return text
      .replace(/^(\s*[-*]\s+)([a-zæøå])/gm, (_m, prefix, char) => prefix + char.toLocaleUpperCase('nb-NO'))
      .replace(/^(\s*\d+\.\s+)([a-zæøå])/gm, (_m, prefix, char) => prefix + char.toLocaleUpperCase('nb-NO'))
      .replace(/([.!?]["'»”)]?\s+)([a-zæøå])/g, (_m, prefix, char) => prefix + char.toLocaleUpperCase('nb-NO'));
  };

  // Fanger opp tastetrykk i sanntid: gjør første bokstav i kulepunkter, avsnitt og etter punktum automatisk til stor bokstav (Word autocorrect)
  const handleWysiwygBeforeInput = (e: React.FormEvent<HTMLDivElement>) => {
    const nativeEvent = e.nativeEvent as InputEvent;
    if (!nativeEvent) return;

    if (nativeEvent.inputType === 'insertText' && nativeEvent.data) {
      const data = nativeEvent.data;
      if (/^[a-zæøå]$/.test(data)) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          let node: Node | null = range.startContainer;
          let liNode: HTMLElement | null = null;
          let blockNode: HTMLElement | null = null;
          const activeEditor = getActiveEditorElement();

          while (node && node !== activeEditor) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              const tag = el.tagName.toLowerCase();
              if (tag === 'li' && !liNode) {
                liNode = el;
              }
              if (/^(li|p|h[1-6]|blockquote|div)$/.test(tag) && !blockNode) {
                blockNode = el;
              }
            }
            node = node.parentNode;
          }

          const targetContainer = liNode || blockNode || activeEditor;
          if (targetContainer) {
            const preRange = document.createRange();
            preRange.selectNodeContents(targetContainer);
            preRange.setEnd(range.startContainer, range.startOffset);

            // Unngå tekst fra underordnede lister hvis i li
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(preRange.cloneContents());
            if (liNode) {
              const subLists = tempDiv.querySelectorAll('ul, ol');
              subLists.forEach(s => s.remove());
            }
            const textBefore = tempDiv.textContent || '';

            // Sjekk om vi er ved starten av et avsnitt / kulepunkt, eller etter punktum / utropstegn / spørsmålstegn
            const isAtStart = textBefore.trim() === '';
            const isAfterPeriod = /[.!?]["'»”)]?\s+$/.test(textBefore);

            if (isAtStart || isAfterPeriod) {
              e.preventDefault();
              const upper = data.toLocaleUpperCase('nb-NO');
              document.execCommand('insertText', false, upper);
              handleWysiwygInput();
              return;
            }
          }
        }
      }
    }
  };

  const handleWysiwygPaste = () => {
    setTimeout(() => {
      const activeEditor = getActiveEditorElement();
      if (activeEditor) {
        capitalizeListItemsInEditor(activeEditor);
        handleWysiwygInput();
      }
    }, 10);
  };

  const handleWysiwygInput = () => {
    isUserTypingRef.current = true;
    const activeEditor = getActiveEditorElement();
    if (!activeEditor) return;
    capitalizeListItemsInEditor(activeEditor);
    const newHtml = activeEditor.innerHTML;
    const newMd = htmlToMarkdown(newHtml);
    handleUpdateActiveDoc({ content: newMd });
    checkActiveFormatting();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      isUserTypingRef.current = false;
    }, 400);
  };

  // Innrykk / underpunkter for Tab og Shift+Tab (Word-standard)
  const handleTabIndent = (isShift: boolean, targetEl?: HTMLElement | null) => {
    const isWysiwygActive = editorMode === 'wysiwyg' || (isZenMode && zenViewMode === 'normal');
    const activeEditor = getActiveEditorElement();
    if (isWysiwygActive && activeEditor) {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      const anchor = sel.anchorNode;
      const li = anchor?.nodeType === Node.ELEMENT_NODE
        ? (anchor as HTMLElement).closest('li')
        : anchor?.parentElement?.closest('li');

      if (isShift) {
        // Shift+Tab: Rykk ut (Outdent)
        if (li) {
          const parentList = li.parentElement;
          const grandParentLi = parentList?.parentElement?.closest('li');
          const grandParentList = parentList?.parentElement?.closest('ul, ol');

          document.execCommand('outdent', false);

          if (parentList && grandParentList && li.parentElement === parentList) {
            if (grandParentLi && grandParentLi.parentNode) {
              grandParentLi.parentNode.insertBefore(li, grandParentLi.nextSibling);
            } else {
              grandParentList.appendChild(li);
            }
            if (parentList.children.length === 0) {
              parentList.remove();
            }
            const newRange = document.createRange();
            newRange.selectNodeContents(li);
            newRange.collapse(false);
            sel.removeAllRanges();
            sel.addRange(newRange);
          }
        } else {
          document.execCommand('outdent', false);
        }
        capitalizeListItemsInEditor(activeEditor);
        handleWysiwygInput();
        checkActiveFormatting();
      } else {
        // Tab: Rykk inn (Indent)
        if (li) {
          // Kulepunkt / liste: Opprett nytt underpunkt med innrykk og nytt symbol
          const prevLi = li.previousElementSibling as HTMLElement | null;
          const parentList = li.parentElement;
          const listTag = parentList?.tagName.toLowerCase() === 'ol' ? 'ol' : 'ul';

          if (!prevLi && parentList) {
            const subList = document.createElement(listTag);
            parentList.insertBefore(subList, li);
            subList.appendChild(li);
            const newRange = document.createRange();
            newRange.selectNodeContents(li);
            newRange.collapse(false);
            sel.removeAllRanges();
            sel.addRange(newRange);
          } else {
            document.execCommand('indent', false);
            const bq = li.closest('blockquote');
            if (bq && parentList && parentList.contains(bq)) {
              const subList = document.createElement(listTag);
              while (bq.firstChild) {
                subList.appendChild(bq.firstChild);
              }
              bq.parentNode?.replaceChild(subList, bq);
            } else if (prevLi && li.parentElement === parentList) {
              let subList = prevLi.querySelector(`:scope > ${listTag}`) as HTMLElement | null;
              if (!subList) {
                subList = document.createElement(listTag);
                prevLi.appendChild(subList);
              }
              subList.appendChild(li);
              const newRange = document.createRange();
              newRange.selectNodeContents(li);
              newRange.collapse(false);
              sel.removeAllRanges();
              sel.addRange(newRange);
            }
          }

          capitalizeListItemsInEditor(activeEditor);
          handleWysiwygInput();
          checkActiveFormatting();
        } else {
          // Vanlig brødtekst / avsnitt: Rykk inn
          const indentSuccess = document.execCommand('indent', false);
          if (!indentSuccess) {
            document.execCommand('insertText', false, '    ');
          }
          handleWysiwygInput();
          checkActiveFormatting();
        }
      }
    } else {
      // Textarea i markdown-visning eller Zen-modus
      const textarea = (targetEl instanceof HTMLTextAreaElement ? targetEl : null) || textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = val.indexOf('\n', end);
      const actualLineEnd = lineEnd === -1 ? val.length : lineEnd;
      const line = val.slice(lineStart, actualLineEnd);

      if (isShift) {
        // Rykk ut
        if (line.startsWith('  ')) {
          const newLine = line.slice(2);
          const newVal = val.slice(0, lineStart) + newLine + val.slice(actualLineEnd);
          handleUpdateActiveDoc({ content: newVal });
          setTimeout(() => {
            textarea.setSelectionRange(Math.max(lineStart, start - 2), Math.max(lineStart, end - 2));
          }, 0);
        } else if (line.startsWith('\t')) {
          const newLine = line.slice(1);
          const newVal = val.slice(0, lineStart) + newLine + val.slice(actualLineEnd);
          handleUpdateActiveDoc({ content: newVal });
          setTimeout(() => {
            textarea.setSelectionRange(Math.max(lineStart, start - 1), Math.max(lineStart, end - 1));
          }, 0);
        }
      } else {
        // Rykk inn
        if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
          // Kulepunkt / liste: 2 mellomrom gir underpunkt med nytt kulepunktsymbol
          const newLine = '  ' + line;
          const newVal = val.slice(0, lineStart) + newLine + val.slice(actualLineEnd);
          handleUpdateActiveDoc({ content: autoCapitalizeMarkdownBullets(newVal) });
          setTimeout(() => {
            textarea.setSelectionRange(start + 2, end + 2);
          }, 0);
        } else {
          // Vanlig innrykk
          const newVal = val.slice(0, start) + '    ' + val.slice(end);
          handleUpdateActiveDoc({ content: newVal });
          setTimeout(() => {
            textarea.setSelectionRange(start + 4, start + 4);
          }, 0);
        }
      }
    }
  };

  // Snarveier for Tab (innrykk/underpunkter), Ctrl+Z, Ctrl+Y, Ctrl+Enter (Sideskift), Ctrl+F (Søk) og Ctrl+H (Erstatt)
  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    // Sanntids autokapitalisering for Textarea (Zen-modus): stor bokstav etter punktum og ved kulepunkter
    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && /^[a-zæøå]$/.test(e.key)) {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'TEXTAREA') {
        const textarea = target as HTMLTextAreaElement;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const val = textarea.value;
        const beforeCaret = val.slice(0, start);

        const isBulletStart = /(?:^|\n)\s*[-*]\s+$/.test(beforeCaret);
        const isNumberStart = /(?:^|\n)\s*\d+\.\s+$/.test(beforeCaret);
        const isAfterPeriod = /(?:[.!?]["'»”)]?)\s*$/.test(beforeCaret) || /(?:^|\n)\s*$/.test(beforeCaret);

        if (isBulletStart || isNumberStart || isAfterPeriod) {
          e.preventDefault();
          const upper = e.key.toLocaleUpperCase('nb-NO');
          const newVal = val.slice(0, start) + upper + val.slice(end);
          handleUpdateActiveDoc({ content: newVal });
          setTimeout(() => {
            textarea.setSelectionRange(start + 1, start + 1);
          }, 0);
          return;
        }
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      handleTabIndent(e.shiftKey, e.target as HTMLElement);
      return;
    }
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'TEXTAREA') {
        const textarea = target as HTMLTextAreaElement;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const val = textarea.value;

        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        const line = val.slice(lineStart, start);
        const bulletMatch = line.match(/^(\s*[-*]\s+)(.*)$/);
        const numberMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);

        if (bulletMatch) {
          e.preventDefault();
          const prefix = bulletMatch[1];
          const textAfter = bulletMatch[2].trim();
          if (!textAfter) {
            const newVal = val.slice(0, lineStart) + val.slice(start);
            handleUpdateActiveDoc({ content: newVal });
            setTimeout(() => {
              textarea.setSelectionRange(lineStart, lineStart);
            }, 0);
          } else {
            const insert = '\n' + prefix;
            const newVal = val.slice(0, start) + insert + val.slice(end);
            handleUpdateActiveDoc({ content: newVal });
            setTimeout(() => {
              textarea.setSelectionRange(start + insert.length, start + insert.length);
            }, 0);
          }
          return;
        } else if (numberMatch) {
          e.preventDefault();
          const indent = numberMatch[1];
          const num = parseInt(numberMatch[2], 10);
          const textAfter = numberMatch[3].trim();
          if (!textAfter) {
            const newVal = val.slice(0, lineStart) + val.slice(start);
            handleUpdateActiveDoc({ content: newVal });
            setTimeout(() => {
              textarea.setSelectionRange(lineStart, lineStart);
            }, 0);
          } else {
            const insert = `\n${indent}${num + 1}. `;
            const newVal = val.slice(0, start) + insert + val.slice(end);
            handleUpdateActiveDoc({ content: newVal });
            setTimeout(() => {
              textarea.setSelectionRange(start + insert.length, start + insert.length);
            }, 0);
          }
          return;
        }
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'F1') {
      e.preventDefault();
      setToolbarMode(prev => prev === 'hidden' ? 'full' : 'hidden');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      applyFormatting('pagebreak');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setIsFindReplaceOpen(true);
      setIsReplaceMode(false);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      setIsFindReplaceOpen(true);
      setIsReplaceMode(true);
      return;
    }
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

  // Global tastelytter for hurtigtaster
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'editor' || editorTab !== 'write') return;
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT' && !target.classList.contains('find-input')) return;
      if (target && target.tagName === 'TEXTAREA' && target !== textareaRef.current) return;

      if (e.key === 'Escape') {
        if (isFindReplaceOpen) {
          e.preventDefault();
          setIsFindReplaceOpen(false);
        } else if (isZenMode) {
          e.preventDefault();
          setIsZenMode(false);
        }
      } else if (e.key === 'F11' || ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        setIsZenMode(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFindReplaceOpen(true);
        setIsReplaceMode(false);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setIsFindReplaceOpen(true);
        setIsReplaceMode(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        applyFormatting('pagebreak');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
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
  }, [viewMode, editorTab, handleUndo, handleRedo, isFindReplaceOpen, isZenMode]);

  // STEG 3: Søk og erstatt handlinger
  const handleFindNext = () => {
    if (!findQuery.trim()) return;
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (win.find) {
        win.find(findQuery, matchCase, false, true, false, false, false);
      }
    }
  };

  const handleFindPrev = () => {
    if (!findQuery.trim()) return;
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (win.find) {
        win.find(findQuery, matchCase, true, true, false, false, false);
      }
    }
  };

  const handleReplaceCurrent = () => {
    if (!findQuery.trim()) return;
    const currentDocContent = typeof activeDoc?.content === 'string' ? activeDoc.content : '';
    const flags = matchCase ? '' : 'i';
    try {
      const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      const newContent = currentDocContent.replace(regex, replaceQuery);
      if (newContent !== currentDocContent) {
        pushHistorySnapshot(currentDocContent, true);
        handleUpdateActiveDoc({ content: newContent });
        if (editorMode === 'wysiwyg' && wysiwygRef.current) {
          wysiwygRef.current.innerHTML = markdownToHtml(newContent);
        }
      }
    } catch {}
  };

  const handleReplaceAll = () => {
    if (!findQuery.trim()) return;
    const currentDocContent = typeof activeDoc?.content === 'string' ? activeDoc.content : '';
    const flags = matchCase ? 'g' : 'gi';
    try {
      const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      const matchCount = (currentDocContent.match(regex) || []).length;
      if (matchCount === 0) return;
      pushHistorySnapshot(currentDocContent, true);
      const newContent = currentDocContent.replace(regex, replaceQuery);
      handleUpdateActiveDoc({ content: newContent });
      if (editorMode === 'wysiwyg' && wysiwygRef.current) {
        wysiwygRef.current.innerHTML = markdownToHtml(newContent);
      }
    } catch {}
  };

  // Synkroniserer fra activeDoc.content til WYSIWYG når dokumentet lastes, importeres eller oppdateres eksternt
  useEffect(() => {
    if (isUserTypingRef.current) return;

    const currentDocContent = typeof activeDoc?.content === 'string' ? activeDoc.content : '';
    const targetHtml = markdownToHtml(currentDocContent);

    if (wysiwygRef.current && wysiwygRef.current.innerHTML !== targetHtml) {
      wysiwygRef.current.innerHTML = targetHtml;
    }

    if (isZenMode && zenViewMode === 'normal' && zenWysiwygRef.current && zenWysiwygRef.current.innerHTML !== targetHtml) {
      zenWysiwygRef.current.innerHTML = targetHtml;
    }
  }, [activeDoc?.id, activeDoc?.content, editorMode, isZenMode, zenViewMode]);

  // Når fokusmodus åpnes eller visningsmodus skifter til normal, initialiser innholdet med full formatering
  useEffect(() => {
    if (isZenMode && zenViewMode === 'normal' && zenWysiwygRef.current) {
      const currentDocContent = typeof activeDoc?.content === 'string' ? activeDoc.content : '';
      const html = markdownToHtml(currentDocContent);
      if (zenWysiwygRef.current.innerHTML !== html) {
        zenWysiwygRef.current.innerHTML = html;
      }
    }
  }, [isZenMode, zenViewMode]);

  // Når man forlater fokusmodus, sørg for at hovedskriveflaten er 100% oppdatert
  useEffect(() => {
    if (!isZenMode && wysiwygRef.current) {
      const currentDocContent = typeof activeDoc?.content === 'string' ? activeDoc.content : '';
      const targetHtml = markdownToHtml(currentDocContent);
      if (wysiwygRef.current.innerHTML !== targetHtml) {
        wysiwygRef.current.innerHTML = targetHtml;
      }
    }
  }, [isZenMode]);

  const handleFontSizeChange = (size: string) => {
    handleUpdateActiveDoc({ fontSize: size });
    
    // Hvis brukeren har markert tekst i editoren, endre størrelse på den markerte teksten
    try {
      const activeEditor = getActiveEditorElement();
      const sel = window.getSelection();
      if (activeEditor && sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        document.execCommand('fontSize', false, '7');
        const fontTags = activeEditor.getElementsByTagName('font');
        for (let i = 0; i < fontTags.length; i++) {
          const font = fontTags[i];
          if (font.getAttribute('size') === '7') {
            font.removeAttribute('size');
            font.style.fontSize = `${size}pt`;
          }
        }
        handleWysiwygInput();
      }
    } catch (e) {
      console.warn("Kunne ikke sette fontstørrelse på utvalg:", e);
    }
  };

  const applyFormatting = (type: string) => {
    const currentDocContent = typeof activeDoc?.content === 'string' ? activeDoc.content : '';
    pushHistorySnapshot(currentDocContent, true);

    const activeEditor = getActiveEditorElement();
    if (activeEditor) {
      activeEditor.focus();

      const stripLeadingHashesFromSelection = () => {
        try {
          const sel = window.getSelection();
          if (!sel || !sel.anchorNode) return;
          let node: Node | null = sel.anchorNode;
          while (node && node !== activeEditor) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              const tag = el.tagName.toLowerCase();
              if (/^(h[1-6]|p|div|blockquote)$/.test(tag)) {
                if (/^#+\s*/.test(el.textContent || '')) {
                  el.innerHTML = el.innerHTML.replace(/^#+\s*/, '');
                }
                break;
              }
            }
            node = node.parentNode;
          }
        } catch {}
      };

      if (type === 'pagebreak') {
        activeEditor.focus();
        const pageBreakHtml = '<div class="page-break-indicator" contenteditable="false" data-pagebreak="true"><span class="page-break-line"></span><span class="page-break-badge">📄 Sideskift (Ny side)</span><span class="page-break-line"></span></div><p><br></p>';

        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();

          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = pageBreakHtml;
          const frag = document.createDocumentFragment();
          let node: Node | null;
          let lastNode: Node | null = null;
          while ((node = tempDiv.firstChild)) {
            lastNode = frag.appendChild(node);
          }
          range.insertNode(frag);

          if (lastNode) {
            const newRange = document.createRange();
            newRange.setStart(lastNode, 0);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
          }
        } else {
          document.execCommand('insertHTML', false, pageBreakHtml);
        }

        handleWysiwygInput();
        return;
      }

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
            stripLeadingHashesFromSelection();
          }
          break;
        case 'h2':
          if (activeHeading === 'h2') {
            document.execCommand('formatBlock', false, '<p>');
          } else {
            document.execCommand('formatBlock', false, '<h2>');
            stripLeadingHashesFromSelection();
          }
          break;
        case 'h3':
          if (activeHeading === 'h3') {
            document.execCommand('formatBlock', false, '<p>');
          } else {
            document.execCommand('formatBlock', false, '<h3>');
            stripLeadingHashesFromSelection();
          }
          break;
        case 'list':
          document.execCommand('insertUnorderedList', false);
          capitalizeListItemsInEditor(activeEditor);
          break;
        case 'orderedList':
          document.execCommand('insertOrderedList', false);
          capitalizeListItemsInEditor(activeEditor);
          break;
        case 'quote':
          if (activeStyles.quote) {
            document.execCommand('formatBlock', false, '<p>');
          } else {
            document.execCommand('formatBlock', false, '<blockquote>');
          }
          break;

        case 'justifyLeft':
          document.execCommand('justifyLeft', false);
          break;
        case 'justifyCenter':
          document.execCommand('justifyCenter', false);
          break;
        case 'justifyRight':
          document.execCommand('justifyRight', false);
          break;
        case 'justifyFull':
          document.execCommand('justifyFull', false);
          break;
        case 'indent':
          handleTabIndent(false);
          break;
        case 'outdent':
          handleTabIndent(true);
          break;
        case 'highlight-yellow':
          document.execCommand('backColor', false, '#fef08a');
          break;
        case 'highlight-green':
          document.execCommand('backColor', false, '#bbf7d0');
          break;
        case 'highlight-pink':
          document.execCommand('backColor', false, '#fbcfe8');
          break;
        case 'highlight-blue':
          document.execCommand('backColor', false, '#bae6fd');
          break;
        case 'highlight-clear':
          document.execCommand('backColor', false, 'transparent');
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
      case 'pagebreak': replacement = `\n\n<!-- pagebreak -->\n\n`; newStart = start + replacement.length; newEnd = newStart; break;
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
    const isWysiwygActive = editorMode === 'wysiwyg' || (isZenMode && zenViewMode === 'normal');
    const activeEditor = getActiveEditorElement();

    // 1. Sett inn in-text citation i teksten
    if (isWysiwygActive && activeEditor) {
      activeEditor.focus();
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
      if (isWysiwygActive && activeEditor) {
        currentContent = htmlToMarkdown(activeEditor.innerHTML);
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

        if (isWysiwygActive && activeEditor) {
          activeEditor.innerHTML = markdownToHtml(updatedContent);
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
      className="h-auto md:h-auto lg:h-auto min-h-[1050px] overflow-visible rounded-xl md:rounded-2xl shadow-sm"
      mainClassName="overflow-visible flex-1 flex flex-col bg-slate-50/50 relative h-auto md:h-auto"
      subtitle="Strukturer, skriv og analyser dine barnehagepedagogiske oppgaver"
      icon={<FileText className="w-6 h-6" />}
      actionButtonLabel="Ny oppgave"
      secondaryActionButtonLabel="Nytt notat / kladd"
      onSecondaryActionClick={handleCreateNote}
      secondaryActionButtonIcon={<StickyNote className="w-3.5 h-3.5 text-amber-400" />}
      folders={folders}
      onAddFolder={() => setIsCreatingFolder(true)}
      onMoveToFolder={handleMoveDoc}
      onDeleteFolder={handleDeleteFolder}
      onRenameFolder={handleRenameFolder}
      onUpdateFolderColor={handleUpdateFolderColor}
      onArchiveFolder={handleArchiveFolder}
      onExportFolder={(fId) => setFolderToExportId(fId)}
      onEditFolderContext={(fId) => setFolderForContextModalId(fId)}
      onReorderFolders={handleReorderFolders}
      onDuplicateItem={handleDuplicateDoc}
      onArchiveItem={handleArchiveDoc}
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
      <div className="flex h-auto w-full gap-4 relative min-h-[1050px] overflow-visible">
        
        {/* SENTER: Skriveflaten */}
        <div className="flex-1 flex flex-col h-auto min-h-[1050px] bg-white rounded-2xl border border-slate-200/80 shadow-sm min-w-0 transition-all duration-300 overflow-visible">
          <div className="px-4 sm:px-6 py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
            <div className="flex items-center gap-2 flex-wrap shrink-0">
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

              {/* Vis / Skjul Superveileder-pille (Plassert sammen med Skriveflate, Oppgaveoppsett og Kvalitetssjekk) */}
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

              {/* Mappekontekst knapp hvis dokumentet er i en mappe */}
              {(() => {
                const activeFolder = folders.find(f => f.id === activeDoc.folderId);
                if (!activeFolder) return null;
                const hasCtx = Boolean(activeFolder.customContext?.trim());
                return (
                  <button
                    type="button"
                    onClick={() => setFolderForContextModalId(activeFolder.id)}
                    className={`h-8 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all cursor-pointer text-[11px] font-bold shrink-0 ${
                      hasCtx
                        ? 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100 shadow-2xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                    title={hasCtx ? `Mappekontekst aktiv: «${activeFolder.name}» (klikk for å endre)` : `Mappe: «${activeFolder.name}» (klikk for å legge til KI-føringer)`}
                  >
                    <Brain className={`w-3.5 h-3.5 ${hasCtx ? 'text-purple-600 animate-pulse' : 'text-slate-400'}`} />
                    <span className="max-w-[130px] truncate">{activeFolder.name}</span>
                    {hasCtx && <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />}
                  </button>
                );
              })()}

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
              
              {/* Fokusmodus-knapp */}
              <button 
                type="button"
                onClick={() => setIsZenMode(true)}
                className="h-8 inline-flex items-center justify-center gap-1.5 px-3 py-1 font-bold rounded-xl transition-all shadow-2xs bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-600 text-xs cursor-pointer shrink-0 whitespace-nowrap"
                title="Åpne forstyrrelsesfri fokusmodus (F11 / Esc for å avslutte)"
              >
                <Maximize2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Fokusmodus</span>
              </button>



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

              {/* Vis / Skjul Verktøylinje (Word-stil / Fullt bånd) - Flyttet direkte til høyre for Leselenke */}
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={handleToolbarTriggerMouseEnter}
                  onMouseLeave={handleToolbarMouseLeave}
                  onClick={() => {
                    if (toolbarMode === 'hidden') setToolbarMode('full');
                    else setToolbarMode(prev => prev === 'full' ? 'compact' : 'hidden');
                  }}
                  className={`h-8 inline-flex items-center justify-center gap-1.5 px-3 py-1 font-bold rounded-xl transition-all shadow-2xs text-xs shrink-0 whitespace-nowrap cursor-pointer ${
                    toolbarMode === 'hidden'
                      ? 'bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 shadow-xs'
                      : 'bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/70 text-slate-700 hover:text-indigo-700'
                  }`}
                  title={
                    toolbarMode === 'hidden'
                      ? "Verktøylinjen er skjult. Hold piltasten over ikonet for å hente den midlertidig ned, eller klikk for å feste."
                      : "Verktøylinje (Word-stil) – Klikk for å veksle visning eller skjul"
                  }
                >
                  {toolbarMode === 'hidden' ? (
                    <ChevronDown className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-bounce" />
                  ) : toolbarMode === 'compact' ? (
                    <AlignLeft className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  ) : (
                    <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  )}
                  <span>
                    {toolbarMode === 'hidden' ? 'Vis verktøylinje' : toolbarMode === 'compact' ? 'Én linje' : 'Fullt bånd'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* View Mode: Editor */}
          {viewMode === 'editor' && (
            <div className="flex-1 flex flex-col h-auto relative">
              {/* STICKY TOOLBAR WRAPPER */}
              <div className={`sticky z-30 bg-white border-b border-slate-200 shadow-sm transition-all ${isFullscreen ? 'top-0' : 'top-16'}`}>
              {/* WORD VISNINGSALTERNATIVER DROPDOWN (Gjenbrukbar komponent) */}
              {(() => {
                const renderRibbonMenuPopup = () => (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 text-left"
                  >
                    <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1 flex items-center justify-between">
                      <span>Båndalternativer (Word)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Ctrl+F1</span>
                    </div>

                    {/* 1. Klassisk bånd (2 linjer) */}
                    <button
                      type="button"
                      onClick={() => { setToolbarMode('full'); setIsRibbonMenuOpen(false); }}
                      className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors cursor-pointer ${
                        toolbarMode === 'full' ? 'bg-indigo-50/80 text-indigo-950 font-medium' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg mt-0.5 ${toolbarMode === 'full' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>Klassisk bånd (2 linjer)</span>
                          {toolbarMode === 'full' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 font-normal leading-tight mt-0.5">
                          Vis alle verktøy og etiketter permanent på to linjer.
                        </p>
                      </div>
                    </button>

                    {/* 2. Forenklet bånd (Én linje) */}
                    <button
                      type="button"
                      onClick={() => { setToolbarMode('compact'); setIsRibbonMenuOpen(false); }}
                      className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors cursor-pointer ${
                        toolbarMode === 'compact' ? 'bg-indigo-50/80 text-indigo-950 font-medium' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg mt-0.5 ${toolbarMode === 'compact' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <AlignLeft className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>Forenklet bånd (Én linje)</span>
                          {toolbarMode === 'compact' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 font-normal leading-tight mt-0.5">
                          Vis de viktigste ikonene på én enkelt linje for optimal skriveplass.
                        </p>
                      </div>
                    </button>

                    {/* 3. Skjul automatisk */}
                    <button
                      type="button"
                      onClick={() => { setToolbarMode('hidden'); setIsRibbonMenuOpen(false); }}
                      className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors cursor-pointer ${
                        toolbarMode === 'hidden' ? 'bg-indigo-50/80 text-indigo-950 font-medium' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg mt-0.5 ${toolbarMode === 'hidden' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>Skjul automatisk (Helt skjult)</span>
                          {toolbarMode === 'hidden' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 font-normal leading-tight mt-0.5">
                          Skjul verktøylinjen. Felles automatisk ned når du holder pekeren over ikonet.
                        </p>
                      </div>
                    </button>
                  </div>
                );

                const renderRibbonTriggerBtn = () => (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsRibbonMenuOpen(!isRibbonMenuOpen)}
                      title="Visningsalternativer for båndet (Word-stil)"
                      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isRibbonMenuOpen 
                          ? 'bg-indigo-100 text-indigo-700' 
                          : 'text-slate-600 hover:text-indigo-700 hover:bg-slate-100'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="hidden lg:inline text-[11px]">Bånd</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                    {isRibbonMenuOpen && renderRibbonMenuPopup()}
                  </div>
                );

                // --- MODUS 1: FULL VISNING (2 DEDIKERTE LINJER - MICROSOFT WORD STIL) ---
                const renderFullToolbarContent = (isFloatingPeek = false) => (
                  <div 
                    className={`border-b border-slate-200 bg-white select-none shrink-0 ${
                      isFloatingPeek ? 'shadow-2xl' : ''
                    }`}
                    onMouseEnter={isFloatingPeek ? handleToolbarContainerMouseEnter : undefined}
                    onMouseLeave={isFloatingPeek ? handleToolbarMouseLeave : undefined}
                  >
                    {/* LINJE 1: Tekstformatering, Font, Linjeavstand & Lister */}
                    <div className="px-4 sm:px-6 py-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-1.5 text-slate-700">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Angre (Undo) og Gjenta (Redo) */}
                        <div className="flex items-center gap-0.5">
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
                        </div>

                        <div className="w-px h-5 bg-slate-200 mx-1" />

                        {/* Skrifttype-velger */}
                        <select
                          value={activeDoc.fontFamily || 'times'}
                          onChange={(e) => handleUpdateActiveDoc({ fontFamily: e.target.value as any })}
                          className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 hover:border-slate-300 focus:outline-none cursor-pointer shadow-2xs"
                          title="Skrifttype for oppgaven"
                        >
                          <option value="times">Times New Roman (APA)</option>
                          <option value="calibri">Calibri</option>
                          <option value="arial">Arial</option>
                          <option value="georgia">Georgia</option>
                        </select>

                        {/* Skriftstørrelse-velger */}
                        <select
                          value={activeDoc.fontSize || '12'}
                          onChange={(e) => handleFontSizeChange(e.target.value)}
                          className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 hover:border-slate-300 focus:outline-none cursor-pointer shadow-2xs min-w-[65px]"
                          title="Skriftstørrelse (12 pt er akademisk standard)"
                        >
                          <option value="9">9 pt</option>
                          <option value="10">10 pt</option>
                          <option value="11">11 pt</option>
                          <option value="12">12 pt (Standard)</option>
                          <option value="14">14 pt</option>
                          <option value="16">16 pt</option>
                          <option value="18">18 pt</option>
                          <option value="20">20 pt</option>
                          <option value="24">24 pt</option>
                        </select>

                        {/* Linjeavstand-velger */}
                        <select
                          value={activeDoc.lineSpacing || '1.5'}
                          onChange={(e) => handleUpdateActiveDoc({ lineSpacing: e.target.value as any })}
                          className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 hover:border-slate-300 focus:outline-none cursor-pointer shadow-2xs"
                          title="Linjeavstand (1.5 er akademisk standard)"
                        >
                          <option value="1.0">1.0 (Enkel)</option>
                          <option value="1.15">1.15</option>
                          <option value="1.5">1.5 (Standard)</option>
                          <option value="2.0">2.0 (Dobbel)</option>
                        </select>

                        <div className="w-px h-5 bg-slate-200 mx-1" />

                        {/* Skriftstiler */}
                        <div className="flex items-center gap-0.5">
                          <button 
                            type="button"
                            onClick={() => applyFormatting('bold')} 
                            title="Fet (Ctrl+B)" 
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.bold ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                          >
                            <Bold className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => applyFormatting('italic')} 
                            title="Kursiv (Ctrl+I)" 
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.italic ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                          >
                            <Italic className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => applyFormatting('underline')} 
                            title="Understreket" 
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.underline ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                          >
                            <Underline className="w-4 h-4" />
                          </button>

                          {/* Markeringspenn (Highlighter) */}
                          <div className="relative">
                            <button 
                              type="button"
                              onClick={() => setShowHighlightMenu(!showHighlightMenu)} 
                              title="Markeringspenn (Tekstutheving)" 
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${showHighlightMenu ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:bg-slate-100 text-slate-700'}`}
                            >
                              <Highlighter className="w-4 h-4" />
                            </button>
                            {showHighlightMenu && (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className="absolute left-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl p-2 z-50 flex items-center gap-1.5 animate-in fade-in zoom-in-95"
                              >
                                <button 
                                  type="button" 
                                  onClick={() => { applyFormatting('highlight-yellow'); setShowHighlightMenu(false); }}
                                  title="Gul markering"
                                  className="w-5 h-5 rounded-md bg-yellow-200 border border-yellow-400 hover:scale-110 transition-transform cursor-pointer"
                                />
                                <button 
                                  type="button" 
                                  onClick={() => { applyFormatting('highlight-green'); setShowHighlightMenu(false); }}
                                  title="Grønn markering"
                                  className="w-5 h-5 rounded-md bg-emerald-200 border border-emerald-400 hover:scale-110 transition-transform cursor-pointer"
                                />
                                <button 
                                  type="button" 
                                  onClick={() => { applyFormatting('highlight-pink'); setShowHighlightMenu(false); }}
                                  title="Rosa markering"
                                  className="w-5 h-5 rounded-md bg-pink-200 border border-pink-400 hover:scale-110 transition-transform cursor-pointer"
                                />
                                <button 
                                  type="button" 
                                  onClick={() => { applyFormatting('highlight-blue'); setShowHighlightMenu(false); }}
                                  title="Blå markering"
                                  className="w-5 h-5 rounded-md bg-sky-200 border border-sky-400 hover:scale-110 transition-transform cursor-pointer"
                                />
                                <button 
                                  type="button" 
                                  onClick={() => { applyFormatting('highlight-clear'); setShowHighlightMenu(false); }}
                                  title="Fjern markering"
                                  className="p-1 text-[10px] font-bold text-slate-500 hover:text-slate-900 border border-slate-200 rounded-md ml-1 hover:bg-slate-50 cursor-pointer"
                                >
                                  Fjern
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="w-px h-5 bg-slate-200 mx-1" />

                        {/* Tekstjustering */}
                        <div className="flex items-center gap-0.5">
                          <button 
                            type="button"
                            onClick={() => applyFormatting('justifyLeft')} 
                            title="Venstrejustert" 
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.justifyLeft ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                          >
                            <AlignLeft className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => applyFormatting('justifyCenter')} 
                            title="Midtstilt" 
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.justifyCenter ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                          >
                            <AlignCenter className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => applyFormatting('justifyRight')} 
                            title="Høyrejustert" 
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.justifyRight ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                          >
                            <AlignRight className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => applyFormatting('justifyFull')} 
                            title="Blokkjustert (Justify)" 
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.justifyFull ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                          >
                            <AlignJustify className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="w-px h-5 bg-slate-200 mx-1" />

                        {/* Innrykk og utrykk */}
                        <div className="flex items-center gap-0.5">
                          <button 
                            type="button"
                            onClick={() => applyFormatting('outdent')} 
                            title="Reduser innrykk" 
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
                          >
                            <Outdent className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => applyFormatting('indent')} 
                            title="Øk innrykk" 
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
                          >
                            <Indent className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="w-px h-5 bg-slate-200 mx-1" />

                        {/* Overskrifter H1, H2, H3 */}
                        <div className="flex items-center gap-1">
                          <button 
                            type="button"
                            onClick={() => applyFormatting('h1')} 
                            title="Overskrift 1 (14 pt, starter alltid på ny side i Word/PDF)" 
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
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
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
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
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              activeHeading === 'h3' ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <Heading3 className="w-4 h-4" />
                            <span className="text-[11px]">H3</span>
                          </button>
                        </div>

                        <div className="w-px h-5 bg-slate-200 mx-1" />

                        {/* Lister & Sitater */}
                        <div className="flex items-center gap-0.5">
                          <button 
                            type="button"
                            onClick={() => applyFormatting('list')} 
                            title="Punktliste" 
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.ul ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:bg-slate-100 text-slate-700'}`}
                          >
                            <List className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => applyFormatting('orderedList')} 
                            title="Nummerert liste" 
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.ol ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:bg-slate-100 text-slate-700'}`}
                          >
                            <ListOrdered className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => applyFormatting('quote')} 
                            title="Sitatblokk (1,27 cm innrykk for sitater over 40 ord)" 
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.quote ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:bg-slate-100 text-slate-700'}`}
                          >
                            <Quote className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Hvis dette er midlertidig peking i skjult modus: Fest båndet knapp */}
                      {isFloatingPeek && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => { setToolbarMode('full'); setIsToolbarHovered(false); }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            title="Fest verktøylinjen permanent"
                          >
                            <Pin className="w-3.5 h-3.5 text-white" />
                            <span>Fest båndet</span>
                          </button>
                          {renderRibbonTriggerBtn()}
                          <button
                            type="button"
                            onClick={() => setIsToolbarHovered(false)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Skjul verktøylinje"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* LINJE 2: Innholdsverktøy, Søk & Erstatt, Sideskift, Kilde & Modusvelger */}
                    <div className="px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Sideskift */}
                        <button
                          type="button"
                          onClick={() => applyFormatting('pagebreak')}
                          title="Sett inn sideskift (Ctrl+Enter / Cmd+Enter) – Starter på et nytt A4-ark"
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50/80 border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Scissors className="w-3.5 h-3.5 text-indigo-600 rotate-90" />
                          <span>Sideskift (Ctrl+Enter)</span>
                        </button>

                        {/* + Kilde (APA 7) */}
                        <button
                          type="button"
                          onClick={() => setIsCitationModalOpen(true)}
                          title="Kildeassistent & Litteraturliste (APA 7)"
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <BookMarked className="w-3.5 h-3.5 text-indigo-600" />
                          <span>+ Kilde (APA 7)</span>
                        </button>

                        {/* Søk og erstatt med ikon OG tekst */}
                        <button
                          type="button"
                          onClick={() => { setIsFindReplaceOpen(!isFindReplaceOpen); setIsReplaceMode(false); }}
                          title="Søk og erstatt i oppgaven (Ctrl+F / Ctrl+H)"
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                            isFindReplaceOpen 
                              ? 'bg-indigo-600 text-white shadow-2xs' 
                              : 'bg-white text-slate-700 hover:text-indigo-700 hover:bg-indigo-50/80 border border-slate-200'
                          }`}
                        >
                          <Search className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Søk & erstatt</span>
                        </button>

                        {/* Fokusmodus */}
                        <button
                          type="button"
                          onClick={() => setIsZenMode(true)}
                          title="Åpne forstyrrelsesfri fokusmodus (F11 / Esc)"
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-700 border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Fokusmodus</span>
                        </button>

                        {/* Zoom-velger i verktøylinjen */}
                        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
                            title="Forminsk (Zoom ut)"
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          <select
                            value={zoomLevel}
                            onChange={(e) => setZoomLevel(Number(e.target.value))}
                            className="text-[11px] font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer py-0.5"
                            title="Zoom / Forstørrelse av A4-arket"
                          >
                            <option value="75">75 %</option>
                            <option value="90">90 %</option>
                            <option value="100">100 % (Standard)</option>
                            <option value="110">110 %</option>
                            <option value="125">125 %</option>
                            <option value="150">150 %</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => setZoomLevel(prev => Math.min(200, prev + 10))}
                            title="Forstørr (Zoom inn)"
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Høyre: Sidebreddevelger (A4 / Bred / Full) og båndalternativer */}
                      <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-1 p-0.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600">
                          <button
                            type="button"
                            onClick={() => {
                              setEditorPageWidth('a4');
                              try { localStorage.setItem('blu_editor_page_width', 'a4'); } catch (e) {}
                            }}
                            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                              editorPageWidth === 'a4' ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'hover:text-slate-900 text-slate-500'
                            }`}
                            title="Klassisk Word A4-oppsett (794px)"
                          >
                            A4
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditorPageWidth('wide');
                              try { localStorage.setItem('blu_editor_page_width', 'wide'); } catch (e) {}
                            }}
                            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                              editorPageWidth === 'wide' ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'hover:text-slate-900 text-slate-500'
                            }`}
                            title="Bred skriveflate (1020px - Anbefalt for god oversikt og helhet)"
                          >
                            Bred
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditorPageWidth('full');
                              try { localStorage.setItem('blu_editor_page_width', 'full'); } catch (e) {}
                            }}
                            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                              editorPageWidth === 'full' ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'hover:text-slate-900 text-slate-500'
                            }`}
                            title="Full bredde (1240px - Fyller hele boksen)"
                          >
                            Full
                          </button>
                        </div>

                        {!isFloatingPeek && (
                          <div className="flex items-center gap-1">
                            {renderRibbonTriggerBtn()}
                            <button
                              type="button"
                              onClick={() => setToolbarMode('hidden')}
                              title="Skjul verktøylinjen helt (Word-stil) – Hold musepekeren over ikonet for å hente den fram"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );

                // --- MODUS 2: ÉN LINJE / FORENKLET BÅND (SLIK DET ER I WORD) ---
                const renderCompactToolbarContent = (isFloatingPeek = false) => (
                  <div 
                    className={`border-b border-slate-200 bg-white select-none shrink-0 px-4 sm:px-6 py-1.5 flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto no-scrollbar ${
                      isFloatingPeek ? 'shadow-2xl' : ''
                    }`}
                    onMouseEnter={isFloatingPeek ? handleToolbarContainerMouseEnter : undefined}
                    onMouseLeave={isFloatingPeek ? handleToolbarMouseLeave : undefined}
                  >
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0">
                      {/* Angre / Gjenta */}
                      <div className="flex items-center gap-0.5">
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
                      </div>

                      <div className="w-px h-5 bg-slate-200 mx-0.5" />

                      {/* Skrifttype & Linjeavstand */}
                      <select
                        value={activeDoc.fontFamily || 'times'}
                        onChange={(e) => handleUpdateActiveDoc({ fontFamily: e.target.value as any })}
                        className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-700 hover:border-slate-300 focus:outline-none cursor-pointer shadow-2xs"
                        title="Skrifttype for oppgaven"
                      >
                        <option value="times">Times New Roman</option>
                        <option value="calibri">Calibri</option>
                        <option value="arial">Arial</option>
                        <option value="georgia">Georgia</option>
                      </select>

                      {/* Skriftstørrelse */}
                      <select
                        value={activeDoc.fontSize || '12'}
                        onChange={(e) => handleFontSizeChange(e.target.value)}
                        className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-700 hover:border-slate-300 focus:outline-none cursor-pointer shadow-2xs"
                        title="Skriftstørrelse (12 pt er standard)"
                      >
                        <option value="9">9 pt</option>
                        <option value="10">10 pt</option>
                        <option value="11">11 pt</option>
                        <option value="12">12 pt</option>
                        <option value="14">14 pt</option>
                        <option value="16">16 pt</option>
                        <option value="18">18 pt</option>
                        <option value="20">20 pt</option>
                        <option value="24">24 pt</option>
                      </select>

                      <select
                        value={activeDoc.lineSpacing || '1.5'}
                        onChange={(e) => handleUpdateActiveDoc({ lineSpacing: e.target.value as any })}
                        className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-700 hover:border-slate-300 focus:outline-none cursor-pointer shadow-2xs"
                        title="Linjeavstand (1.5 er standard)"
                      >
                        <option value="1.0">1.0</option>
                        <option value="1.15">1.15</option>
                        <option value="1.5">1.5</option>
                        <option value="2.0">2.0</option>
                      </select>

                      <div className="w-px h-5 bg-slate-200 mx-0.5" />

                      {/* B, I, U, Highlight */}
                      <div className="flex items-center gap-0.5">
                        <button 
                          type="button"
                          onClick={() => applyFormatting('bold')} 
                          title="Fet (Ctrl+B)" 
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.bold ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                        >
                          <Bold className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => applyFormatting('italic')} 
                          title="Kursiv (Ctrl+I)" 
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.italic ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                        >
                          <Italic className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => applyFormatting('underline')} 
                          title="Understreket" 
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.underline ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                        >
                          <Underline className="w-4 h-4" />
                        </button>

                        {/* Markeringspenn */}
                        <div className="relative">
                          <button 
                            type="button"
                            onClick={() => setShowHighlightMenu(!showHighlightMenu)} 
                            title="Markeringspenn" 
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${showHighlightMenu ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:bg-slate-100 text-slate-700'}`}
                          >
                            <Highlighter className="w-4 h-4" />
                          </button>
                          {showHighlightMenu && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="absolute left-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl p-2 z-50 flex items-center gap-1.5 animate-in fade-in zoom-in-95"
                            >
                              <button 
                                type="button" 
                                onClick={() => { applyFormatting('highlight-yellow'); setShowHighlightMenu(false); }}
                                title="Gul"
                                className="w-5 h-5 rounded-md bg-yellow-200 border border-yellow-400 hover:scale-110 transition-transform cursor-pointer"
                              />
                              <button 
                                type="button" 
                                onClick={() => { applyFormatting('highlight-green'); setShowHighlightMenu(false); }}
                                title="Grønn"
                                className="w-5 h-5 rounded-md bg-emerald-200 border border-emerald-400 hover:scale-110 transition-transform cursor-pointer"
                              />
                              <button 
                                type="button" 
                                onClick={() => { applyFormatting('highlight-pink'); setShowHighlightMenu(false); }}
                                title="Rosa"
                                className="w-5 h-5 rounded-md bg-pink-200 border border-pink-400 hover:scale-110 transition-transform cursor-pointer"
                              />
                              <button 
                                type="button" 
                                onClick={() => { applyFormatting('highlight-blue'); setShowHighlightMenu(false); }}
                                title="Blå"
                                className="w-5 h-5 rounded-md bg-sky-200 border border-sky-400 hover:scale-110 transition-transform cursor-pointer"
                              />
                              <button 
                                type="button" 
                                onClick={() => { applyFormatting('highlight-clear'); setShowHighlightMenu(false); }}
                                title="Fjern"
                                className="p-1 text-[10px] font-bold text-slate-500 hover:text-slate-900 border border-slate-200 rounded-md ml-1 hover:bg-slate-50 cursor-pointer"
                              >
                                Fjern
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="w-px h-5 bg-slate-200 mx-0.5" />

                      {/* Justering */}
                      <div className="flex items-center gap-0.5">
                        <button 
                          type="button"
                          onClick={() => applyFormatting('justifyLeft')} 
                          title="Venstrejustert" 
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.justifyLeft ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                        >
                          <AlignLeft className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => applyFormatting('justifyCenter')} 
                          title="Midtstilt" 
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.justifyCenter ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                        >
                          <AlignCenter className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => applyFormatting('justifyRight')} 
                          title="Høyrejustert" 
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.justifyRight ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                        >
                          <AlignRight className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => applyFormatting('justifyFull')} 
                          title="Blokkjustert (Justify)" 
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.justifyFull ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                        >
                          <AlignJustify className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="w-px h-5 bg-slate-200 mx-0.5" />

                      {/* H1, H2 */}
                      <div className="flex items-center gap-0.5">
                        <button 
                          type="button"
                          onClick={() => applyFormatting('h1')} 
                          title="Overskrift 1 (starter på ny side)" 
                          className={`px-1.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            activeHeading === 'h1' ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          H1
                        </button>
                        <button 
                          type="button"
                          onClick={() => applyFormatting('h2')} 
                          title="Overskrift 2" 
                          className={`px-1.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            activeHeading === 'h2' ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          H2
                        </button>
                      </div>

                      <div className="w-px h-5 bg-slate-200 mx-0.5" />

                      {/* Lister */}
                      <div className="flex items-center gap-0.5">
                        <button 
                          type="button"
                          onClick={() => applyFormatting('list')} 
                          title="Punktliste" 
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.ul ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:bg-slate-100 text-slate-700'}`}
                        >
                          <List className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => applyFormatting('orderedList')} 
                          title="Nummerert liste" 
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeStyles.ol ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:bg-slate-100 text-slate-700'}`}
                        >
                          <ListOrdered className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="w-px h-5 bg-slate-200 mx-0.5" />

                      {/* Sideskift */}
                      <button
                        type="button"
                        onClick={() => applyFormatting('pagebreak')}
                        title="Sett inn sideskift (Ctrl+Enter / Cmd+Enter)"
                        className="px-2 py-1 rounded-lg text-xs font-bold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50/80 border border-slate-200 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Scissors className="w-3.5 h-3.5 text-indigo-600 rotate-90" />
                        <span className="hidden md:inline">Sideskift</span>
                      </button>

                      {/* + Kilde */}
                      <button
                        type="button"
                        onClick={() => setIsCitationModalOpen(true)}
                        title="Kildeassistent & Litteraturliste (APA 7)"
                        className="px-2 py-1 rounded-lg text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <BookMarked className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="hidden md:inline">+ Kilde</span>
                      </button>

                      {/* Søk og erstatt */}
                      <button
                        type="button"
                        onClick={() => { setIsFindReplaceOpen(!isFindReplaceOpen); setIsReplaceMode(false); }}
                        title="Søk og erstatt (Ctrl+F)"
                        className={`p-1.5 rounded-lg transition-all flex items-center gap-1 shadow-2xs cursor-pointer ${
                          isFindReplaceOpen 
                            ? 'bg-indigo-600 text-white shadow-2xs' 
                            : 'bg-white text-slate-700 hover:text-indigo-700 hover:bg-indigo-50/80 border border-slate-200'
                        }`}
                      >
                        <Search className="w-3.5 h-3.5 text-indigo-600" />
                      </button>

                      {/* Zoom */}
                      <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg px-1 py-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
                          title="Zoom ut"
                          className="p-0.5 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                        >
                          <ZoomOut className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-bold text-slate-700 px-0.5">{zoomLevel}%</span>
                        <button
                          type="button"
                          onClick={() => setZoomLevel(prev => Math.min(200, prev + 10))}
                          title="Zoom inn"
                          className="p-0.5 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                        >
                          <ZoomIn className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Høyre del i kompakt bånd: Visningsalternativer & skjul */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {isFloatingPeek && (
                        <button
                          type="button"
                          onClick={() => { setToolbarMode('compact'); setIsToolbarHovered(false); }}
                          className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Fest verktøylinjen permanent"
                        >
                          <Pin className="w-3.5 h-3.5 text-white" />
                          <span className="hidden sm:inline">Fest bånd</span>
                        </button>
                      )}

                      {renderRibbonTriggerBtn()}
                      
                      <button
                        type="button"
                        onClick={() => {
                          if (isFloatingPeek) setIsToolbarHovered(false);
                          else setToolbarMode('hidden');
                        }}
                        title={isFloatingPeek ? "Lukk" : "Skjul verktøylinjen helt (Word-stil)"}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );

                // Bestem hvilken visning som skal rendres
                if (toolbarMode === 'full') {
                  return renderFullToolbarContent(false);
                }

                if (toolbarMode === 'compact') {
                  return renderCompactToolbarContent(false);
                }

                // Når toolbarMode === 'hidden':
                return (
                  <>
                    {/* Diskret stripe / håndtak som feller ned båndet når pekeren holdes over */}
                    <div 
                      onMouseEnter={handleToolbarTriggerMouseEnter}
                      onMouseLeave={handleToolbarMouseLeave}
                      onClick={() => setToolbarMode('full')}
                      className="w-full py-1 bg-slate-50 hover:bg-indigo-50/80 border-b border-slate-200/80 flex items-center justify-center gap-2 cursor-pointer transition-colors group select-none shrink-0"
                      title="Hold piltasten over ikonet for å hente ned verktøylinjen, eller klikk for å feste den"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-indigo-500 group-hover:translate-y-0.5 transition-transform" />
                      <span className="text-[11px] font-semibold text-slate-500 group-hover:text-indigo-700">
                        Verktøylinjen er skjult • Hold piltasten over for å hente den ned (eller klikk for å feste)
                      </span>
                    </div>

                    {/* Automatisk nedfellbar verktøylinje når pekeren holdes over ikonet / stripen */}
                    {isToolbarHovered && (
                      <div 
                        className="absolute top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 shadow-2xl animate-in slide-in-from-top-2 duration-200"
                        onMouseEnter={handleToolbarContainerMouseEnter}
                        onMouseLeave={handleToolbarMouseLeave}
                      >
                        {renderFullToolbarContent(true)}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* STEG 3: Søk og erstatt panel */}
              {isFindReplaceOpen && (
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex flex-wrap items-center gap-2.5 animate-in fade-in slide-in-from-top-1 text-xs">
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={findQuery}
                      onChange={(e) => setFindQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (e.shiftKey) handleFindPrev();
                          else handleFindNext();
                        }
                      }}
                      placeholder="Søk i teksten..."
                      className="find-input text-xs text-slate-800 bg-transparent border-none focus:outline-none w-32 sm:w-44 placeholder:text-slate-400"
                      autoFocus
                    />
                    <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1">
                      <button
                        type="button"
                        onClick={handleFindPrev}
                        title="Forrige treff (Shift+Enter)"
                        className="p-1 hover:bg-slate-100 text-slate-600 rounded cursor-pointer"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={handleFindNext}
                        title="Neste treff (Enter)"
                        className="p-1 hover:bg-slate-100 text-slate-600 rounded cursor-pointer"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {isReplaceMode ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
                        <Replace className="w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={replaceQuery}
                          onChange={(e) => setReplaceQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleReplaceCurrent();
                            }
                          }}
                          placeholder="Erstatt med..."
                          className="find-input text-xs text-slate-800 bg-transparent border-none focus:outline-none w-32 sm:w-44 placeholder:text-slate-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleReplaceCurrent}
                        className="px-2.5 py-1 font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg shadow-2xs cursor-pointer"
                      >
                        Erstatt
                      </button>
                      <button
                        type="button"
                        onClick={handleReplaceAll}
                        className="px-2.5 py-1 font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-2xs cursor-pointer"
                      >
                        Erstatt alle
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsReplaceMode(true)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline cursor-pointer"
                    >
                      Bytt til erstatt-modus
                    </button>
                  )}

                  <label className="flex items-center gap-1 text-[11px] text-slate-500 select-none cursor-pointer ml-1">
                    <input
                      type="checkbox"
                      checked={matchCase}
                      onChange={(e) => setMatchCase(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                    />
                    <span>Skille store/små</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsFindReplaceOpen(false)}
                    className="ml-auto p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg cursor-pointer"
                    title="Lukk søk (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              </div>

              <div className="flex-1 p-2.5 sm:p-4 md:p-5 bg-slate-100/50 overflow-visible">
                <div className={`mx-auto space-y-3 transition-all duration-300 ${
                  editorPageWidth === 'a4' 
                    ? 'max-w-4xl' 
                    : editorPageWidth === 'wide' 
                    ? 'max-w-5xl' 
                    : 'max-w-6xl w-full'
                }`}>
                  <div className="bg-white rounded-xl shadow-2xs border border-slate-200/80 px-5 py-2.5">
                    <input 
                      type="text" 
                      value={activeDoc.title} 
                      onChange={(e) => handleUpdateActiveDoc({ title: e.target.value })} 
                      placeholder="Oppgavetittel..." 
                      className="w-full text-xl md:text-2xl font-bold text-slate-900 border-none bg-transparent focus:outline-none placeholder:text-slate-300" 
                    />
                  </div>

                  {/* Ekte Word A4-ark */}
                  <div 
                    className="pb-16 origin-top flex flex-col items-center w-full"
                    style={{ zoom: `${zoomLevel}%` }}
                  >
                    <div
                      className={`bg-white rounded-lg shadow-xl border border-slate-300/80 w-full min-h-[1123px] mx-auto p-8 sm:p-12 md:p-14 flex flex-col justify-between relative transition-all duration-300 ${
                        editorPageWidth === 'a4' 
                          ? 'max-w-[794px]' 
                          : editorPageWidth === 'wide' 
                          ? 'max-w-[1020px]' 
                          : 'max-w-[1240px]'
                      }`}
                    >
                      {/* Innhold / Skriveflate på A4-arket */}
                      <div className="flex-1">
                        <div
                          ref={wysiwygRef}
                          contentEditable
                          suppressContentEditableWarning
                          onBeforeInput={handleWysiwygBeforeInput}
                          onInput={handleWysiwygInput}
                          onPaste={handleWysiwygPaste}
                          onKeyDown={handleEditorKeyDown}
                          onKeyUp={checkActiveFormatting}
                          onMouseUp={checkActiveFormatting}
                          onSelect={checkActiveFormatting}
                          style={{
                            fontFamily: activeDoc.fontFamily === 'calibri'
                              ? 'Calibri, Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif'
                              : activeDoc.fontFamily === 'arial'
                              ? 'Arial, Helvetica, sans-serif'
                              : activeDoc.fontFamily === 'georgia'
                              ? 'Georgia, serif'
                              : '"Times New Roman", Times, serif',
                            fontSize: activeDoc.fontSize ? `${activeDoc.fontSize}pt` : '12pt',
                            lineHeight: activeDoc.lineSpacing === '1.0'
                              ? '1.2'
                              : activeDoc.lineSpacing === '1.15'
                              ? '1.38'
                              : activeDoc.lineSpacing === '2.0'
                              ? '2.0'
                              : '1.6'
                          }}
                          className="academic-editor-surface w-full focus:outline-none min-h-[950px]"
                        />
                      </div>

                      {/* A4 Bunntekst */}
                      <div className="flex items-center justify-between pt-4 mt-8 border-t border-slate-100 text-[11px] text-slate-400 select-none">
                        <span className="font-medium text-slate-400">
                          {activeDoc.template || 'Barnehagelærerutdanningen (BLU)'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-400">
                            A4 (2,54 cm marg)
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded">
                            {editorPageWidth === 'a4' ? 'Word A4-oppsett (794px)' : editorPageWidth === 'wide' ? 'Bred skriveflate (1020px)' : 'Full bredde (1240px)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEG 3: Avansert statuslinje og dokumentstatistikk i bunnbaren */}
              {(() => {
                const currentText = typeof activeDoc?.content === 'string' ? activeDoc.content : '';
                const cleanPlainText = currentText
                  .replace(/<[^>]+>/g, '')
                  .replace(/[#*`_~>[\]()]/g, ' ')
                  .trim();
                const charCount = currentText.length;
                const charNoSpacesCount = currentText.replace(/\s/g, '').length;
                const paragraphs = currentText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
                const paragraphCount = paragraphs.length || (cleanPlainText ? 1 : 0);
                const readingTimeMinutes = Math.max(1, Math.ceil((wordCount || 1) / 200));
                const explicitPageBreaks = currentText.match(/<!-- pagebreak -->|---pagebreak---|--- sideskift ---|\[SIDESKIFT\]/g)?.length || 0;
                const estimatedPages = Math.max(1 + explicitPageBreaks, Math.ceil((wordCount || 1) / 400));

                return (
                  <div className="px-6 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 select-none shrink-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-slate-700">
                        Ca. {estimatedPages} {estimatedPages === 1 ? 'side' : 'sider'} (A4)
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        {wordCount} {activeDoc.targetWords ? `/ ${activeDoc.targetWords} ord (${Math.min(100, Math.round((wordCount / activeDoc.targetWords) * 100))}%)` : 'ord'}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>{charCount} tegn ({charNoSpacesCount} u/mellomrom)</span>
                      <span className="text-slate-300 hidden sm:inline">•</span>
                      <span className="hidden sm:inline">{paragraphCount} avsnitt</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 hidden md:flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>~{readingTimeMinutes} min lesetid</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsDocStatsModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
                        title="Åpne detaljert dokumentstatistikk og lesbarhetsanalyse (LIX)"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Statistikk</span>
                      </button>

                      {/* Sidebreddevelger i statuslinjen */}
                      <div className="hidden lg:flex items-center gap-1 pl-3 border-l border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setEditorPageWidth('a4');
                            try { localStorage.setItem('blu_editor_page_width', 'a4'); } catch (e) {}
                          }}
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                            editorPageWidth === 'a4' ? 'bg-indigo-100 text-indigo-700 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                          }`}
                          title="Word A4-bredde (794px)"
                        >
                          A4
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditorPageWidth('wide');
                            try { localStorage.setItem('blu_editor_page_width', 'wide'); } catch (e) {}
                          }}
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                            editorPageWidth === 'wide' ? 'bg-indigo-100 text-indigo-700 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                          }`}
                          title="Bred flate (1020px - Anbefalt)"
                        >
                          Bred
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditorPageWidth('full');
                            try { localStorage.setItem('blu_editor_page_width', 'full'); } catch (e) {}
                          }}
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                            editorPageWidth === 'full' ? 'bg-indigo-100 text-indigo-700 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                          }`}
                          title="Full bredde (1240px)"
                        >
                          Full
                        </button>
                      </div>

                      {/* Zoom-glidebryter og kontroller (Microsoft Word stil i bunnhøyre) */}
                      <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                        <button
                          type="button"
                          onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
                          title="Zoom ut (-10%)"
                          className="p-1 hover:bg-slate-200/70 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="range"
                          min="50"
                          max="175"
                          step="5"
                          value={zoomLevel}
                          onChange={(e) => setZoomLevel(Number(e.target.value))}
                          className="w-16 sm:w-20 md:w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          title={`Zoom: ${zoomLevel}% (Dra for å endre forstørrelse)`}
                        />
                        <button
                          type="button"
                          onClick={() => setZoomLevel(prev => Math.min(200, prev + 10))}
                          title="Zoom inn (+10%)"
                          className="p-1 hover:bg-slate-200/70 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setZoomLevel(100)}
                          title="Nullstill zoom til 100%"
                          className="text-[11px] font-bold text-slate-600 hover:text-indigo-600 px-1.5 py-0.5 rounded hover:bg-slate-200/60 min-w-[38px] text-center cursor-pointer border border-transparent hover:border-slate-200"
                        >
                          {zoomLevel}%
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
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
                        <div key={`outline-sec-${sec.id || 'sec'}-${idx}`} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 transition-all">
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
                          <div key={`outline-toc-ch-${ch.id || 'ch'}-${idx}`} className="space-y-1">
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
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
              />

              {/* Fargevelger */}
              <div className="mb-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Velg fargekode
                </label>
                <div className="flex items-center gap-2">
                  {FOLDER_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewFolderColor(c.id)}
                      className={`w-7 h-7 rounded-full ${c.dot} transition-transform hover:scale-110 cursor-pointer flex items-center justify-center ${
                        newFolderColor === c.id ? 'ring-2 ring-indigo-600 ring-offset-2 scale-110' : 'opacity-70'
                      }`}
                      title={c.name}
                    >
                      {newFolderColor === c.id && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

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

      {/* MAPPE EKSPORT MODAL (WORD KOMPENDIUM / ZIP) */}
      {folderToExportId && (
        <FolderExportModal
          isOpen={Boolean(folderToExportId)}
          onClose={() => setFolderToExportId(null)}
          folderName={folders.find(f => f.id === folderToExportId)?.name || 'Mappe'}
          items={documents.filter(d => d.folderId === folderToExportId)}
          userProfile={{
            name: _props?.user?.displayName || _props?.profile?.name || getAuth().currentUser?.displayName || '',
            institution: _props?.profile?.studiested || _props?.profile?.college || _props?.settings?.studiested || 'Barnehagelærerutdanningen'
          }}
        />
      )}

      {/* MAPPE KONTEKST MODAL */}
      {folderForContextModalId && (
        <FolderContextModal
          isOpen={Boolean(folderForContextModalId)}
          onClose={() => setFolderForContextModalId(null)}
          folder={folders.find(f => f.id === folderForContextModalId) || null}
          onSaveContext={handleSaveFolderContext}
        />
      )}

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

      {/* STEG 3: DETALJERT DOKUMENTSTATISTIKK & LIX MODAL */}
      {(() => {
        const currentText = typeof activeDoc?.content === 'string' ? activeDoc.content : '';
        const cleanPlainText = currentText
          .replace(/<[^>]+>/g, '')
          .replace(/[#*`_~>[\]()]/g, ' ')
          .trim();
        const charCount = currentText.length;
        const charNoSpacesCount = currentText.replace(/\s/g, '').length;
        const paragraphs = currentText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        const paragraphCount = paragraphs.length || (cleanPlainText ? 1 : 0);
        const sentences = cleanPlainText.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const sentenceCount = sentences.length || 1;
        const avgWordsPerSentence = sentenceCount > 0 ? (wordCount / sentenceCount).toFixed(1) : '0';
        const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

        const wordsArray = cleanPlainText.split(/\s+/).filter(w => w.length > 0);
        const longWords = wordsArray.filter(w => w.replace(/[^a-zA-ZæøåÆØÅ]/g, '').length > 6).length;
        const lixIndex = wordCount > 0 ? Math.round((wordCount / sentenceCount) + (longWords * 100 / wordCount)) : 0;
        const explicitPageBreaks = currentText.match(/<!-- pagebreak -->|---pagebreak---|--- sideskift ---|\[SIDESKIFT\]/g)?.length || 0;
        const estimatedPages = Math.max(1 + explicitPageBreaks, Math.ceil((wordCount || 1) / 400));

        return (
          <DocStatsModal
            isOpen={isDocStatsModalOpen}
            onClose={() => setIsDocStatsModalOpen(false)}
            title={activeDoc.title}
            wordCount={wordCount}
            targetWords={activeDoc.targetWords || 1500}
            charCount={charCount}
            charNoSpacesCount={charNoSpacesCount}
            paragraphCount={paragraphCount}
            sentenceCount={sentenceCount}
            avgWordsPerSentence={avgWordsPerSentence}
            readingTimeMinutes={readingTimeMinutes}
            lixIndex={lixIndex}
            estimatedPages={estimatedPages}
          />
        );
      })()}

      {/* STEG 4: FOKUSMODUS (ZEN-MODE) OVERLAY */}
      {isZenMode && (
        <div className={`fixed inset-0 z-50 flex flex-col transition-colors duration-300 ${zenTheme === 'dark' ? 'bg-[#0B0F17] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
          {/* Zen Header */}
          <div className={`px-6 py-3 border-b flex items-center justify-between gap-4 select-none shrink-0 transition-colors ${zenTheme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-xs uppercase tracking-widest font-extrabold text-indigo-500 shrink-0">
                Fokusmodus
              </span>
              <span className="text-slate-400 hidden sm:inline">•</span>
              <input
                type="text"
                value={activeDoc.title}
                onChange={(e) => handleUpdateActiveDoc({ title: e.target.value })}
                placeholder="Oppgavetittel..."
                className={`text-sm font-bold bg-transparent border-none focus:outline-none truncate max-w-xs sm:max-w-md ${zenTheme === 'dark' ? 'text-white placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'}`}
              />
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              {/* Visningsvelger: Normalvisning (Word-stil / formatert) vs Ren tekst (Markdown) */}
              <div className={`flex items-center gap-1 p-0.5 rounded-lg border text-xs font-semibold ${zenTheme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setZenViewMode('normal');
                    setTimeout(() => {
                      if (zenWysiwygRef.current) {
                        const currentDocContent = typeof activeDoc?.content === 'string' ? activeDoc.content : '';
                        zenWysiwygRef.current.innerHTML = markdownToHtml(currentDocContent);
                        zenWysiwygRef.current.focus();
                      }
                    }, 20);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded cursor-pointer transition-all ${
                    zenViewMode === 'normal'
                      ? (zenTheme === 'dark' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-indigo-700 shadow-2xs font-bold')
                      : (zenTheme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                  title="Normalvisning (slik som teksten vises i skriveflaten: overskrifter og kulepunkter, ikke ## og ###)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Normalvisning</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZenViewMode('markdown');
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.focus();
                      }
                    }, 20);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded cursor-pointer transition-all ${
                    zenViewMode === 'markdown'
                      ? (zenTheme === 'dark' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-indigo-700 shadow-2xs font-bold')
                      : (zenTheme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                  title="Ren tekst / Markdown (råtekst med ## og -)"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Ren tekst</span>
                </button>
              </div>

              {/* Breddevelger */}
              <div className={`hidden md:flex items-center gap-1 p-0.5 rounded-lg border text-xs font-semibold ${zenTheme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setZenWidth('normal')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-all ${zenWidth === 'normal' ? (zenTheme === 'dark' ? 'bg-slate-700 text-white' : 'bg-white text-indigo-700 shadow-2xs') : (zenTheme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}
                  title="Normal bredde (768px - A4-stil)"
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setZenWidth('wide')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-all ${zenWidth === 'wide' ? (zenTheme === 'dark' ? 'bg-slate-700 text-white' : 'bg-white text-indigo-700 shadow-2xs') : (zenTheme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}
                  title="Bred skriveflate (1024px - Anbefalt)"
                >
                  Bred
                </button>
                <button
                  type="button"
                  onClick={() => setZenWidth('xl')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-all ${zenWidth === 'xl' ? (zenTheme === 'dark' ? 'bg-slate-700 text-white' : 'bg-white text-indigo-700 shadow-2xs') : (zenTheme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}
                  title="Ekstra bred skriveflate (1280px)"
                >
                  Ekstra bred
                </button>
                <button
                  type="button"
                  onClick={() => setZenWidth('full')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-all ${zenWidth === 'full' ? (zenTheme === 'dark' ? 'bg-slate-700 text-white' : 'bg-white text-indigo-700 shadow-2xs') : (zenTheme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}
                  title="Full skjermbredde"
                >
                  Full
                </button>
              </div>

              {/* Skriftstørrelse A- / A+ */}
              <div className={`flex items-center gap-1 p-0.5 rounded-lg border text-xs font-semibold ${zenTheme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => {
                    if (zenFontSize === '2xl') setZenFontSize('xl');
                    else if (zenFontSize === 'xl') setZenFontSize('lg');
                    else if (zenFontSize === 'lg') setZenFontSize('md');
                  }}
                  title="Mindre tekststørrelse"
                  className={`px-2 py-0.5 rounded cursor-pointer ${zenTheme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-white text-slate-700'}`}
                >
                  A-
                </button>
                <span className={`px-1 text-[11px] font-bold ${zenTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {zenFontSize === 'md' ? '18px' : zenFontSize === 'lg' ? '20px' : zenFontSize === 'xl' ? '24px' : '28px'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (zenFontSize === 'md') setZenFontSize('lg');
                    else if (zenFontSize === 'lg') setZenFontSize('xl');
                    else if (zenFontSize === 'xl') setZenFontSize('2xl');
                  }}
                  title="Større tekststørrelse"
                  className={`px-2 py-0.5 rounded cursor-pointer ${zenTheme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-white text-slate-700'}`}
                >
                  A+
                </button>
              </div>

              {/* Ordteller i Zen mode */}
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${zenTheme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                {wordCount} {activeDoc.targetWords ? `/ ${activeDoc.targetWords} ord` : 'ord'}
              </span>

              {/* Mørkt/Lyst tema-toggle */}
              <button
                type="button"
                onClick={() => setZenTheme(zenTheme === 'dark' ? 'light' : 'dark')}
                title={zenTheme === 'dark' ? 'Bytt til lyst fokusmiljø' : 'Bytt til mørkt fokusmiljø'}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${zenTheme === 'dark' ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
              >
                {zenTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Avslutt Fokusmodus */}
              <button
                type="button"
                onClick={() => setIsZenMode(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all cursor-pointer"
                title="Avslutt fokusmodus (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Avslutt (Esc)</span>
              </button>
            </div>
          </div>

          {/* Zen Writing Sheet Area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-12 py-6 flex flex-col items-center">
            <div className={`w-full transition-all duration-300 space-y-3.5 ${
              zenWidth === 'normal' 
                ? 'max-w-3xl' 
                : zenWidth === 'wide' 
                ? 'max-w-5xl' 
                : zenWidth === 'xl' 
                ? 'max-w-6xl' 
                : 'max-w-full px-4 md:px-8'
            }`}>
              {/* Hurtigverktøy for Normalvisning i Fokusmodus */}
              {zenViewMode === 'normal' && (
                <div className={`flex flex-wrap items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl border text-xs shadow-xs select-none sticky top-0 z-20 backdrop-blur-md transition-colors ${
                  zenTheme === 'dark'
                    ? 'bg-slate-900/90 border-slate-800 text-slate-200 shadow-black/40'
                    : 'bg-white/90 border-slate-200 text-slate-700 shadow-slate-200/50'
                }`}>
                  <div className="flex items-center gap-1 flex-wrap">
                    {/* Angre / Gjør om */}
                    <button
                      type="button"
                      onClick={() => applyFormatting('undo')}
                      title="Angre (Ctrl+Z)"
                      className={`p-1 rounded cursor-pointer transition-colors ${zenTheme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting('redo')}
                      title="Gjenta (Ctrl+Y)"
                      className={`p-1 rounded cursor-pointer transition-colors ${zenTheme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                    </button>

                    <div className={`w-px h-4 mx-1 ${zenTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Overskrifter */}
                    <button
                      type="button"
                      onClick={() => applyFormatting('h1')}
                      title="Overskrift 1 (H1)"
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        activeHeading === 'h1'
                          ? (zenTheme === 'dark' ? 'bg-indigo-600 text-white font-extrabold' : 'bg-indigo-100 text-indigo-700 font-extrabold')
                          : (zenTheme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700')
                      }`}
                    >
                      H1
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting('h2')}
                      title="Overskrift 2 (H2)"
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        activeHeading === 'h2'
                          ? (zenTheme === 'dark' ? 'bg-indigo-600 text-white font-extrabold' : 'bg-indigo-100 text-indigo-700 font-extrabold')
                          : (zenTheme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700')
                      }`}
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting('h3')}
                      title="Overskrift 3 (H3)"
                      className={`px-2 py-0.5 rounded font-bold italic transition-all cursor-pointer ${
                        activeHeading === 'h3'
                          ? (zenTheme === 'dark' ? 'bg-indigo-600 text-white font-extrabold' : 'bg-indigo-100 text-indigo-700 font-extrabold')
                          : (zenTheme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700')
                      }`}
                    >
                      H3
                    </button>

                    <div className={`w-px h-4 mx-1 ${zenTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Tekstformatering B / I / U */}
                    <button
                      type="button"
                      onClick={() => applyFormatting('bold')}
                      title="Fet skrift (Ctrl+B)"
                      className={`p-1 rounded cursor-pointer transition-all ${
                        activeStyles.bold
                          ? (zenTheme === 'dark' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700')
                          : (zenTheme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700')
                      }`}
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting('italic')}
                      title="Kursiv (Ctrl+I)"
                      className={`p-1 rounded cursor-pointer transition-all ${
                        activeStyles.italic
                          ? (zenTheme === 'dark' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700')
                          : (zenTheme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700')
                      }`}
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting('underline')}
                      title="Understreket (Ctrl+U)"
                      className={`p-1 rounded cursor-pointer transition-all ${
                        activeStyles.underline
                          ? (zenTheme === 'dark' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700')
                          : (zenTheme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700')
                      }`}
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>

                    <div className={`w-px h-4 mx-1 ${zenTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Kulepunkter og talliste */}
                    <button
                      type="button"
                      onClick={() => applyFormatting('list')}
                      title="Kulepunkter (•)"
                      className={`p-1 rounded cursor-pointer transition-all ${
                        activeStyles.ul
                          ? (zenTheme === 'dark' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700')
                          : (zenTheme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700')
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting('orderedList')}
                      title="Nummerert liste (1, 2, 3)"
                      className={`p-1 rounded cursor-pointer transition-all ${
                        activeStyles.ol
                          ? (zenTheme === 'dark' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700')
                          : (zenTheme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700')
                      }`}
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting('indent')}
                      title="Rykk inn / Opprett underpunkt (Tab)"
                      className={`p-1 rounded cursor-pointer transition-all ${zenTheme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                      <Indent className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting('outdent')}
                      title="Rykk ut / Reduser innrykk (Shift+Tab)"
                      className={`p-1 rounded cursor-pointer transition-all ${zenTheme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                      <Outdent className="w-3.5 h-3.5" />
                    </button>

                    <div className={`w-px h-4 mx-1 ${zenTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Sitat / APA 7 */}
                    <button
                      type="button"
                      onClick={() => applyFormatting('quote')}
                      title="Innrykket sitat (APA 7 - over 40 ord)"
                      className={`p-1 rounded cursor-pointer transition-all ${
                        activeStyles.quote
                          ? (zenTheme === 'dark' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700')
                          : (zenTheme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700')
                      }`}
                    >
                      <Quote className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className={`text-[11px] font-medium hidden sm:inline ${zenTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    Normalvisning • Formatering aktiv
                  </span>
                </div>
              )}

              {/* Selve skriveflaten i Fokusmodus */}
              <div className={`rounded-3xl p-8 sm:p-14 md:p-18 min-h-[85vh] shadow-2xl transition-all border ${
                zenTheme === 'dark'
                  ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-black/80 zen-dark'
                  : 'bg-white border-slate-200/90 text-slate-900 shadow-slate-200/60'
              }`}>
                {zenViewMode === 'normal' ? (
                  /* NORMALVISNING: Ekte formatering akkurat som skriveflaten på A4-arket (overskrifter, kulepunkter, ikke ## og ###) */
                  <div
                    ref={zenWysiwygRef}
                    contentEditable
                    suppressContentEditableWarning
                    onBeforeInput={handleWysiwygBeforeInput}
                    onInput={handleWysiwygInput}
                    onPaste={handleWysiwygPaste}
                    onKeyDown={handleEditorKeyDown}
                    onKeyUp={checkActiveFormatting}
                    onMouseUp={checkActiveFormatting}
                    onSelect={checkActiveFormatting}
                    style={{
                      fontFamily: activeDoc.fontFamily === 'calibri'
                        ? 'Calibri, Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif'
                        : activeDoc.fontFamily === 'arial'
                        ? 'Arial, Helvetica, sans-serif'
                        : activeDoc.fontFamily === 'georgia'
                        ? 'Georgia, serif'
                        : '"Times New Roman", Times, serif',
                      fontSize: zenFontSize === 'md' 
                        ? '1.125rem' 
                        : zenFontSize === 'lg' 
                        ? '1.25rem' 
                        : zenFontSize === 'xl' 
                        ? '1.5rem' 
                        : '1.75rem',
                      lineHeight: activeDoc.lineSpacing === '1.0'
                        ? '1.3'
                        : activeDoc.lineSpacing === '1.15'
                        ? '1.45'
                        : activeDoc.lineSpacing === '2.0'
                        ? '2.0'
                        : '1.7',
                      minHeight: '75vh'
                    }}
                    className={`academic-editor-surface w-full focus:outline-none transition-all ${
                      zenTheme === 'dark' ? 'zen-dark text-slate-100' : 'text-slate-900'
                    }`}
                  />
                ) : (
                  /* REN TEKST / MARKDOWN: Råtekstvisning for de som ønsker markdown-redigering */
                  <textarea
                    ref={textareaRef}
                    value={typeof activeDoc.content === 'string' ? activeDoc.content : ''}
                    onChange={(e) => {
                      const formatted = autoCapitalizeMarkdownBullets(e.target.value);
                      handleUpdateActiveDoc({ content: formatted });
                    }}
                    onKeyDown={handleEditorKeyDown}
                    placeholder="Skriv uforstyrret med ren tekst / markdown her..."
                    autoFocus
                    style={{
                      fontFamily: activeDoc.fontFamily === 'calibri'
                        ? 'Calibri, Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif'
                        : activeDoc.fontFamily === 'arial'
                        ? 'Arial, Helvetica, sans-serif'
                        : activeDoc.fontFamily === 'georgia'
                        ? 'Georgia, serif'
                        : '"Times New Roman", Times, serif',
                      fontSize: zenFontSize === 'md' 
                        ? '1.125rem' 
                        : zenFontSize === 'lg' 
                        ? '1.25rem' 
                        : zenFontSize === 'xl' 
                        ? '1.5rem' 
                        : '1.75rem',
                      lineHeight: '2.0',
                      minHeight: '70vh'
                    }}
                    className={`w-full bg-transparent resize-none border-none focus:outline-none font-mono transition-all ${zenTheme === 'dark' ? 'text-slate-100 placeholder:text-slate-700' : 'text-slate-900 placeholder:text-slate-300'}`}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Zen Bottom Status Bar */}
          <div className={`px-6 py-2.5 border-t flex flex-wrap items-center justify-between gap-3 text-xs select-none shrink-0 ${zenTheme === 'dark' ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'}`}>
            <span className="flex items-center gap-1.5 flex-wrap">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                Forstyrrelsesfri skriveøkt • Visning: <strong>{zenViewMode === 'normal' ? 'Normalvisning (som skriveflaten)' : 'Ren tekst (Markdown)'}</strong> • Skriveflate: {zenWidth === 'normal' ? 'Normal' : zenWidth === 'wide' ? 'Bred (1024px)' : zenWidth === 'xl' ? 'Ekstra bred' : 'Fullskjerm'}
              </span>
            </span>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline">Trykk <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${zenTheme === 'dark' ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>Tab</kbd> for innrykk / underpunkter</span>
              <span>Trykk <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${zenTheme === 'dark' ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>Esc</kbd> for å gå tilbake</span>
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}

/**
 * STEG 3: Dokumentstatistikk & LIX-modal
 */
function DocStatsModal({
  isOpen,
  onClose,
  title,
  wordCount,
  targetWords,
  charCount,
  charNoSpacesCount,
  paragraphCount,
  sentenceCount,
  avgWordsPerSentence,
  readingTimeMinutes,
  lixIndex,
  estimatedPages
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  wordCount: number;
  targetWords: number;
  charCount: number;
  charNoSpacesCount: number;
  paragraphCount: number;
  sentenceCount: number;
  avgWordsPerSentence: string;
  readingTimeMinutes: number;
  lixIndex: number;
  estimatedPages: number;
}) {
  if (!isOpen) return null;

  const getLixEvaluation = (lix: number) => {
    if (lix < 30) return { label: 'Svært lettlest (Skjønnlitteratur / Barnebøker)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (lix < 40) return { label: 'Lettlest (Enkel sakprosa)', color: 'text-sky-700 bg-sky-50 border-sky-200' };
    if (lix < 50) return { label: 'Middels vanskelig (Aviser / Tidsskrifter)', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (lix <= 60) return { label: 'Fagtekst / Høgskolenivå (Optimalt for akademiske oppgaver)', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
    return { label: 'Svært krevende fagtekst (Tett akademisk fagspråk)', color: 'text-amber-800 bg-amber-50 border-amber-200' };
  };

  const lixInfo = getLixEvaluation(lixIndex);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Dokumentstatistikk</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Oppgave</span>
            <h4 className="text-base font-bold text-slate-900 truncate">{title || 'Uten tittel'}</h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">Ordantall</span>
              <span className="text-xl font-bold text-slate-900">{wordCount}</span>
              {targetWords > 0 && (
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Mål: {targetWords} ({Math.min(100, Math.round((wordCount / targetWords) * 100))}%)
                </span>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">A4-sider (est.)</span>
              <span className="text-xl font-bold text-slate-900">Ca. {estimatedPages}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">~400 ord/side</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">Lesetid</span>
              <span className="text-xl font-bold text-slate-900">~{readingTimeMinutes} min</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">200 ord/min</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">Tegn (totalt)</span>
              <span className="text-lg font-bold text-slate-900">{charCount}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">Tegn (u/mellomrom)</span>
              <span className="text-lg font-bold text-slate-900">{charNoSpacesCount}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">Avsnitt</span>
              <span className="text-lg font-bold text-slate-900">{paragraphCount}</span>
            </div>
          </div>

          {/* Språklig kompleksitet og LIX */}
          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Type className="w-4 h-4 text-indigo-600" />
                Lesbarhetsindeks (LIX)
              </span>
              <span className="text-lg font-extrabold text-indigo-700">LIX {lixIndex}</span>
            </div>

            <div className={`p-2.5 rounded-lg border text-xs font-semibold ${lixInfo.color}`}>
              {lixInfo.label}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block text-[11px]">Antall setninger:</span>
                <span className="font-semibold text-slate-800">{sentenceCount}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Snitt ord per setning:</span>
                <span className="font-semibold text-slate-800">{avgWordsPerSentence} ord</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
}

export default WritingWorkshop;
