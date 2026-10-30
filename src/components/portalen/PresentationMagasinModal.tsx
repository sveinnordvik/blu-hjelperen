import React, { useState, useEffect, useRef } from 'react';
import { generateDirectImageBrowser } from '../../services/geminiService';
import { 
  X, ChevronLeft, ChevronRight, Download, BookOpen, 
  Sparkles, Heart, Trees, Layers, Smile, ShieldCheck, 
  Award, Users, Building, Compass, Sun, Flame, Palette, Target, RefreshCw,
  Edit3, Image, Upload, Plus, Trash2, ArrowUp, ArrowDown, 
  Columns, RotateCcw, Check, Eye, Sliders, GripVertical,
  Maximize2, Minimize2, Quote, Hash, Sparkle, Wand2, Lightbulb
} from 'lucide-react';

// ==========================================
// 1. TEMATISERING & FARGER
// ==========================================
const THEMES = {
  navy: { 
    id: 'navy', name: 'Moderne Navy', 
    primaryText: 'text-[#1e1b4b]', accentText: 'text-emerald-600', 
    accentBg: 'bg-emerald-600', accentBorder: 'border-emerald-600', 
    gradient: 'from-[#1e1b4b]' 
  },
  skog: { 
    id: 'skog', name: 'Skog & Natur', 
    primaryText: 'text-green-950', accentText: 'text-orange-600', 
    accentBg: 'bg-orange-600', accentBorder: 'border-orange-600', 
    gradient: 'from-green-950' 
  },
  hav: { 
    id: 'hav', name: 'Kyst & Hav', 
    primaryText: 'text-slate-900', accentText: 'text-cyan-600', 
    accentBg: 'bg-cyan-600', accentBorder: 'border-cyan-600', 
    gradient: 'from-slate-900' 
  },
  varm: { 
    id: 'varm', name: 'Varm Glød', 
    primaryText: 'text-stone-900', accentText: 'text-rose-600', 
    accentBg: 'bg-rose-600', accentBorder: 'border-rose-600', 
    gradient: 'from-stone-900' 
  },
  kreativ: { 
    id: 'kreativ', name: 'Lekende Lilla', 
    primaryText: 'text-purple-950', accentText: 'text-pink-500', 
    accentBg: 'bg-pink-500', accentBorder: 'border-pink-500', 
    gradient: 'from-purple-950' 
  },
  nøytral: { 
    id: 'nøytral', name: 'Stilren & Ren', 
    primaryText: 'text-gray-900', accentText: 'text-indigo-600', 
    accentBg: 'bg-indigo-600', accentBorder: 'border-indigo-600', 
    gradient: 'from-gray-900' 
  }
};

// ==========================================
// 2. FORHÅNDSDEFINERTE BARNEHAGE-BILDER FOR GALLERI
// ==========================================
const CURATED_GALLERY_IMAGES = [
  { label: 'Natur & Gapahuk', url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Lek & Samspill', url: 'https://images.unsplash.com/photo-1587691592099-24045742c181?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Vennskap i ring', url: 'https://images.unsplash.com/photo-1602330925725-d36cfa1e0e85?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Kreativ Forming', url: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Høststemning & Løv', url: 'https://images.unsplash.com/photo-1507371341162-763b5e419408?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Vår & Spirende Liv', url: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Vekst & Mestring', url: 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Bøker & Læring', url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Friluft & Turglede', url: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=1200&q=80' }
];

// ==========================================
// 3. DATATYPER FOR REDIGERINGSVERKTØY
// ==========================================
export interface EditableBox {
  id: string;
  boxType?: 'text' | 'image' | 'quote' | 'stat';
  title: string;
  content: string;
  imageSrc?: string;
  imageTag?: string;
  imageCaption?: string;
  statNumber?: string;
  author?: string;
  iconType?: string;
  colSpan?: 1 | 2; // 1 = halv bredde (50%), 2 = full bredde (100%)
  heightSize?: 'compact' | 'normal' | 'tall';
  colorScheme?: 'default' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
}

export interface EditablePageData {
  layoutVariant: 'hero-top' | 'image-left' | 'image-right' | 'text-focus' | 'full-page-text';
  imageSrc: string;
  imageTag: string;
  imageCaption: string;
  boxes: EditableBox[];
}

// Ikon-oppslag
const getIconComponent = (iconType?: string, className = "w-4 h-4") => {
  switch (iconType) {
    case 'building': return <Building className={className} />;
    case 'target': return <Target className={className} />;
    case 'heart': return <Heart className={className} />;
    case 'smile': return <Smile className={className} />;
    case 'users': return <Users className={className} />;
    case 'sun': return <Sun className={className} />;
    case 'compass': return <Compass className={className} />;
    case 'palette': return <Palette className={className} />;
    case 'shield': return <ShieldCheck className={className} />;
    case 'book': return <BookOpen className={className} />;
    case 'award': return <Award className={className} />;
    case 'trees': return <Trees className={className} />;
    case 'sparkles': return <Sparkles className={className} />;
    default: return <Sparkles className={className} />;
  }
};

// ==========================================
// 4. DYNAMISK LAYOUT-MOTOR
// ==========================================
const MagazineChapterLayout = ({ 
  chapterNumber, title, subtitle, pageNumber, 
  layoutVariant = 'image-right', 
  imageSrc, VisualComponent, imageTag, imageCaption, children,
  theme,
  isEditMode,
  onOpenGraphicEditor
}: any) => {
  
  const renderGraphics = (extraClasses = "") => (
    <div className={`relative rounded-2xl overflow-hidden shadow-sm group bg-slate-50 flex flex-col border border-slate-100 ${extraClasses}`}>
      {VisualComponent ? (
        <div className="absolute inset-0 w-full h-full flex flex-col p-8 bg-slate-50/50">
          {VisualComponent}
        </div>
      ) : (
        <>
          <img 
            src={imageSrc} 
            alt={imageTag || title} 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${theme.gradient}/95 via-${theme.gradient}/20 to-transparent flex flex-col justify-end p-5 md:p-8`}>
            {imageTag && (
              <span className={`text-[10px] uppercase font-bold tracking-widest ${theme.accentText} mb-2`}>{imageTag}</span>
            )}
            {imageCaption && (
              <p className="text-white font-bold text-sm leading-snug drop-shadow-md">{imageCaption}</p>
            )}
          </div>
        </>
      )}

      {/* Rask redigerings-overlay på bildet når redigeringsmodus er aktiv */}
      {isEditMode && onOpenGraphicEditor && (
        <button
          onClick={onOpenGraphicEditor}
          className="absolute top-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 backdrop-blur-sm transition-all z-20 cursor-pointer"
        >
          <Image size={13} />
          <span>Endre grafikk</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="bg-white w-full max-w-[210mm] aspect-[1/1.414] shadow-2xl rounded-sm p-12 flex flex-col relative mx-auto overflow-hidden">
      <div className="mb-8 shrink-0">
        <h3 className={`text-xs font-bold ${theme.accentText} uppercase tracking-widest mb-1`}>{chapterNumber}</h3>
        <h1 className={`text-4xl font-extrabold ${theme.primaryText} tracking-tight mb-2 leading-tight`}>{title}</h1>
        <p className="text-slate-500 font-medium">{subtitle}</p>
        <div className={`w-full h-px ${theme.accentBg} opacity-30 mt-6`}></div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {layoutVariant === 'hero-top' && (
          <div className="flex flex-col h-full gap-6">
            {renderGraphics("h-60 w-full shrink-0")}
            <div className="grid grid-cols-2 gap-6 overflow-y-auto scrollbar-hide pb-4 content-start">{children}</div>
          </div>
        )}
        {layoutVariant === 'image-right' && (
          <div className="grid grid-cols-12 gap-8 h-full">
            <div className="col-span-7 grid grid-cols-2 gap-4 content-start overflow-y-auto scrollbar-hide pb-4 pr-1">{children}</div>
            <div className="col-span-5 h-full">{renderGraphics("h-full w-full")}</div>
          </div>
        )}
        {layoutVariant === 'image-left' && (
          <div className="grid grid-cols-12 gap-8 h-full">
            <div className="col-span-5 h-full">{renderGraphics("h-full w-full")}</div>
            <div className="col-span-7 grid grid-cols-2 gap-4 content-start overflow-y-auto scrollbar-hide pb-4 pl-1">{children}</div>
          </div>
        )}
        {layoutVariant === 'text-focus' && (
          <div className="flex flex-col h-full gap-6">
            <div className="grid grid-cols-2 gap-6 overflow-y-auto scrollbar-hide pb-4 flex-1 content-start">{children}</div>
            {renderGraphics("h-48 w-full shrink-0 mt-auto")}
          </div>
        )}
        {layoutVariant === 'full-page-text' && (
          <div className="flex-1 w-full h-full pb-2">
            <div className="grid grid-cols-2 gap-6 h-full content-start overflow-y-auto scrollbar-hide">
              {children}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 pt-5 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">
        <span>Styringsdokument • {title}</span>
        <span>Side {pageNumber} / 13</span>
      </div>
    </div>
  );
};

// ==========================================
// 5. HOVEDKOMPONENTEN
// ==========================================
export interface PresentationMagasinModalProps {
  isOpen: boolean;
  onClose: () => void;
  barnehageNavn?: string;
  omBarnehagenText?: string;
  visjonText?: string;
  kjerneverdierText?: string;
  psykososialtMiljoeText?: string;
  laeringssynText?: string;
  lekensPilarerText?: string;
  fagomraaderBeskrivelseText?: string;
  satsingsomraaderText?: string;
  arbeidsmaaterText?: string;
  barnsMedvirkningText?: string;
  foreldresamarbeidText?: string;
  overgangerText?: string;
  bakgrunnsdokumenterText?: string;
  monthPlans?: Record<string, any>;
  suVedtakDato?: string;
  suReferatLink?: string;
  logoUrl?: string;
  progressionMatrices?: any[];
  chapters?: any;
  onUpdateChapters?: (chapters: any) => void;
}

export default function PresentationMagasinModal({
  isOpen, onClose, barnehageNavn, omBarnehagenText, visjonText, kjerneverdierText,
  psykososialtMiljoeText, laeringssynText, lekensPilarerText, fagomraaderBeskrivelseText,
  satsingsomraaderText, arbeidsmaaterText, barnsMedvirkningText, foreldresamarbeidText,
  overgangerText, bakgrunnsdokumenterText, monthPlans, suVedtakDato, suReferatLink
}: PresentationMagasinModalProps) {
  
  const [currentPage, setCurrentPage] = useState(1);
  const [activeThemeId, setActiveThemeId] = useState('navy');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const totalPages = 13;

  const currentTheme = THEMES[activeThemeId as keyof typeof THEMES] || THEMES.navy;

  // Initial standard-konfigurasjon for redigerbare sider
  const getDefaultPages = (): Record<number, EditablePageData> => ({
    1: {
      layoutVariant: 'hero-top',
      imageSrc: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=1200&q=80',
      imageTag: 'Forside',
      imageCaption: 'Styringsdokument for pedagogisk virksomhet',
      boxes: []
    },
    3: {
      layoutVariant: 'hero-top',
      imageSrc: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80',
      imageTag: 'Identitet & Kultur',
      imageCaption: 'Felles opplevelser og glede i barnehagehverdagen',
      boxes: [
        { id: 'b3_1', title: 'Hvem er vi?', content: omBarnehagenText || 'Vi er en barnehage med fokus på natur, relasjoner og skaperglede.', iconType: 'building', colSpan: 1, colorScheme: 'default' },
        { id: 'b3_2', title: 'Vår Visjon', content: visjonText || '«Vi får verdens viktigste verdier til å vokse!»', iconType: 'target', colSpan: 1, colorScheme: 'indigo' }
      ]
    },
    4: {
      layoutVariant: 'image-left',
      imageSrc: 'https://images.unsplash.com/photo-1602330925725-d36cfa1e0e85?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Fellesskap & Samspill',
      imageCaption: 'Barn som bygger relasjoner og trygghet.',
      boxes: [
        { id: 'b4_1', title: 'Kjerneverdier', content: kjerneverdierText || 'Trygghet, likeverd og anerkjennelse.', iconType: 'heart', colSpan: 1, colorScheme: 'rose' },
        { id: 'b4_2', title: 'Barns medvirkning', content: barnsMedvirkningText || 'Barn har rett til å uttrykke sine meninger og påvirke barnehagedagen.', iconType: 'smile', colSpan: 1, colorScheme: 'emerald' },
        { id: 'b4_3', title: 'Foreldresamarbeid', content: foreldresamarbeidText || 'Åpent og tillitsfullt foreldresamarbeid er avgjørende for barnas trivsel.', iconType: 'users', colSpan: 1, colorScheme: 'indigo' }
      ]
    },
    5: {
      layoutVariant: 'image-right',
      imageSrc: 'https://images.unsplash.com/photo-1587691592099-24045742c181?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Læringssyn',
      imageCaption: 'Fokusert lek og undring i stimulerende omgivelser.',
      boxes: [
        { id: 'b5_1', title: 'Helhetlig læringssyn', content: laeringssynText || 'Barn lærer med hele seg, hele dagen, i samspill med omgivelsene.', iconType: 'sun', colSpan: 1, colorScheme: 'amber' },
        { id: 'b5_2', title: 'Årets satsingsområder', content: satsingsomraaderText || 'Fokus på lek, språkstimulering og utforskende friluftsliv.', iconType: 'compass', colSpan: 1, colorScheme: 'indigo' },
        { id: 'b5_3', title: 'Arbeidsmåter', content: arbeidsmaaterText || 'Prosjektbasert arbeid forankret i barnas egne initiativ.', iconType: 'palette', colSpan: 1, colorScheme: 'rose' }
      ]
    },
    6: {
      layoutVariant: 'image-left',
      imageSrc: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Trivsel & Trygghet',
      imageCaption: 'Leken har en egenverdi og er grunnlaget for trivsel.',
      boxes: [
        { id: 'b6_1', title: 'Miljø & Forebygging', content: psykososialtMiljoeText || 'Nulltoleranse for utestengelse og mobbing (Kapittel 8 i barnehageloven).', iconType: 'shield', colSpan: 1, colorScheme: 'emerald' },
        { id: 'b6_2', title: 'Lekens pilarer', content: lekensPilarerText || 'Vår viktigste arena for danning, vennskap, fantasi og språk.', iconType: 'smile', colSpan: 1, colorScheme: 'amber' }
      ]
    },
    7: {
      layoutVariant: 'image-right',
      imageSrc: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1200&q=80',
      imageTag: 'Rammeplanens 7 fag',
      imageCaption: 'Helhetlig læring gjennom hverdagsaktiviteter og lek.',
      boxes: [
        { 
          id: 'b7_1', 
          title: 'Tverrfaglig pedagogikk', 
          content: 'Fagene isoleres aldri, men oppleves som en helhet av barna i lek og aktiviteter. Gjennom turer, måltider og samlingsstunder flettes fagområdene naturlig sammen.', 
          iconType: 'compass', 
          colSpan: 2, 
          colorScheme: 'indigo' 
        },
        { 
          id: 'b7_2', 
          title: 'Rammeplanens fagområder', 
          content: fagomraaderBeskrivelseText || '1. Språk, tekst og kommunikasjon\n2. Kropp, bevegelse, mat og helse\n3. Kunst, kultur og kreativitet\n4. Natur, miljø og teknologi\n5. Antall, rom og form\n6. Etikk, religion og filosofi\n7. Nærmiljø og samfunn', 
          iconType: 'layers', 
          colSpan: 2, 
          colorScheme: 'default' 
        },
        { 
          id: 'b7_3', 
          title: 'Lek og progresjon', 
          content: 'Alle fagområder tilpasses barnas alder og modningsnivå. Barna skal få utfolde skaperglede, undring og utforskertrang.', 
          iconType: 'sparkles', 
          colSpan: 1, 
          colorScheme: 'emerald' 
        },
        { 
          id: 'b7_4', 
          title: 'Balanse mellom lek og læring', 
          content: 'Læring skjer like mye i spontan lek som i planlagte samlingsstunder. Voksne støtter opp om barnas nysgjerrighet.', 
          iconType: 'sun', 
          colSpan: 1, 
          colorScheme: 'amber' 
        }
      ]
    },
    8: {
      layoutVariant: 'full-page-text',
      imageSrc: 'https://images.unsplash.com/photo-1507371341162-763b5e419408?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Høststemning',
      imageCaption: 'Utforskning i naturens egne farger',
      boxes: [
        {
          id: 'b8_1',
          title: 'August',
          content: monthPlans?.['August']?.theme 
            ? `${monthPlans['August'].theme}\n\nMål:\n${monthPlans['August'].goals || 'Trygghet og fellesskap.'}\n\nAktiviteter:\n${monthPlans['August'].activities || 'Tilvenning og bli-kjent-leker.'}`
            : 'Oppstart, trygghet og nye relasjoner\n\nMål:\nBarna skal bli trygge på hverandre, de voksne og dagsrytmen. Skape et inkluderende fellesskap.\n\nAktiviteter:\nTilvenningssamtaler, bli-kjent-leker, utetid i nærmiljøet.',
          iconType: 'sun',
          colSpan: 1,
          colorScheme: 'default'
        },
        {
          id: 'b8_2',
          title: 'September',
          content: monthPlans?.['September']?.theme
            ? `${monthPlans['September'].theme}\n\nMål:\n${monthPlans['September'].goals || 'Sosial kompetanse og grenser.'}\n\nAktiviteter:\n${monthPlans['September'].activities || 'Bevegelsesløyper og vennskap.'}`
            : 'Vennskap, meg og min kropp\n\nMål:\nStyrke barnas sosiale kompetanse og bevissthet rundt egen kropp og grenser. Fremme empati og samhandling.\n\nAktiviteter:\nMaling av selvportrett, bevegelsesløyper i skogen, samling om vennskap.',
          iconType: 'heart',
          colSpan: 1,
          colorScheme: 'default'
        },
        {
          id: 'b8_3',
          title: 'Oktober',
          content: monthPlans?.['Oktober']?.theme
            ? `${monthPlans['Oktober'].theme}\n\nMål:\n${monthPlans['Oktober'].goals || 'Utforske naturen om høsten.'}\n\nAktiviteter:\n${monthPlans['Oktober'].activities || 'Innsamling av blader og høstsuppe.'}`
            : 'Høstfarger, natur og endring\n\nMål:\nUtforske naturens endringer i høstsesongen. Samle blader, sopp og kongler, og lære om naturmangfold.\n\nAktiviteter:\nInnsamling av blader, grønnsakssuppe på bål, høstfest for barna.',
          iconType: 'trees',
          colSpan: 1,
          colorScheme: 'default'
        },
        {
          id: 'b8_4',
          boxType: 'image',
          title: 'Høststemning',
          content: 'Utforskning og bålkos i naturens egne høstfarger.',
          imageSrc: 'https://images.unsplash.com/photo-1507371341162-763b5e419408?auto=format&fit=crop&w=800&q=80',
          imageTag: 'Høststemning',
          colSpan: 1,
          colorScheme: 'amber'
        }
      ]
    },
    9: {
      layoutVariant: 'full-page-text',
      imageSrc: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Vintertid',
      imageCaption: 'Lys, varme og eventyr i mørketiden',
      boxes: [
        {
          id: 'b9_1',
          title: 'November',
          content: monthPlans?.['November']?.theme
            ? `${monthPlans['November'].theme}\n\nMål:\n${monthPlans['November'].goals || 'Varme og fellesskap i mørketiden.'}\n\nAktiviteter:\n${monthPlans['November'].activities || 'Lyktefest og skyggeteater.'}`
            : 'Mørketid og lysglimt\n\nMål:\nSkape varme og fellesskap i mørketiden. Sanseopplevelser med lys, skygge og refleks.\n\nAktiviteter:\nLyktefest, lommelykttur i skogen, skyggeteater i samling.',
          iconType: 'sun',
          colSpan: 1,
          colorScheme: 'default'
        },
        {
          id: 'b9_2',
          title: 'Desember',
          content: monthPlans?.['Desember']?.theme
            ? `${monthPlans['Desember'].theme}\n\nMål:\n${monthPlans['Desember'].goals || 'Juletradisjoner og omtanke.'}\n\nAktiviteter:\n${monthPlans['Desember'].activities || 'Juleverksted og Lucia.'}`
            : 'Tradisjoner og forventning\n\nMål:\nFormidle juletradisjoner, fellesskap, omtanke og glede. Fokus på nestekjærlighet og hygge.\n\nAktiviteter:\nJuleverksted, pepperkakebaking, luciafeiring, julesamlinger.',
          iconType: 'sparkles',
          colSpan: 1,
          colorScheme: 'rose'
        },
        {
          id: 'b9_3',
          title: 'Januar',
          content: monthPlans?.['Januar']?.theme
            ? `${monthPlans['Januar'].theme}\n\nMål:\n${monthPlans['Januar'].goals || 'Vintergleder og motorikk.'}\n\nAktiviteter:\n${monthPlans['Januar'].activities || 'Aking og snølek.'}`
            : 'Vinter, snø og is\n\nMål:\nOppleve vintergleder, utforske vannets former (is, snø og vann), stimulere grovmotorikk i ulendt snøterreng.\n\nAktiviteter:\nAking, skilek, bygge snølykter og snømenn, fryse farget is.',
          iconType: 'shield',
          colSpan: 1,
          colorScheme: 'indigo'
        },
        {
          id: 'b9_4',
          boxType: 'image',
          title: 'Vintertid',
          content: 'Lys, varme og eventyr i mørketiden med snø og aking.',
          imageSrc: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=80',
          imageTag: 'Vintermoro',
          colSpan: 1,
          colorScheme: 'indigo'
        }
      ]
    },
    10: {
      layoutVariant: 'full-page-text',
      imageSrc: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Vårtegn',
      imageCaption: 'Nysgjerrighet over alt som spirer og gror',
      boxes: [
        {
          id: 'b10_1',
          title: 'Februar',
          content: monthPlans?.['Februar']?.theme
            ? `${monthPlans['Februar'].theme}\n\nMål:\n${monthPlans['Februar'].goals || 'Samefolkets dag og kultur.'}\n\nAktiviteter:\n${monthPlans['Februar'].activities || 'Bål i lavvo og joik.'}`
            : 'Samer, kultur og mangfold\n\nMål:\nKjennskap til samenes nasjonaldag, kultur, reindrift, lavvo og mangfold i samfunnet.\n\nAktiviteter:\nBål i lavvo, samiske eventyr, joik, kaste lasso på gevir.',
          iconType: 'compass',
          colSpan: 1,
          colorScheme: 'default'
        },
        {
          id: 'b10_2',
          title: 'Mars',
          content: monthPlans?.['Mars']?.theme
            ? `${monthPlans['Mars'].theme}\n\nMål:\n${monthPlans['Mars'].goals || 'Vårens oppvåkning og spiring.'}\n\nAktiviteter:\n${monthPlans['Mars'].activities || 'Plante frø og fugletitting.'}`
            : 'Vårtegn og spirer\n\nMål:\nFølge vårens utvikling, så frø, lære om insekter, fuglesang og naturens oppvåkning.\n\nAktiviteter:\nPlante karse og erter i vinduskarmen, fugletitting, vårdugnad.',
          iconType: 'trees',
          colSpan: 1,
          colorScheme: 'emerald'
        },
        {
          id: 'b10_3',
          title: 'April',
          content: monthPlans?.['April']?.theme
            ? `${monthPlans['April'].theme}\n\nMål:\n${monthPlans['April'].goals || 'Påsketradisjoner og nytt liv.'}\n\nAktiviteter:\n${monthPlans['April'].activities || 'Påskeforming og stell av planter.'}`
            : 'Påske, liv og vekst\n\nMål:\nMarkere påskens tradisjoner, feire nytt liv og observere vekst i naturen.\n\nAktiviteter:\nPåskeeggjakt, forming av påskekyllinger, såing og stell av planter.',
          iconType: 'smile',
          colSpan: 1,
          colorScheme: 'amber'
        },
        {
          id: 'b10_4',
          boxType: 'image',
          title: 'Vårtegn',
          content: 'Nysgjerrighet og undring over alt som spirer og gror i vårsolen.',
          imageSrc: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?auto=format&fit=crop&w=800&q=80',
          imageTag: 'Våren spirer',
          colSpan: 1,
          colorScheme: 'emerald'
        }
      ]
    },
    11: {
      layoutVariant: 'full-page-text',
      imageSrc: 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Sommertider',
      imageCaption: 'Vannlek, glede og avskjed med førskolebarna',
      boxes: [
        {
          id: 'b11_1',
          title: 'Mai',
          content: monthPlans?.['Mai']?.theme
            ? `${monthPlans['Mai'].theme}\n\nMål:\n${monthPlans['Mai'].goals || '17. mai og fellesskap.'}\n\nAktiviteter:\n${monthPlans['Mai'].activities || 'Tog, sangleker og turer.'}`
            : 'Fellesskap, 17. mai og friluftsliv\n\nMål:\nDemokratiforståelse, feiring av nasjonaldagen, fellesskapsfølelse og mestring i naturen.\n\nAktiviteter:\n17. mai-tog i barnehagen, øve på barnesanger, lengre turer i skog og mark.',
          iconType: 'award',
          colSpan: 1,
          colorScheme: 'default'
        },
        {
          id: 'b11_2',
          title: 'Juni',
          content: monthPlans?.['Juni']?.theme
            ? `${monthPlans['Juni'].theme}\n\nMål:\n${monthPlans['Juni'].goals || 'Sommerminner og førskoleavslutning.'}\n\nAktiviteter:\n${monthPlans['Juni'].activities || 'Sommerfest og vannlek.'}`
            : 'Sommerglede og avskjed\n\nMål:\nGode sommerminner, feire førskolebarna som skal begynne på skolen, trygg avslutning før ferien.\n\nAktiviteter:\nFørskoleovernatting, sommerfest for foreldre, vannlek med spreder og baljer.',
          iconType: 'heart',
          colSpan: 1,
          colorScheme: 'indigo'
        },
        {
          id: 'b11_3',
          title: 'Juli',
          content: monthPlans?.['Juli']?.theme
            ? `${monthPlans['Juli'].theme}\n\nMål:\n${monthPlans['Juli'].goals || 'Frilek og rolig tempo.'}\n\nAktiviteter:\n${monthPlans['Juli'].activities || 'Piknik og strandturer.'}`
            : 'Sommerdrift og rolig tempo\n\nMål:\nAvslapping, frilek, tilstedeværelse og ro i hverdagen på tvers av avdelinger.\n\nAktiviteter:\nPiknik i gresset, bærplukking, strandturer og frilek i solskinnet.',
          iconType: 'sun',
          colSpan: 1,
          colorScheme: 'amber'
        },
        {
          id: 'b11_4',
          boxType: 'image',
          title: 'Sommertider',
          content: 'Vannlek, latter, varme dager og avskjed med førskolebarna.',
          imageSrc: 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?auto=format&fit=crop&w=800&q=80',
          imageTag: 'Sommerglede',
          colSpan: 1,
          colorScheme: 'rose'
        }
      ]
    },
    12: {
      layoutVariant: 'hero-top',
      imageSrc: 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?auto=format&fit=crop&w=1200&q=80',
      imageTag: 'Vekst & Mestring',
      imageCaption: 'Å vokse trygt, steg for steg i eget tempo.',
      boxes: [
        { id: 'b12_1', title: 'Didaktisk progresjon', content: 'Vi sikrer at alle barn får utfordringer tilpasset sin modning og alder. Våre pedagogiske opplegg justeres systematisk for småbarn og storbarn.', iconType: 'target', colSpan: 1, colorScheme: 'default' },
        { id: 'b12_2', title: 'Trygge overganger', content: overgangerText || 'Vi sikrer trygge og gode overganger ved oppstart, avdelingsbytte og til skole.', iconType: 'compass', colSpan: 1, colorScheme: 'indigo' }
      ]
    },
    13: {
      layoutVariant: 'image-left',
      imageSrc: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Kvalitet & Forankring',
      imageCaption: 'Faglig fundamentert drift og godkjent styringsdokument.',
      boxes: [
        { id: 'b13_1', title: 'Lover og forskrifter', content: bakgrunnsdokumenterText || 'Vår praksis bygger på Lov om barnehager og Rammeplanen (2017).', iconType: 'book', colSpan: 1, colorScheme: 'default' },
        { id: 'b13_2', title: 'SU-Vedtak & Godkjenning', content: `Godkjent dato: ${suVedtakDato || '15. Oktober 2026'}. Behandlet i Samarbeidsutvalget.`, iconType: 'award', colSpan: 1, colorScheme: 'emerald' }
      ]
    }
  });

  // Henter lagret layout fra localStorage eller bruker standard (merger alltid inn manglende sider)
  const [pagesData, setPagesData] = useState<Record<number, EditablePageData>>(() => {
    const defaults = getDefaultPages();
    try {
      const saved = localStorage.getItem('pedportalen_magasin_custom_data_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaults, ...parsed };
      }
      const v2 = localStorage.getItem('pedportalen_magasin_custom_data_v2');
      if (v2) {
        const parsedV2 = JSON.parse(v2);
        return { ...defaults, ...parsedV2 };
      }
    } catch (e) {
      console.warn("Kunne ikke laste lagrede data:", e);
    }
    return defaults;
  });

  // Lagre endringer fortløpende til localStorage
  const savePagesData = (updated: Record<number, EditablePageData>) => {
    setPagesData(updated);
    try {
      localStorage.setItem('pedportalen_magasin_custom_data_v3', JSON.stringify(updated));
    } catch (e) {
      console.warn("Kunne ikke lagre til localStorage:", e);
    }
  };

  // State for modaler / redigering
  const [isGraphicModalOpen, setIsGraphicModalOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<{ pageNum: number; box: EditableBox } | null>(null);
  const [draggedBoxIndex, setDraggedBoxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const boxImageInputRef = useRef<HTMLInputElement>(null);

  // AI-Bildegenerator state
  const [graphicModalTab, setGraphicModalTab] = useState<'ai' | 'gallery' | 'upload'>('ai');
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [aiStyleOption, setAiStyleOption] = useState<'photo' | 'illustration' | 'warm'>('photo');
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [aiGenError, setAiGenError] = useState<string | null>(null);

  // Generer bilde med AI for aktiv side
  const handleGenerateImageForCurrentPage = async (overridePrompt?: string) => {
    const promptToUse = (overridePrompt || aiPromptInput).trim();
    if (!promptToUse) return;
    setIsGeneratingAiImage(true);
    setAiGenError(null);
    try {
      let styledPrompt = promptToUse;
      if (aiStyleOption === 'photo') {
        styledPrompt += ", authentic norwegian kindergarten, warm natural light, playful, joyful children, highly detailed photography";
      } else if (aiStyleOption === 'illustration') {
        styledPrompt += ", warm watercolor children book illustration, soft cozy colors, artistic norwegian barnehage scene";
      } else {
        styledPrompt += ", cinematic warm golden hour, outdoor kindergarten adventures, highly detailed photo";
      }

      const imageUrl = await generateDirectImageBrowser(styledPrompt, "16:9");
      if (imageUrl) {
        updateCurrentPageGraphic({
          imageSrc: imageUrl,
          imageCaption: promptToUse.length > 55 ? promptToUse.slice(0, 52) + '...' : promptToUse,
          imageTag: 'AI-Generert'
        });
      } else {
        setAiGenError("Kunne ikke generere bilde akkurat nå. Vennligst prøv igjen eller velg fra galleriet.");
      }
    } catch (e: any) {
      console.error("AI image gen error:", e);
      setAiGenError("Tilkoblingsfeil under generering. Vennligst prøv igjen.");
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  // Generer bilde med AI for en spesifikk innholdsboks
  const handleGenerateImageForEditingBox = async (promptText: string) => {
    if (!editingBox || !promptText.trim()) return;
    setIsGeneratingAiImage(true);
    try {
      const imageUrl = await generateDirectImageBrowser(
        promptText + ", authentic norwegian kindergarten, joyful kids, realistic warm photography",
        "16:9"
      );
      if (imageUrl) {
        setEditingBox({
          ...editingBox,
          box: {
            ...editingBox.box,
            imageSrc: imageUrl,
            imageTag: 'AI-Bilde'
          }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  // Forhåndsutfyll relevant barnehage-prompt basert på kapittelet som redigeres
  useEffect(() => {
    if (isGraphicModalOpen) {
      const pagePrompts: Record<number, string> = {
        1: "Glade barnehagebarn som leker i naturskjønne omgivelser, solskinn, smil og latter",
        3: "To små barn ler sammen mens de bygger et stort sandslott i solskinnet, barnehage",
        4: "Barn som holder hender i en ring, vennskap, omsorg og fellesskap i barnehagen",
        5: "Lekende læring, barn som utforsker naturen med forstørrelsesglass i skogen",
        6: "Trygt og inkluderende barnehagemiljø, omsorgsfull voksen og glade barn i lek",
        8: "Barn i fargerikt regntøy som leker med høstblader i skogen, barnehage",
        9: "Vinterglede i barnehagen, snø, aking og varme luer i snøbakken",
        10: "Vårdag i barnehagen, grønne spirer, blomster og uteglede",
        11: "Sommerdag i barnehagen, vannlek, latter og piknik på gresset",
        12: "Barn som mestrer en klatreløype, mestring og stolthet i barnehagen",
        13: "Kvalitet i barnehagen, trygge pedagoger og bøker i samlingsstund"
      };
      if (pagePrompts[currentPage]) {
        setAiPromptInput(pagePrompts[currentPage]);
      }
    }
  }, [isGraphicModalOpen, currentPage]);

  // Håndter opplasting av eget bilde
  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          updateCurrentPageGraphic({ imageSrc: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Håndter opplasting av bilde direkte til en redigert boks
  const handleBoxImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingBox) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setEditingBox({
            ...editingBox,
            box: { ...editingBox.box, imageSrc: reader.result }
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Hjelpefunksjon for å oppdatere aktiv sides grafikk
  const updateCurrentPageGraphic = (updates: Partial<EditablePageData>) => {
    const curr = pagesData[currentPage] || getDefaultPages()[currentPage];
    if (!curr) return;
    const updated = {
      ...pagesData,
      [currentPage]: {
        ...curr,
        ...updates
      }
    };
    savePagesData(updated);
  };

  // Flytt boks opp / foran
  const handleMoveBox = (pageNum: number, boxIndex: number, direction: 'up' | 'down') => {
    const page = pagesData[pageNum];
    if (!page) return;
    const newBoxes = [...page.boxes];
    const targetIndex = direction === 'up' ? boxIndex - 1 : boxIndex + 1;
    if (targetIndex < 0 || targetIndex >= newBoxes.length) return;
    
    // Bytte plass
    const temp = newBoxes[boxIndex];
    newBoxes[boxIndex] = newBoxes[targetIndex];
    newBoxes[targetIndex] = temp;

    savePagesData({
      ...pagesData,
      [pageNum]: { ...page, boxes: newBoxes }
    });
  };

  // Dra-og-slipp (Drag and drop) boks-sortering
  const handleDropBox = (pageNum: number, dropIndex: number) => {
    if (draggedBoxIndex === null || draggedBoxIndex === dropIndex) return;
    const page = pagesData[pageNum];
    if (!page) return;
    const newBoxes = [...page.boxes];
    const [movedItem] = newBoxes.splice(draggedBoxIndex, 1);
    newBoxes.splice(dropIndex, 0, movedItem);
    savePagesData({
      ...pagesData,
      [pageNum]: { ...page, boxes: newBoxes }
    });
    setDraggedBoxIndex(null);
  };

  // Endre størrelse på boks (kolonne-bredde: 50% vs 100%)
  const handleToggleBoxColSpan = (pageNum: number, boxId: string) => {
    const page = pagesData[pageNum];
    if (!page) return;
    const newBoxes = page.boxes.map(b => {
      if (b.id === boxId) {
        return { ...b, colSpan: (b.colSpan === 2 ? 1 : 2) as 1 | 2 };
      }
      return b;
    });
    savePagesData({
      ...pagesData,
      [pageNum]: { ...page, boxes: newBoxes }
    });
  };

  // Endre høyde / visuell størrelse på boks
  const handleCycleBoxHeight = (pageNum: number, boxId: string) => {
    const page = pagesData[pageNum];
    if (!page) return;
    const newBoxes = page.boxes.map(b => {
      if (b.id === boxId) {
        const nextHeight: 'compact' | 'normal' | 'tall' = 
          b.heightSize === 'compact' ? 'normal' :
          b.heightSize === 'normal' ? 'tall' : 'compact';
        return { ...b, heightSize: nextHeight };
      }
      return b;
    });
    savePagesData({
      ...pagesData,
      [pageNum]: { ...page, boxes: newBoxes }
    });
  };

  // Slett boks
  const handleDeleteBox = (pageNum: number, boxId: string) => {
    const page = pagesData[pageNum];
    if (!page) return;
    if (page.boxes.length <= 1) {
      alert("En side må ha minst én boks.");
      return;
    }
    const newBoxes = page.boxes.filter(b => b.id !== boxId);
    savePagesData({
      ...pagesData,
      [pageNum]: { ...page, boxes: newBoxes }
    });
  };

  // Legg til spesifikk type boks
  const handleAddNewBoxWithType = (pageNum: number, type: 'text' | 'image' | 'quote' | 'stat') => {
    const page = pagesData[pageNum];
    if (!page) return;
    let newBox: EditableBox;
    if (type === 'image') {
      newBox = {
        id: `custom_img_${Date.now()}`,
        boxType: 'image',
        title: 'Bilde & Stemning',
        content: 'Bilde fra barnehagehverdagen med en kort refleksjon.',
        imageSrc: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        imageTag: 'Aktivitetsbilde',
        colSpan: 1,
        heightSize: 'normal',
        colorScheme: 'default'
      };
    } else if (type === 'quote') {
      newBox = {
        id: `custom_quote_${Date.now()}`,
        boxType: 'quote',
        title: 'Sitat & Visjon',
        content: '«Barn skal oppleve at det er meningsfullt og gøy å være i barnehagen hver eneste dag!»',
        author: 'Rammeplanen for barnehagen',
        iconType: 'sparkles',
        colSpan: 2,
        heightSize: 'normal',
        colorScheme: 'indigo'
      };
    } else if (type === 'stat') {
      newBox = {
        id: `custom_stat_${Date.now()}`,
        boxType: 'stat',
        title: 'Nøkkeltall',
        content: 'Målrettet satsing på språkstimulering og trygge relasjoner i hverdagen.',
        statNumber: '100%',
        iconType: 'target',
        colSpan: 1,
        heightSize: 'compact',
        colorScheme: 'emerald'
      };
    } else {
      newBox = {
        id: `custom_text_${Date.now()}`,
        boxType: 'text',
        title: 'Nytt satsingsområde',
        content: 'Skriv inn innhold og pedagogisk forankring her...',
        iconType: 'sparkles',
        colSpan: 1,
        heightSize: 'normal',
        colorScheme: 'default'
      };
    }
    savePagesData({
      ...pagesData,
      [pageNum]: { ...page, boxes: [...page.boxes, newBox] }
    });
    setEditingBox({ pageNum, box: newBox });
  };

  // Standard legg til boks
  const handleAddNewBox = (pageNum: number) => {
    handleAddNewBoxWithType(pageNum, 'text');
  };

  // Lagre redigert boks
  const handleSaveEditedBox = () => {
    if (!editingBox) return;
    const { pageNum, box } = editingBox;
    const page = pagesData[pageNum];
    if (!page) return;
    const newBoxes = page.boxes.map(b => b.id === box.id ? box : b);
    savePagesData({
      ...pagesData,
      [pageNum]: { ...page, boxes: newBoxes }
    });
    setEditingBox(null);
  };

  // Nullstill aktiv side til standard
  const handleResetCurrentPage = () => {
    const defaults = getDefaultPages();
    if (defaults[currentPage]) {
      savePagesData({
        ...pagesData,
        [currentPage]: defaults[currentPage]
      });
    }
  };

  const handleDownloadPdf = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      alert("PDF-generering fullført! (Dette er en simulering i AI Studio)");
    }, 2000);
  };

  // Hjelpekomponent for månedskortene
  const MonthCard = ({ m }: { m: string }) => (
    <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-l-4 ${currentTheme.accentBorder} flex flex-col h-full`}>
      <h4 className={`text-sm font-bold ${currentTheme.primaryText} uppercase tracking-wider mb-2`}>{m}</h4>
      <p className="font-bold text-sm text-slate-800 mb-2">{monthPlans?.[m]?.theme || "Tema ikke definert"}</p>
      <p className="text-xs text-slate-600 mb-4 font-medium leading-relaxed">{monthPlans?.[m]?.goals || "Mål og rammeplan forankring kommer her."}</p>
      <p className="text-xs text-slate-500 mt-auto border-t border-slate-100 pt-3 leading-relaxed">{monthPlans?.[m]?.activities || "Aktiviteter planlegges."}</p>
    </div>
  );

  // Hjelpefunksjon for å rendere en dynamisk, redigerbar boks
  const renderEditableBox = (pageNum: number, box: EditableBox, index: number) => {
    const colClass = box.colSpan === 2 ? 'col-span-2' : 'col-span-1';
    const bgClass = 
      box.colorScheme === 'indigo' ? 'bg-indigo-50/70 border-indigo-200' :
      box.colorScheme === 'emerald' ? 'bg-emerald-50/70 border-emerald-200' :
      box.colorScheme === 'rose' ? 'bg-rose-50/70 border-rose-200' :
      box.colorScheme === 'amber' ? 'bg-amber-50/70 border-amber-200' :
      box.colorScheme === 'slate' ? 'bg-slate-100/80 border-slate-300' :
      'bg-slate-50 border-slate-200';

    const paddingClass = 
      box.heightSize === 'compact' ? 'p-4' :
      box.heightSize === 'tall' ? 'p-7' : 'p-5';

    const heightLabel = 
      box.heightSize === 'compact' ? 'Kompakt' :
      box.heightSize === 'tall' ? 'Romslig' : 'Normal';

    const isDraggingThis = draggedBoxIndex === index;

    return (
      <div 
        key={box.id} 
        draggable={isEditMode}
        onDragStart={(e) => {
          if (!isEditMode) return;
          e.dataTransfer.setData('text/plain', String(index));
          setDraggedBoxIndex(index);
        }}
        onDragOver={(e) => {
          if (isEditMode) e.preventDefault();
        }}
        onDrop={(e) => {
          if (isEditMode) {
            e.preventDefault();
            handleDropBox(pageNum, index);
          }
        }}
        className={`${colClass} ${bgClass} ${paddingClass} rounded-2xl border shadow-sm flex flex-col relative group transition-all duration-200 ${
          isDraggingThis ? 'opacity-40 border-dashed border-indigo-500 scale-95' : ''
        } ${isEditMode ? 'hover:border-indigo-400 cursor-grab active:cursor-grabbing' : ''}`}
      >
        {/* Redigeringsknapper som vises når Edit Mode er på */}
        {isEditMode && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/95 border border-slate-300 rounded-lg p-1 shadow-md z-10 backdrop-blur-xs">
            {/* Dra-håndtak */}
            <span 
              className="p-1 text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing"
              title="Dra og slipp for å flytte denne boksen"
            >
              <GripVertical size={13} />
            </span>

            {/* Flytt foran / bak */}
            <button 
              onClick={(e) => { e.stopPropagation(); handleMoveBox(pageNum, index, 'up'); }}
              disabled={index === 0}
              className="p-1 text-slate-500 hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
              title="Flytt foran / opp"
            >
              <ArrowUp size={13} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleMoveBox(pageNum, index, 'down'); }}
              disabled={index === (pagesData[pageNum]?.boxes?.length || 1) - 1}
              className="p-1 text-slate-500 hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
              title="Flytt bak / ned"
            >
              <ArrowDown size={13} />
            </button>

            {/* Endre bredde (50% / 100%) */}
            <button 
              onClick={(e) => { e.stopPropagation(); handleToggleBoxColSpan(pageNum, box.id); }}
              className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded border border-slate-200 cursor-pointer flex items-center gap-1"
              title="Endre bredde (50% eller 100%)"
            >
              <Columns size={11} />
              <span>{box.colSpan === 2 ? '100%' : '50%'}</span>
            </button>

            {/* Endre høyde (Kompakt / Normal / Romslig) */}
            <button 
              onClick={(e) => { e.stopPropagation(); handleCycleBoxHeight(pageNum, box.id); }}
              className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded border border-slate-200 cursor-pointer flex items-center gap-1"
              title={`Endre høyde (Nåværende: ${heightLabel})`}
            >
              <Maximize2 size={11} />
              <span>{heightLabel}</span>
            </button>

            {/* Rediger innhold & bilde */}
            <button 
              onClick={(e) => { e.stopPropagation(); setEditingBox({ pageNum, box }); }}
              className="p-1 text-slate-500 hover:text-amber-600 cursor-pointer"
              title="Rediger innhold, grafikk eller farge"
            >
              <Edit3 size={13} />
            </button>

            {/* Slett */}
            <button 
              onClick={(e) => { e.stopPropagation(); handleDeleteBox(pageNum, box.id); }}
              className="p-1 text-slate-500 hover:text-rose-600 cursor-pointer"
              title="Slett denne boksen"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}

        {/* 1. VISNING: BILDE- OG GRAFIKKBOKS */}
        {box.boxType === 'image' && (
          <div className="flex flex-col h-full gap-2">
            <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 aspect-[16/10] group/img">
              <img 
                src={box.imageSrc || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80'} 
                alt={box.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
              />
              {box.imageTag && (
                <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded backdrop-blur-xs">
                  {box.imageTag}
                </div>
              )}
              {isEditMode && (
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingBox({ pageNum, box }); }}
                  className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-slate-900 text-[10px] font-bold px-2 py-1 rounded shadow cursor-pointer flex items-center gap-1"
                >
                  <Image size={11} />
                  <span>Bytt bilde</span>
                </button>
              )}
            </div>
            {box.title && (
              <h4 className={`font-bold text-xs ${currentTheme.primaryText} mt-1`}>
                {box.title}
              </h4>
            )}
            {box.content && (
              <p className="text-[11px] text-slate-600 leading-snug">
                {box.content}
              </p>
            )}
          </div>
        )}

        {/* 2. VISNING: SITATBOKS */}
        {box.boxType === 'quote' && (
          <div className="flex flex-col h-full justify-between py-1">
            <div className="flex items-start gap-2 mb-2">
              <Quote className={`${currentTheme.accentText} shrink-0 opacity-70`} size={24} />
              <p className={`font-serif italic text-sm md:text-base ${currentTheme.primaryText} font-medium leading-relaxed`}>
                {box.content}
              </p>
            </div>
            {(box.author || box.title) && (
              <div className="pt-2 border-t border-slate-200/50 flex justify-between items-center text-[11px] text-slate-500 font-medium">
                <span>{box.title}</span>
                <span className="font-semibold text-slate-700">{box.author}</span>
              </div>
            )}
          </div>
        )}

        {/* 3. VISNING: NØKKELTALL / STATISTIKKBOKS */}
        {box.boxType === 'stat' && (
          <div className="flex flex-col h-full justify-center text-center p-2">
            <span className={`text-3xl md:text-4xl font-extrabold ${currentTheme.accentText} tracking-tight mb-1`}>
              {box.statNumber || '100%'}
            </span>
            <h4 className={`font-bold text-xs uppercase tracking-wider ${currentTheme.primaryText} mb-1.5`}>
              {box.title}
            </h4>
            <p className="text-[11px] text-slate-600 leading-snug max-w-xs mx-auto">
              {box.content}
            </p>
          </div>
        )}

        {/* 4. VISNING: STANDARD TEKSTBOKS */}
        {(!box.boxType || box.boxType === 'text') && (
          <>
            <h4 className={`font-bold text-sm ${currentTheme.primaryText} mb-2 flex items-center gap-2`}>
              {getIconComponent(box.iconType, `w-4 h-4 ${currentTheme.accentText}`)}
              <span>{box.title}</span>
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap flex-1">
              {box.content}
            </p>
          </>
        )}

        {/* Bunn-info i redigeringsmodus */}
        {isEditMode && (
          <div className="mt-3 pt-2 border-t border-slate-200/60 flex justify-between items-center text-[10px] text-slate-400">
            <span>Bredde: {box.colSpan === 2 ? 'Full (100%)' : 'Halv (50%)'} • {heightLabel}</span>
            <span 
              className="text-indigo-600 font-semibold cursor-pointer hover:underline" 
              onClick={(e) => { e.stopPropagation(); setEditingBox({ pageNum, box }); }}
            >
              Klikk for å redigere
            </span>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  const activePageData = pagesData[currentPage];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col justify-between overflow-hidden animate-fade-in font-sans">
      
      {/* ========================================================================= */}
      {/* TOPP-MENY */}
      {/* ========================================================================= */}
      <div className="h-16 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between px-6 text-white shrink-0">
        
        {/* Venstre: Tittel og Temavelger */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-3">
            <BookOpen className={currentTheme.accentText} size={20} />
            <span className="font-bold tracking-wider uppercase text-sm hidden md:inline">Magasinvisning</span>
          </div>

          <div className="flex items-center bg-slate-800/50 rounded-lg p-1 border border-slate-700">
            {Object.values(THEMES).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveThemeId(t.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  activeThemeId === t.id ? `${t.accentBg} text-white shadow-sm font-bold` : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {t.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Høyre: Redigeringsmodus-bryter, PDF og Navigasjon */}
        <div className="flex items-center gap-3">
          
          {/* NY REDIGERINGSBRYTER */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer ${
              isEditMode 
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-300' 
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
            }`}
            title="Slå av eller på verktøy for å flytte bokser, endre størrelse og bytte bilder"
          >
            {isEditMode ? <Eye size={14} /> : <Sliders size={14} />}
            <span>{isEditMode ? 'Forhåndsvisning' : 'Tilpass layout & grafikk'}</span>
          </button>

          {/* Last ned PDF */}
          <button 
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${currentTheme.accentBg} hover:opacity-90 disabled:opacity-50 text-white cursor-pointer`}
          >
            {isDownloading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            <span className="hidden sm:inline">{isDownloading ? 'Bygger PDF...' : 'Last ned PDF'}</span>
          </button>

          {/* Sideteller og blaing */}
          <div className="flex items-center gap-1.5 bg-slate-800/60 rounded-lg p-1 border border-slate-700">
            <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-1 hover:bg-slate-700 rounded disabled:opacity-30 cursor-pointer"><ChevronLeft size={18} /></button>
            <span className="text-xs font-medium px-2 min-w-16 text-center">Side {currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="p-1 hover:bg-slate-700 rounded disabled:opacity-30 cursor-pointer"><ChevronRight size={18} /></button>
          </div>

          <button onClick={onClose} className="p-2 hover:bg-rose-500/20 hover:text-rose-400 rounded-full transition-colors ml-1 cursor-pointer"><X size={20} /></button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REDIGERINGSPANEL FOR AKTIV SIDE (Vises kun når isEditMode er aktiv) */}
      {/* ========================================================================= */}
      {isEditMode && currentPage === 1 && (
        <div className="bg-slate-800 border-b border-slate-700 px-6 py-2.5 flex items-center justify-between text-xs text-white shrink-0 gap-4 flex-wrap animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Forside (Side 1):</span>
            <span className="text-slate-300 text-xs">Trykk på «Bytt forsidebilde» for å laste opp eget foto eller velge fra bildegalleriet</span>
          </div>
          <button
            onClick={() => setIsGraphicModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer text-xs shadow-xs"
          >
            <Image size={13} className="text-amber-400" />
            <span>Bytt forsidebilde</span>
          </button>
        </div>
      )}

      {isEditMode && currentPage >= 3 && currentPage <= 13 && (
        <div className="bg-slate-800 border-b border-slate-700 px-6 py-2.5 flex items-center justify-between text-xs text-white shrink-0 gap-4 flex-wrap animate-fade-in">
          
          {/* Venstre: Layout-variant velger */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Layout for side {currentPage}:</span>
            <div className="flex items-center bg-slate-900/80 rounded-lg p-1 border border-slate-700">
              {[
                { id: 'hero-top', label: 'Toppbilde' },
                { id: 'image-left', label: 'Bilde Venstre' },
                { id: 'image-right', label: 'Bilde Høyre' },
                { id: 'text-focus', label: 'Bunnbilde' },
                { id: 'full-page-text', label: 'Ren tekst' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => updateCurrentPageGraphic({ layoutVariant: opt.id as any })}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                    activePageData?.layoutVariant === opt.id 
                      ? `${currentTheme.accentBg} text-white font-bold shadow-xs` 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Høyre: Handlinger for aktiv side */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsGraphicModalOpen(true)}
              className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold flex items-center gap-1.5 text-slate-200 transition cursor-pointer text-[11px]"
              title="Bytt kapittelbilde / hovedgrafikk for denne siden"
            >
              <Image size={13} className="text-amber-400" />
              <span>Bytt sidegrafikk</span>
            </button>

            {/* Gruppe for å legge til ulike typer bokser */}
            <div className="flex items-center bg-slate-900/80 rounded-lg p-0.5 border border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold px-2 hidden lg:inline">+ Legg til:</span>
              <button
                onClick={() => handleAddNewBoxWithType(currentPage, 'text')}
                className="px-2 py-1 text-[11px] font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded flex items-center gap-1 cursor-pointer"
                title="Legg til ny tekstboks"
              >
                <Sparkles size={11} className="text-indigo-400" />
                <span>Tekst</span>
              </button>
              <button
                onClick={() => handleAddNewBoxWithType(currentPage, 'image')}
                className="px-2 py-1 text-[11px] font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded flex items-center gap-1 cursor-pointer"
                title="Legg til en egen grafikk/bilde-boks i innholdet"
              >
                <Image size={11} className="text-emerald-400" />
                <span>Grafikk/Bilde</span>
              </button>
              <button
                onClick={() => handleAddNewBoxWithType(currentPage, 'quote')}
                className="px-2 py-1 text-[11px] font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded flex items-center gap-1 cursor-pointer"
                title="Legg til et sitatkort"
              >
                <Quote size={11} className="text-amber-400" />
                <span>Sitat</span>
              </button>
              <button
                onClick={() => handleAddNewBoxWithType(currentPage, 'stat')}
                className="px-2 py-1 text-[11px] font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded flex items-center gap-1 cursor-pointer"
                title="Legg til et nøkkeltallkort"
              >
                <Hash size={11} className="text-rose-400" />
                <span>Nøkkeltall</span>
              </button>
            </div>

            <button
              onClick={handleResetCurrentPage}
              className="px-2.5 py-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg flex items-center gap-1 transition cursor-pointer text-[11px]"
              title="Tilbakestill denne siden til barnehagens standardtekster"
            >
              <RotateCcw size={12} />
              <span>Nullstill side</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAGASIN-SIDER */}
      {/* ========================================================================= */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start bg-slate-900 scrollbar-thin">
        <div className="max-w-[210mm] w-full shadow-2xl transition-all duration-300">
          
          {/* SIDE 1: FORSIDE */}
          <div className={`bg-white w-full aspect-[1/1.414] rounded-sm relative overflow-hidden flex flex-col ${currentPage !== 1 ? 'hidden' : 'block'}`}>
            <img 
              src={pagesData[1]?.imageSrc || "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=1200&q=80"} 
              alt="Forside" 
              className="absolute inset-0 w-full h-full object-cover" 
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${currentTheme.gradient} via-${currentTheme.gradient}/60 to-transparent`}></div>
            {isEditMode && (
              <button
                onClick={() => setIsGraphicModalOpen(true)}
                className="absolute top-8 right-8 z-20 bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-2 backdrop-blur-sm cursor-pointer transition"
              >
                <Image size={14} className="text-amber-400" />
                <span>Bytt forsidebilde</span>
              </button>
            )}
            <div className="relative z-10 flex flex-col h-full p-16 justify-between">
              <div className="text-white/80 font-bold tracking-widest uppercase text-sm border-b border-white/20 pb-4 inline-block">
                {pagesData[1]?.imageTag || "Årsplan 2026/2027"}
              </div>
              <div className="mt-auto mb-16">
                <h1 className="text-6xl font-extrabold text-white tracking-tight mb-4 leading-tight drop-shadow-lg">
                  {barnehageNavn || "Eventyrskogen Barnehage"}
                </h1>
                <p className={`text-xl ${currentTheme.accentText} brightness-150 font-medium max-w-xl leading-relaxed`}>
                  {pagesData[1]?.imageCaption || "Styringsdokument for pedagogisk virksomhet"}
                </p>
              </div>
            </div>
          </div>

          {/* SIDE 2: INNHOLDSFORTEGNELSE */}
          <div className={`bg-white w-full aspect-[1/1.414] rounded-sm p-16 flex flex-col ${currentPage !== 2 ? 'hidden' : 'block'}`}>
            <h3 className={`text-xs font-bold ${currentTheme.accentText} uppercase tracking-widest mb-2`}>Oversikt</h3>
            <h1 className={`text-4xl font-extrabold ${currentTheme.primaryText} mb-8 border-b border-slate-200 pb-6`}>Innholdsfortegnelse</h1>
            <div className="grid grid-cols-2 gap-x-16 gap-y-2 mt-4 content-start">
              {[
                { title: 'Velkommen & Visjon', page: '03' }, { title: 'Verdigrunnlag & Samarbeid', page: '04' },
                { title: 'Vår pedagogiske plattform', page: '05' }, { title: 'Psykososialt miljø & Lek', page: '06' },
                { title: 'Fagområdene', page: '07' }, { title: 'Årshjul: Høst', page: '08' },
                { title: 'Årshjul: Vinter', page: '09' }, { title: 'Årshjul: Vår', page: '10' },
                { title: 'Årshjul: Sommer', page: '11' }, { title: 'Progresjon & Overganger', page: '12' },
                { title: 'Bakgrunnsdokumenter & SU', page: '13' }
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center border-b border-slate-100 py-3 group cursor-pointer" onClick={() => setCurrentPage(i + 3)}>
                  <span className={`text-sm text-slate-700 font-medium group-hover:${currentTheme.accentText} transition-colors`}>{item.title}</span>
                  <span className={`text-sm text-slate-400 font-bold group-hover:${currentTheme.accentText} transition-colors`}>Side {item.page}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SIDE 3: OM BARNEHAGEN (Kapittel 1) */}
          <div className={currentPage !== 3 ? 'hidden' : 'block'}>
            <MagazineChapterLayout 
              chapterNumber="Kapittel 1" title="Velkommen til oss" subtitle="Vår identitet og våre hovedmål" 
              layoutVariant={pagesData[3]?.layoutVariant || 'hero-top'} 
              theme={currentTheme} 
              imageSrc={pagesData[3]?.imageSrc} 
              imageTag={pagesData[3]?.imageTag} 
              imageCaption={pagesData[3]?.imageCaption} 
              pageNumber="03"
              isEditMode={isEditMode}
              onOpenGraphicEditor={() => setIsGraphicModalOpen(true)}
            >
              {(pagesData[3]?.boxes || []).map((box, idx) => renderEditableBox(3, box, idx))}
            </MagazineChapterLayout>
          </div>

          {/* SIDE 4: VERDIGRUNNLAG (Kapittel 2) */}
          <div className={currentPage !== 4 ? 'hidden' : 'block'}>
            <MagazineChapterLayout 
              chapterNumber="Kapittel 2" title="Verdigrunnlag" subtitle="Inkludering, mangfold og barns medvirkning" 
              layoutVariant={pagesData[4]?.layoutVariant || 'image-left'} 
              theme={currentTheme} 
              imageSrc={pagesData[4]?.imageSrc} 
              imageTag={pagesData[4]?.imageTag} 
              imageCaption={pagesData[4]?.imageCaption} 
              pageNumber="04"
              isEditMode={isEditMode}
              onOpenGraphicEditor={() => setIsGraphicModalOpen(true)}
            >
              {(pagesData[4]?.boxes || []).map((box, idx) => renderEditableBox(4, box, idx))}
            </MagazineChapterLayout>
          </div>

          {/* SIDE 5: VÅR PEDAGOGIKK (Kapittel 3) */}
          <div className={currentPage !== 5 ? 'hidden' : 'block'}>
            <MagazineChapterLayout 
              chapterNumber="Kapittel 3" title="Vår pedagogikk" subtitle="Omsorg, lek, danning og læring" 
              layoutVariant={pagesData[5]?.layoutVariant || 'image-right'} 
              theme={currentTheme} 
              imageSrc={pagesData[5]?.imageSrc} 
              imageTag={pagesData[5]?.imageTag} 
              imageCaption={pagesData[5]?.imageCaption} 
              pageNumber="05"
              isEditMode={isEditMode}
              onOpenGraphicEditor={() => setIsGraphicModalOpen(true)}
            >
              {(pagesData[5]?.boxes || []).map((box, idx) => renderEditableBox(5, box, idx))}
            </MagazineChapterLayout>
          </div>

          {/* SIDE 6: MILJØ OG LEK (Kapittel 4) */}
          <div className={currentPage !== 6 ? 'hidden' : 'block'}>
            <MagazineChapterLayout 
              chapterNumber="Kapittel 4" title="Psykososialt miljø & lek" subtitle="Trygt barnehagemiljø (Kap. 8)" 
              layoutVariant={pagesData[6]?.layoutVariant || 'image-left'} 
              theme={currentTheme} 
              imageSrc={pagesData[6]?.imageSrc} 
              imageTag={pagesData[6]?.imageTag} 
              imageCaption={pagesData[6]?.imageCaption} 
              pageNumber="06"
              isEditMode={isEditMode}
              onOpenGraphicEditor={() => setIsGraphicModalOpen(true)}
            >
              {(pagesData[6]?.boxes || []).map((box, idx) => renderEditableBox(6, box, idx))}
            </MagazineChapterLayout>
          </div>

          {/* SIDE 7: FAGOMRÅDENE (Kapittel 5) */}
          <div className={currentPage !== 7 ? 'hidden' : 'block'}>
            <MagazineChapterLayout 
              chapterNumber="Kapittel 5" title="Fagområdene" subtitle="Konkretisering av rammeplanen" 
              layoutVariant={pagesData[7]?.layoutVariant || 'image-right'} 
              theme={currentTheme} 
              imageSrc={pagesData[7]?.imageSrc} 
              imageTag={pagesData[7]?.imageTag} 
              imageCaption={pagesData[7]?.imageCaption} 
              pageNumber="07"
              isEditMode={isEditMode}
              onOpenGraphicEditor={() => setIsGraphicModalOpen(true)}
            >
              {(pagesData[7]?.boxes || []).map((box, idx) => renderEditableBox(7, box, idx))}
            </MagazineChapterLayout>
          </div>

          {/* SIDE 8: HØST */}
          <div className={currentPage !== 8 ? 'hidden' : 'block'}>
            <MagazineChapterLayout 
              chapterNumber="Kapittel 6 (Del 1)" title="Pedagogisk Årshjul" subtitle="Høst: Sensommer og skolestart"
              layoutVariant={pagesData[8]?.layoutVariant || 'full-page-text'} 
              theme={currentTheme} 
              imageSrc={pagesData[8]?.imageSrc} 
              imageTag={pagesData[8]?.imageTag} 
              imageCaption={pagesData[8]?.imageCaption} 
              pageNumber="08"
              isEditMode={isEditMode}
              onOpenGraphicEditor={() => setIsGraphicModalOpen(true)}
            >
              {(pagesData[8]?.boxes || []).map((box, idx) => renderEditableBox(8, box, idx))}
            </MagazineChapterLayout>
          </div>

          {/* SIDE 9: VINTER */}
          <div className={currentPage !== 9 ? 'hidden' : 'block'}>
            <MagazineChapterLayout 
              chapterNumber="Kapittel 6 (Del 2)" title="Pedagogisk Årshjul" subtitle="Vinter: Mørketid og tradisjoner"
              layoutVariant={pagesData[9]?.layoutVariant || 'full-page-text'} 
              theme={currentTheme} 
              imageSrc={pagesData[9]?.imageSrc} 
              imageTag={pagesData[9]?.imageTag} 
              imageCaption={pagesData[9]?.imageCaption} 
              pageNumber="09"
              isEditMode={isEditMode}
              onOpenGraphicEditor={() => setIsGraphicModalOpen(true)}
            >
              {(pagesData[9]?.boxes || []).map((box, idx) => renderEditableBox(9, box, idx))}
            </MagazineChapterLayout>
          </div>

          {/* SIDE 10: VÅR */}
          <div className={currentPage !== 10 ? 'hidden' : 'block'}>
            <MagazineChapterLayout 
              chapterNumber="Kapittel 6 (Del 3)" title="Pedagogisk Årshjul" subtitle="Vår: Livet våkner og spirer"
              layoutVariant={pagesData[10]?.layoutVariant || 'full-page-text'} 
              theme={currentTheme} 
              imageSrc={pagesData[10]?.imageSrc} 
              imageTag={pagesData[10]?.imageTag} 
              imageCaption={pagesData[10]?.imageCaption} 
              pageNumber="10"
              isEditMode={isEditMode}
              onOpenGraphicEditor={() => setIsGraphicModalOpen(true)}
            >
              {(pagesData[10]?.boxes || []).map((box, idx) => renderEditableBox(10, box, idx))}
            </MagazineChapterLayout>
          </div>

          {/* SIDE 11: SOMMER */}
          <div className={currentPage !== 11 ? 'hidden' : 'block'}>
            <MagazineChapterLayout 
              chapterNumber="Kapittel 6 (Del 4)" title="Pedagogisk Årshjul" subtitle="Sommer: Frihet og fellesskap"
              layoutVariant={pagesData[11]?.layoutVariant || 'full-page-text'} 
              theme={currentTheme} 
              imageSrc={pagesData[11]?.imageSrc} 
              imageTag={pagesData[11]?.imageTag} 
              imageCaption={pagesData[11]?.imageCaption} 
              pageNumber="11"
              isEditMode={isEditMode}
              onOpenGraphicEditor={() => setIsGraphicModalOpen(true)}
            >
              {(pagesData[11]?.boxes || []).map((box, idx) => renderEditableBox(11, box, idx))}
            </MagazineChapterLayout>
          </div>

          {/* SIDE 12: PROGRESJON (Kapittel 7) */}
          <div className={currentPage !== 12 ? 'hidden' : 'block'}>
            <MagazineChapterLayout 
              chapterNumber="Kapittel 7" title="Progresjon og overganger" subtitle="Tilpassede utfordringer i barnets løp"
              layoutVariant={pagesData[12]?.layoutVariant || 'hero-top'} 
              theme={currentTheme} 
              imageSrc={pagesData[12]?.imageSrc} 
              imageTag={pagesData[12]?.imageTag} 
              imageCaption={pagesData[12]?.imageCaption} 
              pageNumber="12"
              isEditMode={isEditMode}
              onOpenGraphicEditor={() => setIsGraphicModalOpen(true)}
            >
              {(pagesData[12]?.boxes || []).map((box, idx) => renderEditableBox(12, box, idx))}
            </MagazineChapterLayout>
          </div>

          {/* SIDE 13: DOKUMENTER (Kapittel 8) */}
          <div className={currentPage !== 13 ? 'hidden' : 'block'}>
            <MagazineChapterLayout 
              chapterNumber="Kapittel 8" title="Bakgrunnsdokumenter" subtitle="Lover, forskrifter og SU"
              layoutVariant={pagesData[13]?.layoutVariant || 'image-left'} 
              theme={currentTheme} 
              imageSrc={pagesData[13]?.imageSrc} 
              imageTag={pagesData[13]?.imageTag} 
              imageCaption={pagesData[13]?.imageCaption} 
              pageNumber="13"
              isEditMode={isEditMode}
              onOpenGraphicEditor={() => setIsGraphicModalOpen(true)}
            >
              {(pagesData[13]?.boxes || []).map((box, idx) => renderEditableBox(13, box, idx))}
            </MagazineChapterLayout>
          </div>

        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: GRAFIKK- OG BILDE-REDIGERING FOR AKTIV SIDE */}
      {/* ========================================================================= */}
      {isGraphicModalOpen && activePageData && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-4">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Image className="text-emerald-600" size={20} />
                <h3 className="font-bold text-base text-slate-900">Tilpass bilde & grafikk (Side {currentPage})</h3>
              </div>
              <button onClick={() => setIsGraphicModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* KILDE-VELGER FANER */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setGraphicModalTab('ai')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  graphicModalTab === 'ai'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wand2 size={13} className={graphicModalTab === 'ai' ? 'text-indigo-600' : 'text-slate-400'} />
                <span>Generer med AI</span>
              </button>

              <button
                type="button"
                onClick={() => setGraphicModalTab('gallery')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  graphicModalTab === 'gallery'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Image size={13} className={graphicModalTab === 'gallery' ? 'text-indigo-600' : 'text-slate-400'} />
                <span>Barnehagegalleri</span>
              </button>

              <button
                type="button"
                onClick={() => setGraphicModalTab('upload')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  graphicModalTab === 'upload'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload size={13} className={graphicModalTab === 'upload' ? 'text-indigo-600' : 'text-slate-400'} />
                <span>Last opp / URL</span>
              </button>
            </div>

            {/* FANE 1: AI-BILDEGENERATOR */}
            {graphicModalTab === 'ai' && (
              <div className="space-y-3 p-3.5 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-slate-50 rounded-xl border border-indigo-100 animate-fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Wand2 size={13} className="text-indigo-600" />
                    <span>Beskriv bildet du ønsker å generere:</span>
                  </label>
                  <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-100/70 px-2 py-0.5 rounded-full">
                    Gemini AI
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    rows={2}
                    value={aiPromptInput}
                    onChange={(e) => setAiPromptInput(e.target.value)}
                    placeholder="f.eks. to små barn ler mens de bygger et stort sandslott sammen i solskinnet, barnehage..."
                    className="w-full text-xs p-2.5 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 leading-relaxed"
                  />
                </div>

                {/* Hurtig-forslag (chips) tilpasset barnehagen */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1.5 flex items-center gap-1">
                    <Lightbulb size={11} className="text-amber-500" />
                    <span>Hurtigforslag for barnehagetema:</span>
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto scrollbar-thin">
                    {[
                      '🌲 Gapahuk og bålkos i skogen',
                      '🎨 Maling og forming i atelieret',
                      '📖 Samlingsstund med eventyrbok',
                      '🏰 Sandkasselek og sandslott',
                      '🍂 Leking med høstløv i regntøy',
                      '❄️ Vinterlek og aking i snøbakken',
                      '🍎 Felles måltid og fruktglede',
                      '🤝 Vennskap og samspill i ring'
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          const cleanText = chip.replace(/^[^\s]+\s/, '');
                          setAiPromptInput(`${cleanText}, glade barn, trygg barnehage`);
                        }}
                        className="text-[10px] bg-white hover:bg-indigo-100/80 text-slate-700 hover:text-indigo-900 border border-indigo-100 rounded-md px-2 py-0.5 font-medium transition cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stilvelger og Generer-knapp */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-indigo-100 text-[11px]">
                    {[
                      { id: 'photo', label: '📸 Foto' },
                      { id: 'illustration', label: '🎨 Akvarell' },
                      { id: 'warm', label: '✨ Varm glød' }
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setAiStyleOption(s.id as any)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                          aiStyleOption === s.id
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGenerateImageForCurrentPage()}
                    disabled={isGeneratingAiImage || !aiPromptInput.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {isGeneratingAiImage ? (
                      <>
                        <RefreshCw size={13} className="animate-spin text-amber-300" />
                        <span>Skaper bilde med AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} className="text-amber-300" />
                        <span>Generer bilde</span>
                      </>
                    )}
                  </button>
                </div>

                {aiGenError && (
                  <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2 font-medium">
                    {aiGenError}
                  </p>
                )}
              </div>
            )}

            {/* FANE 2: BARNEHAGEGALLERI */}
            {graphicModalTab === 'gallery' && (
              <div className="space-y-2 animate-fade-in">
                <label className="text-xs font-semibold text-slate-600 block">Velg et stemningsbilde fra barnehage-galleriet:</label>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-100 rounded-xl scrollbar-thin">
                  {CURATED_GALLERY_IMAGES.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => updateCurrentPageGraphic({ imageSrc: img.url, imageTag: img.label })}
                      className="group relative rounded-lg overflow-hidden h-16 border hover:border-indigo-500 transition cursor-pointer"
                    >
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      <span className="absolute inset-0 bg-slate-900/40 group-hover:bg-transparent transition flex items-end p-1.5 text-[9px] text-white font-bold truncate">
                        {img.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* FANE 3: LAST OPP EGET BILDE ELLER LIM INN URL */}
            {graphicModalTab === 'upload' && (
              <div className="space-y-2.5 animate-fade-in">
                <label className="text-xs font-semibold text-slate-600 block">Last opp eget foto fra din datamaskin:</label>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleCustomImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl text-indigo-700 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Velg bildefil fra enheten din (PNG, JPG, WebP)</span>
                </button>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Eller lim inn direkte bilde-URL:</label>
                  <input 
                    type="text" 
                    value={activePageData.imageSrc || ''} 
                    onChange={(e) => updateCurrentPageGraphic({ imageSrc: e.target.value })}
                    placeholder="https://..." 
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>
            )}

            {/* FORHÅNDSVISNING AV VALGT / GENERERT BILDE */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-slate-600">Aktivt bilde for siden</label>
              <div className="h-32 rounded-xl overflow-hidden relative border border-slate-200 bg-slate-900 shadow-inner">
                <img src={activePageData.imageSrc} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded font-bold backdrop-blur-xs">
                  {activePageData.imageTag || 'Valgt bilde'}
                </div>
              </div>
            </div>

            {/* Tekst og tagg */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Bilde-tagg (liten etikett)</label>
                <input 
                  type="text" 
                  value={activePageData.imageTag} 
                  onChange={(e) => updateCurrentPageGraphic({ imageTag: e.target.value })}
                  placeholder="f.eks. Natur & Uteliv" 
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Bildetekst (sitat/undertekst)</label>
                <input 
                  type="text" 
                  value={activePageData.imageCaption} 
                  onChange={(e) => updateCurrentPageGraphic({ imageCaption: e.target.value })}
                  placeholder="Kort beskrivelse..." 
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                onClick={() => setIsGraphicModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Ferdig</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REDIGER BOKS / TEKST / STØRRELSE / GRAFIKK */}
      {/* ========================================================================= */}
      {editingBox && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-4 my-8">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="text-indigo-600" size={18} />
                <h3 className="font-bold text-base text-slate-900">Tilpass innholdsboks (Side {editingBox.pageNum})</h3>
              </div>
              <button onClick={() => setEditingBox(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Velg type boks */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Bokstype</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'text', label: 'Tekst', icon: Sparkles },
                  { id: 'image', label: 'Grafikk / Bilde', icon: Image },
                  { id: 'quote', label: 'Sitat', icon: Quote },
                  { id: 'stat', label: 'Nøkkeltall', icon: Hash }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setEditingBox({
                      ...editingBox,
                      box: { ...editingBox.box, boxType: t.id as any }
                    })}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition cursor-pointer ${
                      (editingBox.box.boxType || 'text') === t.id
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <t.icon size={16} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hvis det er en BILDE-BOKS */}
            {editingBox.box.boxType === 'image' && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <label className="text-xs font-bold text-slate-700 block">Egendefinert bilde / grafikk for denne boksen</label>
                
                {/* Forhåndsvisning */}
                <div className="h-32 rounded-lg overflow-hidden border border-slate-200 relative bg-slate-900">
                  <img 
                    src={editingBox.box.imageSrc || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80'} 
                    alt="Preview" 
                    className="w-full h-full object-cover" 
                  />
                  {editingBox.box.imageTag && (
                    <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] px-2 py-0.5 rounded font-bold">
                      {editingBox.box.imageTag}
                    </div>
                  )}
                </div>

                {/* Last opp fra maskin */}
                <input 
                  type="file" 
                  ref={boxImageInputRef} 
                  onChange={handleBoxImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => boxImageInputRef.current?.click()}
                    className="flex-1 py-1.5 px-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Upload size={13} />
                    <span>Last opp fil</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateImageForEditingBox(editingBox.box.title || editingBox.box.content || 'Barnehagebarn i lek')}
                    disabled={isGeneratingAiImage}
                    className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {isGeneratingAiImage ? (
                      <>
                        <RefreshCw size={13} className="animate-spin text-amber-300" />
                        <span>Genererer...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 size={13} className="text-amber-300" />
                        <span>Generer med AI</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Eller lim inn URL */}
                <div>
                  <input 
                    type="text" 
                    value={editingBox.box.imageSrc || ''} 
                    onChange={(e) => setEditingBox({ ...editingBox, box: { ...editingBox.box, imageSrc: e.target.value } })}
                    placeholder="Eller lim inn bilde-URL (https://...)" 
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Hurtigvalg fra galleri */}
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">Eller velg fra galleriet:</span>
                  <div className="grid grid-cols-4 gap-1.5 max-h-24 overflow-y-auto p-1 scrollbar-thin">
                    {CURATED_GALLERY_IMAGES.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setEditingBox({
                          ...editingBox,
                          box: { ...editingBox.box, imageSrc: img.url, imageTag: img.label }
                        })}
                        className="h-10 rounded border overflow-hidden relative group hover:border-indigo-500 cursor-pointer"
                      >
                        <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Liten bilde-etikett / tagg</label>
                  <input 
                    type="text" 
                    value={editingBox.box.imageTag || ''} 
                    onChange={(e) => setEditingBox({ ...editingBox, box: { ...editingBox.box, imageTag: e.target.value } })}
                    placeholder="f.eks. Uteliv, Kreativitet, Samspill" 
                    className="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Hvis det er NØKKELTALL */}
            {editingBox.box.boxType === 'stat' && (
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Tall / Prosent (f.eks. 100%, 4 dager, 32)</label>
                <input 
                  type="text" 
                  value={editingBox.box.statNumber || ''} 
                  onChange={(e) => setEditingBox({ ...editingBox, box: { ...editingBox.box, statNumber: e.target.value } })}
                  placeholder="f.eks. 100% eller 4 dager" 
                  className="w-full text-base font-extrabold text-indigo-700 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {/* Overskrift */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                {editingBox.box.boxType === 'quote' ? 'Tittel over sitatet' : 'Overskrift'}
              </label>
              <input 
                type="text" 
                value={editingBox.box.title} 
                onChange={(e) => setEditingBox({ ...editingBox, box: { ...editingBox.box, title: e.target.value } })}
                className="w-full text-sm font-semibold p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Innhold / Tekst / Sitat */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                {editingBox.box.boxType === 'quote' ? 'Sitattekst' : editingBox.box.boxType === 'image' ? 'Bildetekst / Refleksjon' : 'Innhold / Beskrivelse'}
              </label>
              <textarea 
                rows={3} 
                value={editingBox.box.content} 
                onChange={(e) => setEditingBox({ ...editingBox, box: { ...editingBox.box, content: e.target.value } })}
                className="w-full text-xs leading-relaxed p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Kilde/Forfatter for sitat */}
            {editingBox.box.boxType === 'quote' && (
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Kilde / Forfatter for sitatet</label>
                <input 
                  type="text" 
                  value={editingBox.box.author || ''} 
                  onChange={(e) => setEditingBox({ ...editingBox, box: { ...editingBox.box, author: e.target.value } })}
                  placeholder="f.eks. Rammeplanen for barnehagen / Barn 4 år" 
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {/* Størrelsesinnstillinger: Bredde og Høyde */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Bredde</label>
                <select
                  value={editingBox.box.colSpan || 1}
                  onChange={(e) => setEditingBox({ ...editingBox, box: { ...editingBox.box, colSpan: Number(e.target.value) as 1 | 2 } })}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  <option value={1}>Halv bredde (50% av arket)</option>
                  <option value={2}>Full bredde (100% av arket)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Høyde / Romslighet</label>
                <select
                  value={editingBox.box.heightSize || 'normal'}
                  onChange={(e) => setEditingBox({ ...editingBox, box: { ...editingBox.box, heightSize: e.target.value as any } })}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  <option value="compact">Kompakt (sparer plass)</option>
                  <option value="normal">Normal (balansert)</option>
                  <option value="tall">Romslig (fremhevet)</option>
                </select>
              </div>
            </div>

            {/* Fargetone og Ikon */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Fargetone</label>
                <select
                  value={editingBox.box.colorScheme || 'default'}
                  onChange={(e) => setEditingBox({ ...editingBox, box: { ...editingBox.box, colorScheme: e.target.value as any } })}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  <option value="default">Klassisk lys grå</option>
                  <option value="indigo">Indigo / Blå tone</option>
                  <option value="emerald">Smaragd / Grønn tone</option>
                  <option value="amber">Varm Rav / Soltone</option>
                  <option value="rose">Rosa / Hjertetone</option>
                  <option value="slate">Kjølig Skifer</option>
                </select>
              </div>

              {(!editingBox.box.boxType || editingBox.box.boxType === 'text' || editingBox.box.boxType === 'stat') && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Ikon</label>
                  <div className="flex flex-wrap gap-1 p-1 bg-slate-50 border border-slate-200 rounded-xl max-h-24 overflow-y-auto">
                    {['sparkles', 'target', 'heart', 'smile', 'users', 'sun', 'compass', 'palette', 'shield', 'building', 'book', 'award', 'trees'].map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setEditingBox({ ...editingBox, box: { ...editingBox.box, iconType: icon } })}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          editingBox.box.iconType === icon 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {getIconComponent(icon, "w-3.5 h-3.5")}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setEditingBox(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Avbryt
              </button>
              <button 
                type="button"
                onClick={handleSaveEditedBox}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Check size={14} />
                <span>Lagre endringer</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
