import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Sparkles, 
  Send, 
  Loader2, 
  Copy, 
  Check, 
  Clipboard,
  Image as ImageIcon,
  MessageSquare,
  FileText,
  Zap,
  Calendar,
  Upload,
  X,
  FileSearch,
  CheckCircle2,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, serverTimestamp } from 'firebase/firestore';
import { extractTextFromPdf } from '../lib/pdfUtils';

interface AdminProps {
  userEmail: string | null;
}

const INTERVIEW_QUESTIONS = [
  "Hva var rammen rundt denne aktiviteten (tid, sted, barnegruppe)?",
  "Hva gjorde barna (konkret handling)?",
  "Hva gjorde den voksne (rolle, tilrettelegging)?",
  "Hvilke utsagn eller handlinger fra barna var spesielt viktige?",
  "Hva var hensikten med aktiviteten?",
  "Hvilke observasjoner har du knyttet til læring, samspill eller begrepsbruk?"
];

export const Admin: React.FC<AdminProps> = ({ userEmail }) => {
  const [mode, setMode] = useState<'daily' | 'monthly'>('daily');
  const [keywords, setKeywords] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [notification, setNotification] = useState<string | null>(null);

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

  // Styre sjekk: Kun for svein.nordvik@gmail.com
  const isAuthorized = userEmail === 'svein.nordvik@gmail.com';

  useEffect(() => {
    if (!userEmail || !isAuthorized) return;
    
    // Simple fetch for admin context files
    const fetchContext = async () => {
      try {
        const q = query(
          collection(db, 'context_files'),
          where('userId', '==', auth.currentUser?.uid),
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
  }, [userEmail]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !auth.currentUser) return;
    setIsUploading(true);
    
    for(let i=0; i<files.length; i++) {
        const file = files[i];
        try {
          let content = '';
          if (file.type === 'application/pdf') {
            content = await extractTextFromPdf(file);
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

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
        <Shield className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-black text-slate-900">Ingen tilgang</h2>
        <p className="text-slate-500 text-sm">Denne siden er kun for systemadministrator.</p>
      </div>
    );
  }

  const handleFetchMonthlyData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const q = query(
        collection(db, 'pedagogical_documentation'),
        where('type', '==', 'daily'),
        where('timestamp', '>=', Timestamp.fromDate(firstDay)),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => doc.data());
      setMonthlyData(data);
      
      if (data.length === 0) {
        setNotification("Fant ingen 'Dagens Bilde' for inneværende måned. Du må kanskje opprette noen først.");
      } else {
        // Start phase 1: analyze and get questions
        await handleStartMonthlyInterview(data);
      }
    } catch (error) {
      console.error("Error fetching monthly data:", error);
      setNotification("Feil ved henting av data. Har du satt opp Firestore-regler?");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartMonthlyInterview = async (data: any[]) => {
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const contextText = contextFiles.map(f => `Fil: ${f.name}\n${f.content}`).join('\n\n');
      const dailyTexts = data.map((d, i) => `Dato ${i+1}: ${d.content}`).join('\n\n');
      
      const prompt = `Analyser de innhentede tekstene fra inneværende måned og VELGE UT den situasjonen som har størst potensial for pedagogisk analyse i månedsbrevet (Fagtekst Del 3).
      
      KONTEKST (Årsplaner o.l):
      ${contextText}
      
      MÅNEDENS TEKSTER:
      ${dailyTexts}
      
      SVAR KUN med en kort beskrivelse av den valgte situasjonen og hvorfor den er pedagogisk viktig. Brukeren vil senere utdype denne situasjonen gjennom et intervju.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "Du er en pedagogisk leder. Din oppgave er å identifisere den hendelsen fra månedens dokumentasjon som gir best grunnlag for en dyp pedagogisk analyse i et månedsbrev.",
          temperature: 0.3,
        },
      });

      setProposedSituation(response.text || 'Basert på de innsamlede tekstene...');
      setMonthlyStep('interviewer');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFinalMonthly = async () => {
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const contextText = contextFiles.map(f => `Fil: ${f.name}\n${f.content}`).join('\n\n');
      const dailyTexts = monthlyData.map((d, i) => d.content).join('\n\n');
      const interviewData = INTERVIEW_QUESTIONS.map((q, i) => `${q}: ${interviewAnswers[i]}`).join('\n');

      const systemInstruction = `Du er en pedagogisk leder. Bruk Skoggruppemetoden (Læring gjennom mestring, PLAGG-modellen, den med-undrende voksne) og Rammeplan 2017. Harmoniser teksten med opplastede årsplaner.
      FORMAT: Månedsbrev strukturert i 4 deler for PowerPoint. 
      BEGRENSNING: Hver del skal maks fylle en halv side.
      BILDER: Sett inn placeholders som: [[SIDE X: BILDE HER - <kort situasjonsbeskrivelse>]].`;

      const prompt = `Fullfør genereringen av et komplett månedsbrev. Du har valgt ut en spesifikk situasjon for dyp analyse (Del 3), og brukeren har nå utdypet denne situasjonen gjennom et intervju.
      
      SITUASJON VALGT AV AI:
      ${proposedSituation}
      
      BRUKERENS UTDYPING (INTERVJU):
      ${interviewData}

      MÅNEDENS ANDRE AKTIVITETER (for oversikt i Del 1 og 2):
      ${dailyTexts}
      
      KONTEKST:
      ${contextText}
      
      STRUKTUR:
      Del 1: Tilbakeblikk og stemning (Hook + Oversikt)
      Del 2: Barnas medvirkning og mestring
      Del 3: Faglig fordypning (Praksisfortelling basert på intervjusvarene)
      Del 4: Veien videre
      
      Helt nederst skal du legge til en seksjon merket "KLAR FOR NOTEBOOKLM":
      Innhold: En analytisk råtekst-oppsummering formidlet for pedagogisk analyse (f.eks "Dette månedsbrevet viser progresjon mot...").
      Deretter: 10 tekstlinjer for bildevedlegg i formatet: "Bilde-vedlegg Side X: [[BILDE-RAMME HER]]".`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { systemInstruction, temperature: 0.7 },
      });

      setResult(response.text || '');
      setMonthlyStep('final');
      setNotification('Månedsbrev er nå ferdig generert!');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToArchive = async () => {
    if (!result || saveStatus !== 'idle') return;
    setSaveStatus('saving');
    try {
      await addDoc(collection(db, 'pedagogical_documentation'), {
        content: result,
        type: 'daily',
        timestamp: Timestamp.now(),
        adminId: userEmail
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus('idle');
    }
  };

  const handleGenerateDaily = async () => {
    if (!keywords.trim() || isLoading) return;
    
    setIsLoading(true);
    setResult('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const prompt = `Her er dagens hendelser/stikkord: ${keywords}`;
      const systemInstruction = `DIN ROLLE:
Du er en varm, engasjert og dyktig pedagog i en friluftsbarnehage. Din oppgave er å skrive teksten til 'Dagens bilde' basert på brukerens stikkord. Målet er å gi foreldrene et levende innblikk i barnas hverdag som skaper gjenkjennelse, nysgjerrighet og glede.

STRUKTUR OG INNHOLD:
1. Hook (Starten): Åpne alltid med en tydelig 'hook' i første setning – bruk et spørsmål, et engasjert utrop eller et fiktivt/relevant sitat fra et barn.
2. Kjernen (Situasjonen): Beskriv den konkrete aktiviteten eller opplevelsen i 2–3 korte avsnitt. Løft tydelig frem barnas lek, samspill, utforsking og/eller friluftsliv.
3. Det faglige dryppet (Læringen): Synliggjør hva barna erfarer eller lærer av situasjonen, men gjør det helt naturlig. (Unngå tungt akademisk språk og lange forklaringer).
4. Avslutning (Refleksjonen): Rund av med en liten, varm refleksjon eller stemningsbeskrivelse fra dagen.

TONE OG STIL:
Leken, varm og engasjerende. Unngå oppramsing, formelt/akademisk språk og gjentakelser.

LENGDE:
Kort og konsist (ca. 60–120 ord). Teksten skal være kort nok til å passe perfekt ved siden av ett bilde på en skjerm.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      setResult(response.text || 'Kunne ikke generere tekst. Prøv igjen.');
      if (response.text) {
        setNotification('Dagens Bilde er nå generert!');
      }
    } catch (error) {
      console.error("Gemini Error:", error);
      setResult("En feil oppstod under genereringen. Sjekk konsollen for detaljer.");
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8 px-4 md:px-8 pb-32 relative"
    >
      <AnimatePresence>
        {notification && (
          <motion.div
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
                <h1 className="text-2xl md:text-3xl font-black italic tracking-tight">Admin-verktøy</h1>
                <p className="text-slate-400 text-[10px] md:text-sm font-medium uppercase tracking-[0.2em]">Pedagogisk Dokumentasjonssenter</p>
              </div>
            </div>

            <div className="flex w-full md:w-auto bg-white/5 p-1 rounded-2xl backdrop-blur-sm border border-white/10">
              <button 
                onClick={() => setMode('daily')}
                className={cn(
                    "flex-1 md:flex-none justify-center px-4 md:px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                    mode === 'daily' ? "bg-white text-slate-900 shadow-lg" : "text-white/60 hover:text-white"
                )}
              >
                <ImageIcon className="w-4 h-4" /> Dagens Bilde
              </button>
              <button 
                onClick={() => setMode('monthly')}
                className={cn(
                    "flex-1 md:flex-none justify-center px-4 md:px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                    mode === 'monthly' ? "bg-white text-slate-900 shadow-lg" : "text-white/60 hover:text-white"
                )}
              >
                <Calendar className="w-4 h-4" /> Månedsbrev
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Context & Input */}
        <div className="lg:col-span-5 space-y-6">
          {/* File Upload Section */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-2 rounded-xl text-slate-600">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Kontekst-filer</h3>
            </div>
            
            <label className="w-full flex flex-col items-center justify-center p-6 md:p-10 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-50 transition-all group bg-white shadow-sm">
                <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                <div className="bg-slate-50 p-4 rounded-2xl group-hover:bg-primary-light transition-colors mb-4">
                  <Upload className="w-8 h-8 text-slate-300 group-hover:text-primary transition-colors" />
                </div>
                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Last opp dokumentasjon</span>
                <span className="text-[10px] text-slate-400 mt-2 font-medium">Støtter årsplaner, månedsplaner (.txt)</span>
            </label>

            <AnimatePresence>
                {contextFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {contextFiles.map((f, i) => (
                            <div key={`context-${f.name}-${i}`} className="px-3 py-1.5 bg-primary-light/30 border border-primary-light text-primary-dark text-[10px] font-bold rounded-lg flex items-center gap-2 animate-in fade-in zoom-in">
                                <CheckCircle2 className="w-3 h-3" />
                                {f.name}
                                <button onClick={() => setContextFiles(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-red-500">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </AnimatePresence>
          </div>

          {/* Daily Mode Input */}
          {mode === 'daily' && (
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-primary-light p-2 rounded-xl">
                  <ImageIcon className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-black text-slate-900">Dagens Bilde</h2>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dine stikkord</label>
                    <button 
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text) setKeywords(prev => prev + (prev ? " " : "") + text);
                        } catch (err) {
                          console.error("Paste error", err);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-colors"
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
                    className="w-full min-h-[150px] md:h-64 bg-slate-50/50 border-2 border-slate-100 rounded-3xl py-6 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white focus:border-primary transition-all resize-none shadow-inner"
                  />
                </div>
                
                <button 
                  onClick={handleGenerateDaily}
                  disabled={isLoading || !keywords.trim()}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-xl",
                    isLoading || !keywords.trim() 
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                      : "bg-primary text-white hover:bg-primary-hover shadow-primary-light"
                  )}
                >
                  {isLoading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Genererer...</>
                  ) : (
                    <><Sparkles className="w-5 h-5 text-amber-300" /> Generer Dagens Bilde</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Monthly Mode Input */}
          {mode === 'monthly' && (
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6 italic">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-xl">
                  <Calendar className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-xl font-black text-slate-900">Komplett Månedsbrev</h2>
              </div>
              
              <p className="text-sm text-slate-500 leading-relaxed">
                Når du trykker på knappen under, henter vi automatisk alle "Dagens Bilde"-tekster fra Firebase for inneværende måned. Disse brukes som grunnlag for det pedagogiske arbeidet.
              </p>

              <button 
                onClick={handleFetchMonthlyData}
                disabled={isLoading || monthlyStep !== 'init'}
                className={cn(
                    "w-full py-6 rounded-2xl font-black flex flex-col items-center justify-center gap-1 transition-all shadow-xl",
                    monthlyStep !== 'init'
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : "bg-amber-400 text-slate-900 hover:bg-amber-500 shadow-amber-100"
                )}
              >
                {monthlyStep === 'init' ? (
                  <>
                    <Calendar className="w-6 h-6 mb-1" />
                    Hent & Generer Månedsbrev
                  </>
                ) : (
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        Data hentet ({monthlyData.length} tekster)
                    </div>
                )}
              </button>

              {monthlyStep === 'interviewer' && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-6 bg-amber-50 rounded-3xl border border-amber-200 space-y-4"
                >
                    <div className="flex items-center gap-2 text-amber-700">
                        <MessageSquare className="w-5 h-5" />
                        <h4 className="text-sm font-black uppercase">Steg 2: Intervju for Del 3</h4>
                    </div>
                    <p className="text-xs text-amber-800 font-medium">AI-en foreslår situasjon: "{proposedSituation}"</p>
                    
                    <div className="space-y-4 pt-2">
                        {INTERVIEW_QUESTIONS.map((q, i) => (
                            <div key={i} className="space-y-1.5">
                                <label className="text-[10px] font-black text-amber-900/60 uppercase">{i+1}. {q}</label>
                                <input 
                                    type="text"
                                    value={interviewAnswers[i]}
                                    onChange={(e) => {
                                        const newA = [...interviewAnswers];
                                        newA[i] = e.target.value;
                                        setInterviewAnswers(newA);
                                    }}
                                    className="w-full bg-white border border-amber-200 rounded-xl py-2 px-3 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                />
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={handleGenerateFinalMonthly}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
                    >
                        <Zap className="w-4 h-4 text-amber-400" /> Fullfør Månedsbrev
                    </button>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col min-h-[400px] md:min-h-[600px] sticky top-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-xl">
                  <FileText className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Resultat</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Pedagogisk Dokumentasjon</p>
                </div>
              </div>
              
              <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
                {result && mode === 'daily' && (
                  <button 
                    onClick={handleSaveToArchive}
                    disabled={saveStatus !== 'idle'}
                    className={cn(
                        "flex-1 sm:flex-none justify-center p-3 rounded-xl border transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest",
                        saveStatus === 'saved' ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-primary-light border-primary-light text-primary hover:bg-primary hover:text-white"
                    )}
                  >
                    {saveStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : saveStatus === 'saved' ? <Check className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                    <span className="whitespace-nowrap">{saveStatus === 'saved' ? 'Arkivert' : 'Arkiver for måneden'}</span>
                  </button>
                )}
                
                {result && (
                  <button 
                    onClick={copyToClipboard}
                    className={cn(
                      "flex-1 sm:flex-none justify-center p-3 rounded-xl border transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest",
                      copied 
                        ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                        : "bg-slate-50 border-slate-200 text-slate-400 hover:text-primary hover:border-primary"
                    )}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Kopiert' : 'Kopier'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {result ? (
                <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed italic animate-in fade-in slide-in-from-bottom-4 pb-12">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-30 grayscale py-20">
                  <div className="relative">
                    <MessageSquare className="w-20 h-20 text-slate-300" />
                    <Sparkles className="w-8 h-8 text-primary absolute -top-2 -right-2 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-slate-500 font-black text-xl">Klar til innsats</p>
                    <p className="text-slate-400 text-sm max-w-[250px] mx-auto">Velg modus og start den pedagogiske dokumentasjonen med kunstig intelligens.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 p-6 md:p-8 rounded-[2.5rem] border border-amber-100 flex items-start gap-4">
        <div className="p-3 bg-amber-100 rounded-2xl">
          <Zap className="w-6 h-6 text-amber-600" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider">Månedsbrev Tips</h3>
          <p className="text-xs text-amber-800 leading-relaxed italic">
            Når du genererer månedsbrev, bruk "intervju-fasen" til å fange opp små detaljer fra barna sine samtaler eller spesifikke situasjoner du har sett. Dette skaper liv i månedsbrevet og viser foreldrene at vi ser hvert enkelt barn. NotebookLM-seksjonen nederst er optimalisert for videre dypanalyse av din pedagogiske praksis.
          </p>
        </div>
      </div>
    </motion.div>
  );
};
