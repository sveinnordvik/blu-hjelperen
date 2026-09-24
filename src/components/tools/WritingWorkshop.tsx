// Nye imports (hvis du trenger dem senere) pluss eksisterende
import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceLayout, HistoryItem } from '../WorkspaceLayout';
import { 
  FileText, Settings, Sparkles, Save, CheckCircle2, FileEdit, AlertCircle, Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote, Underline, Eye, Edit3, Check, RotateCcw, BookOpen, Copy, Download, ChevronRight, PanelRightClose, Send, Archive, User,
  Folder, FolderOpen, FolderPlus, Plus, Trash2, X, ArrowUp, ArrowDown // Nye ikoner for mapper og kapittelflytting
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeWithSystemPrompt, analyzeAssignmentText, chatWithSuperveileder } from '../../services/geminiService';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase'; 

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
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [outline, setOutline] = useState<{ id: number; title: string; subItems: string[] }[]>([]);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [activeSubItemInput, setActiveSubItemInput] = useState<{ chapterIdx: number; text: string } | null>(null);

  // State for sidepanel
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<'superveileder' | 'prosesslogg'>('superveileder');
  
  // State for Superveileder Chat
  const [chatMode, setChatMode] = useState('Auto');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hei! Jeg er Superveilederen. Står du fast med oppgaven din, eller ønsker du at vi drøfter teksten sammen?'
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatLoading]);

  // STEG 5: State for Prosesslogg-skjema
  const [logCategory, setLogCategory] = useState('Praksisfortelling');
  const [logSituation, setLogSituation] = useState('');
  const [logReflection, setLogReflection] = useState('');
  const [logSources, setLogSources] = useState('');
  const [logSaveNotice, setLogSaveNotice] = useState<string | null>(null);
  const [isSavingLog, setIsSavingLog] = useState(false);

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

  const handleUpdateActiveDoc = (fields: Partial<DocumentItem>) => {
    setDocuments(prev => {
      const updatedDocs = prev.map(d => {
        if (d.id === activeDocId) {
          const updatedDoc = { ...d, ...fields, updatedAt: new Date().toISOString() };
          
          // 1. Visuell tilbakemelding om at teksten er sikret lokalt i nettleseren
          setSaveStatus('Lagret lokalt');
          
          // 2. Avbryt forrige nedtelling hvis studenten fortsatt skriver
          if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
          }
          
          // 3. Start ny nedtelling: Lagre til skyen etter 10 sekunders inaktivitet
          saveTimerRef.current = setTimeout(async () => {
            setSaveStatus('Lagrer i skyen...');
            await saveDocToFirebase(updatedDoc);
            setSaveStatus('Lagret i skyen');
            
            // Fjern statusmeldingen etter 3 sekunder
            setTimeout(() => setSaveStatus(null), 3000);
          }, 10000); // Endre 10000 til 30000 hvis du vil ha 30 sekunder
          
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

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userText = chatInput.trim();
    setChatInput(''); 

    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: userText };
    const currentMessages = [...messages, newUserMsg];
    
    setMessages(currentMessages);
    setIsChatLoading(true);

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
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error: any) {
      console.error("Feil ved kommunikasjon med Gemini:", error);
      const errMsg = error?.message || (typeof error === 'string' ? error : '');
      const displayMsg = errMsg 
        ? errMsg 
        : "Kunne ikke hente svar fra veilederen akkurat nå. Vennligst prøv å sende meldingen på nytt om et øyeblikk.";
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: displayMsg
      }]);
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const applyFormatting = (type: string) => {
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
      case 'list': replacement = `\n- ${selectedText || 'Punkt 1'}\n- Punkt 2\n`; newStart = start + replacement.length; newEnd = newStart; break;
      case 'orderedList': replacement = `\n1. ${selectedText || 'Første punkt'}\n2. Andre punkt\n`; newStart = start + replacement.length; newEnd = newStart; break;
      case 'quote': replacement = `\n> ${selectedText || 'Sitat'}\n`; newStart = start + replacement.length; newEnd = newStart; break;
      default: return;
    }

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    handleUpdateActiveDoc({ content: newContent });
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(newStart, newEnd); }, 10);
  };

  const handleSaveProcessLog = async () => {
    // Sjekk at de viktigste feltene er fylt ut
    if (!logSituation.trim() || !logReflection.trim()) {
      alert("Vennligst fyll ut situasjonsbeskrivelse og didaktisk refleksjon før du lagrer.");
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

      // Lagrer til en kolleksjon kalt "processLogs" i Firestore
      await addDoc(collection(db, 'processLogs'), {
        userId: user.uid,
        documentId: activeDocId,
        documentTitle: activeDoc.title,
        category: logCategory,
        situation: logSituation,
        reflection: logReflection,
        sources: logSources,
        createdAt: serverTimestamp(),
      });

      // Tømmer skjemaet etter vellykket lagring
      setLogSituation('');
      setLogReflection('');
      setLogSources('');
      setLogSaveNotice(`Prosesslogg for «${activeDoc.title}» er lagret i skyen!`);
      setTimeout(() => setLogSaveNotice(null), 3500);
    } catch (error) {
      console.error("Feil ved lagring av prosesslogg:", error);
      alert("Kunne ikke lagre loggen til skyen. Prøv igjen senere.");
    } finally {
      setIsSavingLog(false);
    }
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
      historyItems={documents}
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
          <div className="pr-6 pl-32 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/50 rounded-xl">
              <button onClick={() => setViewMode('editor')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === 'editor' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><FileEdit className="w-3.5 h-3.5 inline mr-1.5" />Skriveflate</button>
              <button onClick={() => setViewMode('setup')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === 'setup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><Settings className="w-3.5 h-3.5 inline mr-1.5" />Oppgaveoppsett</button>
              <button onClick={() => { setViewMode('quality-check'); if (!analysisResult) handleRunAnalysis(); }} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === 'quality-check' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><Sparkles className="w-3.5 h-3.5 inline mr-1.5 text-amber-500" />Kvalitetssjekk</button>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              {saveStatus && <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" />{saveStatus}</span>}
              <div className="flex items-center gap-2">
                <span>{wordCount} / {activeDoc.targetWords || 1500} ord ({wordProgress}%)</span>
                <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${wordProgress}%` }} /></div>
              </div>

              <div className="w-px h-6 bg-slate-200 mx-1" />
              
              <button 
                onClick={() => {
                  setIsPanelOpen(!isPanelOpen);
                  if (!isPanelOpen && activePanelTab !== 'superveileder') setActivePanelTab('superveileder');
                }} 
                className={`px-3 py-1.5 font-semibold rounded-lg transition-all shadow-sm flex items-center gap-2 ${
                  isPanelOpen 
                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isPanelOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isPanelOpen ? 'Skjul panel' : 'Vis Superveileder'}
              </button>
            </div>
          </div>

          {/* View Mode: Editor */}
          {viewMode === 'editor' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-6 py-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-white">
                <div className="flex items-center gap-1 text-slate-600">
                  <button onClick={() => applyFormatting('bold')} title="Fet (Ctrl+B)" className="p-1.5 hover:bg-slate-100 rounded-lg"><Bold className="w-4 h-4" /></button>
                  <button onClick={() => applyFormatting('italic')} title="Kursiv (Ctrl+I)" className="p-1.5 hover:bg-slate-100 rounded-lg"><Italic className="w-4 h-4" /></button>
                  <button onClick={() => applyFormatting('underline')} title="Understreket" className="p-1.5 hover:bg-slate-100 rounded-lg"><Underline className="w-4 h-4" /></button>
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                  <button onClick={() => applyFormatting('h1')} title="Overskrift 1" className="p-1.5 hover:bg-slate-100 rounded-lg"><Heading1 className="w-4 h-4" /></button>
                  <button onClick={() => applyFormatting('h2')} title="Overskrift 2" className="p-1.5 hover:bg-slate-100 rounded-lg"><Heading2 className="w-4 h-4" /></button>
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                  <button onClick={() => applyFormatting('list')} title="Punktliste" className="p-1.5 hover:bg-slate-100 rounded-lg"><List className="w-4 h-4" /></button>
                  <button onClick={() => applyFormatting('orderedList')} title="Nummerert liste" className="p-1.5 hover:bg-slate-100 rounded-lg"><ListOrdered className="w-4 h-4" /></button>
                  <button onClick={() => applyFormatting('quote')} title="Sitatblokk" className="p-1.5 hover:bg-slate-100 rounded-lg"><Quote className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                  <button onClick={() => setEditorTab('write')} className={`px-2.5 py-1 rounded-md transition-all ${editorTab === 'write' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}><Edit3 className="w-3 h-3 inline mr-1" /> Skriv</button>
                  <button onClick={() => setEditorTab('preview')} className={`px-2.5 py-1 rounded-md transition-all ${editorTab === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}><Eye className="w-3 h-3 inline mr-1" /> Forhåndsvis</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                <div className="max-w-3xl mx-auto space-y-4">
                  <input type="text" value={activeDoc.title} onChange={(e) => handleUpdateActiveDoc({ title: e.target.value })} placeholder="Oppgavetittel..." className="w-full text-2xl font-bold text-slate-900 border-none bg-transparent focus:outline-none placeholder:text-slate-300" />
                  {editorTab === 'write' ? (
                    <textarea ref={textareaRef} value={typeof activeDoc.content === 'string' ? activeDoc.content : ''} onChange={(e) => handleUpdateActiveDoc({ content: e.target.value })} placeholder="Begynn å skrive oppgaven din her..." className="w-full bg-transparent resize-none border-none focus:outline-none text-slate-800 text-base leading-relaxed placeholder:text-slate-300 min-h-[500px]" />
                  ) : (
                    <div className="prose prose-slate max-w-none min-h-[500px] text-slate-800 leading-relaxed py-2"><ReactMarkdown>{typeof activeDoc.content === 'string' ? (activeDoc.content || '*Ingen tekst skrevet enda.*') : '*Ingen tekst skrevet enda.*'}</ReactMarkdown></div>
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
                  </div>

                  {activeDoc.template === 'Egendefinert struktur' ? (
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
              </div>
            </div>
          )}

          {/* View Mode: Quality Check */}
          {viewMode === 'quality-check' && (
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <div><h3 className="text-lg font-bold text-slate-900 mb-1">Akademisk kvalitetssjekk</h3><p className="text-sm text-slate-500">Automatisk analyse basert på barnehagefaglige vurderingskriterier.</p></div>
                  <button onClick={handleRunAnalysis} disabled={isAnalyzing} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2"><Sparkles className="w-4 h-4" /> {isAnalyzing ? 'Analyserer tekst...' : 'Kjør ny analyse'}</button>
                </div>
                {isAnalyzing && <div className="p-12 text-center space-y-4 bg-slate-50 rounded-2xl border border-slate-200"><div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-sm font-medium text-slate-600">Leser gjennom oppgaven, sjekker rød tråd og teoretisk forankring...</p></div>}
                {!isAnalyzing && analysisResult && <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4"><div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider"><CheckCircle2 className="w-4 h-4" /> Analyse fullført</div><div className="prose prose-slate max-w-none text-sm leading-relaxed"><ReactMarkdown>{typeof analysisResult === 'string' ? analysisResult : JSON.stringify(analysisResult, null, 2)}</ReactMarkdown></div></div>}
                {!isAnalyzing && !analysisResult && <div className="p-12 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200"><AlertCircle className="w-8 h-8 text-slate-400 mx-auto" /><p className="text-sm text-slate-600">Ingen analyse utført for dette utkastet ennå.</p><button onClick={handleRunAnalysis} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Start analyse nå</button></div>}
              </div>
            </div>
          )}
        </div>

        {/* HØYRE SIDEPANEL */}
        {isPanelOpen && (
          <aside className="w-[420px] bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col flex-shrink-0 overflow-hidden animate-in slide-in-from-right-8 duration-300">
            {/* Interne faner */}
            <div className="flex border-b border-slate-100 bg-slate-50/50">
              <button 
                onClick={() => setActivePanelTab('superveileder')}
                className={`flex-1 py-3 px-4 text-sm font-semibold text-center border-b-2 transition-colors ${
                  activePanelTab === 'superveileder' 
                    ? 'text-indigo-600 border-indigo-600 bg-white' 
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                Superveilederen
              </button>
              <button 
                onClick={() => setActivePanelTab('prosesslogg')}
                className={`flex-1 py-3 px-4 text-sm font-semibold text-center border-b-2 transition-colors ${
                  activePanelTab === 'prosesslogg' 
                    ? 'text-indigo-600 border-indigo-600 bg-white' 
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                Prosesslogg
              </button>
            </div>
            
            <div className="flex-1 flex flex-col bg-slate-50/30 overflow-hidden">
              {activePanelTab === 'superveileder' ? (
                // SUPERVEILEDER CHAT UI
                <div className="flex flex-col h-full">
                  <div className="px-2.5 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-center gap-1.5">
                    {['Auto', 'Sokratisk', 'Rammeplan', 'APA', 'Metode'].map(mode => (
                      <button 
                        key={mode} 
                        onClick={() => setChatMode(mode)} 
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors whitespace-nowrap ${
                          chatMode === mode 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
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
                    ))}

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
                  <div className="p-3 border-t border-slate-200 bg-white">
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
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim() || isChatLoading}
                        className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

              ) : (
                // STEG 5: PROSESSLOGG SKJEMA UI
                <div className="flex flex-col h-full overflow-y-auto p-5 space-y-6">
                  {logSaveNotice && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{logSaveNotice}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Kategori</label>
                    <select 
                      value={logCategory}
                      onChange={(e) => setLogCategory(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    >
                      <option value="Praksisfortelling">Praksisfortelling</option>
                      <option value="Didaktisk refleksjon">Didaktisk refleksjon</option>
                      <option value="Observasjon">Observasjon</option>
                      <option value="Teorikobling">Teorikobling</option>
                      <option value="Etisk dilemma">Etisk dilemma</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Situasjonsbeskrivelse / Hva skjedde?</label>
                    </div>
                    <textarea 
                      value={logSituation}
                      onChange={(e) => setLogSituation(e.target.value)}
                      className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm resize-none"
                      placeholder="Beskriv en konkret hendelse fra barnehagen, hva barna sa/gjorde, og din egen rolle..."
                      rows={5}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Didaktisk refleksjon / Hva lærte jeg?</label>
                      <button className="text-[10px] flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-md">
                        <Sparkles className="w-3 h-3" /> Foreslå teorikobling med AI
                      </button>
                    </div>
                    <textarea 
                      value={logReflection}
                      onChange={(e) => setLogReflection(e.target.value)}
                      className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm resize-none"
                      placeholder="Reflekter over hvorfor situasjonen utviklet seg slik, og hvordan din pedagogiske væremåte påvirket utfallet..."
                      rows={5}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Faglige kilder & Rammeplan-forankring</label>
                    <textarea 
                      value={logSources}
                      onChange={(e) => setLogSources(e.target.value)}
                      className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm resize-none"
                      placeholder="F.eks. Bae (2012), Rammeplanen kap. 3..."
                      rows={2}
                    />
                  </div>

                  <button 
                    onClick={handleSaveProcessLog}
                    disabled={isSavingLog}
                    className="w-full py-3.5 mt-2 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-70 transition-colors shadow-md flex justify-center items-center gap-2"
                  >
                    {isSavingLog ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                    {isSavingLog ? 'Lagrer i skyen...' : 'Lagre logg i arkivet'}
                  </button>

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
    </WorkspaceLayout>
  );
}

export default WritingWorkshop;
