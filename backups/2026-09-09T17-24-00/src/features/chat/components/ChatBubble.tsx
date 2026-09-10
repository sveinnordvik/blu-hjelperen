import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Lightbulb, Copy, Check } from 'lucide-react';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model' | 'assistant';
  text: string;
  timestamp?: string;
}

interface ChatBubbleProps {
  message: ChatMessage;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group animate-in fade-in slide-in-from-bottom-2 duration-200`}>
      {/* KI Ikon (vises kun for KI-meldinger) */}
      {!isUser && (
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3.5 shrink-0 shadow-xs border border-blue-200 mt-1">
          <Lightbulb size={20} />
        </div>
      )}

      {/* Meldingsboks */}
      <div 
        className={`max-w-[85%] md:max-w-[80%] px-6 py-4 rounded-2xl shadow-xs text-[15px] leading-relaxed transition-all relative group
          ${isUser 
            ? 'bg-blue-600 text-white rounded-br-none shadow-blue-600/10' 
            : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-none prose prose-blue max-w-none shadow-slate-100'
          }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap font-normal">{message.text}</div>
        ) : (
          /* Bruker react-markdown for å style lister, fet skrift, etc. fra Gemini */
          <div className="markdown-body">
            <ReactMarkdown 
              components={{
                p: ({node, ...props}) => <p className="mb-2.5 last:mb-0 leading-relaxed text-slate-800" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2.5 space-y-1 text-slate-800" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2.5 space-y-1 text-slate-800" {...props} />,
                li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                h1: ({node, ...props}) => <h3 className="text-base font-bold text-slate-900 mt-3 mb-1.5" {...props} />,
                h2: ({node, ...props}) => <h4 className="text-sm font-bold text-slate-900 mt-3 mb-1.5" {...props} />,
                h3: ({node, ...props}) => <h5 className="text-sm font-bold text-slate-900 mt-2 mb-1" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-400 bg-blue-50/50 p-2.5 rounded-r-xl italic text-slate-700 my-2 text-sm" {...props} />
              }}
            >
              {message.text}
            </ReactMarkdown>
          </div>
        )}
        
        {/* Bunnrad med tidsstempel og kopieringsknapp */}
        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/60">
          <div className={`text-[11px] font-medium ${isUser ? 'text-blue-200' : 'text-slate-400'}`}>
            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </div>

          {!isUser && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100 flex items-center gap-1 text-[11px] cursor-pointer"
              title="Kopier svar"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-medium">Kopiert!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Kopier</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Bruker Ikon (vises kun for brukermeldinger) */}
      {isUser && (
        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 ml-3.5 shrink-0 shadow-xs border border-slate-300 mt-1">
          <User size={20} />
        </div>
      )}
    </div>
  );
}

export { ChatBubble };
