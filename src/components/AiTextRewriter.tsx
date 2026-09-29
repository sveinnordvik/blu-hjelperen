import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Check, 
  X, 
  RefreshCcw, 
  Target, 
  Type, 
  Loader2,
  Zap,
  Wand2
} from 'lucide-react';
import { rewriteText, performSpraakvask } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface AiTextRewriterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  label?: string;
  isGuest?: boolean;
  disabled?: boolean;
  hideSpraakvask?: boolean;
}

export const AiTextRewriter: React.FC<AiTextRewriterProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  className,
  rows = 4,
  label,
  isGuest = false,
  disabled = false,
  hideSpraakvask = false
}) => {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWashing, setIsWashing] = useState(false);
  const [washNotice, setWashNotice] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleRewrite = async (mode: 'clarity' | 'precision' | 'academic') => {
    if (disabled) return;
    if (isGuest) {
      window.dispatchEvent(new CustomEvent('openAuthModal'));
      return;
    }
    if (!value.trim()) return;
    
    // Check for selection
    let textToRewrite = value;
    let selection = null;
    
    if (textareaRef.current) {
      const { selectionStart, selectionEnd } = textareaRef.current;
      if (selectionStart !== selectionEnd) {
        textToRewrite = value.substring(selectionStart, selectionEnd);
        selection = { start: selectionStart, end: selectionEnd };
      }
    }

    setIsLoading(true);
    setShowOptions(false);
    try {
      const result = await rewriteText(textToRewrite, mode);
      setSuggestion(result);
    } catch (error) {
      console.error("Rewrite error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpraakvask = async () => {
    if (disabled) return;
    if (isGuest) {
      window.dispatchEvent(new CustomEvent('openAuthModal'));
      return;
    }
    if (!value.trim()) return;

    setIsWashing(true);
    try {
      const result = await performSpraakvask(value);
      
      // Bytt ut teksten og oppretthold Undo-historikk
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(0, textareaRef.current.value.length);
        const success = document.execCommand('insertText', false, result);
        
        // Fallback for document.execCommand hvis det blir avvist
        if (!success) {
          onChange(result);
        }
      } else {
        onChange(result);
      }
      
      setWashNotice("Språkvask fullført! Bruk Ctrl+Z / Cmd+Z hvis du vil angre.");
      setTimeout(() => setWashNotice(null), 4000);
    } catch (error) {
      console.error("Språkvask error:", error);
      setWashNotice("Feil under språkvask: Kunne ikke koble til skriveassistenten.");
      setTimeout(() => setWashNotice(null), 4000);
    } finally {
      setIsWashing(false);
    }
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    
    if (textareaRef.current) {
      const { selectionStart, selectionEnd } = textareaRef.current;
      if (selectionStart !== selectionEnd) {
        const newValue = value.substring(0, selectionStart) + suggestion + value.substring(selectionEnd);
        onChange(newValue);
      } else {
        onChange(suggestion);
      }
    } else {
      onChange(suggestion);
    }
    setSuggestion(null);
  };

  return (
    <div className="space-y-2 relative">
      {label && <label className="text-sm font-bold text-slate-800 ml-1">{label}</label>}
      <div className="relative group/ai">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled || isGuest}
          className={cn(
            "w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all resize-none text-slate-900 pr-12 disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        />
        
        <div className="absolute right-3 top-3 flex gap-2 z-10">
          {!hideSpraakvask && (
            <button
              type="button"
              onClick={handleSpraakvask}
              disabled={disabled || isWashing || !value.trim()}
              className={cn(
                "px-3 py-2 rounded-xl border shadow-sm transition-all flex items-center justify-center gap-2 text-xs font-bold",
                isWashing 
                  ? "bg-amber-100 text-amber-700 border-amber-200" 
                  : "bg-white text-slate-600 border-slate-200 hover:text-amber-600 hover:border-amber-300",
                (disabled || !value.trim()) && "opacity-50 cursor-not-allowed"
              )}
              title={disabled ? "Logg inn for å bruke AI" : "Korrektur og klarspråk"}
            >
              {isWashing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isWashing ? "Vasker tekst..." : "✨ Språkvask"}</span>
            </button>
          )}
          
          <div className="relative flex flex-col items-end">
            <button
              type="button"
              onClick={() => !disabled && setShowOptions(!showOptions)}
              disabled={disabled}
              className={cn(
                "p-2 rounded-xl border shadow-sm transition-all flex items-center justify-center",
                showOptions 
                  ? "bg-primary text-white border-primary" 
                  : "bg-white text-slate-400 border-slate-200 hover:text-primary hover:border-primary/30",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              title={disabled ? "Logg inn for å bruke AI" : "AI Omskriving"}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </button>
            
            <AnimatePresence>
            {showOptions && (
              <motion.div key="ap-auto-115-1"
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="absolute right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 min-w-[200px] space-y-1"
              >
                <div className="px-3 py-2 border-b border-slate-50 mb-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Sett tonen</p>
                </div>
                <button
                  onClick={() => handleRewrite('clarity')}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl text-left transition-all group"
                >
                  <RefreshCcw className="w-4 h-4 text-blue-500 group-hover:rotate-45 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">Bedre klarhet</span>
                    <span className="text-[10px] text-slate-400 font-medium">Forenkle språket</span>
                  </div>
                </button>
                <button
                  onClick={() => handleRewrite('precision')}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl text-left transition-all group"
                >
                  <Target className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">Mer presis</span>
                    <span className="text-[10px] text-slate-400 font-medium">Bruk faguttrykk</span>
                  </div>
                </button>
                <button
                  onClick={() => handleRewrite('academic')}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl text-left transition-all group"
                >
                  <Type className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">Akademisk tone</span>
                    <span className="text-[10px] text-slate-400 font-medium">Mer formelt språk</span>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {washNotice && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="p-3 bg-slate-900 text-white text-xs rounded-xl shadow-md flex items-center justify-between gap-2"
          >
            <span>{washNotice}</span>
            <button onClick={() => setWashNotice(null)} className="text-slate-400 hover:text-white p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {suggestion && (
          <motion.div key="ap-auto-116-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-primary-light/20 border border-primary/20 rounded-2xl p-4 mt-2 relative shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-xs font-black text-primary uppercase tracking-widest italic">AI-forslag</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSuggestion(null)}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-red-500 transition-all border border-transparent shadow-sm"
                  title="Forkast"
                >
                  <X className="w-4 h-4" />
                </button>
                <button 
                  onClick={applySuggestion}
                  className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
                >
                  <Check className="w-4 h-4" /> Bruk dette forslaget
                </button>
              </div>
            </div>
            <div className="p-3 bg-white/50 rounded-xl border border-white/50">
                <p 
                  className="text-sm text-slate-800 leading-relaxed italic"
                  style={{ fontFamily: "'Times New Roman', Times, serif" }}
                >
                {suggestion}
                </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
