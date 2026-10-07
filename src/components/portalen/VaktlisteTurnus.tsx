import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Edit2, 
  ArrowRightLeft, 
  Download, 
  Printer, 
  Filter, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  Sparkles, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X,
  UserPlus,
  HelpCircle,
  CalendarRange,
  Building2,
  LayoutGrid,
  List,
  Layers,
  GraduationCap
} from 'lucide-react';
import { jsPDF } from 'jspdf';

export interface VaktItem {
  id: number;
  navn: string;
  rolle?: string;
  base: string;
  dag?: string; // F.eks. 'Mandag', 'Tirsdag', osv.
  tid: string;
  status: string;
  farge: string;
  merknad?: string;
  erVikar?: boolean;
}

interface BaseNorm {
  id: number;
  navn: string;
  alder: string;
  barnTilStede: number;
  voksneTilStede: number;
}

interface VaktlisteTurnusProps {
  onNavigate?: (tab: string) => void;
}

const DAGER = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];
const BASER = ['Trollstua', 'Multemyra', 'Klatremus', 'Bjørnehiet'];

const BASE_INFO: Record<string, { alder: string; farge: string; ikonFarge: string; beskrivelse: string; norm: string }> = {
  'Trollstua': {
    alder: 'Småbarn (0–3 år)',
    farge: 'border-emerald-200 bg-emerald-50/40',
    ikonFarge: 'bg-emerald-600 text-white',
    beskrivelse: 'Småbarnsavdeling med 14 barn. Norm: 1 voksen per 3 barn.',
    norm: 'Pedledernorm: 2 pedledere'
  },
  'Multemyra': {
    alder: 'Storebarn (3–6 år)',
    farge: 'border-blue-200 bg-blue-50/40',
    ikonFarge: 'bg-blue-600 text-white',
    beskrivelse: 'Storebarnsavdeling med 18 barn. Norm: 1 voksen per 6 barn.',
    norm: 'Pedledernorm: 1 pedleder + 2 fagarbeidere'
  },
  'Klatremus': {
    alder: 'Storebarn (3–6 år)',
    farge: 'border-purple-200 bg-purple-50/40',
    ikonFarge: 'bg-purple-600 text-white',
    beskrivelse: 'Aktiv friluft- og storebarnsgruppe. 18 barn.',
    norm: 'Pedledernorm: 1 pedleder + assistenter'
  },
  'Bjørnehiet': {
    alder: 'Mellomgruppe (2–4 år)',
    farge: 'border-amber-200 bg-amber-50/40',
    ikonFarge: 'bg-amber-600 text-white',
    beskrivelse: 'Overgangsavdeling med 16 barn. Tilpasset pedagogisk opplegg.',
    norm: 'Pedledernorm: 1 pedleder + 1 fagarbeider (80%)'
  }
};

const STANDARD_VAKTER = [
  { label: 'Tidligvakt (07:00 - 14:30)', tid: '07:00 - 14:30' },
  { label: 'Tidligvakt (07:30 - 15:00)', tid: '07:30 - 15:00' },
  { label: 'Mellomvakt 1 (08:00 - 15:30)', tid: '08:00 - 15:30' },
  { label: 'Mellomvakt 2 (08:30 - 16:00)', tid: '08:30 - 16:00' },
  { label: 'Seinvakt (09:00 - 16:30)', tid: '09:00 - 16:30' },
  { label: 'Seinvakt / Stenge (09:30 - 17:00)', tid: '09:30 - 17:00' },
];

export const VaktlisteTurnus: React.FC<VaktlisteTurnusProps> = ({ onNavigate }) => {
  // --- STATE ---
  const [hovedVisning, setHovedVisning] = useState<'avdelinger' | 'liste'>('avdelinger');
  const [valgtDag, setValgtDag] = useState<string>('Mandag');
  const [filterBase, setFilterBase] = useState<string>('alle');
  const [sokeord, setSokeord] = useState<string>('');
  const [toastMelding, setToastMelding] = useState<string | null>(null);

  // Modaler
  const [redigererVakt, setRedigererVakt] = useState<VaktItem | null>(null);
  const [visNyVaktModal, setVisNyVaktModal] = useState<boolean>(false);
  const [visVikarModal, setVisVikarModal] = useState<boolean>(false);
  const [visKiTurnusModal, setVisKiTurnusModal] = useState<boolean>(false);
  const [flyttModalVakt, setFlyttModalVakt] = useState<VaktItem | null>(null);

  // Vaktplan - synket mot localStorage slik at Bemanningsradar og DagensOversikt også oppdateres
  const [vakter, setVakter] = useState<VaktItem[]>(() => {
    const saved = localStorage.getItem('styrern_radar_vaktplan');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Sørg for at alle har dag satt
        return parsed.map((v: any) => ({
          ...v,
          dag: v.dag || 'Mandag',
          rolle: v.rolle || (v.status.toLowerCase().includes('vikar') ? 'Vikar' : 'Ansatt')
        }));
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: 1, navn: 'Ingrid Solheim', rolle: 'Ped.leder', base: 'Trollstua', dag: 'Mandag', tid: '07:30 - 15:00', status: 'Til stede', farge: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
      { id: 2, navn: 'Morten Hansen', rolle: 'Assistent', base: 'Trollstua', dag: 'Mandag', tid: '08:00 - 15:30', status: 'Til stede', farge: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
      { id: 3, navn: 'Fatima Al-Zahra', rolle: 'Fagarbeider', base: 'Multemyra', dag: 'Mandag', tid: '08:30 - 16:00', status: 'Sykemeldt', farge: 'text-rose-700 bg-rose-50 border-rose-200', merknad: 'Egenmelding dag 1' },
      { id: 4, navn: 'Lars Pettersen', rolle: 'Vikar', base: 'Multemyra', dag: 'Mandag', tid: '08:30 - 16:00', status: 'Vikar (Til stede)', farge: 'text-blue-700 bg-blue-50 border-blue-200', erVikar: true, merknad: 'Dekker for Fatima' },
      { id: 5, navn: 'Camilla Vik', rolle: 'Assistent', base: 'Klatremus', dag: 'Mandag', tid: '09:00 - 16:30', status: 'Til stede', farge: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
      { id: 6, navn: 'Henrik Berg', rolle: 'Ped.leder', base: 'Bjørnehiet', dag: 'Mandag', tid: '08:00 - 15:30', status: 'Til stede', farge: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
      { id: 7, navn: 'Sara Moe', rolle: 'Fagarbeider', base: 'Bjørnehiet', dag: 'Mandag', tid: '08:30 - 16:00', status: 'Til stede', farge: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
      // Tirsdag
      { id: 8, navn: 'Ingrid Solheim', rolle: 'Ped.leder', base: 'Trollstua', dag: 'Tirsdag', tid: '08:30 - 16:00', status: 'Til stede', farge: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
      { id: 9, navn: 'Morten Hansen', rolle: 'Assistent', base: 'Trollstua', dag: 'Tirsdag', tid: '07:30 - 15:00', status: 'Til stede', farge: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
      { id: 10, navn: 'Lars Pettersen', rolle: 'Vikar', base: 'Multemyra', dag: 'Tirsdag', tid: '08:30 - 16:00', status: 'Vikar (Til stede)', farge: 'text-blue-700 bg-blue-50 border-blue-200', erVikar: true },
      { id: 11, navn: 'Camilla Vik', rolle: 'Assistent', base: 'Klatremus', dag: 'Tirsdag', tid: '08:00 - 15:30', status: 'Til stede', farge: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    ];
  });

  // Synkroniser til localStorage
  useEffect(() => {
    localStorage.setItem('styrern_radar_vaktplan', JSON.stringify(vakter));
  }, [vakter]);

  const visToast = (msg: string) => {
    setToastMelding(msg);
    setTimeout(() => setToastMelding(null), 3000);
  };

  // --- DUPLIKAT- OG KONFLIKTDETEKSJON ---
  // Finn vakter der samme person er satt opp flere ganger på samme dag og tidspunkt (eller samme dag)
  const finnDuplikater = () => {
    const duplikater: { [key: string]: VaktItem[] } = {};
    vakter.forEach(v => {
      const vDag = v.dag || 'Mandag';
      // Nøkkel basert på navn, dag og tidspunkt (nøyaktig kollisjon)
      const nøkkel = `${v.navn.trim().toLowerCase()}___${vDag}___${v.tid.trim()}`;
      if (!duplikater[nøkkel]) {
        duplikater[nøkkel] = [];
      }
      duplikater[nøkkel].push(v);
    });

    const konfliktGrupper = Object.values(duplikater).filter(gruppe => gruppe.length > 1);
    return konfliktGrupper;
  };

  const konfliktGrupper = finnDuplikater();
  const harDuplikater = konfliktGrupper.length > 0;
  const totaltDuplikater = konfliktGrupper.reduce((acc, g) => acc + (g.length - 1), 0);

  // Funksjon for å automatisk rydde og slette overflødige dobbeltoppføringer
  const handleRensDobbeltoppforinger = () => {
    const beholdteIder = new Set<number>();
    const unikeNokler = new Set<string>();
    const nyeVakter: VaktItem[] = [];

    vakter.forEach(v => {
      const vDag = v.dag || 'Mandag';
      const nøkkel = `${v.navn.trim().toLowerCase()}___${vDag}___${v.tid.trim()}`;
      if (!unikeNokler.has(nøkkel)) {
        unikeNokler.add(nøkkel);
        beholdteIder.add(v.id);
        nyeVakter.push(v);
      }
    });

    const slettetAntall = vakter.length - nyeVakter.length;
    setVakter(nyeVakter);
    visToast(`Ryddet opp! ${slettetAntall} dobbeltoppføring(er) ble fjernet.`);
  };

  // Slett en spesifikk vakt
  const handleSlettVakt = (id: number, navn: string) => {
    setVakter(prev => prev.filter(v => v.id !== id));
    visToast(`Vakt for ${navn} ble slettet.`);
  };

  // Flytt ansatt til en annen base
  const handleFlyttBase = (vaktId: number, nyBase: string) => {
    setVakter(prev => prev.map(v => {
      if (v.id === vaktId) {
        return { ...v, base: nyBase };
      }
      return v;
    }));
    setFlyttModalVakt(null);
    visToast(`Ansatt flyttet til ${nyBase}! Bemanningsbalansen er oppdatert.`);
  };

  // Lagre redigert vakt
  const handleLagreRedigertVakt = (oppdatert: VaktItem) => {
    setVakter(prev => prev.map(v => v.id === oppdatert.id ? oppdatert : v));
    setRedigererVakt(null);
    visToast(`Vakten for ${oppdatert.navn} er oppdatert.`);
  };

  // Legg til ny vakt
  const handleLeggTilNyVakt = (nyVakt: Omit<VaktItem, 'id'>) => {
    // Sjekk om det allerede finnes en vakt for personen på samme tid og dag
    const eksisterer = vakter.some(
      v => v.navn.toLowerCase() === nyVakt.navn.toLowerCase() && 
           v.dag === nyVakt.dag && 
           v.tid === nyVakt.tid
    );

    if (eksisterer) {
      if (!confirm(`⚠️ OBS: ${nyVakt.navn} har allerede en vakt på ${nyVakt.dag} kl ${nyVakt.tid}. Er du sikker på at du vil opprette en duplikatvakt?`)) {
        return;
      }
    }

    const ny: VaktItem = {
      ...nyVakt,
      id: Date.now()
    };

    setVakter(prev => [...prev, ny]);
    setVisNyVaktModal(false);
    visToast(`Ny vakt opprettet for ${ny.navn}.`);
  };

  // Eksporter vaktliste som profesjonell PDF
  const handleEksporterPdf = () => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(30, 27, 75);
      doc.rect(0, 0, 210, 36, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('EVENTYRSKOGEN BARNEHAGE', 15, 16);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(199, 210, 254);
      doc.text(`OFFISIELL VAKTLISTE & TURNUS – ${valgtDag.toUpperCase()}`, 15, 24);

      doc.setFontSize(8);
      doc.setTextColor(165, 180, 252);
      doc.text(`Utskriftsdato: ${new Date().toLocaleDateString('no-NO')}  |  Vaktplanansvarlig: Karoline Haug (Styrer)`, 15, 31);

      let y = 48;
      const vakterForDag = vakter.filter(v => (v.dag || 'Mandag') === valgtDag);

      BASER.forEach(baseNavn => {
        const basensVakter = vakterForDag.filter(v => v.base.toLowerCase() === baseNavn.toLowerCase());
        
        doc.setFillColor(241, 245, 249);
        doc.rect(15, y, 180, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(`${baseNavn.toUpperCase()} (${basensVakter.length} på vakt)`, 18, y + 5.5);
        y += 11;

        if (basensVakter.length === 0) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8.5);
          doc.setTextColor(100, 116, 139);
          doc.text('Ingen ansatte registrert på denne avdelingen.', 20, y);
          y += 8;
        } else {
          basensVakter.forEach(v => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(30, 41, 59);
            doc.text(`${v.navn} (${v.rolle || 'Ansatt'})`, 20, y);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(`Tid: ${v.tid}`, 100, y);
            doc.text(`Status: ${v.status}`, 145, y);
            y += 7;
          });
        }
        y += 5;
      });

      doc.save(`Vaktliste_Eventyrskogen_${valgtDag}.pdf`);
      visToast('Vaktliste lastet ned som PDF!');
    } catch (e) {
      console.error(e);
      visToast('Kunne ikke eksportere PDF');
    }
  };

  // Filtrering av vakter
  const filtrerteVakter = vakter.filter(v => {
    const vDag = v.dag || 'Mandag';
    const matcherDag = valgtDag === 'alle' || vDag === valgtDag;
    const matcherBase = filterBase === 'alle' || v.base.toLowerCase() === filterBase.toLowerCase();
    const matcherSok = sokeord === '' || 
      v.navn.toLowerCase().includes(sokeord.toLowerCase()) || 
      v.base.toLowerCase().includes(sokeord.toLowerCase()) ||
      v.tid.includes(sokeord);
    return matcherDag && matcherBase && matcherSok;
  });

  // Hjelpefunksjon: sjekk om en gitt vakt er en del av en dobbeltoppføring
  const erDuplikatVakt = (v: VaktItem) => {
    const vDag = v.dag || 'Mandag';
    const matcher = vakter.filter(other => 
      other.id !== v.id && 
      other.navn.trim().toLowerCase() === v.navn.trim().toLowerCase() && 
      (other.dag || 'Mandag') === vDag && 
      other.tid.trim() === v.tid.trim()
    );
    return matcher.length > 0;
  };

  return (
    <div className="space-y-6">
      
      {/* TOAST VARSEL */}
      {toastMelding && (
        <div className="fixed bottom-6 right-6 z-[200] bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-slate-700 animate-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMelding}</span>
        </div>
      )}

      {/* 1. TOPP: Tittel, handlinger og beskrivelse */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md">
              <CalendarRange size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
                <span>Vaktliste & Turnushåndtering</span>
              </h2>
              <p className="text-slate-500 text-sm mt-0.5">
                Styrerens verktøy for å planlegge vakter, kalle inn vikarer, løse kollisjoner og flytte personal.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setVisKiTurnusModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white rounded-xl text-sm font-bold transition shadow-md cursor-pointer hover:scale-[1.01]"
          >
            <Sparkles size={16} className="text-amber-300 animate-pulse" />
            <span>KI-Turnusgenerator</span>
          </button>

          <button
            onClick={() => setVisVikarModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold transition shadow-xs cursor-pointer"
          >
            <UserPlus size={16} />
            <span>Hent inn vikar</span>
          </button>

          <button
            onClick={() => setVisNyVaktModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>Opprett vakt</span>
          </button>

          <button
            onClick={handleEksporterPdf}
            className="flex items-center space-x-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-sm font-semibold transition cursor-pointer"
            title="Last ned vaktliste for oppslagstavle"
          >
            <Download size={16} />
            <span>Last ned PDF</span>
          </button>
        </div>
      </div>

      {/* 2. ADVARSEL FOR DOBBELTOPPFØRING (HVIS LARS PETTERSEN ELLER ANDRE ER SATT OPP FLERE GANGER) */}
      {harDuplikater && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h4 className="font-bold text-amber-950 text-base flex items-center space-x-2">
                  <span>Dobbeltoppføring oppdaget ({totaltDuplikater} overflødige vakter)</span>
                </h4>
                <p className="text-amber-800 text-sm mt-1 leading-relaxed">
                  Samme vikar eller ansatt er lagt inn flere ganger på nøyaktig samme tidspunkt! 
                  (F.eks. Lars Pettersen har overlappende vakt på Multemyra). 
                  Styrer kan enkelt rydde opp med ett klikk nedenfor.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {konfliktGrupper.map((g, idx) => (
                    <span key={idx} className="text-xs bg-amber-200/70 border border-amber-300 text-amber-900 px-2.5 py-1 rounded-lg font-bold">
                      {g[0].navn}: {g[0].tid} ({g.length} oppføringer på {g[0].dag || 'Mandag'})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleRensDobbeltoppforinger}
              className="shrink-0 flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition cursor-pointer"
            >
              <RefreshCw size={16} />
              <span>Slett dobbeltoppføringer nå</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. KONTROLLPANEL: Ukedag-velger, Visningsmodus og filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* UKEDAGER */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 lg:pb-0">
          {DAGER.map(dag => {
            const antall = vakter.filter(v => (v.dag || 'Mandag') === dag).length;
            const erAktiv = valgtDag === dag;
            return (
              <button
                key={dag}
                onClick={() => setValgtDag(dag)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer shrink-0 ${
                  erAktiv 
                    ? 'bg-[#1e1b4b] text-white shadow-md' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{dag}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${erAktiv ? 'bg-indigo-500/40 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {antall}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setValgtDag('alle')}
            className={`px-3.5 py-2 rounded-xl text-sm font-bold transition cursor-pointer shrink-0 ${
              valgtDag === 'alle'
                ? 'bg-[#1e1b4b] text-white shadow-md' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hele uken
          </button>
        </div>

        {/* VISNINGSMODUS (AVDELINGSVISNING VS LISTE) & FILTER */}
        <div className="flex flex-wrap items-center gap-3">
          {/* VISNINGSVEKSLER */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setHovedVisning('avdelinger')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                hovedVisning === 'avdelinger'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              <Building2 size={14} />
              <span>Avdelingsvisning</span>
            </button>
            <button
              type="button"
              onClick={() => setHovedVisning('liste')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                hovedVisning === 'liste'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              <List size={14} />
              <span>Liste & Tabell</span>
            </button>
          </div>

          {/* BASE-FILTER */}
          <div className="flex items-center space-x-2">
            <Filter size={15} className="text-slate-400" />
            <select
              value={filterBase}
              onChange={(e) => setFilterBase(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="alle">Alle avdelinger</option>
              {BASER.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <input
            type="text"
            value={sokeord}
            onChange={(e) => setSokeord(e.target.value)}
            placeholder="Søk i vakter..."
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32 sm:w-44"
          />
        </div>

      </div>

      {/* 4. HOVEDVISNING: ENTEN AVDELINGSVISNING ELLER LISTETABELL */}
      {hovedVisning === 'avdelinger' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 size={18} className="text-indigo-600" />
              <span className="font-bold text-slate-800 text-sm">
                Avdelinger og bemanning for {valgtDag === 'alle' ? 'hele uken' : valgtDag}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Viser {BASER.filter(b => filterBase === 'alle' || b.toLowerCase() === filterBase.toLowerCase()).length} avdelinger
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {BASER.filter(b => filterBase === 'alle' || b.toLowerCase() === filterBase.toLowerCase()).map(baseNavn => {
              const baseInfo = BASE_INFO[baseNavn] || {
                alder: 'Aldersblandet',
                farge: 'border-slate-200 bg-slate-50/40',
                ikonFarge: 'bg-slate-700 text-white',
                beskrivelse: 'Avdeling i Eventyrskogen',
                norm: 'Standard norm'
              };

              const basensVakter = filtrerteVakter.filter(v => v.base.toLowerCase() === baseNavn.toLowerCase());
              const tilStedeVakter = basensVakter.filter(v => v.status !== 'Sykemeldt' && v.status !== 'Avspasering');
              const harPedleder = basensVakter.some(v => v.rolle?.toLowerCase().includes('ped'));
              const harFagarbeider = basensVakter.some(v => v.rolle?.toLowerCase().includes('fagarbeider'));
              const harVikar = basensVakter.some(v => v.erVikar || v.status.includes('Vikar'));

              return (
                <div 
                  key={baseNavn} 
                  className={`rounded-2xl border-2 shadow-sm overflow-hidden bg-white flex flex-col transition-all hover:shadow-md ${baseInfo.farge}`}
                >
                  {/* AVDELINGS-HEADER */}
                  <div className="p-5 border-b border-slate-200/80 bg-white flex items-start justify-between">
                    <div className="flex items-center space-x-3.5">
                      <div className={`p-2.5 rounded-xl font-bold shadow-xs ${baseInfo.ikonFarge}`}>
                        <Building2 size={22} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-base text-slate-900">{baseNavn}</h3>
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {baseInfo.alder}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{baseInfo.beskrivelse}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-1">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                        tilStedeVakter.length >= 2 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {tilStedeVakter.length} på vakt
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {baseInfo.norm}
                      </span>
                    </div>
                  </div>

                  {/* VAKTLISTE FOR AVDELINGEN */}
                  <div className="p-5 flex-1 space-y-3">
                    {basensVakter.length === 0 ? (
                      <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                        Ingen vakter registrert på {baseNavn} {valgtDag === 'alle' ? 'denne uken' : `på ${valgtDag}`}.
                      </div>
                    ) : (
                      basensVakter.map((vakt) => {
                        const erDuplikat = erDuplikatVakt(vakt);
                        const erUbunden = vakt.merknad?.includes('Ubunden') || vakt.tid.includes('Ubunden') || vakt.merknad?.includes('4t');
                        const erFagarbPlantid = vakt.merknad?.includes('1t') || vakt.tid.includes('1t plantid');

                        return (
                          <div 
                            key={vakt.id}
                            className={`p-3.5 rounded-xl border transition-all flex items-center justify-between bg-white shadow-2xs ${
                              erDuplikat 
                                ? 'border-amber-400 bg-amber-50/60'
                                : vakt.status === 'Sykemeldt'
                                  ? 'border-rose-200 bg-rose-50/40'
                                  : vakt.erVikar || vakt.status.includes('Vikar')
                                    ? 'border-blue-200 bg-blue-50/30'
                                    : 'border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border shrink-0 ${
                                vakt.erVikar || vakt.status.includes('Vikar')
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : vakt.status === 'Sykemeldt'
                                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                                    : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                              }`}>
                                {vakt.navn.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center space-x-2 flex-wrap">
                                  <span className="font-bold text-xs text-slate-900 truncate">{vakt.navn}</span>
                                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                    {vakt.rolle || 'Ansatt'}
                                  </span>
                                  {vakt.erVikar && (
                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                      Vikar
                                    </span>
                                  )}
                                  {erDuplikat && (
                                    <span className="text-[9px] font-black uppercase text-white bg-rose-600 px-1.5 py-0.5 rounded">
                                      Duplikat
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1 flex-wrap">
                                  <span className="font-mono font-bold text-slate-800 flex items-center space-x-1">
                                    <Clock size={12} className="text-slate-400" />
                                    <span>{vakt.tid}</span>
                                  </span>
                                  {valgtDag === 'alle' && (
                                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                      {vakt.dag || 'Mandag'}
                                    </span>
                                  )}
                                  {vakt.merknad && (
                                    <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-medium truncate max-w-[180px]">
                                      {vakt.merknad}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* STATUS & HANDLINGER */}
                            <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                              <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                vakt.status === 'Sykemeldt' 
                                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                  : vakt.status.includes('Vikar')
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {vakt.status}
                              </span>

                              <button
                                onClick={() => setFlyttModalVakt(vakt)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                title="Flytt til en annen avdeling"
                              >
                                <ArrowRightLeft size={14} />
                              </button>

                              <button
                                onClick={() => setRedigererVakt(vakt)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                title="Rediger vakt"
                              >
                                <Edit2 size={14} />
                              </button>

                              <button
                                onClick={() => handleSlettVakt(vakt.id, vakt.navn)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Slett vakt"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* AVDELINGS-FOOTER MED BEMANNINGSDEKNING OG HURTIG-OPPRETT */}
                  <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3 text-xs text-slate-600">
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-[11px] font-semibold">Tidlig: {basensVakter.filter(v => v.tid.includes('07:')).length}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <span className="text-[11px] font-semibold">Mellom: {basensVakter.filter(v => v.tid.includes('08:')).length}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        <span className="text-[11px] font-semibold">Sein: {basensVakter.filter(v => v.tid.includes('09:')).length}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setVisNyVaktModal(true);
                      }}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
                    >
                      <Plus size={13} />
                      <span>Legg til vakt på {baseNavn}</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* LISTE- OG TABELLVISNING */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock size={18} className="text-indigo-600" />
              <span className="font-bold text-slate-800 text-sm">
                Vakter for {valgtDag === 'alle' ? 'hele uken' : valgtDag} ({filtrerteVakter.length} oppføringer)
              </span>
            </div>

            <div className="text-xs text-slate-500 flex items-center space-x-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Ordinær vakt
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Vikar
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Fravær / Sykemeldt
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 font-bold">Ansatt</th>
                  <th className="px-6 py-3.5 font-bold">Dag</th>
                  <th className="px-6 py-3.5 font-bold">Avdeling (Base)</th>
                  <th className="px-6 py-3.5 font-bold">Arbeidstid</th>
                  <th className="px-6 py-3.5 font-bold">Status</th>
                  <th className="px-6 py-3.5 font-bold text-right">Styrer-handlinger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrerteVakter.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      Ingen vakter funnet med valgte filtre. Klikk "Opprett vakt" for å legge til.
                    </td>
                  </tr>
                ) : (
                  filtrerteVakter.map((vakt) => {
                    const erDuplikat = erDuplikatVakt(vakt);

                    return (
                      <tr 
                        key={vakt.id} 
                        className={`transition-colors ${
                          erDuplikat 
                            ? 'bg-amber-50/70 hover:bg-amber-100/50' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* ANSATT */}
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border ${
                              vakt.erVikar || vakt.status.includes('Vikar')
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : vakt.status === 'Sykemeldt'
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                            }`}>
                              {vakt.navn.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-800">{vakt.navn}</span>
                                {erDuplikat && (
                                  <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                                    DUPLIKAT
                                  </span>
                                )}
                                {vakt.erVikar && (
                                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                    Vikar
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400">
                                {vakt.rolle || 'Ansatt'} {vakt.merknad ? `• ${vakt.merknad}` : ''}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* DAG */}
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg text-xs">
                            {vakt.dag || 'Mandag'}
                          </span>
                        </td>

                        {/* BASE (MED HURTIG-FLYTT) */}
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-800">{vakt.base}</span>
                            <button
                              onClick={() => setFlyttModalVakt(vakt)}
                              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="Flytt ansatt til en annen avdeling"
                            >
                              <ArrowRightLeft size={14} />
                            </button>
                          </div>
                        </td>

                        {/* ARBEIDSTID */}
                        <td className="px-6 py-4 font-mono text-slate-700 font-semibold text-xs">
                          {vakt.tid}
                        </td>

                        {/* STATUS */}
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-flex items-center space-x-1.5 ${
                            vakt.status === 'Sykemeldt' 
                              ? 'bg-rose-50 text-rose-700 border-rose-200' 
                              : vakt.status.includes('Vikar')
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {vakt.status === 'Sykemeldt' ? <UserX size={13} /> : <UserCheck size={13} />}
                            <span>{vakt.status}</span>
                          </span>
                        </td>

                        {/* HANDLINGER */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setRedigererVakt(vakt)}
                              className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                              title="Rediger arbeidstid eller status"
                            >
                              <Edit2 size={15} />
                            </button>

                            <button
                              onClick={() => handleSlettVakt(vakt.id, vakt.navn)}
                              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title={erDuplikat ? "Slett denne dobbeltoppføringen" : "Slett vakt"}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. MODAL: FLYTT ANSATT TIL ANNEN BASE */}
      {flyttModalVakt && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="text-indigo-600" size={20} />
                <h3 className="font-bold text-slate-800 text-lg">Flytt personell</h3>
              </div>
              <button onClick={() => setFlyttModalVakt(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              Hvor vil du flytte <strong>{flyttModalVakt.navn}</strong> ({flyttModalVakt.dag} kl {flyttModalVakt.tid})?
            </p>

            <div className="space-y-2">
              {BASER.map(base => (
                <button
                  key={base}
                  onClick={() => handleFlyttBase(flyttModalVakt.id, base)}
                  className={`w-full p-3 rounded-xl border text-left font-bold text-sm flex items-center justify-between transition cursor-pointer ${
                    flyttModalVakt.base === base 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900' 
                      : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <span>{base}</span>
                  {flyttModalVakt.base === base && (
                    <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded font-semibold">
                      Nåværende base
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setFlyttModalVakt(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: REDIGER VAKT */}
      {redigererVakt && (
        <RedigerVaktModal 
          vakt={redigererVakt} 
          onClose={() => setRedigererVakt(null)}
          onSave={handleLagreRedigertVakt}
        />
      )}

      {/* 7. MODAL: OPPRETT NY VAKT */}
      {visNyVaktModal && (
        <NyVaktModal 
          standardDag={valgtDag === 'alle' ? 'Mandag' : valgtDag}
          onClose={() => setVisNyVaktModal(false)}
          onSave={handleLeggTilNyVakt}
        />
      )}

      {/* 8. MODAL: HENT INN VIKAR */}
      {visVikarModal && (
        <HentVikarModal 
          standardDag={valgtDag === 'alle' ? 'Mandag' : valgtDag}
          onClose={() => setVisVikarModal(false)}
          eksisterendeVakter={vakter}
          onSave={handleLeggTilNyVakt}
        />
      )}

      {/* 9. MODAL: KI RULLERENDE TURNUSGENERATOR */}
      {visKiTurnusModal && (
        <KiTurnusModal 
          onClose={() => setVisKiTurnusModal(false)}
          onBrukTurnus={(nyeVakter) => {
            setVakter(nyeVakter);
            setVisKiTurnusModal(false);
            visToast('Ny rullerende KI-turnus er lagret og aktivert i vaktplanen!');
          }}
          onToast={visToast}
        />
      )}

    </div>
  );
};

// --- SUB-KOMPONENT: REDIGER VAKT MODAL ---
interface RedigerVaktModalProps {
  vakt: VaktItem;
  onClose: () => void;
  onSave: (vakt: VaktItem) => void;
}

const RedigerVaktModal: React.FC<RedigerVaktModalProps> = ({ vakt, onClose, onSave }) => {
  const [formData, setFormData] = useState<VaktItem>({ ...vakt });

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Edit2 className="text-indigo-600" size={20} />
            <h3 className="font-bold text-slate-800 text-lg">Endre vakt</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ansatt</label>
            <input 
              type="text" 
              value={formData.navn} 
              disabled
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none" 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ukedag</label>
              <select
                value={formData.dag || 'Mandag'}
                onChange={(e) => setFormData(prev => ({ ...prev, dag: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
              >
                {DAGER.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Avdeling (Base)</label>
              <select
                value={formData.base}
                onChange={(e) => setFormData(prev => ({ ...prev, base: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
              >
                {BASER.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Arbeidstid</label>
            <input 
              type="text" 
              value={formData.tid} 
              onChange={(e) => setFormData(prev => ({ ...prev, tid: e.target.value }))}
              placeholder="F.eks. 08:00 - 15:30"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none mb-2" 
            />
            {/* Standardvakter hurtigvalg */}
            <div className="flex flex-wrap gap-1.5">
              {STANDARD_VAKTER.map(sv => (
                <button
                  key={sv.tid}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tid: sv.tid }))}
                  className="text-[11px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 px-2 py-1 rounded font-medium transition cursor-pointer"
                >
                  {sv.tid}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
            >
              <option value="Til stede">Til stede (Aktiv)</option>
              <option value="Vikar (Til stede)">Vikar (Til stede)</option>
              <option value="Sykemeldt">Sykemeldt</option>
              <option value="Egenmelding">Egenmelding</option>
              <option value="Avspasering">Avspasering</option>
              <option value="Møte / Planlegging">Møte / Planlegging</option>
              <option value="Ferie">Ferie</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Merknad</label>
            <input 
              type="text" 
              value={formData.merknad || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, merknad: e.target.value }))}
              placeholder="F.eks. Dekker for sykdom, må gå 14:00"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition cursor-pointer"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={() => onSave(formData)}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-sm cursor-pointer"
          >
            Lagre endringer
          </button>
        </div>

      </div>
    </div>
  );
};

// --- SUB-KOMPONENT: NY VAKT MODAL ---
interface NyVaktModalProps {
  standardDag: string;
  onClose: () => void;
  onSave: (vakt: Omit<VaktItem, 'id'>) => void;
}

const NyVaktModal: React.FC<NyVaktModalProps> = ({ standardDag, onClose, onSave }) => {
  const [navn, setNavn] = useState('');
  const [rolle, setRolle] = useState('Pedagogisk leder');
  const [base, setBase] = useState('Trollstua');
  const [dag, setDag] = useState(standardDag || 'Mandag');
  const [tid, setTid] = useState('08:00 - 15:30');
  const [status, setStatus] = useState('Til stede');
  const [merknad, setMerknad] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!navn.trim()) return;

    onSave({
      navn: navn.trim(),
      rolle,
      base,
      dag,
      tid,
      status,
      farge: status === 'Sykemeldt' ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200',
      merknad
    });
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Plus className="text-indigo-600" size={20} />
            <h3 className="font-bold text-slate-800 text-lg">Opprett vakt</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Fullt navn på ansatt</label>
            <input 
              type="text" 
              value={navn} 
              onChange={(e) => setNavn(e.target.value)}
              placeholder="F.eks. Kari Nordmann"
              required
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Rolle</label>
              <select
                value={rolle}
                onChange={(e) => setRolle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
              >
                <option value="Ped.leder">Ped.leder</option>
                <option value="Fagarbeider">Fagarbeider</option>
                <option value="Assistent">Assistent</option>
                <option value="Vikar">Vikar</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ukedag</label>
              <select
                value={dag}
                onChange={(e) => setDag(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
              >
                {DAGER.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Avdeling (Base)</label>
              <select
                value={base}
                onChange={(e) => setBase(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
              >
                {BASER.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
              >
                <option value="Til stede">Til stede</option>
                <option value="Vikar (Til stede)">Vikar</option>
                <option value="Sykemeldt">Sykemeldt</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Arbeidstid</label>
            <input 
              type="text" 
              value={tid} 
              onChange={(e) => setTid(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none mb-1.5" 
            />
            <div className="flex flex-wrap gap-1">
              {STANDARD_VAKTER.map(sv => (
                <button
                  key={sv.tid}
                  type="button"
                  onClick={() => setTid(sv.tid)}
                  className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 px-2 py-0.5 rounded font-medium transition cursor-pointer"
                >
                  {sv.tid}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Merknad (valgfritt)</label>
            <input 
              type="text" 
              value={merknad} 
              onChange={(e) => setMerknad(e.target.value)}
              placeholder="F.eks. Dekker for sykdom"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-sm cursor-pointer"
            >
              Opprett vakt
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

// --- SUB-KOMPONENT: HENT INN VIKAR MED DOBBELTOPPFØRINGSSJEKK ---
interface HentVikarModalProps {
  standardDag: string;
  onClose: () => void;
  eksisterendeVakter: VaktItem[];
  onSave: (vakt: Omit<VaktItem, 'id'>) => void;
}

const HentVikarModal: React.FC<HentVikarModalProps> = ({ 
  standardDag, 
  onClose, 
  eksisterendeVakter,
  onSave 
}) => {
  // Liste over registrerte vikarer
  const vikarKandidater = [
    { navn: 'Lars Pettersen', status: 'Klar for vakt (Rammeavtale)', godkjent: true },
    { navn: 'Jonas Lie', status: 'Klar for vakt (Tilkallingsvikar)', godkjent: true },
    { navn: 'Sara Amundsen', status: 'Klar for vakt (Studentvikar)', godkjent: true },
    { navn: 'Eirik Tveit', status: 'Mangler politiattest', godkjent: false }
  ];

  const [valgtVikarNavn, setValgtVikarNavn] = useState('Lars Pettersen');
  const [egendefinertNavn, setEgendefinertNavn] = useState('');
  const [base, setBase] = useState('Multemyra');
  const [dag, setDag] = useState(standardDag || 'Mandag');
  const [tid, setTid] = useState('08:30 - 16:00');
  const [merknad, setMerknad] = useState('Vikar innleid av Styrer');

  const aktivtNavn = valgtVikarNavn === 'egendefinert' ? egendefinertNavn : valgtVikarNavn;

  // Sjekk om denne vikaren allerede har en vakt denne dagen
  const eksisterendeVaktForVikar = eksisterendeVakter.find(
    v => v.navn.toLowerCase() === aktivtNavn.toLowerCase() && v.dag === dag
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aktivtNavn.trim()) return;

    if (eksisterendeVaktForVikar) {
      if (!confirm(`⚠️ VIKTIG: ${aktivtNavn} er ALLEREDE satt opp på vakt på ${eksisterendeVaktForVikar.base} kl ${eksisterendeVaktForVikar.tid} på ${dag}!\n\nVil du virkelig legge til en ny vakt? Dette skaper en dobbeltoppføring.`)) {
        return;
      }
    }

    onSave({
      navn: aktivtNavn.trim(),
      rolle: 'Vikar',
      base,
      dag,
      tid,
      status: 'Vikar (Til stede)',
      farge: 'text-blue-700 bg-blue-50 border-blue-200',
      erVikar: true,
      merknad
    });
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <UserPlus className="text-blue-600" size={20} />
            <h3 className="font-bold text-slate-800 text-lg">Hent inn vikar</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Velg vikar fra personalregisteret</label>
            <select
              value={valgtVikarNavn}
              onChange={(e) => setValgtVikarNavn(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
            >
              {vikarKandidater.map(v => (
                <option key={v.navn} value={v.navn}>
                  {v.navn} ({v.status})
                </option>
              ))}
              <option value="egendefinert">+ Legg til annet vikarnavn...</option>
            </select>
          </div>

          {valgtVikarNavn === 'egendefinert' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Navn på vikar</label>
              <input 
                type="text" 
                value={egendefinertNavn} 
                onChange={(e) => setEgendefinertNavn(e.target.value)}
                placeholder="F.eks. Trine Olsen"
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" 
              />
            </div>
          )}

          {/* KONFLIKTVARSEL HVIS VIKAREN ALLEREDE JOBBER */}
          {eksisterendeVaktForVikar && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-start space-x-2">
              <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Advarsel om dobbeltoppføring:</span>
                <span>{aktivtNavn} er allerede satt opp på <strong>{eksisterendeVaktForVikar.base}</strong> ({eksisterendeVaktForVikar.tid}).</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ukedag</label>
              <select
                value={dag}
                onChange={(e) => setDag(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
              >
                {DAGER.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Avdeling som trenger vikar</label>
              <select
                value={base}
                onChange={(e) => setBase(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
              >
                {BASER.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Arbeidstid</label>
            <input 
              type="text" 
              value={tid} 
              onChange={(e) => setTid(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none mb-1.5" 
            />
            <div className="flex flex-wrap gap-1">
              {STANDARD_VAKTER.map(sv => (
                <button
                  key={sv.tid}
                  type="button"
                  onClick={() => setTid(sv.tid)}
                  className="text-[10px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-2 py-0.5 rounded font-medium transition cursor-pointer"
                >
                  {sv.tid}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Merknad</label>
            <input 
              type="text" 
              value={merknad} 
              onChange={(e) => setMerknad(e.target.value)}
              placeholder="F.eks. Dekker for sykdom"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm cursor-pointer"
            >
              Bekreft vikartildeling
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

// --- SUB-KOMPONENT: KI RULLERENDE TURNUSGENERATOR ---
interface KiTurnusModalProps {
  onClose: () => void;
  onBrukTurnus: (nyeVakter: VaktItem[]) => void;
  onToast?: (msg: string) => void;
}

interface TurnusUkePlan {
  ukeNr: number;
  tittel: string;
  vakter: VaktItem[];
}

const VIKAR_LISTE = [
  { navn: 'Lars Pettersen', rolle: 'Vikar (Rammeavtale)', status: 'Klar for vakt' },
  { navn: 'Jonas Lie', rolle: 'Tilkallingsvikar', status: 'Klar for vakt' },
  { navn: 'Sara Amundsen', rolle: 'Studentvikar', status: 'Klar for vakt' },
  { navn: 'Eirik Tveit', rolle: 'Vikar', status: 'Tilgjengelig' }
];

const KiTurnusModal: React.FC<KiTurnusModalProps> = ({ onClose, onBrukTurnus, onToast }) => {
  // Innstillinger for KI-generering
  const [rotasjonsUker, setRotasjonsUker] = useState<number>(4);
  const [apningstidStart, setApningstidStart] = useState<string>('07:00');
  const [apningstidSlutt, setApningstidSlutt] = useState<string>('17:00');
  const [inkluderPlanleggingstid, setInkluderPlanleggingstid] = useState<boolean>(true); // 4t for pedledere & barnehagelærere
  const [inkluderPlantidFagarbeider, setInkluderPlantidFagarbeider] = useState<boolean>(true); // 1t for fagarbeidere
  const [taHensynTilSykdom, setTaHensynTilSykdom] = useState<boolean>(true); // Erstatt Fatima med valgt vikar
  const [valgtVikar, setValgtVikar] = useState<string>('Lars Pettersen');
  const [markerHelligdager, setMarkerHelligdager] = useState<boolean>(true);
  const [visningsModus, setVisningsModus] = useState<'avdelinger' | 'tabell' | 'samkjoring'>('avdelinger');
  
  const [genererer, setGenererer] = useState<boolean>(false);
  const [aktivUkeFane, setAktivUkeFane] = useState<number>(1);
  const [genererteUker, setGenererteUker] = useState<TurnusUkePlan[]>([]);
  
  // Redigering av et valgt skift i turnusen
  const [redigererSkift, setRedigererSkift] = useState<{
    ukeNr: number;
    vakt: VaktItem;
  } | null>(null);

  // Algoritme for generering av rullerende turnus basert på ansatte, åpningstider og stillingsprosent
  const genererTurnus = (antallUker: number) => {
    setGenererer(true);

    setTimeout(() => {
      const ukePlaner: TurnusUkePlan[] = [];

      // Mal for vaktrotasjoner per base (Åpning, Tidlig mellom, Sen mellom, Stenging)
      const skiftTrollstua = [
        { v1: '07:00 - 14:30', v2: '08:30 - 16:00' }, // Uke 1: Ingrid tidlig, Morten sen
        { v1: '08:00 - 15:30', v2: '07:30 - 15:00' }, // Uke 2: Ingrid mellom, Morten tidlig
        { v1: '09:00 - 16:30', v2: '08:00 - 15:30' }, // Uke 3: Ingrid sen, Morten mellom
        { v1: '07:30 - 15:00', v2: '09:30 - 17:00' }, // Uke 4: Ingrid tidlig, Morten stenge
        { v1: '08:30 - 16:00', v2: '07:00 - 14:30' }, // Uke 5
        { v1: '07:00 - 14:30', v2: '08:30 - 16:00' }, // Uke 6
        { v1: '08:00 - 15:30', v2: '07:30 - 15:00' }, // Uke 7
        { v1: '09:30 - 17:00', v2: '08:00 - 15:30' }, // Uke 8
      ];

      const skiftMultemyra = [
        '08:00 - 15:30',
        '07:00 - 14:30',
        '09:30 - 17:00',
        '08:30 - 16:00',
        '07:30 - 15:00',
        '08:00 - 15:30',
        '09:00 - 16:30',
        '08:30 - 16:00',
      ];

      const skiftKlatremus = [
        '08:30 - 16:00',
        '09:30 - 17:00',
        '07:00 - 14:30',
        '08:00 - 15:30',
        '09:00 - 16:30',
        '07:30 - 15:00',
        '08:00 - 15:30',
        '09:30 - 17:00',
      ];

      const skiftBjornehiet = [
        { v1: '07:30 - 15:00', v2: '08:30 - 16:00' },
        { v1: '09:30 - 17:00', v2: '08:00 - 15:30' },
        { v1: '08:00 - 15:30', v2: '07:00 - 14:30' },
        { v1: '08:30 - 16:00', v2: '09:00 - 16:30' },
        { v1: '07:00 - 14:30', v2: '08:00 - 15:30' },
        { v1: '08:30 - 16:00', v2: '07:30 - 15:00' },
        { v1: '09:00 - 16:30', v2: '08:30 - 16:00' },
        { v1: '08:00 - 15:30', v2: '09:30 - 17:00' },
      ];

      let vaktIdCounter = 1000;

      for (let u = 0; u < antallUker; u++) {
        const ukeNummer = u + 1;
        const ukeVakter: VaktItem[] = [];

        DAGER.forEach((dag) => {
          // Trollstua
          const tsSkift = skiftTrollstua[u % skiftTrollstua.length];
          // Ingrid Solheim (Ped.leder / Barnehagelærer: 4t ubunden tid på onsdager)
          ukeVakter.push({
            id: ++vaktIdCounter,
            navn: 'Ingrid Solheim',
            rolle: 'Ped.leder',
            base: 'Trollstua',
            dag,
            tid: (dag === 'Onsdag' && inkluderPlanleggingstid) ? '08:00 - 12:00 (12-16 Ubunden tid)' : tsSkift.v1,
            status: 'Til stede',
            farge: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            merknad: dag === 'Onsdag' && inkluderPlanleggingstid ? '4t lovpålagt ubunden plantid' : undefined
          });

          ukeVakter.push({
            id: ++vaktIdCounter,
            navn: 'Morten Hansen',
            rolle: 'Assistent',
            base: 'Trollstua',
            dag,
            tid: tsSkift.v2,
            status: 'Til stede',
            farge: 'text-emerald-700 bg-emerald-50 border-emerald-200'
          });

          // Multemyra (Fatima er fagarbeider/sykmeldt -> Dekkes av valgt vikar)
          const mmTid = skiftMultemyra[u % skiftMultemyra.length];
          if (taHensynTilSykdom) {
            ukeVakter.push({
              id: ++vaktIdCounter,
              navn: valgtVikar,
              rolle: 'Vikar',
              base: 'Multemyra',
              dag,
              tid: (dag === 'Torsdag' && inkluderPlantidFagarbeider) ? '08:30 - 15:30 (1t plantid)' : mmTid,
              status: 'Vikar (Til stede)',
              farge: 'text-blue-700 bg-blue-50 border-blue-200',
              erVikar: true,
              merknad: dag === 'Torsdag' && inkluderPlantidFagarbeider 
                ? `Dekker for Fatima Al-Zahra (1t didaktisk plantid)` 
                : 'Dekker for Fatima Al-Zahra (Sykmeldt)'
            });
          } else {
            ukeVakter.push({
              id: ++vaktIdCounter,
              navn: 'Fatima Al-Zahra',
              rolle: 'Fagarbeider',
              base: 'Multemyra',
              dag,
              tid: (dag === 'Torsdag' && inkluderPlantidFagarbeider) ? '08:30 - 15:30 (1t plantid)' : mmTid,
              status: 'Til stede',
              farge: 'text-emerald-700 bg-emerald-50 border-emerald-200',
              merknad: dag === 'Torsdag' && inkluderPlantidFagarbeider ? '1t ukentlig plantid for fagarbeider' : undefined
            });
          }

          // Klatremus
          const klTid = skiftKlatremus[u % skiftKlatremus.length];
          ukeVakter.push({
            id: ++vaktIdCounter,
            navn: 'Camilla Vik',
            rolle: 'Assistent',
            base: 'Klatremus',
            dag,
            tid: klTid,
            status: 'Til stede',
            farge: 'text-emerald-700 bg-emerald-50 border-emerald-200'
          });

          // Bjørnehiet (Henrik Berg 100% Ped.leder: 4t plantid torsdager, Sara Moe 80% Fagarbeider: 1t plantid tirsdager + Fri fredager)
          const bhSkift = skiftBjornehiet[u % skiftBjornehiet.length];
          ukeVakter.push({
            id: ++vaktIdCounter,
            navn: 'Henrik Berg',
            rolle: 'Ped.leder',
            base: 'Bjørnehiet',
            dag,
            tid: (dag === 'Torsdag' && inkluderPlanleggingstid) ? '08:00 - 12:00 (12-16 Ubunden tid)' : bhSkift.v1,
            status: 'Til stede',
            farge: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            merknad: dag === 'Torsdag' && inkluderPlanleggingstid ? '4t lovpålagt ubunden plantid' : undefined
          });

          if (dag !== 'Fredag') {
            const erTirsdagPlantid = dag === 'Tirsdag' && inkluderPlantidFagarbeider;
            ukeVakter.push({
              id: ++vaktIdCounter,
              navn: 'Sara Moe',
              rolle: 'Fagarbeider',
              base: 'Bjørnehiet',
              dag,
              tid: erTirsdagPlantid ? '08:30 - 15:30 (1t plantid)' : bhSkift.v2,
              status: 'Til stede',
              farge: 'text-emerald-700 bg-emerald-50 border-emerald-200',
              merknad: erTirsdagPlantid 
                ? '1t didaktisk plantid for fagarbeider (80% stilling)' 
                : '80% stilling (Mandag - Torsdag)'
            });
          } else {
            ukeVakter.push({
              id: ++vaktIdCounter,
              navn: 'Sara Moe',
              rolle: 'Fagarbeider',
              base: 'Bjørnehiet',
              dag,
              tid: 'Avspasering / Fri',
              status: 'Avspasering',
              farge: 'text-slate-500 bg-slate-100 border-slate-200',
              merknad: 'Fast ukentlig fridag (80% stilling)'
            });
          }
        });

        ukePlaner.push({
          ukeNr: ukeNummer,
          tittel: `Uke ${ukeNummer} i turnusen`,
          vakter: ukeVakter
        });
      }

      setGenererteUker(ukePlaner);
      setAktivUkeFane(1);
      setGenererer(false);
      if (onToast) onToast(`KI genererte et rullerende ${antallUker}-ukers turnusforslag med plantid og vikarvalg!`);
    }, 500);
  };

  // Generer standard ved lasting
  useEffect(() => {
    genererTurnus(rotasjonsUker);
  }, []);

  // Oppdater et bestemt skift i turnusen etter manuell redigering
  const handleOppdaterSkift = (oppdatertVakt: VaktItem, oppdaterAlleUker: boolean) => {
    if (!redigererSkift) return;

    setGenererteUker(prev => prev.map(uPlan => {
      if (oppdaterAlleUker || uPlan.ukeNr === redigererSkift.ukeNr) {
        return {
          ...uPlan,
          vakter: uPlan.vakter.map(v => {
            if (oppdaterAlleUker) {
              if (v.navn === redigererSkift.vakt.navn && v.dag === redigererSkift.vakt.dag) {
                return { ...v, tid: oppdatertVakt.tid, merknad: oppdatertVakt.merknad, status: oppdatertVakt.status, base: oppdatertVakt.base };
              }
            } else if (v.id === oppdatertVakt.id) {
              return oppdatertVakt;
            }
            return v;
          })
        };
      }
      return uPlan;
    }));

    setRedigererSkift(null);
    if (onToast) onToast(`Vakten for ${oppdatertVakt.navn} ble oppdatert!`);
  };

  // Eksporter hele turnusplanen som PDF
  const handleEksporterTurnusPdf = () => {
    try {
      const doc = new jsPDF('landscape');
      
      // Tittelstripe
      doc.setFillColor(30, 27, 75);
      doc.rect(0, 0, 297, 26, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(`RULLERENDE TURNUSPLAN (${rotasjonsUker} UKERS ROTASJON) – EVENTYRSKOGEN BARNEHAGE`, 15, 12);
      
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(199, 210, 254);
      doc.text(`Åpningstider: ${apningstidStart} – ${apningstidSlutt}  |  Pedledere: 4t ubunden tid  |  Fagarbeidere: 1t plantid  |  Generert: ${new Date().toLocaleDateString('no-NO')}`, 15, 19);

      let y = 35;

      genererteUker.forEach((uPlan, idx) => {
        if (idx > 0 && y > 160) {
          doc.addPage('landscape');
          y = 20;
        }

        doc.setFillColor(241, 245, 249);
        doc.rect(15, y, 267, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(`ROTASJONSMAL: UKE ${uPlan.ukeNr}`, 18, y + 5.5);
        y += 12;

        BASER.forEach(base => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(79, 70, 229);
          doc.text(`Avdeling ${base}:`, 18, y);
          y += 5;

          const basensVakter = uPlan.vakter.filter(v => v.base === base && (v.dag === 'Mandag' || v.dag === 'Onsdag'));
          basensVakter.forEach(v => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(51, 65, 85);
            doc.text(`• ${v.navn} (${v.rolle}): ${v.tid} [${v.status}] ${v.merknad ? '– ' + v.merknad : ''}`, 24, y);
            y += 4.5;
          });
        });

        y += 6;
      });

      doc.save(`Rullerende_Turnus_${rotasjonsUker}Uker_Eventyrskogen.pdf`);
      if (onToast) onToast('Komplett turnus lastet ned som PDF!');
    } catch (e) {
      console.error(e);
    }
  };

  const aktivUkePlan = genererteUker.find(u => u.ukeNr === aktivUkeFane) || genererteUker[0];

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[94vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-[#1e1b4b] via-indigo-950 to-purple-950 text-white p-6 flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-indigo-600/60 rounded-2xl border border-indigo-400/40">
              <Sparkles size={26} className="text-yellow-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold">KI-Turnusgenerator for Barnehager</h3>
                <span className="bg-purple-500/30 text-purple-200 border border-purple-400/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  Rullerende Vaktplan
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-1">
                Beregner åpningstider, 4t pedledernorm, 1t fagarbeiderplantid, vikarvalg og samkjøring med dagsplan.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer">
            <X size={22} />
          </button>
        </div>

        {/* INNSTILLINGSPANEL */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* ROTASJONSLENGDE */}
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-700">Rotasjonslengde:</label>
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                {[2, 3, 4, 6, 8].map(uker => (
                  <button
                    key={uker}
                    type="button"
                    onClick={() => {
                      setRotasjonsUker(uker);
                      genererTurnus(uker);
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      rotasjonsUker === uker 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'
                    }`}
                  >
                    {uker} uker
                  </button>
                ))}
              </div>
            </div>

            {/* ÅPNINGSTIDER */}
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-700">Barnehagens åpningstid:</label>
              <div className="flex items-center space-x-1">
                <input 
                  type="text" 
                  value={apningstidStart} 
                  onChange={(e) => setApningstidStart(e.target.value)}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-center outline-none"
                />
                <span className="text-xs text-slate-400">–</span>
                <input 
                  type="text" 
                  value={apningstidSlutt} 
                  onChange={(e) => setApningstidSlutt(e.target.value)}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-center outline-none"
                />
              </div>
            </div>

            {/* REGENERER KNAPP */}
            <button
              type="button"
              onClick={() => genererTurnus(rotasjonsUker)}
              disabled={genererer}
              className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <RefreshCw size={14} className={genererer ? 'animate-spin' : ''} />
              <span>{genererer ? 'Beregner...' : 'Regenerer turnus'}</span>
            </button>
          </div>

          {/* PARAMETRE FOR HENSYN OG PLANTID */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-200/70 items-center">
            
            <div className="sm:col-span-7 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-700">
              <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <input 
                  type="checkbox" 
                  checked={inkluderPlanleggingstid} 
                  onChange={(e) => setInkluderPlanleggingstid(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold">4t ubunden tid (Pedledere/lærere)</span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <input 
                  type="checkbox" 
                  checked={inkluderPlantidFagarbeider} 
                  onChange={(e) => setInkluderPlantidFagarbeider(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span className="font-semibold">1t plantid (Fagarbeidere)</span>
              </label>
            </div>

            {/* RULLEGARDIN FOR VALG AV VIKAR */}
            <div className="sm:col-span-5 flex items-center justify-end space-x-2">
              <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                <input 
                  type="checkbox" 
                  checked={taHensynTilSykdom} 
                  onChange={(e) => setTaHensynTilSykdom(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Fast vikar:</span>
              </label>

              <select
                disabled={!taHensynTilSykdom}
                value={valgtVikar}
                onChange={(e) => {
                  setValgtVikar(e.target.value);
                  setTimeout(() => genererTurnus(rotasjonsUker), 100);
                }}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:bg-slate-100 cursor-pointer shadow-2xs"
              >
                {VIKAR_LISTE.map(v => (
                  <option key={v.navn} value={v.navn}>
                    {v.navn} ({v.rolle})
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* VISNINGSMODUS OG UKE-FANER */}
        <div className="border-b border-slate-200 bg-white px-6 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center space-x-3 py-2.5">
            {/* Veksle mellom avdelingsvisning, tabell og dagsplansamkjøring */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setVisningsModus('avdelinger')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                  visningsModus === 'avdelinger' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 size={14} />
                <span>Avdelingsvisning</span>
              </button>
              <button
                type="button"
                onClick={() => setVisningsModus('tabell')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                  visningsModus === 'tabell' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar size={14} />
                <span>Rullerende Tabell</span>
              </button>
              <button
                type="button"
                onClick={() => setVisningsModus('samkjoring')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                  visningsModus === 'samkjoring' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock size={14} />
                <span>Samkjøring med Dagsplan</span>
              </button>
            </div>

            {/* Ukevalg */}
            <div className="flex space-x-1.5 pl-2 border-l border-slate-200">
              {genererteUker.map((uPlan) => (
                <button
                  key={uPlan.ukeNr}
                  type="button"
                  onClick={() => setAktivUkeFane(uPlan.ukeNr)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                    aktivUkeFane === uPlan.ukeNr
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>Uke {uPlan.ukeNr}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl shrink-0">
            <CheckCircle2 size={15} />
            <span>Normdekning: 100% full dekning</span>
          </div>
        </div>

        {/* HOVEDINNHOLD */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {genererer ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw size={32} className="animate-spin mx-auto text-indigo-600" />
              <p className="text-sm font-bold text-slate-700">Styrer AI optimaliserer vaktrotasjonen...</p>
              <p className="text-xs text-slate-400">Beregner 4t ubunden tid for pedledere, 1t plantid for fagarbeidere og vikarvalg.</p>
            </div>
          ) : aktivUkePlan ? (
            <div className="space-y-4">
              
              {/* STATISTIKK-KORT */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <span className="text-[11px] text-indigo-700 font-bold block">Rotasjonsperiode</span>
                  <span className="text-lg font-black text-indigo-950">{rotasjonsUker} uker rullerende</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[11px] text-emerald-700 font-bold block">Plantid-fordeling</span>
                  <span className="text-sm font-black text-emerald-950 block mt-0.5">4t Pedledere • 1t Fagarbeidere</span>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-[11px] text-blue-700 font-bold block">Vikarfordeling</span>
                  <span className="text-sm font-black text-blue-950 block mt-0.5">{valgtVikar} på Multemyra</span>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <span className="text-[11px] text-purple-700 font-bold block">Deltidsstillinger</span>
                  <span className="text-sm font-black text-purple-950 block mt-0.5">Sara Moe (80% / 4 dager)</span>
                </div>
              </div>

              {/* MODUS 0: AVDELINGSVISNING FOR VALGT UKE */}
              {visningsModus === 'avdelinger' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Building2 size={14} className="text-indigo-600" />
                      Avdelingsvisning for Uke {aktivUkeFane} i turnusen – fordelt med 4t plantid for pedledere og 1t plantid for fagarbeidere.
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">Klikk på et skift for å redigere</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {BASER.map(baseNavn => {
                      const baseVakter = aktivUkePlan.vakter.filter(v => v.base.toLowerCase() === baseNavn.toLowerCase());
                      const ansattePaBase = Array.from(new Set(baseVakter.map(v => v.navn)));

                      return (
                        <div key={baseNavn} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center space-x-2.5">
                              <div className="p-2 bg-indigo-600 text-white rounded-xl">
                                <Building2 size={16} />
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-slate-900">{baseNavn}</h4>
                                <span className="text-[11px] text-slate-500">{ansattePaBase.length} ansatte tildelt</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                              ✓ 100% Dekning
                            </span>
                          </div>

                          <div className="p-4 space-y-3 flex-1">
                            {ansattePaBase.map(navn => {
                              const ansattVakter = baseVakter.filter(v => v.navn === navn);
                              const forsteVakt = ansattVakter[0];

                              return (
                                <div key={navn} className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-bold text-xs text-slate-900">{navn}</span>
                                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                        {forsteVakt?.rolle || 'Ansatt'}
                                      </span>
                                      {forsteVakt?.erVikar && (
                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                          Vikar
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-5 gap-1.5">
                                    {DAGER.map(dag => {
                                      const vakt = ansattVakter.find(v => v.dag === dag);
                                      if (!vakt) return <div key={dag} className="text-center text-[10px] text-slate-300">-</div>;

                                      const erAvspasering = vakt.status === 'Avspasering';
                                      const erUbunden = vakt.merknad?.includes('Ubunden') || vakt.tid.includes('Ubunden') || vakt.merknad?.includes('4t');
                                      const erFagarbPlantid = vakt.merknad?.includes('1t') || vakt.tid.includes('1t plantid');

                                      return (
                                        <button
                                          key={dag}
                                          type="button"
                                          onClick={() => setRedigererSkift({ ukeNr: aktivUkePlan.ukeNr, vakt })}
                                          className={`p-1.5 rounded-lg border text-left transition-all hover:scale-[1.03] cursor-pointer ${
                                            erAvspasering
                                              ? 'bg-slate-100 border-slate-200 text-slate-400'
                                              : erUbunden
                                                ? 'bg-purple-100/70 border-purple-300 text-purple-900'
                                                : erFagarbPlantid
                                                  ? 'bg-amber-100/70 border-amber-300 text-amber-900'
                                                  : vakt.erVikar
                                                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                                                    : 'bg-white border-slate-200 text-slate-800'
                                          }`}
                                          title={`Klikk for å redigere ${vakt.navn} på ${dag}`}
                                        >
                                          <span className="block text-[9px] font-bold text-slate-400 uppercase">{dag.slice(0, 3)}</span>
                                          <span className="block font-mono text-[10px] font-bold leading-tight truncate">{vakt.tid.split(' ')[0]}</span>
                                          {erUbunden && (
                                            <span className="block text-[8px] font-bold text-purple-700 mt-0.5">4t plan</span>
                                          )}
                                          {erFagarbPlantid && (
                                            <span className="block text-[8px] font-bold text-amber-700 mt-0.5">1t plan</span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MODUS 1: TABELLVISNING MED KLIKKBAR REDIGERING */}
              {visningsModus === 'tabell' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Edit2 size={13} className="text-indigo-600" />
                      Tips: Klikk på en hvilken som helst vakt under for å endre klokkeslett, plantid eller legge til preferanser.
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">Uke {aktivUkeFane} av {rotasjonsUker}</span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="px-4 py-3">Ansatt & Rolle</th>
                          <th className="px-4 py-3">Base</th>
                          <th className="px-4 py-3">Mandag</th>
                          <th className="px-4 py-3">Tirsdag</th>
                          <th className="px-4 py-3">Onsdag</th>
                          <th className="px-4 py-3">Torsdag</th>
                          <th className="px-4 py-3">Fredag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Array.from(new Set(aktivUkePlan.vakter.map(v => v.navn))).map(navn => {
                          const ansattVakter = aktivUkePlan.vakter.filter(v => v.navn === navn);
                          const forsteVakt = ansattVakter[0];

                          return (
                            <tr key={navn} className="hover:bg-slate-50/70 transition">
                              <td className="px-4 py-3 font-bold text-slate-800">
                                <div className="flex items-center space-x-2">
                                  <span>{navn}</span>
                                  {forsteVakt.erVikar && (
                                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                                      Vikar
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">{forsteVakt.rolle}</span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-600">{forsteVakt.base}</td>

                              {DAGER.map(dag => {
                                const vakt = ansattVakter.find(v => v.dag === dag);
                                if (!vakt) return <td key={dag} className="px-4 py-3 text-slate-400">-</td>;

                                const erAvspasering = vakt.status === 'Avspasering';
                                const erUbunden = vakt.merknad?.includes('Ubunden') || vakt.tid.includes('Ubunden') || vakt.merknad?.includes('4t');
                                const erFagarbPlantid = vakt.merknad?.includes('1t') || vakt.tid.includes('1t plantid');

                                return (
                                  <td key={dag} className="px-4 py-3">
                                    <button
                                      type="button"
                                      onClick={() => setRedigererSkift({ ukeNr: aktivUkePlan.ukeNr, vakt })}
                                      className={`w-full text-left p-2 rounded-xl border transition-all hover:scale-[1.02] hover:shadow-xs cursor-pointer group ${
                                        erAvspasering 
                                          ? 'bg-slate-100 border-slate-200 text-slate-500' 
                                          : erUbunden 
                                            ? 'bg-purple-50 border-purple-200 text-purple-900 font-bold hover:border-purple-400'
                                            : erFagarbPlantid
                                              ? 'bg-amber-50 border-amber-200 text-amber-900 font-bold hover:border-amber-400'
                                              : vakt.erVikar 
                                                ? 'bg-blue-50 border-blue-200 text-blue-900 font-bold hover:border-blue-400' 
                                                : 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold hover:border-emerald-400'
                                      }`}
                                      title="Klikk for å redigere denne vakten eller legge inn egne preferanser"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono text-[11px]">{vakt.tid}</span>
                                        <Edit2 size={11} className="opacity-0 group-hover:opacity-100 text-slate-400 transition" />
                                      </div>
                                      {vakt.merknad && (
                                        <span className="block text-[9px] font-sans font-normal opacity-85 mt-0.5 leading-tight">
                                          {vakt.merknad}
                                        </span>
                                      )}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODUS 2: AKTIVITETSSAMKJØRING & BEVEGELIGHET I DAGEN */}
              {visningsModus === 'samkjoring' && (
                <div className="space-y-4">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-indigo-600 text-white rounded-xl">
                        <Clock size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Samkjøring av vakter mot dagsplan & aktiviteter</h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Turnusforslaget sikrer 100% voksentetthet under kjerneaktiviteter, turer og måltid.
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200">
                      ✓ Balansert bemanningskurve
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    
                    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800">07:00 – 08:30: Åpning & Frokost</span>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">Tidligvakter</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        1 åpner per base (Ingrid på Trollstua, vikar på Multemyra, Camilla på Klatremus). Rolig mottak og frokostbord.
                      </p>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800">08:30 – 09:30: Mottak & Morgensamling</span>
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Full bemanning</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Mellomvakter ankommer. Bemanningsradar registrerer 100% tilstedeværelse for garderoberutiner og deling i mindre grupper.
                      </p>
                    </div>

                    <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-emerald-900">09:30 – 11:00: Kjernetid / Tur & Språkgrupper</span>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Høyeste tetthet</span>
                      </div>
                      <p className="text-xs text-emerald-800">
                        Maksimal voksentetthet. Gruppene går ut i skogen eller har pedagogiske verksteder. Ingen pauser avvikles i dette tidsrommet.
                      </p>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800">11:00 – 12:30: Måltid & Sovetid småbarn</span>
                        <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Rullerende pauser</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Varmmåltid avvikles. Pauser tas suksessivt mens barna sover eller lytter til lydbok/hvilestund.
                      </p>
                    </div>

                    <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-900">12:30 – 14:30: Utelek & Plantid</span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Plantid avvikles</span>
                      </div>
                      <p className="text-xs text-amber-800">
                        Pedagogiske ledere har 4t ubunden tid (ons/tor) og fagarbeidere har 1t didaktisk plantid mens øvrige voksne er ute på lekeplassen.
                      </p>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800">14:30 – 17:00: Frukt & Stenging</span>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">Sein-/Stengevakt</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Fruktmåltid, overlevering til foreldre ved henting og samling av basene på ettermiddagen.
                      </p>
                    </div>

                  </div>
                </div>
              )}

            </div>
          ) : null}

        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleEksporterTurnusPdf}
            className="flex items-center space-x-2 text-slate-700 hover:text-indigo-600 text-xs font-bold transition cursor-pointer"
          >
            <Download size={16} />
            <span>Last ned hele turnusen som PDF</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={() => {
                if (aktivUkePlan) {
                  onBrukTurnus(aktivUkePlan.vakter);
                  if (onToast) onToast(`Turnus for Uke ${aktivUkePlan.ukeNr} ble lagt inn i aktiv vaktplan!`);
                  onClose();
                }
              }}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-sm cursor-pointer"
            >
              <Check size={16} />
              <span>Bruk forslag i vaktplanen</span>
            </button>
          </div>
        </div>

      </div>

      {/* MODAL / QUICK-EDIT FOR ET ENKELT SKIFT I TURNUSEN */}
      {redigererSkift && (
        <RedigerTurnusSkiftModal 
          skiftInfo={redigererSkift}
          onClose={() => setRedigererSkift(null)}
          onSave={handleOppdaterSkift}
        />
      )}

    </div>
  );
};

// --- SUB-MODAL FOR REDIGERING AV ENKELTVAKT I KI-TURNUSEN ---
interface RedigerTurnusSkiftModalProps {
  skiftInfo: {
    ukeNr: number;
    vakt: VaktItem;
  };
  onClose: () => void;
  onSave: (oppdatertVakt: VaktItem, oppdaterAlleUker: boolean) => void;
}

const RedigerTurnusSkiftModal: React.FC<RedigerTurnusSkiftModalProps> = ({
  skiftInfo,
  onClose,
  onSave
}) => {
  const [tid, setTid] = useState(skiftInfo.vakt.tid);
  const [merknad, setMerknad] = useState(skiftInfo.vakt.merknad || '');
  const [base, setBase] = useState(skiftInfo.vakt.base);
  const [status, setStatus] = useState(skiftInfo.vakt.status);
  const [oppdaterAlle, setOppdaterAlle] = useState(false);

  const hurtigvalg = [
    { label: 'Tidlig (07:00 - 14:30)', tid: '07:00 - 14:30', merknad: 'Åpnevakt' },
    { label: 'Tidlig (07:30 - 15:00)', tid: '07:30 - 15:00', merknad: '' },
    { label: 'Mellom 1 (08:00 - 15:30)', tid: '08:00 - 15:30', merknad: '' },
    { label: 'Mellom 2 (08:30 - 16:00)', tid: '08:30 - 16:00', merknad: '' },
    { label: 'Seinvakt (09:00 - 16:30)', tid: '09:00 - 16:30', merknad: '' },
    { label: 'Stenge (09:30 - 17:00)', tid: '09:30 - 17:00', merknad: 'Stengevakt' },
    { label: '4t Ped.plantid (08-12 / 12-16)', tid: '08:00 - 12:00 (12-16 Ubunden tid)', merknad: '4t lovpålagt ubunden plantid' },
    { label: '1t Fagarb.plantid (08:30 - 15:30)', tid: '08:30 - 15:30 (1t plantid)', merknad: '1t didaktisk plantid for fagarbeider' },
    { label: 'Fri / Avspasering', tid: 'Avspasering / Fri', merknad: 'Fast ukentlig fridag' },
  ];

  const handleLagre = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...skiftInfo.vakt,
      tid,
      merknad: merknad.trim() || undefined,
      base,
      status: tid.includes('Fri') || tid.includes('Avspasering') ? 'Avspasering' : status
    }, oppdaterAlle);
  };

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Edit2 size={18} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base">Rediger skift for {skiftInfo.vakt.navn}</h4>
              <p className="text-xs text-slate-500">{skiftInfo.vakt.dag} • Uke {skiftInfo.ukeNr} i turnusen</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleLagre} className="space-y-3.5">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Arbeidstid / Vakt</label>
            <input 
              type="text" 
              value={tid}
              onChange={(e) => setTid(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Hurtigvalg for barnehagen:</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
              {hurtigvalg.map(h => (
                <button
                  key={h.label}
                  type="button"
                  onClick={() => {
                    setTid(h.tid);
                    if (h.merknad) setMerknad(h.merknad);
                  }}
                  className={`text-left p-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    tid === h.tid 
                      ? 'bg-indigo-600 text-white shadow-2xs' 
                      : 'bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Base</label>
              <select
                value={base}
                onChange={(e) => setBase(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {BASER.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Til stede">Til stede</option>
                <option value="Vikar (Til stede)">Vikar</option>
                <option value="Avspasering">Avspasering / Fri</option>
                <option value="Sykemeldt">Sykemeldt</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Merknad / Didaktisk oppgave</label>
            <input 
              type="text" 
              value={merknad}
              onChange={(e) => setMerknad(e.target.value)}
              placeholder="F.eks. Turdag, Språkgruppe, Garderobeansvarlig"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
            <label className="flex items-center space-x-2 text-xs font-bold text-indigo-950 cursor-pointer">
              <input 
                type="checkbox"
                checked={oppdaterAlle}
                onChange={(e) => setOppdaterAlle(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Bruk denne vaktendringen for alle ukene i turnusen ({skiftInfo.vakt.dag})</span>
            </label>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              Lagre vaktendring
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default VaktlisteTurnus;
