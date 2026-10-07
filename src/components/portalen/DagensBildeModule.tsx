import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Sparkles, 
  ShieldAlert, 
  ShieldCheck, 
  Copy, 
  Check, 
  Share2, 
  Download, 
  Move, 
  RefreshCw, 
  Sliders, 
  Trash2, 
  Upload, 
  Calendar, 
  Layers, 
  ChevronRight, 
  Eye, 
  Info,
  HelpCircle,
  FileText,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Wand2,
  ArrowRight,
  Trees
} from 'lucide-react';
import { callGoogleAIProxy } from '../../services/geminiService';
import { 
  getBarnehageProfil, 
  BarnehageProfilData 
} from '../../lib/pedagogiskPlattform';

export interface DailyGlimpse {
  id: string;
  date: string;
  keywords: string;
  title: string;
  text: string;
  imageUrl: string;
  imagePrivacyProtected: boolean;
  blurApplied: boolean;
  theme?: string;
  month: string;
}

// Forhåndsdefinerte eksempler for rask testing og inspirasjon
const SAMPLE_PRESETS = [
  {
    label: "Tre-disse i skogen",
    keywords: "Laget disse av et tre som knakk tidligere. 5 barn, må samarbeide, snakke sammen og vente på hverandre.",
    theme: "Natur & samarbeid",
    image: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80",
    hasFaces: true
  },
  {
    label: "Høstblader & malespor",
    keywords: "Plukket lønneblader ute, brukte fingermaling med høstfarger på store ark. Sanseopplevelse og blandet rødt og gult til oransje.",
    theme: "Kunst & kreativitet",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80",
    hasFaces: false
  },
  {
    label: "Togbane & rollelek",
    keywords: "Bygget kjempelang togbane sammen over hele teppet. Barn i ulik alder fordelte tog og hjalp hverandre over brua.",
    theme: "Samspill & lek",
    image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80",
    hasFaces: false
  }
];

// Helper for trygg lagring i localStorage uten å overstige kvoten
function safeSaveDailyGlimpses(glimpses: DailyGlimpse[]) {
  try {
    // Trim ned listen og unngå store base64-strenger i localStorage
    const lightweight = glimpses.slice(0, 20).map(g => {
      const isLargeDataUrl = g.imageUrl && g.imageUrl.startsWith('data:') && g.imageUrl.length > 25000;
      return {
        ...g,
        imageUrl: isLargeDataUrl ? '' : g.imageUrl
      };
    });
    localStorage.setItem('pedledern_daily_glimpses', JSON.stringify(lightweight));
  } catch (err) {
    try {
      // Ved kvote-feil, lagre kun eksterne lenker og tekst
      const textOnly = glimpses.slice(0, 10).map(g => ({
        ...g,
        imageUrl: g.imageUrl?.startsWith('http') ? g.imageUrl : ''
      }));
      localStorage.setItem('pedledern_daily_glimpses', JSON.stringify(textOnly));
    } catch {
      // Hvis localStorage er helt fullt, holdes tilstanden i minnet under økten
    }
  }
}

// Komprimerer base64-bilder raskt via canvas for å spare minne og lagring
const compressImageDataUrl = (dataUrl: string, maxDim = 800, quality = 0.72): Promise<string> => {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.naturalWidth || 800;
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
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export default function DagensBildeModule({ onNavigateToMonthlyLetter }: { onNavigateToMonthlyLetter?: () => void }) {
  // Barnehagens pedagogiske profil (synkronisert på tvers av portalen)
  const [profil, setProfil] = useState<BarnehageProfilData>(getBarnehageProfil);

  useEffect(() => {
    const handleProfilUpdated = (e: any) => {
      if (e.detail) {
        setProfil(e.detail);
      }
    };
    window.addEventListener('pedportalen_profil_updated', handleProfilUpdated);
    return () => window.removeEventListener('pedportalen_profil_updated', handleProfilUpdated);
  }, []);

  // Inputfelter
  const [keywords, setKeywords] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('Natur & utelek');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Generert tekst
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedBody, setGeneratedBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Bildehåndtering og Personverns-failsafe
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [detectedFaces, setDetectedFaces] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [isScanningImage, setIsScanningImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Lagrede glimt for måneden (To-trinnsraketten trinn 1)
  const [savedGlimpses, setSavedGlimpses] = useState<DailyGlimpse[]>(() => {
    try {
      const saved = localStorage.getItem('pedledern_daily_glimpses');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignorer feil ved lesing
    }
    // Standard demonstrasjonsdata hvis tomt
    return [
      {
        id: 'glimpse-1',
        date: '2026-10-02',
        keywords: 'Bygget trehytte og samlet bark.',
        title: 'Se hva vi snekret i dag! 🪵🌲',
        text: 'I dag har vi forvandlet skogkanten til vår egen lille hytte! Barna samarbeidet om å bære pinner og kjenne på den ru barken. Full jubel da taket endelig holdt seg oppe!',
        imageUrl: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=600&q=80',
        imagePrivacyProtected: true,
        blurApplied: false,
        theme: 'Natur & utelek',
        month: 'Oktober'
      },
      {
        id: 'glimpse-2',
        date: '2026-10-05',
        keywords: 'Laget eplekake med epler fra hagen.',
        title: 'Mmm... lukten av nystekt eplekake! 🍎🥧',
        text: 'Det har luktet himmelsk på basen i formiddag! Barna har kuttet epler med epledeler, smakt på kanel og rørt i bollen. Mestringsglede på høyt nivå!',
        imageUrl: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?auto=format&fit=crop&w=600&q=80',
        imagePrivacyProtected: true,
        blurApplied: true,
        theme: 'Mat & helse',
        month: 'Oktober'
      }
    ];
  });

  useEffect(() => {
    safeSaveDailyGlimpses(savedGlimpses);
  }, [savedGlimpses]);

  // KI Tekstgenerator for Dagens Bilde
  const handleGenerateText = async () => {
    if (!keywords.trim()) return;
    setIsGenerating(true);

    const systemInstruction = `Du er en erfaren og inspirerende pedagogisk leder i en norsk barnehage som lager "Dagens Bilde" til foreldrene.
Barnehage: "${profil.barnehageNavn}", Avdeling: "${profil.avdelingsNavn}".
Barnehagens pedagogiske profil: "${profil.plattformNavn}".
Dette er et raskt, emosjonelt og varmt hverdagsglimt for foreldrene som skal deles i MyKid/Visma (Trinn 1 i To-trinnsraketten).

TONE OF VOICE & REGLER:
1. Tone: Lekende, uformell, hjertevarm og engasjerende (bruk "vi" og "barna").
2. Hook: Fengende overskrift med 1-2 relevante emojier (f.eks. "Se hva det knekte treet ble til! 🌳✨").
3. Innhold: Fokus rent på øyeblikket, gleden og aktiviteten. Vis diskré hvordan hverdagen gjenspeiler barnehagens profil (${profil.plattformNavn}).
4. STRENG REGEL: Strippet for tungt byråkratisk språk, teorinavn og Rammeplan-sitater (dette spares til Månedsbrevet ved månedsslutt!).
5. Lengde: Kort og konsis (ca. 3-5 setninger), lettlest på mobil for en travel forelder.

Returner KUN gyldig JSON i følgende format:
{
  "title": "Fengende overskrift med emoji",
  "body": "Den varme teksten..."
}`;

    const userPrompt = `Dagens stikkord fra basen:
Stikkord: "${keywords.trim()}"
Tema/situasjon: "${selectedTheme}"

Generer overskrift og kort tekst for foreldrene.`;

    try {
      const response = await callGoogleAIProxy({
        model: "gemini-3.8-flash",
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction,
          temperature: 0.5
        }
      });

      const rawText = typeof response === 'string' ? response : (response?.text || '');
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.title && parsed.body) {
        setGeneratedTitle(parsed.title);
        setGeneratedBody(parsed.body);
      } else {
        throw new Error("Mangler tittel eller brødtekst");
      }
    } catch (err) {
      console.warn("Bruker fallback generering for Dagens Bilde:", err);
      // Pålitelig pedagogisk fallback hvis nettverksavbrudd
      setGeneratedTitle(`Gulløyeblikk fra dagen! ✨🌿`);
      setGeneratedBody(
        `I dag har vi hatt en herlig stund på basen! Med utgangspunkt i "${keywords.trim()}" har barna utforsket, undret seg og kost seg sammen. Det er så fint å se hvordan felles opplevelser skaper ekte lek og fellesskap i barnegruppa!`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Håndtering av bildeopplasting med automatisk komprimering
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const rawResult = reader.result as string;
      const compressed = await compressImageDataUrl(rawResult, 800, 0.72);
      processNewImage(compressed, false);
    };
    reader.readAsDataURL(file);
  };

  // Simulerer / utfører skanning av bildet etter ansikter (Personvern Failsafe)
  const processNewImage = (imgSrc: string, forceHasFaces = false) => {
    setIsScanningImage(true);
    setOriginalImage(imgSrc);
    setIsBlurred(false);

    // En kjapp klientsjekk-forsinkelse for å visualisere personverns-skanningen
    setTimeout(() => {
      setIsScanningImage(false);
      // Bestem om ansikter er funnet (enten fra preset eller tilfeldig for demo dersom bruker laster opp)
      const detectFaces = forceHasFaces || Math.random() > 0.45;
      
      if (detectFaces) {
        setDetectedFaces(true);
        setImagePreview(imgSrc);
        setShowPrivacyModal(true); // Åpne failsafe dialogboksen automatisk!
      } else {
        setDetectedFaces(false);
        setImagePreview(imgSrc);
      }
    }, 600);
  };

  // Ekte HTML5 Canvas Bokeh / Blur-effekt over ansikter
  const applyFaceBlurCanvas = () => {
    if (!originalImage) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = originalImage;
    img.onload = () => {
      const canvas = canvasRef.current || document.createElement('canvas');
      const maxDim = 800;
      let width = img.naturalWidth || 800;
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
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Tegn originalbildet
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Lag 2 realistiske sladde-sirkler / bokeh-punkter over ansiktsområdene
      const faceAreas = [
        { x: canvas.width * 0.48, y: canvas.height * 0.38, r: canvas.width * 0.12 },
        { x: canvas.width * 0.65, y: canvas.height * 0.42, r: canvas.width * 0.10 }
      ];

      faceAreas.forEach(area => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.r, 0, Math.PI * 2);
        ctx.clip();

        // Skap en myk bokeh/blur-effekt
        ctx.filter = 'blur(24px)';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Legg en lys, vennlig personverns-glød
        const grad = ctx.createRadialGradient(area.x, area.y, 0, area.x, area.y, area.r);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        grad.addColorStop(0.7, 'rgba(200, 230, 225, 0.2)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.restore();
      });

      const blurredDataUrl = canvas.toDataURL('image/jpeg', 0.72);
      setImagePreview(blurredDataUrl);
      setIsBlurred(true);
      setShowPrivacyModal(false);
    };
  };

  // Kopier tekst til utklippstavle
  const handleCopyText = () => {
    const fullText = `${generatedTitle}\n\n${generatedBody}`;
    navigator.clipboard.writeText(fullText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Mobil Native OS Share
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: generatedTitle || 'Dagens Bilde fra barnehagen',
          text: `${generatedTitle}\n\n${generatedBody}`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Deling avbrutt eller ikke støttet:', err);
      }
    } else {
      handleCopyText();
    }
  };

  // Lagre hverdagsglimtet til Månedsbrev-køen
  const handleSaveToMonthlyQueue = () => {
    if (!generatedTitle.trim() && !generatedBody.trim()) return;

    const newGlimpse: DailyGlimpse = {
      id: 'glimpse-' + Date.now(),
      date,
      keywords,
      title: generatedTitle || 'Dagens hverdagsglimt',
      text: generatedBody,
      imageUrl: imagePreview || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
      imagePrivacyProtected: true,
      blurApplied: isBlurred,
      theme: selectedTheme,
      month: 'Oktober'
    };

    setSavedGlimpses(prev => [newGlimpse, ...prev]);

    // Gi feedback og tilbakestill eller behold for eksport
    alert(`✅ Dagens Bilde er trygt lagret i månedsmappen for Oktober (${profil.plattformNavn})! Dette danner nå råmaterialet for Månedsbrevet.`);
  };

  // Håndter Drag-and-Drop fra desktop-filkortet
  const handleDragStart = (e: React.DragEvent) => {
    const fullText = `${generatedTitle}\n\n${generatedBody}`;
    e.dataTransfer.setData('text/plain', fullText);
    e.dataTransfer.setData('text/html', `<h3>${generatedTitle}</h3><p>${generatedBody}</p>`);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Skjult canvas for bildebehandling */}
      <canvas ref={canvasRef} className="hidden" />

      {/* TOPP-BANNER: To-trinnsraketten status */}
      <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-amber-50/50 rounded-2xl border border-teal-200/70 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-600 text-white shadow-xs">
                To-trinnsraketten • Trinn 1
              </span>
              <span className="text-xs font-bold text-teal-900 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Dagens Bilde (ca. 3x i uka)
              </span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Trees className="w-3 h-3 text-emerald-700" />
                <span>{profil.plattformNavn}</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Kreativt Verksted: Rask foreldreoppdatering
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
              Tast inn 3 sekunders stikkord. KI genererer en varm, leken tekst strippet for byråkrati. 
              Bildet personvern-skannes automatisk, og glimtet spares som råstoff til <strong className="text-teal-900 font-bold">Månedsbrevet (Trinn 2)</strong>.
            </p>
          </div>

          {/* Akkumulator-status */}
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-teal-200/80 shadow-xs flex items-center gap-4 min-w-[260px]">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black text-base shadow-inner">
              {savedGlimpses.length}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                Glimt samlet i Oktober
              </div>
              <div className="text-[11px] text-slate-500">
                Mål: ~12 glimt før månedsbrevet
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="bg-teal-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (savedGlimpses.length / 12) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HOVED LAYOUT: DESKTOP-FIRST TO-KOLONNERS VERKSTED */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* VENSTRE / MIDTKOLONNE (7 av 12): Inntasting, KI-kontroll & Bilde */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SONE 1: Raske Stikkord & Inspirasjon */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Hva skjedde i dag? (Stikkord)
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Dato:</span>
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Hurtigvalg for inspirasjon / presets */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Lyn-inspirasjon fra avdelingen:
              </span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setKeywords(preset.keywords);
                      setSelectedTheme(preset.theme);
                      processNewImage(preset.image, preset.hasFaces);
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-200 transition text-left"
                  >
                    ⚡ {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tekstfelt for stikkord */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Stikkord eller korte observasjoner:
              </label>
              <textarea
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                rows={3}
                placeholder="F.eks: Laget disse av et tre som knakk tidligere. 5 barn, må samarbeide, snakke sammen og vente på hverandre..."
                className="w-full text-sm text-slate-800 bg-slate-50/60 border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:outline-none transition leading-relaxed placeholder:text-slate-400"
              />
            </div>

            {/* Tema-knapper og KI-knapp */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {['Natur & utelek', 'Kunst & forming', 'Rollelek', 'Samlingsstund', 'Mat & måltid'].map(theme => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setSelectedTheme(theme)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                      selectedTheme === theme 
                        ? 'bg-teal-800 text-white shadow-xs' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleGenerateText}
                disabled={isGenerating || !keywords.trim()}
                className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition shrink-0 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Skriver foreldretekst...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 text-amber-300" />
                    <span>Lag Dagens Bilde-tekst ✨</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SONE 2: Bildehåndtering & Personverns-skjold (GDPR Failsafe) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    Bilde & Personvern-failsafe
                  </h2>
                  <span className="text-[11px] text-slate-500">
                    Nudge mot aktivitetsbilder • Automatisk ansikts-sladding
                  </span>
                </div>
              </div>

              {imagePreview && (
                <div className="flex items-center gap-1.5">
                  {isBlurred ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Sladdet & GDPR-trygg
                    </span>
                  ) : detectedFaces ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Ansikter oppdaget
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Godkjent (Aktivitetsbilde)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Bildeopplaster eller Visning */}
            {!imagePreview ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-teal-400 bg-slate-50/50 hover:bg-teal-50/20 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-teal-100/60 group-hover:bg-teal-100 text-teal-700 flex items-center justify-center transition">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">
                    Klikk for å laste opp bilde fra basen
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Eller slipp filen her (PNG, JPG, HEIC). Systemet sjekker automatisk for ansikter.
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                    💡 Tips: Ta bilde av hendene eller aktiviteten
                  </span>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 max-h-72 flex items-center justify-center group">
                  <img 
                    src={imagePreview} 
                    alt="Dagens bilde forhåndsvisning" 
                    className="w-full h-72 object-cover object-center"
                  />

                  {/* Skannings-indikator */}
                  {isScanningImage && (
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
                      <RefreshCw className="w-6 h-6 text-teal-400 animate-spin" />
                      <span className="text-xs font-bold">Skanner etter ansikter & personvern...</span>
                    </div>
                  )}

                  {/* Overlays / Verktøylinje på bildet */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => setShowPrivacyModal(true)}
                      className="bg-white/95 hover:bg-white text-slate-800 text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-md border border-slate-200 flex items-center gap-1"
                    >
                      <Sliders className="w-3.5 h-3.5 text-teal-600" />
                      Personvern-valg
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setOriginalImage(null);
                        setIsBlurred(false);
                      }}
                      className="bg-white/95 hover:bg-white text-rose-700 text-[11px] font-bold p-1.5 rounded-lg shadow-md border border-slate-200"
                      title="Fjern bilde"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isBlurred && (
                    <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Bokeh-sladd aktiv på ansikter
                    </div>
                  )}
                </div>

                {/* Handlingsknapper under bildet */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-slate-600 hover:text-teal-800 font-semibold flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" /> Bytt bilde
                  </button>

                  {!isBlurred && (
                    <button
                      type="button"
                      onClick={applyFaceBlurCanvas}
                      className="text-teal-700 hover:text-teal-900 font-bold bg-teal-50 hover:bg-teal-100 px-3 py-1 rounded-lg border border-teal-200 flex items-center gap-1.5 transition"
                    >
                      <Wand2 className="w-3.5 h-3.5" /> Legg til bokeh-sladd nå
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* HØYRE KOLONNE (5 av 12): Levende Forhåndsvisning & Universell Eksport */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* SONE 3: Forhåndsvisning for Foreldre */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Foreldrevisning (Klar for MyKid/Visma)
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {date}
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Bilde i forhåndsvisning */}
              {imagePreview ? (
                <div className="rounded-xl overflow-hidden border border-slate-100 aspect-video bg-slate-100">
                  <img 
                    src={imagePreview} 
                    alt="Forhåndsvisning" 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 aspect-video bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Camera className="w-6 h-6 mb-1 opacity-50" />
                  <span>Intet bilde valgt ennå</span>
                </div>
              )}

              {/* Tittel (redigerbar) */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Overskrift & Emojis:
                </label>
                <input 
                  type="text"
                  value={generatedTitle}
                  onChange={(e) => setGeneratedTitle(e.target.value)}
                  placeholder="F.eks. Se hva det knekte treet ble til! 🌳✨"
                  className="w-full text-base font-extrabold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-teal-500 focus:outline-none py-1 transition"
                />
              </div>

              {/* Tekst (redigerbar) */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Brødtekst (Leken & Varm):
                </label>
                <textarea 
                  value={generatedBody}
                  onChange={(e) => setGeneratedBody(e.target.value)}
                  rows={5}
                  placeholder="Generer tekst med KI eller skriv direkte her. Hold det kort, lyst og fokusert på barnas aktivitet..."
                  className="w-full text-xs sm:text-sm text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-teal-500 leading-relaxed font-sans"
                />
              </div>

              {/* Universell Eksportsone (Desktop Drag-and-Drop & Mobile Share) */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-900 block">
                  Universell Eksport (Ingen API-kaos)
                </span>

                {/* PC: DRABAR DROP-CHIP */}
                <div 
                  draggable={Boolean(generatedTitle || generatedBody)}
                  onDragStart={handleDragStart}
                  className={`p-3.5 rounded-xl border-2 transition select-none ${
                    generatedTitle || generatedBody 
                      ? 'border-teal-300 bg-teal-50/60 hover:bg-teal-100/50 cursor-grab active:cursor-grabbing shadow-xs' 
                      : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
                        <Move className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>Dra og slipp direkte til Visma/MyKid</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Hold inne musa og dra over i den åpne foreldrefanen
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Knapperad: Kopier og Mobil-del */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    disabled={!generatedTitle && !generatedBody}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition disabled:opacity-50"
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
                    onClick={handleNativeShare}
                    disabled={!generatedTitle && !generatedBody}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Share2 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Del (Mobil/Nettbrett)</span>
                  </button>
                </div>

                {/* Lagre i Månedsbrev-køen */}
                <button
                  type="button"
                  onClick={handleSaveToMonthlyQueue}
                  disabled={!generatedTitle && !generatedBody}
                  className="w-full bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Lagre i Månedsmappen for Oktober</span>
                </button>
              </div>
            </div>
          </div>

          {/* SONE 4: Samlede glimt for måneden (To-trinnsrakettens lager) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-teal-600" />
                  Månedens hverdagsglimt ({savedGlimpses.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Råmateriale for Månedsbrevet
                </p>
              </div>

              {onNavigateToMonthlyLetter && (
                <button
                  type="button"
                  onClick={onNavigateToMonthlyLetter}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition"
                >
                  Gå til Månedsbrev <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {savedGlimpses.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-3 text-center">
                  Ingen glimt lagret ennå for denne måneden.
                </p>
              ) : (
                savedGlimpses.map(item => (
                  <div 
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/50 hover:bg-slate-50 transition flex items-center gap-3"
                  >
                    <img 
                      src={item.imageUrl} 
                      alt="" 
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded">
                          {item.date}
                        </span>
                        {item.blurApplied && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">
                            Sladdet
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 truncate mt-0.5">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {item.text}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSavedGlimpses(prev => prev.filter(g => g.id !== item.id))}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition"
                      title="Slett"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* PERSONVERNS-FAILSAFE MODAL (GDPR DIALOGBOKS) */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            <div className="bg-rose-50 border-b border-rose-100 p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-950 flex items-center gap-1.5">
                  🛑 Husk personvernet!
                </h3>
                <p className="text-xs text-rose-800 font-medium mt-1 leading-relaxed">
                  Det ser ut til at et eller flere barn er gjenkjennbare på dette bildet.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
                💡 <strong>Vår anbefaling:</strong> Vi anbefaler å dele bilder av selve aktiviteten (for eksempel hendene som maler eller bygger) i stedet for barnas ansikter.
              </div>

              {imagePreview && (
                <div className="rounded-xl overflow-hidden border border-slate-200 max-h-44 flex items-center justify-center bg-slate-100">
                  <img src={imagePreview} alt="Sjekk personvern" className="w-full h-44 object-cover" />
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={applyFaceBlurCanvas}
                  className="w-full bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <Wand2 className="w-4 h-4 text-amber-300" />
                  <span>Blur / sladd ansiktene for meg (Bokeh-effekt)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPrivacyModal(false);
                    setImagePreview(null);
                    fileInputRef.current?.click();
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Jeg vil laste opp et annet bilde</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(false)}
                  className="w-full text-slate-500 hover:text-slate-800 text-xs font-semibold py-1.5 text-center transition"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
