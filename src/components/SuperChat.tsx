import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Volume2, Brain, BookOpen, Quote, PenTool, Sparkles, Square, Check, Copy, HeartHandshake, Mic } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import AIWarning from './AIWarning';
import { 
  superAgentRouter, 
  askSocraticAgent, 
  askRagAgent, 
  askLyttebot, 
  generateAutoAPA, 
  improveAcademicWriting, 
  generateAcademicResponse,
  playAudio as playAudioService,
  stopAudio as stopAudioService
} from '../services/geminiService';

export interface SuperChatMessage {
  role: 'assistant' | 'user';
  agent?: 'SOKRATISK' | 'RAG' | 'APA' | 'SPRAK' | 'LYTTE' | 'GENERELL' | 'FEIL' | string;
  content: string;
}

export interface SuperChatProps {
  user?: any;
  didacticProfile?: {
    frameworkFocus?: string;
    coreValues?: string[];
    [key: string]: any;
  } | null;
  initialMode?: 'AUTO' | 'SOKRATISK' | 'RAG' | 'SPRAK' | 'APA';
}

export function SuperChat({ user, didacticProfile, initialMode = 'AUTO' }: SuperChatProps) {
  const [selectedMode, setSelectedMode] = useState<'AUTO' | 'SOKRATISK' | 'RAG' | 'SPRAK' | 'APA'>(initialMode);
  const [messages, setMessages] = useState<SuperChatMessage[]>([
    { 
      role: 'assistant', 
      agent: 'GENERELL',
      content: 'Hei! Jeg er Super-Veilederen din. Still et åpent spørsmål eller velg modus ovenfor: Sokratisk sparring (refleksjon uten fasit), Rammeplan & Lovverk, Språkvask eller Auto-APA.' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const isInitialMount = useRef(true);

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

  useEffect(() => {
    return () => {
      stopAudioService();
    };
  }, []);

  const playAudio = (text: string, idx: number) => {
    if (playingIndex === idx) {
      stopAudioService();
      setPlayingIndex(null);
      return;
    }

    setPlayingIndex(idx);
    playAudioService(text, {
      onStart: () => setPlayingIndex(idx),
      onEnd: () => setPlayingIndex(null),
      onError: (err) => {
        console.error('Audio playback error:', err);
        setPlayingIndex(null);
      }
    });
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idx);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText || input).trim();
    if (!textToSend || isLoading) return;
    
    const updatedMessages: SuperChatMessage[] = [...messages, { role: 'user', content: textToSend }];
    setMessages(updatedMessages);
    if (!overrideText) setInput('');
    setIsLoading(true);

    try {
      // 1. Bestem agentType basert på valgt modus eller automatisk ruting
      let agentType = selectedMode === 'AUTO' ? await superAgentRouter(textToSend) : selectedMode;
      
      let responseText = '';
      
      // 2. Diriger til riktig underagent
      switch (agentType) {
        case 'SOKRATISK':
          responseText = await askSocraticAgent(
            updatedMessages.map(m => ({ role: m.role, content: m.content })),
            didacticProfile
          );
          break;
        case 'RAG':
          responseText = await askRagAgent(
            textToSend,
            updatedMessages.map(m => ({ role: m.role, content: m.content }))
          );
          break;
        case 'APA':
          responseText = await generateAutoAPA(textToSend);
          break;
        case 'SPRAK':
          responseText = await improveAcademicWriting(textToSend, 'Akademisk finpuss');
          break;
        case 'LYTTE':
          responseText = await askLyttebot(
            updatedMessages.map(m => ({ role: m.role, content: m.content }))
          );
          break;
        default:
          responseText = await generateAcademicResponse(
            textToSend, 
            updatedMessages.map(m => ({ role: m.role, content: m.content })), 
            'balanced', 
            didacticProfile || {}
          );
      }

      setMessages(prev => [...prev, { role: 'assistant', agent: agentType, content: responseText }]);
    } catch (error) {
      console.error("SuperChat error:", error);
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          agent: 'FEIL', 
          content: 'Beklager, det oppstod en feil under behandling av forespørselen. Prøv igjen om et øyeblikk.' 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAgentStyling = (agent?: string) => {
    switch (agent) {
      case 'SOKRATISK': 
        return { icon: <Brain className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Sokratisk Partner' };
      case 'RAG': 
        return { icon: <BookOpen className="w-4 h-4" />, color: 'bg-indigo-100 text-indigo-700 border-indigo-200', label: 'Lovverk & Rammeplan' };
      case 'APA': 
        return { icon: <Quote className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Auto-APA' };
      case 'SPRAK': 
        return { icon: <PenTool className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Skriveboten' };
      case 'LYTTE':
        return { icon: <HeartHandshake className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Lytteboten' };
      default: 
        return { icon: <Sparkles className="w-4 h-4" />, color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Superveilederen' };
    }
  };

  return (
    <div className="flex flex-col h-[740px] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden w-full max-w-4xl mx-auto font-sans">
      {/* Header bar */}
      <div className="p-4 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Superveilederen</h3>
            <p className="text-xs text-slate-500 font-medium">Sokratisk sparring, Rammeplan, APA og akademisk skrivehjelp</p>
          </div>
        </div>

        {/* Modusvelger: Inkluderer Sokratisk Partner sømløst */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedMode('AUTO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedMode === 'AUTO'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto</span>
          </button>

          <button
            onClick={() => setSelectedMode('SOKRATISK')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedMode === 'SOKRATISK'
                ? 'bg-purple-600 text-white shadow-xs shadow-purple-600/20'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Sokratisk partner</span>
          </button>

          <button
            onClick={() => setSelectedMode('RAG')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedMode === 'RAG'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Rammeplan</span>
          </button>

          <button
            onClick={() => setSelectedMode('SPRAK')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedMode === 'SPRAK'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Språkvask</span>
          </button>

          <button
            onClick={() => setSelectedMode('APA')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedMode === 'APA'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
            }`}
          >
            <Quote className="w-3.5 h-3.5" />
            <span>APA</span>
          </button>
        </div>

        {playingIndex !== null && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-blue-700 text-xs font-bold animate-pulse">
            <Volume2 className="w-4 h-4" />
            <span>Spiller av...</span>
            <button 
              onClick={() => { stopAudioService(); setPlayingIndex(null); }}
              className="ml-1 p-0.5 hover:bg-blue-200 rounded cursor-pointer"
              title="Stopp lyd"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        )}
      </div>

      {/* Sokratisk Modus Banner */}
      {selectedMode === 'SOKRATISK' && (
        <div className="bg-purple-50/80 border-b border-purple-100 px-6 py-2.5 flex items-center justify-between text-xs text-purple-900 font-medium">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600 shrink-0" />
            <span><strong>Sokratisk modus aktiv:</strong> Veilederen gir ingen fasitsvar, men stiller utforskende spørsmål for å trene din faglige refleksjon.</span>
          </div>
          <button 
            onClick={() => setSelectedMode('AUTO')}
            className="text-purple-600 hover:text-purple-800 underline font-bold ml-2 shrink-0 cursor-pointer"
          >
            Nullstill til Auto
          </button>
        </div>
      )}

      {/* Messages Container */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const agentStyle = !isUser ? getAgentStyling(msg.agent) : null;
          const isPlaying = playingIndex === idx;

          return (
            <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[85%] flex flex-col gap-2">
                
                {/* Agent Tag for assistenten */}
                {!isUser && msg.agent !== 'FEIL' && agentStyle && (
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full w-fit border text-xs font-bold shadow-2xs ${agentStyle.color}`}>
                    {agentStyle.icon}
                    <span className="text-[10px] font-black uppercase tracking-wider">{agentStyle.label}</span>
                  </div>
                )}

                <div className={`p-4 rounded-2xl text-sm leading-relaxed relative group ${
                  isUser 
                    ? 'bg-blue-600 text-white rounded-br-sm shadow-sm shadow-blue-600/10' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                }`}>
                  <div className="prose prose-sm max-w-none prose-slate">
                    <ReactMarkdown>{typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2)}</ReactMarkdown>
                  </div>
                  
                  {/* Actions for assistant message */}
                  {!isUser && (
                    <div className="absolute -right-20 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {/* Pensum på øret - Lytteknapp */}
                      <button 
                        onClick={() => playAudio(msg.content, idx)}
                        className={`p-2 rounded-xl shadow-sm border transition-all flex items-center justify-center cursor-pointer ${
                          isPlaying 
                            ? 'bg-blue-600 text-white border-blue-600 animate-pulse' 
                            : 'bg-white border-slate-200 text-slate-400 hover:text-blue-600'
                        }`}
                        title={isPlaying ? "Stopp opplesing" : "Pensum på øret (Les opp tekst)"}
                      >
                        {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
                      </button>

                      {/* Kopier knapp */}
                      <button 
                        onClick={() => copyToClipboard(msg.content, idx)}
                        className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-400 hover:text-blue-600 transition-all cursor-pointer"
                        title="Kopier tekst"
                      >
                        {copiedId === idx ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Hurtigforslag for Sokratisk refleksjon */}
        {selectedMode === 'SOKRATISK' && messages.length <= 2 && (
          <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-2">
            <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
              Prøv et sokratisk refleksjonsspørsmål:
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                "Hvordan kan jeg ivareta barns medvirkning i en travel garderobesituasjon?",
                "Et barn trekker seg unna i frileken. Hva bør jeg observere før jeg griper inn?",
                "Hvordan skiller jeg mellom danning og oppdragelse i en konfliktsituasjon?",
                "Hva betyr pedagogisk skjønn i praksis når Rammeplanen er åpen for tolkning?"
              ].map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleSend(prompt)}
                  className="px-3 py-1.5 bg-white border border-purple-200 text-purple-900 rounded-xl text-xs hover:bg-purple-100 hover:border-purple-300 transition-all text-left font-medium cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                {selectedMode === 'SOKRATISK' ? 'Utformer sokratiske refleksjonsspørsmål...' : 'Analyserer og ruter til spesialist...'}
              </span>
            </div>
          </div>
        )}
        <div className="h-2" />
      </div>

      {/* Input area */}
      <div className="p-4 bg-white border-t border-slate-100 space-y-3">
        <div className="relative flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={
                selectedMode === 'SOKRATISK'
                  ? "Del en situasjon fra praksis eller et dilemma du vil reflektere over..."
                  : "Hvordan kan jeg hjelpe deg med studiene i dag?"
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none min-h-[56px] max-h-[120px]"
              rows={1}
            />
            <div 
              className="absolute right-3 bottom-3 text-slate-400 hover:text-blue-600 transition-colors cursor-help"
              title="Trykk Win+H (Windows) eller Fn+Fn (Mac) for å diktere"
            >
              <Mic className="w-5 h-5" />
            </div>
          </div>
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="h-[56px] px-6 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0 cursor-pointer active:scale-95"
            title="Send melding"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <AIWarning compact={true} dismissible={true} />
      </div>
    </div>
  );
}
export default SuperChat;
