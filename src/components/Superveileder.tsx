import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceLayout, HistoryItem, FolderType, FOLDER_COLORS } from './WorkspaceLayout';
import { 
  Sparkles, 
  Send, 
  Bot, 
  BookOpen, 
  Quote, 
  User, 
  Copy, 
  Check, 
  Loader2,
  Search, 
  Volume2, 
  Square, 
  Brain, 
  GraduationCap, 
  Coins, 
  X, 
  FolderPlus, 
  Folder, 
  FolderOpen,
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  Plus, 
  HeartHandshake,
  BookmarkPlus,
  FileText,
  Pin,
  CheckCircle2,
  Paperclip
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { 
  generateAcademicResponse, 
  askSocraticAgent, 
  askApaAgent, 
  askLanguageAgent,
  superAgentRouter,
  askRagAgent,
  askLyttebot,
  askMethodAgent,
  callGoogleAIProxy,
  playAudio as playAudioService,
  stopAudio as stopAudioService 
} from '../services/geminiService';
import { saveFieldNote } from '../services/fieldNotesService';
import { extractTextFromPdf } from '../lib/pdfUtils';
import { extractTextFromDocx } from '../lib/docxUtils';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { FolderExportModal } from './tools/FolderExportModal';
import { FolderContextModal } from './tools/FolderContextModal';
import AIWarning from './AIWarning';
import { cn } from '../lib/utils';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: string;
  agent?: string;
}

export interface ChatSession extends HistoryItem {
  id: string;
  title: string;
  subtitle?: string;
  isPinned?: boolean;
  folderId?: string;
  messages: ChatMessage[];
  activeMode: string;
  updatedAt: string;
}

export interface SuperveilederProps {
  user?: any;
  didacticProfile?: any;
  initialMode?: string;
  initialAssistant?: 'superveileder' | 'feltveileder';
  onAssistantChange?: (assistant: 'superveileder' | 'feltveileder') => void;
}

// Storage keys for Superveileder
const STORAGE_KEY_SUPER = 'blu_superveileder_chats_v2';
const FOLDERS_STORAGE_KEY_SUPER = 'blu_superveileder_folders_v1';

// Storage keys for Feltveileder
const STORAGE_KEY_FELT = 'blu_feltveileder_chats_v2';
const FOLDERS_STORAGE_KEY_FELT = 'blu_feltveileder_folders_v1';

// System prompt for Feltveileder (praksis- og feltveileder)
const FIELD_SYSTEM_INSTRUCTION = `Du er BLU-Feltveilederen – en lynrask, pedagogisk skarp og praksisnær veileder for barnehagelærerstudenter ute i praksis.
Målgruppen din er studenter som står i eller forbereder seg til barnehagehverdagen. 
Dine svar skal være:
- Konsise, strukturerte og rett på sak (bruk korte avsnitt og kulepunkter).
- Tydelig forankret i Rammeplan for barnehagen (spesifikke fagområder, formål og arbeidsmåter).
- Koblet til sentral barnehagepedagogisk teori (f.eks. Berit Bae om anerkjennelse og relasjoner, Lev Vygotskij om stillasbygging og proksimal sone, Gunvor Løkken om kroppslig væren, William Corsaro om jevnalderkultur, Bjørndal & Løw om didaktisk relasjonsmodell).
- Alltid gi 1-3 konkrete grep eller spørsmål studenten kan reflektere over eller teste ut i dag.`;

const INITIAL_FOLDERS_SUPER: FolderType[] = [
  { id: 'f-praksis', name: 'Praksis & Observasjon', isExpanded: true },
  { id: 'f-fagskriving', name: 'Fagskriving & Teori', isExpanded: true },
  { id: 'f-rammeplan', name: 'Rammeplan & Didaktikk', isExpanded: false }
];

const INITIAL_CHATS_SUPER: ChatSession[] = [
  {
    id: 'sok-1',
    title: 'Sokratisk sparring om barns medvirkning',
    subtitle: 'Sokratisk • Nettopp opprettet',
    isPinned: true,
    activeMode: 'Sokratisk',
    folderId: 'f-praksis',
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'm1',
        role: 'assistant',
        content: 'Hei! Jeg er **Superveilederen** i Sokratisk modus. Jeg stiller deg reflekterende spørsmål for å hjelpe deg med å se faglige nyanser, begreper og didaktiske valg. Hva slags situasjon, observasjon eller tema vil du utforske i dag?',
        timestamp: '10:00',
        mode: 'Sokratisk',
        agent: 'SOKRATISK'
      }
    ]
  },
  {
    id: 'rag-1',
    title: 'Forankring i Rammeplanen (2017)',
    subtitle: 'Rammeplan • Lagret økt',
    isPinned: false,
    activeMode: 'Rammeplan',
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    messages: [
      {
        id: 'm2',
        role: 'assistant',
        content: 'Velkommen! I Rammeplan-modus henter jeg konkrete formuleringer fra Rammeplanen for barnehagen (2017) og barnehageloven, og hjelper deg å koble praksisen din til fagområdene og personalets ansvar.',
        timestamp: '11:15',
        mode: 'Rammeplan',
        agent: 'RAG'
      }
    ]
  }
];

const INITIAL_FOLDERS_FELT: FolderType[] = [
  { id: 'ff-observasjon', name: 'Observasjon & Frilek', isExpanded: true },
  { id: 'ff-rammeplan', name: 'Rammeplan & Didaktikk', isExpanded: true },
  { id: 'ff-relasjoner', name: 'Relasjoner & Konflikter', isExpanded: false }
];

const INITIAL_CHATS_FELT: ChatSession[] = [
  {
    id: 'felt-1',
    title: 'Observasjon av frilek i sandkassa',
    subtitle: 'Rammeplan-kobling • Nettopp opprettet',
    isPinned: true,
    activeMode: 'Rammeplan-kobling',
    folderId: 'ff-observasjon',
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'fm1',
        role: 'assistant',
        content: 'Hei! 👋 Jeg er din **Feltveileder**. Står du i en spesiell situasjon i barnehagen nå, eller planlegger du en aktivitet? Spør meg om Rammeplanen, didaktiske opplegg eller pedagogisk teori!',
        timestamp: '09:30',
        mode: 'Rammeplan-kobling',
        agent: 'FELT'
      }
    ]
  },
  {
    id: 'felt-2',
    title: 'Anerkjennende væremåte i konflikt',
    subtitle: 'Konflikt & lek • Lagret økt',
    isPinned: false,
    activeMode: 'Konflikt & lek',
    folderId: 'ff-relasjoner',
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    messages: [
      {
        id: 'fm2',
        role: 'assistant',
        content: 'I konfliktsituasjoner mellom barn er Berit Baes perspektiver på anerkjennelse uvurderlige: Se barnets opplevelse innenfra før du korrigerer handlingen. Hva oppstod i barnegruppa di?',
        timestamp: '13:45',
        mode: 'Konflikt & lek',
        agent: 'FELT'
      }
    ]
  }
];

export function Superveileder({ 
  user, 
  didacticProfile, 
  initialMode, 
  initialAssistant = 'superveileder',
  onAssistantChange
}: SuperveilederProps) {
  // Aktiv veileder-type: 'superveileder' eller 'feltveileder'
  const [activeAssistant, setActiveAssistant] = useState<'superveileder' | 'feltveileder'>(() => initialAssistant);

  // Synkroniser hvis initialAssistant endres eksternt
  useEffect(() => {
    if (initialAssistant) {
      setActiveAssistant(initialAssistant);
    }
  }, [initialAssistant]);

  // =========================================================================
  // 1. SUPERVEILEDEREN STATE (Akademisk skriving & veiledning)
  // =========================================================================
  const [chats, setChats] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SUPER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Kunne ikke hente lagrede veiledninger:', e);
    }
    return INITIAL_CHATS_SUPER;
  });

  const [activeChatId, setActiveChatId] = useState<string>(() => {
    return chats.length > 0 ? chats[0].id : 'sok-1';
  });

  const [folders, setFolders] = useState<FolderType[]>(() => {
    try {
      const saved = localStorage.getItem(FOLDERS_STORAGE_KEY_SUPER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Kunne ikke hente lagrede mapper for Superveileder:', e);
    }
    return INITIAL_FOLDERS_SUPER;
  });

  // =========================================================================
  // 2. FELTVEILEDEREN STATE (Praksis & Didaktikk - Eget arkiv!)
  // =========================================================================
  const [feltChats, setFeltChats] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FELT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Kunne ikke hente lagrede feltveiledninger:', e);
    }
    return INITIAL_CHATS_FELT;
  });

  const [activeFeltChatId, setActiveFeltChatId] = useState<string>(() => {
    return feltChats.length > 0 ? feltChats[0].id : 'felt-1';
  });

  const [feltFolders, setFeltFolders] = useState<FolderType[]>(() => {
    try {
      const saved = localStorage.getItem(FOLDERS_STORAGE_KEY_FELT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Kunne ikke hente lagrede feltmapper:', e);
    }
    return INITIAL_FOLDERS_FELT;
  });

  // Felles dialog- og skrive-state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('indigo');
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedToNotesId, setSavedToNotesId] = useState<string | null>(null);
  const [savedToLogId, setSavedToLogId] = useState<string | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [confirmDeleteActiveChat, setConfirmDeleteActiveChat] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const prevMsgCountRef = useRef(0);

  // Bestem aktiv liste og aktiv samtale basert på valgt veileder
  const isFelt = activeAssistant === 'feltveileder';
  const currentChats = isFelt ? feltChats : chats;
  const currentActiveId = isFelt ? activeFeltChatId : activeChatId;
  const activeChat = currentChats.find(c => c.id === currentActiveId) || currentChats[0] || (isFelt ? INITIAL_CHATS_FELT[0] : INITIAL_CHATS_SUPER[0]);
  const activeMode = activeChat?.activeMode || initialMode || (isFelt ? 'Rammeplan-kobling' : 'Auto');
  const currentFolders = isFelt ? feltFolders : folders;

  // =========================================================================
  // SYNKRONISERING OG LAGRING
  // =========================================================================
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SUPER, JSON.stringify(chats));
    } catch (e) {
      console.error('Kunne ikke lagre Superveileder-chats til localStorage:', e);
    }
  }, [chats]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FELT, JSON.stringify(feltChats));
    } catch (e) {
      console.error('Kunne ikke lagre Feltveileder-chats til localStorage:', e);
    }
  }, [feltChats]);

  useEffect(() => {
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY_SUPER, JSON.stringify(folders));
    } catch (e) {
      console.error('Kunne ikke lagre Superveileder-mapper til localStorage:', e);
    }
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY_FELT, JSON.stringify(feltFolders));
    } catch (e) {
      console.error('Kunne ikke lagre Feltveileder-mapper til localStorage:', e);
    }
  }, [feltFolders]);

  // Last chats og mapper fra Firestore for begge arkiver
  useEffect(() => {
    if (!user?.uid) return;

    const loadFirestoreData = async () => {
      try {
        const db = getFirestore();
        
        // 1. Superveilederen samtaler
        const superChatsRef = collection(db, 'users', user.uid, 'superveileder_chats');
        const superSnapshot = await getDocs(query(superChatsRef, orderBy('updatedAt', 'desc')));
        if (!superSnapshot.empty) {
          const loaded: ChatSession[] = superSnapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          setChats(loaded);
          localStorage.setItem(STORAGE_KEY_SUPER, JSON.stringify(loaded));
        }

        // 2. Feltveilederen samtaler (Eget separat arkiv)
        const feltChatsRef = collection(db, 'users', user.uid, 'feltveileder_chats');
        const feltSnapshot = await getDocs(query(feltChatsRef, orderBy('updatedAt', 'desc')));
        if (!feltSnapshot.empty) {
          const loadedFelt: ChatSession[] = feltSnapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          setFeltChats(loadedFelt);
          localStorage.setItem(STORAGE_KEY_FELT, JSON.stringify(loadedFelt));
        }

        // 3. Superveileder mapper
        const folderQ = query(collection(db, 'folders'), where('userId', '==', user.uid));
        const folderSnapshot = await getDocs(folderQ);
        if (!folderSnapshot.empty) {
          const fetchedFolders: FolderType[] = folderSnapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          setFolders(fetchedFolders);
          localStorage.setItem(FOLDERS_STORAGE_KEY_SUPER, JSON.stringify(fetchedFolders));
        }

        // 4. Feltveileder mapper
        const feltFolderQ = query(collection(db, 'feltveileder_folders'), where('userId', '==', user.uid));
        const feltFolderSnapshot = await getDocs(feltFolderQ);
        if (!feltFolderSnapshot.empty) {
          const fetchedFeltFolders: FolderType[] = feltFolderSnapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          setFeltFolders(fetchedFeltFolders);
          localStorage.setItem(FOLDERS_STORAGE_KEY_FELT, JSON.stringify(fetchedFeltFolders));
        }
      } catch (err) {
        console.warn('Kunne ikke hente Firestore-data for veiledere:', err);
      }
    };

    loadFirestoreData();
  }, [user?.uid]);

  // Lagre aktiv samtale til Firestore
  const saveChatToFirestore = async (chatToSave: ChatSession, isFeltMode: boolean) => {
    if (!user?.uid) return;
    try {
      const db = getFirestore();
      const colName = isFeltMode ? 'feltveileder_chats' : 'superveileder_chats';
      const chatRef = doc(db, 'users', user.uid, colName, chatToSave.id);
      const cleanData: any = { ...chatToSave };
      if (!cleanData.folderId) {
        delete cleanData.folderId;
      }
      await setDoc(chatRef, cleanData, { merge: true });
    } catch (err) {
      console.warn('Firestore autosave feilet:', err);
    }
  };

  // Scroll håndtering
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevMsgCountRef.current = activeChat?.messages?.length || 0;
      return;
    }

    const currentMsgCount = activeChat?.messages?.length || 0;
    if (currentMsgCount > prevMsgCountRef.current || isLoading) {
      prevMsgCountRef.current = currentMsgCount;
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [activeChat?.messages?.length, isLoading]);

  // Opprett ny samtale i aktivt arkiv
  const handleNewChat = () => {
    const isFeltMode = activeAssistant === 'feltveileder';
    const newId = (isFeltMode ? 'felt_' : 'sv_') + Date.now();
    const defaultMode = isFeltMode ? 'Rammeplan-kobling' : activeMode;
    
    const newSession: ChatSession = {
      id: newId,
      title: isFeltMode ? 'Ny feltsamtale' : 'Ny veiledningssamtale',
      subtitle: `${defaultMode} • Nettopp opprettet`,
      isPinned: false,
      activeMode: defaultMode,
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'welcome-' + newId,
          role: 'assistant',
          content: isFeltMode
            ? 'Hei! 👋 Jeg er **Feltveilederen**. Hva slags situasjon, observasjon eller aktivitet i barnehagen vil du reflektere over eller planlegge nå?'
            : `Hei! Jeg er **Superveilederen** din for barnehagelærerutdanningen. Hva vil du utforske eller få veiledning på i dag? (${defaultMode}-modus er aktiv)`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mode: defaultMode,
          agent: isFeltMode ? 'FELT' : defaultMode.toUpperCase()
        }
      ]
    };

    if (isFeltMode) {
      setFeltChats(prev => [newSession, ...prev]);
      setActiveFeltChatId(newId);
    } else {
      setChats(prev => [newSession, ...prev]);
      setActiveChatId(newId);
    }

    saveChatToFirestore(newSession, isFeltMode);
  };

  const handleSetMode = (mode: string) => {
    const isFeltMode = activeAssistant === 'feltveileder';
    const updateFn = (list: ChatSession[], currentId: string) => 
      list.map(c => {
        if (c.id === currentId) {
          const updated = {
            ...c,
            activeMode: mode,
            subtitle: `${mode} • Sist endret nå`,
            updatedAt: new Date().toISOString()
          };
          saveChatToFirestore(updated, isFeltMode);
          return updated;
        }
        return c;
      });

    if (isFeltMode) {
      setFeltChats(prev => updateFn(prev, activeFeltChatId));
    } else {
      setChats(prev => updateFn(prev, activeChatId));
    }
  };

  // Submit-funksjon med fil- og teksthåndtering
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await handleSendMessage();
  };

  // Send melding eller dokument i samtalen
  const handleSendMessage = async (textToSend?: string, isRetry: boolean = false) => {
    const rawInput = (textToSend || input).trim();
    if ((!rawInput && !attachedFile) || isLoading || !activeChat) return;

    let fileContent: string | null = null;
    let fileName: string | null = null;

    // Hvis attachedFile inneholder en fil, skal filens innhold leses:
    if (attachedFile && !textToSend) {
      fileName = attachedFile.name;
      try {
        const ext = attachedFile.name.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') {
          fileContent = await extractTextFromPdf(attachedFile);
        } else if (ext === 'docx') {
          fileContent = await extractTextFromDocx(attachedFile);
        } else {
          fileContent = await attachedFile.text();
        }
      } catch (err: any) {
        console.warn('Kunne ikke hente ut tekst fra filen:', err);
        fileContent = `[Filvedlegg: ${attachedFile.name} (kunne ikke hente all råtekst automatisk: ${err?.message || 'Ukjent feil'})]`;
      }
      setAttachedFile(null);
      const fileInput = document.getElementById('document-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }

    if (!textToSend) setInput('');

    // Melding som lagres og vises i brukerboblen
    const displayUserText = fileName
      ? (rawInput 
          ? `📎 [Vedlagt fil: ${fileName}]\n\n${rawInput}`
          : `📎 [Vedlagt fil: ${fileName}]\n\nVennligst gi meg faglig tilbakemelding på dette dokumentet med forankring i Rammeplanen for barnehagen, didaktisk refleksjon og faglitteratur.`)
      : rawInput;

    const isFeltMode = activeAssistant === 'feltveileder';
    const currentFolder = (isFeltMode ? feltFolders : folders).find(f => f.id === activeChat.folderId);
    const folderContextPrompt = currentFolder?.customContext?.trim()
      ? `\n\n[VIKTIG MAPPEKONTEKST OG PEDAGOGISKE FØRINGER FOR MAPPE "${currentFolder.name}"]:\n${currentFolder.customContext}\n[SLUTT PÅ MAPPEKONTEKST]\n`
      : '';

    // Fullt payload-innhold med documentContext og mappekontekst sendt til API-et / modellene
    const promptWithDocumentContext = (fileContent
      ? `${rawInput ? rawInput + '\n\n' : ''}--- VEDLAGT DOKUMENT (${fileName}) ---\n${fileContent.slice(0, 45000)}\n--- SLUTT PÅ DOKUMENT ---`
      : displayUserText) + folderContextPrompt;

    let updatedSession: ChatSession | null = null;

    if (!isRetry) {
      const userMsg: ChatMessage = {
        id: 'usr-' + Date.now(),
        role: 'user',
        content: displayUserText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: activeMode
      };

      const isFirstUserMessage = activeChat.messages.filter(m => m.role === 'user').length === 0;
      const newTitle = isFirstUserMessage 
        ? (rawInput ? (rawInput.length > 32 ? rawInput.substring(0, 32) + '...' : rawInput) : (fileName ? `Dokument: ${fileName}` : 'Ny samtale'))
        : activeChat.title;

      const updateList = (prevList: ChatSession[], currentId: string) => 
        prevList.map(c => {
          if (c.id === currentId) {
            updatedSession = {
              ...c,
              title: newTitle,
              subtitle: `${activeMode} • Sist endret nå`,
              updatedAt: new Date().toISOString(),
              messages: [...c.messages, userMsg]
            };
            return updatedSession;
          }
          return c;
        });

      if (isFeltMode) {
        setFeltChats(prev => updateList(prev, activeFeltChatId));
      } else {
        setChats(prev => updateList(prev, activeChatId));
      }
    } else {
      updatedSession = activeChat;
    }

    if (updatedSession) {
      saveChatToFirestore(updatedSession, isFeltMode);
    }

    setIsLoading(true);

    try {
      const cleanHistory = activeChat.messages
        .filter(m => m.agent !== 'FEIL' && !String(m.content).startsWith('Feil:') && !String(m.content).includes('Kapasitetsgrensen'))
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          content: m.content
        }));

      let aiResponseText = '';
      let agentTag = isFeltMode ? 'FELT' : 'AUTO';

      if (isFeltMode) {
        // Feltveilederen: Praksisnær, Rammeplan, didaktikk og situasjoner
        const chatHistoryForGemini = cleanHistory.slice(-8).map(m => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));
        chatHistoryForGemini.push({
          role: 'user',
          parts: [{ text: `[Modus: ${activeMode}] ${promptWithDocumentContext}` }]
        });

        const rawResponse = await callGoogleAIProxy({
          model: 'gemini-2.5-flash',
          contents: chatHistoryForGemini,
          config: {
            systemInstruction: FIELD_SYSTEM_INSTRUCTION,
            temperature: 0.7,
          }
        });

        aiResponseText = typeof rawResponse === 'string' 
          ? rawResponse 
          : (rawResponse && typeof rawResponse === 'object' && 'text' in rawResponse ? String(rawResponse.text) : '');
      } else {
        // Superveilederen: Akademisk skriving, Sokratisk, APA, Metode, RAG
        if (activeMode === 'Sokratisk') {
          agentTag = 'SOKRATISK';
          aiResponseText = await askSocraticAgent(
            [...cleanHistory, { role: 'user', content: promptWithDocumentContext }],
            didacticProfile || { frameworkFocus: 'Sokratisk refleksjonsveiledning for barnehagelærer' }
          );
        } else if (activeMode === 'Rammeplan') {
          agentTag = 'RAG';
          aiResponseText = await askRagAgent(promptWithDocumentContext, cleanHistory);
        } else if (activeMode === 'APA') {
          agentTag = 'APA';
          aiResponseText = await askApaAgent(promptWithDocumentContext);
        } else if (activeMode === 'Språkvask') {
          agentTag = 'SPRAK';
          aiResponseText = await askLanguageAgent(promptWithDocumentContext);
        } else if (activeMode === 'Metode') {
          agentTag = 'METODE';
          aiResponseText = await askMethodAgent(promptWithDocumentContext, cleanHistory);
        } else if (activeMode === 'Lytte') {
          agentTag = 'LYTTE';
          aiResponseText = await askLyttebot([...cleanHistory, { role: 'user', content: promptWithDocumentContext }]);
        } else {
          // AUTO Modus
          const routeDecision = await superAgentRouter(rawInput || promptWithDocumentContext.slice(0, 300));
          agentTag = routeDecision;

          if (agentTag === 'SOKRATISK') {
            aiResponseText = await askSocraticAgent(
              [...cleanHistory, { role: 'user', content: promptWithDocumentContext }],
              didacticProfile || {}
            );
          } else if (agentTag === 'RAG') {
            aiResponseText = await askRagAgent(promptWithDocumentContext, cleanHistory);
          } else if (agentTag === 'APA') {
            aiResponseText = await askApaAgent(promptWithDocumentContext);
          } else if (agentTag === 'SPRAK') {
            aiResponseText = await askLanguageAgent(promptWithDocumentContext);
          } else if (agentTag === 'METODE') {
            aiResponseText = await askMethodAgent(promptWithDocumentContext, cleanHistory);
          } else if (agentTag === 'LYTTE') {
            aiResponseText = await askLyttebot([...cleanHistory, { role: 'user', content: promptWithDocumentContext }]);
          } else {
            aiResponseText = await generateAcademicResponse(
              promptWithDocumentContext,
              cleanHistory,
              'balanced',
              didacticProfile || { frameworkFocus: 'Rammeplan for barnehagen og barnehageloven.' }
            );
          }
        }
      }

      const aiMsg: ChatMessage = {
        id: 'ai-' + Date.now(),
        role: 'assistant',
        content: aiResponseText || 'Jeg har mottatt spørsmålet ditt. La oss utforske hvordan dette knytter seg til rammeplanen og didaktisk praksis.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: activeMode,
        agent: agentTag
      };

      const appendMessage = (list: ChatSession[], currentId: string) =>
        list.map(c => {
          if (c.id === currentId) {
            const finalSession = {
              ...c,
              updatedAt: new Date().toISOString(),
              messages: [...c.messages, aiMsg]
            };
            saveChatToFirestore(finalSession, isFeltMode);
            return finalSession;
          }
          return c;
        });

      if (isFeltMode) {
        setFeltChats(prev => appendMessage(prev, activeFeltChatId));
      } else {
        setChats(prev => appendMessage(prev, activeChatId));
      }
    } catch (err: any) {
      console.error('AI chat error', err);
      const errorMsg: ChatMessage = {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: err?.message || 'Kunne ikke hente svar fra veiledningsmotoren akkurat nå. Vennligst prøv igjen om et øyeblikk.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: activeMode,
        agent: 'FEIL'
      };

      const appendError = (list: ChatSession[], currentId: string) =>
        list.map(c => {
          if (c.id === currentId) {
            const withErr = { ...c, messages: [...c.messages, errorMsg] };
            saveChatToFirestore(withErr, isFeltMode);
            return withErr;
          }
          return c;
        });

      if (isFeltMode) {
        setFeltChats(prev => appendError(prev, activeFeltChatId));
      } else {
        setChats(prev => appendError(prev, activeChatId));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Pensum på øret - Lydopplesing
  const playAudio = (text: string, idx: number) => {
    if (playingIndex === idx) {
      stopAudioService();
      setPlayingIndex(null);
      return;
    }

    setPlayingIndex(idx);
    playAudioService(text, {
      onEnd: () => setPlayingIndex(null),
      onError: (err) => {
        console.error("Lydavspilling feilet:", err);
        setPlayingIndex(null);
      }
    });
  };

  // Lagre råd fra Feltveileder direkte i Kladdebok i felt (offline first failsafe)
  const handleSaveToKladdebok = async (msg: ChatMessage) => {
    try {
      const rawPreview = msg.content.replace(/[#*`_]/g, '').trim();
      const title = `[Veilederråd] ${rawPreview.substring(0, 45)}...`;
      const category = msg.content.toLowerCase().includes('rammeplan') ? 'Rammeplanen' : 'Didaktisk idé';

      await saveFieldNote({
        id: `fn-${Date.now()}`,
        title,
        content: msg.content,
        category: category as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      setSavedToNotesId(msg.id);
      setTimeout(() => setSavedToNotesId(null), 3000);
    } catch (e) {
      console.error('Feil ved lagring til Kladdebok:', e);
    }
  };

  // Send råd til Prosesslogg
  const handleSaveToProsesslogg = (msg: ChatMessage) => {
    try {
      const rawPreview = msg.content.replace(/[#*`_]/g, '').trim();
      const title = rawPreview.substring(0, 50) + '...';
      const existing = localStorage.getItem('blu_process_log');
      const list = existing ? JSON.parse(existing) : [];
      const newEntry = {
        id: `pl-${Date.now()}`,
        title: `Veiledning: ${title}`,
        reflection: msg.content,
        category: 'Didaktisk sparring',
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('blu_process_log', JSON.stringify([newEntry, ...list]));

      setSavedToLogId(msg.id);
      setTimeout(() => setSavedToLogId(null), 3000);
    } catch (e) {
      console.error('Feil ved lagring til Prosesslogg:', e);
    }
  };

  // Pin / Unpin
  const handlePinItem = (id: string, isPinned: boolean) => {
    const isFeltMode = activeAssistant === 'feltveileder';
    const updatePin = (list: ChatSession[]) =>
      list.map(c => {
        if (c.id === id) {
          const updated = { ...c, isPinned };
          saveChatToFirestore(updated, isFeltMode);
          return updated;
        }
        return c;
      });

    if (isFeltMode) {
      setFeltChats(prev => updatePin(prev));
    } else {
      setChats(prev => updatePin(prev));
    }
  };

  // Rename
  const handleRenameItem = (id: string, newTitle: string) => {
    const isFeltMode = activeAssistant === 'feltveileder';
    const updateTitle = (list: ChatSession[]) =>
      list.map(c => {
        if (c.id === id) {
          const updated = { ...c, title: newTitle };
          saveChatToFirestore(updated, isFeltMode);
          return updated;
        }
        return c;
      });

    if (isFeltMode) {
      setFeltChats(prev => updateTitle(prev));
    } else {
      setChats(prev => updateTitle(prev));
    }
  };

  // Flytt samtale til mappe
  const handleMoveChat = (chatId: string, folderId: string | undefined) => {
    const isFeltMode = activeAssistant === 'feltveileder';
    const updateFolder = (list: ChatSession[]) =>
      list.map(c => {
        if (c.id === chatId) {
          const updated = { ...c, folderId: folderId || undefined, updatedAt: new Date().toISOString() };
          saveChatToFirestore(updated, isFeltMode);
          return updated;
        }
        return c;
      });

    if (isFeltMode) {
      setFeltChats(prev => updateFolder(prev));
    } else {
      setChats(prev => updateFolder(prev));
    }
  };

  // Opprett ny mappe
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const isFeltMode = activeAssistant === 'feltveileder';
    const newFolder: FolderType = {
      id: (isFeltMode ? 'ff_' : 'folder_') + Date.now(),
      name: newFolderName.trim(),
      color: newFolderColor,
      isExpanded: true
    };

    if (isFeltMode) {
      setFeltFolders(prev => [...prev, newFolder]);
    } else {
      setFolders(prev => [...prev, newFolder]);
    }

    setNewFolderName('');
    setNewFolderColor('indigo');
    setIsCreatingFolder(false);

    if (user?.uid) {
      try {
        const db = getFirestore();
        const col = isFeltMode ? 'feltveileder_folders' : 'folders';
        await setDoc(doc(db, col, newFolder.id), {
          id: newFolder.id,
          name: newFolder.name,
          color: newFolder.color,
          userId: user.uid,
          isExpanded: true,
          createdAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Kunne ikke lagre mappe til Firestore:', err);
      }
    }
  };

  // Slett mappe
  const handleDeleteFolder = async (folderId: string) => {
    const isFeltMode = activeAssistant === 'feltveileder';
    if (isFeltMode) {
      setFeltFolders(prev => prev.filter(f => f.id !== folderId));
      setFeltChats(prev => prev.map(c => c.folderId === folderId ? { ...c, folderId: undefined } : c));
    } else {
      setFolders(prev => prev.filter(f => f.id !== folderId));
      setChats(prev => prev.map(c => c.folderId === folderId ? { ...c, folderId: undefined } : c));
    }

    if (user?.uid) {
      try {
        const db = getFirestore();
        const col = isFeltMode ? 'feltveileder_folders' : 'folders';
        await deleteDoc(doc(db, col, folderId));
      } catch (err) {
        console.warn('Kunne ikke slette mappe fra Firestore:', err);
      }
    }
  };

  // Endre mappenavn
  const handleRenameFolder = async (folderId: string, newName: string) => {
    if (!newName.trim()) return;
    const isFeltMode = activeAssistant === 'feltveileder';
    if (isFeltMode) {
      setFeltFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName.trim() } : f));
    } else {
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName.trim() } : f));
    }

    if (user?.uid) {
      try {
        const db = getFirestore();
        const col = isFeltMode ? 'feltveileder_folders' : 'folders';
        await updateDoc(doc(db, col, folderId), {
          name: newName.trim(),
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Kunne ikke oppdatere mappenavn i Firestore:', err);
      }
    }
  };

  // Endre mappefarge
  const handleUpdateFolderColor = async (folderId: string, color: string) => {
    const isFeltMode = activeAssistant === 'feltveileder';
    if (isFeltMode) {
      setFeltFolders(prev => prev.map(f => f.id === folderId ? { ...f, color } : f));
    } else {
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, color } : f));
    }

    if (user?.uid) {
      try {
        const db = getFirestore();
        const col = isFeltMode ? 'feltveileder_folders' : 'folders';
        await updateDoc(doc(db, col, folderId), {
          color,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Kunne ikke oppdatere mappefarge i Firestore:', err);
      }
    }
  };

  // Omorganisere mapper
  const handleReorderFolders = (newFolders: FolderType[]) => {
    const isFeltMode = activeAssistant === 'feltveileder';
    if (isFeltMode) {
      setFeltFolders(newFolders);
    } else {
      setFolders(newFolders);
    }
  };

  // Dupliser / klon samtale
  const handleDuplicateChat = (chatId: string) => {
    const isFeltMode = activeAssistant === 'feltveileder';
    const list = isFeltMode ? feltChats : chats;
    const original = list.find(c => c.id === chatId);
    if (!original) return;
    const newId = (isFeltMode ? 'felt_' : 'sv_') + Date.now();
    const duplicated: ChatSession = {
      ...original,
      id: newId,
      title: `${original.title} (kopi)`,
      subtitle: `${original.activeMode} • Kopi`,
      updatedAt: new Date().toISOString()
    };
    if (isFeltMode) {
      setFeltChats(prev => [duplicated, ...prev]);
      setActiveFeltChatId(newId);
    } else {
      setChats(prev => [duplicated, ...prev]);
      setActiveChatId(newId);
    }
    saveChatToFirestore(duplicated, isFeltMode);
  };

  const [folderToExportId, setFolderToExportId] = useState<string | null>(null);

  const handleArchiveChat = (chatId: string, isArchived: boolean) => {
    const isFeltMode = activeAssistant === 'feltveileder';
    if (isFeltMode) {
      setFeltChats(prev => prev.map(c => {
        if (c.id === chatId) {
          const updated = { ...c, isArchived, updatedAt: new Date().toISOString() };
          saveChatToFirestore(updated, true);
          return updated;
        }
        return c;
      }));
    } else {
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          const updated = { ...c, isArchived, updatedAt: new Date().toISOString() };
          saveChatToFirestore(updated, false);
          return updated;
        }
        return c;
      }));
    }
  };

  const handleArchiveFolder = (folderId: string, isArchived: boolean) => {
    const isFeltMode = activeAssistant === 'feltveileder';
    if (isFeltMode) {
      setFeltFolders(prev => prev.map(f => {
        if (f.id === folderId) {
          const updated = { ...f, isArchived };
          if (user?.uid) {
            const db = getFirestore();
            updateDoc(doc(db, 'feltveileder_folders', folderId), { isArchived, updatedAt: new Date().toISOString() }).catch(console.warn);
          }
          return updated;
        }
        return f;
      }));
    } else {
      setFolders(prev => prev.map(f => {
        if (f.id === folderId) {
          const updated = { ...f, isArchived };
          if (user?.uid) {
            const db = getFirestore();
            updateDoc(doc(db, 'folders', folderId), { isArchived, updatedAt: new Date().toISOString() }).catch(console.warn);
          }
          return updated;
        }
        return f;
      }));
    }
  };

  const [folderForContextModalId, setFolderForContextModalId] = useState<string | null>(null);

  const handleSaveFolderContext = async (folderId: string, customContext: string, focusArea?: string) => {
    const isFeltMode = activeAssistant === 'feltveileder';
    if (isFeltMode) {
      setFeltFolders(prev => prev.map(f => {
        if (f.id === folderId) {
          const updated = { ...f, customContext, focusArea };
          if (user?.uid) {
            const db = getFirestore();
            updateDoc(doc(db, 'feltveileder_folders', folderId), { customContext, focusArea, updatedAt: new Date().toISOString() }).catch(console.warn);
          }
          return updated;
        }
        return f;
      }));
    } else {
      setFolders(prev => prev.map(f => {
        if (f.id === folderId) {
          const updated = { ...f, customContext, focusArea };
          if (user?.uid) {
            const db = getFirestore();
            updateDoc(doc(db, 'folders', folderId), { customContext, focusArea, updatedAt: new Date().toISOString() }).catch(console.warn);
          }
          return updated;
        }
        return f;
      }));
    }
  };

  // Slett samtale
  const handleDeleteItem = (id: string) => {
    if (!id) return;
    const isFeltMode = activeAssistant === 'feltveileder';

    if (isFeltMode) {
      setFeltChats(prev => {
        const filtered = prev.filter(c => c.id !== id);
        if (activeFeltChatId === id) {
          if (filtered.length > 0) {
            setActiveFeltChatId(filtered[0].id);
          } else {
            const freshId = `felt_${Date.now()}`;
            const freshSession: ChatSession = {
              id: freshId,
              title: 'Ny feltsamtale',
              subtitle: 'Rammeplan-kobling • Nettopp opprettet',
              isPinned: false,
              activeMode: 'Rammeplan-kobling',
              updatedAt: new Date().toISOString(),
              messages: [
                {
                  id: 'welcome-' + freshId,
                  role: 'assistant',
                  content: 'Hei! Hva vil du utforske eller få praksisveiledning på nå?',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  mode: 'Rammeplan-kobling',
                  agent: 'FELT'
                }
              ]
            };
            setActiveFeltChatId(freshId);
            return [freshSession];
          }
        }
        return filtered;
      });
    } else {
      setChats(prev => {
        const filtered = prev.filter(c => c.id !== id);
        if (activeChatId === id) {
          if (filtered.length > 0) {
            setActiveChatId(filtered[0].id);
          } else {
            const freshId = `sv_${Date.now()}`;
            const freshSession: ChatSession = {
              id: freshId,
              title: 'Ny samtale',
              subtitle: `${activeMode} • Nettopp opprettet`,
              isPinned: false,
              activeMode: activeMode,
              updatedAt: new Date().toISOString(),
              messages: [
                {
                  id: 'welcome-' + freshId,
                  role: 'assistant',
                  content: 'Hei! Hva vil du utforske eller få veiledning på i dag?',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  mode: activeMode,
                  agent: activeMode.toUpperCase()
                }
              ]
            };
            setActiveChatId(freshId);
            return [freshSession];
          }
        }
        return filtered;
      });
    }

    if (user?.uid) {
      try {
        const db = getFirestore();
        const col = isFeltMode ? 'feltveileder_chats' : 'superveileder_chats';
        deleteDoc(doc(db, 'users', user.uid, col, id)).catch(err => {
          console.warn('Kunne ikke slette chat fra Firestore:', err);
        });
      } catch (err) {
        console.warn('Firestore feil ved sletting:', err);
      }
    }
  };

  // Slett en enkeltmelding fra aktiv samtale
  const handleDeleteMessage = (msgId: string) => {
    const isFeltMode = activeAssistant === 'feltveileder';
    const removeMsg = (list: ChatSession[], currentId: string) =>
      list.map(c => {
        if (c.id === currentId) {
          const updatedMessages = c.messages.filter(m => m.id !== msgId);
          const updatedSession = {
            ...c,
            messages: updatedMessages.length > 0 ? updatedMessages : [
              {
                id: 'welcome-' + c.id,
                role: 'assistant' as const,
                content: isFeltMode ? 'Hei! Hva lurer du på i praksishverdagen din nå?' : 'Hei! Hva vil du utforske eller få veiledning på i dag?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                mode: c.activeMode || 'Auto',
                agent: isFeltMode ? 'FELT' : (c.activeMode || 'Auto').toUpperCase()
              }
            ],
            updatedAt: new Date().toISOString()
          };
          saveChatToFirestore(updatedSession, isFeltMode);
          return updatedSession;
        }
        return c;
      });

    if (isFeltMode) {
      setFeltChats(prev => removeMsg(prev, activeFeltChatId));
    } else {
      setChats(prev => removeMsg(prev, activeChatId));
    }
  };

  const getAgentStyling = (agent?: string) => {
    switch (agent) {
      case 'FELT':
      case 'PRAKSIS':
        return {
          label: 'Feltveileder',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
        };
      case 'FEIL':
        return {
          label: 'Systemvarsel',
          color: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
        };
      case 'SOKRATISK':
        return {
          label: 'Sokratisk Partner',
          color: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: <Brain className="w-3.5 h-3.5 text-purple-600" />
        };
      case 'RAG':
      case 'RAMMEPLAN':
        return {
          label: 'Lovverk & Rammeplan',
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
        };
      case 'APA':
        return {
          label: 'Auto-APA 7',
          color: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <Quote className="w-3.5 h-3.5 text-blue-600" />
        };
      case 'SPRAK':
        return {
          label: 'Humanizer-bot (Språkvask)',
          color: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Coins className="w-3.5 h-3.5 text-amber-600" />
        };
      case 'METODE':
        return {
          label: 'Metode & Forskning',
          color: 'bg-teal-50 text-teal-700 border-teal-200',
          icon: <Search className="w-3.5 h-3.5 text-teal-600" />
        };
      case 'LYTTE':
        return {
          label: 'Lyttebot (Debrifing & Omsorg)',
          color: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <HeartHandshake className="w-3.5 h-3.5 text-rose-600" />
        };
      default:
        return {
          label: 'Superveilederen',
          color: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <Sparkles className="w-3.5 h-3.5 text-slate-600" />
        };
    }
  };

  // Moduser for Superveilederen
  const superModes = [
    { id: 'Auto', icon: <Sparkles className="w-4 h-4" />, desc: 'Intelligent didaktisk ruting' },
    { id: 'Sokratisk', icon: <Brain className="w-4 h-4 text-purple-500" />, desc: 'Stiller reflekterende spørsmål uten fasit' },
    { id: 'Rammeplan', icon: <BookOpen className="w-4 h-4 text-indigo-500" />, desc: 'Kobling til fagområder og lovverk' },
    { id: 'APA', icon: <Quote className="w-4 h-4 text-blue-500" />, desc: 'Korrekt kildereferanse og sitat etter APA 7' },
    { id: 'Metode', icon: <Search className="w-4 h-4 text-teal-500" />, desc: 'Forskningsdesign, metode og etikk' },
    { id: 'Lytte', icon: <HeartHandshake className="w-4 h-4 text-rose-500" />, desc: 'Debrifing, stressmestring og omsorg etter praksis' }
  ];

  // Moduser for Feltveilederen (Praksis & Felt)
  const feltModes = [
    { id: 'Rammeplan-kobling', icon: <BookOpen className="w-4 h-4 text-emerald-500" />, desc: 'Koble situasjoner til Rammeplanens fagområder og formål' },
    { id: 'Didaktisk idé', icon: <Sparkles className="w-4 h-4 text-indigo-500" />, desc: 'Konkrete ideer for ute- og inneaktiviteter' },
    { id: 'Barns medvirkning', icon: <User className="w-4 h-4 text-purple-500" />, desc: 'Berit Bae og William Corsaro i hverdagsrutiner' },
    { id: 'Konflikt & lek', icon: <HeartHandshake className="w-4 h-4 text-rose-500" />, desc: 'Anerkjennende væremåte og lekende megling' },
    { id: 'Samling', icon: <Bot className="w-4 h-4 text-amber-500" />, desc: 'Engasjerende samlingsstunder om sanser og natur' },
    { id: 'Risiko & kropp', icon: <Search className="w-4 h-4 text-teal-500" />, desc: 'Kroppslig væren (Løkken) og risikofylt lek' }
  ];

  const currentModes = isFelt ? feltModes : superModes;

  return (
    <WorkspaceLayout
      title={isFelt ? "Feltveilederen" : "Superveilederen"}
      className="h-auto md:h-auto lg:h-auto min-h-[1050px] overflow-visible rounded-xl md:rounded-2xl shadow-sm"
      mainClassName="overflow-visible flex-1 flex flex-col bg-slate-50/50 relative h-auto md:h-auto"
      subtitle={isFelt ? "Praksis, Rammeplan & didaktiske situasjoner" : "Sokratisk sparring, Rammeplan, APA & fagskriving"}
      icon={isFelt ? <BookOpen className="w-6 h-6 text-emerald-600" /> : <Sparkles className="w-6 h-6 text-indigo-600" />}
      actionButtonLabel={isFelt ? "Ny feltsamtale" : "Ny veiledningssamtale"}
      historySectionTitle={isFelt ? "Felt-samtaler" : "Samtaler"}
      onActionClick={handleNewChat}
      folders={currentFolders}
      onAddFolder={() => setIsCreatingFolder(true)}
      onMoveToFolder={handleMoveChat}
      onDeleteFolder={handleDeleteFolder}
      onRenameFolder={handleRenameFolder}
      onUpdateFolderColor={handleUpdateFolderColor}
      onArchiveFolder={handleArchiveFolder}
      onExportFolder={(fId) => setFolderToExportId(fId)}
      onEditFolderContext={(fId) => setFolderForContextModalId(fId)}
      onReorderFolders={handleReorderFolders}
      onDuplicateItem={handleDuplicateChat}
      onArchiveItem={handleArchiveChat}
      historyItems={currentChats}
      activeItemId={currentActiveId}
      onItemClick={(id) => {
        if (isFelt) setActiveFeltChatId(id);
        else setActiveChatId(id);
      }}
      onPinItem={handlePinItem}
      onRenameItem={handleRenameItem}
      onDeleteItem={handleDeleteItem}
    >
      {({ isCollapsed, openMobileArchive }) => {
        const activeFolder = currentFolders.find(f => f.id === activeChat?.folderId);
        return (
          <>
            <div className="flex flex-col h-auto md:h-auto min-h-[1050px] bg-slate-50/50 overflow-visible relative">
            
            {/* Top Bar Switcher: Direktekoblet med Feltveilederen, Superveilederen og BLU-hjelperen */}
            <div className="bg-slate-900 text-white border-b border-slate-800 px-3 sm:px-4 py-2 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {/* Mobilknapp for å åpne samtale-arkivet for denne veilederen */}
              <button
                type="button"
                onClick={openMobileArchive}
                className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Vis samtale-arkiv på mobil"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Arkiv ({currentChats.length})</span>
              </button>

              <span className="text-xs font-semibold text-slate-300 hidden sm:inline">Skriving</span>
              <span className="text-slate-600 text-xs hidden sm:inline">•</span>
              <span className={cn(
                "text-xs font-bold hidden sm:inline",
                isFelt ? "text-emerald-400" : "text-indigo-400"
              )}>
                {isFelt ? 'Feltveilederen' : 'Superveilederen'}
              </span>
            </div>

            {/* Hurtig-bytter mellom Superveilederen, Feltveilederen og BLU-hjelperen (synlig på mobil og desktop) */}
            <div className="flex items-center p-0.5 bg-slate-800 rounded-xl border border-slate-700 shadow-2xs overflow-x-auto max-w-full">
              {/* Pille 1: Superveilederen */}
              <button
                type="button"
                onClick={() => {
                  setActiveAssistant('superveileder');
                  if (onAssistantChange) onAssistantChange('superveileder');
                }}
                className={cn(
                  "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer",
                  !isFelt
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/70"
                )}
                title="Bytt til Superveilederen (Akademisk skriving, Sokratisk sparring, APA og metode)"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span>Superveilederen</span>
              </button>

              {/* Pille 2: Feltveilederen (Dedikert pille tilgjengelig i mobilvisningen) */}
              <button
                type="button"
                onClick={() => {
                  setActiveAssistant('feltveileder');
                  if (onAssistantChange) onAssistantChange('feltveileder');
                }}
                className={cn(
                  "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer",
                  isFelt
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/70"
                )}
                title="Bytt til Feltveilederen (Praksis, Rammeplan, didaktikk og egne observasjoner)"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
                <span>Feltveilederen</span>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-1.5 py-0.2 rounded-full border border-emerald-700/60 hidden sm:inline">
                  Praksis
                </span>
              </button>
            </div>
          </div>

          {/* Sticky Header Wrapper: Top Bar Switcher, Modus-velger og Banners */}
          <div className="sticky top-16 z-30 bg-white shadow-2xs">
            {/* Modus-velger i toppen */}
            <div className={`bg-white p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 transition-all duration-300 ${
              isCollapsed ? 'pl-16 sm:pl-36' : ''
            }`}>
              <div className="flex flex-wrap items-center gap-1.5">
                {currentModes.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleSetMode(m.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeMode === m.id 
                        ? (isFelt ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-700' : 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900')
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                    title={m.desc}
                  >
                    {m.icon} 
                    <span>{m.id}</span>
                  </button>
                ))}
              </div>

              {/* Handlinger på høyre side: Pensum på øret, Ny samtale og Slett samtale */}
              <div className="flex items-center gap-2">
                {playingIndex !== null && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl text-blue-700 text-xs font-bold animate-pulse">
                    <Volume2 className="w-4 h-4" />
                    <span>Spiller av pensum på øret...</span>
                    <button 
                      onClick={() => { stopAudioService(); setPlayingIndex(null); }}
                      className="ml-1 p-0.5 hover:bg-blue-200 rounded cursor-pointer"
                      title="Stopp lyd"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                )}

                {/* Hurtigknapp: Ny samtale */}
                <button
                  type="button"
                  onClick={handleNewChat}
                  className={cn(
                    "px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs",
                    isFelt
                      ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                  )}
                  title={isFelt ? "Start en helt ny praksis-samtale" : "Start en helt ny veiledningssamtale"}
                >
                  <Plus className={cn("w-3.5 h-3.5", isFelt ? "text-emerald-700" : "text-indigo-600")} />
                  <span className="hidden sm:inline">{isFelt ? "Ny feltsamtale" : "Ny samtale"}</span>
                </button>

                {/* Slett denne samtalen med hurtigbekreftelse */}
                {confirmDeleteActiveChat ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-1 rounded-xl animate-in fade-in">
                    <span className="text-[11px] text-rose-800 font-bold">Slette samtalen?</span>
                    <button
                      onClick={() => {
                        if (activeChat) handleDeleteItem(activeChat.id);
                        setConfirmDeleteActiveChat(false);
                      }}
                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      Ja
                    </button>
                    <button
                      onClick={() => setConfirmDeleteActiveChat(false)}
                      className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium transition-all cursor-pointer"
                    >
                      Avbryt
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteActiveChat(true)}
                    className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Slett denne samtalen permanent"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span className="hidden sm:inline">Slett samtale</span>
                  </button>
                )}
              </div>
            </div>

            {/* Banner for Feltveilederen eller Sokratisk modus */}
            {isFelt ? (
              <div className="bg-emerald-50/90 border-b border-emerald-200/80 px-4 md:px-6 py-2.5 flex items-center justify-between text-xs text-emerald-950 font-medium animate-in fade-in">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Feltveileder aktiv:</strong> Forankret i Rammeplan for barnehagen og sentral didaktisk teori (Bae, Corsaro, Vygotskij, Løkken). Gir deg konkrete grep for praksishverdagen.</span>
                </div>
              </div>
            ) : activeMode === 'Sokratisk' && (
              <div className="bg-purple-50/90 border-b border-purple-200/80 px-4 md:px-6 py-2.5 flex items-center justify-between text-xs text-purple-900 font-medium animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-600 shrink-0" />
                  <span><strong>Sokratisk modus aktiv:</strong> Veilederen gir ingen fasitsvar, men stiller utforskende spørsmål for å trene din faglige refleksjon og didaktiske bevissthet.</span>
                </div>
                <button 
                  onClick={() => handleSetMode('Auto')}
                  className="text-[11px] underline font-bold text-purple-700 hover:text-purple-900 ml-4 shrink-0 cursor-pointer"
                >
                  Nullstill til Auto
                </button>
              </div>
            )}

            {/* Mappe-kontekst banner hvis samtalen er i en mappe */}
            {activeFolder && (
              <div className="bg-gradient-to-r from-purple-900 to-indigo-900 border-b border-purple-500/30 px-4 md:px-6 py-2 flex items-center justify-between text-xs text-white shadow-xs">
                <div className="flex items-center gap-2 truncate">
                  <Brain className="w-4 h-4 text-purple-300 shrink-0 animate-pulse" />
                  <span className="truncate text-xs font-semibold">
                    <strong className="text-purple-200">Mappekontekst:</strong> {activeFolder.name} {activeFolder.customContext?.trim() ? `— «${activeFolder.customContext.slice(0, 75)}...»` : '— (Ingen føringer definert)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFolderForContextModalId(activeFolder.id)}
                  className="text-[11px] font-bold text-purple-200 hover:text-white underline ml-3 shrink-0 cursor-pointer bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-all"
                >
                  {activeFolder.customContext?.trim() ? '⚙️ Tilpass føringer' : '+ Definer KI-føringer'}
                </button>
              </div>
            )}
          </div>

          {/* Chat-meldinger */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 p-4 md:p-6 space-y-6 bg-slate-50/50 overflow-visible min-h-[450px]"
          >
            <div className="max-w-3xl mx-auto w-full space-y-5">
              
              {/* AI Warning */}
              <AIWarning dismissible={true} />

              {/* Velkomst og Hurtigforslag dersom samtalen er fersk */}
              {(!activeChat?.messages || activeChat.messages.filter(m => m.role === 'user').length === 0) && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex flex-col items-start max-w-2xl mx-auto w-full">
                    <span className="text-[10px] font-bold text-slate-400 mb-1 ml-1 flex items-center gap-1">
                      {isFelt ? <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> : <Bot className="w-3.5 h-3.5 text-indigo-500" />} 
                      {isFelt ? 'Feltveilederen' : 'Superveilederen'}
                    </span>
                    <div className="bg-white border border-slate-200 text-slate-700 p-4 rounded-2xl rounded-bl-sm shadow-xs text-sm leading-relaxed">
                      {isFelt ? (
                        <>
                          Hei! 👋 Jeg er <strong>Feltveilederen</strong> for barnehagelærerstudenter i praksis. Står du i en spesiell situasjon i barnehagen nå, eller planlegger du en aktivitet? Klikk på et av forslagene under eller skriv inn en situasjon!
                        </>
                      ) : (
                        <>
                          Hei! Jeg er <strong>Superveilederen</strong> for barnehagelærerutdanningen. Still meg et spørsmål, eller klikk på et av forslagene nedenfor for å komme i gang. Du kan også velge en spesifikk modus over.
                        </>
                      )}
                    </div>
                  </div>

                  {/* Modus-spesifikke hurtigspørsmål */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 max-w-2xl mx-auto w-full">
                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className={cn("w-3.5 h-3.5", isFelt ? "text-emerald-600" : "text-indigo-600")} />
                      <span>{isFelt ? 'Anbefalte feltspørsmål:' : `Anbefalte veiledningsspørsmål (${activeMode}):`}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(isFelt ? [
                        "Hvordan koble en observasjon av frilek i sandkassa til Rammeplanens fagområder?",
                        "Gi meg 3 konkrete didaktiske ideer for en gruppe 3-4-åringer i ulendt skogsterreng.",
                        "Hva sier Berit Bae og William Corsaro om barns medvirkning i påkledningssituasjoner?",
                        "Hvordan løse en leke-konflikt mellom to 4-åringer med anerkjennende kommunikasjon?",
                        "Trenger et engasjerende opplegg for en 15-minutters samlingsstund om sanser.",
                        "Hvordan begrunne barns risikofylte lek pedagogisk overfor engstelige kolleger?"
                      ] : activeMode === 'Sokratisk' ? [
                        "Hvordan kan jeg ivareta barns medvirkning i en travel garderobesituasjon?",
                        "Et barn trekker seg unna i frileken. Hva bør jeg observere før jeg griper inn?",
                        "Hvordan skiller jeg mellom danning og oppdragelse i en konfliktsituasjon?",
                        "Hva betyr pedagogisk skjønn i praksis når Rammeplanen er åpen for tolkning?"
                      ] : [
                        "Hvordan formulere en skarp problemstilling om barns medvirkning?",
                        "Hvilke etiske vurderinger må jeg gjøre ved observasjon i barnehagen?",
                        "Hvordan sitere Rammeplanen for barnehagen (2017) korrekt etter APA 7?"
                      ]).map((prompt, pIdx) => (
                        <button
                          key={`prompt-${pIdx}`}
                          onClick={() => handleSendMessage(prompt)}
                          className={cn(
                            "px-3 py-1.5 border rounded-xl text-xs transition-all text-left font-medium cursor-pointer",
                            isFelt
                              ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-950"
                              : activeMode === 'Sokratisk'
                                ? "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-950"
                                : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                          )}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Chat-bobler */}
              {activeChat.messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const isErrorMsg = !isUser && (
                  msg.agent === 'FEIL' || 
                  (typeof msg.content === 'string' && (
                    msg.content.startsWith('Feil:') || 
                    msg.content.includes('ikke tilgjengelig') || 
                    msg.content.includes('Klarte ikke') ||
                    msg.content.includes('Serverfeil')
                  ))
                );
                const agentStyle = !isUser ? getAgentStyling(msg.agent || (isFelt ? 'FELT' : msg.mode)) : null;
                const isPlaying = playingIndex === idx;

                return (
                  <div 
                    key={msg.id || idx}
                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 border shadow-2xs",
                        isFelt ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-indigo-50 text-indigo-600 border-indigo-200/80"
                      )}>
                        {isFelt ? <BookOpen className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                    )}

                    <div className={`flex flex-col max-w-[85%] sm:max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
                      
                      {/* Header med agent badge */}
                      <div className="flex items-center gap-2 mb-1 px-1 text-[11px] font-semibold text-slate-400">
                        {!isUser && agentStyle && (
                          <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider ${agentStyle.color}`}>
                            {agentStyle.icon}
                            <span>{agentStyle.label}</span>
                          </div>
                        )}
                        <span>{isUser ? 'Deg' : ''}</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      {isErrorMsg ? (
                        <div className="p-4 rounded-2xl text-sm leading-relaxed relative bg-rose-50/95 border border-rose-200 text-rose-950 rounded-bl-xs shadow-xs w-full">
                          <div className="flex items-start gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div className="font-bold text-rose-900 text-xs">Forespørselen ble avbrutt eller svar feilet</div>
                          </div>
                          <div className="text-rose-900/90 text-xs mb-3 whitespace-pre-wrap leading-normal font-sans">
                            {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                          </div>
                          <div className="flex items-center gap-2 pt-2 border-t border-rose-200/80">
                            <button
                              type="button"
                              onClick={() => {
                                const currentIdx = activeChat.messages.findIndex(m => m.id === msg.id);
                                const prevUserMsg = activeChat.messages.slice(0, currentIdx).reverse().find(m => m.role === 'user');
                                handleDeleteMessage(msg.id);
                                if (prevUserMsg) {
                                  handleSendMessage(prevUserMsg.content, true);
                                }
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-rose-100/60 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                              title="Prøv på nytt"
                            >
                              <RotateCcw className="w-3 h-3 text-rose-600" />
                              <span>Prøv igjen</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Fjern meldingen"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Slett</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className={`p-4 rounded-2xl text-sm leading-relaxed relative group ${
                            isUser
                              ? (isFelt ? 'bg-emerald-700 text-white rounded-br-xs shadow-sm shadow-emerald-700/10' : 'bg-blue-600 text-white rounded-br-xs shadow-sm shadow-blue-600/10')
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-xs'
                          }`}
                        >
                          <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : 'prose-slate'}`}>
                            <ReactMarkdown>{typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2)}</ReactMarkdown>
                          </div>

                          {/* Handlingsknapper for assistentmeldinger */}
                          {!isUser && (
                            <div className="flex flex-wrap items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-100">
                              
                              {/* Knapper spesifikke for Feltveileder: Lagre i Kladdebok og Prosesslogg */}
                              {isFelt && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveToKladdebok(msg)}
                                    className={cn(
                                      "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                                      savedToNotesId === msg.id
                                        ? "bg-emerald-600 text-white"
                                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80"
                                    )}
                                    title="Lagre rådet direkte i Kladdebok i felt"
                                  >
                                    {savedToNotesId === msg.id ? (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Lagret i feltbok!</span>
                                      </>
                                    ) : (
                                      <>
                                        <BookmarkPlus className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Kladdebok</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleSaveToProsesslogg(msg)}
                                    className={cn(
                                      "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                                      savedToLogId === msg.id
                                        ? "bg-amber-600 text-white"
                                        : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80"
                                    )}
                                    title="Send refleksjon til Prosesslogg"
                                  >
                                    {savedToLogId === msg.id ? (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Sendt til logg!</span>
                                      </>
                                    ) : (
                                      <>
                                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Prosesslogg</span>
                                      </>
                                    )}
                                  </button>
                                </>
                              )}

                              {/* Pensum på øret (TTS Lydavspilling) */}
                              <button
                                onClick={() => playAudio(msg.content, idx)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isPlaying
                                    ? 'bg-blue-600 text-white animate-pulse'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                }`}
                                title={isPlaying ? "Stopp opplesing" : "Pensum på øret (Les opp tekst)"}
                              >
                                {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
                                <span className="text-[11px]">{isPlaying ? 'Stopp' : 'Pensum på øret'}</span>
                              </button>

                              {/* Kopi-knapp */}
                              <button
                                onClick={() => handleCopy(msg.id, msg.content)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition-all cursor-pointer"
                                title="Kopier svar"
                              >
                                {copiedId === msg.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Slett enkeltmelding */}
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg text-xs transition-all cursor-pointer"
                                title="Slett denne meldingen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Slett-knapp for brukermeldinger på hover */}
                          {isUser && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end mt-1 pt-1 border-t border-blue-500/40">
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1 text-blue-200 hover:text-white hover:bg-blue-700/60 rounded text-[11px] transition-all cursor-pointer flex items-center gap-1"
                                title="Slett denne meldingen"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Slett</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Laster-indikator */}
              {isLoading && (
                <div className="flex gap-3 justify-start items-center">
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs animate-pulse",
                    isFelt ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-indigo-50 text-indigo-600 border-indigo-200/80"
                  )}>
                    {isFelt ? <BookOpen className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <Loader2 className={cn("w-4 h-4 animate-spin", isFelt ? "text-emerald-600" : "text-indigo-600")} />
                    <span>{isFelt ? 'Feltveilederen henter didaktiske perspektiver og Rammeplan-forankring...' : 'Superveilederen konsulterer fagkilder og veileder...'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Skrivefelt i bunn */}
          <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md p-3 md:p-4 border-t border-slate-200 shadow-lg">
            <form 
              onSubmit={handleSubmit}
              className="max-w-3xl mx-auto flex items-center gap-2 border p-2 rounded-2xl bg-white border-slate-200 shadow-2xs focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all"
            >
              <button 
                type="button" 
                onClick={() => document.getElementById('document-upload')?.click()}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer rounded-xl hover:bg-slate-100 shrink-0"
                title="Legg ved dokument (.pdf, .docx, .txt)"
              >
                <Paperclip className="w-5 h-5" /> 
              </button>
              <input 
                id="document-upload" 
                type="file" 
                className="hidden" 
                accept=".pdf,.docx,.txt"
                onChange={(e) => setAttachedFile(e.target.files?.[0] || null)} 
              />
              {attachedFile && (
                <div className="text-xs bg-gray-100 p-1 rounded-lg flex items-center gap-1.5 shrink-0 border border-slate-200 max-w-[200px] truncate">
                  <span className="truncate text-slate-700 font-medium">{attachedFile.name}</span>
                  <button 
                    type="button"
                    onClick={() => {
                      setAttachedFile(null);
                      const fileInput = document.getElementById('document-upload') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }} 
                    className="text-red-500 font-bold hover:text-red-700 cursor-pointer ml-1 text-sm leading-none"
                    title="Fjern vedlegg"
                  >
                    ×
                  </button>
                </div>
              )}
              <textarea 
                rows={3}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    const form = e.currentTarget.form;
                    if (form) form.requestSubmit();
                  }
                }}
                placeholder={isFelt ? "Beskriv en situasjon eller observasjon fra barnehagen for praksisveiledning..." : "Beskriv en situasjon fra barnehagen for sokratisk sparring..."}
                disabled={isLoading}
                className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-800 placeholder:text-slate-400 py-2.5 px-2 resize-none leading-relaxed custom-scrollbar"
              />
              <button
                type="submit"
                disabled={(!input.trim() && !attachedFile) || isLoading}
                className={cn(
                  "p-2.5 rounded-xl text-white font-bold transition-all shadow-md flex items-center justify-center shrink-0 cursor-pointer min-h-[42px] min-w-[42px]",
                  (!input.trim() && !attachedFile) || isLoading 
                    ? "bg-slate-200 text-slate-400 opacity-60 cursor-not-allowed shadow-none" 
                    : isFelt 
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-95" 
                      : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 active:scale-95"
                )}
                title="Send innspill"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>

      {/* OPPRETT NY MAPPE MODAL */}
      {isCreatingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 ${isFelt ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
              <FolderPlus className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Opprett ny mappe</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {isFelt 
                  ? 'Organiser veiledningssamtalene dine etter praksisperioder, emner eller tema.' 
                  : 'Organiser veiledningssamtalene dine i Superveilederen etter emner, oppgaver eller fag.'}
              </p>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleCreateFolder(); }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mappenavn
                </label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="f.eks. BLU5003, Praksis H26..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Fargevelger */}
              <div>
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

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName('');
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className={`px-5 py-2 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${isFelt ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Opprett mappe</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MAPPE EKSPORT MODAL FOR VEILEDNINGSSAMTALER */}
      {folderToExportId && (
        <FolderExportModal
          isOpen={Boolean(folderToExportId)}
          onClose={() => setFolderToExportId(null)}
          folderName={currentFolders.find(f => f.id === folderToExportId)?.name || 'Mappe'}
          items={currentChats
            .filter(c => c.folderId === folderToExportId)
            .map(c => ({
              id: c.id,
              title: c.title,
              subtitle: c.subtitle,
              template: c.activeMode || 'Veiledningssamtale',
              updatedAt: c.updatedAt,
              content: (c.messages || [])
                .map(m => `### ${m.role === 'user' ? 'Student' : 'Veileder'} (${m.timestamp || ''})\n\n${m.content}`)
                .join('\n\n---\n\n')
            }))}
          userProfile={{
            name: user?.displayName || '',
            institution: 'Barnehagelærerutdanningen'
          }}
        />
      )}

      {/* MAPPE KONTEKST MODAL */}
      {folderForContextModalId && (
        <FolderContextModal
          isOpen={Boolean(folderForContextModalId)}
          onClose={() => setFolderForContextModalId(null)}
          folder={currentFolders.find(f => f.id === folderForContextModalId) || null}
          onSaveContext={handleSaveFolderContext}
        />
      )}
          </>
        );
      }}
    </WorkspaceLayout>
  );
}

export default Superveileder;
