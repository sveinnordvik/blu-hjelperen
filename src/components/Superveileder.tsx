import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceLayout, HistoryItem, FolderType } from './WorkspaceLayout';
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
  Trash2,
  RotateCcw,
  AlertTriangle,
  Plus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { 
  generateAcademicResponse, 
  askSocraticAgent, 
  askApaAgent, 
  askLanguageAgent,
  superAgentRouter,
  askRagAgent,
  playAudio as playAudioService,
  stopAudio as stopAudioService
} from '../services/geminiService';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import AIWarning from './AIWarning';

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
  onSwitchToBlu?: () => void;
}

const STORAGE_KEY = 'blu_superveileder_chats_v2';
const FOLDERS_STORAGE_KEY = 'blu_superveileder_folders_v1';

const INITIAL_FOLDERS: FolderType[] = [
  { id: 'f-praksis', name: 'Praksis & Observasjon', isExpanded: true },
  { id: 'f-fagskriving', name: 'Fagskriving & Teori', isExpanded: true },
  { id: 'f-rammeplan', name: 'Rammeplan & Didaktikk', isExpanded: false }
];

const INITIAL_CHATS: ChatSession[] = [
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

export function Superveileder({ user, didacticProfile, initialMode, onSwitchToBlu }: SuperveilederProps) {
  const [chats, setChats] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Kunne ikke hente lagrede veiledninger:', e);
    }
    return INITIAL_CHATS;
  });

  const [activeChatId, setActiveChatId] = useState<string>(() => {
    return chats.length > 0 ? chats[0].id : 'sok-1';
  });

  // Mappestruktur for samtaler
  const [folders, setFolders] = useState<FolderType[]>(() => {
    try {
      const saved = localStorage.getItem(FOLDERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Kunne ikke hente lagrede mapper for Superveileder:', e);
    }
    return INITIAL_FOLDERS;
  });

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [confirmDeleteActiveChat, setConfirmDeleteActiveChat] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const prevMsgCountRef = useRef(0);

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0] || INITIAL_CHATS[0];
  const activeMode = activeChat?.activeMode || initialMode || 'Auto';

  // Last chats og mapper fra Firestore når bruker er logget inn
  useEffect(() => {
    if (!user?.uid) return;

    const loadFirestoreData = async () => {
      try {
        const db = getFirestore();
        
        // 1. Hent samtaler
        const chatsRef = collection(db, 'users', user.uid, 'superveileder_chats');
        const q = query(chatsRef, orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const loadedChats: ChatSession[] = snapshot.docs.map(d => ({
            id: d.id,
            ...(d.data() as any)
          } as ChatSession));
          
          setChats(loadedChats);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedChats));
          } catch (e) {
            console.error('Kunne ikke lagre til localStorage:', e);
          }
        }

        // 2. Hent mapper fra Firestore
        const folderQ = query(collection(db, 'folders'), where('userId', '==', user.uid));
        const folderSnapshot = await getDocs(folderQ);
        if (!folderSnapshot.empty) {
          const fetchedFolders = folderSnapshot.docs.map(d => ({
            id: d.id,
            ...(d.data() as any)
          } as FolderType));

          setFolders(fetchedFolders);
          try {
            localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(fetchedFolders));
          } catch (e) {
            console.error('Kunne ikke lagre mapper til localStorage:', e);
          }
        }
      } catch (err) {
        console.warn('Kunne ikke hente Firestore-data for Superveileder:', err);
      }
    };

    loadFirestoreData();
  }, [user?.uid]);

  // Lagre chats lokalt ved endring
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch (e) {
      console.error('Kunne ikke lagre chats til localStorage:', e);
    }
  }, [chats]);

  // Lagre mapper lokalt ved endring
  useEffect(() => {
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error('Kunne ikke lagre mapper til localStorage:', e);
    }
  }, [folders]);

  // Lagre aktiv chat til Firestore når den endres
  const saveChatToFirestore = async (chatToSave: ChatSession) => {
    if (!user?.uid) return;
    try {
      const db = getFirestore();
      const chatRef = doc(db, 'users', user.uid, 'superveileder_chats', chatToSave.id);
      const cleanData: any = { ...chatToSave };
      if (!cleanData.folderId) {
        delete cleanData.folderId;
      }
      await setDoc(chatRef, cleanData, { merge: true });
    } catch (err) {
      console.warn('Firestore autosave feilet for Superveileder:', err);
    }
  };

  // Lagre mappe til Firestore
  const saveFolderToFirebase = async (folder: FolderType) => {
    if (!user?.uid) return;
    try {
      const db = getFirestore();
      const folderRef = doc(db, 'folders', folder.id);
      await setDoc(folderRef, {
        id: folder.id,
        name: folder.name,
        userId: user.uid,
        isExpanded: folder.isExpanded ?? true,
        createdAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Kunne ikke lagre mappe til Firestore:', err);
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
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
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

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = 0;
    }
    // Stopp eventuell lydavspilling ved samtalebytte
    stopAudioService();
    setPlayingIndex(null);
  }, [activeChatId]);

  // Rydd opp lydavspilling ved unmount
  useEffect(() => {
    return () => {
      stopAudioService();
    };
  }, []);

  const handleNewChat = () => {
    stopAudioService();
    setPlayingIndex(null);

    const newId = `sv_${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: 'Ny veiledningssamtale',
      subtitle: `${activeMode} • Nettopp opprettet`,
      isPinned: false,
      activeMode: activeMode,
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'welcome-' + newId,
          role: 'assistant',
          content: `Hei! Jeg er **Superveilederen** din for barnehagelærerutdanningen. Hva vil du utforske eller få veiledning på i dag? (${activeMode}-modus er aktiv)`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mode: activeMode,
          agent: activeMode.toUpperCase()
        }
      ]
    };
    setChats(prev => [newSession, ...prev]);
    setActiveChatId(newId);
    saveChatToFirestore(newSession);
  };

  const handleSetMode = (mode: string) => {
    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) {
        const updated = {
          ...c,
          activeMode: mode,
          subtitle: `${mode} • Sist endret nå`,
          updatedAt: new Date().toISOString()
        };
        saveChatToFirestore(updated);
        return updated;
      }
      return c;
    }));
  };

  const handleSendMessage = async (textToSend?: string, isRetry: boolean = false) => {
    const userText = (textToSend || input).trim();
    if (!userText || isLoading || !activeChat) return;

    if (!textToSend) setInput('');

    let updatedSession: ChatSession | null = null;

    if (!isRetry) {
      const userMsg: ChatMessage = {
        id: 'usr-' + Date.now(),
        role: 'user',
        content: userText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: activeMode
      };

      const isFirstUserMessage = activeChat.messages.filter(m => m.role === 'user').length === 0;
      const newTitle = isFirstUserMessage 
        ? (userText.length > 32 ? userText.substring(0, 32) + '...' : userText) 
        : activeChat.title;

      setChats(prev => prev.map(c => {
        if (c.id === activeChatId) {
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
      }));
    } else {
      updatedSession = activeChat;
    }

    if (updatedSession) {
      saveChatToFirestore(updatedSession);
    }

    setIsLoading(true);

    try {
      // Filtrer ut feilmeldinger og tomme meldinger fra historikken som sendes til Gemini
      const cleanHistory = activeChat.messages
        .filter(m => m.agent !== 'FEIL' && !String(m.content).startsWith('Feil:') && !String(m.content).includes('Kapasitetsgrensen'))
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          content: m.content
        }));

      let aiResponseText = '';
      let agentTag = 'AUTO';

      if (activeMode === 'Sokratisk') {
        agentTag = 'SOKRATISK';
        aiResponseText = await askSocraticAgent(
          [
            ...cleanHistory,
            { role: 'user', content: userText }
          ],
          didacticProfile || { frameworkFocus: 'Sokratisk refleksjonsveiledning for barnehagelærer' }
        );
      } else if (activeMode === 'Rammeplan') {
        agentTag = 'RAG';
        aiResponseText = await askRagAgent(
          userText,
          cleanHistory
        );
      } else if (activeMode === 'APA') {
        agentTag = 'APA';
        aiResponseText = await askApaAgent(userText);
      } else if (activeMode === 'Språkvask') {
        agentTag = 'SPRAK';
        aiResponseText = await askLanguageAgent(userText);
      } else if (activeMode === 'Metode') {
        agentTag = 'METODE';
        aiResponseText = await generateAcademicResponse(
          userText,
          cleanHistory,
          'balanced',
          { frameworkFocus: 'Modus: Metode & Forskningsdesign. Gi didaktisk og vitenskapsteoretisk veiledning for barnehagelærerutdanningen: problemstilling, kvalitativ/kvantitativ metode, observasjon, intervju, dokumentanalyse, litteraturstudie, etikk (NESH/samtykke) og pålitelighet/gyldighet (reliabilitet/validitet).' }
        );
      } else {
        // AUTO Modus: Ruter intelligent og lokalt med superAgentRouter (0 ekstra API-nettverkskall!)
        const routeDecision = await superAgentRouter(userText);
        agentTag = routeDecision;

        if (agentTag === 'SOKRATISK') {
          aiResponseText = await askSocraticAgent(
            [...cleanHistory, { role: 'user', content: userText }],
            didacticProfile || {}
          );
        } else if (agentTag === 'RAG') {
          aiResponseText = await askRagAgent(userText, cleanHistory);
        } else if (agentTag === 'APA') {
          aiResponseText = await askApaAgent(userText);
        } else if (agentTag === 'SPRAK') {
          aiResponseText = await askLanguageAgent(userText);
        } else {
          aiResponseText = await generateAcademicResponse(
            userText,
            cleanHistory,
            'balanced',
            didacticProfile || { frameworkFocus: 'Rammeplan for barnehagen og barnehageloven.' }
          );
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

      setChats(prev => prev.map(c => {
        if (c.id === activeChatId) {
          const finalSession = {
            ...c,
            updatedAt: new Date().toISOString(),
            messages: [...c.messages, aiMsg]
          };
          saveChatToFirestore(finalSession);
          return finalSession;
        }
        return c;
      }));
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
      setChats(prev => prev.map(c => {
        if (c.id === activeChatId) {
          const withErr = {
            ...c,
            messages: [...c.messages, errorMsg]
          };
          saveChatToFirestore(withErr);
          return withErr;
        }
        return c;
      }));
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

  // Pin / Unpin
  const handlePinItem = (id: string, isPinned: boolean) => {
    setChats(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, isPinned };
        saveChatToFirestore(updated);
        return updated;
      }
      return c;
    }));
  };

  // Rename
  const handleRenameItem = (id: string, newTitle: string) => {
    setChats(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, title: newTitle };
        saveChatToFirestore(updated);
        return updated;
      }
      return c;
    }));
  };

  // Flytt samtale til mappe
  const handleMoveChat = (chatId: string, folderId: string | undefined) => {
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        const updated = { ...c, folderId: folderId || undefined, updatedAt: new Date().toISOString() };
        saveChatToFirestore(updated);
        return updated;
      }
      return c;
    }));
  };

  // Opprett ny mappe
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const newFolder: FolderType = {
      id: 'folder_' + Date.now(),
      name: newFolderName.trim(),
      isExpanded: true
    };

    setFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
    setIsCreatingFolder(false);

    await saveFolderToFirebase(newFolder);
  };

  // Slett mappe
  const handleDeleteFolder = async (folderId: string) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
    // Fristill samtaler fra mappen slik at de ligger i rotlisten
    setChats(prev => prev.map(c => {
      if (c.folderId === folderId) {
        const updated = { ...c, folderId: undefined, updatedAt: new Date().toISOString() };
        saveChatToFirestore(updated);
        return updated;
      }
      return c;
    }));

    if (user?.uid) {
      try {
        const db = getFirestore();
        await deleteDoc(doc(db, 'folders', folderId));
      } catch (err) {
        console.warn('Kunne ikke slette mappe fra Firestore:', err);
      }
    }
  };

  // Slett samtale (umiddelbar responsiv fjerning)
  const handleDeleteItem = (id: string) => {
    if (!id) return;

    // 1. Optimistisk umiddelbar fjerning fra UI
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
          saveChatToFirestore(freshSession);
          return [freshSession];
        }
      }
      return filtered;
    });

    // 2. Failsafe rens i localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((c: any) => c.id !== id);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        }
      }
    } catch (e) {
      console.warn('Feil ved sletting i localStorage:', e);
    }

    // 3. Slett fra Firestore i bakgrunnen
    if (user?.uid) {
      try {
        const db = getFirestore();
        deleteDoc(doc(db, 'users', user.uid, 'superveileder_chats', id)).catch(err => {
          console.warn('Kunne ikke slette chat fra Firestore:', err);
        });
      } catch (err) {
        console.warn('Firestore feil ved sletting:', err);
      }
    }
  };

  // Slett en enkeltmelding fra aktiv samtale
  const handleDeleteMessage = (msgId: string) => {
    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) {
        const updatedMessages = c.messages.filter(m => m.id !== msgId);
        const updatedSession = {
          ...c,
          messages: updatedMessages.length > 0 ? updatedMessages : [
            {
              id: 'welcome-' + c.id,
              role: 'assistant' as const,
              content: 'Hei! Hva vil du utforske eller få veiledning på i dag?',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              mode: c.activeMode || 'Auto',
              agent: (c.activeMode || 'Auto').toUpperCase()
            }
          ],
          updatedAt: new Date().toISOString()
        };
        saveChatToFirestore(updatedSession);
        return updatedSession;
      }
      return c;
    }));
  };

  // Tøm alle feilmeldinger fra aktiv samtale
  const handleClearErrorsInActiveChat = () => {
    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) {
        const updatedMessages = c.messages.filter(m => {
          if (m.role === 'assistant') {
            const text = m.content || '';
            const isErr = text.startsWith('Feil:') || text.includes('ikke tilgjengelig') || text.includes('Klarte ikke') || text.includes('Serverfeil') || m.agent === 'FEIL';
            return !isErr;
          }
          return true;
        });
        const updatedSession = {
          ...c,
          messages: updatedMessages.length > 0 ? updatedMessages : [
            {
              id: 'welcome-' + c.id,
              role: 'assistant' as const,
              content: 'Feilmeldinger er fjernet. Hva vil du utforske videre?',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              mode: c.activeMode || 'Auto',
              agent: (c.activeMode || 'Auto').toUpperCase()
            }
          ],
          updatedAt: new Date().toISOString()
        };
        saveChatToFirestore(updatedSession);
        return updatedSession;
      }
      return c;
    }));
  };

  const getAgentStyling = (agent?: string) => {
    switch (agent) {
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
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <Search className="w-3.5 h-3.5 text-emerald-600" />
        };
      default:
        return {
          label: 'Superveilederen',
          color: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <Sparkles className="w-3.5 h-3.5 text-slate-600" />
        };
    }
  };

  const modes = [
    { id: 'Auto', icon: <Sparkles className="w-4 h-4" />, desc: 'Intelligent didaktisk ruting' },
    { id: 'Sokratisk', icon: <Brain className="w-4 h-4 text-purple-500" />, desc: 'Stiller reflekterende spørsmål uten fasit' },
    { id: 'Rammeplan', icon: <BookOpen className="w-4 h-4 text-indigo-500" />, desc: 'Kobling til fagområder og lovverk' },
    { id: 'APA', icon: <Quote className="w-4 h-4 text-blue-500" />, desc: 'Korrekt kildereferanse og sitat etter APA 7' },
    { id: 'Metode', icon: <Search className="w-4 h-4 text-emerald-500" />, desc: 'Forskningsdesign, metode og etikk' }
  ];

  return (
    <WorkspaceLayout
      title="Superveilederen"
      subtitle="Sokratisk sparring, Rammeplan, APA & fagskriving"
      icon={<Sparkles className="w-6 h-6 text-indigo-600" />}
      actionButtonLabel="Ny samtale"
      historySectionTitle="Samtaler"
      onActionClick={handleNewChat}
      folders={folders}
      onAddFolder={() => setIsCreatingFolder(true)}
      onMoveToFolder={handleMoveChat}
      onDeleteFolder={handleDeleteFolder}
      historyItems={chats}
      activeItemId={activeChatId}
      onItemClick={setActiveChatId}
      onPinItem={handlePinItem}
      onRenameItem={handleRenameItem}
      onDeleteItem={handleDeleteItem}
    >
      {({ isCollapsed }) => (
        <div className="flex flex-col h-full bg-slate-50/50">
          
          {/* Top Bar Switcher: Direktekoblet med BLU-hjelperen */}
          <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Skriving</span>
              <span className="text-slate-600 text-xs">•</span>
              <span className="text-xs text-indigo-400 font-bold">Superveilederen</span>
            </div>

            {/* Hurtig-bytter mellom Superveilederen og BLU-hjelperen */}
            <div className="flex items-center p-0.5 bg-slate-800 rounded-xl border border-slate-700 shadow-2xs">
              <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>Superveilederen</span>
              </div>
              <button
                onClick={onSwitchToBlu}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700/70 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Bytt til BLU-hjelperen (Fagforfatter med oppgavelasting og Rammeplan-veiledning)"
              >
                <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                <span>BLU-hjelperen</span>
                <span className="text-[10px] bg-blue-900/60 text-blue-300 px-1.5 py-0.2 rounded-full border border-blue-700/60 hidden sm:inline">
                  Dokumentanalyse
                </span>
              </button>
            </div>
          </div>

          {/* Modus-velger i toppen */}
          <div className={`bg-white p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 z-10 shadow-xs transition-all duration-300 ${
            isCollapsed ? 'pl-16 sm:pl-36' : ''
          }`}>
            <div className="flex flex-wrap items-center gap-1.5">
              {modes.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleSetMode(m.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeMode === m.id 
                      ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900' 
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
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Start en helt ny veiledningssamtale"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Ny samtale</span>
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

          {/* Sokratisk Modus Banner */}
          {activeMode === 'Sokratisk' && (
            <div className="bg-purple-50/90 border-b border-purple-200/80 px-4 md:px-6 py-2.5 flex items-center justify-between text-xs text-purple-900 font-medium animate-in fade-in">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-600 shrink-0" />
                <span><strong>Sokratisk modus aktiv:</strong> Veilederen gir ingen fasitsvar, men stiller utforskende spørsmål for å trene din faglige refleksjon og didaktiske bevissthet.</span>
              </div>
              <button 
                onClick={() => handleSetMode('Auto')}
                className="text-purple-600 hover:text-purple-800 underline font-bold ml-2 shrink-0 cursor-pointer text-xs"
              >
                Nullstill til Auto
              </button>
            </div>
          )}

          {/* Rammeplan Modus Banner */}
          {activeMode === 'Rammeplan' && (
            <div className="bg-indigo-50/90 border-b border-indigo-200/80 px-4 md:px-6 py-2.5 flex items-center justify-between text-xs text-indigo-900 font-medium animate-in fade-in">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                <span><strong>Rammeplan & Lovverk aktiv:</strong> Svarene forankres direkte i Rammeplanen for barnehagen (2017) og barnehageloven.</span>
              </div>
              <button 
                onClick={() => handleSetMode('Auto')}
                className="text-indigo-600 hover:text-indigo-800 underline font-bold ml-2 shrink-0 cursor-pointer text-xs"
              >
                Nullstill til Auto
              </button>
            </div>
          )}

          {/* APA Modus Banner */}
          {activeMode === 'APA' && (
            <div className="bg-blue-50/90 border-b border-blue-200/80 px-4 md:px-6 py-2.5 flex items-center justify-between text-xs text-blue-900 font-medium animate-in fade-in">
              <div className="flex items-center gap-2">
                <Quote className="w-4 h-4 text-blue-600 shrink-0" />
                <span><strong>Auto-APA 7 aktiv:</strong> Send inn en kilde eller tekst for veiledning om referanseliste og kildehenvisning i løpende tekst.</span>
              </div>
              <button 
                onClick={() => handleSetMode('Auto')}
                className="text-blue-600 hover:text-blue-800 underline font-bold ml-2 shrink-0 cursor-pointer text-xs"
              >
                Nullstill til Auto
              </button>
            </div>
          )}

          {/* Chat-meldinger */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-slate-50"
          >
            <div className="max-w-3xl mx-auto w-full space-y-5">
              
              {/* AI Warning */}
              <AIWarning dismissible={true} />

              {/* Varsel og hurtig-opprydding dersom samtalen inneholder tidligere feilmeldinger */}
              {activeChat?.messages?.some(m => 
                m.role === 'assistant' && (
                  m.agent === 'FEIL' ||
                  m.content?.startsWith('Feil:') || 
                  m.content?.includes('ikke tilgjengelig') || 
                  m.content?.includes('Klarte ikke') ||
                  m.content?.includes('Serverfeil')
                )
              ) && (
                <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Denne samtalen inneholder feilmeldinger fra et tidligere forsøk.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearErrorsInActiveChat}
                      className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Tøm feilmeldinger
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(activeChat.id)}
                      className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Slett hele samtalen
                    </button>
                  </div>
                </div>
              )}

              {/* Velkomst og Hurtigforslag */}
              {(!activeChat?.messages || activeChat.messages.filter(m => m.role === 'user').length === 0) && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex flex-col items-start max-w-2xl mx-auto w-full">
                    <span className="text-[10px] font-bold text-slate-400 mb-1 ml-1 flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-indigo-500" /> Superveilederen
                    </span>
                    <div className="bg-white border border-slate-200 text-slate-700 p-4 rounded-2xl rounded-bl-sm shadow-xs text-sm leading-relaxed">
                      Hei! Jeg er <strong>Superveilederen</strong> for barnehagelærerutdanningen. Still meg et spørsmål, eller klikk på et av forslagene nedenfor for å komme i gang. Du kan også velge en spesifikk modus over.
                    </div>
                  </div>

                  {/* Modus-spesifikke hurtigspørsmål */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 max-w-2xl mx-auto w-full">
                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Anbefalte veiledningsspørsmål ({activeMode}):</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeMode === 'Sokratisk' && [
                        "Hvordan kan jeg ivareta barns medvirkning i en travel garderobesituasjon?",
                        "Et barn trekker seg unna i frileken. Hva bør jeg observere før jeg griper inn?",
                        "Hvordan skiller jeg mellom danning og oppdragelse i en konfliktsituasjon?",
                        "Hva betyr pedagogisk skjønn i praksis når Rammeplanen er åpen for tolkning?"
                      ].map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleSendMessage(prompt)}
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-950 rounded-xl text-xs transition-all text-left font-medium cursor-pointer"
                        >
                          {prompt}
                        </button>
                      ))}

                      {activeMode === 'Rammeplan' && [
                        "Hvordan forankrer jeg barns medvirkning i Rammeplanen for barnehagen?",
                        "Tolkning av fagområdet Antall, rom og form i min praksisfortelling",
                        "Hva kreves av det pedagogiske skjønnet ifølge Rammeplanen?",
                        "Foreldresamarbeid i overgangsfaser – pedagogiske og juridiske føringer"
                      ].map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleSendMessage(prompt)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-950 rounded-xl text-xs transition-all text-left font-medium cursor-pointer"
                        >
                          {prompt}
                        </button>
                      ))}

                      {activeMode === 'APA' && [
                        "Hvordan refererer jeg til Rammeplanen (2017) i løpende tekst og kildeliste?",
                        "Hvordan siterer jeg Barnehageloven etter APA 7?",
                        "Hvordan henvise til en lærebok med flere forfattere eller et antologikapittel?"
                      ].map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleSendMessage(prompt)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-950 rounded-xl text-xs transition-all text-left font-medium cursor-pointer"
                        >
                          {prompt}
                        </button>
                      ))}

                      {activeMode === 'Metode' && [
                        "Hjelp meg å formulere en presis og forskbar problemstilling for oppgaven",
                        "Hva er forskjellene mellom deltakende observasjon og feltnotater?",
                        "Hvilke forskningsetiske hensyn (NESH og samtykke) må jeg ta med barn?"
                      ].map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleSendMessage(prompt)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-950 rounded-xl text-xs transition-all text-left font-medium cursor-pointer"
                        >
                          {prompt}
                        </button>
                      ))}

                      {activeMode === 'Auto' && [
                        "Hvordan forankre barns medvirkning i Rammeplanen for barnehagen?",
                        "Hjelp meg å drøfte forskjellen på danning og oppdragelse i barnehagen",
                        "Hvordan refererer jeg til Rammeplanen etter APA 7?",
                        "Hva bør jeg tenke på når jeg observerer barns lek i et metodekapittel?"
                      ].map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleSendMessage(prompt)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs transition-all text-left font-medium cursor-pointer"
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
                const agentStyle = !isUser ? getAgentStyling(msg.agent || msg.mode) : null;
                const isPlaying = playingIndex === idx;

                return (
                  <div 
                    key={msg.id || idx}
                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-1 border border-indigo-200/80 shadow-2xs">
                        <Bot className="w-4 h-4" />
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
                              title="Prøv på nytt uten å duplisere meldingen"
                            >
                              <RotateCcw className="w-3 h-3 text-rose-600" />
                              <span>Prøv igjen</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Fjern denne feilmeldingen fra samtalen"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
                              <span>Slett melding</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className={`p-4 rounded-2xl text-sm leading-relaxed relative group ${
                            isUser
                              ? 'bg-blue-600 text-white rounded-br-xs shadow-sm shadow-blue-600/10'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-xs'
                          }`}
                        >
                          <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : 'prose-slate'}`}>
                            <ReactMarkdown>{typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2)}</ReactMarkdown>
                          </div>

                          {/* Handlingsknapper for assistentmeldinger */}
                          {!isUser && (
                            <div className="flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-slate-100">
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

                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Laster-indikator */}
              {isLoading && (
                <div className="flex gap-3 items-start animate-in fade-in">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl rounded-bl-xs shadow-xs flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>
                      {activeMode === 'Sokratisk' 
                        ? 'Utformer sokratiske refleksjonsspørsmål...' 
                        : activeMode === 'Rammeplan'
                        ? 'Slår opp i Rammeplanen og barnehageloven...'
                        : 'Analyserer og utformer didaktisk veiledningsrespons...'}
                    </span>
                  </div>
                </div>
              )}

              <div className="h-2" />
            </div>
          </div>

          {/* Input-felt */}
          <div className="p-4 bg-white border-t border-slate-200">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="max-w-3xl mx-auto flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  activeMode === 'Sokratisk'
                    ? 'Beskriv en situasjon fra barnehagen for sokratisk sparring...'
                    : activeMode === 'Metode' 
                    ? 'Spør om problemstilling, observasjon, intervju eller NESH-etikk...'
                    : activeMode === 'Rammeplan'
                    ? 'Spør om forankring i Rammeplanen for barnehagen...'
                    : activeMode === 'APA'
                    ? 'Lim inn kilde eller still spørsmål om APA 7-referanser...'
                    : `Spør om fag, rammeplan, APA eller tekst (${activeMode}-modus)...`
                }
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                disabled={isLoading}
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
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
                    Hold orden i veiledningssamtaler, drøftinger og faglige tråder.
                  </p>
                </div>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="F.eks. Praksis H24, Bachelor, Ledelse..." 
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') setIsCreatingFolder(false);
                  }}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="flex gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }} 
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Avbryt
                  </button>
                  <button 
                    type="button"
                    onClick={handleCreateFolder} 
                    disabled={!newFolderName.trim()}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 cursor-pointer"
                  >
                    Opprett mappe
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </WorkspaceLayout>
  );
}

export default Superveileder;
