import React from 'react';

interface ExportButtonProps {
  onClick?: () => void;
  disabled?: boolean;
}

export default function ExportButton({ onClick, disabled }: ExportButtonProps) {
  return (
    // 'group' klassen styrer hover-tilstanden for underliggende elementer
    <div className="relative flex items-center group">
      
      {/* Eksportknappen */}
      <button 
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Last ned tilsynsrapport (PDF)
      </button>

      {/* Selve tooltipen (skjult som standard, vises på group-hover) */}
      <div className="absolute right-0 top-full mt-2 hidden w-64 p-3 text-xs text-white bg-slate-800 rounded shadow-lg group-hover:block z-10 pointer-events-none">
        Genererer en samlerapport for valgt filter/periode inkl. alle fullførte sjekkpunkter og lenkede avvik.
        
        {/* Liten pil som peker opp mot knappen */}
        <div className="absolute -top-1 right-12 w-2 h-2 bg-slate-800 transform rotate-45"></div>
      </div>
      
    </div>
  );
}
