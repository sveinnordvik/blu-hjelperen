import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  HeartHandshake, 
  Send, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  CheckCircle2, 
  FileText, 
  Lightbulb, 
  HelpCircle, 
  ShieldCheck, 
  ArrowRight, 
  Play, 
  Pause, 
  BookOpen, 
  MessageSquare,
  MessageCircle,
  AlertCircle,
  GraduationCap,
  Trash2
} from 'lucide-react';
import { askSamtaleMentor, stripAllEmojis } from '../../services/geminiService';

export interface SamtaleMentorProps {
  avdelingNavn?: string;
  initialType?: 'personalsamtale' | 'foreldresamtale' | 'generell';
  initialTema?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isRoleplay?: boolean;
}

interface Scenario {
  id: string;
  kategori: 'forelder' | 'personal';
  tittel: string;
  undertittel: string;
  motpart: string;
  beskrivelse: string;
  innledendePrompt: string;
}

const PREDEFINED_SCENARIOS: Scenario[] = [
  {
    id: 'forelder-klaer-ute',
    kategori: 'forelder',
    tittel: 'Klagestorm på klær og utetid',
    undertittel: 'Forelder opplever at barnet er kaldt og skittent',
    motpart: 'Frustrert far til 4-åring',
    beskrivelse: 'Far mener barnehagen er for mye ute i regn og kulde, og at barnet ofte mangler tørre votter eller har feil dress i hente-situasjonen.',
    innledendePrompt: 'Jeg skal forberede en samtale med en far som er veldig frustrert over at sønnen (4 år) stadig er våt og kald når han hentes, og han krever at vi holder barna mer inne når det regner. Hvordan bør jeg legge opp denne samtalen?'
  },
  {
    id: 'forelder-bekymring-utagering',
    kategori: 'forelder',
    tittel: 'Bekymring for samspill & utagering',
    undertittel: 'Foreldre i forsvar eller fornektelse',
    motpart: 'Bekymret, men defensiv mor',
    beskrivelse: 'Vi ser at barnet slår og dytter andre barn i frilek, spesielt i ustrukturerte overganger. Mor opplever at barnet blir "stemplet" og mener det bare er andre som erter.',
    innledendePrompt: 'Jeg må kalle inn foreldrene til en 4-åring som ofte slår og dytter andre barn i frilek. Mor har tidligere avfeid observasjonene våre og sagt at "han gjør aldri slikt hjemme, dere må passe bedre på de andre barna". Hvordan kan jeg møte henne uten at hun går i full lås?'
  },
  {
    id: 'forelder-garderobe-konflikt',
    kategori: 'forelder',
    tittel: 'Konflikt i hente-situasjonen',
    undertittel: 'Uro foran andre foreldre og barn',
    motpart: 'Stresset og sint forelder',
    beskrivelse: 'En forelder kom stormende inn i garderoben ved henting og kjeftet på en vikar foran andre foreldre fordi matboksen ikke var vasket.',
    innledendePrompt: 'I går opplevde vi at en forelder overhøvlet en av våre ferske vikarer i garderoben foran flere andre foreldre. Jeg må ta en samtale med denne forelderen om hvordan vi kommuniserer i barnehagen, men vil samtidig bevare en god relasjon. Hva gjør jeg?'
  },
  {
    id: 'personal-forsent-passiv',
    kategori: 'personal',
    tittel: 'Forsentkomming og passivitet',
    undertittel: 'Assistent trekker seg unna i lek og rutiner',
    motpart: 'Assistent (23 år) i 100% stilling',
    beskrivelse: 'Assistenten har kommet 10-15 minutter for sent flere ganger denne måneden, og sitter ofte passiv på benken ute i stedet for å delta aktivt i barnas lek.',
    innledendePrompt: 'Jeg skal ha en veiledningssamtale med en assistent på avdelingen. Vedkommende kommer stadig for sent på morgenvakt, og når vi er ute sitter assistenten mye på mobilen eller benken uten å engasjere seg med barna. Jeg gruer meg til å ta det opp fordi vedkommende lett blir taus og lei seg.'
  },
  {
    id: 'personal-motstand-rammeplan',
    kategori: 'personal',
    tittel: 'Motstand mot pedagogiske endringer',
    undertittel: 'Erfaren medarbeider som vil "ha det som før"',
    motpart: 'Erfaren fagarbeider (20 års ansiennitet)',
    beskrivelse: 'Fagarbeideren sukker høylytt på avdelingsmøter når ny ukeplan eller PLAGG-metodikk legges fram, og sier at "alt dette papirarbeidet ødelegger den ekte barnehagehverdagen".',
    innledendePrompt: 'Jeg er ny som pedagogisk leder på avdelingen, og en erfaren fagarbeider med 20 års fartstid motarbeider alt jeg foreslår av nye pedagogiske opplegg og struktur. Vedkommende sier til assistentene at "vi venter bare til denne nye pedlederen gir seg". Hvordan tar jeg denne samtalen på en respektfull, men tydelig måte?'
  },
  {
    id: 'personal-tone-mot-barn',
    kategori: 'personal',
    tittel: 'Hard tone og kjefting på barna',
    undertittel: 'Kollega som mister tålmodigheten',
    motpart: 'Fast ansatt medarbeider',
    beskrivelse: 'En ansatt hevet stemmen og holdt et barn hardt i armen ved påkledningssituasjonen i dag. Dette er i strid med barnehagens verdisyn og Rammeplanen kap. 1.',
    innledendePrompt: 'I dag opplevde jeg at en kollega hevet stemmen og holdt et 3 år gammelt barn hardt i armen i garderoben da barnet nektet å ta på seg støvlene. Jeg må ta opp denne episoden umiddelbart. Hvordan tar jeg denne korrigerende samtalen på en måte som ivaretar barnets rettssikkerhet samtidig som medarbeideren ikke knekker sammen?'
  }
];

export default function SamtaleMentor({
  avdelingNavn = 'Blåbærtua',
  initialType = 'generell',
  initialTema = ''
}: SamtaleMentorProps) {
  const [samtaleType, setSamtaleType] = useState<'personalsamtale' | 'foreldresamtale' | 'generell'>(initialType);
  const [motpartRolle, setMotpartRolle] = useState<string>('forelder eller ansatt');
  const [erRollespillAktivt, setErRollespillAktivt] = useState<boolean>(false);
  const [valgtKategoriFilter, setValgtKategoriFilter] = useState<'alle' | 'forelder' | 'personal'>('alle');
  const [aktivtTema, setAktivtTema] = useState<string>(initialTema);

  const [chatLog, setChatLog] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('samtale_mentor_chatlog');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'msg-start',
        role: 'assistant',
        content: 'Velkommen. Jeg er din sokratiske sparringspartner for å forberede vanskelige samtaler. Enten det gjelder en krevende foreldresamtale eller en personalsak du gruer deg til å ta opp, er jeg her for å hjelpe deg med å sortere tankene, forstå motpartens ståsted og finne trygge ord.\n\nHva slags samtale står du overfor, og hva opplever du som kjernen i utfordringen?',
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [inputTekst, setInputTekst] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feilmelding, setFeilmelding] = useState<string | null>(null);
  const [kopiert, setKopiert] = useState<boolean>(false);
  const [visVerktoy, setVisVerktoy] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('samtale_mentor_chatlog', JSON.stringify(chatLog));
    } catch {}
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, isLoading]);

  const handleSendMelding = async (egendefinertMelding?: string, overstyreRollespill?: boolean) => {
    const meldingToSend = (egendefinertMelding !== undefined ? egendefinertMelding : inputTekst).trim();
    if (!meldingToSend || isLoading) return;

    setFeilmelding(null);
    setInputTekst('');

    const nyBrukerMelding: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: stripAllEmojis(meldingToSend),
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
      isRoleplay: overstyreRollespill !== undefined ? overstyreRollespill : erRollespillAktivt
    };

    const oppdatertLogg = [...chatLog, nyBrukerMelding];
    setChatLog(oppdatertLogg);
    setIsLoading(true);

    try {
      const svar = await askSamtaleMentor(
        oppdatertLogg.map(m => ({ role: m.role, content: m.content })),
        {
          samtaleType,
          tema: aktivtTema,
          erRollespillAktivt: overstyreRollespill !== undefined ? overstyreRollespill : erRollespillAktivt,
          motpartRolle
        }
      );

      const nyAssistentMelding: ChatMessage = {
        id: `asst-${Date.now() + 1}`,
        role: 'assistant',
        content: stripAllEmojis(svar),
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        isRoleplay: overstyreRollespill !== undefined ? overstyreRollespill : erRollespillAktivt
      };

      setChatLog(prev => [...prev, nyAssistentMelding]);
    } catch (err: any) {
      console.error(err);
      setFeilmelding(err?.message || 'Klarte ikke å kontakte samtalementoren.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVelgScenario = (scenario: Scenario) => {
    setAktivtTema(scenario.tittel);
    setSamtaleType(scenario.kategori === 'forelder' ? 'foreldresamtale' : 'personalsamtale');
    setMotpartRolle(scenario.motpart);
    setErRollespillAktivt(false);

    handleSendMelding(scenario.innledendePrompt, false);
  };

  const handleStartRollespill = () => {
    setErRollespillAktivt(true);
    const trigger = `Jeg vil gjerne prøve et rollespill nå! Innta rollen som motparten (${motpartRolle}). Jeg åpner samtalen nå: "Hei, takk for at du kunne sette deg ned med meg i dag."`;
    handleSendMelding(trigger, true);
  };

  const handleAvsluttRollespill = () => {
    setErRollespillAktivt(false);
    const trigger = 'La oss ta en pause i rollespillet her. Kan du som mentor gi meg en kort, konstruktiv tilbakemelding på hvordan jeg håndterte situasjonen, og hva jeg kan justere på for å bli enda tryggere?';
    handleSendMelding(trigger, false);
  };

  const handleNullstill = () => {
    const startMelding: ChatMessage = {
      id: 'msg-start-' + Date.now(),
      role: 'assistant',
      content: 'Velkommen til en ny forberedelse. Beskriv gjerne situasjonen du står i, hvem samtalen er med, og hva du ønsker å oppnå.',
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
    };
    setChatLog([startMelding]);
    setErRollespillAktivt(false);
    setAktivtTema('');
    setFeilmelding(null);
    localStorage.removeItem('samtale_mentor_chatlog');
  };

  const handleSlettChat = () => {
    setChatLog([]);
    setErRollespillAktivt(false);
    setAktivtTema('');
    setFeilmelding(null);
    localStorage.removeItem('samtale_mentor_chatlog');
  };

  const handleKopierLogg = () => {
    const tekst = chatLog
      .map(m => `[${m.timestamp}] ${m.role === 'user' ? 'PEDLEDER' : m.isRoleplay ? 'MOTPART (ROLLESPILL)' : 'MENTOR'}:\n${m.content}\n`)
      .join('\n---\n\n');
    navigator.clipboard.writeText(tekst);
    setKopiert(true);
    setTimeout(() => setKopiert(false), 2500);
  };

  const filtrerteScenarier = PREDEFINED_SCENARIOS.filter(s => {
    if (valgtKategoriFilter === 'alle') return true;
    return s.kategori === valgtKategoriFilter;
  });

  return (
    <div className="space-y-6 font-sans text-slate-800">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-teal-800/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-teal-500/20 text-teal-300 text-xs font-bold px-3 py-1 rounded-full border border-teal-500/30">
                Sokratisk Sparring
              </span>
              <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30">
                Lederstøtte for Pedledere
              </span>
              {erRollespillAktivt && (
                <span className="bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                  Rollespill aktivt ({motpartRolle})
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Sokratisk Samtalementor
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Forbered krevende foreldresamtaler og personalsaker med en klok, empatisk mentor. 
              Utforsk kjernen i utfordringen, forstå motpartens perspektiv, lær konkrete åpningsreplikker, 
              og øv deg i et trygt rollespill før du går inn i møterommet.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
            <button
              onClick={() => setVisVerktoy(prev => !prev)}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Lightbulb className="w-4 h-4 text-amber-300" />
              <span>{visVerktoy ? 'Skjul verktøykasse' : 'Vis verktøykasse for kommunikasjon'}</span>
            </button>
            <button
              onClick={handleKopierLogg}
              className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow"
            >
              {kopiert ? <CheckCircle2 className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
              <span>{kopiert ? 'Samtalelogg kopiert' : 'Kopier forberedelseslogg'}</span>
            </button>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleNullstill}
                className="flex-1 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5"
                title="Start ny samtale"
              >
                <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
                <span>Start ny samtale</span>
              </button>
              <button
                onClick={handleSlettChat}
                className="bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-white border border-rose-800/40 px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5"
                title="Slett samtalen fullstendig"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Slett samtale</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5 SOKRATISKE REGLER BADGE-RAD */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <span className="text-teal-400 font-bold block mb-0.5">1. Still spørsmål først</span>
            <span className="text-slate-300 text-[11px]">Utdyper kjernen og målet</span>
          </div>
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <span className="text-teal-400 font-bold block mb-0.5">2. Ikke gi fasiten</span>
            <span className="text-slate-300 text-[11px]">Utforsker motpartens perspektiv</span>
          </div>
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <span className="text-teal-400 font-bold block mb-0.5">3. Konkrete verktøy</span>
            <span className="text-slate-300 text-[11px]">Jeg-budskap & åpningsreplikk</span>
          </div>
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <span className="text-teal-400 font-bold block mb-0.5">4. Rollespill</span>
            <span className="text-slate-300 text-[11px]">Øv deg mot reell motstand</span>
          </div>
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50 col-span-2 sm:col-span-1">
            <span className="text-teal-400 font-bold block mb-0.5">5. Trygg tone</span>
            <span className="text-slate-300 text-[11px]">Ubyråkratisk & fri for emojier</span>
          </div>
        </div>
      </div>

      {/* VERKTØYKASSE FOR KOMMUNIKASJON (VIS/SKJUL) */}
      {visVerktoy && (
        <div className="bg-gradient-to-r from-amber-50 to-teal-50 border border-amber-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-700" />
              <h3 className="font-bold text-slate-900 text-sm">
                Pedlederens Verktøykasse: Kommunikasjonsteknikker i vanskelige samtaler
              </h3>
            </div>
            <button
              onClick={() => setVisVerktoy(false)}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              Lukk
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs space-y-1.5">
              <span className="font-bold text-amber-900 block text-sm">1. Jeg-budskap</span>
              <p className="text-slate-600 leading-relaxed">
                Beskriv konkret situasjon + konsekvens for barna/avdelingen + ditt behov. Unngå "Du gjør alltid...".
              </p>
              <div className="bg-amber-50/70 p-2 rounded-lg text-amber-950 font-medium">
                «Når du kommer 15 minutter for sent, blir morgenvakten sårbar for barna. Jeg trenger at vi er fulltallige ved frokost.»
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-teal-100 shadow-xs space-y-1.5">
              <span className="font-bold text-teal-900 block text-sm">2. Aktiv lytning & speiling</span>
              <p className="text-slate-600 leading-relaxed">
                Gjenta kjernen i det motparten sier med egne ord før du argumenterer. Det demper forsvarsmekanismene.
              </p>
              <div className="bg-teal-50/70 p-2 rounded-lg text-teal-950 font-medium">
                «Hvis jeg forstår deg rett, opplever du at kravene i planen gjør at du får mindre tid til den spontane leken?»
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-xs space-y-1.5">
              <span className="font-bold text-indigo-900 block text-sm">3. Anerkjennelse før korrigering</span>
              <p className="text-slate-600 leading-relaxed">
                Møt forelderens eller kollegaens bakenforliggende følelse eller gode intensjon før du korrigerer faktagrunnlaget.
              </p>
              <div className="bg-indigo-50/70 p-2 rounded-lg text-indigo-950 font-medium">
                «Jeg forstår veldig godt at du blir bekymret når han er våt. La meg forklare hvordan vi tenker rundt utetid og skift.»
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KLIKKBARE SCENARIER FOR RASK OPPSTART */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Velg et realistisk scenario fra barnehagehverdagen
            </h2>
            <p className="text-xs text-slate-500">
              Eller skriv inn din egen spesifikke sak i meldingsfeltet under.
            </p>
          </div>

          {/* Kategori-bryter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setValgtKategoriFilter('alle')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                valgtKategoriFilter === 'alle' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Alle ({PREDEFINED_SCENARIOS.length})
            </button>
            <button
              onClick={() => setValgtKategoriFilter('forelder')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                valgtKategoriFilter === 'forelder' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Foreldresamtaler
            </button>
            <button
              onClick={() => setValgtKategoriFilter('personal')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                valgtKategoriFilter === 'personal' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Personalsamtaler
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtrerteScenarier.map((sc) => (
            <div
              key={sc.id}
              onClick={() => handleVelgScenario(sc)}
              className="group p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-500 hover:shadow-sm cursor-pointer transition flex flex-col justify-between text-left"
            >
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    sc.kategori === 'forelder'
                      ? 'bg-teal-100 text-teal-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {sc.kategori === 'forelder' ? 'Forelder' : 'Personal'}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 group-hover:text-teal-600 transition">
                    Sparre nå
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm group-hover:text-teal-800 transition">
                  {sc.tittel}
                </h4>
                <p className="text-xs text-slate-500 leading-snug">
                  {sc.undertittel}
                </p>
              </div>

              <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                <strong className="text-slate-800 block text-[10px] uppercase tracking-wider mb-0.5">Motpart:</strong>
                {sc.motpart}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HOVED-CHAT ARENA */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[550px]">
        
        {/* CHAT STATUSBAR */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${erRollespillAktivt ? 'bg-rose-500 animate-ping' : 'bg-teal-500'}`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  {erRollespillAktivt ? `ROLLESPILL: Mentoren spiller ${motpartRolle}` : 'SOKRATISK VEILEDNING & REFLEKSJON'}
                </span>
                {aktivtTema && (
                  <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                    Tema: {aktivtTema}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {erRollespillAktivt 
                  ? 'Du snakker nå med motparten. Øv deg på å anvende samtaleteknikkene.' 
                  : 'Mentoren stiller reflekterende spørsmål for å hjelpe deg til å finne egne løsninger.'}
              </p>
            </div>
          </div>

          {/* ROLLESPILL KONTROLL-KNAPPER */}
          <div className="flex items-center gap-2">
            {!erRollespillAktivt ? (
              <button
                onClick={handleStartRollespill}
                disabled={isLoading}
                className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              >
                <Play className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                <span>Start rollespill nå</span>
              </button>
            ) : (
              <button
                onClick={handleAvsluttRollespill}
                disabled={isLoading}
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              >
                <Pause className="w-3.5 h-3.5 text-amber-800" />
                <span>Pause rollespill & få tilbakemelding</span>
              </button>
            )}
          </div>
        </div>

        {/* MELDINGSLOGG */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[500px] bg-slate-50/30">
          {chatLog.map((m) => {
            const isUser = m.role === 'user';
            const isAssistantRoleplay = !isUser && m.isRoleplay;

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[11px] font-bold text-slate-500">
                    {isUser 
                      ? 'Du (Pedleder)' 
                      : isAssistantRoleplay 
                        ? `Motpart (${motpartRolle})` 
                        : 'Sokratisk Mentor'}
                  </span>
                  <span className="text-[10px] text-slate-400">{m.timestamp}</span>
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-teal-700 text-white rounded-tr-xs shadow-sm font-medium'
                      : isAssistantRoleplay
                        ? 'bg-rose-50 border-2 border-rose-200 text-rose-950 rounded-tl-xs shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 max-w-sm shadow-xs animate-pulse">
              <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-slate-600">
                {erRollespillAktivt ? 'Motparten tenker...' : 'Mentoren reflekterer over svaret ditt...'}
              </span>
            </div>
          )}

          {feilmelding && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{feilmelding}</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* HURTIG-HANDLINGER / SPØRSMÅLS-SNARVEIER */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-bold text-[11px]">Hurtig-innsikt:</span>
          
          <button
            onClick={() => handleSendMelding('Kan du foreslå 1-2 spesifikke kommunikasjonsteknikker og gi et konkret eksempel på en åpningsreplikk for dette tilfellet?')}
            disabled={isLoading}
            className="bg-white hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 font-medium transition text-[11px]"
          >
            Foreslå kommunikasjonsteknikk & åpningsreplikk
          </button>

          <button
            onClick={() => handleSendMelding('Hva tror du er den bakenforliggende årsaken, frykten eller behovet hos den andre personen i denne situasjonen?')}
            disabled={isLoading}
            className="bg-white hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 font-medium transition text-[11px]"
          >
            Utforsk motpartens bakenforliggende behov
          </button>

          <button
            onClick={() => handleSendMelding('Hvordan bør jeg reagere dersom den andre personen går i sterkt forsvar eller blir helt taus underveis i samtalen?')}
            disabled={isLoading}
            className="bg-white hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 font-medium transition text-[11px]"
          >
            Håndtering av motstand og taushet
          </button>

          <button
            onClick={() => handleSendMelding('Kan du oppsummere en enkel 3-trinns disposisjon og huskeliste som jeg kan ha med meg på en lapp inn i møtet?')}
            disabled={isLoading}
            className="bg-white hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 font-medium transition text-[11px]"
          >
            Oppsummer samtaleguide til møtet
          </button>
        </div>

        {/* INNTASTINGSFELT */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="flex items-center gap-2">
            <textarea
              rows={2}
              value={inputTekst}
              onChange={(e) => setInputTekst(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMelding();
                }
              }}
              placeholder={
                erRollespillAktivt
                  ? `Svar motparten (${motpartRolle}) slik du ville snakket i samtalen...`
                  : 'Skriv dine tanker, beskriv situasjonen eller still et oppfølgingsspørsmål...'
              }
              className="flex-1 text-xs sm:text-sm p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none font-medium text-slate-800"
            />
            <button
              onClick={() => handleSendMelding()}
              disabled={isLoading || !inputTekst.trim()}
              className="bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white p-3.5 rounded-xl transition shadow flex items-center justify-center shrink-0"
              title="Send til mentor"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400">
            <span>Trykk Enter for å sende • Shift + Enter for linjeskift</span>
            <span>Konfidensiell lederstøtte • Helt fri for emojier</span>
          </div>
        </div>

      </div>

      {/* AVSLUTTENDE LEDERPRINSIPPER */}
      <div className="bg-slate-100/80 rounded-2xl p-5 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-teal-300" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Forankret i Rammeplanen for barnehagen kapittel 1 og Barnehageloven § 4
            </h4>
            <p className="text-[11px] text-slate-500">
              Godt foreldresamarbeid og trygg pedagogisk ledelse bygger på åpenhet, anerkjennelse og felles fokus på barnets beste.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
