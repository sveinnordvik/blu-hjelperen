import React, { useState, useEffect } from 'react';
import { WorkspaceLayout, HistoryItem, FolderType } from '../WorkspaceLayout';
import { 
  ShieldCheck, 
  Mic, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Sparkles, 
  ArrowRight, 
  BookOpen, 
  Lock, 
  Layers, 
  Check, 
  Copy, 
  GraduationCap, 
  Info,
  RefreshCw,
  Search,
  Book,
  Scale,
  FolderPlus,
  Save,
  Plus,
  Trash2,
  Calendar,
  PenTool,
  Loader2,
  Quote,
  Compass,
  FileCheck
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeEmpiricalData, EmpiricalAnalysisResult } from '../../services/geminiService';

export type AnalysisLens = 'rammeplan' | 'theory' | 'method' | 'didactic';
export type TaskContext = 'bachelor' | 'praksis' | 'fou' | 'muntlig' | 'custom';

export interface EmpiricalDocument {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  analysisResult?: EmpiricalAnalysisResult;
  isPinned?: boolean;
  folderId?: string;
  taskContext: TaskContext;
  customTaskContext?: string;
  selectedLens: AnalysisLens;
  researchQuestion?: string;
  createdAt: string;
}

const STORAGE_DOCS_KEY = 'blu_empirical_docs_v1';
const STORAGE_FOLDERS_KEY = 'blu_empirical_folders_v1';

const INITIAL_FOLDERS: FolderType[] = [
  { id: 'f_intervju', name: 'Intervjuer (Sikt Nettskjema)', isExpanded: true },
  { id: 'f_observasjon', name: 'Praksisobservasjoner', isExpanded: true },
  { id: 'f_bachelor', name: 'Bacheloroppgave', isExpanded: false }
];

const INITIAL_DOCS: EmpiricalDocument[] = [
  {
    id: 'emp_1',
    title: 'Intervju ped.leder – Barns medvirkning',
    subtitle: 'Intervju • 320 ord',
    folderId: 'f_intervju',
    isPinned: true,
    taskContext: 'bachelor',
    selectedLens: 'rammeplan',
    researchQuestion: 'Hvordan tilrettelegger barnehagelæreren for barns medvirkning i hverdagsaktiviteter?',
    createdAt: new Date().toISOString(),
    content: `Intervjuer: Kan du fortelle litt om hvordan dere jobber med barns medvirkning på storbarnsavdelingen?

Pedagogisk leder: For oss handler ikke medvirkning om at barna skal bestemme alt, men at de opplever at deres stemme og kroppsspråk blir tatt på alvor. I samlingsstund bruker vi ofte bildestøtte slik at de barna som ikke har så mye verbalt språk ennå, også kan peke på hva de vil gjøre i prosjekttiden.

Intervjuer: Hvordan opplever du balansen mellom barns ønsker og rammeplanens føringer?

Pedagogisk leder: Det er en kontinuerlig forhandling. Hvis barna viser stor interesse for meitemark ute i regnværet, slipper vi det planlagte formingsopplegget og utforsker meitemarken i stedet. Det er jo nettopp det Rammeplanen oppfordrer til – å gripe øyeblikket.`
  },
  {
    id: 'emp_2',
    title: 'Observasjon – Samhandling i sandkassa',
    subtitle: 'Observasjon • 210 ord',
    folderId: 'f_observasjon',
    isPinned: false,
    taskContext: 'praksis',
    selectedLens: 'theory',
    researchQuestion: 'Hvordan etablerer to treåringer felles fokus i rollelek uten felles verbalt språk?',
    createdAt: new Date().toISOString(),
    content: `Klokkeslett: 10:15–10:30. Sted: Uteområdet.
Deltakere: Barn A (3 år) og Barn B (3 år).

Barn A sitter i sandkassa og fyller en rød bøtte med sand ved hjelp av en spade. Barn B kommer bort, setter seg på huk 50 cm unna og ser intenst på bevegelsene til Barn A.

Barn A ser opp, møter blikket til Barn B, smiler og dunker spaden to ganger mot bøtta. Barn B finner en gul spade og begynner å spa sand oppi den samme bøtta. Ingen av dem snakker verbalt, men de etablerer en felles rytme der de fyller bøtta annenhver gang. Når bøtta er full, reiser begge seg samtidig og roper i kor.`
  }
];

interface EmpiricalAnalysisProps {
  onBackToTools?: () => void;
  onNavigateToWritingWorkshop?: (content: string, title?: string) => void;
}

export function EmpiricalAnalysis({
  onBackToTools,
  onNavigateToWritingWorkshop
}: EmpiricalAnalysisProps) {
  // Toppfane-navigasjon
  const [activeTab, setActiveTab] = useState<'guidance' | 'analysis' | 'ethics'>('guidance');
  
  // Dokument- og mappehåndtering
  const [documents, setDocuments] = useState<EmpiricalDocument[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DOCS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_DOCS;
    } catch (e) {
      return INITIAL_DOCS;
    }
  });

  const [folders, setFolders] = useState<FolderType[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FOLDERS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_FOLDERS;
    } catch (e) {
      return INITIAL_FOLDERS;
    }
  });

  const [activeDocId, setActiveDocId] = useState<string | null>('emp_1');
  const [docTitle, setDocTitle] = useState('Intervju ped.leder – Barns medvirkning');

  // Redigeringsfelt
  const [rawText, setRawText] = useState('');
  const [selectedLens, setSelectedLens] = useState<AnalysisLens>('rammeplan');
  const [taskContext, setTaskContext] = useState<TaskContext>('bachelor');
  const [customTaskContext, setCustomTaskContext] = useState('');
  const [researchQuestion, setResearchQuestion] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // KI-analyse state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<EmpiricalAnalysisResult | null>(null);

  // Mappeopprettelse modal
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Anonymiserings-sjekkliste (krav før analyse)
  const [checkedItems, setCheckedItems] = useState<{
    names: boolean;
    location: boolean;
    sensitive: boolean;
    consent: boolean;
  }>({
    names: true,
    location: true,
    sensitive: true,
    consent: true
  });

  // Lagre til localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DOCS_KEY, JSON.stringify(documents));
    } catch (e) {
      console.error('Feil ved lagring av empiri-dokumenter:', e);
    }
  }, [documents]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error('Feil ved lagring av mapper:', e);
    }
  }, [folders]);

  // Last inn aktivt dokument
  useEffect(() => {
    if (activeDocId) {
      const doc = documents.find(d => d.id === activeDocId);
      if (doc) {
        setDocTitle(doc.title);
        setRawText(doc.content);
        setSelectedLens(doc.selectedLens || 'rammeplan');
        setTaskContext(doc.taskContext || 'bachelor');
        setCustomTaskContext(doc.customTaskContext || '');
        setResearchQuestion(doc.researchQuestion || '');
        setCurrentResult(doc.analysisResult || null);
        setAnalysisError(null);
      }
    }
  }, [activeDocId]);

  const isAnonymized = checkedItems.names && checkedItems.location && checkedItems.sensitive && checkedItems.consent;

  const toggleCheck = (key: keyof typeof checkedItems) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAllChecks = () => {
    setCheckedItems({
      names: true,
      location: true,
      sensitive: true,
      consent: true
    });
  };

  // Opprett nytt tomt dokument
  const handleNewDocument = () => {
    const newId = 'emp_' + Date.now();
    const newDoc: EmpiricalDocument = {
      id: newId,
      title: 'Ny empiri / transkripsjon',
      subtitle: 'Utkast • 0 ord',
      content: '',
      taskContext: 'bachelor',
      selectedLens: 'rammeplan',
      researchQuestion: '',
      createdAt: new Date().toISOString()
    };

    setDocuments(prev => [newDoc, ...prev]);
    setActiveDocId(newId);
    setDocTitle(newDoc.title);
    setRawText('');
    setResearchQuestion('');
    setTaskContext('bachelor');
    setCustomTaskContext('');
    setSelectedLens('rammeplan');
    setCurrentResult(null);
    setAnalysisError(null);
    setActiveTab('analysis');
    setCheckedItems({
      names: false,
      location: false,
      sensitive: false,
      consent: false
    });
  };

  // Lagre endringer i aktivt dokument
  const handleSaveDocument = (updatedResult?: EmpiricalAnalysisResult) => {
    const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;
    const finalTitle = docTitle.trim() || 'Uten tittel';
    const resultToSave = updatedResult !== undefined ? updatedResult : currentResult;

    if (activeDocId) {
      setDocuments(prev => prev.map(doc => {
        if (doc.id === activeDocId) {
          return {
            ...doc,
            title: finalTitle,
            subtitle: `${taskContext === 'custom' ? (customTaskContext || 'Egendefinert') : taskContext.toUpperCase()} • ${wordCount} ord`,
            content: rawText,
            selectedLens,
            taskContext,
            customTaskContext,
            researchQuestion,
            analysisResult: resultToSave || undefined
          };
        }
        return doc;
      }));
    } else {
      const newId = 'emp_' + Date.now();
      const newDoc: EmpiricalDocument = {
        id: newId,
        title: finalTitle,
        subtitle: `${taskContext === 'custom' ? (customTaskContext || 'Egendefinert') : taskContext.toUpperCase()} • ${wordCount} ord`,
        content: rawText,
        selectedLens,
        taskContext,
        customTaskContext,
        researchQuestion,
        analysisResult: resultToSave || undefined,
        createdAt: new Date().toISOString()
      };
      setDocuments(prev => [newDoc, ...prev]);
      setActiveDocId(newId);
    }

    setSaveSuccessMessage(true);
    setTimeout(() => setSaveSuccessMessage(false), 2500);
  };

  // Start KI-analyse
  const handleStartAnalysis = async () => {
    if (!rawText.trim() || !isAnonymized) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const result = await analyzeEmpiricalData({
        rawText,
        taskContext,
        customTaskContext,
        selectedLens,
        researchQuestion
      });

      setCurrentResult(result);
      handleSaveDocument(result);
    } catch (err: any) {
      console.error('Feil under empiri-analyse:', err);
      setAnalysisError(err.message || 'Kunne ikke fullføre analysen. Vennligst sjekk nettforbindelsen og prøv igjen.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyDraft = () => {
    if (!currentResult?.suggestedChapterDraft) return;
    navigator.clipboard.writeText(currentResult.suggestedChapterDraft);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  const handleTransferToWorkshop = () => {
    if (!currentResult?.suggestedChapterDraft) return;

    const transferTitle = `Empiridrøfting – ${docTitle}`;
    const transferContent = `# Empiridrøfting\n\n${currentResult.suggestedChapterDraft}`;

    try {
      localStorage.setItem('blu_pending_workshop_import', JSON.stringify({
        title: transferTitle,
        content: transferContent,
        template: 'Bacheloroppgave / Empirisk analyse',
        taskPrompt: `Overført fra Empiri- og Intervjuanalysen. Basert på «${docTitle}».`,
        targetWords: 2000
      }));
    } catch (e) {
      console.error('Feil ved skriveverksted-overføring:', e);
    }

    if (onNavigateToWritingWorkshop) {
      onNavigateToWritingWorkshop(transferContent, transferTitle);
    }
  };

  // Mappefunksjoner
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: FolderType = {
      id: 'f_' + Date.now(),
      name: newFolderName.trim(),
      isExpanded: true
    };
    setFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleDeleteFolder = (folderId: string) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setDocuments(prev => prev.map(doc => doc.folderId === folderId ? { ...doc, folderId: undefined } : doc));
  };

  const handleMoveToFolder = (docId: string, folderId: string | undefined) => {
    setDocuments(prev => prev.map(doc => doc.id === docId ? { ...doc, folderId } : doc));
  };

  const handlePinItem = (id: string, isPinned: boolean) => {
    setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, isPinned } : doc));
  };

  const handleRenameItem = (id: string, newTitle: string) => {
    setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, title: newTitle } : doc));
    if (activeDocId === id) {
      setDocTitle(newTitle);
    }
  };

  const handleDeleteItem = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    if (activeDocId === id) {
      const remaining = documents.filter(doc => doc.id !== id);
      if (remaining.length > 0) {
        setActiveDocId(remaining[0].id);
      } else {
        setActiveDocId(null);
        setRawText('');
        setCurrentResult(null);
      }
    }
  };

  // Formatér til WorkspaceLayout HistoryItems
  const historyItems: HistoryItem[] = documents.map(doc => ({
    id: doc.id,
    title: doc.title,
    subtitle: doc.subtitle || `${doc.content.split(/\s+/).filter(Boolean).length} ord`,
    folderId: doc.folderId,
    isPinned: doc.isPinned,
    icon: <FileText className="w-4 h-4 text-emerald-600" />
  }));

  return (
    <WorkspaceLayout
      title="Empiri- og Intervjuanalyse"
      subtitle="Sikker dataflyt via Sikt, GDPR-anonymisering og pedagogisk drøfting"
      icon={<ShieldCheck className="w-6 h-6 text-emerald-600" />}
      actionButtonLabel="Ny transkripsjon / empiri"
      onActionClick={handleNewDocument}
      onBackToTools={onBackToTools}
      historySectionTitle="Filarkiv (Empiri & Notater)"
      historyItems={historyItems}
      folders={folders}
      activeItemId={activeDocId}
      onItemClick={(id) => {
        setActiveDocId(id);
        setActiveTab('analysis');
      }}
      onPinItem={handlePinItem}
      onRenameItem={handleRenameItem}
      onDeleteItem={handleDeleteItem}
      onAddFolder={() => setIsCreatingFolder(true)}
      onMoveToFolder={handleMoveToFolder}
      onDeleteFolder={handleDeleteFolder}
    >
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
        
        {/* Topp-fanevelger: Veiledning, Analyse, Etikk */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setActiveTab('guidance')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'guidance'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Personvern & Sikt</span>
            </button>

            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'analysis'
                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Analyse & Drøfting</span>
              {currentResult && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('ethics')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'ethics'
                  ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Scale className="w-4 h-4 text-amber-600" />
              <span>Forskningsetikk (NESH)</span>
            </button>
          </div>

          {activeTab === 'analysis' && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleSaveDocument()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Lagre teksten og innstillingene i filarkivet"
              >
                {saveSuccessMessage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
                <span>{saveSuccessMessage ? 'Lagret i arkiv!' : 'Lagre i arkiv'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Hovedinnhold i rullefelt */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
          <div className="max-w-4xl w-full space-y-6">

            {/* ========================================================= */}
            {/* FANE 1: SIKT & PERSONVERNVEILEDNING */}
            {/* ========================================================= */}
            {activeTab === 'guidance' && (
              <div className="space-y-6">
                {/* Hovedbanner */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -z-0 opacity-60 pointer-events-none" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" /> Lovpålagt forskningsetikk
                      </span>
                      <span className="text-xs text-slate-500 font-medium">NESH • GDPR • UH-sektoren</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      Slik ivaretar du personvernet ved lydopptak og intervjuer
                    </h2>

                    <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
                      Når du som barnehagelærerstudent samler inn empiri – enten det er intervju med en pedagogisk leder, observasjoner i lek eller praksisfortellinger – er du underlagt strenge etiske og juridiske regler. Barns stemmer og personopplysninger må <strong>aldri</strong> lastes opp i usikrede sky-tjenester eller kommersielle KI-modeller.
                    </p>

                    <div className="mt-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex gap-3.5 text-xs text-amber-900">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-sm mb-1 text-amber-950">
                          Hvorfor må du bruke Sikts Nettskjema Diktafon?
                        </span>
                        Høyskolene og universitetene krever at lydopptak av personer krypteres direkte på opptaksenheten (ende-til-ende) og overføres rett inn på universitetenes lukkede servere (TSD). Dette sikrer at uvedkommende aldri får tilgang til rålyden.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trinnvis prosess: Fra opptak til analyse */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200">
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    Den godkjente 4-trinns arbeidsflyten
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Trinn 1: Oppdatert fungerende UiO-lenke */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                      <div>
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center mb-3">
                          1
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mb-1">
                          Gjennomfør opptak i Nettskjema
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Bruk den offisielle <em>Nettskjema-diktafon</em>-appen på mobilen. Opptaket krypteres lokalt før innsending.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200/60">
                        <a 
                          href="https://www.uio.no/tjenester/it/adm-app/nettskjema/hjelp/diktafon.html" 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors"
                        >
                          <span>UiO Nettskjema Veiledning</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Trinn 2 */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                      <div>
                        <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center mb-3">
                          2
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mb-1">
                          Transkriber i Sikt Autotekst
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Hent ut den ferdige råteksten fra universitetenes sikre transkriberingstjeneste (Autotekst basert på Whisper).
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200/60">
                        <a 
                          href="https://autotekst.uio.no/" 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1.5 transition-colors"
                        >
                          <span>Åpne Sikt Autotekst</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Trinn 3 */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                      <div>
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center mb-3">
                          3
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mb-1">
                          Anonymiser teksten nøye
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Erstatt navn med koder (f.eks. «Barn B (4 år)», «Styrer»), og fjern barnehagens navn, sted og spesifikke detaljer.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200/60">
                        <button 
                          onClick={() => setActiveTab('ethics')}
                          className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Se NESH-sjekkliste</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Trinn 4 */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                      <div>
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center mb-3">
                          4
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mb-1">
                          Analyser og drøft i BLU-Hjelperen
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Lim inn den anonymiserte teksten for å koble empirien mot Rammeplanen, didaktisk teori og overføre direkte til Skriveverkstedet.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200/60">
                        <button 
                          onClick={() => setActiveTab('analysis')}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Gå til analysefeltet</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={() => setActiveTab('analysis')}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>Fortsett til analyse & drøfting</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* FANE 2: ARBEIDSFLATE FOR EMPIRI- OG INTERVJUANALYSE */}
            {/* ========================================================= */}
            {activeTab === 'analysis' && (
              <div className="space-y-6">

                {/* Dokumenttittel / Navn */}
                <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex-1 w-full">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                      Dokumentnavn i filarkivet:
                    </label>
                    <input
                      type="text"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="Navn på transkripsjonen / observasjonen..."
                      className="w-full text-lg sm:text-xl font-black text-slate-900 bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none py-1 transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleSaveDocument()}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 text-slate-600" />
                      <span>{saveSuccessMessage ? 'Lagret!' : 'Lagre utkast'}</span>
                    </button>
                    <button
                      onClick={handleNewDocument}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ny tekst</span>
                    </button>
                  </div>
                </div>

                {/* Steg 1: Anonymiseringskontroll */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-lg">
                          1. Bekreft anonymisering før opplasting
                        </h3>
                        <p className="text-xs text-slate-500">
                          Du må bekrefte at teksten er avidentifisert før KI-drøftingen kan startes.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleSelectAllChecks}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition-all cursor-pointer shrink-0"
                    >
                      Huk av alle
                    </button>
                  </div>

                  {/* Sjekkpunkter */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all">
                      <input 
                        type="checkbox" 
                        checked={checkedItems.names}
                        onChange={() => toggleCheck('names')}
                        className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer" 
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">Navn er anonymisert</span>
                        <span className="text-slate-500">Barn, foresatte og ansatte er erstattet med fiktive koder (f.eks. «Barn A», «Pedagog»).</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all">
                      <input 
                        type="checkbox" 
                        checked={checkedItems.location}
                        onChange={() => toggleCheck('location')}
                        className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer" 
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">Sted & barnehage er fjernet</span>
                        <span className="text-slate-500">Barnehagens navn, avdelingsnavn, kommune og fylke er utelatt.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all">
                      <input 
                        type="checkbox" 
                        checked={checkedItems.sensitive}
                        onChange={() => toggleCheck('sensitive')}
                        className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer" 
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">Ingen sensitive helseopplysninger</span>
                        <span className="text-slate-500">Taushetsbelagt informasjon om diagnose, familiesituasjon eller sårbare forhold er utelatt.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all">
                      <input 
                        type="checkbox" 
                        checked={checkedItems.consent}
                        onChange={() => toggleCheck('consent')}
                        className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer" 
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">Gyldig samtykke foreligger</span>
                        <span className="text-slate-500">Datainnsamlingen er godkjent av barnehagen, og samtykkeskjema foreligger ved personopptak.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Steg 2: Innstillinger for analyse med Egendefinert mål */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200">
                  <h3 className="font-black text-slate-900 text-lg mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    2. Kontekst og pedagogisk analyselinse
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    {/* Oppgavetype inkludert Egendefinert mål */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Oppgaveform / Mål
                      </label>
                      <select
                        value={taskContext}
                        onChange={(e) => setTaskContext(e.target.value as TaskContext)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        <option value="bachelor">Bacheloroppgave (Empirisk analyse & drøfting)</option>
                        <option value="praksis">Praksisfortelling & Refleksjonsnotat</option>
                        <option value="fou">FoU-oppgave / Fordypningsoppgave</option>
                        <option value="muntlig">Forberedelse til muntlig eksamen</option>
                        <option value="custom">Egendefinert mål / oppgaveform...</option>
                      </select>

                      {/* Egendefinert felt som dukker opp ved "custom" */}
                      {taskContext === 'custom' && (
                        <div className="mt-3 animate-in fade-in slide-in-from-top-1">
                          <label className="block text-[11px] font-bold text-indigo-700 mb-1">
                            Beskriv ditt egendefinerte mål:
                          </label>
                          <input
                            type="text"
                            value={customTaskContext}
                            onChange={(e) => setCustomTaskContext(e.target.value)}
                            placeholder="F.eks.: «Fagartikkel om overganger i barnehagen», «Pedagogisk leder-evaluering»..."
                            className="w-full bg-indigo-50/50 border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium placeholder:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Analyselinse */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Primær teoretisk analyselinse
                      </label>
                      <select
                        value={selectedLens}
                        onChange={(e) => setSelectedLens(e.target.value as AnalysisLens)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        <option value="rammeplan">Rammeplan-forankring (Verdigrunnlag & fagområder)</option>
                        <option value="theory">Teoretisk drøfting (Bae, Vygotskij, Sommer, Løkken)</option>
                        <option value="method">Metodisk refleksjon (Forskerrolle, validitet & reliabilitet)</option>
                        <option value="didactic">Didaktisk relasjonsmodell (DDRM)</option>
                      </select>
                    </div>
                  </div>

                  {/* Problemstilling / Forskningsspørsmål */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Oppgavens problemstilling eller fokus (valgfritt, men anbefalt)
                    </label>
                    <input
                      type="text"
                      value={researchQuestion}
                      onChange={(e) => setResearchQuestion(e.target.value)}
                      placeholder="F.eks.: «Hvordan fremmer barnehagelæreren barns medvirkning i måltidssituasjonen?»"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                    />
                  </div>
                </div>

                {/* Steg 3: Lim inn anonymisert empiri */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                        <Mic className="w-5 h-5 text-indigo-600" />
                        3. Lim inn transkripsjon eller observasjon
                      </h3>
                      <p className="text-xs text-slate-500">
                        Lim inn teksten du eksporterte fra Sikt Autotekst eller feltnotatene dine. Teksten lagres i filarkivet ditt.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-500">
                        {rawText.trim() ? `${rawText.trim().split(/\s+/).length} ord` : '0 ord'}
                      </span>
                    </div>
                  </div>

                  <textarea
                    rows={8}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Lim inn den anonymiserte teksten her... 

Eksempel:
«Intervjuer: Hvordan opplever du at barna får medvirke når dere planlegger prosjektarbeid?
Pedagogisk leder: Vi prøver å ta utgangspunkt i det barna viser interesse for i samlingsstundene...»"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs sm:text-sm leading-relaxed resize-y custom-scrollbar"
                  />

                  {/* Feilmelding ved analyse */}
                  {analysisError && (
                    <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-800">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-sm mb-0.5">Kunne ikke fullføre analysen</span>
                        <span>{analysisError}</span>
                      </div>
                    </div>
                  )}

                  {/* Handlingsfelt */}
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      {isAnonymized ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Klar for sikker analyse
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Huk av alle 4 punkter i sjekklisten over
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => handleSaveDocument()}
                        disabled={isAnalyzing}
                        className="flex-1 sm:flex-none px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-4 h-4 text-slate-600" />
                        <span>Lagre i arkiv</span>
                      </button>

                      <button
                        disabled={!isAnonymized || !rawText.trim() || isAnalyzing}
                        onClick={handleStartAnalysis}
                        className="flex-1 sm:flex-none px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-bold text-sm shadow-md shadow-indigo-600/20 disabled:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Drøfter mot Rammeplanen...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>{currentResult ? 'Kjør ny analyse & drøfting' : 'Start analyse & drøfting'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* RESULTATVISNING: AKADEMISK DRØFTING & FORANKRING */}
                {/* ========================================================= */}
                {currentResult && (
                  <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    
                    {/* Header for resultater */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900">
                            Akademisk empiri- og teoridrøfting
                          </h3>
                          <p className="text-xs text-slate-500">
                            Strukturert etter vitenskapelige krav i barnehagelærerutdanningen
                          </p>
                        </div>
                      </div>

                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ferdig analysert
                      </span>
                    </div>

                    {/* Kort 1: Overordnet sammendrag & Syntese */}
                    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        1. Analytisk syntese og overblikk
                      </h4>
                      <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed font-normal">
                        <ReactMarkdown>{currentResult.overview}</ReactMarkdown>
                      </div>
                    </div>

                    {/* Kort 2: Sentrale empiriske temaer */}
                    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        2. Identifiserte empiriske hovedtemaer
                      </h4>

                      <div className="grid grid-cols-1 gap-4">
                        {currentResult.keyThemes?.map((theme, idx) => (
                          <div key={idx} className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-black flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <h5 className="font-black text-slate-900 text-sm">
                                {theme.title}
                              </h5>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-8">
                              {theme.description}
                            </p>
                            {theme.quoteOrExample && (
                              <div className="mt-2 ml-8 p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 italic flex items-start gap-2">
                                <Quote className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                                <span>«{theme.quoteOrExample.replace(/^[«"]|[»"]$/g, '')}»</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Kort 3: Rammeplan-drøfting */}
                    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <Compass className="w-4 h-4 text-emerald-600" />
                          3. Forankring og drøfting mot Rammeplanen
                        </h4>
                      </div>

                      {/* Relevante seksjoner */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {currentResult.rammeplanDiscussion?.relevantSections?.map((sec, idx) => (
                          <span key={idx} className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-emerald-600" />
                            {sec}
                          </span>
                        ))}
                      </div>

                      <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100">
                        <ReactMarkdown>{currentResult.rammeplanDiscussion?.analysis}</ReactMarkdown>
                      </div>
                    </div>

                    {/* Kort 4: Teoretisk drøfting */}
                    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <PenTool className="w-4 h-4 text-purple-600" />
                        4. Pedagogisk teoridrøfting
                      </h4>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {currentResult.theoreticalDiscussion?.theorists?.map((th, idx) => (
                          <span key={idx} className="px-3 py-1 bg-purple-50 text-purple-800 text-xs font-bold rounded-lg border border-purple-200">
                            {th}
                          </span>
                        ))}
                      </div>

                      <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed p-4 rounded-2xl bg-purple-50/40 border border-purple-100">
                        <ReactMarkdown>{currentResult.theoreticalDiscussion?.analysis}</ReactMarkdown>
                      </div>
                    </div>

                    {/* Kort 5: Metodisk refleksjon & etikk */}
                    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Scale className="w-4 h-4 text-amber-600" />
                        5. Metodisk vurdering, validitet og NESH-etikk
                      </h4>
                      <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80">
                        <ReactMarkdown>{currentResult.methodologicalReflection}</ReactMarkdown>
                      </div>
                    </div>

                    {/* Kort 6: Ferdig akademisk kapittelutkast (med overføring til Skriveverkstedet i Steg 3) */}
                    <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-indigo-800/80">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-indigo-700/80 text-indigo-200 rounded-md inline-block mb-1.5">
                            Ferdig akademisk tekstutkast
                          </span>
                          <h4 className="text-lg sm:text-xl font-black text-white">
                            Utkast til analyse- og drøftingskapittel
                          </h4>
                          <p className="text-xs text-indigo-200/80 mt-0.5">
                            Formulert i akademisk fagspråk med APA 7-henvisninger, klart til oppgaven din.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={handleCopyDraft}
                            className="px-4 py-2 bg-indigo-800 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            {copiedDraft ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedDraft ? 'Kopiert!' : 'Kopier teksten'}</span>
                          </button>

                          <button
                            onClick={handleTransferToWorkshop}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            <span>Overfør til Skriveverkstedet →</span>
                          </button>
                        </div>
                      </div>

                      <div className="bg-white/10 backdrop-blur-xs p-5 rounded-2xl border border-white/10 text-slate-100 text-xs sm:text-sm leading-relaxed font-normal whitespace-pre-wrap max-h-96 overflow-y-auto custom-scrollbar">
                        <ReactMarkdown>{currentResult.suggestedChapterDraft}</ReactMarkdown>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            )}

            {/* ========================================================= */}
            {/* FANE 3: FORSKNINGSETIKK & NESH-RETNINGSLINJER */}
            {/* ========================================================= */}
            {activeTab === 'ethics' && (
              <div className="space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-xl">
                        Forskningsetikk ved barnehageforskning (NESH)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Retningslinjer for samfunnsvitenskap, humaniora, juss og teologi med særlig vekt på barn.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 1. Barns særlige sårbarhet (NESH § 18)
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Barn har krav på særskilt beskyttelse. Forskning og bacheloroppgaver må aldri belaste barnet eller forstyrre barnets trygghet, lek og trivsel i barnehagen.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 2. Samtykke og barns medvirkning
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        For barn under 15 år kreves informert samtykke fra foresatte ved lydopptak og identifiserbare observasjoner. I tillegg må barnets eget kroppsspråk og non-verbale motstand respekteres umiddelbart (barnets rett til å avstå).
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 3. Taushetsplikt (Barnehageloven § 44)
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Som student i praksis er du bundet av forvaltningslovens og barnehagelovens strenge taushetsplikt. Opplysninger om barns personlige forhold, helse og familieforhold kan aldri gjengis i oppgaver, selv i anonymisert form dersom det er fare for bakveisidentifisering.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-100 flex justify-between items-center">
                    <a
                      href="https://www.forskningsetikk.no/retningslinjer/hum-sam/forskningsetiske-retningslinjer-for-samfunnsvitenskap-og-humaniora/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
                    >
                      <span>Les de fullstendige NESH-retningslinjene</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => setActiveTab('analysis')}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2"
                    >
                      <span>Tilbake til analyse</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Modal for å opprette ny mappe */}
      {isCreatingFolder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-slate-800">Opprett ny mappe</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Hold orden i intervjuer fra Sikt, feltobservasjoner og utkast.
              </p>
            </div>
            <div className="pt-2">
              <input 
                type="text" 
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                placeholder="F.eks. Praksis Høst 2026"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
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
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
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

export default EmpiricalAnalysis;
