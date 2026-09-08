import { Home as HomeComponent } from './components/Home';
import { DocumentManager } from './components/DocumentManager';
import { Settings as SettingsComponent } from './components/Settings';
import { Pricing as PricingComponent } from './components/Pricing';
import { Admin as AdminComponent } from './components/Admin';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsOfService } from './components/TermsOfService';
import { ContextFilesManager } from './components/ContextFilesManager';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Calendar,
  Shield,
  CheckCircle2,
  Clock,
  Clipboard,
  BookOpen, 
  MessageSquare, 
  Search, 
  ShieldCheck, 
  ShieldAlert,
  FileText, 
  ExternalLink, 
  Send, 
  Loader2, 
  Sparkles, 
  Info,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  HandHelping,
  Scale,
  Plus,
  PlusCircle,
  Trash2,
  ChevronUp,
  ChevronDown,
  Edit3,
  ListTree,
  CheckSquare,
  Quote,
  Library,
  X,
  Check,
  Upload,
  FileCheck,
  User,
  UserCheck,
  Copy,
  FileEdit,
  Download,
  Save,
  FileDown,
  Share2,
  Home as HomeIcon,
  Layout,
  LayoutDashboard,
  LayoutGrid,
  Grid,
  Archive,
  Globe,
  List,
  Compass,
  ClipboardCheck,
  ArrowRight,
  ArrowUpCircle,
  CreditCard,
  Settings,
  Users,
  Zap,
  Eye,
  Lock,
  Bell,
  BellRing,
  Smartphone,
  Moon,
  Sun,
  Timer,
  AlertTriangle,
  Menu,
  RefreshCw,
  LogOut,
  Maximize2,
  Minimize2,
  PenTool,
  HelpCircle,
  Video,
  AlertCircle,
  Folder,
  FolderPlus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn, formatBytes } from './lib/utils';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TableOfContents, PageNumber, Header, Footer } from 'docx';
import { jsPDF } from 'jspdf';
import Tesseract from 'tesseract.js';
import { 
  auth, 
  db,
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  googleProvider,
  messaging
} from './firebase';
import { getToken } from 'firebase/messaging';
import { doc, getDoc, setDoc, getDocFromServer, updateDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { 
  generateAcademicResponse, 
  analyzeThesisStructure, 
  evaluateSource, 
  brainstormPerspectives, 
  evaluateThesis, 
  evaluateThesisAsDevilAdvocate,
  checkAPA7, 
  getMethodologyAdvice,
  analyzePdfContent,
  performDeepPdfAnalysis,
  performDeepSourceAnalysis,
  defineTerm,
  getLiteratureSuggestions,
  helpWithFeedback,
  analyzeAssignmentText,
  synthesizeEvaluations,
  checkPlagiarism,
  analyzeMultiPdfs,
  analyzeWithSystemPrompt
} from './services/geminiService';

import { extractTextFromPdf } from './lib/pdfUtils';

interface AppDocument {
  id: string;
  title: string;
  content: Record<string, string>;
  outline: any[];
  folderId: string | null;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
  updatedAt: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DISPOSITIONS: Record<string, { id: string, label: string, desc: string }[]> = {
  'Bacheloroppgave': [
    { id: 'innledning', label: 'Innledning', desc: 'Problemstilling, begrunnelse og avgrensning.' },
    { id: 'teori', label: 'Teori', desc: 'Tidligere forskning og teoretisk rammeverk.' },
    { id: 'metode', label: 'Metode', desc: 'Design, utvalg, analyse og etikk.' },
    { id: 'forskningsetikk', label: 'Forskningsetiske vurderinger', desc: 'Anonymisering, samtykke og etisk forsvarlighet.' },
    { id: 'resultater', label: 'Resultater', desc: 'Presentasjon av dine funn.' },
    { id: 'diskusjon', label: 'Drøfting', desc: 'Analyse og diskusjon av funn opp mot teori.' },
    { id: 'konklusjon', label: 'Konklusjon', desc: 'Oppsummering og svar på problemstilling.' },
    { id: 'litteraturliste', label: 'Litteraturliste', desc: 'Alle kilder i APA 7-stil.' }
  ],
  'Obligatorisk arbeidskrav': [
    { id: 'innledning', label: 'Innledning', desc: 'Presentasjon av oppgaven.' },
    { id: 'hoveddel', label: 'Hoveddel', desc: 'Besvarelse av arbeidskravet.' },
    { id: 'refleksjon', label: 'Refleksjon', desc: 'Faglig refleksjon.' },
    { id: 'litteraturliste', label: 'Litteraturliste', desc: 'Kilder brukt i oppgaven.' }
  ],
  'Praksisfortelling/Praksisoppgave': [
    { id: 'praksisfortelling', label: 'Praksisfortelling', desc: 'Beskrivelse av situasjonen.' },
    { id: 'faglig_analyse', label: 'Faglig analyse', desc: 'Koble til teori og Rammeplan.' },
    { id: 'didaktisk_refleksjon', label: 'Didaktisk refleksjon', desc: 'Vurdering av pedagogisk praksis.' }
  ],
  'Refleksjonsnotat': [
    { id: 'praksisfortelling', label: 'Praksisfortelling', desc: 'Beskrivelse av en konkret hendelse fra praksis.' },
    { id: 'egne_reaksjoner', label: 'Egne reaksjoner', desc: 'Dine umiddelbare tanker og følelser rundt hendelsen.' },
    { id: 'faglig_analyse', label: 'Faglig analyse', desc: 'Koble hendelsen til relevant pedagogisk teori.' },
    { id: 'kritisk_refleksjon', label: 'Kritisk refleksjon', desc: 'Vurdering av egen rolle og alternative handlingsmåter.' }
  ],
  'Refleksjons- og diskusjonsoppgave': [
    { id: 'innledning', label: 'Innledning', desc: 'Presentasjon av tema og problemstilling.' },
    { id: 'teoretisk_perspektiv', label: 'Teoretisk perspektiv', desc: 'Gjennomgang av relevante teorier.' },
    { id: 'diskusjon', label: 'Diskusjon', desc: 'Drøfting av ulike synspunkter.' },
    { id: 'refleksjon', label: 'Refleksjon', desc: 'Egen refleksjon over temaet.' },
    { id: 'oppsummering', label: 'Oppsummering', desc: 'Konklusjon og veien videre.' }
  ],
  'Observasjon og dokumentasjon': [
    { id: 'innledning', label: 'Innledning', desc: 'Bakgrunn for observasjonen.' },
    { id: 'metode', label: 'Metode', desc: 'Beskrivelse av observasjonsmetode og kontekst.' },
    { id: 'forskningsetikk', label: 'Forskningsetiske vurderinger', desc: 'Anonymisering og samtykke.' },
    { id: 'data_presentasjon', label: 'Presentasjon av data', desc: 'Gjennomgang av det som ble observert.' },
    { id: 'analyse', label: 'Analyse', desc: 'Tolkning av data i lys av teori.' },
    { id: 'vurdering', label: 'Vurdering', desc: 'Pedagogiske konsekvenser og vurdering.' }
  ],
  'Pedagogisk planlegging og vurdering': [
    { id: 'mal_begrunnelse', label: 'Mål og begrunnelse', desc: 'Hva skal skje og hvorfor (forankring i rammeplan).' },
    { id: 'gjennomforing', label: 'Gjennomføring', desc: 'Beskrivelse av den pedagogiske aktiviteten.' },
    { id: 'didaktiske_overveielser', label: 'Didaktiske overveielser', desc: 'Hva, hvordan og hvorfor.' },
    { id: 'vurdering_evaluering', label: 'Vurdering og evaluering', desc: 'Hvordan ble målene nådd?' }
  ],
  'Prosjektarbeid': [
    { id: 'prosjektbeskrivelse', label: 'Prosjektbeskrivelse', desc: 'Bakgrunn, tema og mål for prosjektet.' },
    { id: 'planlegging', label: 'Planlegging', desc: 'Hvordan prosjektet ble organisert.' },
    { id: 'gjennomforing', label: 'Gjennomføring', desc: 'Beskrivelse av prosessen.' },
    { id: 'resultater', label: 'Resultater', desc: 'Hva ble oppnådd?' },
    { id: 'evaluering', label: 'Evaluering', desc: 'Erfaringer og læringspunkter.' }
  ],
  'Fagtekst': [
    { id: 'innledning', label: 'Innledning', desc: 'Presentasjon av tema og avgrensning.' },
    { id: 'teoretisk_rammeverk', label: 'Teoretisk rammeverk', desc: 'Sentrale begreper og teorier.' },
    { id: 'faglig_drofting', label: 'Faglig drøfting', desc: 'Analyse og diskusjon av temaet.' },
    { id: 'konklusjon', label: 'Konklusjon', desc: 'Oppsummering av hovedpoeng.' },
    { id: 'litteraturliste', label: 'Litteraturliste', desc: 'Oversikt over brukte kilder.' }
  ],
  'Egendefinert struktur': []
};

const DEFAULT_DISPOSITION = [
  { id: 'innledning', label: 'Innledning', desc: 'Start skrivingen her.' },
  { id: 'hoveddel', label: 'Hoveddel', desc: 'Utvikle dine argumenter.' },
  { id: 'avslutning', label: 'Avslutning', desc: 'Oppsummering.' }
];

const GlossaryCard = ({ 
  item, 
  index, 
  searchCounts, 
  incrementSearchCount, 
  copyToClipboard, 
  copiedId 
}: { 
  item: { term: string, def: string }, 
  index: number,
  searchCounts: Record<string, number>,
  incrementSearchCount: (term: string) => void,
  copyToClipboard: (text: string, id: string) => void,
  copiedId: string | null
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      className={cn(
        "p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-primary-light transition-all cursor-pointer group relative flex flex-col h-fit",
        isExpanded && "border-primary-light bg-white shadow-sm"
      )}
      onClick={() => {
        setIsExpanded(!isExpanded);
        if (!isExpanded) incrementSearchCount(item.term);
      }}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2 flex-1">
          <h4 className="font-bold text-primary-dark">{item.term}</h4>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
        <div className="flex items-center gap-2">
          {searchCounts[item.term.toLowerCase()] > 0 && (
            <span className="text-[10px] bg-primary-light text-primary px-1.5 py-0.5 rounded-full font-bold">
              {searchCounts[item.term.toLowerCase()]} søk
            </span>
          )}
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              copyToClipboard(`${item.term}: ${item.def}`, `glossary-${index}`); 
            }}
            className={cn(
              "p-1 rounded-lg bg-white border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-50 text-slate-400 hover:text-primary",
              copiedId === `glossary-${index}` && "opacity-100 text-emerald-500 border-emerald-100"
            )}
            title="Kopier definisjon"
          >
            {copiedId === `glossary-${index}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="text-xs text-slate-600 leading-relaxed prose prose-sm prose-slate max-w-none mt-3 pt-3 border-t border-slate-100">
              <ReactMarkdown>{item.def}</ReactMarkdown>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="mt-4 text-[10px] font-bold text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
            >
              <ChevronUp className="w-3 h-3" /> Vis mindre
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'task-start' | 'writing-workshop' | 'polishing' | 'assistant' | 'literature-ref' | 'glossary-auto' | 'method-ethics' | 'pdf-analysis' | 'resources' | 'file-archive' | 'profile' | 'settings' | 'about' | 'pricing' | 'milestones' | 'collaboration' | 'sensor' | 'apa' | 'checklist' | 'citations' | 'methodology' | 'literature' | 'ethics' | 'glossary' | 'pdf' | 'source' | 'chat' | 'writing-process' | 'progress' | 'admin' | 'privacy' | 'terms'>('home');
  const [writingStep, setWritingStep] = useState(1);
  const [showStorageWarning, setShowStorageWarning] = useState(true);

  // Service Worker Registration
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => {
            console.log('SW registered: ', registration);
          })
          .catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: true,
    group: true,
    deadlines: true,
    chat: true,
    tips: true
  });

  const handleUpdateNotificationPref = async (key: keyof typeof notificationSettings) => {
    const newSettings = { ...notificationSettings, [key]: !notificationSettings[key] };
    setNotificationSettings(newSettings);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { notificationSettings: newSettings });
      } catch (error) {
        console.error("Error updating notification settings:", error);
      }
    }
  };

  const requestNotificationPermission = async () => {
    // HTTPS Check
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setGlobalError("Varslinger krever en sikker tilkobling (HTTPS).");
      return;
    }

    if (typeof Notification === 'undefined') {
      setGlobalError("Denne nettleseren støtter ikke varslinger.");
      return;
    }

    if (Notification.permission === 'denied') {
      setGlobalError("Varslinger er blokkert. Endre dette i nettleserinnstillingene dine.");
      setPermissionStatus('denied');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === 'granted') {
        if (messaging) {
          try {
            const token = await getToken(messaging, { vapidKey: 'BPE_YOUR_VAPID_KEY_HERE' });
            if (user) {
              await updateDoc(doc(db, 'users', user.uid), { fcmToken: token });
            }
          } catch (tokenError) {
            console.warn("Could not get FCM token, but permission is granted:", tokenError);
          }
        }
        
        // Send local test notification (Simulated Push)
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          registration.showNotification('Suksess!', {
            body: 'Varslinger er nå aktivert for BLU-Hjelperen.',
            icon: 'https://picsum.photos/seed/blu-icon/192/192',
            badge: 'https://picsum.photos/seed/blu-icon/192/192',
            tag: 'welcome-notification'
          });
        }

        setGlobalSuccess("Varslinger er aktivert på denne enheten!");
      } else {
        setGlobalError("Varslingstillatelse ble avvist.");
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      setGlobalError("Kunne ikke aktivere varslinger. Sjekk nettleserinnstillinger.");
    }
  };

  enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
  }

  interface FirestoreErrorInfo {
    error: string;
    operationType: OperationType;
    path: string | null;
    authInfo: {
      userId: string | undefined;
      email: string | null | undefined;
      emailVerified: boolean | undefined;
      isAnonymous: boolean | undefined;
      tenantId: string | null | undefined;
      providerInfo: {
        providerId: string;
        displayName: string | null;
        email: string | null;
        photoUrl: string | null;
      }[];
    }
  }

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    setGlobalError(`Oisann! Det oppstod en liten feil med databasen: ${errInfo.error}. Vi prøver å fikse det!`);
    throw new Error(JSON.stringify(errInfo));
  };

  useEffect(() => {
    if (globalSuccess) {
      const timer = setTimeout(() => setGlobalSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [globalSuccess]);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
          setGlobalError("Kunne ikke koble til databasen. Vennligst sjekk internettforbindelsen eller konfigurasjonen.");
        }
      }
    }
    testConnection();
  }, []);

  const faqData = [
    {
      q: "Er dette juks, eller kan KI skrive hele oppgaven for meg?",
      a: "Nei, BLU-Hjelperen er ikke et jukseverktøy, men din personlige BLU skrivehjelp. Den er designet for å strukturere tankene dine og gi tilbakemelding på tekst du har produsert selv. Den kan ikke skrive oppgaven for deg, men hjelper deg å oversette gode praksisopplevelser til sterk akademisk tekst i tråd med retningslinjene."
    },
    {
      q: "Kan BLU-Hjelperen bomme helt på oppgaven jeg vil skrive?",
      a: "Kunstig intelligens er et verktøy som baserer seg på dine instrukser. Derfor har vi bygget skreddersydde maler som rammer inn skriveprosessen. Enten du trenger generell barnehagelærer skrivehjelp til et praksisnotat eller avansert strukturering av teori, hjelper appen deg å holde tråden. Du som student har imidlertid alltid det siste ordet."
    },
    {
      q: "Får jeg veiledning via appen, og kan \"sensoren\" gi konkrete tilbakemeldinger?",
      a: "Ja! Appen har en fiktiv \"sensor\" som gir deg umiddelbar, formativ tilbakemelding på utkastene dine ut fra faglige kriterier. Jobber du for eksempel med en stor avslutningsoppgave og trenger spesifikk BLU bachelor skrivehjelp, vil sensoren peke på logiske brister og drøftingsnivå. Husk likevel at dette er et supplement, og aldri erstatter formell veiledning fra faglærer."
    },
    {
      q: "Hvorfor velge denne appen fremfor vanlig ChatGPT?",
      a: "Vanlige KI-modeller kjenner ikke nødvendigvis til Rammeplanen for barnehagen eller de spesifikke akademiske kravene på utdanningen. Vår plattform er spesialsydd for ditt studieløp. Enten det er et kort refleksjonsnotat eller du leter etter barnehagelærer bachelor skrivehjelp, får du et verktøy som forstår konteksten din."
    },
    {
      q: "Hva skjer med tekstene mine? Er det trygt?",
      a: "Dine data lagres trygt og kryptert i Google Firebase. Dette gjør at du kan bytte mellom enheter uten å miste arbeid. Vi bruker aldri dine tekster til å trene opp KI-modeller, og du eier dine egne data fullt og helt."
    }
  ];

  const getMilestoneMessage = (progressPercent: number) => {
    if (progressPercent === 0) return "Klar for å starte? Sjekk sjekklisten i 'Oppgaver' for å komme i gang!";
    if (progressPercent <= 10) return "Godt i gang! Den første biten er ofte den tyngste.";
    if (progressPercent <= 50) return "Du er godt underveis! Husk å ta pauser.";
    if (progressPercent <= 90) return "Over halvveis! Nå ser du lyset i tunnelen.";
    return "Nesten i mål! Bare den siste finpussen igjen.";
  };

  const ContextualHelp = ({ title, content }: { title: string, content: string }) => (
    <div className="group relative inline-block ml-1">
      <HelpCircle className="w-3.5 h-3.5 text-slate-300 hover:text-primary cursor-help transition-colors" />
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
        <p className="font-bold mb-1">{title}</p>
        <p className="leading-relaxed opacity-90">{content}</p>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-slate-800"></div>
      </div>
    </div>
  );

  const HelpSection = ({ title, content }: { title: string, content: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="mb-6">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-primary hover:text-primary-hover transition-all group"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Hva er dette?</span>
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="p-4 bg-primary-light/20 border border-primary-light/50 rounded-2xl text-sm text-primary-dark leading-relaxed shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-primary" />
                  <strong className="font-bold">Hva er dette?</strong>
                </div>
                {content}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };
  
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('blu_profile_guest');
    return saved ? JSON.parse(saved) : {
      name: '',
      email: '',
      studentId: '',
      candidateId: '',
      year: '',
      specialization: '',
      studyProgram: '',
      studyModel: '',
      courses: '',
      deadline: '',
      college: ''
    };
  });

  const [pricingTier, setPricingTier] = useState<'free' | 'monthly' | 'semester' | 'preview' | 'yearly'>(() => {
    const saved = localStorage.getItem('blu_pricing_tier_guest');
    return (saved as any) || 'free';
  });

  const [milestones, setMilestones] = useState<{ id: string; title: string; date: string; completed: boolean }[]>(() => {
    const saved = localStorage.getItem('blu_milestones_guest');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Problemstilling klar', date: '', completed: false },
      { id: '2', title: 'Litteratursøk ferdig', date: '', completed: false },
      { id: '3', title: 'Første utkast levert', date: '', completed: false }
    ];
  });

  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem('blu_progress_guest');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Problemstilling', status: 'not-started' },
      { id: '2', title: 'Litteratursøk', status: 'not-started' },
      { id: '3', title: 'Teorikapittel', status: 'not-started' },
      { id: '4', title: 'Metodekapittel', status: 'not-started' },
      { id: '5', title: 'Datainnsamling', status: 'not-started' },
      { id: '6', title: 'Analyse', status: 'not-started' },
      { id: '7', title: 'Diskusjon', status: 'not-started' },
      { id: '8', title: 'Konklusjon', status: 'not-started' }
    ];
  });

  const [checklist, setChecklist] = useState(() => {
    const saved = localStorage.getItem('blu_checklist_guest');
    return saved ? JSON.parse(saved) : [
      { id: '1', text: 'Forside med tittel, navn, studentnummer, kandidatnummer og årstall', checked: false },
      { id: '2', text: 'Sammendrag / Abstract', checked: false },
      { id: '3', text: 'Innholdsfortegnelse med sidetall', checked: false },
      { id: '4', text: 'Akademisk språk: Er teksten saklig og objektiv?', checked: false },
      { id: '5', text: 'KI-erklæring: Har du opplyst om bruk av KI-verktøy?', checked: false },
      { id: '6', text: 'Kildekritikk: Er alle påstander underbygget med troverdige kilder?', checked: false },
      { id: '7', text: 'Litteraturliste i APA 7-stil (sjekket mot Kildekompasset)', checked: false },
      { id: '8', text: 'Problemstilling: Er den tydelig og besvart i konklusjonen?', checked: false },
      { id: '9', text: 'Etikk: Er personvern og SIKT-meldeplikt ivaretatt?', checked: false },
      { id: '10', text: 'Formatering: 1,5 linjeavstand, font 12, 2,5 cm marger', checked: false }
    ];
  });

  const [outline, setOutline] = useState<{ id: string; title: string; subchapters: { id: string; title: string }[] }[]>(() => {
    const saved = localStorage.getItem('blu_outline_guest');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Innledning', subchapters: [{ id: '1-1', title: 'Problemstilling' }, { id: '1-2', title: 'Begrepsavklaring' }] },
      { id: '2', title: 'Teori', subchapters: [{ id: '2-1', title: 'Tidligere forskning' }] },
      { id: '3', title: 'Metode', subchapters: [] },
      { id: '4', title: 'Analyse', subchapters: [] },
      { id: '5', title: 'Diskusjon', subchapters: [] },
      { id: '6', title: 'Avslutning', subchapters: [] }
    ];
  });

  const [bachelorDocument, setBachelorDocument] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('blu_bachelor_document_guest');
    return saved ? JSON.parse(saved) : {};
  });

  const [activeDisposition, setActiveDisposition] = useState<any[]>(() => {
    const saved = localStorage.getItem('blu_active_disposition_guest');
    return saved ? JSON.parse(saved) : [];
  });

  const [documents, setDocuments] = useState<AppDocument[]>(() => {
    const saved = localStorage.getItem('blu_documents_guest');
    if (saved) return JSON.parse(saved);
    
    // Migration: if we have an old bachelorDocument, convert it to the new format
    const oldDoc = localStorage.getItem('dmmh_bachelor_document');
    const oldOutline = localStorage.getItem('dmmh_outline');
    if (oldDoc && oldOutline) {
      return [{
        id: 'main',
        title: 'Hoveddokument',
        content: JSON.parse(oldDoc),
        outline: JSON.parse(oldOutline),
        folderId: null,
        updatedAt: new Date().toISOString()
      }];
    }
    return [];
  });

  const [folders, setFolders] = useState<Folder[]>(() => {
    const saved = localStorage.getItem('blu_folders_guest');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(() => {
    const saved = localStorage.getItem('blu_active_document_id_guest');
    return saved || (documents.length > 0 ? documents[0].id : null);
  });

  const [showPaywall, setShowPaywall] = useState(false);

  const canCreateDocument = () => {
    if (pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview') return true;
    if (pricingTier === 'monthly' && documents.length < 3) return true;
    return false;
  };

  const createNewDocument = (title: string = 'Nytt dokument', folderId: string | null = null) => {
    if (!canCreateDocument()) {
      setShowPaywall(true);
      return;
    }

    const newDoc: AppDocument = {
      id: Date.now().toString(),
      title,
      content: {},
      outline: [
        { id: '1', title: 'Innledning', subchapters: [] },
        { id: '2', title: 'Teori', subchapters: [] },
        { id: '3', title: 'Metode', subchapters: [] },
        { id: '4', title: 'Analyse', subchapters: [] },
        { id: '5', title: 'Diskusjon', subchapters: [] },
        { id: '6', title: 'Avslutning', subchapters: [] }
      ],
      folderId,
      updatedAt: new Date().toISOString()
    };

    setDocuments(prev => [newDoc, ...prev]);
    setActiveDocumentId(newDoc.id);
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (activeDocumentId === id) {
      setActiveDocumentId(null);
    }
  };

  const renameDocument = (id: string, title: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, title, updatedAt: new Date().toISOString() } : d));
  };

  const activeDocument = documents.find(d => d.id === activeDocumentId) || documents[0];

  const PaywallModal = () => (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 p-10 text-center space-y-6"
      >
        <div className="flex justify-center">
          <div className="bg-amber-50 p-6 rounded-[2.5rem]">
            <Zap className="w-12 h-12 text-amber-500" />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-slate-900 leading-tight">Dokumentgrense nådd</h2>
          <p className="text-slate-500 leading-relaxed">
            Månedsabonnement inkluderer inntil 3 aktive arbeidsdokumenter. Oppgrader til Årsabonnement for ubegrenset lagring og mappestruktur.
          </p>
        </div>
        <div className="space-y-4 pt-4">
          <button 
            onClick={() => {
              setActiveTab('pricing');
              setShowPaywall(false);
            }}
            className="w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary-hover transition-all shadow-lg shadow-primary-light"
          >
            Oppgrader nå
          </button>
          <button 
            onClick={() => setShowPaywall(false)}
            className="w-full py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors text-sm"
          >
            Kanskje senere
          </button>
        </div>
      </motion.div>
    </div>
  );

  useEffect(() => {
    const doc = documents.find(d => d.id === activeDocumentId);
    if (doc) {
      setBachelorDocument(doc.content);
      setOutline(doc.outline);
    }
  }, [activeDocumentId]);

  useEffect(() => {
    if (activeDocumentId) {
      setDocuments(prev => prev.map(d => 
        d.id === activeDocumentId 
          ? { ...d, content: bachelorDocument, outline: outline, updatedAt: new Date().toISOString() } 
          : d
      ));
    }
  }, [bachelorDocument, outline]);

  const [user, setUser] = useState<FirebaseUser | null>(null);

  // Simple Router to handle direct links (e.g., /profil, /personvern)
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/profil')) {
      setActiveTab('profile');
    }
    if (path.includes('/personvern')) {
      setActiveTab('privacy');
    }
    if (path.includes('/vilkar')) {
      setActiveTab('terms');
    }
    if (path.includes('/admin') && (user?.email === 'svein.nordvik@gmail.com' || profile.email === 'svein.nordvik@gmail.com')) {
      setActiveTab('admin');
    }
  }, [user, profile.email]);

  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const isRestored = useRef(false);

  // Sync state to Firestore when user is logged in
  useEffect(() => {
    if (user && isRestored.current) {
      const syncData = async () => {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            pricingTier,
            profile,
            notificationSettings,
            documents,
            folders,
            updatedAt: new Date().toISOString()
          }, { merge: true });

          await setDoc(doc(db, 'users', user.uid, 'projects', 'main'), {
            userId: user.uid,
            milestones,
            progress,
            checklist,
            outline,
            updatedAt: new Date().toISOString()
          }, { merge: true });

          // Save bachelor document
          await setDoc(doc(db, 'users', user.uid, 'documents', 'main'), {
            userId: user.uid,
            title: 'Hoveddokument',
            content: bachelorDocument,
            activeDisposition,
            updatedAt: new Date().toISOString()
          }, { merge: true });

        } catch (error) {
          console.error("Error syncing data to Firestore:", error);
        }
      };
      const timeoutId = setTimeout(syncData, 2000); // Debounce sync
      return () => clearTimeout(timeoutId);
    }
  }, [user, pricingTier, profile, notificationSettings, milestones, progress, checklist, outline, bachelorDocument, activeDisposition, documents, folders]);

  // Restore data from Firestore on login
  useEffect(() => {
    const restoreData = async () => {
      if (user && !isRestored.current) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.pricingTier) setPricingTier(userData.pricingTier);
            if (userData.profile) setProfile(userData.profile);
            if (userData.notificationSettings) setNotificationSettings(userData.notificationSettings);
            if (userData.documents) setDocuments(userData.documents);
            if (userData.folders) setFolders(userData.folders);
          }

          const projectDoc = await getDoc(doc(db, 'users', user.uid, 'projects', 'main'));
          if (projectDoc.exists()) {
            const projectData = projectDoc.data();
            if (projectData.milestones) setMilestones(projectData.milestones);
            if (projectData.progress) setProgress(projectData.progress);
            if (projectData.checklist) setChecklist(projectData.checklist);
            if (projectData.outline) setOutline(projectData.outline);
          }

          const docSnap = await getDoc(doc(db, 'users', user.uid, 'documents', 'main'));
          if (docSnap.exists()) {
            const docData = docSnap.data();
            if (docData.content) setBachelorDocument(docData.content);
            if (docData.activeDisposition) setActiveDisposition(docData.activeDisposition);
          }

          isRestored.current = true;
        } catch (error) {
          console.error("Error restoring data from Firestore:", error);
        }
      }
    };
    restoreData();
  }, [user]);

  // Persist active tab and writing step
  useEffect(() => {
    if (user && isRestored.current) {
      localStorage.setItem(`activeTab_${user.uid}`, activeTab);
      localStorage.setItem(`writingStep_${user.uid}`, writingStep.toString());
    }
  }, [activeTab, writingStep, user]);

  // Restore active tab and writing step
  useEffect(() => {
    if (user && !isRestored.current) {
      const savedTab = localStorage.getItem(`activeTab_${user.uid}`);
      const savedStep = localStorage.getItem(`writingStep_${user.uid}`);
      if (savedTab) setActiveTab(savedTab as any);
      if (savedStep) setWritingStep(parseInt(savedStep));
      isRestored.current = true;
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      
      if (currentUser) {
        // Fetch profile ONLY from UID-specific localStorage
        const saved = localStorage.getItem(`studentProfile_${currentUser.uid}`);
        if (saved) {
          setProfile(JSON.parse(saved));
        }
      } else {
        // Clear profile state on logout
        setProfile({
          name: '',
          email: '',
          studentId: '',
          candidateId: '',
          year: '',
          specialization: '',
          studyProgram: '',
          studyModel: '',
          courses: '',
          deadline: ''
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setShowAuthModal(false);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveTab('home');
      isRestored.current = false;
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const navigationGroups = [
    { id: 'hjem', label: 'Hjem', icon: HomeIcon, subTabs: [
      { id: 'home', label: 'Oversikt', icon: HomeIcon, requiredTier: 'free' }
    ]},
    { id: 'skriving', label: 'Skriving', icon: PenTool, subTabs: [
      { id: 'task-start', label: 'Oppgaver', icon: PlusCircle, requiredTier: 'free' },
      { id: 'writing-workshop', label: 'Skriveverksted', icon: FileEdit, requiredTier: 'free' },
      { id: 'polishing', label: 'Finpuss', icon: CheckSquare, requiredTier: 'free' },
      { id: 'assistant', label: 'Assistent', icon: MessageSquare, requiredTier: 'free' }
    ]},
    { id: 'verktoy', label: 'Verktøy', icon: Zap, subTabs: [
      { id: 'sensor', label: 'Sensorverktøy', icon: Scale, requiredTier: 'monthly' },
      { id: 'literature-ref', label: 'Litteratur & Referanse', icon: BookOpen, requiredTier: 'free' },
      { id: 'glossary-auto', label: 'Begrepsavklaring', icon: Search, requiredTier: 'free' },
      { id: 'method-ethics', label: 'Metode & Etikk', icon: Shield, requiredTier: 'free' },
      { id: 'pdf-analysis', label: 'PDF Analyse', icon: FileText, requiredTier: 'monthly' },
      { id: 'collaboration', label: 'Samarbeid', icon: Users, requiredTier: 'semester' }
    ]},
    { id: 'ressurser', label: 'Ressurser', icon: Library, subTabs: [
      { id: 'resources', label: 'Ressursbibliotek', icon: Grid, requiredTier: 'free' },
      { id: 'file-archive', label: 'Filarkiv', icon: Archive, requiredTier: 'free' }
    ]},
    { id: 'profil', label: 'Profil', icon: User, subTabs: [
      { id: 'profile', label: 'Min Profil', icon: User, requiredTier: 'free' },
      { id: 'settings', label: 'Innstillinger', icon: Settings, requiredTier: 'free' },
      { id: 'about', label: 'Om BLU-Hjelperen', icon: Info, requiredTier: 'free' }
    ]}
  ];

  // Dynamisk tillegg av Admin-fane for eier
  if (user?.email === 'svein.nordvik@gmail.com' || profile.email === 'svein.nordvik@gmail.com') {
    const adminGroup = {
      id: 'admin-group',
      label: 'System',
      icon: Shield,
      subTabs: [
        { id: 'admin', label: 'Admin', icon: Shield, requiredTier: 'free' }
      ]
    };
    if (!navigationGroups.find(g => g.id === 'admin-group')) {
      navigationGroups.push(adminGroup);
    }
  }

  const activeGroup = navigationGroups.find(group => group.subTabs.some(sub => sub.id === activeTab)) || navigationGroups[0];
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const stepperRef = useRef<HTMLDivElement>(null);

  const checkScroll = () => {
    if (navRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const [showBottomNav, setShowBottomNav] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Show if scrolling up, hide if scrolling down and not at top
      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setShowBottomNav(false);
      } else {
        setShowBottomNav(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const checkAccess = (requiredTier?: string) => {
    // Admin override
    if (user?.email === 'svein.nordvik@gmail.com' || profile.email === 'svein.nordvik@gmail.com') return true;
    
    // Public non-auth tabs
    const publicTabs = ['home', 'pricing', 'about', 'privacy', 'terms', 'profile', 'settings'];
    if (publicTabs.includes(activeTab) && !requiredTier) return true;

    // Must be logged in for most tools
    if (!user) return false;

    if (!requiredTier || requiredTier === 'free') return true;
    if (pricingTier === 'semester' || pricingTier === 'preview') return true;
    if (pricingTier === 'monthly' && requiredTier === 'monthly') return true;
    return false;
  };

  const handleTabClick = (tabId: any, requiredTier?: string) => {
    if (!user && !['home', 'pricing', 'about', 'privacy', 'terms', 'profile', 'settings'].includes(tabId)) {
      setShowAuthModal(true);
      return;
    }
    
    if (checkAccess(requiredTier)) {
      setActiveTab(tabId);
    } else {
      setActiveTab('pricing');
    }
  };

  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  const addMilestone = (title: string) => {
    const newMilestone = {
      id: Date.now().toString(),
      title,
      date: '',
      completed: false
    };
    setMilestones(prev => [...prev, newMilestone]);
    setShowAddMilestone(false);
  };

  const updateMilestoneDate = (id: string, date: string) => {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, date } : m));
  };

  const toggleMilestone = (id: string) => {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, completed: !m.completed } : m));
  };

  const deleteMilestone = (id: string) => {
    setMilestones(prev => prev.filter(m => m.id !== id));
  };

  useEffect(() => {
    localStorage.setItem('dmmh_milestones', JSON.stringify(milestones));
  }, [milestones]);

  const [literatureSubTab, setLiteratureSubTab] = useState<'literature' | 'apa' | 'citations'>('literature');
  const [methodSubTab, setMethodSubTab] = useState<'methodology' | 'ethics'>('methodology');

  const [isAiChecking, setIsAiChecking] = useState(false);
  const [appName, setAppName] = useState('BLU-Hjelperen');
  const [appSlogan, setAppSlogan] = useState('Din digitale skrivepartner');


  useEffect(() => {
    if (activeTab === 'collaboration') {
      setHasUnreadGroupMessages(false);
    }
  }, [activeTab]);

  const getDaysLeft = (dateStr?: string) => {
    const targetDate = dateStr || profile.deadline;
    if (!targetDate) return null;
    const deadline = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLeft = getDaysLeft();
  
  // LocalStorage Persistence
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('dmmh_chat_messages');
    return saved ? JSON.parse(saved) : [
      { role: 'assistant', content: 'Hei! Jeg er din akademiske assistent for barnehagelærerstudiet. Hvordan kan jeg hjelpe deg i dag? Du kan spørre om alt fra problemstilling til kildekritikk.' }
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [strictness, setStrictness] = useState<'supportive' | 'balanced' | 'critical'>('balanced');
  const [sourceInput, setSourceInput] = useState('');
  const [sourceResult, setSourceResult] = useState<any>(null);
  const [deepSourceAnalysis, setDeepSourceAnalysis] = useState<string | null>(null);
  const [isDeepAnalyzing, setIsDeepAnalyzing] = useState(false);
  
  const [structureInput, setStructureInput] = useState(() => localStorage.getItem('dmmh_structure_input') || '');
  const [structureResult, setStructureResult] = useState('');
  const [isAnalyzingStructure, setIsAnalyzingStructure] = useState(false);
  const [structureAnalysisSuccess, setStructureAnalysisSuccess] = useState(false);
  const [inspirationInput, setInspirationInput] = useState('');
  const [inspirationResult, setInspirationResult] = useState('');
  const [sensorInput, setSensorInput] = useState(() => localStorage.getItem('dmmh_sensor_input') || '');
  const [sensorResult, setSensorResult] = useState<any>(null);
  const [sensorFile, setSensorFile] = useState<File | null>(null);
  const [sensorOption, setSensorOption] = useState<'evaluation' | 'feedback'>('evaluation');
  const [sensorUploadMode, setSensorUploadMode] = useState<'text' | 'file'>('file');
  const [teacherFeedback, setTeacherFeedback] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState('');
  const [apaInput, setApaInput] = useState('');
  const [apaResult, setApaResult] = useState<any>(null);
  const [methodologyInput, setMethodologyInput] = useState('');
  const [methodologyDesign, setMethodologyDesign] = useState('');
  const [methodologyTool, setMethodologyTool] = useState('');
  const [methodologyPhase, setMethodologyPhase] = useState('');
  const [customMethod, setCustomMethod] = useState('');
  const [methodologyProblem, setMethodologyProblem] = useState('');
  const [methodologyResult, setMethodologyResult] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [plagiarismResult, setPlagiarismResult] = useState('');
  const [isCheckingPlagiarism, setIsCheckingPlagiarism] = useState(false);
  const [plagiarismError, setPlagiarismError] = useState<string | null>(null);
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [pdfText, setPdfText] = useState('');
  const [pdfAnalysis, setPdfAnalysis] = useState<string | null>(null);
  const [multiPdfAnalysis, setMultiPdfAnalysis] = useState<string | null>(null);
  const [multiPdfQuery, setMultiPdfQuery] = useState('');
  const [deepPdfAnalysis, setDeepPdfAnalysis] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isMultiPdfLoading, setIsMultiPdfLoading] = useState(false);

  // Group Chat State
  const [groupMessages, setGroupMessages] = useState<{ id: string; user: string; content: string; time: string; isMe: boolean; color: string }[]>(() => {
    const saved = localStorage.getItem('dmmh_group_messages');
    return saved ? JSON.parse(saved) : [
      { id: '1', user: 'KL', content: 'Har noen sett på kapittelet om metode enda? Jeg har lagt inn et utkast.', time: '10:45', isMe: false, color: 'emerald' },
      { id: '2', user: 'SN', content: 'Ja, jeg ser på det nå! Ser veldig bra ut.', time: '10:47', isMe: true, color: 'blue' }
    ];
  });
  const [groupInput, setGroupInput] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('dmmh_notifications_enabled');
    return saved ? JSON.parse(saved) : true;
  });
  const [activeNotification, setActiveNotification] = useState<{ user: string; content: string } | null>(null);

  // Collaboration State
  const [groupId, setGroupId] = useState(() => localStorage.getItem('dmmh_group_id') || 'ABC-123');
  const [sharedSources, setSharedSources] = useState(() => {
    const saved = localStorage.getItem('dmmh_shared_sources');
    return saved ? JSON.parse(saved) : [
      { title: 'Bae (2018) - Medvirkning', user: 'SN' },
      { title: 'Sommer (2020) - Lek', user: 'KL' },
      { title: 'DMMH Retningslinjer', user: 'System' }
    ];
  });
  const [sharedNotes, setSharedNotes] = useState(() => localStorage.getItem('dmmh_shared_notes') || '');

  // Pomodoro Timer State
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');

  // Citation Vault State
  const [citations, setCitations] = useState<{ id: string; text: string; source: string; date: string }[]>(() => {
    const saved = localStorage.getItem('dmmh_citations');
    return saved ? JSON.parse(saved) : [];
  });

  // Devil's Advocate State
  const [isDevilAdvocate, setIsDevilAdvocate] = useState(false);

  // Calendar View State
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [hasUnreadGroupMessages, setHasUnreadGroupMessages] = useState(false);
  
  const [literatureTopic, setLiteratureTopic] = useState('');
  const [literatureSearch, setLiteratureSearch] = useState('');
  const [isSearchingPensum, setIsSearchingPensum] = useState(false);
  const [pensumResults, setPensumResults] = useState<any[]>([]);

  const handleSearchPensum = () => {
    if (!literatureSearch.trim()) return;
    setIsSearchingPensum(true);
    // Mock search results
    setTimeout(() => {
      const mockResults = [
        { title: 'Barnehagepedagogikk', author: 'Gunnar Greve', year: 2022, type: 'Bok' },
        { title: 'Lekens betydning i barnehagen', author: 'Berit Bae', year: 2018, type: 'Artikkel' },
        { title: 'Inkludering og mangfold', author: 'Thomas Nordahl', year: 2020, type: 'Bok' }
      ].filter(r => r.title.toLowerCase().includes(literatureSearch.toLowerCase()));
      setPensumResults(mockResults);
      setIsSearchingPensum(false);
    }, 1500);
  };
  const [literatureResult, setLiteratureResult] = useState('');
  const [literatureError, setLiteratureError] = useState('');

  // Settings State
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('dmmh_settings');
    return saved ? JSON.parse(saved) : {
      showTimerInHeader: false,
      showDeadlineInHeader: false,
      preferredLanguage: 'Bokmål'
    };
  });

  useEffect(() => {
    localStorage.setItem('dmmh_settings', JSON.stringify(settings));
  }, [settings]);

  const handleExportData = () => {
    const data = { ...localStorage };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blu_hjelperen_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteData = () => {
    if (window.confirm('Er du helt sikker på at du vil slette alle lokale data? Dette kan ikke angres.')) {
      localStorage.clear();
      window.location.reload();
    }
  };
  const [isLiteratureLoading, setIsLiteratureLoading] = useState(false);
  
  const [aiTerms, setAiTerms] = useState<{ term: string; def: string }[]>(() => {
    const saved = localStorage.getItem('dmmh_ai_terms');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchCounts, setSearchCounts] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('dmmh_search_counts');
    return saved ? JSON.parse(saved) : {};
  });
  const [isAiDefining, setIsAiDefining] = useState(false);
  
  const [draftDeadline, setDraftDeadline] = useState(() => localStorage.getItem('dmmh_draft_deadline') || '');
  const [finalDeadline, setFinalDeadline] = useState(() => localStorage.getItem('dmmh_final_deadline') || '');
  const [wordCountGoal, setWordCountGoal] = useState(() => Number(localStorage.getItem('dmmh_word_goal')) || 0);
  const [assessmentCriteriaRaw, setAssessmentCriteriaRaw] = useState(() => localStorage.getItem('dmmh_criteria_raw') || '');
  const [assessmentCriteriaList, setAssessmentCriteriaList] = useState<{ id: string; text: string; checked: boolean }[]>(() => {
    const saved = localStorage.getItem('dmmh_criteria_list');
    return saved ? JSON.parse(saved) : [];
  });
  const [isGroupWork, setIsGroupWork] = useState(() => localStorage.getItem('dmmh_is_group_work') === 'true');
  const [selfSelectedLitPages, setSelfSelectedLitPages] = useState(() => localStorage.getItem('dmmh_self_selected_lit') || '');

  useEffect(() => { localStorage.setItem('dmmh_is_group_work', isGroupWork.toString()); }, [isGroupWork]);
  useEffect(() => { localStorage.setItem('dmmh_self_selected_lit', selfSelectedLitPages); }, [selfSelectedLitPages]);

  const [showRefGuide, setShowRefGuide] = useState(false);
  const [standardCriteria, setStandardCriteria] = useState<{ id: string; text: string; checked: boolean }[]>(() => {
    const saved = localStorage.getItem('dmmh_standard_criteria');
    return saved ? JSON.parse(saved) : [
      { id: 'sc1', text: 'Rød tråd: Har jeg en tydelig sammenheng mellom problemstilling og konklusjon?', checked: false },
      { id: 'sc2', text: 'Begrepsbruk: Er sentrale pedagogiske begreper definert og brukt korrekt?', checked: false },
      { id: 'sc3', text: 'Teori og praksis: Har jeg koblet teorien tydelig til mine eksempler fra barnehagen?', checked: false },
      { id: 'sc4', text: 'Kildebruk: Er påstandene mine støttet av pensum eller Rammeplanen?', checked: false },
      { id: 'sc5', text: 'Referanser: Er litteraturlisten komplett og i riktig stil (APA 7)?', checked: false },
      { id: 'sc6', text: 'Parafrasering: Er kildene skrevet om med egne ord for å unngå plagiat?', checked: false },
      { id: 'sc7', text: 'Faglig forankring: Er påstandene støttet av spesifikke henvisninger til pensum eller Rammeplanen?', checked: false },
      { id: 'sc8', text: 'DMMH-standard: Er oppsettet i tråd med kravene i håndboka for oppgaveskriving?', checked: false },
      { id: 'sc9', text: 'Undersøkbarhet: Er problemstillingen avgrenset og støttet av tydelige forskningsspørsmål?', checked: false },
      { id: 'sc10', text: 'Styringsdokumenter: Er funnene forankret i Barnehageloven og/eller Rammeplanen?', checked: false },
      { id: 'sc11', text: 'Forskningsetikk: Viser teksten at praksiserfaringer er behandlet på en etisk forsvarlig måte?', checked: false },
      { id: 'sc12', text: 'Litteraturkrav & Parafrasering: Er kravene til selvvalgt litteratur møtt og parafrasert korrekt?', checked: false }
    ];
  });
  const [selectedReferenceStyle, setSelectedReferenceStyle] = useState(() => localStorage.getItem('dmmh_ref_style') || 'APA 7');


  const [apaGenerator, setApaGenerator] = useState({
    type: 'book',
    author: '',
    year: '',
    title: '',
    publisher: '',
    journal: '',
    pages: '',
    url: '',
    customType: ''
  });

  const themes = [
    { id: 'blue', name: 'Klassisk Blå', color: '#2563eb', hover: '#1d4ed8', light: '#dbeafe', dark: '#1e40af' },
    { id: 'green', name: 'Natur Grønn', color: '#16a34a', hover: '#15803d', light: '#dcfce7', dark: '#166534' },
    { id: 'purple', name: 'Akademisk Lilla', color: '#9333ea', hover: '#7e22ce', light: '#f3e8ff', dark: '#6b21a8' },
    { id: 'orange', name: 'Varm Oransje', color: '#ea580c', hover: '#c2410c', light: '#ffedd5', dark: '#9a3412' },
    { id: 'red', name: 'Klassisk Rød', color: '#dc2626', hover: '#b91c1c', light: '#fee2e2', dark: '#991b1b' },
    { id: 'indigo', name: 'Moderne Indigo', color: '#4f46e5', hover: '#4338ca', light: '#e0e7ff', dark: '#3730a3' },
    { id: 'slate', name: 'Elegant Skifer', color: '#475569', hover: '#334155', light: '#f1f5f9', dark: '#1e293b' },
  ];

  const [selectedTheme, setSelectedTheme] = useState(() => {
    const saved = localStorage.getItem('dmmh_theme');
    return saved ? JSON.parse(saved) : themes[0];
  });

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', selectedTheme.color);
    root.style.setProperty('--primary-color-hover', selectedTheme.hover);
    root.style.setProperty('--primary-color-light', selectedTheme.light);
    root.style.setProperty('--primary-color-dark', selectedTheme.dark);
    localStorage.setItem('dmmh_theme', JSON.stringify(selectedTheme));
  }, [selectedTheme]);
  

  useEffect(() => { localStorage.setItem('dmmh_documents', JSON.stringify(documents)); }, [documents]);
  useEffect(() => { localStorage.setItem('dmmh_folders', JSON.stringify(folders)); }, [folders]);
  useEffect(() => { if (activeDocumentId) localStorage.setItem('dmmh_active_document_id', activeDocumentId); }, [activeDocumentId]);

  // Save to localStorage on changes
  useEffect(() => { localStorage.setItem('dmmh_chat_messages', JSON.stringify(messages)); }, [messages]);
  useEffect(() => { localStorage.setItem('dmmh_structure_input', structureInput); }, [structureInput]);
  useEffect(() => { localStorage.setItem('dmmh_sensor_input', sensorInput); }, [sensorInput]);
  useEffect(() => { localStorage.setItem('dmmh_checklist_v3', JSON.stringify(checklist)); }, [checklist]);
  useEffect(() => { localStorage.setItem('dmmh_outline', JSON.stringify(outline)); }, [outline]);
  useEffect(() => { localStorage.setItem('dmmh_ai_terms', JSON.stringify(aiTerms)); }, [aiTerms]);
  useEffect(() => { localStorage.setItem('dmmh_search_counts', JSON.stringify(searchCounts)); }, [searchCounts]);
  useEffect(() => { localStorage.setItem('dmmh_active_disposition', JSON.stringify(activeDisposition)); }, [activeDisposition]);
  // LocalStorage Persistence
  useEffect(() => { 
    if (user) {
      localStorage.setItem(`studentProfile_${user.uid}`, JSON.stringify(profile));
    } else {
      localStorage.setItem('dmmh_profile', JSON.stringify(profile)); 
    }
  }, [profile, user]);
  useEffect(() => { localStorage.setItem('dmmh_progress', JSON.stringify(progress)); }, [progress]);
  useEffect(() => { localStorage.setItem('dmmh_draft_deadline', draftDeadline); }, [draftDeadline]);
  useEffect(() => { localStorage.setItem('dmmh_final_deadline', finalDeadline); }, [finalDeadline]);
  useEffect(() => { localStorage.setItem('dmmh_word_goal', wordCountGoal.toString()); }, [wordCountGoal]);
  useEffect(() => { localStorage.setItem('dmmh_criteria_raw', assessmentCriteriaRaw); }, [assessmentCriteriaRaw]);
  useEffect(() => { localStorage.setItem('dmmh_criteria_list', JSON.stringify(assessmentCriteriaList)); }, [assessmentCriteriaList]);
  useEffect(() => { localStorage.setItem('dmmh_standard_criteria', JSON.stringify(standardCriteria)); }, [standardCriteria]);
  useEffect(() => { localStorage.setItem('dmmh_ref_style', selectedReferenceStyle); }, [selectedReferenceStyle]);
  useEffect(() => { localStorage.setItem('dmmh_bachelor_document', JSON.stringify(bachelorDocument)); }, [bachelorDocument]);
  useEffect(() => { localStorage.setItem('dmmh_group_messages', JSON.stringify(groupMessages)); }, [groupMessages]);
  useEffect(() => { localStorage.setItem('dmmh_notifications_enabled', JSON.stringify(notificationsEnabled)); }, [notificationsEnabled]);
  useEffect(() => { localStorage.setItem('dmmh_citations', JSON.stringify(citations)); }, [citations]);
  useEffect(() => { localStorage.setItem('dmmh_group_id', groupId); }, [groupId]);
  useEffect(() => { localStorage.setItem('dmmh_shared_sources', JSON.stringify(sharedSources)); }, [sharedSources]);
  useEffect(() => { localStorage.setItem('dmmh_shared_notes', sharedNotes); }, [sharedNotes]);

  // Scroll to top on tab change (especially for mobile)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Pomodoro Logic
  useEffect(() => {
    let interval: any;
    if (timerIsRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerIsRunning(false);
      const nextMode = timerMode === 'focus' ? 'break' : 'focus';
      setTimerMode(nextMode);
      setTimerSeconds(nextMode === 'focus' ? 25 * 60 : 5 * 60);
      alert(nextMode === 'focus' ? 'Pause ferdig! Tid for fokus.' : 'Fokusøkt ferdig! Ta en velfortjent pause.');
    }
    return () => clearInterval(interval);
  }, [timerIsRunning, timerSeconds, timerMode]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const clearAllData = () => {
    if (window.confirm('Er du sikker på at du vil slette all lokal data? Dette kan ikke angres.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleSaveProfile = () => {
    if (user) {
      localStorage.setItem(`studentProfile_${user.uid}`, JSON.stringify(profile));
    } else {
      localStorage.setItem('dmmh_profile', JSON.stringify(profile));
    }
    setGlobalSuccess("Profilen er lagret lokalt!");
  };

  const handlePlagiarismCheck = async () => {
    setPlagiarismError(null);
    
    let text = '';
    
    // Check if we have input from the sensor tool first, as that's where the button is
    if (activeTab === 'sensor') {
      if (sensorUploadMode === 'file' && sensorFile) {
        setIsCheckingPlagiarism(true);
        try {
          text = await extractTextFromPdf(sensorFile);
        } catch (error) {
          console.error("PDF extraction error:", error);
          setPlagiarismError("Kunne ikke lese PDF-filen. Vennligst prøv igjen eller lim inn tekst manuelt.");
          setIsCheckingPlagiarism(false);
          return;
        }
      } else if (sensorUploadMode === 'text' && sensorInput.trim()) {
        text = sensorInput;
      }
    }

    // Fallback to main document if no sensor input
    if (!text.trim()) {
      text = getAllDocumentText();
    }

    if (!text.trim()) {
      setPlagiarismError("Du må laste opp en PDF eller lime inn tekst før du kan kjøre analysen.");
      return;
    }

    if (isCheckingPlagiarism) return; // Already loading from PDF extraction
    
    setIsCheckingPlagiarism(true);
    try {
      const result = await checkPlagiarism(text);
      setPlagiarismResult(result);
    } catch (error: any) {
      console.error(error);
      const errorMessage = error?.message || 'Ukjent feil';
      setPlagiarismError(`Det oppstod en feil under plagiat-sjekken: ${errorMessage}. Vennligst prøv igjen.`);
    } finally {
      setIsCheckingPlagiarism(false);
    }
  };

  const handleMultiPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const pdfs = files.filter(f => f.type === 'application/pdf');
    if (pdfs.length === 0) return;
    
    const isYearly = pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview';
    
    if (!isYearly && pdfs.length > 1) {
      alert("Månedsabonnement støtter kun analyse av ett dokument om gangen. Oppgrader til Årsabonnement for å analysere flere dokumenter samtidig.");
      setPdfFiles([pdfs[0]]);
    } else {
      setPdfFiles(prev => [...prev, ...pdfs]);
    }
  };

  const handleMultiPdfAnalysis = async () => {
    if (pdfFiles.length === 0 || isMultiPdfLoading) return;
    
    setIsMultiPdfLoading(true);
    try {
      const texts = await Promise.all(pdfFiles.map(async (file) => {
        const content = await extractTextFromPdf(file);
        return { name: file.name, content };
      }));
      
      const result = await analyzeMultiPdfs(texts, multiPdfQuery);
      setMultiPdfAnalysis(result);
    } catch (error) {
      console.error(error);
      setGlobalError('Oi! Noe gikk galt under analysen av dokumentene. Vennligst prøv igjen.');
    } finally {
      setIsMultiPdfLoading(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    
    setPdfFile(file);
    setIsPdfLoading(true);
    try {
      const text = await extractTextFromPdf(file);
      if (!text || text.trim().length < 10) {
        throw new Error('Kunne ikke hente ut nok tekst fra PDF-en. Er den skannet som bilde?');
      }
      setPdfText(text);
      const analysis = await analyzePdfContent(text);
      setPdfAnalysis(analysis);
    } catch (error: any) {
      console.error(error);
      alert(error.message?.includes('Kunne ikke hente ut nok tekst') 
        ? error.message 
        : 'Oi! Noe gikk galt under analysen av PDF-en. Kan du prøve å laste den opp på nytt?');
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleSensorFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    
    setIsLoading(true);
    try {
      const text = await extractTextFromPdf(file);
      setSensorInput(text);
    } catch (error) {
      console.error(error);
      setGlobalError('Kunne ikke lese PDF-filen. Vennligst prøv igjen eller lim inn teksten manuelt.');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (overrideMessage?: string) => {
    const messageToSend = overrideMessage || input;
    if (!messageToSend.trim() || isLoading) return;

    const userMessage = messageToSend.trim();
    if (!overrideMessage) setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await generateAcademicResponse(userMessage, messages, strictness, profile, taskSetup);
      setMessages(prev => [...prev, { role: 'assistant', content: response || 'Beklager, jeg kunne ikke generere et svar.' }]);
    } catch (error: any) {
      console.error("Chat Error:", error);
      let errorMessage = "Det oppstod en teknisk feil ved generering av svar. Vennligst prøv igjen senere.";
      
      const errorStr = JSON.stringify(error).toLowerCase();
      const messageStr = (error?.message || "").toLowerCase();

      if (messageStr.includes("api key")) {
        errorMessage = "Det ser ut som API-nøkkelen mangler eller er feil. Ta en titt i 'Secrets'-menyen til venstre, så får vi det på plass!";
      } else if (messageStr.includes("fetch") || messageStr.includes("network") || messageStr.includes("failed to execute 'fetch'") || errorStr.includes("fetch")) {
        errorMessage = "Det ser ut til at nettleseren din blokkerer forbindelsen til AI-tjenesten. Dette skyldes ofte en utvidelse (som en Ad-blocker). Prøv å deaktivere Ad-blocker for denne siden eller prøv i Inkognito-modus.";
      } else if (errorStr.includes("spending cap") || messageStr.includes("spending cap") || errorStr.includes("quota") || messageStr.includes("quota") || errorStr.includes("429")) {
        errorMessage = "Prosjektet har nådd sin månedlige bruksgrense (spending cap) eller kvote i Google AI Studio. Vennligst sjekk innstillingene dine på ai.studio/spend.";
      }
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: errorMessage 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendGroupMessage = () => {
    if (!groupInput.trim()) return;
    const newMessage = {
      id: Date.now().toString(),
      user: 'SN',
      content: groupInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      color: 'blue'
    };
    setGroupMessages(prev => [...prev, newMessage]);
    setGroupInput('');
  };

  const simulateIncomingGroupMessage = (user: string, content: string, color: string) => {
    const newMessage = {
      id: Date.now().toString(),
      user,
      content,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: false,
      color
    };
    setGroupMessages(prev => [...prev, newMessage]);
    
    if (activeTab !== 'collaboration') {
      setHasUnreadGroupMessages(true);
    }

    if (notificationsEnabled && activeTab !== 'collaboration') {
      setActiveNotification({ user, content });
      setTimeout(() => setActiveNotification(null), 5000);
    }
  };

  const handleCreateGroup = () => {
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGroupId(newId);
  };

  const handleAddSharedSource = () => {
    const title = window.prompt('Skriv inn tittel på kilden:');
    if (title) {
      setSharedSources(prev => [...prev, { title, user: 'SN' }]);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleEvaluateSource = async () => {
    if (!sourceInput.trim() || isLoading) return;
    setIsLoading(true);
    setDeepSourceAnalysis(null);
    try {
      const result = await evaluateSource(sourceInput);
      setSourceResult(result);
    } catch (error) {
      console.error(error);
      setGlobalError('Kunne ikke vurdere kilden. Vennligst prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeepSourceAnalysis = async () => {
    if (!sourceResult || isDeepAnalyzing) return;
    setIsDeepAnalyzing(true);
    try {
      const result = await performDeepSourceAnalysis(sourceInput, sourceResult);
      setDeepSourceAnalysis(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeepAnalyzing(false);
    }
  };

  const handleDeepPdfAnalysis = async () => {
    if (!pdfAnalysis || isDeepAnalyzing) return;
    setIsDeepAnalyzing(true);
    try {
      const result = await performDeepPdfAnalysis(pdfText, pdfAnalysis);
      setDeepPdfAnalysis(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeepAnalyzing(false);
    }
  };

  const handleAnalyzeStructure = async () => {
    if (!structureInput.trim() || isAnalyzingStructure) return;
    setIsAnalyzingStructure(true);
    setStructureAnalysisSuccess(false);
    try {
      const result = await analyzeThesisStructure(structureInput);
      
      // Oppdater tekstlig resultat
      setStructureResult(result.analysis || "Kunne ikke generere analyse.");
      
      // Oppdater sjekklisten automatisk basert på AI-vurdering
      if (result.checkpoints) {
        setStandardCriteria(prev => prev.map(item => ({
          ...item,
          checked: result.checkpoints[item.id as keyof typeof result.checkpoints] ?? item.checked
        })));
      }

      setStructureAnalysisSuccess(true);
      setTimeout(() => setStructureAnalysisSuccess(false), 5000);
    } catch (error: any) {
      console.error("Structure Analysis Error:", error);
      let errorMessage = "Oisann! Noe gikk galt under analysen. Kan du prøve igjen om litt? Vi heier på deg!";
      
      const errorStr = JSON.stringify(error).toLowerCase();
      const messageStr = (error?.message || "").toLowerCase();

      if (messageStr.includes("api key")) {
        errorMessage = "Feil: API-nøkkel mangler. Sjekk 'Secrets' i menyen.";
      } else if (errorStr.includes("spending cap") || messageStr.includes("spending cap") || errorStr.includes("quota") || messageStr.includes("quota") || errorStr.includes("429")) {
        errorMessage = "Prosjektet har nådd sin månedlige bruksgrense (spending cap) eller kvote i Google AI Studio. Vennligst sjekk innstillingene dine på ai.studio/spend.";
      }
      
      setStructureResult(`### ❌ Feil\n${errorMessage}`);
    } finally {
      setIsAnalyzingStructure(false);
    }
  };

  const getAllDocumentText = () => {
    return Object.values(bachelorDocument).join('\n\n');
  };

  const handleAiChecklist = async () => {
    const text = getAllDocumentText();
    if (!text.trim() || isAiChecking) return;
    setIsAiChecking(true);
    try {
      const result = await analyzeThesisStructure(text);
      if (result.checkpoints) {
        setStandardCriteria(prev => prev.map(item => ({
          ...item,
          checked: result.checkpoints[item.id as keyof typeof result.checkpoints] ?? item.checked
        })));
      }
    } catch (error) {
      console.error("AI Checklist Error:", error);
    } finally {
      setIsAiChecking(false);
    }
  };

  const handleUpdateCriteria = () => {
    const lines = assessmentCriteriaRaw.split('\n').filter(line => line.trim().length > 0);
    const newList = lines.map((line, index) => ({
      id: `criteria-${index}-${Date.now()}`,
      text: line.trim(),
      checked: false
    }));
    setAssessmentCriteriaList(newList);
  };

  const toggleCriteria = (id: string) => {
    setAssessmentCriteriaList(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const toggleStandardCriteria = (id: string) => {
    setStandardCriteria(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const scrollStepper = (direction: 'left' | 'right') => {
    if (stepperRef.current) {
      const scrollAmount = 300;
      stepperRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollNav = (direction: 'left' | 'right') => {
    if (navRef.current) {
      const scrollAmount = 200;
      navRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleBrainstorm = async () => {
    if (!inspirationInput.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const result = await brainstormPerspectives(inspirationInput);
      setInspirationResult(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadAssignment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPdf(file);
      } else if (file.type.startsWith('image/')) {
        const result = await Tesseract.recognize(file, 'nor', {
          logger: m => console.log(m)
        });
        text = result.data.text;
      } else {
        text = await file.text();
      }

      if (!text || text.trim().length < 10) {
        throw new Error('Kunne ikke hente ut nok tekst fra dokumentet. Er det skannet som bilde?');
      }

      const analysis = await analyzeAssignmentText(text);
      setTaskSetup({
        ...taskSetup,
        type: analysis.type || taskSetup.type,
        instructions: analysis.instructions || taskSetup.instructions,
        scope: analysis.scope || taskSetup.scope
      });
      if (analysis.deadline) setFinalDeadline(analysis.deadline);
      if (analysis.draftDeadline) setDraftDeadline(analysis.draftDeadline);
      
      if (analysis.criteria) {
        setAssessmentCriteriaRaw(analysis.criteria);
        const lines = analysis.criteria.split('\n').filter((line: string) => line.trim().length > 0);
        const newList = lines.map((line: string, index: number) => ({
          id: `criteria-${index}-${Date.now()}`,
          text: line.trim(),
          checked: false
        }));
        setAssessmentCriteriaList(newList);
      }
      
      // Send to chat
      setMessages(prev => [...prev, 
        { role: 'user', content: `Jeg har lastet opp en oppgave. Her er teksten:\n\n${text}` },
        { role: 'assistant', content: `Takk! Jeg har analysert oppgaven din. Det ser ut som en ${analysis.type || 'oppgave'} med fokus på ${analysis.scope || 'et bestemt omfang'}. Jeg har fylt ut detaljene i "Startgropa" for deg. Hvordan vil du at vi skal starte?` }
      ]);

      setGlobalSuccess("Oppgaveinformasjon er oppdatert og sendt til chatten!");
    } catch (error) {
      console.error(error);
      setGlobalError("Kunne ikke analysere dokumentet. Vennligst prøv igjen eller lim inn tekst manuelt.");
    } finally {
      setIsLoading(false);
    }
  };

  const insertFromChat = (setter: (val: string) => void) => {
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMessage) {
      setter(lastAssistantMessage.content);
    } else {
      setGlobalError("Ingen meldinger fra assistenten å hente.");
    }
  };

  const [showTaskSetup, setShowTaskSetup] = useState(false);
  const [taskSetup, setTaskSetup] = useState({
    type: '',
    genre: 'Akademisk fokus',
    instructions: '',
    scope: ''
  });

  useEffect(() => {
    if (taskSetup.instructions.length > 50 && !assessmentCriteriaRaw) {
      const timer = setTimeout(async () => {
        try {
          const analysis = await analyzeAssignmentText(taskSetup.instructions);
          if (analysis.criteria) {
            setAssessmentCriteriaRaw(analysis.criteria);
            const lines = analysis.criteria.split('\n').filter((line: string) => line.trim().length > 0);
            const newList = lines.map((line: string, index: number) => ({
              id: `criteria-auto-${index}-${Date.now()}`,
              text: line.trim(),
              checked: false
            }));
            setAssessmentCriteriaList(newList);
          }
        } catch (e) {
          console.error("Auto-criteria extraction failed", e);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [taskSetup.instructions]);
  const [customTaskType, setCustomTaskType] = useState('');

  const mentorTips = [
    "Husk å koble observasjonene dine til teori fra rammeplanen.",
    "Bruk 'Kildekritikk'-modulen for å sikre at kildene dine er relevante og troverdige.",
    "En god problemstilling er halve jobben – bruk chatten til å sparre om den.",
    "Husk å lagre arbeidet ditt jevnlig, selv om vi lagrer lokalt.",
    "Akademisk skriving handler om å være presis. Unngå for mye 'synsing'.",
    "Prøv å skrive litt hver dag, selv om det bare er noen få setninger.",
    "Bruk sensor-modulen for å få et nytt blikk på teksten din før innlevering."
  ];

  const getFilteredTips = () => {
    const baseTips = [...mentorTips];
    if (taskSetup.type === 'Bacheloroppgave') {
      return [
        "Husk at bacheloroppgaven krever en tydelig metodisk tilnærming.",
        "Sørg for at drøftingen din er balansert og ser saken fra flere sider.",
        "Koble empiri (dine funn) tett opp mot valgt teori.",
        ...baseTips
      ];
    }
    if (taskSetup.type === 'Refleksjonsnotat') {
      return [
        "I et refleksjonsnotat er din egen stemme og dine egne erfaringer sentrale.",
        "Vær ærlig om utfordringer du møtte i praksis.",
        "Bruk teorien til å kaste nytt lys over dine egne handlinger.",
        ...baseTips
      ];
    }
    return baseTips;
  };

  const activeTips = getFilteredTips();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % activeTips.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [activeTips.length]);


  const [showOnboarding, setShowOnboarding] = useState(() => {
    const saved = localStorage.getItem('dmmh_onboarding_complete');
    return saved !== 'true';
  });
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [lowStressMode, setLowStressMode] = useState(() => {
    const saved = localStorage.getItem('dmmh_low_stress_mode');
    return saved === 'true';
  });

  const onboardingSteps = [
    {
      title: "Velkommen til BLU-Hjelperen! 👋",
      description: "Din personlige assistent for barnehagelærerutdanningen. La oss ta en rask gjennomgang av hvordan du får mest ut av verktøyet.",
      icon: <Sparkles className="w-12 h-12 text-primary" />,
    },
    {
      title: "Skriveverksted ✍️",
      description: "Her kan du få hjelp til å strukturere oppgaver, sjekke kildebruk og få tilbakemelding på tekstene dine. Prøv 'Sensor-sjekk' for å se hvordan teksten din ligger an!",
      icon: <Edit3 className="w-12 h-12 text-primary" />,
    },
    {
      title: "Smart Chat 💬",
      description: "Spør om alt fra pedagogiske teorier til APA-regler. Assistenten kjenner rammeplanen og pensum, så du får alltid relevante svar.",
      icon: <MessageSquare className="w-12 h-12 text-primary" />,
    },
    {
      title: "Ressurser & Verktøy 📚",
      description: "Få rask tilgang til Canvas, Studentweb og nyttige maler. Vi har samlet alt du trenger på ett sted.",
      icon: <Library className="w-12 h-12 text-primary" />,
    },
    {
      title: "Fullfør Profilen Din 👤",
      description: "For å gi deg best mulig hjelp, anbefaler vi at du fyller ut studieprogram og frister i profilen din. Lykke til med skrivingen!",
      icon: <User className="w-12 h-12 text-primary" />,
    }
  ];

  const OnboardingWizard = () => {
    if (!showOnboarding) return null;

    const step = onboardingSteps[onboardingStep];
    const isLastStep = onboardingStep === onboardingSteps.length - 1;

    const handleNext = () => {
      if (isLastStep) {
        setShowOnboarding(false);
        localStorage.setItem('dmmh_onboarding_complete', 'true');
      } else {
        setOnboardingStep(prev => prev + 1);
      }
    };

    const handleSkip = () => {
      setShowOnboarding(false);
      localStorage.setItem('dmmh_onboarding_complete', 'true');
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100"
        >
          <div className="p-10 text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-primary-light/30 p-6 rounded-[2.5rem] animate-bounce-slow">
                {step.icon}
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-slate-900 leading-tight">{step.title}</h2>
              <p className="text-slate-500 leading-relaxed">{step.description}</p>
            </div>
            
            <div className="flex items-center justify-center gap-2 py-4">
              {onboardingSteps.map((step, i) => (
                <div 
                  key={`onboarding-dot-${i}`} 
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    i === onboardingStep ? "w-8 bg-primary" : "w-1.5 bg-slate-200"
                  )} 
                />
              ))}
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button 
                onClick={handleNext}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary-hover shadow-xl shadow-primary-light transition-all flex items-center justify-center gap-2"
              >
                {isLastStep ? 'Kom i gang!' : 'Neste steg'}
                <ArrowRight className="w-5 h-5" />
              </button>
              {!isLastStep && (
                <button 
                  onClick={handleSkip}
                  className="w-full py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors text-sm"
                >
                  Hopp over introduksjon
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  useEffect(() => {
    localStorage.setItem('dmmh_pricing_tier', pricingTier);
  }, [pricingTier]);

  // Admin override effect
  useEffect(() => {
    if ((user?.email === 'svein.nordvik@gmail.com' || profile.email === 'svein.nordvik@gmail.com') && pricingTier !== 'semester') {
      setPricingTier('semester');
    }
  }, [user?.email, profile.email, pricingTier]);

  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  // Handle return from Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const planId = params.get('plan_id');
    const sessionId = params.get('session_id');

    if (success === 'true' && planId) {
      setIsVerifyingPayment(true);
      
      // In a production app with a backend, you would verify the session_id here
      // For this client-side implementation, we wait for the return signal
      setTimeout(() => {
        setPricingTier(planId as any);
        setCheckoutSuccess(true);
        setIsVerifyingPayment(false);
        
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
        setTimeout(() => setCheckoutSuccess(false), 5000);
      }, 1500);
    }
  }, []);

  const handleCheckout = (plan: any) => {
    if (plan.id === 'free') {
      setPricingTier('free');
      return;
    }

    if (plan.stripeUrl) {
      // Open the Stripe Payment Link
      // IMPORTANT: The Stripe Payment Link should be configured in the Stripe Dashboard 
      // to redirect back to: [App URL]?success=true&plan_id=[plan.id]&session_id={CHECKOUT_SESSION_ID}
      window.open(plan.stripeUrl, '_blank', 'noopener,noreferrer');
      
      // Close pricing view if it's open
      if (activeTab === 'pricing') {
        setActiveTab('home');
      }
    }
  };


  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleCancelSubscription = () => {
    // Redirect to Stripe Customer Portal for cancellation
    window.open('https://billing.stripe.com/p/login/9B600c4Qq6Wx1qg42g18c00', '_blank', 'noopener,noreferrer');
  };

  const confirmCancelSubscription = () => {
    setPricingTier('free');
    setShowCancelModal(false);
    setCheckoutSuccess(true);
    setTimeout(() => setCheckoutSuccess(false), 5000);
  };

  const pricingModels = [
    { 
      id: 'free', 
      name: 'Gratis', 
      price: '0,-', 
      period: '/ MND', 
      features: [
        'Begrenset chat (Maks 5 per dag)', 
        'Grunnleggende ressurser', 
        'APA-generator'
      ] 
    },
    { 
      id: 'monthly', 
      name: 'Månedsabonnement', 
      price: '99,-', 
      period: '/ MND', 
      stripeUrl: 'https://buy.stripe.com/aFaaEQdmWeoZgla9mA18c01',
      features: [
        'Ubegrenset chat', 
        'Alle grunnleggende verktøy', 
        'Strukturhjelp', 
        'Metode-veileder', 
        'Kildekritikk-analyse',
        'Inntil 3 aktive arbeidsdokumenter'
      ] 
    },
    {
      id: 'preview',
      name: '24-timers Preview',
      price: '0,-',
      period: '/ 24T',
      features: [
        'Ubegrenset tilgang til alle funksjoner',
        'Full tilgang til dypanalyser',
        'Eksklusiv forhåndsvisning'
      ],
      hidden: true
    },
    { 
      id: 'semester', 
      name: 'Årsabonnement', 
      price: '399,-', 
      period: '/ ÅR', 
      popular: true,
      mostProfitable: true,
      priorityUpdates: true,
      stripeUrl: 'https://buy.stripe.com/6oUdR25UucgRed2eGU18c06',
      features: [
        'Alt i Måned', 
        'Ubegrenset antall arbeidsdokumenter',
        'Prosjektmapper for organisering',
        'Eksklusiv tilgang til samarbeidsverktøy',
        'Sanntids chat og gruppearbeid',
        'Fullt Sensorverktøy (Eksklusivt for År)', 
        'Dypere dokumentanalyse (Eksklusivt for År)', 
        'Prioritert support',
        'Først med nye funksjoner (Eksklusivt for År)'
      ] 
    }
  ];

  const taskTypes = [
    'Refleksjons- og diskusjonsoppgave',
    'Refleksjonsnotat',
    'Observasjon og dokumentasjon',
    'Pedagogisk planlegging og vurdering',
    'Prosjektarbeid',
    'Fagtekst',
    'Bacheloroppgave',
    'Egendefinert...'
  ];

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem('dmmh_chat_messages');
  };

  const handleStartChat = () => {
    if (messages.length === 0) {
      setShowTaskSetup(true);
    } else {
      setActiveTab('chat');
    }
  };

  const handleNewTask = () => {
    handleClearChat();
    setShowTaskSetup(true);
  };

  const setupOutline = (type: string) => {
    const finalTaskType = type === 'Egendefinert...' ? customTaskType : type;
    let initialOutline = [];
    if (finalTaskType === 'Bacheloroppgave' || finalTaskType === 'Fagtekst') {
      initialOutline = [
        { id: '1', title: 'Innledning', subchapters: [] },
        { id: '2', title: 'Teori', subchapters: [] },
        { id: '3', title: 'Metode', subchapters: [] },
        { id: '4', title: 'Resultat/Analyse', subchapters: [] },
        { id: '5', title: 'Diskusjon', subchapters: [] },
        { id: '6', title: 'Konklusjon', subchapters: [] }
      ];
    } else if (finalTaskType === 'Refleksjonsnotat') {
      initialOutline = [
        { id: '1', title: 'Beskrivelse av situasjon', subchapters: [] },
        { id: '2', title: 'Teoretisk perspektiv', subchapters: [] },
        { id: '3', title: 'Refleksjon og analyse', subchapters: [] },
        { id: '4', title: 'Veien videre', subchapters: [] }
      ];
    } else {
      initialOutline = [
        { id: '1', title: 'Innledning', subchapters: [] },
        { id: '2', title: 'Hoveddel', subchapters: [] },
        { id: '3', title: 'Avslutning', subchapters: [] }
      ];
    }
    setOutline(initialOutline);
  };

  const handleConfirmTaskSetup = () => {
    setShowTaskSetup(false);
    setActiveTab('chat');
    
    const finalTaskType = taskSetup.type === 'Egendefinert...' ? customTaskType : taskSetup.type;
    setupOutline(taskSetup.type);

    const initialPrompt = `Jeg skal skrive en ${finalTaskType} med ${taskSetup.genre.toLowerCase()}. 
    Oppgavetekst: ${taskSetup.instructions}
    Omfang: ${taskSetup.scope}
    Kan du hjelpe meg i gang?`;
    handleSendMessage(initialPrompt);
  };

  const calculateWordCount = () => {
    let total = 0;
    outline.forEach(chapter => {
      const text = bachelorDocument[chapter.id] || '';
      total += text.trim().split(/\s+/).filter(w => w.length > 0).length;
      chapter.subchapters.forEach(sub => {
        const subText = bachelorDocument[sub.id] || '';
        total += subText.trim().split(/\s+/).filter(w => w.length > 0).length;
      });
    });
    return total;
  };

  const exportToWord = async () => {
    const isYearly = pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview';
    
    const children = [
      // Forside (Standardisert for Årsabonnement)
      new Paragraph({ text: '', spacing: { before: 2000 } }),
      new Paragraph({ 
        text: activeDocument?.title || 'Bacheloroppgave', 
        heading: HeadingLevel.TITLE, 
        alignment: AlignmentType.CENTER 
      }),
      new Paragraph({ text: '', spacing: { before: 1000 } }),
      new Paragraph({ 
        text: profile.name || 'Student Navn', 
        alignment: AlignmentType.CENTER,
        style: 'Normal'
      }),
      new Paragraph({ 
        text: profile.studyProgram || 'Barnehagelærerutdanning', 
        alignment: AlignmentType.CENTER 
      }),
      new Paragraph({ 
        text: `Kandidatnummer: ${profile.candidateId || profile.studentId || 'N/A'}`, 
        alignment: AlignmentType.CENTER 
      }),
      new Paragraph({ 
        text: profile.college || 'Dronning Mauds Minne Høgskole', 
        alignment: AlignmentType.CENTER 
      }),
      new Paragraph({ 
        text: new Date().toLocaleDateString('no-NO'), 
        alignment: AlignmentType.CENTER 
      }),
      new Paragraph({ text: '', pageBreakBefore: true }),

      // Innholdsfortegnelse (Automatisk for Årsabonnement)
      new Paragraph({ text: 'Innholdsfortegnelse', heading: HeadingLevel.HEADING_1, spacing: { after: 400 } }),
      ...(isYearly ? [
        new TableOfContents("Innholdsfortegnelse", {
          hyperlink: true,
          headingStyleRange: "1-3",
        }),
        new Paragraph({ text: '', pageBreakBefore: true }),
      ] : [
        ...outline.flatMap((chapter, idx) => [
          new Paragraph({
            children: [new TextRun({ text: `${idx + 1}. ${chapter.title}`, bold: true }), new TextRun({ text: '\t' })],
          }),
          ...chapter.subchapters.map((sub, sIdx) => new Paragraph({
            children: [new TextRun({ text: `  ${idx + 1}.${sIdx + 1} ${sub.title}` }), new TextRun({ text: '\t' })],
          }))
        ]),
        new Paragraph({ text: '', pageBreakBefore: true }),
      ]),
    ];

    // Innhold med riktig linjeavstand (1.5 for APA 7)
    outline.forEach((chapter, idx) => {
      children.push(new Paragraph({ 
        text: `${idx + 1}. ${chapter.title}`, 
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }));
      
      const chapterText = bachelorDocument[chapter.id] || 'Ingen tekst lagt til.';
      children.push(new Paragraph({ 
        text: chapterText, 
        spacing: { line: 360, after: 200 }, // 360 = 1.5 linjeavstand
        alignment: AlignmentType.JUSTIFIED
      }));
      
      chapter.subchapters.forEach((sub, sIdx) => {
        children.push(new Paragraph({ 
          text: `${idx + 1}.${sIdx + 1} ${sub.title}`, 
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 }
        }));
        const subText = bachelorDocument[sub.id] || 'Ingen tekst lagt til.';
        children.push(new Paragraph({ 
          text: subText, 
          spacing: { line: 360, after: 200 },
          alignment: AlignmentType.JUSTIFIED
        }));
      });
    });

    const doc = new Document({
      styles: {
        default: {
          heading1: {
            run: { size: 28, bold: true, font: "Times New Roman" },
            paragraph: { spacing: { before: 400, after: 200 } },
          },
          heading2: {
            run: { size: 24, bold: true, font: "Times New Roman" },
            paragraph: { spacing: { before: 300, after: 150 } },
          },
          document: {
            run: { font: "Times New Roman", size: 24 }, // 24 half-points = 12pt
          }
        }
      },
      sections: [{ 
        properties: {}, 
        children,
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun("Side "),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                  }),
                  new TextRun(" av "),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                  }),
                ],
              }),
            ],
          }),
        },
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${activeDocument?.title || 'Oppgave'}_${profile.name || 'dokument'}.docx`);
  };

  const exportToPdf = () => {
    const doc = new jsPDF();
    let y = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Forside
    doc.setFontSize(24);
    doc.text(profile.name || 'Bacheloroppgave', pageWidth / 2, 80, { align: 'center' });
    doc.setFontSize(14);
    doc.text(profile.studyProgram || 'Barnehagelærerutdanning', pageWidth / 2, 100, { align: 'center' });
    doc.text(`Kandidatnummer: ${profile.studentId || 'N/A'}`, pageWidth / 2, 110, { align: 'center' });
    doc.text(new Date().toLocaleDateString('no-NO'), pageWidth / 2, 120, { align: 'center' });
    
    doc.addPage();
    y = 20;

    // Innholdsfortegnelse
    doc.setFontSize(18);
    doc.text('Innholdsfortegnelse', margin, y);
    y += 15;
    doc.setFontSize(12);
    outline.forEach((chapter, idx) => {
      doc.text(`${idx + 1}. ${chapter.title}`, margin, y);
      y += 8;
      chapter.subchapters.forEach((sub, sIdx) => {
        doc.text(`  ${idx + 1}.${sIdx + 1} ${sub.title}`, margin, y);
        y += 6;
      });
    });

    doc.addPage();
    y = 20;
    
    const addText = (title: string, content: string, level = 1) => {
      doc.setFontSize(level === 1 ? 16 : 14);
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(title, margin, y);
      y += 10;
      doc.setFontSize(12);
      const splitText = doc.splitTextToSize(content || 'Ingen tekst lagt til.', pageWidth - margin * 2);
      
      splitText.forEach((line: string) => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 7;
      });
      y += 5;
    };

    outline.forEach((chapter, idx) => {
      addText(`${idx + 1}. ${chapter.title}`, bachelorDocument[chapter.id], 1);
      chapter.subchapters.forEach((sub, sIdx) => {
        addText(`${idx + 1}.${sIdx + 1} ${sub.title}`, bachelorDocument[sub.id], 2);
      });
    });

    doc.save(`Oppgave_${profile.name || 'dokument'}.pdf`);
  };

  const copyToGoogleDocs = () => {
    const fullText = `
${profile.name || 'Bacheloroppgave'}
${profile.studyProgram || 'Barnehagelærer'}

SAMMENDRAG
${bachelorDocument.sammendrag}

INNLEDNING
${bachelorDocument.innledning}

TEORI
${bachelorDocument.teori}

METODE
${bachelorDocument.metode}

RESULTATER
${bachelorDocument.resultater}

DISKUSJON
${bachelorDocument.diskusjon}

KONKLUSJON
${bachelorDocument.konklusjon}

LITTERATURLISTE
${bachelorDocument.litteraturliste}

VEDLEGG
${bachelorDocument.vedlegg}
    `;
    copyToClipboard(fullText, 'google-docs-copy');
    alert('Hele teksten er kopiert til utklippstavlen. Du kan nå lime den rett inn i Google Docs.');
  };

  const linkFromPlanning = () => {
    const linkedText = `
PROBLEMSTILLING FRA PLANLEGGING:
${structureInput}

DISPOSISJON FRA PLANLEGGING:
${outline.map(o => `- ${o.title}\n  ${o.subchapters.map(s => `  * ${s.title}`).join('\n')}`).join('\n')}
    `;
    
    setBachelorDocument(prev => ({
      ...prev,
      innledning: prev.innledning ? prev.innledning + '\n\n' + linkedText : linkedText
    }));
  };

  const handleGetLiterature = async () => {
    if (!literatureTopic.trim() || isLiteratureLoading) return;
    setIsLiteratureLoading(true);
    setLiteratureError('');
    try {
      const result = await getLiteratureSuggestions(profile, literatureTopic);
      if (!result) {
        throw new Error('Ingen resultater ble returnert fra tjenesten. Vennligst prøv igjen.');
      }
      setLiteratureResult(result);
    } catch (error: any) {
      console.error("Feil ved henting av litteratur:", error);
      const errorMessage = error?.message || 'Det oppstod en uventet feil ved henting av litteraturforslag. Vennligst sjekk internettforbindelsen og prøv igjen.';
      setLiteratureError(errorMessage);
    } finally {
      setIsLiteratureLoading(false);
    }
  };

  const handleAnalyze = async () => {
    const hasInput = sensorFile || (sensorUploadMode === 'text' && sensorInput.trim().length > 0);
    if (!hasInput || isEvaluating) return;
    if (sensorOption === 'feedback' && !teacherFeedback.trim()) return;
    
    setIsEvaluating(true);
    try {
      let text = sensorUploadMode === 'text' ? sensorInput.trim() : '';
      
      if (sensorUploadMode === 'file' && sensorFile) {
        const extracted = await extractTextFromPdf(sensorFile);
        if (!extracted || extracted.trim().length < 10) {
          throw new Error('Kunne ikke hente ut nok tekst fra PDF-en. Er den skannet som bilde?');
        }
        text = extracted;
      }

      if (!text || text.trim().length < 10) {
        throw new Error(sensorUploadMode === 'file' ? 'Vennligst last opp en PDF for å starte analysen.' : 'Vennligst lim inn tekst for å starte analysen.');
      }

      const wordCount = text.split(/\s+/).length;
      const isYearly = pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview';

      // Enforce limits
      if (!isYearly && wordCount > 2000) {
        text = text.split(/\s+/).slice(0, 2000).join(' ');
        alert("Månedsabonnement er begrenset til 2000 ord per analyse. Teksten din har blitt forkortet. Oppgrader til Årsabonnement for å analysere hele dokumenter opptil 12 000 ord.");
      } else if (isYearly && wordCount > 12000) {
        text = text.split(/\s+/).slice(0, 12000).join(' ');
        alert("Maksgrensen for analyse er 12 000 ord. Teksten din har blitt forkortet til denne grensen.");
      }

      // System Prompts
      const feedbackPrompt = `DIN ROLLE:
Du er en empatisk, klarsynt og oppmuntrende "Skrivecoach og Tolk". Brukeren har fått tilbakemelding fra sin veileder/sensor, og din jobb er å oversette akademisk "sensor-språk" til forståelig norsk, fjerne frustrasjonen, og lage en slagplan.

STRUKTUR PÅ SVARET DITT:
1. Pust med magen: Minn dem på at omskriving er en naturlig del av prosessen, og at tilbakemeldingen er et verktøy for forbedring.
2. Oversettelse: Bryt ned kommentarene fra veileder til enkle ord.
3. Handlingsplan: Lag en prioritert sjekkliste med 2-4 konkrete handlinger.
4. Eksempel på omskriving: Vis et kort eksempel på hvordan en setning kan skrives om for å imøtekomme kritikken.
TONE: Støttende, pedagogisk, varm og tydelig.`;

      const devilsAdvocatePrompt = `DIN ROLLE:
Du er "Djevelens advokat" – en kritisk, men rettferdig akademisk opponent. Din jobb er å stressteste studentens tekst, finne de svakeste leddene i argumentasjonen, og utfordre det faglige ståstedet deres.

STRUKTUR PÅ SVARET DITT:
1. Den største svakheten: Pek saklig på det svakeste leddet i argumentasjonen eller koblingen mellom teori og praksis.
2. Motargumenter: Introduser et teoretisk eller praktisk perspektiv som utfordrer studentens syn.
3. "Hva så?"-testen: Utfordre relevansen for barnehagelærerprofesjonen.
4. Slik forsvarer du deg: Gi studenten 2 konkrete råd om hvordan de kan tette hullene for å gjøre argumentasjonen skuddsikker.
TONE: Utfordrende, analytisk og direkte, men akademisk og saklig.`;

      const sensorPrompt = `Du er BLU-Hjelperen sin erfarne, rettferdige og analytiske "Sensor og Skrivecoach". Din absolutte rettesnor er DMMHs offisielle vurderingskriterier og nasjonale retningslinjer for oppgaveskriving i barnehagelærerutdanningen (BLU).

--- DMMH VURDERINGSKRITERIER OG NASJONALE KRAV FOR BLU ---
Oppgaven vurderes etter karakterskala A-F på bakgrunn av følgende læringsutbytter og krav:

1. Kunnskap og Teoriforståelse:
- Har kandidaten grunnleggende kunnskap om vitenskapsteori, forskningsmetoder og forskningsetikk?
- Viser oppgaven innsikt i relevante teoretiske perspektiver (pedagogikk/fordypning) knyttet til problemfeltet?
- Viser kandidaten bred kunnskap om barnehagens samfunnsmandat, verdigrunnlag og barns rettigheter/danning?

2. Drøfting og Analyse (Ferdigheter):
- Er problemstillingen tydelig formulert og besvart gjennom hele oppgaven?
- Klarer kandidaten å analysere og drøfte eget datamateriale/empiri (eller praksisfortellinger) opp mot den valgte teorien og problemstillingen?
- Viser kandidaten evne til kritisk refleksjon, spesielt rundt profesjonsetiske utfordringer, maktforhold og egen rolle som barnehagelærer?

3. Akademisk Form og Skriving:
- Er oppgaven en helhetlig og sammenhengende fremstilling (tydelig "rød tråd")?
- Behersker studenten akademisk skriving og fagspråk?
- Er kildebruken etterprøvbar og formatert korrekt etter gjeldende referansestil (APA-7)?
----------------------------------------

Ditt mål er å hjelpe studenter med å skrive sine oppgaver og bacheloroppgaver i tråd med nasjonale akademiske standarder.`;

      let activePrompt = sensorPrompt;
      if (isDevilAdvocate) {
        activePrompt = devilsAdvocatePrompt;
      } else if (sensorOption === 'feedback') {
        activePrompt = feedbackPrompt;
      }

      let result;
      if (isYearly && wordCount > 3000) {
        // Chunking logic
        const words = text.split(/\s+/);
        const chunks = [];
        const chunkSize = 3000;
        for (let i = 0; i < words.length; i += chunkSize) {
          chunks.push(words.slice(i, i + chunkSize).join(' '));
        }

        const chunkResults = [];
        for (let i = 0; i < chunks.length; i++) {
          console.log(`Analyzing chunk ${i + 1} of ${chunks.length}...`);
          const res = await analyzeWithSystemPrompt(chunks[i], activePrompt);
          chunkResults.push(res);
        }
        result = await synthesizeEvaluations(chunkResults);
      } else {
        result = await analyzeWithSystemPrompt(text, activePrompt);
      }
      setEvaluationResult(result);
    } catch (error: any) {
      console.error('Sensor error:', error);
      let errorMessage = 'Oi! Noe gikk galt under analysen. Kan du prøve igjen? ';
      
      const errorStr = JSON.stringify(error).toLowerCase();
      const messageStr = (error?.message || "").toLowerCase();

      if (messageStr.includes('kunne ikke hente ut nok tekst')) {
        errorMessage = error.message;
      } else if (messageStr.includes('api key')) {
        errorMessage += 'Systemet mangler API-nøkkel. Vennligst sjekk at den er lagt til i "Secrets".';
      } else if (errorStr.includes("spending cap") || messageStr.includes("spending cap") || errorStr.includes("quota") || messageStr.includes("quota") || errorStr.includes("429")) {
        errorMessage = "Prosjektet har nådd sin månedlige bruksgrense (spending cap) eller kvote i Google AI Studio. Vennligst sjekk innstillingene dine på ai.studio/spend.";
      } else {
        errorMessage += 'Dette kan skyldes at dokumentet er for komplekst eller at det er problemer med tilkoblingen. Vennligst prøv igjen, eller prøv å lime inn teksten manuelt.';
      }
      
      alert(errorMessage);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleCheckAPA = async () => {
    if (!apaInput.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const result = await checkAPA7(apaInput);
      setApaResult(result);
    } catch (error) {
      console.error(error);
      setGlobalError('Kunne ikke sjekke referansen. Vennligst prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetMethodology = async () => {
    if (!methodologyDesign || !methodologyProblem.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const result = await getMethodologyAdvice(
        methodologyDesign, 
        methodologyProblem, 
        methodologyTool, 
        methodologyPhase, 
        customMethod
      );
      setMethodologyResult(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChecklist = (id: string) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const addChapter = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setOutline([...outline, { id: newId, title: 'Nytt kapittel', subchapters: [] }]);
  };

  const deleteChapter = (id: string) => {
    setOutline(outline.filter(c => c.id !== id));
  };

  const updateChapterTitle = (id: string, title: string) => {
    setOutline(outline.map(c => c.id === id ? { ...c, title } : c));
  };

  const applyTemplate = (templateId: string) => {
    const template = assignmentTemplates.find(t => t.id === templateId);
    if (!template) return;

    let chapters = template.chapters.map((c, i) => ({
      id: `template-${i}-${Date.now()}`,
      title: c.title,
      subchapters: c.subchapters.map((s, j) => ({
        id: `template-${i}-${j}-${Date.now()}`,
        title: s
      }))
    }));

    // Set active disposition for Skriveverksted
    if (DISPOSITIONS[template.title]) {
      setActiveDisposition(DISPOSITIONS[template.title]);
    } else if (templateId === 'egendefinert') {
      setActiveDisposition([]);
    }

    setOutline(chapters);
    setSelectedTemplateId(templateId);

    // Special logic for Pedagogisk planlegging og vurdering
    if (templateId === 'pedagogisk-planlegging' && taskSetup.instructions.toLowerCase().includes('overgang barnehage-skole')) {
      const vurderingChapter = chapters.find(c => c.title === 'Vurdering');
      if (vurderingChapter) {
        vurderingChapter.subchapters.push(
          { id: `special-1-${Date.now()}`, title: 'Barnets perspektiv' },
          { id: `special-2-${Date.now()}`, title: 'Sammenheng og kontinuitet' },
          { id: `special-3-${Date.now()}`, title: 'Samarbeid med skolen' }
        );
      }
    }
  };

  const addSubchapter = (chapterId: string) => {
    const newId = Math.random().toString(36).substr(2, 9);
    setOutline(outline.map(c => c.id === chapterId ? { ...c, subchapters: [...c.subchapters, { id: newId, title: 'Nytt underkapittel' }] } : c));
  };

  const deleteSubchapter = (chapterId: string, subId: string) => {
    setOutline(outline.map(c => c.id === chapterId ? { ...c, subchapters: c.subchapters.filter(s => s.id !== subId) } : c));
  };

  const updateSubchapterTitle = (chapterId: string, subId: string, title: string) => {
    setOutline(outline.map(c => c.id === chapterId ? { ...c, subchapters: c.subchapters.map(s => s.id === subId ? { ...s, title } : s) } : c));
  };

  const moveChapter = (index: number, direction: 'up' | 'down') => {
    const newOutline = [...outline];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOutline.length) return;
    [newOutline[index], newOutline[targetIndex]] = [newOutline[targetIndex], newOutline[index]];
    setOutline(newOutline);
  };

  const moveSubchapter = (chapterId: string, index: number, direction: 'up' | 'down') => {
    setOutline(outline.map(c => {
      if (c.id !== chapterId) return c;
      const newSubs = [...c.subchapters];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newSubs.length) return c;
      [newSubs[index], newSubs[targetIndex]] = [newSubs[targetIndex], newSubs[index]];
      return { ...c, subchapters: newSubs };
    }));
  };

  const exportOutlineForAnalysis = () => {
    const text = outline.map(c => {
      const subs = c.subchapters.map(s => `  - ${s.title}`).join('\n');
      return `${c.title}${subs ? '\n' + subs : ''}`;
    }).join('\n\n');
    setStructureInput(text);
    setWritingStep(4);
    setActiveTab('writing-process');
  };

  const resources = [
    { title: 'Rammeplanen for barnehagen', url: 'https://www.udir.no/laring-og-trivsel/rammeplan-for-barnehagen/', desc: 'Forskrift om rammeplan for barnehagens innhold og oppgaver.' },
    { title: 'Utdanningsdirektoratet (Udir)', url: 'https://www.udir.no/barnehage/', desc: 'Ressurser og retningslinjer for barnehagesektoren.' },
    { title: 'Pensumlister', url: 'https://www.dmmh.no/bibliotek/pensum', desc: 'Finn relevant litteratur (eksempel fra DMMH).' },
    { title: 'Oria', url: 'https://bibsys-uj.primo.exlibrisgroup.com/discovery/search?vid=47BIBSYS_DMMH:DMMH', desc: 'Finn pensum og forskningsartikler via Oria.' },
    { title: 'Søk og Skriv', url: 'https://www.sokogskriv.no/', desc: 'Beste ressurs for akademisk skriving og referering.' },
    { title: 'SIKT (Personvern)', url: 'https://sikt.no/logg-inn', desc: 'Nødvendig for empiriske undersøkelser.' },
    { title: 'Akademisk skriving', url: 'https://www.dmmh.no/bibliotek/skrive-og-referere/skrive-bacheloroppgave', desc: 'Retningslinjer for oppgaveskriving.' },
    { title: 'KI i utdanning', url: 'https://www.dmmh.no/bibliotek/skrive-og-referere/kunstig-intelligens-i-utdanning', desc: 'Regler for bruk av AI i studier.' },
    { title: 'Webinar: Akademisk skriving', url: 'https://film.oslomet.no/akademisk-skriving', desc: 'Nyttig webinar fra OsloMet om struktur og akademisk språk.' },
  ];

  const handleGlossarySearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || isAiDefining) return;

    // Sjekk om begrepet allerede finnes i ordlisten (eksakt match)
    const exists = allGlossaryTerms.some(item => 
      item.term.toLowerCase() === searchQuery.toLowerCase()
    );

    if (!exists) {
      await handleAiDefine();
    } else {
      incrementSearchCount(searchQuery);
    }
  };

  const handleAiDefine = async () => {
    if (!searchQuery.trim() || isAiDefining) return;
    setIsAiDefining(true);
    try {
      const definition = await defineTerm(searchQuery);
      const newTerm = { term: searchQuery, def: definition };
      setAiTerms(prev => [newTerm, ...prev]);
      // Increment search count for the new term
      setSearchCounts(prev => ({
        ...prev,
        [searchQuery.toLowerCase()]: (prev[searchQuery.toLowerCase()] || 0) + 1
      }));
    } catch (error) {
      console.error(error);
      setGlobalError('Kunne ikke hente begrepsforklaring. Vennligst prøv igjen.');
    } finally {
      setIsAiDefining(false);
    }
  };

  const incrementSearchCount = (term: string) => {
    setSearchCounts(prev => ({
      ...prev,
      [term.toLowerCase()]: (prev[term.toLowerCase()] || 0) + 1
    }));
  };

  const glossary = [
    { term: 'Ontologi', def: 'Læren om hvordan virkeligheten er beskaffen. I barnehageforskning: Hva er et barn? Hva er lek?' },
    { term: 'Epistemologi', def: 'Læren om kunnskap. Hvordan kan vi få kunnskap om barns opplevelser?' },
    { term: 'Hermeneutikk', def: 'Fortolkningslære. Å forstå en del i lys av helheten, f.eks. en observasjon i lys av teori.' },
    { term: 'Diskurs', def: 'En bestemt måte å snakke om og forstå et fenomen på, f.eks. "barnet som subjekt".' },
    { term: 'Empiri', def: 'Datamaterialet du samler inn (intervjuer, observasjoner, dokumenter).' },
    { term: 'Reliabilitet', def: 'Pålitelighet. Ville en annen forsker fått samme resultat med samme metode?' },
    { term: 'Validitet', def: 'Gyldighet. Måler eller undersøker du faktisk det du sier du skal undersøke?' },
    { term: 'Abduksjon', def: 'En veksling mellom teori og empiri i analyseprosessen.' },
    { term: 'Fenomenologi', def: 'Studiet av fenomener slik de fremtrer for bevisstheten, ofte fokus på livsverden.' },
    { term: 'Paradigm', def: 'Et overordnet tankemønster eller vitenskapelig verdensbilde.' }
  ];

  const allGlossaryTerms = [...glossary, ...aiTerms];

  const filteredGlossary = allGlossaryTerms
    .filter(item => 
      item.term.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.def.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const countA = searchCounts[a.term.toLowerCase()] || 0;
      const countB = searchCounts[b.term.toLowerCase()] || 0;
      return countB - countA;
    });

  // Automatic AI glossary search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'glossary-auto' && searchQuery.length > 2 && filteredGlossary.length === 0 && !isAiDefining) {
        handleGlossarySearch();
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [searchQuery, filteredGlossary.length, activeTab, isAiDefining]);

  const filteredResources = resources.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const aiEthics = [
    { title: 'Vær åpen', desc: 'Opplys alltid om du har brukt KI som verktøy i arbeidet ditt.' },
    { title: 'Kritisk blikk', desc: 'KI kan hallusinere. Sjekk alltid fakta mot troverdige kilder.' },
    { title: 'Ditt ansvar', desc: 'Du er selv ansvarlig for innholdet i din bacheloroppgave.' },
    { title: 'Akademisk redelighet', desc: 'Bruk KI til veiledning og struktur, ikke til å skrive selve teksten.' },
  ];

  const privacyNotice = [
    { title: 'Sikker skylagring', desc: 'All tekst og chat-historikk lagres trygt i en kryptert skydatabase (Google Firebase). Dette gjør at du sømløst kan arbeide på tvers av mobil, nettbrett og PC uten å miste innhold.' },
    { title: 'Ingen KI-trening eller plagiatrisiko', desc: 'Dine tekster brukes ALDRI til å trene opp våre eller andres KI-modeller. De deles heller ikke med eksterne plagiatkontroller (som Urkund/Ouriginal), så du kan trygt teste tekstene dine her først.' },
    { title: 'Trygg dataoverføring', desc: 'Tekst din sendes kun via sikre, krypterte tilkoblinger til Gemini API for umiddelbar analyse under skriveprosessen. Du beholder alltid 100 % eierskap til alt du skriver.' },
    { title: 'Full kontroll og sletting', desc: 'Du har full kontroll over dine egne data. Du kan når som helst eksportere dokumentene dine, eller slette alt innhold permanent fra våre servere via innstillingene i profilen din.' }
  ];

  const assignmentTemplates = [
    {
      id: 'refleksjon-diskusjon',
      title: 'Refleksjons- og diskusjonsoppgave',
      description: 'Struktur for drøfting av ulike perspektiver.',
      chapters: [
        { title: 'Introduksjon', subchapters: [] },
        { title: 'Situasjonsbeskrivelse', subchapters: [] },
        { title: 'Drøfting', subchapters: ['Ulike perspektiver'] },
        { title: 'Teoretisk forankring', subchapters: [] },
        { title: 'Oppsummering', subchapters: [] }
      ]
    },
    {
      id: 'refleksjonsnotat',
      title: 'Refleksjonsnotat',
      description: 'Fokus på praksisfortelling og egen refleksjon.',
      chapters: [
        { title: 'Praksisfortelling', subchapters: [] },
        { title: 'Egne reaksjoner', subchapters: [] },
        { title: 'Faglig analyse', subchapters: [] },
        { title: 'Kritisk refleksjon', subchapters: [] }
      ]
    },
    {
      id: 'observasjon-dokumentasjon',
      title: 'Observasjon og dokumentasjon',
      description: 'For oppgaver basert på feltarbeid og data.',
      chapters: [
        { title: 'Mål for observasjonen', subchapters: [] },
        { title: 'Metode', subchapters: [] },
        { title: 'Forskningsetiske vurderinger', subchapters: ['Anonymisering', 'Samtykke'] },
        { title: 'Datapresentasjon', subchapters: [] },
        { title: 'Analyse', subchapters: [] },
        { title: 'Etisk refleksjon', subchapters: [] }
      ]
    },
    {
      id: 'pedagogisk-planlegging',
      title: 'Pedagogisk planlegging og vurdering',
      description: 'Struktur for didaktiske planer og evaluering.',
      chapters: [
        { title: 'Målgruppe/Rammer', subchapters: [] },
        { title: 'Læringsmål', subchapters: ['Rammeplan'] },
        { title: 'Metode/Aktivitet', subchapters: [] },
        { title: 'Vurdering', subchapters: [] },
        { title: 'Profesjonsetisk vurdering', subchapters: [] }
      ]
    },
    {
      id: 'prosjektarbeid',
      title: 'Prosjektarbeid',
      description: 'Dokumentasjon av prosess og barns medvirkning.',
      chapters: [
        { title: 'Bakgrunn og tema', subchapters: [] },
        { title: 'Barns medvirkning', subchapters: [] },
        { title: 'Prosessbeskrivelse', subchapters: [] },
        { title: 'Dokumentasjonsformer', subchapters: [] },
        { title: 'Pedagogisk refleksjon', subchapters: [] }
      ]
    },
    {
      id: 'fagtekst',
      title: 'Fagtekst',
      description: 'Klassisk akademisk oppbygging for fagartikler.',
      chapters: [
        { title: 'Innledning/Problemstilling', subchapters: [] },
        { title: 'Redegjørelse', subchapters: ['Teori'] },
        { title: 'Hoveddel', subchapters: ['Drøfting'] },
        { title: 'Konklusjon', subchapters: [] }
      ],
      resource: { label: 'Webinar om akademisk skriving (OsloMet)', url: 'https://film.oslomet.no/akademisk-skriving' }
    },
    {
      id: 'bacheloroppgave',
      title: 'Bacheloroppgave',
      description: 'Fullstendig struktur for større fordypningsoppgaver.',
      chapters: [
        { title: 'Innledning', subchapters: ['Problemstilling', 'Begrunnelse', 'Avgrensning'] },
        { title: 'Teori og tidligere forskning', subchapters: [] },
        { title: 'Metode og etikk', subchapters: ['Design', 'Utvalg', 'Analyse'] },
        { title: 'Forskningsetiske vurderinger', subchapters: ['Anonymisering', 'Samtykke', 'Etisk forsvarlighet'] },
        { title: 'Resultater', subchapters: ['Presentasjon av funn'] },
        { title: 'Drøfting', subchapters: ['Analyse og diskusjon'] },
        { title: 'Avslutning', subchapters: ['Konklusjon'] }
      ],
      resource: { label: 'Metode-veileder for Bacheloroppgaven', url: 'https://www.dmmh.no/bibliotek/skrive-og-referere/skrive-bacheloroppgave' }
    },
    {
      id: 'arbeidskrav',
      title: 'Obligatorisk arbeidskrav',
      description: 'Struktur for mindre skriftlige innleveringer.',
      chapters: [
        { title: 'Innledning', subchapters: [] },
        { title: 'Hoveddel', subchapters: [] },
        { title: 'Refleksjon', subchapters: [] }
      ]
    },
    {
      id: 'praksisoppgave',
      title: 'Praksisfortelling/Praksisoppgave',
      description: 'Fokus på didaktikk og refleksjon over praksis.',
      chapters: [
        { title: 'Praksisfortelling', subchapters: [] },
        { title: 'Faglig analyse', subchapters: ['Rammeplan'] },
        { title: 'Didaktisk refleksjon', subchapters: [] }
      ]
    },
    {
      id: 'egendefinert',
      title: 'Egendefinert struktur',
      description: 'Begynn med en tom struktur og bygg kapittel for kapittel.',
      chapters: []
    }
  ];

  const problemstillingTemplates = useMemo(() => {
    const type = taskSetup.type;
    
    if (type === 'Bacheloroppgave') {
      return [
        {
          title: 'Kvalitativ intervjustudie',
          template: 'Hvordan erfarer [målgruppe] [fenomen] i [kontekst]?',
          example: 'Hvordan erfarer barnehagelærere barns medvirkning i måltidssituasjoner i en småbarnsavdeling?',
          description: 'Passer når du vil undersøke personlige erfaringer, meninger eller opplevelser.'
        },
        {
          title: 'Litteraturstudie',
          template: 'Hva sier nyere forskning om [tema] i lys av [teoretisk perspektiv]?',
          example: 'Hva sier nyere forskning om betydningen av lek for barns språkutvikling i lys av Vygotskys sosiokulturelle teori?',
          description: 'Passer når du vil oppsummere eksisterende kunnskap om et emne.'
        },
        {
          title: 'Aksjonsforskning',
          template: 'Hvordan kan [tiltak] bidra til [ønsket endring] i [barnehagehverdag]?',
          example: 'Hvordan kan bruk av digitale verktøy i naturen bidra til å øke barns nysgjerrighet for naturfaglige fenomener?',
          description: 'Passer når du vil prøve ut noe nytt i praksis og evaluere effekten.'
        },
        {
          title: 'Observasjonsstudie',
          template: 'Hvilke former for [atferd/samhandling] kommer til uttrykk i [situasjon]?',
          example: 'Hvilke former for inkluderende lek kommer til uttrykk i barnehagens utetid?',
          description: 'Passer når du vil undersøke hva som faktisk skjer i barnehagen uten å intervenere.'
        }
      ];
    }

    if (type === 'Fagtekst' || type === 'Refleksjons- og diskusjonsoppgave') {
      return [
        {
          title: 'Teoretisk drøfting',
          template: 'En teoretisk drøfting av [Tema] i lys av [Teori/Begrep].',
          example: 'En teoretisk drøfting av barns medvirkning i lys av Foucaults maktbegrep.',
          description: 'Fokus på å koble teori til pedagogiske problemstillinger.'
        },
        {
          title: 'Begrepsanalyse',
          template: 'Hvordan kan begrepet [Begrep] forstås i en [Kontekst]?',
          example: 'Hvordan kan begrepet "omsorg" forstås i en travel barnehagehverdag?',
          description: 'Utforsk dypere betydning av sentrale faguttrykk.'
        }
      ];
    }

    if (type === 'Refleksjonsnotat' || type === 'Observasjon og dokumentasjon') {
      return [
        {
          title: 'Praksisrefleksjon',
          template: 'En profesjonsetisk refleksjon over en observasjon av barns lek i [Kontekst].',
          example: 'En profesjonsetisk refleksjon over en observasjon av barns lek i garderobesituasjonen.',
          description: 'Koble egne erfaringer og observasjoner til etisk refleksjon.'
        },
        {
          title: 'Observasjonsanalyse',
          template: 'En analyse av [Situasjon] med fokus på [Fokusområde].',
          example: 'En analyse av samspill i sandkassen med fokus på inkludering.',
          description: 'Bruk dokumentasjon for å forstå barns samhandling.'
        }
      ];
    }

    if (type === 'Pedagogisk planlegging og vurdering' || type === 'Prosjektarbeid') {
      return [
        {
          title: 'Didaktisk planlegging',
          template: 'Planlegging og didaktisk vurdering av et prosjekt om [Tema] med fokus på barns medvirkning.',
          example: 'Planlegging og didaktisk vurdering av et prosjekt om bærekraft med fokus på barns medvirkning.',
          description: 'Strukturer pedagogiske tiltak og vurderingskriterier.'
        },
        {
          title: 'Prosjektevaluering',
          template: 'En vurdering av [Prosjekt] i lys av [Mål fra Rammeplanen].',
          example: 'En vurdering av kunstprosjektet i lys av Rammeplanens mål om skaperglede.',
          description: 'Evaluer pedagogisk arbeid opp mot nasjonale føringer.'
        }
      ];
    }

    return [
      {
        title: 'Generell problemstilling',
        template: 'Hvordan kan [Tema] bidra til [Mål] i barnehagen?',
        example: 'Hvordan kan musikk bidra til språkutvikling i barnehagen?',
        description: 'En fleksibel mal som passer de fleste oppgaver.'
      }
    ];
  }, [taskSetup.type]);

  const inspirationTips = useMemo(() => {
    const type = taskSetup.type;
    if (type === 'Fagtekst' || type === 'Refleksjons- og diskusjonsoppgave') {
      return [
        "Finn relevante kilder i biblioteket eller 'Litteratur'-fanen.",
        "Koble teorien din til overordnede pedagogiske spørsmål.",
        "Bruk 'Sitat-hvelvet' for å organisere viktige utdrag fra pensum."
      ];
    }
    if (type === 'Refleksjonsnotat' || type === 'Observasjon og dokumentasjon') {
      return [
        "Bruk konkrete praksisfortellinger som utgangspunkt.",
        "Vær ærlig om egne følelser og reaksjoner i situasjonen.",
        "Slå opp i Rammeplanen for å se hvilke verdier som står på spill."
      ];
    }
    if (type === 'Pedagogisk planlegging og vurdering' || type === 'Prosjektarbeid') {
      return [
        "Bruk didaktiske modeller (f.eks. den didaktiske relasjonsmodellen).",
        "Tenk på hvordan overgangen mellom barnehage og skole kan ivaretas.",
        "Involver barna i planleggingen og dokumenter deres medvirkning."
      ];
    }
    return [
      "Beskriv temaet ditt for å få forslag til vinklinger.",
      "Spør assistenten om motforestillinger til din problemstilling.",
      "Sjekk 'Milepæler' for å holde oversikt over fremdriften."
    ];
  }, [taskSetup.type]);

  useEffect(() => {
    if (notificationsEnabled) {
      const timer = setTimeout(() => {
        simulateIncomingGroupMessage('KL', 'Har du sett den nye kilden jeg la inn i biblioteket?', 'emerald');
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [notificationsEnabled]);

  if (isAuthLoading) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center z-[1000]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <GraduationCap className="w-10 h-10 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">BLU-Hjelperen</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Gjør klar din personlige assistent...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans flex flex-col transition-colors duration-300">
      <OnboardingWizard />
      {globalError && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white p-4 text-center font-bold flex items-center justify-center gap-4">
          <AlertTriangle className="w-5 h-5" />
          <span>{globalError}</span>
          <button onClick={() => setGlobalError(null)} className="p-1 hover:bg-white/20 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      {globalSuccess && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-emerald-600 text-white p-4 text-center font-bold flex items-center justify-center gap-4">
          <CheckCircle2 className="w-5 h-5" />
          <span>{globalSuccess}</span>
          <button onClick={() => setGlobalSuccess(null)} className="p-1 hover:bg-white/20 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      {/* Reference Guide Modal */}
      <AnimatePresence>
        {showRefGuide && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-primary text-white">
                <div className="flex items-center gap-3">
                  <Library className="w-6 h-6" />
                  <h2 className="text-xl font-black">Referanse-guide: {selectedReferenceStyle}</h2>
                </div>
                <button onClick={() => setShowRefGuide(false)} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto max-h-[70vh] space-y-8">
                <section>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Bokkilder</h3>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <p className="text-sm text-slate-700 leading-relaxed italic mb-2">
                      {selectedReferenceStyle === 'APA 7' && "Etternavn, F. M. (År). Tittel i kursiv. Forlag."}
                      {selectedReferenceStyle === 'DMMH-reglement' && "Etternavn, F. M. (År). Tittel i kursiv. Sted: Forlag."}
                      {selectedReferenceStyle === 'OsloMet/HVL' && "Etternavn, F. M. (År). Tittel i kursiv. Utgave. Forlag."}
                    </p>
                    <p className="text-xs text-slate-500">Eksempel: Lindgren, A. (1945). *Pippi Langstrømpe*. Cappelen Damm.</p>
                  </div>
                </section>
                <section>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Nettsider</h3>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <p className="text-sm text-slate-700 leading-relaxed italic mb-2">
                      {selectedReferenceStyle === 'APA 7' && "Forfatter/Organisasjon. (År). Tittel i kursiv. URL"}
                      {selectedReferenceStyle === 'DMMH-reglement' && "Forfatter/Organisasjon. (År). Tittel i kursiv. Hentet dato fra URL"}
                      {selectedReferenceStyle === 'OsloMet/HVL' && "Forfatter/Organisasjon (År). Tittel i kursiv. Tilgjengelig fra: URL"}
                    </p>
                    <p className="text-xs text-slate-500">Eksempel: Utdanningsdirektoratet. (2017). *Rammeplan for barnehagen*. https://www.udir.no/laring-og-trivsel/rammeplan/</p>
                  </div>
                </section>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <p className="text-xs text-amber-800 font-medium">
                    Husk å alltid sjekke din institusjons spesifikke krav, da det kan forekomme lokale variasjoner i hvordan referanser skal settes opp.
                  </p>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setShowRefGuide(false)}
                  className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all"
                >
                  Lukk guide
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Task Setup Modal */}
      <AnimatePresence>
        {showTaskSetup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
            >
              <div className="p-6 bg-primary text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">Oppsett for ny oppgave</h2>
                    <p className="text-xs text-primary-light font-medium">Fortell assistenten hva du skal skrive om</p>
                  </div>
                </div>
                <button onClick={() => setShowTaskSetup(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-800">Velg oppgavetype</label>
                    <select 
                      value={taskSetup.type}
                      onChange={(e) => {
                        if (e.target.value === 'Egendefinert...' && pricingTier !== 'semester') {
                          setActiveTab('pricing');
                          setShowTaskSetup(false);
                          return;
                        }
                        setTaskSetup({...taskSetup, type: e.target.value});
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-slate-900"
                    >
                      <option value="">Velg...</option>
                      {taskTypes.map(type => (
                        <option key={type} value={type}>
                          {type} {type === 'Egendefinert...' && pricingTier !== 'semester' ? '🔒' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {taskSetup.type === 'Egendefinert...' && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2"
                    >
                      <label className="text-sm font-bold text-slate-700">Beskriv oppgavetypen</label>
                      <input 
                        type="text"
                        value={customTaskType}
                        onChange={(e) => setCustomTaskType(e.target.value)}
                        placeholder="F.eks: Semesteroppgave i pedagogikk..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                      />
                    </motion.div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-800">Sjangerkrav</label>
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                      {['Akademisk fokus', 'Høy grad av egen refleksjon'].map(genre => (
                        <button
                          key={genre}
                          onClick={() => setTaskSetup({...taskSetup, genre})}
                          className={cn(
                            "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                            taskSetup.genre === genre ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-800">Oppgavetekst og instrukser</label>
                  <textarea 
                    value={taskSetup.instructions}
                    onChange={(e) => setTaskSetup({...taskSetup, instructions: e.target.value})}
                    placeholder="Lim inn oppgaveteksten her..."
                    className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all resize-none text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Omfang (antall ord/sider)</label>
                  <input 
                    type="text"
                    value={taskSetup.scope}
                    onChange={(e) => setTaskSetup({...taskSetup, scope: e.target.value})}
                    placeholder="F.eks: 1500 ord / 5 sider"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 mb-1">Standardoppsett (DMMH-mal)</h4>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Times New Roman, str. 12, 1,5 linjeavstand. Assistenten bruker alltid <strong>APA-7 standard</strong> for referering.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={() => setShowTaskSetup(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all"
                >
                  Avbryt
                </button>
                <button 
                  onClick={handleConfirmTaskSetup}
                  disabled={!taskSetup.type || !taskSetup.instructions.trim()}
                  className="flex-[2] py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary-light disabled:opacity-50 disabled:shadow-none"
                >
                  Start assistenten
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pricing Modal Overlay (Triggered by Upgrade Button) */}
      <PricingComponent 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pricingTier={pricingTier}
        pricingModels={pricingModels}
        handleCheckout={handleCheckout}
        handleCancelSubscription={handleCancelSubscription}
      />

      {/* Header */}
      <header className={cn(
        "bg-white border-b border-slate-100 sticky top-0 z-50 transition-all duration-300",
        isFocusMode && "opacity-0 -translate-y-full pointer-events-none"
      )}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
    <div className="flex items-center h-16 gap-4 lg:gap-8">
      <div 
        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity group shrink-0"
        onClick={() => setActiveTab('home')}
      >
        <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
          <HandHelping className="text-white w-5 h-5 lg:w-6 lg:h-6" />
        </div>
        <div className="flex flex-col">
          <h1 className="font-black text-lg lg:text-xl tracking-tighter text-slate-900 leading-none">BLU-Hjelperen</h1>
          <span className="hidden sm:block text-[8px] lg:text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5 opacity-90">Skrivepartner</span>
        </div>
      </div>

      {/* Desktop Main Nav */}
      <div className="hidden md:flex flex-1 items-center relative overflow-hidden group/nav">
        {canScrollLeft && (
          <button 
            onClick={() => scrollNav('left')}
            className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-white via-white/80 to-transparent z-10 flex items-center justify-start hover:scale-110 transition-transform"
          >
            <div className="bg-white p-1 rounded-full shadow-md border border-slate-100 ml-1">
              <ChevronLeft className="w-4 h-4 text-primary" />
            </div>
          </button>
        )}
        <nav 
          ref={navRef}
          onScroll={checkScroll}
          className="flex items-center gap-1 lg:gap-2 flex-1 justify-start overflow-x-auto no-scrollbar py-1 scroll-smooth"
        >
          {navigationGroups.filter(g => !lowStressMode || ['hjem', 'skriving', 'profil'].includes(g.id)).map((group) => (
            <button
              key={`top-nav-${group.id}`}
              onClick={() => handleTabClick(group.subTabs[0].id, group.subTabs[0].requiredTier)}
              className={cn(
                "px-2 lg:px-4 py-2 rounded-xl text-[11px] lg:text-sm font-bold transition-all flex items-center gap-1.5 lg:gap-2 whitespace-nowrap shrink-0",
                activeGroup.id === group.id 
                  ? "bg-primary-light text-primary-dark" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <group.icon className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span>{group.label}</span>
              {!checkAccess(group.subTabs[0].requiredTier) && <Lock className="w-3 h-3 opacity-60" />}
            </button>
          ))}
        </nav>
        {canScrollRight && (
          <button 
            onClick={() => scrollNav('right')}
            className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white via-white/80 to-transparent z-10 flex items-center justify-end hover:scale-110 transition-transform"
          >
            <div className="bg-white p-1 rounded-full shadow-md border border-slate-100 mr-1">
              <ChevronRight className="w-4 h-4 text-primary" />
            </div>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 lg:gap-4 shrink-0">
        <button 
          onClick={() => setIsFocusMode(!isFocusMode)}
          className={cn(
            "p-2 rounded-xl transition-all flex items-center gap-2",
            isFocusMode ? "bg-primary text-white" : "bg-slate-50 text-slate-400 hover:text-primary"
          )}
          title="Fokusmodus"
        >
          <Maximize2 className="w-4 h-4 lg:w-5 h-5" />
          <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Fokus</span>
        </button>
      </div>

      <div className="flex items-center gap-2 lg:gap-3 shrink-0">
        {user ? (
          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-900 leading-none">{user.displayName || 'Bruker'}</span>
              <span className="text-[8px] text-slate-400 font-medium leading-none mt-1 truncate max-w-[100px]">{user.email}</span>
            </div>
            <button 
              onClick={() => setActiveTab('profile')}
              className="w-8 h-8 rounded-full bg-primary-light border border-primary/20 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary/20 transition-all"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profil" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="w-4 h-4 text-primary" />
              )}
            </button>
            <button 
              onClick={handleLogout}
              className="hidden sm:flex p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              title="Logg ut"
            >
              <ExternalLink className="w-4 h-4 rotate-180" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 ml-auto">
            <button 
              onClick={() => setShowAuthModal(true)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-primary transition-all"
            >
              Logg inn
            </button>
            <button 
              onClick={() => setShowAuthModal(true)}
              className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
            >
              Opprett konto
            </button>
          </div>
        )}

        <div className="h-8 w-px bg-slate-200 hidden sm:block mx-1"></div>
        
        {/* Pomodoro Widget */}
        {settings.showTimerInHeader && !lowStressMode && (
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
            <Timer className={cn("w-4 h-4", timerIsRunning ? "text-primary animate-pulse" : "text-slate-600")} />
            <span className="text-xs font-mono font-bold text-slate-800">
              {Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2, '0')}
            </span>
            <button 
              onClick={() => setTimerIsRunning(!timerIsRunning)}
              className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider ml-1"
            >
              {timerIsRunning ? 'Pause' : 'Start'}
            </button>
            <div className="w-px h-3 bg-slate-200 mx-1"></div>
            <span className="text-[8px] font-bold text-slate-600 uppercase">{timerMode === 'focus' ? 'Fokus' : 'Pause'}</span>
          </div>
        )}

        {settings.showDeadlineInHeader && daysLeft !== null && !lowStressMode && (
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-primary-light rounded-lg border border-primary-light">
            <Clock className="w-4 h-4 text-primary" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider leading-none">Innlevering</span>
              <span className="text-xs font-black text-primary-dark leading-none mt-0.5">{daysLeft} dager igjen</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest hidden lg:inline">Online</span>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-slate-100 overflow-hidden shadow-xl"
            >
              <div className="p-4 space-y-2">
                {navigationGroups.map((group) => (
                  <button
                    key={`nav-mobile-${group.id}`}
                    onClick={() => {
                      handleTabClick(group.subTabs[0].id, group.subTabs[0].requiredTier);
                      setShowMobileMenu(false);
                    }}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between",
                      activeGroup.id === group.id 
                        ? "bg-primary-light text-primary-dark" 
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <group.icon className="w-5 h-5" />
                      {group.id === 'skriveprosessen' ? (
                        <>
                          <span className="hidden sm:inline">{group.label}</span>
                          <span className="sm:hidden">Skriving</span>
                        </>
                      ) : group.label}
                    </div>
                    {!checkAccess(group.subTabs[0].requiredTier) && <Lock className="w-4 h-4 opacity-40" />}
                  </button>
                ))}
                <div className="pt-4 mt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <button 
                    onClick={clearAllData}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-red-600 bg-red-50 border border-red-100"
                  >
                    Nullstill data
                  </button>
                  <button 
                    onClick={() => window.open('mailto:post@blu-hjelperen.no', '_blank')}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-primary bg-primary-light border border-primary-light"
                  >
                    Support
                  </button>
                </div>
                {user && (
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all"
                  >
                    <LogOut className="w-5 h-5" /> Logg ut av appen
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Sub Nav */}
        {activeGroup.subTabs.length > 1 && (
          <div className="hidden md:block bg-slate-50 border-t border-slate-200">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-2">
              <div className="flex items-center flex-wrap gap-2 md:gap-3">
                {activeGroup.subTabs.map((sub, sIdx) => (
                  <button
                    key={`desktop-sub-${activeGroup.id}-${sub.id}-${sIdx}`}
                    onClick={() => handleTabClick(sub.id, sub.requiredTier)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                      activeTab === sub.id 
                        ? "bg-white text-primary shadow-sm border border-slate-200" 
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    <sub.icon className="w-3.5 h-3.5" />
                    {sub.label}
                    {!checkAccess(sub.requiredTier) && <Lock className="w-3 h-3 opacity-40" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile/Tablet Nav (Fixed Bottom) */}
        <div className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[100] flex overflow-x-auto no-scrollbar shadow-[0_-4px_12px_rgba(0,0,0,0.05)] transition-transform duration-300 ease-in-out",
          (isFocusMode || !showBottomNav) ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
        )}>
          {navigationGroups.map((group) => (
            <button
              key={`sidebar-nav-${group.id}`}
              onClick={() => handleTabClick(group.subTabs[0].id, group.subTabs[0].requiredTier)}
              className={cn(
                "flex-1 flex flex-col items-center py-3 px-4 gap-1 transition-all min-w-[80px] relative",
                activeGroup.id === group.id 
                  ? "text-primary bg-primary-light/10" 
                  : "text-slate-400"
              )}
            >
              <div className="relative">
                <group.icon className="w-5 h-5" />
                {!checkAccess(group.subTabs[0].requiredTier) && (
                  <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                    <Lock className="w-2 h-2 text-slate-400" />
                  </div>
                )}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                {group.label}
              </span>
              {activeGroup.id === group.id && (
                <motion.div layoutId="mobile-nav-indicator" className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Mobile Sub Nav (Fixed above bottom nav) */}
        {activeGroup.subTabs.length > 1 && (
          <div className={cn(
            "md:hidden fixed bottom-[68px] left-0 right-0 bg-slate-50/95 backdrop-blur-sm border-t border-slate-100 z-[90] flex overflow-x-auto whitespace-nowrap gap-3 pb-4 pt-2 px-4 transition-transform duration-300 ease-in-out hide-scrollbar",
            (isFocusMode || !showBottomNav) ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
          )}>
            {activeGroup.subTabs.map((sub, sIdx) => (
              <button
                key={`mobile-sub-${activeGroup.id}-${sub.id}-${sIdx}`}
                onClick={() => handleTabClick(sub.id, sub.requiredTier)}
                className={cn(
                  "flex-shrink-0 px-5 py-2.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-2",
                  activeTab === sub.id 
                    ? "bg-primary text-white shadow-md shadow-primary-light" 
                    : "bg-white text-slate-600 border border-slate-200"
                )}
              >
                <sub.icon className="w-3.5 h-3.5" />
                {sub.label}
                {!checkAccess(sub.requiredTier) && <Lock className="w-3 h-3 opacity-50" />}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary p-2 rounded-xl">
                      <Lock className="text-white w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900">Velkommen</h2>
                  </div>
                  <button onClick={() => setShowAuthModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-slate-500">Logg inn for å lagre din progresjon og få tilgang til dine verktøy på alle enheter.</p>
                  </div>

                  <button 
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:border-primary/20 hover:bg-slate-50 transition-all group"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                    Fortsett med Google
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-100"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">Eller</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">E-post</label>
                      <input 
                        type="email" 
                        placeholder="din@epost.no"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Passord</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                      />
                    </div>
                    <button 
                      onClick={() => alert('E-post innlogging er under utvikling. Vennligst bruk Google for nå.')}
                      className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                    >
                      Logg inn
                    </button>
                  </div>

                  <p className="text-[10px] text-center text-slate-400 leading-relaxed">
                    Ved å logge inn godtar du våre <span className="text-primary hover:underline cursor-pointer">brukervilkår</span> og <span className="text-primary hover:underline cursor-pointer">personvernerklæring</span>.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Milestone Modal */}
      <AnimatePresence>
        {showAddMilestone && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddMilestone(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary p-2 rounded-xl">
                      <Plus className="text-white w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900">Ny milepæl</h2>
                  </div>
                  <button onClick={() => setShowAddMilestone(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Navn på milepæl</label>
                    <input 
                      type="text" 
                      autoFocus
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newMilestoneTitle.trim()) {
                          addMilestone(newMilestoneTitle);
                          setNewMilestoneTitle('');
                        }
                      }}
                      placeholder="F.eks. Levere metodekapittel"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      if (newMilestoneTitle.trim()) {
                        addMilestone(newMilestoneTitle);
                        setNewMilestoneTitle('');
                      }
                    }}
                    disabled={!newMilestoneTitle.trim()}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    Legg til
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Exit Focus Button */}
      <AnimatePresence>
        {isFocusMode && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setIsFocusMode(false)}
            className="fixed top-4 right-4 z-[200] bg-slate-800 text-white p-3 rounded-full shadow-2xl hover:bg-slate-700 transition-all group"
          >
            <Minimize2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Avslutt fokus
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn(
        "flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 pb-[140px] md:pb-8 overflow-hidden flex flex-col transition-all duration-500",
        isFocusMode && "max-w-3xl pt-12"
      )}>
        <AnimatePresence mode="wait">
          {activeTab === 'admin' && (user?.email === 'svein.nordvik@gmail.com' || profile.email === 'svein.nordvik@gmail.com') && (
            <AdminComponent userEmail={user?.email || profile.email || null} />
          )}

          {activeTab === 'home' && (
            <HomeComponent 
              user={user}
              appName={appName}
              setActiveTab={setActiveTab}
              createNewDocument={createNewDocument}
              setShowAuthModal={setShowAuthModal}
              lowStressMode={lowStressMode}
              milestones={milestones}
              updateMilestoneDate={updateMilestoneDate}
              deleteMilestone={deleteMilestone}
              toggleMilestone={toggleMilestone}
              activeTips={activeTips}
              currentTipIndex={currentTipIndex}
              checklist={checklist}
              calculateWordCount={calculateWordCount}
              groupMessages={groupMessages}
              faqData={faqData}
              openFaqIndex={openFaqIndex}
              setOpenFaqIndex={setOpenFaqIndex}
              documents={documents}
              activeDocumentId={activeDocumentId}
              setActiveDocumentId={setActiveDocumentId}
            />
          )}

          {activeTab === 'assistant' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
            >
              <div className="p-2 sm:p-3 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center justify-between sm:justify-start gap-4 overflow-hidden">
                  <div className="flex items-center gap-2 shrink-0">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider">Veiledning:</span>
                  </div>
                  <div className="flex items-center bg-white p-0.5 sm:p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto hide-scrollbar whitespace-nowrap">
                    {[
                      { id: 'supportive', label: 'Støttende', color: 'text-emerald-600' },
                      { id: 'balanced', label: 'Balansert', color: 'text-primary' },
                      { id: 'critical', label: 'Kritisk', color: 'text-red-600' }
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setStrictness(s.id as any)}
                        className={cn(
                          "px-2 sm:px-3 py-1 rounded-md text-[9px] sm:text-[10px] font-bold transition-all shrink-0",
                          strictness === s.id 
                            ? "bg-slate-100 shadow-inner " + s.color
                            : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowTaskSetup(true)}
                    className="p-2 text-slate-400 hover:text-primary hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200"
                    title="Endre oppgaveoppsett"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleClearChat}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200"
                    title="Tøm chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m, i) => (
                  <div key={`msg-${i}`} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm relative group",
                      m.role === 'user' 
                        ? "bg-primary text-white rounded-tr-none" 
                        : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200"
                    )}>
                      <button 
                        onClick={() => copyToClipboard(m.content, `chat-${i}`)}
                        className={cn(
                          "absolute -right-2 -top-2 p-1.5 rounded-lg bg-white border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-50 text-slate-400 hover:text-primary",
                          copiedId === `chat-${i}` && "opacity-100 text-emerald-500 border-emerald-100"
                        )}
                        title="Kopier til utklippstavle"
                      >
                        {copiedId === `chat-${i}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <div className="prose prose-sm max-w-none prose-slate">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-3 border border-slate-200">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Spør om akademisk skriving, kilder eller retningslinjer..."
                    className="w-full bg-white border border-slate-300 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                  <button 
                    onClick={() => handleSendMessage()}
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 p-2 bg-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-center mt-2 text-slate-400">
                  Husk: AI kan gjøre feil. Sjekk alltid offisielle retningslinjer ved ditt studiested.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'collaboration' && (
            <motion.div 
              key="collaboration"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-6"
            >
              {pricingTier !== 'semester' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto my-12">
                  <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center mb-6">
                    <Users className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-4">Samarbeid er en Premium-funksjon</h2>
                  <p className="text-slate-500 mb-8 leading-relaxed">
                    Samarbeid er en del av årsabonnementet. Oppgrader for å skrive sammen med kollokviegruppen din! ✨
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <button 
                      onClick={() => setActiveTab('pricing')}
                      className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-5 h-5" /> Se prisplaner
                    </button>
                    <button 
                      onClick={() => setActiveTab('home')}
                      className="flex-1 bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-100 transition-all"
                    >
                      Tilbake til oversikt
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary-light p-2 rounded-lg">
                          <Users className="text-primary w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Samarbeid i sanntid</h2>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Varslinger:</span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                              className={cn(
                                "w-8 h-4 rounded-full relative transition-all",
                                notificationsEnabled ? "bg-primary" : "bg-slate-300"
                              )}
                            >
                              <div className={cn(
                                "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                                notificationsEnabled ? "right-0.5" : "left-0.5"
                              )} />
                            </button>
                            <button 
                              onClick={() => simulateIncomingGroupMessage('KL', 'Dette er et test-varsel for gruppechaten!', 'emerald')}
                              className="text-[10px] font-bold text-primary hover:underline"
                            >
                              Test
                            </button>
                          </div>
                        </div>
                        <button 
                          onClick={handleCreateGroup}
                          className="w-full sm:w-auto bg-primary text-white px-6 py-3 sm:py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
                        >
                          <Plus className="w-5 h-5 flex-shrink-0" /> <span className="whitespace-nowrap">Opprett gruppe</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">SN</div>
                            <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">KL</div>
                            <div className="w-8 h-8 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">+2</div>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">Bachelor-gruppe 2026</h4>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">4 aktive medlemmer (ID: {groupId})</p>
                          </div>
                        </div>
                        <button className="text-primary text-xs font-bold hover:underline">Åpne</button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" /> Delt notatblokk
                      </h3>
                      <textarea 
                        value={sharedNotes}
                        onChange={(e) => setSharedNotes(e.target.value)}
                        className="w-full h-48 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 resize-none"
                        placeholder="Skriv ned felles ideer, kilder eller notater her..."
                      />
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synkronisert</span>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(sharedNotes, 'shared-notes')}
                          className={cn(
                            "p-1.5 rounded-lg transition-all",
                            copiedId === 'shared-notes' ? "text-emerald-500 bg-emerald-50" : "text-slate-400 hover:text-primary hover:bg-slate-50"
                          )}
                        >
                          {copiedId === 'shared-notes' ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Library className="w-5 h-5 text-primary" /> Delt kildebibliotek
                      </h3>
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {sharedSources.map((source) => (
                          <div key={source.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <BookOpen className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span className="text-xs text-slate-600 truncate">{source.title}</span>
                            </div>
                            <span className="text-[8px] font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-400">{source.user}</span>
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={handleAddSharedSource}
                        className="w-full mt-4 py-2 border border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 hover:border-primary hover:text-primary transition-all"
                      >
                        + Legg til felles kilde
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary" /> Gruppechat
                    </h3>
                    <div className="h-64 bg-slate-50 rounded-2xl p-4 mb-4 overflow-y-auto space-y-4 custom-scrollbar">
                      {groupMessages.map((msg) => (
                        <div key={msg.id} className={cn("flex gap-3", msg.isMe ? "flex-row-reverse" : "flex-row")}>
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0",
                            msg.color === 'emerald' ? "bg-emerald-500" : 
                            msg.color === 'blue' ? "bg-blue-500" : 
                            msg.color === 'amber' ? "bg-amber-500" : "bg-slate-500"
                          )}>
                            {msg.user}
                          </div>
                          <div className={cn(
                            "p-3 rounded-2xl shadow-sm max-w-[80%]",
                            msg.isMe ? "bg-primary text-white rounded-tr-none" : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                          )}>
                            <p className="text-xs">{msg.content}</p>
                            <span className={cn("text-[8px] mt-1 block", msg.isMe ? "text-white/60" : "text-slate-400")}>{msg.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={groupInput}
                        onChange={(e) => setGroupInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendGroupMessage()}
                        placeholder="Skriv en melding..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button 
                        onClick={handleSendGroupMessage}
                        className="bg-primary text-white p-2 rounded-xl hover:bg-primary-hover transition-all"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-primary text-white p-6 rounded-3xl shadow-lg shadow-primary/20">
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                      <Zap className="w-5 h-5" /> Gruppefunksjoner
                    </h3>
                    <p className="text-xs text-white/80 leading-relaxed mb-6">
                      Samarbeid gjør bacheloroppgaven enklere. Del kilder, analyser og fremdrift med dine medstudenter.
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-2 text-xs font-medium">
                        <Check className="w-4 h-4 text-white/60" /> Felles kildebibliotek
                      </li>
                      <li className="flex items-center gap-2 text-xs font-medium">
                        <Check className="w-4 h-4 text-white/60" /> Delt fremdriftsplan
                      </li>
                      <li className="flex items-center gap-2 text-xs font-medium">
                        <Check className="w-4 h-4 text-white/60" /> Kommenter på hverandres tekst
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" /> Gruppemedlemmer
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: 'Svein N.', role: 'Admin', color: 'bg-blue-500' },
                        { name: 'Kristin L.', role: 'Skribent', color: 'bg-emerald-500' },
                        { name: 'Marius T.', role: 'Skribent', color: 'bg-amber-500' },
                        { name: 'Lise H.', role: 'Leser', color: 'bg-purple-500' }
                      ].map((member) => (
                        <div key={member.name} className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 bg-slate-50/50">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[10px] text-white font-bold", member.color)}>
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-slate-700">{member.name}</p>
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider">{member.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" /> Siste aktivitet
                    </h3>
                    <div className="space-y-4">
                      {[
                        { user: 'Kristin L.', action: 'redigerte Metode', time: '2 min siden' },
                        { user: 'Svein N.', action: 'la til ny kilde', time: '15 min siden' },
                        { user: 'Marius T.', action: 'fullførte milepæl', time: '1 time siden' }
                      ].map((act) => (
                        <div key={`${act.user}-${act.action}-${act.time}`} className="flex gap-3 items-start">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          <div>
                            <p className="text-[11px] text-slate-700">
                              <span className="font-bold">{act.user}</span> {act.action}
                            </p>
                            <span className="text-[9px] text-slate-400">{act.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-4">Inviter medstudenter</h3>
                    <div className="space-y-3">
                      <div className="relative">
                        <input 
                          type="text" 
                          readOnly 
                          value={`${window.location.origin}/join/${groupId}`}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-[10px] font-mono text-slate-500"
                        />
                        <button 
                          onClick={() => copyToClipboard(`${window.location.origin}/join/${groupId}`, 'invite-link')}
                          className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all",
                            copiedId === 'invite-link' ? "text-emerald-500 bg-emerald-50" : "text-slate-400 hover:bg-slate-200"
                          )}
                        >
                          {copiedId === 'invite-link' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 text-center">
                        {copiedId === 'invite-link' ? (
                          <span className="text-emerald-500 font-bold animate-pulse">Lenken er kopiert!</span>
                        ) : (
                          "Del denne lenken for å invitere andre til din gruppe."
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

          {activeTab === 'task-start' && (
            <motion.div 
              key="task-start"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-6"
            >
              <div className="space-y-6">
                {/* 1. Definer din oppgave */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary-light p-2 rounded-lg">
                        <Plus className="text-primary w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg">Definer din oppgave</h2>
                        <p className="text-sm text-slate-500">Legg inn instruksene dine eller last opp oppgaveteksten (PDF/Bilde).</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className={cn(
                        "cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                        isLoading ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      )}>
                        {isLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyserer...
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" /> Last opp oppgave (PDF/Bilde)
                          </>
                        )}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".pdf,image/*" 
                          onChange={handleUploadAssignment} 
                          disabled={isLoading}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Oppgavetekst / Instrukser</label>
                      <button 
                        onClick={() => insertFromChat((val) => setTaskSetup({...taskSetup, instructions: val}))}
                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" /> Hent fra chat
                      </button>
                    </div>
                    <textarea 
                      value={taskSetup.instructions}
                      onChange={(e) => setTaskSetup({...taskSetup, instructions: e.target.value})}
                      placeholder="Lim inn oppgaveteksten her..."
                      className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
                    />
                  </div>
                </div>

                {/* 2. Velg akademisk mal */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" /> Velg akademisk mal
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {assignmentTemplates.map((template, tIdx) => (
                      <button
                        key={`template-${template.id}-${tIdx}`}
                        onClick={() => {
                          applyTemplate(template.id);
                        }}
                        className={cn(
                          "p-4 border-2 rounded-2xl text-sm font-bold transition-all text-left flex flex-col gap-2",
                          selectedTemplateId === template.id 
                            ? "bg-primary-light border-primary text-primary-dark shadow-md" 
                            : "bg-white border-slate-100 text-slate-700 hover:border-primary/50 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          {template.title}
                          {template.id === 'egendefinert' ? <Plus className="w-4 h-4 text-slate-400" /> : <FileText className="w-4 h-4 text-slate-400" />}
                        </div>
                        <span className="text-xs font-medium text-slate-400 leading-relaxed">
                          {template.description || 'Klikk for å bruke struktur'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Rammer for oppgaven */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-slate-400" /> Rammer for oppgaven
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Omfang (ord/sider)</label>
                      <input 
                        type="text"
                        value={taskSetup.scope}
                        onChange={(e) => setTaskSetup({...taskSetup, scope: e.target.value})}
                        placeholder="F.eks: 1500 ord"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                      />
                    </div>
                    {/* Sjangerkrav removed as requested */}

                    {/* Nye felt for nasjonale standarder */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Arbeidsform</label>
                      <div className="flex items-center gap-4 p-1 bg-slate-50 border border-slate-200 rounded-xl">
                        <button 
                          onClick={() => setIsGroupWork(false)}
                          className={cn(
                            "flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all",
                            !isGroupWork ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          Alene
                        </button>
                        <button 
                          onClick={() => setIsGroupWork(true)}
                          className={cn(
                            "flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all",
                            isGroupWork ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          I gruppe
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selvvalgt litteratur (sider)</label>
                      <input 
                        type="text"
                        value={selfSelectedLitPages}
                        onChange={(e) => setSelfSelectedLitPages(e.target.value)}
                        placeholder="F.eks: 300 sider"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Din disposisjon */}
                {outline.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-4 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-100"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary-light p-2 rounded-xl">
                          <ListTree className="text-primary w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="font-bold text-lg text-slate-900 leading-tight">Din disposisjon</h2>
                          <p className="text-xs sm:text-sm text-slate-500 mt-1">Strukturen for ditt skriveverksted.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('writing-workshop')}
                        className="w-full sm:w-auto bg-cta text-white px-4 py-3 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:bg-cta-hover transition-all shadow-lg shadow-cta/20"
                      >
                        Gå til skriveverkstedet <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {outline.map((chapter, cIndex) => (
                        <div key={chapter.id} className="border border-slate-100 rounded-xl overflow-hidden">
                          <div className="bg-slate-50/50 p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-slate-300">{cIndex + 1}</span>
                              <span className="font-bold text-slate-700 text-sm">{chapter.title}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => addSubchapter(chapter.id)} className="p-1 text-slate-400 hover:text-emerald-600 transition-all"><Plus className="w-4 h-4" /></button>
                              <button onClick={() => deleteChapter(chapter.id)} className="p-1 text-slate-400 hover:text-red-600 transition-all"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                          {chapter.subchapters.length > 0 && (
                            <div className="p-2 pl-10 space-y-1 bg-white">
                              {chapter.subchapters.map((sub, sIndex) => (
                                <div key={sub.id} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                                  <span className="text-xs text-slate-500">{cIndex + 1}.{sIndex + 1} {sub.title}</span>
                                  <button onClick={() => deleteSubchapter(chapter.id, sub.id)} className="p-1 text-slate-300 hover:text-red-600 transition-all"><X className="w-3 h-3" /></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      <button 
                        onClick={addChapter}
                        className="w-full py-3 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-xs font-bold flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-all"
                      >
                        <Plus className="w-4 h-4" /> Legg til kapittel
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'writing-workshop' && (
            <motion.div 
              key="writing-workshop"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-6"
            >
              {!activeDocumentId ? (
                <DocumentManager 
                  pricingTier={pricingTier}
                  documents={documents}
                  folders={folders}
                  setFolders={setFolders}
                  activeDocumentId={activeDocumentId}
                  setActiveDocumentId={setActiveDocumentId}
                  setActiveTab={setActiveTab}
                  createNewDocument={createNewDocument}
                  setShowPaywall={setShowPaywall}
                  deleteDocument={deleteDocument}
                  renameDocument={renameDocument}
                />
              ) : (
                <>
                  {/* Header */}
                  <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 pb-6 border-b border-slate-100", isFullscreen && "px-8 pt-8")}>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setActiveDocumentId(null)}
                        className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
                        title="Tilbake til arkiv"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <div className="bg-primary-light p-3 rounded-2xl">
                        <FileEdit className="text-primary w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-900">
                          Arbeidsdokument: {activeDocument?.title || "Uten tittel"}
                        </h2>
                        <p className="text-sm text-slate-500">Skriv og organiser din akademiske tekst</p>
                      </div>
                    </div>

                      <div className="flex items-center gap-3">
                        {/* Ordteller */}
                        <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Fremdrift</span>
                            <span className="text-sm font-bold text-primary">{calculateWordCount()} ord</span>
                          </div>
                          {wordCountGoal > 0 && (
                            <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all duration-500"
                                style={{ width: `${Math.min(100, (calculateWordCount() / wordCountGoal) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Eksport */}
                        <div className="relative group">
                          <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary-light">
                            <Download className="w-4 h-4" /> Eksporter
                          </button>
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2">
                            <button onClick={exportToWord} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-sm text-slate-700 transition-colors">
                              <FileDown className="w-4 h-4 text-blue-600" /> Word (.docx)
                            </button>
                            {(pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview') && (
                              <button onClick={exportToWord} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-emerald-50 rounded-lg text-sm text-emerald-700 transition-colors">
                                <Sparkles className="w-4 h-4 text-emerald-500" /> Magi-eksport (APA 7)
                              </button>
                            )}
                            <button onClick={exportToPdf} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-sm text-slate-700 transition-colors">
                              <FileText className="w-4 h-4 text-red-600" /> PDF (.pdf)
                            </button>
                          </div>
                        </div>

                        <button 
                          onClick={() => setIsFullscreen(!isFullscreen)}
                          className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
                        >
                          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Disposisjon / Navigasjon */}
                    <div className={cn("mb-8", isFullscreen && "px-8")}>
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <ListTree className="w-3 h-3" /> Disposisjon (Trykk på et punkt for å begynne å skrive)
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {outline.map((chapter, idx) => (
                            <button 
                              key={chapter.id}
                              onClick={() => {
                                const el = document.getElementById(`editor-${chapter.id}`);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }}
                              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-primary hover:text-primary hover:shadow-sm transition-all"
                            >
                              {idx + 1}. {chapter.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Editor Area */}
                    <div className={cn("flex-1 overflow-y-auto custom-scrollbar", isFullscreen ? "px-8 pb-8" : "max-h-[60vh] pr-2")}>
                      {outline.length > 0 ? (
                        <div className="space-y-12">
                          {outline.map((chapter, idx) => (
                            <div key={chapter.id} id={`editor-${chapter.id}`} className="space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                                  <span className="bg-slate-100 text-slate-400 w-8 h-8 rounded-lg flex items-center justify-center text-sm">{idx + 1}</span>
                                  {chapter.title}
                                </h3>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                                  {((bachelorDocument[chapter.id] || '').trim().split(/\s+/).filter(w => w.length > 0).length)} ord
                                </span>
                              </div>
                              <textarea 
                                value={bachelorDocument[chapter.id] || ''}
                                onChange={(e) => setBachelorDocument(prev => ({ ...prev, [chapter.id]: e.target.value }))}
                                placeholder={`Skriv om ${chapter.title.toLowerCase()} her...`}
                                className="w-full min-h-[250px] bg-slate-50/30 border border-slate-200 rounded-2xl p-6 text-sm leading-relaxed focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all resize-y"
                              />
                              
                              {chapter.subchapters.map((sub, sIdx) => (
                                <div key={sub.id} id={`editor-${sub.id}`} className="ml-12 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                      <span className="text-slate-300 text-xs">{idx + 1}.{sIdx + 1}</span>
                                      {sub.title}
                                    </h4>
                                    <span className="text-[10px] font-bold text-slate-400">
                                      {((bachelorDocument[sub.id] || '').trim().split(/\s+/).filter(w => w.length > 0).length)} ord
                                    </span>
                                  </div>
                                  <textarea 
                                    value={bachelorDocument[sub.id] || ''}
                                    onChange={(e) => setBachelorDocument(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                    placeholder={`Skriv om ${sub.title.toLowerCase()} her...`}
                                    className="w-full min-h-[150px] bg-white border border-slate-200 rounded-2xl p-5 text-sm leading-relaxed focus:ring-2 focus:ring-primary outline-none transition-all resize-y"
                                  />
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="bg-slate-50 p-8 rounded-full mb-6">
                            <FileEdit className="w-12 h-12 text-slate-300" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 mb-2">Ingen struktur er klar</h3>
                          <p className="text-sm text-slate-500 max-w-xs mb-8">
                            Gå tilbake til "Oppgavestart" for å velge en mal eller sette opp din egen disposisjon.
                          </p>
                          <button 
                            onClick={() => setActiveTab('task-start')}
                            className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary-light"
                          >
                            Gå til Oppgavestart
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}

                {activeTab === 'polishing' && (
                  <motion.div 
                    key="polishing"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1 flex flex-col gap-6"
                  >
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-lg">
                          <Sparkles className="text-amber-600 w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="font-bold text-lg">Strukturanalyse</h2>
                          <p className="text-sm text-slate-500">Faglig dypdykk: Lim inn din problemstilling eller disposisjon for en dyp akademisk vurdering.</p>
                          <HelpSection 
                            title="Finpuss & Analyse" 
                            content="Finpuss er fasen der du ser over helheten. Bruk sjekklistene for å sikre at du har svart på oppgaven, har korrekt kildebruk og et godt akademisk språk." 
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => insertFromChat(setStructureInput)}
                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" /> Hent fra chat
                      </button>
                    </div>
                    <textarea 
                      value={structureInput}
                      onChange={(e) => setStructureInput(e.target.value)}
                      placeholder="Eksempel: Jeg vil skrive om barns medvirkning..."
                      className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                    />
                    <button 
                      onClick={handleAnalyzeStructure}
                      disabled={!structureInput.trim() || isAnalyzingStructure}
                      className={cn(
                        "mt-4 w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50",
                        isAnalyzingStructure ? "bg-slate-100 text-slate-400" : "bg-cta text-white hover:bg-cta-hover shadow-lg shadow-cta/20"
                      )}
                    >
                      {isAnalyzingStructure ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Analyserer struktur...</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Analyser med Gemini Pro</>
                      )}
                    </button>

                    <AnimatePresence>
                      {structureAnalysisSuccess && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-emerald-700 text-xs font-bold"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Analysen er klar! Se resultatet under.
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {structureResult && (
                      <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 prose prose-sm max-w-none">
                        <ReactMarkdown>{structureResult}</ReactMarkdown>
                      </div>
                    )}

                    {/* Vurderingskriterier Sjekkliste */}
                    <div className="mt-12 pt-12 border-t border-slate-100">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="bg-emerald-100 p-2 rounded-lg">
                          <CheckSquare className="text-emerald-600 w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="font-bold text-lg">Kvalitetssikring</h2>
                          <p className="text-sm text-slate-500">Sjekk oppgaven din mot både faglige krav og spesifikke kriterier.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Section A: Faglige krav */}
                        <div className="space-y-6">
                          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6">
                            <div className="mb-6 p-4 bg-white border border-emerald-100 rounded-xl flex items-start gap-3 shadow-sm">
                              <div className="bg-amber-100 p-2 rounded-lg shrink-0">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                              </div>
                              <div className="text-xs">
                                <p className="font-bold text-slate-900 mb-1">⚠️ Husk DMMHs retningslinjer for bruk av KI</p>
                                <p className="text-slate-500 leading-relaxed mb-2">Vær åpen om bruk av KI-verktøy og sørg for at alt arbeid er ditt eget.</p>
                                <a 
                                  href="https://www.dmmh.no/bibliotek/skrive-og-referere/kunstig-intelligens-i-utdanning" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary font-bold hover:underline flex items-center gap-1"
                                >
                                  Les retningslinjene her <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                                <Scale className="w-4 h-4" /> A. Faglige krav (Standard)
                              </h3>
                              <button 
                                onClick={handleAiChecklist}
                                disabled={isAiChecking || !getAllDocumentText().trim()}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-cta text-white rounded-lg text-[10px] font-bold hover:bg-cta-hover transition-all disabled:opacity-50 shadow-sm"
                              >
                                {isAiChecking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                Sjekk med AI
                              </button>
                            </div>
                            <div className="space-y-3">
                              {standardCriteria.map((item) => (
                                <div 
                                  key={item.id} 
                                  onClick={() => toggleStandardCriteria(item.id)}
                                  className={cn(
                                    "flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer",
                                    item.checked ? "bg-emerald-100/50 text-emerald-800" : "bg-white border border-emerald-100/50 text-slate-600 hover:border-emerald-300"
                                  )}
                                >
                                  <div className={cn(
                                    "mt-0.5 w-5 h-5 sm:w-4 sm:h-4 rounded border flex items-center justify-center transition-all shrink-0",
                                    item.checked ? "bg-emerald-600 border-emerald-600 text-white" : "border-emerald-200 bg-white"
                                  )}>
                                    {item.checked && <Check className="w-3 h-3" />}
                                  </div>
                                  <p className={cn("text-xs sm:text-sm font-bold leading-relaxed", item.checked && "line-through opacity-60")}>{item.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Section B: Kriterier fra oppgaveteksten */}
                        <div className="space-y-6">
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                              <FileText className="w-4 h-4" /> B. Kriterier fra oppgaveteksten
                            </h3>
                            
                            <div className="space-y-4">
                              <textarea 
                                value={assessmentCriteriaRaw}
                                onChange={(e) => setAssessmentCriteriaRaw(e.target.value)}
                                placeholder="Lim inn kriterier fra læreren her (én linje per punkt)..."
                                className="w-full h-32 bg-white border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                              />
                              <button 
                                onClick={handleUpdateCriteria}
                                className="w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
                              >
                                <RefreshCw className="w-3 h-3" /> Oppdater liste
                              </button>
                            </div>

                            <div className="mt-6 space-y-2">
                              {assessmentCriteriaList.length > 0 ? (
                                assessmentCriteriaList.map((item) => (
                                  <div 
                                    key={item.id} 
                                    onClick={() => toggleCriteria(item.id)}
                                    className={cn(
                                      "flex items-start gap-3 p-2.5 rounded-lg transition-all cursor-pointer",
                                      item.checked ? "bg-slate-200/50 text-slate-500" : "bg-white border border-slate-100 text-slate-600"
                                    )}
                                  >
                                    <div className={cn(
                                      "mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center transition-all",
                                      item.checked ? "bg-slate-500 border-slate-500 text-white" : "border-slate-300 bg-white"
                                    )}>
                                      {item.checked && <Check className="w-2.5 h-2.5" />}
                                    </div>
                                    <p className={cn("text-[11px] font-medium", item.checked && "line-through opacity-60")}>{item.text}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[10px] text-slate-400 italic text-center py-4">Ingen egne kriterier lagt til ennå.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}


          {activeTab === 'sensor' && (
            <motion.div 
              key="sensor"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-6"
            >
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <Scale className="text-red-600 w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Sensorverktøyet</h2>
                    <p className="text-sm text-slate-500">Få hjelp til å vurdere din oppgave eller forstå sensors tilbakemelding.</p>
                    <HelpSection 
                      title="Sensor" 
                      content="Dette verktøyet simulerer en sensor som vurderer teksten din opp mot vanlige vurderingskriterier. Bruk tilbakemeldingene til å forbedre oppgaven før endelig innlevering." 
                    />
                  </div>
                </div>

                <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                  <button 
                    onClick={() => { setSensorOption('evaluation'); setIsDevilAdvocate(false); }}
                    className={cn(
                      "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all",
                      sensorOption === 'evaluation' && !isDevilAdvocate ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Fiktiv vurdering
                  </button>
                  <button 
                    onClick={() => { setSensorOption('evaluation'); setIsDevilAdvocate(true); }}
                    className={cn(
                      "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
                      isDevilAdvocate ? "bg-red-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <AlertTriangle className="w-4 h-4" /> Djevelens advokat
                  </button>
                  <button 
                    onClick={() => { setSensorOption('feedback'); setIsDevilAdvocate(false); }}
                    className={cn(
                      "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all",
                      sensorOption === 'feedback' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Hjelp med tilbakemelding
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">1. Last opp PDF eller lim inn tekst</label>
                      <div className="flex p-0.5 bg-slate-100 rounded-lg">
                        <button 
                          onClick={() => setSensorUploadMode('text')}
                          className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", sensorUploadMode === 'text' ? "bg-white shadow-sm text-slate-900" : "text-slate-500")}
                        >
                          Tekst
                        </button>
                        <button 
                          onClick={() => setSensorUploadMode('file')}
                          className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", sensorUploadMode === 'file' ? "bg-white shadow-sm text-slate-900" : "text-slate-500")}
                        >
                          PDF
                        </button>
                      </div>
                    </div>

                    {sensorUploadMode === 'text' ? (
                      <textarea 
                        value={sensorInput}
                        onChange={(e) => {
                          setSensorInput(e.target.value);
                          localStorage.setItem('dmmh_sensor_input', e.target.value);
                        }}
                        placeholder="Lim inn teksten du vil at sensoren skal vurdere her..."
                        className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                      />
                    ) : (
                      <label className={cn(
                        "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all group",
                        sensorFile ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      )}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {sensorFile ? (
                            <>
                              <FileCheck className="w-8 h-8 text-emerald-500 mb-2" />
                              <p className="text-sm text-emerald-700 font-medium">{sensorFile.name} ({formatBytes(sensorFile.size)})</p>
                              <p className="text-[10px] text-emerald-600 mt-1">Klikk for å bytte fil</p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors mb-2" />
                              <p className="text-sm text-slate-500 font-medium">Last opp PDF for analyse</p>
                              <p className="text-[10px] text-slate-400 mt-1">Dra og slipp eller klikk for å velge fil</p>
                            </>
                          )}
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".pdf"
                          onChange={(e) => setSensorFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    )}
                  </div>

                  {sensorOption === 'feedback' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2"
                    >
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">2. Lim inn sensors tilbakemelding</label>
                      <textarea 
                        value={teacherFeedback}
                        onChange={(e) => setTeacherFeedback(e.target.value)}
                        placeholder="Lim inn tilbakemeldingen du har fått fra din veileder eller sensor her..."
                        className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                      />
                    </motion.div>
                  )}

                  <button 
                    onClick={handleAnalyze}
                    disabled={(sensorUploadMode === 'file' && !sensorFile) || (sensorUploadMode === 'text' && !sensorInput.trim()) || (sensorOption === 'feedback' && !teacherFeedback.trim()) || isEvaluating}
                    className={cn(
                      "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg",
                      isEvaluating ? "bg-slate-100 text-slate-400" : "bg-red-600 text-white hover:bg-red-700 shadow-red-100"
                    )}
                  >
                    {isEvaluating ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Analyserer...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Analyser med Gemini Pro</>
                    )}
                  </button>
                </div>
              </div>

                {/* Empty State for Sensor */}
                {!evaluationResult && !isEvaluating && (
                  <div className="mt-12 py-12 text-center space-y-4 border-2 border-dashed border-slate-100 rounded-[2rem]">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8 text-slate-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Ingen analyse ennå</h4>
                      <p className="text-sm text-slate-500 max-w-xs mx-auto">Last opp en PDF eller lim inn tekst for å starte en fiktiv vurdering av din oppgave.</p>
                    </div>
                  </div>
                )}
              
              {evaluationResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  {sensorOption === 'evaluation' ? (
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary-light p-2 rounded-lg">
                            <Sparkles className="text-primary w-5 h-5" />
                          </div>
                          <h3 className="font-bold text-lg text-slate-900">Fiktiv vurdering fra sensor</h3>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(evaluationResult as string, 'sensor-result')}
                          className={cn(
                            "p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all flex items-center gap-2 text-xs font-bold",
                            copiedId === 'sensor-result' && "text-emerald-500 border-emerald-100 bg-emerald-50"
                          )}
                        >
                          {copiedId === 'sensor-result' ? <><Check className="w-4 h-4" /> Kopiert!</> : <><Copy className="w-4 h-4" /> Kopier svar</>}
                        </button>
                      </div>
                      
                      <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
                        <ReactMarkdown>{evaluationResult as string}</ReactMarkdown>
                      </div>
                      
                        

                      <div className="mt-8 bg-blue-50 p-5 rounded-2xl border border-blue-100 flex items-start gap-4">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Info className="w-5 h-5 text-blue-600 shrink-0" />
                        </div>
                        <p className="text-xs text-blue-800 leading-relaxed">
                          <strong>Viktig:</strong> Denne sensuren er generert av en AI og er kun veiledende. Den faktiske karakteren settes av dine sensorer ved ditt studiested. Bruk denne tilbakemeldingen til å forbedre oppgaven før endelig innlevering.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary-light p-2 rounded-lg">
                            <Sparkles className="text-primary w-5 h-5" />
                          </div>
                          <h3 className="font-bold text-lg text-slate-900">Veiledning basert på tilbakemelding</h3>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(evaluationResult as string, 'sensor-result')}
                          className={cn(
                            "p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all flex items-center gap-2 text-xs font-bold",
                            copiedId === 'sensor-result' && "text-emerald-500 border-emerald-100 bg-emerald-50"
                          )}
                        >
                          {copiedId === 'sensor-result' ? <><Check className="w-4 h-4" /> Kopiert!</> : <><Copy className="w-4 h-4" /> Kopier svar</>}
                        </button>
                      </div>
                      <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
                        <ReactMarkdown>{evaluationResult as string}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Dyp plagiat- og KI-sjekk (Eksklusivt Årsabonnement) */}
              <div className={cn(
                "mt-8 p-8 rounded-3xl border-2 transition-all",
                (pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview')
                  ? "bg-white border-primary/20 shadow-sm" 
                  : "bg-slate-50 border-slate-200 opacity-80"
              )}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", (pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview') ? "bg-primary-light" : "bg-slate-200")}>
                      <ShieldCheck className={cn("w-5 h-5", (pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview') ? "text-primary" : "text-slate-400")} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Dyp plagiat- og KI-sjekk</h3>
                      <p className="text-sm text-slate-500">Analyser teksten for språklig integritet og potensielle "røde flagg".</p>
                    </div>
                  </div>
                  {(pricingTier !== 'semester' && pricingTier !== 'yearly' && pricingTier !== 'preview') && (
                    <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Kun Årsabonnement
                    </span>
                  )}
                </div>

                {!(pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview') ? (
                  <button 
                    onClick={() => setActiveTab('pricing')}
                    className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5 text-primary" /> Oppgrader for dyp plagiat-sjekk
                  </button>
                ) : (
                  <div className="space-y-6">
                    {plagiarismError && (
                      <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-2xl flex items-center gap-3 animate-shake">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        {plagiarismError}
                      </div>
                    )}

                    {!plagiarismResult && !isCheckingPlagiarism ? (
                      <button 
                        onClick={handlePlagiarismCheck}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary-hover shadow-lg shadow-primary-light transition-all flex items-center justify-center gap-2"
                      >
                        <ShieldCheck className="w-5 h-5" /> Kjør integritetssjekk nå
                      </button>
                    ) : isCheckingPlagiarism ? (
                      <div className="py-12 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-sm font-bold text-primary animate-pulse uppercase tracking-[0.2em]">Analyserer tekstens integritet...</p>
                        <button 
                          disabled
                          className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black transition-all flex items-center justify-center gap-2"
                        >
                          <Loader2 className="w-5 h-5 animate-spin" /> Analyserer tekst...
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                          <ReactMarkdown>{plagiarismResult}</ReactMarkdown>
                        </div>
                        <button 
                          onClick={() => {
                            setPlagiarismResult('');
                            setPlagiarismError(null);
                          }}
                          className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-[0.2em] transition-colors"
                        >
                          Kjør ny sjekk
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {showCancelModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center"
              >
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Avslutte abonnement?</h3>
                <p className="text-sm text-slate-500 mb-8">
                  Er du sikker på at du vil avslutte ditt abonnement? Du vil beholde tilgangen ut inneværende periode, men mister premium-fordelene ved neste fornyelse.
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={confirmCancelSubscription}
                    className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all"
                  >
                    Ja, avslutt abonnement
                  </button>
                  <button 
                    onClick={() => setShowCancelModal(false)}
                    className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Behold abonnement
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <motion.div 
              key="pricing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col gap-8 max-w-5xl mx-auto py-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-black text-slate-900">Oppgrader din studie-assistent</h2>
                <p className="text-slate-500 max-w-2xl mx-auto">Få tilgang til ubegrenset antall genereringer, dypere analyser og eksklusive ressurser.</p>
              </div>

              {/* Dine Milepæler */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Dine Milepæler</h2>
                    <p className="text-sm text-slate-500">Hold oversikt over viktige frister og fremdrift i studiene.</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frist førsteutkast</label>
                      <input 
                        type="date" 
                        value={draftDeadline}
                        onChange={(e) => setDraftDeadline(e.target.value)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Endelig frist</label>
                      <input 
                        type="date" 
                        value={finalDeadline}
                        onChange={(e) => setFinalDeadline(e.target.value)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="flex items-center gap-2 bg-primary-light px-4 py-2 rounded-2xl border border-primary-light self-end">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-primary">
                        {(() => {
                          const d1 = getDaysLeft(draftDeadline);
                          const d2 = getDaysLeft(finalDeadline);
                          const validDays = [d1, d2].filter(d => d !== null && d >= 0) as number[];
                          if (validDays.length === 0) return 'Ingen frister satt';
                          const minDays = Math.min(...validDays);
                          return `${minDays} dager til neste frist`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {progress.map((item) => (
                    <div key={item.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between gap-4 group hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                          item.status === 'completed' ? "bg-emerald-100 text-emerald-600" : "bg-white text-slate-300 border border-slate-100"
                        )}>
                          {item.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2 h-2 bg-current rounded-full" />}
                        </div>
                        <span className="text-sm font-bold text-slate-700">{item.title}</span>
                      </div>
                      <button 
                        onClick={() => setProgress(progress.map(p => p.id === item.id ? {...p, status: p.status === 'completed' ? 'not-started' : 'completed'} : p))}
                        className={cn(
                          "w-full py-2 rounded-lg text-[10px] font-bold transition-all",
                          item.status === 'completed' ? "bg-slate-100 text-slate-500 hover:bg-slate-200" : "bg-primary text-white hover:bg-primary-hover shadow-sm"
                        )}
                      >
                        {item.status === 'completed' ? 'Angre' : 'Marker som fullført'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {pricingModels.filter(p => !p.hidden).map((plan, planIdx) => (
                  <div 
                    key={`plan-${plan.id}-${planIdx}`}
                    className={cn(
                      "relative bg-white rounded-3xl p-8 border-2 transition-all flex flex-col",
                      pricingTier === plan.id 
                        ? "border-primary shadow-xl shadow-primary/10 scale-105 z-10" 
                        : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        Mest populær
                      </div>
                    )}
                    
                    <div className="mb-8">
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                        <span className="text-slate-400 text-sm font-medium">{plan.period}</span>
                      </div>
                    </div>

                    <ul className="space-y-4 mb-10 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button 
                      onClick={() => handleCheckout(plan)}
                      disabled={pricingTier === plan.id}
                      className={cn(
                        "w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2",
                        pricingTier === plan.id
                          ? "bg-emerald-100 text-emerald-700 cursor-default"
                          : "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-[0.98]"
                      )}
                    >
                      {pricingTier === plan.id ? (
                        <>
                          <Check className="w-4 h-4" />
                          Aktivt abonnement
                        </>
                      ) : (
                        plan.id === 'free' ? 'Gjeldende plan' : 
                        plan.id === 'monthly' ? 'Velg Måned' : 
                        plan.id === 'semester' ? 'Velg År' : 'Oppgrader nå'
                      )}
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 text-center space-y-6">
                <p className="text-sm text-slate-500">Alle priser er inkl. mva. Ingen bindingstid. Abonnementet fornyes automatisk til det sies opp.</p>
                
                {pricingTier !== 'free' && (
                  <div className="flex flex-col items-center gap-4 pt-4 border-t border-slate-200">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Administrer ditt abonnement</p>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setActiveTab('pricing')} 
                        className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                      >
                        Endre abonnementstype
                      </button>
                      <button 
                        onClick={handleCancelSubscription}
                        className="px-6 py-2 bg-red-600 border border-red-700 rounded-xl text-xs font-bold text-white hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                      >
                        AVSLUTT ABONNEMENT
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-6 opacity-40 grayscale">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" referrerPolicy="no-referrer" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" referrerPolicy="no-referrer" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-5" referrerPolicy="no-referrer" />
                </div>
              </div>
            </motion.div>
          )}


          {activeTab === 'literature-ref' && (
            <motion.div 
              key="literature-ref"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-6"
            >
              <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-2 no-scrollbar">
                {[
                  { id: 'literature', label: 'Litteraturforslag', icon: Library },
                  { id: 'apa', label: 'APA 7 Generator', icon: Quote },
                  { id: 'citations', label: 'Sitat-hvelv', icon: Lock }
                ].map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setLiteratureSubTab(sub.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                      literatureSubTab === sub.id 
                        ? "bg-primary text-white shadow-md shadow-primary-light" 
                        : "bg-white text-slate-500 border border-slate-200 hover:border-primary/30"
                    )}
                  >
                    <sub.icon className="w-4 h-4" />
                    {sub.label}
                  </button>
                ))}
              </div>

              {literatureSubTab === 'literature' && (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-primary-light p-3 rounded-2xl">
                      <Library className="text-primary w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Litteraturforslag</h2>
                      <p className="text-slate-500">Få forslag til relevant pensum og faglitteratur.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-primary-light p-6 rounded-2xl border border-primary-light">
                      <h3 className="font-bold text-primary-dark mb-2 flex items-center gap-2">
                        <Info className="w-5 h-5" /> Slik fungerer det
                      </h3>
                      <p className="text-sm text-primary-dark leading-relaxed">
                        Assistenten bruker informasjonen fra din <strong>profil</strong> (studieprogram, modell og emner) for å søke i relevante pensumlister.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Hva handler oppgaven din om?</label>
                      <textarea 
                        value={literatureTopic}
                        onChange={(e) => setLiteratureTopic(e.target.value)}
                        placeholder="Beskriv temaet ditt eller lim inn problemstillingen din her..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all min-h-[120px] resize-none"
                      />
                    </div>

                    <button 
                      onClick={handleGetLiterature}
                      disabled={isLiteratureLoading || !literatureTopic.trim()}
                      className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary-hover transition-all shadow-md shadow-primary-light disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                      {isLiteratureLoading ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Søker...</>
                      ) : (
                        <><Search className="w-5 h-5" /> Hent litteraturforslag</>
                      )}
                    </button>

                    {literatureError && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-red-800">Noe gikk galt</p>
                          <p className="text-xs text-red-700 mt-1">{literatureError}</p>
                        </div>
                      </div>
                    )}

                    {literatureResult && !isLiteratureLoading && (
                      <div className="mt-8 p-8 bg-slate-50 rounded-3xl border border-slate-200 relative group">
                        <button 
                          onClick={() => copyToClipboard(literatureResult, 'lit-res')}
                          className="absolute top-4 right-4 p-2 bg-white rounded-xl shadow-sm border border-slate-200 opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-50"
                        >
                          {copiedId === 'lit-res' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                        </button>
                        <div className="prose prose-slate max-w-none">
                          <ReactMarkdown>{literatureResult}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {literatureSubTab === 'apa' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-primary-light rounded-lg">
                        <Quote className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-lg font-bold text-slate-900">Referanse-generator</h2>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kildetype</label>
                        <select 
                          value={apaGenerator.type}
                          onChange={(e) => setApaGenerator({...apaGenerator, type: e.target.value})}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                        >
                          <optgroup label="GRUNNPAKKE">
                            <option value="book">Bok</option>
                            <option value="article">Vitenskapelig artikkel</option>
                            <option value="web">Nettside</option>
                          </optgroup>
                          <optgroup label="PREMIUM (Årsabonnement/VIP)">
                            <option value="edited_book">{(pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview') ? '' : '🔒 '}Bok (Redigert/Kapittel)</option>
                            <option value="public_doc">{(pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview') ? '' : '🔒 '}Offentlig dokument (NOU, Meld. St.)</option>
                            <option value="law">{(pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview') ? '' : '🔒 '}Lov og forskrift</option>
                            <option value="report">{(pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview') ? '' : '🔒 '}Rapport</option>
                            <option value="news">{(pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview') ? '' : '🔒 '}Avisartikkel</option>
                            <option value="thesis">{(pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview') ? '' : '🔒 '}Bachelor-/Masteroppgave</option>
                            <option value="podcast">{(pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview') ? '' : '🔒 '}Podcast / Lydopptak</option>
                            <option value="video">{(pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview') ? '' : '🔒 '}Video (YouTube o.l.)</option>
                          </optgroup>
                        </select>
                      </div>

                      {((apaGenerator.type !== 'book' && apaGenerator.type !== 'article' && apaGenerator.type !== 'web') && 
                        !(pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview')) ? (
                        <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl text-center">
                          <Lock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                          <h3 className="font-bold text-amber-900 mb-1">Premium-kilde</h3>
                          <p className="text-xs text-amber-700 mb-4">Oppgrader til Årsabonnement for å låse opp alle kildetyper fra Kildekompasset.</p>
                          <button 
                            onClick={() => setActiveTab('pricing')}
                            className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-all shadow-sm"
                          >
                            Se priser
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <input 
                              type="text"
                              placeholder="Etternavn, F. M."
                              value={apaGenerator.author}
                              onChange={(e) => setApaGenerator({...apaGenerator, author: e.target.value})}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                            />
                            <input 
                              type="text"
                              placeholder="Årstall"
                              value={apaGenerator.year}
                              onChange={(e) => setApaGenerator({...apaGenerator, year: e.target.value})}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                            />
                          </div>
                          <input 
                            type="text"
                            placeholder={apaGenerator.type === 'article' ? 'Artikkeltittel' : 'Tittel'}
                            value={apaGenerator.title}
                            onChange={(e) => setApaGenerator({...apaGenerator, title: e.target.value})}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                          />
                          {(apaGenerator.type === 'article' || apaGenerator.type === 'news') && (
                            <input 
                              type="text"
                              placeholder={apaGenerator.type === 'article' ? 'Tidsskrift' : 'Avis'}
                              value={apaGenerator.journal}
                              onChange={(e) => setApaGenerator({...apaGenerator, journal: e.target.value})}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                            />
                          )}
                          {(apaGenerator.type === 'book' || apaGenerator.type === 'edited_book' || apaGenerator.type === 'report') && (
                            <input 
                              type="text"
                              placeholder="Forlag / Utgiver"
                              value={apaGenerator.publisher}
                              onChange={(e) => setApaGenerator({...apaGenerator, publisher: e.target.value})}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                            />
                          )}
                          {(apaGenerator.type === 'web' || apaGenerator.type === 'video' || apaGenerator.type === 'podcast') && (
                            <input 
                              type="text"
                              placeholder="URL"
                              value={apaGenerator.url}
                              onChange={(e) => setApaGenerator({...apaGenerator, url: e.target.value})}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                            />
                          )}
                          
                          <div className="p-4 bg-primary-light rounded-xl border border-primary-light">
                            <p className="text-sm font-medium text-slate-800 italic">
                              {apaGenerator.author || 'Forfatter'} ({apaGenerator.year || 'År'}). 
                              {apaGenerator.type === 'book' || apaGenerator.type === 'report' || apaGenerator.type === 'thesis' ? ` *${apaGenerator.title || 'Tittel'}*. ` : ` ${apaGenerator.title || 'Tittel'}. `}
                              {apaGenerator.journal && `*${apaGenerator.journal}*. `}
                              {apaGenerator.publisher && `${apaGenerator.publisher}. `}
                              {apaGenerator.url && `${apaGenerator.url}`}
                            </p>
                            <button 
                              onClick={() => {
                                const ref = `${apaGenerator.author || 'Forfatter'} (${apaGenerator.year || 'År'}). ${apaGenerator.title || 'Tittel'}. ${apaGenerator.journal ? apaGenerator.journal + '. ' : ''}${apaGenerator.publisher ? apaGenerator.publisher + '. ' : ''}${apaGenerator.url || ''}`;
                                copyToClipboard(ref, 'gen-ref');
                              }}
                              className="mt-2 text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" /> Kopier ferdig referanse
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-primary-light rounded-lg">
                        <Search className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-lg font-bold text-slate-900">Sjekk referanse</h2>
                    </div>
                    <textarea 
                      placeholder="Lim inn din referanse her..."
                      value={apaInput}
                      onChange={(e) => setApaInput(e.target.value)}
                      className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none resize-none mb-4"
                    />
                    <button 
                      onClick={handleCheckAPA}
                      disabled={isLoading || !apaInput}
                      className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Quote className="w-4 h-4" />}
                      Analyser referanse
                    </button>
                  </div>
                </div>
              )}

              {literatureSubTab === 'citations' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary-light">
                        <Lock className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sitat-hvelv</h2>
                        <p className="text-slate-500 font-medium">Lagre dine viktigste sitater og kilder.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const text = prompt('Lim inn sitatet her:');
                        const source = prompt('Hva er kilden? (Forfatter, årstall, side):');
                        if (text && source) {
                          setCitations([...citations, { id: Date.now().toString(), text, source, date: new Date().toLocaleDateString() }]);
                        }
                      }}
                      className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-hover transition-all flex items-center gap-2 shadow-lg shadow-primary-light"
                    >
                      <Plus className="w-4 h-4" /> Legg til sitat
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {citations.map((citation) => (
                      <div key={citation.id} className="p-6 rounded-2xl border border-slate-100 bg-slate-50 relative group">
                        <button 
                          onClick={() => setCitations(citations.filter(c => c.id !== citation.id))}
                          className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <Quote className="w-8 h-8 text-primary/20 mb-4" />
                        <p className="text-slate-700 font-medium italic mb-4 leading-relaxed">
                          "{citation.text}"
                        </p>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                          <span className="text-xs font-bold text-primary">{citation.source}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{citation.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}





          {activeTab === 'method-ethics' && (
            <motion.div 
              key="method-ethics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-6"
            >
              <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-2 no-scrollbar">
                {[
                  { id: 'methodology', label: 'Metode-veileder', icon: Library },
                  { id: 'ethics', label: 'Etikk & Personvern', icon: Shield }
                ].map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setMethodSubTab(sub.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                      methodSubTab === sub.id 
                        ? "bg-primary text-white shadow-md shadow-primary-light" 
                        : "bg-white text-slate-500 border border-slate-200 hover:border-primary/30"
                    )}
                  >
                    <sub.icon className="w-4 h-4" />
                    {sub.label}
                  </button>
                ))}
              </div>

              {methodSubTab === 'methodology' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Library className="text-primary w-5 h-5" /> Metode-veileder
                  </h2>
                  <div className="space-y-4">
                    <select 
                      value={methodologyDesign}
                      onChange={(e) => setMethodologyDesign(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Velg hoveddesign...</option>
                      <option value="Kvalitativ metode">Kvalitativ metode</option>
                      <option value="Kvantitativ metode">Kvantitativ metode</option>
                      <option value="Litteraturstudie">Litteraturstudie</option>
                    </select>
                    <textarea 
                      value={methodologyProblem}
                      onChange={(e) => setMethodologyProblem(e.target.value)}
                      placeholder="Din problemstilling..."
                      className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                    <button 
                      onClick={handleGetMethodology}
                      disabled={!methodologyDesign || !methodologyProblem.trim() || isLoading}
                      className="w-full bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-hover transition-all disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Få metodiske råd'}
                    </button>
                  </div>
                  {methodologyResult && (
                    <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="prose prose-sm max-w-none text-slate-700">
                        <ReactMarkdown>{methodologyResult}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {methodSubTab === 'ethics' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary-light">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">Etikk & Personvern (SIKT)</h2>
                      <p className="text-slate-500 font-medium">Veiledning for forskningsetikk.</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <h3 className="font-black text-slate-800 mb-4">Må jeg melde prosjektet til SIKT?</h3>
                      <p className="text-sm text-slate-600 leading-relaxed mb-4">
                        Dersom du skal behandle personopplysninger i din bacheloroppgave, må prosjektet som hovedregel meldes til SIKT. Dette gjelder dersom du kan identifisere enkeltpersoner direkte eller indirekte.
                      </p>
                      
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                        <h4 className="text-xs font-black text-primary uppercase tracking-wider">Eksempler på meldeplikt:</h4>
                        <ul className="space-y-2">
                          {[
                            "Bruk av lyd- eller videoopptak i barnehagen",
                            "Dersom observasjonsnotater inneholder navn, alder eller unike kjennetegn på barn/ansatte",
                            "Når du gjennomfører intervjuer med personalet"
                          ].map((example) => (
                            <li key={example} className="flex items-start gap-2 text-xs text-slate-600">
                              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                              {example}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <p className="mt-4 text-[10px] text-slate-500 italic">
                        Er du usikker? Ta alltid kontakt med din veileder eller institusjonens personvernombud før du starter datainnsamlingen.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}




          {activeTab === 'glossary-auto' && (
            <motion.div 
              key="glossary-auto"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-6"
            >
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-primary-light p-2 rounded-lg">
                    <Search className="text-primary w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Begrepsavklaring</h2>
                    <p className="text-sm text-slate-500">Lurer du på hva et begrep betyr? Skriv det inn, så forklarer jeg det på en enkel måte!</p>
                    <HelpSection 
                      title="Begreper" 
                      content="Akademiske tekster krever presisjon. Her kan du få hjelp til å definere og forklare sentrale fagbegreper slik at leseren forstår nøyaktig hva du mener." 
                    />
                  </div>
                </div>
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleGlossarySearch();
                      }
                    }}
                    placeholder="Søk i begreper (f.eks. Resiliens)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isAiDefining && (
                  <div className="mb-6 p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-4 animate-pulse">
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">Henter definisjon fra AI...</p>
                      <p className="text-[10px] text-primary/60 font-medium italic">Analyserer "{searchQuery}" i lys av barnehagepedagogikk og Rammeplanen</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {filteredGlossary.map((item, i) => (
                    <GlossaryCard 
                      key={`${item.term}-${i}`}
                      item={item}
                      index={i}
                      searchCounts={searchCounts}
                      incrementSearchCount={incrementSearchCount}
                      copyToClipboard={copyToClipboard}
                      copiedId={copiedId}
                    />
                  ))}
                  {filteredGlossary.length === 0 && !isAiDefining && searchQuery && (
                    <div className="col-span-full text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Search className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-500 font-medium mb-4">Ingen lokale treff for "{searchQuery}"</p>
                      <button 
                        onClick={handleGlossarySearch}
                        className="bg-primary text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary-light flex items-center gap-2 mx-auto"
                      >
                        <Sparkles className="w-4 h-4" /> Hent akademisk definisjon med AI
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}




          {activeTab === 'pdf-analysis' && (
            <motion.div 
              key="pdf-analysis"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center">
                <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Analyser din PDF</h2>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">Last opp en artikkel eller et kapittel for å få et sammendrag og forslag til relevant teori.</p>
                <HelpSection 
                  title="PDF Analyse" 
                  content="Last opp pensumartikler eller andre PDF-er for å få raske sammendrag, forklaringer på vanskelige begreper eller hjelp til å finne spesifikke temaer i teksten." 
                />
                
                <div className="flex flex-wrap justify-center gap-4">
                  <label className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-hover transition-all cursor-pointer">
                    <Upload className="w-5 h-5" />
                    Velg PDF-fil
                    <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
                  </label>

                  {(pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview') && (
                    <label className="inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all cursor-pointer">
                      <Library className="w-5 h-5" />
                      Last opp flere PDF-er
                      <input type="file" accept=".pdf" multiple className="hidden" onChange={handleMultiPdfUpload} />
                    </label>
                  )}
                </div>
                
                {pdfFile && (
                  <div className="mt-4 text-sm text-slate-600 flex items-center justify-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                    Aktiv fil: {pdfFile.name} ({formatBytes(pdfFile.size)})
                  </div>
                )}

                {pdfFiles.length > 0 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {pdfFiles.map((f, i) => (
                      <div key={`pdf-file-${f.name}-${f.size}-${i}`} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-bold flex items-center gap-2">
                        <FileText className="w-3 h-3" />
                        {f.name} ({formatBytes(f.size)})
                        <button onClick={() => setPdfFiles(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Multi-PDF Analysis (Snakk med pensum) */}
              {pdfFiles.length > 0 && (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-lg">
                      <MessageSquare className="text-emerald-600 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Snakk med pensum</h3>
                      <p className="text-sm text-slate-500">Still spørsmål på tvers av alle opplastede dokumenter.</p>
                    </div>
                  </div>

                  <div className="relative">
                    <input 
                      type="text"
                      value={multiPdfQuery}
                      onChange={(e) => setMultiPdfQuery(e.target.value)}
                      placeholder="F.eks: Hva sier disse tekstene om barns medvirkning?"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                    <button 
                      onClick={handleMultiPdfAnalysis}
                      disabled={isMultiPdfLoading}
                      className="absolute right-2 top-2 bottom-2 px-4 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all disabled:opacity-50"
                    >
                      {isMultiPdfLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>

                  {multiPdfAnalysis && (
                    <div className="p-6 bg-emerald-50/30 rounded-2xl border border-emerald-100 prose prose-sm max-w-none">
                      <ReactMarkdown>{multiPdfAnalysis}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {isPdfLoading && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-slate-500 font-medium animate-pulse">Analyserer innholdet... Dette kan ta litt tid.</p>
                </div>
              )}

              {pdfAnalysis && !isPdfLoading && (
                <div className="flex-1 flex flex-col gap-6">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative group">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary-light p-2 rounded-lg">
                          <Sparkles className="text-primary w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Analyse av dokumentet</h3>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(pdfAnalysis, 'pdf-analysis')}
                        className={cn(
                          "p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all flex items-center gap-2 text-xs font-bold",
                          copiedId === 'pdf-analysis' && "text-emerald-500 border-emerald-100 bg-emerald-50"
                        )}
                      >
                        {copiedId === 'pdf-analysis' ? <><Check className="w-4 h-4" /> Kopiert!</> : <><Copy className="w-4 h-4" /> Kopier analyse</>}
                      </button>
                    </div>
                    
                    <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
                      <ReactMarkdown>{pdfAnalysis}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Deep Analysis Section for PDF */}
                  <div className={cn(
                    "p-8 rounded-3xl border-2 transition-all",
                    pricingTier === 'semester' 
                      ? "bg-white border-primary/20 shadow-sm" 
                      : "bg-slate-50 border-slate-200 opacity-80"
                  )}>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", pricingTier === 'semester' ? "bg-primary-light" : "bg-slate-200")}>
                          <Zap className={cn("w-5 h-5", pricingTier === 'semester' ? "text-primary" : "text-slate-400")} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">KI-drevet Dypanalyse</h3>
                          <p className="text-sm text-slate-500">Gå dypere inn i teksten for å avdekke metodisk validitet og teoretisk dybde.</p>
                        </div>
                      </div>
                      {pricingTier !== 'semester' && (
                        <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Kun Årsabonnement
                        </span>
                      )}
                    </div>

                    {!deepPdfAnalysis && !isDeepAnalyzing ? (
                      <div className="space-y-4">
                        <button 
                          onClick={pricingTier === 'semester' ? handleDeepPdfAnalysis : () => setActiveTab('pricing')}
                          className={cn(
                            "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all",
                            pricingTier === 'semester' 
                              ? "bg-cta text-white hover:bg-cta-hover shadow-lg shadow-cta/20" 
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {pricingTier === 'semester' ? (
                            <>
                              <Zap className="w-5 h-5" /> Kjør dypanalyse nå
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5" /> Oppgrader for dypanalyse
                            </>
                          )}
                        </button>
                      </div>
                    ) : isDeepAnalyzing ? (
                      <div className="py-12 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-sm font-bold text-primary animate-pulse uppercase tracking-[0.2em]">Utfører dypanalyse...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed bg-primary-light/10 p-6 rounded-3xl border border-primary-light/20">
                          <ReactMarkdown>{deepPdfAnalysis || ''}</ReactMarkdown>
                        </div>
                        <button 
                          onClick={() => setDeepPdfAnalysis(null)}
                          className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-[0.2em] transition-colors"
                        >
                          Nullstill dypanalyse
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'source' && (
            <motion.div 
              key="source"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-6"
            >
              {pricingTier !== 'semester' && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                  <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-900">
                    <strong>Premium:</strong> Dypanalyse av kilder er en eksklusiv funksjon for årsabonnenter. 
                    <button 
                      onClick={() => setActiveTab('pricing')} 
                      className="ml-1 font-bold underline hover:text-amber-700 transition-colors"
                    >
                      Se priser og oppgrader her.
                    </button>
                  </p>
                </div>
              )}

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <ShieldCheck className="text-emerald-600 w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Kildekritisk Vurdering</h2>
                    <p className="text-sm text-slate-500">Beskriv kilden (tittel, forfatter, type publikasjon) for å få en vurdering.</p>
                    <HelpSection 
                      title="Kildekritikk" 
                      content="Ikke alle kilder er like gode. Bruk dette verktøyet for å vurdere om en kilde er troverdig, relevant og faglig sterk nok til å brukes i din oppgave." 
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={sourceInput}
                    onChange={(e) => setSourceInput(e.target.value)}
                    placeholder="F.eks: 'Artikkel av Sommer (2018) om lek i barnehagen'"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button 
                    onClick={handleEvaluateSource}
                    disabled={!sourceInput.trim() || isLoading}
                    className="bg-emerald-600 text-white px-6 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Vurder'}
                  </button>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <HelpCircle className="text-indigo-600 w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-indigo-900">Kritisk Tenkning: "Hva hvis?"</h3>
                </div>
                <p className="text-sm text-indigo-800 mb-4 leading-relaxed">
                  For å virkelig utfordre en kilde, prøv å stille "hva hvis"-spørsmål til argumentasjonen. Dette hjelper deg å se begrensninger og alternative perspektiver.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { q: "Hva hvis utvalget i studien var annerledes?", desc: "Ville konklusjonen fortsatt vært gyldig?" },
                    { q: "Hva hvis forfatterens teoretiske ståsted ble byttet ut?", desc: "Hvordan ville tolkningen endret seg?" },
                    { q: "Hva hvis denne kilden ble skrevet i dag?", desc: "Er argumentene fortsatt relevante i dagens samfunn?" },
                    { q: "Hva hvis vi ser på saken fra barnas perspektiv?", desc: "Stemmer forfatterens voksen-fokus?" }
                  ].map((item) => (
                    <div key={item.q} className="bg-white/60 p-3 rounded-xl border border-indigo-100/50">
                      <p className="text-xs font-bold text-indigo-900 mb-1">{item.q}</p>
                      <p className="text-[10px] text-indigo-700/80 italic">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {!sourceResult && !isLoading && (
                <div className={cn(
                  "p-4 rounded-xl border flex items-center gap-3",
                  pricingTier === 'semester' 
                    ? "bg-primary-light/20 border-primary-light" 
                    : "bg-slate-50 border-slate-200"
                )}>
                  {pricingTier === 'semester' ? (
                    <Sparkles className="w-5 h-5 text-primary" />
                  ) : (
                    <Lock className="w-5 h-5 text-slate-400" />
                  )}
                  <p className={cn(
                    "text-xs font-medium",
                    pricingTier === 'semester' ? "text-primary-dark" : "text-slate-500"
                  )}>
                    {pricingTier === 'semester' 
                      ? "Tips: Etter vurdering kan du kjøre KI-drevet dypanalyse for å sjekke bias og siteringskontekst."
                      : "Oppgrader til Årsabonnement for å låse opp Dypanalyse av kilder etter vurdering."}
                  </p>
                </div>
              )}

              {sourceResult && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  <div className={cn(
                    "px-6 py-4 flex items-center justify-between",
                    sourceResult.isAcademic ? "bg-emerald-50" : "bg-red-50"
                  )}>
                    <div className="flex items-center gap-2">
                      <Scale className={cn("w-5 h-5", sourceResult.isAcademic ? "text-emerald-600" : "text-red-600")} />
                      <span className="font-bold">{sourceResult.isAcademic ? 'Akademisk Kilde' : 'Ikke-akademisk Kilde'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-500 uppercase">Troverdighet:</span>
                      <span className="text-lg font-black text-primary">{sourceResult.reliabilityScore}/10</span>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Styrker</h4>
                        <ul className="space-y-1">
                          {sourceResult.pros.map((p: string) => (
                            <li key={p} className="text-sm flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Svakheter / Obs</h4>
                        <ul className="space-y-1">
                          {sourceResult.cons.map((c: string) => (
                            <li key={c} className="text-sm flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-4 relative group">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Anbefaling</h4>
                      <button 
                        onClick={() => copyToClipboard(sourceResult.recommendation, 'source-recommendation')}
                        className={cn(
                          "absolute right-0 top-4 p-1.5 rounded-lg bg-white border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-50 text-slate-400 hover:text-primary",
                          copiedId === 'source-recommendation' && "opacity-100 text-emerald-500 border-emerald-100"
                        )}
                        title="Kopier anbefaling"
                      >
                        {copiedId === 'source-recommendation' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <p className="text-sm text-slate-700 leading-relaxed">{sourceResult.recommendation}</p>
                    </div>

                    {/* Deep Analysis Section for Source */}
                    <div className={cn(
                      "mt-4 p-5 rounded-2xl border-2 transition-all",
                      pricingTier === 'semester' 
                        ? "bg-primary-light/5 border-primary/10" 
                        : "bg-slate-50 border-slate-100 opacity-80"
                    )}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className={cn("w-4 h-4", pricingTier === 'semester' ? "text-primary" : "text-slate-400")} />
                          <h4 className="text-sm font-bold text-slate-900">Dypanalyse av kilden</h4>
                        </div>
                        {pricingTier !== 'semester' && (
                          <span className="text-[9px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Årsabonnement
                          </span>
                        )}
                      </div>

                      {!deepSourceAnalysis && !isDeepAnalyzing ? (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Analyser bias, siteringskontekst og finn alternativ litteratur som utfordrer eller utfyller denne kilden.
                          </p>
                          <div className="relative group/btn">
                            <button 
                              onClick={pricingTier === 'semester' ? handleDeepSourceAnalysis : () => setActiveTab('pricing')}
                              className={cn(
                                "w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all",
                                pricingTier === 'semester' 
                                  ? "bg-primary text-white hover:bg-primary-hover shadow-sm" 
                                  : "bg-slate-100 border border-slate-200 text-slate-400 cursor-pointer hover:bg-slate-200"
                              )}
                            >
                              {pricingTier === 'semester' ? (
                                <>
                                  <Zap className="w-3.5 h-3.5" /> Start dypanalyse
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5" /> Oppgrader for dypanalyse
                                </>
                              )}
                            </button>
                            
                            {pricingTier !== 'semester' && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl text-center">
                                <p className="font-bold mb-1">Eksklusiv funksjon</p>
                                <p className="opacity-90">Dypanalyse krever Årsabonnement. Klikk for å se priser.</p>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : isDeepAnalyzing ? (
                        <div className="py-6 flex flex-col items-center justify-center space-y-2">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                          <p className="text-[10px] font-bold text-primary animate-pulse uppercase tracking-widest">Analyserer kilden i dybden...</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="prose prose-slate max-w-none text-slate-700 text-xs leading-relaxed bg-white p-4 rounded-xl border border-primary-light/30 shadow-sm">
                            <ReactMarkdown>{deepSourceAnalysis || ''}</ReactMarkdown>
                          </div>
                          <button 
                            onClick={() => setDeepSourceAnalysis(null)}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                          >
                            Nullstill dypanalyse
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <SettingsComponent 
              settings={settings}
              setSettings={setSettings}
              pricingTier={pricingTier}
              selectedTheme={selectedTheme}
              setSelectedTheme={setSelectedTheme}
              themes={themes}
              notificationSettings={notificationSettings}
              handleUpdateNotificationPref={handleUpdateNotificationPref}
              requestNotificationPermission={requestNotificationPermission}
              permissionStatus={permissionStatus}
              handleExportData={handleExportData}
              handleDeleteData={handleDeleteData}
              user={user}
              handleLogout={handleLogout}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'privacy' && (
            <PrivacyPolicy onBack={() => setActiveTab('settings')} />
          )}

          {activeTab === 'terms' && (
            <TermsOfService onBack={() => setActiveTab('settings')} />
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-8"
            >
              {(!profile.studyProgram || !profile.studentId || !profile.deadline) && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex items-center gap-4 shadow-sm"
                >
                  <div className="bg-amber-100 p-3 rounded-2xl">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-amber-900">Fullfør profilen din</p>
                    <p className="text-sm text-amber-700">
                      Fyll ut studieprogram, studentnummer og innleveringsfrist for å få bedre personlige forslag og påminnelser.
                    </p>
                  </div>
                </motion.div>
              )}

              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row items-center gap-8 mb-12 pb-12 border-b border-slate-100">
                  <div className="relative group">
                    <div className="w-32 h-32 bg-primary-light rounded-[2.5rem] flex items-center justify-center text-primary border-4 border-white shadow-xl group-hover:scale-105 transition-all">
                      <User className="w-16 h-16" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-xl shadow-lg border-2 border-white">
                      <Check className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-center md:text-left">
                    <h2 className="text-3xl font-black text-slate-900 mb-2">{profile.name || 'Studentprofil'}</h2>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider">
                        {profile.studyProgram || 'Ingen studieprogram valgt'}
                      </span>
                      <span className="px-3 py-1 bg-primary-light text-primary-dark rounded-lg text-xs font-bold uppercase tracking-wider">
                        {pricingModels.find(m => m.id === pricingTier)?.name || 'Gratis'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Fullt navn</label>
                    <input 
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({...profile, name: e.target.value})}
                      placeholder="Ola Nordmann"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">E-postadresse</label>
                    <input 
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({...profile, email: e.target.value})}
                      placeholder="ola@student.no"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Studentnummer</label>
                    <input 
                      type="text"
                      value={profile.studentId}
                      onChange={(e) => setProfile({...profile, studentId: e.target.value})}
                      placeholder="123456"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Kandidatnummer</label>
                    <input 
                      type="text"
                      value={profile.candidateId}
                      onChange={(e) => setProfile({...profile, candidateId: e.target.value})}
                      placeholder="400"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Kull / Årgang</label>
                    <input 
                      type="text"
                      value={profile.year}
                      onChange={(e) => setProfile({...profile, year: e.target.value})}
                      placeholder="2023-2026"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Innleveringsfrist</label>
                    <input 
                      type="date"
                      value={profile.deadline}
                      onChange={(e) => setProfile({...profile, deadline: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Din Høgskole</label>
                    <select 
                      value={profile.college}
                      onChange={(e) => setProfile({...profile, college: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all appearance-none"
                    >
                      <option value="">Velg din høgskole...</option>
                      <option value="DMMH">DMMH</option>
                      <option value="OsloMet">OsloMet</option>
                      <option value="USN">USN</option>
                      <option value="UiS">UiS</option>
                      <option value="Nord">Nord</option>
                      <option value="HVL">HVL</option>
                      <option value="HINN">HINN</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Spesialisering / Fordypning</label>
                    <input 
                      type="text"
                      value={profile.specialization}
                      onChange={(e) => setProfile({...profile, specialization: e.target.value})}
                      placeholder="F.eks. Natur, helse og bevegelse"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Studieprogram</label>
                    <select 
                      value={profile.studyProgram}
                      onChange={(e) => {
                        if (e.target.value === 'Annet' && pricingTier !== 'semester') {
                          setActiveTab('pricing');
                          return;
                        }
                        setProfile({...profile, studyProgram: e.target.value});
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                    >
                      <option value="">Velg studieprogram...</option>
                      <option value="Barnehagelærer, heltid">Barnehagelærer, heltid</option>
                      <option value="Barnehagelærer, deltid">Barnehagelærer, deltid</option>
                      <option value="Barnehagelærer med vekt på musikk, drama, kunst og håndverk">Barnehagelærer med vekt på musikk, drama, kunst og håndverk</option>
                      <option value="Barnehagelærer med vekt på natur og friluftsliv">Barnehagelærer med vekt på natur og friluftsliv</option>
                      <option value="Barnehagelærer med vekt på flerkulturell forståelse">Barnehagelærer med vekt på flerkulturell forståelse</option>
                      <option value="Annet">Annet / Egendefinert... {pricingTier !== 'semester' ? '🔒' : ''}</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Studiemodell</label>
                    <input 
                      type="text"
                      value={profile.studyModel}
                      onChange={(e) => setProfile({...profile, studyModel: e.target.value})}
                      placeholder="F.eks. 2023-modell"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Aktuelle emner (for litteraturforslag)</label>
                    <input 
                      type="text"
                      value={profile.courses}
                      onChange={(e) => setProfile({...profile, courses: e.target.value})}
                      placeholder="F.eks. BHG3000, PED2000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                    />
                    <p className="text-[10px] text-slate-500 italic ml-1">
                      Ved å oppgi emnekoder kan assistenten gi mer relevante litteraturforslag basert på <a href="https://www.dmmh.no/bibliotek/pensum" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">pensumlistene</a>.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end mt-12">
                  <button 
                    onClick={handleSaveProfile}
                    className="px-10 py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary-hover shadow-xl shadow-primary-light transition-all flex items-center gap-3 group"
                  >
                    <Save className="w-5 h-5 group-hover:scale-110 transition-transform" /> Lagre profil lokalt
                  </button>
                </div>
              </div>

              {/* App-innstillinger */}
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <Settings className="w-6 h-6 text-primary" /> App-innstillinger
                </h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900 flex items-center gap-2">
                        <Moon className="w-4 h-4 text-primary" /> Lav-stress modus
                      </p>
                      <p className="text-xs text-slate-500">Forenkler grensesnittet og fjerner forstyrrende elementer for en roligere skriveopplevelse.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const newVal = !lowStressMode;
                        setLowStressMode(newVal);
                        localStorage.setItem('dmmh_low_stress_mode', String(newVal));
                      }}
                      className={cn(
                        "w-14 h-8 rounded-full transition-all relative p-1",
                        lowStressMode ? "bg-primary" : "bg-slate-200"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 bg-white rounded-full shadow-sm transition-all",
                        lowStressMode ? "translate-x-6" : "translate-x-0"
                      )} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Abonnement / Plan - Nå som eget kort rett under profil */}
              <div className={cn(
                "p-10 rounded-[3rem] border-2 shadow-sm transition-all",
                pricingTier === 'free' ? "bg-white border-slate-100" : 
                pricingTier === 'preview' ? "bg-emerald-50 border-emerald-200" :
                "bg-primary-light/10 border-primary/20"
              )}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg",
                      pricingTier === 'free' ? "bg-slate-100 text-slate-300" : 
                      pricingTier === 'preview' ? "bg-emerald-500 text-white" :
                      "bg-primary text-white"
                    )}>
                      {pricingTier === 'preview' ? <Zap className="w-10 h-10 animate-pulse" /> : <CreditCard className="w-10 h-10" />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Abonnement & Status</p>
                      <h4 className="text-3xl font-black text-slate-900">
                        {pricingTier === 'preview' ? '24-timers Preview aktiv' : 
                         pricingModels.find(m => m.id === pricingTier)?.name || 'Gratisversjon'}
                      </h4>
                      {user ? (
                        <p className="text-sm text-emerald-600 font-bold mt-1 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Innlogget som {user.email}
                        </p>
                      ) : (
                        <p className="text-sm text-amber-600 font-bold mt-1 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /> Ikke innlogget. Data lagres kun lokalt.
                        </p>
                      )}
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-slate-600">Ubegrenset AI-hjelp</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold">
                          {pricingTier === 'free' ? (
                            <Lock className="w-4 h-4 text-slate-300" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          )}
                          <span className={pricingTier === 'free' ? "text-slate-400" : "text-slate-600"}>
                            Dypere kildeanalyse
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold">
                          {pricingTier === 'semester' || pricingTier === 'preview' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Lock className="w-4 h-4 text-slate-300" />
                          )}
                          <span className={pricingTier === 'semester' || pricingTier === 'preview' ? "text-slate-600" : "text-slate-400"}>
                            Samarbeidsverktøy {pricingTier !== 'semester' && pricingTier !== 'preview' && <span className="text-primary ml-1">(Neste milepæl!)</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row w-full gap-3 sm:gap-4 lg:w-auto">
                    {!user ? (
                      <button 
                        onClick={() => setShowAuthModal(true)}
                        className="w-full sm:w-auto px-6 sm:px-10 py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary-hover shadow-xl shadow-primary-light transition-all flex items-center justify-center gap-2"
                      >
                        <UserCheck className="w-5 h-5" /> Logg inn / Opprett konto
                      </button>
                    ) : (
                      <button 
                        onClick={handleLogout}
                        className="w-full sm:w-auto px-6 sm:px-10 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <LogOut className="w-5 h-5" /> Logg ut
                      </button>
                    )}
                    {pricingTier !== 'preview' && (
                      <button 
                        onClick={() => setActiveTab('pricing')}
                        className="w-full sm:w-auto px-6 sm:px-10 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        {pricingTier === 'free' ? <ArrowUpCircle className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                        {pricingTier === 'free' ? 'Oppgrader nå' : 'Administrer abonnement'}
                      </button>
                    )}
                    {pricingTier !== 'free' && pricingTier !== 'preview' && (
                      <button 
                        onClick={handleCancelSubscription}
                        className="w-full sm:w-auto px-6 sm:px-10 py-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-600 hover:bg-red-100 transition-all flex items-center justify-center"
                      >
                        Si opp
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-10 bg-primary-light/30 rounded-[3rem] border border-primary-light flex items-start gap-6">
                <ShieldCheck className="w-8 h-8 text-primary shrink-0 mt-1" />
                  <p className="text-sm text-primary-dark leading-relaxed font-medium">
                    Informasjonen du legger inn her brukes kun til å gi deg en sømløs opplevelse på tvers av enhetene dine, og for å tilpasse veiledningen i chatten. Dataene dine lagres trygt i en kryptert skydatabase (Firebase), og de brukes aldri til å trene opp kunstig intelligens.
                  </p>
                </div>
              </motion.div>
            )}

          {activeTab === 'resources' && (
            <motion.div 
              key="resources"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-8"
            >
              {/* Din Høgskole (DMMH Snarveier) */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-primary-light/20 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                  <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    <GraduationCap className="w-6 h-6 text-primary" /> Din Høgskole ({profile.college || 'Ikke valgt'})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { 
                        label: 'Canvas', 
                        url: {
                          'DMMH': 'https://dmmh.instructure.com/',
                          'OsloMet': 'https://oslomet.instructure.com/',
                          'USN': 'https://usn.instructure.com/',
                          'UiS': 'https://uis.instructure.com/',
                          'Nord': 'https://nord.instructure.com/',
                          'HVL': 'https://hvl.instructure.com/',
                          'HINN': 'https://inn.instructure.com/'
                        }[profile.college] || '', 
                        icon: <Layout className="w-5 h-5" />, 
                        desc: profile.college ? 'Læringsplattform' : 'Velg høgskole i profilen' 
                      },
                      { label: 'Wiseflow', url: 'https://europe.wiseflow.net/login/search', icon: <FileCheck className="w-5 h-5" />, desc: 'Eksamen og innlevering' },
                      { label: 'Studentweb', url: 'https://fsweb.no/studentweb/login.jsf?inst=DMMH', icon: <User className="w-5 h-5" />, desc: 'Semesterregistrering' },
                      { label: 'Pensumoversikt', url: 'https://oria.no', icon: <BookOpen className="w-5 h-5" />, desc: 'Søk i Oria/Pensum' }
                    ].map((link) => (
                      link.label === 'Canvas' && !profile.college ? (
                        <button 
                          key={link.label}
                          onClick={() => setActiveTab('profile')}
                          className="flex flex-col gap-3 p-6 bg-amber-50 border border-amber-100 rounded-3xl hover:border-amber-300 hover:bg-white hover:shadow-xl hover:shadow-amber-500/5 transition-all group text-left"
                        >
                          <div className="bg-white p-3 rounded-2xl shadow-sm group-hover:text-amber-600 group-hover:scale-110 transition-all w-fit">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                          </div>
                          <div>
                            <span className="block text-sm font-bold text-slate-900">{link.desc}</span>
                            <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Trykk her</span>
                          </div>
                        </button>
                      ) : (
                        <a 
                          key={link.label} 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col gap-3 p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:border-primary/30 hover:bg-white hover:shadow-xl hover:shadow-primary/5 transition-all group"
                        >
                          <div className="bg-white p-3 rounded-2xl shadow-sm group-hover:text-primary group-hover:scale-110 transition-all w-fit">
                            {link.icon}
                          </div>
                          <div>
                            <span className="block text-sm font-bold text-slate-900">{link.label}</span>
                            <span className="text-[10px] text-slate-500 font-medium">{link.desc}</span>
                          </div>
                        </a>
                      )
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Referanser og Verktøy */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <BookOpen className="w-6 h-6 text-blue-500" /> Referanser og Verktøy
                  </h3>
                  <div className="grid gap-3">
                    {[
                      { label: 'Kildekompasset (APA 7)', url: 'https://kildekompasset.no/referansestiler/apa-7/', icon: Compass },
                      { label: 'Zotero', url: 'https://www.zotero.org/', icon: Library },
                      { label: 'Søk & Skriv', url: 'https://sokogskriv.no/', icon: Search },
                      { label: 'Nasjonalt Vitenarkiv', url: 'https://nva.unit.no/', icon: Archive }
                    ].map((link) => (
                      <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-sm transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-white rounded-xl shadow-sm group-hover:text-primary transition-colors">
                            <link.icon className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">{link.label}</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Styringsdokumenter & Etikk */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-emerald-500" /> Styring & Etikk
                  </h3>
                  <div className="grid gap-3">
                    {[
                      { label: 'Rammeplan for barnehagen', url: 'https://www.udir.no/laring-og-trivsel/rammeplan-for-barnehagen/', icon: FileText },
                      { label: 'Barnehageloven', url: 'https://lovdata.no/dokument/NL/lov/2005-06-17-64', icon: Scale },
                      { label: 'SIKT (Personvern)', url: 'https://sikt.no/logg-inn', icon: UserCheck },
                      { label: 'NESH Retningslinjer', url: 'https://www.forskningsetikk.no/retningslinjer/hum-sam/forskningsetiske-retningslinjer-for-samfunnsvitenskap-humaniora-juss-og-teologi/', icon: ShieldAlert }
                    ].map((link) => (
                      <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-sm transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-white rounded-xl shadow-sm group-hover:text-emerald-600 transition-colors">
                            <link.icon className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">{link.label}</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100">
                  <h3 className="text-xl font-black text-emerald-900 mb-6 flex items-center gap-3">
                    <ShieldCheck className="w-7 h-7 text-emerald-600" /> Personvern & Sikkerhet
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {privacyNotice.map((item) => (
                      <div key={item.title} className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-emerald-100 shadow-sm">
                        <h4 className="font-bold text-sm text-emerald-800 mb-2">{item.title}</h4>
                        <p className="text-xs text-emerald-700 leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100">
                  <h3 className="text-xl font-black text-amber-900 mb-6 flex items-center gap-3">
                    <Sparkles className="w-7 h-7 text-amber-600" /> KI-vettregler
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {aiEthics.map((item) => (
                      <div key={item.title} className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-amber-100 shadow-sm">
                        <h4 className="font-bold text-sm text-amber-800 mb-2">{item.title}</h4>
                        <p className="text-xs text-amber-700 leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-primary p-10 rounded-[3rem] text-white relative overflow-hidden shadow-2xl shadow-primary/20">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="max-w-xl">
                    <h3 className="text-3xl font-black mb-4">Trenger du mer hjelp?</h3>
                    <p className="text-primary-light text-lg mb-8 leading-relaxed">
                      Besøk biblioteket for en "Skriveprat" eller kontakt studentassistentene på campus. De kan hjelpe deg med alt fra kildebruk til struktur.
                    </p>
                    <a 
                      href="mailto:skriveprat@dmmh.no" 
                      className="inline-flex items-center gap-3 bg-white text-primary px-8 py-4 rounded-2xl font-black hover:bg-primary-light hover:scale-105 transition-all shadow-xl"
                    >
                      <MessageSquare className="w-5 h-5" /> Send e-post til Skriveprat
                    </a>
                  </div>
                  <div className="shrink-0 bg-white/10 p-8 rounded-full backdrop-blur-md">
                    <BookOpen className="w-24 h-24 text-white" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {checkoutSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={cn(
                "fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold transition-all",
                pricingTier === 'free' ? "bg-slate-800" : "bg-emerald-600"
              )}
            >
              {pricingTier === 'free' ? <Info className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
              {pricingTier === 'free' ? "Abonnementet er avsluttet" : "Abonnementet ditt er nå aktivert!"}
            </motion.div>
          )}

          {isVerifyingPayment && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-[250] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6"
            >
              <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-6">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CreditCard className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Verifiserer betaling...</h3>
                  <p className="text-sm text-slate-500 mt-2">Vennligst vent mens vi bekrefter ditt abonnement hos Stripe.</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'file-archive' && (
            <ContextFilesManager />
          )}

          {activeTab === 'milestones' && (
            <motion.div 
              key="milestones"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-8 max-w-4xl mx-auto py-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-black text-slate-900">Dine Milepæler</h2>
                <p className="text-slate-500 max-w-2xl mx-auto">Følg din progresjon fra idé til ferdig bacheloroppgave.</p>
              </div>

              <div className="space-y-6 relative before:absolute before:left-8 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-100">
                {[
                  { title: 'Idémyldring & Problemstilling', date: 'Februar', status: 'completed', desc: 'Finne et tema og formulere en foreløpig problemstilling.' },
                  { title: 'Litteratursøk & Teori', date: 'Mars', status: 'in-progress', desc: 'Samle relevant pensum og forskning.' },
                  { title: 'Metodevalg & Datainnsamling', date: 'April', status: 'pending', desc: 'Planlegge og gjennomføre observasjoner eller intervjuer.' },
                  { title: 'Analyse & Drøfting', date: 'Mai', status: 'pending', desc: 'Koble empiri med teori og diskutere funn.' },
                  { title: 'Ferdigstilling & Korrektur', date: 'Juni', status: 'pending', desc: 'Siste sjekk av kilder, språk og struktur.' }
                ].map((m) => (
                  <div key={m.title} className="relative flex gap-8 group">
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-sm transition-all",
                      m.status === 'completed' ? "bg-emerald-500 text-white" : 
                      m.status === 'in-progress' ? "bg-primary text-white animate-pulse" : 
                      "bg-slate-100 text-slate-400"
                    )}>
                      {m.status === 'completed' ? <Check className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex-1 hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-lg text-slate-900">{m.title}</h4>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{m.date}</span>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed">{m.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
          {activeTab === 'about' && (
            <motion.div 
              key="about"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-6"
            >
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-primary-light p-3 rounded-2xl">
                    <Info className="text-primary w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Om BLU-hjelperen</h2>
                    <p className="text-slate-500">Din digitale veileder for akademisk skriving.</p>
                  </div>
                </div>

                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-700 leading-relaxed">
                    BLU-hjelperen er din digitale skrivepartner gjennom barnehagelærerstudiet. Appen er utviklet for å støtte studenter i deres studiehverdag, uavhengig av universitet eller høyskole. Ved å kombinere pedagogisk fagkunnskap med avansert KI-teknologi, gir BLU-hjelperen deg skreddersydd veiledning i alt fra refleksjonsoppgaver til bacheloroppgaven.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" /> Personvern og Datasikkerhet
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        For å gi deg en sømløs skriveopplevelse på tvers av mobil og PC, lagres dine aktive dokumenter og profildata trygt i en kryptert skydatabase (levert av Google Firebase). Dine tekster er private, knyttet til din unike bruker-ID, og deles aldri med tredjeparter. Du eier ditt eget innhold, og kan når som helst slette kontoen din for å fjerne all data fra våre servere.
                      </p>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-600" /> Ansvarlig bruk av KI
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        KI-en er her for å veilede, ikke for å skrive oppgaven for deg. Bruk tilbakemeldingene som et utgangspunkt for din egen refleksjon og skriving. Husk å alltid sjekke offisielle kilder.
                      </p>
                    </div>
                  </div>

                  <div className="mt-12 p-6 bg-primary-light rounded-2xl border border-primary-light">
                    <h3 className="font-bold text-primary-dark mb-2">Om utviklingen</h3>
                    <p className="text-sm text-primary-dark leading-relaxed">
                      Denne applikasjonen er utviklet på frivillig basis og har ingen formell tilknytning til Dronning Mauds Minne Høgskole (DMMH), OsloMet, Universitetet i Sørøst-Norge (USN), Universitetet i Stavanger (UiS) eller andre utdanningsinstitusjoner. Innholdet er basert på offentlig tilgjengelige nasjonale og institusjonelle retningslinjer for barnehagelærerutdanningen, men er ikke et offisielt produkt fra noen av disse lærestedene.
                    </p>
                    <div className="mt-4 pt-4 border-t border-primary-light">
                      <p className="text-sm text-primary-dark font-bold mb-1">Opphavsrett</p>
                      <p className="text-xs text-primary-dark">
                        Det er S. Nordvik som har opphavsretten til denne appen. © 2026 Alle rettigheter forbeholdt.
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-primary-light">
                      <p className="text-sm text-primary-dark font-bold mb-1">Tilbakemeldinger og forslag</p>
                      <p className="text-sm text-primary-dark leading-relaxed">
                        Har du forslag til forbedringer eller andre tilbakemeldinger? Din mening er viktig for videre utvikling av verktøyet. Du kan sende dine innspill direkte til BLU-Hjelperen på:
                      </p>
                      <a 
                        href="mailto:post@blu-hjelperen.no?subject=Barnehagelaerer-assistent" 
                        className="inline-flex items-center gap-2 text-primary font-bold mt-2 hover:underline"
                      >
                        post@blu-hjelperen.no
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <Library className="w-5 h-5 text-primary" /> Kildegrunnlag
                      </h3>
                      <ul className="text-xs text-slate-600 space-y-2">
                        <li className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                          Nasjonale retningslinjer og oppgavehåndbøker for barnehagelærerutdanningen (bl.a. DMMH, OsloMet, USN, og UiS).
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                          Kildekompasset og offisiell APA 7-manual.
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                          Utdanningsdirektoratet (Rammeplan for barnehagen, barnehageloven og offisielt støttemateriell).
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                          Forskningsetiske retningslinjer for samfunnsvitenskap og humaniora (NESH / SIKT).
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                          Anerkjente nasjonale ressurser for akademisk skriving og metode (f.eks. Søk & Skriv).
                        </li>
                      </ul>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-primary" /> Versjonshistorikk
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-bold text-slate-800">v1.2.0 (April 2026)</p>
                          <p className="text-[10px] text-slate-500">Nytt navn (Studie-Assistent), utvidet målgruppe, nye oppgavetyper og oppdatert sensorverktøy.</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">v1.1.0 (April 2026)</p>
                          <p className="text-[10px] text-slate-500">Lagt til "Kopier til utklippstavle", PDF-analyse og utvidet "Om"-seksjon.</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">v1.0.0 (Mars 2026)</p>
                          <p className="text-[10px] text-slate-500">Første lansering med chat, referansekontroll og sensor-simulering.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <CheckSquare className="w-5 h-5 text-primary" /> Bruksvilkår
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Denne assistenten er ment som et <strong>supplement</strong> til ordinær veiledning fra faglærer og bibliotekets tjenester. Den erstatter ikke formell veiledning. All bruk av KI-generert tekst i din endelige oppgave må skje i tråd med gjeldende regler for fusk og kildebruk ved ditt studiested.
                    </p>
                  </div>

                  <div className="mt-6 p-6 bg-amber-50 rounded-2xl border border-amber-100">
                    <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5" /> Viktig ansvarsfraskrivelse
                    </h3>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      Dette er et KI-basert verktøy. Kunstig intelligens kan generere feilaktig informasjon, hallusinere kilder eller misforstå kontekst. Du som student er selv ansvarlig for innholdet i dine tekster og akademiske arbeider og for å kontrollere at alle referanser og påstander er korrekte i henhold til gjeldende krav.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {activeNotification && (
            <motion.div
              initial={{ opacity: 0, y: 50, x: 20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: 20, x: 20 }}
              className="fixed bottom-6 right-6 z-[100] bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 w-80 flex gap-4 cursor-pointer hover:border-primary transition-colors"
              onClick={() => {
                setActiveTab('collaboration');
                setActiveNotification(null);
              }}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-xs text-white font-bold shrink-0">
                {activeNotification.user}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">Ny melding i gruppa</span>
                  <span className="text-[10px] text-slate-400">Nå</span>
                </div>
                <p className="text-xs text-slate-600 truncate">{activeNotification.content}</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveNotification(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {showAuthModal && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-100"
              >
                <div className="p-10 text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="bg-primary-light/30 p-6 rounded-[2.5rem]">
                      <UserCheck className="w-12 h-12 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black text-slate-900 leading-tight">Bli en del av BLU-Hjelperen</h2>
                    <p className="text-slate-500 leading-relaxed">
                      Opprett en konto for å lagre dine dokumenter, prosjekter og abonnementsstatus trygt i skyen.
                    </p>
                  </div>
                  
                  <div className="space-y-4 pt-4">
                    <button 
                      onClick={handleLogin}
                      className="w-full py-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-700 hover:bg-slate-50 hover:border-primary/20 transition-all flex items-center justify-center gap-3 shadow-sm group"
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                      Fortsett med Google
                    </button>
                    <button 
                      onClick={() => setShowAuthModal(false)}
                      className="w-full py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors text-sm"
                    >
                      Avbryt
                    </button>
                    <p className="text-[10px] text-slate-400 leading-relaxed px-4">
                      Ved å logge inn samtykker du til at dine prosjekter og profildata lagres trygt i skyen for at du skal kunne jobbe på tvers av enheter. Du kan når som helst slette din konto og dine data.
                    </p>
                  </div>

                  <div className="pt-6 border-t border-slate-50">
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Ved å logge inn godtar du våre bruksvilkår. Dine data lagres sikkert i Google Cloud via Firebase.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
          {showPaywall && <PaywallModal />}
        </AnimatePresence>
      </main>
    </div>
  );
}
