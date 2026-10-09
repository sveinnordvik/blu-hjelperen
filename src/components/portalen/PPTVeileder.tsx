import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  Send, 
  Lock, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  FileText, 
  Copy, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight, 
  Users, 
  HeartHandshake, 
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  BookOpen,
  Trash2,
  Share2,
  Printer
} from 'lucide-react';
import { 
  askPPTVeileder, 
  formatObjektivPPTLogg, 
  StrukturertPPTLogg, 
  stripAllEmojis 
} from '../../services/geminiService';

export interface PPTVeilederProps {
  avdelingNavn?: string;
  initialObservasjon?: string;
  onNavigateToObservasjoner?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  vasketTekst?: string;
  timestamp: string;
}

export default function PPTVeileder({
  avdelingNavn = 'Blåbærtua',
  initialObservasjon = '',
  onNavigateToObservasjoner
}: PPTVeilederProps) {
  // 1. Lokale tilstander for anonymiserings-skjoldet
  const [barnetsNavn, setBarnetsNavn] = useState<string>(() => {
    return localStorage.getItem('ppt_veileder_siste_navn') || '';
  });
  const [observasjon, setObservasjon] = useState<string>(initialObservasjon || (() => {
    return localStorage.getItem('ppt_veileder_kladd_observasjon') || '';
  }));

  const [alder, setAlder] = useState<string>('3-4 år');
  const [fokusomraade, setFokusomraade] = useState<string>('Sosioemosjonell regulering og samspill');
  const [tidligereTiltak, setTidligereTiltak] = useState<string>('');

  // Skjold-visning og verifisering
  const [visVasketForhaandsvisning, setVisVasketForhaandsvisning] = useState(true);
  const [skjoldVarsel, setSkjoldVarsel] = useState<string | null>(null);
  const [kopiert, setKopiert] = useState(false);

  // Visningsmodus i høyre kolonne
  const [aktivVisning, setAktivVisning] = useState<'logg' | 'veiledning'>('logg');
  const [isLoggLoading, setIsLoggLoading] = useState(false);
  const [strukturertLogg, setStrukturertLogg] = useState<StrukturertPPTLogg | null>(() => {
    try {
      const saved = localStorage.getItem('ppt_veileder_strukturert_logg');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  // Chat- og veiledningslogg
  const [chatLog, setChatLog] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('ppt_veileder_chatlog');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [oppfolgingInput, setOppfolgingInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-lagre utkast
  useEffect(() => {
    localStorage.setItem('ppt_veileder_siste_navn', barnetsNavn);
  }, [barnetsNavn]);

  useEffect(() => {
    localStorage.setItem('ppt_veileder_kladd_observasjon', observasjon);
  }, [observasjon]);

  useEffect(() => {
    try {
      if (strukturertLogg) {
        localStorage.setItem('ppt_veileder_strukturert_logg', JSON.stringify(strukturertLogg));
      }
    } catch {}
  }, [strukturertLogg]);

  useEffect(() => {
    try {
      localStorage.setItem('ppt_veileder_chatlog', JSON.stringify(chatLog));
    } catch {}
  }, [chatLog]);

  // Hjelpefunksjon: Vask teksten lokalt på klienten
  const genererVasketTekst = (raatekst: string, navn: string): { vasket: string; antallTreff: number } => {
    if (!raatekst) return { vasket: '', antallTreff: 0 };
    if (!navn.trim()) return { vasket: raatekst, antallTreff: 0 };

    // Støtt komma-separerte navn eller fornavn + etternavn
    const delNavn = navn
      .split(/[,/]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);

    let resultat = raatekst;
    let totaltTreff = 0;

    delNavn.forEach(enkeltNavn => {
      // Unngå regex-feil ved spesialtegn
      const escaped = enkeltNavn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match også eieform (f.eks. Olas -> [BARNET]s)
      const regex = new RegExp(`\\b${escaped}(s)?\\b`, 'gi');
      
      const matcher = resultat.match(regex);
      if (matcher) {
        totaltTreff += matcher.length;
      }
      resultat = resultat.replace(regex, (_match, eieform) => `[BARNET]${eieform || ''}`);
    });

    return { vasket: resultat, antallTreff: totaltTreff };
  };

  const { vasket: liveVasketTekst, antallTreff } = genererVasketTekst(observasjon, barnetsNavn);

  // Objektiviserings-motoren: Strukturerer observasjonen til formell 5-delt PPT-logg
  const handleGenererObjektivPPTLogg = async () => {
    setSkjoldVarsel(null);

    // 1. Sjekk at navnet er fylt ut for at skjoldet skal fungere
    if (!barnetsNavn.trim()) {
      setSkjoldVarsel("Du må fylle inn barnets navn for at anonymiserings-skjoldet skal fungere.");
      return;
    }

    if (!observasjon.trim()) {
      setSkjoldVarsel("Skriv inn eller lim inn observasjonen du ønsker å klargjøre for PPT.");
      return;
    }

    // 2. Skjoldet aktiveres
    const { vasket: vasketTekst } = genererVasketTekst(observasjon, barnetsNavn);

    console.log("Dette sendes til objektivisering (100% anonymt): ", vasketTekst);

    setIsLoggLoading(true);
    setAktivVisning('logg');

    try {
      const loggResultat = await formatObjektivPPTLogg(vasketTekst, { alder, fokusomraade });
      setStrukturertLogg(loggResultat);
    } catch (err: any) {
      console.error(err);
      setSkjoldVarsel(err?.message || "Klarte ikke å generere objektiv PPT-logg.");
    } finally {
      setIsLoggLoading(false);
    }
  };

  // 1-4: Skjold-mekanismen og sending til Gemini for veiledning
  const handleSendTilPPTVeileder = async () => {
    setSkjoldVarsel(null);

    // 1. Sjekk at navnet er fylt ut for at skjoldet skal fungere
    if (!barnetsNavn.trim()) {
      setSkjoldVarsel("Du må fylle inn barnets navn for at anonymiserings-skjoldet skal fungere.");
      return;
    }

    if (!observasjon.trim()) {
      setSkjoldVarsel("Skriv inn eller lim inn observasjonen du ønsker veiledning på.");
      return;
    }

    // 2. Skjoldet aktiveres: Regex finner navnet uansett store/små bokstaver
    const { vasket: vasketTekst } = genererVasketTekst(observasjon, barnetsNavn);

    // 3. Teksten fjerner identifiserende navn lokalt på enheten: "Ola slår" blir til "[BARNET] slår"
    console.log("Dette sendes til KI (100% anonymt): ", vasketTekst);

    setIsLoading(true);
    setAktivVisning('veiledning');

    const brukerMelding: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: vasketTekst,
      vasketTekst: vasketTekst,
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
    };

    const oppdatertHistorikk = [...chatLog, brukerMelding];
    setChatLog(oppdatertHistorikk);

    try {
      // 4. Kaller Gemini-API-et med 'vasketTekst' i stedet for 'observasjon'
      const svar = await askPPTVeileder(
        oppdatertHistorikk.map(m => ({ role: m.role, content: m.content })),
        {
          alder,
          fokusomraade,
          tidligereTiltak,
          vasketObservasjon: vasketTekst
        }
      );

      const assistentMelding: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        role: 'assistant',
        content: svar,
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
      };

      setChatLog(prev => [...prev, assistentMelding]);
    } catch (err: any) {
      console.error(err);
      setSkjoldVarsel(err?.message || "Klarte ikke å kontakte PPT-veilederen akkurat nå.");
    } finally {
      setIsLoading(false);
    }
  };

  // Still oppfølgingsspørsmål til PPT-veilederen
  const handleSendOppfolging = async () => {
    if (!oppfolgingInput.trim() || isLoading) return;

    // Vask også oppfølgingsspørsmålet med samme skjold
    const { vasket: vasketOppfolging } = genererVasketTekst(oppfolgingInput, barnetsNavn);

    setOppfolgingInput('');
    setIsLoading(true);

    const brukerMelding: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: vasketOppfolging,
      vasketTekst: vasketOppfolging,
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
    };

    const oppdatertHistorikk = [...chatLog, brukerMelding];
    setChatLog(oppdatertHistorikk);

    try {
      const svar = await askPPTVeileder(
        oppdatertHistorikk.map(m => ({ role: m.role, content: m.content })),
        {
          alder,
          fokusomraade,
          tidligereTiltak
        }
      );

      const assistentMelding: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        role: 'assistant',
        content: svar,
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
      };

      setChatLog(prev => [...prev, assistentMelding]);
    } catch (err: any) {
      setSkjoldVarsel(err?.message || "Oppfølgingsfeil.");
    } finally {
      setIsLoading(false);
    }
  };

  const [toastFeedback, setToastFeedback] = useState<string | null>(null);

  const visToast = (tekst: string) => {
    setToastFeedback(tekst);
    setTimeout(() => setToastFeedback(null), 3000);
  };

  const handleStartNyVeiledning = () => {
    setChatLog([]);
    setObservasjon('');
    setSkjoldVarsel(null);
    setAktivVisning('veiledning');
    localStorage.removeItem('ppt_veileder_chatlog');
    localStorage.removeItem('ppt_veileder_kladd_observasjon');
    visToast('✨ Ny veiledningsøkt klargjort.');
  };

  const handleSlettChat = () => {
    setChatLog([]);
    localStorage.removeItem('ppt_veileder_chatlog');
    visToast('🗑️ Chatten ble slettet.');
  };

  const handleKopierSvar = (tekst: string) => {
    navigator.clipboard.writeText(tekst);
    setKopiert(true);
    setTimeout(() => setKopiert(false), 2500);
  };

  const handleBrukEksempel = (navn: string, obsTekst: string, fokus: string) => {
    setBarnetsNavn(navn);
    setObservasjon(obsTekst);
    setFokusomraade(fokus);
    setSkjoldVarsel(null);
  };

  return (
    <div className="space-y-8 font-sans text-slate-800">
      
      {/* HEADER: PPT-VEILEDER MED PERSONVERNSKJOLD */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-700/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Klient-side Anonymiserings-skjold Aktivt
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
                Barnehageloven § 31 & § 44 (Taushetsplikt)
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              PPT-Veilederen for {avdelingNavn}
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Spesialpedagogisk rådgivning for tidlig innsats, tilrettelegging og bekymringssamtaler.
              Skjoldet fjerner barnets navn lokalt i nettleseren <strong>før noe sendes til KI</strong>. 
              Ingen personidentifiserbare data forlater noensinne denne enheten.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 flex flex-col gap-2 min-w-[280px]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Skjoldstatus:</span>
              <span className={`font-bold flex items-center gap-1 ${barnetsNavn.trim() ? 'text-emerald-300' : 'text-amber-300'}`}>
                {barnetsNavn.trim() ? <><ShieldCheck className="w-3.5 h-3.5" /> Skarp beskyttelse</> : <><ShieldAlert className="w-3.5 h-3.5" /> Navn mangler</>}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
              <span className="text-slate-300 font-medium">Navnetreff i tekst:</span>
              <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded">
                {antallTreff} erstattet med [BARNET]
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
              100 % taushetsplikt og GDPR-sikret
            </div>
          </div>
        </div>
      </div>

      {/* Toast-varsel for veiledningsdialog */}
      {toastFeedback && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-fade-in border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastFeedback}</span>
        </div>
      )}

      {/* FEILMELDING / VARSEL (Erstatning for window.alert) */}
      {skjoldVarsel && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-0.5">Personvernskjoldet krever oppmerksomhet</h4>
            <p className="text-xs text-amber-800 font-medium">{skjoldVarsel}</p>
          </div>
          <button 
            onClick={() => setSkjoldVarsel(null)}
            className="text-xs font-bold text-amber-800 hover:text-amber-950 p-1"
          >
            Lukk
          </button>
        </div>
      )}

      {/* HOVEDDEL: TO KOLONNER (SKJOLD & INPUT TIL VENSTRE, VEILEDNING & DIALOG TIL HØYRE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* VENSTRE KOLONNE: SKJOLD-PANELET & OBSERVASJON */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Anonymiserings-skjoldet</h3>
                  <p className="text-[11px] text-slate-500">Trinn 1 & 2: Definer parameterne for lokal vasking</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setVisVasketForhaandsvisning(!visVasketForhaandsvisning)}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 bg-teal-50 px-2.5 py-1 rounded-lg transition"
              >
                {visVasketForhaandsvisning ? <><EyeOff className="w-3.5 h-3.5" /> Skjul forhåndsvisning</> : <><Eye className="w-3.5 h-3.5" /> Vis vasket tekst</>}
              </button>
            </div>

            {/* Parameter 1: Barnets navn */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  Barnets navn (for lokalt søk og erstatt):
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Obligatorisk for skjoldet</span>
              </label>
              <input
                type="text"
                value={barnetsNavn}
                onChange={(e) => setBarnetsNavn(e.target.value)}
                placeholder="f.eks. Ola eller Ola Nordmann"
                className={`w-full text-sm p-3 rounded-xl border outline-none transition font-medium ${
                  !barnetsNavn.trim() 
                    ? 'border-amber-300 bg-amber-50/40 focus:ring-2 focus:ring-amber-500' 
                    : 'border-slate-200 bg-white focus:ring-2 focus:ring-teal-500'
                }`}
              />
              <p className="text-[11px] text-slate-500 leading-snug">
                Når skjoldet kjører, byttes alle forekomster av dette navnet automatisk ut med <code>[BARNET]</code>.
              </p>
            </div>

            {/* Rammebetingelser */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alder</label>
                <select
                  value={alder}
                  onChange={(e) => setAlder(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="1-2 år">1-2 år (Småbarn)</option>
                  <option value="2-3 år">2-3 år</option>
                  <option value="3-4 år">3-4 år (Mellomgruppe)</option>
                  <option value="4-5 år">4-5 år</option>
                  <option value="5-6 år">5-6 år (Førskole)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hovedfokus</label>
                <select
                  value={fokusomraade}
                  onChange={(e) => setFokusomraade(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="Sosioemosjonell regulering og samspill">Sosioemosjonelt / Regulering</option>
                  <option value="Språkutvikling, uttale og begrepsforståelse">Språk & Begreper</option>
                  <option value="Konsentrasjon, uro og overganger">Uro / Konsentrasjon / Overganger</option>
                  <option value="Trekker seg unna lek og kontakt">Passivitet / Tilbaketrekning</option>
                  <option value="Sansemotorikk og kroppslig regulering">Sansemotorikk</option>
                </select>
              </div>
            </div>

            {/* Parameter 2: Observasjonsteksten */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Observasjon fra hverdagen:</span>
                <span className="text-[10px] text-slate-400 font-normal">Hva skjedde, hvem var til stede?</span>
              </label>
              <textarea
                value={observasjon}
                onChange={(e) => setObservasjon(e.target.value)}
                rows={6}
                placeholder="Skriv fritt som du pleier, f.eks.: &#10;'I dag slo Ola et annet barn da tårnet veltet i byggekroken. Ola gråt lenge og ville ikke ha trøst av assistenten...'"
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none transition leading-relaxed resize-y"
              />
            </div>

            {/* Tidligere tiltak (valgfritt) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Tidligere utprøvde tiltak på avdelingen (valgfritt):</label>
              <input
                type="text"
                value={tidligereTiltak}
                onChange={(e) => setTidligereTiltak(e.target.value)}
                placeholder="f.eks. Skjermet bord ved lunsj, forberedelse 5 min før overganger"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            {/* LIVE FORHÅNDSVISNING AV VASKET TEKST */}
            {visVasketForhaandsvisning && observasjon.trim().length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Forhåndsvisning: Dette forlater enheten
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    {barnetsNavn.trim() ? `${antallTreff} vasket` : 'Skriv navn over for å vaske'}
                  </span>
                </div>
                <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {liveVasketTekst || 'Ingen tekst ennå.'}
                </div>
              </div>
            )}

            {/* TO HOVEDHANDLINGER */}
            <div className="space-y-2.5">
              <button
                onClick={handleGenererObjektivPPTLogg}
                disabled={isLoggLoading || isLoading}
                className={`w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                  isLoggLoading 
                    ? 'bg-slate-300 text-slate-500 cursor-wait' 
                    : 'bg-indigo-700 hover:bg-indigo-800 active:scale-98 text-white shadow-indigo-700/20'
                }`}
              >
                {isLoggLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Objektiviserer og strukturerer for PPT...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-indigo-200" />
                    <span>Strukturer til PPT-Logg (Objektivisering)</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSendTilPPTVeileder}
                disabled={isLoading || isLoggLoading}
                className={`w-full py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all border flex items-center justify-center gap-2 ${
                  isLoading 
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-wait' 
                    : 'bg-teal-50 hover:bg-teal-100 text-teal-900 border-teal-200 hover:border-teal-300'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
                    <span>Henter spesialpedagogisk veiledning...</span>
                  </>
                ) : (
                  <>
                    <HeartHandshake className="w-4 h-4 text-teal-700" />
                    <span>Få Spesialpedagogisk Veiledning & Tiltak</span>
                  </>
                )}
              </button>
            </div>

            {/* HURTIG-EKSEMPLER */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Hurtig-eksempler til inspirasjon:
              </span>
              <div className="space-y-1.5">
                {[
                  {
                    tittel: 'Utagering ved overganger',
                    navn: 'Ola',
                    fokus: 'Konsentrasjon, uro og overganger',
                    tekst: 'Når vi skal rydde før lunsj, kaster Ola klosser og nekter å kle av seg. Han virker overveldet når mange barn snakker samtidig i garderoben.'
                  },
                  {
                    tittel: 'Trekker seg unna i samling',
                    navn: 'Nora',
                    fokus: 'Trekker seg unna lek og kontakt',
                    tekst: 'Nora trekker seg alltid til utkanten under samlingsstund. Hun snakker nesten ikke i barnehagen, men foreldrene forteller at hun prater uavbrutt hjemme.'
                  },
                  {
                    tittel: 'Språklig frustrasjon i rollelek',
                    navn: 'Emil',
                    fokus: 'Språkutvikling, uttale og begrepsforståelse',
                    tekst: 'Emil ønsker sterkt å være med i familieleken, men blir avvist fordi de andre barna ikke forstår hva han sier. Emil dytter da de andre og løper bort.'
                  }
                ].map((eksempel, idx) => (
                  <button
                    key={`ppt-ex-${idx}`}
                    onClick={() => handleBrukEksempel(eksempel.navn, eksempel.tekst, eksempel.fokus)}
                    className="w-full text-left p-2 rounded-xl text-xs bg-slate-50 hover:bg-teal-50/70 border border-slate-100 hover:border-teal-200 text-slate-700 transition flex items-center justify-between group"
                  >
                    <span className="font-semibold text-slate-800">{eksempel.tittel}</span>
                    <span className="text-[10px] text-teal-700 font-bold opacity-0 group-hover:opacity-100 transition">Sett inn →</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* HØYRE KOLONNE: VEILEDNINGSSVAR & SOKRATISK DIALOG */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 flex flex-col min-h-[640px]">
            
            {/* Header i svarsone med faneveksler */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAktivVisning('logg')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    aktivVisning === 'logg'
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Strukturert PPT-Logg</span>
                  {strukturertLogg && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                </button>

                <button
                  type="button"
                  onClick={() => setAktivVisning('veiledning')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    aktivVisning === 'veiledning'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <HeartHandshake className="w-3.5 h-3.5 text-teal-600" />
                  <span>Veiledningsdialog</span>
                  {chatLog.length > 0 && (
                    <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded-full font-bold">
                      {chatLog.length}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {aktivVisning === 'veiledning' && (
                  <>
                    <button
                      type="button"
                      onClick={handleStartNyVeiledning}
                      className="text-xs font-bold text-slate-700 hover:text-teal-800 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1 cursor-pointer"
                      title="Start en ny veiledning"
                    >
                      <RefreshCw className="w-3 h-3 text-teal-600" />
                      <span>Start ny veiledning</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSlettChat}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1 cursor-pointer"
                      title="Slett chat-historikken fullstendig"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Slett chat</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => window.print()}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                  title="Skriv ut notat / logg"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* VISNING 1: STRUKTURERT PPT-LOGG (OBJEKTIVISERING) */}
            {aktivVisning === 'logg' ? (
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                {isLoggLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 my-auto">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center animate-spin">
                      <RefreshCw className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-sm">Objektiviserer observasjonen for PPT...</h4>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Fjerner synsing, tolkning og følelser, og oversetter teksten til ren observerbar atferd med [BARNET].
                      </p>
                    </div>
                  </div>
                ) : strukturertLogg ? (
                  <div className="space-y-4 animate-fade-in">
                    {/* Topp-informasjon og kopiering */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200">
                          Formell PPT-Standard
                        </span>
                        <span className="text-xs text-slate-600 font-semibold">
                          100 % objektiv • Anonymisert med [BARNET] • Null emojier
                        </span>
                      </div>
                      <button
                        onClick={() => handleKopierSvar(strukturertLogg.fullTekst)}
                        className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs hover:shadow-xs transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {kopiert ? 'Kopiert til utklippstavle!' : 'Kopier hele PPT-loggen'}
                      </button>
                    </div>

                    {/* Boks 1: Situasjonsbeskrivelse */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-black text-slate-900 uppercase tracking-wider">
                        <span>SITUASJONSBESKRIVELSE:</span>
                        <span className="text-[10px] text-slate-400 font-normal">Kontekst og ramme</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {strukturertLogg.situasjonsbeskrivelse || 'Ikke spesifisert.'}
                      </p>
                    </div>

                    {/* Boks 2: Observert atferd */}
                    <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/30 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-black text-indigo-950 uppercase tracking-wider">
                        <span>OBSERVERT ATFERD:</span>
                        <span className="text-[10px] text-indigo-600 font-semibold">Objektiv & observerbar</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                        {strukturertLogg.observertAtferd || 'Ingen atferd registrert.'}
                      </p>
                    </div>

                    {/* Boks 3: Pedagogens tiltak i situasjonen */}
                    <div className="p-4 rounded-2xl border border-teal-200 bg-teal-50/30 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-black text-teal-950 uppercase tracking-wider">
                        <span>PEDAGOGENS TILTAK I SITUASJONEN:</span>
                        <span className="text-[10px] text-teal-700 font-semibold">Voksenrolle</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {strukturertLogg.pedagogensTiltak || 'Ingen tiltak spesifisert.'}
                      </p>
                    </div>

                    {/* Boks 4: Barnets respons på tiltak */}
                    <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-black text-amber-950 uppercase tracking-wider">
                        <span>BARNETS RESPONS PÅ TILTAK:</span>
                        <span className="text-[10px] text-amber-700 font-semibold">Reaksjon</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {strukturertLogg.barnetsRespons || 'Ingen respons registrert.'}
                      </p>
                    </div>

                    {/* Boks 5: Refleksjonsspørsmål til pedleder */}
                    <div className="p-4 rounded-2xl border-2 border-indigo-400 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-sm space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-indigo-950 uppercase tracking-wider">
                        <Lightbulb className="w-4 h-4 text-indigo-600" />
                        <span>REFLEKSJONSSPØRSMÅL TIL PEDLEDER:</span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-indigo-950 leading-relaxed">
                        {strukturertLogg.refleksjonssporsmal || 'Hvilke mønstre går igjen i lignende situasjoner?'}
                      </p>
                    </div>

                    {/* Hurtighandling for å få veiledning */}
                    <div className="pt-2 flex justify-between items-center text-xs">
                      <span className="text-slate-500">Vil du drøfte videre tiltak for [BARNET]?</span>
                      <button
                        onClick={handleSendTilPPTVeileder}
                        disabled={isLoading}
                        className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1.5 hover:underline"
                      >
                        <HeartHandshake className="w-3.5 h-3.5" />
                        <span>Hent spesialpedagogiske råd for denne situasjonen →</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 my-auto">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100 shadow-xs">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div className="max-w-md space-y-1.5">
                      <h3 className="text-base font-bold text-slate-900">Objektiviserings-motor for PPT</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Skriv inn notatet og barnets navn til venstre, og trykk <strong>«Strukturer til PPT-Logg»</strong>.
                        Motoren fjerner all tolkning og synsing, og lager en formell, objektiv 5-delt logg klargjort for PPT.
                      </p>
                    </div>

                    <div className="text-left w-full max-w-md p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
                      <span className="font-bold text-slate-800 block mb-1">Fast struktur i PPT-loggen:</span>
                      <p className="text-[11px] text-slate-600 font-medium">1. SITUASJONSBESKRIVELSE</p>
                      <p className="text-[11px] text-slate-600 font-medium">2. OBSERVERT ATFERD</p>
                      <p className="text-[11px] text-slate-600 font-medium">3. PEDAGOGENS TILTAK I SITUASJONEN</p>
                      <p className="text-[11px] text-slate-600 font-medium">4. BARNETS RESPONS PÅ TILTAK</p>
                      <p className="text-[11px] text-slate-600 font-medium">5. REFLEKSJONSSPØRSMÅL TIL PEDLEDER</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* VISNING 2: INTERAKTIV VEILEDNING & DIALOG */
              <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
                {chatLog.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 my-auto">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100 shadow-xs">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div className="max-w-md space-y-1.5">
                      <h3 className="text-base font-bold text-slate-900">Klar til anonym veiledning</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Trykk <strong>«Få Spesialpedagogisk Veiledning & Tiltak»</strong> for å drøfte situasjonen med PPT-veilederen.
                        Du får forslag til avdelingstiltak, foreldresamtale og tverrfaglig vurdering.
                      </p>
                    </div>
                  </div>
                ) : (
                  chatLog.map((melding, mIdx) => (
                    <div 
                      key={`ppt-msg-${melding.id}-${mIdx}`} 
                      className={`flex flex-col ${melding.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[10px] font-bold text-slate-400">
                          {melding.role === 'user' ? 'Pedleder (Skjold-vasket observasjon)' : 'PPT-Veilederen'}
                        </span>
                        <span className="text-[10px] text-slate-300">{melding.timestamp}</span>
                      </div>

                      <div className={`p-5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[95%] shadow-sm ${
                        melding.role === 'user'
                          ? 'bg-teal-900 text-white rounded-tr-none'
                          : 'bg-slate-50 border border-slate-200 text-slate-850 rounded-tl-none space-y-3'
                      }`}>
                        {melding.role === 'assistant' ? (
                          <div className="space-y-3">
                            <div className="whitespace-pre-wrap font-sans text-slate-800">
                              {melding.content}
                            </div>
                            
                            <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                              <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" /> Forankret i Barnehageloven og Rammeplanen
                              </span>
                              <button
                                onClick={() => handleKopierSvar(melding.content)}
                                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-lg transition"
                              >
                                <Copy className="w-3 h-3" />
                                {kopiert ? 'Kopiert!' : 'Kopier notat'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">
                            {melding.content}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {isLoading && (
                  <div className="flex items-center gap-2.5 p-4 bg-slate-50 rounded-2xl border border-slate-200 max-w-md animate-pulse">
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-ping" />
                    <span className="text-xs font-bold text-slate-600">
                      PPT-Veilederen analyserer observasjonen og utarbeider tilretteleggingstiltak...
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* OPPDELING: SPØRSMÅL / VIDERE DIALOG (vises når veiledning er valgt og chatLog har meldinger) */}
            {aktivVisning === 'veiledning' && chatLog.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                  Still oppfølgingsspørsmål til veilederen:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={oppfolgingInput}
                    onChange={(e) => setOppfolgingInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOppfolging()}
                    placeholder="f.eks. 'Hvordan formulerer jeg dette til foreldrene?' eller 'Foreslå 2 konkrete lekeaktiviteter'..."
                    disabled={isLoading}
                    className="flex-1 text-xs sm:text-sm p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                  <button
                    onClick={handleSendOppfolging}
                    disabled={isLoading || !oppfolgingInput.trim()}
                    className="bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Navneskjoldet fjerner automatisk barnets navn også fra oppfølgingsspørsmål før sending.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
