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
  Filter, 
  MoreVertical, 
  Trash2, 
  Edit3,
  Archive,
  Clock,
  LayoutGrid,
  List
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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
    <div className="flex flex-col gap-8 max-w-6xl mx-auto py-8 px-4">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Archive className="w-8 h-8 text-primary" /> Dokumentarkiv
          </h2>
          <p className="text-slate-500 mt-1">Administrer, organiser og finn dine akademiske arbeider.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleCreateFolder()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
          >
            <FolderPlus className="w-4 h-4 text-primary" /> Ny mappe
          </button>
          <button 
            onClick={() => createNewDocument()}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary-light"
          >
            <Plus className="w-5 h-5" /> Nytt dokument
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Folders & Filters */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
              Mapper
              {!isYearly && <Lock className="w-3 h-3" />}
            </h3>
            <div className="space-y-1">
              <button 
                onClick={() => setSelectedFolderId(null)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                  selectedFolderId === null ? "bg-primary-light/20 text-primary" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Library className="w-4 h-4" /> Alle dokumenter
                </div>
                <span className="text-[10px] opacity-60">{documents.length}</span>
              </button>
              
              {folders.map(folder => (
                <button 
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                    selectedFolderId === folder.id ? "bg-primary-light/20 text-primary" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Folder className="w-4 h-4" /> {folder.name}
                  </div>
                  <span className="text-[10px] opacity-60">
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
        <div className="lg:col-span-3 space-y-6">
          {/* Search & View Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Søk i dokumenter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <button 
                onClick={() => setViewMode('list')}
                className={cn("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-white shadow-sm text-primary" : "text-slate-400")}
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={cn("p-1.5 rounded-md transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-primary" : "text-slate-400")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Documents Grid/List */}
          <div className={cn(
            viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-3"
          )}>
            {filteredDocuments.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
                <div className="bg-slate-50 p-6 rounded-full mb-4">
                  <FileText className="w-10 h-10 text-slate-200" />
                </div>
                <h4 className="font-bold text-slate-900">Ingen dokumenter funnet</h4>
                <p className="text-sm text-slate-500 max-w-xs mt-1">Prøv et annet søkeord eller opprett et nytt dokument for å komme i gang.</p>
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
                    "group relative bg-white border transition-all cursor-pointer",
                    viewMode === 'grid' 
                      ? "p-6 rounded-[2rem] hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5" 
                      : "p-4 rounded-2xl flex items-center justify-between hover:border-primary/30"
                  )}
                >
                  <div className={cn("flex items-center gap-4", viewMode === 'grid' && "mb-4")}>
                    <div className="p-3 bg-primary-light/30 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-all">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 group-hover:text-primary transition-colors">{doc.title}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <Clock className="w-3 h-3" /> {new Date(doc.updatedAt).toLocaleDateString()}
                        </span>
                        {doc.folderId && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                            <Folder className="w-2.5 h-2.5" /> {folders.find(f => f.id === doc.folderId)?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {viewMode === 'grid' && (
                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Akademisk tekst</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  )}

                  {viewMode === 'list' && (
                    <div className="flex items-center gap-4">
                      <div className="hidden md:flex flex-col items-end mr-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sist endret</span>
                        <span className="text-xs font-bold text-slate-600">{new Date(doc.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  )}

                  {/* Actions Menu (Simplified for now) */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Er du sikker på at du vil slette dette dokumentet?')) {
                          deleteDocument(doc.id);
                        }
                      }}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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
