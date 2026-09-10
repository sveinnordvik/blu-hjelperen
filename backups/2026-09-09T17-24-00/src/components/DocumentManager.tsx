import React, { useState } from 'react';
import { 
  Library, 
  Plus, 
  FolderPlus, 
  Folder, 
  FileText, 
  ChevronRight, 
  Lock, 
  Search, 
  Trash2,
  Archive,
  Clock,
  LayoutGrid,
  List
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface AppDocument {
  id: string;
  title: string;
  content: Record<string, string>;
  outline: any[];
  folderId: string | null;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
  updatedAt: string;
}

interface DocumentManagerProps {
  user: any;
  pricingTier: string;
  documents: AppDocument[];
  folders: Folder[];
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  activeDocumentId: string | null;
  setActiveDocumentId: (id: string) => void;
  setActiveTab: (tab: any) => void;
  createNewDocument: (title?: string, folderId?: string | null) => void;
  setShowPaywall: (show: boolean) => void;
  deleteDocument: (id: string) => void;
  renameDocument: (id: string, title: string) => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  user,
  pricingTier,
  documents,
  folders,
  setFolders,
  activeDocumentId,
  setActiveDocumentId,
  setActiveTab,
  createNewDocument,
  setShowPaywall,
  deleteDocument,
  renameDocument
}) => {
  const isGuest = !user;
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const isYearly = pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview';
  
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolderId ? doc.folderId === selectedFolderId : true;
    return matchesSearch && matchesFolder;
  });

  const handleCreateFolder = () => {
    if (!isYearly) {
      setShowPaywall(true);
      return;
    }
    setIsCreatingFolder(true);
  };

  const confirmCreateFolder = () => {
    if (newFolderName.trim()) {
      setFolders(prev => [...prev, { 
        id: Date.now().toString(), 
        name: newFolderName.trim(), 
        updatedAt: new Date().toISOString() 
      }]);
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-8 max-w-6xl mx-auto py-4 md:py-8 px-3 md:px-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3 italic">
            <Archive className="w-8 h-8 text-primary" /> Dokumentarkiv
          </h2>
          <p className="text-slate-500 text-sm mt-1">Administrer, organiser og finn dine akademiske arbeider.</p>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => handleCreateFolder()}
            disabled={isGuest || !isYearly}
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-3.5 md:py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs md:text-sm font-bold hover:bg-slate-100 transition-all active:scale-95",
              (isGuest || !isYearly) && "opacity-50 cursor-not-allowed"
            )}
          >
            <FolderPlus className="w-4 h-4 text-primary" /> {isGuest ? '🔒 Ny mappe' : (!isYearly ? '🔒 Krever Årsabonnement' : 'Ny mappe')}
          </button>
          <button 
            onClick={() => createNewDocument()}
            disabled={isGuest}
            className={cn(
              "flex items-center justify-center gap-2 px-8 py-3.5 md:py-2.5 bg-primary text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest hover:bg-primary-hover transition-all shadow-lg shadow-primary-light active:scale-95",
              isGuest && "opacity-50 cursor-not-allowed shadow-none"
            )}
          >
            <Plus className="w-5 h-5" /> {isGuest ? '🔒 Logg inn' : 'Nytt dokument'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8 lg:items-start">
        {/* Sidebar: Folders & Filters */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between px-1">
              Dine Mapper
              {!isYearly && <Lock className="w-3 h-3 text-amber-500" />}
            </h3>
            <div className="flex md:flex-col gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
              <button 
                onClick={() => setSelectedFolderId(null)}
                className={cn(
                  "flex-shrink-0 md:w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  selectedFolderId === null ? "bg-primary text-white shadow-md shadow-primary-light" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                )}
              >
                <div className="flex items-center gap-3">
                  <Library className="w-4 h-4" /> Alle
                </div>
                <span className={cn("text-[9px] font-black ml-2", selectedFolderId === null ? "text-white/70" : "text-slate-400")}>{documents.length}</span>
              </button>
              
              {folders.map(folder => (
                <button 
                  key={`folder-${folder.id || Math.random()}`}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={cn(
                    "flex-shrink-0 md:w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                    selectedFolderId === folder.id ? "bg-primary text-white shadow-md shadow-primary-light" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Folder className="w-4 h-4" /> {folder.name}
                  </div>
                  <span className={cn("text-[9px] font-black ml-2", selectedFolderId === folder.id ? "text-white/70" : "text-slate-400")}>
                    {documents.filter(d => d.folderId === folder.id).length}
                  </span>
                </button>
              ))}

              {isCreatingFolder && (
                <div className="mt-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <input 
                    autoFocus
                    type="text"
                    placeholder="Mappenavn..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmCreateFolder();
                      if (e.key === 'Escape') setIsCreatingFolder(false);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button 
                      onClick={confirmCreateFolder}
                      className="flex-1 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary-hover transition-all"
                    >
                      Opprett
                    </button>
                    <button 
                      onClick={() => setIsCreatingFolder(false)}
                      className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-50 transition-all"
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              )}

              {!isYearly && (
                <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                    Oppgrader til <strong>Årsabonnement</strong> for å organisere dokumentene dine i mapper.
                  </p>
                  <button 
                    onClick={() => setActiveTab('pricing')}
                    className="mt-2 text-[10px] font-bold text-amber-900 underline"
                  >
                    Se planer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content: Documents List */}
        <div className="md:col-span-3 space-y-4 md:space-y-6">
          {/* Search & View Controls */}
          <div className="flex flex-row items-center justify-between gap-3 bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Søk i dokumenter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 shrink-0">
              <button 
                onClick={() => setViewMode('list')}
                className={cn("p-2 rounded-md transition-all", viewMode === 'list' ? "bg-white shadow-sm text-primary" : "text-slate-400")}
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={cn("p-2 rounded-md transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-primary" : "text-slate-400")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Documents Grid/List */}
          <div className={cn(
            viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"
          )}>
            {filteredDocuments.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-dashed border-slate-200 italic p-6">
                <div className="bg-slate-50 p-6 rounded-full mb-4">
                  <FileText className="w-10 h-10 text-slate-200" />
                </div>
                <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">Ingen dokumenter funnet</h4>
                <p className="text-xs text-slate-500 max-w-xs mt-2 font-medium">Prøv et annet søkeord eller opprett et nytt dokument for å komme i gang.</p>
              </div>
            ) : (
              filteredDocuments.map(doc => (
                <motion.div 
                  layout
                  key={doc.id}
                  onClick={() => {
                    setActiveDocumentId(doc.id);
                    setActiveTab('writing-workshop');
                  }}
                  className={cn(
                    "group relative bg-white border border-slate-100 transition-all cursor-pointer active:scale-98",
                    viewMode === 'grid' 
                      ? "p-4 md:p-6 rounded-[2rem] hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5" 
                      : "p-3 md:p-4 rounded-xl md:rounded-2xl flex items-center justify-between hover:border-primary/30"
                  )}
                >
                  <div className={cn("flex items-center gap-3 md:gap-4", viewMode === 'grid' && "flex-col text-center mb-4")}>
                    <div className="p-2.5 md:p-3 bg-primary-light/30 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                      <FileText className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className={cn("min-w-0 flex-1", viewMode === 'grid' && "text-center")}>
                      <h4 className="font-black text-slate-800 group-hover:text-primary transition-colors text-xs md:text-sm truncate leading-tight">{doc.title}</h4>
                      <div className={cn("flex items-center gap-2 mt-1", viewMode === 'grid' && "justify-center")}>
                        <span className="flex items-center gap-1 text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" /> {new Date(doc.updatedAt).toLocaleDateString()}
                        </span>
                        {doc.folderId && (
                          <span className="flex items-center gap-1 text-[8px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md truncate">
                            <Folder className="w-2 h-2" /> {folders.find(f => f.id === doc.folderId)?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {viewMode === 'grid' && (
                    <div className="pt-3 md:pt-4 border-t border-slate-50 flex items-center justify-between mt-auto">
                      <span className="text-[8px] md:text-[9px] font-black text-slate-300 uppercase tracking-widest">Akademisk tekst</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 md:opacity-0 group-hover:opacity-100 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  )}

                  {viewMode === 'list' && (
                    <div className="flex items-center gap-2 md:gap-4 shrink-0">
                      <div className="hidden sm:flex flex-col items-end mr-2 italic">
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">Sist endret</span>
                        <span className="text-[10px] font-black text-slate-500">{new Date(doc.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  )}

                  {/* Actions Menu */}
                  <div className={cn(
                    "absolute transition-opacity",
                    viewMode === 'grid' ? "top-2 right-2 md:top-4 md:right-4 opacity-70 md:opacity-0 md:group-hover:opacity-100" : "top-1/2 -translate-y-1/2 right-12 opacity-70 md:opacity-0 md:group-hover:opacity-100"
                  )}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isGuest) return;
                        if (confirm('Er du sikker på at du vil slette dette dokumentet?')) {
                          deleteDocument(doc.id);
                        }
                      }}
                      disabled={isGuest}
                      className={cn(
                        "p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all",
                        isGuest && "opacity-30 cursor-not-allowed"
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
