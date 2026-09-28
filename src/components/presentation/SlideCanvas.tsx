import React from 'react';
import { 
  CheckCircle2, 
  Quote, 
  Sparkles, 
  BookOpen, 
  GraduationCap, 
  Columns, 
  ListOrdered, 
  Heading1, 
  Lightbulb,
  FileText,
  School,
  Users,
  Heart
} from 'lucide-react';
import { PresentationSlide, SlideLayout } from '../../services/geminiService';
import { 
  PresentationBrandingSettings, 
  DEFAULT_BRANDING_SETTINGS, 
  TopBadgeIconType 
} from '../../lib/presentationSettings';

export type SlideThemeId = 'pedagogisk-varme' | 'akademisk-ren' | 'natur-lek' | 'nordisk-lys' | 'moderne-mork';

export interface SlideTheme {
  id: SlideThemeId;
  name: string;
  description: string;
  bgGradient: string;
  containerClass: string;
  titleClass: string;
  subtitleClass: string;
  cardClass: string;
  cardTextClass: string;
  accentColor: string;
  accentBg: string;
  accentText: string;
  footerClass: string;
  bulletIconColor: string;
  previewBg: string;
  isDark: boolean;
}

export const SLIDE_THEMES: Record<SlideThemeId, SlideTheme> = {
  'pedagogisk-varme': {
    id: 'pedagogisk-varme',
    name: 'Pedagogisk varme',
    description: 'Varme sand- og terrakottatoner, vennlig og innbydende barnehagepreg',
    bgGradient: 'bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-stone-100',
    containerClass: 'border-amber-200/80',
    titleClass: 'text-stone-900',
    subtitleClass: 'text-stone-600',
    cardClass: 'bg-white/85 border-amber-200/60 shadow-xs hover:border-amber-300',
    cardTextClass: 'text-stone-800',
    accentColor: 'amber-600',
    accentBg: 'bg-amber-100 text-amber-900 border-amber-300/80',
    accentText: 'text-amber-800',
    footerClass: 'text-stone-500 border-amber-200/40',
    bulletIconColor: 'text-amber-600',
    previewBg: 'bg-gradient-to-br from-amber-200 to-orange-300',
    isDark: false
  },
  'akademisk-ren': {
    id: 'akademisk-ren',
    name: 'Akademisk ren',
    description: 'Klassisk mørkeblå og skifer, høy kontrast og vitenskapelig presisjon',
    bgGradient: 'bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100',
    containerClass: 'border-slate-200',
    titleClass: 'text-slate-900',
    subtitleClass: 'text-slate-600',
    cardClass: 'bg-white border-slate-200/90 shadow-xs hover:border-indigo-300',
    cardTextClass: 'text-slate-800',
    accentColor: 'indigo-600',
    accentBg: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    accentText: 'text-indigo-700',
    footerClass: 'text-slate-500 border-slate-200/60',
    bulletIconColor: 'text-indigo-600',
    previewBg: 'bg-gradient-to-br from-slate-800 to-indigo-900',
    isDark: false
  },
  'natur-lek': {
    id: 'natur-lek',
    name: 'Natur og lek',
    description: 'Frisk salvie- og skogsgrønn, inspirert av utetid, sansing og lek',
    bgGradient: 'bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-stone-100',
    containerClass: 'border-emerald-200/80',
    titleClass: 'text-stone-900',
    subtitleClass: 'text-stone-600',
    cardClass: 'bg-white/90 border-emerald-200/60 shadow-xs hover:border-emerald-300',
    cardTextClass: 'text-stone-800',
    accentColor: 'emerald-600',
    accentBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    accentText: 'text-emerald-800',
    footerClass: 'text-stone-500 border-emerald-200/50',
    bulletIconColor: 'text-emerald-600',
    previewBg: 'bg-gradient-to-br from-emerald-500 to-teal-700',
    isDark: false
  },
  'nordisk-lys': {
    id: 'nordisk-lys',
    name: 'Nordisk lys',
    description: 'Minimalistisk, lys himmelblå og kjølig skandinavisk ro',
    bgGradient: 'bg-gradient-to-br from-sky-50/60 via-slate-50 to-blue-50/40',
    containerClass: 'border-sky-100',
    titleClass: 'text-slate-900',
    subtitleClass: 'text-slate-600',
    cardClass: 'bg-white/95 border-sky-100 shadow-xs hover:border-sky-200',
    cardTextClass: 'text-slate-700',
    accentColor: 'sky-600',
    accentBg: 'bg-sky-100 text-sky-900 border-sky-200',
    accentText: 'text-sky-700',
    footerClass: 'text-slate-500 border-sky-100',
    bulletIconColor: 'text-sky-600',
    previewBg: 'bg-gradient-to-br from-sky-200 to-blue-300',
    isDark: false
  },
  'moderne-mork': {
    id: 'moderne-mork',
    name: 'Moderne mørk',
    description: 'Dyp koksgrå nattmodus med glødende kontraster og kinofølelse',
    bgGradient: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
    containerClass: 'border-slate-800',
    titleClass: 'text-white',
    subtitleClass: 'text-slate-400',
    cardClass: 'bg-slate-900/90 border-slate-800 shadow-xs hover:border-indigo-500/50',
    cardTextClass: 'text-slate-200',
    accentColor: 'indigo-400',
    accentBg: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80',
    accentText: 'text-indigo-400',
    footerClass: 'text-slate-500 border-slate-800',
    bulletIconColor: 'text-indigo-400',
    previewBg: 'bg-gradient-to-br from-slate-900 to-black',
    isDark: true
  }
};

interface SlideCanvasProps {
  slide: PresentationSlide;
  slideNumber: number;
  totalSlides: number;
  themeId?: SlideThemeId;
  backgroundImageUrl?: string;
  backgroundDim?: number;
  backgroundBlur?: boolean;
  brandingSettings?: PresentationBrandingSettings;
  onUpdateSlide?: (updated: PresentationSlide) => void;
  onOpenSettings?: (focusedElement?: 1 | 2 | 3 | 4) => void;
  isPresenterMode?: boolean;
  className?: string;
  hideControls?: boolean;
}

export const SlideCanvas: React.FC<SlideCanvasProps> = ({
  slide,
  slideNumber,
  totalSlides,
  themeId = 'pedagogisk-varme',
  backgroundImageUrl,
  backgroundDim = 0.75,
  backgroundBlur = true,
  brandingSettings,
  onUpdateSlide,
  onOpenSettings,
  isPresenterMode = false,
  className = '',
  hideControls = false
}) => {
  const theme = SLIDE_THEMES[themeId] || SLIDE_THEMES['pedagogisk-varme'];
  const branding = brandingSettings || DEFAULT_BRANDING_SETTINGS;

  const renderTopBadgeIcon = (icon: TopBadgeIconType) => {
    switch (icon) {
      case 'school': return <School className="w-3.5 h-3.5" />;
      case 'users': return <Users className="w-3.5 h-3.5" />;
      case 'sparkles': return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
      case 'book': return <BookOpen className="w-3.5 h-3.5" />;
      case 'heart': return <Heart className="w-3.5 h-3.5 text-rose-500" />;
      case 'none': return null;
      case 'cap':
      default:
        return <GraduationCap className="w-3.5 h-3.5" />;
    }
  };

  // Bakgrunnsbilde, dimming og blur
  const effectiveBgImage = slide.backgroundImage || backgroundImageUrl;
  const effectiveDim = slide.backgroundDim !== undefined ? slide.backgroundDim : backgroundDim;
  const effectiveBlur = slide.backgroundBlur !== undefined ? slide.backgroundBlur : backgroundBlur;

  // Finn aktiv layout (standard til 'title' hvis slide 1, ellers 'bullets')
  const activeLayout: SlideLayout = slide.layout || (slideNumber === 1 ? 'title' : 'bullets');

  // Skift layout for gjeldende slide
  const handleSetLayout = (newLayout: SlideLayout) => {
    if (!onUpdateSlide) return;
    onUpdateSlide({
      ...slide,
      layout: newLayout
    });
  };

  // Klargjør kolonner for 'two-column' dersom bulletsRight ikke finnes
  const leftBullets = slide.bullets || [];
  const rightBullets = slide.bulletsRight && slide.bulletsRight.length > 0 
    ? slide.bulletsRight 
    : (leftBullets.length > 2 ? leftBullets.slice(Math.ceil(leftBullets.length / 2)) : ['Drøfting og didaktiske konsekvenser', 'Forankring i praksis']);
  const displayLeftBullets = slide.bulletsRight ? leftBullets : (leftBullets.length > 2 ? leftBullets.slice(0, Math.ceil(leftBullets.length / 2)) : leftBullets);

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      
      {/* Layout-velger (kun synlig for redigering, skjult i presentasjonsmodus) */}
      {!hideControls && onUpdateSlide && (
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleSetLayout('title')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                activeLayout === 'title' 
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tittelside (Omslag/Åpningslysbilde)"
            >
              <Heading1 className="w-3.5 h-3.5" />
              <span>Tittel</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetLayout('bullets')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                activeLayout === 'bullets' 
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Standard innhold med kulepunkter"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Kulepunkter</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetLayout('two-column')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                activeLayout === 'two-column' 
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="To kolonner (Sammenligning / Teori vs Praksis)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>To kolonner</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetLayout('quote')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                activeLayout === 'quote' 
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Pedagogisk sitat eller refleksjon"
            >
              <Quote className="w-3.5 h-3.5" />
              <span>Sitat / Teori</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetLayout('highlight')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                activeLayout === 'highlight' 
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Kjernefremheving eller nøkkelkonklusjon"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Fremheving</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              16:9 Widescreen
            </span>
          </div>
        </div>
      )}

      {/* SELVE 16:9 LYSBILDE-LERRETET */}
      <div 
        className={`relative w-full aspect-[16/9] rounded-2xl sm:rounded-3xl border shadow-lg overflow-hidden flex flex-col justify-between p-6 sm:p-10 select-none transition-all duration-300 ${theme.bgGradient} ${theme.containerClass}`}
      >
        {/* Valgfritt fotobakgrunn / KI-generert bilde */}
        {effectiveBgImage && (
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img 
              src={effectiveBgImage} 
              alt="Lysbildebakgrunn" 
              className={`w-full h-full object-cover select-none pointer-events-none transition-all duration-500 ${
                effectiveBlur ? 'blur-[4px] scale-105' : 'scale-100'
              }`} 
            />
            {/* Elegant halv-transparent kontrastdimming for å garantere 100% kontrast og lesbarhet */}
            <div 
              className={`absolute inset-0 transition-opacity duration-300 ${
                theme.isDark 
                  ? 'bg-slate-950' 
                  : 'bg-stone-50'
              }`}
              style={{ opacity: effectiveDim }}
            />
          </div>
        )}

        {/* Dekorativ diskré bakgrunnsglød */}
        {!effectiveBgImage && (
          <>
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/15 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />
          </>
        )}

        {/* TOPP-LINJE: BADGES OG METADATA */}
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* ELEMENT 1: TOPP-MERKE (HOVED-BADGE) */}
            {branding.showTopBadge && (
              <div 
                onClick={() => !hideControls && onOpenSettings?.(1)}
                className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider border shadow-2xs flex items-center gap-1.5 transition-all ${theme.accentBg} ${
                  !hideControls && onOpenSettings ? 'cursor-pointer hover:ring-2 hover:ring-indigo-400 hover:scale-102' : ''
                }`}
                title={!hideControls && onOpenSettings ? 'Klikk for å redigere eller skjule topp-merket (Innstillinger for presentasjon)' : undefined}
              >
                {renderTopBadgeIcon(branding.topBadgeIcon)}
                <span>{branding.topBadgeText || 'BLU'}</span>
              </div>
            )}

            {slide.subtitle && activeLayout !== 'title' && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md truncate max-w-xs ${theme.subtitleClass}`}>
                {slide.subtitle}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] sm:text-xs font-black tracking-widest uppercase px-2 py-0.5 rounded-md ${theme.isDark ? 'text-slate-400 bg-slate-900/60' : 'text-slate-500 bg-white/60'}`}>
              {slideNumber} / {totalSlides}
            </span>
          </div>
        </div>

        {/* MIDTRE INNHOLDSOMRÅDE - DYNAMISK ETTER LAYOUT */}
        <div className="relative z-10 my-auto flex-1 flex flex-col justify-center py-2 sm:py-4">
          
          {/* 1. TITTEL-LAYOUT (ÅPNINGSSLIDE) */}
          {activeLayout === 'title' && (
            <div className="max-w-3xl space-y-4 sm:space-y-6 text-left my-auto">
              {/* ELEMENT 2: KATEGORI / UNDERTYPE-BADGE */}
              {branding.showCategoryBadge && (
                <div 
                  onClick={() => !hideControls && onOpenSettings?.(2)}
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/60 backdrop-blur-xs border border-white/50 text-xs font-bold text-slate-700 shadow-2xs transition-all ${
                    !hideControls && onOpenSettings ? 'cursor-pointer hover:ring-2 hover:ring-indigo-400 hover:bg-white/80 hover:scale-102' : ''
                  }`}
                  title={!hideControls && onOpenSettings ? 'Klikk for å redigere eller skjule undertypen (Innstillinger)' : undefined}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{branding.categoryBadgeText || 'Akademisk presentasjon'}</span>
                </div>
              )}
              
              <h1 className={`text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] ${theme.titleClass}`}>
                {slide.title}
              </h1>

              {slide.subtitle ? (
                <p className={`text-sm sm:text-lg md:text-xl font-medium leading-relaxed max-w-2xl ${theme.subtitleClass}`}>
                  {slide.subtitle}
                </p>
              ) : (
                <p className={`text-sm sm:text-base font-medium leading-relaxed max-w-2xl ${theme.subtitleClass}`}>
                  Didaktisk drøfting og teoretisk forankring i barnehagens pedagogiske praksis
                </p>
              )}

              {slide.bullets && slide.bullets.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-2">
                  {slide.bullets.map((b, i) => (
                    <span 
                      key={i} 
                      className={`text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-xl border backdrop-blur-xs ${theme.cardClass} ${theme.cardTextClass}`}
                    >
                      • {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. STANDARD KULEPUNKTER */}
          {activeLayout === 'bullets' && (
            <div className="space-y-4 sm:space-y-5 my-auto">
              <h2 className={`text-xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight ${theme.titleClass}`}>
                {slide.title}
              </h2>

              <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5 max-w-4xl">
                {slide.bullets.map((bullet, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border backdrop-blur-xs transition-all ${theme.cardClass}`}
                  >
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-white/70 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <CheckCircle2 className={`w-4 h-4 sm:w-5 sm:h-5 ${theme.bulletIconColor}`} />
                    </div>
                    <span className={`text-xs sm:text-base md:text-lg font-semibold leading-snug ${theme.cardTextClass}`}>
                      {bullet}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. TO KOLONNER (SAMMENLIGNING / TEORI VS PRAKSIS) */}
          {activeLayout === 'two-column' && (
            <div className="space-y-4 sm:space-y-5 my-auto">
              <h2 className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight ${theme.titleClass}`}>
                {slide.title}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                {/* Venstre kolonne */}
                <div className={`p-4 sm:p-5 rounded-2xl border backdrop-blur-xs flex flex-col gap-2.5 ${theme.cardClass}`}>
                  <div className="flex items-center gap-2 pb-2 border-b border-black/5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Teoretisk perspektiv / Rammeverk
                    </span>
                  </div>
                  <ul className="space-y-2.5">
                    {displayLeftBullets.map((b, idx) => (
                      <li key={idx} className={`text-xs sm:text-sm font-semibold flex items-start gap-2 ${theme.cardTextClass}`}>
                        <span className={`mt-0.5 font-bold ${theme.bulletIconColor}`}>•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Høyre kolonne */}
                <div className={`p-4 sm:p-5 rounded-2xl border backdrop-blur-xs flex flex-col gap-2.5 ${theme.cardClass}`}>
                  <div className="flex items-center gap-2 pb-2 border-b border-black/5">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Didaktisk praksis / Refleksjon
                    </span>
                  </div>
                  <ul className="space-y-2.5">
                    {rightBullets.map((b, idx) => (
                      <li key={idx} className={`text-xs sm:text-sm font-semibold flex items-start gap-2 ${theme.cardTextClass}`}>
                        <span className={`mt-0.5 font-bold ${theme.bulletIconColor}`}>•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 4. SITAT / PEDAGOGISK REFLEKSJON */}
          {activeLayout === 'quote' && (
            <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto text-center my-auto">
              <div className="w-12 h-12 rounded-2xl bg-white/70 shadow-sm flex items-center justify-center mx-auto text-indigo-600">
                <Quote className="w-6 h-6" />
              </div>

              <blockquote className={`text-lg sm:text-2xl md:text-3xl font-extrabold italic leading-snug tracking-tight ${theme.titleClass}`}>
                «{slide.highlightText || slide.bullets[0] || slide.title}»
              </blockquote>

              <div className="space-y-1">
                <p className={`text-xs sm:text-sm font-bold uppercase tracking-widest ${theme.accentText}`}>
                  — {slide.quoteAuthor || 'Rammeplanen for barnehagen / Fagteori'}
                </p>
                {slide.bullets && slide.bullets.length > 1 && (
                  <p className={`text-xs sm:text-sm font-medium ${theme.subtitleClass}`}>
                    Refleksjon: {slide.bullets[1]}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 5. FREMHEVING / KJERNEKONKLUSJON */}
          {activeLayout === 'highlight' && (
            <div className="space-y-4 sm:space-y-5 my-auto">
              <h2 className={`text-xl sm:text-3xl font-black tracking-tight leading-tight ${theme.titleClass}`}>
                {slide.title}
              </h2>

              <div className={`p-5 sm:p-7 rounded-2xl sm:rounded-3xl border-2 shadow-sm backdrop-blur-xs text-center space-y-3 ${theme.accentBg}`}>
                <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Kjernebudskap</span>
                </div>
                <p className="text-base sm:text-xl md:text-2xl font-black leading-snug">
                  {slide.highlightText || slide.bullets[0] || 'Genuin medvirkning krever at pedagogen tåler barnets motstand som et gyldig meningsuttrykk.'}
                </p>
              </div>

              {slide.bullets && slide.bullets.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {slide.bullets.slice(1, 3).map((b, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 ${theme.cardClass} ${theme.cardTextClass}`}>
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${theme.bulletIconColor}`} />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* BUNN-LINJE / FOOTER & LAYOUT-TAG */}
        {(branding.showFooter || branding.showLayoutTag) && (
          <div className={`relative z-10 pt-3 border-t flex items-center justify-between text-[10px] sm:text-xs font-semibold ${theme.footerClass}`}>
            {/* ELEMENT 4: BUNNTEKST / FOOTER (NEDE TIL VENSTRE) */}
            {branding.showFooter ? (
              <div 
                onClick={() => !hideControls && onOpenSettings?.(4)}
                className={`flex items-center gap-2 truncate max-w-[70%] transition-all ${
                  !hideControls && onOpenSettings ? 'cursor-pointer hover:text-indigo-600 hover:scale-101' : ''
                }`}
                title={!hideControls && onOpenSettings ? 'Klikk for å redigere eller skjule bunnteksten (Innstillinger)' : undefined}
              >
                <span>{branding.footerText}</span>
                {branding.showSlideTitleInFooter && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-xs">{slide.title}</span>
                  </>
                )}
              </div>
            ) : <div />}

            {/* ELEMENT 3: SLIDE- OG LAYOUT-TAG (NEDE TIL HØYRE) */}
            {branding.showLayoutTag && (
              <div 
                onClick={() => !hideControls && onOpenSettings?.(3)}
                className={`flex items-center gap-2 shrink-0 transition-all ${
                  !hideControls && onOpenSettings ? 'cursor-pointer hover:text-indigo-600 hover:scale-102' : ''
                }`}
                title={!hideControls && onOpenSettings ? 'Klikk for å redigere eller skjule layout-tag (Innstillinger)' : undefined}
              >
                {branding.layoutTagCustomText ? (
                  <span>{branding.layoutTagCustomText}</span>
                ) : (
                  <>
                    <span>{activeLayout.toUpperCase()}</span>
                    <span>•</span>
                    <span>Slide {slideNumber}</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
