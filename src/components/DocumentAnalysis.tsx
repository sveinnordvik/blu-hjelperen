import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceLayout, HistoryItem, FolderType } from './WorkspaceLayout';
import { 
  FileSearch, 
  UploadCloud, 
  GraduationCap, 
  AlertCircle, 
  FileOutput, 
  Search, 
  Loader2, 
  Copy, 
  Check, 
  FileText,
  Sparkles,
  RefreshCw,
  Trash2,
  Coins,
  ShieldCheck,
  X,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  FolderPlus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { extractTextFromPdf } from '../lib/pdfUtils';
import { extractTextFromDocx } from '../lib/docxUtils';
import { generateAcademicResponse, askLanguageAgent } from '../services/geminiService';
import { db } from '../firebase';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { isUnlimitedUser, STRIPE_HUMANIZER_CREDITS_1_URL, STRIPE_HUMANIZER_CREDITS_10_URL } from '../config/accessConfig';

export type AnalysisToolType = 'sensor' | 'summary' | 'humanizer';

export interface FolderItem {
  id: string;
  name: string;
  isExpanded?: boolean;
  createdAt?: string;
}

const FOLDERS_STORAGE_KEY = 'blu_doc_analysis_folders_v1';
const DOCUMENTS_STORAGE_KEY = 'blu_doc_analysis_documents_v1';

const INITIAL_FOLDERS: FolderItem[] = [
  { id: 'f_pensum', name: 'Pensum & Teori', isExpanded: true, createdAt: new Date().toISOString() },
  { id: 'f_praksis', name: 'Praksisfortellinger', isExpanded: true, createdAt: new Date().toISOString() },
  { id: 'f_eksamen', name: 'Eksamen & Sensur', isExpanded: false, createdAt: new Date().toISOString() }
];

const INITIAL_DOCUMENTS: AnalyzedDocument[] = [
  { 
    id: '1', 
    title: 'Barnehagens rom.pdf', 
    subtitle: 'Oppsummert • 5. sept 2026',
    type: 'summary',
    folderId: 'f_pensum',
    content: 'Utdrag fra faglitteratur om barnehagens fysiske miljø og rommets betydning som den tredje pedagog.',
    result: '### Sammendrag av Barnehagens rom\n\n**Hovedtemaer:**\n- Det fysiske miljøets innvirkning på barns lek og medvirkning.\n- Rommet som «den tredje pedagog» (Reggio Emilia-inspirert).\n- Fleksibilitet i soner for ro, grovmotorisk lek og estetiske prosesser.\n\n**Relevante teoretiske perspektiver:**\n- Loris Malaguzzi om rommets pedagogiske kraft.\n- Rammeplanens føringer om inkluderende lekemiljø.',
    createdAt: '5. sept 2026'
  },
  { 
    id: '2', 
    title: 'Utkast Praksisfortelling', 
    subtitle: 'Fiktiv sensur • 2. sept 2026',
    type: 'sensor',
    folderId: 'f_praksis',
    content: 'Praksisfortelling fra småbarnsavdelingen om toåringen som utforsker vanndammer i høstregnet.',
    result: '### Sensorvurdering og faglig tilbakemelding\n\n**Helhetsinntrykk:**\nTeksten viser godt blikk for barns sansemotoriske utforskning i uterommet. God observasjonsevne.\n\n**Styrker:**\n- Nær og levende skildring av situasjonen.\n- Viser respekt for barnets tempo.\n\n**Forbedringsområder for eksamen/bachelor:**\n- Knytt observasjonen tettere til Rammeplanens kapittel om «Natur, miljø og teknologi».\n- Drøft personalets rolle: Var den voksne støttende stillas eller passiv tilskuer? Bruk gjerne Vygotskijs teori om den proksimale utviklingssonen.',
    createdAt: '2. sept 2026'
  },
  { 
    id: '3', 
    title: 'Drøftingsavsnitt Medvirkning', 
    subtitle: 'Humanizer-bot • 4. sept 2026',
    type: 'humanizer',
    folderId: 'f_eksamen',
    content: 'I barnehagen er det viktig med barns medvirkning fordi Rammeplanen sier at barna skal få være med å bestemme hva de vil gjøre i barnehagehverdagen.',
    result: '### Humanizer-bot: Bearbeidet fagtekst\n\n> I et barnehagepedagogisk perspektiv er barns medvirkning et bærende didaktisk prinsipp, forankret i Rammeplanens føringer om barns rett til å uttrykke synspunkter og øve reell innflytelse på sin barnehagehverdag.\n\n---\n\n**Dette endret jeg:**\n- **Presisjon:** Erstattet uformell formulering («viktig med») med et faglig presist begrepsapparat («et bærende didaktisk prinsipp»). \n- **Akademisk forankring:** Løftet setningsstrukturen mot Rammeplanens intensjon og vitenskapelige standard.\n- **Stemmebevaring:** Bevarte studentens kjernebudskap om barns innflytelse uten å innføre kunstige fyllord.',
    createdAt: '4. sept 2026'
  }
];

interface AnalyzedDocument extends HistoryItem {
  id: string;
  title: string;
  subtitle: string;
  type: AnalysisToolType;
  content: string;
  result?: string;
  createdAt: string;
}

export function DocumentAnalysis({ 
  pricingTier = 'free', 
  userEmail,
  onUpgrade,
  initialTool = 'sensor',
  onBackToTools,
  humanizerCredits: externalCredits,
  onDeductCredit,
  onAddCredits
}: { 
  pricingTier?: string; 
  userEmail?: string;
  onUpgrade?: () => void; 
  initialTool?: AnalysisToolType;
  onBackToTools?: () => void;
  humanizerCredits?: number;
  onDeductCredit?: () => Promise<void> | void;
  onAddCredits?: (count: number) => Promise<void> | void;
}) {
  const currentUserEmail = userEmail || getAuth().currentUser?.email || '';
  const isUnlimited = isUnlimitedUser(currentUserEmail);
  const isSemester = isUnlimited || pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview';
  
  const [documents, setDocuments] = useState<AnalyzedDocument[]>(() => {
    try {
      const saved = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse documents from localStorage', e);
    }
    return INITIAL_DOCUMENTS;
  });

  const [folders, setFolders] = useState<FolderItem[]>(() => {
    try {
      const saved = localStorage.getItem(FOLDERS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse folders from localStorage', e);
    }
    return INITIAL_FOLDERS;
  });

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [activeDocId, setActiveDocId] = useState<string>('');
  const [activeTool, setActiveTool] = useState<AnalysisToolType>(initialTool);
  const [inputText, setInputText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysisResult, setCurrentAnalysisResult] = useState<string | null>(null);
  const [copiedResult, setCopiedResult] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Humanizer-kreditter (pay-per-use via Stripe: 10,- kr/vask)
  const [localCredits, setLocalCredits] = useState<number>(() => {
    const saved = localStorage.getItem('blu_humanizer_credits');
    return saved !== null ? parseInt(saved, 10) : 1;
  });
  const humanizerCredits = externalCredits !== undefined ? externalCredits : localCredits;
  const [showHumanizerModal, setShowHumanizerModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialTool) {
      setActiveTool(initialTool);
    }
  }, [initialTool]);

  const handleBuyCredits = (count: number) => {
    if (onAddCredits) {
      onAddCredits(count);
    } else {
      const updated = humanizerCredits + count;
      setLocalCredits(updated);
      localStorage.setItem('blu_humanizer_credits', updated.toString());
    }
  };

  const handleNewAnalysis = () => {
    setActiveDocId('');
    setInputText('');
    setUploadedFileName(null);
    setCurrentAnalysisResult(null);
    setErrorMessage(null);
  };

  const handleSelectDoc = (id: string) => {
    setActiveDocId(id);
    const doc = documents.find(d => d.id === id);
    if (doc) {
      setActiveTool(doc.type);
      setInputText(doc.content || '');
      setCurrentAnalysisResult(doc.result || null);
      setUploadedFileName(doc.title);
      setErrorMessage(null);
    }
  };

  const handleDeleteItem = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (activeDocId === id) {
      handleNewAnalysis();
    }
  };

  const handleRenameItem = (id: string, newTitle: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, title: newTitle } : d));
  };

  useEffect(() => {
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error('Failed to save folders to localStorage', e);
    }
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(documents));
    } catch (e) {
      console.error('Failed to save documents to localStorage', e);
    }
  }, [documents]);

  // Henter felles mapper fra Firestore ved innlasting hvis logget inn
  useEffect(() => {
    const fetchFolders = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      try {
        const folderQ = query(collection(db, 'folders'), where('userId', '==', user.uid));
        const folderSnapshot = await getDocs(folderQ);
        if (!folderSnapshot.empty) {
          const fetchedFolders = folderSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as FolderItem));
          setFolders(fetchedFolders);
        }
      } catch (error) {
        console.error("Feil ved henting av mapper fra skyen:", error);
      }
    };

    fetchFolders();
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchFolders();
    });
    return () => unsubscribe();
  }, []);

  const saveFolderToFirebase = async (folder: FolderItem) => {
    try {
      const user = getAuth().currentUser;
      if (!user) return;
      const folderRef = doc(db, 'folders', folder.id);
      await setDoc(folderRef, { ...folder, userId: user.uid }, { merge: true });
    } catch (error) {
      console.error("Feil ved lagring av mappe til Firebase:", error);
    }
  };

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

    await saveFolderToFirebase(newFolder);
  };

  const handleMoveDoc = (documentId: string, folderId: string | undefined) => {
    setDocuments(prev => prev.map(item => {
      if (item.id === documentId) {
        return { ...item, folderId };
      }
      return item;
    }));
  };

  // Håndter filopplasting (både klikk og drag & drop)
  const processFile = async (file: File) => {
    setIsProcessingFile(true);
    setErrorMessage(null);
    try {
      let extracted = '';
      const name = file.name.toLowerCase();

      if (name.endsWith('.pdf')) {
        extracted = await extractTextFromPdf(file);
      } else if (name.endsWith('.docx')) {
        extracted = await extractTextFromDocx(file);
      } else {
        extracted = await file.text();
      }

      if (!extracted.trim()) {
        throw new Error('Kunne ikke hente ut tekst fra filen. Prøv å lime inn teksten manuelt.');
      }

      setInputText(extracted);
      setUploadedFileName(file.name);
      setCurrentAnalysisResult(null);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMessage(err.message || 'Feil under lesing av dokumentet.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRunAnalysis = async () => {
    if (!inputText.trim()) {
      setErrorMessage('Vennligst last opp et dokument eller lim inn tekst først.');
      return;
    }

    // Spesifikk sjekk for Humanizer-boten (Pay-per-use)
    if (activeTool === 'humanizer') {
      if (!isUnlimited) {
        if (humanizerCredits <= 0) {
          setShowHumanizerModal(true);
          return;
        }
        // Trekk 1 kreditt kun for vanlige brukere
        if (onDeductCredit) {
          await onDeductCredit();
        } else {
          const updatedCredits = Math.max(0, humanizerCredits - 1);
          setLocalCredits(updatedCredits);
          localStorage.setItem('blu_humanizer_credits', updatedCredits.toString());
        }
      }
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    const docTitle = uploadedFileName || (inputText.slice(0, 32).trim() + '...');
    const today = new Date().toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' });

    try {
      let response = '';

      if (activeTool === 'humanizer') {
        // Kjør etisk språkvask via askLanguageAgent
        response = await askLanguageAgent(
          inputText.slice(0, 10000), 
          'Humanizer-bot - Etisk akademisk språkvask for barnehagelærerutdanningen'
        );
      } else if (activeTool === 'sensor') {
        let prompt = '';
        if (isSemester) {
          prompt = `Du er en erfaren sensor og fagveileder i barnehagelærerutdanningen (BLU). Studenten har Semester-pakka med full tilgang til den dype pedagogiske sensormodulen.
Gjennomfør en grundig, formativ sensor-vurdering i full dybde med kildevalidering opp mot APA 7 og Rammeplanen for barnehagen.

Strukturer tilbakemeldingen grundig med:
1. Helhetsvurdering og estimert karakternivå (A-F med utførlig akademisk begrunnelse)
2. Faglig dybde og teoretisk forankring (drøfting opp mot Rammeplanens føringer, progresjonskrav og barnehagepedagogisk teori)
3. Kildevalidering og referansekvalitet (gjennomgang av kildebruk iht. APA 7, relevans og kildekritikk)
4. Kritiske forbedringspunkter (problemstilling, rød tråd, drøftingskvalitet og etiske hensyn)
5. Konkrete råd for videre bearbeiding før innlevering

Tekst til sensur:
"""
${inputText.slice(0, 15000)}
"""`;
        } else {
          prompt = `Du er en sensor i barnehagelærerutdanningen (BLU). Studenten har standard sensortilgang (strukturanalyse).
Gjennomfør en kortfattet strukturanalyse av følgende studentutkast.

Strukturer tilbakemeldingen med:
1. Struktur og oppbygning (overskrifter, avsnittsinndeling og flyt)
2. Formelle observasjoner (tekstens lengde, rød tråd og leservennlighet)
3. Forbedring av struktur (hvor det trengs bedre overganger eller tydeligere delkapitler)
4. Påminnelse om oppgradering: Gjør studenten kort og høflig oppmerksom på at full pedagogisk dybdeanalyse mot BLU-kriterier, Rammeplanens progresjon, grundig APA 7-kildevalidering og estimert karakternivå krever Semester-pakka.

Tekst til sensur:
"""
${inputText.slice(0, 6000)}
"""`;
        }

        response = await generateAcademicResponse(
          prompt,
          [],
          'balanced',
          { frameworkFocus: 'Format: Sensorverktøy og vurdering for BLU' }
        );
      } else {
        // Summary & Dypanalyse
        const prompt = `Du er en akademisk lese- og forskningspartner for barnehagelærerstudenter. Gjennomfør en dypanalyse og oppsummering av følgende fagtekst.
Strukturer analysen med:
1. Kort sammendrag (hovedbudskap på 3-4 setninger)
2. Sentrale begreper og teoretiske nøkkelpunkter
3. Relevans for barnehagepedagogisk praksis og Rammeplanen
4. Relevante problemstillinger eller drøftingsspørsmål teksten åpner for

Tekst:
"""
${inputText.slice(0, 8000)}
"""`;

        response = await generateAcademicResponse(
          prompt,
          [],
          'balanced',
          { frameworkFocus: 'Format: Fagtekstanalyse og oppsummering for BLU' }
        );
      }

      setCurrentAnalysisResult(response);

      const newId = String(Date.now());
      const subtitleText = activeTool === 'sensor' 
        ? `Fiktiv sensur • ${today}` 
        : activeTool === 'humanizer' 
        ? `Humanizer-bot • ${today}` 
        : `Oppsummert • ${today}`;

      const newDoc: AnalyzedDocument = {
        id: newId,
        title: docTitle,
        subtitle: subtitleText,
        type: activeTool,
        content: inputText,
        result: response,
        createdAt: today
      };

      setDocuments(prev => [newDoc, ...prev]);
      setActiveDocId(newId);
    } catch (err: any) {
      console.error('Analysis error:', err);
      // Tilbakefør kreditt ved feil i Humanizer
      if (activeTool === 'humanizer' && !isUnlimited) {
        if (onAddCredits) {
          onAddCredits(1);
        } else {
          const refunded = humanizerCredits + 1;
          setLocalCredits(refunded);
          localStorage.setItem('blu_humanizer_credits', refunded.toString());
        }
      }
      setErrorMessage(err.message || 'Kunne ikke gjennomføre analysen. Prøv igjen.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (!currentAnalysisResult) return;
    navigator.clipboard.writeText(currentAnalysisResult);
    setCopiedResult(true);
    setTimeout(() => setCopiedResult(false), 2000);
  };

  const activeDoc = documents.find(d => d.id === activeDocId);

  // Formater historikk med passende ikoner
  const formattedHistory = documents.map(d => ({
    ...d,
    icon: d.type === 'humanizer' ? (
      <Coins className="w-4 h-4 text-amber-500" />
    ) : d.type === 'sensor' ? (
      <GraduationCap className="w-4 h-4 text-indigo-500" />
    ) : (
      <Search className="w-4 h-4 text-emerald-500" />
    )
  }));

  return (
    <WorkspaceLayout
      title="Dokumentanalyse"
      subtitle="Sensorverktøy, Dypanalyse og Humanizer-boten"
      icon={<FileSearch className="w-6 h-6 text-indigo-600" />}
      actionButtonLabel="Ny analyse"
      onActionClick={handleNewAnalysis}
      onBackToTools={onBackToTools}
      historyItems={formattedHistory}
      folders={folders}
      onAddFolder={() => setIsCreatingFolder(true)}
      onMoveToFolder={handleMoveDoc}
      activeItemId={activeDocId}
      onItemClick={handleSelectDoc}
      onDeleteItem={handleDeleteItem}
      onRenameItem={handleRenameItem}
    >
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* VERKTØY-KORT / UNDERFANER (Sensorverktøy, Dypanalyse & Humanizer-boten) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* KORT 1: SENSORVERKTØY */}
            <button
              id="subtab-sensor"
              type="button"
              onClick={() => setActiveTool('sensor')}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                activeTool === 'sensor'
                  ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-white/80 hover:bg-white border-slate-200 hover:border-indigo-200 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className={`p-2 rounded-xl ${activeTool === 'sensor' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                  <GraduationCap className="w-5 h-5" />
                </div>
                {isSemester ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-2xs">
                    Semester (Dypanalyse)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Standard (Struktur)
                  </span>
                )}
              </div>
              <div>
                <h3 className={`font-bold text-sm ${activeTool === 'sensor' ? 'text-indigo-950 font-black' : 'text-slate-800'}`}>
                  Sensorverktøy
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  Formativ sensur, karakternivå og pedagogisk tilbakemelding.
                </p>
              </div>
            </button>

            {/* KORT 2: DYPANALYSE */}
            <button
              id="subtab-summary"
              type="button"
              onClick={() => setActiveTool('summary')}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                activeTool === 'summary'
                  ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
                  : 'bg-white/80 hover:bg-white border-slate-200 hover:border-emerald-200 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className={`p-2 rounded-xl ${activeTool === 'summary' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                  <Search className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Pensum & fagtekst
                </span>
              </div>
              <div>
                <h3 className={`font-bold text-sm ${activeTool === 'summary' ? 'text-emerald-950 font-black' : 'text-slate-800'}`}>
                  Dypanalyse & Oppsummering
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  Teoretisk dekonstruksjon, nøkkelbegreper og Rammeplan-forankring.
                </p>
              </div>
            </button>

            {/* KORT 3: HUMANIZER-BOTEN (Visuelt differensiert: Amber & gull med advarsel/mynt) */}
            <button
              id="subtab-humanizer"
              type="button"
              onClick={() => setActiveTool('humanizer')}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                activeTool === 'humanizer'
                  ? 'bg-gradient-to-br from-amber-50 to-orange-50/70 border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                  : 'bg-amber-50/40 hover:bg-amber-50/80 border-amber-300/80 hover:border-amber-400 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shadow-xs">
                  <Coins className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
                    isUnlimited 
                      ? 'bg-emerald-400 text-slate-950 border-emerald-500' 
                      : 'bg-amber-400 text-slate-950 border-amber-500'
                  }`}>
                    {isUnlimited ? 'VIP: Ubegrenset' : 'Pay-per-use: 10,- kr (Stripe)'}
                  </span>
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-200/70 px-1.5 py-0.5 rounded-md">
                    {isUnlimited ? 'Ubegrenset vask' : humanizerCredits > 0 ? `${humanizerCredits} vask tilgjengelig` : '0 vask (fyll på)'}
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-sm text-slate-950">
                    Humanizer-boten
                  </h3>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded">
                    Etisk vask
                  </span>
                </div>
                <p className="text-xs text-amber-900/90 mt-0.5 line-clamp-2">
                  Fjern syntetisk KI-preg og styrk din personlige akademiske stemme.
                </p>
              </div>
            </button>

          </div>

          {/* HUMANIZER-SPESIFIKK INFO & SALDO-BANNER */}
          {activeTool === 'humanizer' && (
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60 border border-amber-300 rounded-2xl shadow-xs space-y-3 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shrink-0 mt-0.5 shadow-2xs">
                    <Coins className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <span>Humanizer-boten (Etisk språkvask)</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isUnlimited ? 'bg-emerald-200 text-emerald-950 border border-emerald-300' : 'bg-amber-200 text-amber-950'
                      }`}>
                        {isUnlimited ? 'Ubegrenset VIP-tilgang' : '10,- kr per vask via Stripe'}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed max-w-2xl">
                      Vasker teksten din for syntetiske formuleringer og robotaktige vendinger. Bevarer din personlige pedagogiske stemme og gjør språket faglig presist.
                    </p>
                  </div>
                </div>

                {/* Saldo og påfyllingsknapp */}
                <div className="flex items-center gap-2.5 sm:self-center shrink-0 bg-white/90 p-2 rounded-xl border border-amber-200 shadow-2xs">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Status / Saldo</div>
                    <div className="text-xs font-black text-amber-950">
                      {isUnlimited ? (
                        <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 fill-current text-emerald-500" />
                          Ubegrenset vask
                        </span>
                      ) : (
                        `${humanizerCredits} ${humanizerCredits === 1 ? 'vask' : 'vask'}`
                      )}
                    </div>
                  </div>
                  {!isUnlimited && (
                    <button
                      type="button"
                      onClick={() => setShowHumanizerModal(true)}
                      className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>Kjøp / Fyll på</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Etisk barriere / Begrunnelse */}
              <div className="pt-2 border-t border-amber-200/80 flex items-center gap-2 text-xs text-amber-950">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] text-slate-700">
                  {isUnlimited ? (
                    <><strong>VIP-tilgang innvilget:</strong> Du har full, ubegrenset tilgang til Humanizer-boten uten gebyr eller kredittsjekk.</>
                  ) : (
                    <><strong>Hvorfor koster dette 10 kr?</strong> Bevisst etisk friksjon for å hindre ukritisk omskriving og verne om din egen skrive- og læringsprosess.</>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* INPUT-OMRÅDE (Opplasting eller tekst) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-indigo-600" /> 
              {activeTool === 'sensor' 
                ? 'Hvilket utkast vil du ha sensor-tilbakemelding på?' 
                : activeTool === 'humanizer'
                ? 'Hvilken tekst vil du ha etisk språkvask på?'
                : 'Hvilket fagdokument vil du analysere og oppsummere?'}
            </h2>

            {/* Skjult filvelger */}
            <input 
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Drag & Drop Boks */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-slate-300 rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 transition-all cursor-pointer mb-6 group text-center"
            >
              <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                {isProcessingFile ? (
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                ) : (
                  <FileOutput className="w-8 h-8 text-slate-400 group-hover:text-indigo-600" />
                )}
              </div>
              <p className="font-bold text-slate-700">
                {uploadedFileName ? `Valgt fil: ${uploadedFileName}` : 'Last opp PDF eller Word-dokument'}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {isProcessingFile 
                  ? 'Leser og trekker ut tekst...' 
                  : 'Dra og slipp filen her, eller klikk for å bla gjennom maskinen (PDF, Word, TXT).'}
              </p>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-px bg-slate-200 flex-1"></div>
              <span className="text-xs font-bold text-slate-400 uppercase">Eller lim inn tekst</span>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            {/* Tekst-input */}
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-48 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none resize-none transition-all placeholder:text-slate-400"
              placeholder={
                activeTool === 'sensor'
                  ? 'Lim inn oppgaveteksten, praksisfortellingen eller bachelorutkastet ditt her for sensorvurdering...'
                  : activeTool === 'humanizer'
                  ? 'Lim inn teksten du ønsker etisk språkvask på (Humanizer-bot fjerner robotaktige vendinger og styrker akademisk presisjon)...'
                  : 'Lim inn fagartikkelen, notatene eller pensumteksten du vil dekonstruere og oppsummere...'
              }
            />

            {/* Feilmelding */}
            {errorMessage && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Handlingsknapp basert på aktivt verktøy */}
            <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
              {inputText.length > 0 && (
                <span className="text-xs text-slate-400">
                  {inputText.length.toLocaleString()} tegn registrert
                </span>
              )}

              <div className="ml-auto flex items-center gap-3">
                {activeTool === 'humanizer' ? (
                  (isUnlimited || humanizerCredits > 0) ? (
                    <button 
                      onClick={handleRunAnalysis}
                      disabled={isAnalyzing || isProcessingFile}
                      className="px-7 py-3.5 rounded-xl font-black flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all text-slate-950 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Vasker teksten med Humanizer...</span>
                        </>
                      ) : (
                        <>
                          <Coins className="w-5 h-5 stroke-[2.5]" /> 
                          <span>Kjør etisk språkvask</span>
                          <span className={`text-xs px-2 py-0.5 rounded-md font-mono ml-1 ${
                            isUnlimited ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-950 text-amber-300'
                          }`}>
                            {isUnlimited ? 'Ubegrenset' : '1 vask (10,- NOK)'}
                          </span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button 
                      onClick={() => setShowHumanizerModal(true)}
                      className="px-7 py-3.5 rounded-xl font-black flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all text-slate-950 bg-amber-500 hover:bg-amber-600 cursor-pointer"
                    >
                      <Coins className="w-5 h-5 stroke-[2.5]" />
                      <span>Lås opp vask (10,- kr via Stripe)</span>
                    </button>
                  )
                ) : (
                  <button 
                    onClick={handleRunAnalysis}
                    disabled={isAnalyzing || isProcessingFile}
                    className={`px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                      activeTool === 'sensor' 
                        ? 'bg-indigo-600 hover:bg-indigo-700' 
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Analyserer med Gemini...</span>
                      </>
                    ) : (
                      <>
                        {activeTool === 'sensor' ? <GraduationCap className="w-5 h-5" /> : <Search className="w-5 h-5" />} 
                        <span>{activeTool === 'sensor' ? 'Kjør fiktiv sensur' : 'Kjør dypanalyse'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RESULTAT-VISNING */}
          {currentAnalysisResult && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${
                    activeTool === 'humanizer'
                      ? 'bg-amber-100 text-amber-800'
                      : activeTool === 'sensor' 
                      ? 'bg-indigo-50 text-indigo-600' 
                      : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {activeTool === 'humanizer' ? (
                      <Coins className="w-5 h-5 stroke-[2.5]" />
                    ) : activeTool === 'sensor' ? (
                      <GraduationCap className="w-5 h-5" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {activeTool === 'humanizer' 
                        ? 'Humanizer-rapport (Etisk språkvask)' 
                        : activeTool === 'sensor' 
                        ? 'Sensorrapport og tilbakemelding' 
                        : 'Oppsummering & Dypanalyse'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {activeDoc?.title || uploadedFileName || 'Bearbeidet dokument'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedResult ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Kopiert</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Kopier resultat</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed pt-2">
                <ReactMarkdown>{currentAnalysisResult}</ReactMarkdown>
              </div>

              {activeTool === 'sensor' && !isSemester && (
                <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-950">Dette var en kortfattet strukturanalyse (Standard)</p>
                      <p className="text-[11px] text-amber-800">
                        Vil du ha full pedagogisk dybdeanalyse mot Rammeplanen, kildevalidering mot APA 7 og estimert karakternivå?
                      </p>
                    </div>
                  </div>
                  {onUpgrade && (
                    <button 
                      onClick={onUpgrade}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
                    >
                      Lås opp Semester-pakka
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* KI-Advarsel og etiske retningslinjer */}
          <div className="bg-amber-50/70 border border-amber-200/80 p-5 rounded-2xl flex gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h4 className="font-bold text-amber-950 text-sm mb-1">Viktig om personvern og akademisk integritet (SIKT)</h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                Husk å anonymisere alle dokumenter for ekte navn på barn, foreldre eller kollegaer før du laster dem opp til analyse. Humanizer-boten er designet for å forbedre ditt eget språk, ikke for å generere oppgaver for deg.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Stripe Betalingsmodal for Humanizer-kreditter */}
      {showHumanizerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-5">
            <button 
              onClick={() => setShowHumanizerModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
                <Coins className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Lås opp Humanizer-boten</h3>
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                  10,- kr per vask (Pay-per-use via Stripe)
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Hvorfor er ikke dette ubegrenset i abonnementet?
              </p>
              <p className="leading-relaxed">
                Dette er et <strong>bevisst etisk valg</strong>. Ubegrenset tilgang til automatisk omskriving ("humanizing") frarøver deg din egen stemme og inviterer til akademiske snarveier.
              </p>
              <p className="leading-relaxed text-slate-500">
                Ved å ha en mikrokostnad på 10 kr per vask via Stripe sikrer vi at du tenker deg om og bruker verktøyet målrettet til å heve kvaliteten på ditt eget språk.
              </p>
            </div>

            {/* Gjeldende saldo */}
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
              <span className="text-amber-950 font-medium">Din nåværende saldo:</span>
              <span className="font-bold text-amber-900 font-mono bg-amber-200/70 px-2.5 py-0.5 rounded-md">
                {humanizerCredits} {humanizerCredits === 1 ? 'vask' : 'vask'}
              </span>
            </div>

            {/* Kjøpshandlinger */}
            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setShowHumanizerModal(false);
                  if (STRIPE_HUMANIZER_CREDITS_1_URL && !STRIPE_HUMANIZER_CREDITS_1_URL.includes('test_humanizer')) {
                    window.open(STRIPE_HUMANIZER_CREDITS_1_URL, '_blank', 'noopener,noreferrer');
                  } else {
                    handleBuyCredits(1);
                  }
                }}
                className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl font-black text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Kjøp 1 vask via Stripe</span>
                </div>
                <span className="bg-slate-950 text-amber-300 px-2 py-0.5 rounded-md text-xs font-mono">10,- NOK</span>
              </button>

              <button
                onClick={() => {
                  setShowHumanizerModal(false);
                  if (STRIPE_HUMANIZER_CREDITS_10_URL && !STRIPE_HUMANIZER_CREDITS_10_URL.includes('test_humanizer')) {
                    window.open(STRIPE_HUMANIZER_CREDITS_10_URL, '_blank', 'noopener,noreferrer');
                  } else {
                    handleBuyCredits(10);
                  }
                }}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>Kjøp 10 vask (100 kr via Stripe)</span>
                </div>
                <span className="bg-slate-800 px-2 py-0.5 rounded-md text-xs font-mono text-amber-300">100,- NOK</span>
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={() => setShowHumanizerModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors cursor-pointer"
              >
                Avbryt og skriv selv
              </button>
            </div>
          </div>
        </div>
      )}

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
                Hold orden i analyser, sensorvurderinger og utkast.
              </p>
            </div>
            <div className="pt-2">
              <input 
                type="text" 
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                placeholder="F.eks. Bacheloroppgave 2026"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              />
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName('');
                  }} 
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Avbryt
                </button>
                <button 
                  type="button"
                  onClick={handleCreateFolder} 
                  disabled={!newFolderName.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
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

export default DocumentAnalysis;
