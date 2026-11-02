import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Loader2, 
  BookOpen, 
  Copy, 
  Check, 
  RefreshCw,
  Library,
  GraduationCap
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { askSuperveilederen, RagSource } from '../../services/ragChatService';
import { CitationBadge } from './CitationBadge';
import { CitationDrawer } from './CitationDrawer';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: RagSource[];
}

export interface ChatWindowProps {
  userId?: string;
  userEmail?: string;
  initialTopic?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  userId = 'anonymous_user',
  initialTopic
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hei! 👋 Jeg er **Superveilederen** for barnehagelærerutdanningen (BLU).\n\nJeg søker i både ditt opplastede pensum og det felles Open Access-arkivet for å gi deg presise, sokratiske og kildebelagte svar med automatisk APA 7-siterering.\n\nHva skal vi utforske sammen i dag?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSources, setActiveSources] = useState<RagSource[]>([]);
  
  // Sidepanel-state for kildeinnsyn
  const [selectedSource, setSelectedSource] = useState<RagSource | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleOpenSourceDrawer = (source: RagSource | undefined) => {
    if (source) {
      setSelectedSource(source);
      setIsDrawerOpen(true);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = input.trim();
    if (!query || isGenerating) return;

    const userMsgId = `usr-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);

    try {
      const historyForRag = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await askSuperveilederen(userId, historyForRag, query);

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: response.sources
      };

      setMessages(prev => [...prev, aiMsg]);
      if (response.sources && response.sources.length > 0) {
        setActiveSources(prev => [...response.sources, ...prev]);
      }
    } catch (err: any) {
      console.error('Feil i Superveileder RAG Chat:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Det oppstod en midlertidig feil i veiledningsmotoren: ${err?.message || 'Prøv igjen om et øyeblikk.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /**
   * Parser tekst for å erstatte kildehenvisninger som [Forfatter, År...] med interaktive CitationBadges
   */
  const renderMessageContent = (msg: ChatMessage) => {
    if (msg.role === 'user') {
      return <p className="whitespace-pre-wrap">{msg.content}</p>;
    }

    const citationRegex = /\[([A-Za-zÆØÅæøå\s.,&-]+,\s*\d{4}[^\]]*)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    const text = msg.content;
    let keyIdx = 0;

    while ((match = citationRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const rawCitation = match[1];
      const matchedSource = msg.sources?.find(s => {
        const firstAuthor = s.author || (s.authors && s.authors[0]) || '';
        return rawCitation.toLowerCase().includes(firstAuthor.toLowerCase());
      }) || msg.sources?.[0];

      parts.push(
        <CitationBadge
          key={`cite-${msg.id}-${keyIdx++}`}
          label={`📌 [${rawCitation}]`}
          source={matchedSource}
          onClick={() => handleOpenSourceDrawer(matchedSource)}
        />
      );

      lastIndex = citationRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return (
      <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed font-sans">
        {parts.map((part, i) => {
          if (typeof part === 'string') {
            return <ReactMarkdown key={i}>{part}</ReactMarkdown>;
          }
          return part;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full bg-slate-50/50 dark:bg-slate-950/50 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm font-sans">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 p-2.5 rounded-2xl">
            <GraduationCap className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Superveilederen RAG
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 tracking-wider">
                Hybrid-søk & APA 7
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Søker i privat pensum + felles Open Access-litteratur</p>
          </div>
        </div>

        {activeSources.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Library className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold text-slate-800 dark:text-slate-100">{activeSources.length}</span>
            <span>kilder benyttet</span>
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 sm:gap-4 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`group relative max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 sm:p-5 shadow-2xs ${
              msg.role === 'user'
                ? 'bg-slate-900 dark:bg-emerald-700 text-white rounded-tr-xs'
                : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-tl-xs'
            }`}>
              <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-slate-100/20 dark:border-slate-800">
                <span className="text-[11px] font-bold opacity-75">
                  {msg.role === 'user' ? 'Deg' : 'Superveilederen'}
                </span>
                <span className="text-[10px] opacity-50">{msg.timestamp}</span>
              </div>

              {renderMessageContent(msg)}

              {/* Visuelle kildebrikker dersom kilder finnes */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Dokumenterte kilder (klikk for utdrag):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((s, idx) => (
                      <CitationBadge
                        key={`badge-${msg.id}-${idx}`}
                        label={`${s.author || 'Kilde'} (${s.year || 'u.å.'})`}
                        source={s}
                        onClick={() => handleOpenSourceDrawer(s)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleCopy(msg.id, msg.content)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                title="Kopier melding"
              >
                {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-2xl bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isGenerating && (
          <div className="flex items-start gap-3 justify-start animate-pulse">
            <div className="w-8 h-8 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span>Gjennomfører hybrid-vektorsøk i privat pensum og felles Open Access-arkiv...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus-within:border-emerald-600 dark:focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-2xl p-2 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Still et akademisk spørsmål eller be om veiledning..."
            disabled={isGenerating}
            className="flex-1 bg-transparent border-none px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors cursor-pointer shadow-xs"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>

      {/* Sidepanel for kildeinnsyn */}
      <CitationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        source={selectedSource}
      />
    </div>
  );
};

export default ChatWindow;
