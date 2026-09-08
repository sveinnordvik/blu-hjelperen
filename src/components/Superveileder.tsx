import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceLayout, HistoryItem } from './WorkspaceLayout';
import { 
  Sparkles, 
  MessageSquare, 
  Send, 
  Bot, 
  BookOpen, 
  Quote, 
  PenTool, 
  User, 
  Copy, 
  Check, 
  Loader2,
  RefreshCw,
  Lightbulb,
  Search
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateAcademicResponse, askSocraticAgent, askApaAgent, askLanguageAgent } from '../services/geminiService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: string;
}

export interface ChatSession extends HistoryItem {
  id: string;
  title: string;
  subtitle?: string;
  isPinned?: boolean;
  messages: ChatMessage[];
  activeMode: string;
  updatedAt: string;
}

const STORAGE_KEY = 'blu_superveileder_chats_v2';

const INITIAL_CHATS: ChatSession[] = [
  {
    id: '1',
    title: 'Hvordan forankrer jeg praksis...',
    subtitle: 'Rammeplan & Lovverk • 31. aug 2026',
    isPinned: true,
    activeMode: 'Rammeplan',
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'm1',
        role: 'assistant',
        content: 'Hei! Jeg er klar til å hjelpe deg med å forankre observasjonene og praksisen din i Rammeplanen for barnehagen og barnehageloven. Hva observerte du i barnehagen?',
        timestamp: '10:30',
        mode: 'Rammeplan'
      }
    ]
  },
  {
    id: '2',
    title: 'Akademisk omskriving av avsnitt',
    subtitle: 'Språkvask • I går',
    isPinned: false,
    activeMode: 'Språkvask',
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    messages: [
      {
        id: 'm2',
        role: 'assistant',
        content: 'Lim inn et avsnitt fra oppgaven din som du ønsker å gjøre mer akademisk, presist eller pedagogisk forankret.',
        timestamp: '14:15',
        mode: 'Språkvask'
      }
    ]
  }
];

export function Superveileder(_props?: { [key: string]: any }) {
  const [chats, setChats] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved chats', e);
    }
    return INITIAL_CHATS;
  });

  const [activeChatId, setActiveChatId] = useState<string>(() => {
    return chats.length > 0 ? chats[0].id : '1';
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const prevMsgCountRef = useRef(0);

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];
  const activeMode = activeChat?.activeMode || 'Auto';

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch (e) {
      console.error('Failed to save chats to localStorage', e);
    }
  }, [chats]);

  // Ensure window is always at top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Scroll to bottom on new messages ONLY inside the chat container, never the window
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevMsgCountRef.current = activeChat?.messages?.length || 0;
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      return;
    }

    const currentMsgCount = activeChat?.messages?.length || 0;
    if (currentMsgCount > prevMsgCountRef.current || isLoading) {
      prevMsgCountRef.current = currentMsgCount;
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [activeChat?.messages?.length, isLoading]);

  // Reset scroll to top when changing chat sessions
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeChatId]);

  const handleNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'Ny veiledningssamtale',
      subtitle: 'Auto • Nettopp opprettet',
      isPinned: false,
      activeMode: 'Auto',
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'welcome-' + newId,
          role: 'assistant',
          content: 'Hei! Jeg er Superveilederen din for barnehagelærerutdanningen. Hva vil du utforske eller få veiledning på i dag?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mode: 'Auto'
        }
      ]
    };
    setChats(prev => [newSession, ...prev]);
    setActiveChatId(newId);
  };

  const handleSetMode = (mode: string) => {
    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) {
        return {
          ...c,
          activeMode: mode,
          subtitle: `${mode} • Sist endret nå`
        };
      }
      return c;
    }));
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || !activeChat) return;

    const userText = input.trim();
    setInput('');

    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: activeMode
    };

    // Auto-update chat title if it is default
    const isFirstUserMessage = activeChat.messages.filter(m => m.role === 'user').length === 0;
    const newTitle = isFirstUserMessage 
      ? (userText.length > 28 ? userText.substring(0, 28) + '...' : userText) 
      : activeChat.title;

    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) {
        return {
          ...c,
          title: newTitle,
          subtitle: `${activeMode} • Sist endret nå`,
          updatedAt: new Date().toISOString(),
          messages: [...c.messages, userMsg]
        };
      }
      return c;
    }));

    setIsLoading(true);

    try {
      let aiResponseText = '';
      if (activeMode === 'Sokratisk') {
        aiResponseText = await askSocraticAgent(
          [{ role: 'user', content: userText }],
          { frameworkFocus: 'Refleksjonsveiledning for barnehagelærer' }
        );
      } else if (activeMode === 'APA') {
        aiResponseText = await askApaAgent(userText);
      } else if (activeMode === 'Språkvask') {
        aiResponseText = await askLanguageAgent(userText);
      } else if (activeMode === 'Metode') {
        aiResponseText = await generateAcademicResponse(
          userText,
          [],
          'balanced',
          { frameworkFocus: 'Modus: Metode & Forskningsdesign. Gi didaktisk og vitenskapsteoretisk veiledning for barnehagelærerutdanningen: problemstilling, kvalitativ/kvantitativ metode, observasjon, intervju, dokumentanalyse, litteraturstudie, etikk (NESH/samtykke) og pålitelighet/gyldighet (reliabilitet/validitet).' }
        );
      } else {
        aiResponseText = await generateAcademicResponse(
          userText,
          [],
          'balanced',
          { frameworkFocus: `Modus: ${activeMode}. Rammeplan for barnehagen og barnehageloven.` }
        );
      }

      const aiMsg: ChatMessage = {
        id: 'ai-' + Date.now(),
        role: 'assistant',
        content: aiResponseText || 'Jeg har mottatt spørsmålet ditt. La oss utforske hvordan dette knytter seg til rammeplanen og didaktisk praksis.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: activeMode
      };

      setChats(prev => prev.map(c => {
        if (c.id === activeChatId) {
          return {
            ...c,
            updatedAt: new Date().toISOString(),
            messages: [...c.messages, aiMsg]
          };
        }
        return c;
      }));
    } catch (err) {
      console.error('AI chat error', err);
      const errorMsg: ChatMessage = {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: 'Kunne ikke hente svar fra veiledningsmotoren akkurat nå. Vennligst prøv igjen om et øyeblikk.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: activeMode
      };
      setChats(prev => prev.map(c => {
        if (c.id === activeChatId) {
          return {
            ...c,
            messages: [...c.messages, errorMsg]
          };
        }
        return c;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Pin / Unpin
  const handlePinItem = (id: string, isPinned: boolean) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, isPinned } : c));
  };

  // Rename
  const handleRenameItem = (id: string, newTitle: string) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
  };

  // Delete
  const handleDeleteItem = (id: string) => {
    setChats(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (activeChatId === id) {
        if (filtered.length > 0) {
          setActiveChatId(filtered[0].id);
        } else {
          // If all chats deleted, create a new one
          const freshId = Date.now().toString();
          const freshSession: ChatSession = {
            id: freshId,
            title: 'Ny samtale',
            subtitle: 'Auto • Nettopp opprettet',
            isPinned: false,
            activeMode: 'Auto',
            updatedAt: new Date().toISOString(),
            messages: [
              {
                id: 'welcome-' + freshId,
                role: 'assistant',
                content: 'Hei! Hva vil du utforske eller få veiledning på i dag?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                mode: 'Auto'
              }
            ]
          };
          setActiveChatId(freshId);
          return [freshSession];
        }
      }
      return filtered;
    });
  };

  const modes = [
    { id: 'Auto', icon: <Sparkles className="w-4 h-4" />, desc: 'Beste tilpassede svar' },
    { id: 'Sokratisk', icon: <MessageSquare className="w-4 h-4" />, desc: 'Stiller reflekterende spørsmål' },
    { id: 'Rammeplan', icon: <BookOpen className="w-4 h-4" />, desc: 'Kobling til fagområder og lovverk' },
    { id: 'APA', icon: <Quote className="w-4 h-4" />, desc: 'Korrekt kildereferanse og sitat' },
    { id: 'Språkvask', icon: <PenTool className="w-4 h-4" />, desc: 'Akademisk formulering' },
    { id: 'Metode', icon: <Search className="w-4 h-4" />, desc: 'Forskningsdesign og metode' }
  ];

  return (
    <WorkspaceLayout
      title="Superveilederen"
      subtitle="Sokratisk sparring og oppslag"
      icon={<Sparkles className="w-6 h-6" />}
      actionButtonLabel="Ny samtale"
      onActionClick={handleNewChat}
      historyItems={chats}
      activeItemId={activeChatId}
      onItemClick={setActiveChatId}
      onPinItem={handlePinItem}
      onRenameItem={handleRenameItem}
      onDeleteItem={handleDeleteItem}
    >
      {({ isCollapsed }) => (
        <div className="flex flex-col h-full bg-slate-50/50">
          
          {/* Modus-velger i toppen */}
          <div className={`bg-white p-3.5 border-b border-slate-200 flex flex-wrap items-center justify-center gap-2 z-10 shadow-xs transition-all duration-300 ${
            isCollapsed ? 'pl-16 sm:pl-36' : ''
          }`}>
          {modes.map(m => (
            <button
              key={m.id}
              onClick={() => handleSetMode(m.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeMode === m.id 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
              title={m.desc}
            >
              {m.icon} 
              <span>{m.id}</span>
            </button>
          ))}
        </div>

        {/* Chat-meldinger */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar"
        >
          <div className="max-w-3xl mx-auto w-full space-y-6">
            
            {/* Velkomstkort */}
            {(!activeChat?.messages || activeChat.messages.filter(m => m.role === 'user').length === 0) ? (
              <div className="flex flex-col items-start max-w-2xl mx-auto w-full">
                <span className="text-[10px] font-bold text-slate-400 mb-1 ml-1 flex items-center gap-1">
                  <Bot className="w-3 h-3 text-indigo-500" /> Superveilederen
                </span>
                <div className="bg-white border border-slate-200 text-slate-700 p-4 rounded-2xl rounded-bl-sm shadow-sm text-sm">
                  Hei! Jeg er Superveilederen din. Still meg et spørsmål, eller velg modus i menyen over for spesifikk hjelp med APA, språkvask, rammeplanen – eller <strong>metodevalg og forskningsdesign</strong>.
                  {activeMode === 'Metode' && (
                    <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-800 text-xs">
                      <strong>💡 Metode-tips:</strong> Skriv inn problemstillingen din her, og nevn gjerne om du vurderer kvalitativ, kvantitativ eller litteraturstudie, så hjelper jeg deg med å bygge et solid design!
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {activeMode === 'Metode' && (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-800 text-xs max-w-2xl mx-auto w-full">
                    <strong>💡 Metode-tips:</strong> Skriv inn problemstillingen din her, og nevn gjerne om du vurderer kvalitativ, kvantitativ eller litteraturstudie, så hjelper jeg deg med å bygge et solid design!
                  </div>
                )}
                {activeChat.messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1 border border-primary/20">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`flex flex-col max-w-[82%] sm:max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      
                      <div className="flex items-center gap-2 mb-1 px-1 text-[11px] font-semibold text-slate-400">
                        <span>{msg.role === 'assistant' ? 'Superveilederen' : 'Deg'}</span>
                        {msg.mode && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-bold">
                            {msg.mode}
                          </span>
                        )}
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div 
                        className={`p-4 rounded-2xl text-sm leading-relaxed relative group ${
                          msg.role === 'user'
                            ? 'bg-primary text-white rounded-br-xs shadow-sm shadow-primary/20'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-xs'
                        }`}
                      >
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>

                        {/* Kopi-knapp for assistent-svar */}
                        {msg.role === 'assistant' && (
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="absolute bottom-2 right-2 p-1.5 bg-white/90 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg border border-slate-200 shadow-xs opacity-0 group-hover:opacity-100 transition-all"
                            title="Kopier svar"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                    </div>

                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center shrink-0 mt-1">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* Laster-indikator */}
            {isLoading && (
              <div className="flex gap-3 items-start animate-in fade-in">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-2xl rounded-bl-xs shadow-xs flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Superveilederen tenker og forbereder didaktisk respons...
                </div>
              </div>
            )}

            <div className="h-2" />
          </div>
        </div>

        {/* Input-felt */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={activeMode === 'Metode' ? 'Spør om noe (Metode-modus)...' : `Spør om fag, rammeplan, APA eller tekst (${activeMode}-modus)...`}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all placeholder:text-slate-400"
              disabled={isLoading}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-5 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </div>

        </div>
      )}
    </WorkspaceLayout>
  );
}

export default Superveileder;
