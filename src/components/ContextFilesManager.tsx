import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  FolderPlus, 
  Folder, 
  FolderOpen,
  FileText, 
  ChevronRight, 
  Search, 
  LayoutGrid, 
  List,
  Trash2,
  Upload,
  Loader2,
  X,
  FileSearch,
  ArrowRight,
  Move,
  Lock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { formatBytes } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { db, auth } from '../firebase';
import { extractTextFromPdf } from '../lib/pdfUtils';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc,
  serverTimestamp,
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

export const ContextFilesManager: React.FC<{ isGuest?: boolean, pricingTier: string }> = ({ isGuest = false, pricingTier }) => {
  const [items, setItems] = useState<ContextFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<ContextFile | null>(null);
  
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
    
    const existingFiles = items.filter(it => it.type === 'file');
    const totalCurrentSize = existingFiles.reduce((acc, item) => acc + (item.size || 0), 0);
    
    const quotaMap: Record<string, number> = {
      'free': 0, // Handled by file count
      'monthly': 20 * 1024 * 1024,
      'semester': 100 * 1024 * 1024,
      'yearly': 100 * 1024 * 1024,
      'preview': 100 * 1024 * 1024
    };
    const maxQuota = quotaMap[pricingTier] || 50 * 1024 * 1024;
    
    setIsUploading(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.size > 10 * 1024 * 1024) {
        alert(`Filen "${file.name}" er for stor. Maksimal filstørrelse er 10 MB.`);
        continue;
      }

      if (pricingTier === 'free' && existingFiles.length >= 1) {
        alert("Som gratis-bruker kan du maksimalt ha 1 fil i arkivet. Oppgrader for å lagre mer.");
        break;
      }

      if (pricingTier !== 'free' && totalCurrentSize + file.size > maxQuota) {
        alert(`Du har nådd din lagringsgrense på ${formatBytes(maxQuota)}. Vennligst slett noen filer eller oppgrader abonnementet ditt.`);
        break;
      }

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

  const formatName = (name: string) => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  if (!user && !isGuest) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
        <Archive className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-black text-slate-900">Logg inn for å se arkiv</h2>
        <p className="text-slate-500 text-sm">Du må være logget inn for å administrere dine kontekst-filer.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 md:space-y-8 px-4 md:px-8 pb-32 pt-2 overflow-x-hidden">
      <AnimatePresence>
        {movingItemId && (
          <motion.div key="ap-auto-117-1" 
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
      <div className="flex flex-row items-center justify-between gap-3 bg-slate-900 p-3 md:p-8 rounded-xl md:rounded-[4rem] text-white shadow-2xl relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="relative z-10 min-w-0">
          <h1 className="text-base md:text-3xl font-black italic tracking-tighter flex items-center gap-2 md:gap-4 text-white truncate">
            <Archive className="w-5 h-5 md:w-10 md:h-10 text-white shrink-0" /> Filarkiv
          </h1>
          <p className="text-slate-300 text-[8px] md:text-sm mt-0.5 uppercase tracking-[0.1em] md:tracking-[0.2em] font-bold italic truncate">Organiser din pedagogiske kontekst</p>
        </div>

        <div className="relative z-10 flex items-center shrink-0">
          <label className={cn(
            "flex items-center justify-center gap-1.5 px-3 py-2 md:px-6 md:py-3 bg-primary text-white rounded-lg md:rounded-2xl text-[9px] md:text-sm font-black uppercase tracking-widest hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 cursor-pointer active:scale-95",
            (isUploading || isGuest) && "opacity-50 cursor-not-allowed"
          )}>
            {isUploading ? <Loader2 className="w-3 h-3 md:w-5 md:h-5 animate-spin" /> : (isGuest ? <Lock className="w-3 h-3 md:w-5 md:h-5" /> : <Upload className="w-3 h-3 md:w-5 md:h-5" />)}
            <span className="hidden sm:inline">{isGuest ? 'Logg inn' : 'Last opp filer'}</span>
            <span className="sm:hidden">{isGuest ? '🔒' : 'Last opp'}</span>
            <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={isUploading || isGuest} accept=".pdf,.txt" />
          </label>
        </div>
      </div>

      {/* Navigation & Toolbar */}
      <div className="flex flex-col gap-1 md:gap-2 bg-white p-1.5 md:p-3 rounded-xl md:rounded-[2.5rem] border border-slate-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar italic flex-1">
            <button 
              onClick={() => setCurrentFolderId(null)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] md:text-xs font-bold transition-all whitespace-nowrap",
                currentFolderId === null ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              )}
            >
              Alle filer
            </button>
            {getBreadcrumbs().map((crumb, idx) => (
              <React.Fragment key={`crumb-${crumb.id}-${idx}`}>
                <ChevronRight className="w-2.5 h-2.5 text-slate-300 shrink-0" />
                <button 
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] md:text-xs font-bold transition-all whitespace-nowrap",
                    currentFolderId === crumb.id ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
          <button 
            onClick={() => !isGuest && setIsCreatingFolder(true)}
            disabled={isGuest}
            className={cn(
              "flex-shrink-0 flex items-center gap-1 px-2.5 py-1 text-[9px] md:text-xs font-bold bg-primary-light/40 rounded-md transition-all shadow-sm active:scale-95",
              isGuest ? "text-slate-400 cursor-not-allowed" : "text-primary hover:bg-primary hover:text-white"
            )}
          >
            {isGuest ? <Lock className="w-3 h-3 md:w-3.5 md:h-3.5" /> : <FolderPlus className="w-3 h-3 md:w-3.5 md:h-3.5" />} 
            <span className="hidden xs:inline">{isGuest ? 'Logg inn' : 'Ny mappe'}</span>
          </button>
        </div>

        <div className="flex flex-row items-center gap-1 w-full px-0.5">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Søk i arkivet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-50 rounded-md text-[10px] md:text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-md border border-slate-50 shrink-0">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-1 rounded-md transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-primary" : "text-slate-400")}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn("p-1 rounded-md transition-all", viewMode === 'list' ? "bg-white shadow-sm text-primary" : "text-slate-400")}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Folders & Filles */}
      <div className="space-y-3 md:space-y-6">
        {/* Quick Actions Bar (Compact on mobile) */}
        {currentFolder && (
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[9px] md:text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-1">
              <FolderOpen className="w-3 h-3 text-primary" /> {currentFolder.name}
            </h2>
          </div>
        )}

        <AnimatePresence mode="wait">
          {isCreatingFolder && (
            <motion.div key="ap-auto-118-1" 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border-2 border-dashed border-primary/20 shadow-xl shadow-primary/5 flex flex-col md:flex-row items-center gap-3 md:gap-4"
            >
              <div className="p-3 md:p-4 bg-primary-light/50 rounded-xl md:rounded-2xl text-primary">
                <FolderPlus className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <div className="flex-1 space-y-1 w-full text-center md:text-left">
                <h3 className="text-[10px] md:text-sm font-black text-slate-900 uppercase tracking-wider">Opprett ny mappe</h3>
                <input 
                  autoFocus
                  type="text"
                  placeholder="Mappenavn..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createFolder();
                    if (e.key === 'Escape') setIsCreatingFolder(false);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner italic"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => setIsCreatingFolder(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold hover:bg-slate-200 transition-all uppercase tracking-widest"
                >
                  Avbryt
                </button>
                <button 
                  onClick={createFolder}
                  disabled={!newFolderName.trim()}
                  className="px-6 py-2 bg-primary text-white rounded-lg text-[9px] font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 disabled:opacity-50 uppercase tracking-widest"
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
              <div key={`skeleton-${i}`} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 animate-pulse space-y-4">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded-full w-3/4"></div>
                  <div className="h-3 bg-slate-50 rounded-full w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-10 md:py-20 flex flex-col items-center justify-center text-center bg-white rounded-2xl md:rounded-[3rem] border-2 border-dashed border-slate-100 space-y-4 md:space-y-6 italic">
            <div className="bg-slate-50 p-6 md:p-8 rounded-full">
              <FileSearch className="w-8 h-8 md:w-12 md:h-12 text-slate-200" />
            </div>
            <div className="space-y-1 md:space-y-2 px-6">
              <h3 className="text-sm md:text-xl font-black text-slate-900 uppercase">Ingen filer funnet</h3>
              <p className="text-slate-500 text-[10px] md:text-sm max-w-xs mx-auto">Denne mappen er tom. Last opp dokumenter eller opprett mapper for å organisere innholdet ditt.</p>
            </div>
          </div>
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6" 
              : "flex flex-col gap-2 md:gap-3",
            "w-full min-w-0"
          )}>
            {/* Show Folders First */}
            {filteredItems.filter(i => i.type === 'folder').map(folder => (
              <motion.div 
                layout
                key={`folder-${folder.id || Math.random()}`}
                onClick={() => setCurrentFolderId(folder.id)}
                className={cn(
                  "group relative bg-white border border-slate-50 transition-all cursor-pointer active:scale-98 shadow-sm w-full overflow-hidden",
                  viewMode === 'grid' 
                    ? "p-3 md:p-6 rounded-xl md:rounded-[2.5rem] hover:border-amber-200 hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-1" 
                    : "py-1.5 px-2 rounded-lg flex items-center justify-between hover:border-amber-200"
                )}
              >
                <div className={cn(
                  "flex items-center gap-2 md:gap-4 min-w-0 flex-1", 
                  viewMode === 'grid' ? "flex-col text-center" : "flex-row"
                )}>
                  <div className={cn(
                    "bg-amber-50 text-amber-500 rounded-lg md:rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm shrink-0",
                    viewMode === 'grid' ? "p-3 md:p-4" : "p-1.5"
                  )}>
                    <Folder className={cn(viewMode === 'grid' ? "w-6 h-6 md:w-8 md:h-8" : "w-3.5 h-3.5", "fill-current")} />
                  </div>
                  <div className={cn("space-y-0 text-left min-w-0 flex-1 overflow-hidden", viewMode === 'grid' && "text-center space-y-0.5")}>
                    <h4 className={cn(
                      "font-black text-slate-800 tracking-tight truncate w-full block",
                      viewMode === 'grid' ? "text-xs md:text-sm" : "text-[11px] md:text-sm max-w-[calc(100vw-150px)]"
                    )}>
                      {formatName(folder.name)}
                    </h4>
                    <p className="text-[7px] md:text-[10px] font-bold text-slate-400 tracking-widest italic truncate uppercase w-full block">
                      Mappe • {items.filter(i => i.folderId === folder.id).length} elementer
                    </p>
                  </div>
                </div>

                <div className={cn(
                  "flex gap-1 transition-opacity shrink-0",
                  viewMode === 'grid' ? "absolute top-2 right-2 md:top-4 md:right-4 opacity-70 md:opacity-0 md:group-hover:opacity-100" : "opacity-100",
                  isGuest && "hidden"
                )}>
                  <button 
                    onClick={(e) => {
                      if (isGuest) return;
                      e.stopPropagation();
                      setMovingItemId(folder.id);
                    }}
                    disabled={isGuest}
                    className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                    title="Flytt mappe"
                  >
                    <Move className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => !isGuest && deleteItem(folder.id, e)}
                    disabled={isGuest}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Slett mappe"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Show Files */}
            {filteredItems.filter(i => i.type === 'file').map(file => (
              <motion.div 
                layout
                key={`file-${file.id || Math.random()}`}
                onClick={() => setSelectedFile(file)}
                className={cn(
                  "group relative bg-white border border-slate-50 transition-all cursor-pointer active:scale-98 shadow-sm w-full overflow-hidden",
                  viewMode === 'grid' 
                    ? "p-3 md:p-6 rounded-xl md:rounded-[2.5rem] hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1" 
                    : "py-1.5 px-2 rounded-lg flex items-center justify-between hover:border-primary/20"
                )}
              >
                <div className={cn(
                  "flex items-center gap-2 md:gap-4 min-w-0 flex-1", 
                  viewMode === 'grid' ? "flex-col text-center" : "flex-row"
                )}>
                  <div className={cn(
                    "bg-primary-light/30 text-primary rounded-lg md:rounded-2xl group-hover:bg-primary group-hover:text-white transition-all shadow-sm shrink-0",
                    viewMode === 'grid' ? "p-3 md:p-4" : "p-1.5"
                  )}>
                    <FileText className={cn(viewMode === 'grid' ? "w-6 h-6 md:w-8 md:h-8" : "w-3.5 h-3.5")} />
                  </div>
                  <div className={cn("space-y-0 text-left min-w-0 flex-1 overflow-hidden", viewMode === 'grid' && "text-center space-y-0.5")}>
                    <h4 className={cn(
                      "font-black text-slate-800 tracking-tight truncate w-full block",
                      viewMode === 'grid' ? "text-xs md:text-sm" : "text-[11px] md:text-sm max-w-[calc(100vw-150px)]"
                    )}>
                      {formatName(file.name)}
                    </h4>
                    <p className="text-[7px] md:text-[10px] font-bold text-slate-400 tracking-widest italic truncate uppercase w-full block">
                      Fil {file.size ? `• ${formatBytes(file.size)}` : ''}
                    </p>
                  </div>
                </div>

                <div className={cn(
                  "flex gap-1 transition-opacity shrink-0",
                  viewMode === 'grid' ? "absolute top-2 right-2 md:top-4 md:right-4 opacity-70 md:opacity-0 md:group-hover:opacity-100" : "opacity-100",
                  isGuest && "hidden"
                )}>
                  <button 
                    onClick={(e) => {
                      if (isGuest) return;
                      e.stopPropagation();
                      setMovingItemId(file.id);
                    }}
                    disabled={isGuest}
                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary-light rounded-lg transition-all"
                    title="Flytt fil"
                  >
                    <Move className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => !isGuest && deleteItem(file.id, e)}
                    disabled={isGuest}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Slett fil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {(viewMode === 'grid' || true) && (
                  <div className={cn(
                    "mt-3 pt-3 border-t border-slate-50 flex items-center justify-center transition-all",
                    viewMode === 'grid' ? "md:opacity-0 md:group-hover:opacity-100" : "hidden"
                  )}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(file);
                      }}
                      className="text-[9px] md:text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all p-1"
                    >
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

      {/* File Content Preview Modal */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div key="ap-auto-119-1" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary-light/50 text-primary rounded-2xl shadow-sm">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 italic tracking-tight">{selectedFile.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Dokumentvisning</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedFile(null)}
                  className="p-3 hover:bg-white hover:shadow-md text-slate-400 hover:text-slate-900 rounded-2xl transition-all border border-transparent hover:border-slate-100"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white no-scrollbar">
                <div className="prose prose-slate max-w-none">
                  <div className="bg-slate-50/50 p-6 md:p-8 rounded-[2rem] border border-slate-100 italic text-slate-700 leading-relaxed font-medium">
                    <ReactMarkdown>{selectedFile.content || "_Ingen tekstinnhold funnet i denne filen._"}</ReactMarkdown>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(selectedFile.content);
                  }}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                >
                  Kopier tekst
                </button>
                <button 
                  onClick={() => setSelectedFile(null)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
                >
                  Lukk
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Card */}
      <div className="bg-primary-light/10 p-4 md:p-8 rounded-2xl md:rounded-[3rem] border border-primary-light flex flex-col md:flex-row items-center gap-3 md:gap-6 shadow-sm italic">
        <div className="p-2 md:p-4 bg-white rounded-xl md:rounded-2xl shadow-sm text-primary shrink-0">
          <FileSearch className="w-5 h-5 md:w-8 md:h-8" />
        </div>
        <div className="space-y-0.5 md:space-y-1 text-center md:text-left">
          <h3 className="text-[10px] md:text-sm font-black text-primary-dark uppercase tracking-wider">Hva er kontekst-filer?</h3>
          <p className="text-[9px] md:text-xs text-primary-dark/70 leading-relaxed font-bold">
            Kontekst-filer er dokumenter du laster opp (f.eks. årsplaner, rammeplaner eller egne observasjoner) som AI-en bruker som referansegrunnlag. Ved å organisere dem i mapper, kan du enkelt bytte mellom ulike temaer eller semestre.
          </p>
        </div>
      </div>
    </div>
  );
};
