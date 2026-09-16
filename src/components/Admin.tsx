import React, { useState, useEffect } from 'react';
import * as htmlToImage from 'html-to-image';
import { Download } from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Sparkles, 
  Loader2, 
  Copy, 
  Check, 
  Clipboard,
  Image as ImageIcon,
  MessageSquare,
  FileText,
  Zap,
  Calendar,
  RefreshCw,
  Upload,
  X,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Clock,
  Trash2,
  Folder,
  Archive,
  FileEdit,
  Lock,
  BookOpen
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { extractTextFromPdf } from '../lib/pdfUtils';
import { extractTextFromDocx } from '../lib/docxUtils';
import { callGoogleAIProxy } from '../services/geminiService';
import { VisualContentGenerator } from './VisualContentGenerator';
import { PromptLibrary } from './PromptLibrary';
import { isAdminUser } from '../config/accessConfig';

interface AdminProps {
  userEmail: string | null;
  isQuotaExceeded?: boolean;
  handleFirestoreError?: (error: unknown, operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write', path: string | null) => void;
}

const INTERVIEW_QUESTIONS = [
  "Hva var rammen rundt denne aktiviteten (tid, sted, barnegruppe)?",
  "Hva gjorde barna (konkret handling)?",
  "Hva gjorde den voksne (rolle, tilrettelegging)?",
  "Hvilke utsagn eller handlinger fra barna var spesielt viktige?",
  "Hva var hensikten med aktiviteten?",
  "Hvilke observasjoner har du knyttet til læring, samspill eller begrepsbruk?"
];

export const Admin: React.FC<AdminProps> = ({ userEmail, isQuotaExceeded, handleFirestoreError }) => {
  const isAdmin = isAdminUser(userEmail || auth.currentUser?.email);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-[3rem] border-2 border-dashed border-red-200">
        <Lock className="w-16 h-16 text-red-300 mb-4" />
        <h2 className="text-xl font-black text-red-900">Ingen tilgang</h2>
        <p className="text-red-500 text-sm italic">Du har ikke admin-rettigheter til å se denne siden.</p>
      </div>
    );
  }

  const [mode, setMode] = useState<'daily' | 'visual' | 'monthly' | 'prompts'>('daily');
  const [keywords, setKeywords] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [notification, setNotification] = useState<string | null>(null);
  
  // Manual Entry State
  const [manualArchiveContent, setManualArchiveContent] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

  // Archive state
  const [archivedTexts, setArchivedTexts] = useState<any[]>([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [selectedMonthFolder, setSelectedMonthFolder] = useState<string>('');

  // Month names for folder calculation
  const MONTH_NAMES = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];
  
  const getMonthFolder = (date: Date) => {
    return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  };

  const fetchArchive = async () => {
    setIsArchiveLoading(true);
    try {
      const q = query(
        collection(db, 'pedagogical_documentation'),
        where('type', '==', 'daily'),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as any[];
      setArchivedTexts(data);
      
      // Expand the first folder by default if not already set
      if (data.length > 0) {
        const firstFolder = data[0].monthFolder || getMonthFolder(new Date());
        if (expandedFolders.length === 0) setExpandedFolders([firstFolder]);
        if (!selectedMonthFolder) setSelectedMonthFolder(firstFolder);
      } else if (!selectedMonthFolder) {
        setSelectedMonthFolder(getMonthFolder(new Date()));
      }
    } catch (error) {
      console.error("Error fetching archive:", error);
    } finally {
      setIsArchiveLoading(false);
    }
  };

  useEffect(() => {
    fetchArchive();
  }, [userEmail]);

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Monthly logic
  const [monthlyStep, setMonthlyStep] = useState<'init' | 'interviewer' | 'final'>('init');
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [interviewAnswers, setInterviewAnswers] = useState<string[]>(new Array(6).fill(''));
  const [proposedSituation, setProposedSituation] = useState('');
  
  // Context files
  const [contextFiles, setContextFiles] = useState<{name: string, content: string}[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!userEmail) return;
    
    // Simple fetch for admin context files
    const fetchContext = async () => {
      // Wait a bit for auth.currentUser to be ready if it's not yet
      if (!auth.currentUser) {
        let attempts = 0;
        while (!auth.currentUser && attempts < 10) {
          await new Promise(r => setTimeout(r, 200));
          attempts++;
        }
      }

      if (!auth.currentUser) return;

      try {
        const q = query(
          collection(db, 'context_files'),
          where('userId', '==', auth.currentUser.uid),
          where('type', '==', 'file')
        );
        const snapshot = await getDocs(q);
        const files = snapshot.docs.map(doc => ({
          name: doc.data().name,
          content: doc.data().content
        }));
        setContextFiles(files);
      } catch (error) {
        console.error("Error fetching context files:", error);
      }
    };
    
    fetchContext();
  }, [userEmail, auth.currentUser]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !auth.currentUser) return;
    setIsUploading(true);
    
    for(let i=0; i<files.length; i++) {
        const file = files[i];
        try {
          let content = '';
          if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            content = await extractTextFromPdf(file);
          } else if (file.name.toLowerCase().endsWith('.docx')) {
            content = await extractTextFromDocx(file);
          } else {
            content = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (event) => resolve(event.target?.result as string);
              reader.readAsText(file);
            });
          }

          if (content) {
            await addDoc(collection(db, 'context_files'), {
              name: file.name,
              content: content.slice(0, 500000),
              folderId: null,
              type: 'file',
              userId: auth.currentUser.uid,
              updatedAt: serverTimestamp()
            });
            setContextFiles(prev => [...prev, { name: file.name, content: content.slice(0, 5000) }]);
          }
        } catch (error) {
          console.error("Upload error:", error);
        }
    }
    setIsUploading(false);
  };

  const handleFetchMonthlyData = async () => {
    setIsLoading(true);
    setGenerationError(null);
    try {
      if (!selectedMonthFolder) {
        setNotification("Velg en måned først.");
        setIsLoading(false);
        return;
      }
      
      const data = archivedTexts.filter(t => (t.monthFolder || getMonthFolder((t.timestamp && t.timestamp.toDate) ? t.timestamp.toDate() : new Date())) === selectedMonthFolder);
      setMonthlyData(data);
      
      if (data.length === 0) {
        setNotification(`Fant ingen 'Dagens Bilde' i arkivet for ${selectedMonthFolder}.`);
        setIsLoading(false);
      } else {
        // Start phase 1: analyze and get questions
        await handleStartMonthlyInterview(data);
      }
    } catch (error: any) {
      console.error("Error formatting monthly data:", error);
      setGenerationError(error.message || "Feil ved forberedelse av data.");
      setIsLoading(false);
    }
  };

  const handleStartMonthlyInterview = async (data: any[]) => {
    setIsLoading(true);
    setGenerationError(null);
    try {
      const contextText = contextFiles.map(f => `Fil: ${f.name}\n${f.content}`).join('\n\n');
      const dailyTexts = data.map((d, i) => `Dato ${i+1}: ${d.content}`).join('\n\n');
      
      const prompt = `Analyser de innhentede tekstene fra inneværende måned og VELGE UT den situasjonen som har størst potensial for pedagogisk analyse i månedsbrevet (Fagtekst Del 3).
      
      KONTEKST (Årsplaner o.l):
      ${contextText}
      
      MÅNEDENS TEKSTER:
      ${dailyTexts}
      
      SVAR KUN med en kort beskrivelse av den valgte situasjonen og hvorfor den er pedagogisk viktig. Brukeren vil senere utdype denne situasjonen gjennom et intervju.`;

      const response = await callGoogleAIProxy({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          temperature: 0.3,
        }
      });
      const text = response.text;

      setProposedSituation(text || 'Basert på de innsamlede tekstene...');
      setMonthlyStep('interviewer');
    } catch (error: any) {
      console.error(error);
      setGenerationError(error.message || "Feil under analyse av data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFinalMonthly = async () => {
    setIsLoading(true);
    setResult('');
    setGenerationError(null);
    try {
      const contextText = contextFiles.map(f => `Fil: ${f.name}\n${f.content}`).join('\n\n');
      const dailyTexts = monthlyData.map((d, i) => d.content).join('\n\n');
      const interviewData = INTERVIEW_QUESTIONS.map((q, i) => `${q}: ${interviewAnswers[i]}`).join('\n');

      const prompt = `Generering av månedsbrev (friluftsbarnehage)
Skriv et komplett månedsbrev for en friluftsbarnehage som arbeider etter Skoggruppemetoden.

STRUKTUR (OBLIGATORISK)
1. Forside – oppsummering (2-3 avsnitt)
   - Oppsummer måneden helhetlig (lek, samspill, utforskning).
   - Inkluder 2–3 refleksjonsspørsmål.
2. “Dagens bilde” – selvstendige tekster for arkiverte aktiviteter
   - For hver aktivitet: ca. en halv PowerPoint-side.
   - Start med hook, konkret beskrivelse, barns perspektiv, refleksjon og 1–2 undringsspørsmål.
3. Månedens fagtekst / praksishistorie (Dypdykk i en valgt situasjon)
   - SKAL følge denne strukturen: Praksisbeskrivelse, Konkret situasjon (med sitater), Pedagogisk refleksjon, Rammeplan-kobling, Refleksjonsspørsmål.
4. Plan for kommende måned (forankret i årshjul og didaktisk plan)
   - Presenter planer for neste måned.
   - Oversett pedagogiske mål til konkrete barn-erfaringer.
   - Vis progresjon, integrer natur/årstid og begrepslæring.
   - Avslutt med 2-3 undringsspørsmål til hjemmet.

SPRÅKLIGE KRAV:
Ingen punktlister. Sammenhengende tekst. Leken, tydelig og reflekterende tone. Målgruppe: foreldre.

DATA FOR GENERERING:
ARKIVERTE TEKSTER (for del 2): ${dailyTexts}
OPPLASTEDE PLANER (for del 4): ${contextText}
VALGT SITUASJON (for del 3): ${proposedSituation}
EKSTRA INFORMASJON: ${interviewData}

EKSEMPEL PÅ DEL 4 (RETNINGSGIVENDE):
I mai vil vi rette oppmerksomheten mot alt som spirer og vokser rundt oss. Med utgangspunkt i barnas nysgjerrighet fra april, særlig knyttet til fugler, småkryp og livet i naturen, vil vi utforske hvordan naturen endrer seg fra dag til dag. Gjennom turer og aktiviteter i nærmiljøet får barna erfare hvordan temperatur, lys og vær påvirker det som lever rundt oss. Vi vil arbeide videre med begreper knyttet til vekst, forandring og liv, både gjennom konkrete opplevelser og i samtaler med barna. Naturen vil fortsatt være vår viktigste læringsarena, i tråd med Skoggruppemetoden.
Hva skjer med naturen når det blir varmere? Hvilke tegn kan vi se på at nytt liv er på vei? Og hvordan kan vi ta vare på det som vokser rundt oss?`;

      const response = await callGoogleAIProxy({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction: "Du er en pedagogisk leder. Bruk Skoggruppemetoden (Læring gjennom mestring, PLAGG-modellen, den med-undrende voksne) og Rammeplan 2017. Harmoniser teksten med opplastede årsplaner. FORMAT: Månedsbrev strukturert for PowerPoint.",
          temperature: 0.7,
        }
      });
      const text = response.text;

      setResult(text || '');
      setMonthlyStep('final');
      setNotification('Månedsbrev er nå ferdig generert!');
    } catch (error: any) {
      console.error(error);
      setGenerationError(error.message || "Feil under generering av månedsbrev.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToArchive = async () => {
    if (!result || saveStatus !== 'idle') return;
    
    if (isQuotaExceeded) {
      setNotification("Kvoten for database-lagring er nådd. Prøv igjen i morgen.");
      return;
    }

    setSaveStatus('saving');
    let success = false;
    try {
      const now = new Date();
      const monthFolder = getMonthFolder(now);

      const savePromise = addDoc(collection(db, 'pedagogical_documentation'), {
        content: result,
        type: 'daily',
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        monthFolder: monthFolder,
        adminId: userEmail || 'unknown'
      });

      // 10-sekunders timeout for å forhindre uendelig spinner ved nettverk/kvote-problemer
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Database-operasjonen tok for lang tid (timeout). Dette kan skyldes nettverksproblemer eller at kvoten er nådd.")), 10000)
      );

      await Promise.race([savePromise, timeoutPromise]);
      
      success = true;
      setSaveStatus('saved');
      fetchArchive();
      setNotification("Dagens Bilde er arkivert!");
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: any) {
      console.error("Feil ved arkivering av Dagens Bilde:", error);
      
      if (handleFirestoreError) {
        handleFirestoreError(error, 'create', 'pedagogical_documentation');
      }

      const errorMessage = error.message?.includes("quota") || error.message?.includes("exhausted")
        ? "Kvoten for lagring er nådd. Prøv igjen senere."
        : "Kunne ikke arkivere. Sjekk at du har rettigheter, eller prøv igjen.";
        
      setNotification(errorMessage);
    } finally {
      if (!success) {
        setSaveStatus('idle');
      }
    }
  };

  const handleMoveText = async (id: string, newMonthFolder: string) => {
    try {
      const docRef = doc(db, 'pedagogical_documentation', id);
      await updateDoc(docRef, {
        monthFolder: newMonthFolder
      });
      setNotification(`Teksten flyttet til ${newMonthFolder}`);
      fetchArchive();
    } catch (error) {
      console.error("Error moving text:", error);
      setNotification("Feil ved flytting av tekst");
    }
  };

  const handleDeleteText = async (id: string) => {
    if (!window.confirm("Er du sikker på at du vil slette denne teksten fra arkivet?")) return;
    try {
      await deleteDoc(doc(db, 'pedagogical_documentation', id));
      setNotification("Teksten er slettet");
      fetchArchive();
    } catch (error) {
      console.error("Error deleting text:", error);
    }
  };

  const handleSaveManualEntry = async () => {
    if (!manualArchiveContent.trim()) {
      setNotification("Du må skrive inn noe tekst først.");
      return;
    }
    
    if (isQuotaExceeded) {
      setNotification("Kvoten for lagring er nådd. Prøv igjen i morgen.");
      return;
    }

    setSaveStatus('saving');
    try {
      const date = new Date(manualDate);
      const monthFolder = getMonthFolder(date);

      await addDoc(collection(db, 'pedagogical_documentation'), {
        content: manualArchiveContent,
        type: 'daily',
        timestamp: Timestamp.fromDate(date),
        createdAt: serverTimestamp(),
        monthFolder: monthFolder,
        adminId: userEmail || 'unknown',
        isManualEntry: true
      });

      setNotification("Manuelt bidrag er lagret i arkivet!");
      setManualArchiveContent('');
      setShowManualForm(false);
      fetchArchive();
      setSaveStatus('idle');
    } catch (error: any) {
      console.error("Feil ved lagring av manuelt bidrag:", error);
      setNotification("Kunne ikke lagre. Prøv igjen.");
      setSaveStatus('idle');
    }
  };

  const groupedArchive = archivedTexts.reduce((acc: any, text: any) => {
    const folder = text.monthFolder || 'Uorganisert';
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(text);
    return acc;
  }, {});

  const sortedFolders = Object.keys(groupedArchive).sort((a, b) => {
    // Basic year/month sort helper
    const parseFolder = (f: string) => {
      const parts = f.split(' ');
      if (parts.length < 2) return 0;
      const monthIdx = MONTH_NAMES.indexOf(parts[0]);
      const year = parseInt(parts[1]);
      return year * 12 + monthIdx;
    };
    return parseFolder(b) - parseFolder(a);
  });

  const handleGenerateDaily = async () => {
    if (!keywords.trim() || isLoading) return;
    
    setIsLoading(true);
    setResult('');
    setGenerationError(null);
    
    try {
      const prompt = `Her er dagens hendelser/stikkord: ${keywords}`;
      const response = await callGoogleAIProxy({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction: `Lag en kort, engasjerende tekst til 'dagens bilde' fra barnehagen.
Teksten skal:
- Ha en tydelig hook i første setning (spørsmål, utrop eller sitat fra barn)
- Bestå av 2–3 korte avsnitt
- Beskrive en konkret situasjon, aktivitet eller opplevelse fra dagen
- Ha en leken, varm og engasjerende tone
- Løfte frem lek, samspill, utforsking og/eller friluftsliv
- Gjerne synliggjøre hva barna lærer eller erfarer, uten å bli for faglig tung
- Avslutte med en liten refleksjon eller stemning fra dagen
- Lengde: kort nok til å passe sammen med ett bilde (typisk 60–120 ord)
Unngå:
- Lange forklaringer eller oppramsing
- For formelt eller akademisk språk
- Gjentakelser
Mål: Teksten skal gi foreldre et levende innblikk i barnas hverdag og skape gjenkjennelse, nysgjerrighet og glede.`,
        }
      });
      const text = response.text;

      if (!text) {
        throw new Error("Kunne ikke generere tekst fra API-et. Prøv igjen.");
      }

      setResult(text);
      setNotification('Dagens Bilde er nå generert!');
    } catch (error: any) {
      console.error("Gemini Error:", error);
      setGenerationError(error.message || "Noe gikk galt under tekstgenerering.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setNotification('Teksten er kopiert til utklippstavlen');
    setTimeout(() => setCopied(false), 2000);
  };

  
  const handleDownloadLogo = async () => {
    const logoEl = document.getElementById('app-main-logo');
    if (!logoEl) {
      setNotification('Kunne ikke finne logo-elementet. Last inn siden på nytt.');
      return;
    }

    try {
      // Bruk html-to-image for å unngå problemer med oklch/css-variabler
      const rootStyle = document.documentElement.style;
      const dataUrl = await htmlToImage.toJpeg(logoEl, {

        quality: 1.0,
        backgroundColor: '#ffffff',
        pixelRatio: 4, // 4x for høy oppløsning
        style: {
          '--primary-color': rootStyle.getPropertyValue('--primary-color') || '#2563eb',
          '--primary-color-hover': rootStyle.getPropertyValue('--primary-color-hover') || '#1d4ed8',
          '--primary-color-light': rootStyle.getPropertyValue('--primary-color-light') || '#dbeafe',
          '--primary-color-dark': rootStyle.getPropertyValue('--primary-color-dark') || '#1e40af',
        } as any
      });

      // Trigg nedlasting
      const link = document.createElement('a');
      link.download = 'blu-logo-admin.jpg';
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setNotification('Logo lastet ned!');
    } catch(err: any) {
      console.error('Feil ved nedlasting av logo:', err);
      setNotification('Kunne ikke generere bilde.');
    }
  };
    return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8 px-4 md:px-8 pb-32 relative"
    >
      <AnimatePresence>
        {notification && (
          <motion.div key="ap-auto-111-1"
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-20 left-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 font-bold text-sm whitespace-nowrap"
          >
            <div className="bg-emerald-500 p-1 rounded-full">
              <Check className="w-3 h-3 text-white" />
            </div>
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-slate-900 p-6 md:p-10 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <Shield className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black italic tracking-tight text-white">Admin-verktøy</h1>
                <p className="text-slate-300 text-[10px] md:text-sm font-medium uppercase tracking-[0.2em]">Pedagogisk Dokumentasjonssenter</p>
              </div>
            </div>

            <div className="flex flex-wrap w-full md:w-auto bg-white/5 p-1 rounded-2xl backdrop-blur-sm border border-white/10 gap-1">
              <button 
                onClick={() => setMode('daily')}
                className={cn(
                    "flex-1 md:flex-none justify-center px-4 md:px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                    mode === 'daily' ? "bg-white text-slate-900 shadow-lg" : "text-slate-300 hover:text-white"
                )}
              >
                <FileText className="w-4 h-4" /> Dagens Bilde (Tekst & Arkiv)
              </button>
              <button 
                onClick={() => setMode('visual')}
                className={cn(
                    "flex-1 md:flex-none justify-center px-4 md:px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                    mode === 'visual' ? "bg-white text-emerald-900 shadow-lg" : "text-slate-300 hover:text-white"
                )}
              >
                <Sparkles className="w-4 h-4 text-emerald-400" /> Foreldreoppdatering & AI-bilde
              </button>
              <button 
                onClick={() => setMode('monthly')}
                className={cn(
                    "flex-1 md:flex-none justify-center px-4 md:px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                    mode === 'monthly' ? "bg-white text-slate-900 shadow-lg" : "text-slate-300 hover:text-white"
                )}
              >
                <Calendar className="w-4 h-4" /> Månedsbrev
              </button>
              <button 
                onClick={() => setMode('prompts')}
                className={cn(
                    "flex-1 md:flex-none justify-center px-4 md:px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                    mode === 'prompts' ? "bg-amber-400 text-slate-950 shadow-lg font-black" : "text-slate-300 hover:text-white"
                )}
              >
                <BookOpen className="w-4 h-4" /> Prompt-bibliotek & Modeller
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* WORKSPACE: Generator -> Result -> Archive */}
        <div className="space-y-4 md:space-y-8">
          {/* Prompt Library view */}
          {mode === 'prompts' && (
            <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100">
              <PromptLibrary />
            </div>
          )}
          {/* Visual Content Generator (Imagen 3 & Parent update) */}
          {mode === 'visual' && (
            <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100">
              <VisualContentGenerator />
            </div>
          )}

          {/* 2. Dagens Bilde / Generator Input */}
          {mode === 'daily' && (
            <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4 md:gap-6">
              <div className="flex items-center gap-3">
                <div className="bg-primary-light p-2 rounded-xl">
                  <ImageIcon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <h2 className="text-lg md:text-xl font-bold text-slate-900">Dagens Bilde</h2>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dine stikkord</label>
                    <button 
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text) setKeywords(prev => prev + (prev ? " " : "") + text);
                        } catch (err) {
                          console.error("Paste error", err);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-[9px] md:text-[10px] font-bold transition-colors border border-slate-100"
                      title="Lim inn fra utklippstavlen"
                    >
                      <Clipboard className="w-3 h-3" />
                      Lim inn
                    </button>
                  </div>
                  <textarea 
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="Hva har skjedd i dag? Skriv små øyeblikk eller stikkord..."
                    className="w-full min-h-[120px] md:h-64 bg-slate-50/30 border border-slate-100 rounded-xl md:rounded-2xl py-4 md:py-6 px-4 md:px-6 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white focus:border-primary transition-all resize-none shadow-sm disabled:opacity-50"
                  />
                </div>
                
                <button 
                  onClick={handleGenerateDaily}
                  disabled={isLoading || !keywords.trim()}
                  className={cn(
                    "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
                    (isLoading || !keywords.trim())
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                      : "bg-primary text-white hover:bg-primary-hover shadow-primary-light"
                  )}
                >
                  {isLoading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Genererer tekst...</>
                  ) : (
                    <><Sparkles className="w-5 h-5 text-amber-300" /> Generer tekst</>
                  )}
                </button>
              </div>

              {/* Result inside card */}
              {mode === 'daily' && (result || generationError) && (
                <div className="mt-4 pt-6 border-t border-slate-50 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full mb-4">
                        <div className="flex items-center gap-2">
                        <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-100">
                            <FileText className="w-4 h-4 text-emerald-600" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase">Resultat</h3>
                        </div>
                        
                        <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
                        {result && (
                            <>
                             <button 
                                onClick={handleSaveToArchive}
                                disabled={saveStatus !== 'idle'}
                                className={cn(
                                    "flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest",
                                    saveStatus === 'saved' ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-primary-light border-primary-light text-primary hover:bg-primary hover:text-white"
                                )}
                            >
                                {saveStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : saveStatus === 'saved' ? <Check className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                                <span className="whitespace-nowrap">{saveStatus === 'saved' ? 'Arkivert' : 'Arkiver'}</span>
                            </button>
                            <button 
                                onClick={copyToClipboard}
                                className={cn(
                                    "flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest",
                                    copied ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                <span className="whitespace-nowrap">{copied ? 'Kopiert' : 'Kopier'}</span>
                            </button>
                            </>
                        )}
                        </div>
                    </div>

                    {generationError ? (
                        <div className="p-6 text-center bg-red-50 rounded-2xl border border-red-100">
                            <p className="text-xs text-red-700 font-medium">{generationError}</p>
                        </div>
                    ) : (
                        <div className="bg-slate-50/50 rounded-2xl p-4 md:p-6 border border-slate-100 shadow-inner max-h-[400px] overflow-y-auto">
                            <div className="prose prose-sm prose-slate max-w-none text-slate-700 leading-relaxed font-medium">
                                <ReactMarkdown>{result}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
              )}
            </div>
          )}

          {mode === 'monthly' && (
            <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-amber-100 p-2 rounded-xl">
                  <Calendar className="w-5 h-5 md:w-6 md:h-6 text-amber-600" />
                </div>
                <h2 className="text-lg md:text-xl font-black text-slate-900">Månedsbrev</h2>
                <div className="ml-auto flex items-center gap-2">
                  <button 
                      onClick={() => {
                          if (confirm('Vil du tømme nettleserens mellomlager og laste appen på nytt?')) {
                              if ('serviceWorker' in navigator) {
                                  navigator.serviceWorker.getRegistrations().then(registrations => {
                                      for(let r of registrations) r.unregister();
                                  });
                              }
                              if ('caches' in window) {
                                  caches.keys().then(names => {
                                      for (let name of names) caches.delete(name);
                                  });
                              }
                              window.location.reload();
                          }
                      }}
                      className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold flex items-center gap-1 transition-all"
                  >
                    <RefreshCw className="w-3 h-3" /> Tøm cache
                  </button>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tight bg-emerald-50 px-2 py-1 rounded-md">v3.1.0</span>
                </div>
              </div>
              
              <p className="text-xs md:text-sm text-slate-500 leading-relaxed italic mb-2">
                Hent arkiverte tekster for valgt måned og la AI-en oppsummere dem til et profesjonelt månedsbrev.
              </p>

              {archivedTexts.length > 0 && (
                 <div className="mb-4">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Velg måned for generering</label>
                   <select 
                     value={selectedMonthFolder}
                     onChange={(e) => setSelectedMonthFolder(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                     disabled={isLoading || monthlyStep !== 'init'}
                   >
                     {Array.from(new Set(archivedTexts.map(t => t.monthFolder || getMonthFolder((t.timestamp && t.timestamp.toDate) ? t.timestamp.toDate() : new Date())))).map(folder => (
                       <option key={`gen-${folder}`} value={folder}>{folder}</option>
                     ))}
                   </select>
                 </div>
              )}

              <button 
                onClick={handleFetchMonthlyData}
                disabled={(isLoading && monthlyStep === 'init') || monthlyStep !== 'init'}
                className={cn(
                    "w-full py-5 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all shadow-lg",
                    (monthlyStep !== 'init')
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : "bg-amber-400 text-slate-900 hover:bg-amber-500 shadow-amber-100 disabled:opacity-70 disabled:cursor-not-allowed"
                )}
              >
                {monthlyStep === 'init' ? (
                  <>
                    {isLoading ? <Loader2 className="w-5 h-5 mb-1 animate-spin text-slate-800" /> : <Calendar className="w-5 h-5 mb-1 text-amber-900" />}
                    {isLoading ? 'Henter arkiv og analyserer...' : 'Generer Månedsbrev'}
                  </>
                ) : (
                    <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        Data hentet ({monthlyData.length} tekster)
                    </div>
                )}
              </button>

              {monthlyStep === 'interviewer' && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 md:p-6 bg-amber-50 rounded-2xl md:rounded-3xl border border-amber-200 space-y-6"
                >
                    <div className="flex items-center gap-2 text-amber-800 border-b border-amber-200 pb-3">
                        <MessageSquare className="w-5 h-5" />
                        <h4 className="text-sm font-black uppercase tracking-wider">Intervjuspørsmål for Fagtekst (Del 3)</h4>
                    </div>
                    
                    <div className="bg-white/90 p-5 rounded-2xl text-sm text-slate-700 italic border border-amber-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400" />
                        <span className="font-bold uppercase tracking-widest text-amber-600 block mb-2 text-[10px]">Utvalgt Fokusområde fra AI</span>
                        <p className="leading-relaxed text-slate-800">{proposedSituation}</p>
                    </div>
                    
                    <div className="space-y-6">
                        {INTERVIEW_QUESTIONS.map((q, i) => (
                            <div key={`q-${i}`} className="space-y-2">
                                <label className="text-xs font-bold text-amber-900 block leading-tight">{i+1}. {q}</label>
                                <textarea 
                                    value={interviewAnswers[i]}
                                    onChange={(e) => {
                                        const newA = [...interviewAnswers];
                                        newA[i] = e.target.value;
                                        setInterviewAnswers(newA);
                                    }}
                                    disabled={isLoading}
                                    placeholder="Skriv ned dine tanker her..."
                                    className="w-full bg-white border border-amber-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none focus:bg-white transition-all shadow-sm disabled:opacity-50"
                                    rows={2}
                                />
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={handleGenerateFinalMonthly}
                        disabled={isLoading}
                        className="w-full py-4 text-white rounded-xl font-bold flex items-center justify-center gap-2 bg-slate-900 shadow-slate-900/20 hover:bg-slate-800 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-amber-400" /> : <Zap className="w-5 h-5 text-amber-400" />}
                        {isLoading ? 'Genererer Månedsbrev (Dette kan ta litt tid)...' : 'Fullfør Månedsbrev'}
                    </button>
                </motion.div>
              )}

              {/* Result inside Monthly card */}
              {mode === 'monthly' && (result || generationError) && (
                <div className="mt-8 pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full mb-6">
                        <div className="flex items-center gap-2">
                        <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                            <FileText className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">GENERERT MÅNEDSBREV</h3>
                        </div>
                        
                        {result && (
                            <button 
                                onClick={copyToClipboard}
                                className={cn(
                                    "w-full sm:w-auto px-6 py-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 text-xs font-bold",
                                    copied ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-white border-slate-200 text-slate-600 hover:border-primary hover:text-primary"
                                )}
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Kopiert' : 'Kopier'}
                            </button>
                        )}
                    </div>

                    {generationError ? (
                        <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-100">
                            <p className="text-sm text-red-700 font-medium">{generationError}</p>
                        </div>
                    ) : (
                        <div className="bg-slate-50/50 rounded-3xl p-6 md:p-8 border border-slate-100 shadow-inner max-h-[600px] overflow-y-auto">
                            <div className="prose prose-sm md:prose-base prose-slate max-w-none text-slate-700 leading-relaxed">
                                <ReactMarkdown>{result}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
              )}
            </div>
          )}

          {/* 4. ARKIV OVER PRODUSERTE TEKSTER */}
          <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100 space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <Archive className="w-5 h-5 text-slate-600" />
                </div>
                <h3 className="text-[10px] md:text-sm font-bold text-slate-900 uppercase tracking-widest">Arkiv</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowManualForm(!showManualForm)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                    showManualForm 
                      ? "bg-slate-100 text-slate-600" 
                      : "bg-primary-light text-primary hover:bg-primary hover:text-white"
                  )}
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  {showManualForm ? "Avbryt" : "Legg til manuelt"}
                </button>
                <button 
                  onClick={fetchArchive}
                  className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
                  title="Oppdater arkiv"
                >
                  <RefreshCw className={cn("w-4 h-4", isArchiveLoading && "animate-spin")} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showManualForm && (
                <motion.div key="ap-auto-112-1"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 md:p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tekst for arkivering</label>
                        <textarea 
                          value={manualArchiveContent}
                          onChange={(e) => setManualArchiveContent(e.target.value)}
                          placeholder="Skriv eller lim inn teksten du vil arkivere..."
                          className="w-full min-h-[120px] bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-sm"
                        />
                      </div>
                      <div className="md:w-48 space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Dato</label>
                        <input 
                          type="date"
                          value={manualDate}
                          onChange={(e) => setManualDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-sm h-[120px] flex items-center justify-center text-center"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button 
                        onClick={handleSaveManualEntry}
                        disabled={saveStatus === 'saving' || !manualArchiveContent.trim()}
                        className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-primary-hover transition-all shadow-lg disabled:opacity-50"
                      >
                        {saveStatus === 'saving' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        Lagre i arkiv
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
              {sortedFolders.length === 0 && !isArchiveLoading && (
                <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 font-medium">Ingen arkiverte tekster ennå.</p>
                </div>
              )}

              {sortedFolders.map((folder, fIdx) => (
                <div key={`folder-${folder}-${fIdx}`} className="border border-slate-100 rounded-xl md:rounded-2xl overflow-hidden bg-white shadow-sm">
                  <button 
                    onClick={() => {
                      setExpandedFolders(prev => 
                        prev.includes(folder) ? prev.filter(f => f !== folder) : [...prev, folder]
                      );
                    }}
                    className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-primary" />
                      <span className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-700">{folder}</span>
                      <span className="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded-md text-slate-400 font-bold">
                        {groupedArchive[folder].length}
                      </span>
                    </div>
                    {expandedFolders.includes(folder) ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>

                  <AnimatePresence>
                    {expandedFolders.includes(folder) && (
                      <motion.div key="ap-auto-113-1"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="divide-y divide-slate-50"
                      >
                {groupedArchive[folder].map((text: any, tIdx: number) => (
                  <div key={`archive-${text.id}-${tIdx}`} className="p-4 hover:bg-slate-50/30 transition-colors flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {text.timestamp?.toDate ? text.timestamp.toDate().toLocaleDateString('no-NO') : 'Ukjent dato'}
                                </span>
                                {text.isManualEntry && (
                                  <span key="ap-auto-113-2" className="text-[8px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter border border-amber-100">
                                    Manuelt
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(text.content);
                                    setNotification("Kopiert!");
                                  }}
                                  className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-all"
                                  title="Kopier tekst"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                
                                <button 
                                  onClick={() => handleDeleteText(text.id)}
                                  className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                                  title="Slett"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <p className="text-[10px] md:text-[11px] text-slate-600 line-clamp-2 leading-relaxed font-medium">
                              {text.content}
                            </p>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          {/* 5. KONTEKST-FILER Section */}
          <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-slate-50 p-2 rounded-xl text-slate-500 border border-slate-100">
                <FileEdit className="w-5 h-5" />
              </div>
              <h3 className="text-[10px] md:text-sm font-bold text-slate-900 uppercase tracking-widest">Kontekst-filer</h3>
            </div>
            
            <label className="w-full flex flex-col items-center justify-center p-6 md:p-10 border-2 border-dashed border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all group bg-white shadow-sm overflow-hidden text-center">
                <input type="file" accept=".pdf,.docx,image/*" multiple onChange={handleFileUpload} className="hidden" />
                <div className="bg-slate-50 p-4 rounded-xl group-hover:bg-primary-light transition-colors mb-4">
                  <Upload className="w-8 h-8 text-slate-300 group-hover:text-primary transition-colors" />
                </div>
                <span className="text-[10px] md:text-xs font-bold text-slate-900 uppercase tracking-widest">Last opp dokumentasjon</span>
                <span className="text-[9px] md:text-[10px] text-slate-400 mt-2 font-medium">Støtter årsplaner, Word og PDF</span>
            </label>

            <AnimatePresence>
                {contextFiles.length > 0 && (
                    <div key="ap-auto-114-1" className="flex flex-wrap gap-2 pt-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                        {contextFiles.map((f, i) => (
                            <div key={`ctx-file-${f.name}-${i}`} className="px-3 py-1 bg-primary-light/30 border border-primary-light text-primary-dark text-[9px] md:text-[10px] font-bold rounded-lg flex items-center gap-2 animate-in fade-in zoom-in group/file">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span className="truncate max-w-[150px] md:max-w-none">{f.name}</span>
                                <button onClick={() => setContextFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500 transition-colors">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </AnimatePresence>
          </div>

          {/* 6. Månedsbrev Tips Box */}
          <div className="bg-amber-50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-amber-100 flex items-start gap-4">
            <div className="p-2 md:p-3 bg-white rounded-xl shadow-sm">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[10px] md:text-xs font-black text-amber-900 uppercase tracking-tight">Tips til Månedsbrevet</h3>
              <p className="text-[10px] md:text-xs text-amber-800 leading-relaxed font-medium">
                Bruk "intervju-fasen" til å fange opp små detaljer fra barna sine samtaler eller spesifikke situasjoner du har sett. Dette skaper liv i månedsbrevet og gjør det mer personlig for foreldrene.
              </p>
            </div>
          </div>
        
          {/* 7. Ressurser og Profilering Section */}
          <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4 mt-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-slate-50 p-2 rounded-xl text-slate-500 border border-slate-100">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h3 className="text-[10px] md:text-sm font-bold text-slate-900 uppercase tracking-widest">Ressurser og Profilering</h3>
            </div>
            
            <div className="flex flex-col items-start gap-3">
              <button 
                onClick={handleDownloadLogo}
                className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Last ned logo (.jpg)
              </button>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium">Genererer en høyoppløselig JPG-kopi av appens logo med hvit bakgrunn.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};