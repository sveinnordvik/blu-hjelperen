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
  PanelLeftOpen
} from 'lucide-react';

export interface HistoryItem {
  id: string;
  title: string;
  subtitle?: string;
  isPinned?: boolean;
  icon?: React.ReactNode;
  hideActions?: boolean;
  [key: string]: any;
}

export interface WorkspaceContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

export const WorkspaceContext = React.createContext<WorkspaceContextType>({
  isCollapsed: false,
  setIsCollapsed: () => {},
  toggleCollapsed: () => {},
});

export const useWorkspace = () => React.useContext(WorkspaceContext);

export interface WorkspaceLayoutProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actionButtonLabel: string;
  onActionClick: () => void;
  historyItems?: HistoryItem[];
  activeItemId?: string | null;
  historySectionTitle?: string;
  onItemClick: (id: string) => void;
  onPinItem?: (id: string, isPinned: boolean) => void;
  onRenameItem?: (id: string, newTitle: string) => void;
  onDeleteItem?: (id: string) => void;
  children: React.ReactNode | ((props: { isCollapsed: boolean; toggleCollapsed: () => void }) => React.ReactNode);
}

export function WorkspaceLayout({ 
  title, 
  subtitle, 
  icon,
  actionButtonLabel, 
  onActionClick, 
  historyItems = [], 
  activeItemId, 
  historySectionTitle,
  onItemClick, 
  onPinItem, 
  onRenameItem,
  onDeleteItem,
  children 
}: WorkspaceLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
    if (onPinItem) {
      onPinItem(item.id, !item.isPinned);
    }
    setOpenMenuId(null);
  };

  const handleConfirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteItem) {
      onDeleteItem(id);
    }
    setItemToDelete(null);
    setOpenMenuId(null);
  };

  // Group items by pinned status
  const pinnedItems = historyItems.filter(item => item.isPinned);
  const unpinnedItems = historyItems.filter(item => !item.isPinned);

  const toggleCollapsed = () => setIsCollapsed(prev => !prev);

  return (
    <WorkspaceContext.Provider value={{ isCollapsed, setIsCollapsed, toggleCollapsed }}>
      <div className="flex w-full h-[calc(100vh-140px)] min-h-[700px] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
      
      {/* SIDEMENY (Mørkt tema) */}
      <aside 
        className={`bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 transition-all duration-300 ease-in-out select-none relative ${
          isCollapsed ? 'w-16' : 'w-80'
        }`}
      >
        {/* COLLAPSED STATE */}
        {isCollapsed ? (
          <div className="flex flex-col h-full py-4 items-center justify-between">
            <div className="flex flex-col items-center gap-4 w-full">
              {/* Åpne-knapp */}
              <button
                onClick={() => setIsCollapsed(false)}
                className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                title="Vis sidemeny (Utvid)"
                aria-label="Vis sidemeny"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Hovedknapp i kompakt modus */}
              <button 
                onClick={onActionClick}
                className="w-10 h-10 bg-primary text-white rounded-xl font-bold flex items-center justify-center hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all"
                title={actionButtonLabel}
                aria-label={actionButtonLabel}
              >
                <Plus className="w-5 h-5" />
              </button>

              {/* Ikoner for aktive/festede elementer */}
              <div className="w-full px-2 mt-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar">
                {historyItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => onItemClick(item.id)}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-center transition-all relative group ${
                      activeItemId === item.id 
                        ? 'bg-slate-800 text-primary-light border border-slate-700' 
                        : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-300'
                    }`}
                    title={item.title}
                  >
                    {item.icon ? (
                      item.icon
                    ) : item.isPinned ? (
                      <Pin className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    {/* Tooltip on hover */}
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-slate-700">
                      {item.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Ikon i bunn */}
            <div className="p-2 text-slate-600">
              {icon}
            </div>
          </div>
        ) : (
          /* EXPANDED STATE */
          <div className="flex flex-col h-full">
            {/* Header i sidemeny */}
            <div className="p-6 pb-4 border-b border-slate-800/50">
              <div className="flex items-center gap-3 mb-6 text-white">
                <div className="bg-primary/20 p-2 rounded-xl text-primary-light">
                  {icon}
                </div>
                <div className="overflow-hidden">
                  <h2 className="font-black text-lg leading-tight truncate">{title}</h2>
                  {subtitle && <p className="text-xs text-slate-400 font-medium truncate">{subtitle}</p>}
                </div>
                <button 
                  onClick={() => setIsCollapsed(true)}
                  className="ml-auto p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all" 
                  title="Skjul sidemeny"
                  aria-label="Skjul sidemeny"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
              
              {/* Hovedknapp (+ Nytt...) */}
              <button 
                onClick={onActionClick}
                className="w-full py-3 px-4 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all active:scale-[0.99]"
              >
                <Plus className="w-5 h-5" /> {actionButtonLabel}
              </button>
            </div>

            {/* Historikk-liste */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              
              {/* FESTET SEKSJON (PINNED) */}
              {pinnedItems.length > 0 && (
                <div className="space-y-1">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-400/90 mb-2 px-2 flex items-center gap-1.5">
                    <Pin className="w-3 h-3 fill-amber-400" /> Festet
                  </h3>
                  {pinnedItems.map((item) => renderHistoryItem(item))}
                </div>
              )}

              {/* TIDLIGERE ARBEID (UNPINNED) */}
              <div className="space-y-1">
                {historySectionTitle !== '' && (
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-2">
                    {historySectionTitle || 'Tidligere arbeid'}
                  </h3>
                )}
                {unpinnedItems.length === 0 && pinnedItems.length === 0 ? (
                  <p className="text-sm text-slate-600 px-2 italic">Ingen historikk enda.</p>
                ) : unpinnedItems.length === 0 ? (
                  <p className="text-xs text-slate-600 px-2 italic">Alle elementer er festet.</p>
                ) : (
                  unpinnedItems.map((item) => renderHistoryItem(item))
                )}
              </div>

            </div>
          </div>
        )}
      </aside>

      {/* ARBEIDSOMRÅDE (Lyst tema) */}
      <main className="flex-1 flex flex-col bg-slate-50/50 relative overflow-hidden">
        {/* Liten expand-knapp hvis sidemenyen er kollapset */}
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="absolute top-3.5 md:top-4 left-3.5 md:left-4 z-20 h-9 px-3 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xs rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none"
            title="Åpne sidemeny"
            aria-label="Åpne sidemeny"
          >
            <PanelLeftOpen className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Vis meny</span>
          </button>
        )}
        {typeof children === 'function' ? children({ isCollapsed, toggleCollapsed }) : children}
      </main>

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
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all"
              >
                Avbryt
              </button>
              <button
                onClick={(e) => handleConfirmDelete(itemToDelete, e)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all shadow-md shadow-red-500/20"
              >
                Slett
              </button>
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
        className="relative group rounded-xl"
      >
        {isEditing ? (
          <div className="p-2 bg-slate-800 rounded-xl flex items-center gap-1 border border-primary/50 shadow-md">
            <input
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRename(item.id, e);
                if (e.key === 'Escape') handleCancelRename();
              }}
              className="flex-1 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 outline-none focus:border-primary"
              placeholder="Skriv inn tittel..."
            />
            <button
              onClick={(e) => handleSaveRename(item.id, e)}
              className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-700 rounded-lg transition-colors"
              title="Lagre tittel"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancelRename}
              className="p-1.5 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
              title="Avbryt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => onItemClick(item.id)}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
              isActive 
                ? 'bg-slate-800 text-white shadow-sm' 
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-2">
                {item.icon && (
                  <span className={`shrink-0 ${isActive ? 'text-primary-light' : 'text-slate-400'}`}>
                    {item.icon}
                  </span>
                )}
                {item.isPinned && (
                  <Pin className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                )}
                <span className="text-xs font-bold truncate block">{item.title}</span>
              </div>
              {item.subtitle && (
                <span className="text-[11px] text-slate-500 truncate block mt-0.5 group-hover:text-slate-400">
                  {item.subtitle}
                </span>
              )}
            </div>

            {/* Tre prikker meny-knapp (Gemini-stil) */}
            {(Boolean(onPinItem || onRenameItem || onDeleteItem) && !item.hideActions) && (
              <div className="relative shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(isMenuOpen ? null : item.id);
                }}
                className={`p-1.5 rounded-lg transition-all ${
                  isMenuOpen || isActive 
                    ? 'text-slate-300 hover:text-white hover:bg-slate-700/80 opacity-100' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/60 opacity-0 group-hover:opacity-100'
                }`}
                title="Flere valg"
                aria-label="Flere valg"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Gemini Dropdown Meny */}
              {isMenuOpen && (
                <div 
                  ref={menuRef}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 space-y-0.5 animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* Pin / Unpin */}
                  <button
                    onClick={(e) => handleTogglePin(item, e)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-left"
                  >
                    {item.isPinned ? (
                      <>
                        <PinOff className="w-3.5 h-3.5 text-amber-400" />
                        <span>Løsne fra toppen</span>
                      </>
                    ) : (
                      <>
                        <Pin className="w-3.5 h-3.5 text-amber-400" />
                        <span>Fest til toppen</span>
                      </>
                    )}
                  </button>

                  {/* Rename */}
                  <button
                    onClick={(e) => handleStartRename(item, e)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-left"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Gi nytt navn</span>
                  </button>

                  <div className="h-px bg-slate-800 my-1" />

                  {/* Slett */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemToDelete(item.id);
                      setOpenMenuId(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Slett</span>
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
