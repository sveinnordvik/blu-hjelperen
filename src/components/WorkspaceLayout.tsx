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
  ArrowLeft
} from 'lucide-react';

export interface FolderType {
  id: string;
  name: string;
  isExpanded?: boolean;
}

export interface HistoryItem {
  id: string;
  title: string;
  subtitle?: string;
  isPinned?: boolean;
  icon?: React.ReactNode;
  hideActions?: boolean;
  folderId?: string; // Nytt felt for mappestruktur
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
  historyItems?: HistoryItem[];
  folders?: FolderType[]; // Ny prop for mapper
  activeItemId?: string | null;
  historySectionTitle?: string;
  onItemClick: (id: string) => void;
  onPinItem?: (id: string, isPinned: boolean) => void;
  onRenameItem?: (id: string, newTitle: string) => void;
  onDeleteItem?: (id: string) => void;
  onAddFolder?: () => void; // Ny funksjon for å lage mappe
  onMoveToFolder?: (documentId: string, folderId: string | undefined) => void;
  onDeleteFolder?: (folderId: string) => void; // Mulighet for å slette mappe
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
  historyItems = [], 
  folders = [],
  activeItemId, 
  historySectionTitle,
  onItemClick, 
  onPinItem, 
  onRenameItem,
  onDeleteItem,
  onAddFolder,
  onMoveToFolder,
  onDeleteFolder,
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

  // State for å holde styr på hvilke mapper som er utvidet (trekkspill)
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    folders.forEach(f => {
      initialState[f.id] = f.isExpanded ?? false;
    });
    return initialState;
  });

  // Synkroniser lokal state hvis folder-propen endres (for eksempel når nye mapper lastes)
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
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

  const pinnedItems = historyItems.filter(item => item.isPinned);
  const unpinnedItems = historyItems.filter(item => !item.isPinned);

  const toggleCollapsed = () => setIsCollapsed(prev => !prev);

  const openMobileArchive = () => setShowMobileArchive(true);
  const closeMobileArchive = () => setShowMobileArchive(false);

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
                className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
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
                className="w-10 h-10 bg-primary text-white rounded-xl font-bold flex items-center justify-center hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all"
                title={actionButtonLabel}
              >
                <Plus className="w-5 h-5" />
              </button>

              {/* Lagt til overflow-x-hidden for å forhindre sideveis rulling */}
              <div className="w-full px-2 mt-2 space-y-2 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-320px)] custom-scrollbar">
                {historyItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => onItemClick(item.id)}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-center transition-all relative group ${
                      activeItemId === item.id 
                        ? 'bg-slate-800 text-primary-light border border-slate-700' 
                        : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-300'
                    }`}
                    title={item.title} // Den innebygde nettleser-tooltipen tar seg av dette
                  >
                    {item.icon ? item.icon : item.isPinned ? <Pin className="w-4 h-4 text-amber-400 fill-amber-400" /> : <FileText className="w-4 h-4" />}
                    {/* Skreddersydd tooltip-div er fjernet */}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-2 text-slate-600">{icon}</div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-6 pb-4 border-b border-slate-800/50">
              {onBackToTools && (
                <button
                  type="button"
                  onClick={onBackToTools}
                  className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors mb-4 px-2 py-1.5 rounded-xl hover:bg-slate-800/80 group/back cursor-pointer select-none w-fit"
                >
                  <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover/back:-translate-x-1 text-indigo-400" />
                  <span>{backToToolsLabel || "Tilbake til Verktøykasse"}</span>
                </button>
              )}
              <div className="flex items-center gap-3 mb-6 text-white">
                <div className="bg-primary/20 p-2 rounded-xl text-primary-light">{icon}</div>
                <div className="overflow-hidden">
                  <h2 className="font-black text-lg leading-tight truncate">{title}</h2>
                  {subtitle && <p className="text-xs text-slate-400 font-medium truncate">{subtitle}</p>}
                </div>
                <button 
                  onClick={() => setIsCollapsed(true)}
                  className="ml-auto p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all" 
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
              
              <button 
                onClick={onActionClick}
                className="w-full py-3 px-4 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all active:scale-[0.99]"
              >
                <Plus className="w-5 h-5" /> {actionButtonLabel}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              
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
              <div className="space-y-1 pt-2">
                <div className="flex items-center justify-between mb-2 px-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {historySectionTitle || 'Tidligere arbeid'}
                  </h3>
                  
                  {/* Ny mappe knapp */}
                  {onAddFolder && (
                    <button 
                      onClick={onAddFolder}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/80 rounded-md transition-colors"
                      title="Opprett ny mappe"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {unpinnedItems.length === 0 && pinnedItems.length === 0 && folders.length === 0 ? (
                  <p className="text-sm text-slate-600 px-2 italic">Ingen historikk enda.</p>
                ) : (
                  <>
                    {/* MAPPER */}
                    {folders.map(folder => {
                      const isOpen = expandedFolders[folder.id];
                      const folderItems = unpinnedItems.filter(item => item.folderId === folder.id);
                      
                      return (
                        <div key={folder.id} className="mb-1">
                          {/* Mappe-header */}
                          <div className="flex items-center w-full group rounded-xl hover:bg-slate-800/80 transition-all">
                            <button 
                              onClick={() => toggleFolder(folder.id)}
                              className="flex-1 text-left px-3 py-2 transition-all flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white min-w-0"
                            >
                              <span className="shrink-0 text-slate-400 group-hover:text-primary-light transition-colors">
                                {isOpen ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                              </span>
                              <span className="text-xs font-bold truncate flex-1">{folder.name}</span>
                              <span 
                                className="text-slate-500 transition-transform duration-200 shrink-0" 
                                style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </span>
                            </button>

                            {onDeleteFolder && (
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteFolder(folder.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 text-slate-400 hover:text-red-400 hover:bg-slate-700/60 rounded-lg transition-all shrink-0 cursor-pointer"
                                title={`Slett mappen "${folder.name}"`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          
                          {/* Dokumenter inne i mappen */}
                          {isOpen && (
                            <div className="pl-3 ml-4 border-l border-slate-700/50 mt-1 mb-2 space-y-1">
                              {folderItems.length === 0 ? (
                                <p className="text-[10px] text-slate-500 italic py-1.5 px-3">Tom mappe</p>
                              ) : (
                                folderItems.map(item => renderHistoryItem(item))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

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
        {typeof children === 'function' ? children({ isCollapsed, toggleCollapsed, openMobileArchive }) : children}
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

            <div className="p-3 border-b border-slate-800">
              <button
                onClick={() => {
                  onActionClick();
                  setShowMobileArchive(false);
                }}
                className="w-full py-2.5 px-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-hover shadow-md text-xs cursor-pointer active:scale-98"
              >
                <Plus className="w-4 h-4" /> {actionButtonLabel}
              </button>
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
                </div>

                {unpinnedItems.length === 0 && pinnedItems.length === 0 && folders.length === 0 ? (
                  <p className="text-xs text-slate-500 px-2 italic py-2">Ingen samtaler enda.</p>
                ) : (
                  <>
                    {/* Mapper */}
                    {folders.map(folder => {
                      const isOpen = expandedFolders[folder.id];
                      const folderItems = unpinnedItems.filter(item => item.folderId === folder.id);
                      return (
                        <div key={`mob-f-${folder.id}`} className="mb-1">
                          <button 
                            onClick={() => toggleFolder(folder.id)}
                            className="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 text-slate-300 hover:text-white"
                          >
                            {isOpen ? <FolderOpen className="w-3.5 h-3.5 text-primary-light" /> : <Folder className="w-3.5 h-3.5 text-slate-400" />}
                            <span className="text-xs font-semibold truncate flex-1">{folder.name}</span>
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

      {/* SLETT BEKREFTELSES-MODAL */}
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
      <div key={item.id} className="relative group rounded-xl">
        {isEditing ? (
          <div className="p-2 bg-slate-800 rounded-xl flex items-center gap-1 border border-primary/50 shadow-md">
            <input type="text" autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(item.id, e); if (e.key === 'Escape') handleCancelRename(); }} className="flex-1 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 outline-none focus:border-primary" placeholder="Skriv inn tittel..." />
            <button onClick={(e) => handleSaveRename(item.id, e)} className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-700 rounded-lg"><Check className="w-4 h-4" /></button>
            <button onClick={handleCancelRename} className="p-1.5 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div onClick={() => onItemClick(item.id)} className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${isActive ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}>
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-2">
                {item.icon && <span className={`shrink-0 ${isActive ? 'text-primary-light' : 'text-slate-400'}`}>{item.icon}</span>}
                {item.isPinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                <span className="text-xs font-bold truncate block">{item.title}</span>
              </div>
              {item.subtitle && <span className="text-[11px] text-slate-500 truncate block mt-0.5 group-hover:text-slate-400">{item.subtitle}</span>}
            </div>

            {(Boolean(onPinItem || onRenameItem || onDeleteItem) && !item.hideActions) && (
              <div className="relative shrink-0">
                <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : item.id); }} className={`p-1.5 rounded-lg transition-all ${isMenuOpen || isActive ? 'text-slate-300 hover:text-white hover:bg-slate-700/80 opacity-100' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/60 opacity-0 group-hover:opacity-100'}`}>
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isMenuOpen && (
                  <div ref={menuRef} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                    <button onClick={(e) => handleTogglePin(item, e)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-left">
                      {item.isPinned ? <><PinOff className="w-3.5 h-3.5 text-amber-400" /><span>Løsne fra toppen</span></> : <><Pin className="w-3.5 h-3.5 text-amber-400" /><span>Fest til toppen</span></>}
                    </button>
                    <button onClick={(e) => handleStartRename(item, e)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-left">
                      <Edit2 className="w-3.5 h-3.5 text-sky-400" /><span>Gi nytt navn</span>
                    </button>

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
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-left"
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
                          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-left"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>Fjern fra mappe</span>
                        </button>
                      )}
                    </>
                  )}

                    <div className="h-px bg-slate-800 my-1" />
                    <button onClick={(e) => { e.stopPropagation(); setItemToDelete(item.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg text-left">
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
