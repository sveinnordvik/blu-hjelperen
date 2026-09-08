import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, User, Sparkles, Volume2, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { askTeamAgent, playAudio, stopAudio, ChatHistoryItem } from '../services/geminiService';

export interface TeamMessage {
  role: 'agent' | 'user';
  sender: string;
  content: string;
  timestamp?: string;
  id?: string;
}

interface TeamChatProps {
  sharedRagContext?: string;
  currentUser?: any;
  initialMessages?: TeamMessage[];
  onUpdateMessages?: (messages: TeamMessage[]) => void;
}

export function TeamChat({ 
  sharedRagContext = '', 
  currentUser,
  initialMessages,
  onUpdateMessages
}: TeamChatProps) {
  const [messages, setMessages] = useState<TeamMessage[]>(() => {
    return initialMessages && initialMessages.length > 0 ? initialMessages : [
      { 
        role: 'agent', 
        sender: 'Praksis-agenten', 
        content: 'Hei teamet! 👋 Jeg har lest gjennom fellesnotatene våre og er klar til å sparre om oppgaven og pensum når dere trenger det.',
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [playingAudioIdx, setPlayingAudioIdx] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (askAgent = false) => {
    const text = input.trim();
    if (!text || isLoading) return;

    const currentUserName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Student';
    const currentTime = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });

    const userMessage: TeamMessage = { 
      role: 'user', 
      sender: currentUserName, 
      content: text,
      timestamp: currentTime
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    if (onUpdateMessages) onUpdateMessages(updatedHistory);
    setInput('');

    // Hvis studenten spesifikt ber agenten om å svare eller nevner spørsmål/agent
    const lowerText = text.toLowerCase();
    const shouldAskAgent = askAgent || 
      lowerText.includes('@praksis') || 
      lowerText.includes('@agent') || 
      lowerText.includes('@bot') ||
      lowerText.endsWith('?');

    if (shouldAskAgent) {
      setIsLoading(true);
      try {
        const historyForAI: ChatHistoryItem[] = updatedHistory.map(m => ({
          role: m.role,
          sender: m.sender,
          content: m.content
        }));

        const agentResponse = await askTeamAgent(historyForAI, sharedRagContext);
        
        const agentMessage: TeamMessage = { 
          role: 'agent', 
          sender: 'Praksis-agenten', 
          content: agentResponse,
          timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
        };

        const finalHistory = [...updatedHistory, agentMessage];
        setMessages(finalHistory);
        if (onUpdateMessages) onUpdateMessages(finalHistory);
      } catch (error: any) {
        console.error("Feil ved svar fra Praksis-agenten:", error);
        const fallbackMsg: TeamMessage = {
          role: 'agent',
          sender: 'Praksis-agenten',
          content: 'Godt innspill! Hvis vi ser på det vi noterte i fellesnotatene, kan vi koble denne observasjonen direkte til Rammeplanen og relevant pensumteori.',
          timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
        };
        const finalHistory = [...updatedHistory, fallbackMsg];
        setMessages(finalHistory);
        if (onUpdateMessages) onUpdateMessages(finalHistory);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleToggleAudio = (index: number, text: string) => {
    if (playingAudioIdx === index) {
      stopAudio();
      setPlayingAudioIdx(null);
    } else {
      setPlayingAudioIdx(index);
      playAudio(text, {
        onEnd: () => setPlayingAudioIdx(null),
        onError: () => setPlayingAudioIdx(null)
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50/70 rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm h-[640px]">
      {/* Top Banner */}
      <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <h3 className="font-black text-slate-900 text-sm md:text-base">Gruppechat & Faglig Sparring</h3>
            <p className="text-[11px] text-slate-500 font-medium">Praksis-agenten deltar som likeverdig 4. medlem</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-xl border border-primary/20">
          <BookOpen className="w-3.5 h-3.5" />
          RAG-kontekst aktiv
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => {
          const currentUserName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Student';
          const isMe = msg.sender === currentUserName || (msg.role === 'user' && !msg.sender);
          const isAgent = msg.role === 'agent';
          
          return (
            <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className={`text-[10px] font-bold flex items-center gap-1 ${isAgent ? 'text-primary' : 'text-slate-400'}`}>
                  {isAgent ? <Bot className="w-3.5 h-3.5 text-primary" /> : <User className="w-3.5 h-3.5 text-slate-400" />}
                  {msg.sender}
                </span>
                {msg.timestamp && (
                  <span className="text-[10px] text-slate-400 font-normal">• {msg.timestamp}</span>
                )}
              </div>

              <div className={`max-w-[85%] md:max-w-[78%] p-4 rounded-2xl text-sm leading-relaxed ${
                isMe 
                  ? 'bg-slate-800 text-white rounded-br-sm shadow-md' 
                  : isAgent 
                  ? 'bg-gradient-to-br from-primary-light/40 via-white to-primary-light/20 border border-primary/25 text-slate-800 rounded-bl-sm shadow-sm' 
                  : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm'
              }`}>
                {isAgent ? (
                  <div className="prose prose-sm prose-slate max-w-none text-slate-800">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    <div className="mt-2.5 pt-2.5 border-t border-primary/15 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Koblet mot gruppens notater
                      </span>
                      <button
                        onClick={() => handleToggleAudio(idx, msg.content)}
                        className="p-1 bg-white hover:bg-slate-50 rounded-lg text-primary transition-colors flex items-center gap-1 font-bold text-[10px] border border-primary/20"
                        title="Lytt til svar"
                      >
                        <Volume2 className={`w-3 h-3 ${playingAudioIdx === idx ? 'animate-pulse text-amber-500' : ''}`} />
                        {playingAudioIdx === idx ? 'Stopp' : 'Lytt'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold text-primary mb-1 ml-1 flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-primary" /> Praksis-agenten
            </span>
            <div className="bg-primary-light/40 border border-primary/30 p-3.5 rounded-2xl rounded-bl-sm flex items-center gap-2 shadow-sm">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-xs text-primary font-bold">Leser fellesnotatene og tenker faglig...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input controls */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex gap-2 items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(false); }}
            placeholder="Skriv til gruppen, eller trykk på robotknappen for å spørre agenten..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
          />
          <button 
            type="button"
            onClick={() => handleSend(true)}
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 bg-primary-light/60 text-primary border border-primary/30 rounded-xl font-bold hover:bg-primary hover:text-white transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            title="Spør Praksis-agenten direkte"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Spør agent</span>
          </button>
          <button 
            type="button"
            onClick={() => handleSend(false)}
            disabled={!input.trim() || isLoading}
            className="px-5 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all disabled:opacity-50 shadow-md flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
