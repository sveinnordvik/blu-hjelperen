import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Mic, Send, Loader2, Brain } from 'lucide-react';
import { askSocraticAgent } from '../services/geminiService';
import AIWarning from './AIWarning';

export interface SocraticPartnerProps {
  user?: any;
  didacticProfile?: {
    frameworkFocus?: string;
    coreValues?: string[];
    [key: string]: any;
  } | null;
}

export function SocraticPartner({ user, didacticProfile }: SocraticPartnerProps) {
  const [messages, setMessages] = useState<Array<{ role: 'assistant' | 'user'; content: string }>>([
    { role: 'assistant', content: 'Hei! Jeg er din sokratiske sparringspartner. Fortell meg kort om en situasjon fra praksis eller et tema du står fast i, så utforsker vi det sammen.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const isInitialMount = useRef(true);

  const scrollToBottom = () => {
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
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const newMessages: Array<{ role: 'assistant' | 'user'; content: string }> = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Kaller den ekte Gemini-funksjonen med historikk og profil
      const responseText = await askSocraticAgent(newMessages, didacticProfile);
      
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch (error) {
      console.error("Feil i sokratisk chat:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Beklager, jeg mistet tråden et øyeblikk. Kan du gjenta det?' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 bg-primary text-white flex items-center gap-4">
        <div className="bg-white/20 p-3 rounded-2xl">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tight">Sokratisk Refleksjonspartner</h2>
          <p className="text-sm font-medium opacity-90">Jeg gir ingen svar, kun bedre spørsmål.</p>
        </div>
      </div>

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-br-sm' 
                : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Tenker...</span>
            </div>
          </div>
        )}
        <div className="h-2" />
      </div>

      <div className="p-4 bg-white border-t border-slate-100 space-y-3">
        <div className="relative flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Skriv eller bruk systemets diktering..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none min-h-[60px]"
            />
            <div 
              className="absolute right-3 bottom-3 text-slate-400 hover:text-primary transition-colors cursor-help"
              title="Trykk Win+H (Windows) eller Fn+Fn (Mac) for å diktere"
            >
              <Mic className="w-5 h-5" />
            </div>
          </div>
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-[60px] px-6 bg-primary text-white rounded-2xl font-bold hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center justify-center shadow-md shadow-primary/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <AIWarning compact={true} dismissible={true} />
      </div>
    </div>
  );
}

export default SocraticPartner;
