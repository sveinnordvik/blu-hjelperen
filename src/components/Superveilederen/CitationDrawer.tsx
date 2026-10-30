import React, { useState } from 'react';
import { X, BookOpen, Quote, Copy, Check, FileText, Globe, User, Calendar, Tag } from 'lucide-react';
import { RagSource } from '../../services/ragChatService';

export interface CitationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  source: RagSource | null;
}

export const CitationDrawer: React.FC<CitationDrawerProps> = ({
  isOpen,
  onClose,
  source
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !source) return null;

  const displayAuthor = source.author || (source.authors && source.authors.join(', ')) || 'Ukjent forfatter';
  const displayYear = source.year ? String(source.year) : 'Uten år';
  const displayTitle = source.title || 'Akademisk kilde';
  const apaText = source.apaCitation || `${displayAuthor} (${displayYear}). ${displayTitle}.`;
  const pageText = source.pageNumber ? `s. ${source.pageNumber}` : null;

  const handleCopyCitation = () => {
    navigator.clipboard.writeText(apaText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-sans">
      {/* Mørkret bakgrunnsoverlegg */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={onClose} 
      />

      {/* Sidepanel */}
      <aside 
        className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300"
        aria-label="Kildeutdrag og referanse"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
              <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Kildeinnsyn
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  APA 7
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Verifisert utdrag fra litteraturarkivet</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Lukk sidepanel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Innhold */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tittel og forfatter metadata */}
          <div className="space-y-3">
            <h4 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
              {displayTitle}
            </h4>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{displayAuthor}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Utgitt: {displayYear}</span>
              </div>
              {pageText && (
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Sidetall: {pageText}</span>
                </div>
              )}
            </div>
          </div>

          {/* APA 7 Referanseboks */}
          <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <Quote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Komplett APA 7-referanse:
              </span>
              <button
                type="button"
                onClick={handleCopyCitation}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs hover:bg-emerald-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-emerald-600" />}
                <span>{copied ? 'Kopiert!' : 'Kopier referanse'}</span>
              </button>
            </div>
            <p className="text-xs text-emerald-950 dark:text-emerald-100 font-serif leading-relaxed select-all">
              {apaText}
            </p>
          </div>

          {/* Tekstutdrag fra dokumentet */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Tekstutdrag fra kilden ({pageText || 'Dokumentutdrag'}):</span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-200 text-sm leading-relaxed font-sans whitespace-pre-wrap">
              "{source.textSnippet}"
            </div>
          </div>
        </div>

        {/* Binnepunkt / Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Match-relevans: {Math.round((source.score || 0.85) * 100)}%</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 rounded-xl transition cursor-pointer"
          >
            Lukk
          </button>
        </div>
      </aside>
    </div>
  );
};

export default CitationDrawer;
