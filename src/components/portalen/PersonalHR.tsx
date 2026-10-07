import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  ShieldCheck, 
  FileText, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Save, 
  Download, 
  AlertCircle, 
  Upload, 
  Plus, 
  Edit2, 
  Trash2, 
  GraduationCap, 
  User, 
  Activity, 
  Droplets, 
  Flame, 
  X,
  Clock,
  Check,
  BookOpen,
  Send,
  BellRing,
  FileCheck,
  FileUp,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  HeartHandshake,
  Coffee,
  Sparkles,
  CalendarDays,
  MessageCircle,
  Copy,
  FolderArchive,
  Search,
  FileSpreadsheet,
  Eye,
  Tag,
  Filter,
  FileBadge,
  MapPin,
  Phone,
  Mail,
  Heart
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import AppDatePicker from './AppDatePicker';
import { DialogmoteModal, DialogmoteInnkallingModal } from './DialogmoteModal';

export interface KursKravItem {
  status: 'Gyldig' | 'Utløper snart' | 'Utløpt' | 'Mangler' | 'Ikke påkrevd' | 'Godkjent';
  dato?: string;
  gjennomfortDato?: string;
  utloperDato?: string;
  varighetMnd?: number;
  utsteder?: string;
  fil?: string | null;
  filData?: string | null;
  filStorrelse?: string | null;
  info?: string;
}

export interface AnsattDokument {
  id: string;
  tittel: string;
  kategori: 'Oppfølging & NAV' | 'Medarbeidersamtale' | 'Arbeidsavtale & Kontrakt' | 'Kompetanse & Kurs' | 'Annet';
  dato: string;
  filnavn: string;
  storrelse?: string;
  opprettetAv: string;
  notat?: string;
  tags?: string[];
  filData?: string | null;
}

export interface AnsattMaster {
  id: number;
  navn: string;
  rolle: string;
  base: string;
  prosent: number;
  ansattDato: string;
  fodselsdato?: string;
  adresse?: string;
  telefon?: string;
  epostJobb?: string;
  epostPrivat?: string;
  parorendeNavn?: string;
  parorendeRelasjon?: string;
  parorendeTelefon?: string;
  status: 'Til stede' | 'Sykmeldt' | 'Permisjon' | 'Ferie';
  sykefravaer?: { 
    aktivt: boolean; 
    startDato: string; 
    grad: string; 
    ukerSyk: number;
    oppfolgingsplan?: { frist: string; status: string };
    dialogmote1?: { frist: string; status: string };
  };
  politiattest: { 
    status: 'Godkjent' | 'Mangler'; 
    dato: string; 
    fil: string | null;
    filData?: string | null;
    filStorrelse?: string | null;
  };
  arbeidskontrakt: { 
    status: 'Godkjent' | 'Mangler'; 
    info: string; 
    fil: string | null;
    filData?: string | null;
    filStorrelse?: string | null;
  };
  taushetserklaring: { 
    status: 'Godkjent' | 'Mangler'; 
    info: string; 
    fil: string | null;
    sendtTilSignering?: boolean;
    sendtDato?: string | null;
    purretDato?: string | null;
  };
  hmsGjennomgang: KursKravItem;
  forstehjelp: KursKravItem;
  livredning: KursKravItem;
  brannvern: KursKravItem;
  dokumenter?: AnsattDokument[];
}

interface PersonalHRProps {
  onNavigate?: (tab: string) => void;
  initialTab?: 'liste' | 'matrise';
}

const PersonalHR: React.FC<PersonalHRProps> = ({ onNavigate, initialTab = 'liste' }) => {
  // --- STATE: Visning og Data ---
  const [activeTab, setActiveTab] = useState<'liste' | 'matrise'>(initialTab);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnsatt, setEditingAnsatt] = useState<AnsattMaster | null>(null);
  const [ansattToDelete, setAnsattToDelete] = useState<AnsattMaster | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // MOCK-DATA: Master-databasen for alle ansatte
  const [ansatte, setAnsatte] = useState<AnsattMaster[]>(() => {
    const mockDokumenterIngrid: AnsattDokument[] = [
      {
        id: 'dok-1-1',
        tittel: 'Medarbeidersamtale 2026 - Mål & Pedagogisk ledelse',
        kategori: 'Medarbeidersamtale',
        dato: '15.01.2026',
        filnavn: 'Medarbeidersamtale_Solheim_2026.pdf',
        storrelse: '1.1 MB',
        opprettetAv: 'Styrer Karoline Haug',
        notat: 'Gjennomgang av trivsel, basens utviklingsmål og plan for rammeplanarbeid.',
        tags: ['Medarbeidersamtale', 'Mål 2026', 'Pedagogisk leder']
      },
      {
        id: 'dok-1-2',
        tittel: 'Arbeidsavtale - Fast 100% Pedagogisk leder',
        kategori: 'Arbeidsavtale & Kontrakt',
        dato: '15.08.2021',
        filnavn: 'Kontrakt_Fast.pdf',
        storrelse: '840 KB',
        opprettetAv: 'Eventyrskogen Barnehage',
        notat: 'Signert standard ansettelsesavtale PBL-tariff.',
        tags: ['Kontrakt', 'Fast ansatt', 'PBL']
      },
      {
        id: 'dok-1-3',
        tittel: 'Politiattestbekreftelse (§ 30 Barnehageloven)',
        kategori: 'Arbeidsavtale & Kontrakt',
        dato: '15.08.2023',
        filnavn: 'Politiattest_Solheim.pdf',
        storrelse: '1.2 MB',
        opprettetAv: 'Politiet',
        notat: 'Fremvist og godkjent uten anmerkninger.',
        tags: ['Politiattest', 'Godkjent']
      },
      {
        id: 'dok-1-4',
        tittel: 'Kursbevis: Førstehjelpskurs for barnehageansatte',
        kategori: 'Kompetanse & Kurs',
        dato: '15.05.2025',
        filnavn: 'Kursbevis_Forstehjelp_Solheim.pdf',
        storrelse: '1.4 MB',
        opprettetAv: 'Røde Kors Førstehjelp',
        notat: 'Gyldig til mai 2027.',
        tags: ['Førstehjelp', 'HLR', 'Sertifikat']
      },
      {
        id: 'dok-1-5',
        tittel: 'Livredningsdiplom & Badevaktprøve i vann',
        kategori: 'Kompetanse & Kurs',
        dato: '04.06.2025',
        filnavn: 'Livredningsdiplom_Solheim.pdf',
        storrelse: '980 KB',
        opprettetAv: 'Norges Livredningsselskap',
        notat: 'Bestått dykking og livredning i basseng.',
        tags: ['Livredning', 'Vanntilvenning']
      },
      {
        id: 'dok-1-6',
        tittel: 'Taushetserklæring - Signert digitalt',
        kategori: 'Arbeidsavtale & Kontrakt',
        dato: '15.08.2021',
        filnavn: 'Taushet_Signert.pdf',
        storrelse: '420 KB',
        opprettetAv: 'Styrer',
        notat: 'Lovpålagt taushetserklæring jfr. Barnehageloven § 44.',
        tags: ['Taushetsplikt']
      }
    ];

    const mockDokumenterFatima: AnsattDokument[] = [
      {
        id: 'dok-3-1',
        tittel: 'Oppfølgingsplan for sykmeldt (AML § 4-6)',
        kategori: 'Oppfølging & NAV',
        dato: '28.09.2026',
        filnavn: 'Oppfolgingsplan_Fatima_Al-Zahra.pdf',
        storrelse: '1.3 MB',
        opprettetAv: 'Styrer Karoline Haug',
        notat: 'Ergonomisk tilrettelegging og plan for gradert tilbakeføring.',
        tags: ['Oppfølgingsplan', 'NAV', 'Sykmeldt']
      },
      {
        id: 'dok-3-2',
        tittel: 'Innkalling til Dialogmøte 1 (NAV)',
        kategori: 'Oppfølging & NAV',
        dato: '02.10.2026',
        filnavn: 'Innkalling_Dialogmote1_Fatima.pdf',
        storrelse: '890 KB',
        opprettetAv: 'Eventyrskogen Barnehage',
        notat: 'Innkalling til møte for drøfting av arbeidsevne og tilrettelegging.',
        tags: ['Dialogmøte 1', 'Innkalling', 'NAV']
      },
      {
        id: 'dok-3-3',
        tittel: 'Årlig medarbeidersamtale 2025 - Trivsel & Utvikling',
        kategori: 'Medarbeidersamtale',
        dato: '14.11.2025',
        filnavn: 'Medarbeidersamtale_Fatima_2025.pdf',
        storrelse: '1.2 MB',
        opprettetAv: 'Styrer Karoline Haug',
        notat: 'Gjennomgang av trivsel på Multemyra og ønske om fagkurs i språkutvikling.',
        tags: ['Medarbeidersamtale', 'Fagarbeider']
      },
      {
        id: 'dok-3-4',
        tittel: 'Arbeidsavtale - Fast 100% Barne- og ungdomsarbeider',
        kategori: 'Arbeidsavtale & Kontrakt',
        dato: '10.01.2022',
        filnavn: 'Kontrakt.pdf',
        storrelse: '720 KB',
        opprettetAv: 'Eventyrskogen Barnehage',
        notat: 'Fast ansettelse på Multemyra base.',
        tags: ['Kontrakt', 'Fast']
      },
      {
        id: 'dok-3-5',
        tittel: 'Politiattestbekreftelse & Taushetserklæring',
        kategori: 'Arbeidsavtale & Kontrakt',
        dato: '10.01.2022',
        filnavn: 'Attest_Fatima.pdf',
        storrelse: '960 KB',
        opprettetAv: 'Politiet / Styrer',
        notat: 'Godkjent ved ansettelse.',
        tags: ['Politiattest', 'Taushetsplikt']
      },
      {
        id: 'dok-3-6',
        tittel: 'Kursbevis: Førstehjelp i barnehage',
        kategori: 'Kompetanse & Kurs',
        dato: '10.03.2025',
        filnavn: 'Forstehjelp_Fatima.pdf',
        storrelse: '1.1 MB',
        opprettetAv: 'Norsk Førstehjelpsråd',
        notat: 'Bestått teori og praksis.',
        tags: ['Førstehjelp', 'Sertifikat']
      }
    ];

    const mockDokumenterLars: AnsattDokument[] = [
      {
        id: 'dok-2-1',
        tittel: 'Rammeavtale Tilkallingsvikar 2026/2027',
        kategori: 'Arbeidsavtale & Kontrakt',
        dato: '28.09.2026',
        filnavn: 'Rammeavtale_Vikar.pdf',
        storrelse: '450 KB',
        opprettetAv: 'Styrer Karoline Haug',
        notat: 'Avtale om tilkalling ved sykdom og ferieavvikling.',
        tags: ['Vikar', 'Rammeavtale']
      },
      {
        id: 'dok-2-2',
        tittel: 'Oppstartssamtale & Introduksjonssjekkliste',
        kategori: 'Medarbeidersamtale',
        dato: '01.10.2026',
        filnavn: 'Oppstartssamtale_Lars.pdf',
        storrelse: '520 KB',
        opprettetAv: 'Styrer Karoline Haug',
        notat: 'Gjennomgang av rutiner, baser og forventningsavklaring.',
        tags: ['Oppstart', 'Introduksjon']
      }
    ];

    const saved = localStorage.getItem('styrern_ansatte_master');
    if (saved) {
      try {
        const parsed: AnsattMaster[] = JSON.parse(saved);
        return parsed.map(a => {
          let docs = a.dokumenter && a.dokumenter.length > 0 ? a.dokumenter : [];
          if (docs.length === 0) {
            if (a.navn.toLowerCase().includes('fatima')) docs = mockDokumenterFatima;
            else if (a.navn.toLowerCase().includes('solheim') || a.navn.toLowerCase().includes('ingrid')) docs = mockDokumenterIngrid;
            else if (a.navn.toLowerCase().includes('lars')) docs = mockDokumenterLars;
          }

          if (a.navn.toLowerCase().includes('fatima') && !a.sykefravaer) {
            return {
              ...a,
              status: 'Sykmeldt' as const,
              sykefravaer: { 
                aktivt: true, 
                startDato: '15. sep 2026', 
                grad: '100%', 
                ukerSyk: 3,
                oppfolgingsplan: { frist: '15. okt 2026', status: 'Venter' },
                dialogmote1: { frist: '05. nov 2026', status: 'Planlagt' }
              },
              dokumenter: docs
            };
          }
          return {
            ...a,
            status: a.status || (a.navn.toLowerCase().includes('fatima') ? 'Sykmeldt' : 'Til stede'),
            dokumenter: docs
          };
        });
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { 
        id: 1, 
        navn: 'Ingrid Solheim', 
        rolle: 'Pedagogisk leder', 
        base: 'Trollstua', 
        prosent: 100, 
        ansattDato: '01. okt 2021',
        fodselsdato: '14.05.1988',
        adresse: 'Eventyrveien 14, 0870 Oslo',
        telefon: '987 65 432',
        epostJobb: 'ingrid.solheim@eventyrskogen.no',
        epostPrivat: 'ingrid.solheim.privat@gmail.com',
        parorendeNavn: 'Lars Solheim',
        parorendeRelasjon: 'Ektefelle',
        parorendeTelefon: '912 34 567',
        status: 'Til stede',
        politiattest: { status: 'Godkjent', dato: '15.08.2023', fil: 'Politiattest_Solheim.pdf', filStorrelse: '1.2 MB' },
        arbeidskontrakt: { status: 'Godkjent', info: 'Signert 15.08.2021', fil: 'Kontrakt_Fast.pdf', filStorrelse: '840 KB' },
        taushetserklaring: { status: 'Godkjent', info: 'Signert 15.08.2021', fil: 'Taushet_Signert.pdf', sendtTilSignering: false },
        hmsGjennomgang: { status: 'Godkjent', info: 'Sist gjennomgått Jan 2026' },
        forstehjelp: { status: 'Gyldig', dato: 'Mai 2027', gjennomfortDato: '15.05.2025', varighetMnd: 24, utsteder: 'Røde Kors Førstehjelp', fil: 'Kursbevis_Forstehjelp_Solheim.pdf', filStorrelse: '1.4 MB' },
        livredning: { status: 'Gyldig', dato: 'Jun 2027', gjennomfortDato: '04.06.2025', varighetMnd: 24, utsteder: 'Norges Livredningsselskap', fil: 'Livredningsdiplom_Solheim.pdf', filStorrelse: '980 KB' },
        brannvern: { status: 'Utløper snart', dato: 'Nov 2026', gjennomfortDato: '15.11.2025', varighetMnd: 12, utsteder: 'Brannvesenet Øst' },
        dokumenter: mockDokumenterIngrid
      },
      { 
        id: 2, 
        navn: 'Lars Pettersen', 
        rolle: 'Vikar', 
        base: 'Flytende', 
        prosent: 0, 
        ansattDato: 'Ny',
        fodselsdato: '22.11.1995',
        adresse: 'Skogveien 3, 0378 Oslo',
        telefon: '901 23 456',
        epostJobb: 'lars.pettersen@eventyrskogen.no',
        epostPrivat: 'lars.p.privat@gmail.com',
        parorendeNavn: 'Kari Pettersen',
        parorendeRelasjon: 'Mor',
        parorendeTelefon: '934 56 789',
        status: 'Til stede',
        politiattest: { status: 'Mangler', dato: '-', fil: null },
        arbeidskontrakt: { status: 'Godkjent', info: 'Signert digitalt 28. sep 2026', fil: 'Rammeavtale_Vikar.pdf', filStorrelse: '450 KB' },
        taushetserklaring: { status: 'Mangler', info: 'Venter på signatur', fil: null, sendtTilSignering: true, sendtDato: '01.10.2026' },
        hmsGjennomgang: { status: 'Mangler', info: 'Mangler gjennomgang av branninstruks' },
        forstehjelp: { status: 'Mangler', dato: 'Må gjennomføres' },
        livredning: { status: 'Ikke påkrevd', dato: '-' },
        brannvern: { status: 'Utløpt', dato: 'Sep 2026' },
        dokumenter: mockDokumenterLars
      },
      { 
        id: 3, 
        navn: 'Fatima Al-Zahra', 
        rolle: 'Fagarbeider', 
        base: 'Multemyra', 
        prosent: 100, 
        ansattDato: '10. jan 2022',
        fodselsdato: '03.09.1991',
        adresse: 'Solheimsveien 8B, 1473 Lørenskog',
        telefon: '412 34 890',
        epostJobb: 'fatima.al-zahra@eventyrskogen.no',
        epostPrivat: 'fatima.alz@hotmail.com',
        parorendeNavn: 'Tariq Al-Zahra',
        parorendeRelasjon: 'Ektefelle',
        parorendeTelefon: '456 78 123',
        status: 'Sykmeldt',
        sykefravaer: { 
          aktivt: true, 
          startDato: '15. sep 2026', 
          grad: '100%', 
          ukerSyk: 3,
          oppfolgingsplan: { frist: '15. okt 2026', status: 'Venter' },
          dialogmote1: { frist: '05. nov 2026', status: 'Planlagt' }
        },
        politiattest: { status: 'Godkjent', dato: '10.01.2022', fil: 'Attest_Fatima.pdf', filStorrelse: '960 KB' },
        arbeidskontrakt: { status: 'Godkjent', info: 'Signert 10.01.2022', fil: 'Kontrakt.pdf', filStorrelse: '720 KB' },
        taushetserklaring: { status: 'Godkjent', info: 'Signert 10.01.2022', fil: 'Taushet.pdf', sendtTilSignering: false },
        hmsGjennomgang: { status: 'Godkjent', info: 'Gjennomført' },
        forstehjelp: { status: 'Gyldig', dato: 'Mar 2027', gjennomfortDato: '10.03.2025', varighetMnd: 24, utsteder: 'Norsk Førstehjelpsråd', fil: 'Forstehjelp_Fatima.pdf', filStorrelse: '1.1 MB' },
        livredning: { status: 'Utløper snart', dato: 'Des 2026', gjennomfortDato: '10.12.2024', varighetMnd: 24, utsteder: 'Livredningsselskapet' },
        brannvern: { status: 'Gyldig', dato: 'Jan 2028', gjennomfortDato: '12.01.2026', varighetMnd: 24, utsteder: 'Firesafe Norge' },
        dokumenter: mockDokumenterFatima
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('styrern_ansatte_master', JSON.stringify(ansatte));
  }, [ansatte]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // --- FUNKSJONER ---
  const [modalInitialTab, setModalInitialTab] = useState<'nav' | 'personalia' | 'kompetanse' | 'dokumenter' | 'compliance'>('personalia');

  const handleOpenModal = (ansatt: AnsattMaster | null = null, tab?: 'nav' | 'personalia' | 'kompetanse' | 'dokumenter' | 'compliance') => {
    setEditingAnsatt(ansatt); // Hvis null, betyr det "Ny ansatt"
    if (tab) {
      setModalInitialTab(tab);
    } else {
      setModalInitialTab(ansatt?.sykefravaer?.aktivt ? 'nav' : 'personalia');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAnsatt(null);
  };

  const handleSaveAnsatt = (lagretAnsatt: AnsattMaster) => {
    setAnsatte(prev => {
      const finnes = prev.some(a => a.id === lagretAnsatt.id);
      if (finnes) {
        return prev.map(a => a.id === lagretAnsatt.id ? lagretAnsatt : a);
      } else {
        return [...prev, lagretAnsatt];
      }
    });
    handleCloseModal();
    showToast(`Ansatt ${lagretAnsatt.navn} er lagret med oppdaterte dokumenter.`);
  };

  // Sletting via in-app bekreftelsesmodal (unngår window.confirm som blokkeres i iframe)
  const handleConfirmDelete = () => {
    if (!ansattToDelete) return;
    const slettetNavn = ansattToDelete.navn;
    setAnsatte(prev => prev.filter(a => a.id !== ansattToDelete.id));
    setAnsattToDelete(null);
    showToast(`${slettetNavn} er slettet fra systemet.`);
  };

  // Hjelpefunksjon for Kompetansematrise-badges
  const renderBadge = (krav: KursKravItem | { status: string; dato?: string; info?: string; fil?: string | null }) => {
    let farge = '';
    let Ikon: React.ComponentType<{ size?: number; className?: string }> | null = null;
    switch (krav.status) {
      case 'Godkjent':
      case 'Gyldig': 
        farge = 'bg-emerald-50 text-emerald-700 border-emerald-200'; 
        Ikon = CheckCircle2; 
        break;
      case 'Utløper snart': 
        farge = 'bg-amber-50 text-amber-700 border-amber-200'; 
        Ikon = Clock; 
        break;
      case 'Mangler':
      case 'Utløpt': 
        farge = 'bg-rose-50 text-rose-700 border-rose-200'; 
        Ikon = AlertTriangle; 
        break;
      default: 
        farge = 'bg-slate-50 text-slate-500 border-slate-200'; 
        Ikon = null;
    }
    return (
      <div className={`flex flex-col items-start p-2.5 rounded-xl border ${farge} transition hover:shadow-xs w-full`}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-1.5 font-bold text-xs">
            {Ikon && <Ikon size={13} />}
            <span>{krav.status}</span>
          </div>
          {krav.fil && (
            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-1" title={`Dokumentasjon vedlagt: ${krav.fil}`}>
              <FileCheck size={11} />
              <span>Dokumentert</span>
            </span>
          )}
        </div>
        <span className="text-[11px] mt-1 opacity-90 font-medium">
          {krav.dato || krav.info || ('utloperDato' in krav && krav.utloperDato ? `Utløper: ${krav.utloperDato}` : '')}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* TOAST MELDING */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[200] bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-slate-700 animate-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* 1. HEADER & HOVEDNAVIGASJON */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <Users className="text-indigo-600" size={28} />
            <span>Personal & HR</span>
          </h2>
          <p className="text-slate-600 mt-1">Master-hub for alle ansatte, kontrakter og lovpålagte krav.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {onNavigate && (
            <button 
              onClick={() => onNavigate('personalhandbok')}
              className="flex items-center space-x-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3.5 py-2.5 rounded-lg border border-indigo-200 transition-colors text-sm font-semibold cursor-pointer"
            >
              <BookOpen size={16} />
              <span>Personalhåndbok</span>
            </button>
          )}
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg transition-colors shadow-sm font-medium cursor-pointer"
          >
            <Plus size={18} />
            <span>Legg til ansatt</span>
          </button>
        </div>
      </div>

      {/* 2. UNDER-FANER (Tabs) */}
      <div className="border-b border-slate-200 bg-white px-4 rounded-xl shadow-xs">
        <nav className="flex space-x-8">
          <button 
            onClick={() => setActiveTab('liste')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 cursor-pointer ${activeTab === 'liste' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            <Users size={18} />
            <span>Ansattliste & Roller</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 font-semibold">{ansatte.length}</span>
          </button>
          <button 
            onClick={() => setActiveTab('matrise')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 cursor-pointer ${activeTab === 'matrise' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            <GraduationCap size={18} />
            <span>Kompetanse- & Kravmatrise</span>
          </button>
        </nav>
      </div>

      {/* 3. INNHOLD: Ansattliste */}
      {activeTab === 'liste' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-medium">Navn</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Rolle i systemet</th>
                <th className="px-6 py-4 font-medium">Tilhørighet (Base)</th>
                <th className="px-6 py-4 font-medium">Stilling</th>
                <th className="px-6 py-4 font-medium">Politiattest</th>
                <th className="px-6 py-4 font-medium">Taushetserklæring</th>
                <th className="px-6 py-4 font-medium text-right">Handlinger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ansatte.map((ansatt) => (
                <tr key={ansatt.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleOpenModal(ansatt)}>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{ansatt.navn}</span>
                      <span className="text-xs text-slate-400 mt-0.5">
                        {ansatt.fodselsdato ? `Født: ${ansatt.fodselsdato} • ` : ''}Startet: {ansatt.ansattDato}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {ansatt.status === 'Sykmeldt' ? (
                      <span className="flex items-center space-x-1.5 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md text-xs font-bold border border-rose-200 w-fit">
                        <Stethoscope size={14} className="text-rose-600" />
                        <span>Sykmeldt {ansatt.sykefravaer?.grad ? `(${ansatt.sykefravaer.grad})` : ''}</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-bold border border-emerald-200 w-fit">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>Til stede</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-bold border border-indigo-100">
                      {ansatt.rolle}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{ansatt.base}</td>
                  <td className="px-6 py-4 text-slate-600">{ansatt.prosent}%</td>
                  <td className="px-6 py-4">
                    {ansatt.politiattest.status === 'Godkjent' ? (
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        <CheckCircle2 size={12} />
                        <span>Fremvist</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                        <AlertTriangle size={12} />
                        <span>Mangler</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {ansatt.taushetserklaring.status === 'Godkjent' ? (
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        <CheckCircle2 size={12} />
                        <span>Signert</span>
                      </span>
                    ) : ansatt.taushetserklaring.sendtTilSignering ? (
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Clock size={12} />
                        <span>Sendt til profil</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                        <AlertTriangle size={12} />
                        <span>Mangler</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => handleOpenModal(ansatt)}
                      className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-indigo-50"
                      title="Rediger ansatt og dokumenter"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => setAnsattToDelete(ansatt)}
                      className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-rose-50"
                      title="Slett ansatt"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. INNHOLD: Kompetansematrise */}
      {activeTab === 'matrise' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-700 text-sm">Ansatt</th>
                  <th className="px-4 py-4 font-semibold text-slate-700 text-sm">
                    <div className="flex items-center space-x-2">
                      <Activity size={16} className="text-slate-400"/>
                      <span>Førstehjelp</span>
                    </div>
                  </th>
                  <th className="px-4 py-4 font-semibold text-slate-700 text-sm">
                    <div className="flex items-center space-x-2">
                      <Droplets size={16} className="text-slate-400"/>
                      <span>Livredning</span>
                    </div>
                  </th>
                  <th className="px-4 py-4 font-semibold text-slate-700 text-sm">
                    <div className="flex items-center space-x-2">
                      <Flame size={16} className="text-slate-400"/>
                      <span>Brannvern</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ansatte.map((ansatt) => (
                  <tr key={ansatt.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleOpenModal(ansatt, 'kompetanse')}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{ansatt.navn}</span>
                        <span className="text-xs text-slate-500 mt-0.5 font-medium">{ansatt.rolle} • {ansatt.base}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">{renderBadge(ansatt.forstehjelp)}</td>
                    <td className="px-4 py-4 align-top">{renderBadge(ansatt.livredning)}</td>
                    <td className="px-4 py-4 align-top">{renderBadge(ansatt.brannvern)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. MODAL: Det dynamiske Ansattkortet */}
      {isModalOpen && (
        <AnsattModal 
          ansatt={editingAnsatt} 
          initialTab={modalInitialTab}
          onClose={handleCloseModal} 
          onSave={handleSaveAnsatt}
          onToast={showToast}
        />
      )}

      {/* 6. MODAL: Slettebekreftelse (erstatter window.confirm som blokkeres i sandboxed iframe) */}
      {ansattToDelete && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Slett ansatt fra systemet?</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Er du sikker på at du vil slette <strong>{ansattToDelete.navn}</strong> ({ansattToDelete.rolle}, {ansattToDelete.base})? Dette fjerner profilen og tilhørende opplastede dokumenter.
            </p>
            <div className="mt-6 flex space-x-3 justify-end">
              <button
                onClick={() => setAnsattToDelete(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Avbryt
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm cursor-pointer"
              >
                Ja, slett ansatt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// --- DRAG AND DROP FILOPPLASTING-KOMPONENT ---
interface DragDropUploadProps {
  label: string;
  sublabel: string;
  accept?: string;
  currentFileName: string | null;
  currentFileSize?: string | null;
  onFileSelected: (fileName: string, fileSize: string, dataUrl: string) => void;
  onRemove: () => void;
}

const DragDropUpload: React.FC<DragDropUploadProps> = ({
  label,
  sublabel,
  accept = '.pdf,.doc,.docx,image/*',
  currentFileName,
  currentFileSize,
  onFileSelected,
  onRemove
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    const sizeStr = file.size > 1024 * 1024 
      ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      : Math.round(file.size / 1024) + ' KB';
    
    const reader = new FileReader();
    reader.onload = () => {
      onFileSelected(file.name, sizeStr, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <input 
        ref={fileInputRef} 
        type="file" 
        accept={accept} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {currentFileName ? (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
              <FileCheck size={20} />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-800 truncate">{currentFileName}</p>
              <p className="text-[11px] text-emerald-700 font-medium">Opplastet dokument {currentFileSize ? `• ${currentFileSize}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0 ml-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold px-2 py-1 rounded hover:bg-indigo-50 transition cursor-pointer"
            >
              Bytt fil
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
              title="Fjern fil"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer ${
            isDragging 
              ? 'border-indigo-500 bg-indigo-50/80 scale-[1.01]' 
              : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/80'
          }`}
        >
          <div className={`p-2 rounded-full mb-2 ${isDragging ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-500'}`}>
            <FileUp size={20} />
          </div>
          <span className="text-xs font-bold text-slate-700">{label}</span>
          <span className="text-[11px] text-slate-500 mt-0.5">{sublabel}</span>
        </div>
      )}
    </div>
  );
};

// --- EGEN KOMPONENT FOR ANSATTKORT-MODALEN ---
interface AnsattModalProps {
  ansatt: AnsattMaster | null;
  initialTab?: 'nav' | 'personalia' | 'kompetanse' | 'dokumenter' | 'compliance';
  onClose: () => void;
  onSave: (ansatt: AnsattMaster) => void;
  onToast?: (msg: string) => void;
}

const AnsattModal: React.FC<AnsattModalProps> = ({ ansatt, initialTab, onClose, onSave, onToast }) => {
  const showToast = (msg: string) => {
    if (onToast) onToast(msg);
  };

  const [modalTab, setModalTab] = useState<'nav' | 'personalia' | 'kompetanse' | 'dokumenter' | 'compliance'>(
    initialTab || (ansatt?.sykefravaer?.aktivt ? 'nav' : 'personalia')
  );
  const [visSmsModal, setVisSmsModal] = useState(false);
  const [visAiPlanModal, setVisAiPlanModal] = useState(false);
  const [visInnkallingModal, setVisInnkallingModal] = useState(false);
  const [innkallingMoteType, setInnkallingMoteType] = useState<'dialogmote1' | 'dialogmote2'>('dialogmote1');
  const [visDialogmoteModal, setVisDialogmoteModal] = useState(false);
  const [dialogmoteType, setDialogmoteType] = useState<'dialogmote1' | 'dialogmote2'>('dialogmote1');
  const [kalenderApen, setKalenderApen] = useState(false);
  const [smsKopiert, setSmsKopiert] = useState(false);
  const [smsTekst, setSmsTekst] = useState(
    `Hei ${ansatt?.navn ? ansatt.navn.split(' ')[0] : 'Fatima'}! Håper du har en så fin dag som mulig. Ville bare høre om du orker en kaffe eller en liten rusletur en av dagene? Helt uformelt, ingen jobbprat – vi savner deg bare på huset! Klem fra Karoline ☕`
  );
  const [kontaktLogget, setKontaktLogget] = useState(false);
  const [aiPlanLagret, setAiPlanLagret] = useState(false);

  // Dokumentarkiv-state
  const [dokKategoriFilter, setDokKategoriFilter] = useState<'Alle' | 'Oppfølging & NAV' | 'Medarbeidersamtale' | 'Arbeidsavtale & Kontrakt' | 'Kompetanse & Kurs' | 'Annet'>('Alle');
  const [dokSoketekst, setDokSoketekst] = useState('');
  const [visOpplastDokumentModal, setVisOpplastDokumentModal] = useState(false);
  const [visNyMedarbeidersamtaleModal, setVisNyMedarbeidersamtaleModal] = useState(false);
  const [redigererSamtaleDokId, setRedigererSamtaleDokId] = useState<string | null>(null);
  const [valgtDokument, setValgtDokument] = useState<AnsattDokument | null>(null);

  // Nytt dokument skjema
  const [nyttDokData, setNyttDokData] = useState<{
    tittel: string;
    kategori: AnsattDokument['kategori'];
    dato: string;
    notat: string;
    filnavn: string;
    storrelse: string;
    filData?: string | null;
  }>({
    tittel: '',
    kategori: 'Medarbeidersamtale',
    dato: new Date().toLocaleDateString('no-NO'),
    notat: '',
    filnavn: '',
    storrelse: '1.0 MB',
    filData: null
  });

  // Fullt redigerbar Medarbeidersamtale-skjema for Styrer
  const [samtaleFormData, setSamtaleFormData] = useState<{
    tittel: string;
    dato: string;
    nesteSamtaleDato: string;
    lederNavn: string;
    temaer: { id: string; tittel: string; innhold: string }[];
    avtalerOgTiltak: string;
  }>({
    tittel: 'Medarbeidersamtale 2026 - Årlig samtale',
    dato: new Date().toLocaleDateString('no-NO'),
    nesteSamtaleDato: 'Februar 2027',
    lederNavn: 'Karoline Haug (Styrer)',
    temaer: [
      {
        id: 't1',
        tittel: '1. Arbeidshverdag, trivsel og arbeidsmiljø på basen',
        innhold: 'Trives godt i barnehagen og på basen. Føler seg verdsatt i teamet og opplever god dynamikk med kollegaer.'
      },
      {
        id: 't2',
        tittel: '2. Samarbeid i teamet og relasjon til barn og foreldre',
        innhold: 'Godt samarbeid med pedagogisk leder og assistenter. God dialog i hente- og bringesituasjoner med foreldrene.'
      },
      {
        id: 't3',
        tittel: '3. Ansvarsområder, pedagogisk arbeid og måloppnåelse',
        innhold: 'Har tatt ekstra ansvar for språkgrupper og utetid. Ønsker å bidra mer inn i planlegging av temauker.'
      },
      {
        id: 't4',
        tittel: '4. Faglig utvikling, plantid og kursbehov',
        innhold: 'Ønsker å delta på kurs i relasjonskompetanse og traumebevisst omsorg.'
      }
    ],
    avtalerOgTiltak: 'Avtalt 1 time ukentlig skjermet tid til faglig fordypning og observasjoner. Neste oppfølgingssamtale settes opp i februar 2027.'
  });
  
  // Redigerbar KI-oppfølgingsplan (Lovpålagt jfr. AML § 4-6)
  const [oppfolgingsplanData, setOppfolgingsplanData] = useState({
    ergonomi: 'Fritak fra tunge løft i stellesituasjoner og av/påkledning i småbarnsgarderoben. Hev/senk stellebord benyttes fast.',
    arbeidstid: 'Faste midtvakter (08:30 – 15:30) for å unngå stress med aleneansvar ved åpning og stenging.',
    didaktisk: '20% økt planleggingstid skjermet på pauserommet med pedagogisk forberedelse og dokumentasjon.',
    tilbakeforing: 'Vurdere 40% gradert friskmelding fra uke 5 etter oppfølgingssamtale.',
    egneTiltak: 'Samarbeid med pedagogisk leder om å fordele fysiske oppgaver til assisterende personell.'
  });
  const isNew = !ansatt;

  // Skjema-tilstand
  const [formData, setFormData] = useState<AnsattMaster>(() => {
    if (ansatt) {
      return { 
        ...ansatt,
        dokumenter: ansatt.dokumenter || []
      };
    }
    return {
      id: Date.now(),
      navn: '',
      rolle: 'Assistent',
      base: 'Trollstua',
      prosent: 100,
      ansattDato: new Date().toLocaleDateString('no-NO'),
      fodselsdato: '',
      adresse: '',
      telefon: '',
      epostJobb: '',
      epostPrivat: '',
      parorendeNavn: '',
      parorendeRelasjon: 'Ektefelle',
      parorendeTelefon: '',
      status: 'Til stede',
      politiattest: { status: 'Mangler', dato: '-', fil: null },
      arbeidskontrakt: { status: 'Mangler', info: 'Mangler signert kontrakt', fil: null },
      taushetserklaring: { status: 'Mangler', info: 'Venter på signatur', fil: null, sendtTilSignering: false },
      hmsGjennomgang: { 
        status: 'Mangler', 
        dato: '-', 
        info: 'Mangler branninstruks og HMS',
        gjennomfortDato: '',
        fil: null 
      },
      forstehjelp: { 
        status: 'Mangler', 
        dato: 'Må gjennomføres',
        gjennomfortDato: '',
        utloperDato: '',
        varighetMnd: 24,
        utsteder: 'Norsk Førstehjelpsråd',
        fil: null 
      },
      livredning: { 
        status: 'Ikke påkrevd', 
        dato: '-',
        gjennomfortDato: '',
        utloperDato: '',
        varighetMnd: 12,
        utsteder: 'Norges Livredningsselskap',
        fil: null 
      },
      brannvern: { 
        status: 'Mangler', 
        dato: 'Må gjennomføres',
        gjennomfortDato: '',
        utloperDato: '',
        varighetMnd: 12,
        utsteder: 'Lokalt Brannvesen',
        fil: null 
      },
      dokumenter: []
    };
  });
  
  // Sjekker om kritiske krav er på plass
  const erKlarForVakt = formData.politiattest.status === 'Godkjent' && 
                       formData.arbeidskontrakt.status === 'Godkjent' && 
                       formData.taushetserklaring.status === 'Godkjent';

  // Last ned offisiell Taushetserklæring som PDF-vedlegg
  const handleLastNedTaushetserklaringMal = () => {
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
      doc.text('TAUSHETSERKLÆRING FOR ANSATTE OG VIKARER', 15, 24);

      doc.setFontSize(8);
      doc.setTextColor(165, 180, 252);
      doc.text('Jfr. Barnehageloven § 20 & Forvaltningsloven §§ 13 til 13 f', 15, 31);

      let y = 50;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`Taushetspliktavtale for: ${formData.navn || 'Arbeidstaker'}`, 15, y);

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const tekstLinjer = [
        'Som ansatt eller vikar i Eventyrskogen Barnehage plikter du å hindre at andre får adgang eller kjennskap',
        'til det du i forbindelse med tjenesten får vite om noens personlige forhold.',
        '',
        '1. Taushetsplikten gjelder opplysninger om barns og familiers helse, økonomiske forhold, omsorgssituasjon,',
        '   sosiale forhold og eventuelle vedtak om spesialpedagogisk hjelp eller barnevern.',
        '2. Taushetsplikten gjelder også overfor andre ansatte i barnehagen som ikke har et saklig behov for',
        '   opplysningene i sitt arbeid med barnet.',
        '3. Taushetsplikten gjelder også etter at arbeidsforholdet i Eventyrskogen Barnehage er avsluttet.',
        '4. Brudd på taushetsplikten er straffbart etter straffeloven § 209 og kan medføre oppsigelse/avskjed.',
        '',
        'Unntak fra taushetsplikten foreligger kun ved lovbestemt opplysningsplikt til barneverntjenesten (Barnehageloven § 22)',
        'eller ved samtykke fra foresatte.',
        '',
        `Dato opprettet: ${new Date().toLocaleDateString('no-NO')}`
      ];

      tekstLinjer.forEach(line => {
        doc.text(line, 15, y);
        y += 5.5;
      });

      y += 15;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, y, 180, 36, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text('BEKREFTELSE OG SIGNATUR', 20, y + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('Jeg bekrefter herved at jeg har lest, forstått og akseptert taushetsplikten i Eventyrskogen Barnehage.', 20, y + 15);
      
      doc.text('Dato: ________________________', 20, y + 26);
      doc.text('Underskrift ansatt: ____________________________________', 90, y + 26);

      doc.save(`Taushetserklaring_Eventyrskogen_${(formData.navn || 'mal').replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Feil ved nedlasting av taushetserklæring:', err);
    }
  };

  // Send taushetserklæring direkte til ansattes profil for digital signering
  const handleSendTilSignering = () => {
    const iDag = new Date().toLocaleDateString('no-NO');
    setFormData(prev => ({
      ...prev,
      taushetserklaring: {
        ...prev.taushetserklaring,
        sendtTilSignering: true,
        sendtDato: iDag,
        info: `Sendt til ansattes profil for digital signering (${iDag})`
      }
    }));
  };

  // Purr på digital signering
  const handlePurrSignering = () => {
    const iDag = new Date().toLocaleDateString('no-NO');
    setFormData(prev => ({
      ...prev,
      taushetserklaring: {
        ...prev.taushetserklaring,
        purretDato: iDag,
        info: `Purring sendt til profil (${iDag}) - Venter på signering`
      }
    }));
  };

  // Eksportér helhetlig ansattmappe som PDF for tilsyn
  const handleEksporterPdf = () => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(30, 27, 75);
      doc.rect(0, 0, 210, 36, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('EVENTYRSKOGEN BARNEHAGE', 15, 16);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(199, 210, 254);
      doc.text('ANSATT-DOKUMENTASJON & TILSYNSRAPPORT', 15, 24);

      doc.setFontSize(8);
      doc.setTextColor(165, 180, 252);
      doc.text(`Utskriftsdato: ${new Date().toLocaleDateString('no-NO')}  |  Styrer: Karoline Haug`, 15, 31);

      let y = 48;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, y, 180, 22, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(formData.navn || 'Ny ansatt', 20, y + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Stilling: ${formData.rolle} (${formData.prosent}%)  |  Base: ${formData.base}  |  Ansatt: ${formData.ansattDato}`, 20, y + 15);

      y += 30;

      const kravpunkter = [
        { tittel: '1. Politiattest (§ 30 Barnehageloven)', status: formData.politiattest.status, info: formData.politiattest.fil ? `Dokument: ${formData.politiattest.fil} (${formData.politiattest.filStorrelse || 'OK'})` : (formData.politiattest.dato || '-') },
        { tittel: '2. Arbeidskontrakt & Stillingsavtale', status: formData.arbeidskontrakt.status, info: formData.arbeidskontrakt.fil ? `Dokument: ${formData.arbeidskontrakt.fil} (${formData.arbeidskontrakt.filStorrelse || 'OK'})` : formData.arbeidskontrakt.info },
        { tittel: '3. Taushetserklæring (§ 20 Barnehageloven)', status: formData.taushetserklaring.status, info: formData.taushetserklaring.fil ? `Dokument: ${formData.taushetserklaring.fil}` : formData.taushetserklaring.info },
        { tittel: '4. Førstehjelpskurs (HLR & barn)', status: formData.forstehjelp.status, info: `Gjennomført: ${formData.forstehjelp.gjennomfortDato || formData.forstehjelp.dato || '-'} | Leverandør: ${formData.forstehjelp.utsteder || 'Røde Kors'} ${formData.forstehjelp.fil ? `(Vedlegg: ${formData.forstehjelp.fil})` : ''}` },
        { tittel: '5. Livredning i vann / Badevaktprøve', status: formData.livredning.status, info: `Gjennomført: ${formData.livredning.gjennomfortDato || formData.livredning.dato || '-'} | Varighet: ${formData.livredning.varighetMnd || 12} mnd ${formData.livredning.fil ? `(Vedlegg: ${formData.livredning.fil})` : ''}` },
        { tittel: '6. Brannvern & Slokkeøvelse', status: formData.brannvern.status, info: `Gjennomført: ${formData.brannvern.gjennomfortDato || formData.brannvern.dato || '-'} | Instruktør: ${formData.brannvern.utsteder || 'Brannvesen'} ${formData.brannvern.fil ? `(Vedlegg: ${formData.brannvern.fil})` : ''}` },
        { tittel: '7. HMS-introduksjon & Vernerunde', status: formData.hmsGjennomgang.status, info: formData.hmsGjennomgang.info || 'Gjennomført ved tiltredelse' }
      ];

      kravpunkter.forEach((krav) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(15, y, 180, 18, 1, 1, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(krav.tittel, 18, y + 6);

        if (krav.status === 'Godkjent' || krav.status === 'Gyldig') {
          doc.setTextColor(5, 150, 105);
        } else {
          doc.setTextColor(225, 29, 72);
        }
        doc.text(`[${krav.status}]`, 160, y + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(krav.info, 18, y + 12);

        y += 22;
      });

      doc.save(`Ansattmappe_${(formData.navn || 'ansatt').replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Feil ved generering av PDF:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-4xl lg:max-w-5xl overflow-hidden shadow-2xl flex flex-col h-[88vh] min-h-[680px] max-h-[860px] animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className={`p-6 flex items-start justify-between relative transition-colors shrink-0 ${erKlarForVakt || isNew ? 'bg-[#1e1b4b] text-white' : 'bg-rose-900 text-white'}`}>
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full shadow-inner ${erKlarForVakt || isNew ? 'bg-indigo-800' : 'bg-rose-800'}`}>
              <User size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{isNew ? 'Ny Ansatt' : (formData.navn || 'Uten navn')}</h2>
              {!isNew && (
                <div className="flex flex-wrap items-center gap-2 text-sm mt-1 opacity-90 text-indigo-100">
                  <span className="bg-white/20 px-2 py-0.5 rounded uppercase tracking-wider text-[11px] font-bold">{formData.rolle}</span>
                  <span>• {formData.base}</span>
                  <span>• Startet: {formData.ansattDato}</span>
                  {formData.sykefravaer?.aktivt && (
                    <span className="flex items-center text-rose-200 font-bold bg-rose-500/30 px-2.5 py-0.5 rounded-full border border-rose-400/40 text-xs">
                      <Stethoscope size={13} className="mr-1 text-rose-300" /> Sykmeldt ({formData.sykefravaer.grad})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors absolute top-4 right-4 cursor-pointer">
              <X size={24} />
            </button>
            <div className="mt-6 mr-6">
              {!isNew && erKlarForVakt && (
                <div className="flex items-center space-x-2 bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-bold text-sm">
                  <CheckCircle2 size={18} />
                  <span>Klar for vakt</span>
                </div>
              )}
              {!isNew && !erKlarForVakt && (
                <div className="flex items-center space-x-2 bg-rose-500/30 text-rose-100 border border-rose-500/40 px-3 py-1.5 rounded-lg font-bold text-sm">
                  <AlertTriangle size={18} />
                  <span>Mangler dokumentasjon</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODAL NAVIGASJON (Personalia til venstre, unntatt ved aktiv NAV-oppfølging) */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 flex space-x-2 sm:space-x-6 overflow-x-auto shrink-0">
          {!isNew && formData.sykefravaer?.aktivt && (
            <button 
              onClick={() => setModalTab('nav')} 
              className={`py-3.5 border-b-2 font-bold text-sm transition-colors flex items-center space-x-2 shrink-0 cursor-pointer ${
                modalTab === 'nav' 
                  ? 'border-rose-500 text-rose-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <HeartHandshake size={16} />
              <span>NAV & Oppfølging</span>
              <span className="bg-rose-100 text-rose-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] ml-1 font-black">
                1
              </span>
            </button>
          )}
          <button 
            onClick={() => setModalTab('personalia')}
            className={`py-3.5 border-b-2 font-bold text-sm transition-colors flex items-center space-x-2 shrink-0 cursor-pointer ${modalTab === 'personalia' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <User size={16} />
            <span>Personalia & Stilling</span>
          </button>
          <button 
            onClick={() => setModalTab('kompetanse')}
            className={`py-3.5 border-b-2 font-bold text-sm transition-colors flex items-center space-x-2 shrink-0 cursor-pointer ${modalTab === 'kompetanse' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <GraduationCap size={16} />
            <span>Kompetanse & Kurs</span>
          </button>
          <button 
            onClick={() => setModalTab('dokumenter')}
            className={`py-3.5 border-b-2 font-bold text-sm transition-colors flex items-center space-x-2 shrink-0 cursor-pointer ${modalTab === 'dokumenter' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <FolderArchive size={16} />
            <span>Dokumenter & Arkiv</span>
            {formData.dokumenter && formData.dokumenter.length > 0 && (
              <span className="bg-slate-200 text-slate-700 rounded-full px-1.5 py-0.2 text-[10px] font-bold ml-1">
                {formData.dokumenter.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setModalTab('compliance')}
            className={`py-3.5 border-b-2 font-bold text-sm transition-colors flex items-center space-x-2 shrink-0 cursor-pointer ${modalTab === 'compliance' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <ShieldCheck size={16} />
            <span>Compliance & Krav</span>
          </button>
        </div>

        {/* MODAL INNHOLD */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-5 bg-slate-50/40">
          
          {/* FANE 0: NAV & OPPFØLGING (FOR SYKMELDTE) */}
          {modalTab === 'nav' && !isNew && formData.sykefravaer?.aktivt && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
              
              {/* VENSTRE: Lovpålagt Tidslinje (Jus) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="text-indigo-600" size={24} />
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Lovpålagt oppfølging (NAV)</h3>
                      <p className="text-xs text-slate-500">Lovkrav jfr. Arbeidsmiljøloven § 4-6 & Folketrygdloven</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                    Uke {formData.sykefravaer.ukerSyk} av fravær
                  </span>
                </div>
                
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-emerald-200 before:via-amber-200 before:to-slate-200">
                  
                  {/* Uke 4 - Oppfølgingsplan (Nærmer seg frist) */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-amber-500 text-white shadow-sm shrink-0 z-10">
                      <CalendarDays size={16} />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-200 bg-amber-50 shadow-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-amber-900 text-sm">Uke 4: Oppfølgingsplan</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          aiPlanLagret 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'text-amber-700 bg-amber-100/80'
                        }`}>
                          {aiPlanLagret ? 'Utkast klart' : (formData.sykefravaer.oppfolgingsplan?.status || 'Venter')}
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Skal utarbeides innen 15. oktober. KI kan generere førsteutkast basert på standard barnehagetilpasninger.
                      </p>
                      <button 
                        type="button"
                        onClick={() => setVisAiPlanModal(true)}
                        className="mt-3 bg-white text-amber-800 border border-amber-300 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors w-full flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                      >
                        <Sparkles size={14} className="text-amber-600" />
                        <span>{aiPlanLagret ? 'Se / rediger AI-plan' : 'Generer AI-utkast'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Uke 7 - Dialogmøte */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-indigo-600 text-white shadow-sm shrink-0 z-10">
                      <Users size={16} />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-indigo-200 bg-indigo-50/60 shadow-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-800 text-sm">Uke 7: Dialogmøte 1</span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                          Frist 5. nov
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">
                        Arbeidsgiver innkaller arbeidstaker og evt. bedriftshelsetjenesten/sykmelder for å vurdere tiltak og tilrettelegging.
                      </p>
                      
                      <div className="flex flex-col gap-2 pt-2 border-t border-indigo-100">
                        <button
                          type="button"
                          onClick={() => {
                            setInnkallingMoteType('dialogmote1');
                            setVisInnkallingModal(true);
                          }}
                          className="w-full bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
                        >
                          <FileText size={14} className="text-indigo-600 shrink-0" />
                          <span>Innkalling til Dialogmøte 1 (Mal)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDialogmoteType('dialogmote1');
                            setVisDialogmoteModal(true);
                          }}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
                        >
                          <ShieldCheck size={14} className="shrink-0" />
                          <span>NAV Standardreferat & Tiltaksplan</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Uke 26 - Dialogmøte 2 i regi av NAV */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-300 text-slate-700 shadow-sm shrink-0 z-10">
                      <Clock size={16} />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-800 text-sm">Uke 26: Dialogmøte 2 (NAV)</span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Møte i regi av NAV
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mb-3">
                        Innkalling i regi av NAV dersom sykmelding vedvarer over et halvt år. Styrer forbereder innspill og deltar.
                      </p>

                      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setInnkallingMoteType('dialogmote2');
                            setVisInnkallingModal(true);
                          }}
                          className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
                        >
                          <FileText size={14} className="text-slate-600 shrink-0" />
                          <span>Forberedelse til NAV Dialogmøte 2 (Mal)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDialogmoteType('dialogmote2');
                            setVisDialogmoteModal(true);
                          }}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
                        >
                          <ShieldCheck size={14} className="shrink-0" />
                          <span>NAV Møtereferat & Innspill</span>
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* HØYRE: Omsorgspulsen (Kaffepraten & Styrer AI) */}
              <div className="bg-gradient-to-br from-indigo-950 via-[#1e1b4b] to-indigo-900 p-6 rounded-2xl border border-indigo-800 shadow-md text-white flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
                
                <div className="flex items-center space-x-2.5 mb-4 relative z-10">
                  <div className="p-2 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/30">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Styrer AI: Omsorg & Inkludering</h3>
                    <p className="text-xs text-indigo-200 font-medium">Den mellommenneskelige oppfølgingen</p>
                  </div>
                </div>
                
                <p className="text-indigo-100 text-sm leading-relaxed mb-5 relative z-10">
                  {formData.navn} har nå vært borte fra barnehagen i litt over <strong className="text-white font-bold">{formData.sykefravaer.ukerSyk} uker</strong>. Lovverket krever skjemaer, men forskning viser at uformell kontakt er det viktigste for å forhindre utenforskap.
                </p>
                
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 mb-6 relative z-10">
                  <div className="flex items-center space-x-2 mb-2">
                    <Coffee className="text-pink-300" size={18} />
                    <span className="font-bold text-sm text-pink-100">Forslag til tiltak i dag:</span>
                  </div>
                  <p className="text-sm text-white italic leading-relaxed">
                    "Hva med å sende en uformell SMS og invitere {formData.navn.split(' ')[0]} på en kaffeprat utenfor barnehagen (eller en liten gåtur)? Bare for å høre hvordan det går i hverdagen, uten snakk om jobb eller tilrettelegging."
                  </p>
                </div>

                {kontaktLogget && (
                  <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl flex items-center space-x-2 text-xs text-emerald-200 font-medium relative z-10">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <span>Uformell kontakt er registrert! Godt jobbet med å ivareta medarbeideren.</span>
                  </div>
                )}

                <div className="mt-auto flex flex-col space-y-2.5 relative z-10">
                  <button 
                    type="button"
                    onClick={() => setVisSmsModal(true)}
                    className="flex items-center justify-center space-x-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-md cursor-pointer hover:scale-[1.01]"
                  >
                    <MessageCircle size={18} />
                    <span>Lag utkast til uformell SMS</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setKontaktLogget(true);
                      showToast(`Uformell kontakt med ${formData.navn.split(' ')[0]} registrert!`);
                    }}
                    className="text-indigo-200 hover:text-white text-xs font-semibold py-2 transition-colors cursor-pointer hover:underline text-center"
                  >
                    {kontaktLogget ? '✓ Kontakt registrert for denne uken' : 'Jeg har allerede hatt uformell kontakt'}
                  </button>
                </div>
              </div>

            </div>
          )}
          
          {/* FANE 1: COMPLIANCE & KRAV */}
          {modalTab === 'compliance' && (
            <div className="space-y-6">
              
              {/* KRAV 1: POLITIATTEST (DRAG & DROP) */}
              <div className={`p-5 rounded-2xl border-2 transition-colors ${formData.politiattest.status === 'Godkjent' ? 'bg-white border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start space-x-3">
                    <ShieldCheck size={24} className={formData.politiattest.status === 'Godkjent' ? 'text-emerald-500' : 'text-rose-500'} />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className={`font-bold ${formData.politiattest.status === 'Godkjent' ? 'text-slate-800' : 'text-rose-800'}`}>
                          Politiattest (Barnehageloven § 30)
                        </h4>
                        <span className={`text-[11px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${formData.politiattest.status === 'Godkjent' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {formData.politiattest.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Må være fremvist før første vakt. Plettfri vandel kreves.</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      const nyStatus = formData.politiattest.status === 'Godkjent' ? 'Mangler' : 'Godkjent';
                      setFormData(prev => ({
                        ...prev,
                        politiattest: {
                          ...prev.politiattest,
                          status: nyStatus,
                          dato: nyStatus === 'Godkjent' ? new Date().toLocaleDateString('no-NO') : '-'
                        }
                      }));
                    }}
                    className={`shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                      formData.politiattest.status === 'Godkjent' 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200' 
                        : 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700'
                    }`}
                  >
                    {formData.politiattest.status === 'Godkjent' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>{formData.politiattest.status === 'Godkjent' ? 'Godkjent' : 'Godkjenn uten fil'}</span>
                  </button>
                </div>

                {/* DRAG-AND-DROP FELT FOR POLITIATTEST */}
                <DragDropUpload 
                  label="Dra og slipp politiattest her (PDF / bilde)"
                  sublabel="eller klikk for å bla gjennom filer på maskinen din"
                  currentFileName={formData.politiattest.fil}
                  currentFileSize={formData.politiattest.filStorrelse}
                  onFileSelected={(fileName, fileSize, dataUrl) => {
                    setFormData(prev => ({
                      ...prev,
                      politiattest: {
                        status: 'Godkjent',
                        dato: new Date().toLocaleDateString('no-NO'),
                        fil: fileName,
                        filData: dataUrl,
                        filStorrelse: fileSize
                      }
                    }));
                  }}
                  onRemove={() => {
                    setFormData(prev => ({
                      ...prev,
                      politiattest: {
                        status: 'Mangler',
                        dato: '-',
                        fil: null,
                        filData: null,
                        filStorrelse: null
                      }
                    }));
                  }}
                />
              </div>

              {/* KRAV 2: ARBEIDSKONTRAKT (DRAG & DROP) */}
              <div className={`p-5 rounded-2xl border-2 transition-colors ${formData.arbeidskontrakt.status === 'Godkjent' ? 'bg-white border-emerald-200' : 'bg-amber-50/50 border-amber-200'}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start space-x-3">
                    <FileText size={24} className={formData.arbeidskontrakt.status === 'Godkjent' ? 'text-emerald-500' : 'text-amber-500'} />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-slate-800">Arbeidskontrakt & Stillingsavtale</h4>
                        <span className={`text-[11px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${formData.arbeidskontrakt.status === 'Godkjent' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {formData.arbeidskontrakt.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{formData.arbeidskontrakt.info}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      const nyStatus = formData.arbeidskontrakt.status === 'Godkjent' ? 'Mangler' : 'Godkjent';
                      setFormData(prev => ({
                        ...prev,
                        arbeidskontrakt: {
                          ...prev.arbeidskontrakt,
                          status: nyStatus,
                          info: nyStatus === 'Godkjent' ? `Manuelt godkjent ${new Date().toLocaleDateString('no-NO')}` : 'Mangler signert kontrakt'
                        }
                      }));
                    }}
                    className={`shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                      formData.arbeidskontrakt.status === 'Godkjent' 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200' 
                        : 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700'
                    }`}
                  >
                    {formData.arbeidskontrakt.status === 'Godkjent' ? <CheckCircle2 size={14} /> : <FileCheck size={14} />}
                    <span>{formData.arbeidskontrakt.status === 'Godkjent' ? 'Godkjent' : 'Godkjenn manuell'}</span>
                  </button>
                </div>

                {/* DRAG-AND-DROP FELT FOR ARBEIDSKONTRAKT */}
                <DragDropUpload 
                  label="Dra og slipp signert arbeidskontrakt (PDF / DOCX)"
                  sublabel="eller klikk for å laste opp avtale"
                  currentFileName={formData.arbeidskontrakt.fil}
                  currentFileSize={formData.arbeidskontrakt.filStorrelse}
                  onFileSelected={(fileName, fileSize, dataUrl) => {
                    setFormData(prev => ({
                      ...prev,
                      arbeidskontrakt: {
                        status: 'Godkjent',
                        info: `Signert digitalt ${new Date().toLocaleDateString('no-NO')}`,
                        fil: fileName,
                        filData: dataUrl,
                        filStorrelse: fileSize
                      }
                    }));
                  }}
                  onRemove={() => {
                    setFormData(prev => ({
                      ...prev,
                      arbeidskontrakt: {
                        status: 'Mangler',
                        info: 'Mangler signert kontrakt',
                        fil: null,
                        filData: null,
                        filStorrelse: null
                      }
                    }));
                  }}
                />
              </div>

              {/* KRAV 3: TAUSHETSERKLÆRING (NEDLASTBART VEDLEGG + SEND TIL PROFIL) */}
              <div className={`p-5 rounded-2xl border-2 transition-colors ${formData.taushetserklaring.status === 'Godkjent' ? 'bg-white border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start space-x-3">
                    <Lock size={24} className={formData.taushetserklaring.status === 'Godkjent' ? 'text-emerald-500' : 'text-indigo-600'} />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-slate-800">Taushetserklæring (Barnehageloven § 20)</h4>
                        <span className={`text-[11px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          formData.taushetserklaring.status === 'Godkjent' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : formData.taushetserklaring.sendtTilSignering 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {formData.taushetserklaring.status === 'Godkjent' 
                            ? 'Signert' 
                            : formData.taushetserklaring.sendtTilSignering 
                            ? 'Venter på signering' 
                            : 'Mangler'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Lovpålagt for alle som yter tjenester i barnehagen. Skal signeres elektronisk eller skriftlig.
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      const nyStatus = formData.taushetserklaring.status === 'Godkjent' ? 'Mangler' : 'Godkjent';
                      setFormData(prev => ({
                        ...prev,
                        taushetserklaring: {
                          ...prev.taushetserklaring,
                          status: nyStatus,
                          info: nyStatus === 'Godkjent' ? `Signert ${new Date().toLocaleDateString('no-NO')}` : 'Venter på signatur',
                          fil: nyStatus === 'Godkjent' ? (prev.taushetserklaring.fil || 'Taushetserklaring_Signert.pdf') : null
                        }
                      }));
                    }}
                    className={`shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                      formData.taushetserklaring.status === 'Godkjent' 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200' 
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {formData.taushetserklaring.status === 'Godkjent' ? <CheckCircle2 size={14} /> : <Check size={14} />}
                    <span>{formData.taushetserklaring.status === 'Godkjent' ? 'Signert' : 'Marker som signert'}</span>
                  </button>
                </div>

                {/* HANDLINGSBOKS: NEDLASTING & SENDING TIL PROFIL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200/70">
                  
                  {/* KNAPP 1: Last ned vedlegg */}
                  <button
                    type="button"
                    onClick={handleLastNedTaushetserklaringMal}
                    className="flex items-center justify-center space-x-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 transition text-slate-700 hover:text-indigo-700 text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Download size={16} className="text-indigo-600" />
                    <span>Last ned taushetserklæring (PDF-vedlegg)</span>
                  </button>

                  {/* KNAPP 2: Send til den ansattes profil for digital signering */}
                  {!formData.taushetserklaring.sendtTilSignering ? (
                    <button
                      type="button"
                      onClick={handleSendTilSignering}
                      className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <Send size={16} />
                      <span>Send til brukerens profil for signering</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center space-x-2 text-xs font-medium text-amber-800">
                        <Clock size={16} className="text-amber-600 shrink-0" />
                        <span>Sendt til profil ({formData.taushetserklaring.sendtDato})</span>
                      </div>
                      <button
                        type="button"
                        onClick={handlePurrSignering}
                        className="flex items-center space-x-1 text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded transition cursor-pointer"
                        title="Send purrevarsel til den ansattes profil"
                      >
                        <BellRing size={12} />
                        <span>Purr</span>
                      </button>
                    </div>
                  )}

                </div>

                {/* Mulighet for å laste opp ferdig signert erklæring */}
                <div className="mt-3">
                  <DragDropUpload 
                    label="Dra og slipp ferdig signert taushetserklæring her"
                    sublabel="dersom ansatt har signert fysisk eller på papir"
                    currentFileName={formData.taushetserklaring.fil}
                    onFileSelected={(fileName) => {
                      setFormData(prev => ({
                        ...prev,
                        taushetserklaring: {
                          ...prev.taushetserklaring,
                          status: 'Godkjent',
                          info: `Signert dokument arkivert (${new Date().toLocaleDateString('no-NO')})`,
                          fil: fileName
                        }
                      }));
                    }}
                    onRemove={() => {
                      setFormData(prev => ({
                        ...prev,
                        taushetserklaring: {
                          ...prev.taushetserklaring,
                          status: 'Mangler',
                          info: 'Venter på signatur',
                          fil: null
                        }
                      }));
                    }}
                  />
                </div>

              </div>

            </div>
          )}

          {/* FANE 2: KOMPETANSE & KURS (LOVPÅLAGTE KRAV, DATO, VARIGHET OG DOKUMENTASJON) */}
          {modalTab === 'kompetanse' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* STATUS-BANNER */}
              <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Kompetansekrav & Kurs for {formData.navn || 'ansatt'}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Fyll inn dato for gjennomføring, varighet og last opp kursbevis/dokumentasjon for tilsyn.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-xs font-bold shrink-0">
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200">
                    Førstehjelp: {formData.forstehjelp.status}
                  </span>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg border border-amber-200">
                    Brannvern: {formData.brannvern.status}
                  </span>
                </div>
              </div>

              {/* 1. FØRSTEHJELPSKURS I BARNEHAGE */}
              <div className={`p-5 rounded-2xl border-2 transition-colors ${
                formData.forstehjelp.status === 'Gyldig' 
                  ? 'bg-white border-emerald-200' 
                  : formData.forstehjelp.status === 'Utløper snart'
                  ? 'bg-amber-50/40 border-amber-200'
                  : 'bg-rose-50/40 border-rose-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl mt-0.5">
                      <Activity size={22} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-slate-800 text-base">Førstehjelpskurs i barnehagen (HLR & Akuttmedisin)</h4>
                        <span className={`text-[11px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          formData.forstehjelp.status === 'Gyldig' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : formData.forstehjelp.status === 'Utløper snart'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {formData.forstehjelp.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Lovkrav jfr. Forskrift om miljørettet helsevern i barnehager § 11. Anbefalt resertifisering hvert 2. år.
                      </p>
                    </div>
                  </div>

                  {/* Statusvelger */}
                  <div className="shrink-0 flex items-center space-x-2">
                    <label className="text-xs font-bold text-slate-600">Status:</label>
                    <select
                      value={formData.forstehjelp.status}
                      onChange={(e) => {
                        const nyStatus = e.target.value as KursKravItem['status'];
                        setFormData(prev => ({
                          ...prev,
                          forstehjelp: { ...prev.forstehjelp, status: nyStatus }
                        }));
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Gyldig">Gyldig</option>
                      <option value="Utløper snart">Utløper snart</option>
                      <option value="Utløpt">Utløpt</option>
                      <option value="Mangler">Mangler</option>
                      <option value="Ikke påkrevd">Ikke påkrevd</option>
                    </select>
                  </div>
                </div>

                {/* DATOER OG VARIGHET */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gjennomført dato</label>
                    <input 
                      type="text" 
                      value={formData.forstehjelp.gjennomfortDato || formData.forstehjelp.dato || ''} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          forstehjelp: { ...prev.forstehjelp, gjennomfortDato: val, dato: val }
                        }));
                      }}
                      placeholder="F.eks. 15.05.2025"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Varighet / Gyldighet</label>
                    <select 
                      value={formData.forstehjelp.varighetMnd || 24}
                      onChange={(e) => {
                        const mnd = Number(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          forstehjelp: { ...prev.forstehjelp, varighetMnd: mnd }
                        }));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value={12}>1 år (12 mnd)</option>
                      <option value={24}>2 år (24 mnd - standard)</option>
                      <option value={36}>3 år (36 mnd)</option>
                      <option value={60}>5 år</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kursleverandør / Instruktør</label>
                    <input 
                      type="text" 
                      value={formData.forstehjelp.utsteder || ''} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          forstehjelp: { ...prev.forstehjelp, utsteder: val }
                        }));
                      }}
                      placeholder="F.eks. Røde Kors Førstehjelp"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {/* DOKUMENTASJON / KURSBEVIS */}
                <DragDropUpload 
                  label="Dra og slipp kursbevis for førstehjelp her (PDF / bilde)"
                  sublabel="eller klikk for å laste opp diplom/sertifikat"
                  currentFileName={formData.forstehjelp.fil}
                  currentFileSize={formData.forstehjelp.filStorrelse}
                  onFileSelected={(fileName, fileSize, dataUrl) => {
                    setFormData(prev => ({
                      ...prev,
                      forstehjelp: {
                        ...prev.forstehjelp,
                        status: 'Gyldig',
                        fil: fileName,
                        filData: dataUrl,
                        filStorrelse: fileSize
                      }
                    }));
                  }}
                  onRemove={() => {
                    setFormData(prev => ({
                      ...prev,
                      forstehjelp: {
                        ...prev.forstehjelp,
                        fil: null,
                        filData: null,
                        filStorrelse: null
                      }
                    }));
                  }}
                />
              </div>

              {/* 2. LIVREDNING I VANN / BADEVAKTPRØVE */}
              <div className={`p-5 rounded-2xl border-2 transition-colors ${
                formData.livredning.status === 'Gyldig' 
                  ? 'bg-white border-emerald-200' 
                  : formData.livredning.status === 'Utløper snart'
                  ? 'bg-amber-50/40 border-amber-200'
                  : formData.livredning.status === 'Ikke påkrevd'
                  ? 'bg-slate-50/60 border-slate-200'
                  : 'bg-rose-50/40 border-rose-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-xl mt-0.5">
                      <Droplets size={22} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-slate-800 text-base">Livredning i vann / Badevaktprøve</h4>
                        <span className={`text-[11px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          formData.livredning.status === 'Gyldig' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : formData.livredning.status === 'Utløper snart'
                            ? 'bg-amber-100 text-amber-800'
                            : formData.livredning.status === 'Ikke påkrevd'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {formData.livredning.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Påkrevd for ansatte som er med på turer til basseng, strand eller vann. Gyldig i 1 år.
                      </p>
                    </div>
                  </div>

                  {/* Statusvelger */}
                  <div className="shrink-0 flex items-center space-x-2">
                    <label className="text-xs font-bold text-slate-600">Status:</label>
                    <select
                      value={formData.livredning.status}
                      onChange={(e) => {
                        const nyStatus = e.target.value as KursKravItem['status'];
                        setFormData(prev => ({
                          ...prev,
                          livredning: { ...prev.livredning, status: nyStatus }
                        }));
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Gyldig">Gyldig</option>
                      <option value="Utløper snart">Utløper snart</option>
                      <option value="Utløpt">Utløpt</option>
                      <option value="Mangler">Mangler</option>
                      <option value="Ikke påkrevd">Ikke påkrevd</option>
                    </select>
                  </div>
                </div>

                {/* DATOER OG VARIGHET */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gjennomført dato</label>
                    <input 
                      type="text" 
                      value={formData.livredning.gjennomfortDato || formData.livredning.dato || ''} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          livredning: { ...prev.livredning, gjennomfortDato: val, dato: val }
                        }));
                      }}
                      placeholder="F.eks. 01.06.2025"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Varighet / Gyldighet</label>
                    <select 
                      value={formData.livredning.varighetMnd || 12}
                      onChange={(e) => {
                        const mnd = Number(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          livredning: { ...prev.livredning, varighetMnd: mnd }
                        }));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value={12}>1 år (12 mnd - årlig prøve)</option>
                      <option value={24}>2 år (24 mnd)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Livredningsinstruktør</label>
                    <input 
                      type="text" 
                      value={formData.livredning.utsteder || ''} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          livredning: { ...prev.livredning, utsteder: val }
                        }));
                      }}
                      placeholder="F.eks. Norges Livredningsselskap"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {/* DOKUMENTASJON / BADEVAKTDIPLOM */}
                <DragDropUpload 
                  label="Dra og slipp livredningsbevis / godkjent prøveprotokoll her"
                  sublabel="eller klikk for å laste opp prøvebevis"
                  currentFileName={formData.livredning.fil}
                  currentFileSize={formData.livredning.filStorrelse}
                  onFileSelected={(fileName, fileSize, dataUrl) => {
                    setFormData(prev => ({
                      ...prev,
                      livredning: {
                        ...prev.livredning,
                        status: 'Gyldig',
                        fil: fileName,
                        filData: dataUrl,
                        filStorrelse: fileSize
                      }
                    }));
                  }}
                  onRemove={() => {
                    setFormData(prev => ({
                      ...prev,
                      livredning: {
                        ...prev.livredning,
                        fil: null,
                        filData: null,
                        filStorrelse: null
                      }
                    }));
                  }}
                />
              </div>

              {/* 3. BRANNVERN & PRAKTISK SLOKKEØVELSE */}
              <div className={`p-5 rounded-2xl border-2 transition-colors ${
                formData.brannvern.status === 'Gyldig' 
                  ? 'bg-white border-emerald-200' 
                  : formData.brannvern.status === 'Utløper snart'
                  ? 'bg-amber-50/40 border-amber-200'
                  : 'bg-rose-50/40 border-rose-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-amber-100 text-amber-700 rounded-xl mt-0.5">
                      <Flame size={22} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-slate-800 text-base">Brannvern & Praktisk Slokkeøvelse</h4>
                        <span className={`text-[11px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          formData.brannvern.status === 'Gyldig' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : formData.brannvern.status === 'Utløper snart'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {formData.brannvern.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Forskrift om brannforebygging § 12. Alle ansatte skal ha årlig opplæring og delta på brannøvelser.
                      </p>
                    </div>
                  </div>

                  {/* Statusvelger */}
                  <div className="shrink-0 flex items-center space-x-2">
                    <label className="text-xs font-bold text-slate-600">Status:</label>
                    <select
                      value={formData.brannvern.status}
                      onChange={(e) => {
                        const nyStatus = e.target.value as KursKravItem['status'];
                        setFormData(prev => ({
                          ...prev,
                          brannvern: { ...prev.brannvern, status: nyStatus }
                        }));
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Gyldig">Gyldig</option>
                      <option value="Utløper snart">Utløper snart</option>
                      <option value="Utløpt">Utløpt</option>
                      <option value="Mangler">Mangler</option>
                      <option value="Ikke påkrevd">Ikke påkrevd</option>
                    </select>
                  </div>
                </div>

                {/* DATOER OG VARIGHET */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gjennomført dato</label>
                    <input 
                      type="text" 
                      value={formData.brannvern.gjennomfortDato || formData.brannvern.dato || ''} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          brannvern: { ...prev.brannvern, gjennomfortDato: val, dato: val }
                        }));
                      }}
                      placeholder="F.eks. 15.01.2026"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Varighet / Gyldighet</label>
                    <select 
                      value={formData.brannvern.varighetMnd || 12}
                      onChange={(e) => {
                        const mnd = Number(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          brannvern: { ...prev.brannvern, varighetMnd: mnd }
                        }));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value={12}>1 år (12 mnd - årlig)</option>
                      <option value={24}>2 år (24 mnd)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Utsteder / Brannansvarlig</label>
                    <input 
                      type="text" 
                      value={formData.brannvern.utsteder || ''} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          brannvern: { ...prev.brannvern, utsteder: val }
                        }));
                      }}
                      placeholder="F.eks. Lokalt Brannvesen / Firesafe"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {/* DOKUMENTASJON / SLOKKEBEVIS */}
                <DragDropUpload 
                  label="Dra og slipp bevis for slokkeøvelse / brannverndiplom her"
                  sublabel="eller klikk for å laste opp dokumentasjon"
                  currentFileName={formData.brannvern.fil}
                  currentFileSize={formData.brannvern.filStorrelse}
                  onFileSelected={(fileName, fileSize, dataUrl) => {
                    setFormData(prev => ({
                      ...prev,
                      brannvern: {
                        ...prev.brannvern,
                        status: 'Gyldig',
                        fil: fileName,
                        filData: dataUrl,
                        filStorrelse: fileSize
                      }
                    }));
                  }}
                  onRemove={() => {
                    setFormData(prev => ({
                      ...prev,
                      brannvern: {
                        ...prev.brannvern,
                        fil: null,
                        filData: null,
                        filStorrelse: null
                      }
                    }));
                  }}
                />
              </div>

              {/* 4. HMS-OPPLÆRING & VERNERUNDE */}
              <div className={`p-5 rounded-2xl border-2 transition-colors ${
                formData.hmsGjennomgang.status === 'Godkjent' || formData.hmsGjennomgang.status === 'Gyldig'
                  ? 'bg-white border-emerald-200' 
                  : 'bg-rose-50/40 border-rose-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl mt-0.5">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-slate-800 text-base">HMS-introduksjon & Vernerunde</h4>
                        <span className={`text-[11px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          formData.hmsGjennomgang.status === 'Godkjent' || formData.hmsGjennomgang.status === 'Gyldig'
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {formData.hmsGjennomgang.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Gjennomgang av barnehagens internkontroll, rømningsveier, verneutstyr og avviksrutiner.
                      </p>
                    </div>
                  </div>

                  {/* Statusvelger */}
                  <div className="shrink-0 flex items-center space-x-2">
                    <label className="text-xs font-bold text-slate-600">Status:</label>
                    <select
                      value={formData.hmsGjennomgang.status}
                      onChange={(e) => {
                        const nyStatus = e.target.value as KursKravItem['status'];
                        setFormData(prev => ({
                          ...prev,
                          hmsGjennomgang: { ...prev.hmsGjennomgang, status: nyStatus }
                        }));
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Godkjent">Godkjent</option>
                      <option value="Gyldig">Gyldig</option>
                      <option value="Mangler">Mangler</option>
                    </select>
                  </div>
                </div>

                {/* DATO OG INFO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gjennomført dato / Info</label>
                    <input 
                      type="text" 
                      value={formData.hmsGjennomgang.info || formData.hmsGjennomgang.dato || ''} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          hmsGjennomgang: { ...prev.hmsGjennomgang, info: val, dato: val }
                        }));
                      }}
                      placeholder="F.eks. Gjennomført Jan 2026 med Styrer"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ansvarlig for opplæring</label>
                    <input 
                      type="text" 
                      value={formData.hmsGjennomgang.utsteder || 'Styrer / Verneombud'} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          hmsGjennomgang: { ...prev.hmsGjennomgang, utsteder: val }
                        }));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {/* DOKUMENTASJON */}
                <DragDropUpload 
                  label="Dra og slipp signert HMS-sjekkliste / introduksjonsprotokoll her"
                  sublabel="eller klikk for å laste opp fil"
                  currentFileName={formData.hmsGjennomgang.fil}
                  currentFileSize={formData.hmsGjennomgang.filStorrelse}
                  onFileSelected={(fileName, fileSize, dataUrl) => {
                    setFormData(prev => ({
                      ...prev,
                      hmsGjennomgang: {
                        ...prev.hmsGjennomgang,
                        status: 'Godkjent',
                        fil: fileName,
                        filData: dataUrl,
                        filStorrelse: fileSize
                      }
                    }));
                  }}
                  onRemove={() => {
                    setFormData(prev => ({
                      ...prev,
                      hmsGjennomgang: {
                        ...prev.hmsGjennomgang,
                        fil: null,
                        filData: null,
                        filStorrelse: null
                      }
                    }));
                  }}
                />
              </div>

            </div>
          )}

          {/* FANE 3: PERSONALIA & STILLING */}
          {modalTab === 'personalia' && (
            <div className="space-y-6 animate-in fade-in duration-200 pb-8">
              
              {/* SEKSJON 1: STILLING OG PERSONALIA */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                  <User className="text-indigo-600" size={18} />
                  <h3 className="font-bold text-slate-800 text-sm">Stilling & Personalia</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Fullt navn</label>
                    <input 
                      type="text" 
                      value={formData.navn} 
                      onChange={(e) => setFormData(prev => ({ ...prev, navn: e.target.value }))}
                      placeholder="F.eks. Kari Nordmann"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>

                  {/* INNEBYGD KALENDERDESIGN FOR FØDSELSDATO */}
                  <div>
                    <AppDatePicker 
                      label="Fødselsdato"
                      value={formData.fodselsdato || ''}
                      onChange={(nyDato) => setFormData(prev => ({ ...prev, fodselsdato: nyDato }))}
                      onOpenChange={(open) => setKalenderApen(open)}
                      placeholder="Velg fødselsdato..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Systemrolle</label>
                    <select 
                      value={formData.rolle}
                      onChange={(e) => setFormData(prev => ({ ...prev, rolle: e.target.value }))}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                      <option value="Pedagogisk leder">Pedagogisk leder</option>
                      <option value="Fagarbeider">Fagarbeider</option>
                      <option value="Assistent">Assistent</option>
                      <option value="Vikar">Vikar</option>
                      <option value="Styrer">Styrer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tilhørighet (Base)</label>
                    <select 
                      value={formData.base}
                      onChange={(e) => setFormData(prev => ({ ...prev, base: e.target.value }))}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                      <option value="Trollstua">Trollstua</option>
                      <option value="Multemyra">Multemyra</option>
                      <option value="Klatremus">Klatremus</option>
                      <option value="Bjørnehiet">Bjørnehiet</option>
                      <option value="Flytende">Flytende (Vikar)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Stillingsprosent (%)</label>
                    <input 
                      type="number" 
                      value={formData.prosent} 
                      onChange={(e) => setFormData(prev => ({ ...prev, prosent: Number(e.target.value) }))}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ansattdato / Tiltredelse</label>
                    <input 
                      type="text" 
                      value={formData.ansattDato} 
                      onChange={(e) => setFormData(prev => ({ ...prev, ansattDato: e.target.value }))}
                      placeholder="F.eks. 01. okt 2021"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                </div>
              </div>

              {/* SEKSJON 2: KONTAKTINFORMASJON */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                  <Mail className="text-indigo-600" size={18} />
                  <h3 className="font-bold text-slate-800 text-sm">Kontaktinformasjon</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <MapPin size={14} className="text-slate-500" />
                      <span>Adresse</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.adresse || ''} 
                      onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
                      placeholder="F.eks. Eventyrveien 14, 0870 Oslo"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Phone size={14} className="text-slate-500" />
                      <span>Telefonnummer</span>
                    </label>
                    <input 
                      type="tel" 
                      value={formData.telefon || ''} 
                      onChange={(e) => setFormData(prev => ({ ...prev, telefon: e.target.value }))}
                      placeholder="F.eks. 987 65 432"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Mail size={14} className="text-slate-500" />
                      <span>E-post 1 (jobb)</span>
                    </label>
                    <input 
                      type="email" 
                      value={formData.epostJobb || ''} 
                      onChange={(e) => setFormData(prev => ({ ...prev, epostJobb: e.target.value }))}
                      placeholder="navn@eventyrskogen.no"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Mail size={14} className="text-slate-400" />
                      <span>E-post 2 (privat)</span>
                    </label>
                    <input 
                      type="email" 
                      value={formData.epostPrivat || ''} 
                      onChange={(e) => setFormData(prev => ({ ...prev, epostPrivat: e.target.value }))}
                      placeholder="privat@epost.no"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                </div>
              </div>

              {/* SEKSJON 3: NEXT OF KIN / NÆRMESTE PÅRØRENDE */}
              <div className="bg-amber-50/50 p-5 rounded-xl border border-amber-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
                  <div className="flex items-center space-x-2">
                    <Heart className="text-rose-600 fill-rose-100" size={18} />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Next of Kin / Nærmeste pårørende</h3>
                      <p className="text-xs text-slate-500">Kontaktperson som skal varsles dersom det skal oppstå noe (akutt hendelse eller sykdom)</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100/80 px-2.5 py-0.5 rounded-full">Varsling</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Pårørende navn</label>
                    <input 
                      type="text" 
                      value={formData.parorendeNavn || ''} 
                      onChange={(e) => setFormData(prev => ({ ...prev, parorendeNavn: e.target.value }))}
                      placeholder="F.eks. Lars Solheim"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nær relasjon</label>
                    <select 
                      value={formData.parorendeRelasjon || 'Ektefelle'}
                      onChange={(e) => setFormData(prev => ({ ...prev, parorendeRelasjon: e.target.value }))}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                      <option value="Ektefelle">Ektefelle</option>
                      <option value="Samboer">Samboer</option>
                      <option value="Partner">Partner</option>
                      <option value="Mor / Far">Mor / Far</option>
                      <option value="Søsken">Søsken</option>
                      <option value="Barn">Barn (myndig)</option>
                      <option value="Annen nær relasjon">Annen nær relasjon</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Phone size={14} className="text-rose-600" />
                      <span>Telefon (pårørende)</span>
                    </label>
                    <input 
                      type="tel" 
                      value={formData.parorendeTelefon || ''} 
                      onChange={(e) => setFormData(prev => ({ ...prev, parorendeTelefon: e.target.value }))}
                      placeholder="F.eks. 912 34 567"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* FANE 4: DOKUMENTER & ARKIV (OPPFØLGING, MEDARBEIDERSAMTALER, KONTRAKTER, BEVIS) */}
          {modalTab === 'dokumenter' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* TOPP-BANNER MED STATISTIKK OG HURTIGHANDLINGER */}
              <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-indigo-200 border border-white/15 shrink-0">
                      <FolderArchive size={26} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-white">Personalmappe & Dokumentarkiv</h3>
                        <span className="bg-indigo-500/40 border border-indigo-400/40 px-2.5 py-0.5 rounded-full text-xs font-bold text-indigo-100">
                          {(formData.dokumenter || []).length} dokumenter
                        </span>
                      </div>
                      <p className="text-xs text-indigo-200 mt-1 max-w-xl leading-relaxed">
                        Arkiv over oppfølgingsplaner, referater fra medarbeidersamtaler, signerte kontrakter og kursbevis for {formData.navn || 'ansatt'}.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setVisNyMedarbeidersamtaleModal(true)}
                      className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      <HeartHandshake size={15} />
                      <span>Ny medarbeidersamtale (Mal)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNyttDokData({
                          tittel: '',
                          kategori: 'Oppfølging & NAV',
                          dato: new Date().toLocaleDateString('no-NO'),
                          notat: '',
                          filnavn: '',
                          storrelse: '1.0 MB',
                          filData: null
                        });
                        setVisOpplastDokumentModal(true);
                      }}
                      className="flex items-center space-x-1.5 bg-white text-indigo-900 hover:bg-indigo-50 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      <Plus size={15} className="text-indigo-700" />
                      <span>Last opp dokument</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SØK OG KATEGORIFILTER */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                {/* Kategori-piller */}
                <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
                  {(['Alle', 'Oppfølging & NAV', 'Medarbeidersamtale', 'Arbeidsavtale & Kontrakt', 'Kompetanse & Kurs', 'Annet'] as const).map(kat => {
                    const antall = kat === 'Alle' 
                      ? (formData.dokumenter || []).length 
                      : (formData.dokumenter || []).filter(d => d.kategori === kat).length;
                    
                    return (
                      <button
                        key={kat}
                        type="button"
                        onClick={() => setDokKategoriFilter(kat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                          dokKategoriFilter === kat 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span>{kat}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${dokKategoriFilter === kat ? 'bg-indigo-800 text-white' : 'bg-white text-slate-600'}`}>
                          {antall}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Søkefelt */}
                <div className="relative shrink-0 sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={dokSoketekst}
                    onChange={(e) => setDokSoketekst(e.target.value)}
                    placeholder="Søk i dokumenter..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                  />
                  {dokSoketekst && (
                    <button 
                      onClick={() => setDokSoketekst('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* DOKUMENTLISTE */}
              {(() => {
                const filtrerte = (formData.dokumenter || []).filter(dok => {
                  const matcherKategori = dokKategoriFilter === 'Alle' || dok.kategori === dokKategoriFilter;
                  const matcherSok = dokSoketekst === '' || 
                    dok.tittel.toLowerCase().includes(dokSoketekst.toLowerCase()) ||
                    dok.filnavn.toLowerCase().includes(dokSoketekst.toLowerCase()) ||
                    (dok.notat && dok.notat.toLowerCase().includes(dokSoketekst.toLowerCase())) ||
                    (dok.tags && dok.tags.some(t => t.toLowerCase().includes(dokSoketekst.toLowerCase())));
                  return matcherKategori && matcherSok;
                });

                if (filtrerte.length === 0) {
                  return (
                    <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl bg-white text-center flex flex-col items-center justify-center">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full mb-3">
                        <FolderArchive size={32} />
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">Ingen dokumenter funnet</h4>
                      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                        {dokSoketekst || dokKategoriFilter !== 'Alle' 
                          ? 'Prøv å endre filter eller søkeord.' 
                          : `Det er foreløpig ingen opplastede dokumenter i personalmappen for ${formData.navn}.`}
                      </p>
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => setVisNyMedarbeidersamtaleModal(true)}
                          className="px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          + Gjennomfør medarbeidersamtale
                        </button>
                        <button
                          type="button"
                          onClick={() => setVisOpplastDokumentModal(true)}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          + Last opp dokument
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtrerte.map((dok) => {
                      // Kategori-farger
                      let kategoriFarge = 'bg-slate-100 text-slate-700 border-slate-200';
                      let kategoriIkon = <FileText size={16} className="text-slate-600" />;

                      if (dok.kategori === 'Oppfølging & NAV') {
                        kategoriFarge = 'bg-rose-50 text-rose-700 border-rose-200';
                        kategoriIkon = <Stethoscope size={16} className="text-rose-600" />;
                      } else if (dok.kategori === 'Medarbeidersamtale') {
                        kategoriFarge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        kategoriIkon = <HeartHandshake size={16} className="text-emerald-600" />;
                      } else if (dok.kategori === 'Arbeidsavtale & Kontrakt') {
                        kategoriFarge = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                        kategoriIkon = <ShieldCheck size={16} className="text-indigo-600" />;
                      } else if (dok.kategori === 'Kompetanse & Kurs') {
                        kategoriFarge = 'bg-amber-50 text-amber-700 border-amber-200';
                        kategoriIkon = <GraduationCap size={16} className="text-amber-600" />;
                      }

                      return (
                        <div 
                          key={dok.id} 
                          className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                        >
                          <div>
                            {/* Topp-rad med kategori og dato */}
                            <div className="flex items-start justify-between gap-2 mb-2.5">
                              <span className={`inline-flex items-center space-x-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${kategoriFarge}`}>
                                {kategoriIkon}
                                <span className="ml-1">{dok.kategori}</span>
                              </span>
                              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                <Calendar size={11} />
                                {dok.dato}
                              </span>
                            </div>

                            {/* Tittel og filnavn */}
                            <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors leading-snug">
                              {dok.tittel}
                            </h4>
                            
                            <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                              <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 truncate max-w-[200px]">
                                {dok.filnavn}
                              </span>
                              <span>•</span>
                              <span>{dok.storrelse || '1.2 MB'}</span>
                            </div>

                            {/* Notat / Sammendrag */}
                            {dok.notat && (
                              <p className="text-xs text-slate-600 mt-2.5 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 leading-relaxed italic">
                                "{dok.notat}"
                              </p>
                            )}

                            {/* Tagger */}
                            {dok.tags && dok.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2.5">
                                {dok.tags.map((t, idx) => (
                                  <span key={idx} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Handlingsknapper i bunn */}
                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
                            <span className="text-[11px] text-slate-400 font-medium">
                              Av: {dok.opprettetAv || 'Styrer'}
                            </span>

                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => setValgtDokument(dok)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                title="Forhåndsvis og se detaljer"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    const doc = new jsPDF();
                                    doc.setFillColor(30, 27, 75);
                                    doc.rect(0, 0, 210, 32, 'F');
                                    doc.setFont('helvetica', 'bold');
                                    doc.setFontSize(14);
                                    doc.setTextColor(255, 255, 255);
                                    doc.text(dok.tittel.toUpperCase(), 15, 14);
                                    doc.setFontSize(8.5);
                                    doc.setFont('helvetica', 'normal');
                                    doc.setTextColor(199, 210, 254);
                                    doc.text(`Kategori: ${dok.kategori} | Ansatt: ${formData.navn} | Eventyrskogen Barnehage`, 15, 22);

                                    doc.setFillColor(248, 250, 252);
                                    doc.setDrawColor(226, 232, 240);
                                    doc.roundedRect(15, 42, 180, 26, 2, 2, 'FD');
                                    doc.setFont('helvetica', 'bold');
                                    doc.setFontSize(10);
                                    doc.setTextColor(15, 23, 42);
                                    doc.text(`Dokument: ${dok.filnavn}`, 20, 50);
                                    doc.setFont('helvetica', 'normal');
                                    doc.setFontSize(8.5);
                                    doc.setTextColor(71, 85, 105);
                                    doc.text(`Registrert dato: ${dok.dato} | Opprettet av: ${dok.opprettetAv || 'Styrer'}`, 20, 58);

                                    if (dok.notat) {
                                      doc.setFont('helvetica', 'bold');
                                      doc.setFontSize(9.5);
                                      doc.setTextColor(30, 41, 59);
                                      doc.text('Notat og referat:', 15, 80);
                                      doc.setFont('helvetica', 'normal');
                                      doc.setFontSize(8.5);
                                      doc.setTextColor(71, 85, 105);
                                      const lines = doc.splitTextToSize(dok.notat, 180);
                                      doc.text(lines, 15, 88);
                                    }

                                    doc.save(`${dok.filnavn.replace(/\.[^/.]+$/, '')}_${formData.navn.replace(/\s+/g, '_')}.pdf`);
                                    showToast(`Lastet ned: ${dok.filnavn}`);
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                                title="Last ned dokument som PDF"
                              >
                                <Download size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    dokumenter: (prev.dokumenter || []).filter(d => d.id !== dok.id)
                                  }));
                                  showToast(`Dokument "${dok.tittel}" er slettet fra arkivet.`);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Slett dokument"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          {!isNew ? (
            <button 
              onClick={handleEksporterPdf}
              className="flex items-center space-x-2 text-slate-500 hover:text-indigo-600 font-medium text-sm transition-colors cursor-pointer"
            >
              <Download size={16} />
              <span>Eksportér ansattmappe</span>
            </button>
          ) : <div></div>}
          
          <div className="flex space-x-3">
            <button 
              onClick={onClose} 
              className="px-4 py-2 rounded-lg text-slate-600 font-bold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Avbryt
            </button>
            <button 
              onClick={() => onSave(formData)}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-sm cursor-pointer"
            >
              <Save size={18} />
              <span>Lagre endringer</span>
            </button>
          </div>
        </div>

      </div>

      {/* MODAL: UTKAST TIL UFORMELL SMS */}
      {visSmsModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-pink-100 text-pink-600 rounded-xl">
                  <MessageCircle size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">Uformell SMS til {formData.navn.split(' ')[0]}</h4>
                  <p className="text-xs text-slate-500">Styrer AI: Omsorgspulsen</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setVisSmsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Meldingsinnhold (kan redigeres fritt):</label>
              <textarea
                value={smsTekst}
                onChange={(e) => setSmsTekst(e.target.value)}
                rows={4}
                className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none leading-relaxed resize-none"
              />
              <p className="text-[11px] text-slate-400 italic">
                Tips: Hold meldingen varm, forventningsfri og uten fokus på sykmeldingsgrad eller plikter.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(smsTekst);
                  setSmsKopiert(true);
                  setTimeout(() => setSmsKopiert(false), 2000);
                }}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {smsKopiert ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{smsKopiert ? 'Kopiert til utklipp!' : 'Kopier tekst'}</span>
              </button>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setVisSmsModal(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Lukk
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setKontaktLogget(true);
                    setVisSmsModal(false);
                    showToast(`SMS-kontakt med ${formData.navn.split(' ')[0]} er sendt og logget!`);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Send size={14} />
                  <span>Marker som sendt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REDIGERBAR KI-OPPFØLGINGSPLAN FOR BARNEHAGEN */}
      {visAiPlanModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-5 flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-white/20 rounded-xl">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-lg">Oppfølgingsplan: Barnehagetilpasninger (AML § 4-6)</h4>
                  <p className="text-xs text-amber-100 mt-0.5">
                    Gjelder {formData.navn} ({formData.rolle}, {formData.base}) • Frist: Uke 4
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setVisAiPlanModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Innhold / Redigerbare felt */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <span className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-amber-700" />
                  KI har generert tilpasninger. Du kan redigere alle punktene fritt nedenfor:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOppfolgingsplanData({
                      ergonomi: 'Fritak fra tunge løft i stellesituasjoner og av/påkledning i småbarnsgarderoben. Hev/senk stellebord benyttes fast.',
                      arbeidstid: 'Faste midtvakter (08:30 – 15:30) for å unngå stress med aleneansvar ved åpning og stenging.',
                      didaktisk: '20% økt planleggingstid skjermet på pauserommet med pedagogisk forberedelse og dokumentasjon.',
                      tilbakeforing: 'Vurdere 40% gradert friskmelding fra uke 5 etter oppfølgingssamtale.',
                      egneTiltak: 'Samarbeid med pedagogisk leder om å fordele fysiske oppgaver til assisterende personell.'
                    });
                    showToast('Standard KI-forslag gjenopprettet!');
                  }}
                  className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-lg text-[11px] transition cursor-pointer"
                >
                  Regenerer KI-forslag
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Ergonomisk avlastning & fysiske oppgaver i barnehagen
                </label>
                <textarea 
                  value={oppfolgingsplanData.ergonomi}
                  onChange={(e) => setOppfolgingsplanData(prev => ({ ...prev, ergonomi: e.target.value }))}
                  rows={2}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Skjermet arbeidstid & vaktjusteringer
                </label>
                <textarea 
                  value={oppfolgingsplanData.arbeidstid}
                  onChange={(e) => setOppfolgingsplanData(prev => ({ ...prev, arbeidstid: e.target.value }))}
                  rows={2}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. Didaktiske oppgaver & pedagogisk forberedelse
                </label>
                <textarea 
                  value={oppfolgingsplanData.didaktisk}
                  onChange={(e) => setOppfolgingsplanData(prev => ({ ...prev, didaktisk: e.target.value }))}
                  rows={2}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4. Plan for gradvis tilbakeføring & friskmelding
                </label>
                <textarea 
                  value={oppfolgingsplanData.tilbakeforing}
                  onChange={(e) => setOppfolgingsplanData(prev => ({ ...prev, tilbakeforing: e.target.value }))}
                  rows={2}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  5. Egne merknader og avtaler mellom leder og ansatt
                </label>
                <textarea 
                  value={oppfolgingsplanData.egneTiltak}
                  onChange={(e) => setOppfolgingsplanData(prev => ({ ...prev, egneTiltak: e.target.value }))}
                  rows={2}
                  placeholder="Skriv inn eventuelle særavtaler..."
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none leading-relaxed"
                />
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  try {
                    const doc = new jsPDF();
                    doc.setFillColor(30, 27, 75);
                    doc.rect(0, 0, 210, 30, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(14);
                    doc.setTextColor(255, 255, 255);
                    doc.text('LOVPÅLAGT OPPFØLGINGSPLAN VED SYKEFRAVÆR', 15, 14);
                    doc.setFontSize(8.5);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(199, 210, 254);
                    doc.text('Jfr. Arbeidsmiljøloven § 4-6 & Folketrygdloven § 8-7 | Eventyrskogen Barnehage', 15, 22);

                    let y = 42;
                    doc.setFillColor(248, 250, 252);
                    doc.setDrawColor(226, 232, 240);
                    doc.roundedRect(15, y, 180, 22, 2, 2, 'FD');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.setTextColor(15, 23, 42);
                    doc.text(`Ansatt: ${formData.navn} (${formData.rolle}, ${formData.base})`, 20, y + 8);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(71, 85, 105);
                    doc.text(`Opprettet: ${new Date().toLocaleDateString('no-NO')}  |  Leder: Karoline Haug (Styrer)`, 20, y + 15);

                    y += 30;

                    const punkter = [
                      { tit: '1. Ergonomisk tilrettelegging:', txt: oppfolgingsplanData.ergonomi },
                      { tit: '2. Arbeidstidsjusteringer & vakter:', txt: oppfolgingsplanData.arbeidstid },
                      { tit: '3. Didaktiske oppgaver & forberedelse:', txt: oppfolgingsplanData.didaktisk },
                      { tit: '4. Plan for gradvis tilbakeføring:', txt: oppfolgingsplanData.tilbakeforing },
                      { tit: '5. Tilleggsmerknader:', txt: oppfolgingsplanData.egneTiltak }
                    ];

                    punkter.forEach(p => {
                      doc.setFont('helvetica', 'bold');
                      doc.setFontSize(8.5);
                      doc.setTextColor(30, 41, 59);
                      doc.text(p.tit, 18, y);
                      doc.setFont('helvetica', 'normal');
                      doc.setTextColor(71, 85, 105);
                      const lines = doc.splitTextToSize(p.txt, 170);
                      doc.text(lines, 22, y + 4.5);
                      y += 8 + (lines.length * 4.5);
                    });

                    doc.save(`Oppfolgingsplan_${formData.navn.replace(/\s+/g, '_')}.pdf`);
                    showToast('Oppfølgingsplan lastet ned som PDF!');
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-amber-700 transition cursor-pointer"
              >
                <Download size={15} />
                <span>Last ned plan (PDF)</span>
              </button>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setVisAiPlanModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAiPlanLagret(true);
                    setVisAiPlanModal(false);
                    showToast('Oppdatert oppfølgingsplan er lagret!');
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>Lagre endringer i planen</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: INNKALLING TIL DIALOGMØTE 1 ELLER 2 */}
      {visInnkallingModal && (
        <DialogmoteInnkallingModal 
          ansattNavn={formData.navn}
          ansattRolle={formData.rolle}
          ansattBase={formData.base}
          moteType={innkallingMoteType}
          onClose={() => setVisInnkallingModal(false)}
          onToast={showToast}
        />
      )}

      {/* MODAL: NAV STANDARDMAL FOR DIALOGMØTE 1 ELLER 2 */}
      {visDialogmoteModal && (
        <DialogmoteModal 
          ansattNavn={formData.navn}
          ansattRolle={formData.rolle}
          ansattBase={formData.base}
          ansattFodselsdato={formData.fodselsdato || '03.09.1991'}
          moteType={dialogmoteType}
          onClose={() => setVisDialogmoteModal(false)}
          onToast={showToast}
        />
      )}

      {/* MODAL: LAST OPP NYTT DOKUMENT */}
      {visOpplastDokumentModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
            <div className="bg-indigo-900 text-white p-5 flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-800 rounded-xl">
                  <FolderArchive size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-base">Last opp dokument til arkiv</h4>
                  <p className="text-xs text-indigo-200 mt-0.5">For {formData.navn || 'ansatt'} ({formData.rolle})</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setVisOpplastDokumentModal(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dokumenttittel *</label>
                <input
                  type="text"
                  value={nyttDokData.tittel}
                  onChange={(e) => setNyttDokData(prev => ({ ...prev, tittel: e.target.value }))}
                  placeholder="F.eks. Referat fra oppfølgingsmøte høst 2026"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={nyttDokData.kategori}
                    onChange={(e) => setNyttDokData(prev => ({ ...prev, kategori: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Oppfølging & NAV">Oppfølging & NAV</option>
                    <option value="Medarbeidersamtale">Medarbeidersamtale</option>
                    <option value="Arbeidsavtale & Kontrakt">Arbeidsavtale & Kontrakt</option>
                    <option value="Kompetanse & Kurs">Kompetanse & Kurs</option>
                    <option value="Annet">Annet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dato</label>
                  <input
                    type="text"
                    value={nyttDokData.dato}
                    onChange={(e) => setNyttDokData(prev => ({ ...prev, dato: e.target.value }))}
                    placeholder="DD.MM.YYYY"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notat / Sammendrag (valgfritt)</label>
                <textarea
                  value={nyttDokData.notat}
                  onChange={(e) => setNyttDokData(prev => ({ ...prev, notat: e.target.value }))}
                  rows={2}
                  placeholder="Kort beskrivelse av innhold, tiltak eller avtaler..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Filvedlegg (PDF, DOCX, bilde)</label>
                <DragDropUpload
                  label={nyttDokData.filnavn ? nyttDokData.filnavn : "Dra og slipp fil her eller klikk for å velge"}
                  sublabel="Maksimal filstørrelse: 15 MB"
                  currentFileName={nyttDokData.filnavn || null}
                  currentFileSize={nyttDokData.storrelse}
                  onFileSelected={(fileName, fileSize, dataUrl) => {
                    setNyttDokData(prev => ({
                      ...prev,
                      filnavn: fileName,
                      storrelse: fileSize,
                      filData: dataUrl,
                      tittel: prev.tittel || fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')
                    }));
                  }}
                  onRemove={() => {
                    setNyttDokData(prev => ({ ...prev, filnavn: '', storrelse: '1.0 MB', filData: null }));
                  }}
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setVisOpplastDokumentModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="button"
                disabled={!nyttDokData.tittel.trim()}
                onClick={() => {
                  const nyttDok: AnsattDokument = {
                    id: `dok-${Date.now()}`,
                    tittel: nyttDokData.tittel.trim(),
                    kategori: nyttDokData.kategori,
                    dato: nyttDokData.dato || new Date().toLocaleDateString('no-NO'),
                    filnavn: nyttDokData.filnavn || `${nyttDokData.tittel.replace(/\s+/g, '_')}.pdf`,
                    storrelse: nyttDokData.storrelse || '1.1 MB',
                    opprettetAv: 'Styrer Karoline Haug',
                    notat: nyttDokData.notat,
                    filData: nyttDokData.filData,
                    tags: [nyttDokData.kategori]
                  };

                  setFormData(prev => ({
                    ...prev,
                    dokumenter: [nyttDok, ...(prev.dokumenter || [])]
                  }));

                  setVisOpplastDokumentModal(false);
                  showToast(`Dokument "${nyttDok.tittel}" lagret i ansattarkivet.`);
                }}
                className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>Lagre i arkiv</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NY / REDIGER MEDARBEIDERSAMTALE VEIVISER & MAL (FULLT REDIGERBAR FOR STYRER) */}
      {visNyMedarbeidersamtaleModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
            {/* TOPPHEADER */}
            <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white p-5 flex items-start justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="p-3 bg-emerald-800/80 rounded-2xl border border-emerald-600/40">
                  <HeartHandshake size={24} className="text-emerald-300" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-base">Medarbeidersamtale (Styrerverktøy)</h4>
                    <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase">
                      Redigerbar mal
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200 mt-0.5">
                    Ansatt: <strong className="text-white">{formData.navn}</strong> ({formData.rolle}, {formData.base}) • {formData.prosent}% stilling
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setVisNyMedarbeidersamtaleModal(false)}
                className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* HOVEDSKJEMA FOR STYRER */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* STYRER INFO & HURTIG-HANDLINGER */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2 text-xs text-emerald-900">
                  <Sparkles size={16} className="text-emerald-600 shrink-0" />
                  <span>Styrer kan redigere alle spørsmål, legge til egne punkter og skrive referat i sanntid under samtalen.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const erPedleder = formData.rolle.toLowerCase().includes('ped') || formData.rolle.toLowerCase().includes('barnehagelærer');
                    const erFagarbeider = formData.rolle.toLowerCase().includes('fagarbeider');
                    const plantidTekst = erPedleder 
                      ? 'Pedagogisk leder har 4 timer ukentlig ubunden plantid jfr. SFS 2201. Planen for plantid er fastlagt og fungerer godt.'
                      : erFagarbeider 
                        ? 'Fagarbeider har 1 time ukentlig avsatt plantid til didaktisk arbeid og forberedelser.'
                        : 'Vurdert behov for faglig opplæring og deltakelse i avdelingsmøter.';

                    setSamtaleFormData({
                      tittel: `Medarbeidersamtale ${new Date().getFullYear()} - Trivsel & Utvikling`,
                      dato: new Date().toLocaleDateString('no-NO'),
                      nesteSamtaleDato: 'Februar 2027',
                      lederNavn: 'Karoline Haug (Styrer)',
                      temaer: [
                        {
                          id: 't1',
                          tittel: '1. Arbeidshverdag, trivsel og arbeidsmiljø på basen',
                          innhold: `Trives godt på avdeling ${formData.base}. God balanse i hverdagen, opplever mestring og god støtte fra kollegaer.`
                        },
                        {
                          id: 't2',
                          tittel: '2. Samarbeid i teamet og relasjon til barn og foreldre',
                          innhold: 'God dynamikk i basisteamet. Trygg og tillitsfull dialog i hente- og bringesituasjoner med foreldregruppen.'
                        },
                        {
                          id: 't3',
                          tittel: '3. Rolle, ansvar, didaktisk arbeid og måloppnåelse',
                          innhold: `Ivaretar oppgavene som ${formData.rolle} på en samvittighetsfull måte. Bidrar aktivt inn i rammeplanens satsingsområder.`
                        },
                        {
                          id: 't4',
                          tittel: '4. Faglig kompetanseutvikling, plantid og kursbehov',
                          innhold: `${plantidTekst} Ønsker faglig påfyll innen livsmestring, relasjonskompetanse og førstehjelp.`
                        },
                        {
                          id: 't5',
                          tittel: '5. Konkrete avtaler, faglige mål og tiltaksplan',
                          innhold: `Avtalt oppfølging av fagområder på ${formData.base}. Neste årlige medarbeidersamtale avtales for februar 2027.`
                        }
                      ],
                      avtalerOgTiltak: `Avtalt oppfølging av fagområder på ${formData.base}. Gjennomføre årlig evaluering og sikre god fordeling av plantid.`
                    });
                    showToast('Barnehagemal med rolle- og plantidstilpasninger ble fylt inn!');
                  }}
                  className="shrink-0 text-xs font-bold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                >
                  <Sparkles size={13} className="text-emerald-600" />
                  <span>Nullstill / fyll barnehagemal</span>
                </button>
              </div>

              {/* OVERORDNET METADATA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tittel på samtalen / dokumentet</label>
                  <input
                    type="text"
                    value={samtaleFormData.tittel}
                    onChange={(e) => setSamtaleFormData(prev => ({ ...prev, tittel: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Samtaledato</label>
                  <input
                    type="text"
                    value={samtaleFormData.dato}
                    onChange={(e) => setSamtaleFormData(prev => ({ ...prev, dato: e.target.value }))}
                    placeholder="DD.MM.YYYY"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Neste oppfølging / samtale</label>
                  <input
                    type="text"
                    value={samtaleFormData.nesteSamtaleDato}
                    onChange={(e) => setSamtaleFormData(prev => ({ ...prev, nesteSamtaleDato: e.target.value }))}
                    placeholder="F.eks. Februar 2027"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Møteleder (Styrer)</label>
                  <input
                    type="text"
                    value={samtaleFormData.lederNavn}
                    onChange={(e) => setSamtaleFormData(prev => ({ ...prev, lederNavn: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* REDIGERBARE TEMAER & SPØRSMÅL */}
              <div className="space-y-4 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <FileText size={14} className="text-emerald-600" />
                    <span>Samtaletemaer, spørsmål og styrernotater ({samtaleFormData.temaer.length} punkter)</span>
                  </h5>

                  <button
                    type="button"
                    onClick={() => {
                      const nyttNummer = samtaleFormData.temaer.length + 1;
                      setSamtaleFormData(prev => ({
                        ...prev,
                        temaer: [
                          ...prev.temaer,
                          {
                            id: `tema-${Date.now()}`,
                            tittel: `${nyttNummer}. Nytt samtaletema / egne notater`,
                            innhold: ''
                          }
                        ]
                      }));
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Legg til nytt tema</span>
                  </button>
                </div>

                <div className="space-y-3.5">
                  {samtaleFormData.temaer.map((tema, index) => (
                    <div key={tema.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 focus-within:border-emerald-400 focus-within:bg-white transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={tema.tittel}
                          onChange={(e) => {
                            const oppdatertTittel = e.target.value;
                            setSamtaleFormData(prev => ({
                              ...prev,
                              temaer: prev.temaer.map((t, idx) => idx === index ? { ...t, tittel: oppdatertTittel } : t)
                            }));
                          }}
                          className="font-bold text-xs text-slate-800 bg-transparent border-b border-transparent focus:border-emerald-500 outline-none w-full py-0.5"
                          placeholder="Tema overskrift..."
                        />
                        {samtaleFormData.temaer.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSamtaleFormData(prev => ({
                                ...prev,
                                temaer: prev.temaer.filter((_, idx) => idx !== index)
                              }));
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition shrink-0 cursor-pointer"
                            title="Fjern dette temaet"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <textarea
                        value={tema.innhold}
                        onChange={(e) => {
                          const oppdatertInnhold = e.target.value;
                          setSamtaleFormData(prev => ({
                            ...prev,
                            temaer: prev.temaer.map((t, idx) => idx === index ? { ...t, innhold: oppdatertInnhold } : t)
                          }));
                        }}
                        rows={2}
                        placeholder="Skriv referat, ansattes innspill og styrers kommentarer her..."
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* OPPSUMMERING AV AVTALER & TILTAK */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Avtalte mål og tiltak (Kort oppsummering til arkivnotat):
                </label>
                <textarea
                  value={samtaleFormData.avtalerOgTiltak}
                  onChange={(e) => setSamtaleFormData(prev => ({ ...prev, avtalerOgTiltak: e.target.value }))}
                  rows={2}
                  placeholder="F.eks. Gjennomføre førstehjelpskurs innen november, tilrettelegge plantid på onsdager..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                />
              </div>

            </div>

            {/* BUNNBANNER MED HANDLINGER */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  try {
                    const doc = new jsPDF();
                    doc.setFillColor(6, 78, 59);
                    doc.rect(0, 0, 210, 32, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(14);
                    doc.setTextColor(255, 255, 255);
                    doc.text(samtaleFormData.tittel.toUpperCase(), 15, 14);
                    doc.setFontSize(8.5);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(209, 250, 229);
                    doc.text('Eventyrskogen Barnehage | Konfidensielt personaldokument', 15, 22);

                    let y = 44;
                    doc.setFillColor(248, 250, 252);
                    doc.setDrawColor(226, 232, 240);
                    doc.roundedRect(15, y, 180, 22, 2, 2, 'FD');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.setTextColor(15, 23, 42);
                    doc.text(`Medarbeider: ${formData.navn} (${formData.rolle}, ${formData.base} • ${formData.prosent}%)`, 20, y + 8);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8.5);
                    doc.setTextColor(71, 85, 105);
                    doc.text(`Samtaledato: ${samtaleFormData.dato}  |  Leder: ${samtaleFormData.lederNavn}  |  Neste samtale: ${samtaleFormData.nesteSamtaleDato}`, 20, y + 15);

                    y += 30;

                    samtaleFormData.temaer.forEach(item => {
                      if (y > 260) {
                        doc.addPage();
                        y = 20;
                      }
                      doc.setFont('helvetica', 'bold');
                      doc.setFontSize(9);
                      doc.setTextColor(6, 78, 59);
                      doc.text(item.tittel, 18, y);
                      doc.setFont('helvetica', 'normal');
                      doc.setFontSize(8.5);
                      doc.setTextColor(71, 85, 105);
                      const lines = doc.splitTextToSize(item.innhold || '(Ingen merknader)', 170);
                      doc.text(lines, 22, y + 5);
                      y += 8 + (lines.length * 5);
                    });

                    if (samtaleFormData.avtalerOgTiltak) {
                      if (y > 255) {
                        doc.addPage();
                        y = 20;
                      }
                      doc.setFont('helvetica', 'bold');
                      doc.setFontSize(9.5);
                      doc.setTextColor(15, 23, 42);
                      doc.text('Konkrete avtaler og tiltaksplan:', 18, y + 2);
                      doc.setFont('helvetica', 'normal');
                      doc.setFontSize(8.5);
                      doc.setTextColor(51, 65, 85);
                      const lines = doc.splitTextToSize(samtaleFormData.avtalerOgTiltak, 170);
                      doc.text(lines, 22, y + 7);
                      y += 12 + (lines.length * 5);
                    }

                    doc.save(`Medarbeidersamtale_${formData.navn.replace(/\s+/g, '_')}_${samtaleFormData.dato.replace(/\./g, '-')}.pdf`);
                    showToast('Referat fra medarbeidersamtale lastet ned som PDF!');
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 transition cursor-pointer"
              >
                <Download size={15} />
                <span>Last ned som PDF</span>
              </button>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setVisNyMedarbeidersamtaleModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const aar = new Date().getFullYear();
                    const oppsummeringNotat = samtaleFormData.avtalerOgTiltak || (samtaleFormData.temaer[samtaleFormData.temaer.length - 1]?.innhold || 'Medarbeidersamtale gjennomført');
                    
                    const nyttDok: AnsattDokument = {
                      id: redigererSamtaleDokId || `dok-samtale-${Date.now()}`,
                      tittel: samtaleFormData.tittel || `Medarbeidersamtale ${aar} - Trivsel & Utvikling`,
                      kategori: 'Medarbeidersamtale',
                      dato: samtaleFormData.dato,
                      filnavn: `Medarbeidersamtale_${formData.navn.replace(/\s+/g, '_')}_${aar}.pdf`,
                      storrelse: '1.2 MB',
                      opprettetAv: samtaleFormData.lederNavn || 'Styrer Karoline Haug',
                      notat: `Mål og tiltak: ${oppsummeringNotat}. Neste oppfølging: ${samtaleFormData.nesteSamtaleDato}`,
                      tags: ['Medarbeidersamtale', `${aar}`, formData.rolle, formData.base]
                    };

                    setFormData(prev => {
                      const eksisterende = (prev.dokumenter || []).filter(d => d.id !== nyttDok.id);
                      return {
                        ...prev,
                        dokumenter: [nyttDok, ...eksisterende]
                      };
                    });

                    setRedigererSamtaleDokId(null);
                    setVisNyMedarbeidersamtaleModal(false);
                    showToast('Medarbeidersamtalen er lagret i ansattens personalarkiv!');
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>Lagre i personalarkiv</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FORHÅNDSVISNING / DETALJER FOR VALGT DOKUMENT */}
      {valgtDokument && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-slate-800 rounded-xl">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-base">{valgtDokument.tittel}</h4>
                  <p className="text-xs text-slate-300 mt-0.5">{valgtDokument.kategori} • {formData.navn}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setValgtDokument(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Filnavn:</span>
                  <span className="font-mono font-bold text-slate-800 break-all">{valgtDokument.filnavn}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Størrelse:</span>
                  <span className="font-bold text-slate-800">{valgtDokument.storrelse || '1.1 MB'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Dato registrert:</span>
                  <span className="font-bold text-slate-800">{valgtDokument.dato}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Opprettet av:</span>
                  <span className="font-bold text-slate-800">{valgtDokument.opprettetAv || 'Styrer'}</span>
                </div>
              </div>

              {valgtDokument.notat && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notat / Sammendrag:</label>
                  <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-slate-700 leading-relaxed italic">
                    "{valgtDokument.notat}"
                  </div>
                </div>
              )}

              {valgtDokument.tags && valgtDokument.tags.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tagger:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {valgtDokument.tags.map((t, idx) => (
                      <span key={idx} className="text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const slettId = valgtDokument.id;
                  setFormData(prev => ({
                    ...prev,
                    dokumenter: (prev.dokumenter || []).filter(d => d.id !== slettId)
                  }));
                  setValgtDokument(null);
                  showToast('Dokument er slettet fra arkivet.');
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
              >
                Slett dokument
              </button>

              <div className="flex items-center space-x-2">
                {valgtDokument.kategori === 'Medarbeidersamtale' && (
                  <button
                    type="button"
                    onClick={() => {
                      setRedigererSamtaleDokId(valgtDokument.id);
                      setSamtaleFormData(prev => ({
                        ...prev,
                        tittel: valgtDokument.tittel,
                        dato: valgtDokument.dato,
                        avtalerOgTiltak: valgtDokument.notat || prev.avtalerOgTiltak
                      }));
                      setValgtDokument(null);
                      setVisNyMedarbeidersamtaleModal(true);
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <Edit2 size={13} />
                    <span>Rediger samtale</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setValgtDokument(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Lukk
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalHR;
