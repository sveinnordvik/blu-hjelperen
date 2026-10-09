import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  RefreshCw, 
  Smartphone, 
  CheckCircle2, 
  Clock, 
  Users, 
  Baby 
} from 'lucide-react';

interface BasePuls {
  id: number;
  base: string;
  status: 'Mottatt' | 'Venter';
  tid: string | null;
  barn: number | null;
  voksne: number | null;
  kommentar?: string;
}

interface MorgenPulsRadarProps {
  onDataUpdated?: (totalBarn: number, totalVoksne: number) => void;
  onOpenRegistrering?: () => void;
}

const DEFAULT_PULS: BasePuls[] = [
  { id: 1, base: 'Trollstua', status: 'Mottatt', tid: '08:15', barn: 9, voksne: 3 },
  { id: 2, base: 'Multemyra', status: 'Mottatt', tid: '08:22', barn: 10, voksne: 2 },
  { id: 3, base: 'Klatremus', status: 'Venter', tid: null, barn: null, voksne: null },
  { id: 4, base: 'Bjørnehiet', status: 'Venter', tid: null, barn: null, voksne: null },
];

export const MorgenPulsRadar: React.FC<MorgenPulsRadarProps> = ({ onDataUpdated, onOpenRegistrering }) => {
  const [pulsData, setPulsData] = useState<BasePuls[]>(() => {
    const saved = localStorage.getItem('morgenpuls_radar_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_PULS;
  });

  const [simulerer, setSimulerer] = useState(false);

  // Lytt til innsendinger fra MorgenPulsen-komponenten
  useEffect(() => {
    const handleInnsending = () => {
      const savedInnsending = localStorage.getItem('morgenpulsen_siste_innsending');
      if (savedInnsending) {
        try {
          const payload = JSON.parse(savedInnsending);
          setPulsData(prev => {
            const oppdatert = prev.map(item => {
              if (item.base.toLowerCase() === (payload.avdeling || 'Klatremus').toLowerCase()) {
                return {
                  ...item,
                  status: 'Mottatt' as const,
                  tid: payload.tidspunkt?.slice(0, 5) || new Date().toLocaleTimeString().slice(0, 5),
                  barn: payload.antallBarn,
                  voksne: payload.antallVoksne,
                  kommentar: payload.kommentar
                };
              }
              return item;
            });
            localStorage.setItem('morgenpuls_radar_data', JSON.stringify(oppdatert));
            return oppdatert;
          });
        } catch {}
      }
    };

    window.addEventListener('morgenpuls-oppdatert', handleInnsending);
    return () => window.removeEventListener('morgenpuls-oppdatert', handleInnsending);
  }, []);

  // Simulerer at de ventende avdelingene sender inn sine tall
  const simulerMottak = () => {
    setSimulerer(true);
    
    setTimeout(() => {
      setPulsData(prev => {
        const oppdatert = prev.map(base => 
          base.id === 3 ? { ...base, status: 'Mottatt' as const, tid: '08:42', barn: 17, voksne: 3 } : base
        );
        localStorage.setItem('morgenpuls_radar_data', JSON.stringify(oppdatert));
        return oppdatert;
      });
    }, 1000);

    setTimeout(() => {
      setPulsData(prev => {
        const oppdatert = prev.map(base => 
          base.id === 4 ? { ...base, status: 'Mottatt' as const, tid: '08:45', barn: 12, voksne: 2 } : base
        );
        localStorage.setItem('morgenpuls_radar_data', JSON.stringify(oppdatert));
        if (onDataUpdated) {
          const totalBarn = oppdatert.reduce((sum, b) => sum + (b.barn || 0), 0);
          const totalVoksne = oppdatert.reduce((sum, b) => sum + (b.voksne || 0), 0);
          onDataUpdated(totalBarn, totalVoksne);
        }
        return oppdatert;
      });
      setSimulerer(false);
    }, 2200);
  };

  const alleMottatt = pulsData.every(base => base.status === 'Mottatt');

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* HEADER */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#1e1b4b] text-white">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-500/30 p-2 rounded-lg">
            <Activity size={20} className="text-indigo-200" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Morgen-pulsen</h3>
            <p className="text-xs text-indigo-200 font-medium">Automatisk datainnhenting fra avdelingene</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onOpenRegistrering && (
            <button
              onClick={onOpenRegistrering}
              className="text-xs bg-indigo-500/40 hover:bg-indigo-500/60 text-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-400/30 transition cursor-pointer"
            >
              Åpne innsending
            </button>
          )}
          <button 
            onClick={simulerMottak}
            disabled={simulerer || alleMottatt}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-indigo-400/30 cursor-pointer"
          >
            <RefreshCw size={14} className={simulerer ? "animate-spin" : ""} />
            <span>{alleMottatt ? 'Oppdatert' : 'Hent data'}</span>
          </button>
        </div>
      </div>

      {/* LIVE FEED-LISTE */}
      <div className="p-4 bg-slate-50 flex-1">
        <div className="space-y-3">
          {pulsData.map((base) => (
            <div 
              key={base.id} 
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-500 ${
                base.status === 'Mottatt' 
                  ? 'bg-white border-emerald-200 shadow-sm' 
                  : 'bg-white/50 border-slate-200 border-dashed opacity-70'
              }`}
            >
              <div className="flex items-center space-x-3 w-1/3">
                {base.status === 'Mottatt' ? (
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                ) : (
                  <Clock size={18} className="text-slate-400 shrink-0" />
                )}
                <div>
                  <span className={`font-bold block text-sm ${base.status === 'Mottatt' ? 'text-slate-800' : 'text-slate-500'}`}>
                    {base.base}
                  </span>
                  {base.kommentar && (
                    <span className="text-[11px] text-amber-700 font-medium block truncate max-w-[140px]">
                      💬 {base.kommentar}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 flex items-center justify-end">
                {base.status === 'Mottatt' ? (
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1.5 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-sm font-bold border border-blue-100" title="Antall barn tilstede">
                      <Baby size={14} />
                      <span>{base.barn} barn</span>
                    </div>
                    <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-sm font-bold border border-emerald-100" title="Antall voksne på jobb">
                      <Users size={14} />
                      <span>{base.voksne} voksne</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-slate-400 font-medium ml-1 w-14" title="Tidspunkt rapportert">
                      <Smartphone size={12} />
                      <span>{base.tid}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-sm text-slate-400 italic">
                    <Activity size={14} className="animate-pulse" />
                    <span>Venter på inntasting...</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER-STATUS */}
      {alleMottatt && (
        <div className="bg-emerald-50 p-3 text-center border-t border-emerald-100 animate-in slide-in-from-bottom-2 fade-in duration-300">
          <span className="text-sm font-bold text-emerald-700 flex items-center justify-center space-x-1.5">
            <CheckCircle2 size={16} />
            <span>Alle avdelinger har rapportert inn for dagen. Bemanningsradaren er oppdatert!</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default MorgenPulsRadar;
