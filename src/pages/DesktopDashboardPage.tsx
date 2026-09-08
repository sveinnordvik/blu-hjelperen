import React, { useState, useRef, useEffect } from 'react';
import { Lightbulb, Plus, Download, Copy, Check, BookOpen, Sparkles, FileText, ChevronDown } from 'lucide-react';
import AIWarning from '../components/AIWarning';
import ChatBubble from '../features/chat/components/ChatBubble';
import ChatInput from '../features/chat/components/ChatInput';
import Sidebar, { ChatSessionItem } from '../features/chat/components/Sidebar';
import { useChat } from '../features/chat/hooks/useChat';
import { getUserChats } from '../features/chat/services/chatService';
import { exportChatToPdf, copyFullChat } from '../lib/chatExportUtils';

interface DesktopDashboardPageProps {
  user?: any;
  onOpenSettings?: () => void;
  onBackToHome?: () => void;
}

export default function DesktopDashboardPage({
  user,
  onOpenSettings,
  onBackToHome
}: DesktopDashboardPageProps) {
  const userId = user?.uid || (user?.email ? user.email.replace(/[^a-zA-Z0-9]/g, '_') : 'gjestebruker');
  const [currentChatId, setCurrentChatId] = useState<string>(() => `chat_${Date.now()}`);
  const [chatList, setChatList] = useState<ChatSessionItem[]>([
    { id: 'sample-1', title: 'Tolkning av medvirkning i Rammeplanen' },
    { id: 'sample-2', title: 'Ideer til utedag for 3-åringer' },
    { id: 'sample-3', title: 'Foreldresamarbeid i overgangsfaser' }
  ]);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  const { messages, isLoading, error, sendMessage, setMessages } = useChat(userId, currentChatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll til bunnen hver gang "messages" endrer seg
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Hent tidligere chat-sesjoner for innlogget bruker
  useEffect(() => {
    if (userId && userId !== 'gjestebruker') {
      getUserChats(userId).then(savedChats => {
        if (savedChats && savedChats.length > 0) {
          const formatted: ChatSessionItem[] = savedChats.map((c: any) => ({
            id: c.id,
            title: c.lastMessage ? (c.lastMessage.slice(0, 38) + '...') : `Veiledning ${c.id.slice(-4)}`,
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
            return [{ id: currentChatId, title: generatedTitle }, ...prev];
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

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatList(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      handleStartNewChat();
    }
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
    <div className="flex h-[calc(100vh-4.5rem)] bg-slate-50 overflow-hidden font-sans border border-slate-200 rounded-3xl shadow-sm">
      {/* 
        1. Sidebar og Chat-historikk (Navigasjon)
      */}
      <Sidebar
        chats={chatList}
        activeChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleStartNewChat}
        onOpenSettings={onOpenSettings}
        onDeleteChat={handleDeleteChat}
      />

      {/* 
        Hovedområde (Chat Flow & Eksport)
      */}
      <main className="flex-1 flex flex-col h-full bg-white relative overflow-hidden min-w-0">
        {/* Header for aktiv chat med PDF-eksport og kopi-knapp */}
        <header className="h-16 border-b border-slate-200/80 flex items-center justify-between px-6 md:px-8 bg-white/95 backdrop-blur-sm z-10 sticky top-0">
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

            {/* 2. Eksport av veiledning (PDF) */}
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
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 scroll-smooth bg-slate-50/50">
          <div ref={chatContainerRef} className="max-w-4xl mx-auto w-full space-y-4">
            <AIWarning dismissible={true} />
            
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 md:py-14 text-center animate-in fade-in duration-300">
                {/* Tom tilstand */}
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mb-4 shadow-xs border border-blue-200">
                  <Lightbulb size={32} />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Hva kan jeg hjelpe deg med i dag?</h3>
                <p className="text-xs md:text-sm text-slate-500 max-w-md leading-relaxed mb-6">
                  Still et spørsmål om Rammeplanen, didaktikk eller praksisoppgaver. Du kan også laste opp en Word- eller PDF-oppgave via binders-ikonet nedenfor!
                </p>

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
                <div ref={messagesEndRef} className="h-2" />
              </div>
            )}
          </div>
        </div>

        {/* 
          3. Chat Input Område med Dokumentopplasting (.docx / .pdf)
        */}
        <div className="p-4 md:p-6 bg-white border-t border-slate-200 shadow-sm z-10">
          <div className="max-w-4xl mx-auto">
            <ChatInput 
              onSendMessage={sendMessage} 
              isLoading={isLoading} 
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export { DesktopDashboardPage };

