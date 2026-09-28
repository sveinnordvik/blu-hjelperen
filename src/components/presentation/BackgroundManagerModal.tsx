import React, { useState } from 'react';
import { 
  Palette, 
  Image as ImageIcon, 
  Sparkles, 
  X, 
  Check, 
  RotateCcw, 
  Sliders, 
  Trash2, 
  Layers, 
  Wand2, 
  CheckCircle2,
  Eye,
  Info
} from 'lucide-react';
import { SlideThemeId, SLIDE_THEMES } from './SlideCanvas';
import { 
  CURATED_SLIDE_BACKGROUNDS, 
  CuratedSlideBackground, 
  generateSlideBackgroundImage, 
  PresentationSlide 
} from '../../services/geminiService';

interface BackgroundManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSlideIndex: number;
  totalSlides: number;
  currentSlide: PresentationSlide;
  selectedTheme: SlideThemeId;
  onSelectTheme: (themeId: SlideThemeId) => void;
  globalBackground?: string;
  globalDim?: number;
  globalBlur?: boolean;
  onUpdateGlobalBackground: (bgUrl: string | undefined, dim?: number, blur?: boolean) => void;
  onUpdateCurrentSlide: (updated: PresentationSlide) => void;
  presentationTitle?: string;
}

export const BackgroundManagerModal: React.FC<BackgroundManagerModalProps> = ({
  isOpen,
  onClose,
  currentSlideIndex,
  totalSlides,
  currentSlide,
  selectedTheme,
  onSelectTheme,
  globalBackground,
  globalDim = 0.75,
  globalBlur = true,
  onUpdateGlobalBackground,
  onUpdateCurrentSlide,
  presentationTitle = ''
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'themes' | 'photos' | 'ai'>('photos');
  const [scope, setScope] = useState<'all' | 'single'>('all');
  
  // Kontrast og dimming
  const activeBg = scope === 'single' ? (currentSlide.backgroundImage ?? globalBackground) : globalBackground;
  const activeDim = scope === 'single' ? (currentSlide.backgroundDim ?? globalDim) : globalDim;
  const activeBlur = scope === 'single' ? (currentSlide.backgroundBlur ?? globalBlur) : globalBlur;

  const [dimValue, setDimValue] = useState<number>(activeDim);
  const [blurValue, setBlurValue] = useState<boolean>(activeBlur);

  // KI-generering state
  const defaultPrompt = presentationTitle || currentSlide.title || 'Barnehagebarn i natur og lek';
  const [aiPrompt, setAiPrompt] = useState(defaultPrompt);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiPreviewUrl, setAiPreviewUrl] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Bruk et valgt bilde
  const handleApplyImage = (url: string | undefined) => {
    if (scope === 'all') {
      onUpdateGlobalBackground(url, dimValue, blurValue);
      // Nullstill eventuell overstyring på gjeldende slide hvis den finnes
      if (currentSlide.backgroundImage) {
        onUpdateCurrentSlide({
          ...currentSlide,
          backgroundImage: undefined,
          backgroundDim: undefined,
          backgroundBlur: undefined
        });
      }
    } else {
      onUpdateCurrentSlide({
        ...currentSlide,
        backgroundImage: url,
        backgroundDim: dimValue,
        backgroundBlur: blurValue
      });
    }
  };

  // Håndter oppdatering av dim / blur
  const handleUpdateDim = (newDim: number) => {
    setDimValue(newDim);
    if (scope === 'all') {
      onUpdateGlobalBackground(globalBackground, newDim, blurValue);
    } else {
      onUpdateCurrentSlide({
        ...currentSlide,
        backgroundDim: newDim
      });
    }
  };

  const handleToggleBlur = () => {
    const newBlur = !blurValue;
    setBlurValue(newBlur);
    if (scope === 'all') {
      onUpdateGlobalBackground(globalBackground, dimValue, newBlur);
    } else {
      onUpdateCurrentSlide({
        ...currentSlide,
        backgroundBlur: newBlur
      });
    }
  };

  // Fjern bilde og gå tilbake til fargetema
  const handleRemoveImage = () => {
    if (scope === 'all') {
      onUpdateGlobalBackground(undefined);
    } else {
      onUpdateCurrentSlide({
        ...currentSlide,
        backgroundImage: undefined,
        backgroundDim: undefined,
        backgroundBlur: undefined
      });
    }
  };

  // Kjør KI-generering
  const handleGenerateAiBackground = async () => {
    if (!aiPrompt.trim() || isGeneratingAi) return;
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      const generatedUrl = await generateSlideBackgroundImage(aiPrompt);
      if (generatedUrl) {
        setAiPreviewUrl(generatedUrl);
        handleApplyImage(generatedUrl);
      } else {
        setAiError('Kunne ikke generere bilde. Prøv et annet nøkkelord eller velg et kuratert bilde.');
      }
    } catch (err: any) {
      console.error('Feil ved generering av bakgrunn:', err);
      setAiError('En uventet feil oppstod under genereringen.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                Bakgrunns- og temaoppsett for presentasjonen
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Velg blant pedagogiske fargetemaer, høyoppløselige fotobakgrunner eller generer unike KI-bakgrunner
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
            title="Lukk"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL FANER & OMFANG (SCOPE) */}
        <div className="px-5 sm:px-6 pt-4 pb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          {/* Faner */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('photos')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'photos'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Pedagogiske bakgrunner</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>KI-generert bakgrunn</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('themes')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'themes'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Fargetemaer</span>
            </button>
          </div>

          {/* Omfang: Alle slides vs gjeldende slide */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1 text-xs">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-bold text-slate-600 text-[11px] uppercase tracking-wider">Bruk på:</span>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scope === 'all'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hele presentasjonen (alle {totalSlides} slides)
            </button>
            <button
              type="button"
              onClick={() => setScope('single')}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scope === 'single'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kun slide {currentSlideIndex + 1}
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* FANE 1: KURATERTE PEDAGOGISKE FOTOBAKGRUNNER */}
          {activeTab === 'photos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Kuraterte høyoppløselige bakgrunner (16:9)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Spesielt utvalgt for barnehage- og profesjonsfaglige presentasjoner.
                  </p>
                </div>
                {activeBg && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Fjern bakgrunnsbilde</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {CURATED_SLIDE_BACKGROUNDS.map((bg) => {
                  const isChosen = activeBg === bg.url;
                  return (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => handleApplyImage(bg.url)}
                      className={`group relative aspect-[16/9] rounded-2xl overflow-hidden border-2 text-left transition-all duration-200 cursor-pointer shadow-xs ${
                        isChosen
                          ? 'border-indigo-600 ring-4 ring-indigo-500/20 scale-[1.02]'
                          : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
                      }`}
                    >
                      <img
                        src={bg.url}
                        alt={bg.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-2.5">
                        <span className="text-xs font-bold text-white leading-tight drop-shadow-xs">
                          {bg.name}
                        </span>
                        <span className="text-[10px] text-slate-300 font-normal truncate mt-0.5">
                          {bg.description}
                        </span>
                      </div>
                      {isChosen && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* FANE 2: KI-GENERERT BAKGRUNNSBILDE */}
          {activeTab === 'ai' && (
            <div className="space-y-5">
              <div className="p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-indigo-950">
                    Generer en skreddersydd bakgrunn med Gemini KI
                  </h4>
                  <p className="text-xs text-indigo-800 leading-relaxed">
                    KI analyserer temaet ditt og maler en subtil, stilren bakgrunn (16:9) med harmoniske farger, nordisk lys og god kontrast for presentasjonsteksten din.
                  </p>
                </div>
              </div>

              {/* Input for tema/prompt */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Hva handler presentasjonen eller lysbildet om?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="F.eks. Språkstimulering og lek i sandkassen, bålkos i lavvoen, Sokrates under treet..."
                    className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGenerateAiBackground();
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAiBackground}
                    disabled={isGeneratingAi || !aiPrompt.trim()}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
                  >
                    {isGeneratingAi ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin text-amber-300" />
                        <span>Maler bakgrunn...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 text-amber-300" />
                        <span>Generer bakgrunn</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Raske forslags-chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Foreslåtte temaer fra barnehagehverdagen:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Utelek i høstregn og søledammer',
                    'Samlingsstund med trefigurer og sang',
                    'Undring over maurtue og småkryp i skogen',
                    'Byggeklosser, konstruksjonslek og romforståelse',
                    'Didaktisk refleksjon og voksenrollen i lek'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAiPrompt(preset)}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {aiError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {aiError}
                </div>
              )}

              {/* Forhåndsvisning av nylig generert KI-bilde */}
              {activeBg && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Nåværende aktiv bakgrunn:
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Fjern og bruk fargetema</span>
                    </button>
                  </div>
                  <div className="relative aspect-[16/9] w-full max-w-md rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                    <img src={activeBg} alt="Aktiv bakgrunn" className="w-full h-full object-cover" />
                    <div 
                      className="absolute inset-0 bg-white"
                      style={{ opacity: dimValue }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                      <div className="bg-white/90 backdrop-blur-xs p-3 rounded-xl shadow-xs border border-black/5">
                        <p className="text-xs font-bold text-slate-800">
                          Forhåndsvisning med {Math.round(dimValue * 100)}% tekstbeskyttelse
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FANE 3: FARGETEMAER */}
          {activeTab === 'themes' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Velg grafisk design- og fargetema
                </h4>
                <p className="text-xs text-slate-500">
                  Bestemmer fargepaletten, typografien, kortrammene og ikonene for hele presentasjonen.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(Object.keys(SLIDE_THEMES) as SlideThemeId[]).map((themeKey) => {
                  const t = SLIDE_THEMES[themeKey];
                  const isCurrent = selectedTheme === themeKey;
                  return (
                    <button
                      key={themeKey}
                      type="button"
                      onClick={() => onSelectTheme(themeKey)}
                      className={`p-4 rounded-2xl border-2 text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-indigo-200 bg-white hover:bg-slate-50/60'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl border border-black/10 shrink-0 shadow-2xs ${t.previewBg}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${isCurrent ? 'text-indigo-950 font-black' : 'text-slate-900'}`}>
                            {t.name}
                          </span>
                          {isCurrent && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">
                          {t.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* KONTROLLER FOR KONTRAST / DIMMING & BLUR (KUN NÅR ET BILDE ER AKTIVT) */}
          {activeBg && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Tekstkontrast og lesbarhet (Overlay & Slør)
                  </span>
                </div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                  {Math.round(dimValue * 100)}% demping
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Dimming Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                    <span>Mer bilde (30%)</span>
                    <span>Høy kontrast / Maks leselighet (90%)</span>
                  </div>
                  <input
                    type="range"
                    min="0.30"
                    max="0.92"
                    step="0.02"
                    value={dimValue}
                    onChange={(e) => handleUpdateDim(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                {/* Myk uskarphet toggle */}
                <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200/80 rounded-xl">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Myk bakgrunnsuskarphet (Blur)</div>
                    <div className="text-[10px] text-slate-400">Gjør teksten mer fremtredende</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleBlur}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      blurValue ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <span 
                      className={`block w-4 h-4 bg-white rounded-full transition-transform shadow-xs absolute top-1 ${
                        blurValue ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Endringer lagres automatisk på presentasjonen.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Ferdig
          </button>
        </div>

      </div>
    </div>
  );
};
