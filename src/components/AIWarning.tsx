import React, { useState } from 'react';
import { AlertCircle, Info, X } from 'lucide-react';

interface AIWarningProps {
  className?: string;
  compact?: boolean;
  dismissible?: boolean;
}

export default function AIWarning({ 
  className = '', 
  compact = false,
  dismissible = false 
}: AIWarningProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/90 text-amber-900 border border-amber-200/80 text-[11px] leading-snug ${className}`}>
        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <p className="flex-1">
          <strong>Viktig huskelapp:</strong> KI kan generere feilaktige opplysninger. Dobbeltsjekk alltid faglitteratur og Rammeplanen for barnehagen.
        </p>
        {dismissible && (
          <button 
            onClick={() => setIsDismissed(true)} 
            className="text-amber-500 hover:text-amber-800 p-0.5 rounded transition-colors"
            title="Lukk varsel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-amber-950 text-xs shadow-xs relative ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100/80 text-amber-700 rounded-xl shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div className="space-y-1 pr-6">
          <h4 className="font-bold text-amber-900 text-xs tracking-tight">
            Viktig huskelapp om KI
          </h4>
          <p className="text-amber-800/90 leading-relaxed text-[11px]">
            BLU-hjelperen bruker kunstig intelligens og kan av og til generere feilaktige opplysninger eller unøyaktigheter. Husk alltid å dobbeltsjekke faglitteratur, styringsdokumenter som Rammeplan for barnehagen og egne observasjoner før du bruker informasjonen i din studiehverdag eller praksis.
          </p>
        </div>
      </div>
      {dismissible && (
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute right-3 top-3 text-amber-600 hover:text-amber-900 p-1 rounded-lg hover:bg-amber-100/50 transition-colors"
          title="Lukk varsel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export { AIWarning };
