import React, { useState } from 'react';
import { MessageSquare, Plus, Settings, GraduationCap, ChevronLeft, Menu, Trash2 } from 'lucide-react';

export interface ChatSessionItem {
  id: string;
  title: string;
  updatedAt?: string;
}

interface SidebarProps {
  chats: ChatSessionItem[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onOpenSettings?: () => void;
  onDeleteChat?: (id: string, e: React.MouseEvent) => void;
}

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onOpenSettings,
  onDeleteChat
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-72 md:w-80'
      } bg-slate-900 text-slate-300 flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out relative border-r border-slate-800 select-none z-20`}
    >
      {/* Header med logo og kollaps-knapp */}
      <div
        className={`h-16 flex items-center bg-slate-950 border-b border-slate-800 ${
          isCollapsed ? 'justify-center px-0' : 'justify-between px-4'
        }`}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 text-white overflow-hidden">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/30 shrink-0">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div className="truncate">
              <h1 className="text-sm font-extrabold tracking-tight whitespace-nowrap text-white">
                BLU-hjelperen
              </h1>
              <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                Veiledning & Faglitteratur
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white cursor-pointer"
          title={isCollapsed ? 'Utvid meny' : 'Skjul meny'}
        >
          {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Ny veiledning-knapp */}
      <div className="p-3.5">
        <button
          onClick={onNewChat}
          className={`w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer text-xs ${
            isCollapsed ? 'px-0' : 'px-4'
          }`}
          title="Start ny veiledning"
        >
          <Plus size={18} />
          {!isCollapsed && <span className="whitespace-nowrap">Ny veiledning</span>}
        </button>
      </div>

      {/* Chat-historikk (Liste) */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 scroll-smooth overflow-x-hidden space-y-1">
        {!isCollapsed && (
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2.5 whitespace-nowrap">
            Tidligere veiledninger
          </div>
        )}

        <div className="flex flex-col gap-1">
          {chats.map((chat) => {
            const isActive = activeChatId === chat.id;
            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`group flex items-center justify-between gap-2.5 w-full p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold border-slate-700 shadow-xs'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border-transparent'
                } ${isCollapsed ? 'justify-center' : 'px-3'}`}
                title={chat.title}
              >
                <div className="flex items-center gap-2.5 truncate min-w-0">
                  <MessageSquare
                    size={16}
                    className={`shrink-0 ${
                      isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate text-xs tracking-tight">
                      {chat.title}
                    </span>
                  )}
                </div>

                {!isCollapsed && onDeleteChat && (
                  <button
                    onClick={(e) => onDeleteChat(chat.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity rounded-md hover:bg-slate-700/50 cursor-pointer shrink-0"
                    title="Slett samtale"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Brukermeny nederst */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <div className="flex flex-col gap-1">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className={`flex items-center gap-2.5 p-2 w-full text-xs font-medium hover:bg-slate-800 rounded-lg transition-colors text-left text-slate-300 hover:text-white cursor-pointer ${
                isCollapsed ? 'justify-center px-0' : 'px-3'
              }`}
              title="Innstillinger"
            >
              <Settings size={16} className="text-slate-400 shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap">Innstillinger</span>}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

export { Sidebar };
