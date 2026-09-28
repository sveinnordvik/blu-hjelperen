import React, { useState, useEffect } from 'react';
import { presentationSync, PresentationSyncState } from '../../lib/presentationSync';
import { SlideCanvas } from './SlideCanvas';
import { Maximize2, Minimize2, Tv, AlertCircle } from 'lucide-react';

export const ProjectorDisplayScreen: React.FC = () => {
  const [state, setState] = useState<PresentationSyncState | null>(() => presentationSync.getLatestState());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Lytt til sanntidsoppdateringer fra foredragsholdervinduet
  useEffect(() => {
    const unsubscribe = presentationSync.subscribe((newState) => {
      setState(newState);
    });

    // Skjul kontroller etter 3 sekunder inaktivitet
    let hideTimer: any = null;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      unsubscribe();
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(hideTimer);
    };
  }, []);

  // Tastaturnavigasjon på storskjermen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state) return;

      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'b' || e.key === 'B') {
        presentationSync.broadcast({
          ...state,
          isBlackout: !state.isBlackout
        });
      } else if (e.key === 'w' || e.key === 'W') {
        presentationSync.broadcast({
          ...state,
          isWhiteout: !state.isWhiteout
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Blackout-modus (publikumsfokus på foredragsholderen)
  if (state?.isBlackout) {
    return (
      <div 
        onClick={() => state && presentationSync.broadcast({ ...state, isBlackout: false })}
        className="fixed inset-0 bg-black z-50 flex items-center justify-center cursor-none select-none"
      >
        <div className={`text-white/20 text-xs font-mono transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          Mørklagt lerret (B for å vekke)
        </div>
      </div>
    );
  }

  // Whiteout-modus
  if (state?.isWhiteout) {
    return (
      <div 
        onClick={() => state && presentationSync.broadcast({ ...state, isWhiteout: false })}
        className="fixed inset-0 bg-white z-50 flex items-center justify-center cursor-none select-none"
      >
        <div className={`text-black/20 text-xs font-mono transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          Hvitt lerret (W for å vekke)
        </div>
      </div>
    );
  }

  // Ingen presentasjon mottatt enda
  if (!state || !state.currentSlide) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-lg animate-pulse">
          <Tv className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Storskjerm / Projektor klar</h2>
          <p className="text-sm text-slate-400 max-w-sm">
            Venter på sending fra BLU-Hjelperen Foredragsholdervisning...
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
          Start presentasjonen fra hovedvinduet eller trykk «Foredragsholder».
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-0 select-none overflow-hidden">
      
      {/* 16:9-lerretet tilpasset nøyaktig til tilgjengelig skjerm */}
      <div className="w-full max-h-screen aspect-[16/9] flex items-center justify-center p-2 sm:p-4">
        <SlideCanvas 
          slide={state.currentSlide}
          slideNumber={state.slideIndex + 1}
          totalSlides={state.totalSlides}
          themeId={state.themeId}
          backgroundImageUrl={state.globalBackground}
          backgroundDim={state.globalDim}
          backgroundBlur={state.globalBlur}
          brandingSettings={state.brandingSettings}
          hideControls={true}
          className="w-full h-full shadow-2xl"
        />
      </div>

      {/* Flytende diskré verktøylinje for storskjermen */}
      <div 
        className={`absolute bottom-4 right-4 z-50 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-2xl shadow-xl text-white transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mr-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Slide {state.slideIndex + 1} / {state.totalSlides}</span>
        </div>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
          title={isFullscreen ? 'Avslutt fullskjerm (F)' : 'Fullskjerm for projektor (F)'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

    </div>
  );
};
