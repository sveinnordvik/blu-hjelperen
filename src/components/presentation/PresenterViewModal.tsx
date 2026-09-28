import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  Tv, 
  Maximize2, 
  Volume2, 
  VolumeX, 
  Check, 
  Copy, 
  Sun, 
  Moon, 
  Type, 
  Layers, 
  ExternalLink,
  Radio,
  FileText,
  AlertCircle
} from 'lucide-react';
import { SlideCanvas, SlideThemeId } from './SlideCanvas';
import { PresentationSlide } from '../../services/geminiService';
import { presentationSync } from '../../lib/presentationSync';
import { PresentationBrandingSettings } from '../../lib/presentationSettings';

interface PresenterViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  slides: PresentationSlide[];
  currentSlideIndex: number;
  onSlideChange: (index: number) => void;
  themeId: SlideThemeId;
  globalBackground?: string;
  globalDim?: number;
  globalBlur?: boolean;
  brandingSettings?: PresentationBrandingSettings;
  title: string;
}

export const PresenterViewModal: React.FC<PresenterViewModalProps> = ({
  isOpen,
  onClose,
  slides,
  currentSlideIndex,
  onSlideChange,
  themeId,
  globalBackground,
  globalDim,
  globalBlur,
  brandingSettings,
  title
}) => {
  if (!isOpen) return null;

  // Stoppeklokke og tidtaker
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [targetMinutes, setTargetMinutes] = useState(10);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Tekststørrelse for prompter (1: normal, 2: stor, 3: ekstra stor)
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(2);

  // Blackout og Whiteout tilstand
  const [isBlackout, setIsBlackout] = useState(false);
  const [isWhiteout, setIsWhiteout] = useState(false);

  // Status for ekstern projektor
  const [isProjectorConnected, setIsProjectorConnected] = useState(false);

  // Talemanus avspilling
  const [isSpeaking, setIsSpeaking] = useState(false);

  const currentSlide = slides[currentSlideIndex] || slides[0];
  const nextSlide = slides[currentSlideIndex + 1] || null;

  // Kringkast oppdatering til storskjermen ved hver slide-/tilstandsendring
  useEffect(() => {
    presentationSync.broadcast({
      slideIndex: currentSlideIndex,
      totalSlides: slides.length,
      currentSlide,
      nextSlide: nextSlide || undefined,
      themeId,
      globalBackground,
      globalDim,
      globalBlur,
      isBlackout,
      isWhiteout,
      brandingSettings,
      title,
      timestamp: Date.now()
    });
  }, [currentSlideIndex, themeId, globalBackground, globalDim, globalBlur, isBlackout, isWhiteout, brandingSettings, title]);

  // Tidtaker og klokke
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }

    const clockInterval = setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    const now = new Date();
    setCurrentTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, [isTimerRunning]);

  // Tastaturnavigasjon for foredragsholderen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Unngå hvis brukeren skriver i et tekstfelt
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        if (currentSlideIndex < slides.length - 1) {
          onSlideChange(currentSlideIndex + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (currentSlideIndex > 0) {
          onSlideChange(currentSlideIndex - 1);
        }
      } else if (e.key === 'b' || e.key === 'B') {
        setIsBlackout(prev => !prev);
      } else if (e.key === 'w' || e.key === 'W') {
        setIsWhiteout(prev => !prev);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, slides.length, onSlideChange, onClose]);

  // Format sekunder til MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Åpne storskjerm i eget popup-vindu
  const handleOpenProjectorWindow = () => {
    const width = 1280;
    const height = 720;
    const left = window.screen.width - width;
    const top = 0;
    const win = window.open(
      `${window.location.origin}${window.location.pathname}?mode=projector`,
      'BLU_Projector_Screen',
      `width=${width},height=${height},top=${top},left=${left},menubar=no,toolbar=no,location=no,status=no`
    );
    if (win) {
      setIsProjectorConnected(true);
      // Send umiddelbar oppdatering
      setTimeout(() => {
        presentationSync.broadcast({
          slideIndex: currentSlideIndex,
          totalSlides: slides.length,
          currentSlide,
          nextSlide: nextSlide || undefined,
          themeId,
          globalBackground,
          globalDim,
          globalBlur,
          isBlackout,
          isWhiteout,
          title,
          timestamp: Date.now()
        });
      }, 500);
    }
  };

  // TTS tekst-til-tale
  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentSlide.script);
      utterance.lang = 'nb-NO';
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Fontstørrelse klasser for prompter
  const getPromptFontSize = () => {
    switch (fontSizeLevel) {
      case 1: return 'text-base sm:text-lg leading-relaxed';
      case 3: return 'text-2xl sm:text-3xl leading-relaxed font-semibold';
      case 2:
      default: return 'text-xl sm:text-2xl leading-relaxed';
    }
  };

  // Beregnet tid
  const words = (currentSlide.script || '').trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.max(15, Math.round((words / 130) * 60));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col overflow-hidden select-none animate-in fade-in duration-150">
      
      {/* TOPP-BAR: STATUS, TIDTAKER OG HOVEDKONTROLLER */}
      <div className="px-4 sm:px-6 py-3 bg-slate-900/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Venstre: Tittel og Status */}
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Foredragsholder</span>
          </div>

          <h2 className="text-sm font-bold text-slate-200 truncate max-w-xs hidden md:block">
            {title || 'BLU Presentasjon'}
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenProjectorWindow}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                isProjectorConnected 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Åpne et eget rent projektor-vindu på storskjermen"
            >
              <Tv className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isProjectorConnected ? 'Storskjerm synkronisert' : 'Åpne projektorvindu'}</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Midten: Live Tidtaker & Klokke */}
        <div className="flex items-center gap-4 bg-slate-950/70 border border-white/10 px-4 py-1.5 rounded-2xl">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xl font-black text-emerald-400 tracking-wider">
              {formatTime(timerSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="p-1 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              title={isTimerRunning ? 'Pause tidtaker' : 'Start tidtaker'}
            >
              {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setTimerSeconds(0)}
              className="p-1 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Nullstill tidtaker"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {currentTimeStr && (
            <div className="text-xs font-semibold text-slate-400 border-l border-white/10 pl-3 hidden sm:block">
              Klokken: <span className="text-slate-200">{currentTimeStr}</span>
            </div>
          )}
        </div>

        {/* Høyre: Skjermkontroller (Blackout, Whiteout, Lukk) */}
        <div className="flex items-center gap-2">
          {/* Blackout toggle (B) */}
          <button
            type="button"
            onClick={() => setIsBlackout(!isBlackout)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isBlackout 
                ? 'bg-amber-500 text-slate-950 font-black' 
                : 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white'
            }`}
            title="Mørklegg storskjermen for å samle oppmerksomheten (Tastatursnarvei: B)"
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Svart lerret (B)</span>
          </button>

          {/* Whiteout toggle (W) */}
          <button
            type="button"
            onClick={() => setIsWhiteout(!isWhiteout)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isWhiteout 
                ? 'bg-white text-slate-950 font-black' 
                : 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white'
            }`}
            title="Gjør storskjermen hvit (Tastatursnarvei: W)"
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Hvitt lerret (W)</span>
          </button>

          {/* Lukkeknapp */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer ml-1"
            title="Lukk foredragsholdervisning (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* HOVEDOMRÅDE: DELT VISNING (VENSTRE = LERRET + NESTE, HØYRE = TELEPROMPTER MANUS) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden">
        
        {/* VENSTRE SPALTE: AKTIVT LYSBILDE & NESTE LYSBILDE (5 KOLONNER) */}
        <div className="lg:col-span-5 flex flex-col gap-3 overflow-y-auto pr-1">
          
          {/* AKTIVT LYSBILDE PÅ LERRETET */}
          <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-3.5 shadow-xl flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live på lerretet nå
              </span>
              <span className="text-slate-400">
                Slide {currentSlideIndex + 1} av {slides.length}
              </span>
            </div>

            <SlideCanvas 
              slide={currentSlide}
              slideNumber={currentSlideIndex + 1}
              totalSlides={slides.length}
              themeId={themeId}
              backgroundImageUrl={globalBackground}
              backgroundDim={globalDim}
              backgroundBlur={globalBlur}
              brandingSettings={brandingSettings}
              hideControls={true}
              className="w-full shadow-md"
            />
          </div>

          {/* NESTE LYSBILDE (FORHÅNDSVISNING) */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Neste lysbilde:</span>
              {nextSlide && <span className="text-indigo-300 font-bold">Slide {currentSlideIndex + 2}</span>}
            </div>

            {nextSlide ? (
              <div className="flex items-center gap-3 bg-slate-950/80 p-2.5 rounded-xl border border-white/5">
                <div className="w-24 aspect-[16/9] rounded-lg overflow-hidden shrink-0 border border-white/10 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                  {nextSlide.layout || 'Slide'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">
                    {nextSlide.title}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {nextSlide.bullets?.[0] || nextSlide.script?.substring(0, 50) + '...'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-slate-500 font-medium">
                Siste lysbilde i presentasjonen!
              </div>
            )}
          </div>

          {/* NAVIGASJONSKONTROLLER */}
          <div className="p-3 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-between gap-3 mt-auto">
            <button
              type="button"
              onClick={() => {
                if (currentSlideIndex > 0) onSlideChange(currentSlideIndex - 1);
              }}
              disabled={currentSlideIndex === 0}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Forrige (←)
            </button>

            <span className="text-xs font-bold text-slate-400">
              {currentSlideIndex + 1} / {slides.length}
            </span>

            <button
              type="button"
              onClick={() => {
                if (currentSlideIndex < slides.length - 1) onSlideChange(currentSlideIndex + 1);
              }}
              disabled={currentSlideIndex === slides.length - 1}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              Neste (→) <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* HØYRE SPALTE: TELEPROMPTER & MUNTLIG TALEMANUS (7 KOLONNER) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-white/10 rounded-3xl p-5 sm:p-7 flex flex-col justify-between overflow-hidden shadow-2xl">
          
          {/* Prompter Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                Muntlig Manus & Prompter
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                • {words} ord • ~{estimatedSeconds} sek taletid
              </span>
            </div>

            {/* Fontstørrelse kontroller */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Tekst:</span>
              <button
                type="button"
                onClick={() => setFontSizeLevel(1)}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  fontSizeLevel === 1 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSizeLevel(2)}
                className={`px-2 py-0.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                  fontSizeLevel === 2 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => setFontSizeLevel(3)}
                className={`px-2 py-0.5 rounded-lg text-base font-bold transition-colors cursor-pointer ${
                  fontSizeLevel === 3 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                A++
              </button>
            </div>
          </div>

          {/* TELEPROMPTER TEKSTOMRÅDE (STOR, TYDELIG, LETTLEST PÅ AVSTAND) */}
          <div className="flex-1 overflow-y-auto py-5 pr-2 scrollbar-thin space-y-4">
            <div className={`text-slate-100 font-medium ${getPromptFontSize()} transition-all duration-200 select-text leading-relaxed tracking-wide`}>
              «{currentSlide.script || 'Ingen talemanus registrert for dette lysbildet.'}»
            </div>

            {/* Nøkkelstikkord fra lysbildet som støtte */}
            {currentSlide.bullets && currentSlide.bullets.length > 0 && (
              <div className="pt-4 border-t border-white/10 space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Stikkord på skjermen:
                </span>
                <div className="flex flex-wrap gap-2">
                  {currentSlide.bullets.map((b, idx) => (
                    <span 
                      key={idx}
                      className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 font-medium"
                    >
                      • {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Prompter Footer */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={toggleSpeech}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                isSpeaking 
                  ? 'bg-amber-500 text-slate-950 font-black animate-pulse' 
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span>{isSpeaking ? 'Stopp opplesing' : 'Lytt til manus'}</span>
            </button>

            <span className="text-xs text-slate-500">
              Naviger med piltaster ← → eller Mellomrom
            </span>
          </div>

        </div>

      </div>

    </div>
  );
};
