import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical, 
  Pin, 
  PinOff, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  FileText, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Folder, 
  FolderOpen, 
  FolderPlus, 
  ChevronDown, 
  ArrowLeft, 
  StickyNote, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  Search, 
  Copy, 
  Palette, 
  Download,
  Archive,
  ArchiveRestore,
  Inbox,
  Brain,
  Sparkles
} from 'lucide-react';

export interface FolderType {
  id: string;
  name: string;
  color?: string; // 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan'
  isArchived?: boolean; // Arkiv-flagg
  isExpanded?: boolean;
  customContext?: string; // Felles KI-mappekontekst
  focusArea?: string;
}

export const FOLDER_COLORS = [
  { id: 'indigo', name: 'Indigo', text: 'text-indigo-400', bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', dot: 'bg-indigo-500' },
  { id: 'emerald', name: 'Grønn (Praksis)', text: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  { id: 'amber', name: 'Gull (Notater)', text: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  { id: 'rose', name: 'Rød (Viktig / Eksamen)', text: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/30', dot: 'bg-rose-500' },
  { id: 'purple', name: 'Lilla (Teori)', text: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30', dot: 'bg-purple-500' },
  { id: 'cyan', name: 'Cyan (Faglitteratur)', text: 'text-cyan-400', bg: 'bg-cyan-500/15', border: 'border-cyan-500/30', dot: 'bg-cyan-500' },
];

export interface HistoryItem {
  id: string;
  title: string;
  subtitle?: string;
  isPinned?: boolean;
  isArchived?: boolean; // Arkiv-flagg
  icon?: React.ReactNode;
  hideActions?: boolean;
  folderId?: string; // Mappetilknytning
  [key: string]: any;
}

export interface WorkspaceContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  openMobileArchive: () => void;
  closeMobileArchive: () => void;
}

export const WorkspaceContext = React.createContext<WorkspaceContextType>({
  isCollapsed: false,
  setIsCollapsed: () => {},
  toggleCollapsed: () => {},
  openMobileArchive: () => {},
  closeMobileArchive: () => {},
});

export const useWorkspace = () => React.useContext(WorkspaceContext);

export interface WorkspaceLayoutProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actionButtonLabel: string;
  onActionClick: () => void;
  secondaryActionButtonLabel?: string;
  onSecondaryActionClick?: () => void;
  secondaryActionButtonIcon?: React.ReactNode;
  historyItems?: HistoryItem[];
  folders?: FolderType[];
  activeItemId?: string | null;
  historySectionTitle?: string;
  onItemClick: (id: string) => void;
  onPinItem?: (id: string, isPinned: boolean) => void;
  onRenameItem?: (id: string, newTitle: string) => void;
  onDuplicateItem?: (id: string) => void; // Kloning / duplisering
  onArchiveItem?: (id: string, isArchived: boolean) => void; // Arkiveringsstatus for element
  onDeleteItem?: (id: string) => void;
  onAddFolder?: () => void; // Opprett ny mappe
  onMoveToFolder?: (documentId: string, folderId: string | undefined) => void;
  onDeleteFolder?: (folderId: string) => void; // Slett mappe
  onRenameFolder?: (folderId: string, newName: string) => void; // Endre mappenavn
  onUpdateFolderColor?: (folderId: string, color: string) => void; // Endre fargekode
  onArchiveFolder?: (folderId: string, isArchived: boolean) => void; // Arkiver mappe
  onExportFolder?: (folderId: string) => void; // Eksporter hele mappen
  onEditFolderContext?: (folderId: string) => void; // KI-føringer & kontekst for mappen
  onReorderFolders?: (newFolders: FolderType[]) => void; // Manuell/alfabetisk omorganisering
  onBackToTools?: () => void; // Retur til verktøykasse
  backToToolsLabel?: string;
  children: React.ReactNode | ((props: { isCollapsed: boolean; toggleCollapsed: () => void; openMobileArchive: () => void }) => React.ReactNode);
}

export function WorkspaceLayout({ 
  title, 
  subtitle, 
  icon,
  actionButtonLabel, 
  onActionClick, 
  secondaryActionButtonLabel,
  onSecondaryActionClick,
  secondaryActionButtonIcon,
  historyItems = [], 
  folders = [],
  activeItemId, 
  historySectionTitle,
  onItemClick, 
  onPinItem, 
  onRenameItem,
  onDuplicateItem,
  onArchiveItem,
  onDeleteItem,
  onAddFolder,
  onMoveToFolder,
  onDeleteFolder,
  onRenameFolder,
  onUpdateFolderColor,
  onArchiveFolder,
  onExportFolder,
  onEditFolderContext,
  onReorderFolders,
  onBackToTools,
  backToToolsLabel,
  children 
}: WorkspaceLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showMobileArchive, setShowMobileArchive] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Visningsfilter: 'active' (aktive oppgaver) eller 'archived' (arkiverte)
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived'>('active');

  // Mappe-operasjoner: Failsafe sletting og endring av navn / farge
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string; itemCount: number } | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');
  const [openFolderMenuId, setOpenFolderMenuId] = useState<string | null>(null);

  // Drag and drop state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);

  // Hurtigsøk i sidebaren
  const [searchQuery, setSearchQuery] = useState('');

  // Sortering av mapper (Alfabetisk A-Å, Å-A, eller Manuelt/Egendefinert)
  const sortStorageKey = `blu_foldersort_${(title || 'default').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  const [folderSortMode, setFolderSortMode] = useState<'custom' | 'az' | 'za'>(() => {
    try {
      const saved = localStorage.getItem(sortStorageKey);
      if (saved === 'az' || saved === 'za' || saved === 'custom') return saved;
    } catch {}
    return 'custom';
  });
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  const handleSetSortMode = (mode: 'custom' | 'az' | 'za') => {
    setFolderSortMode(mode);
    setIsSortMenuOpen(false);
    try {
      localStorage.setItem(sortStorageKey, mode);
    } catch {}
  };

  // State for å holde styr på hvilke mapper som er utvidet (trekkspill)
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    folders.forEach(f => {
      initialState[f.id] = f.isExpanded ?? false;
    });
    return initialState;
  });

  // Synkroniser lokal state hvis folder-propen endres
  useEffect(() => {
    if (folders.length > 0) {
      setExpandedFolders(prev => {
        const newState = { ...prev };
        folders.forEach(f => {
          if (newState[f.id] === undefined) {
            newState[f.id] = f.isExpanded ?? false;
          }
        });
        return newState;
      });
    }
  }, [folders]);

  const menuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setIsSortMenuOpen(false);
      }
      if (folderMenuRef.current && !folderMenuRef.current.contains(event.target as Node)) {
        setOpenFolderMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartRename = (item: HistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(item.id);
    setRenameValue(item.title);
    setOpenMenuId(null);
  };

  const handleSaveRename = (id: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (renameValue.trim() && onRenameItem) {
      onRenameItem(id, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleCancelRename = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRenamingId(null);
    setRenameValue('');
  };

  // Mappe-omdøping
  const handleStartRenameFolder = (folder: FolderType, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingFolderId(folder.id);
    setRenameFolderValue(folder.name);
    setOpenFolderMenuId(null);
  };

  const handleSaveRenameFolder = (id: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (renameFolderValue.trim() && onRenameFolder) {
      onRenameFolder(id, renameFolderValue.trim());
    }
    setRenamingFolderId(null);
    setRenameFolderValue('');
  };

  const handleCancelRenameFolder = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRenamingFolderId(null);
    setRenameFolderValue('');
  };

  // Manuell flytting av mapper opp/ned
  const handleMoveFolderUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index <= 0) return;
    const currentList = [...sortedFolders];
    const item = currentList[index];
    currentList.splice(index, 1);
    currentList.splice(index - 1, 0, item);
    
    if (folderSortMode !== 'custom') {
      setFolderSortMode('custom');
      try { localStorage.setItem(sortStorageKey, 'custom'); } catch {}
    }
    if (onReorderFolders) {
      onReorderFolders(currentList);
    }
  };

  const handleMoveFolderDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index >= sortedFolders.length - 1) return;
    const currentList = [...sortedFolders];
    const item = currentList[index];
    currentList.splice(index, 1);
    currentList.splice(index + 1, 0, item);

    if (folderSortMode !== 'custom') {
      setFolderSortMode('custom');
      try { localStorage.setItem(sortStorageKey, 'custom'); } catch {}
    }
    if (onReorderFolders) {
      onReorderFolders(currentList);
    }
  };

  const handleTogglePin = (item: HistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPinItem) onPinItem(item.id, !item.isPinned);
    setOpenMenuId(null);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetId = itemToDelete;
    if (targetId && onDeleteItem) {
      onDeleteItem(targetId);
    }
    setItemToDelete(null);
    setOpenMenuId(null);
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Tell antall aktive og arkiverte
  const totalActiveCount = historyItems.filter(i => !i.isArchived).length + folders.filter(f => !f.isArchived).length;
  const totalArchivedCount = historyItems.filter(i => Boolean(i.isArchived)).length + folders.filter(f => Boolean(f.isArchived)).length;

  // Filtrering basert på aktiv/arkiv status og søk
  const displayedHistoryItems = React.useMemo(() => {
    let list = historyItems.filter(item => 
      archiveFilter === 'archived' ? Boolean(item.isArchived) : !item.isArchived
    );

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item => 
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
      );
    }
    return list;
  }, [historyItems, archiveFilter, searchQuery]);

  const pinnedItems = displayedHistoryItems.filter(item => item.isPinned && archiveFilter === 'active');
  const unpinnedItems = displayedHistoryItems.filter(item => !item.isPinned || archiveFilter === 'archived');

  // Sorterte mapper basert på aktiv/arkiv og valgt modus
  const sortedFolders = React.useMemo(() => {
    let list = folders.filter(f => 
      archiveFilter === 'archived' ? Boolean(f.isArchived) : !f.isArchived
    );

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(f => 
        f.name.toLowerCase().includes(q) || 
        historyItems.some(item => item.folderId === f.id && item.title.toLowerCase().includes(q))
      );
    }
    if (folderSortMode === 'az') {
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'nb', { sensitivity: 'base' }));
    }
    if (folderSortMode === 'za') {
      return list.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'nb', { sensitivity: 'base' }));
    }
    return list; // custom / manuell rekkefølge
  }, [folders, archiveFilter, folderSortMode, searchQuery, historyItems]);

  const toggleCollapsed = () => setIsCollapsed(prev => !prev);
  const openMobileArchive = () => setShowMobileArchive(true);
  const closeMobileArchive = () => setShowMobileArchive(false);

  // Drag and drop handlers
  const handleItemDragStart = (e: React.DragEvent, item: HistoryItem) => {
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItemId(item.id);
  };

  const handleItemDragEnd = () => {
    setDraggedItemId(null);
    setDragOverFolderId(null);
    setDragOverRoot(false);
  };

  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverFolderId !== folderId) {
      setDragOverFolderId(folderId);
    }
  };

  const handleFolderDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDragOverFolderId(null);
    const itemId = e.dataTransfer.getData('text/plain') || draggedItemId;
    if (itemId && onMoveToFolder) {
      onMoveToFolder(itemId, folderId);
      setExpandedFolders(prev => ({ ...prev, [folderId]: true }));
    }
    setDraggedItemId(null);
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverRoot(true);
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverRoot(false);
    const itemId = e.dataTransfer.getData('text/plain') || draggedItemId;
    if (itemId && onMoveToFolder) {
      onMoveToFolder(itemId, undefined);
    }
    setDraggedItemId(null);
  };

  return (
    <WorkspaceContext.Provider value={{ isCollapsed, setIsCollapsed, toggleCollapsed, openMobileArchive, closeMobileArchive }}>
      <div className="flex w-full h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] min-h-[520px] md:min-h-[700px] bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
      
      {/* SIDEMENY (Skjult på mobil slik at innholdet får 100% bredde, synlig på md+) */}
      <aside 
        className={`bg-slate-900 text-slate-300 flex-col border-r border-slate-800 shrink-0 transition-all duration-300 ease-in-out select-none relative hidden md:flex ${
          isCollapsed ? 'w-16' : 'w-80'
        }`}
      >
        {isCollapsed ? (
          <div className="flex flex-col h-full py-4 items-center justify-between">
            <div className="flex flex-col items-center gap-4 w-full">
              <button
                onClick={() => setIsCollapsed(false)}
                className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                title="Vis sidemeny (Utvid)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {onBackToTools && (
                <button
                  type="button"
                  onClick={onBackToTools}
                  className="p-2.5 rounded-xl text-indigo-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                  title={backToToolsLabel || "Tilbake til Verktøykasse"}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}

              <button 
                onClick={onActionClick}
                className="w-10 h-10 bg-primary text-white rounded-xl font-bold flex items-center justify-center hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all cursor-pointer"
                title={actionButtonLabel}
              >
                <Plus className="w-5 h-5" />
              </button>
              {secondaryActionButtonLabel && onSecondaryActionClick && (
                <button 
                  onClick={onSecondaryActionClick}
                  className="w-10 h-10 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl font-bold flex items-center justify-center hover:bg-amber-500/30 transition-all cursor-pointer mt-1"
                  title={secondaryActionButtonLabel}
                >
                  {secondaryActionButtonIcon || <StickyNote className="w-4 h-4 text-amber-400" />}
                </button>
              )}

              {/* Minimerte historikkelementer */}
              <div className="w-full px-2 mt-2 space-y-2 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-320px)] custom-scrollbar">
                {historyItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => onItemClick(item.id)}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-center transition-all relative group cursor-pointer ${
                      activeItemId === item.id 
                        ? 'bg-slate-800 text-primary-light border border-slate-700' 
                        : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-300'
                    }`}
                    title={item.title}
                  >
                    {item.icon ? item.icon : item.isPinned ? <Pin className="w-4 h-4 text-amber-400 fill-amber-400" /> : <FileText className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-2 text-slate-600">{icon}</div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-5 pb-3 border-b border-slate-800/50 space-y-3">
              {onBackToTools && (
                <button
                  type="button"
                  onClick={onBackToTools}
                  className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors mb-2 px-2 py-1.5 rounded-xl hover:bg-slate-800/80 group/back cursor-pointer select-none w-fit"
                >
                  <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover/back:-translate-x-1 text-indigo-400" />
                  <span>{backToToolsLabel || "Tilbake til Verktøykasse"}</span>
                </button>
              )}
              <div className="flex items-center gap-3 text-white">
                <div className="bg-primary/20 p-2 rounded-xl text-primary-light">{icon}</div>
                <div className="overflow-hidden">
                  <h2 className="font-black text-base leading-tight truncate">{title}</h2>
                  {subtitle && <p className="text-[11px] text-slate-400 font-medium truncate">{subtitle}</p>}
                </div>
                <button 
                  onClick={() => setIsCollapsed(true)}
                  className="ml-auto p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all cursor-pointer" 
                  title="Lukk sidemeny"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-1.5">
                <button 
                  onClick={onActionClick}
                  className="w-full py-2 px-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-hover shadow-md shadow-primary/20 transition-all active:scale-[0.99] text-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> {actionButtonLabel}
                </button>
                {secondaryActionButtonLabel && onSecondaryActionClick && (
                  <button 
                    onClick={onSecondaryActionClick}
                    className="w-full py-1.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] text-xs cursor-pointer shadow-2xs"
                  >
                    {secondaryActionButtonIcon || <StickyNote className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{secondaryActionButtonLabel}</span>
                  </button>
                )}
              </div>

              {/* Hurtigsøk i sidebaren */}
              <div className="relative pt-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Søk i mapper og oppgaver..."
                  className="w-full bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-900 text-white text-xs pl-8 pr-7 py-1.5 rounded-xl border border-slate-700/60 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-3 p-0.5 text-slate-400 hover:text-white rounded-md cursor-pointer"
                    title="Tøm søk"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* ARKIV / AKTIV FILTER-FANER */}
              <div className="flex bg-slate-800/60 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setArchiveFilter('active')}
                  className={`flex-1 py-1 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    archiveFilter === 'active'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Inbox className="w-3 h-3" />
                  <span>Aktive</span>
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveFilter('archived')}
                  className={`flex-1 py-1 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    archiveFilter === 'archived'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Archive className="w-3 h-3" />
                  <span>Arkiv {totalArchivedCount > 0 && `(${totalArchivedCount})`}</span>
                </button>
              </div>
            </div>

            <div 
              className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar"
              onDragOver={handleRootDragOver}
              onDragLeave={() => setDragOverRoot(false)}
              onDrop={handleRootDrop}
            >
              
              {/* FESTET SEKSJON */}
              {pinnedItems.length > 0 && (
                <div className="space-y-1">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-400/90 mb-2 px-2 flex items-center gap-1.5">
                    <Pin className="w-3 h-3 fill-amber-400" /> Festet
                  </h3>
                  {pinnedItems.map((item) => renderHistoryItem(item))}
                </div>
              )}

              {/* TIDLIGERE ARBEID (MAPPER OG FILER) */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between mb-2 px-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {archiveFilter === 'archived' ? 'Arkiverte mapper & notater' : (historySectionTitle || 'Tidligere arbeid')}
                  </h3>
                  
                  {archiveFilter === 'active' && (
                    <div className="flex items-center gap-1">
                      {/* Sortering-meny knapp for mapper */}
                      {folders.length > 1 && (
                        <div className="relative">
                          <button 
                            type="button"
                            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              folderSortMode !== 'custom' 
                                ? 'text-indigo-400 bg-slate-800' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/80'
                            }`}
                            title={`Sorter mapper (${folderSortMode === 'az' ? 'A-Å' : folderSortMode === 'za' ? 'Å-A' : 'Manuell'})`}
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>

                          {isSortMenuOpen && (
                            <div 
                              ref={sortMenuRef}
                              className="absolute right-0 top-full mt-1.5 w-48 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150"
                            >
                              <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Sorter mapper
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => handleSetSortMode('az')}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                                  folderSortMode === 'az' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span>🔤</span>
                                  <span>Alfabetisk (A–Å)</span>
                                </span>
                                {folderSortMode === 'az' && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetSortMode('za')}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                                  folderSortMode === 'za' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span>🔠</span>
                                  <span>Omvendt (Å–A)</span>
                                </span>
                                {folderSortMode === 'za' && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetSortMode('custom')}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                                  folderSortMode === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span>📌</span>
                                  <span>Manuell rekkefølge</span>
                                </span>
                                {folderSortMode === 'custom' && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Ny mappe knapp */}
                      {onAddFolder && (
                        <button 
                          onClick={onAddFolder}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/80 rounded-md transition-colors cursor-pointer"
                          title="Opprett ny mappe"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {unpinnedItems.length === 0 && pinnedItems.length === 0 && sortedFolders.length === 0 ? (
                  <p className="text-xs text-slate-500 px-2 italic py-3 text-center">
                    {archiveFilter === 'archived' 
                      ? 'Arkivet er tomt.' 
                      : searchQuery ? 'Ingen resultater funnet for søket.' : 'Ingen elementer enda.'}
                  </p>
                ) : (
                  <>
                    {/* MAPPER */}
                    {sortedFolders.map((folder, folderIdx) => {
                      const isOpen = expandedFolders[folder.id] || Boolean(searchQuery.trim());
                      const folderItems = unpinnedItems.filter(item => item.folderId === folder.id);
                      const totalFolderItemsCount = historyItems.filter(item => item.folderId === folder.id).length;
                      const isFolderMenuOpen = openFolderMenuId === folder.id;
                      const isRenamingThisFolder = renamingFolderId === folder.id;
                      const isDragTarget = dragOverFolderId === folder.id;
                      
                      // Finn fargetema for mappen
                      const folderColorConfig = FOLDER_COLORS.find(c => c.id === folder.color) || FOLDER_COLORS[0];
                      
                      return (
                        <div 
                          key={folder.id} 
                          className={`mb-1 transition-all rounded-xl ${isDragTarget ? 'ring-2 ring-indigo-400 bg-indigo-950/40' : ''}`}
                          onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                          onDrop={(e) => handleFolderDrop(e, folder.id)}
                        >
                          {/* Mappe-header */}
                          <div className="flex items-center w-full group rounded-xl hover:bg-slate-800/80 transition-all relative">
                            {isRenamingThisFolder ? (
                              <div className="p-1.5 bg-slate-800 rounded-xl flex items-center gap-1 border border-primary/50 shadow-md w-full">
                                <input 
                                  type="text" 
                                  autoFocus 
                                  value={renameFolderValue} 
                                  onChange={(e) => setRenameFolderValue(e.target.value)} 
                                  onKeyDown={(e) => { 
                                    if (e.key === 'Enter') handleSaveRenameFolder(folder.id, e); 
                                    if (e.key === 'Escape') handleCancelRenameFolder(); 
                                  }} 
                                  className="flex-1 bg-slate-900 text-white text-xs px-2 py-1 rounded-lg border border-slate-700 outline-none focus:border-primary" 
                                  placeholder="Mappenavn..." 
                                />
                                <button 
                                  type="button" 
                                  onClick={(e) => handleSaveRenameFolder(folder.id, e)} 
                                  className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-slate-700 rounded-lg cursor-pointer"
                                  title="Lagre mappenavn"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  type="button" 
                                  onClick={handleCancelRenameFolder} 
                                  className="p-1 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg cursor-pointer"
                                  title="Avbryt"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <button 
                                  type="button"
                                  onClick={() => toggleFolder(folder.id)}
                                  className="flex-1 text-left px-2.5 py-1.5 transition-all flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white min-w-0"
                                >
                                  <span className={`shrink-0 ${folder.color ? folderColorConfig.text : 'text-slate-400 group-hover:text-primary-light'} transition-colors`}>
                                    {isOpen ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                                  </span>
                                  <span className="text-xs font-bold truncate flex-1 flex items-center gap-1.5" title={folder.name}>
                                    <span className="truncate">{folder.name}</span>
                                    {folder.customContext?.trim() && (
                                      <span title="Mappen har aktive KI-føringer" className="inline-flex">
                                        <Brain className="w-3 h-3 text-purple-400 shrink-0 animate-pulse" />
                                      </span>
                                    )}
                                  </span>
                                  
                                  {/* Mappe-teller (Badge) */}
                                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full transition-colors ${
                                    totalFolderItemsCount > 0 
                                      ? 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200' 
                                      : 'text-slate-600'
                                  }`}>
                                    {totalFolderItemsCount}
                                  </span>

                                  <span 
                                    className="text-slate-500 transition-transform duration-200 shrink-0 ml-0.5" 
                                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </span>
                                </button>

                                {/* Handlinger for mappe */}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                                  {sortedFolders.length > 1 && archiveFilter === 'active' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(e) => handleMoveFolderUp(folderIdx, e)}
                                        disabled={folderIdx === 0}
                                        className="p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-700/60 disabled:opacity-20 rounded-md transition-colors cursor-pointer"
                                        title="Flytt mappe opp"
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleMoveFolderDown(folderIdx, e)}
                                        disabled={folderIdx === sortedFolders.length - 1}
                                        className="p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-700/60 disabled:opacity-20 rounded-md transition-colors cursor-pointer"
                                        title="Flytt mappe ned"
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}

                                  {/* Slett mappe knapp */}
                                  {onDeleteFolder && (
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFolderToDelete({
                                          id: folder.id,
                                          name: folder.name,
                                          itemCount: totalFolderItemsCount
                                        });
                                      }}
                                      className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700/60 rounded-md transition-colors cursor-pointer"
                                      title={`Slett mappen "${folder.name}"`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Meny for mappe */}
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenFolderMenuId(isFolderMenuOpen ? null : folder.id);
                                      }}
                                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-md transition-colors cursor-pointer"
                                      title="Flere valg for mappe"
                                    >
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </button>

                                    {isFolderMenuOpen && (
                                      <div 
                                        ref={folderMenuRef}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 top-full mt-1 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 space-y-0.5 animate-in fade-in zoom-in-95 duration-150"
                                      >
                                        {/* KI-FØRINGER OG KONTEKST FOR MAPPE */}
                                        {onEditFolderContext && (
                                          <button 
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onEditFolderContext(folder.id);
                                              setOpenFolderMenuId(null);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:text-white hover:bg-purple-950/40 rounded-lg text-left cursor-pointer"
                                          >
                                            <Brain className="w-3.5 h-3.5 text-purple-400" />
                                            <span>KI-føringer & Kontekst</span>
                                          </button>
                                        )}

                                        {/* EKSPORT AV MAPPE */}
                                        {onExportFolder && (
                                          <button 
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onExportFolder(folder.id);
                                              setOpenFolderMenuId(null);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-left cursor-pointer"
                                          >
                                            <Download className="w-3.5 h-3.5 text-indigo-400" />
                                            <span>Last ned hele mappen...</span>
                                          </button>
                                        )}

                                        {onRenameFolder && (
                                          <button 
                                            type="button"
                                            onClick={(e) => handleStartRenameFolder(folder, e)}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-left cursor-pointer"
                                          >
                                            <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                                            <span>Endre mappenavn</span>
                                          </button>
                                        )}

                                        {/* ARKIVER / GJENOPPRETT MAPPE */}
                                        {onArchiveFolder && (
                                          <button 
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onArchiveFolder(folder.id, !folder.isArchived);
                                              setOpenFolderMenuId(null);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-left cursor-pointer"
                                          >
                                            {folder.isArchived ? (
                                              <>
                                                <ArchiveRestore className="w-3.5 h-3.5 text-amber-400" />
                                                <span>Gjenopprett mappe</span>
                                              </>
                                            ) : (
                                              <>
                                                <Archive className="w-3.5 h-3.5 text-amber-400" />
                                                <span>Arkiver mappe</span>
                                              </>
                                            )}
                                          </button>
                                        )}

                                        {/* Fargevelger for mappe */}
                                        {onUpdateFolderColor && (
                                          <div className="px-2 py-1.5">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                              <Palette className="w-3 h-3 text-indigo-400" />
                                              <span>Mappefarge</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 pt-0.5">
                                              {FOLDER_COLORS.map(c => (
                                                <button
                                                  key={c.id}
                                                  type="button"
                                                  onClick={() => {
                                                    onUpdateFolderColor(folder.id, c.id);
                                                    setOpenFolderMenuId(null);
                                                  }}
                                                  className={`w-5 h-5 rounded-full ${c.dot} transition-transform hover:scale-115 cursor-pointer ${
                                                    folder.color === c.id ? 'ring-2 ring-white scale-110' : 'opacity-80'
                                                  }`}
                                                  title={c.name}
                                                />
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {onDeleteFolder && (
                                          <>
                                            <div className="h-px bg-slate-800 my-1" />
                                            <button 
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenFolderMenuId(null);
                                                setFolderToDelete({
                                                  id: folder.id,
                                                  name: folder.name,
                                                  itemCount: totalFolderItemsCount
                                                });
                                              }}
                                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg text-left cursor-pointer"
                                            >
                                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                              <span>Slett mappe</span>
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                          
                          {/* Dokumenter inne i mappen */}
                          {isOpen && (
                            <div className="pl-3 ml-3 border-l border-slate-700/50 mt-1 mb-2 space-y-1">
                              {folderItems.length === 0 ? (
                                <p className="text-[10px] text-slate-500 italic py-1 px-3">
                                  {searchQuery ? 'Ingen treff i mappen' : 'Tom mappe (dra notat hit)'}
                                </p>
                              ) : (
                                folderItems.map(item => renderHistoryItem(item))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Sone for å dra dokumenter ut til roten */}
                    {draggedItemId && (
                      <div 
                        onDragOver={handleRootDragOver}
                        onDrop={handleRootDrop}
                        className={`p-2 rounded-xl border-2 border-dashed text-center text-xs font-bold transition-all mb-2 ${
                          dragOverRoot 
                            ? 'border-indigo-400 bg-indigo-950/40 text-indigo-300' 
                            : 'border-slate-700/80 text-slate-500'
                        }`}
                      >
                        Slipp her for å legge i roten (uten mappe)
                      </div>
                    )}

                    {/* LØSE FILER I ROTEN */}
                    {unpinnedItems.filter(item => !item.folderId).map(item => renderHistoryItem(item))}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ARBEIDSOMRÅDE */}
      <main className="flex-1 flex flex-col bg-slate-50/50 relative overflow-hidden">
        {onBackToTools ? (
          <div className="px-4 md:px-6 py-2.5 bg-white/90 backdrop-blur-xs border-b border-slate-200/80 flex items-center justify-between shrink-0 z-10 min-h-[44px]">
            <div className="flex items-center gap-2 text-xs">
              {isCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsCollapsed(false)}
                  className="mr-1.5 h-7 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 transition-colors flex items-center gap-1 font-bold cursor-pointer"
                  title="Vis sidemeny"
                >
                  <PanelLeftOpen className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline text-[11px]">Meny</span>
                </button>
              )}
              <button 
                type="button"
                onClick={onBackToTools}
                className="inline-flex items-center gap-1.5 font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                <span>{backToToolsLabel || 'Tilbake til Verktøykasse'}</span>
              </button>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span>{title}</span>
              </span>
            </div>
          </div>
        ) : null}
        {Array.isArray(children) ? (
          children.map((child, idx) => 
            typeof child === 'function' 
              ? <React.Fragment key={idx}>{child({ isCollapsed, toggleCollapsed, openMobileArchive })}</React.Fragment> 
              : <React.Fragment key={idx}>{child}</React.Fragment>
          )
        ) : typeof children === 'function' ? (
          children({ isCollapsed, toggleCollapsed, openMobileArchive })
        ) : (
          children
        )}
      </main>

      {/* MOBIL SKUFF FOR SAMTALER / ARKIV */}
      {showMobileArchive && (
        <div className="md:hidden fixed inset-0 z-[120] flex">
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity" 
            onClick={() => setShowMobileArchive(false)}
          />
          <div className="relative w-[85%] max-w-xs bg-slate-900 text-slate-200 h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-primary/20 p-2 rounded-xl text-primary-light">{icon}</div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-sm text-white truncate max-w-[170px]">{title}</h3>
                  <p className="text-[10px] text-slate-400">Samtale-arkiv</p>
                </div>
              </div>
              <button 
                onClick={() => setShowMobileArchive(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-800 space-y-2">
              <button
                onClick={() => {
                  onActionClick();
                  setShowMobileArchive(false);
                }}
                className="w-full py-2 px-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-hover shadow-md text-xs cursor-pointer active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" /> {actionButtonLabel}
              </button>
              {secondaryActionButtonLabel && onSecondaryActionClick && (
                <button
                  onClick={() => {
                    onSecondaryActionClick();
                    setShowMobileArchive(false);
                  }}
                  className="w-full py-2 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl font-bold flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-98 shadow-xs"
                >
                  {secondaryActionButtonIcon || <StickyNote className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{secondaryActionButtonLabel}</span>
                </button>
              )}

              {/* Søk på mobil */}
              <div className="relative pt-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Søk..."
                  className="w-full bg-slate-800 text-white text-xs pl-8 pr-7 py-1.5 rounded-xl border border-slate-700 outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
              {/* FESTET SEKSJON */}
              {pinnedItems.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400/90 mb-1 px-2 flex items-center gap-1.5">
                    <Pin className="w-3 h-3 fill-amber-400" /> Festet
                  </h4>
                  {pinnedItems.map(item => (
                    <div key={`mob-pin-${item.id}`} onClick={() => setShowMobileArchive(false)}>
                      {renderHistoryItem(item)}
                    </div>
                  ))}
                </div>
              )}

              {/* TIDLIGERE ARBEID (MAPPER OG FILER) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-1 px-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {historySectionTitle || 'Tidligere arbeid'}
                  </h4>
                  {onAddFolder && (
                    <button 
                      onClick={() => {
                        setShowMobileArchive(false);
                        onAddFolder();
                      }}
                      className="p-1 text-slate-400 hover:text-white rounded-md text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Ny mappe</span>
                    </button>
                  )}
                </div>

                {unpinnedItems.length === 0 && pinnedItems.length === 0 && sortedFolders.length === 0 ? (
                  <p className="text-xs text-slate-500 px-2 italic py-2">Ingen samtaler enda.</p>
                ) : (
                  <>
                    {/* Mapper */}
                    {sortedFolders.map(folder => {
                      const isOpen = expandedFolders[folder.id];
                      const folderItems = unpinnedItems.filter(item => item.folderId === folder.id);
                      const totalFolderItemsCount = historyItems.filter(item => item.folderId === folder.id).length;
                      return (
                        <div key={`mob-f-${folder.id}`} className="mb-1">
                          <button 
                            onClick={() => toggleFolder(folder.id)}
                            className="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 text-slate-300 hover:text-white"
                          >
                            {isOpen ? <FolderOpen className="w-3.5 h-3.5 text-primary-light" /> : <Folder className="w-3.5 h-3.5 text-slate-400" />}
                            <span className="text-xs font-semibold truncate flex-1">{folder.name}</span>
                            <span className="text-[10px] font-bold px-1.5 bg-slate-800 text-slate-400 rounded-full">
                              {totalFolderItemsCount}
                            </span>
                            <ChevronDown className="w-3 h-3 text-slate-500" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                          </button>
                          {isOpen && (
                            <div className="pl-3 ml-2 border-l border-slate-800 space-y-1 mt-1">
                              {folderItems.length === 0 ? (
                                <p className="text-[10px] text-slate-500 italic py-1 px-2">Tom mappe</p>
                              ) : (
                                folderItems.map(item => (
                                  <div key={`mob-fi-${item.id}`} onClick={() => setShowMobileArchive(false)}>
                                    {renderHistoryItem(item)}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Filer / samtaler uten mappe */}
                    {unpinnedItems.filter(item => !item.folderId).map(item => (
                      <div key={`mob-item-${item.id}`} onClick={() => setShowMobileArchive(false)}>
                        {renderHistoryItem(item)}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIKKER FAILSAFE-MODAL FOR SLETTING AV MAPPE */}
      {folderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200/60 flex items-center justify-center mx-auto mb-1">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-center">
              <h3 className="text-base sm:text-lg font-black text-slate-800">
                Slette mappen «{folderToDelete.name}»?
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {folderToDelete.itemCount > 0 ? (
                  <>
                    Mappen inneholder <strong className="text-slate-800 font-bold">{folderToDelete.itemCount} {folderToDelete.itemCount === 1 ? 'element' : 'elementer'}</strong>. Innholdet blir <strong className="text-emerald-700 font-bold">ikke slettet</strong>, men flyttet trygt ut til listen.
                  </>
                ) : (
                  'Mappen er tom og vil bli permanent slettet.'
                )}
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button 
                type="button"
                onClick={() => setFolderToDelete(null)} 
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
              >
                Avbryt
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (onDeleteFolder && folderToDelete) {
                    onDeleteFolder(folderToDelete.id);
                  }
                  setFolderToDelete(null);
                }} 
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all shadow-md shadow-red-500/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Slett mappe</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SLETT BEKREFTELSES-MODAL FOR DOKUMENT / SAMTALE */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-2">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-slate-800">Slette dette arbeidet?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Handlingen kan ikke angres. Alle endringer og innhold i dette dokumentet/samtalen vil gå tapt.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setItemToDelete(null)} className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer">Avbryt</button>
              <button onClick={handleConfirmDelete} className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all shadow-md shadow-red-500/20 cursor-pointer">Slett</button>
            </div>
          </div>
        </div>
      )}
      
      </div>
    </WorkspaceContext.Provider>
  );

  function renderHistoryItem(item: HistoryItem) {
    const isActive = activeItemId === item.id;
    const isEditing = renamingId === item.id;
    const isMenuOpen = openMenuId === item.id;

    return (
      <div 
        key={item.id} 
        draggable
        onDragStart={(e) => handleItemDragStart(e, item)}
        onDragEnd={handleItemDragEnd}
        className={`relative group rounded-xl transition-all ${
          draggedItemId === item.id ? 'opacity-40 scale-98' : ''
        }`}
      >
        {isEditing ? (
          <div className="p-2 bg-slate-800 rounded-xl flex items-center gap-1 border border-primary/50 shadow-md">
            <input 
              type="text" 
              autoFocus 
              value={renameValue} 
              onChange={(e) => setRenameValue(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(item.id, e); if (e.key === 'Escape') handleCancelRename(); }} 
              className="flex-1 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 outline-none focus:border-primary" 
              placeholder="Skriv inn tittel..." 
            />
            <button onClick={(e) => handleSaveRename(item.id, e)} className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-700 rounded-lg cursor-pointer"><Check className="w-4 h-4" /></button>
            <button onClick={handleCancelRename} className="p-1.5 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div 
            onClick={() => onItemClick(item.id)} 
            className={`w-full text-left px-2.5 py-2 rounded-xl transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
              isActive ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                {item.icon && <span className={`shrink-0 ${isActive ? 'text-primary-light' : 'text-slate-400'}`}>{item.icon}</span>}
                {item.isPinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                {item.isArchived && <Archive className="w-3 h-3 text-slate-500 shrink-0" />}
                <span className="text-xs font-bold truncate block">{item.title}</span>
              </div>
              {item.subtitle && <span className="text-[10px] text-slate-500 truncate block mt-0.5 group-hover:text-slate-400">{item.subtitle}</span>}
            </div>

            {(Boolean(onPinItem || onRenameItem || onDeleteItem || onDuplicateItem || onArchiveItem) && !item.hideActions) && (
              <div className="relative shrink-0">
                <button 
                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : item.id); }} 
                  className={`p-1 rounded-lg transition-all cursor-pointer ${
                    isMenuOpen || isActive ? 'text-slate-300 hover:text-white hover:bg-slate-700/80 opacity-100' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/60 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {isMenuOpen && (
                  <div ref={menuRef} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                    <button onClick={(e) => handleTogglePin(item, e)} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-left cursor-pointer">
                      {item.isPinned ? <><PinOff className="w-3.5 h-3.5 text-amber-400" /><span>Løsne fra toppen</span></> : <><Pin className="w-3.5 h-3.5 text-amber-400" /><span>Fest til toppen</span></>}
                    </button>
                    
                    <button onClick={(e) => handleStartRename(item, e)} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-left cursor-pointer">
                      <Edit2 className="w-3.5 h-3.5 text-sky-400" /><span>Gi nytt navn</span>
                    </button>

                    {/* Kloning / Duplisering */}
                    {onDuplicateItem && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateItem(item.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-left cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Lag en kopi</span>
                      </button>
                    )}

                    {/* Arkivering / Gjenoppretting */}
                    {onArchiveItem && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onArchiveItem(item.id, !item.isArchived);
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-left cursor-pointer"
                      >
                        {item.isArchived ? (
                          <>
                            <ArchiveRestore className="w-3.5 h-3.5 text-amber-400" />
                            <span>Gjenopprett til aktiv</span>
                          </>
                        ) : (
                          <>
                            <Archive className="w-3.5 h-3.5 text-slate-400" />
                            <span>Arkiver</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Flytt til mappe */}
                    {folders && folders.length > 0 && (
                      <>
                        <div className="h-px bg-slate-800 my-1" />
                        <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Flytt til</div>
                        {folders.map(f => (
                          item.folderId !== f.id && (
                            <button
                              key={f.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onMoveToFolder) onMoveToFolder(item.id, f.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-left cursor-pointer"
                            >
                              <Folder className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate">{f.name}</span>
                            </button>
                          )
                        ))}
                        {item.folderId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onMoveToFolder) onMoveToFolder(item.id, undefined);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-left cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>Fjern fra mappe</span>
                          </button>
                        )}
                      </>
                    )}

                    <div className="h-px bg-slate-800 my-1" />
                    <button onClick={(e) => { e.stopPropagation(); setItemToDelete(item.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg text-left cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" /><span>Slett</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

export default WorkspaceLayout;
