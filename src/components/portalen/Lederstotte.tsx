import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  MessageCircle, 
  FileText, 
  Send, 
  User, 
  BrainCircuit, 
  Copy, 
  Check, 
  RefreshCw,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../../firebase';
import { formatObjektivPPTLogg, askSamtaleMentor, stripAllEmojis } from '../../services/geminiService';

export interface LederstotteProps {
  initialFane?: 'ppt' | 'sparring';
  avdelingNavn?: string;
  initialObservasjon?: string;
}

interface ChatMessage {
  rolle: 'ki' | 'bruker';
  tekst: string;
}

export default function Lederstotte({
  initialFane = 'ppt',
  avdelingNavn = 'Blåbærtua',
  initialObservasjon = ''
}: LederstotteProps) {
  const [aktivFane, setAktivFane] = useState<'ppt' | 'sparring'>(initialFane);
  
  // States for PPT-Logg (Bekymrings-ruten)
  const [barnetsNavn, setBarnetsNavn] = useState<string>(() => {
    return localStorage.getItem('lederstotte_barnets_navn') || '';
  });
  const [observasjon, setObservasjon] = useState<string>(initialObservasjon || (() => {
    return localStorage.getItem('lederstotte_observasjon') || '';
  }));
  const [generertLogg, setGenerertLogg] = useState<string>(() => {
    return localStorage.getItem('lederstotte_generert_logg') || '';
  });
  const [erFjernetNavn, setErFjernetNavn] = useState<boolean>(false);
  const [isPptLoading, setIsPptLoading] = useState<boolean>(false);
  const [pptFeil, setPptFeil] = useState<string | null>(null);
  const [kopiertPpt, setKopiertPpt] = useState<boolean>(false);

  // States for Sokratisk Sparring
  const [sparringInput, setSparringInput] = useState<string>('');
  const [isSparringLoading, setIsSparringLoading] = useState<boolean>(false);
  const [sparringFeil, setSparringFeil] = useState<string | null>(null);
  const [chatHistorikk, setChatHistorikk] = useState<ChatMessage[]>(() => {
    try {
      const lagret = localStorage.getItem('lederstotte_sparring_chat');
      if (lagret) return JSON.parse(lagret);
    } catch {}
    return [
      { 
        rolle: 'ki', 
        tekst: `Hei! Jeg er din sokratiske sparringspartner for lederoppgaver på ${avdelingNavn}. Står du overfor en utfordrende foreldresamtale, en krevende personalsamtale, eller et dilemma på avdelingen? Beskriv situasjonen eller velg et tema nedenfor, så reflekterer vi sammen.` 
      }
    ];
  });

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-lagring i localStorage
  useEffect(() => {
    localStorage.setItem('lederstotte_barnets_navn', barnetsNavn);
  }, [barnetsNavn]);

  useEffect(() => {
    localStorage.setItem('lederstotte_observasjon', observasjon);
  }, [observasjon]);

  useEffect(() => {
    localStorage.setItem('lederstotte_generert_logg', generertLogg);
  }, [generertLogg]);

  useEffect(() => {
    try {
      localStorage.setItem('lederstotte_sparring_chat', JSON.stringify(chatHistorikk));
    } catch {}
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistorikk, isSparringLoading]);

  // Logikken for Anonymiserings-skjoldet (Kjøres 100% LOKALT på enheten)
  const handleAnonymiserOgSend = async () => {
    setPptFeil(null);

    if (!barnetsNavn.trim()) {
      alert("Sikkerhetsstopp: Du må fylle inn barnets navn for at skjoldet skal kunne fjerne det fra teksten.");
      return;
    }
    if (!observasjon.trim()) {
      setPptFeil("Fyll inn observasjonsnotatet før du genererer loggen.");
      return;
    }

    // Bygger et regulært uttrykk som finner navnet uansett store/små bokstaver
    const escapedNavn = barnetsNavn.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const navnRegex = new RegExp(`\\b${escapedNavn}(s)?\\b`, 'gi');
    
    // Bytter ut navnet med [BARNET] før dataen sendes
    const vasketTekst = observasjon.replace(navnRegex, (_match, eieform) => `[BARNET]${eieform || ''}`);
    
    setErFjernetNavn(true);
    setIsPptLoading(true);

    console.log("SENDES TIL KI (Helt anonymt):", vasketTekst);

    try {
      let ferdigLogg = '';

      // 1. Forsøk ekte kall til Firebase Cloud Function 'pedlederAI'
      try {
        const functions = getFunctions(app, 'europe-west1');
        const pedlederAI = httpsCallable<{ prompt: string }, { success: boolean; resultatTekst: string }>(functions, 'pedlederAI');

        const prompt = `Du er en spesialpedagog og ekspert på PPT-henvisninger og pedagogisk observasjon i barnehagen.
Gjør om denne ustrukturerte observasjonen til en profesjonell, objektiv logg egnet for PPT/BUP.

Regler:
- Vær 100% objektiv. Beskriv hva barnet GJØR, ikke hva du TROR barnet føler.
- Behold [BARNET] som referanse.
- Ingen emojier. Språket skal være formelt, konsist og presist.
- Strukturer nøyaktig slik:
SITUASJONSBESKRIVELSE: 
[Kort om rammen: Hva skjedde i forkant, hvor var de, hvem var til stede?]

OBSERVERT ATFERD: 
[Nøytral, konkret beskrivelse av hva [BARNET] faktisk gjorde/sa]

PEDAGOGENS TILTAK I SITUASJONEN: 
[Hva gjorde den voksne for å støtte, avverge eller veilede?]

BARNETS RESPONS PÅ TILTAK: 
[Hvordan reagerte [BARNET] på den voksnes inngripen?]

REFLEKSJONSSPØRSMÅL TIL PEDLEDER: 
[Still ett kort, analytisk spørsmål for å hjelpe pedlederen med å se mønstre]

Observasjonsnotat:
${vasketTekst}`;

        const response = await pedlederAI({ prompt });
        if (response?.data?.resultatTekst) {
          ferdigLogg = response.data.resultatTekst;
        }
      } catch (cloudErr) {
        console.warn("Firebase Cloud Function pedlederAI utilgjengelig eller krever innlogging, bruker fallback:", cloudErr);
      }

      // 2. Fallback til formatObjektivPPTLogg
      if (!ferdigLogg) {
        const resultat = await formatObjektivPPTLogg(vasketTekst, {
          alder: '3-5 år',
          fokusomraade: 'Observasjon & Spesialpedagogisk vurdering'
        });
        ferdigLogg = resultat.fullTekst;
      }

      setGenerertLogg(ferdigLogg);
    } catch (err: any) {
      console.error("Feil ved generering av objektiv PPT-logg:", err);
      setPptFeil(err?.message || "Kunne ikke generere objektiv logg akkurat nå. Vennligst prøv igjen.");
    } finally {
      setIsPptLoading(false);
      setErFjernetNavn(false);
    }
  };

  const handleSendSparring = async (valgfriTekst?: string) => {
    const tekstToSend = (valgfriTekst || sparringInput).trim();
    if (!tekstToSend || isSparringLoading) return;
    
    if (!valgfriTekst) setSparringInput('');
    setSparringFeil(null);

    // Legger til brukerens melding i loggen
    const nyHistorikk: ChatMessage[] = [...chatHistorikk, { rolle: 'bruker', tekst: tekstToSend }];
    setChatHistorikk(nyHistorikk);
    setIsSparringLoading(true);

    try {
      let kiSvar = '';

      // 1. Forsøk ekte kall til Firebase Cloud Function 'pedlederAI'
      try {
        const functions = getFunctions(app, 'europe-west1');
        const pedlederAI = httpsCallable<{ prompt: string }, { success: boolean; resultatTekst: string }>(functions, 'pedlederAI');

        const prompt = `Du er en erfaren veileder og sparringspartner for pedagogiske ledere i barnehagen.
Hjelp pedlederen med å forberede en utfordrende foreldresamtale eller personalsamtale.
Bruk sokratisk metode (still reflekterende spørsmål, hjelp med formuleringer, forankre i Rammeplanen for barnehagen).
Ingen emojier.

Samtalehistorikk og pedleders innspill:
${nyHistorikk.map(m => `${m.rolle === 'bruker' ? 'Pedleder' : 'Veileder'}: ${m.tekst}`).join('\n')}
Pedleder: ${tekstToSend}`;

        const response = await pedlederAI({ prompt });
        if (response?.data?.resultatTekst) {
          kiSvar = response.data.resultatTekst;
        }
      } catch (cloudErr) {
        console.warn("Firebase Cloud Function pedlederAI for sparring utilgjengelig, bruker fallback:", cloudErr);
      }

      // 2. Fallback til askSamtaleMentor
      if (!kiSvar) {
        const formatertHistorikk = nyHistorikk.map(m => ({
          role: m.rolle === 'bruker' ? 'user' : 'assistant',
          content: m.tekst
        }));

        kiSvar = await askSamtaleMentor(formatertHistorikk, {
          samtaleType: 'generell'
        });
      }

      setChatHistorikk(prev => [...prev, { 
        rolle: 'ki', 
        tekst: stripAllEmojis(kiSvar) 
      }]);
    } catch (err: any) {
      console.error("Feil ved sokratisk sparring:", err);
      setSparringFeil(err?.message || "Klarte ikke å kontakte sparringspartneren akkurat nå.");
    } finally {
      setIsSparringLoading(false);
    }
  };

  const handleKopierTilFagsystem = () => {
    if (!generertLogg) return;
    navigator.clipboard.writeText(generertLogg);
    setKopiertPpt(true);
    setTimeout(() => setKopiertPpt(false), 2500);
  };

  const handleNullstillPpt = () => {
    setBarnetsNavn('');
    setObservasjon('');
    setGenerertLogg('');
    setPptFeil(null);
    localStorage.removeItem('lederstotte_barnets_navn');
    localStorage.removeItem('lederstotte_observasjon');
    localStorage.removeItem('lederstotte_generert_logg');
  };

  const [sparringVarsel, setSparringVarsel] = useState<string | null>(null);

  const handleStartNySparring = () => {
    setChatHistorikk([
      { 
        rolle: 'ki', 
        tekst: `Hei! Jeg er din sokratiske sparringspartner for lederoppgaver på ${avdelingNavn}. Står du overfor en utfordrende foreldresamtale, en krevende personalsamtale, eller et dilemma på avdelingen? Beskriv situasjonen eller klikk på et av hurtigvalgene under, så tar vi det steg for steg.` 
      }
    ]);
    setSparringInput('');
    setSparringFeil(null);
    localStorage.removeItem('lederstotte_sparring_chat');
    setSparringVarsel('✨ Ny sparringsøkt startet!');
    setTimeout(() => setSparringVarsel(null), 3000);
  };

  const handleSlettChat = () => {
    setChatHistorikk([]);
    setSparringInput('');
    setSparringFeil(null);
    localStorage.removeItem('lederstotte_sparring_chat');
    setSparringVarsel('🗑️ Chatten ble slettet.');
    setTimeout(() => setSparringVarsel(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 font-sans text-slate-800">
      
      {/* Toast-varsel for sparring */}
      {sparringVarsel && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-fade-in border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{sparringVarsel}</span>
        </div>
      )}

      {/* HEADER & FANER */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <BrainCircuit className="text-emerald-500 w-8 h-8 shrink-0" />
            <span>Lederstøtte</span>
          </h1>

          <div className="flex items-center gap-2">
            {aktivFane === 'ppt' ? (
              <button
                onClick={handleNullstillPpt}
                className="text-xs text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition"
              >
                Tøm felter
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartNySparring}
                  className="text-xs font-bold text-slate-700 hover:text-emerald-800 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  title="Start en ny sparring med åpningsreplikk fra mentoren"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Start ny sparring</span>
                </button>
                <button
                  type="button"
                  onClick={handleSlettChat}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-white hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  title="Slett chat-historikken fullstendig"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Slett chat</span>
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setAktivFane('ppt')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all text-xs sm:text-sm ${
              aktivFane === 'ppt' 
                ? 'bg-white text-slate-900 shadow-sm font-bold' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" /> 
            <span>PPT-Logg (Bekymringsruten)</span>
          </button>
          <button 
            onClick={() => setAktivFane('sparring')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all text-xs sm:text-sm ${
              aktivFane === 'sparring' 
                ? 'bg-white text-slate-900 shadow-sm font-bold' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" /> 
            <span>Sokratisk Sparring</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        
        {/* FANE 1: BEKYMRINGSRUTEN (PPT) */}
        {aktivFane === 'ppt' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Arbeidsbenken */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Rå-observasjon</h2>
                    <p className="text-slate-500 text-sm mt-1">Skriv naturlig. Skjoldet anonymiserer før sending.</p>
                  </div>
                  {barnetsNavn.trim() ? (
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-4 h-4" /> Skjold Aktivt
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      <ShieldAlert className="w-4 h-4" /> Skjold Inaktivt
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" /> Barnets fornavn (Fjernes lokalt)
                    </label>
                    <input 
                      type="text" 
                      placeholder="F.eks. Kari"
                      value={barnetsNavn}
                      onChange={(e) => setBarnetsNavn(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Ditt notat / stikkord fra dagen</label>
                    <textarea 
                      rows={4}
                      placeholder="Kari ble kjempesint i sandkassen og dyttet Ole... (Enter gir sideskift/ny linje)"
                      value={observasjon}
                      onChange={(e) => setObservasjon(e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-y min-h-[100px] text-sm leading-relaxed"
                    />
                  </div>

                  {pptFeil && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{pptFeil}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <button 
                  onClick={handleAnonymiserOgSend}
                  disabled={isPptLoading || erFjernetNavn}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
                >
                  {isPptLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                      <span>Anonymiserer og prosesserer...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 text-emerald-400" /> 
                      <span>Anonymiser & Generer PPT-Logg</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Output: Den ferdige loggen */}
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 flex flex-col min-h-[480px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Generert Objektiv Logg</h2>
                {generertLogg && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Klargjort for PPT
                  </span>
                )}
              </div>
              
              {generertLogg ? (
                <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 whitespace-pre-wrap text-sm text-slate-700 shadow-inner overflow-y-auto leading-relaxed font-sans">
                  {generertLogg}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                  <FileText className="w-10 h-10 mb-2 opacity-40 text-slate-500" />
                  <p className="font-semibold text-slate-600">Loggen vil dukke opp her.</p>
                  <p className="text-xs text-slate-400 mt-1">Garantert fri for navn og synsing.</p>
                </div>
              )}
              
              {generertLogg && (
                <div className="mt-4 flex gap-3">
                  <button 
                    onClick={handleKopierTilFagsystem}
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
                  >
                    {kopiertPpt ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Kopiert til utklippstavle!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Kopier til fagsystem</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FANE 2: SOKRATISK SPARRING */}
        {aktivFane === 'sparring' && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 h-[640px] flex flex-col">
            
            {/* Header i sparrings-chatten */}
            <div className="p-4 px-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 rounded-t-[2rem]">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800">Sokratisk Mentor for Pedledere</span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">• Refleksjon, verktøy & rollespill</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartNySparring}
                  className="text-xs font-bold text-slate-700 hover:text-emerald-800 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                  title="Start en ny sparring med åpningsreplikk fra mentoren"
                >
                  <RefreshCw className="w-3 h-3 text-emerald-600" />
                  <span>Start ny sparring</span>
                </button>
                <button
                  type="button"
                  onClick={handleSlettChat}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                  title="Slett chat-historikken fullstendig"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Slett chat</span>
                </button>
              </div>
            </div>

            {/* Chat-område */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/20">
              {chatHistorikk.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 animate-fade-in">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Chatten er slettet</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Samtalehistorikken er tømt. Du kan skrive en ny melding nedenfor eller starte en ny veiledningsøkt.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartNySparring}
                    className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Start ny sparring nå</span>
                  </button>
                </div>
              ) : (
                <>
                  {chatHistorikk.map((msg, index) => (
                    <div key={index} className={`flex ${msg.rolle === 'bruker' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] sm:max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.rolle === 'bruker' 
                          ? 'bg-slate-900 text-white rounded-tr-sm shadow-sm font-medium' 
                          : 'bg-slate-100 text-slate-800 rounded-tl-sm border border-slate-200 shadow-2xs'
                      }`}>
                        {msg.tekst}
                      </div>
                    </div>
                  ))}

                  {/* Hurtigvalg ved ny samtale */}
                  {chatHistorikk.length === 1 && !isSparringLoading && (
                    <div className="pt-2 space-y-2 animate-fade-in">
                      <span className="text-[11px] font-bold text-slate-400 block px-1 uppercase tracking-wider">
                        Klikk for å starte sparring om:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { tittel: 'Vanskelig foreldresamtale', tekst: 'Jeg må forberede en samtale med en misfornøyd forelder som klager på utetid og kalde klær.' },
                          { tittel: 'Konflikt eller motstand i teamet', tekst: 'En erfaren assistent viser motstand mot nye rutiner på avdelingen. Hvordan tar jeg dette opp konstruktivt?' },
                          { tittel: 'Urolig barnegruppe i overganger', tekst: 'Garderobesituasjonen før lunsj er preget av kaos og høyt konfliktnivå. Hvordan kan jeg strukturere dette bedre?' },
                          { tittel: 'Før PPT kobles inn', tekst: 'Vi observerer et barn som strever med samspill og utagering. Hva bør vi prøve av tiltak på avdelingen før henvisning?' }
                        ].map((chip, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendSparring(chip.tekst)}
                            className="text-left p-3 rounded-xl bg-white hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 text-slate-700 transition shadow-2xs flex flex-col gap-1 cursor-pointer group"
                          >
                            <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 flex items-center justify-between">
                              <span>💬 {chip.tittel}</span>
                              <span className="text-[10px] text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition">Start →</span>
                            </span>
                            <span className="text-[11px] text-slate-500 line-clamp-1">{chip.tekst}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {isSparringLoading && (
                <div className="flex items-center gap-2.5 p-3.5 bg-slate-100 rounded-2xl max-w-xs text-xs text-slate-500 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Mentoren reflekterer over situasjonen...</span>
                </div>
              )}

              {sparringFeil && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{sparringFeil}</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input felt */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-[2rem]">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <textarea 
                  rows={4}
                  placeholder="Skriv til din sparringspartner... (Enter gir sideskift/nytt avsnitt)"
                  value={sparringInput}
                  onChange={(e) => setSparringInput(e.target.value)}
                  disabled={isSparringLoading}
                  className="w-full flex-1 p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white leading-relaxed resize-y min-h-[96px]"
                />
                <button 
                  onClick={() => handleSendSparring()}
                  disabled={isSparringLoading || !sparringInput.trim()}
                  className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-colors flex items-center justify-center shrink-0 shadow-sm font-bold text-sm"
                  title="Send melding"
                >
                  <Send className="w-5 h-5 mr-1.5" />
                  <span>Send</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 px-1">
                Enter fungerer som sideskift/linjeskift. Klikk «Send» når du vil sende. Tips: Spør om åpningsreplikker, be om motpartens perspektiv, eller skriv "La oss ta et rollespill!"
              </p>
            </div>
            
          </div>
        )}

      </div>
    </div>
  );
}
