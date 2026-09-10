import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceLayout, HistoryItem } from './WorkspaceLayout';
import { 
  BookOpen, 
  Save, 
  FileClock, 
  Sparkles, 
  Check, 
  Bold, 
  Italic, 
  List, 
  Quote, 
  FileText,
  HelpCircle,
  Lightbulb,
  Eye,
  Edit3,
  FolderPlus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { askSocraticAgent } from '../services/geminiService';
import { db } from '../firebase';
import { getAuth } from 'firebase/auth';
import { collection, doc, setDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';

export interface FolderItem {
  id: string;
  name: string;
  isExpanded?: boolean;
  createdAt?: string;
}

export interface ProcessLogItem extends HistoryItem {
  id: string;
  title: string;
  subtitle?: string;
  isPinned?: boolean;
  category: string;
  situation: string;
  reflection: string;
  theoryLinks: string;
  createdAt: string;
  updatedAt: string;
  folderId?: string;
}

const STORAGE_KEY = 'blu_process_logs_v2';
const FOLDERS_STORAGE_KEY = 'blu_process_log_folders_v1';

const INITIAL_FOLDERS: FolderItem[] = [
  { id: 'f1', name: 'Praksis H26', isExpanded: true, createdAt: new Date().toISOString() },
  { id: 'f2', name: 'Pedagogikk', isExpanded: false, createdAt: new Date().toISOString() }
];

const INITIAL_LOGS: ProcessLogItem[] = [
  {
    id: '1',
    title: 'Konflikt i sandkassen om spader',
    subtitle: 'Praksisfortelling • 31. aug 2026',
    isPinned: true,
    category: 'Praksisfortelling',
    situation: `Under formiddagsleken ute oppstod det en situasjon i sandkassen mellom to treåringer. Begge ønsket å bruke den samme gule spaden for å fylle en stor bøtte. 

Den ene gutten hevet stemmen og trakk spaden til seg, mens den andre begynte å gråte og så mot meg som voksen. 

I stedet for å gripe inn umiddelbart og fordele lekene, satte jeg meg ned på huk i øyehøyde og spurte: *"Hva er det dere bygger sammen her?"*`,
    reflection: `Ved å innta en anerkjennende og veiledende rolle (Bae, 2012) ga jeg barna rom til selv å sette ord på lekeintensjonen. Dette støtter barnas relasjonelle kompetanse og medvirkning.`,
    theoryLinks: 'Bae (2012) - Rom for medvirkning; Rammeplanen kap. 3 om livsmestring og fellesskap.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Didaktisk plan for samlingsstund',
    subtitle: 'Didaktisk refleksjon • 28. aug 2026',
    isPinned: false,
    category: 'Didaktisk refleksjon',
    situation: `Gjennomføring av eventyrsamling med konkreter for 4-5-åringene. Målet var å stimulere begrepsforståelse og turtaking.`,
    reflection: `Barna var svært engasjerte når de fikk holde i figurene etter tur. Neste gang bør jeg differensiere spørsmålene bedre etter barnas språklige forutsetninger.`,
    theoryLinks: 'Vygotskij - Den proksimale utviklingssone; Rammeplanen kap. 8 om Kommunikasjon, språk og tekst.',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

export function ProcessLog(_props?: { [key: string]: any }) {
  const [logs, setLogs] = useState<ProcessLogItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse logs from localStorage', e);
    }
    return INITIAL_LOGS;
  });

  const [activeLogId, setActiveLogId] = useState<string>(() => {
    return logs.length > 0 ? logs[0].id : '1';
  });

  // State for mapper
  const [folders, setFolders] = useState<FolderItem[]>(() => {
    try {
      const saved = localStorage.getItem(FOLDERS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse folders from localStorage', e);
    }
    return INITIAL_FOLDERS;
  });

  // State for Ny Mappe modal
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSuggestingTheory, setIsSuggestingTheory] = useState(false);
  const [theorySuggestions, setTheorySuggestions] = useState<string | null>(null);

  const situationTextareaRef = useRef<HTMLTextAreaElement>(null);

  const activeLog = logs.find(l => l.id === activeLogId) || logs[0];

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save logs to localStorage', e);
    }
  }, [logs]);

  useEffect(() => {
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error('Failed to save folders to localStorage', e);
    }
  }, [folders]);

  // Henter logger og mapper fra Firestore ved innlasting
  useEffect(() => {
    const fetchData = async () => {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        setLogs(INITIAL_LOGS);
        setFolders(INITIAL_FOLDERS);
        return;
      }

      try {
        // Hent logger fra Firebase
        const logQ = query(collection(db, 'processLogs'), where('userId', '==', user.uid));
        const logSnapshot = await getDocs(logQ);
        if (!logSnapshot.empty) {
          const fetchedLogs = logSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProcessLogItem));
          fetchedLogs.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
          setLogs(fetchedLogs);
          setActiveLogId(fetchedLogs[0].id);
        }

        // Hent mapper fra Firebase
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

  // Hjelpefunksjon for å lagre et spesifikt loggelement til skyen
  const saveLogToFirebase = async (logToSave: ProcessLogItem) => {
    try {
      const user = getAuth().currentUser;
      if (!user) return;
      const logRef = doc(db, 'processLogs', logToSave.id);
      await setDoc(logRef, { ...logToSave, userId: user.uid }, { merge: true });
    } catch (error) {
      console.error("Feil ved lagring av logg:", error);
    }
  };

  // Hjelpefunksjon for å lagre mapper til skyen
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
    setLogs(prev => {
      const updatedLogs = prev.map(l => {
        if (l.id === docId) {
          const updated = { ...l, folderId, updatedAt: new Date().toISOString() };
          // Lagrer umiddelbart til skyen når en logg flyttes
          saveLogToFirebase(updated);
          return updated;
        }
        return l;
      });
      return updatedLogs;
    });
  };

  const handleNewLog = () => {
    const newId = Date.now().toString();
    const newLogItem: ProcessLogItem = {
      id: newId,
      title: 'Ny praksislogg',
      subtitle: 'Praksisfortelling • Nettopp opprettet',
      isPinned: false,
      category: 'Praksisfortelling',
      situation: '',
      reflection: '',
      theoryLinks: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLogs(prev => [newLogItem, ...prev]);
    setActiveLogId(newId);
    setPreviewMode('edit');
    setTheorySuggestions(null);
    saveLogToFirebase(newLogItem);
  };

  const handleUpdateActiveLog = (fields: Partial<ProcessLogItem>) => {
    setLogs(prev => prev.map(log => {
      if (log.id === activeLogId) {
        return {
          ...log,
          ...fields,
          updatedAt: new Date().toISOString()
        };
      }
      return log;
    }));
  };

  const handleSaveLog = () => {
    setSaveStatus('Logg lagret!');
    const dateStr = new Date().toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
    const updated = {
      ...activeLog,
      subtitle: `${activeLog?.category || 'Logg'} • ${dateStr}`,
      updatedAt: new Date().toISOString()
    };
    handleUpdateActiveLog(updated);
    saveLogToFirebase(updated);
    setTimeout(() => setSaveStatus(null), 2500);
  };

  // Text formatting inside situation textarea
  const applyFormatting = (format: string) => {
    const textarea = situationTextareaRef.current;
    if (!textarea || !activeLog) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = activeLog.situation || '';
    const selected = text.substring(start, end);

    let replacement = '';
    let newCursorPos = start;

    switch (format) {
      case 'Fet':
        replacement = selected ? `**${selected}**` : `**fet tekst**`;
        newCursorPos = selected ? end + 4 : start + 11;
        break;
      case 'Kursiv':
        replacement = selected ? `*${selected}*` : `*kursiv tekst*`;
        newCursorPos = selected ? end + 2 : start + 13;
        break;
      case 'Liste':
        replacement = selected ? `\n- ${selected}\n` : `\n- Observasjonspunkt\n`;
        newCursorPos = start + replacement.length;
        break;
      case 'Sitat':
        replacement = selected ? `\n> "${selected}"\n` : `\n> "Direkte sitat fra situasjonen..."\n`;
        newCursorPos = start + replacement.length;
        break;
    }

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    handleUpdateActiveLog({ situation: newContent });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 15);
  };

  // AI Theoretical reflection advisor
  const handleGetTheorySuggestions = async () => {
    if (!activeLog.situation.trim()) return;
    setIsSuggestingTheory(true);
    try {
      const prompt = `Som pedagogisk veileder for barnehagelærerstudenter i Norge:
Analyser denne situasjonsbeskrivelsen fra barnehagepraksis:
"${activeLog.situation}"

Foreslå:
1. Relevante temaer fra Rammeplan for barnehagen
2. 2-3 sentrale pedagogiske teorier eller fagpersoner (f.eks. Bae, Vygotskij, Bowlby, Sommer, Løkken)
3. 2 åpne refleksjonspørsmål for studentens videre drøfting.`;

      const response = await askSocraticAgent(
        [{ role: 'user', content: prompt }],
        { frameworkFocus: 'Teorikobling og didaktisk refleksjon' }
      );
      setTheorySuggestions(response || 'Ingen forslag funnet.');
    } catch (e) {
      console.error('Failed to get theory suggestions', e);
      setTheorySuggestions('Kunne ikke hente forslag akkurat nå.');
    } finally {
      setIsSuggestingTheory(false);
    }
  };

  // Pin / Unpin
  const handlePinItem = (id: string, isPinned: boolean) => {
    setLogs(prev => prev.map(l => {
      if (l.id === id) {
        const updated = { ...l, isPinned, updatedAt: new Date().toISOString() };
        saveLogToFirebase(updated);
        return updated;
      }
      return l;
    }));
  };

  // Rename
  const handleRenameItem = (id: string, newTitle: string) => {
    setLogs(prev => prev.map(l => {
      if (l.id === id) {
        const updated = { ...l, title: newTitle, updatedAt: new Date().toISOString() };
        saveLogToFirebase(updated);
        return updated;
      }
      return l;
    }));
  };

  // Delete
  const handleDeleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'processLogs', id));
    } catch (err) {
      console.error('Feil ved sletting av logg fra Firebase:', err);
    }
    setLogs(prev => {
      const filtered = prev.filter(l => l.id !== id);
      if (activeLogId === id) {
        if (filtered.length > 0) {
          setActiveLogId(filtered[0].id);
        } else {
          const freshId = Date.now().toString();
          const freshLog: ProcessLogItem = {
            id: freshId,
            title: 'Ny praksislogg',
            subtitle: 'Praksisfortelling • Nettopp opprettet',
            isPinned: false,
            category: 'Praksisfortelling',
            situation: '',
            reflection: '',
            theoryLinks: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setActiveLogId(freshId);
          saveLogToFirebase(freshLog);
          return [freshLog];
        }
      }
      return filtered;
    });
  };

  return (
    <WorkspaceLayout
      title="Prosesslogg"
      subtitle="Dokumenter praksis og refleksjon"
      icon={<BookOpen className="w-6 h-6" />}
      actionButtonLabel="Ny logg"
      onActionClick={handleNewLog}
      historyItems={logs}
      activeItemId={activeLogId}
      onItemClick={setActiveLogId}
      onPinItem={handlePinItem}
      onRenameItem={handleRenameItem}
      onDeleteItem={handleDeleteItem}
      folders={folders}
      onAddFolder={() => setIsCreatingFolder(true)}
      onMoveToFolder={handleMoveDoc}
    >
      {({ isCollapsed }) => (
        <>
        <div className={`flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-slate-50/50 custom-scrollbar transition-all duration-300 ${
          isCollapsed ? 'pt-16 md:pt-8' : ''
        }`}>
        <div className="w-full max-w-3xl space-y-6">
          
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xs border border-slate-200 space-y-6">
            
            {/* Header i loggskjema */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <FileClock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800">
                    {activeLog ? activeLog.title : 'Skriv logg'}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    {activeLog?.category} • {new Date(activeLog?.createdAt || Date.now()).toLocaleDateString('no-NO')}
                  </p>
                </div>
              </div>

              {/* Visningsmodus */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl">
                <button
                  onClick={() => setPreviewMode('edit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    previewMode === 'edit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" /> Skriv
                </button>
                <button
                  onClick={() => setPreviewMode('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    previewMode === 'preview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Forhåndsvis
                </button>
              </div>
            </div>
            
            {previewMode === 'edit' ? (
              <div className="space-y-5">
                
                {/* Tittel & Kategori */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Loggtittel
                    </label>
                    <input 
                      type="text"
                      value={activeLog.title}
                      onChange={(e) => handleUpdateActiveLog({ title: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-white outline-none font-bold text-slate-800"
                      placeholder="F.eks. Konflikt i sandkassen..."
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Kategori
                    </label>
                    <select 
                      value={activeLog.category}
                      onChange={(e) => handleUpdateActiveLog({ category: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-white outline-none font-medium text-slate-700"
                    >
                      <option value="Praksisfortelling">Praksisfortelling</option>
                      <option value="Didaktisk refleksjon">Didaktisk refleksjon</option>
                      <option value="Teorikobling">Teorikobling</option>
                      <option value="Observasjon">Observasjon</option>
                      <option value="Etisk dilemma">Etisk dilemma</option>
                    </select>
                  </div>
                </div>
                
                {/* Situasjonsbeskrivelse med verktøylinje */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Situasjonsbeskrivelse / Hva skjedde?
                    </label>

                    {/* Toolbar for situasjon */}
                    <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
                      <button
                        onClick={() => applyFormatting('Fet')}
                        className="px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                        title="Fet skrift"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => applyFormatting('Kursiv')}
                        className="px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                        title="Kursiv skrift"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => applyFormatting('Liste')}
                        className="px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                        title="Liste"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => applyFormatting('Sitat')}
                        className="px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                        title="Sitat"
                      >
                        <Quote className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <textarea 
                    ref={situationTextareaRef}
                    value={activeLog.situation}
                    onChange={(e) => handleUpdateActiveLog({ situation: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-48 resize-none focus:ring-2 focus:ring-primary focus:bg-white outline-none leading-relaxed text-slate-800 font-sans" 
                    placeholder="Beskriv en konkret hendelse fra barnehagen, hva barna sa/gjorde, og din egen rolle..."
                  />
                </div>

                {/* AI forslag til teorikobling */}
                <div className="flex justify-end">
                  <button
                    onClick={handleGetTheorySuggestions}
                    disabled={isSuggestingTheory || !activeLog.situation.trim()}
                    className="px-3.5 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isSuggestingTheory ? 'Henter teoriforslag...' : 'Foreslå teorikobling med AI'}</span>
                  </button>
                </div>

                {theorySuggestions && (
                  <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-xs prose prose-sm max-w-none text-slate-800 animate-in fade-in">
                    <ReactMarkdown>{typeof theorySuggestions === 'string' ? theorySuggestions : JSON.stringify(theorySuggestions, null, 2)}</ReactMarkdown>
                  </div>
                )}

                {/* Didaktisk refleksjon */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Didaktisk refleksjon / Hva lærte jeg?
                  </label>
                  <textarea 
                    value={activeLog.reflection}
                    onChange={(e) => handleUpdateActiveLog({ reflection: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 resize-none focus:ring-2 focus:ring-primary focus:bg-white outline-none leading-relaxed text-slate-800" 
                    placeholder="Reflekter over hvorfor situasjonen utviklet seg slik, og hvordan din pedagogiske væremåte påvirket utfallet..."
                  />
                </div>

                {/* Teorikobling & Rammeplan */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Faglige kilder & Rammeplan-forankring
                  </label>
                  <input 
                    type="text"
                    value={activeLog.theoryLinks}
                    onChange={(e) => handleUpdateActiveLog({ theoryLinks: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-white outline-none text-slate-800" 
                    placeholder="F.eks. Bae (2012), Rammeplanen kap. 3, Barnehageloven § 3..."
                  />
                </div>

                {/* Lagre-knapp */}
                <button 
                  onClick={handleSaveLog}
                  className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md mt-6 cursor-pointer"
                >
                  {saveStatus ? <Check className="w-5 h-5 text-emerald-400" /> : <Save className="w-5 h-5" />}
                  <span>{saveStatus || 'Lagre logg i arkivet'}</span>
                </button>
              </div>
            ) : (
              /* FORHÅNDSVISNING */
              <div className="space-y-6 py-2">
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                  <div className="border-b border-slate-200 pb-3">
                    <span className="px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-bold rounded-lg uppercase tracking-wider">
                      {activeLog.category}
                    </span>
                    <h3 className="text-xl font-black text-slate-800 mt-2">{activeLog.title}</h3>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Situasjon</h4>
                    <div className="prose prose-sm max-w-none text-slate-800">
                      <ReactMarkdown>{typeof activeLog.situation === 'string' ? (activeLog.situation || '*Ingen situasjonsbeskrivelse skrevet.*') : '*Ingen situasjonsbeskrivelse skrevet.*'}</ReactMarkdown>
                    </div>
                  </div>

                  {activeLog.reflection && (
                    <div className="pt-3 border-t border-slate-200">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Didaktisk refleksjon</h4>
                      <div className="prose prose-sm max-w-none text-slate-800">
                        <ReactMarkdown>{typeof activeLog.reflection === 'string' ? activeLog.reflection : JSON.stringify(activeLog.reflection, null, 2)}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {activeLog.theoryLinks && (
                    <div className="pt-3 border-t border-slate-200">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Teorikobling</h4>
                      <p className="text-xs font-semibold text-indigo-700 bg-indigo-50/80 p-3 rounded-xl border border-indigo-100">
                        {activeLog.theoryLinks}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setPreviewMode('edit')}
                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                  >
                    Rediger logg
                  </button>
                </div>
              </div>
            )}
            
          </div>
          
        </div>
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
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Avbryt
                  </button>
                  <button 
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
        </>
      )}
    </WorkspaceLayout>
  );
}

export default ProcessLog;
