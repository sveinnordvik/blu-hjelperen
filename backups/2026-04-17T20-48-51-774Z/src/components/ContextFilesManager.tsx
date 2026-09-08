import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  FolderPlus, 
  Folder, 
  FileText, 
  ChevronRight, 
  Search, 
  LayoutGrid, 
  List,
  Plus,
  Trash2,
  Edit3,
  MoreVertical,
  ChevronLeft,
  Upload,
  Loader2,
  X,
  FileSearch,
  CheckCircle2,
  ArrowRight,
  Move
} from 'lucide-react';
import { cn } from '../lib/utils';
import { formatBytes } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { extractTextFromPdf } from '../lib/pdfUtils';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc,
  serverTimestamp,
  Timestamp,
  orderBy
} from 'firebase/firestore';

interface ContextFile {
  id: string;
  name: string;
  content: string;
  folderId: string | null;
  type: 'file' | 'folder';
  userId: string;
  size?: number;
  updatedAt: any;
}

export const ContextFilesManager: React.FC = () => {
  const [items, setItems] = useState<ContextFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'context_files'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContextFile[];
      setItems(newItems);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    
    setIsUploading(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        let content = '';
        if (file.type === 'application/pdf') {
          content = await extractTextFromPdf(file);
        } else {
          content = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.readAsText(file);
          });
        }

        if (content) {
          await addDoc(collection(db, 'context_files'), {
            name: file.name,
            content: content.slice(0, 500000), // Increased cap
            folderId: currentFolderId,
            type: 'file',
            userId: user.uid,
            size: file.size,
            updatedAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.error("Upload error:", error);
      }
    }
    
    setIsUploading(false);
    e.target.value = ''; // Reset input
  };

  const createFolder = async () => {
    if (!newFolderName.trim() || !user) return;
    
    try {
      await addDoc(collection(db, 'context_files'), {
        name: newFolderName.trim(),
        content: '',
        folderId: currentFolderId,
        type: 'folder',
        userId: user.uid,
        updatedAt: serverTimestamp()
      });
      setNewFolderName('');
      setIsCreatingFolder(false);
    } catch (error) {
      console.error("Folder creation error:", error);
    }
  };

  const deleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Er du sikker på at du vil slette dette elementet?')) return;
    
    try {
      await deleteDoc(doc(db, 'context_files', id));
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const moveItem = async (folderId: string | null) => {
    if (!movingItemId) return;
    try {
      await updateDoc(doc(db, 'context_files', movingItemId), {
        folderId: folderId,
        updatedAt: serverTimestamp()
      });
      setMovingItemId(null);
    } catch (error) {
      console.error("Move error:", error);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = item.folderId === currentFolderId;
    return matchesSearch && matchesFolder;
  });

  const currentFolder = items.find(i => i.id === currentFolderId);

  const getBreadcrumbs = () => {
    const crumbs = [];
    let curr = currentFolder;
    while (curr) {
      crumbs.unshift(curr);
      curr = items.find(i => i.id === curr?.folderId);
    }
    return crumbs;
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
        <Archive className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-black text-slate-900">Logg inn for å se arkiv</h2>
        <p className="text-slate-500 text-sm">Du må være logget inn for å administrere dine kontekst-filer.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 md:px-8 pb-32">
      <AnimatePresence>
        {movingItemId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900 italic">Flytt til...</h3>
                  <button onClick={() => setMovingItemId(null)} className="p-2 hover:bg-slate-100 rounded-full">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar pr-2">
                  <button 
                    onClick={() => moveItem(null)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-primary-light/30 transition-all font-bold text-slate-700 text-sm"
                  >
                    <Archive className="w-5 h-5 text-primary" /> Hovedarkiv
                  </button>
                  {items.filter(i => i.type === 'folder' && i.id !== movingItemId).map((folder, fIdx) => (
                    <button 
                      key={`moveto-${folder.id}-${fIdx}`}
                      onClick={() => moveItem(folder.id)}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-primary-light/30 transition-all font-bold text-slate-700 text-sm"
                    >
                      <Folder className="w-5 h-5 text-amber-500" /> {folder.name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black italic tracking-tight flex items-center gap-4">
            <Archive className="w-10 h-10 text-primary" /> Filarkiv
          </h1>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-bold">Organiser din pedagogiske kontekst</p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <label className={cn(
            "flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 cursor-pointer",
            isUploading && "opacity-50 cursor-not-allowed"
          )}>
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            Last opp filer
            <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={isUploading} accept=".pdf,.txt" />
          </label>
        </div>
      </div>

      {/* Navigation & Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full italic px-2">
          <button 
            onClick={() => setCurrentFolderId(null)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
              currentFolderId === null ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Alle filer
          </button>
          {getBreadcrumbs().map((crumb, idx) => (
            <React.Fragment key={`crumb-${crumb.id}-${idx}`}>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              <button 
                onClick={() => setCurrentFolderId(crumb.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  currentFolderId === crumb.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto px-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Søk i arkivet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-primary" : "text-slate-400")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white shadow-sm text-primary" : "text-slate-400")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Folders & Filles */}
      <div className="space-y-6">
        {/* Quick Actions Bar */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest px-2">
            {currentFolder ? currentFolder.name : 'Hovedarkiv'}
          </h2>
          <button 
            onClick={() => setIsCreatingFolder(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-primary bg-primary-light/30 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
          >
            <FolderPlus className="w-4 h-4" /> Ny mappe
          </button>
        </div>

        <AnimatePresence mode="wait">
          {isCreatingFolder && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-[2rem] border-2 border-dashed border-primary/20 shadow-xl shadow-primary/5 flex flex-col md:flex-row items-center gap-4"
            >
              <div className="p-4 bg-primary-light/50 rounded-2xl text-primary">
                <FolderPlus className="w-8 h-8" />
              </div>
              <div className="flex-1 space-y-1 w-full text-center md:text-left">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Opprett ny mappe</h3>
                <input 
                  autoFocus
                  type="text"
                  placeholder="Skriv inn mappenavn..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createFolder();
                    if (e.key === 'Escape') setIsCreatingFolder(false);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner italic"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => setIsCreatingFolder(false)}
                  className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all uppercase tracking-widest shadow-sm"
                >
                  Avbryt
                </button>
                <button 
                  onClick={createFolder}
                  disabled={!newFolderName.trim()}
                  className="px-8 py-3 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 disabled:opacity-50 uppercase tracking-widest"
                >
                  Opprett
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 animate-pulse space-y-4">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded-full w-3/4"></div>
                  <div className="h-3 bg-slate-50 rounded-full w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 space-y-6 italic">
            <div className="bg-slate-50 p-8 rounded-full">
              <FileSearch className="w-12 h-12 text-slate-200" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 uppercase">Ingen filer funnet</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">Denne mappen er tom. Last opp dokumenter eller opprett mapper for å organisere innholdet ditt.</p>
            </div>
          </div>
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6" 
              : "flex flex-col gap-3"
          )}>
            {/* Show Folders First */}
            {filteredItems.filter(i => i.type === 'folder').map(folder => (
              <motion.div 
                layout
                key={folder.id}
                onClick={() => setCurrentFolderId(folder.id)}
                className={cn(
                  "group relative bg-white border border-slate-100 transition-all cursor-pointer",
                  viewMode === 'grid' 
                    ? "p-6 rounded-[2.5rem] hover:border-amber-200 hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-1" 
                    : "p-4 rounded-2xl flex items-center justify-between hover:border-amber-200"
                )}
              >
                <div className={cn("flex items-center gap-4", viewMode === 'grid' && "flex-col text-center")}>
                  <div className="p-4 bg-amber-50 text-amber-500 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
                    <Folder className="w-8 h-8 fill-current" />
                  </div>
                  <div className={cn("space-y-1 text-left", viewMode === 'grid' && "text-center")}>
                    <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm truncate max-w-[150px]">{folder.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Mappe • {items.filter(i => i.folderId === folder.id).length} elementer</p>
                  </div>
                </div>

                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setMovingItemId(folder.id);
                    }}
                    className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                    title="Flytt mappe"
                  >
                    <Move className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => deleteItem(folder.id, e)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Slett mappe"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Show Files */}
            {filteredItems.filter(i => i.type === 'file').map(file => (
              <motion.div 
                layout
                key={file.id}
                className={cn(
                  "group relative bg-white border border-slate-100 transition-all",
                  viewMode === 'grid' 
                    ? "p-6 rounded-[2.5rem] hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1" 
                    : "p-4 rounded-2xl flex items-center justify-between hover:border-primary/20"
                )}
              >
                <div className={cn("flex items-center gap-3 md:gap-4", viewMode === 'grid' && "flex-col text-center")}>
                  <div className="p-3 md:p-4 bg-primary-light/30 text-primary rounded-2xl group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                    <FileText className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <div className={cn("space-y-1 text-left", viewMode === 'grid' && "md:text-center")}>
                    <h4 className="font-black text-slate-800 uppercase tracking-tight text-xs md:text-sm truncate max-w-[120px] md:max-w-[150px]">{file.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                      Dokument {file.size ? `• ${formatBytes(file.size)}` : ''}
                    </p>
                  </div>
                </div>

                <div className="absolute top-2 right-2 md:top-4 md:right-4 flex gap-0.5 md:gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setMovingItemId(file.id);
                    }}
                    className="p-1.5 md:p-2 text-slate-300 hover:text-primary hover:bg-primary-light rounded-xl transition-all"
                    title="Flytt fil"
                  >
                    <Move className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => deleteItem(file.id, e)}
                    className="p-1.5 md:p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Slett fil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {viewMode === 'grid' && (
                  <div className="mt-4 md:mt-6 pt-4 border-t border-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <button className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                      Se innhold <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )
        }
      </div>

      {/* Info Card */}
      <div className="bg-primary-light/20 p-6 md:p-8 rounded-[3rem] border border-primary-light flex flex-col md:flex-row items-center gap-6 shadow-sm italic">
        <div className="p-4 bg-white rounded-2xl shadow-sm text-primary">
          <FileSearch className="w-8 h-8" />
        </div>
        <div className="space-y-2 text-center md:text-left">
          <h3 className="text-sm font-black text-primary-dark uppercase tracking-wider">Hva er kontekst-filer?</h3>
          <p className="text-xs text-primary-dark/70 leading-relaxed font-medium">
            Kontekst-filer er dokumenter du laster opp (f.eks. årsplaner, rammeplaner eller egne observasjoner) som AI-en bruker som referansegrunnlag når den analyserer din pedagogiske praksis. Ved å organisere dem i mapper, kan du enkelt bytte mellom ulike temaer eller semestre.
          </p>
        </div>
      </div>
    </div>
  );
};
