import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Loader2, 
  Trash2, 
  BookOpen, 
  Check, 
  Plus, 
  FileText,
  X,
  MessageSquare,
  ArrowRight,
  BookmarkPlus,
  Cloud,
  Copy,
  CheckCircle2,
  Share2,
  RotateCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../../lib/utils';
import { callGoogleAIProxy } from '../../services/geminiService';
import { db, auth } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { saveFieldNote, FieldNote, NoteCategory } from '../../services/fieldNotesService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
  retryPrompt?: string;
  errorDetails?: string;
}

interface FieldAssistantProps {
  initialPrompt?: string;
  onGoToNotes?: () => void;
  onSaveToNotes?: (title: string, content: string, category: string) => void;
  onSendToProcessLog?: (msg: ChatMessage) => void;
  onGoToProcessLog?: () => void;
  onSwitchToSuperveileder?: () => void;
  user?: any;
}

const FIELD_SUGGESTIONS = [
  { label: 'Rammeplan-kobling', prompt: 'Hvordan kan jeg koble en observasjon av frilek i sandkassa til Rammeplanens fagområder og formål?' },
  { label: 'Didaktisk opplegg (ute)', prompt: 'Gi meg 3 konkrete didaktiske ideer for en gruppe 3-4-åringer i ulendt skogsterreng.' },
  { label: 'Barns medvirkning', prompt: 'Hva sier Berit Bae og William Corsaro om barns medvirkning i hverdagsrutiner (måltid/påkledning)?' },
  { label: 'Konflikt & anerkjennelse', prompt: 'Hvordan løse en leke-konflikt mellom to 4-åringer med anerkjennende kommunikasjon?' },
  { label: 'Samlingsstund-tips', prompt: 'Trenger et engasjerende opplegg for en 15-minutters samlingsstund om sanser og naturfag.' },
  { label: 'Kroppslig lek & risiko', prompt: 'Hvordan begrunne barns risikofylte lek pedagogisk overfor engstelige foresatte eller kolleger?' }
];

const FIELD_SYSTEM_INSTRUCTION = `Du er BLU-Feltveilederen – en lynrask, pedagogisk skarp og praksisnær veileder for barnehagelærerstudenter ute i praksis.
Målgruppen din er studenter som står i eller forbereder seg til barnehagehverdagen. 
Dine svar skal være:
- Konsise, strukturerte og rett på sak (bruk korte avsnitt og kulepunkter).
- Tydelig forankret i Rammeplan for barnehagen (spesifikke fagområder, formål og arbeidsmåter).
- Koblet til sentral barnehagepedagogisk teori (f.eks. Berit Bae om anerkjennelse og relasjoner, Lev Vygotskij om stillasbygging og proksimal sone, Gunvor Løkken om kroppslig væren, William Corsaro om jevnalderkultur, Bjørndal & Løw om didaktisk relasjonsmodell).
- Alltid gi 1-3 konkrete grep eller spørsmål studenten kan reflektere over eller teste ut i dag.`;

const DEFAULT_WELCOME_MSG: ChatMessage = {
  id: 'msg-welcome',
  role: 'assistant',
  content: 'Hei! 👋 Jeg er din **Feltveileder**. Står du i en spesiell situasjon i barnehagen nå, eller planlegger du en aktivitet? Spør meg om Rammeplanen, didaktiske opplegg eller pedagogisk teori!',
  timestamp: new Date().toISOString()
};

export const FieldAssistant: React.FC<FieldAssistantProps> = ({
  initialPrompt,
  onGoToNotes,
  onSaveToNotes,
  onSendToProcessLog,
  onGoToProcessLog,
  onSwitchToSuperveileder,
  user
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('blu_field_assistant_chat');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Feil ved lesing av felt-chat:', e);
    }
    return [DEFAULT_WELCOME_MSG];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [logSuccessId, setLogSuccessId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [expandedErrorIds, setExpandedErrorIds] = useState<string[]>([]);

  const toggleErrorDetails = (id: string) => {
    setExpandedErrorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasTriggeredInitial = useRef(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('blu_field_assistant_chat', JSON.stringify(messages));
    } catch (e) {
      console.error('Feil ved lagring av felt-chat til localStorage:', e);
    }
  }, [messages]);

  // Henter og synkroniserer chat fra Firestore
  useEffect(() => {
    const fetchRemoteChat = async () => {
      const currentUser = user || auth.currentUser;
      if (!currentUser) {
        setIsCloudSynced(false);
        return;
      }

      try {
        const chatDoc = await getDoc(doc(db, 'users', currentUser.uid, 'field_assistant_chats', 'main'));
        if (chatDoc.exists()) {
          const data = chatDoc.data();
          if (Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages(data.messages);
            localStorage.setItem('blu_field_assistant_chat', JSON.stringify(data.messages));
            setIsCloudSynced(true);
          }
        } else {
          setIsCloudSynced(true);
        }
      } catch (err) {
        console.warn('Kunne ikke hente felt-chat fra Firestore:', err);
      }
    };

    fetchRemoteChat();

    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (u) {
        fetchRemoteChat();
      }
    });

    return () => unsubscribe();
  }, [user]);

  const saveChatToFirebase = async (updatedMsgs: ChatMessage[]) => {
    try {
      const currentUser = user || auth.currentUser;
      if (!currentUser) return;
      await setDoc(doc(db, 'users', currentUser.uid, 'field_assistant_chats', 'main'), {
        messages: updatedMsgs,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setIsCloudSynced(true);
    } catch (err) {
      console.warn('Feil ved lagring av felt-chat til Firestore:', err);
    }
  };

  // Handle initialPrompt if passed
  useEffect(() => {
    if (initialPrompt && !hasTriggeredInitial.current) {
      hasTriggeredInitial.current = true;
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || isLoading) return;

    // Fjern tidligere feilmeldinger fra samtalen
    const existingClean = messages.filter(m => {
      if (!m || !m.content) return false;
      if (m.id.startsWith('asst-err')) return false;
      if (m.isError) return false;
      if (m.content.includes('Det oppstod et midlertidig') || m.content.includes('midlertidig feil')) return false;
      return true;
    });

    // Unngå dupliserte brukermeldinger ved "Prøv igjen"
    let updatedWithUser = existingClean;
    const lastMsg = existingClean[existingClean.length - 1];
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== prompt) {
      const userMsg: ChatMessage = {
        id: `usr-${Date.now()}`,
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString()
      };
      updatedWithUser = [...existingClean, userMsg];
    }

    setMessages(updatedWithUser);
    setInput('');
    setIsLoading(true);

    try {
      // Bygg ren historikk for Gemini
      const cleanForAi = updatedWithUser.filter(m => {
        if (!m || !m.content) return false;
        if (m.id.startsWith('asst-err') || m.isError) return false;
        if (m.id === 'msg-welcome' && updatedWithUser.length > 2) return false;
        return true;
      });

      const firstUserIdx = cleanForAi.findIndex(m => m.role === 'user');
      const validHistory = firstUserIdx !== -1 ? cleanForAi.slice(firstUserIdx) : cleanForAi;

      // Slå sammen påfølgende meldinger med samme rolle (turn-vekslingskontroll)
      const formattedTurns: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
      for (const m of validHistory.slice(-10)) {
        const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';
        if (formattedTurns.length > 0 && formattedTurns[formattedTurns.length - 1].role === role) {
          formattedTurns[formattedTurns.length - 1].parts[0].text += `\n\n${m.content}`;
        } else {
          formattedTurns.push({ role, parts: [{ text: m.content }] });
        }
      }

      let responseString = '';
      try {
        const rawResponse = await callGoogleAIProxy({
          model: 'gemini-3.8-flash',
          contents: formattedTurns.length > 0 ? formattedTurns : prompt,
          config: {
            systemInstruction: FIELD_SYSTEM_INSTRUCTION,
          }
        });

        responseString = typeof rawResponse === 'string' 
          ? rawResponse 
          : (rawResponse && typeof rawResponse === 'object' && 'text' in rawResponse ? String(rawResponse.text) : '');
      } catch (proxyErr) {
        console.warn('callGoogleAIProxy feilet, forsøker kallGeminiCloudFunction fallback:', proxyErr);
        try {
          const { kallGeminiCloudFunction } = await import('../../services/geminiService');
          const fbRes = await kallGeminiCloudFunction(prompt);
          if (fbRes?.resultatTekst) {
            responseString = fbRes.resultatTekst;
          } else {
            throw proxyErr;
          }
        } catch {
          throw proxyErr;
        }
      }

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: responseString.trim() || 'Beklager, jeg kunne ikke generere svar akkurat nå. Prøv igjen om litt!',
        timestamp: new Date().toISOString()
      };

      const finalMsgs = [...updatedWithUser, assistantMsg];
      setMessages(finalMsgs);
      await saveChatToFirebase(finalMsgs);
    } catch (err: any) {
      console.error('Field assistant error:', err);
      const msg = err?.message || String(err || '');
      let userNotice = 'Det oppstod et midlertidig avbrudd i tilkoblingen til veilederen. Klikk på «Prøv igjen» nedenfor for å koble til på nytt.';

      if (msg.includes('logget inn') || msg.includes('autentisering') || msg.includes('401')) {
        userNotice = '🔒 Du må være logget inn for å bruke Feltveilederen. Vennligst logg inn med din studentkonto øverst i appen.';
      } else if (msg.includes('429') || msg.includes('pågang') || msg.includes('kvote')) {
        userNotice = '⏳ Feltveilederen opplever stor pågang akkurat nå. Vent noen sekunder og send meldingen din på nytt.';
      } else if (msg && !msg.includes('[object') && msg.length < 250) {
        userNotice = msg;
      }

      const technicalDetails = `Tjeneste: Google Gemini (@google/genai direkte)\nStatus: ${err?.status || 'NETTVERK / API-AVBRUDD'}\nMottatt feil: ${msg || 'Ingen detaljert feilmelding mottatt'}\nTidsstempel: ${new Date().toLocaleString()}`;

      const errorMsg: ChatMessage = {
        id: `asst-err-${Date.now()}`,
        role: 'assistant',
        content: userNotice,
        errorDetails: technicalDetails,
        timestamp: new Date().toISOString(),
        isError: true,
        retryPrompt: prompt
      };
      const finalWithErr = [...updatedWithUser, errorMsg];
      setMessages(finalWithErr);
      await saveChatToFirebase(finalWithErr);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = (retryPrompt?: string) => {
    if (!retryPrompt || isLoading) return;
    setMessages(prev => prev.filter(m => !m.id.startsWith('asst-err')));
    handleSend(retryPrompt);
  };

  const handleStartNySamtale = async () => {
    const reset: ChatMessage[] = [
      {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Hei igjen! Hva lurer du på i praksishverdagen din i dag?',
        timestamp: new Date().toISOString()
      }
    ];
    setMessages(reset);
    localStorage.setItem('blu_field_assistant_chat', JSON.stringify(reset));
    await saveChatToFirebase(reset);
    showToast('✨ Ny samtale startet.');
  };

  const handleSlettChat = async () => {
    setMessages([]);
    localStorage.removeItem('blu_field_assistant_chat');
    await saveChatToFirebase([]);
    showToast('🗑️ Chatten ble slettet.');
  };

  const handleDeleteSingleMessage = async (msgId: string) => {
    const updated = messages.filter(m => m.id !== msgId);
    setMessages(updated);
    localStorage.setItem('blu_field_assistant_chat', JSON.stringify(updated));
    await saveChatToFirebase(updated);
    showToast('🗑️ Meldingen ble slettet.');
  };

  const handleSaveToKladdebok = async (msg: ChatMessage) => {
    const rawPreview = msg.content.replace(/[#*`_]/g, '').trim();
    const title = rawPreview.substring(0, 45) + '...';
    const content = msg.content;
    const category: NoteCategory = msg.content.toLowerCase().includes('rammeplan') ? 'Rammeplanen' : 'Didaktisk idé';

    if (onSaveToNotes) {
      onSaveToNotes(title, content, category);
    } else {
      try {
        const newNote: FieldNote = {
          id: `fn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: `[Veilederråd] ${title}`,
          content: content,
          category: category,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await saveFieldNote(newNote);
      } catch (e) {
        console.error('Feil ved lagring til Kladdebok:', e);
      }
    }

    setSavedSuccessId(msg.id);
    showToast('Innspillet er lagret i Kladdebok i felt!');
    setTimeout(() => setSavedSuccessId(null), 3000);
  };

  const handleSendToLog = async (msg: ChatMessage) => {
    if (onSendToProcessLog) {
      onSendToProcessLog(msg);
      showToast('Oppretter praksislogg med veilederinnspill...');
    } else {
      try {
        const saved = localStorage.getItem('blu_process_logs_v2');
        const logs = saved ? JSON.parse(saved) : [];
        const rawPreview = msg.content.replace(/[#*`_]/g, '').trim();
        const newLog = {
          id: `log-${Date.now()}`,
          title: `Didaktisk sparring: ${rawPreview.substring(0, 40)}...`,
          situation: 'Veiledersparring og didaktisk drøfting i felt.',
          reflection: msg.content,
          theoryLinks: 'Rammeplan for barnehagen & barnehagepedagogisk teori',
          category: 'Didaktisk refleksjon',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('blu_process_logs_v2', JSON.stringify([newLog, ...logs]));

        const currentUser = user || auth.currentUser;
        if (currentUser) {
          await setDoc(doc(db, 'processLogs', newLog.id), {
            ...newLog,
            userId: currentUser.uid
          }, { merge: true });
        }

        setLogSuccessId(msg.id);
        showToast('Overført til Prosessloggen!');
        if (onGoToProcessLog) {
          setTimeout(() => onGoToProcessLog(), 700);
        }
      } catch (e) {
        console.error('Feil ved sending til logg:', e);
      }
    }
  };

  const handleCopy = (msg: ChatMessage) => {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopiedMsgId(msg.id);
      showToast('Kopiert til utklippstavlen!');
      setTimeout(() => setCopiedMsgId(null), 2000);
    });
  };

  return (
    <div className="w-full">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-4 right-4 z-[150] max-w-md mx-auto bg-slate-900 text-white text-xs font-bold py-3 px-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-slate-700"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMsg}</span>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* DESKTOP / FULLSKJERMSMODUS VISNING (skjermstørrelse md: og oppover)        */}
      {/* ========================================================================= */}
      <div className="hidden md:flex w-full max-w-6xl mx-auto px-6 py-6 gap-6 h-[calc(100vh-120px)]">
        
        {/* Venstre kolonne / Sidebar med didaktiske temaer og snarveier */}
        <div className="w-80 shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Info Card */}
          <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 text-white rounded-3xl p-6 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold text-white">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Feltveileder
              </span>
              <span className="text-[11px] text-indigo-200 flex items-center gap-1">
                <Cloud className="w-3.5 h-3.5 text-emerald-300" />
                {isCloudSynced ? 'Sky-lagret' : 'Aktiv'}
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight">Rask faglig sparring</h2>
            <p className="text-xs text-indigo-100 leading-relaxed">
              Din lynraske didaktiske rådgiver for barnehagehverdagen. Kobler observasjoner direkte mot Rammeplanen og sentral pedagogisk teori.
            </p>
          </div>

          {/* Hurtig-sparring forslag */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              Sentrale didaktiske temaer
            </h3>
            <div className="space-y-1.5">
              {FIELD_SUGGESTIONS.map((item, idx) => (
                <button
                  key={`desktop-sug-${idx}`}
                  onClick={() => handleSend(item.prompt)}
                  disabled={isLoading}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 bg-slate-50/70 hover:bg-indigo-50/60 text-xs font-bold text-slate-700 hover:text-indigo-900 transition-all cursor-pointer flex items-center justify-between group disabled:opacity-50"
                >
                  <span className="line-clamp-1">{item.label}</span>
                  <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Snarveier til Kladdebok & Prosesslogg */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-2 mt-auto">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Arbeidsflyt i felt
            </h4>
            {onGoToNotes && (
              <button
                onClick={onGoToNotes}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>Åpne Kladdebok i felt</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            {onGoToProcessLog && (
              <button
                onClick={onGoToProcessLog}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Gå til Prosesslogg</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Høyre kolonne: Samtaleområde */}
        <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">Feltveileder • Aktiv sparring</h3>
                <p className="text-xs text-slate-400 font-medium">
                  {messages.length} meldinger i samtalen • Lagres automatisk
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleStartNySamtale}
                className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Start ny samtale"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ny samtale</span>
              </button>
              <button
                onClick={handleSlettChat}
                className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Slett samtale-historikken"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Slett chat</span>
              </button>
            </div>
          </div>

          {/* Meldinger */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={`desktop-msg-${m.id}`}
                  className={cn("flex flex-col", isUser ? "items-end" : "items-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-3xl p-5 text-sm leading-relaxed shadow-xs space-y-2",
                      isUser
                        ? "bg-indigo-600 text-white rounded-br-xs font-medium"
                        : "bg-slate-50 text-slate-800 border border-slate-200/90 rounded-bl-xs"
                    )}
                  >
                    {!isUser ? (
                      <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        <div className="pt-2 mt-1 border-t border-indigo-500/40 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-indigo-200">Bruker</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleMessage(m.id)}
                            className="p-1 text-indigo-200 hover:text-white hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
                            title="Slett denne boblen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}

                    {/* Handlinger under veileder-svar */}
                    {!isUser && m.id !== 'msg-welcome' && (
                      m.isError || m.id.startsWith('asst-err') ? (
                        <div className="pt-2.5 mt-2.5 border-t border-rose-100 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleRetry(m.retryPrompt)}
                              disabled={isLoading}
                              className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                            >
                              <RotateCw className="w-3.5 h-3.5 text-rose-600" />
                              <span>Prøv igjen</span>
                            </button>
                            <div className="flex items-center gap-2">
                              {m.errorDetails && (
                                <button
                                  type="button"
                                  onClick={() => toggleErrorDetails(m.id)}
                                  className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                                >
                                  {expandedErrorIds.includes(m.id) ? 'Skjul feildetaljer' : 'Vis feildetaljer'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteSingleMessage(m.id)}
                                className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-100/80 rounded-lg transition-colors cursor-pointer"
                                title="Slett denne feilmeldingen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {m.errorDetails && expandedErrorIds.includes(m.id) && (
                            <div className="p-3 bg-slate-900 text-rose-200 rounded-xl text-[11px] font-mono whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner space-y-2">
                              <p className="font-bold text-amber-300 border-b border-slate-800 pb-1">Teknisk feildiagnostikk:</p>
                              <div>{m.errorDetails}</div>
                              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 font-sans">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(m.errorDetails || '');
                                    showToast('Feilrapport kopiert!');
                                  }}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" /> Kopier feilrapport
                                </button>
                                <button
                                  type="button"
                                  onClick={() => window.location.reload()}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <RotateCw className="w-3 h-3" /> Tøm cache & oppdater
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="pt-3 mt-3 border-t border-slate-200/70 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveToKladdebok(m)}
                              className={cn(
                                "inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                savedSuccessId === m.id
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : "bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200"
                              )}
                            >
                              {savedSuccessId === m.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Lagret i Kladdebok!</span>
                                </>
                              ) : (
                                <>
                                  <BookmarkPlus className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Lagre til Kladdebok</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleSendToLog(m)}
                              className={cn(
                                "inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                logSuccessId === m.id
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : "bg-white hover:bg-amber-50 text-amber-800 border border-amber-200"
                              )}
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-600" />
                              <span>Send til Prosesslogg</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopy(m)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white transition-colors cursor-pointer"
                              title="Kopier svar"
                            >
                              {copiedMsgId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSingleMessage(m.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                              title="Slett denne boblen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl w-fit">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span className="text-xs text-slate-600 font-medium">Veilederen formulerer didaktisk begrunnelse...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Inputfelt */}
          <div className="p-4 border-t border-slate-100 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-3 bg-slate-50 border border-slate-200 focus-within:border-indigo-600 focus-within:bg-white rounded-2xl p-2 transition-all shadow-2xs"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Skriv en observasjon eller spørsmål om Rammeplanen, didaktikk eller pedagogikk..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBIL VISNING (Kompakt, profesjonell og tilpasset feltsituasjonen, skjult på md:) */}
      {/* ========================================================================= */}
      <div className="md:hidden w-full max-w-xl mx-auto px-3 sm:px-6 pb-48 flex flex-col min-h-[calc(100vh-140px)]">
        {/* Header Banner - identisk designspråk som Kladdebok og Prosesslogg */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 text-white rounded-3xl p-5 sm:p-7 shadow-md mb-4 relative overflow-hidden shrink-0">
          <div className="relative z-10 flex flex-col gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold text-white tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Didaktisk sparring i felt
                </span>
                <span className="text-[11px] font-semibold text-indigo-100 flex items-center gap-1 bg-indigo-900/40 px-2.5 py-1 rounded-full">
                  {user ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Sky-synkronisert ({messages.length} meldinger)
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3 h-3 text-indigo-300" />
                      Lokal modus ({messages.length} meldinger)
                    </>
                  )}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                Feltveileder
              </h1>
              <p className="text-xs sm:text-sm text-indigo-100/95 max-w-xl mt-1 leading-relaxed">
                Lynrask faglig sparring for barnehagepraksis. Forankret i Rammeplanen og sentral pedagogisk teori.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleStartNySamtale}
                className="flex-1 py-3 px-4 bg-white text-indigo-950 hover:bg-indigo-50 font-bold rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 text-indigo-600" /> Start ny samtale
              </button>
              {messages.length > 1 && (
                <button
                  onClick={handleSlettChat}
                  title="Slett samtale-historikk"
                  className="p-3 bg-white/10 hover:bg-rose-500/30 text-white rounded-2xl transition-all text-xs cursor-pointer flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hurtig-snarveier mellom Kladdebok og Prosesslogg i felt */}
        <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
          {onGoToNotes && (
            <button
              onClick={onGoToNotes}
              className="py-2 px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-between border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-1.5 truncate">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Kladdebok</span>
              </div>
              <ArrowRight className="w-3 h-3 text-emerald-500 shrink-0" />
            </button>
          )}
          {onGoToProcessLog && (
            <button
              onClick={onGoToProcessLog}
              className="py-2 px-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-between border border-amber-200 transition-colors cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-1.5 truncate">
                <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">Prosesslogg</span>
              </div>
              <ArrowRight className="w-3 h-3 text-amber-500 shrink-0" />
            </button>
          )}
        </div>

        {/* Suggestion Chips - didaktiske temaer for rask inspirasjon */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 shrink-0">
          {FIELD_SUGGESTIONS.map((item, idx) => (
            <button
              key={`mob-sug-${idx}`}
              onClick={() => handleSend(item.prompt)}
              disabled={isLoading}
              className="px-3 py-1.5 bg-white border border-indigo-100 hover:border-indigo-300 text-indigo-900 rounded-xl text-xs font-bold whitespace-nowrap shadow-2xs hover:bg-indigo-50/50 transition-all shrink-0 disabled:opacity-50 cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 space-y-3.5 py-1 overflow-y-auto">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col",
                  isUser ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[92%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs space-y-2",
                    isUser
                      ? "bg-indigo-600 text-white rounded-br-xs font-medium"
                      : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs"
                  )}
                >
                  {!isUser ? (
                    <div className="prose prose-xs sm:prose-sm max-w-none text-slate-800 leading-relaxed">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <div className="pt-1.5 mt-1 border-t border-indigo-500/40 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-indigo-200">Bruker</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleMessage(m.id)}
                          className="p-1 text-indigo-200 hover:text-white hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
                          title="Slett denne boblen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}

                  {/* Handlinger under assistentsvar på mobil */}
                  {!isUser && m.id !== 'msg-welcome' && (
                    m.isError || m.id.startsWith('asst-err') ? (
                      <div className="pt-2 mt-2 border-t border-rose-100 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleRetry(m.retryPrompt)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            <RotateCw className="w-3.5 h-3.5 text-rose-600" />
                            <span>Prøv igjen</span>
                          </button>
                          <div className="flex items-center gap-2">
                            {m.errorDetails && (
                              <button
                                type="button"
                                onClick={() => toggleErrorDetails(m.id)}
                                className="text-[10px] font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                              >
                                {expandedErrorIds.includes(m.id) ? 'Skjul feildetaljer' : 'Vis feildetaljer'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteSingleMessage(m.id)}
                              className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-100/80 rounded-lg transition-colors cursor-pointer"
                              title="Slett denne feilmeldingen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {m.errorDetails && expandedErrorIds.includes(m.id) && (
                          <div className="p-2.5 bg-slate-900 text-rose-200 rounded-xl text-[10px] font-mono whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner space-y-2">
                            <p className="font-bold text-amber-300 border-b border-slate-800 pb-1">Teknisk feildiagnostikk:</p>
                            <div>{m.errorDetails}</div>
                            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 font-sans">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(m.errorDetails || '');
                                  showToast('Feilrapport kopiert!');
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Copy className="w-3 h-3" /> Kopier feilrapport
                              </button>
                              <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <RotateCw className="w-3 h-3" /> Tøm cache & oppdater
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Lagre til Kladdebok */}
                          <button
                            onClick={() => handleSaveToKladdebok(m)}
                            className={cn(
                              "inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer active:scale-95",
                              savedSuccessId === m.id
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                            )}
                          >
                            {savedSuccessId === m.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Lagret i Kladdebok!</span>
                              </>
                            ) : (
                              <>
                                <BookmarkPlus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Lagre i Kladdebok</span>
                              </>
                            )}
                          </button>

                          {/* Send til Prosesslogg */}
                          <button
                            onClick={() => handleSendToLog(m)}
                            className={cn(
                              "inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer active:scale-95",
                              logSuccessId === m.id
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                            )}
                          >
                            {logSuccessId === m.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Sendt til logg!</span>
                              </>
                            ) : (
                              <>
                                <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Send til logg</span>
                              </>
                            )}
                          </button>

                          {/* Kopier knapp */}
                          <button
                            onClick={() => handleCopy(m)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors ml-auto cursor-pointer"
                            title="Kopier svar"
                          >
                            {copiedMsgId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          {/* Slett enkelt-boble knapp */}
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleMessage(m.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Slett denne boblen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </motion.div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl w-fit shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span className="text-xs text-slate-500 font-medium">Feltveilederen henter didaktiske perspektiver...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar - plassert perfekt over mobil-subnavigasjonen */}
        <div className="fixed bottom-[104px] left-0 right-0 z-[80] bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="max-w-xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 bg-slate-50 border-2 border-indigo-200 focus-within:border-indigo-600 focus-within:bg-white rounded-2xl p-1.5 shadow-2xs transition-colors"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Spør om Rammeplan, didaktikk, situasjon..."
                disabled={isLoading}
                className="flex-1 px-3 py-1.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs active:scale-95"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
