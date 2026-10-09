import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Calendar, 
  Send, 
  Layers, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Bell, 
  ArrowRight, 
  RefreshCw, 
  MessageSquare, 
  Target, 
  MoveRight,
  Copy,
  ChevronDown,
  Compass,
  FileCheck,
  Share2,
  HelpCircle,
  ExternalLink,
  FileText
} from 'lucide-react';
import { 
  askDenSokratiskePlanleggeren, 
  parseSokratiskeKort, 
  SokratiskHovedaktivitet, 
  SokratiskGjenkalling, 
  SokratiskFagdrypp,
  stripAllEmojis
} from '../../services/geminiService';
import { getBarnehageProfil, PEDAGOGISKE_PLATTFORMER, BarnehageProfilData } from '../../lib/pedagogiskPlattform';
import PlaggInfoModal from './PlaggInfoModal';
import PedagogiskPlattformModal from './PedagogiskPlattformModal';
import { STORAGE_KEY_AARSPLAN_CHAPTERS } from '../../types/aarsplan';
import { createDefaultChapters } from '../../lib/aarsplanDefaults';

export interface RelevantKilde {
  id: string;
  navn: string;
  url?: string;
  erEgendefinert?: boolean;
}

const FASTE_KILDER: RelevantKilde[] = [
  { id: 'k-1', navn: 'Forskerfrø (Naturfagsenteret)', url: 'https://forskerfro.no' },
  { id: 'k-2', navn: 'Udir (Natur, miljø og teknologi)', url: 'https://udir.no' },
  { id: 'k-3', navn: 'PLAGG-metoden (Gjenkalling & begrep)', url: 'https://barnehage.no' },
  { id: 'k-4', navn: 'Språkløyper (Lesesenteret)', url: 'https://sprakloyper.uis.no' },
  { id: 'k-5', navn: 'Matematikksenteret', url: 'https://matematikksenteret.no' }
];

export interface WeeklyActivityDrop {
  id: string;
  day: 'Mandag' | 'Tirsdag' | 'Onsdag' | 'Torsdag' | 'Fredag';
  type: 'hovedaktivitet' | 'gjenkalling';
  tittel: string;
  detalj: string;
  tag: string;
}

interface DenSokratiskePlanleggerenProps {
  onSyncToWeeklyPlan?: (items: Array<{
    id: string;
    day: string;
    activity: string;
    fagomrade: string;
    responsible: string;
    notes: string;
  }>) => void;
  avdelingNavn?: string;
}

const UKEDAGER: Array<'Mandag' | 'Tirsdag' | 'Onsdag' | 'Torsdag' | 'Fredag'> = [
  'Mandag', 
  'Tirsdag', 
  'Onsdag', 
  'Torsdag', 
  'Fredag'
];

export default function DenSokratiskePlanleggeren({ 
  onSyncToWeeklyPlan,
  avdelingNavn = 'Blåbærtua'
}: DenSokratiskePlanleggerenProps) {
  // Barnehagens faglige kontekst
  const [profil, setProfil] = useState<BarnehageProfilData>(() => getBarnehageProfil());
  const [aarshjulTema, setAarshjulTema] = useState<string>('Natur, miljø og teknologi (Høsttegn og sansing)');
  const [barnasInteresser, setBarnasInteresser] = useState<string>('Barna er fascinert av meitemark, blader i ulike farger og bygger hytter i skogen.');
  const [visKontekstRedigering, setVisKontekstRedigering] = useState(false);
  const [isPlattformModalOpen, setIsPlattformModalOpen] = useState(false);
  const [isPlaggInfoModalOpen, setIsPlaggInfoModalOpen] = useState(false);
  const [inkluderPlagg, setInkluderPlagg] = useState<boolean>(() => {
    const saved = localStorage.getItem('sokratisk_inkluder_plagg');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    const handleProfilUpdate = (e: any) => {
      if (e?.detail) setProfil(e.detail);
      else setProfil(getBarnehageProfil());
    };
    window.addEventListener('pedportalen_profil_updated', handleProfilUpdate);
    return () => window.removeEventListener('pedportalen_profil_updated', handleProfilUpdate);
  }, []);

  useEffect(() => {
    localStorage.setItem('sokratisk_inkluder_plagg', String(inkluderPlagg));
  }, [inkluderPlagg]);

  // Kilder og egne lenker
  const [egneKilder, setEgneKilder] = useState<RelevantKilde[]>(() => {
    try {
      const saved = localStorage.getItem('didaktisk_egne_kilder_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [valgteKilder, setValgteKilder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('didaktisk_valgte_kilder');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['Forskerfrø (Naturfagsenteret)', 'Udir (Natur, miljø og teknologi)', 'PLAGG-metoden (Gjenkalling & begrep)'];
  });
  const [visNyKildeSkjema, setVisNyKildeSkjema] = useState(false);
  const [nyKildeNavn, setNyKildeNavn] = useState('');
  const [nyKildeUrl, setNyKildeUrl] = useState('');

  const alleKilder = [...FASTE_KILDER, ...egneKilder];

  const handleToggleKilde = (kildeNavn: string) => {
    setValgteKilder(prev => {
      const oppdatert = prev.includes(kildeNavn) ? prev.filter(k => k !== kildeNavn) : [...prev, kildeNavn];
      try {
        localStorage.setItem('didaktisk_valgte_kilder', JSON.stringify(oppdatert));
      } catch {}
      return oppdatert;
    });
  };

  const handleLeggTilEgenKilde = () => {
    if (!nyKildeNavn.trim()) return;
    let formatertUrl = nyKildeUrl.trim();
    if (formatertUrl && !formatertUrl.startsWith('http://') && !formatertUrl.startsWith('https://')) {
      formatertUrl = `https://${formatertUrl}`;
    }
    const nyKilde: RelevantKilde = {
      id: `egen-kilde-${Date.now()}`,
      navn: nyKildeNavn.trim(),
      url: formatertUrl || undefined,
      erEgendefinert: true
    };
    const oppdatert = [...egneKilder, nyKilde];
    setEgneKilder(oppdatert);
    try {
      localStorage.setItem('didaktisk_egne_kilder_v1', JSON.stringify(oppdatert));
    } catch {}
    setValgteKilder(prev => {
      const n = [...prev, nyKilde.navn];
      try {
        localStorage.setItem('didaktisk_valgte_kilder', JSON.stringify(n));
      } catch {}
      return n;
    });
    setNyKildeNavn('');
    setNyKildeUrl('');
    setVisNyKildeSkjema(false);
    visVarsel(`Kilden «${nyKilde.navn}» ble lagt til.`);
  };

  const handleSlettEgenKilde = (kildeId: string, kildeNavn: string) => {
    const oppdatert = egneKilder.filter(k => k.id !== kildeId);
    setEgneKilder(oppdatert);
    try {
      localStorage.setItem('didaktisk_egne_kilder_v1', JSON.stringify(oppdatert));
    } catch {}
    setValgteKilder(prev => prev.filter(k => k !== kildeNavn));
    visVarsel(`Kilden «${kildeNavn}» ble fjernet.`);
  };

  // Hent årsplan automatisk fra Styrern
  const handleHentAarsplanFraStyrern = () => {
    try {
      const rawChapters = localStorage.getItem(STORAGE_KEY_AARSPLAN_CHAPTERS);
      let chapters: any[] = [];
      if (rawChapters) {
        chapters = JSON.parse(rawChapters);
      }
      if (!chapters || chapters.length === 0) {
        chapters = createDefaultChapters();
      }

      const hostChap = chapters.find((c: any) => c.id === 'chap_aarshjul_host' || c.category === 'Årshjul');
      const satsingChap = chapters.find((c: any) => c.id === 'chap_satsingsomraader' || c.title?.toLowerCase().includes('satsing'));

      let funnetTema = '';
      if (hostChap?.subtitle && hostChap.subtitle.trim() && !hostChap.subtitle.toLowerCase().includes('aug – okt')) {
        funnetTema = `${hostChap.title}: ${hostChap.subtitle}`;
      } else if (satsingChap?.content && satsingChap.content.length > 5) {
        funnetTema = `Satsingsområde: ${satsingChap.content.substring(0, 100)}`;
      } else {
        funnetTema = 'Natur, miljø og teknologi: Småkryp, høsttegn og sanserik utforskning i skogen';
      }

      setAarshjulTema(funnetTema);
      setProfil(getBarnehageProfil());
      visVarsel(`Årsplan hentet automatisk fra Styrern! Tema oppdatert.`);
    } catch (err) {
      console.error(err);
      visVarsel('Kunne ikke hente årsplan fra Styrern.');
    }
  };

  // Chat- og sparring-tilstand
  const [fase, setFase] = useState<'fase1' | 'fase2'>('fase1');
  const [messages, setMessages] = useState<Array<{ role: 'assistant' | 'user'; content: string }>>([
    {
      role: 'assistant',
      content: `Velkommen. Jeg er din sokratiske sparringspartner for ukeplanleggingen på ${avdelingNavn}.

Før vi låser noen faste aktiviteter, la oss utforske situasjonen i barnegruppen din:

1. Hvilke mønstre eller nysgjerrige spørsmål observerer du i barnas frie lek akkurat nå, og hvordan kobler dette seg til månedens tema om natur og miljø?
2. Hva ønsker du aller mest at barna skal sitte igjen med av opplevelser og fellesskap denne uken?`
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Genererte kort
  const [hovedkort, setHovedkort] = useState<SokratiskHovedaktivitet[]>([]);
  const [gjenkallingskort, setGjenkallingskort] = useState<SokratiskGjenkalling[]>([]);
  const [fagdryppKort, setFagdryppKort] = useState<SokratiskFagdrypp[]>([]);

  // Ukens tavle (plasserte kort på ukedagene)
  const [plasserteKort, setPlasserteKort] = useState<WeeklyActivityDrop[]>(() => {
    try {
      const saved = localStorage.getItem('sokratisk_plasserte_kort');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [draggedCard, setDraggedCard] = useState<{
    card: SokratiskHovedaktivitet | SokratiskGjenkalling;
    type: 'hovedaktivitet' | 'gjenkalling';
  } | null>(null);

  const [varselMelding, setVarselMelding] = useState<string | null>(null);
  const [pushAktiv, setPushAktiv] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('sokratisk_plasserte_kort', JSON.stringify(plasserteKort));
    } catch {}
  }, [plasserteKort]);

  // Start ny sokratisk sparring
  const handleStartNySparring = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Velkommen. Jeg er din sokratiske sparringspartner for ukeplanleggingen på ${avdelingNavn}.

Før vi låser noen faste aktiviteter, la oss utforske situasjonen i barnegruppen din:

1. Hvilke mønstre eller nysgjerrige spørsmål observerer du i barnas frie lek akkurat nå, og hvordan kobler dette seg til månedens tema om «${aarshjulTema}»?
2. Hva ønsker du aller mest at barna skal sitte igjen med av opplevelser og fellesskap denne uken?`
      }
    ]);
    setInputVal('');
    setFase('fase1');
    setHovedkort([]);
    setGjenkallingskort([]);
    setFagdryppKort([]);
    visVarsel('✨ Ny sokratisk sparring startet!');
  };

  // Slett hele chatten
  const handleSlettChat = () => {
    setMessages([]);
    setInputVal('');
    setFase('fase1');
    setHovedkort([]);
    setGjenkallingskort([]);
    setFagdryppKort([]);
    visVarsel('🗑️ Chatten ble slettet.');
  };

  // Håndter brukerens melding i samtalen
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputVal).trim();
    if (!textToSend || isLoading) return;

    const newHistory = [...messages, { role: 'user' as const, content: stripAllEmojis(textToSend) }];
    setMessages(newHistory);
    setInputVal('');
    setIsLoading(true);

    try {
      const response = await askDenSokratiskePlanleggeren(newHistory, {
        barnehagePlattform: `${profil.plattformNavn}: ${profil.fagligForankringsMal}`,
        aarshjulFokus: aarshjulTema,
        barnasInteresser: barnasInteresser,
        kilder: valgteKilder.join(', '),
        inkluderPlagg,
        plattformType: profil.plattformType
      });

      const parsed = parseSokratiskeKort(response);

      if (parsed.hasCards) {
        setFase('fase2');
        if (parsed.hovedaktiviteter.length > 0) setHovedkort(parsed.hovedaktiviteter);
        if (parsed.gjenkallinger.length > 0) setGjenkallingskort(parsed.gjenkallinger);
        if (parsed.fagdrypp.length > 0) setFagdryppKort(parsed.fagdrypp);
        
        setMessages(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            content: parsed.preamble || 'Jeg har strukturert planen for uken basert på samtalen vår. Nedenfor finner du de 3 hovedaktivitetene, 3 gjenkallingsøktene og 2 fag-dryppene klare til å plasseres på dagene.' 
          }
        ]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: 'Jeg fikk ikke kontakt med veiledningsbasen akkurat nå. La oss reflektere videre: Hva tenker du er barnas viktigste drivkraft i denne situasjonen?' 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Be modellen om konkrete kort direkte
  const triggerFase2Generering = () => {
    handleSendMessage("Vi har spikret konseptet og den pedagogiske retningen. Generer nå nøyaktig 3 Hovedaktiviteter, 3 Gjenkallingsøkter og 2 Fag-drypp i det spesifiserte kortformatet.");
  };

  // Tildel et kort til en dag
  const handlePlasserKortPaaDag = (
    item: SokratiskHovedaktivitet | SokratiskGjenkalling, 
    type: 'hovedaktivitet' | 'gjenkalling', 
    dag: 'Mandag' | 'Tirsdag' | 'Onsdag' | 'Torsdag' | 'Fredag'
  ) => {
    const nyDrop: WeeklyActivityDrop = {
      id: `drop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      day: dag,
      type,
      tittel: item.tittel,
      detalj: type === 'hovedaktivitet' 
        ? (item as SokratiskHovedaktivitet).hvaOgHvordan 
        : (item as SokratiskGjenkalling).gjennomforing,
      tag: type === 'hovedaktivitet' 
        ? (item as SokratiskHovedaktivitet).kildeForankring 
        : `PLAGG: ${(item as SokratiskGjenkalling).plaggFokus}`
    };

    setPlasserteKort(prev => [...prev, nyDrop]);
    visVarsel(`Lagt til på ${dag}: ${item.tittel}`);
  };

  const handleFjernPlassertKort = (dropId: string) => {
    setPlasserteKort(prev => prev.filter(k => k.id !== dropId));
  };

  // Drag and drop event handlers
  const handleDragStart = (
    e: React.DragEvent, 
    card: SokratiskHovedaktivitet | SokratiskGjenkalling, 
    type: 'hovedaktivitet' | 'gjenkalling'
  ) => {
    setDraggedCard({ card, type });
    e.dataTransfer.setData('text/plain', card.tittel);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnDay = (e: React.DragEvent, dag: 'Mandag' | 'Tirsdag' | 'Onsdag' | 'Torsdag' | 'Fredag') => {
    e.preventDefault();
    if (!draggedCard) return;
    handlePlasserKortPaaDag(draggedCard.card, draggedCard.type, dag);
    setDraggedCard(null);
  };

  const visVarsel = (tekst: string) => {
    setVarselMelding(tekst);
    setTimeout(() => setVarselMelding(null), 3500);
  };

  // Synkroniser til ukens helhetlige plan i PedledernApp
  const handleOverforTilUkeplan = () => {
    if (plasserteKort.length === 0) {
      visVarsel("Plasser minst ett kort på ukedagene før overføring.");
      return;
    }

    const konverterteItems = plasserteKort.map(item => ({
      id: item.id,
      day: item.day,
      activity: item.tittel,
      fagomrade: item.type === 'hovedaktivitet' ? aarshjulTema : 'PLAGG Gjenkalling',
      responsible: 'Pedleder / Team',
      notes: `${item.tag} • ${item.detalj}`
    }));

    if (onSyncToWeeklyPlan) {
      onSyncToWeeklyPlan(konverterteItems);
    }

    try {
      const existing = localStorage.getItem('pedledern_weekly_plan');
      const parsed = existing ? JSON.parse(existing) : [];
      localStorage.setItem('pedledern_weekly_plan', JSON.stringify([...konverterteItems, ...parsed]));
    } catch {}

    visVarsel(`${plasserteKort.length} aktiviteter overført til avdelingens ukeplan.`);
  };

  // Send Fag-drypp som simulerte push-varsel
  const handleSendPushVarsel = (tekst: string) => {
    setPushAktiv(tekst);
    try {
      const eksisterendeDrypp = localStorage.getItem('sokratisk_fagdrypp_varsler') || '[]';
      const parsed = JSON.parse(eksisterendeDrypp);
      localStorage.setItem('sokratisk_fagdrypp_varsler', JSON.stringify([
        { dato: new Date().toLocaleDateString('no-NO'), tekst },
        ...parsed
      ]));
    } catch {}

    setTimeout(() => setPushAktiv(null), 6000);
  };

  return (
    <div className="space-y-8 font-sans text-slate-800">
      
      {/* Toast-varsel */}
      {varselMelding && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{varselMelding}</span>
        </div>
      )}

      {/* Simulert Push-varsel banner */}
      {pushAktiv && (
        <div className="bg-amber-500 text-slate-950 px-5 py-3.5 rounded-2xl shadow-md border border-amber-600 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-300 flex items-center justify-center font-bold">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 block">Push-varsel sendt til personalet på {avdelingNavn}</span>
              <p className="text-xs font-bold leading-tight">{pushAktiv}</p>
            </div>
          </div>
          <button 
            onClick={() => setPushAktiv(null)}
            className="text-xs font-bold bg-slate-950 text-white px-3 py-1.5 rounded-lg hover:bg-slate-850"
          >
            Lukk
          </button>
        </div>
      )}

      {/* Header med pedagogisk fundament */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-200">
                Kreativt Verksted • Sokratisk veiledning
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                100 % emojifri veileder
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Fase {fase === 'fase1' ? '1: Sokratisk Sparring' : '2: Plan & Kort'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Den Sokratiske Planleggeren
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              En kvalifisert pedagogisk veileder for pedagogisk leder. Vi utforsker barnas pågående interesser, 
              kobler dem med barnehagens plattform og Rammeplanen, og omsetter refleksjonen til konkrete didaktiske kort for ukeplanen.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-2.5 min-w-[300px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-500">Aktiv pedagogisk profil</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsPlattformModalOpen(true)}
                  className="text-xs text-teal-700 font-bold hover:underline"
                  title="Bytt eller tilpass barnehagens pedagogiske plattform"
                >
                  Endre plattform
                </button>
                <span className="text-slate-300">•</span>
                <button 
                  onClick={() => setVisKontekstRedigering(!visKontekstRedigering)}
                  className="text-xs text-slate-600 font-medium hover:underline"
                >
                  {visKontekstRedigering ? 'Lukk' : 'Tema'}
                </button>
              </div>
            </div>
            <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="truncate">{profil.plattformNavn}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-slate-600 truncate flex-1 min-w-0">
                Månedstema: <strong className="text-slate-800">{aarshjulTema}</strong>
              </div>
              <button
                type="button"
                onClick={handleHentAarsplanFraStyrern}
                className="text-[11px] font-bold text-teal-800 bg-white hover:bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition shadow-2xs shrink-0"
                title="Hent årsplan og månedens tema automatisk fra Styrern"
              >
                <Sparkles className="w-3 h-3 text-teal-600" />
                <span>Hent årsplan</span>
              </button>
            </div>

            {/* PLAGG Innstilling */}
            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={inkluderPlagg}
                  onChange={(e) => setInkluderPlagg(e.target.checked)}
                  className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-400 accent-indigo-600 cursor-pointer"
                />
                <span className="text-xs font-bold text-indigo-950">PLAGG-gjenkalling</span>
              </label>
              <button
                type="button"
                onClick={() => setIsPlaggInfoModalOpen(true)}
                className="text-[10px] text-indigo-700 font-bold hover:underline flex items-center gap-1 shrink-0"
              >
                <HelpCircle className="w-3 h-3" /> Hva er PLAGG?
              </button>
            </div>
          </div>
        </div>

        {/* Kontekstredigering hvis brukeren vil tilpasse */}
        {visKontekstRedigering && (
          <div className="mt-6 pt-6 border-t border-slate-100 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Månedens tema og årshjulfokus</label>
                  <button
                    type="button"
                    onClick={handleHentAarsplanFraStyrern}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition"
                  >
                    <Sparkles className="w-3 h-3 text-teal-600" /> Hent årsplan fra Styrern
                  </button>
                </div>
                <textarea 
                  rows={4}
                  value={aarshjulTema}
                  onChange={(e) => setAarshjulTema(e.target.value)}
                  placeholder="F.eks: Høst, insekter og småkryp under steiner..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed resize-y min-h-[90px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Barnas nåværende interesser i leken</label>
                <textarea 
                  rows={4}
                  value={barnasInteresser}
                  onChange={(e) => setBarnasInteresser(e.target.value)}
                  placeholder="F.eks: Grave i sølepytter, fange mark, bygge demninger..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed resize-y min-h-[90px]"
                />
              </div>
            </div>

            {/* Kilder og egne lenker for sparring */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-800 block">
                    Inkluder forskningsbaserte kilder og lenker:
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Kildene mates inn i den sokratiske veilederen for faglig forankring.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setVisNyKildeSkjema(!visNyKildeSkjema)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                  title="Legg til en egen kilde eller nettlenke"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{visNyKildeSkjema ? 'Lukk' : 'Legg til egen kilde'}</span>
                </button>
              </div>

              {/* Skjema for ny egen kilde */}
              {visNyKildeSkjema && (
                <div className="p-3 bg-white border border-emerald-300 rounded-xl space-y-2.5 shadow-2xs animate-fade-in">
                  <div className="text-[11px] font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Legg til egen kilde eller lenke</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input 
                      type="text"
                      placeholder="Kildenavn (f.eks: Natursekken, Salaby, Eget hefte)"
                      value={nyKildeNavn}
                      onChange={(e) => setNyKildeNavn(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                    />
                    <input 
                      type="text"
                      placeholder="Lenke / URL (valgfritt, f.eks: https://natursekken.no)"
                      value={nyKildeUrl}
                      onChange={(e) => setNyKildeUrl(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setVisNyKildeSkjema(false)}
                      className="text-xs text-slate-500 hover:text-slate-700 px-2.5 py-1 rounded-lg"
                    >
                      Avbryt
                    </button>
                    <button
                      type="button"
                      onClick={handleLeggTilEgenKilde}
                      disabled={!nyKildeNavn.trim()}
                      className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Legg til kilde</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Kilde-listen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                {alleKilder.map(k => (
                  <div key={k.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition flex-1 min-w-0">
                      <input 
                        type="checkbox" 
                        checked={valgteKilder.includes(k.navn)}
                        onChange={() => handleToggleKilde(k.navn)}
                        className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-400 accent-emerald-600 cursor-pointer shrink-0" 
                      /> 
                      <span className={`text-xs ${k.erEgendefinert ? 'font-bold text-emerald-950' : ''} truncate`}>
                        {k.navn}
                      </span>
                    </label>

                    <div className="flex items-center gap-1 shrink-0">
                      {k.url && (
                        <a 
                          href={k.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-emerald-700 p-1 rounded transition hover:bg-emerald-50"
                          title={`Åpne ${k.navn} (${k.url}) i ny fane`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {k.erEgendefinert && (
                        <button
                          type="button"
                          onClick={() => handleSlettEgenKilde(k.id, k.navn)}
                          className="text-slate-300 hover:text-rose-600 p-1 rounded transition opacity-80 hover:opacity-100 hover:bg-rose-50"
                          title="Fjern denne kilden"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hovedarbeidsflate: To-kolonners layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Venstre side: Den sokratiske dialogen (Sparring) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col h-[680px]">
            
            {/* Header i chat-boksen */}
            <div className="pb-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-teal-600" />
                  Sokratisk Dialog & Sparring
                </h2>
                <p className="text-[11px] text-slate-500">
                  {fase === 'fase1' 
                    ? 'Utforsker barns engasjement før vi spikrer aktiviteter' 
                    : 'Aktivitetene er generert – du kan fortsette å justere'}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleStartNySparring}
                  className="text-xs font-bold text-slate-700 hover:text-teal-800 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1 cursor-pointer"
                  title="Start en ny sokratisk sparring med blanke ark"
                >
                  <RefreshCw className="w-3 h-3 text-teal-600" />
                  <span>Start ny sparring</span>
                </button>
                <button
                  type="button"
                  onClick={handleSlettChat}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1 cursor-pointer"
                  title="Slett chat-historikken"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Slett chat</span>
                </button>
                {fase === 'fase1' && (
                  <button
                    onClick={triggerFase2Generering}
                    disabled={isLoading}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black px-3.5 py-1.5 rounded-xl transition shadow flex items-center gap-1.5 shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generer kort nå
                  </button>
                )}
              </div>
            </div>

            {/* Chatlogg */}
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 animate-fade-in">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Chatten er slettet</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Samtalen er tømt. Klikk på knappen under for å starte en ny veiledningsøkt.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartNySparring}
                    className="mt-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Start ny sparring nå</span>
                  </button>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div 
                    key={idx} 
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[88%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-teal-800 text-white rounded-br-none shadow-sm'
                        : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 border border-slate-200 text-slate-600 p-4 rounded-2xl rounded-bl-none text-xs flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping"></span>
                    <span>Den Sokratiske Planleggeren reflekterer...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Raske forslag for pedlederen */}
            <div className="pt-2 pb-2 border-t border-slate-100 flex flex-wrap gap-1.5">
              <button
                onClick={() => handleSendMessage('Barna er spesielt opptatt av å samle blader og lage gjemmesteder i skogen.')}
                className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-medium transition"
              >
                Gjemmesteder i skogen
              </button>
              <button
                onClick={() => handleSendMessage('Vi har mange 3-åringer som trenger trygghet og sanseopplevelser sammen med voksne.')}
                className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-medium transition"
              >
                Sanser for de yngste
              </button>
              <button
                onClick={() => handleSendMessage('Vi har spikret konseptet og er klare for de konkrete kortene for uken.')}
                className="text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg font-bold transition"
              >
                Spikre og lag kort
              </button>
            </div>

            {/* Inputfelt */}
            <div className="pt-2 flex flex-col sm:flex-row items-end gap-2.5">
              <textarea
                rows={4}
                placeholder="Skriv dine observasjoner eller didaktiske tanker her... (Enter gir sideskift/ny linje)"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                disabled={isLoading}
                className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 text-slate-900 placeholder-slate-400 leading-relaxed resize-y min-h-[96px]"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputVal.trim()}
                className="w-full sm:w-auto bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white px-5 py-3.5 rounded-xl transition shadow flex items-center justify-center shrink-0 font-bold text-xs gap-1.5"
                title="Send melding"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>

          </div>
        </div>

        {/* Høyre side: De didaktiske kortene & Ukens tavle */}
        <div className="lg:col-span-6 space-y-6">

          {/* Seksjon 1: Genererte kort fra Fase 2 */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  Didaktiske Dra-og-Slipp-Kort
                </h2>
                <p className="text-[11px] text-slate-500">
                  Dra kortene inn på ukedagene nedenfor, eller bruk hurtigknappen.
                </p>
              </div>

              {hovedkort.length > 0 && (
                <button
                  onClick={triggerFase2Generering}
                  disabled={isLoading}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerer kort
                </button>
              )}
            </div>

            {hovedkort.length === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Target className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Ingen kort generert ennå</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                  Svar på spørsmålene i samtalen til venstre, eller klikk «Generer kort nå» for å skape 3 hovedaktiviteter, 3 gjenkallingsøkter og 2 fag-drypp.
                </p>
                <button
                  onClick={triggerFase2Generering}
                  disabled={isLoading}
                  className="mt-4 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow"
                >
                  Generer kortpakke for uken
                </button>
              </div>
            )}

            {/* 3 Hovedaktiviteter */}
            {hovedkort.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-teal-800">
                    3 Hovedaktiviteter
                  </span>
                  <span className="text-[10px] text-slate-500">Dra til ukedag</span>
                </div>

                <div className="space-y-2.5">
                  {hovedkort.map((kort, idx) => (
                    <div 
                      key={`sok-hoved-${kort.id}-${idx}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, kort, 'hovedaktivitet')}
                      className="bg-white border-2 border-teal-100 hover:border-teal-400 rounded-2xl p-4 shadow-sm hover:shadow transition cursor-grab active:cursor-grabbing group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                            {kort.kildeForankring}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-900 mt-1 group-hover:text-teal-900">
                            {kort.tittel}
                          </h4>
                        </div>
                        
                        {/* Hurtigtildel dropdown på mobil/klikk */}
                        <div className="relative shrink-0">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handlePlasserKortPaaDag(kort, 'hovedaktivitet', e.target.value as any);
                                e.target.value = '';
                              }
                            }}
                            className="text-[11px] font-bold bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 px-2 py-1 rounded-lg border border-slate-200 cursor-pointer"
                            defaultValue=""
                          >
                            <option value="" disabled>Plasser på...</option>
                            {UKEDAGER.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                        <strong className="text-slate-900 font-bold">Hva og hvordan: </strong>
                        {kort.hvaOgHvordan}
                      </p>
                      
                      <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-teal-900/90 bg-teal-50/50 p-2 rounded-xl">
                        <strong className="font-bold">Pedagogisk begrunnelse: </strong>
                        {kort.hvorfor}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3 Gjenkallingsøkter (PLAGG-fokus) */}
            {gjenkallingskort.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-900">
                    3 Gjenkallingsøkter (PLAGG)
                  </span>
                  <span className="text-[10px] text-slate-500">Bearbeiding og felles refleksjon</span>
                </div>

                <div className="space-y-2.5">
                  {gjenkallingskort.map((kort, idx) => (
                    <div 
                      key={`sok-gjenkall-${kort.id}-${idx}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, kort, 'gjenkalling')}
                      className="bg-white border-2 border-indigo-100 hover:border-indigo-400 rounded-2xl p-4 shadow-sm hover:shadow transition cursor-grab active:cursor-grabbing group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                            PLAGG: {kort.plaggFokus}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-900 mt-1 group-hover:text-indigo-900">
                            {kort.tittel}
                          </h4>
                        </div>

                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handlePlasserKortPaaDag(kort, 'gjenkalling', e.target.value as any);
                              e.target.value = '';
                            }
                          }}
                          className="text-[11px] font-bold bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 px-2 py-1 rounded-lg border border-slate-200 cursor-pointer"
                          defaultValue=""
                        >
                          <option value="" disabled>Plasser på...</option>
                          {UKEDAGER.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                        <strong className="text-slate-900 font-bold">Gjennomføring: </strong>
                        {kort.gjennomforing}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2 Fag-drypp */}
            {fagdryppKort.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                    2 Fag-drypp (Push-varsel til personalet)
                  </span>
                  <span className="text-[10px] text-slate-500">Maks 150 tegn</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fagdryppKort.map((drypp, i) => (
                    <div 
                      key={`sok-fagdrypp-${drypp.id}-${i}`}
                      className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-extrabold text-amber-900 uppercase mb-1">
                          <span>Fag-drypp {i + 1}</span>
                          <span>{drypp.tekst.length} tegn</span>
                        </div>
                        <p className="text-xs text-slate-800 font-semibold leading-relaxed italic">
                          "{drypp.tekst}"
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60">
                        <button
                          onClick={() => handleSendPushVarsel(drypp.tekst)}
                          className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold py-1.5 px-2 rounded-xl transition flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Bell className="w-3 h-3" />
                          <span>Send push</span>
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(drypp.tekst);
                            visVarsel("Fag-drypp kopiert!");
                          }}
                          className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] p-1.5 rounded-xl transition"
                          title="Kopier tekst"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Seksjon 2: Uketavle (Mandag til Fredag) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  Ukens Tavle for Blåbærtua
                </h3>
                <p className="text-[11px] text-slate-500">
                  Slippsone for de sokratiske kortene. Synkroniseres til hele avdelingens ukeplan.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOverforTilUkeplan}
                  disabled={plasserteKort.length === 0}
                  className="bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow flex items-center gap-1.5"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  Overfør til Ukeplan
                </button>
              </div>
            </div>

            {/* 5 Ukedag-kolonner */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
              {UKEDAGER.map((dag) => {
                const kortPaaDag = plasserteKort.filter(k => k.day === dag);
                return (
                  <div
                    key={`sok-ukedag-${dag}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnDay(e, dag)}
                    className="bg-slate-50 rounded-2xl p-3 border-2 border-dashed border-slate-200 hover:border-teal-400 min-h-[190px] flex flex-col justify-between transition"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
                        <span className="font-extrabold text-xs text-slate-800">{dag}</span>
                        <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded-full border border-slate-200">
                          {kortPaaDag.length}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {kortPaaDag.map((item, itemIdx) => (
                          <div
                            key={`sok-plassert-${item.id}-${itemIdx}`}
                            className={`p-2 rounded-xl text-xs shadow-sm border relative group ${
                              item.type === 'hovedaktivitet'
                                ? 'bg-teal-50 border-teal-200 text-teal-950'
                                : 'bg-indigo-50 border-indigo-200 text-indigo-950'
                            }`}
                          >
                            <button
                              onClick={() => handleFjernPlassertKort(item.id)}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition"
                              title="Fjern fra dagen"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <span className="text-[9px] font-extrabold uppercase block text-slate-500">
                              {item.tag}
                            </span>
                            <strong className="font-bold text-[11px] block mt-0.5 leading-snug">
                              {item.tittel}
                            </strong>
                          </div>
                        ))}

                        {kortPaaDag.length === 0 && (
                          <div className="text-center py-6 text-[11px] text-slate-400">
                            Dra kort hit
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-center text-slate-400 pt-2">
                      Slippsone
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* MODAL: Hva er PLAGG Veiledningsmodal */}
      <PlaggInfoModal
        isOpen={isPlaggInfoModalOpen}
        onClose={() => setIsPlaggInfoModalOpen(false)}
      />

      {/* MODAL: Pedagogisk Plattform & DNA (Styrern) */}
      <PedagogiskPlattformModal
        isOpen={isPlattformModalOpen}
        onClose={() => setIsPlattformModalOpen(false)}
        onProfileSaved={(oppdatert) => {
          setProfil(oppdatert);
          setVarselMelding(`Pedagogisk plattform oppdatert til ${oppdatert.plattformNavn}!`);
          setTimeout(() => setVarselMelding(null), 3000);
        }}
      />

    </div>
  );
}
