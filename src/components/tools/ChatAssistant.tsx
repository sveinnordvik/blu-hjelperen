import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  ShieldCheck, 
  Settings, 
  Trash2, 
  Copy, 
  Check, 
  Loader2, 
  Send,
  Sparkles,
  Wand2,
  Volume2,
  Square,
  BookOpen,
  Compass,
  Quote,
  Scale,
  Search,
  HeartHandshake
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { performSpraakvask, playAudio, stopAudio } from '../../services/geminiService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  agentTag?: 'SOKRATISK' | 'RAG' | 'APA' | 'SPRAK' | 'METODE' | 'LYTTE' | 'GENERELL' | string;
}

interface ChatAssistantProps {
  user: any;
  isGuest: boolean;
  strictness: 'supportive' | 'balanced' | 'critical';
  setStrictness: (val: 'supportive' | 'balanced' | 'critical') => void;
  setShowTaskSetup: (val: boolean) => void;
  handleClearChat: () => void;
  messages: Message[];
  copyToClipboard: (content: string, id: string) => void;
  copiedId: string | null;
  isLoading: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  input: string;
  setInput: (val: string) => void;
  handleSendMessage: () => void;
  onGenerateOutlineFromChat: () => void;
  isGeneratingOutline: boolean;
}

const AGENT_META: Record<string, { label: string; icon: any; badgeClass: string; desc: string }> = {
  RAG: {
    label: 'Rammeplan & Lovverk (RAG)',
    icon: Scale,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'Spesialist på Rammeplanen 2017 & Barnehageloven'
  },
  SOKRATISK: {
    label: 'Sokratisk Partner',
    icon: Compass,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'Veileder gjennom undring og åpne spørsmål'
  },
  APA: {
    label: 'APA 7 Spesialist',
    icon: Quote,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    desc: 'Formatering og kildehenvisninger'
  },
  SPRAK: {
    label: 'Språk & Akademisk Stil',
    icon: Wand2,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    desc: 'Klarspråk og akademisk setningsbygning'
  },
  METODE: {
    label: 'Metode & Forskning',
    icon: Search,
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    desc: 'Vitenskapelig metode, observasjon, intervju og NESH-etikk'
  },
  LYTTE: {
    label: 'Lyttebot (Debrifing)',
    icon: HeartHandshake,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    desc: 'Empatisk debrifing og omsorg etter krevende praksis'
  },
  GENERELL: {
    label: 'Super-Veileder',
    icon: Sparkles,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    desc: 'Akademisk skrivepartner for barnehagelærerstudenter'
  }
};

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  user,
  isGuest,
  strictness,
  setStrictness,
  setShowTaskSetup,
  handleClearChat,
  messages,
  copyToClipboard,
  copiedId,
  isLoading,
  chatEndRef,
  input,
  setInput,
  handleSendMessage,
  onGenerateOutlineFromChat,
  isGeneratingOutline
}) => {
  const [isWashing, setIsWashing] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Stopp eventuell pågående lyd når komponenten unmountes
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const handleToggleAudio = (content: string, index: number) => {
    if (playingIndex === index) {
      stopAudio();
      setPlayingIndex(null);
      return;
    }

    setPlayingIndex(index);
    playAudio(content, {
      onStart: () => setPlayingIndex(index),
      onEnd: () => setPlayingIndex(null),
      onError: (err) => {
        console.error("Audio playback error:", err);
        setPlayingIndex(null);
      }
    });
  };

  const handleClearWithAudioStop = () => {
    stopAudio();
    setPlayingIndex(null);
    handleClearChat();
  };

  const handleSpraakvask = async () => {
    if (isGuest || !input.trim() || isWashing) return;

    setIsWashing(true);
    try {
      const result = await performSpraakvask(input);
      
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(0, inputRef.current.value.length);
        const success = document.execCommand('insertText', false, result);
        if (!success) setInput(result);
      } else {
        setInput(result);
      }
    } catch (error: any) {
      console.error("Språkvask error:", error);
      const msg = error?.message?.includes("Akkurat nå er det veldig stor pågang") 
        ? error.message 
        : "Feil under språkvask: Kunne ikke koble til AI-Assistenten.";
      alert(msg);
    } finally {
      setIsWashing(false);
    }
  };

  return (
    <motion.div 
      key="chat"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
    >
      {/* Top Header */}
      <div className="p-2.5 sm:p-3.5 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider">Veiledningsgrad:</span>
          </div>
          <div className="flex flex-wrap items-center bg-white p-0.5 sm:p-1 rounded-lg border border-slate-200 shadow-sm whitespace-nowrap">
            {[
              { id: 'supportive', label: 'Støttende', color: 'text-emerald-600' },
              { id: 'balanced', label: 'Balansert', color: 'text-primary' },
              { id: 'critical', label: 'Kritisk', color: 'text-red-600' }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStrictness(s.id as any)}
                className={cn(
                  "px-2 sm:px-3 py-1 rounded-md text-[9px] sm:text-[10px] font-bold transition-all shrink-0",
                  strictness === s.id 
                    ? "bg-slate-100 shadow-inner " + s.color
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Global audio playing status bar if active */}
        {playingIndex !== null && (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg text-primary text-xs font-bold animate-pulse">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Pensum på øret spilles av...</span>
            <button 
              onClick={() => { stopAudio(); setPlayingIndex(null); }}
              className="ml-1 p-0.5 hover:bg-primary/20 rounded text-primary"
              title="Stopp lyd"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowTaskSetup(true)}
            disabled={isGuest}
            className={cn(
              "p-2 text-slate-400 hover:text-primary hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200",
              isGuest && "opacity-50 cursor-not-allowed"
            )}
            title={isGuest ? "Logg inn for å endre oppsett" : "Endre oppgaveoppsett"}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button 
            onClick={handleClearWithAudioStop}
            disabled={isGuest}
            className={cn(
              "p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200",
              isGuest && "opacity-50 cursor-not-allowed"
            )}
            title={isGuest ? "Logg inn for å tømme chat" : "Tøm chat"}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {isGuest && (
          <div className="flex justify-start">
            <div className="bg-amber-50 text-amber-900 border border-amber-100 rounded-2xl px-4 py-3 text-sm flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="font-medium animate-pulse">Logg inn for å snakke med assistenten.</p>
            </div>
          </div>
        )}

        {messages.length === 0 && !isGuest && (
          <div className="py-8 text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Super-Veilederen er klar til å hjelpe deg</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Still spørsmål om praksiserfaringer, Rammeplanen 2017, Barnehageloven, APA 7-kildehenvisninger eller be om språklig tilbakemelding. Super-Veilederen ruter deg automatisk til riktig ekspert!
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 text-left">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                <span className="font-bold block text-slate-800">🏛️ Rammeplan / Lov</span>
                «Hva sier rammeplanen om barns rett til medvirkning i måltider?»
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                <span className="font-bold block text-slate-800">🦉 Sokratisk undring</span>
                «Jeg opplevde en konflikt under samlingsstund, hvordan kan jeg drøfte dette?»
              </div>
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const agentKey = m.agentTag || 'GENERELL';
          const meta = AGENT_META[agentKey] || AGENT_META.GENERELL;
          const AgentIcon = meta.icon;
          const isPlaying = playingIndex === i;

          return (
            <div key={`msg-${i}-${m.role}-${m.content.substring(0, 20)}`} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[88%] rounded-2xl px-4 py-3 text-sm relative group transition-all",
                m.role === 'user' 
                  ? "bg-primary text-white rounded-tr-none shadow-sm" 
                  : "bg-slate-50/90 text-slate-800 rounded-tl-none border border-slate-200"
              )}>
                {/* Assistant Specialist Agent Badge */}
                {m.role === 'assistant' && (
                  <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-200/70">
                    <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border", meta.badgeClass)}>
                      <AgentIcon className="w-3 h-3" />
                      <span>{meta.label}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Pensum på øret / Lyttebot Button */}
                      <button 
                        onClick={() => handleToggleAudio(m.content, i)}
                        className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 border shadow-2xs",
                          isPlaying 
                            ? "bg-primary text-white border-primary animate-pulse" 
                            : "bg-white text-slate-600 border-slate-200 hover:text-primary hover:border-primary/40 hover:bg-slate-50"
                        )}
                        title={isPlaying ? "Stopp opplesing" : "Pensum på øret: Lytt til svaret"}
                      >
                        {isPlaying ? (
                          <>
                            <Square className="w-3 h-3 fill-current" />
                            <span>Stopp</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Pensum på øret</span>
                          </>
                        )}
                      </button>

                      {/* Copy message button */}
                      <button 
                        onClick={() => copyToClipboard(m.content, `chat-${i}`)}
                        className={cn(
                          "p-1 rounded-md bg-white border border-slate-200 shadow-2xs transition-all hover:bg-slate-50 text-slate-400 hover:text-primary",
                          copiedId === `chat-${i}` && "text-emerald-500 border-emerald-200"
                        )}
                        title="Kopier til utklippstavle"
                      >
                        {copiedId === `chat-${i}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* User Message Action */}
                {m.role === 'user' && (
                  <button 
                    onClick={() => copyToClipboard(m.content, `chat-${i}`)}
                    className={cn(
                      "absolute -right-2 -top-2 p-1.5 rounded-lg bg-white border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-50 text-slate-400 hover:text-primary",
                      copiedId === `chat-${i}` && "opacity-100 text-emerald-500 border-emerald-100"
                    )}
                    title="Kopier melding"
                  >
                    {copiedId === `chat-${i}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}

                <div className="prose prose-sm max-w-none prose-slate">
                  <ReactMarkdown>{typeof m.content === 'string' ? m.content : JSON.stringify(m.content, null, 2)}</ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-50 rounded-2xl rounded-tl-none px-4 py-3.5 border border-slate-200 flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs font-bold text-slate-500 animate-pulse">Super-Veilederen analyserer og konsulterer spesialist-agent...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input & Action Bar */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        {messages.length > 0 && (
          <div className="mb-4">
            <button
              onClick={onGenerateOutlineFromChat}
              disabled={isGeneratingOutline || isGuest}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm",
                (isGeneratingOutline || isGuest)
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200"
              )}
            >
              {isGeneratingOutline ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Lager plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {isGuest ? "🔒 Logg inn for å lage disposisjon" : "✨ Lag disposisjon av samtalen"}
                </>
              )}
            </button>
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          {input.trim().length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSpraakvask}
                disabled={isGuest || isWashing}
                className={cn(
                  "px-3 py-1.5 rounded-lg border shadow-xs transition-all flex items-center justify-center gap-2 text-[11px] font-bold",
                  isWashing 
                    ? "bg-amber-100 text-amber-700 border-amber-200" 
                    : "bg-white text-slate-600 border-slate-200 hover:text-amber-600 hover:border-amber-300",
                  (isGuest || isWashing) && "opacity-50 cursor-not-allowed"
                )}
                title={isGuest ? "Logg inn for å bruke AI" : "Korrektur og klarspråk på meldingen"}
              >
                {isWashing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                {isWashing ? "Vasker tekst..." : "✨ Språkvask"}
              </button>
            </div>
          )}
          <div className="relative flex items-center">
            <input 
              ref={inputRef}
              type="text" 
              value={input}
              disabled={isGuest}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isGuest ? "🔒 Logg inn for å bruke assistenten" : "Spør om praksisrefleksjon, Rammeplanen 2017, APA eller språk..."}
              className={cn(
                "w-full bg-white border border-slate-300 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all",
                isGuest && "opacity-50 cursor-not-allowed bg-slate-50"
              )}
            />
            <button 
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isLoading || isGuest}
              className="absolute right-2 p-2 bg-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-center mt-2 text-slate-400">
          Super-Veilederen ruter forespørselen automatisk til riktig ekspert (Sokratisk, RAG, APA eller Språk).
        </p>
      </div>
    </motion.div>
  );
};

