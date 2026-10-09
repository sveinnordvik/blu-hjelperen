import React, { useState } from 'react';
import { 
  Sunrise, 
  Users, 
  UserCheck, 
  Plus, 
  Minus, 
  Send, 
  CheckCircle2, 
  MessageSquare,
  Building,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface MorgenPulsenProps {
  embedded?: boolean;
  defaultBase?: string;
  onSendSuccess?: (payload: {
    avdeling: string;
    antallBarn: number;
    antallVoksne: number;
    kommentar: string;
    tidspunkt: string;
  }) => void;
}

const AVDELINGER = [
  { id: 'blaabaertua', navn: 'Blåbærtua (3-6 år)', base: 'Blåbærtua' },
  { id: 'klatremus', navn: 'Klatremus (3-6 år)', base: 'Klatremus' },
  { id: 'bjoernehiet', navn: 'Bjørnehiet (3-6 år)', base: 'Bjørnehiet' },
  { id: 'trollstua', navn: 'Trollstua (0-3 år)', base: 'Trollstua' },
  { id: 'multemyra', navn: 'Multemyra (0-3 år)', base: 'Multemyra' }
];

export default function MorgenPulsen({ 
  embedded = false, 
  defaultBase = 'Blåbærtua', 
  onSendSuccess 
}: MorgenPulsenProps) {
  const [valgtAvdeling, setValgtAvdeling] = useState(defaultBase);
  const [antallBarn, setAntallBarn] = useState(12); // Standardverdi basert på historikk
  const [antallVoksne, setAntallVoksne] = useState(3); // Standard for en vanlig base
  const [kommentar, setKommentar] = useState('');
  const [erSendt, setErSendt] = useState(false);
  const [sisteInnsending, setSisteInnsending] = useState<{ tid: string; barn: number; voksne: number } | null>(() => {
    const saved = localStorage.getItem('morgenpulsen_siste_innsending');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          tid: parsed.tidspunkt,
          barn: parsed.antallBarn,
          voksne: parsed.antallVoksne
        };
      } catch {}
    }
    return null;
  });

  const handleSend = () => {
    // Data-pakken som sendes til Styrerens Bemanningsradar:
    const payload = {
      avdeling: valgtAvdeling,
      antallBarn,
      antallVoksne,
      kommentar,
      tidspunkt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    
    console.log("Sender til Bemanningsradar:", payload);

    // Lagre i localStorage slik at Styrern og MorgenPulsRadar synkroniseres
    try {
      localStorage.setItem('morgenpulsen_siste_innsending', JSON.stringify(payload));
      
      // Oppdater baseliste i Bemanningsradaren dersom navnet matcher
      const savedBaser = localStorage.getItem('styrern_radar_baser');
      if (savedBaser) {
        const baser = JSON.parse(savedBaser);
        const oppdatert = baser.map((b: any) => {
          if (b.navn.toLowerCase() === valgtAvdeling.toLowerCase()) {
            return {
              ...b,
              barnTilStede: antallBarn,
              voksneTilStede: antallVoksne
            };
          }
          return b;
        });
        localStorage.setItem('styrern_radar_baser', JSON.stringify(oppdatert));
      }

      // Send et vindusevent så aktive lyttere oppdateres direkte
      window.dispatchEvent(new CustomEvent('morgenpuls-oppdatert', { detail: payload }));
    } catch (e) {
      console.error("Kunne ikke lagre morgenpuls:", e);
    }

    setSisteInnsending({
      tid: payload.tidspunkt,
      barn: payload.antallBarn,
      voksne: payload.antallVoksne
    });
    setErSendt(true);

    if (onSendSuccess) {
      onSendSuccess(payload);
    }
    
    // Tilbakestiller knappen etter 3 sekunder
    setTimeout(() => setErSendt(false), 3000);
  };

  // Beregn voksentetthet (barn per voksen)
  const ratio = antallVoksne > 0 ? (antallBarn / antallVoksne).toFixed(1) : '-';
  const normStatus = antallVoksne > 0 && (antallBarn / antallVoksne) <= 6;

  const content = (
    <div className="max-w-md w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4 shadow-sm ring-4 ring-amber-50">
          <Sunrise className="text-amber-500 w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Morgen-pulsen</h1>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          Registrer status på avdelingen. Oppdaterer automatisk Styrerens bemanningsradar.
        </p>
      </div>

      {/* Hovedkort */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
        
        {/* Avdelingsvelger */}
        <div className="mb-6 pb-6 border-b border-slate-100">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5">
            <Building className="w-3.5 h-3.5" /> Velg din avdeling / base
          </label>
          <div className="relative">
            <select
              value={valgtAvdeling}
              onChange={(e) => setValgtAvdeling(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-xl py-2.5 px-3.5 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition cursor-pointer text-center"
            >
              {AVDELINGER.map(avd => (
                <option key={avd.id} value={avd.base}>
                  {avd.navn}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Barn-teller */}
        <div className="mb-8 border-b border-slate-100 pb-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> Barn til stede
          </h2>
          <div className="flex items-center justify-center gap-6">
            <button 
              onClick={() => setAntallBarn(prev => Math.max(0, prev - 1))}
              className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all cursor-pointer shadow-sm"
              aria-label="Reduser antall barn"
            >
              <Minus className="w-6 h-6" />
            </button>
            <div className="w-24 text-center text-6xl font-bold text-slate-900 tabular-nums tracking-tight">
              {antallBarn}
            </div>
            <button 
              onClick={() => setAntallBarn(prev => prev + 1)}
              className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all cursor-pointer shadow-sm"
              aria-label="Øk antall barn"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Voksne-teller */}
        <div className="mb-8 border-b border-slate-100 pb-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-500" /> Voksne på jobb
          </h2>
          <div className="flex items-center justify-center gap-6">
            <button 
              onClick={() => setAntallVoksne(prev => Math.max(0, prev - 1))}
              className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all cursor-pointer shadow-sm"
              aria-label="Reduser antall voksne"
            >
              <Minus className="w-6 h-6" />
            </button>
            <div className="w-24 text-center text-6xl font-bold text-slate-900 tabular-nums tracking-tight">
              {antallVoksne}
            </div>
            <button 
              onClick={() => setAntallVoksne(prev => prev + 1)}
              className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all cursor-pointer shadow-sm"
              aria-label="Øk antall voksne"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Sanntids bemanningsnorm-indikasjon */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1 ${
              normStatus 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <Sparkles className="w-3 h-3" />
              {ratio} barn per voksen
            </span>
          </div>
        </div>

        {/* Kommentar */}
        <div className="mb-8">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Kommentar (valgfritt)
          </label>
          <textarea
            value={kommentar}
            onChange={(e) => setKommentar(e.target.value)}
            placeholder="F.eks. 1 barn sover, vikar på plass fra kl 10, turdag..."
            rows={2}
            className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm text-slate-800 transition resize-none placeholder:text-slate-400"
          />
        </div>

        {/* Send-knapp */}
        <button
          onClick={handleSend}
          disabled={erSendt}
          className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2.5 transition-all duration-200 shadow-lg cursor-pointer ${
            erSendt
              ? 'bg-emerald-600 text-white shadow-emerald-500/25 scale-[0.99]'
              : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/15 active:scale-[0.98]'
          }`}
        >
          {erSendt ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
              <span>Sendt til Bemanningsradar!</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Send inn morgen-puls</span>
            </>
          )}
        </button>

        {/* Status forrige innsending */}
        {sisteInnsending && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">
              Sist rapportert kl. {sisteInnsending.tid} ({sisteInnsending.barn} barn, {sisteInnsending.voksne} voksne)
            </span>
          </div>
        )}

      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="w-full flex justify-center py-2">
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-start items-center p-4 md:p-8 pt-12 font-sans text-slate-800">
      {content}
    </div>
  );
}
