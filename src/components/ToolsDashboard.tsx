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
  ArrowLeft,
  Library,
  Mic,
  Layers,
  HelpCircle,
  Headphones,
  BookOpen,
  Archive,
  BookMarked
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAuth } from 'firebase/auth';
import { isUnlimitedUser, STRIPE_HUMANIZER_CREDITS_1_URL, STRIPE_HUMANIZER_CREDITS_10_URL } from '../config/accessConfig';
import { MobileEncyclopedia } from './mobile/MobileEncyclopedia';
import { usePensumHub, PensumActionType } from '../context/PensumHubContext';

interface ToolsDashboardProps {
  pricingTier?: string;
  userEmail?: string;
  onSelectTool: (toolId: string) => void;
  onUpgrade?: () => void;
  humanizerCredits?: number;
  onBuyCredits?: (count: number) => void;
  onNavigateToResources?: () => void;
}

export const ToolsDashboard: React.FC<ToolsDashboardProps> = ({
  pricingTier = 'free',
  userEmail,
  onSelectTool,
  onUpgrade,
  humanizerCredits: externalCredits,
  onBuyCredits,
  onNavigateToResources
}) => {
  const currentUserEmail = userEmail || getAuth().currentUser?.email || '';
  const isUnlimited = isUnlimitedUser(currentUserEmail);
  const isSemester = isUnlimited || ['semester', 'yearly', 'preview'].includes(pricingTier?.toLowerCase() || '');
  const isPremium = isUnlimited || ['monthly', 'premium', 'semester', 'yearly', 'preview'].includes(pricingTier?.toLowerCase() || '');

  // Pensum-Hub Context & Gateway state
  const { activePensumFiles, pendingAction, startPensumAction, setPendingAction } = usePensumHub();
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [gatewayToolName, setGatewayToolName] = useState('');
  const [gatewayActionType, setGatewayActionType] = useState<PensumActionType>(null);

  const handleSelectPensumTool = (toolId: string, actionType: PensumActionType, toolName: string) => {
    if (activePensumFiles.length > 0 || pendingAction) {
      if (!pendingAction && activePensumFiles.length > 0) {
        startPensumAction(activePensumFiles, actionType);
      }
      handleSelectTool(toolId);
    } else {
      setGatewayToolName(toolName);
      setGatewayActionType(actionType);
      setIsGatewayModalOpen(true);
    }
  };

  const [localCredits, setLocalCredits] = useState<number>(() => {
    const saved = localStorage.getItem('blu_humanizer_credits');
    return saved !== null ? parseInt(saved, 10) : 1;
  });

  const humanizerCredits = externalCredits !== undefined ? externalCredits : localCredits;

  const [showHumanizerModal, setShowHumanizerModal] = useState(false);
  const [mobileCategoryFilter, setMobileCategoryFilter] = useState<'all' | 'analyse' | 'trening' | 'kilder'>('all');
  const [showDesktopToolsOnMobile, setShowDesktopToolsOnMobile] = useState(false);

  const handleBuyCredits = (count: number) => {
    if (onBuyCredits) {
      onBuyCredits(count);
    } else {
      const updated = humanizerCredits + count;
      setLocalCredits(updated);
      localStorage.setItem('blu_humanizer_credits', updated.toString());
    }
  };

  const handleSelectTool = (toolId: string) => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    onSelectTool(toolId);
  };

  return (
    <>
      {/* DESKTOP-VISNING (3x2 rutenett) */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-5 animate-in fade-in duration-300">
        {/* Header-seksjon */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold tracking-wide uppercase mb-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Spesialiserte BLU-verktøy</span>
            </div>
            <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Verktøykasse for barnehagelærerstudenter
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-600 max-w-2xl leading-snug">
              Didaktiske sparringspartnere, sensorvalidering og presentasjonsstøtte skreddersydd for nasjonale retningslinjer og Rammeplanen.
            </p>
          </div>

          {/* Brukerstatus */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-2xs self-start md:self-auto shrink-0">
            <span className="text-xs text-slate-500 font-medium">Aktiv plan:</span>
            <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
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

        {/* Grid med verktøykort */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">

          {/* NYHET 1: Teori-Flashcards */}
          <div 
            id="tool-card-flashcards"
            className="group relative bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-xl hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-2xs">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-slate-950 border border-amber-500 shadow-2xs whitespace-nowrap">
                  <Sparkles className="w-3 h-3 fill-current text-amber-950" />
                  <span>Nyhet!</span>
                </span>
              </div>

              <h2 className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                Teori-Flashcards
              </h2>
              <p className="mt-1 text-xs text-slate-600 leading-snug">
                Trekk ut de viktigste begrepene og generer vendbare puggekort basert på valgte kilder.
              </p>

              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-700">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">Begrepsuttrekking fra pensum</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Interaktiv pugge- og repeteringsmodus</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => handleSelectPensumTool('flashcards', 'flashcards', 'Teori-Flashcards')}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Åpne Flashcards</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* NYHET 2: Eksamens-Quiz (Grill meg!) */}
          <div 
            id="tool-card-quiz"
            className="group relative bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-xl hover:border-amber-300 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-2xs">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-slate-950 border border-amber-500 shadow-2xs whitespace-nowrap">
                  <Sparkles className="w-3 h-3 fill-current text-amber-950" />
                  <span>Kommer snart!</span>
                </span>
              </div>

              <h2 className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-amber-700 transition-colors">
                Eksamens-Quiz (Grill meg!)
              </h2>
              <p className="mt-1 text-xs text-slate-600 leading-snug">
                Få flervalgsspørsmål, dilemmaer og caser basert på teorien fra det valgte pensumet.
              </p>

              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-700">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Caselæring og eksamensspørsmål</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Direkte tilbakemelding & fasit</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => handleSelectPensumTool('quiz', 'quiz', 'Eksamens-Quiz (Grill meg!)')}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Start Eksamens-Quiz</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* NYHET 3: Pensum-Podden */}
          <div 
            id="tool-card-podcast"
            className="group relative bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-2xs">
                  <Headphones className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-slate-950 border border-amber-500 shadow-2xs whitespace-nowrap">
                  <Sparkles className="w-3 h-3 fill-current text-amber-950" />
                  <span>Kommer snart!</span>
                </span>
              </div>

              <h2 className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-emerald-700 transition-colors">
                Pensum-Podden
              </h2>
              <p className="mt-1 text-xs text-slate-600 leading-snug">
                Lag en lydoppsummering og muntlig dialog av teorien du kan lytte til på farten.
              </p>

              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-700">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Lydoppsummering & talemanus</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="truncate">Muntlig pensumgjennomgang</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => handleSelectPensumTool('podcast', 'podcast', 'Pensum-Podden')}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Åpne Pensum-Podden</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* KORT 1: Dokumentanalyse */}
          <div 
            id="tool-card-document-analysis"
            className="group relative bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-xl hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              {/* Topplinje: Ikon & Badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-2xs">
                  <FileSearch className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80 whitespace-nowrap shadow-2xs">
                  <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Semester-pakka</span>
                </span>
              </div>

              {/* Innhold */}
              <h2 className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                Dokumentanalyse
              </h2>
              <p className="mt-1 text-xs text-slate-600 leading-snug">
                Grundig analyse av tekstoppbygging, rød tråd og avsnittsstruktur. Velg mellom strukturanalyse eller BLU-sensorkontroll.
              </p>

              {/* Egenskaper */}
              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-700">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Strukturanalyse: Overskrifter og tekstflyt</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">Sensormodul: Pedagogisk dybde</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Humanizer-boten: Etisk språkvask</span>
                </div>
              </div>
            </div>

            {/* Aksjonsknapp */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => handleSelectTool('document-analysis')}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:translate-x-0.5"
              >
                <span>Åpne dokumentanalyse</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* KORT 2: Simulator / Rollespill */}
          <div 
            id="tool-card-simulator"
            className="group relative bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-xl hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              {/* Topplinje: Ikon & Badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-2xs">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                  <span>Standard</span>
                </span>
              </div>

              {/* Innhold */}
              <h2 className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                Simulator / Rollespill
              </h2>
              <p className="mt-1 text-xs text-slate-600 leading-snug">
                Muntlig trening og rollespill. Øv på foreldresamtaler, tverrfaglig samarbeid og simuler muntlig eksamen.
              </p>

              {/* Egenskaper */}
              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-700">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Rollespill: Foreldremøter & ledelse</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">Muntlig eksamenstrening med sensor</span>
                </div>
              </div>
            </div>

            {/* Aksjonsknapp */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => handleSelectTool('simulator')}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:translate-x-0.5"
              >
                <span>Start simulator</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* KORT 3: Presentasjons-generator */}
          <div 
            id="tool-card-presentations"
            className="group relative bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-xl hover:border-amber-300 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              {/* Topplinje: Ikon & Badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-2xs">
                  <Presentation className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-slate-950 border border-amber-500 shadow-2xs whitespace-nowrap">
                  <Sparkles className="w-3 h-3 fill-current" />
                  <span>Semester-pakka</span>
                </span>
              </div>

              {/* Innhold */}
              <h2 className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-amber-700 transition-colors">
                Presentasjons-generator
              </h2>
              <p className="mt-1 text-xs text-slate-600 leading-snug">
                NotebookLM-drevet verktøy som konverterer oppgaven din til lysbilder med ferdig talemanus til eksamen.
              </p>

              {/* Egenskaper */}
              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-700">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Automatisk oppsett av lysbilder</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Eksamensklart talemanus</span>
                </div>
              </div>
            </div>

            {/* Aksjonsknapp */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              {isSemester ? (
                <button
                  onClick={() => handleSelectTool('presentations')}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Generer presentasjon</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={onUpgrade ? onUpgrade : () => handleSelectTool('presentations')}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-extrabold text-xs shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lås opp med Semester</span>
                </button>
              )}
            </div>
          </div>

          {/* KORT 4: Humanizer-boten */}
          <div 
            id="tool-card-humanizer"
            className="group relative rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-100/40 border-2 border-amber-300 p-4 sm:p-5 shadow-2xs hover:shadow-xl hover:border-amber-400 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              {/* Topplinje: Mynt/Advarsel-ikon & Badge */}
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:rotate-6 transition-transform duration-300">
                  <Coins className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border shadow-2xs whitespace-nowrap ${
                  isUnlimited 
                    ? 'bg-emerald-400 text-slate-950 border-emerald-500' 
                    : 'bg-amber-400 text-slate-950 border-amber-500'
                }`}>
                  <span>{isUnlimited ? 'VIP: Ubegrenset' : '10 kr per bruk (Stripe)'}</span>
                </span>
              </div>

              {/* Innhold */}
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-black text-slate-950 tracking-tight">
                  Humanizer-boten
                </h2>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300">
                  Etisk språkvask
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-800 leading-snug font-medium">
                Vasker og tilpasser teksten for robotaktige vendinger. Sikrer din akademiske stemme.
              </p>

              {/* Etisk barriere / Advarsel */}
              <div className="mt-2.5 p-2 bg-white/90 rounded-xl border border-amber-300/80 text-[11px] text-amber-950 space-y-0.5 shadow-2xs">
                <div className="flex items-center gap-1 font-bold text-[11px]">
                  {isUnlimited ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-emerald-950">VIP-tilgang innvilget</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Bevisst etisk friksjon</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] leading-tight text-slate-700">
                  {isUnlimited 
                    ? 'Du har ubegrenset tilgang til Humanizer-boten uten betalingssperre.' 
                    : 'Hver vask krever et bevisst valg (10 kr) for å verne om egen skriveprosess.'}
                </p>
              </div>

              {/* Saldo-teller */}
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-700 px-0.5">
                <span>Saldo:</span>
                <span className={`font-extrabold px-2 py-0.5 rounded-full border text-[10px] ${
                  isUnlimited 
                    ? 'text-emerald-900 bg-emerald-100 border-emerald-300' 
                    : 'text-amber-900 bg-amber-200/70 border-amber-300'
                }`}>
                  {isUnlimited ? 'Ubegrenset vask' : humanizerCredits > 0 ? `${humanizerCredits} vask tilgjengelig` : '0 vask'}
                </span>
              </div>
            </div>

            {/* Aksjonsknapp */}
            <div className="mt-3 pt-2.5 border-t border-amber-200/80 space-y-1">
              {isUnlimited ? (
                <button
                  onClick={() => handleSelectTool('document-analysis-humanizer')}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs shadow-md shadow-amber-500/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Åpne Humanizer-boten</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : humanizerCredits > 0 ? (
                <>
                  <button
                    onClick={() => handleSelectTool('document-analysis-humanizer')}
                    className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs shadow-md shadow-amber-500/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Coins className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Åpne i Dokumentanalyse</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowHumanizerModal(true)}
                    className="w-full py-1 text-[11px] font-bold text-amber-900 hover:text-slate-950 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Fyll på saldo (10,- kr via Stripe)</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowHumanizerModal(true)}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs shadow-md shadow-amber-500/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Coins className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Lås opp verktøy</span>
                  <span className="text-[10px] bg-slate-950 text-amber-300 px-1.5 py-0.5 rounded font-mono ml-1">10,- NOK</span>
                </button>
              )}
            </div>
          </div>

          {/* KORT 5: Oppslagsverk / Begreper */}
          <div 
            id="tool-card-dictionary"
            className="group relative bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-xl hover:border-emerald-200 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                  <Library className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Pensum & ordbok
                </span>
              </div>

              <h2 className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-emerald-600 transition-colors">
                Oppslagsverk & Begreper
              </h2>
              <p className="mt-1 text-xs text-slate-600 leading-snug">
                Søk i pedagogiske fagbegreper, finn pensumlitteratur for BLU-studiet og veiledning for referanser.
              </p>

              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-700">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Begrepsdatabase: Faguttrykk og definisjoner</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Pensumforslag: Artikler og fagbøker</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => handleSelectTool('dictionary')}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:translate-x-0.5"
              >
                <span>Åpne oppslagsverk</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* KORT 6: Empiri- og Intervjuanalyse */}
          <div 
            id="tool-card-empirical-analysis"
            className="group relative bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-xl hover:border-emerald-200 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Mic className="w-3 h-3" /> Sikt & GDPR
                </span>
              </div>

              <h2 className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-emerald-600 transition-colors">
                Empiri- og Intervjuanalyse
              </h2>
              <p className="mt-1 text-xs text-slate-600 leading-snug">
                Sikker håndtering av praksisdata, intervjuer og observasjoner. Sikts Nettskjema-guide og drøfting.
              </p>

              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-700">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Sikt Nettskjema-guide: Opptak & GDPR</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Pedagogisk drøfting mot Rammeplanen</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => handleSelectTool('empirical-analysis')}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:translate-x-0.5"
              >
                <span>Åpne empiri- og intervjuanalyse</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* MOBIL-VISNING: Rent, lynraskt faglig oppslagsverk (pedagogiske begreper, Rammeplan-definisjoner og nøkkelteorier) */}
      {!showDesktopToolsOnMobile ? (
        <div className="md:hidden">
          <MobileEncyclopedia 
            onOpenDesktopTools={() => setShowDesktopToolsOnMobile(true)} 
          />
        </div>
      ) : (
        <div className="md:hidden w-full max-w-xl mx-auto pb-28 px-3 sm:px-4 space-y-4">
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowDesktopToolsOnMobile(false)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 py-2 px-3.5 rounded-xl hover:bg-slate-50 shadow-2xs cursor-pointer mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-600" />
              <span>← Tilbake til oppslagsverk & begreper</span>
            </button>
          </div>
          {/* Mobil Header Banner */}
          <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold text-white tracking-wide">
                <Zap className="w-3.5 h-3.5 text-amber-300" /> BLU-Verktøykasse
              </span>
              <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                isSemester 
                  ? 'bg-amber-400 text-slate-950' 
                  : isPremium 
                  ? 'bg-blue-300 text-blue-950' 
                  : 'bg-white/20 text-white'
              }`}>
                {isSemester ? '🌟 Semester-pakka' : isPremium ? 'Premium' : 'Gratis'}
              </span>
            </div>

            <h2 className="text-xl font-black tracking-tight text-white">Spesialverktøy</h2>
            <p className="text-xs text-indigo-100 mt-1 leading-relaxed">
              Didaktiske sparringspartnere, sensorvalidering og eksamenstrening.
            </p>

            {/* Humanizer mini-status */}
            <div className="mt-3.5 pt-3 border-t border-white/15 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-300 stroke-[2.5]" />
                <span className="text-indigo-100 font-medium text-[11px]">Humanizer-vask:</span>
                <span className="font-bold text-white text-[11px]">
                  {isUnlimited ? 'Ubegrenset VIP' : `${humanizerCredits} tilgjengelig`}
                </span>
              </div>
              {!isUnlimited && (
                <button
                  onClick={() => setShowHumanizerModal(true)}
                  className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Fyll på (10 kr)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hurtigfilter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: 'all', label: 'Alle (5)' },
            { id: 'analyse', label: 'Analyse & Sensor' },
            { id: 'trening', label: 'Muntlig & Trening' },
            { id: 'kilder', label: 'Ordbok & Kilder' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setMobileCategoryFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                mobileCategoryFilter === f.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Verktøyliste på mobil */}
        <div className="space-y-3.5">
          {/* Mobile NYHET 1: Flashcards */}
          {(mobileCategoryFilter === 'all' || mobileCategoryFilter === 'trening') && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Teori-Flashcards</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Begrepslæring & pugg</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 border border-amber-500">
                    Nyhet!
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Trekk ut de viktigste begrepene og generer vendbare puggekort basert på valgte kilder.
                </p>
              </div>
              <button
                onClick={() => handleSelectPensumTool('flashcards', 'flashcards', 'Teori-Flashcards')}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Åpne Flashcards</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Mobile NYHET 2: Quiz */}
          {(mobileCategoryFilter === 'all' || mobileCategoryFilter === 'trening') && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Eksamens-Quiz (Grill meg!)</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Eksamensspurring</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 border border-amber-500">
                    Nyhet!
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Få flervalgsspørsmål, dilemmaer og caser basert på teorien fra det valgte pensumet.
                </p>
              </div>
              <button
                onClick={() => handleSelectPensumTool('quiz', 'quiz', 'Eksamens-Quiz (Grill meg!)')}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Start Eksamens-Quiz</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Mobile NYHET 3: Podcast */}
          {(mobileCategoryFilter === 'all' || mobileCategoryFilter === 'trening') && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Headphones className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Pensum-Podden</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Lyd & lytting</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 border border-amber-500">
                    Nyhet!
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Lag en lydoppsummering og muntlig dialog av teorien du kan lytte til på farten.
                </p>
              </div>
              <button
                onClick={() => handleSelectPensumTool('podcast', 'podcast', 'Pensum-Podden')}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Åpne Pensum-Podden</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 1. Dokumentanalyse */}
          {(mobileCategoryFilter === 'all' || mobileCategoryFilter === 'analyse') && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileSearch className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Dokumentanalyse</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Struktur & Sensorkontroll</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                    BLU-sensor
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Analyser teksten din for rød tråd, avsnittsflyt, Rammeplan-forankring og pensumbruk.
                </p>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">Struktursjekk</span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">Sensor-kriterier</span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">Pensumdybde</span>
                </div>
              </div>
              <button
                onClick={() => onSelectTool('document-analysis')}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Åpne dokumentanalyse</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 2. Simulator / Rollespill */}
          {(mobileCategoryFilter === 'all' || mobileCategoryFilter === 'trening') && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <PlayCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Simulator & Rollespill</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Muntlig trening</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                    Interaktiv
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Tren på krevende foreldresamtaler, tverrfaglig samarbeid og simuler muntlig eksamen med direkte feedback.
                </p>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">Foreldremøte</span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">Didaktiske dilemma</span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">Muntlig eksamen</span>
                </div>
              </div>
              <button
                onClick={() => onSelectTool('simulator')}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Start simulator</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 3. Presentasjons-generator */}
          {(mobileCategoryFilter === 'all' || mobileCategoryFilter === 'trening') && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <Presentation className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Presentasjons-generator</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Lysbilder & manus</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                    isSemester 
                      ? 'bg-amber-100 text-amber-900 border-amber-200' 
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {isSemester ? 'Inkludert' : 'Semester-pakka'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Gjør bacheloroppgaven eller prosjektet om til faglige lysbilder og ferdig talemanus for muntlig høring.
                </p>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">Talemanus</span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">Lysbilde-oppsett</span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">Eksamensstruktur</span>
                </div>
              </div>
              {isSemester ? (
                <button
                  onClick={() => onSelectTool('presentations')}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Generer presentasjon</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={onUpgrade ? onUpgrade : () => onSelectTool('presentations')}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lås opp med Semester-pakka</span>
                </button>
              )}
            </div>
          )}

          {/* 4. Humanizer-boten */}
          {(mobileCategoryFilter === 'all' || mobileCategoryFilter === 'analyse') && (
            <div className="rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-100/40 border border-amber-300 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs shrink-0">
                      <Coins className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-950 text-base">Humanizer-boten</h3>
                      <p className="text-[11px] text-amber-900 font-bold">Etisk språkvask</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 border border-amber-500">
                    {isUnlimited ? 'VIP Ubegrenset' : `${humanizerCredits} vask`}
                  </span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-medium mb-3">
                  Vasker bort robotaktige og kunstige formuleringer så din unike, reflekterte pedagogstemme skinner igjennom.
                </p>
                <div className="p-2.5 bg-white/90 rounded-xl border border-amber-300/80 text-[11px] text-slate-700 space-y-1 mb-2">
                  <div className="flex items-center gap-1 font-bold text-amber-950">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Etisk friksjon</span>
                  </div>
                  <p className="text-[10.5px] leading-snug">
                    Hver vask krever et bevisst valg (10 kr) for å verne om egen skriveprosess.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => onSelectTool('document-analysis-humanizer')}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Coins className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Åpne i Dokumentanalyse</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                {!isUnlimited && (
                  <button
                    onClick={() => setShowHumanizerModal(true)}
                    className="w-full py-1.5 px-3 text-[11px] font-bold text-amber-900 hover:text-slate-950 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Kjøp vask (10 kr via Stripe)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 5. Oppslagsverk & Pensum */}
          {(mobileCategoryFilter === 'all' || mobileCategoryFilter === 'kilder') && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Library className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Oppslagsverk & Begreper</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Ordbok & Pensumforslag</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                    BLU Pensum
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Søk i pedagogiske fagbegreper, Rammeplan-definisjoner, akademisk litteratur og referansehåndtering.
                </p>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">Fagordbok</span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">Pensumforslag</span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">Zotero & EndNote</span>
                </div>
              </div>
              <button
                onClick={() => setShowDesktopToolsOnMobile(false)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Åpne oppslagsverk & begreper</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    )}

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

      {/* GATEWAY WARNING MODAL (når ingen filer er valgt) */}
      <AnimatePresence>
        {isGatewayModalOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden p-6 sm:p-8 space-y-5 text-center relative"
            >
              <button
                type="button"
                onClick={() => setIsGatewayModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                title="Lukk advarsel"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
                <AlertTriangle className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 leading-tight">
                  Velg pensum først
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  For å bruke <strong className="text-slate-900">{gatewayToolName}</strong> må du først velge hvilket pensum eller dokumenter du vil bruke.
                </p>
              </div>

              <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-left text-xs text-amber-900 flex items-start gap-2.5">
                <BookOpen className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Huk av 1 eller flere filer i <strong>Filarkivet</strong> eller <strong>Kildebanken</strong> og trykk «Bruk kilder».
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsGatewayModalOpen(false);
                    if (gatewayActionType) {
                      setPendingAction(gatewayActionType);
                    }
                    if (onNavigateToResources) {
                      onNavigateToResources();
                    } else {
                      onSelectTool('resources');
                    }
                  }}
                  className="w-full py-3.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Archive className="w-4 h-4" />
                  <span>Gå til Filarkivet for å velge pensum</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsGatewayModalOpen(false);
                    if (gatewayActionType) {
                      setPendingAction(gatewayActionType);
                    }
                    onSelectTool('kildebank');
                  }}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookMarked className="w-4 h-4 text-indigo-600" />
                  <span>Gå til Kildebanken (APA 7)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ToolsDashboard;
