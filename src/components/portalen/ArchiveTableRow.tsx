import React from 'react';
import { Link } from 'react-router-dom';

export interface ArchiveRecord {
  id?: string | number;
  title?: string;
  tittel?: string;
  category?: string;
  kategori?: string;
  department?: string;
  base?: string;
  completedAt?: string | number | Date;
  utfortDato?: string;
  utfortTidspunkt?: string;
  signeeInitials?: string;
  signeeName?: string;
  utfortAv?: string;
  status?: 'avvik' | 'ok' | 'Fullført' | string;
  avvikFunnet?: boolean;
  deviationId?: string | number;
  merknader?: string;
  avvikBeskrivelse?: string;
  lovhjemmel?: string;
  sjekkpunkter?: Array<{ id: string; tekst: string; fullfort: boolean }>;
}

interface ArchiveTableRowProps {
  record: ArchiveRecord;
  onOpenChecklist?: (record: ArchiveRecord) => void;
  onNavigateToDeviation?: (record: ArchiveRecord) => void;
}

export default function ArchiveTableRow({ record, onOpenChecklist, onNavigateToDeviation }: ArchiveTableRowProps) {
  const hasDeviation = record.status === 'avvik' || record.avvikFunnet === true;
  
  const title = record.title || record.tittel || 'Sjekkliste';
  const category = record.category || record.kategori || 'HMS-rutine';
  const department = record.department || record.base || 'Alle baser';
  
  // Format completed date safely
  const formatCompletedDate = () => {
    if (record.completedAt) {
      try {
        const d = new Date(record.completedAt);
        if (!isNaN(d.getTime())) return d.toLocaleDateString('no-NO');
      } catch {
        // fallback
      }
    }
    return record.utfortDato || new Date().toLocaleDateString('no-NO');
  };

  const signeeName = record.signeeName || record.utfortAv || 'Ansatt';
  const signeeInitials = record.signeeInitials || 
    signeeName
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const deviationId = record.deviationId || record.id || '1';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors gap-4">
      
      {/* Sjekkliste Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-slate-800 truncate">{title}</h4>
        <p className="text-xs text-indigo-600 truncate">{category}</p>
      </div>

      {/* Avdeling & Dato */}
      <div className="flex-1 min-w-0 text-sm text-slate-600 hidden md:block">
        {department}
      </div>
      <div className="flex-1 min-w-0 text-sm text-slate-500">
        {formatCompletedDate()}
      </div>

      {/* Signatur */}
      <div className="flex-1 flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold shrink-0">
          {signeeInitials}
        </span>
        <span className="text-sm text-slate-700 truncate hidden lg:block">
          {signeeName}
        </span>
      </div>

      {/* Status (Avvik / OK) */}
      <div className="flex-1">
        {hasDeviation ? (
          // NYTT: Klikkbart avvik som peker til "HMS-Avvik & Internkontroll"
          <Link 
            to={`/hms/avvik/${deviationId}`}
            onClick={(e) => {
              if (onNavigateToDeviation) {
                e.preventDefault();
                onNavigateToDeviation(record);
              }
            }}
            className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
            title="Gå til avviksbehandling"
          >
            ⚠️ Avvik registrert
          </Link>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            ✓ Alt OK
          </span>
        )}
      </div>

      {/* Handlinger (Responsiv optimalisert) */}
      <div>
        <button 
          type="button"
          onClick={() => onOpenChecklist && onOpenChecklist(record)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-md transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {/* NYTT: Teksten skjules på små skjermer for å rydde opp UI */}
          <span className="hidden sm:inline">Se sjekkliste</span>
        </button>
      </div>

    </div>
  );
}
