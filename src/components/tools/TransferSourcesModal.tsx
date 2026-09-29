import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  Check, 
  ChevronRight, 
  Sparkles, 
  BookMarked, 
  ArrowRight, 
  X, 
  AlertCircle, 
  CheckCircle2,
  ListPlus,
  RefreshCw,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AcademicSource } from '../../lib/academicSources';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface DocumentSummary {
  id: string;
  title: string;
  subtitle?: string;
  folderId?: string;
  content: string;
  template?: string;
  updatedAt?: string;
}

interface FolderSummary {
  id: string;
  name: string;
  createdAt?: string;
}

interface TransferSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSources: AcademicSource[];
  onNavigateToWorkshop?: (targetDocId?: string) => void;
}

const STORAGE_KEY = 'blu_writing_workshop_docs_v2';
const FOLDERS_STORAGE_KEY = 'blu_writing_workshop_folders_v1';

export const TransferSourcesModal: React.FC<TransferSourcesModalProps> = ({
  isOpen,
  onClose,
  selectedSources,
  onNavigateToWorkshop
}) => {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [folders, setFolders] = useState<FolderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [searchDocQuery, setSearchDocQuery] = useState('');
  const [transferMode, setTransferMode] = useState<'merge' | 'replace'>('merge');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<{
    docTitle: string;
    count: number;
  } | null>(null);

  // Hent mapper og dokumenter
  useEffect(() => {
    if (!isOpen) {
      setTransferSuccess(null);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        let loadedDocs: DocumentSummary[] = [];
        let loadedFolders: FolderSummary[] = [];

        // 1. Prøv først lokal lagring for øyeblikkelig visning
        try {
          const localDocsRaw = localStorage.getItem(STORAGE_KEY);
          if (localDocsRaw) {
            loadedDocs = JSON.parse(localDocsRaw);
          }
          const localFoldersRaw = localStorage.getItem(FOLDERS_STORAGE_KEY);
          if (localFoldersRaw) {
            loadedFolders = JSON.parse(localFoldersRaw);
          }
        } catch (e) {
          console.error('Kunne ikke lese lokale dokumenter:', e);
        }

        // 2. Hent fra Firestore hvis innlogget
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const docQ = query(collection(db, 'documents'), where('userId', '==', user.uid));
          const docSnap = await getDocs(docQ);
          if (!docSnap.empty) {
            loadedDocs = docSnap.docs.map(d => ({ id: d.id, ...d.data() } as DocumentSummary));
            loadedDocs.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
          }

          const folderQ = query(collection(db, 'folders'), where('userId', '==', user.uid));
          const folderSnap = await getDocs(folderQ);
          if (!folderSnap.empty) {
            loadedFolders = folderSnap.docs.map(f => ({ id: f.id, ...f.data() } as FolderSummary));
          }
        }

        setDocuments(loadedDocs);
        setFolders(loadedFolders);
        if (loadedDocs.length > 0 && !selectedDocId) {
          setSelectedDocId(loadedDocs[0].id);
        }
      } catch (err) {
        console.error('Feil ved lasting av dokumenter for kildeoverføring:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const targetDoc = documents.find(d => d.id === selectedDocId);

  // Filtrerte dokumenter basert på søk
  const filteredDocs = documents.filter(d => 
    !searchDocQuery.trim() || 
    d.title.toLowerCase().includes(searchDocQuery.toLowerCase()) ||
    (d.subtitle && d.subtitle.toLowerCase().includes(searchDocQuery.toLowerCase()))
  );

  // Grupper dokumenter etter mapper
  const docsByFolder = folders.map(folder => ({
    folder,
    docs: filteredDocs.filter(d => d.folderId === folder.id)
  }));

  const rootDocs = filteredDocs.filter(d => !d.folderId || !folders.some(f => f.id === d.folderId));

  const handleExecuteTransfer = async () => {
    if (!targetDoc || selectedSources.length === 0) return;
    setIsTransferring(true);

    try {
      // 1. Generer rene APA 7-linjer for de valgte kildene
      const newSourceLines = selectedSources.map(s => s.fullReference.trim());

      const currentContent = targetDoc.content || '';
      const refHeadingRegex = /(?:^|\n)(#{1,3}\s+)?(?:Litteraturliste|Kildeliste|Referanser|Referanseliste)[^\n]*\n([\s\S]*)$/i;
      const headingMatch = currentContent.match(refHeadingRegex);

      let updatedContent = '';

      if (headingMatch && transferMode === 'merge') {
        // Hent ut eksisterende referanser og kombiner
        const existingRefSection = headingMatch[2] || '';
        const existingLines = existingRefSection
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 5 && !l.startsWith('#'));

        // Kombiner og fjern duplikater
        const combined = Array.from(new Set([...existingLines, ...newSourceLines]));
        // Sorter alfabetisk (APA 7)
        combined.sort((a, b) => a.replace(/^[*\s_]+/, '').localeCompare(b.replace(/^[*\s_]+/, ''), 'nb'));

        const newRefSection = combined.join('\n\n');
        const contentBeforeRefs = currentContent.substring(0, headingMatch.index).trim();
        updatedContent = `${contentBeforeRefs}\n\n## Litteraturliste\n\n${newRefSection}\n`;

      } else if (headingMatch && transferMode === 'replace') {
        const sorted = [...newSourceLines].sort((a, b) => a.replace(/^[*\s_]+/, '').localeCompare(b.replace(/^[*\s_]+/, ''), 'nb'));
        const contentBeforeRefs = currentContent.substring(0, headingMatch.index).trim();
        updatedContent = `${contentBeforeRefs}\n\n## Litteraturliste\n\n${sorted.join('\n\n')}\n`;

      } else {
        // Ingen eksisterende litteraturliste, legg til bakerst
        const sorted = [...newSourceLines].sort((a, b) => a.replace(/^[*\s_]+/, '').localeCompare(b.replace(/^[*\s_]+/, ''), 'nb'));
        updatedContent = `${currentContent.trim()}\n\n## Litteraturliste\n\n${sorted.join('\n\n')}\n`;
      }

      // Oppdater i lokal lagring
      const updatedDocs = documents.map(d => {
        if (d.id === targetDoc.id) {
          return { ...d, content: updatedContent, updatedAt: new Date().toISOString() };
        }
        return d;
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDocs));
        localStorage.setItem('blu_active_document_id', targetDoc.id);
      } catch (e) {
        console.error('Feil ved lokal lagring:', e);
      }

      // Oppdater i Firestore hvis innlogget
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, 'documents', targetDoc.id);
          await updateDoc(docRef, {
            content: updatedContent,
            updatedAt: new Date().toISOString()
          });
        } catch (e) {
          console.warn('Kunne ikke oppdatere Firestore direkte (bruker lokal lagring):', e);
        }
      }

      setTransferSuccess({
        docTitle: targetDoc.title,
        count: selectedSources.length
      });
    } catch (err) {
      console.error('Feil under overføring av kilder:', err);
      alert('Det oppstod en feil under overføring av kildene.');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-gradient-to-b from-indigo-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Overfør kilder til oppgave
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Flett {selectedSources.length} valgte {selectedSources.length === 1 ? 'kilde' : 'kilder'} direkte inn i litteraturlisten på en oppgave.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Innhold / Steg */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {transferSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">
                  {transferSuccess.count} {transferSuccess.count === 1 ? 'kilde' : 'kilder'} er lagt til i litteraturlisten!
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Kildene er lagt inn under <strong># Litteraturliste</strong> i «{transferSuccess.docTitle}» og sortert alfabetisk etter APA 7-standarden.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigateToWorkshop) {
                      onNavigateToWorkshop(selectedDocId);
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Åpne oppgaven i Skriveverkstedet</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs sm:text-sm cursor-pointer transition-colors"
                >
                  Lukk
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Valgte kilder sammendrag */}
              <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-indigo-600" />
                    Valgte kilder ({selectedSources.length})
                  </span>
                  <span className="text-[11px] text-indigo-600 font-normal">APA 7-formatert</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                  {selectedSources.map(s => (
                    <span
                      key={s.id}
                      className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200/80 text-slate-800 text-[11px] font-semibold flex items-center gap-1 shadow-2xs"
                    >
                      <BookMarked className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span className="truncate max-w-[200px]">{s.author} ({s.year})</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Velg mål-oppgave */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Velg oppgave å overføre til
                  </label>
                  
                  {/* Søk i oppgaver */}
                  <div className="relative w-full sm:w-60">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchDocQuery}
                      onChange={(e) => setSearchDocQuery(e.target.value)}
                      placeholder="Søk i oppgaver..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {isLoading ? (
                  <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Laster oppgavelisten din...</span>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                    Du har ingen oppgaver i Skriveverkstedet ennå. Opprett en oppgave først for å kunne flette inn kilder.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white custom-scrollbar shadow-2xs">
                    {/* Mapper med dokumenter */}
                    {docsByFolder.map(({ folder, docs }) => {
                      if (docs.length === 0) return null;
                      return (
                        <div key={folder.id} className="p-2 space-y-1 bg-slate-50/40">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 px-2 py-1">
                            <Folder className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Mappe: {folder.name}</span>
                          </div>
                          <div className="space-y-1 pl-3">
                            {docs.map(doc => {
                              const isSelected = selectedDocId === doc.id;
                              return (
                                <button
                                  key={doc.id}
                                  type="button"
                                  onClick={() => setSelectedDocId(doc.id)}
                                  className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                    isSelected 
                                      ? 'bg-indigo-600 text-white shadow-xs' 
                                      : 'hover:bg-slate-100 text-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                                    <div className="truncate">
                                      <p className="text-xs font-bold truncate leading-tight">{doc.title}</p>
                                      {doc.subtitle && (
                                        <p className={`text-[10px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                          {doc.subtitle}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {isSelected && <Check className="w-4 h-4 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Løse dokumenter i roten */}
                    {rootDocs.length > 0 && (
                      <div className="p-2 space-y-1">
                        {folders.length > 0 && (
                          <div className="text-[11px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                            Andre oppgaver
                          </div>
                        )}
                        {rootDocs.map(doc => {
                          const isSelected = selectedDocId === doc.id;
                          return (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => setSelectedDocId(doc.id)}
                              className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                isSelected 
                                  ? 'bg-indigo-600 text-white shadow-xs' 
                                  : 'hover:bg-slate-100 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                                <div className="truncate">
                                  <p className="text-xs font-bold truncate leading-tight">{doc.title}</p>
                                  {doc.subtitle && (
                                    <p className={`text-[10px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                      {doc.subtitle}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Handlingsvalg: Flett eller erstatt */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Innsettingsmåte
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTransferMode('merge')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      transferMode === 'merge'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-medium'
                        : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ListPlus className={`w-4 h-4 shrink-0 mt-0.5 ${transferMode === 'merge' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <div className="text-xs">
                      <strong className="block text-slate-900 font-bold mb-0.5">Flett inn i litteraturlisten</strong>
                      <span className="text-[11px] text-slate-500 leading-snug">
                        Beholder eksisterende kilder, fjerner duplikater og sorterer alt alfabetisk (APA 7).
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTransferMode('replace')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      transferMode === 'replace'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-medium'
                        : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 shrink-0 mt-0.5 ${transferMode === 'replace' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <div className="text-xs">
                      <strong className="block text-slate-900 font-bold mb-0.5">Erstatt litteraturliste</strong>
                      <span className="text-[11px] text-slate-500 leading-snug">
                        Erstatter kun kildeliste-delen med disse {selectedSources.length} valgte kildene.
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        {!transferSuccess && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 hover:text-slate-800 font-bold text-xs cursor-pointer"
            >
              Avbryt
            </button>

            <button
              type="button"
              onClick={handleExecuteTransfer}
              disabled={!selectedDocId || selectedSources.length === 0 || isTransferring}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              {isTransferring ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Overfører kilder...</span>
                </>
              ) : (
                <>
                  <span>Overfør {selectedSources.length} kilder nå</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
