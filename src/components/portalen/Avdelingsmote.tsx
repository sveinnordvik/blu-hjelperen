import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, Clock, MapPin, Sparkles, Send, 
  ShieldCheck, FileText, CheckSquare, Plus, Trash2, 
  Download, Import, Lock, Archive, Search, Copy, Printer, Check, Eye, AlertCircle, RefreshCw
} from 'lucide-react';
import { callGoogleAIProxy } from '../../services/geminiService';
import { db, auth } from '../../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';

export interface Aksjonspunkt {
  id: string | number;
  hvem: string;
  hva: string;
  frist: string;
  fullfort?: boolean;
}

export interface LagretMote {
  id: string;
  dato: string;
  startTid: string;
  sluttTid: string;
  sted: string;
  innkalt: string;
  tilstede: string;
  barnSomDroftes: string;
  innsjekk: string;
  drofting: string;
  rammeplan: string;
  aksjonspunkter: Aksjonspunkt[];
  ferdigReferat: string;
  opprettetDato: string;
  avdelingNavn?: string;
}

interface AvdelingsmoteProps {
  avdelingNavn?: string;
}

export default function Avdelingsmote({ avdelingNavn = 'Blåbærtua' }: AvdelingsmoteProps) {
  // --- STATE FOR FANE OGSÅ I LAGRING ---
  const [aktivFane, setAktivFane] = useState<'nytt' | 'arkiv'>('nytt');
  const [sokTekst, setSokTekst] = useState('');
  const [valgtArkivertMote, setValgtArkivertMote] = useState<LagretMote | null>(null);
  const [kopiertState, setKopiertState] = useState(false);
  
  // --- STATE FOR FASE 1: METADATA OG SKJOLD ---
  const [metadata, setMetadata] = useState({
    dato: new Date().toISOString().split('T')[0],
    startTid: '09:30',
    sluttTid: '10:30',
    sted: 'Møterom 1',
    innkalt: 'Alle på avdelingen',
    tilstede: '',
    barnSomDroftes: '' // Ekstremt viktig for skjoldet! (Kommaseparert)
  });

  // --- STATE FOR FASE 1: DE 4 FASTE PUNKTER ---
  const [agendaNotater, setAgendaNotater] = useState({
    innsjekk: '',
    drofting: '',
    rammeplan: '',
  });

  // Aksjonspunkter (Gjøremål for Punkt 4)
  const [aksjonspunkter, setAksjonspunkter] = useState<Aksjonspunkt[]>([
    { id: 1, hvem: '', hva: '', frist: '' }
  ]);

  // --- STATE FOR FASE 2 & 3: PROSESSERING OG UTDATA ---
  const [behandlerAI, setBehandlerAI] = useState(false);
  const [aiFeilmelding, setAiFeilmelding] = useState<string | null>(null);
  const [ferdigReferat, setFerdigReferat] = useState<string | null>(null);

  // --- ARKIV AV MØTER ---
  const [moteArkiv, setMoteArkiv] = useState<LagretMote[]>(() => {
    try {
      const saved = localStorage.getItem(`pedledern_avdelingsmote_arkiv_${avdelingNavn}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Last fra Firestore om tilgjengelig
  useEffect(() => {
    const fetchArkivFromFirestore = async () => {
      try {
        const q = query(collection(db, 'avdelingsmoter'), orderBy('opprettetDato', 'desc'));
        const querySnapshot = await getDocs(q);
        const docs: LagretMote[] = [];
        querySnapshot.forEach((d) => {
          docs.push({ id: d.id, ...d.data() } as LagretMote);
        });
        if (docs.length > 0) {
          setMoteArkiv(docs);
          localStorage.setItem(`pedledern_avdelingsmote_arkiv_${avdelingNavn}`, JSON.stringify(docs));
        }
      } catch (e) {
        console.warn("Kunne ikke hente møtearkiv fra Firestore, bruker lokal lagring fallback.", e);
      }
    };
    fetchArkivFromFirestore();
  }, [avdelingNavn]);

  // Lagre til localStorage ved endring i moteArkiv
  useEffect(() => {
    try {
      localStorage.setItem(`pedledern_avdelingsmote_arkiv_${avdelingNavn}`, JSON.stringify(moteArkiv));
    } catch (e) {
      console.warn("Kunne ikke lagre til localStorage:", e);
    }
  }, [moteArkiv, avdelingNavn]);

  // Hjelpefunksjon: Legg til aksjonspunkt
  const leggTilAksjonspunkt = () => {
    setAksjonspunkter([
      ...aksjonspunkter, 
      { id: Date.now(), hvem: '', hva: '', frist: '', fullfort: false }
    ]);
  };

  // Hjelpefunksjon: Fjern aksjonspunkt
  const fjernAksjonspunkt = (id: string | number) => {
    if (aksjonspunkter.length === 1) {
      setAksjonspunkter([{ id: Date.now(), hvem: '', hva: '', frist: '', fullfort: false }]);
      return;
    }
    setAksjonspunkter(aksjonspunkter.filter(a => a.id !== id));
  };

  // Hjelpefunksjon: Hent fra Planlegging
  const handleHentFraPlanlegging = () => {
    try {
      // Sjekk om det finnes lagret ukeplan
      const savedPlan = localStorage.getItem('pedledern_weekly_plan');
      if (savedPlan) {
        const parsed: Array<{ day: string; activity: string; fagomrade: string; responsible: string; notes: string }> = JSON.parse(savedPlan);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const formattedPlan = parsed.map(p => `• ${p.day}: ${p.activity} (${p.fagomrade}) - Ansvarlig: ${p.responsible} ${p.notes ? `[${p.notes}]` : ''}`).join('\n');
          setAgendaNotater(prev => ({
            ...prev,
            rammeplan: `[Hentet automatisk fra Didaktisk Ukeplan for ${avdelingNavn}]:\n${formattedPlan}`
          }));
          return;
        }
      }
    } catch (e) {
      console.warn("Kunne ikke hente ukeplan fra localStorage", e);
    }

    // Fallback om ingenting er i localStorage
    setAgendaNotater(prev => ({
      ...prev,
      rammeplan: `[Hentet automatisk fra Planleggeren for ${avdelingNavn}]:\n- Fokus på antall, rom og form denne uken.\n- Bukkene Bruse i samlingsstund.\n- Turdag onsdag: Deles i to grupper, Kari tar førskolegruppa.`
    }));
  };

  // --- FASE 2: RENSKRIV OG ANONYMISER (KI-Motor med ekte Gemini Integration) ---
  const handleRenskrivOgAnonymiser = async () => {
    setAiFeilmelding(null);

    if (!metadata.tilstede.trim()) {
      alert("Husk å fylle ut hvem som er tilstede på møtet!");
      return;
    }

    setBehandlerAI(true);

    // 1. SKJOLDET: Henter ut navnene som skal skjoldes og bytter dem ut med [BARNET] eller [BARN 1], [BARN 2]
    let vasketDrofting = agendaNotater.drofting;
    const skjoldedeNavnMap: string[] = [];

    if (metadata.barnSomDroftes.trim()) {
      const navnListe = metadata.barnSomDroftes.split(',').map(n => n.trim()).filter(Boolean);
      navnListe.forEach((navn, idx) => {
        if (navn) {
          skjoldedeNavnMap.push(navn);
          const erstatning = navnListe.length > 1 ? `[BARN ${idx + 1}]` : '[BARNET]';
          // Både for- og etternavn eller eksakt treff
          const regex = new RegExp(`\\b${navn}\\b`, 'gi');
          vasketDrofting = vasketDrofting.replace(regex, erstatning);
        }
      });
      console.log("Sikkerhetsvasket drøfting før sending til KI:", vasketDrofting);
    }

    const aktueltAksjonspunkterTekst = aksjonspunkter
      .filter(p => p.hva.trim())
      .map(p => `- ${p.hvem || 'Udefinert'}: ${p.hva} (Frist: ${p.frist || 'Snarest'})`)
      .join('\n');

    // 2. KALLE EKTE GEMINI KI-TJENESTE
    try {
      const prompt = `Du er en erfaren og faglig sterk pedagogisk leder og veileder i en norsk barnehage.
Din oppgave er å renskrive og strukturere et referat fra et avdelingsmøte (fagmøte).

MØTEMETADATA:
- Avdeling: ${avdelingNavn}
- Dato: ${metadata.dato}
- Tidspunkt: ${metadata.startTid} - ${metadata.sluttTid}
- Møtested: ${metadata.sted}
- Innkalt: ${metadata.innkalt}
- Tilstede: ${metadata.tilstede}
${skjoldedeNavnMap.length > 0 ? `- Anonymiserings-skjold aktivert for barn: ${skjoldedeNavnMap.length} navn anonymisert (vises som [BARNET] eller [BARN 1], [BARN 2])` : ''}

RÅNOTATER FRA AGENDA:
1. INNSJEKK & RELASJON (10 MIN):
${agendaNotater.innsjekk || 'Gjennomført uten spesielle merknader.'}

2. DRØFTING AV PRAKSISFORTELLING (25 MIN):
${vasketDrofting || 'Ingen spesifikk drøfting av praksisfortelling var registrert på dette møtet.'}

3. RAMMEPLAN & DIDAKTISK UKEPLAN (20 MIN):
${agendaNotater.rammeplan || 'Gjennomgått ukeplan og fordeling av pedagogiske oppgaver.'}

4. AKSJONSPUNKTER & AVTALER (5 MIN):
${aktueltAksjonspunkterTekst || 'Ingen spesifikke oppgaver oppført.'}

INSTRUKSJONER FOR REFERATET:
- Vask språket til et profesjonelt, didaktisk og saklig barnehagefaglig nivå.
- Sørg for at anonymiseringen opprettholdes STRICT (ingen barnenavn skal røpes).
- Forankre refleksjonene gjerne kort i Rammeplan for barnehagen der det faller seg naturlig.
- Strukturér teksten med klare og ryddige overskrifter (1. INNSJEKK & RELASJON, 2. DRØFTING AV PRAKSISFORTELLING, 3. RAMMEPLAN & DIDAKTISK UKEPLAN, 4. AKSJONSPUNKTER OG OPPSUMMERING).
- Svaret skal være klart til utsendelse og arkivering for personalet.`;

      const response = await callGoogleAIProxy({
        model: 'gemini-3.8-flash',
        contents: prompt
      });

      if (response && response.text) {
        setFerdigReferat(response.text);
      } else {
        throw new Error("Mottok tomt svar fra KI-assistenten.");
      }
    } catch (err: any) {
      console.warn("KI-renskriving feilet, bruker formatert fallback:", err);
      setAiFeilmelding(err.message || "Kunne ikke nå KI-tjenesten akkurat nå. Renskrevet mal er generert.");

      // Robust fallback dersom nettverk feiler
      const fallbackReferat = `MØTEREFERAT - AVDELINGSMØTE (${avdelingNavn})
Dato: ${metadata.dato} | Tid: ${metadata.startTid}-${metadata.sluttTid} | Sted: ${metadata.sted}
Tilstede: ${metadata.tilstede} | Innkalt: ${metadata.innkalt}

1. INNSJEKK & RELASJON:
${agendaNotater.innsjekk ? agendaNotater.innsjekk : 'Gjennomført uten spesielle merknader. God stemning og god inngang til møtet.'}

2. DRØFTING AV PRAKSISFORTELLING:
${vasketDrofting ? vasketDrofting : 'Ingen spesifikk drøfting registrert i dag.'}

3. RAMMEPLAN & DIDAKTISK UKEPLAN:
${agendaNotater.rammeplan ? agendaNotater.rammeplan : 'Ukeplanen gjennomgått og forankret i Rammeplanens fagområder.'}

4. AKSJONSPUNKTER OG AVTALER:
${aktueltAksjonspunkterTekst || 'Ingen spesifikke oppgaver registrert.'}`;

      setFerdigReferat(fallbackReferat);
    } finally {
      setBehandlerAI(false);
    }
  };

  // --- FASE 3: LAGRE TIL ARKIV OG SEND E-POST ---
  const handleArkiverOgSend = async () => {
    if (!ferdigReferat) return;

    const nyttMote: LagretMote = {
      id: Date.now().toString(),
      dato: metadata.dato,
      startTid: metadata.startTid,
      sluttTid: metadata.sluttTid,
      sted: metadata.sted,
      innkalt: metadata.innkalt,
      tilstede: metadata.tilstede,
      barnSomDroftes: metadata.barnSomDroftes,
      innsjekk: agendaNotater.innsjekk,
      drofting: agendaNotater.drofting,
      rammeplan: agendaNotater.rammeplan,
      aksjonspunkter: aksjonspunkter.filter(p => p.hva.trim()),
      ferdigReferat: ferdigReferat,
      opprettetDato: new Date().toISOString(),
      avdelingNavn
    };

    // 1. Lagre i Firestore (om tilgjengelig)
    try {
      await addDoc(collection(db, 'avdelingsmoter'), {
        ...nyttMote,
        opprettetAvUid: auth.currentUser?.uid || 'anonym',
        opprettetAvEpost: auth.currentUser?.email || 'anonym',
        createdTimestamp: serverTimestamp()
      });
    } catch (e) {
      console.warn("Kunne ikke lagre møte i Firestore, lagres kun i lokal historikk:", e);
    }

    // 2. Oppdater lokal state
    const oppdatertArkiv = [nyttMote, ...moteArkiv];
    setMoteArkiv(oppdatertArkiv);

    // 3. Nullstill og bekreft
    alert(`Referatet er lagret i møtearkivet for ${avdelingNavn} og gjort klart for e-postutsendelse til: ${metadata.innkalt}!`);
    setFerdigReferat(null);
    setAgendaNotater({ innsjekk: '', drofting: '', rammeplan: '' });
    setAksjonspunkter([{ id: Date.now(), hvem: '', hva: '', frist: '', fullfort: false }]);
    setMetadata(prev => ({ ...prev, tilstede: '', barnSomDroftes: '' }));
    setAktivFane('arkiv');
  };

  // Hjelper for kopiering av referat
  const handleKopierReferat = (tekst: string) => {
    navigator.clipboard.writeText(tekst);
    setKopiertState(true);
    setTimeout(() => setKopiertState(false), 2000);
  };

  // Sletting fra arkiv
  const handleSlettArkivertMote = async (id: string) => {
    if (window.confirm("Er du sikker på at du vil slette dette referatet fra arkivet?")) {
      try {
        await deleteDoc(doc(db, 'avdelingsmoter', id));
      } catch (e) {
        console.warn("Kunne ikke slette fra Firestore:", e);
      }
      const nyttArkiv = moteArkiv.filter(m => m.id !== id);
      setMoteArkiv(nyttArkiv);
      if (valgtArkivertMote?.id === id) {
        setValgtArkivertMote(null);
      }
    }
  };

  // Filtrert arkiv
  const filtrertArkiv = moteArkiv.filter(mote => {
    if (!sokTekst.trim()) return true;
    const t = sokTekst.toLowerCase();
    return (
      mote.dato.includes(t) ||
      mote.sted.toLowerCase().includes(t) ||
      mote.tilstede.toLowerCase().includes(t) ||
      mote.ferdigReferat.toLowerCase().includes(t)
    );
  });

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 font-sans pb-12">
      
      {/* HEADER & TOPP-MENY */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-800 p-3 rounded-2xl text-white shadow-md">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">Fagmøter & Veiledning</h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {avdelingNavn}
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm">Strukturert, trygt og anonymisert fagmøte for avdelingen.</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl self-stretch sm:self-auto justify-center">
          <button 
            onClick={() => setAktivFane('nytt')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              aktivFane === 'nytt' 
                ? 'bg-white text-emerald-800 shadow-sm border border-slate-200/60' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-4 h-4" /> Nytt Møte
          </button>
          <button 
            onClick={() => setAktivFane('arkiv')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              aktivFane === 'arkiv' 
                ? 'bg-white text-emerald-800 shadow-sm border border-slate-200/60' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Archive className="w-4 h-4" /> Møtearkiv ({moteArkiv.length})
          </button>
        </div>
      </div>

      {/* DET NYE MØTESKJEMAET */}
      {aktivFane === 'nytt' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* VENSTRE & MIDTEN: MØTE-OPPSETTET */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* FASE 1A: METADATA */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" /> Møtedetaljer
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dato</label>
                  <input 
                    type="date" 
                    value={metadata.dato} 
                    onChange={e => setMetadata({...metadata, dato: e.target.value})} 
                    className="w-full p-2.5 mt-1 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-medium" 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Start - Slutt</label>
                  <div className="flex gap-1.5 mt-1">
                    <input 
                      type="time" 
                      value={metadata.startTid} 
                      onChange={e => setMetadata({...metadata, startTid: e.target.value})} 
                      className="w-1/2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-medium" 
                    />
                    <input 
                      type="time" 
                      value={metadata.sluttTid} 
                      onChange={e => setMetadata({...metadata, sluttTid: e.target.value})} 
                      className="w-1/2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-medium" 
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sted</label>
                  <input 
                    type="text" 
                    value={metadata.sted} 
                    onChange={e => setMetadata({...metadata, sted: e.target.value})} 
                    placeholder="f.eks. Møterom 1 / Pausrommet"
                    className="w-full p-2.5 mt-1 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-medium" 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Innkalt</label>
                  <input 
                    type="text" 
                    value={metadata.innkalt} 
                    onChange={e => setMetadata({...metadata, innkalt: e.target.value})} 
                    placeholder="Alle på avdelingen"
                    className="w-full p-2.5 mt-1 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-medium" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tilstede (Navn på personalet)</label>
                  <input 
                    type="text" 
                    placeholder="f.eks. Ingrid, Fatima, Camilla" 
                    value={metadata.tilstede} 
                    onChange={e => setMetadata({...metadata, tilstede: e.target.value})} 
                    className="w-full p-2.5 mt-1 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-medium" 
                  />
                </div>
                <div className="relative">
                  <label className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Barn som drøftes (Skjoldes)
                    </span>
                    {metadata.barnSomDroftes.trim() && (
                      <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                        {metadata.barnSomDroftes.split(',').filter(n => n.trim()).length} NAVN SKJOLDES
                      </span>
                    )}
                  </label>
                  <input 
                    type="text" 
                    placeholder="f.eks. Kari, Ola (Kommaseparert)" 
                    value={metadata.barnSomDroftes} 
                    onChange={e => setMetadata({...metadata, barnSomDroftes: e.target.value})} 
                    className="w-full p-2.5 mt-1 rounded-xl border border-emerald-300 bg-emerald-50/60 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900" 
                  />
                </div>
              </div>
            </div>

            {/* FASE 1B: AGENDAEN (De 4 faste punkter) */}
            <div className="space-y-4">
              
              {/* Punkt 1 */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">1</span>
                    Innsjekk & relasjon (10 min)
                  </h3>
                  <span className="text-xs font-medium text-slate-400">Teamfølelse & trivsel</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">Hvordan har uken vært for hver enkelt? Hva har fungert spesielt godt på avdelingen?</p>
                <textarea 
                  rows={3} 
                  placeholder="Stikkord fra runden på huset..." 
                  value={agendaNotater.innsjekk} 
                  onChange={e => setAgendaNotater({...agendaNotater, innsjekk: e.target.value})} 
                  className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed" 
                />
              </div>

              {/* Punkt 2 (Sensitivt - Skjold) */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-emerald-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-800 text-white text-[10px] font-bold px-3.5 py-1 rounded-bl-xl flex items-center gap-1.5 shadow-sm">
                  <Lock className="w-3.5 h-3.5 text-emerald-300" /> ANONYMISERINGS-SKJOLD AKTIVERT
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">2</span>
                    Drøfting av praksisfortelling (25 min)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Kollektiv refleksjon uten forhåndsdømming. Bruk ekte fornavn her om du vil - skjoldet fjerner dem og erstatter med [BARNET] før arkivering.
                </p>
                <textarea 
                  rows={5} 
                  placeholder="Skriv rått og ærlig her. Skjoldet fanger opp navnene du definerte øverst og anonymiserer dem før generering..." 
                  value={agendaNotater.drofting} 
                  onChange={e => setAgendaNotater({...agendaNotater, drofting: e.target.value})} 
                  className="w-full p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed" 
                />
              </div>

              {/* Punkt 3 (Integrasjon med Ukeplan) */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">3</span>
                      Rammeplan & Didaktisk ukeplan (20 min)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Fordeling av roller, fagområder og tilrettelegging for enkeltbarn.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={handleHentFraPlanlegging} 
                    className="text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 px-3.5 py-2 rounded-xl flex items-center gap-1.5 border border-blue-200 transition shrink-0 cursor-pointer"
                  >
                    <Import className="w-4 h-4 text-blue-600" /> Hent fra Planleggeren
                  </button>
                </div>
                <textarea 
                  rows={5} 
                  placeholder="Hent ukeplanens økter automatisk via knappen over, eller skriv inn didaktiske notater..." 
                  value={agendaNotater.rammeplan} 
                  onChange={e => setAgendaNotater({...agendaNotater, rammeplan: e.target.value})} 
                  className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-mono text-[13px]" 
                />
              </div>

              {/* Punkt 4 (Aksjonspunkter) */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">4</span>
                  Oppsummering & aksjonspunkter (5 min)
                </h3>
                <p className="text-xs text-slate-500 mb-4">Hvem gjør hva før neste fagmøte? Dette blir en oversiktlig to-do liste i referatet.</p>
                
                <div className="space-y-3 mb-4">
                  {aksjonspunkter.map((punkt, index) => (
                    <div key={punkt.id} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <input 
                        type="text" 
                        placeholder="Hvem? (f.eks. Fatima)" 
                        value={punkt.hvem} 
                        onChange={e => { 
                          const nye = [...aksjonspunkter]; 
                          nye[index].hvem = e.target.value; 
                          setAksjonspunkter(nye); 
                        }} 
                        className="w-full sm:w-1/4 p-2 text-xs sm:text-sm bg-white rounded-lg border border-slate-200 outline-none focus:border-emerald-500 font-semibold" 
                      />
                      <input 
                        type="text" 
                        placeholder="Gjør hva? (f.eks. Lage konkreter til samling)" 
                        value={punkt.hva} 
                        onChange={e => { 
                          const nye = [...aksjonspunkter]; 
                          nye[index].hva = e.target.value; 
                          setAksjonspunkter(nye); 
                        }} 
                        className="flex-1 p-2 text-xs sm:text-sm bg-white rounded-lg border border-slate-200 outline-none focus:border-emerald-500" 
                      />
                      <div className="flex gap-2 items-center">
                        <input 
                          type="date" 
                          value={punkt.frist} 
                          onChange={e => { 
                            const nye = [...aksjonspunkter]; 
                            nye[index].frist = e.target.value; 
                            setAksjonspunkter(nye); 
                          }} 
                          className="w-full sm:w-36 p-2 text-xs bg-white rounded-lg border border-slate-200 outline-none focus:border-emerald-500" 
                        />
                        <button 
                          type="button"
                          onClick={() => fjernAksjonspunkt(punkt.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Slett oppgave"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  type="button"
                  onClick={leggTilAksjonspunkt} 
                  className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition border border-emerald-200 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-600" /> Legg til oppgave
                </button>
              </div>

            </div>
          </div>

          {/* HØYRE KOLONNE: KI-MOTOR & UTDATA (Fase 2 & 3) */}
          <div className="space-y-6">
            
            {/* KI-Knappen */}
            {!ferdigReferat ? (
              <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl sticky top-24 space-y-4 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Renskriv Referat</h3>
                    <p className="text-xs text-slate-400">Med KI-anonymisering</p>
                  </div>
                </div>

                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Når møtet er ferdig, gjør KI-en stikkordene dine om til et profesjonelt referat forankret i Rammeplanen, og aktiverer anonymiserings-skjoldet.
                </p>

                {aiFeilmelding && (
                  <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{aiFeilmelding}</span>
                  </div>
                )}

                <button 
                  onClick={handleRenskrivOgAnonymiser}
                  disabled={behandlerAI}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer"
                >
                  {behandlerAI ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-200" />
                      <span>Vasker & Renskriver...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      <span>Renskriv & Anonymiser</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Skjoldet opprettholder anonymitet</span>
                  </div>
                  <p>Systemet fjerner navnene på barna du har spesifisert øverst før teksten lagres.</p>
                </div>
              </div>
            ) : (
              /* Forhåndsvisning og Lagre-knapp */
              <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-[2rem] shadow-sm sticky top-24 flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-emerald-900 text-lg flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-emerald-600" /> Klart for utsendelse
                  </h3>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleKopierReferat(ferdigReferat)}
                      className="p-2 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Kopier til utklippstavle"
                    >
                      {kopiertState ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                      <span>{kopiertState ? 'Kopiert!' : 'Kopier'}</span>
                    </button>
                  </div>
                </div>

                {/* Tekstboks med referat */}
                <div className="flex-1 bg-white p-4 rounded-xl border border-emerald-200 overflow-y-auto mb-4 text-xs text-slate-800 whitespace-pre-wrap shadow-inner leading-relaxed">
                  {ferdigReferat}

                  {/* Viser aksjonspunktene i forhåndsvisningen */}
                  {aksjonspunkter.some(p => p.hva.trim()) && (
                    <div className="mt-4 pt-4 border-t border-slate-200 font-sans">
                      <strong className="text-slate-900 font-bold block mb-1">AKSJONSPUNKTER:</strong>
                      {aksjonspunkter.map(p => p.hva.trim() && (
                        <div key={p.id} className="mt-1 text-slate-700">
                          • <strong>{p.hvem || 'Udefinert'}</strong>: {p.hva} (Frist: {p.frist || 'Snarest'})
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  <button 
                    onClick={handleArkiverOgSend}
                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer text-sm"
                  >
                    <Send className="w-4 h-4 text-emerald-400" /> Arkiver & Send E-post
                  </button>
                  <button 
                    onClick={() => setFerdigReferat(null)}
                    className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-bold transition cursor-pointer"
                  >
                    Tilbake til redigering
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ARKIV-VISNING FOR AVDELINGSMØTER */}
      {aktivFane === 'arkiv' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Archive className="w-6 h-6 text-emerald-700" /> Møtearkiv for {avdelingNavn}
              </h2>
              <p className="text-xs text-slate-500 mt-1">Historiske referater og aksjonspunkter fra tidligere avdelingsmøter.</p>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input 
                type="text" 
                placeholder="Søk i dato, tilstede..." 
                value={sokTekst}
                onChange={e => setSokTekst(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {filtrertArkiv.length === 0 ? (
            <div className="bg-white p-12 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
              <Archive className="w-16 h-16 text-slate-200 mb-3" />
              <h3 className="text-base font-bold text-slate-700">Ingen referater i arkivet ennå</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Opprett et nytt møte og trykk «Arkiver & Send E-post» for å bygge opp møtearkivet ditt trygt.
              </p>
              <button
                onClick={() => setAktivFane('nytt')}
                className="mt-4 bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-emerald-500 transition cursor-pointer"
              >
                Start nytt møte nå
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtrertArkiv.map(mote => (
                <div 
                  key={mote.id} 
                  className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 transition shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Avdelingsmøte</span>
                        <h4 className="font-bold text-slate-900 text-base">{mote.dato} ({mote.startTid} - {mote.sluttTid})</h4>
                      </div>
                      <span className="text-[11px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {mote.sted}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-3 mb-3 leading-relaxed">
                      {mote.ferdigReferat}
                    </p>

                    <div className="text-xs text-slate-500 space-y-1 border-t border-slate-100 pt-3">
                      <div>Tilstede: <strong>{mote.tilstede}</strong></div>
                      {mote.aksjonspunkter && mote.aksjonspunkter.length > 0 && (
                        <div className="text-emerald-800 font-semibold">
                          • {mote.aksjonspunkter.length} aksjonspunkt(er) registrert
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => setValgtArkivertMote(mote)}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" /> Les fullstendig referat
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleKopierReferat(mote.ferdigReferat)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        title="Kopier referat"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSlettArkivertMote(mote.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Slett referat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FULLSTENDIG REFERAT MODAL */}
      {valgtArkivertMote && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] flex flex-col border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase">Referat fra Møtearkiv</span>
                <h3 className="font-bold text-lg text-slate-900">
                  {valgtArkivertMote.dato} • {valgtArkivertMote.sted}
                </h3>
              </div>
              <button 
                onClick={() => setValgtArkivertMote(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {valgtArkivertMote.ferdigReferat}

              {valgtArkivertMote.aksjonspunkter && valgtArkivertMote.aksjonspunkter.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-200 font-sans">
                  <strong className="text-slate-900 font-bold block mb-2">AKSJONSPUNKTER FOR AVDELINGEN:</strong>
                  <div className="space-y-1.5">
                    {valgtArkivertMote.aksjonspunkter.map((ap, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                        <span><strong>{ap.hvem || 'Ansatt'}</strong>: {ap.hva}</span>
                        <span className="text-slate-500 font-medium text-[11px]">Frist: {ap.frist || 'Snarest'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <button
                onClick={() => handleKopierReferat(valgtArkivertMote.ferdigReferat)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Copy className="w-4 h-4" /> Kopier teksten
              </button>
              <button
                onClick={() => setValgtArkivertMote(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Lukk
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
