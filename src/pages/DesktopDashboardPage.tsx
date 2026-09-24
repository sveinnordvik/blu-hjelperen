import React, { useState, useRef, useEffect } from 'react';
import { 
  Lightbulb, 
  Download, 
  Copy, 
  Check, 
  BookOpen, 
  Sparkles, 
  GraduationCap, 
  Paperclip, 
  FolderOpen
} from 'lucide-react';
import AIWarning from '../components/AIWarning';
import ChatBubble from '../features/chat/components/ChatBubble';
import ChatInput from '../features/chat/components/ChatInput';
import { WorkspaceLayout, HistoryItem } from '../components/WorkspaceLayout';
import { useChat } from '../features/chat/hooks/useChat';
import { getUserChats, deleteChat } from '../features/chat/services/chatService';
import { exportChatToPdf, copyFullChat } from '../lib/chatExportUtils';

interface DesktopDashboardPageProps {
  user?: any;
  onOpenSettings?: () => void;
  onBackToHome?: () => void;
  onSwitchToSuperveileder?: () => void;
  onSwitchToFeltveileder?: () => void;
}

export interface ChatSessionItem extends HistoryItem {
  id: string;
  title: string;
  isPinned?: boolean;
  updatedAt?: string;
}

const LOCAL_STORAGE_CHAT_LIST_KEY = 'blu_hjelper_desktop_chats_v1';

export default function DesktopDashboardPage({
  user,
  onOpenSettings,
  onBackToHome,
  onSwitchToSuperveileder,
  onSwitchToFeltveileder
}: DesktopDashboardPageProps) {
  const userId = user?.uid || (user?.email ? user.email.replace(/[^a-zA-Z0-9]/g, '_') : 'gjestebruker');
  const [currentChatId, setCurrentChatId] = useState<string>(() => `chat_${Date.now()}`);
  
  const [chatList, setChatList] = useState<ChatSessionItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CHAT_LIST_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Kunne ikke hente lokale chat-lister:', e);
    }
    return [
      { id: 'sample-1', title: 'Tolkning av medvirkning i Rammeplanen', subtitle: 'Dokumentanalyse • Lagret' },
      { id: 'sample-2', title: 'Ideer til utedag for 3-åringer', subtitle: 'Rammeplan • Lagret' },
      { id: 'sample-3', title: 'Foreldresamarbeid i overgangsfaser', subtitle: 'Didaktikk • Lagret' }
    ];
  });

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  const { messages, isLoading, error, sendMessage, setMessages } = useChat(userId, currentChatId);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Lagre chat-listen til localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CHAT_LIST_KEY, JSON.stringify(chatList));
    } catch (e) {
      console.warn('Kunne ikke lagre chat-liste til localStorage:', e);
    }
  }, [chatList]);

  // Auto-scroll kun internt i chat-beholderen ved nye meldinger, aldri selve nettleservinduet
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages.length, isLoading]);

  // Hent tidligere chat-sesjoner for innlogget bruker fra Firestore
  useEffect(() => {
    if (userId && userId !== 'gjestebruker') {
      getUserChats(userId).then(savedChats => {
        if (savedChats && savedChats.length > 0) {
          const formatted: ChatSessionItem[] = savedChats.map((c: any) => ({
            id: c.id,
            title: c.lastMessage ? (c.lastMessage.slice(0, 38) + '...') : `Veiledning ${c.id.slice(-4)}`,
            subtitle: 'Dokumentanalyse',
            updatedAt: c.updatedAt
          }));
          setChatList(prev => {
            const combined: ChatSessionItem[] = [...formatted];
            prev.forEach(p => {
              if (!combined.some(c => c.id === p.id)) combined.push(p);
            });
            return combined;
          });
        }
      }).catch(console.error);
    }
  }, [userId]);

  // Oppdater tittel i listen når brukeren sender sin første melding
  useEffect(() => {
    if (messages.length > 0) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      if (firstUserMsg) {
        const generatedTitle = firstUserMsg.text.slice(0, 36) + (firstUserMsg.text.length > 36 ? '...' : '');
        setChatList(prev => {
          const exists = prev.some(c => c.id === currentChatId);
          if (exists) {
            return prev.map(c => c.id === currentChatId ? { ...c, title: generatedTitle } : c);
          } else {
            return [{ id: currentChatId, title: generatedTitle, subtitle: 'Dokumentanalyse • Sist endret nå' }, ...prev];
          }
        });
      }
    }
  }, [messages, currentChatId]);

  const handleStartNewChat = () => {
    const newId = `chat_${Date.now()}`;
    setCurrentChatId(newId);
    setMessages([]);
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const handleDeleteChatById = async (chatId: string) => {
    setChatList(prev => prev.filter(c => c.id !== chatId));
    if (userId && userId !== 'gjestebruker') {
      try {
        await deleteChat(userId, chatId);
      } catch (err) {
        console.warn('Kunne ikke slette chat fra Firestore:', err);
      }
    }
    if (currentChatId === chatId) {
      handleStartNewChat();
    }
  };

  const handlePinChat = (id: string, isPinned: boolean) => {
    setChatList(prev => prev.map(c => c.id === id ? { ...c, isPinned } : c));
  };

  const handleRenameChat = (id: string, newTitle: string) => {
    setChatList(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
  };

  const currentChatTitle = chatList.find(c => c.id === currentChatId)?.title || 
    (messages.length > 0 ? (messages[0].text.slice(0, 35) + '...') : 'Ny veiledning');

  const handleExportPdf = async () => {
    if (messages.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      await exportChatToPdf(currentChatTitle, messages, chatContainerRef.current);
    } catch (err) {
      console.error('Eksport til PDF feilet:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyChat = async () => {
    if (messages.length === 0) return;
    const success = await copyFullChat(messages);
    if (success) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  const samplePrompts = [
    "Hvordan forankrer jeg barns medvirkning i Rammeplanen for barnehagen?",
    "Hjelp meg å planlegge et didaktisk opplegg om natur og miljø for 4-åringer.",
    "Hva er forskjellen på danning og oppdragelse i barnehagepedagogikken?",
    "Hvordan kan jeg håndtere en konflikt mellom to barn basert på omsorg og lek?"
  ];

  return (
    <WorkspaceLayout
      title="BLU-hjelperen"
      subtitle="Dokumentanalyse & Rammeplan"
      icon={<GraduationCap className="w-6 h-6 text-blue-400" />}
      actionButtonLabel="Ny veiledning"
      historySectionTitle="Tidligere veiledninger"
      onActionClick={handleStartNewChat}
      historyItems={chatList.map(c => ({
        id: c.id,
        title: c.title,
        subtitle: c.subtitle || 'Dokumentanalyse',
        isPinned: c.isPinned || false,
        updatedAt: c.updatedAt
      }))}
      activeItemId={currentChatId}
      onItemClick={handleSelectChat}
      onPinItem={handlePinChat}
      onRenameItem={handleRenameChat}
      onDeleteItem={handleDeleteChatById}
    >
      {({ isCollapsed, openMobileArchive }) => (
        <div className="flex flex-col h-full bg-slate-50/50">
          {/* 
            Top Bar Switcher: Identisk layout og plassering som i Superveilederen og Feltveilederen
          */}
          <div className="bg-slate-900 text-white border-b border-slate-800 px-3 sm:px-4 py-2 flex items-center justify-between flex-wrap gap-2 shrink-0 z-20">
            <div className="flex items-center gap-2">
              {/* Mobilknapp for å åpne samtale-arkivet for denne veilederen */}
              <button
                type="button"
                onClick={openMobileArchive}
                className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Vis samtale-arkiv på mobil"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Arkiv ({chatList.length})</span>
              </button>

              <span className="text-xs font-semibold text-slate-300 hidden sm:inline">Skriving</span>
              <span className="text-slate-600 text-xs hidden sm:inline">•</span>
              <span className="text-xs font-bold text-blue-400 hidden sm:inline">BLU-hjelperen</span>
            </div>

            {/* Hurtig-bytter mellom Superveilederen, Feltveilederen og BLU-hjelperen (identisk med Superveileder) */}
            <div className="flex items-center p-0.5 bg-slate-800 rounded-xl border border-slate-700 shadow-2xs overflow-x-auto max-w-full">
              {/* Pille 1: Superveilederen */}
              <button
                type="button"
                onClick={onSwitchToSuperveileder}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer text-slate-300 hover:text-white hover:bg-slate-700/70"
                title="Bytt til Superveilederen (Akademisk skriving, Sokratisk sparring, APA og metode)"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span>Superveilederen</span>
              </button>

              {/* Pille 2: Feltveilederen */}
              <button
                type="button"
                onClick={onSwitchToFeltveileder}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer text-slate-300 hover:text-white hover:bg-slate-700/70"
                title="Bytt til Feltveilederen (Praksis, Rammeplan, didaktikk og egne observasjoner)"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
                <span>Feltveilederen</span>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-1.5 py-0.2 rounded-full border border-emerald-700/60 hidden sm:inline">
                  Praksis
                </span>
              </button>

              {/* Pille 3: BLU-hjelperen (Aktiv) */}
              <div
                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-xs flex items-center gap-1.5 shrink-0"
                title="BLU-hjelperen (Fagforfatter med oppgavelasting og Rammeplan-veiledning)"
              >
                <GraduationCap className="w-3.5 h-3.5 text-white" />
                <span>BLU-hjelperen</span>
                <span className="text-[10px] bg-blue-900/60 text-blue-200 px-1.5 py-0.2 rounded-full border border-blue-500/60 hidden sm:inline">
                  Dokumentanalyse
                </span>
              </div>
            </div>
          </div>

          {/* 
            Header for aktiv veiledning: PDF-eksport, kopi-knapp og status
          */}
          <header className="h-14 border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-6 md:px-8 bg-white/95 backdrop-blur-sm z-10 shrink-0">
            <div className="flex items-center gap-3 truncate min-w-0 pr-4">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
              <div className="truncate min-w-0">
                <h2 className="text-sm md:text-base font-extrabold text-slate-900 truncate">
                  {currentChatTitle}
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">Veileder forkoblet Rammeplanen (2017)</p>
              </div>
            </div>

            {/* Eksport- og statusknapper */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400 italic hidden lg:inline-block">Autolagret</span>

              {/* Kopier hele samtalen */}
              <button
                onClick={handleCopyChat}
                disabled={messages.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
                title="Kopier hele samtalen"
              >
                {copiedAll ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span className="hidden sm:inline">{copiedAll ? 'Kopiert!' : 'Kopier'}</span>
              </button>

              {/* Eksport av veiledning (PDF) */}
              <button
                onClick={handleExportPdf}
                disabled={isExporting || messages.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-all disabled:opacity-40 cursor-pointer shadow-2xs border border-blue-200/80 active:scale-95"
                title="Last ned samtalen som PDF"
              >
                <Download size={14} />
                <span>{isExporting ? 'Lager PDF...' : 'Eksporter til PDF'}</span>
              </button>
            </div>
          </header>

          {/* Selve chat-loggen */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 scroll-smooth bg-slate-50/50">
            <div className="max-w-4xl mx-auto w-full space-y-4">
              <AIWarning dismissible={true} />
              
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 md:py-12 text-center animate-in fade-in duration-300">
                  {/* Tom tilstand */}
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mb-4 shadow-xs border border-blue-200">
                    <Lightbulb size={32} />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Hva kan jeg veilede deg på i dag?</h3>
                  <p className="text-xs md:text-sm text-slate-500 max-w-md leading-relaxed mb-6">
                    Still et spørsmål om Rammeplanen, didaktisk planlegging eller oppgaveskriving. Du kan også laste opp en Word- eller PDF-oppgave via binders-ikonet nedenfor!
                  </p>

                  {/* Fremhevet kort for dokumentopplasting */}
                  <div className="bg-blue-50/80 border border-blue-200/90 rounded-2xl p-4 max-w-2xl w-full text-left flex items-start gap-3.5 shadow-2xs mb-4">
                    <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <Paperclip className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-blue-950 mb-0.5">Vil du ha tilbakemelding på et oppgaveutkast?</h4>
                      <p className="text-xs text-blue-800/90 leading-relaxed">
                        Trykk på <strong>binders-ikonet</strong> nede ved skrivefeltet for å laste opp et Word- (.docx) eller PDF-dokument. BLU-hjelperen leser teksten din og gir didaktisk veiledning, Rammeplan-forankring og forbedringsforslag!
                      </p>
                    </div>
                  </div>

                  {/* Forslag til spørsmål */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 w-full max-w-2xl text-left">
                    {samplePrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(prompt)}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/40 transition-all text-xs text-slate-700 hover:text-blue-900 font-medium shadow-2xs text-left group flex items-start gap-2.5 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                        <span>{prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1 mt-2">
                  {/* Liste over meldinger */}
                  {messages.map((msg) => (
                    <ChatBubble key={msg.id} message={msg} />
                  ))}
                  
                  {/* Feilmelding hvis API-et svikter */}
                  {error && (
                    <div className="text-rose-700 text-center text-xs p-4 bg-rose-50 rounded-2xl my-4 border border-rose-200 font-medium">
                      {error}
                    </div>
                  )}
                  
                  {/* Usynlig anker for auto-scroll */}
                  <div className="h-2" />
                </div>
              )}
            </div>
          </div>

          {/* 
            Chat Input Område med Dokumentopplasting (.docx / .pdf)
          */}
          <div className="p-4 md:p-6 bg-white border-t border-slate-200 shadow-sm z-10 shrink-0">
            <div className="max-w-4xl mx-auto">
              <ChatInput 
                onSendMessage={sendMessage} 
                isLoading={isLoading} 
                placeholder="Still et veiledningsspørsmål, eller legg ved dokument (.docx/.pdf) via bindersen..."
              />
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}

export { DesktopDashboardPage };
