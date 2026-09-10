import React, { useState } from 'react';
import { 
  FileSearch, 
  PlayCircle, 
  Presentation, 
  Coins, 
  ArrowRight, 
  Lock, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Sparkles, 
  X,
  CreditCard,
  AlertTriangle,
  Library
} from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { isUnlimitedUser, STRIPE_HUMANIZER_CREDITS_1_URL, STRIPE_HUMANIZER_CREDITS_10_URL } from '../config/accessConfig';

interface ToolsDashboardProps {
  pricingTier?: string;
  userEmail?: string;
  onSelectTool: (toolId: string) => void;
  onUpgrade?: () => void;
  humanizerCredits?: number;
  onBuyCredits?: (count: number) => void;
}

export const ToolsDashboard: React.FC<ToolsDashboardProps> = ({
  pricingTier = 'free',
  userEmail,
  onSelectTool,
  onUpgrade,
  humanizerCredits: externalCredits,
  onBuyCredits
}) => {
  const currentUserEmail = userEmail || getAuth().currentUser?.email || '';
  const isUnlimited = isUnlimitedUser(currentUserEmail);
  const isSemester = isUnlimited || ['semester', 'yearly', 'preview'].includes(pricingTier?.toLowerCase() || '');
  const isPremium = isUnlimited || ['monthly', 'premium', 'semester', 'yearly', 'preview'].includes(pricingTier?.toLowerCase() || '');

  const [localCredits, setLocalCredits] = useState<number>(() => {
    const saved = localStorage.getItem('blu_humanizer_credits');
    return saved !== null ? parseInt(saved, 10) : 1;
  });

  const humanizerCredits = externalCredits !== undefined ? externalCredits : localCredits;

  const [showHumanizerModal, setShowHumanizerModal] = useState(false);

  const handleBuyCredits = (count: number) => {
    if (onBuyCredits) {
      onBuyCredits(count);
    } else {
      const updated = humanizerCredits + count;
      setLocalCredits(updated);
      localStorage.setItem('blu_humanizer_credits', updated.toString());
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10 space-y-8 animate-in fade-in duration-300">
      {/* Header-seksjon */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold tracking-wide uppercase mb-3">
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            <span>Spesialiserte BLU-verktøy</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Verktøykasse for barnehagelærerstudenter
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-600 max-w-2xl leading-relaxed">
            Didaktiske sparringspartnere, sensorvalidering og presentasjonsstøtte skreddersydd for nasjonale retningslinjer og Rammeplanen for barnehagen.
          </p>
        </div>

        {/* Brukerstatus */}
        <div className="flex items-center gap-2.5 px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-2xs self-start md:self-auto shrink-0">
          <span className="text-xs text-slate-500 font-medium">Aktiv plan:</span>
          <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
            isSemester 
              ? 'bg-amber-100 text-amber-900 border border-amber-300' 
              : isPremium 
              ? 'bg-blue-100 text-blue-900 border border-blue-200'
              : 'bg-slate-100 text-slate-800'
          }`}>
            {isSemester ? 'Semester-pakka' : isPremium ? 'Premium Måned' : 'Gratis'}
          </span>
        </div>
      </div>

      {/* Grid med fire verktøykort */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        
        {/* KORT 1: Dokumentanalyse */}
        <div 
          id="tool-card-document-analysis"
          className="group relative bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-xs hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
        >
          <div>
            {/* Topplinje: Ikon & Badge */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="w-13 h-13 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-2xs">
                <FileSearch className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200/80 whitespace-nowrap shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Dypanalyse krever Semester-pakka</span>
              </span>
            </div>

            {/* Innhold */}
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
              Dokumentanalyse
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Få grundig analyse av tekstoppbygging, akademisk rød tråd og avsnittsstruktur. Velg mellom standard strukturanalyse eller dyp BLU-sensorkontroll med pensumsjekk.
            </p>

            {/* Egenskaper */}
            <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Strukturanalyse: Vurdering av overskrifter og tekstflyt</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Sensormodul: Pedagogisk dybde & Rammeplan-forankring</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Humanizer-boten: Etisk språkvask for akademisk stemme</span>
              </div>
            </div>
          </div>

          {/* Aksjonsknapp */}
          <div className="mt-8 pt-4 border-t border-slate-100">
            <button
              onClick={() => onSelectTool('document-analysis')}
              className="w-full py-3.5 px-5 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:translate-x-0.5"
            >
              <span>Åpne dokumentanalyse</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* KORT 2: Simulator / Rollespill */}
        <div 
          id="tool-card-simulator"
          className="group relative bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-xs hover:shadow-xl hover:border-blue-200 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
        >
          <div>
            {/* Topplinje: Ikon & Badge */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="w-13 h-13 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-2xs">
                <PlayCircle className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                <span>Standard verktøykort</span>
              </span>
            </div>

            {/* Innhold */}
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
              Simulator / Rollespill
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Muntlig trening og rollespill. Øv på utfordrende foreldresamtaler, tverrfaglig samarbeid og simuler muntlig eksamen med konstruktive tilbakemeldinger.
            </p>

            {/* Egenskaper */}
            <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Rollespill: Foreldremøter, vanskelige samtaler & ledelse</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Muntlig eksamenstrening med didaktisk sensor</span>
              </div>
            </div>
          </div>

          {/* Aksjonsknapp */}
          <div className="mt-8 pt-4 border-t border-slate-100">
            <button
              onClick={() => onSelectTool('simulator')}
              className="w-full py-3.5 px-5 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:translate-x-0.5"
            >
              <span>Start simulator</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* KORT 3: Presentasjons-generator */}
        <div 
          id="tool-card-presentations"
          className="group relative bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-xs hover:shadow-xl hover:border-amber-300 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
        >
          <div>
            {/* Topplinje: Ikon & Badge */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="w-13 h-13 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-2xs">
                <Presentation className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 border border-amber-500 shadow-2xs whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>Premium / Semester-pakka</span>
              </span>
            </div>

            {/* Innhold */}
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight group-hover:text-amber-700 transition-colors">
              Presentasjons-generator
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              NotebookLM-drevet verktøy som konverterer oppgaven din til et strukturert lysbilde-oppsett med ferdig talemanus tilpasset muntlig eksamen og høring.
            </p>

            {/* Egenskaper */}
            <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Automatisk oppsett av faglige lysbilder</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Eksamensklart talemanus for hvert enkelt lysbilde</span>
              </div>
            </div>
          </div>

          {/* Aksjonsknapp */}
          <div className="mt-8 pt-4 border-t border-slate-100">
            {isSemester ? (
              <button
                onClick={() => onSelectTool('presentations')}
                className="w-full py-3.5 px-5 bg-slate-900 hover:bg-amber-600 text-white rounded-2xl font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Generer presentasjon</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onUpgrade ? onUpgrade : () => onSelectTool('presentations')}
                className="w-full py-3.5 px-5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl font-extrabold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Lås opp med Semester-pakka</span>
              </button>
            )}
          </div>
        </div>

        {/* KORT 4: Humanizer-boten (Visuelt differensiert: Amber bakgrunn & advarsel/mynt) */}
        <div 
          id="tool-card-humanizer"
          className="group relative rounded-3xl bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-100/40 border-2 border-amber-300 p-6 md:p-8 shadow-sm hover:shadow-2xl hover:border-amber-400 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
        >
          <div>
            {/* Topplinje: Mynt/Advarsel-ikon & Pay-per-use Badge */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="w-13 h-13 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:rotate-6 transition-transform duration-300">
                <Coins className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-xs whitespace-nowrap ${
                isUnlimited 
                  ? 'bg-emerald-400 text-slate-950 border-emerald-500' 
                  : 'bg-amber-400 text-slate-950 border-amber-500'
              }`}>
                <span>{isUnlimited ? 'VIP: Ubegrenset tilgang' : 'Pay-per-use: 10 kr per bruk (Stripe)'}</span>
              </span>
            </div>

            {/* Innhold */}
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-black text-slate-950 tracking-tight">
                Humanizer-boten
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                Etisk språkvask
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-800 leading-relaxed font-medium">
              Vasker og tilpasser teksten din for syntetiske formuleringer og robotaktige vendinger. Sikrer at din personlige, akademiske stemme skinner igjennom.
            </p>

            {/* Etisk barriere / Advarsel */}
            <div className="mt-4 p-3.5 bg-white/90 rounded-2xl border border-amber-300/80 text-xs text-amber-950 space-y-1 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold">
                {isUnlimited ? (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-emerald-950">VIP-tilgang innvilget</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Bevisst etisk friksjon</span>
                  </>
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-700">
                {isUnlimited 
                  ? 'Du har innvilget ubegrenset tilgang til alle verktøy og Humanizer-boten uten betalingssperre.' 
                  : 'Aldri ubegrenset i standardabonnement. Hver vask krever et bevisst valg (10 kr) for å verne om egen skriveprosess og akademisk ærlighet.'}
              </p>
            </div>

            {/* Saldo-teller */}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-700 px-1">
              <span>Tilgjengelig saldo:</span>
              <span className={`font-extrabold px-2.5 py-0.5 rounded-full border ${
                isUnlimited 
                  ? 'text-emerald-900 bg-emerald-100 border-emerald-300' 
                  : 'text-amber-900 bg-amber-200/70 border-amber-300'
              }`}>
                {isUnlimited ? 'Ubegrenset vask' : humanizerCredits > 0 ? `${humanizerCredits} vask tilgjengelig` : '0 vask (fyll på)'}
              </span>
            </div>
          </div>

          {/* Aksjonsknapp: Lås opp verktøy eller åpne i Dokumentanalyse */}
          <div className="mt-6 pt-4 border-t border-amber-200/80 space-y-2">
            {isUnlimited ? (
              <button
                onClick={() => onSelectTool('document-analysis-humanizer')}
                className="w-full py-3.5 px-5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl font-black text-sm shadow-md shadow-amber-500/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:scale-[1.01]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Åpne Humanizer-boten</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : humanizerCredits > 0 ? (
              <>
                <button
                  onClick={() => onSelectTool('document-analysis-humanizer')}
                  className="w-full py-3.5 px-5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl font-black text-sm shadow-md shadow-amber-500/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:scale-[1.01]"
                >
                  <Coins className="w-4 h-4 stroke-[2.5]" />
                  <span>Åpne i Dokumentanalyse</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowHumanizerModal(true)}
                  className="w-full py-2 px-3 text-xs font-bold text-amber-900 hover:text-slate-950 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Fyll på saldo (10,- kr via Stripe)</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowHumanizerModal(true)}
                className="w-full py-3.5 px-5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl font-black text-sm shadow-md shadow-amber-500/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:scale-[1.01]"
              >
                <Coins className="w-4 h-4 stroke-[2.5]" />
                <span>Lås opp verktøy</span>
                <span className="text-xs bg-slate-950 text-amber-300 px-2 py-0.5 rounded-lg font-mono ml-1">10,- NOK</span>
              </button>
            )}
          </div>
        </div>

        {/* KORT 5: Oppslagsverk / Fagordbok */}
        <div 
          id="tool-card-dictionary"
          className="group relative bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-xs hover:shadow-xl hover:border-emerald-200 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xs">
                <Library className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Pensumsøk & ordbok
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight group-hover:text-emerald-600 transition-colors">
              Oppslagsverk & Begreper
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Søk i pedagogiske fagbegreper, finn relevant pensumlitteratur for BLU-studiet, og få veiledning i referansehåndtering (Zotero og EndNote).
            </p>

            <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Begrepsdatabase: Faguttrykk med pedagogisk definisjon</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pensumforslag: Relevante akademiske artikler og bøker</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100">
            <button
              onClick={() => onSelectTool('dictionary')}
              className="w-full py-3.5 px-5 bg-slate-900 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:translate-x-0.5"
            >
              <span>Åpne oppslagsverk</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

      </div>

      {/* Humanizer Unlock Modal */}
      {showHumanizerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-5">
            <button 
              onClick={() => setShowHumanizerModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
                <Coins className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Lås opp Humanizer-boten</h3>
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Pay-per-use: 10 kr per vask via Stripe
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Hvorfor er ikke dette inkludert i Semester-pakka?
              </p>
              <p className="leading-relaxed">
                Ubegrenset tilgang til automatisk omskriving frarøver studenten sin personlige akademiske stemme og inviterer til snarveier.
              </p>
              <p className="leading-relaxed text-slate-500">
                Mikrokostnaden på 10 kr per vask skaper en nødvendig etisk friksjon, slik at du bruker verktøyet bevisst og reflektert.
              </p>
            </div>

            {/* Gjeldende saldo */}
            <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
              <span className="text-amber-950 font-medium">Din nåværende saldo:</span>
              <span className="font-bold text-amber-900 font-mono bg-amber-200/60 px-2.5 py-0.5 rounded-md">
                {humanizerCredits} {humanizerCredits === 1 ? 'vask' : 'vask'}
              </span>
            </div>

            {/* Handlinger */}
            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setShowHumanizerModal(false);
                  if (STRIPE_HUMANIZER_CREDITS_1_URL && !STRIPE_HUMANIZER_CREDITS_1_URL.includes('test_humanizer')) {
                    window.open(STRIPE_HUMANIZER_CREDITS_1_URL, '_blank', 'noopener,noreferrer');
                  } else {
                    handleBuyCredits(1);
                    onSelectTool('document-analysis-humanizer');
                  }
                }}
                className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl font-extrabold text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Kjøp 1 vask (10 kr) via Stripe</span>
                </div>
                <span className="bg-slate-950 text-amber-300 px-2 py-0.5 rounded-md text-xs font-mono">10,-</span>
              </button>

              <button
                onClick={() => {
                  setShowHumanizerModal(false);
                  if (STRIPE_HUMANIZER_CREDITS_10_URL && !STRIPE_HUMANIZER_CREDITS_10_URL.includes('test_humanizer')) {
                    window.open(STRIPE_HUMANIZER_CREDITS_10_URL, '_blank', 'noopener,noreferrer');
                  } else {
                    handleBuyCredits(10);
                    onSelectTool('document-analysis-humanizer');
                  }
                }}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>Kjøp 10 vask (100 kr via Stripe)</span>
                </div>
                <span className="bg-slate-800 px-2 py-0.5 rounded-md text-xs font-mono text-amber-300">100,-</span>
              </button>

              {humanizerCredits > 0 && (
                <button
                  onClick={() => {
                    setShowHumanizerModal(false);
                    onSelectTool('document-analysis-humanizer');
                  }}
                  className="w-full py-2.5 px-4 text-indigo-600 hover:bg-indigo-50 rounded-2xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Bruk eksisterende saldo i Dokumentanalyse</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-center">
              <button
                onClick={() => setShowHumanizerModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors cursor-pointer"
              >
                Lukk vindu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsDashboard;
