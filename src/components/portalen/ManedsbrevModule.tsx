import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Calendar, 
  HelpCircle, 
  GraduationCap, 
  FileText, 
  Download, 
  Copy, 
  Check, 
  Share2, 
  Move, 
  RefreshCw, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  Eye, 
  Edit3, 
  Printer, 
  Heart, 
  Smile, 
  Compass, 
  Layers,
  Wand2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Image as ImageIcon,
  Upload,
  Palette,
  Sliders,
  Columns,
  Maximize2,
  Minimize2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sun,
  Trees,
  ShieldCheck,
  Award
} from 'lucide-react';
import { callGoogleAIProxy } from '../../services/geminiService';
import { DailyGlimpse } from './DagensBildeModule';
import { 
  getBarnehageProfil, 
  BarnehageProfilData, 
  PEDAGOGISKE_PLATTFORMER 
} from '../../lib/pedagogiskPlattform';
import PedagogiskPlattformModal from './PedagogiskPlattformModal';

// ==========================================
// 1. TEMATISERING & FARGER (Hentet fra Styrern)
// ==========================================
export const THEMES = {
  skog: { 
    id: 'skog', 
    name: 'Skog & Natur', 
    primaryText: 'text-stone-900', 
    accentText: 'text-emerald-700', 
    accentBg: 'bg-emerald-700', 
    accentBorder: 'border-emerald-600', 
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    cardBg: 'bg-stone-50/80',
    gradient: 'from-stone-950/90 via-stone-900/50 to-transparent',
    themeTint: 'border-emerald-200/60'
  },
  varm: { 
    id: 'varm', 
    name: 'Varm Glød', 
    primaryText: 'text-stone-950', 
    accentText: 'text-amber-700', 
    accentBg: 'bg-amber-600', 
    accentBorder: 'border-amber-500', 
    badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
    cardBg: 'bg-amber-50/40',
    gradient: 'from-stone-950/90 via-stone-900/50 to-transparent',
    themeTint: 'border-amber-200/60'
  },
  navy: { 
    id: 'navy', 
    name: 'Moderne Navy', 
    primaryText: 'text-slate-900', 
    accentText: 'text-teal-700', 
    accentBg: 'bg-teal-700', 
    accentBorder: 'border-teal-600', 
    badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
    cardBg: 'bg-slate-50/80',
    gradient: 'from-[#0f172a]/95 via-[#0f172a]/50 to-transparent',
    themeTint: 'border-teal-200/60'
  },
  hav: { 
    id: 'hav', 
    name: 'Kyst & Hav', 
    primaryText: 'text-slate-900', 
    accentText: 'text-cyan-700', 
    accentBg: 'bg-cyan-700', 
    accentBorder: 'border-cyan-600', 
    badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    cardBg: 'bg-cyan-50/30',
    gradient: 'from-slate-950/90 via-slate-900/50 to-transparent',
    themeTint: 'border-cyan-200/60'
  },
  kreativ: { 
    id: 'kreativ', 
    name: 'Lekende Lilla', 
    primaryText: 'text-purple-950', 
    accentText: 'text-fuchsia-700', 
    accentBg: 'bg-fuchsia-700', 
    accentBorder: 'border-fuchsia-600', 
    badgeBg: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
    cardBg: 'bg-purple-50/40',
    gradient: 'from-purple-950/95 via-purple-950/50 to-transparent',
    themeTint: 'border-purple-200/60'
  },
  nøytral: { 
    id: 'nøytral', 
    name: 'Stilren & Ren', 
    primaryText: 'text-gray-900', 
    accentText: 'text-indigo-700', 
    accentBg: 'bg-indigo-700', 
    accentBorder: 'border-indigo-600', 
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
    cardBg: 'bg-white',
    gradient: 'from-gray-950/90 via-gray-900/50 to-transparent',
    themeTint: 'border-slate-200'
  }
};

// ==========================================
// 2. KURERT BARNEHAGE-GALLERI (Hentet fra Styrern)
// ==========================================
export const CURATED_GALLERY_IMAGES = [
  { label: 'Natur & Gapahuk', url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Vannlek & Bekk', url: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Trehytte & Samarbeid', url: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Huske & Balanselek', url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Såing & Spiring i jord', url: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Lek & Samspill', url: 'https://images.unsplash.com/photo-1587691592099-24045742c181?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Vennskap i ring', url: 'https://images.unsplash.com/photo-1602330925725-d36cfa1e0e85?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Kreativ Forming', url: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Høststemning & Løv', url: 'https://images.unsplash.com/photo-1507371341162-763b5e419408?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Vinterglede & Snø', url: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Vekst & Mestring', url: 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Bøker & Læring', url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80' }
];

export type LayoutVariant = 'image-left' | 'image-right' | 'hero-top' | 'text-focus' | 'full-page-text';

export interface MonthlyLetterGlimpse {
  id: string;
  title: string;
  description: string;
  reflectionQuestion: string; // Spørsmålet foreldrene kan stille ved middagsbordet
  academicAnchor: string;     // Faglig forankring mot Rammeplanen & metode
  imageUrl?: string;
  imageCaption?: string;
  imageTag?: string;
  imagePrivacyProtected?: boolean;
  layoutVariant?: LayoutVariant;
}

export interface MonthlyFocusArea {
  id: string;
  title: string;
  description: string;
  iconName?: string;
}

export interface MonthlyLetterData {
  id: string;
  baseName: string;
  month: string;
  year: string;
  coverTitle: string;
  coverSubtitle: string;
  coverIntro: string;
  coverImage: string;
  coverImageCaption?: string;
  glimpses: MonthlyLetterGlimpse[];
  pedagogicalReviewTitle: string;
  pedagogicalReviewText: string;
  pedagogicalReviewLayoutVariant?: LayoutVariant;
  pedagogicalReviewImage?: string;
  nextMonthName: string;
  nextMonthTitle: string;
  nextMonthIntro: string;
  nextMonthFocusAreas: MonthlyFocusArea[];
  nextMonthClosing: string;
  birthdayKids?: { name: string; age: number; date: string }[];
}

// Bildekomprimering via canvas for å unngå localStorage-kvoteproblemer
const compressImage = (dataUrl: string, maxDim = 900, quality = 0.72): Promise<string> => {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.naturalWidth || 900;
      let height = img.naturalHeight || 600;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

// Gullstandarden - Standard initialdata basert på Friluftsbarnehage (Standard pedagogisk plattform)
const GOLD_STANDARD_MARS_DATA: MonthlyLetterData = {
  id: 'letter-mars-2026',
  baseName: 'Blåbærtua (3-6 år)',
  month: 'Mars',
  year: '2026',
  coverTitle: 'Månedsbrev, mars',
  coverSubtitle: 'Furutoppen Friluftsbarnehage • Blåbærtua',
  coverIntro: 'Sola varmer, snøen smelter og naturen våkner! Mars har vært en utrolig innholdsrik måned i barnehagen, preget av at vi endelig går lysere og varmere tider i møte. Som friluftsbarnehage har vi brukt naturens oppvåkning og det varierte terrenget som vår aller beste lekeplass. Her er hverdagsglimtene fra måneden som har gått, et dypdykk i tålmodighet, og planene våre for april.',
  coverImage: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80',
  coverImageCaption: 'Vårstemning og friluftsliv på uteområdet',
  glimpses: [
    {
      id: 'glimpse-1',
      title: 'Oj, hva har skjedd på uteområdet i dag?',
      description: 'Da vi kom ut i formiddag, var plassen foran gapahuken forvandlet til et gedigent «svømmebasseng»! Bekken hadde gått over sine bredder i vårløsninga og laget en helt ny vannvei tvers over lekeområdet. Dette ble naturligvis møtt med massiv begeistring – barna var raskt på plass med støvler midt i vannet. Det ble plasket, stampet, utforsket og undret. I et slikt herlig kaos skjer de virkelige sanseerfaringene!',
      reflectionQuestion: 'Hvorfor tror dere det plutselig ble så innmari mye vann i bekken akkurat i dag?',
      academicAnchor: 'Som friluftsbarnehage vektlegger vi autentiske opplevelser i barnas naturlige miljø. Dette er direkte forankret i Rammeplanens fagområde Natur, miljø og teknologi samt Kropp, bevegelse, mat og helse. Naturen er uforutsigbar, og byr på sansemotoriske utfordringer som stimulerer barnets helhetlige utvikling.',
      imageUrl: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Natur, miljø og teknologi',
      imageCaption: 'Bekken forvandles til lekearena',
      layoutVariant: 'image-left',
      imagePrivacyProtected: true
    },
    {
      id: 'glimpse-2',
      title: 'Tunge spadetak og demningsbygging',
      description: 'I dag var det endelig mulig å sette en spade i sandkassa igjen etter en lang frostperiode. Fra det første tunge spadetaket til den største demningen var et faktum, så vi et fantastisk samarbeid mellom barna. Det graves dype grøfter, og bøtter og trillebårer fylles til randen med vann. Det bæres, det tømmes strategisk, og når vannet uunngåelig bryter gjennom veggen, må demningen raskt utbedres og utvides.',
      reflectionQuestion: 'Hvorfor måtte vi bære så mange bøtter med vann for å få demningen til å virke?',
      academicAnchor: 'Slike felles problemløsningsprosjekter trener Antall, rom og form (Rammeplanen) i praksis. I tråd med vår pedagogiske plattform skjer læring i sosial samhandling; barna løser utfordringer i fellesskap før de internaliserer kunnskapen og klarer det alene.',
      imageUrl: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Antall, rom og form',
      imageCaption: 'Samarbeid om demningsbygging',
      layoutVariant: 'image-right',
      imagePrivacyProtected: true
    },
    {
      id: 'glimpse-3',
      title: 'Bakover – bakover – bakoveeeeeeer… fart i lufta!',
      description: 'På samarbeidsdissa i skogkanten er det ikke bare fart og kiling i magen som står i fokus – her kreves det hardt arbeid og samarbeid! For å få opp farten må barna snakke sammen, bli enige og kjenne etter rytmen: Hvor langt bak skal vi trekke før vi er klare til å rope «go»? Når timingen endelig sitter, blir det full fart fremover, og følelsen av å nesten fly fyller skogen med latter.',
      reflectionQuestion: 'Er det lettest å få god fart på dissa helt alene, eller når vi samarbeider om å ta sats?',
      academicAnchor: 'Leken fremmer grovmotorikk, balanse og koordinasjon (Kropp, bevegelse, mat og helse). Samtidig trener barna avansert sosial kompetanse, ettersom friluftspedagogikken bygger på at fysisk samspill utvikler evnen til å lytte og samarbeide.',
      imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Kropp, bevegelse og helse',
      imageCaption: 'Samarbeid på den store disse-stokken',
      layoutVariant: 'hero-top',
      imagePrivacyProtected: true
    },
    {
      id: 'glimpse-4',
      title: 'Er våren virkelig på vei nå?',
      description: 'Selv om det fortsatt er litt kjølig i skyggepartiene, begynner vi å ane at våren nærmer seg. I dag har vi hatt hendene dypt i jorda og sådd små tomatfrø. Barna har fylt potter, vannet forsiktig og satt dem lyst til spiring. Nå venter vi spent på hvor lang tid det tar før de første små, grønne spirene titter opp.',
      reflectionQuestion: 'Hva trenger det lille frøet vårt for at det skal klare å vokse seg til en stor plante?',
      academicAnchor: 'Gjennom vår friluftsprofil og fokus på konkret erfaring får barna dypere forståelse for livssykluser, noe som oppfyller Rammeplanens mål for Natur, miljø og teknologi. De voksne fungerer som med-undrere som stimulerer nysgjerrigheten.',
      imageUrl: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Natur, miljø og teknologi',
      imageCaption: 'Frø og spiring i jorda',
      layoutVariant: 'text-focus',
      imagePrivacyProtected: true
    }
  ],
  pedagogicalReviewTitle: 'Naturforståelse, samspill og magien i å undre seg',
  pedagogicalReviewText: `Gjennom hverdagsglimtene fra mars ser vi en tydelig rød tråd: samarbeid, undring og mestring i naturen. Vi har gått fra snødekte skoger til å studere knopper og insekter i vårsola. Barns nysgjerrighet og initiativ har stått i sentrum. Enten det var å bygge den perfekte demningen, justere tyngdepunktet på samarbeidsdissa, eller undre seg over små spirer, har vi sett hvordan naturens udefinerte rammer stimulerer til kreativ problemløsning og språk.

I tråd med barnehagens pedagogiske plattform er vi opptatt av at læring skjer best når barna er aktive med noe som interesserer dem i samspill med andre. Barna har utviklet en sterk fellesskapsfølelse hvor de unner hverandre suksess; de har erfart at når fellesskapet lykkes, lykkes vi alle. Mestringsglede i et inkluderende og aksepterende miljø ute i naturen er en av de viktigste nøklene til god selvfølelse.`,
  nextMonthName: 'April',
  nextMonthTitle: 'PLANER FOR APRIL: Vekst, knopper og insekter',
  nextMonthIntro: 'Etter en velfortjent ferie retter vi blikket for fullt mot våren. I tråd med vår didaktiske plan for april er hovedtemaet naturens oppvåkning, med et spesielt fokus på det yrende livet som begynner å titte frem.',
  nextMonthFocusAreas: [
    {
      id: 'f-1',
      title: 'De første vårblomstene',
      description: 'Målrettet jakt etter hestehov og de første grønne skuddene. Vi introduserer og trener på begreper som «stamme», «blad» og «blomstre».'
    },
    {
      id: 'f-2',
      title: 'Småkrypene våkner (Natur, miljø og teknologi)',
      description: 'Vi tar med forstørrelsesglass og luper på tur for å studere insektene i vårsola, og jobber med empati og omsorg for levende skapninger.'
    },
    {
      id: 'f-3',
      title: 'Fysisk aktivitet og motorikk',
      description: 'Det mildere været gir oss muligheter for enda mer variert utelek. Vi bygger hinderløyper, trener balanse og bruker trær og terreng til kreativ utfoldelse.'
    },
    {
      id: 'f-4',
      title: 'Gjenkalling og refleksjon hver dag',
      description: 'Vi samles til daglig refleksjon rundt fruktmåltidet for å bearbeide dagens opplevelser i fellesskap, noe som styrker barnas hukommelse og språk.'
    }
  ],
  nextMonthClosing: 'Vi gleder oss stort til en aktiv, varm og lærerik april sammen med barna!',
  birthdayKids: []
};

export default function ManedsbrevModule() {
  // Barnehagens pedagogiske plattform (synkronisert på tvers av portalen)
  const [profil, setProfil] = useState<BarnehageProfilData>(getBarnehageProfil);
  const [isPlattformModalOpen, setIsPlattformModalOpen] = useState(false);

  // Visningsmodus & Paginering
  const [viewMode, setViewMode] = useState<'magazine' | 'edit'>('magazine');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeThemeId, setActiveThemeId] = useState<string>('skog');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Synkroniser profilendringer i sanntid
  useEffect(() => {
    const handleProfilUpdate = (e: any) => {
      if (e.detail) {
        setProfil(e.detail);
        setLetterData(prev => ({
          ...prev,
          baseName: e.detail.avdelingsNavn || prev.baseName,
          coverSubtitle: `${e.detail.barnehageNavn} • ${e.detail.avdelingsNavn}`
        }));
      }
    };
    window.addEventListener('pedportalen_profil_updated', handleProfilUpdate);
    return () => window.removeEventListener('pedportalen_profil_updated', handleProfilUpdate);
  }, []);

  // Verktøy-modaler (hentet fra Styrerns Magasin)
  const [isGraphicModalOpen, setIsGraphicModalOpen] = useState(false);
  const [graphicTargetType, setGraphicTargetType] = useState<'cover' | 'glimpse' | 'pedagogical'>('glimpse');
  const [graphicModalTab, setGraphicModalTab] = useState<'ai' | 'gallery' | 'upload'>('gallery');
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [aiStyleOption, setAiStyleOption] = useState<'photo' | 'illustration' | 'warm'>('photo');
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);

  // Månedsbrev-data med localStorage synk
  const [letterData, setLetterData] = useState<MonthlyLetterData>(() => {
    try {
      const saved = localStorage.getItem('pedledern_monthly_letter_data_v2');
      if (saved) return JSON.parse(saved);
      const savedV1 = localStorage.getItem('pedledern_monthly_letter_data');
      if (savedV1) return JSON.parse(savedV1);
    } catch {
      // Ignorer
    }
    return GOLD_STANDARD_MARS_DATA;
  });

  const currentTheme = THEMES[activeThemeId as keyof typeof THEMES] || THEMES.skog;

  // Hent eventuelt lagrede Dagens Bilde-glimt fra Trinn 1
  const [storedDailyGlimpses, setStoredDailyGlimpses] = useState<DailyGlimpse[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pedledern_daily_glimpses');
      if (raw) setStoredDailyGlimpses(JSON.parse(raw));
    } catch {
      // Ignorer
    }
  }, []);

  useEffect(() => {
    try {
      // Kvotesikker lagring uten store base64-strenger
      const safeData = {
        ...letterData,
        glimpses: letterData.glimpses.map(g => ({
          ...g,
          imageUrl: g.imageUrl?.startsWith('data:') && g.imageUrl.length > 25000 ? '' : g.imageUrl
        }))
      };
      localStorage.setItem('pedledern_monthly_letter_data_v2', JSON.stringify(safeData));
    } catch {
      // Ignorer
    }
  }, [letterData]);

  // Beregn antall sider:
  // Side 1: Forside
  // Side 2 .. N+1: Hverdagsglimt
  // Side N+2: Pedagogisk blikk
  // Side N+3: Planer for neste måned
  // Side N+4: Bursdagshilsen (hvis finnes)
  const totalPages = 1 + letterData.glimpses.length + 1 + 1 + (letterData.birthdayKids?.length ? 1 : 0);

  // Hent aktivt hverdagsglimt for den gjeldende siden
  const currentGlimpseIndex = currentPage >= 2 && currentPage <= 1 + letterData.glimpses.length 
    ? currentPage - 2 
    : null;
  const currentGlimpse = currentGlimpseIndex !== null ? letterData.glimpses[currentGlimpseIndex] : null;

  // Hurtigendring av layoutVariant for aktivt glimt
  const handleSetLayoutForCurrentGlimpse = (variant: LayoutVariant) => {
    if (currentGlimpseIndex === null) return;
    setLetterData(prev => ({
      ...prev,
      glimpses: prev.glimpses.map((g, i) => i === currentGlimpseIndex ? { ...g, layoutVariant: variant } : g)
    }));
  };

  // Åpne bildemodal med forhåndsutfylt prompt
  const handleOpenGraphicModal = (target: 'cover' | 'glimpse' | 'pedagogical') => {
    setGraphicTargetType(target);
    if (target === 'cover') {
      setAiPromptInput(`${letterData.coverTitle}, barnehage i naturskjønne omgivelser, solskinn og varm atmosfære`);
    } else if (target === 'glimpse' && currentGlimpse) {
      setAiPromptInput(`${currentGlimpse.title}, glade barnehagebarn som leker ute i naturen, autentisk barnehagehverdag`);
    } else {
      setAiPromptInput(`Naturforståelse, samspill og magien i barnehagen, varmt sollys over skogen`);
    }
    setIsGraphicModalOpen(true);
  };

  // Generer bilde med AI (Gemini Image API)
  const handleGenerateAiImage = async () => {
    if (!aiPromptInput.trim()) return;
    setIsGeneratingAiImage(true);
    try {
      let styledPrompt = aiPromptInput.trim();
      if (aiStyleOption === 'photo') {
        styledPrompt += ", authentic norwegian kindergarten, warm natural light, playful, joyful children, highly detailed photography";
      } else if (aiStyleOption === 'illustration') {
        styledPrompt += ", warm watercolor children book illustration, soft cozy colors, artistic norwegian barnehage scene";
      } else {
        styledPrompt += ", cinematic warm golden hour, outdoor kindergarten adventures, highly detailed photo";
      }

      const res = await fetch("/api/gemini/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: styledPrompt, aspectRatio: "16:9" })
      });
      const data = await res.json();
      if (data.imageUrl) {
        applyImageToTarget(data.imageUrl, aiPromptInput, 'AI-Generert');
        setIsGraphicModalOpen(false);
      } else {
        alert("Kunne ikke generere bilde akkurat nå. Vennligst velg et bilde fra det kurerte galleriet.");
      }
    } catch {
      alert("Tilkoblingsfeil under bildegenerering. Prøv igjen eller velg fra galleriet.");
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  // Bruk bilde på det aktive målet (cover eller spesifikt glimt)
  const applyImageToTarget = (url: string, caption?: string, tag?: string) => {
    if (graphicTargetType === 'cover') {
      setLetterData(prev => ({
        ...prev,
        coverImage: url,
        coverImageCaption: caption || prev.coverImageCaption
      }));
    } else if (graphicTargetType === 'glimpse' && currentGlimpseIndex !== null) {
      setLetterData(prev => ({
        ...prev,
        glimpses: prev.glimpses.map((g, i) => i === currentGlimpseIndex ? {
          ...g,
          imageUrl: url,
          imageCaption: caption || g.imageCaption,
          imageTag: tag || g.imageTag
        } : g)
      }));
    } else if (graphicTargetType === 'pedagogical') {
      setLetterData(prev => ({
        ...prev,
        pedagogicalReviewImage: url
      }));
    }
    setIsGraphicModalOpen(false);
  };

  // Håndter opplasting av eget bilde
  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const raw = reader.result as string;
      const compressed = await compressImage(raw, 900, 0.72);
      applyImageToTarget(compressed, 'Eget opplastet bilde', 'Fra avdelingen');
    };
    reader.readAsDataURL(file);
  };

  // Reorganiser glimt (Flytt opp eller ned i siderekkefølgen)
  const handleMoveGlimpse = (index: number, direction: 'prev' | 'next') => {
    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= letterData.glimpses.length) return;
    const newGlimpses = [...letterData.glimpses];
    const temp = newGlimpses[index];
    newGlimpses[index] = newGlimpses[targetIndex];
    newGlimpses[targetIndex] = temp;
    setLetterData(prev => ({ ...prev, glimpses: newGlimpses }));
    setCurrentPage(2 + targetIndex);
  };

  // Generer nytt månedsbrev basert på samlede hverdagsglimt (Trinn 1 -> Trinn 2)
  const handleGenerateFromDailyGlimpses = async () => {
    setIsGenerating(true);

    let notesSummary = '';
    if (storedDailyGlimpses.length > 0) {
      notesSummary = storedDailyGlimpses
        .map((g, idx) => `Glimt ${idx + 1} (${g.date}):\nStikkord: ${g.keywords}\nTittel: ${g.title}\nTekst: ${g.text}\nTema: ${g.theme || 'Utelek'}`)
        .join('\n\n');
    } else {
      notesSummary = `Glimt 1: Bekken gikk over sine bredder på uteområdet, masse vann, barna hoppet i støvlene og utforsket strømmen.
Glimt 2: Demning i sandkassa, 6 barn bar bøtter og spadetak, samarbeidet om å tette sprekker.
Glimt 3: Samarbeidsdissa, 5 barn på en tømmerstokk, måtte finne rytmen sammen for å få fart.
Glimt 4: Sådde tomatfrø i potter, barna kjente på jorda og lurte på når det spirer.`;
    }

    const systemInstruction = `Du er en erfaren og faglig dyktig pedagogisk leder i en norsk barnehage som lager avdelingens offisielle Månedsbrev til foreldrene (Gullstandarden).
Barnehage: "${profil.barnehageNavn}", Avdeling: "${profil.avdelingsNavn}".
Barnehagens pedagogiske plattform og profil: "${profil.plattformNavn}".
Kjerneverdier: "${profil.kjerneverdier}".
Faglig profilfokus: "${profil.fagligForankringsMal}".

STRUKTURKRAV (GULLSTANDARDEN):
1. Flere "glimpses" (Hverdagsglimt):
   - "title": Fengende tittel/hook (f.eks. "Tunge spadetak og demningsbygging").
   - "description": Varm, levende tekst om hva som skjedde, barnas samspill og opplevelse (uten spesifikke personnavn på ansatte eller barn).
   - "reflectionQuestion": Et konkret, undrende spørsmål foreldrene kan stille barnet ved middagsbordet for å starte en god samtale.
   - "academicAnchor": Faglig forankring som eksplisitt tar utgangspunkt i Rammeplanen for barnehagen (2017) OG barnehagens pedagogiske plattform (${profil.plattformNavn}). Vis hvordan aktiviteten støtter barnas læring, lek og danning.
   - "imageTag": Foreslått tag/fagområde (f.eks. "Natur, miljø og teknologi").
2. "pedagogicalReview":
   - "title": Fengende overskrift for oppsummeringen.
   - "text": En grundig faglig og varm syntese som finner den "røde tråden" i månedens erfaringer, forankret i barnehagens pedagogiske profil (${profil.plattformNavn}).
3. "nextMonth":
   - "title": f.eks. "PLANER FOR ${letterData.nextMonthName.toUpperCase()}: ..."
   - "intro": Kort introduksjon til neste måneds didaktiske fokus.
   - "focusAreas": 3-4 konkrete didaktiske fokusområder (tittel + beskrivelse).

Tone of voice:
- Varm, engasjerende, profesjonell og trygg.
- Synliggjør pedagogisk ledelse og hvordan barnehagens pedagogiske profil kommer til liv i hverdagen.

Returner KUN gyldig JSON i følgende format:
{
  "coverIntro": "...",
  "glimpses": [
    {
      "title": "...",
      "description": "...",
      "reflectionQuestion": "...",
      "academicAnchor": "...",
      "imageTag": "..."
    }
  ],
  "pedagogicalReviewTitle": "...",
  "pedagogicalReviewText": "...",
  "nextMonthTitle": "...",
  "nextMonthIntro": "...",
  "nextMonthFocusAreas": [
    { "title": "...", "description": "..." }
  ]
}`;

    try {
      const response = await callGoogleAIProxy({
        model: "gemini-3.8-flash",
        contents: [{ role: 'user', parts: [{ text: `Her er månedens råmateriale og glimt:\n\n${notesSummary}` }] }],
        config: { systemInstruction, temperature: 0.4 }
      });

      const raw = typeof response === 'string' ? response : (response?.text || '');
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.glimpses && Array.isArray(parsed.glimpses)) {
        const enrichedGlimpses: MonthlyLetterGlimpse[] = parsed.glimpses.map((g: any, idx: number) => {
          const matchedImg = storedDailyGlimpses[idx]?.imageUrl || CURATED_GALLERY_IMAGES[idx % CURATED_GALLERY_IMAGES.length].url;
          const variants: LayoutVariant[] = ['image-left', 'image-right', 'hero-top', 'text-focus'];
          return {
            id: 'gen-glimpse-' + idx + '-' + Date.now(),
            title: g.title || 'Hverdagsglimt fra avdelingen',
            description: g.description || '',
            reflectionQuestion: g.reflectionQuestion || 'Hva var det morsomste dere gjorde i dag?',
            academicAnchor: g.academicAnchor || 'Direkte forankret i Rammeplanens mål for lek og læring.',
            imageUrl: matchedImg,
            imageTag: g.imageTag || 'Rammeplanen i praksis',
            imageCaption: g.title,
            layoutVariant: variants[idx % variants.length],
            imagePrivacyProtected: true
          };
        });

        const newAreas: MonthlyFocusArea[] = (parsed.nextMonthFocusAreas || []).map((fa: any, i: number) => ({
          id: 'focus-' + i,
          title: fa.title,
          description: fa.description
        }));

        setLetterData(prev => ({
          ...prev,
          coverIntro: parsed.coverIntro || prev.coverIntro,
          glimpses: enrichedGlimpses.length > 0 ? enrichedGlimpses : prev.glimpses,
          pedagogicalReviewTitle: parsed.pedagogicalReviewTitle || prev.pedagogicalReviewTitle,
          pedagogicalReviewText: parsed.pedagogicalReviewText || prev.pedagogicalReviewText,
          nextMonthTitle: parsed.nextMonthTitle || prev.nextMonthTitle,
          nextMonthIntro: parsed.nextMonthIntro || prev.nextMonthIntro,
          nextMonthFocusAreas: newAreas.length > 0 ? newAreas : prev.nextMonthFocusAreas
        }));

        setCurrentPage(1);
        setViewMode('magazine');
      }
    } catch (err) {
      console.warn("Feil ved generering av Månedsbrev:", err);
      alert('KI-assistenten kunne ikke fullføre akkurat nå. Viser full Gullstandard-mal!');
    } finally {
      setIsGenerating(false);
    }
  };

  // Kopier hele brevet i strukturert form
  const handleCopyFullLetter = () => {
    let fullText = `${letterData.coverTitle.toUpperCase()} - ${letterData.baseName}\n\n`;
    fullText += `${letterData.coverSubtitle}\n${letterData.coverIntro}\n\n`;
    fullText += `=====================================\n`;
    fullText += `HVERDAGSGLIMT FRA MÅNEDEN (GULLSTANDARDEN)\n`;
    fullText += `=====================================\n\n`;

    letterData.glimpses.forEach((g, idx) => {
      fullText += `📌 Glimt #${idx + 1}: ${g.title}\n`;
      fullText += `${g.description}\n\n`;
      fullText += `💬 Refleksjon med barna: ${g.reflectionQuestion}\n\n`;
      fullText += `🎓 Faglig forankring: ${g.academicAnchor}\n\n`;
      fullText += `-------------------------------------\n\n`;
    });

    fullText += `\n🌟 MÅNEDENS PEDAGOGISKE BLIKK\n`;
    fullText += `${letterData.pedagogicalReviewTitle}\n\n`;
    fullText += `${letterData.pedagogicalReviewText}\n\n`;

    fullText += `\n📅 ${letterData.nextMonthTitle}\n`;
    fullText += `${letterData.nextMonthIntro}\n\n`;
    letterData.nextMonthFocusAreas.forEach(fa => {
      fullText += `• ${fa.title}: ${fa.description}\n`;
    });
    fullText += `\n${letterData.nextMonthClosing}\n`;

    navigator.clipboard.writeText(fullText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Drag-and-drop eksport for PC
  const handleDragStart = (e: React.DragEvent) => {
    const summary = `${letterData.coverTitle} - ${letterData.baseName}\n\n${letterData.coverIntro}\n\nInneholder ${letterData.glimpses.length} hverdagsglimt, pedagogisk blikk og planer for neste måned.`;
    e.dataTransfer.setData('text/plain', summary);
    e.dataTransfer.setData('text/html', `<h2>${letterData.coverTitle}</h2><p>${letterData.coverIntro}</p>`);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Skjult filopplaster for bildebehandler */}
      <input 
        type="file" 
        ref={fileUploadInputRef} 
        onChange={handleCustomUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* =========================================================================
          TOPP-HEADER: Kontrollpanel, Temavelger og Handlinger (fra Styrern)
         ========================================================================= */}
      <div className={`bg-white rounded-3xl border ${currentTheme.themeTint} p-6 shadow-sm space-y-5 transition-all`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${currentTheme.accentBg} text-white shadow-2xs`}>
                To-trinnsraketten • Trinn 2
              </span>
              <span className={`text-xs font-bold ${currentTheme.accentText} flex items-center gap-1`}>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Månedsbrevet (Gullstandarden)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Magasin- og Månedsbrevstudio
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              Utform og tilpass månedsbrevet med full magasin-redigering: bytt fargetema, juster sideoppsett, skift bilder fra galleri eller KI, og finpuss fagteksten.
            </p>
          </div>

          {/* Handlinger: Magasin/Redigering, Plattform og KI-knapp */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Pedagogisk Plattform hurtigknapp */}
            <button
              type="button"
              onClick={() => setIsPlattformModalOpen(true)}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title="Endre barnehagens pedagogiske plattform og verdigrunnlag"
            >
              <Trees className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="truncate max-w-[170px]">{profil.plattformNavn}</span>
              <span className="text-[10px] text-emerald-800 bg-emerald-200/80 px-1.5 py-0.5 rounded-md font-black">Endre</span>
            </button>

            <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('magazine')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === 'magazine' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-teal-600" />
                <span>Magasinvisning</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === 'edit' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                <span>Redigeringsbenk</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleGenerateFromDailyGlimpses}
              disabled={isGenerating}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Syr sammen brev...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Smi sammen med KI ✨</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* VERKTØY-RAD: TEMAVELGER & EKSPORT (Styrern-stil) */}
        <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* 1. Temavelger */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-slate-500" /> Tema:
            </span>
            {Object.values(THEMES).map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setActiveThemeId(theme.id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition shrink-0 ${
                  activeThemeId === theme.id
                    ? `${theme.accentBg} text-white ${theme.accentBorder} shadow-xs`
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {theme.name}
              </button>
            ))}
          </div>

          {/* 2. Eksportverktøy (Desktop Drag-and-Drop & PDF) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Drabar chip til MyKid/Visma */}
            <div 
              draggable={true}
              onDragStart={handleDragStart}
              className="p-2 px-3 rounded-xl border-2 border-teal-300 bg-teal-50/70 hover:bg-teal-100/70 text-slate-800 flex items-center gap-2 cursor-grab active:cursor-grabbing transition shadow-2xs select-none"
              title="Dra over i din åpne MyKid/Visma-fane"
            >
              <Move className="w-3.5 h-3.5 text-teal-700" />
              <span className="text-[11px] font-extrabold text-teal-950">
                Dra til MyKid / Visma
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyFullLetter}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1.5 transition"
            >
              {copySuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Kopiert!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>Kopier tekst</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Skriv ut / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODUS 1: MAGASINVISNING MED VERKTØYBAR PÅ SIDENIVÅ
         ========================================================================= */}
      {viewMode === 'magazine' && (
        <div className="space-y-6">
          
          {/* VERKTØYLINJE FOR AKTIV SIDE (Endre Layout, Endre Bilde, Flytt rekkefølge) */}
          <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            
            {/* Paginering & Sidestyring */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition"
              >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
              </button>
              <span className="text-xs font-bold text-slate-800">
                Side {currentPage} av {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition"
              >
                <ChevronRight className="w-4 h-4 text-slate-700" />
              </button>
            </div>

            {/* SIDESPESIFIKKE VERKTØY (Kun hvis på forside eller hverdagsglimt) */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Layout-velger for aktivt hverdagsglimt */}
              {currentGlimpse && (
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1.5">
                    Layout:
                  </span>
                  {[
                    { id: 'image-left', label: 'Venstre', icon: '◧' },
                    { id: 'image-right', label: 'Høyre', icon: '◨' },
                    { id: 'hero-top', label: 'Topp', icon: '⬒' },
                    { id: 'text-focus', label: 'Kompakt', icon: '▤' }
                  ].map(lvl => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => handleSetLayoutForCurrentGlimpse(lvl.id as LayoutVariant)}
                      className={`text-xs font-bold px-2 py-1 rounded-lg transition ${
                        (currentGlimpse.layoutVariant || 'image-left') === lvl.id
                          ? 'bg-teal-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-200/60'
                      }`}
                    >
                      {lvl.icon} {lvl.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Endre Bilde for aktiv side */}
              <button
                type="button"
                onClick={() => handleOpenGraphicModal(currentPage === 1 ? 'cover' : 'glimpse')}
                className="bg-slate-100 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-300 text-slate-700 text-xs font-bold py-1.5 px-3 rounded-xl border border-slate-200 flex items-center gap-1.5 transition"
              >
                <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                <span>Endre bilde</span>
              </button>

              {/* Flytt rekkefølge for hverdagsglimt */}
              {currentGlimpseIndex !== null && (
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleMoveGlimpse(currentGlimpseIndex, 'prev')}
                    disabled={currentGlimpseIndex === 0}
                    className="p-1 rounded-lg hover:bg-slate-200 disabled:opacity-30 text-slate-600"
                    title="Flytt glimt til forrige side"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveGlimpse(currentGlimpseIndex, 'next')}
                    disabled={currentGlimpseIndex === letterData.glimpses.length - 1}
                    className="p-1 rounded-lg hover:bg-slate-200 disabled:opacity-30 text-slate-600"
                    title="Flytt glimt til neste side"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Hurtighopp til seksjoner */}
            <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-semibold text-slate-600 scrollbar-none">
              <button 
                onClick={() => setCurrentPage(1)}
                className={`px-2 py-1 rounded-lg transition ${currentPage === 1 ? `${currentTheme.badgeBg} font-black` : 'hover:bg-slate-100'}`}
              >
                1. Forside
              </button>
              <button 
                onClick={() => setCurrentPage(2)}
                className={`px-2 py-1 rounded-lg transition ${currentPage >= 2 && currentPage <= 1 + letterData.glimpses.length ? `${currentTheme.badgeBg} font-black` : 'hover:bg-slate-100'}`}
              >
                2. Glimt (1–{letterData.glimpses.length})
              </button>
              <button 
                onClick={() => setCurrentPage(2 + letterData.glimpses.length)}
                className={`px-2 py-1 rounded-lg transition ${currentPage === 2 + letterData.glimpses.length ? `${currentTheme.badgeBg} font-black` : 'hover:bg-slate-100'}`}
              >
                3. Pedagogisk blikk
              </button>
              <button 
                onClick={() => setCurrentPage(3 + letterData.glimpses.length)}
                className={`px-2 py-1 rounded-lg transition ${currentPage === 3 + letterData.glimpses.length ? `${currentTheme.badgeBg} font-black` : 'hover:bg-slate-100'}`}
              >
                4. Planer
              </button>
            </div>
          </div>

          {/* =========================================================================
              SELVE MAGASINSIDEN (Liggende 16:9 format med aktiv tematisering)
             ========================================================================= */}
          <div className="bg-[#FAF8F5] rounded-3xl border border-stone-200/90 shadow-2xl overflow-hidden min-h-[560px] transition-all relative">
            
            {/* SIDE 1: FORSIDE (Hero-bilde med tittel, varm ingress og barnehagens merke) */}
            {currentPage === 1 && (
              <div className="relative min-h-[560px] flex flex-col justify-end p-8 sm:p-14 text-white overflow-hidden group">
                <img 
                  src={letterData.coverImage} 
                  alt="Månedsbrev forside"
                  className="absolute inset-0 w-full h-full object-cover brightness-[0.70] contrast-[1.05] transition-transform duration-1000 group-hover:scale-102"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${currentTheme.gradient}`} />

                {/* Hurtigknapp for bildebytte på forside */}
                <button
                  type="button"
                  onClick={() => handleOpenGraphicModal('cover')}
                  className="absolute top-5 right-5 bg-black/60 hover:bg-black/80 text-white text-xs font-bold px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition opacity-90 group-hover:opacity-100 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
                  <span>Bytt forsidebilde</span>
                </button>

                <div className="relative z-10 max-w-3xl space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-amber-300 bg-black/50 backdrop-blur-md px-3.5 py-1 rounded-full border border-amber-300/30">
                      {letterData.baseName}
                    </span>
                    <span className="text-xs font-bold text-stone-200">
                      {letterData.month} {letterData.year}
                    </span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white drop-shadow-md">
                    {letterData.coverTitle}
                  </h1>

                  <p className="text-base sm:text-xl font-bold text-amber-200 drop-shadow-sm">
                    {letterData.coverSubtitle}
                  </p>

                  <p className="text-xs sm:text-sm text-stone-200/95 leading-relaxed pt-3 border-t border-white/20 max-w-2xl font-normal">
                    {letterData.coverIntro}
                  </p>

                  {letterData.coverImageCaption && (
                    <p className="text-[11px] text-stone-400 italic">
                      📸 {letterData.coverImageCaption}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* SIDE 2 til N+1: HVERDAGSGLIMT MED FLEKSIBEL LAYOUTVARIANT */}
            {currentGlimpse && (() => {
              const layout = currentGlimpse.layoutVariant || 'image-left';

              // Bildekomponent for hverdagsglimtet
              const renderGlimpseImage = (classes = "w-full h-full object-cover") => (
                <div className="relative rounded-2xl overflow-hidden shadow-md border border-stone-200 bg-stone-900 flex items-center justify-center group h-full">
                  <img 
                    src={currentGlimpse.imageUrl || CURATED_GALLERY_IMAGES[0].url} 
                    alt={currentGlimpse.title} 
                    className={classes}
                  />
                  {currentGlimpse.imageTag && (
                    <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-md text-[10px] font-bold text-emerald-300 px-2.5 py-1 rounded-lg border border-stone-700">
                      {currentGlimpse.imageTag}
                    </div>
                  )}

                  {/* Hurtigknapp for bildebytte over bildet */}
                  <button
                    type="button"
                    onClick={() => handleOpenGraphicModal('glimpse')}
                    className="absolute top-3 right-3 bg-white/90 hover:bg-white text-slate-800 text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-md border border-slate-200 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                    <span>Endre</span>
                  </button>

                  {currentGlimpse.imageCaption && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-6 text-white text-[11px] font-medium">
                      {currentGlimpse.imageCaption}
                    </div>
                  )}
                </div>
              );

              // Tekstkomponent (3-delt Gullstandard: Hendelse, Middagsbords-refleksjon, Rammeplan)
              const renderGlimpseText = () => (
                <div className="space-y-4">
                  <div>
                    <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${currentTheme.badgeBg}`}>
                      Hverdagsglimt {(currentGlimpseIndex || 0) + 1} av {letterData.glimpses.length}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 tracking-tight">
                      {currentGlimpse.title}
                    </h2>
                  </div>

                  {/* 1. Levende hendelsesbeskrivelse */}
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                    {currentGlimpse.description}
                  </p>

                  {/* 2. Middagsbords-spørsmålet */}
                  <div className="bg-amber-50/80 border-l-4 border-amber-500 rounded-r-xl p-4 shadow-2xs space-y-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <Smile className="w-3.5 h-3.5 text-amber-600" />
                      Refleksjon med barna (til middagsbordet):
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 italic">
                      «{currentGlimpse.reflectionQuestion}»
                    </p>
                  </div>

                  {/* 3. Rammeplan-forankring */}
                  <div className="bg-teal-50/70 border-l-4 border-teal-600 rounded-r-xl p-4 shadow-2xs space-y-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-teal-950 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-teal-700" />
                      Faglig forankring:
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {currentGlimpse.academicAnchor}
                    </p>
                  </div>
                </div>
              );

              // 1. LAYOUT: image-left (Bilde til venstre 5/12, tekst til høyre 7/12)
              if (layout === 'image-left') {
                return (
                  <div className="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[560px]">
                    <div className="lg:col-span-5 h-[340px] sm:h-[400px]">
                      {renderGlimpseImage()}
                    </div>
                    <div className="lg:col-span-7">
                      {renderGlimpseText()}
                    </div>
                  </div>
                );
              }

              // 2. LAYOUT: image-right (Tekst til venstre 7/12, bilde til høyre 5/12)
              if (layout === 'image-right') {
                return (
                  <div className="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[560px]">
                    <div className="lg:col-span-7">
                      {renderGlimpseText()}
                    </div>
                    <div className="lg:col-span-5 h-[340px] sm:h-[400px]">
                      {renderGlimpseImage()}
                    </div>
                  </div>
                );
              }

              // 3. LAYOUT: hero-top (Stort toppbilde, to-spalter under)
              if (layout === 'hero-top') {
                return (
                  <div className="p-6 sm:p-10 flex flex-col gap-6 min-h-[560px]">
                    <div className="h-64 w-full shrink-0">
                      {renderGlimpseImage()}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${currentTheme.badgeBg}`}>
                          Hverdagsglimt {(currentGlimpseIndex || 0) + 1}
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          {currentGlimpse.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                          {currentGlimpse.description}
                        </p>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-amber-50/80 border-l-4 border-amber-500 rounded-r-xl p-3.5 space-y-1">
                          <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                            <Smile className="w-3.5 h-3.5 text-amber-600" />
                            Refleksjon med barna:
                          </span>
                          <p className="text-xs font-semibold text-slate-900 italic">
                            «{currentGlimpse.reflectionQuestion}»
                          </p>
                        </div>
                        <div className="bg-teal-50/70 border-l-4 border-teal-600 rounded-r-xl p-3.5 space-y-1">
                          <span className="text-[11px] font-black uppercase tracking-wider text-teal-950 flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-teal-700" />
                            Faglig forankring:
                          </span>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {currentGlimpse.academicAnchor}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // 4. LAYOUT: text-focus (Kompakt bilde, dyp tekstplass)
              return (
                <div className="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start min-h-[560px]">
                  <div className="lg:col-span-8 space-y-4">
                    {renderGlimpseText()}
                  </div>
                  <div className="lg:col-span-4 h-64 sm:h-72">
                    {renderGlimpseImage()}
                  </div>
                </div>
              );
            })()}

            {/* SIDE N+2: MÅNEDENS PEDAGOGISKE BLIKK (Side 14 i Mars-dokumentet) */}
            {currentPage === 2 + letterData.glimpses.length && (
              <div className="p-8 sm:p-14 max-w-4xl mx-auto space-y-6">
                <div className="text-center space-y-2 border-b border-stone-200 pb-5">
                  <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${currentTheme.badgeBg}`}>
                    Sammenstilling av dokumentasjon
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    MÅNEDENS PEDAGOGISKE BLIKK
                  </h2>
                  <h3 className={`text-base sm:text-lg font-bold ${currentTheme.accentText}`}>
                    {letterData.pedagogicalReviewTitle}
                  </h3>
                </div>

                <div className="bg-white/90 rounded-2xl border border-stone-200/80 p-6 sm:p-8 shadow-xs space-y-4">
                  {letterData.pedagogicalReviewText.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-stone-200">
                  <span>Pedagogisk vurdering for {letterData.month}</span>
                  <span className={`font-bold ${currentTheme.accentText}`}>
                    Barnehagelærer & Pedleder • {letterData.baseName}
                  </span>
                </div>
              </div>
            )}

            {/* SIDE N+3: PLANER FOR NESTE MÅNED (Didaktisk Frempek) */}
            {currentPage === 3 + letterData.glimpses.length && (
              <div className="p-8 sm:p-14 max-w-4xl mx-auto space-y-6">
                <div className="space-y-2 border-b border-stone-200 pb-5">
                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                    Didaktisk Frempek
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {letterData.nextMonthTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {letterData.nextMonthIntro}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {letterData.nextMonthFocusAreas.map((focus) => (
                    <div 
                      key={focus.id}
                      className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs space-y-2"
                    >
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <Compass className={`w-4 h-4 ${currentTheme.accentText} shrink-0`} />
                        {focus.title}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {focus.description}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 text-center">
                  <p className="text-xs sm:text-sm font-bold text-slate-800">
                    {letterData.nextMonthClosing}
                  </p>
                </div>
              </div>
            )}

            {/* SIDE N+4: BURSDAGSHILSEN (valgfri) */}
            {currentPage === 4 + letterData.glimpses.length && letterData.birthdayKids && (
              <div className="p-8 sm:p-14 max-w-2xl mx-auto text-center space-y-6 flex flex-col items-center justify-center min-h-[500px]">
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shadow-inner">
                  <Smile className="w-8 h-8" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                  Månedens bursdagsbarn
                </h2>
                <div className="space-y-2">
                  {letterData.birthdayKids.map((kid, idx) => (
                    <div key={idx} className="bg-white px-6 py-4 rounded-2xl border border-stone-200 shadow-xs">
                      <p className="text-base font-black text-amber-900">
                        Hipp, hipp hurra! 🎉
                      </p>
                      <p className="text-sm font-bold text-slate-800 mt-1">
                        {kid.name} ble {kid.age} år den {kid.date}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BUNNTEKST PÅ SIDEN */}
            <div className="p-4 px-8 border-t border-stone-200/80 flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              <span>{letterData.baseName} • Månedsbrev {letterData.month} {letterData.year}</span>
              <span>Side {currentPage} av {totalPages}</span>
            </div>
          </div>

          {/* Bunn-navigasjon */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="bg-white hover:bg-slate-50 disabled:opacity-30 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5 shadow-2xs transition"
            >
              <ChevronLeft className="w-4 h-4" /> Forrige side
            </button>

            <span className="text-xs text-slate-500 font-medium">
              Bruk piltastene eller verktøylinjen øverst for å tilpasse layout og innhold.
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="bg-white hover:bg-slate-50 disabled:opacity-30 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5 shadow-2xs transition"
            >
              Neste side <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODUS 2: REDIGERINGSBENK (Full tabell- og teksteditor for Pedlederen)
         ========================================================================= */}
      {viewMode === 'edit' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8">
          
          {/* FORSIDE & METADATA */}
          <div className="space-y-4 border-b border-slate-200 pb-6">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              Forside og periode
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Måned & år:</label>
                <input 
                  type="text" 
                  value={`${letterData.month} ${letterData.year}`}
                  onChange={(e) => {
                    const parts = e.target.value.split(' ');
                    setLetterData(prev => ({ ...prev, month: parts[0] || prev.month, year: parts[1] || prev.year }));
                  }}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Avdelingsnavn:</label>
                <input 
                  type="text" 
                  value={letterData.baseName}
                  onChange={(e) => setLetterData(prev => ({ ...prev, baseName: e.target.value }))}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Forsidetittel:</label>
                <input 
                  type="text" 
                  value={letterData.coverTitle}
                  onChange={(e) => setLetterData(prev => ({ ...prev, coverTitle: e.target.value }))}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Forsideingress (Varm introduksjon):</label>
              <textarea 
                value={letterData.coverIntro}
                onChange={(e) => setLetterData(prev => ({ ...prev, coverIntro: e.target.value }))}
                rows={3}
                className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed"
              />
            </div>
          </div>

          {/* HVERDAGSGLIMTENE */}
          <div className="space-y-4 border-b border-slate-200 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-teal-600" />
                  Månedens Hverdagsglimt ({letterData.glimpses.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Byggeklossene i Gullstandarden: Tittel, beskrivelse, middagsbordsspørsmål og Rammeplan-forankring.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const newG: MonthlyLetterGlimpse = {
                    id: 'glimpse-' + Date.now(),
                    title: 'Nytt hverdagsglimt',
                    description: 'Beskriv hendelsen...',
                    reflectionQuestion: 'Hva var det morsomste dere gjorde i dag?',
                    academicAnchor: 'Direkte forankret i Rammeplanens mål for lek og fellesskap.',
                    imageUrl: CURATED_GALLERY_IMAGES[0].url,
                    imageTag: 'Fellesskap & lek',
                    layoutVariant: 'image-left',
                    imagePrivacyProtected: true
                  };
                  setLetterData(prev => ({ ...prev, glimpses: [...prev.glimpses, newG] }));
                }}
                className="bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-teal-200 flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Legg til glimt
              </button>
            </div>

            <div className="space-y-6 pt-2">
              {letterData.glimpses.map((glimpse, idx) => (
                <div 
                  key={glimpse.id}
                  className="bg-slate-50/70 rounded-2xl border border-slate-200 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-900 bg-teal-100/70 px-2.5 py-0.5 rounded-lg">
                      Glimt #{idx + 1} • {glimpse.layoutVariant || 'image-left'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLetterData(prev => ({ ...prev, glimpses: prev.glimpses.filter(g => g.id !== glimpse.id) }))}
                      className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Fjern glimt
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Tittel:</label>
                    <input 
                      type="text"
                      value={glimpse.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLetterData(prev => ({
                          ...prev,
                          glimpses: prev.glimpses.map(g => g.id === glimpse.id ? { ...g, title: val } : g)
                        }));
                      }}
                      className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Beskrivelse av hendelsen:</label>
                    <textarea 
                      value={glimpse.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLetterData(prev => ({
                          ...prev,
                          glimpses: prev.glimpses.map(g => g.id === glimpse.id ? { ...g, description: val } : g)
                        }));
                      }}
                      rows={3}
                      className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded-xl p-3 leading-relaxed"
                    />
                  </div>

                  {/* Refleksjon med barna */}
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                    <label className="text-[11px] font-black text-amber-900 block mb-1">
                      💬 Refleksjon med barna (Spørsmålet til middagsbordet):
                    </label>
                    <input 
                      type="text"
                      value={glimpse.reflectionQuestion}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLetterData(prev => ({
                          ...prev,
                          glimpses: prev.glimpses.map(g => g.id === glimpse.id ? { ...g, reflectionQuestion: val } : g)
                        }));
                      }}
                      className="w-full text-xs font-semibold bg-white border border-amber-300 rounded-lg p-2 text-slate-900"
                    />
                  </div>

                  {/* Faglig forankring */}
                  <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3">
                    <label className="text-[11px] font-black text-teal-950 block mb-1">
                      🎓 Faglig forankring (Rammeplanen & metode):
                    </label>
                    <textarea 
                      value={glimpse.academicAnchor}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLetterData(prev => ({
                          ...prev,
                          glimpses: prev.glimpses.map(g => g.id === glimpse.id ? { ...g, academicAnchor: val } : g)
                        }));
                      }}
                      rows={2}
                      className="w-full text-xs text-slate-700 bg-white border border-teal-300 rounded-lg p-2 leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MÅNEDENS PEDAGOGISKE BLIKK */}
          <div className="space-y-4 border-b border-slate-200 pb-6">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-teal-600" />
              Månedens pedagogiske blikk
            </h3>
            
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Overskrift for sammendraget:</label>
              <input 
                type="text"
                value={letterData.pedagogicalReviewTitle}
                onChange={(e) => setLetterData(prev => ({ ...prev, pedagogicalReviewTitle: e.target.value }))}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Syntese / Rød tråd:</label>
              <textarea 
                value={letterData.pedagogicalReviewText}
                onChange={(e) => setLetterData(prev => ({ ...prev, pedagogicalReviewText: e.target.value }))}
                rows={6}
                className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed"
              />
            </div>
          </div>

          {/* PLANER FOR NESTE MÅNED */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              Planer for neste måned
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tittel på planene:</label>
              <input 
                type="text"
                value={letterData.nextMonthTitle}
                onChange={(e) => setLetterData(prev => ({ ...prev, nextMonthTitle: e.target.value }))}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Innledning for planene:</label>
              <textarea 
                value={letterData.nextMonthIntro}
                onChange={(e) => setLetterData(prev => ({ ...prev, nextMonthIntro: e.target.value }))}
                rows={2}
                className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {letterData.nextMonthFocusAreas.map((focus) => (
                <div key={focus.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <input 
                    type="text"
                    value={focus.title}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLetterData(prev => ({
                        ...prev,
                        nextMonthFocusAreas: prev.nextMonthFocusAreas.map(fa => fa.id === focus.id ? { ...fa, title: val } : fa)
                      }));
                    }}
                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg p-1.5"
                  />
                  <textarea 
                    value={focus.description}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLetterData(prev => ({
                        ...prev,
                        nextMonthFocusAreas: prev.nextMonthFocusAreas.map(fa => fa.id === focus.id ? { ...fa, description: val } : fa)
                      }));
                    }}
                    rows={2}
                    className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-2 leading-relaxed"
                  />
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setViewMode('magazine')}
                className="bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition"
              >
                Forhåndsvis i Magasinet →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          GRAFIKK- OG BILDEBEHANDLER MODAL (Hentet fra Styrerns Magasin)
         ========================================================================= */}
      {isGraphicModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Bilde- og Grafikkbehandler
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {graphicTargetType === 'cover' ? 'Velg forsidebilde' : 'Velg bilde for hverdagsglimtet'}
                  </p>
                </div>
              </div>

              {/* Faner */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setGraphicModalTab('gallery')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${graphicModalTab === 'gallery' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Kurert Galleri
                </button>
                <button
                  type="button"
                  onClick={() => setGraphicModalTab('ai')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${graphicModalTab === 'ai' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <Wand2 className="w-3 h-3 text-amber-500" /> KI-Bilde
                </button>
                <button
                  type="button"
                  onClick={() => setGraphicModalTab('upload')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${graphicModalTab === 'upload' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Last opp
                </button>
              </div>
            </div>

            {/* Modal Innhold */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              
              {/* FANE 1: KURERT GALLERI */}
              {graphicModalTab === 'gallery' && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-700 block">
                    Velg blant stemningsbilder fra norsk barnehagehverdag:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {CURATED_GALLERY_IMAGES.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => applyImageToTarget(img.url, img.label, img.label)}
                        className="group relative rounded-xl overflow-hidden aspect-video border border-slate-200 hover:border-teal-500 hover:shadow-md cursor-pointer transition"
                      >
                        <img src={img.url} alt={img.label} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                          <span className="text-[11px] font-bold text-white leading-tight drop-shadow-sm">
                            {img.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FANE 2: KI-BILDEGENERATOR */}
              {graphicModalTab === 'ai' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Beskriv motivet du ønsker:
                    </label>
                    <textarea 
                      value={aiPromptInput}
                      onChange={(e) => setAiPromptInput(e.target.value)}
                      rows={3}
                      placeholder="F.eks: Barn som samarbeider om å bygge demning i sandkassa, sollys og støvler i vann..."
                      className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Stiluttrykk:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'photo', label: 'Ekte fotografi', desc: 'Varmt dagslys' },
                        { id: 'illustration', label: 'Billedbok-akvarell', desc: 'Myke kunstneriske farger' },
                        { id: 'warm', label: 'Gyllen time', desc: 'Solnedgang/høstlys' }
                      ].map(st => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setAiStyleOption(st.id as any)}
                          className={`p-2.5 rounded-xl border text-left transition ${
                            aiStyleOption === st.id 
                              ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-2xs' 
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="text-xs font-bold">{st.label}</div>
                          <div className="text-[10px] text-slate-500">{st.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateAiImage}
                    disabled={isGeneratingAiImage || !aiPromptInput.trim()}
                    className="w-full bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-xs transition"
                  >
                    {isGeneratingAiImage ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Genererer bilde med KI...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 text-amber-300" />
                        <span>Generer nytt bilde nå</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* FANE 3: LAST OPP EGET BILDE */}
              {graphicModalTab === 'upload' && (
                <div 
                  onClick={() => fileUploadInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50/60 hover:bg-teal-50/20 rounded-2xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800">
                      Klikk for å laste opp bilde fra enheten
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Støtter JPG, PNG, HEIC. Bildet komprimeres automatisk for rask ytelse.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsGraphicModalOpen(false)}
                className="text-slate-600 hover:text-slate-900 text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                Lukk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PEDAGOGISK PLATTFORM & VERDIGRUNNLAG (KI-GRUNNMUREN) MODAL */}
      <PedagogiskPlattformModal
        isOpen={isPlattformModalOpen}
        onClose={() => setIsPlattformModalOpen(false)}
        onProfileSaved={(updated) => {
          setProfil(updated);
          setLetterData(prev => ({
            ...prev,
            baseName: updated.avdelingsNavn || prev.baseName,
            coverSubtitle: `${updated.barnehageNavn} • ${updated.avdelingsNavn}`
          }));
        }}
      />

    </div>
  );
}
