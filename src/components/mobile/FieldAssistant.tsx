import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Loader2, 
  Trash2, 
  BookOpen, 
  Check, 
  Plus, 
  HelpCircle, 
  X,
  MessageSquare,
  ArrowRight,
  BookmarkPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../../lib/utils';
import { callGoogleAIProxy } from '../../services/geminiService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface FieldAssistantProps {
  initialPrompt?: string;
  onGoToNotes?: () => void;
  onSaveToNotes?: (title: string, content: string, category: string) => void;
  user?: any;
}

const FIELD_SUGGESTIONS = [
  { label: 'Rammeplan-kobling', prompt: 'Hvordan kan jeg koble en observasjon av frilek i sandkassa til Rammeplanens fagområder og formål?' },
  { label: 'Didaktisk opplegg (ute)', prompt: 'Gi meg 3 konkrete didaktiske ideer for en gruppe 3-4-åringer i ulendt skogsterreng.' },
  { label: 'Barns medvirkning', prompt: 'Hva sier Berit Bae og William Corsaro om barns medvirkning i hverdagsrutiner (måltid/påkledning)?' },
  { label: 'Konflikt & anerkjennelse', prompt: 'Hvordan løse en leke-konflikt mellom to 4-åringer med anerkjennende kommunikasjon?' },
  { label: 'Samlingsstund-tips', prompt: 'Trenger et engasjerende opplegg for en 15-minutters samlingsstund om sanser og naturfag.' }
];

const FIELD_SYSTEM_INSTRUCTION = `Du er BLU-Feltveilederen – en lynrask, pedagogisk skarp og praksisnær veileder for barnehagelærerstudenter ute i praksis.
Målgruppen din er studenter som står i eller forbereder seg til barnehagehverdagen. 
Dine svar skal være:
- Konsise, strukturerte og rett på sak (bruk korte avsnitt og kulepunkter).
- Tydelig forankret i Rammeplan for barnehagen (spesifikke fagområder, formål og arbeidsmåter).
- Koblet til sentral barnehagepedagogisk teori (f.eks. Berit Bae om anerkjennelse, Lev Vygotskij om støttende stillaser, Gunvor Løkken om kroppslig væren, William Corsaro om jevnalderkultur).
- Alltid gi 1-3 konkrete grep eller spørsmål studenten kan reflektere over eller teste ut i dag.`;

export const FieldAssistant: React.FC<FieldAssistantProps> = ({
  initialPrompt,
  onGoToNotes,
  onSaveToNotes,
  user
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('blu_field_assistant_chat');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Feil ved lesing av felt-chat:', e);
    }
    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: 'Hei! 👋 Jeg er din **Feltveileder**. Står du i en spesiell situasjon i barnehagen nå, eller planlegger du en aktivitet? Spør meg om Rammeplanen, didaktiske opplegg eller pedagogisk teori!',
        timestamp: new Date().toISOString()
      }
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasTriggeredInitial = useRef(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('blu_field_assistant_chat', JSON.stringify(messages));
    } catch (e) {
      console.error('Feil ved lagring av felt-chat:', e);
    }
  }, [messages]);

  // Handle initialPrompt if passed
  useEffect(() => {
    if (initialPrompt && !hasTriggeredInitial.current) {
      hasTriggeredInitial.current = true;
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare Gemini contents with conversation context
      const chatHistory = [...messages, userMsg].slice(-8).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const rawResponse = await callGoogleAIProxy({
        model: 'gemini-2.5-flash',
        contents: chatHistory,
        config: {
          systemInstruction: FIELD_SYSTEM_INSTRUCTION,
          temperature: 0.7,
        }
      });

      const responseString = typeof rawResponse === 'string' 
        ? rawResponse 
        : (rawResponse && typeof rawResponse === 'object' && 'text' in rawResponse ? String(rawResponse.text) : '');

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: responseString.trim() || 'Beklager, jeg kunne ikke generere svar akkurat nå. Prøv igjen om litt!',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Field assistant error:', err);
      const errorMsg: ChatMessage = {
        id: `asst-err-${Date.now()}`,
        role: 'assistant',
        content: 'Det oppstod en midlertidig feil under tilkobling til veilederen. Sjekk internettforbindelsen og prøv på nytt.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Vil du starte en ny samtale med Feltveilederen?')) {
      const reset: ChatMessage[] = [
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: 'Hei igjen! Hva lurer du på i praksishverdagen din i dag?',
          timestamp: new Date().toISOString()
        }
      ];
      setMessages(reset);
      localStorage.setItem('blu_field_assistant_chat', JSON.stringify(reset));
    }
  };

  const handleSaveToKladdebok = (msg: ChatMessage) => {
    const title = msg.content.substring(0, 40).replace(/[#*`_]/g, '').trim() + '...';
    const content = msg.content;
    const category = msg.content.toLowerCase().includes('rammeplan') ? 'Rammeplanen' : 'Didaktisk idé';

    if (onSaveToNotes) {
      onSaveToNotes(title, content, category);
    } else {
      // Direct localStorage append
      try {
        const saved = localStorage.getItem('blu_field_notes');
        const notes = saved ? JSON.parse(saved) : [];
        const newNote = {
          id: `fn-${Date.now()}`,
          title: `[Veilederråd] ${title}`,
          content: content,
          category: category,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('blu_field_notes', JSON.stringify([newNote, ...notes]));
      } catch (e) {
        console.error('Feil ved lagring til Kladdebok:', e);
      }
    }

    setSavedSuccessId(msg.id);
    setTimeout(() => setSavedSuccessId(null), 3000);
  };

  return (
    <div className="w-full max-w-xl mx-auto pb-24 px-3 sm:px-4 flex flex-col min-h-[calc(100vh-140px)]">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-3xl p-5 shadow-md mb-3 flex items-center justify-between shrink-0">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold text-white tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Feltveileder
          </span>
          <h2 className="text-xl font-black mt-2 tracking-tight">Rask faglig sparring</h2>
          <p className="text-xs text-indigo-100 mt-0.5">
            Rammeplan, didaktikk og teori i lomma.
          </p>
        </div>
        <button
          onClick={handleClearChat}
          title="Tøm samtale"
          className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Suggestion Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 shrink-0">
        {FIELD_SUGGESTIONS.map((item, idx) => (
          <button
            key={`sug-${idx}`}
            onClick={() => handleSend(item.prompt)}
            disabled={isLoading}
            className="px-3 py-1.5 bg-white border border-indigo-100 hover:border-indigo-300 text-indigo-900 rounded-xl text-xs font-bold whitespace-nowrap shadow-2xs hover:bg-indigo-50/50 transition-all shrink-0 disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 space-y-3 py-2 overflow-y-auto">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex flex-col",
                isUser ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[90%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs",
                  isUser
                    ? "bg-indigo-600 text-white rounded-br-xs font-medium"
                    : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs"
                )}
              >
                {!isUser ? (
                  <div className="prose prose-xs sm:prose-sm max-w-none text-slate-800">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}

                {/* Assistant message action: Lagre til Kladdebok */}
                {!isUser && m.id !== 'msg-welcome' && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleSaveToKladdebok(m)}
                      className={cn(
                        "inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-[11px] font-bold transition-all",
                        savedSuccessId === m.id
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700"
                      )}
                    >
                      {savedSuccessId === m.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Lagret i Kladdebok!</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Lagre til Kladdebok</span>
                        </>
                      )}
                    </button>

                    {onGoToNotes && (
                      <button
                        onClick={onGoToNotes}
                        className="text-[11px] text-slate-400 hover:text-indigo-600 font-bold flex items-center gap-0.5"
                      >
                        <span>Se notater</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl w-fit">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span className="text-xs text-slate-500 font-medium">Veilederen tenker didaktisk...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="sticky bottom-0 pt-2 bg-gradient-to-t from-white via-white to-transparent">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 bg-white border-2 border-indigo-200 focus-within:border-indigo-600 rounded-2xl p-1.5 shadow-md transition-colors"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Spør om Rammeplan, didaktikk, lekesituasjon..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 transition-all flex items-center justify-center shrink-0 cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
