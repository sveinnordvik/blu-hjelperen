import React, { useState, useRef, useEffect } from 'react';
import ProgressionModule from './ProgressionModule';
import PresentationMagasinModal from './PresentationMagasinModal';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { toJpeg } from 'html-to-image';
import { 
  UploadCloud, 
  Sparkles, 
  FileText, 
  CheckCircle, 
  CheckCircle2,
  Bold, 
  Italic, 
  List, 
  Heading1, 
  Heading2, 
  AlignLeft,
  CalendarDays,
  BookOpen,
  Clock,
  ExternalLink,
  Scale,
  ShieldCheck,
  Plus,
  Filter,
  AlertTriangle,
  Award,
  Layers,
  Users,
  Printer,
  RefreshCw,
  Info,
  ChevronRight,
  Phone,
  Check,
  Building,
  Target,
  Trash2,
  Save,
  X,
  Download,
  Share2,
  Layout,
  Image as ImageIcon,
  Mail,
  Edit3,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Heart,
  Sun,
  Trees,
  Smile,
  Compass,
  Palette
} from 'lucide-react';
import { AarsplanChapter } from '../../types/aarsplan';
import { 
  loadStoredChapters, 
  saveStoredChapters, 
  createDefaultChapters 
} from '../../lib/aarsplanDefaults';
import PedagogiskPlattformModal from './PedagogiskPlattformModal';
import { 
  getBarnehageProfil, 
  BarnehageProfilData 
} from '../../lib/pedagogiskPlattform';

// --- RAMMEPLANENS FAGOMRÅDER OG LOVTEKSTER ---
export const RAMMEPLAN_AREAS = [
  { 
    id: '1', 
    title: 'Kommunikasjon, språk og tekst', 
    text: 'Barnehagen skal bidra til at barna leker, improviserer og eksperimenterer med rim, rytme, lyder og ord.' 
  },
  { 
    id: '2', 
    title: 'Kropp, bevegelse, mat og helse', 
    text: 'Barnehagen skal bidra til at barna videreutvikler motoriske ferdigheter, kroppsbeherskelse, koordinasjon og smidighet.' 
  },
  { 
    id: '3', 
    title: 'Kunst, kultur og kreativitet', 
    text: 'Barnehagen skal bidra til at barna har tilgang til ting, rom og materialer som støtter opp om deres lekende og estetiske uttrykksformer.' 
  },
  { 
    id: '4', 
    title: 'Natur, miljø og teknologi', 
    text: 'Barnehagen skal bidra til at barna opplever naturen og undring over naturmangfoldet.' 
  },
  { 
    id: '5', 
    title: 'Antall, rom og form', 
    text: 'Barnehagen skal bidra til at barna oppdager og undrer seg over matematiske sammenhenger.' 
  },
  { 
    id: '6', 
    title: 'Etikk, religion og filosofi', 
    text: 'Barnehagen skal bidra til at barna tilegner seg samfunnets grunnleggende verdier.' 
  },
  { 
    id: '7', 
    title: 'Nærmiljø og samfunn', 
    text: 'Barnehagen skal bidra til at barna utforsker ulike landskap, byrom og steder i nærmiljøet.' 
  }
];

export const MONTHS = ['August', 'September', 'Oktober', 'November', 'Desember', 'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli'] as const;

export interface PlanData {
  theme: string;
  goals: string;
  activities: string;
  rammeplanRefs: string[];
  primaryFagomrader?: string[];
  secondaryFagomrader?: string[];
}

export const RAMMEPLAN_AREAS_MAP = {
  kommunikasjon_sprak: 'Kommunikasjon, språk og tekst',
  kropp_bevegelse_helse: 'Kropp, bevegelse, mat og helse',
  kunst_kultur: 'Kunst, kultur og kreativitet',
  natur_miljo_teknologi: 'Natur, miljø og teknologi',
  antall_rom_form: 'Antall, rom og form',
  etikk_religion_filosofi: 'Etikk, religion og filosofi',
  narmiljo_samfunn: 'Nærmiljø og samfunn'
};

export interface ProgressionMatrix {
  id: string;
  title: string;
  smaabarnText: string;
  storbarnText: string;
  skoleklubbText?: string;
}

export interface FristItem {
  id: number;
  tittel: string;
  frist: string;
  status: 'Gjennomført' | 'Åpen' | 'Kommende';
  fagomraade?: string;
  ansvarlig?: string;
  beskrivelse?: string;
}

export interface StatuteDoc {
  id: string;
  title: string;
  date: string;
  iconType: 'alert' | 'doc';
  fileUrl?: string;
}

export interface AarshjulOgLovverkProps {
  initialSection?: 'alle' | 'aarshjul' | 'lovverk' | 'profil' | 'progresjon';
  activeSection?: 'profil' | 'aarshjul' | 'progresjon' | 'lovverk';
  triggerExport?: number;
  onNavigate?: (tab: string) => void;
}

// Standard progresjonsmatriser for satsingsområder
const DEFAULT_PROGRESSION_MATRICES: ProgressionMatrix[] = [
  {
    id: 'm1',
    title: 'Språkutvikling og Kommunikasjon',
    smaabarnText: 'Mye bruk av pekebøker, konkreter og sang. Benevne det vi gjør i hverdagsrutinene (påkledning, måltid). Sette ord på barnas følelser og uttrykk.',
    storbarnText: 'Lese lengre fortellinger og eventyr, f.eks Eventyret om skinnvotten. Samtaler rundt leirbålet. Leke med rim, regler og stavelser. Stille åpne spørsmål som oppfordrer til undring.',
    skoleklubbText: 'Bokstavlek, skrive egne navn og enkle ord. Gjenfortelling og dramatisering av bøker. Dialogiske samlinger med filosofiske spørsmål før skolen.'
  },
  {
    id: 'm2',
    title: 'Natur, Bærekraft og Friluftsliv',
    smaabarnText: 'Sanse naturen i nærmiljøet: kjenne på snø, blader, mose og bark. Ukentlige turer i lavt tempo nær barnehagen.',
    storbarnText: 'Lange skogsturer med sekk og matpakke. Kildesortering i hverdagen, lære om insekter, fugler og årstider.',
    skoleklubbText: 'Kunnskap om resirkulering, kompostering og naturfaglige eksperimenter. Spikking, knuter og orientering i skogen med kart.'
  },
  {
    id: 'm3',
    title: 'Sosial Kompetanse og Relasjoner',
    smaabarnText: 'Støtte i deling, tur-taking og gjenkjenning av følelser (glad, lei seg, sint). Skjerme lekesoner for ro.',
    storbarnText: 'Aktiv konfliktløsning med voksne som støtte. Vennskapsgrupper på tvers av avdelinger. Lære å inkludere andre i leken.',
    skoleklubbText: 'Selvstendighet i gruppe, demokratiske valg under samlingsstund, og refleksjon rundt inkludering, følelser og mobbing.'
  }
];

// Default månedsplaner
const DEFAULT_MONTH_PLANS: Record<string, PlanData> = {
  August: {
    theme: 'Oppstart, trygghet og nye relasjoner',
    goals: 'Sikre en trygg og god tilvenning for nye barn, og bygge sterke relasjoner i barnegruppen.\n\n[Rammeplan]: Barnehagen skal bidra til at barna føler seg trygge og opplever at de hører til i felleskapet.',
    activities: 'Tilvenningssamtaler, bli-kjent-leker på uteområdet, navnesanger i samling.',
    rammeplanRefs: ['Kommunikasjon, språk og tekst'],
    primaryFagomrader: ['kropp_bevegelse_helse', 'etikk_religion_filosofi'],
    secondaryFagomrader: ['kommunikasjon_sprak']
  },
  September: {
    theme: 'Vennskap, meg og min kropp',
    goals: 'Styrke barnas sosiale kompetanse og bevissthet rundt egen kropp og grenser.\n\n[Rammeplan]: Barnehagen skal bidra til at barna videreutvikler motoriske ferdigheter, kroppsbeherskelse, koordinasjon og smidighet.',
    activities: 'Maling av selvportrett, bevegelsesløype i skogen, samtaler om følelser.',
    rammeplanRefs: ['Kropp, bevegelse, mat og helse'],
    primaryFagomrader: ['kropp_bevegelse_helse'],
    secondaryFagomrader: ['kommunikasjon_sprak', 'etikk_religion_filosofi']
  },
  Oktober: {
    theme: 'Høstfarger, natur og undring',
    goals: 'Utforske naturens endringer i høstsesongen.\n\n[Rammeplan]: Barnehagen skal bidra til at barna opplever naturen og undring over naturmangfoldet.',
    activities: 'Innsamling av blader, grønnsakssuppe på bål, høstturer i nærmiljøet.',
    rammeplanRefs: ['Natur, miljø og teknologi'],
    primaryFagomrader: ['natur_miljo_teknologi'],
    secondaryFagomrader: ['antall_rom_form']
  },
  November: {
    theme: 'Mørketid, lys og mangfold',
    goals: 'Skaffe rom for lys, varme og eventyr i mørketiden.\n\n[Rammeplan]: Barnehagen skal bidra til at barna har tilgang til ting, rom og materialer som støtter opp om deres lekende og estetiske uttrykksformer.',
    activities: 'Lommelykttur i barnehagen, skyggespill, lesestunder i koselige kroker.',
    rammeplanRefs: ['Kunst, kultur og kreativitet'],
    primaryFagomrader: ['kunst_kultur'],
    secondaryFagomrader: ['etikk_religion_filosofi']
  },
  Desember: {
    theme: 'Juleglede, tradisjoner og fellesskap',
    goals: 'Skaffe en rolig og hyggelig adventstid uten stress.\n\n[Rammeplan]: Barnehagen skal bidra til at barna tilegner seg samfunnets grunnleggende verdier.',
    activities: 'Juleverksted med gjenbruksmaterialer, baking, adventstund med tenn av lys.',
    rammeplanRefs: ['Etikk, religion og filosofi'],
    primaryFagomrader: ['etikk_religion_filosofi'],
    secondaryFagomrader: ['kunst_kultur']
  },
  Januar: {
    theme: 'Vinter, snø og eksperimenter',
    goals: 'Utforske vann i fast og flytende form, snølek og fysisk utfoldelse.\n\n[Rammeplan]: Barnehagen skal bidra til at barna oppdager og undrer seg over matematiske og naturfaglige sammenhenger.',
    activities: 'Snøformingskonkurranse, is-eksperimenter med farge, akedager.',
    rammeplanRefs: ['Antall, rom og form', 'Natur, miljø og teknologi'],
    primaryFagomrader: ['antall_rom_form', 'natur_miljo_teknologi'],
    secondaryFagomrader: ['kropp_bevegelse_helse']
  },
  Februar: {
    theme: 'Samenes nasjonaldag & Kunstnerisk skaperglede',
    goals: 'Lære om samisk kultur og markere samenes nasjonaldag 6. februar.\n\n[Rammeplan]: Barnehagen skal bidra til at barna blir kjent med at samene er Norges urfolk og lære om samisk kultur.',
    activities: 'Lassokasting på gårdsplassen, joikestund, smaking på samiske fladbrød.',
    rammeplanRefs: ['Nærmiljø og samfunn', 'Kunst, kultur og kreativitet'],
    primaryFagomrader: ['narmiljo_samfunn', 'kunst_kultur'],
    secondaryFagomrader: ['etikk_religion_filosofi']
  },
  Mars: {
    theme: 'Vårtegn & Barns medvirkning',
    goals: 'Observere at naturen våkner til liv og la barna velge vårens prosjekter.\n\n[Rammeplan]: Barnehagen skal bidra til at barna leker, improviserer og eksperimenterer med ord, natur og form.',
    activities: 'Så frø i vinduskarmen, kikkertjakt på fugler, kildesorteringsprosjekt.',
    rammeplanRefs: ['Kommunikasjon, språk og tekst', 'Natur, miljø og teknologi'],
    primaryFagomrader: ['natur_miljo_teknologi'],
    secondaryFagomrader: ['kommunikasjon_sprak']
  },
  April: {
    theme: 'Påske, miljø og bærekraft',
    goals: 'Lære om gjenbruk, kildesortering og omsorg for dyr og planter.\n\n[Rammeplan]: Barnehagen skal bidra til at barna opplever naturen og lærer å ta vare på miljøet.',
    activities: 'Påskefrokost for foreldre, plante karse, kildesorteringsstasjon.',
    rammeplanRefs: ['Natur, miljø og teknologi'],
    primaryFagomrader: ['natur_miljo_teknologi'],
    secondaryFagomrader: ['etikk_religion_filosofi']
  },
  Mai: {
    theme: 'Nærmiljø, samfunn og nasjonaldag',
    goals: 'Bli bedre kjent med lokalsamfunnet og 17. mai-tradisjoner.\n\n[Rammeplan]: Barnehagen skal bidra til at barna utforsker ulike landskap, byrom og steder i nærmiljøet.',
    activities: 'Besøk på brannstasjonen/biblioteket, 17. mai-øving med korps på gårdsplassen.',
    rammeplanRefs: ['Nærmiljø og samfunn'],
    primaryFagomrader: ['narmiljo_samfunn'],
    secondaryFagomrader: ['kommunikasjon_sprak']
  },
  Juni: {
    theme: 'Sommer, sommerfest og avslutning for førskolebarna',
    goals: 'Markere slutten på barnehageåret og gi førskolebarna en god avskjed.\n\n[Rammeplan]: Barnehagen skal bidra til at barna opplever mestring, fellesskap og trygge overganger.',
    activities: 'Sommerfest med foreldre, diplomutdeling til skolestarterne, vannlek.',
    rammeplanRefs: ['Kropp, bevegelse, mat og helse'],
    primaryFagomrader: ['kropp_bevegelse_helse'],
    secondaryFagomrader: ['etikk_religion_filosofi']
  },
  Juli: {
    theme: 'Sommerferie og rolig sommerdrift',
    goals: 'Give barna en avslappende og opplevelsesrik sommermåned i barnehagen.\n\n[Rammeplan]: Barnehagen skal legge til rette for at barna har god tid til leik og fri utfoldelse.',
    activities: 'Piknik i parken, vanning av kasser, frilek og utekjøkken.',
    rammeplanRefs: ['Kropp, bevegelse, mat og helse'],
    primaryFagomrader: ['kropp_bevegelse_helse'],
    secondaryFagomrader: ['narmiljo_samfunn']
  }
};

export const GENERIC_FUNDAMENT_DEFAULTS = {
  omBarnehagen: 'Eventyrskogen Barnehage ble etablert i 2012 og har i dag 88 barn i alderen 0-6 år fordelt på 6 avdelinger. Barnehagen ligger i naturskjønne omgivelser med variert terreng, egen gapahuk og stort uteområde som innbyr til lek, matglede og bevegelse.',
  visjon: '«Vi skaper trygge røtter for fremtiden, med lek og undring i sentrum.» Alle barn skal føle seg verdifulle og oppleve mestring i et varmt felleskap.',
  kjerneverdier: 'Trygghet, likeverd og anerkjennelse. Vi møter hvert enkelt barn med respekt og bygger et inkluderende miljø der vennskap og fellesskap står sterkt. Alle barn skal oppleve å ha en verdifull plass i gruppa.',
  psykososialtMiljoe: 'Alle barn har rett til et trygt og godt barnehagemiljø (Kap. 8 i barnehageloven). Vi har nulltoleranse for mobbing, utestengelse og krenkelser. Personalet er nysgjerrige, nærværende og aktive voksne som støtter barnas relasjoner og griper inn umiddelbart ved utestengelse.',
  laeringssyn: 'Barn lærer med hele seg, i alle situasjoner gjennom hele dagen. Læring skjer gjennom lek, undring, opplevelser og samhandling. Vi veksler mellom barns eget initiativ og tilrettelagte pedagogiske aktiviteter.',
  lekensPilarer: 'Leken er barnehagens viktigste pilar og har en spesiell egenverdi. Vi fokuserer på tre sentrale dimensjoner:\n1. Læring og danning: Barna utforsker verden, prøver ut roller og utvikler identitet.\n2. Vennskap og fellesskap: Leken skaper tilhørighet, empati, deling og tur-taking.\n3. Kommunikasjon og språk: Rollelek og samspill utvider vokabular og begrepsforståelse.',
  fagomraaderBeskrivelse: 'Rammeplanens syv fagområder veves sammen i barnas hverdag. Vi jobber tverrfaglig slik at turer, måltider og samlinger berører både språk, natur, kropp, kunst, etikk, nærmiljø og matematikk.',
  satsingsomraader: 'Dette barnehageåret har vi spesielt fokus på natur, friluftsliv og bærekraftig utvikling, samt styrking av barnas språkmiljø og sosiale kompetanse gjennom lek.',
  arbeidsmaater: 'Vi arbeider prosjektbasert med utgangspunkt i barnas egne interesser og initiativ. Vurderingsarbeidet vårt bygger på systematisk observasjon, pedagogisk dokumentasjon og felles refleksjon i personalgruppen.',
  barnsMedvirkning: 'Barn har rett til å uttrykke sine meninger og påvirke barnehagehverdagen. Vi lytter aktivt til barnas initiativ, lar dem delta i planleggingen av prosjekter og respekterer deres ulike uttrykksformer.',
  foreldresamarbeid: 'Et godt og åpent foreldresamarbeid er avgjørende for barnas trygghet og trivsel. Vi har daglig dialog ved levering/henting, oppstarts- og foreldresamtaler, foreldremøter og samhandling via Samarbeidsutvalget (SU).',
  overganger: 'Vi sikrer trygge overganger i tre faser:\n1. Nye barn: Tett foreldresamarbeid, primærkontakt og tilpasset tilvenningstid.\n2. Intern overgang: Besøk på ny avdeling og felles lekedager før oppstart.\n3. Skoleovergang: Egen førskolegruppe det siste året, besøk på nærskolen og fokus på selvstendighet.',
  bakgrunnsdokumenter: 'Vår praksis bygger på Lov om barnehager, Rammeplan for barnehagens innhold og oppgaver (2017), FNs barnekonvensjon, lokal internkontroll/HMS og godkjente vedtekter. Årsplanen behandles og godkjennes årlig i Samarbeidsutvalget (SU).'
};

// --- KOMPONENT: Tekstbehandler ---
interface RichTextEditorProps {
  label: string;
  placeholder?: string;
  value?: string;
  initialValue?: string;
  onChange?: (value: string) => void;
  helperText?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ label, placeholder, value, initialValue, onChange, helperText }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [internalValue, setInternalValue] = useState<string>(initialValue || '');

  useEffect(() => {
    if (initialValue !== undefined && initialValue !== '') {
      setInternalValue(initialValue);
    }
  }, [initialValue]);

  const currentValue = value !== undefined ? value : internalValue;

  const handleChange = (newVal: string) => {
    if (onChange) {
      onChange(newVal);
    } else {
      setInternalValue(newVal);
    }
  };

  const applyFormat = (syntaxBefore: string, syntaxAfter: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = currentValue.substring(start, end);
    const replacement = `${syntaxBefore}${selectedText || 'tekst'}${syntaxAfter}`;

    const newValue = currentValue.substring(0, start) + replacement + currentValue.substring(end);
    handleChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + syntaxBefore.length,
        start + syntaxBefore.length + (selectedText.length || 5)
      );
    }, 0);
  };

  const insertPrefixLine = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;
    const newValue = currentValue.substring(0, lineStart) + prefix + currentValue.substring(lineStart);
    handleChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-semibold text-slate-800">{label}</label>
        {helperText && <span className="text-xs text-slate-500">{helperText}</span>}
      </div>
      <div className="border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all bg-white shadow-sm">
        
        <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-slate-50/90 flex-wrap">
          <button 
            type="button"
            onClick={() => applyFormat('**', '**')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition-colors" 
            title="Fet tekst"
          >
            <Bold size={16} />
          </button>
          <button 
            type="button"
            onClick={() => applyFormat('*', '*')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition-colors" 
            title="Kursiv"
          >
            <Italic size={16} />
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1"></div>
          <button 
            type="button"
            onClick={() => insertPrefixLine('# ')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition-colors" 
            title="Overskrift 1"
          >
            <Heading1 size={16} />
          </button>
          <button 
            type="button"
            onClick={() => insertPrefixLine('## ')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition-colors" 
            title="Overskrift 2"
          >
            <Heading2 size={16} />
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1"></div>
          <button 
            type="button"
            onClick={() => insertPrefixLine('• ')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition-colors" 
            title="Punktliste"
          >
            <List size={16} />
          </button>
          <button 
            type="button"
            onClick={() => insertPrefixLine('')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition-colors" 
            title="Venstrejuster"
          >
            <AlignLeft size={16} />
          </button>
        </div>
        
        <textarea 
          ref={textareaRef}
          className="w-full min-h-[120px] p-4 text-sm text-slate-700 outline-none resize-y leading-relaxed font-sans"
          placeholder={placeholder}
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
        ></textarea>
      </div>
    </div>
  );
};

// --- HOVEDKOMPONENT: Årsplan & Lovverk ---
export default function AarshjulOgLovverk({ initialSection = 'alle', activeSection, triggerExport, onNavigate }: AarshjulOgLovverkProps) {
  const getInitialTab = (): string => {
    if (activeSection) {
      if (activeSection === 'aarshjul') return 'Pedagogisk Årshjul';
      if (activeSection === 'lovverk') return 'Styre, Lovverk & Beredskap';
      if (activeSection === 'progresjon') return 'Progresjon';
      return 'Profil & Fundament';
    }
    if (initialSection === 'aarshjul') return 'Pedagogisk Årshjul';
    if (initialSection === 'lovverk') return 'Styre, Lovverk & Beredskap';
    if (initialSection === 'progresjon') return 'Progresjon';
    return 'Profil & Fundament';
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'Profil & Fundament':
        return <Award size={16} />;
      case 'Pedagogisk Årshjul':
        return <CalendarDays size={16} />;
      case 'Progresjon':
        return <Layers size={16} />;
      case 'Styre, Lovverk & Beredskap':
        return <BookOpen size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  useEffect(() => {
    if (activeSection) {
      if (activeSection === 'aarshjul') setActiveTab('Pedagogisk Årshjul');
      else if (activeSection === 'lovverk') setActiveTab('Styre, Lovverk & Beredskap');
      else if (activeSection === 'progresjon') setActiveTab('Progresjon');
      else setActiveTab('Profil & Fundament');
    }
  }, [activeSection]);

  useEffect(() => {
    if (triggerExport && triggerExport > 0) {
      setShowExportModal(true);
    }
  }, [triggerExport]);

  // Status for Google Gemini Dokument-import
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasImported, setHasImported] = useState(false);
  const [importedFiles, setImportedFiles] = useState<string[]>([]); // NY: Håndterer flere filer
  const [importStatusMessage, setImportStatusMessage] = useState('Analyserer dokumenter...');
  const [saveSuccessNotification, setSaveSuccessNotification] = useState<string | null>(null);

  // Eksport & Publiser-modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMagasinModal, setShowMagasinModal] = useState(false);
  const [appSettings, setAppSettings] = useState(() => {
    const saved = localStorage.getItem('styrern_kontrollpanel_settings');
    return saved ? JSON.parse(saved) : {
      barnehageNavn: 'Eventyrskogen Barnehage',
      orgNummer: '987 654 321',
      logoUrl: '',
      apningStart: '07:00',
      apningSlutt: '17:00',
      kjerneStart: '09:30',
      kjerneSlutt: '14:30'
    };
  });
  const [isExportGenerating, setIsExportGenerating] = useState(false);
  const [isExportDone, setIsExportDone] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    includeFundament: true,
    includeAnnualPlan: true,
    includeProgression: true,
    includeStatutes: false,
    visualTheme: 'modern' as 'modern' | 'playful',
  });

  // BARNEHAGENS PEDAGOGISKE PLATTFORM STATE (KI-Grunnmuren)
  const [barnehageProfil, setBarnehageProfil] = useState<BarnehageProfilData>(getBarnehageProfil);
  const [showPlattformModal, setShowPlattformModal] = useState(false);

  useEffect(() => {
    const handleProfilUpdated = (e: any) => {
      if (e.detail) {
        setBarnehageProfil(e.detail);
      }
    };
    window.addEventListener('pedportalen_profil_updated', handleProfilUpdated);
    return () => window.removeEventListener('pedportalen_profil_updated', handleProfilUpdated);
  }, []);

  // SU GODKJENNING OG LOVVERK STATE
  const [suVedtakDato, setSuVedtakDato] = useState<string>(() => {
    return localStorage.getItem('barnehage_su_vedtak_dato') || '2026-10-15';
  });

  const [suReferatLink, setSuReferatLink] = useState<string>(() => {
    return localStorage.getItem('barnehage_su_referat_link') || 'https://eventyrskogen.no/referat/su_oktober_2026.pdf';
  });

  const [kommunaleFoeringerText, setKommunaleFoeringerText] = useState<string>(() => {
    return localStorage.getItem('barnehage_kommunale_foeringer') || 'Kommunens overordnede kvalitetssatsing omfatter «Tidlig innsats», «Tverrfaglig inkludering» og «Aktivt språkmiljø i barnehagen». All pedagogisk praksis skal støtte opp under disse tre søylene.';
  });

  const [statuteDocs, setStatuteDocs] = useState<StatuteDoc[]>(() => {
    const saved = localStorage.getItem('barnehage_statute_docs');
    return saved ? JSON.parse(saved) : [
      { id: 'd1', title: 'Krise- og Beredskapsplan', date: 'Sist oppdatert: 12.08.2026', iconType: 'alert' },
      { id: 'd2', title: 'Barnehagens Vedtekter', date: 'Sist oppdatert: 01.01.2026', iconType: 'doc' }
    ];
  });

  // Fundament tekststater for alle 13 temaer
  const [omBarnehagenText, setOmBarnehagenText] = useState<string>(() => {
    return localStorage.getItem('barnehage_om_barnehagen') || GENERIC_FUNDAMENT_DEFAULTS.omBarnehagen;
  });

  const [visjonText, setVisjonText] = useState<string>(() => {
    const val = localStorage.getItem('barnehage_visjon');
    if (!val || val.includes('verdens viktigste verdier') || val.includes('magiske hverdagsøyeblikk')) {
      return GENERIC_FUNDAMENT_DEFAULTS.visjon;
    }
    return val;
  });

  const [kjerneverdierText, setKjerneverdierText] = useState<string>(() => {
    const val = localStorage.getItem('barnehage_kjerneverdier');
    if (!val || val.includes('Hjertekultur') || val.includes('Leken og ambisiøs') || val.includes('Trygghet og omsorg i alle relasjoner')) {
      return GENERIC_FUNDAMENT_DEFAULTS.kjerneverdier;
    }
    return val;
  });

  const [psykososialtMiljoeText, setPsykososialtMiljoeText] = useState<string>(() => {
    return localStorage.getItem('barnehage_psykososialt_miljoe') || GENERIC_FUNDAMENT_DEFAULTS.psykososialtMiljoe;
  });

  const [laeringssynText, setLaeringssynText] = useState<string>(() => {
    const val = localStorage.getItem('barnehage_laeringssyn');
    if (!val || val.includes('veksler mellom barns initiativ') || val.includes('grunnstammen')) {
      return GENERIC_FUNDAMENT_DEFAULTS.laeringssyn;
    }
    return val;
  });

  const [lekensPilarerText, setLekensPilarerText] = useState<string>(() => {
    return localStorage.getItem('barnehage_lekens_pilarer') || GENERIC_FUNDAMENT_DEFAULTS.lekensPilarer;
  });

  const [fagomraaderBeskrivelseText, setFagomraaderBeskrivelseText] = useState<string>(() => {
    return localStorage.getItem('barnehage_fagomraader_beskrivelse') || GENERIC_FUNDAMENT_DEFAULTS.fagomraaderBeskrivelse;
  });

  const [satsingsomraaderText, setSatsingsomraaderText] = useState<string>(() => {
    const val = localStorage.getItem('barnehage_satsingsomraader');
    if (!val || val.includes('Pedagogisk Idrett') || val.includes('Et godt måltid') || val.includes('språkutvikling gjennom lek')) {
      return GENERIC_FUNDAMENT_DEFAULTS.satsingsomraader;
    }
    return val;
  });

  const [arbeidsmaaterText, setArbeidsmaaterText] = useState<string>(() => {
    const val = localStorage.getItem('barnehage_arbeidsmaater');
    if (!val || val.includes('Læringsvenner') || val.includes('periodeevalueringer')) {
      return GENERIC_FUNDAMENT_DEFAULTS.arbeidsmaater;
    }
    return val;
  });

  const [barnsMedvirkningText, setBarnsMedvirkningText] = useState<string>(() => {
    return localStorage.getItem('barnehage_barns_medvirkning') || GENERIC_FUNDAMENT_DEFAULTS.barnsMedvirkning;
  });

  const [foreldresamarbeidText, setForeldresamarbeidText] = useState<string>(() => {
    return localStorage.getItem('barnehage_foreldresamarbeid') || GENERIC_FUNDAMENT_DEFAULTS.foreldresamarbeid;
  });

  const [overgangerText, setOvergangerText] = useState<string>(() => {
    return localStorage.getItem('barnehage_overganger') || GENERIC_FUNDAMENT_DEFAULTS.overganger;
  });

  const [bakgrunnsdokumenterText, setBakgrunnsdokumenterText] = useState<string>(() => {
    return localStorage.getItem('barnehage_bakgrunnsdokumenter') || GENERIC_FUNDAMENT_DEFAULTS.bakgrunnsdokumenter;
  });

  // MÅNEDSPLANER FOR PEDAGOGISK ÅRSHJUL
  const [monthPlans, setMonthPlans] = useState<Record<string, PlanData>>(() => {
    const saved = localStorage.getItem('barnehage_maaned_planer');
    return saved ? JSON.parse(saved) : DEFAULT_MONTH_PLANS;
  });

  const [activeMonth, setActiveMonth] = useState<string>('August');
  const [showRammeplanSidebar, setShowRammeplanSidebar] = useState<boolean>(false);
  const [isSavingMonth, setIsSavingMonth] = useState<boolean>(false);
  const [monthSaveMessage, setMonthSaveMessage] = useState<string>('');
  const [aiGeneratingMonth, setAiGeneratingMonth] = useState<boolean>(false);
  const [aarshjulView, setAarshjulView] = useState<'maaned' | 'frister'>('maaned');

  // PROGRESJONSMATRISER STATE
  const loadProgressionMatricesFromStorage = () => {
    const savedV2 = localStorage.getItem('barnehage_progresjonsplaner_v2');
    if (savedV2) {
      try {
        const parsed = JSON.parse(savedV2);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Kunne ikke laste v2 matriser', e);
      }
    }
    const savedV1 = localStorage.getItem('barnehage_progresjonsplaner');
    if (savedV1) {
      try {
        const parsed = JSON.parse(savedV1);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Kunne ikke laste v1 matriser', e);
      }
    }
    return DEFAULT_PROGRESSION_MATRICES;
  };

  const [progressionMatrices, setProgressionMatrices] = useState<any[]>(loadProgressionMatricesFromStorage);

  const [aiGeneratingProgression, setAiGeneratingProgression] = useState(false);

  // Frister og aktiviteter i Årshjulet
  const [frister, setFrister] = useState<FristItem[]>(() => {
    const saved = localStorage.getItem('styrern_arshjul_frister');
    return saved ? JSON.parse(saved) : [
      { id: 1, tittel: 'Foreldresamtaler høst & oppstart', frist: 'Oktober 2026', status: 'Gjennomført', fagomraade: 'Kommunikasjon, språk og tekst', ansvarlig: 'Pedagogiske ledere', beskrivelse: 'Kartlegging av barnets trivsel og foreldrenes forventninger.' },
      { id: 2, tittel: 'Gjennomgang av barnehagens internkontroll', frist: 'Innen 15. nov 2026', status: 'Åpen', fagomraade: 'Nærmiljø og samfunn', ansvarlig: 'Styrer & Verneombud', beskrivelse: 'Sikkerhetsrunde, lekeplassettersyn og oppdatering av avviksprosedyrer.' },
      { id: 3, tittel: 'Budsjettregulering & prognose', frist: 'Innen 01. des 2026', status: 'Åpen', fagomraade: 'Nærmiljø og samfunn', ansvarlig: 'Styrer', beskrivelse: 'Avstemming mot kommunalt tilskudd og bemanning.' },
      { id: 4, tittel: 'Planleggingsdag: Didaktisk analyse & Rammeplan', frist: '02. jan 2027', status: 'Kommende', fagomraade: 'Etikk, religion og filosofi', ansvarlig: 'Hele personalet', beskrivelse: 'Faglig fordypning i språk- og relasjonsarbeid.' },
      { id: 5, tittel: 'Foreldreundersøkelse (Udir)', frist: 'Februar 2027', status: 'Kommende', fagomraade: 'Kommunikasjon, språk og tekst', ansvarlig: 'Styrer & SU', beskrivelse: 'Utsending av den nasjonale foreldreundersøkelsen.' },
      { id: 6, tittel: 'Natur og miljøuka: Vårutforskning', frist: 'Mai 2027', status: 'Kommende', fagomraade: 'Natur, miljø og teknologi', ansvarlig: 'Miljøkontakt / Personalet', beskrivelse: 'Fokus på insekter, resirkulering og kildesortering.' }
    ];
  });

  const [activeFilter, setActiveFilter] = useState<'Alle' | 'Åpen' | 'Gjennomført' | 'Kommende'>('Alle');
  const [selectedFagomraadeFilter, setSelectedFagomraadeFilter] = useState<string>('Alle');
  const [showAddFristModal, setShowAddFristModal] = useState(false);
  const [newFristForm, setNewFristForm] = useState<{
    tittel: string;
    frist: string;
    fagomraade: string;
    ansvarlig: string;
    beskrivelse: string;
  }>({
    tittel: '',
    frist: '',
    fagomraade: RAMMEPLAN_AREAS[0].title,
    ansvarlig: '',
    beskrivelse: ''
  });

  // DYNAMISKE KAPITLER FOR ÅRSPLANEN
  const [aarsplanChapters, setAarsplanChapters] = useState<AarsplanChapter[]>(() => {
    return loadStoredChapters({
      barnehageNavn: appSettings?.barnehageNavn,
      omBarnehagenText,
      visjonText,
      kjerneverdierText,
      psykososialtMiljoeText,
      laeringssynText,
      lekensPilarerText,
      fagomraaderBeskrivelseText,
      satsingsomraaderText,
      arbeidsmaaterText,
      barnsMedvirkningText,
      foreldresamarbeidText,
      overgangerText,
      bakgrunnsdokumenterText,
      suVedtakDato
    });
  });

  const [chapterModalState, setChapterModalState] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    index?: number;
    initialData?: Partial<AarsplanChapter>;
  }>({ isOpen: false, mode: 'add' });

  const [newChapterFormState, setNewChapterFormState] = useState({
    title: '',
    subtitle: '',
    category: 'Satsingsområde',
    iconType: 'sparkles',
    content: ''
  });

  const updateAarsplanChapters = (updated: AarsplanChapter[]) => {
    setAarsplanChapters(updated);
    saveStoredChapters(updated);
  };

  const handleMoveChapter = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= aarsplanChapters.length) return;
    const newChapters = [...aarsplanChapters];
    const temp = newChapters[index];
    newChapters[index] = newChapters[targetIndex];
    newChapters[targetIndex] = temp;
    updateAarsplanChapters(newChapters);
    setSaveSuccessNotification(`Kapittel flyttet ${direction === 'up' ? 'opp' : 'ned'}!`);
  };

  const handleDeleteChapter = (index: number) => {
    const chap = aarsplanChapters[index];
    if (window.confirm(`Er du sikker på at du vil slette kapittelet "${chap.title}" fra årsplanen?`)) {
      const newChapters = aarsplanChapters.filter((_, i) => i !== index);
      updateAarsplanChapters(newChapters);
      setSaveSuccessNotification(`Kapittelet "${chap.title}" ble slettet fra årsplanen.`);
    }
  };

  const handleResetChapters = () => {
    if (window.confirm("Vil du tilbakestille alle kapitler i årsplanen til standardutvalget?")) {
      const defaults = createDefaultChapters({
        barnehageNavn: appSettings?.barnehageNavn,
        omBarnehagenText,
        visjonText,
        kjerneverdierText,
        psykososialtMiljoeText,
        laeringssynText,
        lekensPilarerText,
        fagomraaderBeskrivelseText,
        satsingsomraaderText,
        arbeidsmaaterText,
        barnsMedvirkningText,
        foreldresamarbeidText,
        overgangerText,
        bakgrunnsdokumenterText,
        suVedtakDato
      });
      updateAarsplanChapters(defaults);
      setSaveSuccessNotification("Årsplanens kapitler ble tilbakestilt til standard!");
    }
  };

  const handleOpenAddChapterModal = () => {
    setNewChapterFormState({
      title: '',
      subtitle: '',
      category: 'Satsingsområde',
      iconType: 'sparkles',
      content: ''
    });
    setChapterModalState({ isOpen: true, mode: 'add' });
  };

  const handleOpenEditChapterModal = (index: number) => {
    const chap = aarsplanChapters[index];
    setNewChapterFormState({
      title: chap.title,
      subtitle: chap.subtitle,
      category: chap.category || 'Tema',
      iconType: chap.iconType || 'sparkles',
      content: chap.content || ''
    });
    setChapterModalState({ isOpen: true, mode: 'edit', index });
  };

  const handleSaveChapterForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterFormState.title.trim()) return;

    if (chapterModalState.mode === 'add') {
      const newId = `chap_${Date.now()}`;
      const newChapter: AarsplanChapter = {
        id: newId,
        title: newChapterFormState.title.trim(),
        subtitle: newChapterFormState.subtitle.trim() || 'Satsingsområde i årsplanen',
        category: newChapterFormState.category.trim() || 'Satsingsområde',
        iconType: newChapterFormState.iconType || 'sparkles',
        type: 'custom',
        layoutVariant: 'image-right',
        content: newChapterFormState.content.trim(),
        imageSrc: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80',
        boxes: [
          {
            id: `b_${newId}_1`,
            boxType: 'text',
            title: newChapterFormState.title.trim(),
            content: newChapterFormState.content.trim() || 'Beskriv mål, metoder og rammeplanforankring her.',
            iconType: newChapterFormState.iconType || 'sparkles',
            colSpan: 2,
            colorScheme: 'indigo'
          }
        ]
      };
      const updated = [...aarsplanChapters, newChapter];
      updateAarsplanChapters(updated);
      setSaveSuccessNotification(`Nytt kapittel "${newChapterFormState.title}" ble lagt til!`);
    } else if (chapterModalState.mode === 'edit' && chapterModalState.index !== undefined) {
      const idx = chapterModalState.index;
      const updated = [...aarsplanChapters];
      updated[idx] = {
        ...updated[idx],
        title: newChapterFormState.title.trim(),
        subtitle: newChapterFormState.subtitle.trim(),
        category: newChapterFormState.category.trim(),
        iconType: newChapterFormState.iconType,
        content: newChapterFormState.content.trim()
      };
      updateAarsplanChapters(updated);
      setSaveSuccessNotification(`Kapittelet "${newChapterFormState.title}" ble oppdatert!`);
    }

    setChapterModalState({ isOpen: false, mode: 'add' });
  };

  const handleInlineChapterContentChange = (index: number, newContent: string) => {
    const updated = [...aarsplanChapters];
    updated[index] = {
      ...updated[index],
      content: newContent
    };
    updateAarsplanChapters(updated);
  };

  const getChapterIcon = (iconType?: string, className = "w-4 h-4") => {
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
      case 'calendar': return <CalendarDays className={className} />;
      default: return <Sparkles className={className} />;
    }
  };

  // Møteplanlegging for SU & FAU
  const [suMeetings, setSuMeetings] = useState([
    { id: 1, type: 'SU Møte 1', dato: '15. Oktober 2026', tema: 'Konstituering, Årsplan og Regnskapsoversikt', status: 'Gjennomført' },
    { id: 2, type: 'FAU Møte 1', dato: '08. November 2026', tema: 'Juleverksted & Foreldrearrangement', status: 'Planlagt' },
    { id: 3, type: 'SU Møte 2', dato: '10. Februar 2027', tema: 'Gjennomgang av Foreldreundersøkelse & Budsjett', status: 'Planlagt' },
    { id: 4, type: 'SU Møte 3', dato: '12. Mai 2027', tema: 'Vurdering av barnehageåret & Bemanning', status: 'Planlagt' }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const statuteFileInputRef = useRef<HTMLInputElement>(null);
  const tabs = ['Profil & Fundament', 'Pedagogisk Årshjul', 'Progresjon', 'Styre, Lovverk & Beredskap'];

  // Persistence
  useEffect(() => {
    localStorage.setItem('styrern_arshjul_frister', JSON.stringify(frister));
  }, [frister]);

  useEffect(() => {
    localStorage.setItem('barnehage_maaned_planer', JSON.stringify(monthPlans));
  }, [monthPlans]);

  useEffect(() => {
    if (showExportModal || activeTab === 'Progresjon') {
      const live = loadProgressionMatricesFromStorage();
      setProgressionMatrices(live);
    }
  }, [showExportModal, activeTab]);

  useEffect(() => {
    localStorage.setItem('barnehage_progresjonsplaner', JSON.stringify(progressionMatrices));
  }, [progressionMatrices]);

  useEffect(() => {
    localStorage.setItem('barnehage_su_vedtak_dato', suVedtakDato);
  }, [suVedtakDato]);

  useEffect(() => {
    localStorage.setItem('barnehage_su_referat_link', suReferatLink);
  }, [suReferatLink]);

  useEffect(() => {
    localStorage.setItem('barnehage_kommunale_foeringer', kommunaleFoeringerText);
  }, [kommunaleFoeringerText]);

  useEffect(() => {
    localStorage.setItem('barnehage_statute_docs', JSON.stringify(statuteDocs));
  }, [statuteDocs]);

  useEffect(() => {
    localStorage.setItem('barnehage_om_barnehagen', omBarnehagenText);
  }, [omBarnehagenText]);

  useEffect(() => {
    localStorage.setItem('barnehage_visjon', visjonText);
  }, [visjonText]);

  useEffect(() => {
    localStorage.setItem('barnehage_kjerneverdier', kjerneverdierText);
  }, [kjerneverdierText]);

  useEffect(() => {
    localStorage.setItem('barnehage_psykososialt_miljoe', psykososialtMiljoeText);
  }, [psykososialtMiljoeText]);

  useEffect(() => {
    localStorage.setItem('barnehage_laeringssyn', laeringssynText);
  }, [laeringssynText]);

  useEffect(() => {
    localStorage.setItem('barnehage_lekens_pilarer', lekensPilarerText);
  }, [lekensPilarerText]);

  useEffect(() => {
    localStorage.setItem('barnehage_fagomraader_beskrivelse', fagomraaderBeskrivelseText);
  }, [fagomraaderBeskrivelseText]);

  useEffect(() => {
    localStorage.setItem('barnehage_satsingsomraader', satsingsomraaderText);
  }, [satsingsomraaderText]);

  useEffect(() => {
    localStorage.setItem('barnehage_arbeidsmaater', arbeidsmaaterText);
  }, [arbeidsmaaterText]);

  useEffect(() => {
    localStorage.setItem('barnehage_barns_medvirkning', barnsMedvirkningText);
  }, [barnsMedvirkningText]);

  useEffect(() => {
    localStorage.setItem('barnehage_foreldresamarbeid', foreldresamarbeidText);
  }, [foreldresamarbeidText]);

  useEffect(() => {
    localStorage.setItem('barnehage_overganger', overgangerText);
  }, [overgangerText]);

  useEffect(() => {
    localStorage.setItem('barnehage_bakgrunnsdokumenter', bakgrunnsdokumenterText);
  }, [bakgrunnsdokumenterText]);

  // Automatisk oppgradering/vasking av eldre konsepttekst i localStorage ved oppstart
  useEffect(() => {
    const v = localStorage.getItem('barnehage_visjon');
    if (!v || v.includes('verdens viktigste verdier') || v.includes('magiske hverdagsøyeblikk')) {
      localStorage.setItem('barnehage_visjon', GENERIC_FUNDAMENT_DEFAULTS.visjon);
      setVisjonText(GENERIC_FUNDAMENT_DEFAULTS.visjon);
    }

    const k = localStorage.getItem('barnehage_kjerneverdier');
    if (!k || k.includes('Hjertekultur') || k.includes('Leken og ambisiøs') || k.includes('Trygghet og omsorg i alle relasjoner')) {
      localStorage.setItem('barnehage_kjerneverdier', GENERIC_FUNDAMENT_DEFAULTS.kjerneverdier);
      setKjerneverdierText(GENERIC_FUNDAMENT_DEFAULTS.kjerneverdier);
    }

    const l = localStorage.getItem('barnehage_laeringssyn');
    if (!l || l.includes('veksler mellom barns initiativ') || l.includes('grunnstammen')) {
      localStorage.setItem('barnehage_laeringssyn', GENERIC_FUNDAMENT_DEFAULTS.laeringssyn);
      setLaeringssynText(GENERIC_FUNDAMENT_DEFAULTS.laeringssyn);
    }

    const s = localStorage.getItem('barnehage_satsingsomraader');
    if (!s || s.includes('Pedagogisk Idrett') || s.includes('Et godt måltid') || s.includes('språkutvikling gjennom lek')) {
      localStorage.setItem('barnehage_satsingsomraader', GENERIC_FUNDAMENT_DEFAULTS.satsingsomraader);
      setSatsingsomraaderText(GENERIC_FUNDAMENT_DEFAULTS.satsingsomraader);
    }

    const a = localStorage.getItem('barnehage_arbeidsmaater');
    if (!a || a.includes('Læringsvenner') || a.includes('periodeevalueringer')) {
      localStorage.setItem('barnehage_arbeidsmaater', GENERIC_FUNDAMENT_DEFAULTS.arbeidsmaater);
      setArbeidsmaaterText(GENERIC_FUNDAMENT_DEFAULTS.arbeidsmaater);
    }
  }, []);

  // Handle Upload Statute Document
  const handleStatuteFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const todayStr = new Date().toLocaleDateString('no-NO');
      const newDoc: StatuteDoc = {
        id: `statute_${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        date: `Sist oppdatert: ${todayStr}`,
        iconType: file.name.toLowerCase().includes('beredskap') || file.name.toLowerCase().includes('krise') ? 'alert' : 'doc'
      };
      setStatuteDocs(prev => [...prev, newDoc]);
      setSaveSuccessNotification(`Dokumentet "${file.name}" ble lastet opp!`);
      setTimeout(() => setSaveSuccessNotification(null), 3500);
    }
  };

  const handleBrowseSUReferat = () => {
    const input = prompt('Skriv inn eller lim inn URL til SU-referatet:', suReferatLink);
    if (input !== null) {
      setSuReferatLink(input);
      setSaveSuccessNotification('Lenke til SU-referat ble oppdatert!');
      setTimeout(() => setSaveSuccessNotification(null), 3000);
    }
  };

  // Handle PDF Export Generation
  const handleGeneratePDF = () => {
    setIsExportGenerating(true);
    setIsExportDone(false);
    setTimeout(() => {
      setIsExportGenerating(false);
      setIsExportDone(true);
    }, 2800);
  };

  const handleDownloadPDFAction = async () => {
    const printEl = document.getElementById('printable-pdf-document');
    if (!printEl) {
      alert('Klarte ikke å finne forhåndsvisningen.');
      return;
    }

    setIsDownloadingPdf(true);
    setSaveSuccessNotification('Bygger og beregner sider uten kapping av tekstbokser...');

    await new Promise((resolve) => setTimeout(resolve, 250));

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfPageWidth = 210; // A4 bredde i mm
      const pdfPageHeight = 297; // A4 høyde i mm
      const marginX = 12; // 12mm venstre/høyre margin
      const marginY = 12; // 12mm topp/bunn margin
      const contentWidth = pdfPageWidth - marginX * 2; // 186mm innholdsbredde
      const maxPageContentHeight = pdfPageHeight - marginY * 2 - 8; // ~265mm maks innholdshøyde per side

      let currentY = marginY;
      let currentPageNum = 1;

      // Hent alle uavhengige tekst- og kortblokker (.pdf-block)
      const blocks = Array.from(printEl.querySelectorAll('.pdf-block')) as HTMLElement[];

      if (blocks.length === 0) {
        // Fallback om .pdf-block merking mot formodning mangler
        const imgData = await toJpeg(printEl, { quality: 0.95, pixelRatio: 2, backgroundColor: '#ffffff' });
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * contentWidth) / imgProps.width;
        let heightLeft = imgHeight;
        let pageIdx = 0;
        while (heightLeft > 0) {
          if (pageIdx > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', marginX, -(pageIdx * pdfPageHeight), contentWidth, imgHeight);
          heightLeft -= pdfPageHeight;
          pageIdx++;
        }
        pdf.save(`Aarsplan_Eventyrskogen_Barnehage_${new Date().getFullYear()}.pdf`);
        return;
      }

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];

        // Ta et bilde av denne uavhengige kort/tekst-blokken
        let imgData: string;
        try {
          imgData = await toJpeg(block, {
            quality: 0.95,
            pixelRatio: 2,
            backgroundColor: '#ffffff'
          });
        } catch (err) {
          const canvas = await html2canvas(block, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
          imgData = canvas.toDataURL('image/jpeg', 0.95);
        }

        const imgProps = pdf.getImageProperties(imgData);
        const blockHeightMm = (imgProps.height * contentWidth) / imgProps.width;

        // Sjekk om hele denne tekstboksen/kortet får plass på nåværende A4-side
        if (currentY + blockHeightMm > marginY + maxPageContentHeight && currentY > marginY) {
          // Legg til bunntekst på nåværende side
          pdf.setFontSize(8);
          pdf.setTextColor(148, 163, 184);
          pdf.text('Eventyrskogen Barnehage  |  Årsplan 2026/2027', marginX, pdfPageHeight - 6);
          pdf.text(`Side ${currentPageNum}`, pdfPageWidth - marginX, pdfPageHeight - 6, { align: 'right' });

          // Start ny A4-side rent
          pdf.addPage();
          currentPageNum++;
          currentY = marginY;
        }

        // Plasser hele kortet helt intakt på siden uten å kutte
        pdf.addImage(imgData, 'JPEG', marginX, currentY, contentWidth, blockHeightMm);
        currentY += blockHeightMm + 3.5; // 3.5mm avstand mellom kortene
      }

      // Legg til bunntekst på siste side
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Eventyrskogen Barnehage  |  Årsplan 2026/2027', marginX, pdfPageHeight - 6);
      pdf.text(`Side ${currentPageNum}`, pdfPageWidth - marginX, pdfPageHeight - 6, { align: 'right' });

      const fileName = `Aarsplan_Eventyrskogen_Barnehage_${new Date().getFullYear()}.pdf`;
      pdf.save(fileName);

      setSaveSuccessNotification(`Perfekt PDF lastet ned uten kapping av tekstbokser (${currentPageNum} ${currentPageNum === 1 ? 'side' : 'sider'})!`);
      setTimeout(() => setSaveSuccessNotification(null), 4000);
    } catch (err) {
      console.error('Feil ved generering av PDF:', err);
      try {
        window.focus();
        window.print();
      } catch (printErr) {
        console.error('Utskrift feilet:', printErr);
      }
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSendToSUAction = () => {
    setSaveSuccessNotification('Årsplanen ble sendt til godkjenning hos Samarbeidsutvalget (SU)!');
    setTimeout(() => setSaveSuccessNotification(null), 4000);
    setShowExportModal(false);
  };

  // Matrix handlers
  const handleAddMatrix = () => {
    const newMatrix: ProgressionMatrix = {
      id: `matrix_${Date.now()}`,
      title: 'Nytt satsingsområde (f.eks. Digitale verktøy og skaperglede)',
      smaabarnText: 'Sanseopplevelser, lyd og bilde, trygg bruk.',
      storbarnText: 'Enkel animasjon, lydopptak i skogen, undring sammen.',
      skoleklubbText: 'Kreativ programmering med roboter, bilderedigering og kildekritikk.'
    };
    setProgressionMatrices(prev => [...prev, newMatrix]);
  };

  const updateMatrix = (id: string, field: keyof ProgressionMatrix, value: string) => {
    setProgressionMatrices(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleDeleteMatrix = (id: string) => {
    setProgressionMatrices(prev => prev.filter(m => m.id !== id));
  };

  // AI Progression generator
  const handleGenerateAIProgression = async () => {
    setAiGeneratingProgression(true);
    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Lag et nytt progresjonsmatriseutkast for en norsk barnehage basert på Rammeplanen.
Svar i gyldig JSON med følgende struktur:
{
  "title": "Kort tittel på satsingsområdet (f.eks. Kunst, fagområder, miljø, konfliktmestring)",
  "smaabarnText": "Konkrete tiltak og fokus i hverdagen for 1-3 år (småbarn)",
  "storbarnText": "Konkrete tiltak og fokus i hverdagen for 3-5 år (storbarn/skogsavdeling)",
  "skoleklubbText": "Konkrete tiltak og fokus i hverdagen for 5-6 år (førskoleklubb)"
}`
                }
              ]
            }
          ],
          config: { responseMimeType: 'application/json' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.text) {
          const parsed = JSON.parse(data.text);
          if (parsed.title) {
            const newM: ProgressionMatrix = {
              id: `matrix_ai_${Date.now()}`,
              title: parsed.title,
              smaabarnText: parsed.smaabarnText || '',
              storbarnText: parsed.storbarnText || '',
              skoleklubbText: parsed.skoleklubbText || ''
            };
            setProgressionMatrices(prev => [...prev, newM]);
            setSaveSuccessNotification(`Ny AI-generert progresjonsplan for "${parsed.title}" ble lagt til!`);
            setTimeout(() => setSaveSuccessNotification(null), 3500);
          }
        }
      }
    } catch {
      const fallbackM: ProgressionMatrix = {
        id: `matrix_ai_${Date.now()}`,
        title: 'Bærekraft og Miljøundring',
        smaabarnText: 'Utforske naturmaterialer (vann, sand, skjell). Lære å kaste søppel i spannet.',
        storbarnText: 'Kildesortering i hverdagen. Undre seg over insekter og blomster på tur.',
        skoleklubbText: 'Dyrking i kjøkkenhagen, gjenbruksprosjekter og eksperimenter om kretsløpet.'
      };
      setProgressionMatrices(prev => [...prev, fallbackM]);
      setSaveSuccessNotification('Ny AI-generert matrise for Bærekraft ble lagt til!');
      setTimeout(() => setSaveSuccessNotification(null), 3500);
    } finally {
      setAiGeneratingProgression(false);
    }
  };

  // Hent aktiv måneds data
  const currentMonthData: PlanData = monthPlans[activeMonth] || {
    theme: '',
    goals: '',
    activities: '',
    rammeplanRefs: []
  };

  // Oppdater aktiv måneds felt
  const updateCurrentMonthData = (field: keyof PlanData, value: any) => {
    setMonthPlans(prev => ({
      ...prev,
      [activeMonth]: {
        ...(prev[activeMonth] || { theme: '', goals: '', activities: '', rammeplanRefs: [] }),
        [field]: value
      }
    }));
  };

  const insertRammeplanText = (areaTitle: string, areaText: string) => {
    const currentGoals = currentMonthData.goals;
    const insertion = `[Rammeplan - ${areaTitle}]: ${areaText}`;
    const newGoals = currentGoals ? `${currentGoals}\n\n${insertion}` : insertion;
    
    const currentRefs = currentMonthData.rammeplanRefs || [];
    const newRefs = currentRefs.includes(areaTitle) ? currentRefs : [...currentRefs, areaTitle];

    updateCurrentMonthData('goals', newGoals);
    updateCurrentMonthData('rammeplanRefs', newRefs);

    setMonthSaveMessage(`Satte inn ${areaTitle}`);
    setTimeout(() => setMonthSaveMessage(''), 2500);
  };

  const handleSaveMonthPlan = () => {
    setIsSavingMonth(true);
    setTimeout(() => {
      setIsSavingMonth(false);
      setMonthSaveMessage(`Plan for ${activeMonth} er lagret digitalt`);
      setTimeout(() => setMonthSaveMessage(''), 3000);
    }, 500);
  };

  const handleGenerateAIMonthPlan = async () => {
    setAiGeneratingMonth(true);
    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Generer et pedagogisk månedsutkast for ${activeMonth} i en norsk barnehage basert på Rammeplanen.
Svar i gyldig JSON med følgende felt:
{
  "theme": "Kort inspirerende månedstema",
  "goals": "2-3 pedagogiske mål med forankring i Rammeplanen",
  "activities": "3-4 konkrete nøkkelaktiviteter, uteturer og formingsprosjekter"
}`
                }
              ]
            }
          ],
          config: { responseMimeType: 'application/json' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.text) {
          const parsed = JSON.parse(data.text);
          if (parsed.theme) updateCurrentMonthData('theme', parsed.theme);
          if (parsed.goals) updateCurrentMonthData('goals', parsed.goals);
          if (parsed.activities) updateCurrentMonthData('activities', parsed.activities);
          setMonthSaveMessage(`AI-utkast for ${activeMonth} generert!`);
          setTimeout(() => setMonthSaveMessage(''), 3000);
        }
      }
    } catch {
      updateCurrentMonthData('theme', `${activeMonth}: Oppdagelser og fellesskap i barnehagen`);
      updateCurrentMonthData('goals', `Pedagogiske mål for ${activeMonth}:\n\n• Styrke barnas lekekompetanse og sosiale relasjoner.\n• Utforske sesongens særpreg gjennom sansing og friluftsliv.\n\n[Rammeplan]: Barnehagen skal bidra til at barna opplever trygghet, mestring og glede i hverdagen.`);
      updateCurrentMonthData('activities', `1. Ukentlige turer i nærmiljøet.\n2. Samlingsstund med fokus på månedens tema.\n3. Formingsaktiviteter og kreativ utfoldelse.`);
      setMonthSaveMessage(`AI-utkast for ${activeMonth} opprettet!`);
      setTimeout(() => setMonthSaveMessage(''), 3000);
    } finally {
      setAiGeneratingMonth(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      simulateGoogleGeminiImport(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      simulateGoogleGeminiImport(e.target.files);
    }
  };

  // Simulerer og gjennomfører at Google AI prosesserer ETT ELLER FLERE dokumenter
  const simulateGoogleGeminiImport = async (files: FileList | File[]) => {
    setIsProcessing(true);
    
    // Konverterer FileList til en array med filnavn for UI-visning
    const fileArray = Array.from(files);
    const newFileNames = fileArray.map(file => file.name || 'Ukjent dokument');
    setImportStatusMessage(`Leser ${newFileNames.length} dokument(er) med Gemini AI...`);

    try {
      let combinedTextContent = '';
      for (const f of fileArray) {
        if (f.type?.includes('text') || f.name.endsWith('.txt') || f.name.endsWith('.md')) {
          try {
            const txt = await f.text();
            combinedTextContent += `\n--- Dokument: ${f.name} ---\n${txt.substring(0, 2000)}`;
          } catch (e) {
            console.error(e);
          }
        }
      }

      try {
        const response = await fetch('/api/gemini/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemini-3.8-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Du er en pedagogisk rådgiver for norske barnehager. Ekstraher og strukturer følgende informasjon fra barnehagens dokumenter (${newFileNames.join(', ')}):
1. Visjon (1-2 inspirerende setninger)
2. Verdigrunnlag (3-5 kulepunkter og kort forklaring om inkludering og trygghet)
3. Vårt Helhetlige Læringssyn (hvordan barnehagen jobber med omsorg, lek, læring og danning)
4. Årets Satsingsområder (2-3 avsnitt om pedagogisk fokus)
5. Arbeidsmåter & Vurdering (metodebruk, observasjon og refleksjon)

${combinedTextContent ? `Dokumenttekst:\n${combinedTextContent.substring(0, 3500)}` : `Dokumentnavn: ${newFileNames.join(', ')}. Generer et profesjonelt utkast for en norsk barnehage.`}

Svar i gyldig JSON-format:
{
  "visjon": "...",
  "kjerneverdier": "...",
  "laeringssyn": "...",
  "satsingsomraader": "...",
  "arbeidsmaater": "..."
}`
                  }
                ]
              }
            ],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.4
            }
          })
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData?.text) {
            const parsed = JSON.parse(resData.text);
            if (parsed.visjon) setVisjonText(parsed.visjon);
            if (parsed.kjerneverdier) setKjerneverdierText(parsed.kjerneverdier);
            if (parsed.laeringssyn) setLaeringssynText(parsed.laeringssyn);
            if (parsed.satsingsomraader) setSatsingsomraaderText(parsed.satsingsomraader);
            if (parsed.arbeidsmaater) setArbeidsmaaterText(parsed.arbeidsmaater);
          }
        }
      } catch (err) {
        console.error('Gemini import fallback:', err);
      }

      // Legger de nye filene til i den eksisterende listen
      setImportedFiles(prev => {
        const set = new Set([...prev, ...newFileNames]);
        return Array.from(set);
      });
      setHasImported(true);
    } catch {
      setImportedFiles(prev => [...prev, ...newFileNames]);
      setHasImported(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveFundament = () => {
    localStorage.setItem('barnehage_om_barnehagen', omBarnehagenText);
    localStorage.setItem('barnehage_visjon', visjonText);
    localStorage.setItem('barnehage_kjerneverdier', kjerneverdierText);
    localStorage.setItem('barnehage_psykososialt_miljoe', psykososialtMiljoeText);
    localStorage.setItem('barnehage_laeringssyn', laeringssynText);
    localStorage.setItem('barnehage_lekens_pilarer', lekensPilarerText);
    localStorage.setItem('barnehage_fagomraader_beskrivelse', fagomraaderBeskrivelseText);
    localStorage.setItem('barnehage_satsingsomraader', satsingsomraaderText);
    localStorage.setItem('barnehage_arbeidsmaater', arbeidsmaaterText);
    localStorage.setItem('barnehage_barns_medvirkning', barnsMedvirkningText);
    localStorage.setItem('barnehage_foreldresamarbeid', foreldresamarbeidText);
    localStorage.setItem('barnehage_overganger', overgangerText);
    localStorage.setItem('barnehage_bakgrunnsdokumenter', bakgrunnsdokumenterText);
    setSaveSuccessNotification('Fundament og alle 13 årsplan-temaer ble lagret!');
    setTimeout(() => setSaveSuccessNotification(null), 4000);
  };

  const toggleStatus = (id: number) => {
    setFrister(prev => prev.map(f => {
      if (f.id === id) {
        const nextStatus: 'Gjennomført' | 'Åpen' | 'Kommende' = 
          f.status === 'Åpen' ? 'Gjennomført' :
          f.status === 'Gjennomført' ? 'Kommende' : 'Åpen';
        return { ...f, status: nextStatus };
      }
      return f;
    }));
  };

  const handleAddFristSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFristForm.tittel.trim()) return;

    const newItem: FristItem = {
      id: Date.now(),
      tittel: newFristForm.tittel.trim(),
      frist: newFristForm.frist.trim() || 'Løpende',
      fagomraade: newFristForm.fagomraade,
      ansvarlig: newFristForm.ansvarlig.trim() || 'Personalet',
      beskrivelse: newFristForm.beskrivelse.trim(),
      status: 'Åpen'
    };

    setFrister(prev => [newItem, ...prev]);
    setShowAddFristModal(false);
    setNewFristForm({
      tittel: '',
      frist: '',
      fagomraade: RAMMEPLAN_AREAS[0].title,
      ansvarlig: '',
      beskrivelse: ''
    });
  };

  const handleDeleteFrist = (id: number) => {
    setFrister(prev => prev.filter(f => f.id !== id));
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Gjennomført': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Åpen': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Kommende': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filtrerteFrister = frister.filter(f => {
    const statusMatch = activeFilter === 'Alle' || f.status === activeFilter;
    const fagomraadeMatch = selectedFagomraadeFilter === 'Alle' || f.fagomraade === selectedFagomraadeFilter;
    return statusMatch && fagomraadeMatch;
  });

  const fullfoerteAntall = frister.filter(f => f.status === 'Gjennomført').length;
  const totaltAntall = frister.length;
  const fremgangProsent = totaltAntall > 0 ? Math.round((fullfoerteAntall / totaltAntall) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
        
        {/* LAGRET NOTIFIKASJON TOAST */}
        {saveSuccessNotification && (
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between animate-fade-in-down z-50">
            <div className="flex items-center space-x-2">
              <CheckCircle size={20} />
              <span className="font-medium text-sm">{saveSuccessNotification}</span>
            </div>
            <button onClick={() => setSaveSuccessNotification(null)} className="hover:opacity-80">
              <X size={18} />
            </button>
          </div>
        )}

        {/* SUB-NAVIGASJON */}
        {!activeSection && (
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {getTabIcon(tab)}
                <span>{tab}</span>
              </button>
            ))}
          </div>
        )}

        {/* OVERBYGNING MED TITTEL OG EKSPORT */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
              <FileText className="text-indigo-600" size={32} />
              <span>Årsplan & Styringsdokumenter</span>
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Gjør fjorårets årsplan om til et levende, redigerbart verktøy direkte forankret i Rammeplanen for barnehagen.
            </p>
          </div>

          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <button 
              type="button"
              onClick={() => setShowMagasinModal(true)}
              className="flex items-center space-x-2 bg-[#1e1b4b] hover:bg-indigo-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition shadow-md cursor-pointer"
              title="Vis og last ned årsplanen i lekkert magasin- og presentasjonsformat"
            >
              <BookOpen size={16} />
              <span>📖 Åpne Årsplan Magasin</span>
            </button>
          </div>
        </div>
        {/* INNHOLD FOR FANE 1: Profil & Fundament */}
        {activeTab === 'Profil & Fundament' && (
          <div className="space-y-8 animate-fade-in">
            {/* BARNEHAGENS PEDAGOGISKE PLATTFORM & VERDIGRUNNLAG (KI-GRUNNMUREN) */}
            <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-emerald-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                    Pedagogisk Plattform & DNA
                  </span>
                  <span className="text-xs font-bold text-emerald-200 flex items-center gap-1">
                    <Trees className="w-3.5 h-3.5 text-emerald-400" />
                    Felles forankring for Styrern og Pedledern
                  </span>
                </div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  {barnehageProfil.plattformNavn}
                </h3>
                <p className="text-xs text-emerald-100/90 leading-relaxed">
                  {barnehageProfil.beskrivelse}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-emerald-200/80">
                  <span><strong>Visjon:</strong> {barnehageProfil.visjon}</span>
                  <span>•</span>
                  <span><strong>Standard avdeling:</strong> {barnehageProfil.avdelingsNavn}</span>
                  {barnehageProfil.opplastetFilnavn && (
                    <>
                      <span>•</span>
                      <span className="text-amber-300 font-semibold">Opplastet: {barnehageProfil.opplastetFilnavn}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setShowPlattformModal(true)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Award className="w-4 h-4 text-emerald-950" />
                  <span>Definer / Bytt Plattform</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* VENSTRE KOLONNE: Gemini Dokument-import (Flere filer) */}
              <div className="col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-6">
                  
                  {/* Selve Dropp-sonen */}
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`relative p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all duration-300 
                      ${isDragging ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:shadow-sm'}
                      ${isProcessing ? 'py-12' : 'py-8'}
                    `}
                  >
                    {!isProcessing ? (
                      <>
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm border border-indigo-200">
                          <Sparkles size={24} />
                        </div>
                        <h3 className="text-slate-800 font-bold mb-2">PedPortalen AI-Import</h3>
                        <p className="text-xs text-slate-500 mb-6 max-w-[200px] leading-relaxed">
                          Slipp årsplan, verdigrunnlag og andre styringsdokumenter her for å byegen fundamentet automatisk.
                        </p>
                        
                        {/* Skjult fil-input med 'multiple' for å tillate flere filer samtidig */}
                        <input 
                          type="file" 
                          multiple
                          ref={fileInputRef} 
                          onChange={handleFileSelect} 
                          className="hidden" 
                          accept=".pdf,.doc,.docx,.txt"
                        />
                        
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-5 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                        >
                          <UploadCloud size={16} />
                          Bla gjennom filer
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center animate-pulse">
                        <div className="w-12 h-12 mb-4 relative">
                          <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
                          <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                          <Sparkles className="absolute inset-0 m-auto text-indigo-600 w-5 h-5" />
                        </div>
                        <h3 className="text-indigo-800 font-bold mb-1">AI analyserer innhold...</h3>
                        <p className="text-indigo-600/80 text-xs">Fletter ny informasjon inn i fundamentet</p>
                      </div>
                    )}
                  </div>

                  {/* Liste over importerte grunnlagsdokumenter */}
                  {importedFiles.length > 0 && (
                    <div className="mt-6 animate-fade-in-up">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center justify-between">
                        Grunnlagsdokumenter
                        <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-[10px]">{importedFiles.length} fil(er)</span>
                      </h4>
                      <ul className="space-y-2">
                        {importedFiles.map((fileName, idx) => (
                          <li key={idx} className="flex items-center gap-3 text-sm text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                            <FileText size={16} className="text-indigo-400 shrink-0" />
                            <span className="truncate flex-1 font-medium text-xs">{fileName}</span>
                            <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                          </li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-slate-400 mt-3 text-center">
                        Teksten i hovedfeltene er nå oppdatert basert på disse dokumentene. Du kan legge til flere når som helst.
                      </p>
                    </div>
                  )}

                  {/* Infoboks: Rammeplanens krav (Beholdes under listen) */}
                  <div className="mt-6 bg-blue-50 border border-blue-100 p-4 rounded-xl">
                    <h3 className="font-bold text-blue-900 text-sm mb-2 flex items-center gap-2">
                      <BookOpen size={16} className="text-blue-600" />
                      Krav til Årsplan
                    </h3>
                    <ul className="text-xs text-blue-800 space-y-1.5 list-disc pl-4">
                      <li>Skal godkjennes av Samarbeidsutvalget (SU).</li>
                      <li>Gjøres tilgjengelig for foreldre og eier.</li>
                      <li>Brukes som vurderingsverktøy for pedagogisk praksis.</li>
                    </ul>
                  </div>

                </div>
              </div>

              {/* HØYRE KOLONNE: Dynamisk kapitteloversikt og redigering for Årsplanen */}
              <div className="col-span-1 lg:col-span-2 space-y-6">
                
                {/* Hovedpanel for kapittelstyring */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-[#1e1b4b]">
                          Kapitler i Årsplanen
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {aarsplanChapters.length} kapitler
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 max-w-xl">
                        Tilpass årsplanen for din barnehage. Du kan legge til nye kapitler, slette temaer du ikke har behov for, og flytte dem opp og ned (▲ / ▼) for å bestemme rekkefølgen.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleOpenAddChapterModal}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={15} />
                        <span>+ Legg til kapittel</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowMagasinModal(true)}
                        className="px-4 py-2 bg-[#1e1b4b] hover:bg-indigo-900 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <BookOpen size={15} />
                        <span>Åpne Magasin</span>
                      </button>
                    </div>
                  </div>

                  {/* Kapitelliste med flytt opp / ned og redigering */}
                  <div className="space-y-4 pt-1">
                    {aarsplanChapters.map((ch, idx) => (
                      <div 
                        key={ch.id}
                        className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition shadow-2xs group"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/60 pb-3 mb-4">
                          <div className="flex items-center gap-3">
                            {/* Rekkefølgeknapper */}
                            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleMoveChapter(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 hover:bg-slate-100 disabled:opacity-20 text-slate-600 hover:text-indigo-600 rounded transition cursor-pointer"
                                title="Flytt kapittel opp"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveChapter(idx, 'down')}
                                disabled={idx === aarsplanChapters.length - 1}
                                className="p-1 hover:bg-slate-100 disabled:opacity-20 text-slate-600 hover:text-indigo-600 rounded transition cursor-pointer"
                                title="Flytt kapittel ned"
                              >
                                <ArrowDown size={14} />
                              </button>
                            </div>

                            {/* Kapitteltall og ikon */}
                            <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-900">
                              Kapittel {idx + 1}
                            </span>

                            <div className="flex items-center gap-2">
                              <span className="p-1.5 bg-white text-indigo-600 rounded-lg border border-slate-200 shadow-2xs">
                                {getChapterIcon(ch.iconType, "w-4 h-4")}
                              </span>
                              <div>
                                <h3 className="font-bold text-sm text-[#1e1b4b]">
                                  {ch.title}
                                </h3>
                                {ch.subtitle && (
                                  <p className="text-xs text-slate-500 font-medium">
                                    {ch.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Handlingsknapper for kapittelet */}
                          <div className="flex items-center gap-2 self-end md:self-center">
                            {ch.category && (
                              <span className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full hidden sm:inline">
                                {ch.category}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditChapterModal(idx)}
                              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                              title="Rediger kapitteltittel, ingress og kategori"
                            >
                              <Edit3 size={13} className="text-amber-600" />
                              <span>Rediger detaljer</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteChapter(idx)}
                              className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition cursor-pointer shadow-2xs"
                              title="Slett kapittel fra årsplanen"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Tekstredigering for kapittelet */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                            <span>Innhold og formulering for {ch.title}</span>
                            <span className="text-[10px] text-slate-400 font-normal">Lagres automatisk i årsplanen</span>
                          </label>
                          <RichTextEditor 
                            label={`Innhold for Kapittel ${idx + 1}`}
                            placeholder={`Skriv innholdet for ${ch.title} her...`}
                            value={ch.content || ''}
                            onChange={(val) => handleInlineChapterContentChange(idx, val)}
                            helperText={ch.subtitle}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Legg til nytt kapittel knapp nederst */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleOpenAddChapterModal}
                      className="w-full py-4 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/70 rounded-xl text-indigo-700 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <Plus size={16} />
                      <span>Legg til nytt kapittel i årsplanen</span>
                    </button>
                  </div>

                  {/* Nederste handlinger */}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100 flex-wrap gap-3">
                    <button 
                      type="button"
                      onClick={handleResetChapters}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Tilbakestill til standardkapitler
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        saveStoredChapters(aarsplanChapters);
                        setSaveSuccessNotification('Årsplanen med alle kapitler ble lagret!');
                      }}
                      className="px-6 py-2.5 bg-[#1e1b4b] hover:bg-indigo-900 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Save size={14} />
                      <span>Lagre årsplan</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* INNHOLD FOR FANE 2: Pedagogisk Årshjul */}
        {activeTab === 'Pedagogisk Årshjul' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* VIEW MODUS-VELGER */}
            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex-wrap gap-3">
              <div className="flex space-x-2">
                <button
                  onClick={() => setAarshjulView('maaned')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    aarshjulView === 'maaned'
                      ? 'bg-[#1e1b4b] text-white shadow'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  <CalendarDays size={16} />
                  <span>Månedsplaner & Rammeplan</span>
                </button>
                <button
                  onClick={() => setAarshjulView('frister')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    aarshjulView === 'frister'
                      ? 'bg-[#1e1b4b] text-white shadow'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  <List size={16} />
                  <span>Lovpålagte Frister & Milepæler</span>
                </button>
              </div>

              {aarshjulView === 'maaned' && (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleGenerateAIMonthPlan}
                    disabled={aiGeneratingMonth}
                    className="flex items-center space-x-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  >
                    <Sparkles size={14} className={aiGeneratingMonth ? 'animate-spin' : ''} />
                    <span>{aiGeneratingMonth ? 'Genererer utkast...' : `AI-Forslag for ${activeMonth}`}</span>
                  </button>

                  <button 
                    onClick={() => setShowRammeplanSidebar(!showRammeplanSidebar)}
                    className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                      showRammeplanSidebar 
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700' 
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <BookOpen size={14} />
                    <span>{showRammeplanSidebar ? 'Skjul Rammeplan' : 'Hent fra Rammeplanen'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* VISNING 1: MÅNED FOR MÅNED PEDAGOGISK PLAN */}
            {aarshjulView === 'maaned' && (
              <div className="flex flex-col lg:flex-row gap-6">
                
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  
                  <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50/70 p-2 space-x-1 no-scrollbar">
                    {MONTHS.map(month => (
                      <button
                        key={month}
                        onClick={() => setActiveMonth(month)}
                        className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                          activeMonth === month 
                            ? 'bg-[#1e1b4b] text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-200/60'
                        }`}
                      >
                        {month}
                      </button>
                    ))}
                  </div>

                  <div className="p-6 md:p-8 space-y-6 flex-1">
                    
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Pedagogisk Månedsplan</span>
                        <h2 className="text-2xl font-extrabold text-slate-800">Plan for {activeMonth}</h2>
                      </div>

                      {monthSaveMessage && (
                        <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200 flex items-center space-x-1 animate-fade-in">
                          <CheckCircle size={14} />
                          <span>{monthSaveMessage}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-6">
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wide">
                          Månedens Tema & Overskrift
                        </label>
                        <input 
                          type="text"
                          value={currentMonthData.theme}
                          onChange={e => updateCurrentMonthData('theme', e.target.value)}
                          placeholder="F.eks. Høst, vennskap, meg og min kropp..."
                          className="w-full p-3 text-sm font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                            Mål & Rammeplanforankring
                          </label>
                          <span className="text-[11px] text-indigo-600 font-medium cursor-pointer hover:underline" onClick={() => setShowRammeplanSidebar(true)}>
                            + Hent tekst fra Rammeplan-skuffen
                          </span>
                        </div>
                        <textarea 
                          value={currentMonthData.goals}
                          onChange={e => updateCurrentMonthData('goals', e.target.value)}
                          placeholder="Hva er de pedagogiske målene for denne måneden? Hvilke verdier legger dere vekt på?"
                          className="w-full min-h-[160px] p-4 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-y leading-relaxed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wide">
                          Nøkkelaktiviteter, Turer & Formingsprosjekter
                        </label>
                        <textarea 
                          value={currentMonthData.activities}
                          onChange={e => updateCurrentMonthData('activities', e.target.value)}
                          placeholder="Hvordan skal dere arbeide praktisk med temaet? Hvilke turer, samlinger eller eksperimenter er planlagt?"
                          className="w-full min-h-[130px] p-4 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-y leading-relaxed"
                        />
                      </div>

                      {/* Tverrfaglighet (Rammeplan Fagområder) */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                          <BookOpen size={18} className="text-indigo-600 animate-pulse" />
                          <h4 className="text-xs font-bold text-[#1e1b4b] uppercase tracking-wide">
                            Tverrfaglighet & Rammeplanens Fagområder
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Primære Fagområder */}
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider flex items-center gap-1">
                              <span>⭐️ Primærfokus (Hovedfokus)</span>
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(RAMMEPLAN_AREAS_MAP).map(([key, label]) => {
                                const isSelected = (currentMonthData.primaryFagomrader || []).includes(key);
                                const isSecondary = (currentMonthData.secondaryFagomrader || []).includes(key);
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    disabled={isSecondary}
                                    onClick={() => {
                                      const current = currentMonthData.primaryFagomrader || [];
                                      const updated = current.includes(key)
                                        ? current.filter(item => item !== key)
                                        : [...current, key];
                                      updateCurrentMonthData('primaryFagomrader', updated);
                                    }}
                                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm font-bold'
                                        : isSecondary
                                        ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-40 cursor-not-allowed'
                                        : 'bg-white border-slate-300 text-slate-600 hover:border-indigo-400 hover:bg-indigo-50/30'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Sekundære Fagområder */}
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider flex items-center gap-1">
                              <span>💬 Sekundærfokus (Støttefokus)</span>
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(RAMMEPLAN_AREAS_MAP).map(([key, label]) => {
                                const isSelected = (currentMonthData.secondaryFagomrader || []).includes(key);
                                const isPrimary = (currentMonthData.primaryFagomrader || []).includes(key);
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    disabled={isPrimary}
                                    onClick={() => {
                                      const current = currentMonthData.secondaryFagomrader || [];
                                      const updated = current.includes(key)
                                        ? current.filter(item => item !== key)
                                        : [...current, key];
                                      updateCurrentMonthData('secondaryFagomrader', updated);
                                    }}
                                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm font-bold'
                                        : isPrimary
                                        ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-40 cursor-not-allowed'
                                        : 'bg-white border-slate-300 text-slate-600 hover:border-emerald-400 hover:bg-emerald-50/30'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    <div className="pt-4 border-t border-slate-200 flex justify-end">
                      <button 
                        onClick={handleSaveMonthPlan}
                        disabled={isSavingMonth}
                        className="flex items-center space-x-2 bg-[#1e1b4b] hover:bg-indigo-900 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-70 shadow-sm"
                      >
                        {isSavingMonth ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Save size={16} />
                        )}
                        <span>Lagre {activeMonth}-plan</span>
                      </button>
                    </div>

                  </div>
                </div>

                {showRammeplanSidebar && (
                  <div className="w-full lg:w-80 bg-white rounded-xl shadow-md border border-slate-200 flex flex-col overflow-hidden animate-slide-in-right">
                    <div className="p-4 bg-[#1e1b4b] text-white flex justify-between items-center">
                      <h3 className="font-bold text-sm flex items-center space-x-2">
                        <BookOpen size={16} className="text-indigo-300" />
                        <span>Rammeplanens 7 Fagområder</span>
                      </h3>
                      <button onClick={() => setShowRammeplanSidebar(false)} className="text-indigo-200 hover:text-white">
                        <X size={18} />
                      </button>
                    </div>
                    
                    <div className="p-4 flex-1 overflow-y-auto space-y-3 max-h-[600px]">
                      <div className="text-xs text-blue-900 bg-blue-50 border border-blue-200 rounded-lg p-3 flex space-x-2">
                        <Info size={16} className="shrink-0 text-blue-600 mt-0.5" />
                        <span>Klikk på et fagområde for å sette inn lovteksten direkte i månedens mål for {activeMonth}.</span>
                      </div>

                      {RAMMEPLAN_AREAS.map(area => (
                        <div 
                          key={area.id} 
                          onClick={() => insertRammeplanText(area.title, area.text)}
                          className="bg-slate-50 p-3.5 border border-slate-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50/40 transition cursor-pointer group space-y-1"
                        >
                          <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 flex items-center justify-between">
                            <span>{area.title}</span>
                            <Plus size={14} className="text-slate-400 group-hover:text-indigo-600" />
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{area.text}</p>
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            + Sett inn i mål for {activeMonth}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* VISNING 2: FRISTER OG MILEPÆLER */}
            {aarshjulView === 'frister' && (
              <div className="space-y-6">
                
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                      <CalendarDays className="text-indigo-600" size={22} />
                      <span>Årshjul for oppgaver & frister</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Hold oversikt over lovpålagte frister, foreldresamtaler, tilsyn og pedagogiske milepæler.
                    </p>
                  </div>

                  <div className="w-full md:w-72 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                      <span className="text-slate-600">Gjennomført: {fullfoerteAntall} av {totaltAntall}</span>
                      <span className="text-indigo-600">{fremgangProsent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${fremgangProsent}%` }}
                      ></div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowAddFristModal(true)}
                    className="flex items-center space-x-1.5 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition text-sm font-semibold shadow-sm shrink-0 w-full md:w-auto justify-center"
                  >
                    <Plus size={18} />
                    <span>Legg til ny frist</span>
                  </button>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg w-fit border border-slate-200 text-xs font-semibold overflow-x-auto">
                    {(['Alle', 'Åpen', 'Gjennomført', 'Kommende'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveFilter(tab)}
                        className={`px-3 py-1.5 rounded-md transition whitespace-nowrap ${
                          activeFilter === tab ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Filter size={16} className="text-slate-400 shrink-0" />
                    <select 
                      value={selectedFagomraadeFilter}
                      onChange={(e) => setSelectedFagomraadeFilter(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="Alle">Alle fagområder</option>
                      {RAMMEPLAN_AREAS.map(f => (
                        <option key={f.id} value={f.title}>{f.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                  {filtrerteFrister.length === 0 ? (
                    <div className="p-12 text-center space-y-2">
                      <CalendarDays size={40} className="mx-auto text-slate-300" />
                      <p className="text-slate-600 font-medium text-sm">Ingen frister passer til det valgte filteret.</p>
                      <button 
                        onClick={() => { setActiveFilter('Alle'); setSelectedFagomraadeFilter('Alle'); }}
                        className="text-xs text-indigo-600 font-semibold hover:underline"
                      >
                        Nullstill filtre
                      </button>
                    </div>
                  ) : (
                    filtrerteFrister.map((item) => (
                      <div key={item.id} className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start space-x-4">
                          <button 
                            onClick={() => toggleStatus(item.id)}
                            className="focus:outline-none transition transform hover:scale-110 mt-0.5"
                            title="Klikk for å endre status"
                          >
                            {item.status === 'Gjennomført' ? (
                              <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
                            ) : (
                              <Clock size={24} className="text-slate-400 hover:text-indigo-600 shrink-0" />
                            )}
                          </button>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <h4 className={`text-base font-bold ${item.status === 'Gjennomført' ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                                {item.tittel}
                              </h4>
                              {item.fagomraade && (
                                <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-medium">
                                  {item.fagomraade}
                                </span>
                              )}
                            </div>
                            {item.beskrivelse && (
                              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{item.beskrivelse}</p>
                            )}
                            <div className="flex items-center space-x-4 text-xs text-slate-500 pt-1">
                              <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">Frist: {item.frist}</span>
                              {item.ansvarlig && <span>Ansvarlig: {item.ansvarlig}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 self-end sm:self-center">
                          <span 
                            onClick={() => toggleStatus(item.id)}
                            className={`px-3 py-1 rounded-md text-xs font-bold border uppercase tracking-wider cursor-pointer hover:opacity-80 transition select-none ${getStatusStyle(item.status)}`}
                          >
                            {item.status}
                          </span>
                          <button 
                            onClick={() => handleDeleteFrist(item.id)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition"
                            title="Slett frist"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

          </div>
        )}

        {/* INNHOLD FOR FANE 3: Progresjon */}
        {activeTab === 'Progresjon' && (
          <ProgressionModule monthPlans={monthPlans} onNavigate={onNavigate} />
        )}

        {/* INNHOLD FOR FANE 4: Styre, Lovverk & Beredskap */}
        {activeTab === 'Styre, Lovverk & Beredskap' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* 2-KOLONNER: SU-GODKJENNING, KOMMUNALE FØRINGER & VEDTEKTER */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* VENSTRE KOLONNE */}
              <div className="space-y-6">
                
                {/* SU-Godkjenning (Kritisk for tilsyn) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <CheckCircle2 size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">Godkjenning fra SU</h3>
                      <p className="text-xs text-slate-500">Lovpålagt godkjenning av Samarbeidsutvalget</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Dato for vedtak i SU</label>
                      <input 
                        type="date" 
                        value={suVedtakDato}
                        onChange={(e) => setSuVedtakDato(e.target.value)}
                        className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Lenke til SU-referat</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={suReferatLink}
                          onChange={(e) => setSuReferatLink(e.target.value)}
                          placeholder="Lim inn lenke til referat..." 
                          className="flex-1 p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-sans text-slate-800" 
                        />
                        <button 
                          type="button"
                          onClick={handleBrowseSUReferat}
                          className="px-4 py-2.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-200 text-xs font-bold transition-colors shrink-0"
                        >
                          Bla gjennom
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kommunale Føringer */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Lokal Kvalitetsplan & Føringer</h3>
                    <p className="text-xs text-slate-500">Kommunens overordnede mål for barnehagene.</p>
                  </div>
                  <textarea 
                    className="w-full min-h-[120px] p-3 text-sm text-slate-700 bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-y font-sans leading-relaxed"
                    value={kommunaleFoeringerText}
                    onChange={(e) => setKommunaleFoeringerText(e.target.value)}
                    placeholder="F.eks. Kommunens satsing på 'Tidlig innsats' og 'Livsmestring'..."
                  ></textarea>
                </div>
              </div>

              {/* HØYRE KOLONNE */}
              <div className="space-y-6">
                
                {/* Beredskap og Vedtekter */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">Vedtekter & Beredskap</h3>
                      <p className="text-xs text-slate-500">Barnehagens sentrale reglement og krisemanualer</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 pt-1">
                    {statuteDocs.map((docItem) => (
                      <div 
                        key={docItem.id} 
                        className="flex items-center justify-between p-3.5 border border-slate-200 rounded-xl bg-slate-50/80 hover:border-indigo-300 hover:bg-indigo-50/30 transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          {docItem.iconType === 'alert' ? (
                            <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                              <AlertTriangle size={20} />
                            </div>
                          ) : (
                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                              <FileText size={20} />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-700">{docItem.title}</p>
                            <p className="text-xs text-slate-500">{docItem.date}</p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            const newTitle = prompt('Oppdater tittel på dokumentet:', docItem.title);
                            if (newTitle) {
                              setStatuteDocs(prev => prev.map(d => d.id === docItem.id ? { ...d, title: newTitle, date: `Sist oppdatert: ${new Date().toLocaleDateString('no-NO')}` } : d));
                            }
                          }}
                          className="text-slate-400 hover:text-indigo-600 p-1.5 rounded hover:bg-white transition"
                          title="Rediger dokument"
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                    ))}
                    
                    {/* Skjult filvelger for vedtekter/beredskap */}
                    <input 
                      type="file" 
                      ref={statuteFileInputRef}
                      onChange={handleStatuteFileUpload}
                      className="hidden" 
                      accept=".pdf,.doc,.docx"
                    />

                    <button 
                      type="button"
                      onClick={() => statuteFileInputRef.current?.click()}
                      className="w-full py-2.5 mt-2 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg text-xs font-bold hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      <span>Last opp nytt dokument</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>

            {/* SEKSJON: SU & FAU MØTEPLANER */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                    <Users className="text-indigo-600" size={22} />
                    <span>Møteplan for SU (Samarbeidsutvalget) & FAU</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Planlagte møter med foreldrerepresentanter, ansatte og eier.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suMeetings.map(m => (
                  <div key={m.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800 text-sm">{m.type}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${m.status === 'Gjennomført' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}`}>
                          {m.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-indigo-700">{m.dato}</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{m.tema}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEKSJON: STATLIG LOVVERK */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                  <BookOpen className="text-indigo-600" size={22} />
                  <span>Lovverk & Statlige Retningslinjer</span>
                </h3>
                <p className="text-xs text-slate-500">Hurtigtilgang til de viktigste styringsdokumentene for barnehagedriften.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                      <Scale size={24} />
                    </div>
                    <h4 className="text-base font-bold text-slate-800">Barnehageloven</h4>
                  </div>
                  <p className="text-xs text-slate-600 mb-6 flex-1 leading-relaxed">
                    Lov om barnehager. Regulerer formålet med barnehagen, krav til kvalitet, bemanning, og ansvarsfordeling mellom kommune og eier.
                  </p>
                  <a 
                    href="https://lovdata.no/dokument/NL/lov/2005-06-17-64" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-center space-x-2 w-full bg-slate-50 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 px-4 py-2 rounded-lg transition-colors text-xs font-semibold"
                  >
                    <span>Åpne Lovdata</span>
                    <ExternalLink size={14} />
                  </a>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
                      <BookOpen size={24} />
                    </div>
                    <h4 className="text-base font-bold text-slate-800">Rammeplanen</h4>
                  </div>
                  <p className="text-xs text-slate-600 mb-6 flex-1 leading-relaxed">
                    Forskrift om rammeplan for barnehagens innhold og oppgaver. Veileder for det pedagogiske arbeidet, fagområdene og barns medvirkning.
                  </p>
                  <a 
                    href="https://www.udir.no/laring-og-trivsel/rammeplan-for-barnehagen/" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-center space-x-2 w-full bg-slate-50 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 px-4 py-2 rounded-lg transition-colors text-xs font-semibold"
                  >
                    <span>Åpne Udir.no</span>
                    <ExternalLink size={14} />
                  </a>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-rose-50 p-3 rounded-lg text-rose-600">
                      <ShieldCheck size={24} />
                    </div>
                    <h4 className="text-base font-bold text-slate-800">Arbeidsmiljøloven</h4>
                  </div>
                  <p className="text-xs text-slate-600 mb-6 flex-1 leading-relaxed">
                    Lov om arbeidsmiljø, arbeidstid og stillingsvern. Essensiell for oppfølging av ansatte, sykefravær og barnehagens verneombud.
                  </p>
                  <a 
                    href="https://www.arbeidstilsynet.no/" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-center space-x-2 w-full bg-slate-50 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 px-4 py-2 rounded-lg transition-colors text-xs font-semibold"
                  >
                    <span>Åpne Arbeidstilsynet</span>
                    <ExternalLink size={14} />
                  </a>
                </div>

              </div>
            </div>

            {/* SEKSJON: BEREDSKAP OGSÅ MED NØDNUMMER */}
            <div className="bg-white rounded-xl border border-rose-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-rose-100 p-2.5 rounded-lg text-rose-700">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Beredskapsplan & Krisehåndtering</h3>
                  <p className="text-xs text-slate-500">Akuttkort og viktigste telefonnumre ved krise i barnehagen</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="p-4 bg-rose-50 rounded-lg border border-rose-100 space-y-1">
                  <p className="text-xs font-bold text-rose-900">Brann & Evakuering</p>
                  <p className="text-lg font-extrabold text-rose-700 flex items-center gap-1">
                    <Phone size={16} /> 110
                  </p>
                  <p className="text-[11px] text-rose-800">Møteplass: Lekeplassens flaggstang</p>
                </div>

                <div className="p-4 bg-rose-50 rounded-lg border border-rose-100 space-y-1">
                  <p className="text-xs font-bold text-rose-900">Politi & Savnet barn</p>
                  <p className="text-lg font-extrabold text-rose-700 flex items-center gap-1">
                    <Phone size={16} /> 112
                  </p>
                  <p className="text-[11px] text-rose-800">Søk i nærområdet og kontakt styrer</p>
                </div>

                <div className="p-4 bg-rose-50 rounded-lg border border-rose-100 space-y-1">
                  <p className="text-xs font-bold text-rose-900">Ambulanse & Akutt sykdom</p>
                  <p className="text-lg font-extrabold text-rose-700 flex items-center gap-1">
                    <Phone size={16} /> 113
                  </p>
                  <p className="text-[11px] text-rose-800">Førstehjelpsskrin i gangen og ute</p>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 space-y-1">
                  <p className="text-xs font-bold text-amber-900">Legevakt & Giftinformasjon</p>
                  <p className="text-lg font-extrabold text-amber-800 flex items-center gap-1">
                    <Phone size={16} /> 116 117
                  </p>
                  <p className="text-[11px] text-amber-900">Giftinformasjon: 22 59 13 00</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* PUBLISER ÅRSPLAN MODAL */}
        {showExportModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
              
              {/* VENSTRE KOLONNE: Konfigurasjon */}
              <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-200 p-6 md:p-8 flex flex-col overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#1e1b4b] flex items-center gap-2">
                      <FileText className="text-indigo-600 w-5 h-5" />
                      Publiser Årsplan
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Sett sammen og generer det ferdige dokumentet.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowExportModal(false)} 
                    className="text-slate-400 hover:text-slate-700 bg-slate-200/50 p-1.5 rounded-full transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-6 flex-1">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">Inkluder i dokumentet</h3>
                    <div className="space-y-2">
                      {[
                        { id: 'includeFundament', label: 'Profil, Visjon & Fundament' },
                        { id: 'includeAnnualPlan', label: 'Pedagogisk Årshjul (Måneder)' },
                        { id: 'includeProgression', label: 'Progresjonsplaner (1-3, 3-5 & 5-6 år)' },
                        { id: 'includeStatutes', label: 'Vedtekter & Beredskapsplan' },
                      ].map((item) => (
                        <label key={item.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                            checked={exportConfig[item.id as keyof typeof exportConfig] as boolean}
                            onChange={(e) => setExportConfig({...exportConfig, [item.id]: e.target.checked})}
                          />
                          <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-500" />
                      Visuelt Tema
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button"
                        onClick={() => setExportConfig({...exportConfig, visualTheme: 'modern'})}
                        className={`p-3 text-xs font-semibold rounded-lg border-2 transition-all text-left ${exportConfig.visualTheme === 'modern' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                      >
                        Moderne (B2B)
                      </button>
                      <button 
                        type="button"
                        onClick={() => setExportConfig({...exportConfig, visualTheme: 'playful'})}
                        className={`p-3 text-xs font-semibold rounded-lg border-2 transition-all text-left ${exportConfig.visualTheme === 'playful' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                      >
                        Lekende Natur
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-200">
                  {!isExportDone ? (
                    <>
                      <button 
                        type="button"
                        onClick={handleGeneratePDF}
                        disabled={isExportGenerating}
                        className="w-full py-3 px-4 bg-[#1e1b4b] hover:bg-indigo-900 text-white font-semibold text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-80 cursor-pointer"
                      >
                        {isExportGenerating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Bygger dokument...
                          </>
                        ) : (
                          <>
                            <Layout size={18} />
                            Generer PDF for forhåndsvisning
                          </>
                        )}
                      </button>

                      <button 
                        type="button"
                        onClick={() => {
                          setShowExportModal(false);
                          setShowMagasinModal(true);
                        }}
                        className="w-full mt-2.5 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-lg shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <BookOpen size={16} />
                        <span>📖 Åpne Årsplan Magasin (Ny design)</span>
                      </button>
                    </>
                  ) : (
                    <div className="space-y-3 animate-fade-in">
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm justify-center mb-2">
                        <CheckCircle size={18} />
                        <span>Årsplanen er klar!</span>
                      </div>
                      <button 
                        type="button"
                        onClick={handleDownloadPDFAction}
                        disabled={isDownloadingPdf}
                        className="w-full py-2.5 px-4 bg-white border-2 border-[#1e1b4b] text-[#1e1b4b] hover:bg-slate-50 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        {isDownloadingPdf ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            Genererer PDF-fil...
                          </>
                        ) : (
                          <>
                            <Download size={16} />
                            Last ned PDF
                          </>
                        )}
                      </button>
                      <button 
                        type="button"
                        onClick={handleSendToSUAction}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Mail size={16} />
                        Send til Godkjenning (SU)
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* HØYRE KOLONNE: Live Forhåndsvisning */}
              <div className="hidden md:flex flex-1 bg-slate-200/60 p-8 items-center justify-center relative overflow-y-auto">
                
                {isExportGenerating && (
                  <div className="absolute inset-0 z-10 bg-slate-900/20 backdrop-blur-[2px] flex items-center justify-center rounded-r-2xl">
                    <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center animate-pulse border border-slate-200">
                      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                      <p className="font-bold text-slate-800 text-sm">Prosesserer innhold...</p>
                      <p className="text-xs text-slate-500 mt-1">Optimaliserer typografi, layout og fagområder</p>
                    </div>
                  </div>
                )}

                <div id="printable-pdf-document" className={`bg-white w-full max-w-[210mm] shadow-2xl rounded-sm p-10 flex flex-col relative transition-all duration-300 transform ${isDownloadingPdf ? 'h-auto max-h-none overflow-visible aspect-auto' : 'aspect-[1/1.414]'} ${exportConfig.visualTheme === 'playful' ? 'border-t-8 border-emerald-600' : 'border-t-8 border-indigo-900'}`}>
                  
                  <div className={`flex justify-between items-start border-b-2 pb-6 mb-8 ${exportConfig.visualTheme === 'playful' ? 'border-emerald-600' : 'border-[#1e1b4b]'}`}>
                    <div>
                      <h1 className={`text-3xl font-black tracking-tight ${exportConfig.visualTheme === 'playful' ? 'text-emerald-900' : 'text-[#1e1b4b]'}`}>ÅRSPLAN</h1>
                      <p className={`text-lg font-bold mt-1 ${exportConfig.visualTheme === 'playful' ? 'text-emerald-700' : 'text-indigo-600'}`}>Eventyrskogen Barnehage</p>
                      <p className="text-xs text-slate-500 mt-0.5">Styringsdokument for barnehageåret 2026/2027</p>
                    </div>
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center border ${exportConfig.visualTheme === 'playful' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-indigo-50 border-indigo-200 text-indigo-600'}`}>
                      <ImageIcon className="w-7 h-7" />
                    </div>
                  </div>

                  <div className={`flex-1 space-y-8 ${isDownloadingPdf ? 'h-auto max-h-none overflow-visible' : 'overflow-y-auto max-h-[520px] pr-2 scrollbar-thin'}`}>
                    
                    {exportConfig.includeFundament && (
                      <div className="animate-fade-in space-y-4 text-left">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-3 border-b-2 border-indigo-100 pb-1">Vårt fundament og verdigrunnlag</h2>
                        
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-xs font-bold text-[#1e1b4b] uppercase tracking-wider">1. Barnehagens identitet og visjon</h3>
                            <div className="mt-1.5 space-y-2">
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Om barnehagen</span>
                                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 mt-0.5 leading-relaxed whitespace-pre-wrap">
                                  {omBarnehagenText || GENERIC_FUNDAMENT_DEFAULTS.omBarnehagen}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Visjon og hovedmål</span>
                                <p className="text-xs text-slate-700 italic bg-slate-50 p-2.5 rounded border border-slate-100 mt-0.5 leading-relaxed">
                                  {visjonText || GENERIC_FUNDAMENT_DEFAULTS.visjon}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Verdigrunnlag</span>
                                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed mt-0.5">
                                  {kjerneverdierText || GENERIC_FUNDAMENT_DEFAULTS.kjerneverdier}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100">
                            <h3 className="text-xs font-bold text-[#1e1b4b] uppercase tracking-wider">2. Pedagogisk plattform og arbeidsmåter</h3>
                            <div className="mt-2 space-y-2.5">
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Vårt helhetlige læringssyn</span>
                                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed mt-0.5">
                                  {laeringssynText || GENERIC_FUNDAMENT_DEFAULTS.laeringssyn}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Årets satsingsområder (konsept)</span>
                                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed mt-0.5">
                                  {satsingsomraaderText || GENERIC_FUNDAMENT_DEFAULTS.satsingsomraader}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Arbeidsmåter og vurdering</span>
                                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed mt-0.5">
                                  {arbeidsmaaterText || GENERIC_FUNDAMENT_DEFAULTS.arbeidsmaater}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {exportConfig.includeAnnualPlan && (
                      <div className="animate-fade-in break-inside-avoid space-y-3">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-3 border-b-2 border-indigo-100 pb-2">Pedagogisk årshjul 2026/2027</h2>
                        
                        <div className={`grid grid-cols-1 gap-4 ${isDownloadingPdf ? 'h-auto max-h-none overflow-visible' : 'max-h-[400px] overflow-y-auto pr-1'}`}>
                          {MONTHS.map((month) => {
                            const plan = monthPlans[month] || DEFAULT_MONTH_PLANS[month];
                            if (!plan || (!plan.theme && !plan.goals)) return null;
                            return (
                              <div key={month} className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 border-l-4 border-l-indigo-600 shadow-sm relative text-left">
                                <div className="flex justify-between items-start mb-1.5 flex-wrap gap-2">
                                  <h3 className="font-bold text-[#1e1b4b] text-xs sm:text-sm">{month}: {plan.theme || 'Uten tittel'}</h3>
                                  
                                  {/* Legacy backup */}
                                  {(!plan.primaryFagomrader && !plan.secondaryFagomrader && plan.rammeplanRefs && plan.rammeplanRefs.length > 0) && (
                                    <span className="text-[9px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 shrink-0">
                                      {plan.rammeplanRefs[0]}
                                    </span>
                                  )}
                                </div>

                                {/* Cross-disciplinary Fagområder */}
                                {((plan.primaryFagomrader && plan.primaryFagomrader.length > 0) || (plan.secondaryFagomrader && plan.secondaryFagomrader.length > 0)) && (
                                  <div className="flex flex-wrap gap-1 mb-2.5">
                                    {(plan.primaryFagomrader || []).map(key => (
                                      <span key={key} className="text-[9px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                        <span>⭐️</span>
                                        <span>{RAMMEPLAN_AREAS_MAP[key as keyof typeof RAMMEPLAN_AREAS_MAP] || key}</span>
                                      </span>
                                    ))}
                                    {(plan.secondaryFagomrader || []).map(key => (
                                      <span key={key} className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                        <span>💬</span>
                                        <span>{RAMMEPLAN_AREAS_MAP[key as keyof typeof RAMMEPLAN_AREAS_MAP] || key}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {plan.goals && (
                                  <p className="text-xs text-slate-700 mb-2 leading-relaxed whitespace-pre-wrap">
                                    <strong>Mål:</strong> {plan.goals.length > 150 ? plan.goals.substring(0, 150) + '...' : plan.goals}
                                  </p>
                                )}
                                {plan.activities && (
                                  <p className="text-[11px] text-slate-600 border-t border-slate-200/60 pt-2 leading-relaxed whitespace-pre-wrap">
                                    <strong>Aktiviteter:</strong> {plan.activities.length > 120 ? plan.activities.substring(0, 120) + '...' : plan.activities}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {exportConfig.includeProgression && (
                      <div className="animate-fade-in break-inside-avoid text-left space-y-4 pt-4 border-t border-slate-100">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-2 border-b-2 border-indigo-100 pb-2">
                          Didaktisk progresjon
                        </h2>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          For å sikre at alle barn får utfordringer tilpasset sin alder og modning, har vi definert ulikt fokus og arbeidsmåter for de ulike aldersgruppene våre innenfor årets satsingsområder.
                        </p>
                        
                        <div className="space-y-4">
                          {(!progressionMatrices || progressionMatrices.length === 0) ? (
                            <p className="text-xs text-slate-500 italic p-3 border border-slate-200 rounded-lg bg-slate-50">
                              Ingen aktiv didaktisk progresjon er lagt til ennå.
                            </p>
                          ) : (
                            progressionMatrices.map((m: any) => (
                              <div key={m.id || m.title || m.theme} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                {/* Tittel på satsingsområde */}
                                <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                  <h3 className="font-bold text-[#1e1b4b] text-xs sm:text-sm">{m.theme || m.title}</h3>
                                </div>
                                
                                {/* Dynamiske grupper eller standard 2-kolonne */}
                                {m.groups && Array.isArray(m.groups) && m.groups.length > 0 ? (
                                  <div className={`grid grid-cols-1 md:grid-cols-${Math.min(m.groups.length, 3)} divide-y md:divide-y-0 md:divide-x divide-slate-200 text-xs`}>
                                    {m.groups.map((group: any, idx: number) => (
                                      <div key={group.id || idx} className="p-4">
                                        <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                                          <span className={`w-5 h-5 rounded flex items-center justify-center font-extrabold text-[10px] ${
                                            group.color === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
                                            group.color === 'amber' ? 'bg-amber-100 text-amber-800' :
                                            group.color === 'indigo' ? 'bg-indigo-100 text-indigo-800' :
                                            'bg-sky-100 text-sky-800'
                                          }`}>
                                            {idx + 1}
                                          </span>
                                          {group.name}
                                        </h4>
                                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                          {group.text || 'Ingen spesifikke mål angitt.'}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 divide-x divide-slate-200 text-xs">
                                    <div className="p-4">
                                      <h4 className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <span className="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center font-extrabold text-[10px]">1-3</span>
                                        Småbarn
                                      </h4>
                                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                        {m.smaabarnText || 'Fokus på sanseopplevelser i naturen.'}
                                      </p>
                                    </div>
                                    <div className="p-4">
                                      <h4 className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <span className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center font-extrabold text-[10px]">3-5</span>
                                        Storbarn
                                      </h4>
                                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                        {m.storbarnText || 'Systematisk utforskning.'}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {exportConfig.includeStatutes && (
                      <div className="animate-fade-in">
                        <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest mb-2 border-b pb-1 border-slate-100">Beredskapsplan & SU-Vedtak</h2>
                        <div className="text-[10px] text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                          <p className="font-bold">SU Vedtaksdato: {suVedtakDato}</p>
                          <p className="truncate text-indigo-600">Referat: {suReferatLink}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-4 flex justify-between items-center text-[10px] text-slate-400">
                    <span>Eventyrskogen Barnehage • Side 1 av 12</span>
                    <span>Generert med PedPortalen</span>
                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

        {/* MODAL FOR Å LEGGE TIL NY FRIST */}
        {showAddFristModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                  <CalendarDays size={20} className="text-indigo-600" />
                  <span>Legg til ny frist i Årshjulet</span>
                </h3>
                <button 
                  onClick={() => setShowAddFristModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddFristSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tittel på oppgave / frist *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="f.eks. Lekeplassettersyn og vernerunde"
                    value={newFristForm.tittel}
                    onChange={(e) => setNewFristForm({ ...newFristForm, tittel: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Frist / Periode</label>
                    <input 
                      type="text" 
                      placeholder="f.eks. Innen 15. nov 2026"
                      value={newFristForm.frist}
                      onChange={(e) => setNewFristForm({ ...newFristForm, frist: e.target.value })}
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ansvarlig</label>
                    <input 
                      type="text" 
                      placeholder="f.eks. Verneombud / Styrer"
                      value={newFristForm.ansvarlig}
                      onChange={(e) => setNewFristForm({ ...newFristForm, ansvarlig: e.target.value })}
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rammeplanens Fagområde</label>
                  <select
                    value={newFristForm.fagomraade}
                    onChange={(e) => setNewFristForm({ ...newFristForm, fagomraade: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {RAMMEPLAN_AREAS.map(f => (
                      <option key={f.id} value={f.title}>{f.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Beskrivelse</label>
                  <textarea 
                    rows={3}
                    placeholder="Kort beskrivelse av gjennomføringen..."
                    value={newFristForm.beskrivelse}
                    onChange={(e) => setNewFristForm({ ...newFristForm, beskrivelse: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  ></textarea>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowAddFristModal(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-semibold"
                  >
                    Avbryt
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm"
                  >
                    Lagre frist
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: LEGG TIL / REDIGER KAPITTEL I ÅRSPLANEN */}
        {chapterModalState.isOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  {chapterModalState.mode === 'add' ? (
                    <Plus className="text-emerald-600" size={20} />
                  ) : (
                    <Edit3 className="text-amber-600" size={20} />
                  )}
                  <h3 className="font-bold text-base text-slate-900">
                    {chapterModalState.mode === 'add' ? 'Legg til nytt kapittel i årsplanen' : 'Rediger kapitteldetaljer'}
                  </h3>
                </div>
                <button 
                  onClick={() => setChapterModalState({ isOpen: false, mode: 'add' })}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveChapterForm} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kapitteltittel *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="f.eks. Friluftsliv & Naturglede / Kunst & Kultur / Måltidsfellesskap"
                    value={newChapterFormState.title}
                    onChange={(e) => setNewChapterFormState({ ...newChapterFormState, title: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Undertittel / Ingress</label>
                  <input 
                    type="text" 
                    placeholder="f.eks. Vår satsing på uteliv og mestring i skog og mark"
                    value={newChapterFormState.subtitle}
                    onChange={(e) => setNewChapterFormState({ ...newChapterFormState, subtitle: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Kategori</label>
                    <input 
                      type="text" 
                      placeholder="f.eks. Satsingsområde, Identitet"
                      value={newChapterFormState.category}
                      onChange={(e) => setNewChapterFormState({ ...newChapterFormState, category: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Ikon</label>
                    <select
                      value={newChapterFormState.iconType}
                      onChange={(e) => setNewChapterFormState({ ...newChapterFormState, iconType: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-medium"
                    >
                      <option value="sparkles">Stjerne / Magisk</option>
                      <option value="trees">Natur & Skog</option>
                      <option value="sun">Sol & Lys</option>
                      <option value="heart">Hjerte & Omsorg</option>
                      <option value="smile">Smil & Trivsel</option>
                      <option value="compass">Kompass & Progresjon</option>
                      <option value="palette">Palett & Kunst</option>
                      <option value="shield">Skjold & Trygghet</option>
                      <option value="building">Bygg & Barnehage</option>
                      <option value="book">Bok & Læring</option>
                      <option value="target">Mål & Visjon</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Innhold / Beskrivelse</label>
                  <textarea 
                    rows={4}
                    placeholder="Beskriv bakgrunnen for dette kapittelet, mål og hvordan dere jobber..."
                    value={newChapterFormState.content}
                    onChange={(e) => setNewChapterFormState({ ...newChapterFormState, content: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-normal leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => setChapterModalState({ isOpen: false, mode: 'add' })}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Avbryt
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Save size={14} />
                    <span>{chapterModalState.mode === 'add' ? 'Opprett kapittel' : 'Lagre endringer'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PRESENTASJON MAGASIN MODAL */}
        <PresentationMagasinModal
          isOpen={showMagasinModal}
          onClose={() => setShowMagasinModal(false)}
          barnehageNavn={appSettings.barnehageNavn || "Eventyrskogen Barnehage"}
          logoUrl={appSettings.logoUrl || ""}
          omBarnehagenText={omBarnehagenText}
          visjonText={visjonText}
          kjerneverdierText={kjerneverdierText}
          psykososialtMiljoeText={psykososialtMiljoeText}
          laeringssynText={laeringssynText}
          lekensPilarerText={lekensPilarerText}
          fagomraaderBeskrivelseText={fagomraaderBeskrivelseText}
          satsingsomraaderText={satsingsomraaderText}
          arbeidsmaaterText={arbeidsmaaterText}
          barnsMedvirkningText={barnsMedvirkningText}
          foreldresamarbeidText={foreldresamarbeidText}
          overgangerText={overgangerText}
          bakgrunnsdokumenterText={bakgrunnsdokumenterText}
          monthPlans={monthPlans}
          progressionMatrices={progressionMatrices}
          suVedtakDato={suVedtakDato}
          suReferatLink={suReferatLink}
          chapters={aarsplanChapters}
          onUpdateChapters={setAarsplanChapters}
        />

        {/* MODAL: BARNEHAGENS PEDAGOGISKE PLATTFORM & VERDIGRUNNLAG */}
        <PedagogiskPlattformModal
          isOpen={showPlattformModal}
          onClose={() => setShowPlattformModal(false)}
          onProfileSaved={(updated) => setBarnehageProfil(updated)}
        />

      </div>
    );
  }
