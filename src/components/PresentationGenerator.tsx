import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceLayout, HistoryItem } from './WorkspaceLayout';
import { 
  Presentation, 
  Mic, 
  FileText, 
  Layers, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  RotateCcw, 
  Edit3, 
  Loader2,
  CheckCircle2,
  FolderPlus,
  UploadCloud,
  Archive,
  Search,
  X,
  FileUp,
  Folder,
  ArrowRight,
  BookOpen,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Maximize2,
  Palette,
  Eye,
  Play,
  Image as ImageIcon,
  Wand2,
  Radio,
  Sliders
} from 'lucide-react';
import { generatePresentationOutline, PresentationSlide } from '../services/geminiService';
import { SlideCanvas, SlideThemeId, SLIDE_THEMES } from './presentation/SlideCanvas';
import { BackgroundManagerModal } from './presentation/BackgroundManagerModal';
import { ExportPresentationModal } from './presentation/ExportPresentationModal';
import { PresenterViewModal } from './presentation/PresenterViewModal';
import { PresentationSettingsModal } from './presentation/PresentationSettingsModal';
import { 
  PresentationBrandingSettings, 
  DEFAULT_BRANDING_SETTINGS 
} from '../lib/presentationSettings';
import { db } from '../firebase';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { extractTextFromPdf } from '../lib/pdfUtils';
import { extractTextFromDocx } from '../lib/docxUtils';

export interface FolderItem {
  id: string;
  name: string;
  isExpanded?: boolean;
  createdAt?: string;
}

export interface ArchiveDocumentItem {
  id: string;
  title: string;
  sourceType: 'workshop' | 'file_archive' | 'field_note' | 'process_log';
  sourceLabel: string;
  categoryTag?: string;
  date?: string;
  wordsCount: number;
  preview: string;
  fullText: string;
}

const SAMPLE_ARCHIVE_DOCUMENTS: ArchiveDocumentItem[] = [
  {
    id: 'sample-ws-1',
    title: 'Tolkning av medvirkning i barnehagen',
    sourceType: 'workshop',
    sourceLabel: 'Skriveverksted',
    date: 'I dag',
    wordsCount: 1420,
    preview: 'Barnehagen skal anerkjenne og ivareta barndommens egenverdi. Barn har rett til å gi uttrykk for sine synspunkter på barnehagens daglige virksomhet, jf. Barnehageloven § 3. Teoretisk forankring i Berit Bae...',
    fullText: `# Tolkning av barns medvirkning i barnehagehverdagen\n\nBarnehagen skal anerkjenne og ivareta barndommens egenverdi. Barn har rett til å gi uttrykk for sine synspunkter på barnehagens daglige virksomhet, jf. Barnehageloven § 3.\n\n## Teoretisk forankring\nMedvirkning handler ikke bare om formelle valg, men om å bli lyttet til og tatt på alvor i de små, uformelle stundene:\n- **Anerkjennelse:** Personalets evne til å lytte med et "tredje øre" (Bae, 2012).\n- **Demokratisk praksis:** Barn som aktive samfunnsborgere i fellesskapet.\n\n## Didaktisk refleksjon\nI samlingsstunden observerte jeg hvordan en treåring viste motstand mot en planlagt aktivitet. I stedet for å korrigere, valgte vi å undersøke barnets intensjon og utforske temaet sammen.`
  },
  {
    id: 'sample-ws-2',
    title: 'Ideer til utedag for 3-åringer',
    sourceType: 'workshop',
    sourceLabel: 'Skriveverksted',
    date: 'I går',
    wordsCount: 780,
    preview: 'For treåringer er natur og uterom en arena for opplevelser og sanseinntrykk. Rammeplanen vektlegger at barn skal få oppleve naturen og få innsikt i naturens mangfold...',
    fullText: `# Ideer til utedag for 3-åringer\n\nFor treåringer er natur og uterom en arena for opplevelser og sanseinntrykk. Rammeplanen vektlegger at barn skal få oppleve naturen og få innsikt i naturens mangfold.\n\n## Didaktiske mål\n1. Styrke grovmotoriske ferdigheter i ulendt terreng.\n2. Utforske sanselige kontraster: Vått, tørt, mose, kongler og bark.\n3. Skape trygge rammer for risikofylt lek under pedagogisk veiledning.\n\n## Samtale og refleksjon i etterkant\nI samlingen etter turen brukte vi samlekassen med kongler og mose som barna hadde funnet. Barna viste stor stolthet og gjenskapte opplevelsene gjennom fortelling og lek.`
  },
  {
    id: 'sample-fa-1',
    title: 'Læring gjennom mestring - skoggruppemetoden.pdf',
    sourceType: 'file_archive',
    sourceLabel: 'Filarkiv',
    date: '3 dager siden',
    wordsCount: 2150,
    preview: 'Didaktisk veiledning for friluftspedagogikk i barnehagen. Fokus på risikomestring, relasjonsbygging og overføring av mestringserfaringer fra skogen til avdelingen...',
    fullText: `# Læring gjennom mestring – skoggruppemetoden\n\nPedagogisk opplegg for arbeid med natur og friluftsliv i barnehagepraksis.\n\n## Innledning og rammebetingelser\nSkoggruppemetoden bygger på ideen om at barn i naturen møter naturlige og dynamiske utfordringer som ikke lar seg standardisere. Dette stimulerer barnas problemløsningsevne og oppmuntrer til gjensidig hjelp og samarbeid.\n\n## Teoretisk forankring\n- Sandseter (2010): Betydningen av risikofylt lek for barns mestringsfølelse.\n- Rammeplan for barnehagen (Kunnskapsdepartementet, 2017): Fagområdet «Natur, miljø og teknologi».\n\n## Metodiske anbefalinger\n1. Gi barna tid til uforstyrret utforskning i naturen før fellesaktiviteter igangsettes.\n2. Vær en støttende og anerkjennende veileder fremfor en instruerende leder.\n3. La barna vurdere egen risiko ved klatring og utforskning med trygge voksne i nærheten.`
  },
  {
    id: 'sample-fn-1',
    title: 'Samling om sanser (3-4 år)',
    sourceType: 'field_note',
    sourceLabel: 'Kladdeblokk',
    date: '23. sept 2026',
    wordsCount: 420,
    preview: 'Barna gjettet lukter fra lukkede bokser (kanel, appelsin, furu). Oliver (3) sa: "Det lukter jul hos bestemor!". Viser tydelig sanselig erindring og gjenkjennelse...',
    fullText: `# Samling om sanser (3-4 år)\n\nObservasjon fra samlingsstund på storbarnsavdelingen.\n\nBarna gjettet lukter fra lukkede bokser med små hull (kanel, appelsin, furubar, kaffe). Oliver (3) sa: «Det lukter jul hos bestemor!». Viser tydelig sanselig erindring og tilknytning til hjemlige erfaringer.\n\nDidaktisk vurdering: Aktiviteten skapte stort engasjement og ga rom for begrepslæring i en trygg og utforskende kontekst. Barnas felles undring ble utgangspunkt for videre samtale om årstider og tradisjoner.`
  }
];

const FOLDERS_STORAGE_KEY = 'blu_presentation_folders_v1';

const INITIAL_FOLDERS: FolderItem[] = [
  { id: 'f1', name: 'Praksis H26', isExpanded: true, createdAt: new Date().toISOString() },
  { id: 'f2', name: 'Pedagogikk', isExpanded: false, createdAt: new Date().toISOString() }
];

export interface PresentationGeneratorProps {
  documentText?: string;
  documentTitle?: string;
  pricingTier?: string;
  onUpgrade?: () => void;
  onBackToTools?: () => void;
}

interface SavedPresentationRecord {
  id: string;
  userId?: string;
  title: string;
  subtitle: string;
  sourceText: string;
  targetAudience: string;
  slideCountOption: string;
  folderId?: string;
  slides: PresentationSlide[];
  themeId?: SlideThemeId;
  globalBackground?: string;
  globalDim?: number;
  globalBlur?: boolean;
  brandingSettings?: PresentationBrandingSettings;
  createdAt?: string;
  updatedAt?: string;
}

const PRESENTATIONS_STORAGE_KEY = 'blu_presentations_records_v2';
const PRESENTATIONS_LIST_STORAGE_KEY = 'blu_presentations_list_v2';

const INITIAL_PRESENTATIONS_LIST: HistoryItem[] = [
  { id: '1', title: 'Muntlig høring - Medvirkning', subtitle: '4 lysbilder • Lagret i går', folderId: 'f2' },
  { id: '2', title: 'Foreldremøte: Lekens egenverdi', subtitle: '5 lysbilder • 3 dager siden', folderId: 'f1' }
];

const INITIAL_SAVED_RECORDS: Record<string, SavedPresentationRecord> = {
  '1': {
    id: '1',
    title: 'Muntlig høring - Medvirkning',
    subtitle: '4 lysbilder • Lagret i går',
    sourceText: 'Bacheloroppgave om barns rett til medvirkning i barnehagens dagsrytme.',
    targetAudience: 'Medstudenter og Sensor (Akademisk)',
    slideCountOption: 'Medium (10 lysbilder)',
    slides: [
      {
        slide: 1,
        title: 'Barns medvirkning i hverdagens overganger',
        bullets: [
          'Problemstilling: Hvordan opplever 3-5 åringer medvirkning i garderobesituasjonen?',
          'Teoretisk rammeverk: Berit Bae og anerkjennende relasjoner',
          'Forankring i Rammeplanen kapittel 1 og 3'
        ],
        script: 'Kjære sensor og tilhørere. I denne presentasjonen vil jeg belyse hvordan barns rett til medvirkning realiseres i barnehagens mest krevende overgangssituasjoner, med særlig fokus på garderoben.'
      },
      {
        slide: 2,
        title: 'Det teoretiske fundamentet: Anerkjennelse',
        bullets: [
          'Berit Baes relasjonsforståelse: Åpenhet kontra kontroll',
          'Spenningen mellom institusjonelle rutiner og barnets tempo',
          'FNs barnekonvensjon artikkel 12: Barnets stemme'
        ],
        script: 'Når vi snakker om medvirkning, må vi skille mellom overflatisk valgfrihet og genuin medvirkning. Bae understreker at pedagogen må tåle barnets motstand som et gyldig meningsuttrykk.'
      },
      {
        slide: 3,
        title: 'Funn fra observasjonene',
        bullets: [
          'Funn 1: Voksnes tidspress innsnevrer barnas initiativ',
          'Funn 2: Humor og lek i påkledningen skaper mestring',
          'Pedagogens holdning som avgjørende faktor'
        ],
        script: 'Mine observasjoner viste tydelig at når de voksne brukte humor og lot barna hjelpe hverandre, sank konfliktnivået drastisk og barna opplevde reell autonomi.'
      },
      {
        slide: 4,
        title: 'Didaktiske konsekvenser for lederrollen',
        bullets: [
          'Veiledning av personalgruppen mot en felles relasjonsforståelse',
          'Endring av dagsrytmen: Mer fleksible tidsrammer',
          'Oppsummering og konklusjon'
        ],
        script: 'Avslutningsvis: Som pedagogisk leder er min viktigste oppgave å skape en avdelingskultur der overganger ikke bare er logistikk, men verdifulle pedagogiske arenaer.'
      }
    ]
  },
  '2': {
    id: '2',
    title: 'Foreldremøte: Lekens egenverdi',
    subtitle: '5 lysbilder • 3 dager siden',
    sourceText: 'Presentasjon til høstens foreldremøte om hvorfor frilek er den viktigste læringsarenaen.',
    targetAudience: 'Foreldregruppe (Lettfattelig)',
    slideCountOption: 'Kort (5 lysbilder)',
    slides: [
      {
        slide: 1,
        title: 'Velkommen! Hvorfor leker barna i barnehagen?',
        bullets: [
          'Velkommen til nytt barnehageår',
          'Lek er ikke en pause fra læring – lek ER læring',
          'Hva skjer egentlig når barna leker i sandkassen?'
        ],
        script: 'Hei og velkommen til foreldremøte! I kveld vil vi i personalet fortelle litt om hva som ligger bak hverdagen her på avdelingen, og hvorfor vi verner så sterkt om barnas frie lek.'
      },
      {
        slide: 2,
        title: 'Sosial kompetanse og vennskap',
        bullets: [
          'Å forhandle roller og regler',
          'Empati: Å forstå den andres perspektiv',
          'Mestring av gleder og skuffelser sammen'
        ],
        script: 'I leken lærer barna å lese sosiale koder, løse konflikter og føle tilhørighet. Dette er ferdigheter de har med seg resten av livet.'
      }
    ]
  }
};

export function PresentationGenerator({ 
  documentText = '', 
  documentTitle,
  pricingTier = 'free',
  onUpgrade,
  onBackToTools
}: PresentationGeneratorProps) {
  const isSemester = pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview';
  
  // Last fra localStorage eller fallback til eksempler
  const [presentations, setPresentations] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(PRESENTATIONS_LIST_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse presentations from localStorage', e);
    }
    return INITIAL_PRESENTATIONS_LIST;
  });

  // State for mapper
  const [folders, setFolders] = useState<FolderItem[]>(() => {
    try {
      const saved = localStorage.getItem(FOLDERS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse folders from localStorage', e);
    }
    return INITIAL_FOLDERS;
  });

  // State for Ny Mappe modal
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [savedRecords, setSavedRecords] = useState<Record<string, SavedPresentationRecord>>(() => {
    try {
      const saved = localStorage.getItem(PRESENTATIONS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved presentation records from localStorage', e);
    }
    return INITIAL_SAVED_RECORDS;
  });

  const [activePresId, setActivePresId] = useState('');
  const [activePresTitle, setActivePresTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() => new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }));
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [sourceText, setSourceText] = useState(documentText);
  const [targetAudience, setTargetAudience] = useState('Medstudenter og Sensor (Akademisk)');
  const [slideCountOption, setSlideCountOption] = useState('Medium (10 lysbilder)');

  // Visning av genererte lysbilder
  const [slides, setSlides] = useState<PresentationSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fase 1, 2, 3 & 4: 16:9 Lysbildemotor, tema, bakgrunner, fullskjermvisning, eksport og foredragsholder
  const [selectedTheme, setSelectedTheme] = useState<SlideThemeId>('pedagogisk-varme');
  const [globalBackground, setGlobalBackground] = useState<string | undefined>(undefined);
  const [globalDim, setGlobalDim] = useState<number>(0.75);
  const [globalBlur, setGlobalBlur] = useState<boolean>(true);
  const [brandingSettings, setBrandingSettings] = useState<PresentationBrandingSettings>(DEFAULT_BRANDING_SETTINGS);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [focusedSettingsElement, setFocusedSettingsElement] = useState<1 | 2 | 3 | 4 | null>(null);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPresenterViewOpen, setIsPresenterViewOpen] = useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const handleOpenSettings = (element?: 1 | 2 | 3 | 4) => {
    setFocusedSettingsElement(element || null);
    setIsSettingsModalOpen(true);
  };

  // States for filopplasting og drag & drop
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [sourceDocBadge, setSourceDocBadge] = useState<string | null>(null);
  const [sourceLoadedSuccessMsg, setSourceLoadedSuccessMsg] = useState<string | null>(null);

  // States for «Hent fra filarkivet»-modal
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveItems, setArchiveItems] = useState<ArchiveDocumentItem[]>(SAMPLE_ARCHIVE_DOCUMENTS);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveCategoryFilter, setArchiveCategoryFilter] = useState<'all' | 'workshop' | 'file_archive' | 'field_note'>('all');

  // Håndter parsing av opplastet eller sluppet fil (PDF, Word docx, TXT, MD)
  const processUploadedFile = async (file: File) => {
    setIsProcessingFile(true);
    setErrorMessage(null);
    try {
      let extracted = '';
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith('.pdf')) {
        extracted = await extractTextFromPdf(file);
      } else if (lowerName.endsWith('.docx')) {
        extracted = await extractTextFromDocx(file);
      } else {
        extracted = await file.text();
      }

      if (!extracted || !extracted.trim()) {
        throw new Error('Kunne ikke hente ut tekst fra filen. Prøv et annet filformat eller lim inn teksten manuelt.');
      }

      setSourceText(extracted);
      setUploadedFileName(file.name);
      setSourceDocBadge(`Fil: ${file.name}`);
      const words = extracted.split(/\s+/).filter(Boolean).length;
      setSourceLoadedSuccessMsg(`Lastet opp "${file.name}" (${words} ord lagt til som kildegrunnlag)`);
      setTimeout(() => setSourceLoadedSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMessage(err.message || 'Feil ved lesing av dokumentet.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Henter reelle dokumenter fra Skriveverksted, Filarkiv og Kladdeblokk
  const fetchArchiveDocuments = async () => {
    setIsLoadingArchive(true);
    try {
      const items: ArchiveDocumentItem[] = [];
      const auth = getAuth();
      const user = auth.currentUser;

      // 1. Skriveverksted-dokumenter fra Firestore
      if (user) {
        try {
          const docQ = query(collection(db, 'documents'), where('userId', '==', user.uid));
          const docSnap = await getDocs(docQ);
          docSnap.docs.forEach(d => {
            const data = d.data();
            const text = data.content || '';
            items.push({
              id: `ws-${d.id}`,
              title: data.title || 'Uten tittel',
              sourceType: 'workshop',
              sourceLabel: 'Skriveverksted',
              date: data.updatedAt ? new Date(data.updatedAt).toLocaleDateString('nb-NO') : undefined,
              wordsCount: text.split(/\s+/).filter(Boolean).length,
              preview: text.slice(0, 160) + (text.length > 160 ? '...' : ''),
              fullText: text
            });
          });
        } catch (e) {
          console.warn("Kunne ikke hente Firestore documents:", e);
        }
      }

      // 1b. Fallback til localStorage for skriveverksted
      try {
        const localWs = localStorage.getItem('blu_writing_workshop_docs_v2');
        if (localWs) {
          const parsed = JSON.parse(localWs);
          if (Array.isArray(parsed)) {
            parsed.forEach((d: any) => {
              if (!items.find(existing => existing.id === `ws-${d.id}`)) {
                const text = d.content || '';
                items.push({
                  id: `ws-local-${d.id}`,
                  title: d.title || 'Uten tittel',
                  sourceType: 'workshop',
                  sourceLabel: 'Skriveverksted',
                  date: d.updatedAt ? new Date(d.updatedAt).toLocaleDateString('nb-NO') : undefined,
                  wordsCount: text.split(/\s+/).filter(Boolean).length,
                  preview: text.slice(0, 160) + (text.length > 160 ? '...' : ''),
                  fullText: text
                });
              }
            });
          }
        }
      } catch (e) {
        console.warn("Feil ved lesing av lokal workshop cache:", e);
      }

      // 2. Filarkiv (context_files i Firestore)
      if (user) {
        try {
          const fileQ = query(collection(db, 'context_files'), where('userId', '==', user.uid));
          const fileSnap = await getDocs(fileQ);
          fileSnap.docs.forEach(d => {
            const data = d.data();
            const text = data.content || '';
            if (data.type !== 'folder') {
              items.push({
                id: `file-${d.id}`,
                title: data.name || 'Navnløs fil',
                sourceType: 'file_archive',
                sourceLabel: 'Filarkiv',
                date: data.updatedAt ? new Date(data.updatedAt.toDate ? data.updatedAt.toDate() : data.updatedAt).toLocaleDateString('nb-NO') : undefined,
                wordsCount: text.split(/\s+/).filter(Boolean).length,
                preview: text.slice(0, 160) + (text.length > 160 ? '...' : ''),
                fullText: text
              });
            }
          });
        } catch (e) {
          console.warn("Kunne ikke hente Firestore context_files:", e);
        }
      }

      // 3. Feltnotater & Kladdeblokk (Firestore)
      if (user) {
        try {
          const notesQ = query(collection(db, 'fieldNotes'), where('userId', '==', user.uid));
          const notesSnap = await getDocs(notesQ);
          notesSnap.docs.forEach(d => {
            const data = d.data();
            const text = data.content || '';
            items.push({
              id: `fn-${d.id}`,
              title: data.title || 'Uten tittel',
              sourceType: 'field_note',
              sourceLabel: 'Kladdeblokk',
              categoryTag: data.category,
              date: data.createdAt ? new Date(data.createdAt).toLocaleDateString('nb-NO') : undefined,
              wordsCount: text.split(/\s+/).filter(Boolean).length,
              preview: text.slice(0, 160) + (text.length > 160 ? '...' : ''),
              fullText: text
            });
          });
        } catch (e) {
          console.warn("Kunne ikke hente Firestore fieldNotes:", e);
        }
      }

      // 3b. Fallback til localStorage for feltnotater
      try {
        const localNotes = localStorage.getItem('blu_field_notes');
        if (localNotes) {
          const parsed = JSON.parse(localNotes);
          if (Array.isArray(parsed)) {
            parsed.forEach((n: any) => {
              if (!items.find(existing => existing.id === `fn-${n.id}`)) {
                const text = n.content || '';
                items.push({
                  id: `fn-local-${n.id}`,
                  title: n.title || 'Uten tittel',
                  sourceType: 'field_note',
                  sourceLabel: 'Kladdeblokk',
                  categoryTag: n.category,
                  date: n.createdAt ? new Date(n.createdAt).toLocaleDateString('nb-NO') : undefined,
                  wordsCount: text.split(/\s+/).filter(Boolean).length,
                  preview: text.slice(0, 160) + (text.length > 160 ? '...' : ''),
                  fullText: text
                });
              }
            });
          }
        }
      } catch (e) {
        console.warn("Feil ved lesing av lokale feltnotater:", e);
      }

      // Legg til eksempeldokumenter hvis brukeren mangler dokumenter
      SAMPLE_ARCHIVE_DOCUMENTS.forEach(sample => {
        if (!items.find(existing => existing.title.toLowerCase() === sample.title.toLowerCase())) {
          items.push(sample);
        }
      });

      setArchiveItems(items);
    } catch (err) {
      console.error("Feil ved lasting av arkivdokumenter:", err);
    } finally {
      setIsLoadingArchive(false);
    }
  };

  const handleSelectArchiveDoc = (docItem: ArchiveDocumentItem) => {
    setSourceText(docItem.fullText);
    setUploadedFileName(null);
    setSourceDocBadge(`${docItem.sourceLabel}: ${docItem.title}`);
    const words = docItem.fullText.split(/\s+/).filter(Boolean).length;
    setSourceLoadedSuccessMsg(`Hentet "${docItem.title}" fra ${docItem.sourceLabel} (${words} ord)`);
    setTimeout(() => setSourceLoadedSuccessMsg(null), 5000);
    setIsArchiveModalOpen(false);
  };

  const filteredArchiveItems = archiveItems.filter(item => {
    const matchesCategory = archiveCategoryFilter === 'all' || item.sourceType === archiveCategoryFilter;
    const query = archiveSearch.toLowerCase().trim();
    if (!query) return matchesCategory;
    const matchesSearch = item.title.toLowerCase().includes(query) || 
                          item.preview.toLowerCase().includes(query) ||
                          item.sourceLabel.toLowerCase().includes(query) ||
                          (item.categoryTag && item.categoryTag.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  // Synkroniser når documentText endres
  useEffect(() => {
    if (documentText && documentText.trim().length > 0 && !sourceText) {
      setSourceText(documentText);
    }
  }, [documentText]);

  useEffect(() => {
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error('Failed to save folders to localStorage', e);
    }
  }, [folders]);

  // Henter felles mapper fra Firestore ved innlasting hvis logget inn
  useEffect(() => {
    const fetchFolders = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      try {
        const folderQ = query(collection(db, 'folders'), where('userId', '==', user.uid));
        const folderSnapshot = await getDocs(folderQ);
        if (!folderSnapshot.empty) {
          const fetchedFolders = folderSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as FolderItem));
          setFolders(fetchedFolders);
        }
      } catch (error) {
        console.error("Feil ved henting av mapper fra skyen:", error);
      }
    };

    fetchFolders();
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchFolders();
    });
    return () => unsubscribe();
  }, []);

  const sanitizeForFirestore = <T extends Record<string, any>>(obj: T): Partial<T> => {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      return value === undefined ? null : value;
    }));
  };

  const saveFolderToFirebase = async (folder: FolderItem) => {
    try {
      const user = getAuth().currentUser;
      if (!user) return;
      const folderRef = doc(db, 'folders', folder.id);
      await setDoc(folderRef, sanitizeForFirestore({ ...folder, userId: user.uid }), { merge: true });
    } catch (error) {
      console.error("Feil ved lagring av mappe til Firebase:", error);
    }
  };

  const savePresentationToFirebase = async (record: SavedPresentationRecord) => {
    try {
      const user = getAuth().currentUser;
      if (!user) return;
      const presRef = doc(db, 'presentations', record.id);
      const payload = sanitizeForFirestore({
        ...record,
        userId: user.uid,
        updatedAt: new Date().toISOString()
      });
      await setDoc(presRef, payload, { merge: true });
    } catch (error) {
      console.error("Feil ved lagring av presentasjon til Firebase:", error);
    }
  };

  const deletePresentationFromFirebase = async (id: string) => {
    try {
      const user = getAuth().currentUser;
      if (!user) return;
      const presRef = doc(db, 'presentations', id);
      await deleteDoc(presRef);
    } catch (error) {
      console.error("Feil ved sletting av presentasjon fra Firebase:", error);
    }
  };

  // Last brukerens lagrede presentasjoner fra Firebase Firestore ved oppstart
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const q = query(collection(db, 'presentations'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const cloudRecords: Record<string, SavedPresentationRecord> = {};
          const cloudList: HistoryItem[] = [];

          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data() as SavedPresentationRecord;
            cloudRecords[data.id] = data;
            cloudList.push({
              id: data.id,
              title: data.title || 'Uten tittel',
              subtitle: data.subtitle || `${data.slides?.length || 0} lysbilder • Lagret i skyen`,
              folderId: data.folderId
            });
          });

          setSavedRecords(prev => {
            const merged = { ...prev, ...cloudRecords };
            try {
              localStorage.setItem(PRESENTATIONS_STORAGE_KEY, JSON.stringify(merged));
            } catch {}
            return merged;
          });

          setPresentations(prev => {
            const cloudIds = new Set(cloudList.map(item => item.id));
            const remainingLocal = prev.filter(item => !cloudIds.has(item.id));
            const merged = [...cloudList, ...remainingLocal];
            try {
              localStorage.setItem(PRESENTATIONS_LIST_STORAGE_KEY, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } catch (err) {
        console.warn("Kunne ikke laste presentasjoner fra Firestore:", err);
      }
    });

    return () => unsubscribe();
  }, []);

  // Autolagring-trigger (debounced, på lik linje med Skriveverksted)
  const triggerAutoSave = (updatedFields: Partial<SavedPresentationRecord>) => {
    const presId = activePresId || `pres_${Date.now()}`;
    if (!activePresId) {
      setActivePresId(presId);
    }

    setSaveStatus('saving');
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      const currentSlides = updatedFields.slides !== undefined ? updatedFields.slides : slides;
      const currentTitle = updatedFields.title !== undefined ? updatedFields.title : (activePresTitle || currentSlides[0]?.title || 'Framvisning');
      const timeStr = new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
      const currentSubtitle = `${currentSlides.length} lysbilder • Lagret kl. ${timeStr}`;

      const existingRecord = savedRecords[presId] || {};
      const recordToSave: SavedPresentationRecord = {
        ...existingRecord,
        id: presId,
        title: currentTitle,
        subtitle: currentSubtitle,
        sourceText,
        targetAudience,
        slideCountOption,
        slides: currentSlides,
        themeId: updatedFields.themeId !== undefined ? updatedFields.themeId : selectedTheme,
        globalBackground: updatedFields.globalBackground !== undefined ? updatedFields.globalBackground : globalBackground,
        globalDim: updatedFields.globalDim !== undefined ? updatedFields.globalDim : globalDim,
        globalBlur: updatedFields.globalBlur !== undefined ? updatedFields.globalBlur : globalBlur,
        brandingSettings: updatedFields.brandingSettings !== undefined ? updatedFields.brandingSettings : brandingSettings,
        createdAt: existingRecord.createdAt || new Date().toISOString(),
        ...updatedFields,
        updatedAt: new Date().toISOString()
      };

      // 1. Oppdater savedRecords i state og localStorage
      setSavedRecords(prev => {
        const next = { ...prev, [presId]: recordToSave };
        try {
          localStorage.setItem(PRESENTATIONS_STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
          console.error('Kunne ikke lagre til localStorage:', e);
        }
        return next;
      });

      // 2. Oppdater presentations listen i sidebar
      setPresentations(prev => {
        const exists = prev.some(p => p.id === presId);
        let next: HistoryItem[];
        if (exists) {
          next = prev.map(p => p.id === presId ? { ...p, title: currentTitle, subtitle: currentSubtitle } : p);
        } else {
          next = [{ id: presId, title: currentTitle, subtitle: currentSubtitle, folderId: recordToSave.folderId }, ...prev];
        }
        try {
          localStorage.setItem(PRESENTATIONS_LIST_STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
          console.error('Kunne ikke lagre liste til localStorage:', e);
        }
        return next;
      });

      // 3. Lagre til Firebase Firestore
      await savePresentationToFirebase(recordToSave);

      setLastSavedTime(timeStr);
      setSaveStatus('saved');
    }, 1200);
  };

  const handleUpdateTitle = (newTitle: string) => {
    setActivePresTitle(newTitle);
    const presId = activePresId || `pres_${Date.now()}`;
    if (!activePresId) {
      setActivePresId(presId);
    }
    setPresentations(prev => {
      const exists = prev.some(p => p.id === presId);
      let next: HistoryItem[];
      if (exists) {
        next = prev.map(p => p.id === presId ? { ...p, title: newTitle || 'Uten tittel' } : p);
      } else {
        next = [{ id: presId, title: newTitle || 'Uten tittel', subtitle: `${slides.length} lysbilder • Nettopp laget` }, ...prev];
      }
      try {
        localStorage.setItem(PRESENTATIONS_LIST_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    triggerAutoSave({ title: newTitle });
  };

  const handleSyncTitleFromFirstSlide = () => {
    const firstTitle = slides[0]?.title;
    if (firstTitle && firstTitle.trim()) {
      handleUpdateTitle(firstTitle.trim());
    }
  };

  const handleUpdateGlobalBackground = (bgUrl: string | undefined, dim?: number, blur?: boolean) => {
    setGlobalBackground(bgUrl);
    const newDim = dim !== undefined ? dim : globalDim;
    const newBlur = blur !== undefined ? blur : globalBlur;
    if (dim !== undefined) setGlobalDim(dim);
    if (blur !== undefined) setGlobalBlur(blur);
    triggerAutoSave({ 
      globalBackground: bgUrl, 
      globalDim: newDim, 
      globalBlur: newBlur 
    });
  };

  const handleSelectTheme = (themeId: SlideThemeId) => {
    setSelectedTheme(themeId);
    triggerAutoSave({ themeId });
  };

  const handleUpdateBrandingSettings = (newSettings: PresentationBrandingSettings) => {
    setBrandingSettings(newSettings);
    triggerAutoSave({ brandingSettings: newSettings });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const newFolder: FolderItem = {
      id: 'folder_' + Date.now(),
      name: newFolderName.trim(),
      isExpanded: true,
      createdAt: new Date().toISOString()
    };

    setFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
    setIsCreatingFolder(false);

    await saveFolderToFirebase(newFolder);
  };

  const handleMoveDoc = async (docId: string, folderId: string | undefined) => {
    setPresentations(prev => {
      const next = prev.map(p => {
        if (p.id === docId) {
          return { ...p, folderId };
        }
        return p;
      });
      try {
        localStorage.setItem(PRESENTATIONS_LIST_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    setSavedRecords(prev => {
      if (!prev[docId]) return prev;
      const updated = { ...prev[docId], folderId, updatedAt: new Date().toISOString() };
      const next = { ...prev, [docId]: updated };
      try {
        localStorage.setItem(PRESENTATIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      savePresentationToFirebase(updated);
      return next;
    });
  };

  const handleDeletePresentation = async (id: string) => {
    setPresentations(prev => {
      const next = prev.filter(p => p.id !== id);
      try {
        localStorage.setItem(PRESENTATIONS_LIST_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    setSavedRecords(prev => {
      const next = { ...prev };
      delete next[id];
      try {
        localStorage.setItem(PRESENTATIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    await deletePresentationFromFirebase(id);

    if (activePresId === id) {
      handleNewPresentation();
    }
  };

  const handleRenamePresentation = async (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    if (activePresId === id) {
      setActivePresTitle(trimmed);
    }

    setPresentations(prev => {
      const next = prev.map(p => p.id === id ? { ...p, title: trimmed } : p);
      try {
        localStorage.setItem(PRESENTATIONS_LIST_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    setSavedRecords(prev => {
      if (!prev[id]) return prev;
      const updatedRecord = { ...prev[id], title: trimmed, updatedAt: new Date().toISOString() };
      const next = { ...prev, [id]: updatedRecord };
      try {
        localStorage.setItem(PRESENTATIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      savePresentationToFirebase(updatedRecord);
      return next;
    });
  };

  // Stopp tale når lysbilde endres eller komponent unmountes
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentSlideIndex]);

  // Tastaturnavigasjon (Venstre / Høyre / Mellomrom / Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (slides.length === 0) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        if (currentSlideIndex < slides.length - 1) {
          e.preventDefault();
          setCurrentSlideIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentSlideIndex > 0) {
          e.preventDefault();
          setCurrentSlideIndex(prev => prev - 1);
        }
      } else if (e.key === 'Escape' && isFullscreenPreview) {
        setIsFullscreenPreview(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, currentSlideIndex, isFullscreenPreview]);

  // Oppdater innhold på gjeldende lysbilde og autolagre
  const handleUpdateCurrentSlide = (updated: PresentationSlide) => {
    const updatedSlides = slides.map((s, idx) => idx === currentSlideIndex ? updated : s);
    setSlides(updatedSlides);

    // Hvis dette er lysbilde 1 og brukeren ikke har endret framvisningens tittel, eller hvis framvisningens tittel matcher forrige tittel på slide 1:
    let newTitle = activePresTitle;
    if (currentSlideIndex === 0 && updated.title) {
      const prevSlide1Title = slides[0]?.title;
      if (!activePresTitle || activePresTitle === prevSlide1Title || activePresTitle === 'Generert presentasjon') {
        newTitle = updated.title;
        setActivePresTitle(newTitle);
      }
    }

    triggerAutoSave({ slides: updatedSlides, title: newTitle });
  };

  const handleNewPresentation = () => {
    setActivePresId('');
    setActivePresTitle('');
    setSlides([]);
    setCurrentSlideIndex(0);
    setErrorMessage(null);
    setBrandingSettings(DEFAULT_BRANDING_SETTINGS);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleSelectPresentation = (id: string) => {
    setActivePresId(id);
    setErrorMessage(null);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);

    const record = savedRecords[id];
    if (record) {
      setActivePresTitle(record.title || record.slides?.[0]?.title || 'Framvisning');
      setSlides(record.slides || []);
      setCurrentSlideIndex(0);
      setSourceText(record.sourceText || '');
      setTargetAudience(record.targetAudience || 'Medstudenter og Sensor (Akademisk)');
      setSlideCountOption(record.slideCountOption || 'Medium (10 lysbilder)');
      if (record.themeId) setSelectedTheme(record.themeId);
      setGlobalBackground(record.globalBackground);
      if (record.globalDim !== undefined) setGlobalDim(record.globalDim);
      if (record.globalBlur !== undefined) setGlobalBlur(record.globalBlur);
      if (record.brandingSettings) {
        setBrandingSettings(record.brandingSettings);
      } else {
        setBrandingSettings(DEFAULT_BRANDING_SETTINGS);
      }
    }
  };

  const handleGenerate = async () => {
    if (!isSemester) {
      if (onUpgrade) onUpgrade();
      setErrorMessage("Presentasjons-generator er eksklusivt tilgjengelig for Semester-pakka.");
      return;
    }

    const textToUse = sourceText || documentText;
    if (!textToUse || textToUse.trim().length < 30) {
      setErrorMessage("Tekstgrunnlaget er for kort. Lim inn minst et par avsnitt med tekst for å bygge presentasjonen.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    try {
      const enrichedContext = `Målgruppe for presentasjonen: ${targetAudience}.
Ønsket omfang: ${slideCountOption}.
Tekstgrunnlag:
${textToUse}`;

      const outline = await generatePresentationOutline(enrichedContext);
      if (outline && outline.length > 0) {
        setSlides(outline);
        setCurrentSlideIndex(0);

        // Autogenerer tittel etter lysbilde 1
        const newId = `pres_${Date.now()}`;
        const autoTitle = outline[0]?.title || (documentTitle ? `Presentasjon: ${documentTitle}` : 'Generert presentasjon');
        
        setActivePresId(newId);
        setActivePresTitle(autoTitle);

        const newHistoryItem: HistoryItem = {
          id: newId,
          title: autoTitle.length > 38 ? autoTitle.substring(0, 35) + '...' : autoTitle,
          subtitle: `${outline.length} lysbilder • Nettopp laget`
        };

        const newRecord: SavedPresentationRecord = {
          id: newId,
          title: autoTitle,
          subtitle: newHistoryItem.subtitle,
          sourceText: textToUse,
          targetAudience,
          slideCountOption,
          slides: outline,
          themeId: selectedTheme,
          globalBackground,
          globalDim,
          globalBlur,
          brandingSettings,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        setPresentations(prev => {
          const next = [newHistoryItem, ...prev];
          try {
            localStorage.setItem(PRESENTATIONS_LIST_STORAGE_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });

        setSavedRecords(prev => {
          const next = { ...prev, [newId]: newRecord };
          try {
            localStorage.setItem(PRESENTATIONS_STORAGE_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });

        await savePresentationToFirebase(newRecord);
        setLastSavedTime(new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }));
        setSaveStatus('saved');
      } else {
        throw new Error("Ingen lysbilder ble returnert fra KI-modellen. Vennligst prøv igjen.");
      }
    } catch (err: any) {
      console.error("Presentation generation error:", err);
      setErrorMessage(err.message || "Kunne ikke generere presentasjon. Vennligst prøv igjen.");
    } finally {
      setIsLoading(false);
    }
  };

  const playScript = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert("Nettleseren din støtter ikke tekst-til-tale direkte.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'no-NO';
    utterance.rate = 0.95; // Behagelig eksamenstempo

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const copyCurrentScript = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const copyAllSlides = () => {
    if (slides.length === 0) return;
    const fullText = slides
      .map(s => `--- LYSBILDE ${s.slide}: ${s.title} ---\nSTIKKORD:\n${s.bullets.map(b => `• ${b}`).join('\n')}\n\nMUNTLIG MANUS:\n${s.script}\n`)
      .join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const currentSlide = slides[currentSlideIndex];

  return (
    <WorkspaceLayout
      title="Presentasjoner"
      subtitle="Fra tekst til fremføring"
      icon={<Presentation className="w-6 h-6" />}
      actionButtonLabel="Ny presentasjon"
      onActionClick={handleNewPresentation}
      onBackToTools={onBackToTools}
      historyItems={presentations}
      folders={folders}
      onAddFolder={() => setIsCreatingFolder(true)}
      onMoveToFolder={handleMoveDoc}
      activeItemId={activePresId}
      onItemClick={handleSelectPresentation}
      onDeleteItem={handleDeletePresentation}
      onRenameItem={handleRenamePresentation}
    >
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 flex justify-center">
        <div className="max-w-4xl w-full space-y-6 pb-12">
          
          {/* GENERERINGSSKJEMA (NÅR INGEN LYSBILDER VISES) */}
          {slides.length === 0 ? (
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="bg-emerald-50 p-3.5 rounded-2xl shrink-0">
                  <Layers className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-slate-800">Generer lysbilder og manus</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs">
                      Semester-pakka
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Gjør om oppgaven eller fellesnotatene dine til en strukturert presentasjon med talemanus.
                  </p>
                </div>
              </div>

              {!isSemester && (
                <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-900 font-medium">
                      Presentasjons-generator er eksklusivt for <strong>Semester-pakka</strong> (NotebookLM-drevet lysbilde- og manusgenerator for høring og eksamen).
                    </p>
                  </div>
                  {onUpgrade && (
                    <button 
                      onClick={onUpgrade}
                      className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold shrink-0 hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      Lås opp nå
                    </button>
                  )}
                </div>
              )}

              {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-2xl">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-5">
                {/* KILDEGRUNNLAG MED DRAG & DROP OG FILARKIV-INTEGRASJON */}
                <div 
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative rounded-3xl transition-all duration-200 ${
                    isDraggingOver 
                      ? 'ring-4 ring-emerald-500/50 border-2 border-emerald-500 bg-emerald-50/60 p-2 shadow-lg' 
                      : ''
                  }`}
                >
                  {/* Skjult filvelger */}
                  <input 
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {/* Topplinje for kildegrunnlag med status og handlinger */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-emerald-600" /> Kildegrunnlag
                      </label>
                      {sourceDocBadge && (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200/80">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> 
                          <span className="truncate max-w-[200px]">{sourceDocBadge}</span>
                        </span>
                      )}
                    </div>

                    {/* Hurtighandlinger: Last opp fil & Hent fra filarkiv */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessingFile}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-emerald-700 text-xs font-bold rounded-xl border border-slate-200/90 shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                        title="Last opp Word (.docx), PDF eller TXT med klikk eller dra og slipp"
                      >
                        {isProcessingFile ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        ) : (
                          <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span>{isProcessingFile ? 'Leser fil...' : 'Last opp dokument'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          fetchArchiveDocuments();
                          setIsArchiveModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 shadow-2xs transition-all cursor-pointer active:scale-95"
                        title="Velg blant dine lagrede dokumenter, filer og notater i arkivet"
                      >
                        <Archive className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Hent fra filarkivet</span>
                      </button>

                      <span className="text-xs text-slate-400 font-medium pl-1 hidden sm:inline">
                        {sourceText.length} tegn ({sourceText.split(/\s+/).filter(Boolean).length} ord)
                      </span>
                    </div>
                  </div>

                  {/* Suksessbanner ved vellykket innlasting av fil eller arkiv-dokument */}
                  {sourceLoadedSuccessMsg && (
                    <div className="mb-3 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1">
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate">{sourceLoadedSuccessMsg}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setSourceLoadedSuccessMsg(null)}
                        className="text-emerald-700 hover:text-emerald-950 p-0.5 rounded cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Tekstfelt med drag & drop visuelle overlays */}
                  <div className="relative">
                    {/* Drag-over overlay */}
                    {isDraggingOver && (
                      <div className="absolute inset-0 z-20 bg-emerald-600/90 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white p-6 border-2 border-dashed border-white shadow-inner animate-in fade-in duration-150">
                        <UploadCloud className="w-12 h-12 mb-2 animate-bounce" />
                        <h4 className="text-base font-black">Slipp filen her!</h4>
                        <p className="text-xs text-emerald-100 mt-1 max-w-sm text-center">
                          Word (.docx), PDF eller TXT leses ut automatisk og legges rett inn som kildegrunnlag.
                        </p>
                      </div>
                    )}

                    {/* Laster/prosesserer overlay */}
                    {isProcessingFile && (
                      <div className="absolute inset-0 z-20 bg-white/85 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-slate-800 p-6 border border-slate-200 shadow-sm">
                        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-2" />
                        <h4 className="text-sm font-bold text-slate-800">Leser og trekker ut innhold fra dokumentet...</h4>
                        <p className="text-xs text-slate-500 mt-1">Dette tar bare et par sekunder.</p>
                      </div>
                    )}

                    <textarea 
                      value={sourceText}
                      onChange={(e) => {
                        setSourceText(e.target.value);
                        if (sourceDocBadge && !e.target.value) {
                          setSourceDocBadge(null);
                        }
                      }}
                      rows={8}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none resize-y leading-relaxed font-normal text-slate-800 transition-colors placeholder:text-slate-400"
                      placeholder="Lim inn teksten du vil presentere, dra og slipp et Word/PDF-dokument her, eller trykk «Hent fra filarkivet» over..."
                    />
                  </div>

                  {/* Bunnstripe under tekstfeltet med tips og rensking */}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <span className="flex items-center gap-1 text-slate-400">
                      <span>💡 Tips: Dra og slipp Word (.docx) eller PDF rett inn i boksen for lynraskt kildegrunnlag.</span>
                    </span>
                    {sourceText.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSourceText('');
                          setSourceDocBadge(null);
                          setUploadedFileName(null);
                        }}
                        className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer font-medium"
                      >
                        Tøm kildegrunnlag
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                      Målgruppe
                    </label>
                    <select 
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-slate-800"
                    >
                      <option value="Medstudenter og Sensor (Akademisk)">Medstudenter og Sensor (Akademisk)</option>
                      <option value="Foreldregruppe (Lettfattelig)">Foreldregruppe (Lettfattelig)</option>
                      <option value="Personalmøte (Praksisnært)">Personalmøte (Praksisnært)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                      Antall lysbilder
                    </label>
                    <select 
                      value={slideCountOption}
                      onChange={(e) => setSlideCountOption(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-slate-800"
                    >
                      <option value="Kort (5 lysbilder)">Kort (5 lysbilder)</option>
                      <option value="Medium (10 lysbilder)">Medium (10 lysbilder)</option>
                      <option value="Lang (15+ lysbilder)">Lang (15+ lysbilder)</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={isLoading || !sourceText.trim() || sourceText.trim().length < 30}
                  className="w-full mt-4 py-4 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50 text-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Bygger lysbilder og talemanus...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      <span>Generer lysbilder og muntlig manus</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* LYSBILDEVISER & TALEMANUS (FASE 1: 16:9 VISUELL LYSBILDEMOTOR) */
            <div className="space-y-6">
              {/* TITTEL & AUTOLAGRINGS-KORT PÅ LIK LINJE MED SKRIVEVERKSTEDET */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Presentation className="w-3.5 h-3.5 text-indigo-600" />
                      Framvisningstittel
                    </span>
                    {slides.length > 0 && slides[0]?.title && activePresTitle !== slides[0].title && (
                      <button
                        type="button"
                        onClick={handleSyncTitleFromFirstSlide}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                        title="Autogenerer og overskriv framvisningsnavn etter tittel på lysbilde 1"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                        Synkroniser fra lysbilde 1
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={activePresTitle} 
                      onChange={(e) => handleUpdateTitle(e.target.value)} 
                      placeholder={slides[0]?.title || "Tittel på framvisning..."} 
                      className="w-full text-xl sm:text-2xl font-bold text-slate-900 border-none bg-transparent focus:outline-none placeholder:text-slate-300 transition-colors pr-8" 
                    />
                    <Edit3 className="w-4 h-4 text-slate-300 group-hover:text-slate-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none transition-colors hidden sm:block" />
                  </div>
                </div>

                {/* SIKKERHET OG AUTOLAGRINGSINDIKATOR (PÅ LIK LINJE MED SKRIVEVERKSTEDET) */}
                <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
                  <div 
                    className="h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/90 transition-all select-none group shrink-0 whitespace-nowrap shadow-2xs"
                    title={`Autolagret i skyen og lokal kopi OK (kl. ${lastSavedTime || 'nylig'}).`}
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        <span className="text-[11px] font-semibold text-amber-800 whitespace-nowrap">
                          Lagrer...
                        </span>
                      </>
                    ) : saveStatus === 'error' ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        <span className="text-[11px] font-semibold text-red-700 whitespace-nowrap">
                          Frakoblet (lokal OK)
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-xs ring-2 ring-emerald-500/20" />
                        <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                          Lagret {lastSavedTime ? `kl. ${lastSavedTime}` : ''}
                        </span>
                      </>
                    )}
                    <RotateCcw className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 transition-colors ml-0.5 shrink-0" />
                  </div>
                </div>
              </div>

              {/* Toppkontroller for lysbildevisning */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-2xs">
                    Lysbilde {currentSlideIndex + 1} av {slides.length}
                  </span>
                  <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                    • Målgruppe: {targetAudience.split('(')[0]}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Tema & Bakgrunn Modal-knapp */}
                  <button 
                    type="button"
                    onClick={() => setIsBackgroundModalOpen(true)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer group"
                    title="Velg fargetema, pedagogiske bakgrunnsbilder eller lag KI-bakgrunn"
                  >
                    <div className="relative">
                      <Palette className="w-3.5 h-3.5 text-indigo-600 group-hover:rotate-12 transition-transform" />
                      {globalBackground && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                      )}
                    </div>
                    <span>Tema & Bakgrunn</span>
                    {globalBackground ? (
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md">
                        Fotobakgrunn
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-normal">
                        {SLIDE_THEMES[selectedTheme]?.name}
                      </span>
                    )}
                  </button>

                  {/* Hurtigknapp for KI-bakgrunn */}
                  <button
                    type="button"
                    onClick={() => setIsBackgroundModalOpen(true)}
                    className="px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/80 hover:border-indigo-400 text-indigo-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    title="Generer eller tilpass bakgrunn med KI"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>KI-bakgrunn</span>
                  </button>

                  {/* Innstillinger for presentasjon: Elementer 1, 2, 3, 4 */}
                  <button 
                    type="button"
                    onClick={() => handleOpenSettings()}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer group"
                    title="Innstillinger for presentasjon: Rediger eller skjul topp-merke, undertype, layout-tag og bunntekst"
                  >
                    <Sliders className="w-3.5 h-3.5 text-indigo-600 group-hover:rotate-45 transition-transform" />
                    <span>Innstillinger</span>
                  </button>

                  {/* Fullskjermvisning */}
                  <button 
                    type="button"
                    onClick={() => setIsFullscreenPreview(true)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    title="Se lysbildene i fullskjerm-fremvisning (Tastatur: Esc, Piltaster)"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline">Fullskjerm</span>
                  </button>

                  {/* Foredragsholdervisning (Fase 4: 2 skjermer med teleprompter, tidtaker og projektor-sync) */}
                  <button 
                    type="button"
                    onClick={() => setIsPresenterViewOpen(true)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer group"
                    title="Åpne profesjonell Foredragsholdervisning med teleprompter, tidtaker og storskjerm-synkronisering"
                  >
                    <Radio className="w-3.5 h-3.5 text-emerald-400 group-hover:animate-pulse" />
                    <span>Foredragsholder</span>
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-black rounded-md hidden sm:inline">
                      2 skjermer
                    </span>
                  </button>

                  {/* Eksporter (.pptx) - PowerPoint & Google Presentasjoner */}
                  <button 
                    type="button"
                    onClick={() => setIsExportModalOpen(true)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm hover:shadow cursor-pointer"
                    title="Last ned ekte PowerPoint-fil (.pptx) med automatiske talenotater for PowerPoint og Google Slides"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Eksporter (.pptx)</span>
                  </button>

                  <button 
                    onClick={copyAllSlides}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="Kopier hele presentasjonen med alle stikkord og manus"
                  >
                    {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedAll ? 'Kopiert!' : 'Kopier alt'}
                  </button>

                  <button 
                    onClick={handleNewPresentation} 
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Ny tekst
                  </button>

                  <button 
                    onClick={handleGenerate} 
                    className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Generer på nytt
                  </button>
                </div>
              </div>

              {/* Rask visuell miniatyrvelger (Thumbnail Strip) */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                {slides.map((s, idx) => {
                  const isSelected = currentSlideIndex === idx;
                  const layoutName = s.layout === 'title' ? 'Tittel' : s.layout === 'quote' ? 'Sitat' : s.layout === 'two-column' ? '2 Kolonner' : s.layout === 'highlight' ? 'Fremheving' : 'Kulepunkter';
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentSlideIndex(idx);
                        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                        setIsSpeaking(false);
                      }}
                      className={`shrink-0 w-36 text-left rounded-xl p-2.5 transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/90 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span className={isSelected ? 'text-indigo-600 font-black' : ''}>Slide {s.slide}</span>
                        <span className="uppercase text-[9px] px-1 bg-slate-100 rounded text-slate-500">{layoutName}</span>
                      </div>
                      <p className={`text-[11px] font-semibold truncate leading-tight ${isSelected ? 'text-indigo-950 font-bold' : 'text-slate-700'}`}>
                        {s.title}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Hovedvisning: Venstre 16:9-lerret, høyre talemanus */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Venstre: Ekte 16:9 Lysbilde-lerret */}
                <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3">
                  <SlideCanvas 
                    slide={currentSlide}
                    slideNumber={currentSlideIndex + 1}
                    totalSlides={slides.length}
                    themeId={selectedTheme}
                    backgroundImageUrl={globalBackground}
                    backgroundDim={globalDim}
                    backgroundBlur={globalBlur}
                    brandingSettings={brandingSettings}
                    onOpenSettings={handleOpenSettings}
                    onUpdateSlide={handleUpdateCurrentSlide}
                  />

                  {/* Navigasjonsknapper for slides */}
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        if (currentSlideIndex > 0) setCurrentSlideIndex(currentSlideIndex - 1);
                      }}
                      disabled={currentSlideIndex === 0}
                      className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Forrige
                    </button>

                    <div className="text-center">
                      <span className="text-xs font-bold text-slate-600">
                        {currentSlideIndex + 1} av {slides.length}
                      </span>
                      <span className="text-[10px] text-slate-400 block hidden sm:block">
                        Piltaster ← → eller Mellomrom
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (currentSlideIndex < slides.length - 1) setCurrentSlideIndex(currentSlideIndex + 1);
                      }}
                      disabled={currentSlideIndex === slides.length - 1}
                      className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      Neste <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Høyre: Muntlig talemanus & Prompter */}
                <div className="lg:col-span-5 xl:col-span-4 bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-7 shadow-md flex flex-col justify-between min-h-[420px]">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                          Muntlig manus
                        </h4>
                      </div>
                      
                      {/* Estimert taletid */}
                      {(() => {
                        const words = (currentSlide?.script || '').trim().split(/\s+/).filter(Boolean).length;
                        const seconds = Math.max(15, Math.round((words / 130) * 60));
                        return (
                          <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-md">
                            {words} ord • ~{seconds} sek
                          </span>
                        );
                      })()}
                    </div>

                    {/* Skriptvisning eller redigering */}
                    {isEditingScript ? (
                      <textarea
                        value={currentSlide.script}
                        onChange={(e) => handleUpdateCurrentSlide({ ...currentSlide, script: e.target.value })}
                        className="w-full h-56 p-4 bg-white/10 rounded-2xl border border-white/20 text-sm text-slate-100 leading-relaxed font-normal focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                        placeholder="Skriv talemanus til dette lysbildet..."
                      />
                    ) : (
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-sm text-slate-200 leading-relaxed font-normal italic max-h-[360px] overflow-y-auto">
                        «{currentSlide.script}»
                      </div>
                    )}
                  </div>

                  <div className="pt-6 mt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={() => playScript(currentSlide.script)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        isSpeaking 
                          ? 'bg-amber-500 text-slate-950 shadow-md animate-pulse' 
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="w-4 h-4" /> Stopp opplesing
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4 text-emerald-400" /> Lytt til manus
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingScript(!isEditingScript)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isEditingScript 
                            ? 'bg-emerald-500 text-slate-950 shadow-sm' 
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                        title={isEditingScript ? 'Ferdig med å redigere manus' : 'Rediger manuset for dette lysbildet'}
                      >
                        {isEditingScript ? 'Ferdig' : 'Rediger manus'}
                      </button>

                      <button
                        onClick={() => copyCurrentScript(currentSlide.script)}
                        className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Kopier manus for dette lysbildet"
                      >
                        {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedScript ? 'Kopiert' : 'Kopier'}</span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* FULLSKJERM-FREMVISER LIGHTBOX MODAL */}
          {isFullscreenPreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
              <div className="relative w-full max-w-5xl flex flex-col items-center">
                {/* Lukkeknapp */}
                <button
                  type="button"
                  onClick={() => setIsFullscreenPreview(false)}
                  className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer"
                  title="Lukk fullskjerm (Esc)"
                >
                  <X className="w-6 h-6" />
                </button>

                {/* 16:9 Canvas */}
                <SlideCanvas 
                  slide={currentSlide}
                  slideNumber={currentSlideIndex + 1}
                  totalSlides={slides.length}
                  themeId={selectedTheme}
                  backgroundImageUrl={globalBackground}
                  backgroundDim={globalDim}
                  backgroundBlur={globalBlur}
                  brandingSettings={brandingSettings}
                  hideControls={true}
                  className="w-full shadow-2xl"
                />

                {/* Fullskjermkontroller */}
                <div className="mt-4 flex items-center justify-between w-full text-white/80 px-2">
                  <button
                    onClick={() => {
                      if (currentSlideIndex > 0) setCurrentSlideIndex(currentSlideIndex - 1);
                    }}
                    disabled={currentSlideIndex === 0}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Forrige slide
                  </button>

                  <div className="text-center text-xs font-semibold text-white/60">
                    Slide {currentSlideIndex + 1} av {slides.length} • Trykk Esc for å lukke
                  </div>

                  <button
                    onClick={() => {
                      if (currentSlideIndex < slides.length - 1) setCurrentSlideIndex(currentSlideIndex + 1);
                    }}
                    disabled={currentSlideIndex === slides.length - 1}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    Neste slide <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TEMA- OG BAKGRUNNSVELGER MODAL (FASE 2) */}
          <BackgroundManagerModal 
            isOpen={isBackgroundModalOpen}
            onClose={() => setIsBackgroundModalOpen(false)}
            currentSlideIndex={currentSlideIndex}
            totalSlides={slides.length}
            currentSlide={currentSlide}
            selectedTheme={selectedTheme}
            onSelectTheme={handleSelectTheme}
            globalBackground={globalBackground}
            globalDim={globalDim}
            globalBlur={globalBlur}
            onUpdateGlobalBackground={handleUpdateGlobalBackground}
            onUpdateCurrentSlide={handleUpdateCurrentSlide}
            presentationTitle={activePresTitle || currentSlide?.title}
          />

          {/* INNSTILLINGER FOR PRESENTASJON (REDIGERBARE ELEMENTER 1, 2, 3, 4) */}
          <PresentationSettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            settings={brandingSettings}
            onUpdateSettings={handleUpdateBrandingSettings}
            focusedElement={focusedSettingsElement}
          />

          {/* EKSPORT TIL POWERPOINT & GOOGLE PRESENTASJONER MODAL (FASE 3) */}
          <ExportPresentationModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            slides={slides}
            title={activePresTitle || currentSlide?.title || 'BLU Presentasjon'}
            themeId={selectedTheme}
            globalBackground={globalBackground}
            brandingSettings={brandingSettings}
            onCopyAll={copyAllSlides}
            copiedAll={copiedAll}
          />

          {/* FOREDRAGSHOLDERVISNING MED TELEPROMPTER & 2 SKJERMER (FASE 4) */}
          <PresenterViewModal
            isOpen={isPresenterViewOpen}
            onClose={() => setIsPresenterViewOpen(false)}
            slides={slides}
            currentSlideIndex={currentSlideIndex}
            onSlideChange={(newIdx) => {
              setCurrentSlideIndex(newIdx);
              if ('speechSynthesis' in window) window.speechSynthesis.cancel();
              setIsSpeaking(false);
            }}
            themeId={selectedTheme}
            globalBackground={globalBackground}
            globalDim={globalDim}
            globalBlur={globalBlur}
            brandingSettings={brandingSettings}
            title={activePresTitle || currentSlide?.title || 'BLU Presentasjon'}
          />

        </div>
      </div>

      {/* OPPRETT NY MAPPE MODAL */}
      {isCreatingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-slate-800">Opprett ny mappe</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Hold orden i lysbildeserier, talemanus og forelegg.
              </p>
            </div>
            <div className="pt-2">
              <input 
                type="text" 
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                placeholder="F.eks. Praksis H26"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName('');
                  }} 
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Avbryt
                </button>
                <button 
                  onClick={handleCreateFolder} 
                  disabled={!newFolderName.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
                >
                  Opprett mappe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HENT FRA FILARKIV */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Topp / Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Hent fra filarkivet ditt
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Velg et dokument eller notat som skal danne grunnlag for presentasjonen.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Søk & Filter */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-white space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  placeholder="Søk etter tittel, tema eller innhold..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Kategori-tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
                {[
                  { id: 'all', label: `Alle (${archiveItems.length})` },
                  { id: 'workshop', label: 'Skriveverksted' },
                  { id: 'file_archive', label: 'Filarkiv' },
                  { id: 'field_note', label: 'Kladdeblokk & Feltnotater' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setArchiveCategoryFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                      archiveCategoryFilter === tab.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Innholdsliste */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/50">
              {isLoadingArchive ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
                  <span className="text-xs font-medium">Henter dokumenter fra skyen og arkivet...</span>
                </div>
              ) : filteredArchiveItems.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 p-6">
                  <Folder className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">Ingen dokumenter funnet</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {archiveSearch 
                      ? 'Prøv et annet søkeord eller endre kategorifilteret.'
                      : 'Du har ingen lagrede dokumenter i denne kategorien enda.'}
                  </p>
                </div>
              ) : (
                filteredArchiveItems.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => handleSelectArchiveDoc(item)}
                    className="p-4 bg-white border border-slate-200/90 hover:border-emerald-500 rounded-2xl shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          item.sourceType === 'workshop'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : item.sourceType === 'file_archive'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {item.sourceLabel}
                        </span>
                        {item.categoryTag && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {item.categoryTag}
                          </span>
                        )}
                        {item.date && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            • {item.date}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 font-medium">
                          • {item.wordsCount} ord
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {item.preview}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectArchiveDoc(item);
                      }}
                      className="px-3.5 py-2 bg-slate-100 group-hover:bg-emerald-600 text-slate-700 group-hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-2xs"
                    >
                      <span>Bruk som kilde</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Bunn / Avbryt */}
            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {filteredArchiveItems.length} tilgjengelige kildedokumenter
              </span>
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Lukk
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
