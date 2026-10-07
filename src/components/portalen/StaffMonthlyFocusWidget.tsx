import React from 'react';
import { Target, Info, Calendar, ArrowRight } from 'lucide-react';

interface StaffMonthlyFocusWidgetProps {
  month?: string;
  theme?: string;
  goals?: string;
  activities?: string;
  onReadFullPlan?: () => void;
}

export default function StaffMonthlyFocusWidget({ 
  month,
  theme,
  goals,
  activities,
  onReadFullPlan
}: StaffMonthlyFocusWidgetProps) {
  // Les synket månedsdata fra LocalStorage hvis props ikke er eksplisitt overstyrt
  const currentMonthName = month || "Oktober";

  const getSyncedMonthData = () => {
    try {
      const saved = localStorage.getItem('barnehage_maaned_planer');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed[currentMonthName]) {
          return parsed[currentMonthName];
        }
      }
    } catch (e) {
      console.error("Feil ved lesing av synket månedsplan:", e);
    }
    return null;
  };

  const monthData = getSyncedMonthData();

  const displayTheme = theme || monthData?.theme || "Eventyret om skinnvotten";
  const displayGoals = goals || monthData?.goals || "Barna skal få kjennskap til fortellingen, og vi skal fokusere på begrepene 'rom' og 'inkludering'.";
  const displayActivities = activities || monthData?.activities || "- Dramatisering i samlingsstund\n- Lage egne skinnvotter i formingsaktivitet\n- Bålsamtaler i skoggruppa";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden font-sans animate-fade-in">
      
      {/* Header */}
      <div className="bg-[#1e1b4b] p-4 sm:p-5 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs text-indigo-200 font-bold uppercase tracking-wider">
              Månedens Fokus: {currentMonthName}
            </span>
            <span className="bg-amber-400/20 text-amber-300 text-[10px] px-2 py-0.5 rounded font-bold border border-amber-400/30">
              Aktiv Satsing
            </span>
          </div>
          <p className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
            <Target size={20} className="text-amber-400 shrink-0" />
            <span>{displayTheme}</span>
          </p>
        </div>
        
        {/* Lenke for å lese hele månedsplanen hvis de vil gå dypere */}
        {onReadFullPlan && (
          <button 
            type="button"
            onClick={onReadFullPlan}
            className="text-xs sm:text-sm bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-lg transition-colors border border-white/20 font-semibold flex items-center space-x-1.5 self-end sm:self-center shrink-0"
          >
            <span>Les hele planen</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* Innhold / Actionable items for de ansatte */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Våre Mål */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">1</span>
            <span>Mål for måneden</span>
          </h3>
          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 min-h-[90px]">
            {displayGoals}
          </div>
        </div>

        {/* Nøkkelaktiviteter */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0">2</span>
            <span>Slik gjør vi det i praksis</span>
          </h3>
          <div className="text-xs sm:text-sm text-slate-700 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 whitespace-pre-line leading-relaxed min-h-[90px]">
            {displayActivities}
          </div>
        </div>
      </div>
      
      {/* Liten lov-påminnelse som bygger kultur */}
      <div className="bg-indigo-50/80 border-t border-indigo-100 p-3 px-5 flex items-start gap-3">
        <Info size={16} className="text-indigo-600 mt-0.5 shrink-0" />
        <p className="text-xs text-indigo-950 leading-relaxed font-medium">
          <strong className="text-indigo-900 font-bold">Fra Rammeplanen:</strong> «Barnehagen skal bidra til at barna opplever tilhørighet til fellesskapet og at de får erfare at de er betydningsfulle for fellesskapet.»
        </p>
      </div>

    </div>
  );
}
