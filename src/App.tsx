import { Home as HomeComponent } from './components/Home';
import { Settings as SettingsComponent } from './components/Settings';
import { Pricing as PricingComponent } from './components/Pricing';
import { Admin as AdminComponent } from './components/Admin';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsOfService } from './components/TermsOfService';
import { ContextFilesManager } from './components/ContextFilesManager';
import { DidaktiskPlanlegger } from './components/DidaktiskPlanlegger';
import { VisualContentGenerator } from './components/VisualContentGenerator';
import { RoleplaySimulator } from './components/RoleplaySimulator';
import { PresentationGenerator } from './components/PresentationGenerator';
import { Resources } from './components/Resources';
import { Profile as ProfileComponent } from './components/Profile';
import { isUnlimitedUser, isAdminUser } from './config/accessConfig';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Shield,
  CheckCircle2,
  Clock,
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
  PlayCircle,
  Presentation,
  FileSearch,
  Wrench,
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
  Save,
  Home as HomeIcon,
  Layout,
  Grid,
  Archive,
  Compass,
  ArrowRight,
  ArrowUpCircle,
  CreditCard,
  Settings,
  Users,
  Zap,
  Lock,
  Moon,
  Timer,
  AlertTriangle,
  Menu,
  RefreshCw,
  LogOut,
  Maximize2,
  Minimize2,
  PenTool,
  HelpCircle,
  AlertCircle,
  Database,
  Folder,
  Brain,
  CheckCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn, formatBytes } from './lib/utils';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageNumber, Footer } from 'docx';
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
import { signInWithRedirect } from 'firebase/auth';
import { getToken } from 'firebase/messaging';
import { 
  doc, 
  getDoc, 
  setDoc, 
  getDocFromServer, 
  updateDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { 
  generateAcademicResponse, 
  analyzeThesisStructure, 
  evaluateSource, 
  checkAPA7, 
  getMethodologyAdvice,
  analyzePdfContent,
  performDeepPdfAnalysis,
  performDeepSourceAnalysis,
  defineTerm,
  getLiteratureSuggestions,
  analyzeAssignmentText,
  synthesizeEvaluations,
  checkPlagiarism,
  analyzeMultiPdfs,
  analyzeWithSystemPrompt,
  generateOutlineFromChat,
  superAgentRouter,
  askRagAgent,
  askSocraticAgent,
  askApaAgent,
  askLanguageAgent
} from './services/geminiService';

import { extractTextFromPdf } from './lib/pdfUtils';
import { extractTextFromDocx } from './lib/docxUtils';
import { Superveileder } from './components/Superveileder';
import { ChatAssistant } from './components/tools/ChatAssistant';
import { WritingWorkshop } from './components/tools/WritingWorkshop';
import { ProcessLog } from './components/tools/ProcessLog';
import { SocraticPartner } from './components/SocraticPartner';
import { AutoAPA } from './components/AutoAPA';
import { LanguageBot } from './components/LanguageBot';
import { SuperChat } from './components/SuperChat';
import { PromptLibrary } from './components/PromptLibrary';
import { DesktopDashboardPage } from './pages/DesktopDashboardPage';
import { DocumentAnalysis } from './components/DocumentAnalysis';
import { Encyclopedia } from './components/Encyclopedia';
import { AiTextRewriter } from './components/AiTextRewriter';
import { ToolsDashboard } from './components/ToolsDashboard';
import { Basen } from './components/Basen';
import WelcomeGuide, { PedagogicalProfile } from './components/WelcomeGuide';

interface AppDocument {
  id: string;
  title: string;
  type?: string; 
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
  agentTag?: 'SOKRATISK' | 'RAG' | 'APA' | 'SPRAK' | 'GENERELL' | string;
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
          <motion.div key="ap-auto-1-1"
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
  const [activeTab, setActiveTab] = useState<'home' | 'super-chat' | 'desktop-dashboard' | 'blu-hjelper' | 'prompt-library' | 'task-start' | 'process-log' | 'socratic-partner' | 'language-bot' | 'writing-workshop' | 'polishing' | 'assistant' | 'literature-ref' | 'glossary-auto' | 'method-ethics' | 'pdf-analysis' | 'oral-simulator' | 'presentation-generator' | 'resources' | 'file-archive' | 'profile' | 'settings' | 'about' | 'pricing' | 'milestones' | 'collaboration' | 'sensor' | 'apa' | 'checklist' | 'citations' | 'methodology' | 'literature' | 'ethics' | 'glossary' | 'pdf' | 'source' | 'chat' | 'writing-process' | 'progress' | 'admin' | 'didaktisk-planlegger' | 'dagens-bilde' | 'privacy' | 'terms' | 'simulator' | 'presentations' | 'document-analysis' | 'dictionary' | 'verktoy' | 'tools-overview' | 'tools'>('home');
  const [activeSubTab, setActiveSubTab] = useState<'tools-overview' | 'simulator' | 'presentations' | 'document-analysis' | 'dictionary'>('tools-overview');
  const [docAnalysisInitialTool, setDocAnalysisInitialTool] = useState<'sensor' | 'summary' | 'humanizer'>('sensor');
  const [writingStep, setWritingStep] = useState(1);

  // Global Inactivity Router (Idle Timeout)
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in ms
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;

    const checkIdle = () => {
      const lastActive = localStorage.getItem('lastActive');
      if (lastActive && Date.now() - parseInt(lastActive, 10) > IDLE_TIMEOUT) {
        if (activeTabRef.current !== 'home') {
          setActiveTab('home');
        }
      }
    };

    // Sjekk idet appen monteres / får fokus
    checkIdle();

    const interval = setInterval(checkIdle, 60000); // Sjekk hvert minutt

    const handleActivity = () => {
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          localStorage.setItem('lastActive', Date.now().toString());
          throttleTimer = null;
        }, 5000); // Throttle: oppdater maks hvert 5. sekund
      }
    };

    localStorage.setItem('lastActive', Date.now().toString());

    const events = ['mousemove', 'keydown', 'wheel', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));

    // Re-sjekk når fanen blir aktiv igjen
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkIdle();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      if (throttleTimer) clearTimeout(throttleTimer);
      events.forEach(event => window.removeEventListener(event, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Service Worker Registration & Auth Modal Listener
  useEffect(() => {
    const handleOpenAuth = () => setShowAuthModal(true);
    window.addEventListener('openAuthModal', handleOpenAuth);
    return () => window.removeEventListener('openAuthModal', handleOpenAuth);
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
        if (isQuotaExceeded) return;
        await setDoc(doc(db, 'users', user.uid), { uid: user.uid, email: user.email || 'unknown@example.com', notificationSettings: newSettings }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
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
            const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BPE_YOUR_VAPID_KEY_HERE';
            const token = await getToken(messaging, { vapidKey });
            if (user && !isQuotaExceeded) {
              await setDoc(doc(db, 'users', user.uid), { uid: user.uid, email: user.email || 'unknown@example.com', fcmToken: token }, { merge: true });
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
    if (errInfo.error.toLowerCase().includes('quota') || errInfo.error.toLowerCase().includes('resource-exhausted')) {
      setIsQuotaExceeded(true);
      setGlobalError("Oj! Databasen vår har nådd sin daglige grense for gratis bruk. Dine endringer lagres nå kun lokalt på din maskin inntil kvoten nullstilles (vanligvis ved midnatt). Men slapp av – du kan fortsette å jobbe som normalt!");
    } else {
      setGlobalError(`Oisann! Det oppstod en liten feil med databasen: ${errInfo.error}. Vi prøver å fikse det!`);
    }
    throw new Error(JSON.stringify(errInfo));
  };

  useEffect(() => {
    if (globalSuccess) {
      const timer = setTimeout(() => setGlobalSuccess(null), 3000);
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
          
          // Fjern evt gamle/hengende service workers som kan blokkere nettverk
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
              for(let registration of registrations) {
                registration.unregister();
              }
            });
          }

          setGlobalError("Kunne ikke koble til databasen. Hvis du er på et bedriftsnettverk eller bruker AdBlock/Brave Shields kan dette blokkere appen. Prøv å tømme hurtigbufferen (cache) i nettleseren.");
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

  /* getMilestoneMessage removed */

  /* ContextualHelp removed */

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
            <motion.div key="ap-auto-2-1"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-[2rem] text-sm text-slate-100 leading-relaxed shadow-xl relative overflow-hidden group/help">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover/help:scale-110"></div>
                <div className="flex items-center gap-3 mb-3 relative z-10">
                  <div className="bg-white/10 p-2 rounded-xl">
                    <Info className="w-4 h-4 text-primary-light" />
                  </div>
                  <strong className="font-bold text-base">Hva er dette?</strong>
                </div>
                <div className="relative z-10 opacity-90">
                  {content}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };
  
  const [profile, setProfile] = useState(() => {
    // Start med helt tomme data
    const emptyProfile = {
      name: '',
      email: '',
      studentId: '',
      candidateId: '',
      year: '',
      specialization: '',
      studyProgram: '',
      studyModel: '',
      studiested: '',
      courses: '',
      deadline: '',
      college: ''
    };
    const saved = localStorage.getItem('blu_profile_guest');
    return saved ? { ...emptyProfile, ...JSON.parse(saved) } : emptyProfile;
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);

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

  const [onboardingComplete, setOnboardingComplete] = useState(() => localStorage.getItem('dmmh_onboarding_complete') === 'true');
  const [lowStressMode, setLowStressMode] = useState(() => localStorage.getItem('dmmh_low_stress_mode') === 'true');
  const [activeDisposition, setActiveDisposition] = useState<any[]>(() => {
    const saved = localStorage.getItem('blu_active_disposition_guest');
    return saved ? JSON.parse(saved) : DEFAULT_DISPOSITION;
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
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const isGuest = !user;
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [pedagogicalProfile, setPedagogicalProfile] = useState<PedagogicalProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const isRestored = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const canCreateDocument = () => {
    const isYearly = pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview';
    if (isYearly) return true;
    if (pricingTier === 'monthly' && documents.length < 3) return true;
    if (!pricingTier || pricingTier === 'free') return false; // Basic test only? 
    return false;
  };

  const createNewDocument = (title: string = 'Nytt dokument', folderId: string | null = null) => {
    if (pricingTier === 'monthly' && documents.length >= 3) {
      setGlobalError("Du har nådd grensen på 3 dokumenter. Oppgrader til Årsabonnement for ubegrenset antall.");
      setShowPaywall(true);
      return;
    }

    if (!canCreateDocument()) {
      setShowPaywall(true);
      return;
    }

    const newDoc: AppDocument = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      type: 'Generell oppgave',
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

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setShowAuthModal(false);
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error?.code === 'auth/unauthorized-domain') {
         alert(`Dette domenet (${window.location.hostname}) er ikke autorisert i Firebase. Logg inn på Firebase Console -> Authentication -> Settings -> Authorized Domains og legg til "${window.location.hostname}".`);
      } else if (error?.code === 'auth/popup-blocked' || error?.message?.toLowerCase().includes('popup')) {
        alert("Nettleseren din blokkerte popup-vinduet. Prøver å omdirigere i stedet...");
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError: any) {
           alert("Kunne ikke omdirigere: " + (redirectError?.message || "Ukjent feil"));
        }
      } else {
        alert("Feil ved innlogging: " + (error?.message || "Husk å legge til dette domenet under Authorized Domains i Firebase Console."));
      }
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
      { id: 'assistant', label: 'Superveilederen', icon: Sparkles, requiredTier: 'free' },
      { id: 'writing-workshop', label: 'Skriveverksted', icon: FileText, requiredTier: 'free' },
      { id: 'process-log', label: 'Prosesslogg', icon: BookOpen, requiredTier: 'free' }
    ]},
    { id: 'verktoy', label: 'Verktøy', icon: Zap, subTabs: [
      { id: 'tools-overview', label: 'Verktøykasse', icon: Grid, requiredTier: 'free' }
    ]},
    { id: 'basen', label: 'Basen', icon: Users, subTabs: [
      { id: 'collaboration', label: 'Basen', icon: Users, requiredTier: 'free' }
    ]},
    { id: 'ressurser', label: 'Ressurser', icon: Library, subTabs: [
      { id: 'resources', label: 'Ressursbibliotek', icon: Grid, requiredTier: 'free' },
      { id: 'file-archive', label: 'Filarkiv', icon: Archive, requiredTier: 'free' }
    ]},
    { id: 'profil', label: 'Profil', icon: User, subTabs: [
      { id: 'profile', label: 'Konto & Profil', icon: User, requiredTier: 'free' }
    ]}
  ];

  // Dynamisk tillegg av Admin-fane for eier og godkjente administratorer
  if (isAdminUser(user?.email || profile.email)) {
    const adminGroup = {
      id: 'admin-group',
      label: 'System',
      icon: Shield,
      subTabs: [
        { id: 'admin', label: 'Admin', icon: Shield, requiredTier: 'free' },
        { id: 'dagens-bilde', label: 'Dagens bilde & oppdatering', icon: ImageIcon, requiredTier: 'free' },
        { id: 'didaktisk-planlegger', label: 'Planlegger', icon: Layout, requiredTier: 'free' }
      ]
    };
    if (!navigationGroups.find(g => g.id === 'admin-group')) {
      navigationGroups.push(adminGroup);
    }
  }

  const activeGroup = navigationGroups.find(group => 
    group.id === activeTab || 
    group.subTabs.some(sub => sub.id === activeTab) ||
    (group.id === 'skriving' && (activeTab === 'blu-hjelper' || activeTab === 'super-chat' || activeTab === 'desktop-dashboard')) ||
    (group.id === 'verktoy' && [
      'verktoy', 
      'tools', 
      'tools-overview', 
      'document-analysis', 
      'simulator', 
      'presentations', 
      'dictionary', 
      'pdf-analysis', 
      'oral-simulator', 
      'presentation-generator',
      'glossary-auto'
    ].includes(activeTab))
  ) || navigationGroups[0];
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

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
    // Admin / Premium override
    const isPremiumUser = isUnlimitedUser(user?.email || profile.email);

    if (isPremiumUser) return true;
    
    // Default tier is free
    if (!requiredTier || requiredTier === 'free') return true;

    // Must be logged in for monthly/yearly checks
    if (!user) return false;

    const isYearly = pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview';
    const isMonthly = pricingTier === 'monthly';

    if (requiredTier === 'yearly') return isYearly;
    if (requiredTier === 'monthly') return isYearly || isMonthly;
    
    return false;
  };

  const getAccessLabel = (requiredTier: string, baseLabel: string) => {
    if (!user) return `🔒 Logg inn for å bruke`;
    if (checkAccess(requiredTier)) return baseLabel;
    
    if (requiredTier === 'yearly') return `🔒 Krever Årsabonnement`;
    return `🔒 Oppgrader for å bruke`;
  };

  const handleTabClick = (tabId: any, requiredTier?: string) => {
    // Admin access check
    if (tabId === 'admin') {
      const isAdmin = isAdminUser(user?.email || profile.email);
      if (!isAdmin) {
        setActiveTab('home');
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        return;
      }
    }

    if (['tools-overview', 'simulator', 'presentations', 'document-analysis', 'dictionary'].includes(tabId)) {
      setActiveSubTab(tabId as any);
    }

    if (tabId === 'verktoy' || tabId === 'tools' || tabId === 'tools-overview') {
      setActiveSubTab('tools-overview');
      setActiveTab('verktoy');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      return;
    }

    // Allow navigation for all in preview mode
    setActiveTab(tabId);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  const addMilestone = (title: string) => {
    const newMilestone = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`,
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
    // Sync handled by Firestore
  }, [milestones]);

  const [literatureSubTab, setLiteratureSubTab] = useState<'reference-guide' | 'literature' | 'apa' | 'citations'>('reference-guide');
  const [methodSubTab, setMethodSubTab] = useState<'methodology' | 'ethics'>('methodology');

  const [isAiChecking, setIsAiChecking] = useState(false);

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
  const [sensorInput, setSensorInput] = useState(() => localStorage.getItem('dmmh_sensor_input') || '');
  const [sensorFile, setSensorFile] = useState<File | null>(null);
  const [sensorOption, setSensorOption] = useState<'evaluation' | 'feedback'>('evaluation');
  const [sensorUploadMode, setSensorUploadMode] = useState<'text' | 'file'>('file');
  const [teacherFeedback, setTeacherFeedback] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState('');
  const [apaInput, setApaInput] = useState('');
  const [apaResult, setApaResult] = useState<any>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const [plagiarismResult, setPlagiarismResult] = useState('');
  const [isCheckingPlagiarism, setIsCheckingPlagiarism] = useState(false);
  const [plagiarismError, setPlagiarismError] = useState<string | null>(null);
  const [isLoadingRemoteData, setIsLoadingRemoteData] = useState(false);

  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [pdfText, setPdfText] = useState('');
  const [pdfAnalysis, setPdfAnalysis] = useState<string | null>(null);
  const [multiPdfAnalysis, setMultiPdfAnalysis] = useState<string | null>(null);
  const [multiPdfQuery, setMultiPdfQuery] = useState('');
  const [deepPdfAnalysis, setDeepPdfAnalysis] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isMultiPdfLoading, setIsMultiPdfLoading] = useState(false);

  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const [sharedSources, setSharedSources] = useState<any[]>([]);
  const [sharedNotes, setSharedNotes] = useState('');

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('dmmh_notifications_enabled');
    return saved ? JSON.parse(saved) : true;
  });
  const [activeNotification, setActiveNotification] = useState<{ user: string; content: string } | null>(null);

  // Pomodoro Timer State
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');

  // Citation Vault State
  const [citations, setCitations] = useState<{ id: string; text: string; source: string; date: string }[]>(() => {
    const saved = localStorage.getItem('dmmh_citations');
    return saved ? JSON.parse(saved) : [];
  });

  const [literatureTopic, setLiteratureTopic] = useState('');
  const [literatureResult, setLiteratureResult] = useState('');
  const [literatureError, setLiteratureError] = useState('');

  // Devil's Advocate State
  const [isDevilAdvocate, setIsDevilAdvocate] = useState(false);



  // Settings State
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('dmmh_settings');
    return saved ? JSON.parse(saved) : {
      showTimerInHeader: false,
      showDeadlineInHeader: false,
      preferredLanguage: 'Bokmål',
      studiested: ''
    };
  });

  // Sync handled by Firestore
  /*
  useEffect(() => {
    localStorage.setItem('dmmh_settings', JSON.stringify(settings));
  }, [settings]);
  */

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
  const [methodologyDesign, setMethodologyDesign] = useState('');
  const [methodologyProblem, setMethodologyProblem] = useState('');
  const [methodologyTool, setMethodologyTool] = useState('');
  const [methodologyPhase, setMethodologyPhase] = useState('');
  const [customMethod, setCustomMethod] = useState('');
  const [methodologyResult, setMethodologyResult] = useState('');
  
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

  // Sync handled by Firestore
  /*
  useEffect(() => { localStorage.setItem('dmmh_is_group_work', isGroupWork.toString()); }, [isGroupWork]);
  useEffect(() => { localStorage.setItem('dmmh_self_selected_lit', selfSelectedLitPages); }, [selfSelectedLitPages]);
  */

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
      { id: 'sc8', text: 'Akademiske standarder: Er oppsettet i tråd med kravene i din utdanningsinstitusjons håndbok for oppgaveskriving?', checked: false },
      { id: 'sc9', text: 'Undersøkbarhet: Er problemstillingen avgrenset og støttet av tydelige forskningsspørsmål?', checked: false },
      { id: 'sc10', text: 'Styringsdokumenter: Er funnene forankret i Barnehageloven og/eller Rammeplanen?', checked: false },
      { id: 'sc11', text: 'Forskningsetikk: Viser teksten at praksiserfaringer er behandlet på en etisk forsvarlig måte?', checked: false },
      { id: 'sc12', text: 'Litteraturkrav & Parafrasering: Er kravene til selvvalgt litteratur møtt og parafrasert korrekt?', checked: false }
    ];
  });
  const [selectedReferenceStyle, setSelectedReferenceStyle] = useState(() => localStorage.getItem('dmmh_ref_style') || 'APA 7');

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
  }, [selectedTheme]);

  // Refs for dirty checking to minimize Firestore writes
  const lastSavedMainRef = useRef<string>("");
  const lastSavedProjectRef = useRef<string>("");
  const lastSavedDocumentRef = useRef<string>("");
  const lastSavedChatRef = useRef<string>("");
  const lastCloudSyncRef = useRef<number>(0);
  const cloudSyncInProgressRef = useRef<boolean>(false);
  const pendingChangesRef = useRef<boolean>(false);

  const handleLocalSave = () => {
    // LocalStorage is fast, so we update it on every change
    localStorage.setItem('blu_documents_guest', JSON.stringify(documents));
    localStorage.setItem('blu_bachelor_document_guest', JSON.stringify(bachelorDocument));
    localStorage.setItem('blu_folders_guest', JSON.stringify(folders));
    localStorage.setItem('blu_active_document_id_guest', activeDocumentId || '');
    localStorage.setItem('dmmh_outline', JSON.stringify(outline));
    localStorage.setItem('dmmh_milestones', JSON.stringify(milestones));
    localStorage.setItem('dmmh_progress', JSON.stringify(progress));
    localStorage.setItem('dmmh_checklist', JSON.stringify(checklist));
    localStorage.setItem('dmmh_draft_deadline', draftDeadline);
    localStorage.setItem('dmmh_final_deadline', finalDeadline);
    localStorage.setItem('dmmh_word_goal', wordCountGoal.toString());
    localStorage.setItem('dmmh_is_group_work', isGroupWork.toString());
    localStorage.setItem('dmmh_self_selected_lit', selfSelectedLitPages);
    localStorage.setItem('dmmh_criteria_raw', assessmentCriteriaRaw);
    localStorage.setItem('dmmh_criteria_list', JSON.stringify(assessmentCriteriaList));
    localStorage.setItem('dmmh_standard_criteria', JSON.stringify(standardCriteria));
    localStorage.setItem('dmmh_ref_style', selectedReferenceStyle);
    localStorage.setItem('dmmh_onboarding_complete', onboardingComplete.toString());
    localStorage.setItem('dmmh_low_stress_mode', lowStressMode.toString());
    localStorage.setItem('dmmh_chat_messages', JSON.stringify(messages));
    
    pendingChangesRef.current = true;
    setLastSaved(new Date());
  };

  const handleSaveAll = async (force: boolean = false) => {
    if (!isRestored.current || !user) {
      setIsSyncing(false);
      return;
    }

    // Check quota first
    if (isQuotaExceeded && !force) {
      setIsSyncing(false);
      return;
    }
    
    // Prepare data strings for dirty checking
    const mainDataStr = JSON.stringify({
      pricingTier, profile, notificationSettings, documents, folders, 
      settings, theme: selectedTheme, notificationsEnabled, 
      onboardingComplete, hasCompletedOnboarding, pedagogicalProfile, lowStressMode, activeTab, writingStep, 
      selectedReferenceStyle, aiTerms, searchCounts
    });
    
    const projectDataStr = JSON.stringify({
      milestones, progress, checklist, outline, draftDeadline, 
      finalDeadline, wordCountGoal, isGroupWork, selfSelectedLitPages, 
      structureInput, sensorInput, assessmentCriteriaRaw, standardCriteria,
      assessmentCriteriaList
    });
    
    const docDataStr = JSON.stringify({
      bachelorDocument, activeDisposition
    });
    
    const chatDataStr = JSON.stringify({
      messages, citations
    });
    
    // Check what actually changed
    const mainChanged = mainDataStr !== lastSavedMainRef.current;
    const projectChanged = projectDataStr !== lastSavedProjectRef.current;
    const docChanged = docDataStr !== lastSavedDocumentRef.current;
    const chatChanged = chatDataStr !== lastSavedChatRef.current;

    const anyChanges = mainChanged || projectChanged || docChanged || chatChanged;

    if (!anyChanges) {
      pendingChangesRef.current = false;
      setIsSyncing(false);
      lastCloudSyncRef.current = Date.now();
      setLastCloudSyncTime(Date.now());
      return;
    }

    if (cloudSyncInProgressRef.current) {
      setIsSyncing(false);
      return;
    }
    
    cloudSyncInProgressRef.current = true;
    setIsSaving(true);

    try {
      // Timeout promise
      const TIMEOUT_MS = 15000; // 15 seconds
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS)
      );

      const batchWrites = [];

      if (mainChanged) {
        batchWrites.push(setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email || 'unknown@example.com',
          profile, notificationSettings, documents, folders, 
          settings, theme: selectedTheme, notificationsEnabled, 
          onboardingComplete, hasCompletedOnboarding, pedagogicalProfile, lowStressMode, activeTab, writingStep, 
          selectedReferenceStyle, aiTerms, searchCounts,
          updatedAt: serverTimestamp()
        }, { merge: true }).then(() => { lastSavedMainRef.current = mainDataStr; }));
      }

      if (projectChanged) {
        batchWrites.push(setDoc(doc(db, 'users', user.uid, 'projects', 'main'), {
          userId: user.uid, milestones, progress, checklist, outline, 
          draftDeadline, finalDeadline, wordCountGoal, isGroupWork, 
          selfSelectedLitPages, structureInput, sensorInput, 
          assessmentCriteriaRaw, assessmentCriteriaList, standardCriteria,
          updatedAt: serverTimestamp()
        }, { merge: true }).then(() => { lastSavedProjectRef.current = projectDataStr; }));
      }

      if (docChanged) {
        batchWrites.push(setDoc(doc(db, 'users', user.uid, 'documents', 'main'), {
          userId: user.uid, title: 'Hoveddokument', content: bachelorDocument,
          activeDisposition, updatedAt: serverTimestamp()
        }, { merge: true }).then(() => { lastSavedDocumentRef.current = docDataStr; }));
      }

      if (chatChanged) {
        batchWrites.push(setDoc(doc(db, 'users', user.uid, 'chatHistory', 'main'), {
          messages, citations,
          updatedAt: serverTimestamp()
        }, { merge: true }).then(() => { lastSavedChatRef.current = chatDataStr; }));
      }

      // Race against timeout
      await Promise.race([
        Promise.all(batchWrites),
        timeoutPromise
      ]);

      lastCloudSyncRef.current = Date.now();
      setLastCloudSyncTime(Date.now());
      pendingChangesRef.current = false;
      setLastSaved(new Date());
    } catch (error: any) {
      if (error.message === 'TIMEOUT') {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: '⚠️ Synkroniseringen tar uvanlig lang tid. Dette skyldes mest sannsynlig at dagskvoten for skylagring er brukt opp. Endringene dine er trygt lagret i nettleseren din i mellomtiden.' 
        }]);
      } else {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/tiered-sync`);
      }
    } finally {
      setIsSaving(false);
      setIsSyncing(false);
      cloudSyncInProgressRef.current = false;
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await handleSaveAll(true);
    } finally {
      setIsSyncing(false);
    }
  };

  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleDebouncedSave = () => {
    // Local save immediately to keep localStorage fresh
    handleLocalSave();
    
    // Debounce cloud save (setDoc) to avoid quota issues
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(async () => {
      if (cloudSyncInProgressRef.current) return;
      await handleSaveAll();
    }, 2000);
  };




  /* Large watch-all effect removed to prevent infinite loops and quotas exhaustion. Auto-save is triggered manually via debounced handlers now. */

  // Removed redundant 60s interval to prevent overlap with the debounced sync
  



  // Scroll to top on tab change for all devices and views
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // A small RAF to catch any DOM layout shifts
    const rafId = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });

    return () => cancelAnimationFrame(rafId);
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

  const handleSaveProfile = async () => {
    if (!user) {
      setGlobalError("Du må være logget inn for å lagre profilen i skyen. Vennligst logg inn på nytt.");
      return;
    }

    if (isQuotaExceeded) {
      setGlobalError("Du kan ikke lagre profilen nå fordi databasen har nådd dagskvoten. Men slapp av, alt er lagret lokalt!");
      return;
    }

    setIsSavingProfile(true);
    try {
      // Sørg for at alle felter er inkludert
      const profileData = {
        name: profile.name || '',
        email: profile.email || '',
        studentId: profile.studentId || '',
        candidateId: profile.candidateId || '',
        year: profile.year || '',
        specialization: profile.specialization || '',
        studyProgram: profile.studyProgram || '',
        studyModel: profile.studyModel || '',
        courses: profile.courses || '',
        deadline: profile.deadline || '',
        college: profile.college || '',
        updatedAt: Timestamp.now()
      };

      await setDoc(doc(db, 'users', user.uid), { 
        uid: user.uid,
        email: user.email || profile.email || 'unknown@example.com',
        profile: profileData 
      }, { merge: true });
      
      setGlobalSuccess("Profilen din er nå lagret i skyen!");
    } catch (error: any) {
      console.error("Firestore Save Error (Profile):", error);
      setGlobalError(`Kunne ikke lagre profilen: ${error.message || 'Mangler forbindelse eller tilgang.'}`);
    } finally {
      setTimeout(() => setIsSavingProfile(false), 500);
    }
  };

  const handlePlagiarismCheck = async () => {
    if (!user) {
      alert("Du må være innlogget med et aktivt abonnement for å bruke denne funksjonen.");
      return;
    }
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
    if (!user) {
      alert("Du må være innlogget med et aktivt abonnement for å bruke denne funksjonen.");
      return;
    }
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => 
      f.type === 'application/pdf' || 
      f.name.toLowerCase().endsWith('.pdf') || 
      f.name.toLowerCase().endsWith('.docx')
    );
    if (files.length === 0) return;

    const oversized = files.filter(f => f.size > 10 * 1024 * 1024);
    if (oversized.length > 0) {
      setGlobalError(`Følgende filer er for store: ${oversized.map(f => f.name).join(', ')}. Maksimal filstørrelse er 10 MB.`);
      return;
    }
    
    const isYearly = pricingTier === 'semester' || pricingTier === 'yearly' || pricingTier === 'preview';
    
    if (!isYearly && validFiles.length > 1) {
      alert("Månedsabonnement støtter kun analyse av ett dokument om gangen. Oppgrader til Årsabonnement for å analysere flere dokumenter samtidig.");
      setPdfFiles([validFiles[0]]);
    } else {
      setPdfFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleMultiPdfAnalysis = async () => {
    if (pdfFiles.length === 0 || isMultiPdfLoading) return;
    
    setIsMultiPdfLoading(true);
    try {
      const texts = await Promise.all(pdfFiles.map(async (file) => {
        let content = '';
        if (file.name.toLowerCase().endsWith('.pdf')) {
          content = await extractTextFromPdf(file);
        } else if (file.name.toLowerCase().endsWith('.docx')) {
          content = await extractTextFromDocx(file);
        }
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
    if (!user) {
      alert("Du må være innlogget med et aktivt abonnement for å bruke denne funksjonen.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setGlobalError("Filen er for stor. Maksimal filstørrelse er 10 MB.");
      return;
    }
    setIsPdfLoading(true);
    try {
      let text = '';
      if (file.name.toLowerCase().endsWith('.pdf')) {
        text = await extractTextFromPdf(file);
      } else if (file.name.toLowerCase().endsWith('.docx')) {
        text = await extractTextFromDocx(file);
      }
      
      if (!text || text.trim().length < 10) {
        throw new Error('Kunne ikke hente ut nok tekst fra dokumentet. Er det skannet som bilde eller tomt?');
      }
      setPdfText(text);
      const analysis = await analyzePdfContent(text);
      setPdfAnalysis(analysis);
    } catch (error: any) {
      console.error(error);
      alert(error.message?.includes('Kunne ikke hente ut nok tekst') 
        ? error.message 
        : 'Oi! Noe gikk galt under analysen av dokumentet. Kan du prøve å laste det opp på nytt?');
    } finally {
      setIsPdfLoading(false);
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
      const mergedProfile = { ...profile, studiested: profile.studiested || settings?.studiested || '' };
      
      // 1. Super-Veilederen (Agentic Router)
      const routeTag = await superAgentRouter(userMessage);

      let response = '';

      if (routeTag === 'SOKRATISK') {
        const historyForSocratic = [...messages, { role: 'user' as const, content: userMessage }];
        response = await askSocraticAgent(historyForSocratic, pedagogicalProfile || mergedProfile);
      } else if (routeTag === 'RAG') {
        response = await askRagAgent(userMessage, messages);
      } else if (routeTag === 'APA') {
        response = await askApaAgent(userMessage);
      } else if (routeTag === 'SPRAK') {
        response = await askLanguageAgent(userMessage);
      } else {
        response = await generateAcademicResponse(userMessage, messages, strictness, mergedProfile, taskSetup);
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response || 'Beklager, jeg kunne ikke generere et svar.',
        agentTag: routeTag
      }]);
    } catch (error: any) {
      console.error("Chat Error:", error);
      let errorMessage = "Det oppstod en teknisk feil ved generering av svar. Vennligst prøv igjen senere.";
      
      const errorStr = JSON.stringify(error).toLowerCase();
      const messageStr = (error?.message || "").toLowerCase();

      if (error?.message && error.message.includes("Akkurat nå er det veldig stor pågang")) {
        errorMessage = error.message;
      } else {
        errorMessage = `[DEBUG API ERROR]: ${error?.message || errorStr}`;
      }
      
      console.error("DEBUG FULL ERROR OBJECT:", error);

      if (messageStr.includes("fetch") || messageStr.includes("network") || messageStr.includes("failed to execute 'fetch'") || errorStr.includes("fetch")) {
        errorMessage = "Det ser ut til at nettleseren din blokkerer forbindelsen til AI-tjenesten. Dette skyldes ofte en utvidelse (som en Ad-blocker). Prøv å deaktivere Ad-blocker for denne siden eller prøv i Inkognito-modus.";
      } else if (errorStr.includes("spending cap") || messageStr.includes("spending cap") || errorStr.includes("quota") || messageStr.includes("quota") || errorStr.includes("429")) {
        errorMessage = "Prosjektet har nådd sin månedlige bruksgrense (spending cap) eller kvote i Google AI Studio. Vennligst sjekk innstillingene dine på ai.studio/spend.";
      }
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: errorMessage,
        agentTag: 'GENERELL'
      }]);
    } finally {
      setIsLoading(false);
    }
  };





  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleEvaluateSource = async () => {
    if (!user) {
      alert("Du må være innlogget med et aktivt abonnement for å bruke denne funksjonen.");
      return;
    }
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
    if (!user) {
      alert("Du må være innlogget med et aktivt abonnement for å bruke denne funksjonen.");
      return;
    }
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
    if (!user) {
      alert("Du må være innlogget med et aktivt abonnement for å bruke denne funksjonen.");
      return;
    }
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
    if (!user) {
      alert("Du må være innlogget med et aktivt abonnement for å bruke denne funksjonen.");
      return;
    }
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
      let errorMessage = error?.message?.includes("Akkurat nå er det veldig stor pågang") ? error.message : "Oisann! Noe gikk galt under analysen. Kan du prøve igjen om litt? Vi heier på deg!";
      
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
    return Object.values(bachelorDocument).join('\n\n').replace(/<[^>]+>/g, '');
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
      id: `criteria-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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



  const scrollNav = (direction: 'left' | 'right') => {
    if (navRef.current) {
      const scrollAmount = 200;
      navRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };



  const handleCreateOutlineFromChat = async () => {
    if (isGeneratingOutline) return;
    
    if (messages.length === 0) {
      alert("Du har ikke snakket med assistenten enda. Ta en prat i verktøy-fanen først, så kan jeg bygge en disposisjon av samtalen vår!");
      return;
    }
    
    // Samle sammen de siste relevante meldingene for å gi Gemini bedre kontekst
    const chatSummary = messages
      .slice(-15) // Henter de siste 15 meldingene for å få med hele den siste faglige diskusjonen
      .map(m => `${m.role === 'user' ? 'Student' : 'Assistent'}: ${m.content}`)
      .join('\n\n');
    
    setIsGeneratingOutline(true);
    try {
      const result = await generateOutlineFromChat(chatSummary);
      if (result.outline && result.outline.length > 0) {
        // Update global outline state
        setOutline(result.outline);
        
        // Ensure bachelorDocument has keys for all new IDs
        const newBachelorDoc: Record<string, string> = { ...bachelorDocument };
        result.outline.forEach((chapter: any) => {
          if (!newBachelorDoc[chapter.id]) newBachelorDoc[chapter.id] = "";
          chapter.subchapters.forEach((sub: any) => {
            if (!newBachelorDoc[sub.id]) newBachelorDoc[sub.id] = "";
          });
        });
        setBachelorDocument(newBachelorDoc);

        // If a document is active, update its specific data too
        if (activeDocumentId) {
          setDocuments(prev => prev.map(doc => 
            doc.id === activeDocumentId 
              ? { ...doc, outline: result.outline, type: result.assignmentType, content: newBachelorDoc, updatedAt: new Date().toISOString() }
              : doc
          ));
        }
        
        // Switch to writing workshop if not already there
        setActiveTab('writing-workshop');
      }
    } catch (error: any) {
      console.error("Outline Generation Error:", error);
      alert(`Kunne ikke generere disposisjon: ${error.message || 'Prøv igjen senere.'}`);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleUploadAssignment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      alert("Du må være innlogget med et aktivt abonnement for å bruke denne funksjonen.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      let text = '';
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        text = await extractTextFromPdf(file);
      } else if (file.name.toLowerCase().endsWith('.docx')) {
        text = await extractTextFromDocx(file);
      } else if (file.type.startsWith('image/')) {
        const result = await Tesseract.recognize(file, 'nor', {
          logger: m => console.log(m)
        });
        text = result.data.text;
      } else {
        text = await file.text();
      }

      if (!text || text.trim().length < 10) {
        throw new Error('Kunne ikke hente ut nok tekst fra dokumentet. Er det skannet som bilde eller tomt?');
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
          id: `criteria-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
              id: `criteria-auto-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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


  // Preferences and Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const saved = localStorage.getItem('dmmh_onboarding_complete');
    return saved !== 'true';
  });

  const OnboardingWizard = () => {
    if (!showOnboarding) return null;

    const [onboardingStep, setOnboardingStep] = useState(1);
    const [didacticProfile, setDidacticProfile] = useState<{
      frameworkFocus: string;
      coreValues: string[];
    }>({
      frameworkFocus: '',
      coreValues: []
    });

    const handleSaveAndComplete = async () => {
      // Oppdater lokal profil-state med de nye didaktiske valgene
      const updatedProfile = { ...profile, ...didacticProfile };
      setProfile(updatedProfile);

      // Lagre til Firebase hvis brukeren er logget inn
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid), { 
            uid: user.uid,
            email: user.email || updatedProfile.email || 'unknown@example.com',
            profile: updatedProfile,
            onboardingComplete: true
          }, { merge: true });
        } catch (error) {
          console.error("Feil ved lagring av didaktisk profil:", error);
        }
      }

      setShowOnboarding(false);
      setOnboardingComplete(true);
      localStorage.setItem('dmmh_onboarding_complete', 'true');
    };

    const toggleCoreValue = (value: string) => {
      setDidacticProfile(prev => ({
        ...prev,
        coreValues: prev.coreValues.includes(value)
          ? prev.coreValues.filter(v => v !== value)
          : [...prev.coreValues, value]
      }));
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100"
        >
          {onboardingStep === 1 && (
            <div className="p-10 text-center space-y-6">
              <div className="flex justify-center">
                <div className="bg-primary-light/30 p-6 rounded-[2.5rem] animate-bounce-slow">
                  <Sparkles className="w-12 h-12 text-primary" />
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-black text-slate-900 leading-tight">Velkommen til BLU-Hjelperen! 👋</h2>
                <p className="text-slate-500 leading-relaxed">
                  Før Super-Veilederen kan hjelpe deg med oppgavene dine, må vi stille inn din faglige profil. 
                  Dette sikrer at tilbakemeldingene treffer ditt pedagogiske grunnsyn.
                </p>
              </div>
              <div className="pt-4">
                <button 
                  onClick={() => setOnboardingStep(2)}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary-hover shadow-xl shadow-primary-light transition-all flex items-center justify-center gap-2"
                >
                  Start prinsipp-sjekken <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 2 && (
            <div className="p-10 space-y-6 text-left">
              <div className="flex items-center gap-4 mb-2">
                <div className="bg-primary-light/30 p-3 rounded-2xl">
                  <Brain className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-slate-900">Ditt didaktiske fokus</h2>
              </div>
              
              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">1. Rammeplan-forankring</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={didacticProfile.frameworkFocus}
                  onChange={(e) => setDidacticProfile({...didacticProfile, frameworkFocus: e.target.value})}
                >
                  <option value="">Velg ditt kjerneområde...</option>
                  <option value="Lek og barns medvirkning">Lek og barns medvirkning</option>
                  <option value="Danning og omsorg">Danning og omsorg</option>
                  <option value="Uterom og nærmiljø">Uterom og nærmiljø</option>
                  <option value="Inkludering og mangfold">Inkludering og mangfold</option>
                </select>
              </div>

              <div className="space-y-3 pt-2">
                <label className="block text-sm font-bold text-slate-700">2. Kjerneverdier (velg opptil 3)</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Anerkjennelse', 'Sokratisk dialog', 'Progresjon', 'Livsmestring'].map(value => (
                    <button
                      key={value}
                      onClick={() => toggleCoreValue(value)}
                      className={cn(
                        "p-3 rounded-xl border text-xs font-bold transition-all text-left",
                        didacticProfile.coreValues.includes(value) 
                          ? "bg-primary text-white border-primary shadow-md shadow-primary/20" 
                          : "bg-white border-slate-200 text-slate-600 hover:border-primary/40"
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6">
                <button 
                  onClick={handleSaveAndComplete}
                  disabled={!didacticProfile.frameworkFocus || didacticProfile.coreValues.length === 0}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" /> Fullfør profil
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  };

  useEffect(() => {
    // Sync handled by Firestore
  }, [pricingTier]);

  // Admin / Premium override effect
  useEffect(() => {
    const isPremiumUser = isUnlimitedUser(user?.email || profile.email);

    if (isPremiumUser && pricingTier !== 'semester') {
      setPricingTier('semester');
    }
  }, [user?.email, profile.email, pricingTier]);

  // Security Redirect Effect for Admin/System
  useEffect(() => {
    const isAdmin = isAdminUser(user?.email || profile.email);
    const path = window.location.pathname.toLowerCase();
    
    // Check if user is in unauthorized state for Admin access
    if (!isAdmin && (activeTab === 'admin' || path.includes('/admin') || path.includes('/system'))) {
      setActiveTab('home');
      if (path.includes('/admin') || path.includes('/system')) {
        window.history.replaceState({}, document.title, '/');
      }
    }
  }, [activeTab, user?.email, profile.email]);

  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  // Handle return from Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const planId = params.get('plan_id');

    if (success === 'true' && planId) {
      setIsVerifyingPayment(true);
      
      // In a production app with a backend, you would verify the session_id here
      // For this client-side implementation, we wait for the return signal
      setTimeout(() => {
        setPricingTier(planId as any);
        if (user) {
          setDoc(doc(db, 'users', user.uid), { uid: user.uid, email: user.email || 'unknown@example.com', pricingTier: planId }, { merge: true }).catch(console.error);
        }
        setCheckoutSuccess(true);
        setIsVerifyingPayment(false);
        
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
        setTimeout(() => setCheckoutSuccess(false), 5000);
      }, 1500);
    }
  }, [user]);

  const handleCheckout = (plan: any) => {
    if (plan.id === 'free') {
      setPricingTier('free');
      if (user) {
        setDoc(doc(db, 'users', user.uid), { uid: user.uid, email: user.email || 'unknown@example.com', pricingTier: 'free' }, { merge: true }).catch(console.error);
      }
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
    if (user) {
      setDoc(doc(db, 'users', user.uid), { uid: user.uid, email: user.email || 'unknown@example.com', pricingTier: 'free' }, { merge: true }).catch(console.error);
    }
    setShowCancelModal(false);
    setCheckoutSuccess(true);
    setTimeout(() => setCheckoutSuccess(false), 5000);
  };

  const pricingModels = [
    { 
      id: 'free', 
      name: 'Gratis', 
      price: '0,-', 
      period: '/mnd', 
      features: [
        'Enkle AI-verktøy og oppslagsverk', 
        'Kan delta i Basen via invitasjonslenke', 
        'Delte Flashcards for eksamen',
        'Enkel strukturanalyse i Dokumentanalyse',
        '1 aktivt dokument & 1 arkivfil'
      ] 
    },
    { 
      id: 'monthly', 
      name: 'Premium Måned', 
      price: '129,-', 
      period: '/mnd', 
      stripeUrl: 'https://buy.stripe.com/28EbIUgz81Cd6KAbuI18c07',
      features: [
        'Standard AI (Gemini Flash)', 
        'Auto-APA 7 kildeformatering', 
        'Maks 1 opprettet gruppe i Basen',
        'Inntil 3 parallelle dokumenter',
        '20 MB filarkiv',
        'Utvidet strukturanalyse'
      ] 
    },
    {
      id: 'preview',
      name: '24-timers Preview',
      price: '0,-',
      period: '/ 24T',
      features: [
        'Ubegrenset tilgang til alle funksjoner',
        'Full tilgang til dypanalyser og Sensor-modulen',
        '100 MB arkivplass for kontekst-filer',
        'Eksklusiv forhåndsvisning'
      ],
      hidden: true
    },
    { 
      id: 'semester', 
      name: 'Semester-pakka', 
      price: '399,-', 
      period: '/ 6 mnd', 
      popular: true,
      mostProfitable: true,
      priorityUpdates: true,
      stripeUrl: 'https://buy.stripe.com/14AeV61EebcNd8YdCQ18c08',
      features: [
        'Alt i Måned, pluss:', 
        'Sensor-modulen: Dyp pedagogisk analyse & kildesjekk',
        'Visuell innholdsgenerator / Imagen 3',
        'Presentasjons-generator (NotebookLM-logikk)',
        'Ubegrenset antall grupper i Basen',
        'Ubegrenset antall dokumenter og mapper',
        '100 MB filarkiv & prioritert AI-kø',
        'Spar 48 % (Kun 66,-/mnd)'
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
    if (outline && outline.length > 0) {
      outline.forEach(chapter => {
        const text = bachelorDocument[chapter.id] || '';
        total += text.replace(/<[^>]+>/g, '').trim().split(/\s+/).filter(w => w.length > 0).length;
        chapter.subchapters.forEach(sub => {
           const subText = bachelorDocument[sub.id] || '';
           total += subText.replace(/<[^>]+>/g, '').trim().split(/\s+/).filter(w => w.length > 0).length;
        });
      });
    } else {
      const text = Object.values(bachelorDocument).join('\n\n');
      total = text.replace(/<[^>]+>/g, '').trim().split(/\s+/).filter(w => w.length > 0).length;
    }
    return total;
  };

  const exportToWord = async () => {
    
    const children = [
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
        text: profile.studiested || profile.college || 'Dronning Mauds Minne Høgskole', 
        alignment: AlignmentType.CENTER 
      }),
      new Paragraph({ 
        text: new Date().toLocaleDateString('no-NO'), 
        alignment: AlignmentType.CENTER 
      }),
      new Paragraph({ text: '', pageBreakBefore: true }),
    ];

    // Innhold med riktig linjeavstand (1.5 for APA 7)
    outline.forEach((chapter, idx) => {
      children.push(new Paragraph({ 
        text: `${idx + 1}. ${chapter.title}`, 
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }));
      
      const chapterText = (bachelorDocument[chapter.id] || 'Ingen tekst lagt til.').replace(/<[^>]+>/g, '');
      chapterText.split('\n').filter(l => l.trim().length > 0).forEach(line => {
        children.push(new Paragraph({ 
          text: line.trim(), 
          spacing: { line: 360, after: 200 }, // 360 = 1.5 linjeavstand
          alignment: AlignmentType.JUSTIFIED
        }));
      });
      
      chapter.subchapters.forEach((sub, sIdx) => {
        children.push(new Paragraph({ 
          text: `${idx + 1}.${sIdx + 1} ${sub.title}`, 
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 }
        }));
        const subText = (bachelorDocument[sub.id] || 'Ingen tekst lagt til.').replace(/<[^>]+>/g, '');
        subText.split('\n').filter(l => l.trim().length > 0).forEach(line => {
          children.push(new Paragraph({ 
            text: line.trim(), 
            spacing: { line: 360, after: 200 },
            alignment: AlignmentType.JUSTIFIED
          }));
        });
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
    
    const addText = (title: string, content: string, level = 1) => {
      doc.setFontSize(level === 1 ? 16 : 14);
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(title, margin, y);
      y += 10;
      doc.setFontSize(12);
      const plainText = (content || 'Ingen tekst lagt til.').replace(/<[^>]+>/g, '');
      const splitText = doc.splitTextToSize(plainText, pageWidth - margin * 2);
      
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

    doc.save(`${activeDocument?.title || 'Oppgave'}_${profile.name || 'dokument'}.pdf`);
  };



  const handleGetLiterature = async () => {
    if (!user) {
      alert("Du må være innlogget med et aktivt abonnement for å bruke denne funksjonen.");
      return;
    }
    if (!literatureTopic.trim() || isLiteratureLoading) return;
    setIsLiteratureLoading(true);
    setLiteratureError('');
    try {
      const mergedProfile = { ...profile, studiested: profile.studiested || settings?.studiested || '' };
      const result = await getLiteratureSuggestions(mergedProfile, literatureTopic);
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
    if (!user) {
      alert("Du må være innlogget med et aktivt abonnement for å bruke denne funksjonen.");
      return;
    }
    const hasInput = sensorFile || (sensorUploadMode === 'text' && sensorInput.trim().length > 0);
    if (!hasInput || isEvaluating) return;
    if (sensorOption === 'feedback' && !teacherFeedback.trim()) return;
    
    setIsEvaluating(true);
    try {
      let text = sensorUploadMode === 'text' ? sensorInput.trim() : '';
      
      if (sensorUploadMode === 'file' && sensorFile) {
        let extracted = '';
        if (sensorFile.type === 'application/pdf' || sensorFile.name.toLowerCase().endsWith('.pdf')) {
          extracted = await extractTextFromPdf(sensorFile);
        } else if (sensorFile.name.toLowerCase().endsWith('.docx')) {
          extracted = await extractTextFromDocx(sensorFile);
        } else {
          // Fallback to text reader for generic files
          extracted = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsText(sensorFile);
          });
        }
        
        if (!extracted || extracted.trim().length < 10) {
          throw new Error('Kunne ikke hente ut nok tekst fra filen. Er den skannet som bilde eller tom?');
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
        alert("Månedsabonnement er begrenset til 2000 ord per analyse. Teksten din har blitt forkortet. Oppgrader til Årsabonnement for å analysere hele dokumenter opptil 13 000 ord.");
      } else if (isYearly && wordCount > 13000) {
        text = text.split(/\s+/).slice(0, 13000).join(' ');
        alert("Maksgrensen for analyse er 13 000 ord. Teksten din har blitt forkortet til denne grensen.");
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

      const sensorPrompt = `Du er BLU-Hjelperen sin erfarne, rettferdige og analytiske "Sensor og Skrivecoach". Din absolutte rettesnor er nasjonale retningslinjer for oppgaveskriving i barnehagelærerutdanningen (BLU).

--- NASJONALE VURDERINGSKRITERIER OG KRAV FOR BLU ---
Oppgaven vurderes etter karakterskala A-F på bakgrunn av følgende læringsutbytter og krav:

1. Kunnskap og Teoriforståelse:
- Har kandidaten grunnleggende kunnskap om vitenskapsteori, forskningsmetoder og forskningsetikk?
- Viser oppgaven innsikt i relevante teoretiske perspektiver knyttet til problemfeltet?
- Viser kandidaten bred kunnskap om barnehagens samfunnsmandat, verdigrunnlag og barns rettigheter/danning?

2. Drøfting og Analyse (Ferdigheter):
- Er problemstillingen tydelig formulert og besvart gjennom hele oppgaven?
- Klarer kandidaten å analysere og drøfte eget datamateriale/empiri (eller praksisfortellinger) opp mot den valgte teorien og problemstillingen?
- Viser kandidaten evne til kritisk refleksjon, spesielt rundt profesjonsetiske utfordringer og egen rolle som barnehagelærer?

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
      let errorMessage = error?.message?.includes("Akkurat nå er det veldig stor pågang") ? error.message : 'Oi! Noe gikk galt under analysen. Kan du prøve igjen? ';
      
      const errorStr = JSON.stringify(error).toLowerCase();
      const messageStr = (error?.message || "").toLowerCase();

      if (messageStr.includes('kunne ikke hente ut nok tekst')) {
        errorMessage = error.message;
      } else if (messageStr.includes('api key')) {
        errorMessage = 'Tjenesten har problemer med tilkoblingen til AI-motoren. Vennligst prøv igjen senere.';
        console.error("ADMIN-INFO: GEMINI_API_KEY mangler i handleAnalyze.");
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
    if (!user) {
      alert("Du må være innlogget med et aktivt abonnement for å bruke denne funksjonen.");
      return;
    }
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
    if (!user) {
      alert("Du må være innlogget med et aktivt abonnement for å bruke denne funksjonen.");
      return;
    }
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



  const addChapter = () => {
    if (!user) {
      alert("Du må være innlogget med et aktivt abonnement for å bruke denne funksjonen.");
      return;
    }
    const newId = Math.random().toString(36).substr(2, 9);
    setOutline([...outline, { id: newId, title: 'Nytt kapittel', subchapters: [] }]);
  };

  const deleteChapter = (id: string) => {
    if (!user) {
      alert("Du må være innlogget med et aktivt abonnement for å bruke denne funksjonen.");
      return;
    }
    setOutline(outline.filter(c => c.id !== id));
  };



  const applyTemplate = (templateId: string) => {
    if (!user) {
      alert("Du må være innlogget med et aktivt abonnement for å bruke denne funksjonen.");
      return;
    }
    const template = assignmentTemplates.find(t => t.id === templateId);
    if (!template) return;

    let chapters = template.chapters.map((c, i) => ({
      id: `template-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 5)}`,
      title: c.title,
      subchapters: c.subchapters.map((s, j) => ({
        id: `template-${i}-${j}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 5)}`,
        title: s
      }))
    }));

    // Set active disposition for Skriveverksted
    if (DISPOSITIONS[template.title]) {
      setActiveDisposition(DISPOSITIONS[template.title]);
    } else if (templateId === 'egendefinert') {
      setActiveDisposition([]);
    }

    setDocuments(prev => prev.map(d => d.id === activeDocumentId ? { 
      ...d, 
      type: template.title,
      outline: chapters, 
      updatedAt: new Date().toISOString() 
    } : d));
    
    setOutline(chapters);
    setSelectedTemplateId(templateId);

    // Special logic for Pedagogisk planlegging og vurdering
    if (templateId === 'pedagogisk-planlegging' && taskSetup.instructions.toLowerCase().includes('overgang barnehage-skole')) {
      const vurderingChapter = chapters.find(c => c.title === 'Vurdering');
      if (vurderingChapter) {
        vurderingChapter.subchapters.push(
          { id: `special-1-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 5)}`, title: 'Barnets perspektiv' },
          { id: `special-2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 5)}`, title: 'Sammenheng og kontinuitet' },
          { id: `special-3-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 5)}`, title: 'Samarbeid med skolen' }
        );
      }
    }
  };

  const addSubchapter = (chapterId: string) => {
    if (!user) {
      alert("Du må være innlogget med et aktivt abonnement for å bruke denne funksjonen.");
      return;
    }
    const newId = Math.random().toString(36).substr(2, 9);
    setOutline(outline.map(c => c.id === chapterId ? { ...c, subchapters: [...c.subchapters, { id: newId, title: 'Nytt underkapittel' }] } : c));
  };

  const deleteSubchapter = (chapterId: string, subId: string) => {
    if (!user) {
      alert("Du må være innlogget med et aktivt abonnement for å bruke denne funksjonen.");
      return;
    }
    setOutline(outline.map(c => c.id === chapterId ? { ...c, subchapters: c.subchapters.filter(s => s.id !== subId) } : c));
  };





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
      if ((activeTab === 'glossary-auto' || activeTab === 'dictionary') && searchQuery.length > 2 && filteredGlossary.length === 0 && !isAiDefining) {
        handleGlossarySearch();
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [searchQuery, filteredGlossary.length, activeTab, isAiDefining]);



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



  // Authentication logic
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      
      if (!currentUser) {
        isRestored.current = true;
        // Clear state on logout
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
          deadline: '',
          college: ''
        });
        setDocuments([]);
        setFolders([]);
        setMessages([
          { role: 'assistant', content: 'Hei! Jeg er din akademiske assistent for barnehagelærerstudiet. Hvordan kan jeg hjelpe deg i dag? Du kan spørre om alt fra problemstilling til kildekritikk.' }
        ]);
        setBachelorDocument({});
        setOutline([]);
        setProgress([{ id: '1', title: 'Problemstilling', status: 'not-started' }]); // Use correct initial structure
        setMilestones([]);
        setChecklist([]);
        setOnboardingComplete(false);
        setHasCompletedOnboarding(false);
        setPedagogicalProfile(null);
        setShowWelcomeGuide(false);
        setLowStressMode(false);
        setPricingTier('free');
        isRestored.current = false; // VIKTIG: Nullstill restaurerings-flagget ved utlogging
      }
    });
    return () => unsubscribe();
  }, []);



  // Sync data to Firestore on changes
  // Real-time profil-synkronisering fra Firestore
  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.profile) {
            setProfile(prev => {
              // Bare oppdater hvis det faktisk er endringer for å unngå unødvendige re-renders
              if (JSON.stringify(prev) !== JSON.stringify(data.profile)) {
                return data.profile;
              }
              return prev;
            });
          }
          if (data.hasCompletedOnboarding !== undefined) {
            setHasCompletedOnboarding(data.hasCompletedOnboarding);
            if (data.hasCompletedOnboarding) {
              setShowWelcomeGuide(false);
            }
          }
          if (data.pedagogicalProfile) {
            setPedagogicalProfile(data.pedagogicalProfile);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Sørg for at data er lastet når profil-fanen aktiveres
  useEffect(() => {
    if ((activeTab === 'profile' || activeTab === 'settings' || activeTab === 'about') && user) {
      const refreshProfile = async () => {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const data = snap.data();
            if (data.profile) {
              setProfile(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(data.profile)) {
                  return data.profile;
                }
                return prev;
              });
            }
          }
        } catch (error) {
          console.error("Error refreshing profile on tab mount:", error);
        }
      };
      refreshProfile();
    }
  }, [activeTab, user]);

  // handleSaveAll definition and effects moved to the end of state declarations
  const dummyEffect = () => {};
  useEffect(dummyEffect, []);

  // Restore data from Firestore on login
  const fetchUserData = async (uid: string) => {
    setIsLoadingRemoteData(true);
    try {
      let mainData = {
        pricingTier, profile, notificationSettings, documents, folders, 
        settings, theme: selectedTheme, notificationsEnabled, 
        onboardingComplete, hasCompletedOnboarding, pedagogicalProfile, lowStressMode, activeTab, writingStep, 
        selectedReferenceStyle, aiTerms, searchCounts
      };
      
      let projectData = {
        milestones, progress, checklist, outline, draftDeadline, 
        finalDeadline, wordCountGoal, isGroupWork, selfSelectedLitPages, 
        structureInput, sensorInput, assessmentCriteriaRaw, standardCriteria,
        assessmentCriteriaList
      };
      
      let docData = {
        bachelorDocument, activeDisposition
      };
      
      let chatData = {
        messages, groupMessages, citations, sharedSources, sharedNotes
      };

      // Timeout promise for fetch
      const TIMEOUT_MS = 10000; // 10 seconds for initial fetch
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS)
      );

      const fetchDataWork = async () => {
        // 1. User & Main data
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.pricingTier) { setPricingTier(data.pricingTier); mainData.pricingTier = data.pricingTier; }
          if (data.profile) { setProfile(data.profile); mainData.profile = data.profile; }
          if (data.notificationSettings) { setNotificationSettings(data.notificationSettings); mainData.notificationSettings = data.notificationSettings; }
          if (data.documents) { setDocuments(data.documents); mainData.documents = data.documents; }
          if (data.folders) { setFolders(data.folders); mainData.folders = data.folders; }
          if (data.settings) { setSettings(data.settings); mainData.settings = data.settings; }
          if (data.theme) { setSelectedTheme(data.theme); mainData.theme = data.theme; }
          if (data.notificationsEnabled !== undefined) { setNotificationsEnabled(data.notificationsEnabled); mainData.notificationsEnabled = data.notificationsEnabled; }
          if (data.onboardingComplete !== undefined) { setOnboardingComplete(data.onboardingComplete); mainData.onboardingComplete = data.onboardingComplete; }
          if (data.hasCompletedOnboarding !== undefined) {
            setHasCompletedOnboarding(data.hasCompletedOnboarding);
            mainData.hasCompletedOnboarding = data.hasCompletedOnboarding;
            if (!data.hasCompletedOnboarding) {
              setShowWelcomeGuide(true);
            }
          } else {
            // New student who has not completed onboarding
            setShowWelcomeGuide(true);
          }
          if (data.pedagogicalProfile) {
            setPedagogicalProfile(data.pedagogicalProfile);
            mainData.pedagogicalProfile = data.pedagogicalProfile;
          }
          if (data.lowStressMode !== undefined) { setLowStressMode(data.lowStressMode); mainData.lowStressMode = data.lowStressMode; }
          if (data.activeTab) { setActiveTab(data.activeTab); mainData.activeTab = data.activeTab; }
          if (data.writingStep !== undefined) { setWritingStep(data.writingStep); mainData.writingStep = data.writingStep; }
          if (data.selectedReferenceStyle) { setSelectedReferenceStyle(data.selectedReferenceStyle); mainData.selectedReferenceStyle = data.selectedReferenceStyle; }
          if (data.aiTerms) { setAiTerms(data.aiTerms); mainData.aiTerms = data.aiTerms; }
          if (data.searchCounts) { setSearchCounts(data.searchCounts); mainData.searchCounts = data.searchCounts; }
        } else {
          // Brand new user profile in Firestore
          setShowWelcomeGuide(true);
        }

        // 2. Project data
        const projectSnap = await getDoc(doc(db, 'users', uid, 'projects', 'main'));
        if (projectSnap.exists()) {
          const data = projectSnap.data();
          if (data.milestones) { setMilestones(data.milestones); projectData.milestones = data.milestones; }
          if (data.progress) { setProgress(data.progress); projectData.progress = data.progress; }
          if (data.checklist) { setChecklist(data.checklist); projectData.checklist = data.checklist; }
          if (data.outline) { setOutline(data.outline); projectData.outline = data.outline; }
          if (data.draftDeadline) { setDraftDeadline(data.draftDeadline); projectData.draftDeadline = data.draftDeadline; }
          if (data.finalDeadline) { setFinalDeadline(data.finalDeadline); projectData.finalDeadline = data.finalDeadline; }
          if (data.wordCountGoal) { setWordCountGoal(data.wordCountGoal); projectData.wordCountGoal = data.wordCountGoal; }
          if (data.isGroupWork !== undefined) { setIsGroupWork(data.isGroupWork); projectData.isGroupWork = data.isGroupWork; }
          if (data.selfSelectedLitPages) { setSelfSelectedLitPages(data.selfSelectedLitPages); projectData.selfSelectedLitPages = data.selfSelectedLitPages; }
          if (data.structureInput) { setStructureInput(data.structureInput); projectData.structureInput = data.structureInput; }
          if (data.sensorInput) { setSensorInput(data.sensorInput); projectData.sensorInput = data.sensorInput; }
          if (data.assessmentCriteriaRaw) { setAssessmentCriteriaRaw(data.assessmentCriteriaRaw); projectData.assessmentCriteriaRaw = data.assessmentCriteriaRaw; }
          if (data.assessmentCriteriaList) { setAssessmentCriteriaList(data.assessmentCriteriaList); projectData.assessmentCriteriaList = data.assessmentCriteriaList; }
          if (data.standardCriteria) { setStandardCriteria(data.standardCriteria); projectData.standardCriteria = data.standardCriteria; }
        }

        // 3. Document Content
        const docSnap = await getDoc(doc(db, 'users', uid, 'documents', 'main'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.content) { setBachelorDocument(data.content); docData.bachelorDocument = data.content; }
          if (data.activeDisposition) { setActiveDisposition(data.activeDisposition); docData.activeDisposition = data.activeDisposition; }
        }

        // 4. Chat History
        const chatSnap = await getDoc(doc(db, 'users', uid, 'chatHistory', 'main'));
        if (chatSnap.exists()) {
          const data = chatSnap.data();
          if (data.messages) { setMessages(data.messages); chatData.messages = data.messages; }
          if (data.groupMessages) { setGroupMessages(data.groupMessages); chatData.groupMessages = data.groupMessages; }
          if (data.citations) { setCitations(data.citations); chatData.citations = data.citations; }
          if (data.sharedSources) { setSharedSources(data.sharedSources); chatData.sharedSources = data.sharedSources; }
          if (data.sharedNotes) { setSharedNotes(data.sharedNotes); chatData.sharedNotes = data.sharedNotes; }
        }
      };

      // Race fetch against timeout
      await Promise.race([
        fetchDataWork(),
        timeoutPromise
      ]);

      isRestored.current = true;
      
      // Initialize dirty checking refs with FRESH data to prevent loop
      lastSavedMainRef.current = JSON.stringify(mainData);
      lastSavedProjectRef.current = JSON.stringify(projectData);
      lastSavedDocumentRef.current = JSON.stringify(docData);
      lastSavedChatRef.current = JSON.stringify(chatData);
      
      setLastCloudSyncTime(Date.now());
      lastCloudSyncRef.current = Date.now();
    } catch (error: any) {
      if (error.message === 'TIMEOUT') {
        console.warn("Initial fetch timed out, falling back to local-only mode for now.");
        isRestored.current = true; // Still mark as restored to allow local edits
        setGlobalError("Skylagring er for øyeblikket utilgjengelig (trolig kvotebegrensning). Endringene dine lagres kun lokalt i nettleseren din inntil videre.");
      } else {
        console.error("Error restoring data from Firestore:", error);
      }
    } finally {
      setIsLoadingRemoteData(false);
    }
  };

  useEffect(() => {
    if (user && !isRestored.current) {
      fetchUserData(user.uid);
    }
  }, [user]);

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
      <AnimatePresence>
        {isLoadingRemoteData && (
          <motion.div key="ap-auto-3-1" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-white flex flex-col items-center justify-center p-6 text-center space-y-6"
          >
            <motion.div 
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1]
              }} 
              transition={{ 
                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity }
              }}
              className="bg-primary-light p-6 rounded-[2.5rem]"
            >
              <Sparkles className="w-12 h-12 text-primary" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Synkroniserer ditt arbeid...</h2>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">Vi henter den nyeste versjonen av dine dokumenter og innstillinger fra skyen.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <OnboardingWizard />
      {showWelcomeGuide && user && (
        <WelcomeGuide 
          user={user} 
          onComplete={() => {
            setShowWelcomeGuide(false);
            setHasCompletedOnboarding(true);
            setOnboardingComplete(true);
            localStorage.setItem('dmmh_onboarding_complete', 'true');
          }} 
        />
      )}
      {isQuotaExceeded && (
        <div className="fixed top-0 left-0 right-0 z-[9998] bg-amber-500 text-slate-900 p-2 text-center text-xs font-bold flex items-center justify-center gap-4 shadow-lg border-b border-amber-600">
          <Database className="w-4 h-4" />
          <span>Frakoblet modus: Den daglige lagringskvoten i skyen er nådd. Arbeidet ditt lagres trygt lokalt og synkroniseres automatisk ved neste anledning.</span>
        </div>
      )}
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
          <div key="ap-auto-4-1" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
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
                      {selectedReferenceStyle === 'Akademisk' && "Etternavn, F. M. (År). Tittel i kursiv. Sted: Forlag."}
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
                      {selectedReferenceStyle === 'Akademisk' && "Forfatter/Organisasjon. (År). Tittel i kursiv. Hentet dato fra URL"}
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
          <div key="ap-auto-5-1" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
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
                    <motion.div key="ap-auto-5-2" 
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
                      {['Akademisk fokus', 'Høy grad av egen refleksjon'].map((genre, idx) => (
                        <button
                          key={`genre-${idx}-${genre}`}
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
                  <AiTextRewriter 
                    value={taskSetup.instructions}
                    onChange={(val) => setTaskSetup({...taskSetup, instructions: val})}
                    placeholder="Lim inn oppgaveteksten her..."
                    className="h-32"
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
                    <h4 className="text-sm font-bold text-blue-900 mb-1">Standardoppsett</h4>
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
        isGuest={isGuest}
      />

      {/* Guest Banner */}
      {!user && (
        <div className="bg-primary px-4 py-2 text-center text-white text-xs md:text-sm font-bold shadow-md relative z-[60]">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 md:gap-6">
            <span className="opacity-90">Du ser nå en forhåndsvisning av BLU-Hjelperen. Logg inn for å låse opp alle verktøyene!</span>
            <button 
              onClick={() => setShowAuthModal(true)}
              className="bg-white text-primary px-4 py-1 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all whitespace-nowrap"
            >
              Logg inn / Opprett konto
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={cn(
        "bg-white border-b border-slate-100 sticky top-0 z-50 transition-all duration-300",
        isFocusMode && "opacity-0 -translate-y-full pointer-events-none"
      )}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
    <div className="flex items-center h-16 gap-4 lg:gap-8">
      <div 
        id="app-main-logo"
        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity group shrink-0 p-2 bg-white"
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
        <button 
          onClick={() => scrollNav('left')}
          className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-white via-white/80 to-transparent z-10 flex items-center justify-start hover:scale-110 transition-transform cursor-pointer"
          title="Rull mot venstre"
          aria-label="Rull mot venstre"
        >
          <div className="bg-white p-1 rounded-full shadow-md border border-slate-100 ml-1">
            <ChevronLeft className="w-4 h-4 text-primary" />
          </div>
        </button>
        <nav 
          ref={navRef}
          onScroll={checkScroll}
          className="flex items-center gap-1 lg:gap-2 flex-1 justify-start overflow-x-auto no-scrollbar py-1 px-8 scroll-smooth"
        >
          {navigationGroups.filter(g => !lowStressMode || ['hjem', 'skriving', 'profil'].includes(g.id)).map((group) => (
            <button
              key={`top-nav-btn-${group.id}`}
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
        <button 
          onClick={() => scrollNav('right')}
          className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white via-white/80 to-transparent z-10 flex items-center justify-end hover:scale-110 transition-transform cursor-pointer"
          title="Rull mot høyre"
          aria-label="Rull mot høyre"
        >
          <div className="bg-white p-1 rounded-full shadow-md border border-slate-100 mr-1">
            <ChevronRight className="w-4 h-4 text-primary" />
          </div>
        </button>
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
            <motion.div key="ap-auto-6-1"
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
                    onClick={() => setActiveTab('pricing')}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-primary bg-primary-light border border-primary-light"
                  >
                    Abonnement
                  </button>
                </div>
                {user && (
                  <button key="ap-auto-6-2" 
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
                      (activeTab === sub.id || (activeTab === 'verktoy' && activeSubTab === sub.id) || (activeTab === 'blu-hjelper' && sub.id === 'assistant'))
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
                "flex-1 flex flex-col items-center py-3 px-2 gap-1 transition-all min-w-[72px] relative",
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
                  (activeTab === sub.id || (activeTab === 'verktoy' && activeSubTab === sub.id) || (activeTab === 'blu-hjelper' && sub.id === 'assistant'))
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
          <div key="ap-auto-7-1" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
          <div key="ap-auto-8-1" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
          <motion.button key="ap-auto-9-1"
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
        "flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 pb-[140px] md:pb-8 overflow-x-hidden flex flex-col transition-all duration-500",
        isFocusMode && "max-w-3xl pt-12"
      )}>
        <AnimatePresence mode="wait">
          {activeTab === 'admin' && isAdminUser(user?.email || profile.email) && (
            <AdminComponent key="admin" 
              userEmail={user?.email || profile.email || null} 
              isQuotaExceeded={isQuotaExceeded}
              handleFirestoreError={handleFirestoreError}
            />
          )}

          {activeTab === 'dagens-bilde' && isAdminUser(user?.email || profile.email) && (
            <VisualContentGenerator 
              key="dagens-bilde" 
              pricingTier={pricingTier}
              onUpgrade={() => setActiveTab('pricing')}
            />
          )}

          {activeTab === 'didaktisk-planlegger' && isAdminUser(user?.email || profile.email) && (
            <DidaktiskPlanlegger key="didaktisk-planlegger" />
          )}

          {activeTab === 'home' && (
            <HomeComponent key="home" 
              user={user}
              isGuest={isGuest}
              appName={'BLU-Hjelperen'}
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
              faqData={faqData}
              openFaqIndex={openFaqIndex}
              setOpenFaqIndex={setOpenFaqIndex}
              documents={documents}
              activeDocumentId={activeDocumentId}
              setActiveDocumentId={setActiveDocumentId}
              onGenerateOutlineFromChat={handleCreateOutlineFromChat}
              isGeneratingOutline={isGeneratingOutline}
            />
          )}

          {activeTab === 'assistant' && (
            <Superveileder 
              key="assistant" 
              user={user} 
              didacticProfile={pedagogicalProfile} 
              onSwitchToBlu={() => setActiveTab('blu-hjelper')} 
            />
          )}

          {activeTab === 'blu-hjelper' && (
            <div key="blu-hjelper" className="flex-1 flex flex-col py-2">
              <DesktopDashboardPage 
                user={user} 
                onOpenSettings={() => setActiveTab('settings')} 
                onBackToHome={() => setActiveTab('home')} 
                onSwitchToSuperveileder={() => setActiveTab('assistant')}
              />
            </div>
          )}

          {activeTab === 'collaboration' && (
            <Basen key="collaboration"
              user={user}
              pricingTier={pricingTier}
              setActiveTab={setActiveTab}
            />
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
                        (isLoading || !user || !checkAccess('monthly')) ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
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
                          disabled={isLoading || !user || !checkAccess('monthly')}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Oppgavetekst / Instrukser</label>
                      <button 
                        onClick={() => insertFromChat((val) => setTaskSetup({...taskSetup, instructions: val}))}
                        disabled={!user || !checkAccess('monthly')}
                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                      >
                        <MessageSquare className="w-3 h-3" /> Hent fra chat
                      </button>
                    </div>
                    <AiTextRewriter 
                      value={taskSetup.instructions}
                      onChange={(val) => setTaskSetup({...taskSetup, instructions: val})}
                      placeholder="Lim inn oppgaveteksten her..."
                      className="h-32"
                      disabled={!user || !checkAccess('monthly')}
                    />
                  </div>
                </div>

                {/* 2. Velg akademisk mal */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" /> Velg akademisk mal
                    </h3>
                    <div className="w-full sm:w-64">
                      <select
                        value={selectedTemplateId || ''}
                        onChange={(e) => applyTemplate(e.target.value)}
                        disabled={!user || !checkAccess('monthly')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1.25em] bg-[right_0.5rem_center] bg-no-repeat pr-10"
                      >
                        <option value="" disabled>Velg en mal...</option>
                        {assignmentTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Din disposisjon */}
                {outline.length > 0 && (
                  <motion.div key="ap-auto-10-1" 
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
                        <div key={`chapter-${chapter.id}-${cIndex}`} className="border border-slate-100 rounded-xl overflow-hidden">
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
                            <div key="ap-auto-10-2" className="p-2 pl-10 space-y-1 bg-white">
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

                {/* 4. Rammer for oppgaven */}
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
                        disabled={!user || !checkAccess('monthly')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Arbeidsform</label>
                      <div className="flex items-center gap-4 p-1 bg-slate-50 border border-slate-200 rounded-xl">
                        <button 
                          onClick={() => setIsGroupWork(false)}
                          disabled={!user || !checkAccess('monthly')}
                          className={cn(
                            "flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all",
                            !isGroupWork ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600",
                            (!user || !checkAccess('monthly')) && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          Alene
                        </button>
                        <button 
                          onClick={() => setIsGroupWork(true)}
                          disabled={!user || !checkAccess('monthly')}
                          className={cn(
                            "flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all",
                            isGroupWork ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600",
                            (!user || !checkAccess('monthly')) && "opacity-50 cursor-not-allowed"
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
                        disabled={!user || !checkAccess('monthly')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'super-chat' && (
            <div key="super-chat" className="flex-1 flex flex-col py-2">
              <Superveileder 
                user={user} 
                didacticProfile={pedagogicalProfile} 
                onSwitchToBlu={() => setActiveTab('blu-hjelper')} 
              />
            </div>
          )}

          {(activeTab === 'desktop-dashboard' || activeTab === 'chat') && (
            <div key="desktop-dashboard" className="flex-1 flex flex-col py-2">
              <DesktopDashboardPage 
                user={user} 
                onOpenSettings={() => setActiveTab('settings')} 
                onBackToHome={() => setActiveTab('home')} 
                onSwitchToSuperveileder={() => setActiveTab('assistant')}
              />
            </div>
          )}

          {activeTab === 'prompt-library' && (
            <div key="prompt-library" className="flex-1 flex flex-col py-2">
              <PromptLibrary />
            </div>
          )}

          {activeTab === 'process-log' && (
            <ProcessLog key="process-log" user={user} />
          )}

          {activeTab === 'socratic-partner' && (
            <div key="socratic-partner" className="flex-1 flex flex-col py-6">
              <SuperChat user={user} didacticProfile={pedagogicalProfile} initialMode="SOKRATISK" />
            </div>
          )}

          {activeTab === 'language-bot' && (
            <div key="language-bot" className="flex-1 flex flex-col py-6">
              <LanguageBot />
            </div>
          )}

          {activeTab === 'writing-workshop' && (
            <WritingWorkshop key="writing-workshop" 
              user={user}
              isGuest={isGuest}
              activeTab={activeTab}
              activeDocumentId={activeDocumentId}
              pricingTier={pricingTier}
              documents={documents}
              folders={folders}
              setFolders={setFolders}
              setActiveDocumentId={setActiveDocumentId}
              setActiveTab={setActiveTab}
              createNewDocument={createNewDocument}
              setShowPaywall={setShowPaywall}
              deleteDocument={deleteDocument}
              renameDocument={renameDocument}
              isFullscreen={isFullscreen}
              setIsFullscreen={setIsFullscreen}
              activeDocument={activeDocument}
              calculateWordCount={calculateWordCount}
              wordCountGoal={wordCountGoal}
              exportToWord={exportToWord}
              exportToPdf={exportToPdf}
              outline={outline}
              bachelorDocument={bachelorDocument}
              setBachelorDocument={setBachelorDocument}
              onDebouncedSave={handleDebouncedSave}
              isSaving={isSaving}
              lastSaved={lastSaved}
              onManualSave={handleSaveAll}
            />
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
                    <AiTextRewriter 
                      isGuest={isGuest}
                      value={structureInput}
                      onChange={(val) => setStructureInput(val)}
                      placeholder="Eksempel: Jeg vil skrive om barns medvirkning..."
                      className="h-40"
                    />
                    <button 
                      onClick={handleAnalyzeStructure}
                      disabled={!structureInput.trim() || isAnalyzingStructure || isGuest}
                      className={cn(
                        "mt-4 w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50",
                        (isAnalyzingStructure || isGuest) ? "bg-slate-100 text-slate-400" : "bg-cta text-white hover:bg-cta-hover shadow-lg shadow-cta/20"
                      )}
                    >
                      {isAnalyzingStructure ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Analyserer struktur...</>
                      ) : (
                        <>{isGuest ? '🔒 Logg inn for å bruke' : <><Sparkles className="w-4 h-4" /> Analyser med Gemini Pro</>}</>
                      )}
                    </button>

                    <AnimatePresence>
                      {structureAnalysisSuccess && (
                        <motion.div key="ap-auto-10-3" 
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
                                <p className="font-bold text-slate-900 mb-1">⚠️ Husk retningslinjer for bruk av KI</p>
                                <p className="text-slate-500 leading-relaxed mb-2">Vær åpen om bruk av KI-verktøy og sørg for at alt arbeid er ditt eget.</p>
                                <a 
                                  href="https://sokogskriv.no/kildebruk-og-referering/kunstig-intelligens/" 
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
                                disabled={isAiChecking || !getAllDocumentText().trim() || isGuest}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-cta text-white rounded-lg text-[10px] font-bold hover:bg-cta-hover transition-all disabled:opacity-50 shadow-sm"
                              >
                                {isAiChecking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                {isGuest ? '🔒 Logg inn' : 'Sjekk med AI'}
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
                              <AiTextRewriter 
                                isGuest={isGuest}
                                value={assessmentCriteriaRaw}
                                onChange={(val) => setAssessmentCriteriaRaw(val)}
                                placeholder="Lim inn kriterier fra læreren her (én linje per punkt)..."
                                className="h-32 bg-white"
                                hideSpraakvask={true}
                              />
                              <button 
                                onClick={handleUpdateCriteria}
                                disabled={isGuest}
                                className="w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                {isGuest ? '🔒 Logg inn' : <><RefreshCw className="w-3 h-3" /> Oppdater liste</>}
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
            <DocumentAnalysis key="sensor" />
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
            <div key="pricing" className="flex-1 py-12 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Venter på betalingsportal...</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">Abonnementshåndtering åpnes i et vindu over appen.</p>
                <button 
                  onClick={() => setActiveTab('home')}
                  className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all uppercase tracking-widest"
                >
                  Tilbake til Hjem
                </button>
              </div>
            </div>
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
                  { id: 'reference-guide', label: 'Guider & Verktøy', icon: BookOpen },
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

              {literatureSubTab === 'reference-guide' && (
                <div className="space-y-8 text-slate-900">
                  {/* Header */}
                  <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden border border-white/5">
                    <div className="relative z-10">
                      <h2 className="text-3xl font-serif font-bold mb-3 tracking-tight text-white">Referansehjelperen</h2>
                      <p className="text-slate-300 max-w-2xl leading-relaxed">
                        Her finner du alt du trenger for å mestre akademisk referering. Fra kraftige verktøy som Zotero og EndNote, til nasjonale standarder som sikrer kvaliteten i din oppgave.
                      </p>
                    </div>
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <BookOpen className="w-48 h-48 -rotate-12 text-white" />
                    </div>
                  </div>

                  {/* Guides Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-slate-900 rounded-3xl p-8 border border-white/5 relative overflow-hidden group">
                      <div className="relative z-10">
                        <div className="p-3 bg-white/10 rounded-2xl w-fit mb-6">
                          <Zap className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-serif font-bold text-white mb-4">Zotero</h3>
                        <p className="font-sans text-sm text-slate-300 leading-relaxed mb-6">
                          Zotero er et gratis, åpent verktøy som hjelper deg å samle, organisere, sitere og dele forskning. Det er spesielt godt egnet for studenter som ønsker et brukervennlig grensesnitt og sømløs integrasjon med nettleseren.
                        </p>
                        <ul className="space-y-3 mb-8">
                          {[
                            "Installer Zotero Connector i nettleseren for ett-klikks lagring.",
                            "Organiser kilder i mapper og bruk tagger for bedre oversikt.",
                            "Lag referanselister automatisk i Word eller Google Docs."
                          ].map((item, i) => (
                            <li key={i} className="flex gap-3 text-sm text-slate-300">
                              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                              <span className="text-slate-200">{item}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex items-center justify-between mt-auto">
                          <a href="https://www.zotero.org/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-primary transition-colors">
                            Gå til Zotero.org <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Zap className="w-32 h-32 rotate-12 text-white" />
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-3xl p-8 border border-white/5 relative overflow-hidden group">
                      <div className="relative z-10">
                        <div className="p-3 bg-white/10 rounded-2xl w-fit mb-6">
                          <Library className="w-6 h-6 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-serif font-bold text-white mb-4">EndNote</h3>
                        <p className="font-sans text-sm text-slate-300 leading-relaxed mb-6">
                          EndNote er bransjestandarden for referansehåndtering. Det er et kraftig verktøy som håndterer store mengder referanser og tilbyr avanserte funksjoner for de som skriver omfattende akademiske tekster.
                        </p>
                        <ul className="space-y-3 mb-8">
                          {[
                            "Sjekk om din institusjon tilbyr gratis lisens for studenter.",
                            "Bruk 'Cite While You Write' (CWYW) funksjonen i Microsoft Word.",
                            "Last ned referansestiler direkte fra tidsskriftenes nettsider."
                          ].map((item, i) => (
                            <li key={i} className="flex gap-3 text-sm text-slate-300">
                              <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                              <span className="text-slate-200">{item}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex items-center justify-between mt-auto">
                          <a href="https://endnote.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-indigo-400 transition-colors">
                            Gå til EndNote.com <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Library className="w-32 h-32 rotate-12 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Standards & Links Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden border border-white/5">
                      <div className="relative z-10">
                        <h3 className="text-xl font-serif font-bold mb-4 flex items-center gap-3 text-white">
                          <ShieldCheck className="w-6 h-6 text-emerald-400" />
                          Viktigheten av nasjonale standarder
                        </h3>
                        <div className="space-y-4 text-slate-300 text-sm leading-relaxed font-sans">
                          <p>
                            I Norge er <strong className="text-white font-serif tracking-tight">APA 7</strong> den mest brukte standarden for referansehåndtering i pedagogiske utdanninger. Korrekt bruk av denne standarden er ikke bare et formelt krav, men en essensiell del av akademisk redelighet.
                          </p>
                          <p className="text-white font-medium">
                            Ved å koble Zotero eller EndNote opp mot APA-standarden, sikrer du at:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                            {[
                              "Henvisninger i teksten blir riktige hver gang.",
                              "Litteraturlisten formateres automatisk korrekt.",
                              "Du unngår utilsiktet plagiat og feilkilder.",
                              "Du sparer timevis med manuelt pirkearbeid."
                            ].map((text, i) => (
                              <div key={i} className="flex gap-2 items-start bg-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                                <span className="text-slate-200">{text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 flex flex-col">
                      <h3 className="text-lg font-serif font-bold text-slate-900 mb-6">Raske lenker</h3>
                      <div className="space-y-4 flex-1">
                        {[
                          { name: "Kildekompasset", url: "https://kildekompasset.no/", icon: Compass, color: "text-amber-500", desc: "Alt om kildebruk og APA" },
                          { name: "Søk & Skriv", url: "https://www.sokogskriv.no/", icon: PenTool, color: "text-blue-500", desc: "Akademisk skrivehjelp" },
                          { name: "Oria", url: "https://oria.no/", icon: Search, color: "text-emerald-500", desc: "Finn bøker og artikler" }
                        ].map((link, i) => (
                          <a 
                            key={i} 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
                          >
                            <div className={cn("p-2 rounded-lg bg-slate-50 group-hover:bg-white transition-colors shadow-sm", link.color)}>
                              <link.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-900 leading-none">{link.name} <ExternalLink className="inline-block w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" /></p>
                              <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tight">{link.desc}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                      <AiTextRewriter 
                        value={literatureTopic}
                        onChange={(val) => setLiteratureTopic(val)}
                        placeholder="Beskriv temaet ditt eller lim inn problemstillingen din her..."
                        className="min-h-[120px]"
                        disabled={!user || !checkAccess('monthly')}
                        hideSpraakvask={true}
                      />
                    </div>

                    <button 
                      onClick={handleGetLiterature}
                      disabled={isLiteratureLoading || !literatureTopic.trim() || !user || !checkAccess('monthly')}
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
                <div className="space-y-6">
                  <AutoAPA />
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
                        if (isGuest) return;
                        const text = prompt('Lim inn sitatet her:');
                        const source = prompt('Hva er kilden? (Forfatter, årstall, side):');
                        if (text && source) {
                          setCitations([...citations, { id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`, text, source, date: new Date().toLocaleDateString() }]);
                        }
                      }}
                      disabled={isGuest}
                      className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-hover transition-all flex items-center gap-2 shadow-lg shadow-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGuest ? '🔒 Logg inn' : <><Plus className="w-4 h-4" /> Legg til sitat</>}
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
                      disabled={isGuest}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Velg hoveddesign...</option>
                      <option value="Kvalitativ metode">Kvalitativ metode</option>
                      <option value="Kvantitativ metode">Kvantitativ metode</option>
                      <option value="Litteraturstudie">Litteraturstudie</option>
                    </select>
                    <AiTextRewriter 
                      isGuest={isGuest}
                      value={methodologyProblem}
                      onChange={(val) => setMethodologyProblem(val)}
                      placeholder="Din problemstilling..."
                      className="h-24"
                      hideSpraakvask={true}
                    />
                    <button 
                      onClick={handleGetMethodology}
                      disabled={!methodologyDesign || !methodologyProblem.trim() || isLoading || isGuest}
                      className="w-full bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isGuest ? '🔒 Logg inn for råd' : 'Få metodiske råd')}
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
                          ].map((example, eIdx) => (
                            <li key={`example-${eIdx}-${example.substring(0, 10)}`} className="flex items-start gap-2 text-xs text-slate-600">
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




          {/* Verktøy routing */}
          {activeTab === 'verktoy' && (
            (() => {
              switch (activeSubTab) {
                case 'tools-overview':
                  return (
                    <ToolsDashboard 
                      key="tools-overview"
                      pricingTier={pricingTier}
                      onSelectTool={(toolId) => {
                        if (toolId === 'document-analysis-humanizer' || toolId === 'humanizer') {
                          setDocAnalysisInitialTool('humanizer');
                          setActiveSubTab('document-analysis');
                          setActiveTab('verktoy');
                        } else if (['simulator', 'presentations', 'document-analysis', 'dictionary'].includes(toolId)) {
                          if (toolId === 'document-analysis') {
                            setDocAnalysisInitialTool('sensor');
                          }
                          setActiveSubTab(toolId as any);
                          setActiveTab('verktoy');
                        } else {
                          setActiveTab(toolId as any);
                        }
                      }}
                      onUpgrade={() => setActiveTab('pricing')}
                    />
                  );
                case 'simulator':
                  return (
                    <RoleplaySimulator 
                      key="simulator" 
                      onBackToTools={() => {
                        setActiveSubTab('tools-overview');
                        setActiveTab('verktoy');
                      }}
                    />
                  );
                case 'presentations':
                  return (
                    <PresentationGenerator 
                      key="presentations"
                      pricingTier={pricingTier}
                      onUpgrade={() => setActiveTab('pricing')}
                      documentText={activeDocument?.content ? Object.values(activeDocument.content).filter(Boolean).join('\n\n') : ''}
                      documentTitle={activeDocument?.title}
                      onBackToTools={() => {
                        setActiveSubTab('tools-overview');
                        setActiveTab('verktoy');
                      }}
                    />
                  );
                case 'document-analysis':
                  return (
                    <DocumentAnalysis 
                      key={`document-analysis-${docAnalysisInitialTool}`}
                      pricingTier={pricingTier}
                      userEmail={user?.email || profile.email}
                      onUpgrade={() => setActiveTab('pricing')}
                      initialTool={docAnalysisInitialTool}
                      onBackToTools={() => {
                        setActiveSubTab('tools-overview');
                        setActiveTab('verktoy');
                      }}
                    />
                  );
                case 'dictionary':
                  return (
                    <Encyclopedia 
                      key="dictionary" 
                      onBackToTools={() => {
                        setActiveSubTab('tools-overview');
                        setActiveTab('verktoy');
                      }}
                    />
                  );
                default:
                  return (
                    <ToolsDashboard 
                      key="tools-default"
                      pricingTier={pricingTier}
                      userEmail={user?.email || profile.email}
                      onSelectTool={(toolId) => {
                        if (toolId === 'document-analysis-humanizer' || toolId === 'humanizer') {
                          setDocAnalysisInitialTool('humanizer');
                          setActiveSubTab('document-analysis');
                          setActiveTab('verktoy');
                        } else if (['simulator', 'presentations', 'document-analysis', 'dictionary'].includes(toolId)) {
                          if (toolId === 'document-analysis') {
                            setDocAnalysisInitialTool('sensor');
                          }
                          setActiveSubTab(toolId as any);
                          setActiveTab('verktoy');
                        } else {
                          setActiveTab(toolId as any);
                        }
                      }}
                      onUpgrade={() => setActiveTab('pricing')}
                    />
                  );
              }
            })()
          )}

          {(activeTab === 'tools-overview' || activeTab === 'tools') && (
            <motion.div 
              key="tools-overview-direct"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full"
            >
              <ToolsDashboard 
                pricingTier={pricingTier}
                onSelectTool={(toolId) => {
                  if (toolId === 'document-analysis-humanizer' || toolId === 'humanizer') {
                    setDocAnalysisInitialTool('humanizer');
                    setActiveSubTab('document-analysis');
                    setActiveTab('verktoy');
                  } else if (['simulator', 'presentations', 'document-analysis', 'dictionary'].includes(toolId)) {
                    if (toolId === 'document-analysis') {
                      setDocAnalysisInitialTool('sensor');
                    }
                    setActiveSubTab(toolId as any);
                    setActiveTab('verktoy');
                  } else {
                    setActiveTab(toolId as any);
                  }
                }}
                onUpgrade={() => setActiveTab('pricing')}
              />
            </motion.div>
          )}

          {(activeTab === 'presentation-generator' || activeTab === 'presentations') && (
            <motion.div 
              key="presentations"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full"
            >
              <PresentationGenerator 
                pricingTier={pricingTier}
                onUpgrade={() => setActiveTab('pricing')}
                documentText={activeDocument?.content ? Object.values(activeDocument.content).filter(Boolean).join('\n\n') : ''}
                documentTitle={activeDocument?.title}
                onBackToTools={() => {
                  setActiveSubTab('tools-overview');
                  setActiveTab('verktoy');
                }}
              />
            </motion.div>
          )}

          {(activeTab === 'oral-simulator' || activeTab === 'simulator') && (
            <motion.div 
              key="simulator"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full"
            >
              <RoleplaySimulator 
                onBackToTools={() => {
                  setActiveSubTab('tools-overview');
                  setActiveTab('verktoy');
                }}
              />
            </motion.div>
          )}

          {(activeTab === 'glossary-auto' || activeTab === 'dictionary') && (
            <motion.div 
              key="dictionary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full"
            >
              <Encyclopedia 
                onBackToTools={() => {
                  setActiveSubTab('tools-overview');
                  setActiveTab('verktoy');
                }}
              />
            </motion.div>
          )}




          {(activeTab === 'pdf-analysis' || activeTab === 'document-analysis') && (
            <motion.div 
              key="document-analysis"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <DocumentAnalysis 
                pricingTier={pricingTier}
                userEmail={user?.email || profile.email}
                onUpgrade={() => setActiveTab('pricing')}
                initialTool={docAnalysisInitialTool}
                onBackToTools={() => {
                  setActiveSubTab('tools-overview');
                  setActiveTab('verktoy');
                }}
              />
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
                    disabled={isGuest}
                    onChange={(e) => setSourceInput(e.target.value)}
                    placeholder={isGuest ? "🔒 Logg inn for kildekritikk" : "F.eks: 'Artikkel av Sommer (2018) om lek i barnehagen'"}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                  />
                  <button 
                    onClick={handleEvaluateSource}
                    disabled={!sourceInput.trim() || isLoading || isGuest}
                    className="bg-emerald-600 text-white px-6 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isGuest ? '🔒 Logg inn' : 'Vurder')}
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
                  checkAccess('yearly') 
                    ? "bg-primary-light/20 border-primary-light" 
                    : "bg-slate-50 border-slate-200"
                )}>
                  {checkAccess('yearly') ? (
                    <Sparkles className="w-5 h-5 text-primary" />
                  ) : (
                    <Lock className="w-5 h-5 text-slate-400" />
                  )}
                  <p className={cn(
                    "text-xs font-medium",
                    checkAccess('yearly') ? "text-primary-dark" : "text-slate-500"
                  )}>
                    {checkAccess('yearly') 
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
                          {sourceResult.pros.map((p: string, i: number) => (
                            <li key={`pro-${i}-${p.substring(0, 10)}`} className="text-sm flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Svakheter / Obs</h4>
                        <ul className="space-y-1">
                          {sourceResult.cons.map((c: string, i: number) => (
                            <li key={`con-${i}-${c.substring(0, 10)}`} className="text-sm flex items-start gap-2">
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
                      checkAccess('yearly') 
                        ? "bg-primary-light/5 border-primary/10" 
                        : "bg-slate-50 border-slate-100 opacity-80"
                    )}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className={cn("w-4 h-4", checkAccess('yearly') ? "text-primary" : "text-slate-400")} />
                          <h4 className="text-sm font-bold text-slate-900">Dypanalyse av kilden</h4>
                        </div>
                        {!checkAccess('yearly') && (
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
                              onClick={!checkAccess('yearly') ? () => setActiveTab('pricing') : handleDeepSourceAnalysis}
                              className={cn(
                                "w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all",
                                checkAccess('yearly') 
                                  ? "bg-primary text-white hover:bg-primary-hover shadow-sm" 
                                  : "bg-slate-100 border border-slate-200 text-slate-400 cursor-pointer hover:bg-slate-200"
                              )}
                            >
                              {getAccessLabel('yearly', 'Start dypanalyse')}
                            </button>
                            
                            {!checkAccess('yearly') && (
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

          {(activeTab === 'profile' || activeTab === 'settings' || activeTab === 'about') && (
            <ProfileComponent 
              key="profile-hub"
              initialMenu={activeTab === 'settings' ? 'settings' : activeTab === 'about' ? 'about' : 'profile'}
              profile={profile}
              setProfile={setProfile}
              handleSaveProfile={handleSaveProfile}
              isSavingProfile={isSavingProfile}
              user={user}
              handleLogout={handleLogout}
              setShowAuthModal={setShowAuthModal}
              pedagogicalProfile={pedagogicalProfile}
              setShowWelcomeGuide={setShowWelcomeGuide}
              isSaving={isSaving}
              isSyncing={isSyncing}
              isQuotaExceeded={isQuotaExceeded}
              lastCloudSyncTime={lastCloudSyncTime}
              handleManualSync={handleManualSync}
              lowStressMode={lowStressMode}
              setLowStressMode={setLowStressMode}
              pricingTier={pricingTier}
              pricingModels={pricingModels}
              handleCancelSubscription={handleCancelSubscription}
              settings={settings}
              setSettings={setSettings}
              selectedTheme={selectedTheme}
              setSelectedTheme={setSelectedTheme}
              themes={themes}
              notificationSettings={notificationSettings}
              handleUpdateNotificationPref={handleUpdateNotificationPref}
              requestNotificationPermission={requestNotificationPermission}
              permissionStatus={permissionStatus}
              handleExportData={handleExportData}
              handleDeleteData={handleDeleteData}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'privacy' && (
            <PrivacyPolicy key="privacy" onBack={() => setActiveTab('settings')} />
          )}

          {activeTab === 'terms' && (
            <TermsOfService key="terms" onBack={() => setActiveTab('settings')} />
          )}


          {activeTab === 'resources' && (
            <Resources key="resources" collegeName={profile.college || 'DMMH'} initialMenu="library" />
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
            <Resources key="file-archive" collegeName={profile.college || 'DMMH'} initialMenu="files" />
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
                ].map((m, idx) => (
                  <div key={`milestone-timeline-${m.title}-${idx}`} className="relative flex gap-8 group">
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

      {/* Global Footer */}
      <footer className="mt-auto py-8 border-t border-slate-100/60 bg-white/50 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-4">
          <p className="text-sm font-medium text-slate-500">
            Laget med ❤️ for barnehagelærerutdanningen
          </p>
          <div className="flex items-center justify-center gap-6 text-xs font-bold text-slate-400">
            <button 
              onClick={() => setActiveTab('privacy')}
              className="hover:text-primary transition-colors py-1"
            >
              Personvernerklæring
            </button>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
            <button 
              onClick={() => setActiveTab('terms')}
              className="hover:text-primary transition-colors py-1"
            >
              Brukervilkår
            </button>
          </div>
          {/* Ekstra avstand for mobil-navigasjon */}
          <div className="h-20 md:hidden" />
        </div>
      </footer>
    </div>
  );
}
