import React, { useState } from 'react';
import { BookOpen, Info, Quote, X } from 'lucide-react';
import { RagSource } from '../../services/ragChatService';

export interface CitationBadgeProps {
  label: string;
  source?: RagSource;
  fullReference?: string;
  snippet?: string;
  onClick?: () => void;
}

export const CitationBadge: React.FC<CitationBadgeProps> = ({
  label,
  source,
  fullReference,
  snippet,
  onClick
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setIsOpen(!isOpen);
    }
  };

  const displayAuthor = source?.author || source?.authors?.join(', ') || 'Kilde';
  const displayYear = source?.year ? `(${source.year})` : '';
  const displayTitle = source?.title || 'Akademisk litteratur';
  const refText = fullReference || source?.apaCitation || `${displayAuthor} ${displayYear}. ${displayTitle}.`;
  const snippetText = snippet || source?.textSnippet;

  return (
    <span className="inline-block relative my-0.5 mx-0.5 align-baseline">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/80 shadow-2xs transition-all cursor-pointer hover:shadow-xs active:scale-98 group"
        title="Klikk for å se kildeutdrag og APA 7-referanse"
      >
        <BookOpen className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
        <span className="font-mono text-[11px]">{label}</span>
      </button>

      {/* Popover fallback for når onClick-handler ikke sendes inn */}
      {!onClick && isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-xs" 
            onClick={() => setIsOpen(false)} 
          />

          <div className="absolute left-0 bottom-full mb-2 z-50 w-72 sm:w-80 p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                <Quote className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Kilde & APA 7-referanse</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100 leading-snug">{displayTitle}</p>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5 font-medium">{displayAuthor} {displayYear}</p>
              </div>

              <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl text-slate-900 dark:text-slate-100 font-serif leading-relaxed">
                <p className="text-[11px] text-emerald-950 dark:text-emerald-200 select-all font-sans">{refText}</p>
              </div>

              {snippetText && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Utdrag fra kilden:</span>
                  <p className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 italic text-[11px] leading-normal line-clamp-4">
                    "{snippetText}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </span>
  );
};

export default CitationBadge;
