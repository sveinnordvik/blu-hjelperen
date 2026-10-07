import React, { useState } from 'react';
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
}

interface MorgenPulsenProps {
  onDataUpdated?: (totalBarn: number, totalVoksne: number) => void;
}

const MorgenPulsen: React.FC<MorgenPulsenProps> = ({ onDataUpdated }) => {
  // STATE: Status for innhenting av data fra avdelingene
  const [pulsData, setPulsData] = useState<BasePuls[]>([
    { id: 1, base: 'Trollstua', status: 'Mottatt', tid: '08:15', barn: 9, voksne: 3 },
    { id: 2, base: 'Multemyra', status: 'Mottatt', tid: '08:22', barn: 10, voksne: 2 },
    { id: 3, base: 'Klatremus', status: 'Venter', tid: null, barn: null, voksne: null },
    { id: 4, base: 'Bjørnehiet', status: 'Venter', tid: null, barn: null, voksne: null },
  ]);

  const [simulerer, setSimulerer] = useState(false);

  // FUNKSJON: Simulerer at de to siste avdelingene sender inn sine tall
  const simulerMottak = () => {
    setSimulerer(true);
    
    // Simulerer Klatremus (etter 1.2 sek)
    setTimeout(() => {
      setPulsData(prev => prev.map(base => 
        base.id === 3 ? { ...base, status: 'Mottatt' as const, tid: '08:42', barn: 17, voksne: 3 } : base
      ));
    }, 1200);

    // Simulerer Bjørnehiet (etter 2.5 sek)
    setTimeout(() => {
      setPulsData(prev => {
        const oppdatert = prev.map(base => 
          base.id === 4 ? { ...base, status: 'Mottatt' as const, tid: '08:45', barn: 12, voksne: 2 } : base
        );
        if (onDataUpdated) {
          const totalBarn = oppdatert.reduce((sum, b) => sum + (b.barn || 0), 0);
          const totalVoksne = oppdatert.reduce((sum, b) => sum + (b.voksne || 0), 0);
          onDataUpdated(totalBarn, totalVoksne);
        }
        return oppdatert;
      });
      setSimulerer(false);
    }, 2500);
  };

  const alleMottatt = pulsData.every(base => base.status === 'Mottatt');

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      
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
        
        <button 
          onClick={simulerMottak}
          disabled={simulerer || alleMottatt}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-indigo-400/30 cursor-pointer"
        >
          <RefreshCw size={14} className={simulerer ? "animate-spin" : ""} />
          <span>{alleMottatt ? 'Oppdatert' : 'Hent data'}</span>
        </button>
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
              
              {/* Avdelingsnavn og status-ikon */}
              <div className="flex items-center space-x-3 w-1/3">
                {base.status === 'Mottatt' ? (
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                ) : (
                  <Clock size={18} className="text-slate-400 shrink-0" />
                )}
                <span className={`font-bold ${base.status === 'Mottatt' ? 'text-slate-800' : 'text-slate-500'}`}>
                  {base.base}
                </span>
              </div>

              {/* Data eller Venter-tekst */}
              <div className="flex-1 flex items-center justify-end">
                {base.status === 'Mottatt' ? (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1.5 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-sm font-bold border border-blue-100" title="Antall barn tilstede">
                      <Baby size={14} />
                      <span>{base.barn} barn</span>
                    </div>
                    <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-sm font-bold border border-emerald-100" title="Antall voksne på jobb">
                      <Users size={14} />
                      <span>{base.voksne} voksne</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-slate-400 font-medium ml-2 w-16" title="Tidspunkt rapportert">
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

export default MorgenPulsen;
