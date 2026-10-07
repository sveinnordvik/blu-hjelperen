import React, { useState, useEffect, useMemo } from 'react';
import { 
  ListChecks, 
  Send, 
  Smartphone, 
  Clock, 
  CheckCircle2, 
  ShieldAlert,
  MapPin,
  CheckSquare,
  Plus,
  Check,
  RefreshCw,
  Edit2,
  Trash2,
  Archive,
  FolderArchive,
  FileText,
  Download,
  Eye,
  Filter,
  Search,
  AlertTriangle,
  Layers,
  Calendar,
  Building2,
  Sparkles,
  ShieldCheck,
  X,
  FileCheck2,
  RotateCcw
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import ExportButton from './ExportButton';
import ArchiveFilters from './ArchiveFilters';
import ArchiveTableRow from './ArchiveTableRow';
import ManagerMonthlyReview from './ManagerMonthlyReview';

export interface Sjekkpunkt {
  id: string;
  tekst: string;
  pakrevd?: boolean;
}

export interface Rutine {
  id: number | string;
  tittel: string;
  kategori: 'Sikkerhet & Uteområde' | 'Brannvern & Rømning' | 'Mat-HMS & Hygiene' | 'Helse & Førstehjelp' | 'Inneklima & Smittevern' | 'Rutiner & Tilsyn' | 'Annet';
  detaljer: string;
  frekvens: 'Daglig' | 'Ukentlig' | 'Månedlig' | 'Kvartalsvis' | 'Halvårlig' | 'Årlig' | 'Ved behov';
  standardMottaker: string;
  ansvarligRolle: string;
  lovhjemmel?: string;
  type: 'enkel' | 'sjekkliste';
  sjekkpunkter: Sjekkpunkt[];
  sistEndretDato?: string;
  
  // Styrerens egne tids- og utsendingsinnstillinger
  dispatchTime?: string; // Tidspunktet oppgaven dukker opp på avdelingen (f.eks. "15:00")
  dueTime?: string;      // Tidspunktet (fristen) den blir rød/forfalt (f.eks. "16:45")
  activeDays?: number[]; // Aktive dager, f.eks. [1, 2, 3, 4, 5] (Mandag-Fredag)
  frequency?: string;    // E.g. "daily"
}

export interface Delegering {
  id: number | string;
  rutineId?: number | string;
  tittel: string;
  title?: string;
  kategori: string;
  base: string;
  sendtTid: string;
  sendtDato: string;
  dueDate?: string | number | Date;
  status: 'Utført' | 'Venter' | 'completed' | 'pending';
  utfortAv: string | null;
  utfortTidspunkt?: string;
  detaljer?: string;
  lovhjemmel?: string;
  frekvens: string;
  type: 'enkel' | 'sjekkliste';
  sjekkpunkter: { id: string; tekst: string; fullfort: boolean }[];
  merknader?: string;
  avvikFunnet?: boolean;
  avvikBeskrivelse?: string;
}

export interface FrozenChecklistQuestion {
  question: string;
  checked: boolean;
  note?: string;
}

export interface ArkivertGjennomforing {
  id: string;
  templateId: string;
  title: string;
  department: string;
  completedAt: string; // ISO string timestamp (låst)
  completedBy: {
    uid: string;
    name: string;
  };
  status: 'ok' | 'avvik';
  frozenContent: FrozenChecklistQuestion[];
  deviationId: string | number | null;

  // Bakoverkompatible og visningsrelaterte felter
  delegeringId?: number | string;
  rutineId?: number | string;
  tittel?: string;
  kategori?: string;
  base?: string;
  frekvens?: string;
  utfortDato?: string;
  utfortTidspunkt?: string;
  utfortAv?: string;
  rolle?: string;
  sjekkpunkter?: { id: string; tekst: string; fullfort: boolean }[];
  merknader?: string;
  avvikFunnet?: boolean;
  avvikBeskrivelse?: string;
  lovhjemmel?: string;
  godkjentAvStyrer?: boolean;
}

interface DelegertHMSProps {
  onNavigate?: (tab: string) => void;
}

const KATEGORIER: Rutine['kategori'][] = [
  'Sikkerhet & Uteområde',
  'Brannvern & Rømning',
  'Mat-HMS & Hygiene',
  'Helse & Førstehjelp',
  'Inneklima & Smittevern',
  'Rutiner & Tilsyn',
  'Annet'
];

const FREKVENSER: Rutine['frekvens'][] = [
  'Daglig',
  'Ukentlig',
  'Månedlig',
  'Kvartalsvis',
  'Halvårlig',
  'Årlig',
  'Ved behov'
];

const BASER = [
  'Alle baser',
  'Trollstua (Småbarn)',
  'Multemyra (Storebarn)',
  'Klatremus (Storebarn)',
  'Bjørnehiet (Mellomgruppe)',
  'Kjøkken / Felles'
];

const STANDARD_RUTINER: Rutine[] = [
  { 
    id: 1, 
    tittel: 'Sjekk av sovevogner & seler', 
    kategori: 'Sikkerhet & Uteområde',
    detaljer: 'Månedlig kontroll av seler, bremser, insektsnett og soveskur iht. retningslinjer for trygg søvn.', 
    frekvens: 'Månedlig',
    standardMottaker: 'Trollstua (Småbarn)',
    ansvarligRolle: 'Ped.leder / Fagarbeider',
    lovhjemmel: 'Forskrift om miljørettet helsevern i barnehager § 14',
    type: 'sjekkliste',
    sjekkpunkter: [
      { id: 'sp1', tekst: '5-punktssele er hel, låser forsvarlig og sitter stramt uten slakk' },
      { id: 'sp2', tekst: 'Hjulbrems virker effektivt på begge hjulsider' },
      { id: 'sp3', tekst: 'Insektsnett og regntrekk er uten rifter og sitter tett over kalesjen' },
      { id: 'sp4', tekst: 'Sovevogn står stødig i godkjent soveskur, termometer sjekket' },
      { id: 'sp5', tekst: 'Seler er forankret i vognens faste fester (ikke løse stropper)' }
    ]
  },
  { 
    id: 2, 
    tittel: 'Sikkerhetsrunde uteområde & lekeplass', 
    kategori: 'Sikkerhet & Uteområde',
    detaljer: 'Ukentlig befaring av gjerder, porter, fallunderlag og lekeapparater.', 
    frekvens: 'Ukentlig',
    standardMottaker: 'Alle baser',
    ansvarligRolle: 'Verneombud / Ansatt',
    lovhjemmel: 'Forskrift om sikkerhet ved lekeplassutstyr (DSB)',
    type: 'sjekkliste',
    sjekkpunkter: [
      { id: 'sp1', tekst: 'Ingen glasskår, snus, sprøyter, sopp eller farlig avfall i uteområdet' },
      { id: 'sp2', tekst: 'Gjerder og porter er intakte, lukket og har barnesikker klinke' },
      { id: 'sp3', tekst: 'Fallunderlag (bark/sand/gummidekke) under husker og klatrestativ er mykt og i rett dybde' },
      { id: 'sp4', tekst: 'Ingen klemfare, fliser i treverk eller løse bolter på lekeapparater' },
      { id: 'sp5', tekst: 'Sandkasser er dekket til etter stengetid og fri for dyreekskrementer' }
    ]
  },
  { 
    id: 3, 
    tittel: 'Temperaturkontroll kjøleskap & kjølerom', 
    kategori: 'Mat-HMS & Hygiene',
    detaljer: 'Mat-HMS og IK-mat. Kjøletemperatur skal være under 4,0 °C og fryser under -18 °C.', 
    frekvens: 'Daglig',
    standardMottaker: 'Kjøkken / Felles',
    ansvarligRolle: 'Kjøkkenansvarlig / Assistent',
    lovhjemmel: 'Mattilsynets hygieneforskrift & IK-Mat',
    type: 'sjekkliste',
    sjekkpunkter: [
      { id: 'sp1', tekst: 'Kjøleskap på hovedkjøkken målt under 4,0 °C' },
      { id: 'sp2', tekst: 'Melkekjøleskap på basene målt under 4,0 °C' },
      { id: 'sp3', tekst: 'Fryseboks kontrollert og holder under -18,0 °C' },
      { id: 'sp4', tekst: 'Åpnede matvarer er merket med dato for åpning' },
      { id: 'sp5', tekst: 'Oppvaskmaskin har nådd 85 °C i sluttskyll (termometer/display)' }
    ]
  },
  { 
    id: 4, 
    tittel: 'Førstehjelpsskrin på tur & base', 
    kategori: 'Helse & Førstehjelp',
    detaljer: 'Sjekk at sterile bandasjer, sårrens, flåttfjerner og nødnumre er klare før turdag.', 
    frekvens: 'Ukentlig',
    standardMottaker: 'Alle baser',
    ansvarligRolle: 'Førstehjelpsansvarlig',
    lovhjemmel: 'Arbeidsmiljøloven § 4-4 & Barnehageloven § 2',
    type: 'sjekkliste',
    sjekkpunkter: [
      { id: 'sp1', tekst: 'Sterile kompresser og enkeltmannspakker er uåpnede og tilstede' },
      { id: 'sp2', tekst: 'Plaster i ulike størrelser, sportstape og gnagsårplaster er etterfylt' },
      { id: 'sp3', tekst: 'Klorhexidin / sårrens og sterile sårservietter er tilstede' },
      { id: 'sp4', tekst: 'Flåttfjerner, pinsett og saks fungerer' },
      { id: 'sp5', tekst: 'Nødkort med barnehagens adresse og telefonliste er i sekken' }
    ]
  },
  { 
    id: 5, 
    tittel: 'Sjekk av rømningsveier & nødlys', 
    kategori: 'Brannvern & Rømning',
    detaljer: 'Daglig verifisering av at nødutganger er helt fri for hindringer og at nødlys lyser.', 
    frekvens: 'Daglig',
    standardMottaker: 'Alle baser',
    ansvarligRolle: 'Brannvernleder / Styrer',
    lovhjemmel: 'Forskrift om brannforebygging § 4',
    type: 'sjekkliste',
    sjekkpunkter: [
      { id: 'sp1', tekst: 'Samtlige nødutganger er fri for barnevogner, akebrett, stoler og esker' },
      { id: 'sp2', tekst: 'Panikkbeslag og dørvridere på rømningsdører åpner lett fra innsiden' },
      { id: 'sp3', tekst: 'Grønne nødlysskilt lyser med fast grønt driftslys' },
      { id: 'sp4', tekst: 'Brannslanger og håndslukkere er synlige, tilgjengelige og har uskadet plombe' }
    ]
  },
  {
    id: 6,
    tittel: 'Stengesjekkliste for barnehagen',
    kategori: 'Sikkerhet & Uteområde',
    detaljer: 'Avslutningsrutine ved dagens slutt. Sikre bygg, elektriske apparater og uteområde.',
    frekvens: 'Daglig',
    frequency: 'daily',
    activeDays: [1, 2, 3, 4, 5],
    dispatchTime: '15:00',
    dueTime: '16:45',
    standardMottaker: 'Alle baser',
    ansvarligRolle: 'Stengevakt / Ansatt',
    lovhjemmel: 'Internkontrollforskriften § 5',
    type: 'sjekkliste',
    sjekkpunkter: [
      { id: 'sp1', tekst: 'Alle barn er hentet og utkvittert i systemet' },
      { id: 'sp2', tekst: 'Vinduer lukket og haspet i samtlige rom' },
      { id: 'sp3', tekst: 'Kaffetraktere, vannkokere og komfyrer slått av og sikret' },
      { id: 'sp4', tekst: 'Uteområde ryddet for leker, og porter er låst' },
      { id: 'sp5', tekst: 'Ytterdører låst og innbruddsalarm aktivert' }
    ]
  }
];

const INITIAL_ARKIV: ArkivertGjennomforing[] = [
  {
    id: 'ark-0',
    templateId: 'sovevogn_ukentlig_01',
    title: 'Sjekk av sovevogner',
    department: 'Trollstua',
    completedAt: new Date(Date.now() - 3600000).toISOString(),
    completedBy: { uid: 'user_123', name: 'Karoline Haug' },
    status: 'ok',
    frozenContent: [
      {
        question: 'Er selene i alle 4 sovevogner intakte?',
        checked: true,
        note: 'Sjekket alle 4 vogner'
      },
      {
        question: 'Er vognene parkert i skyggen / under tak?',
        checked: true,
        note: 'Står trygt i soveskur'
      }
    ],
    deviationId: null,
    delegeringId: 102,
    rutineId: 1,
    tittel: 'Sjekk av sovevogner',
    kategori: 'Sikkerhet & Uteområde',
    base: 'Trollstua',
    frekvens: 'Ukentlig',
    utfortDato: new Date().toLocaleDateString('no-NO'),
    utfortTidspunkt: '12:30',
    utfortAv: 'Karoline Haug',
    rolle: 'Styrer',
    lovhjemmel: 'Forskrift om miljørettet helsevern i barnehager § 14',
    sjekkpunkter: [
      { id: 'sp1', tekst: 'Er selene i alle 4 sovevogner intakte?', fullfort: true },
      { id: 'sp2', tekst: 'Er vognene parkert i skyggen / under tak?', fullfort: true }
    ],
    merknader: 'Rutinekontroll utført på Trollstua.',
    avvikFunnet: false,
    godkjentAvStyrer: true
  },
  {
    id: 'ark-1',
    templateId: 'lekeplass_ukentlig_02',
    title: 'Sikkerhetsrunde uteområde & lekeplass',
    department: 'Klatremus (Storebarn)',
    completedAt: new Date(Date.now() - 86400000).toISOString(),
    completedBy: { uid: 'user_456', name: 'Fatima Al-Zahra' },
    status: 'ok',
    frozenContent: [
      { question: 'Ingen glasskår, snus, sprøyter, sopp eller farlig avfall i uteområdet', checked: true, note: '' },
      { question: 'Gjerder og porter er intakte, lukket og har barnesikker klinke', checked: true, note: '' },
      { question: 'Fallunderlag (bark/sand/gummidekke) under husker og klatrestativ er mykt og i rett dybde', checked: true, note: 'Barken raket jevn' },
      { question: 'Ingen klemfare, fliser i treverk eller løse bolter på lekeapparater', checked: true, note: '' },
      { question: 'Sandkasser er dekket til etter stengetid og fri for dyreekskrementer', checked: true, note: '' }
    ],
    deviationId: null,
    delegeringId: 101,
    rutineId: 2,
    tittel: 'Sikkerhetsrunde uteområde & lekeplass',
    kategori: 'Sikkerhet & Uteområde',
    base: 'Klatremus (Storebarn)',
    frekvens: 'Ukentlig',
    utfortDato: new Date(Date.now() - 86400000).toLocaleDateString('no-NO'),
    utfortTidspunkt: '08:15',
    utfortAv: 'Fatima Al-Zahra',
    rolle: 'Fagarbeider',
    lovhjemmel: 'Forskrift om sikkerhet ved lekeplassutstyr (DSB)',
    sjekkpunkter: [
      { id: 'sp1', tekst: 'Ingen glasskår, snus, sprøyter, sopp eller farlig avfall i uteområdet', fullfort: true },
      { id: 'sp2', tekst: 'Gjerder og porter er intakte, lukket og har barnesikker klinke', fullfort: true },
      { id: 'sp3', tekst: 'Fallunderlag (bark/sand/gummidekke) under husker og klatrestativ er mykt og i rett dybde', fullfort: true },
      { id: 'sp4', tekst: 'Ingen klemfare, fliser i treverk eller løse bolter på lekeapparater', fullfort: true },
      { id: 'sp5', tekst: 'Sandkasser er dekket til etter stengetid og fri for dyreekskrementer', fullfort: true }
    ],
    merknader: 'Uteområdet inspisert før barna kom ut. Barken under fugleredetusken ble raket jevn.',
    avvikFunnet: false,
    godkjentAvStyrer: true
  },
  {
    id: 'ark-2',
    templateId: 'kjøleskap_daglig_03',
    title: 'Temperaturkontroll kjøleskap & kjølerom',
    department: 'Kjøkken / Felles',
    completedAt: new Date(Date.now() - 86400000).toISOString(),
    completedBy: { uid: 'user_789', name: 'Morten Hansen' },
    status: 'ok',
    frozenContent: [
      { question: 'Kjøleskap på hovedkjøkken målt under 4,0 °C (3.2 °C)', checked: true, note: '3.2 °C' },
      { question: 'Melkekjøleskap på basene målt under 4,0 °C (3.8 °C)', checked: true, note: '3.8 °C' },
      { question: 'Fryseboks kontrollert og holder under -18,0 °C (-20.1 °C)', checked: true, note: '-20.1 °C' },
      { question: 'Åpnede matvarer er merket med dato for åpning', checked: true, note: '' },
      { question: 'Oppvaskmaskin har nådd 85 °C i sluttskyll (termometer/display)', checked: true, note: '' }
    ],
    deviationId: null,
    delegeringId: 103,
    rutineId: 3,
    tittel: 'Temperaturkontroll kjøleskap & kjølerom',
    kategori: 'Mat-HMS & Hygiene',
    base: 'Kjøkken / Felles',
    frekvens: 'Daglig',
    utfortDato: new Date(Date.now() - 86400000).toLocaleDateString('no-NO'),
    utfortTidspunkt: '07:45',
    utfortAv: 'Morten Hansen',
    rolle: 'Assistent',
    lovhjemmel: 'Mattilsynets hygieneforskrift & IK-Mat',
    sjekkpunkter: [
      { id: 'sp1', tekst: 'Kjøleskap på hovedkjøkken målt under 4,0 °C (3.2 °C)', fullfort: true },
      { id: 'sp2', tekst: 'Melkekjøleskap på basene målt under 4,0 °C (3.8 °C)', fullfort: true },
      { id: 'sp3', tekst: 'Fryseboks kontrollert og holder under -18,0 °C (-20.1 °C)', fullfort: true },
      { id: 'sp4', tekst: 'Åpnede matvarer er merket med dato for åpning', fullfort: true },
      { id: 'sp5', tekst: 'Oppvaskmaskin har nådd 85 °C i sluttskyll (termometer/display)', fullfort: true }
    ],
    merknader: 'Alt OK. Temperaturlogg registrert i henhold til IK-Mat.',
    avvikFunnet: false,
    godkjentAvStyrer: true
  },
  {
    id: 'ark-3',
    templateId: 'romningsveier_daglig_05',
    title: 'Sjekk av rømningsveier & nødlys',
    department: 'Trollstua (Småbarn)',
    completedAt: new Date(Date.now() - 172800000).toISOString(),
    completedBy: { uid: 'user_123', name: 'Ingrid Solheim' },
    status: 'avvik',
    frozenContent: [
      { question: 'Samtlige nødutganger er fri for barnevogner, akebrett, stoler og esker', checked: false, note: 'To akebrett sperret rømningstrapp' },
      { question: 'Panikkbeslag og dørvridere på rømningsdører åpner lett fra innsiden', checked: true, note: '' },
      { question: 'Grønne nødlysskilt lyser med fast grønt driftslys', checked: true, note: '' },
      { question: 'Brannslanger og håndslukkere er synlige, tilgjengelige og har uskadet plombe', checked: true, note: '' }
    ],
    deviationId: 'avvik_01',
    delegeringId: 99,
    rutineId: 5,
    tittel: 'Sjekk av rømningsveier & nødlys',
    kategori: 'Brannvern & Rømning',
    base: 'Trollstua (Småbarn)',
    frekvens: 'Daglig',
    utfortDato: new Date(Date.now() - 172800000).toLocaleDateString('no-NO'),
    utfortTidspunkt: '07:30',
    utfortAv: 'Ingrid Solheim',
    rolle: 'Ped.leder',
    lovhjemmel: 'Forskrift om brannforebygging § 4',
    sjekkpunkter: [
      { id: 'sp1', tekst: 'Samtlige nødutganger er fri for barnevogner, akebrett, stoler og esker', fullfort: false },
      { id: 'sp2', tekst: 'Panikkbeslag og dørvridere på rømningsdører åpner lett fra innsiden', fullfort: true },
      { id: 'sp3', tekst: 'Grønne nødlysskilt lyser med fast grønt driftslys', fullfort: true },
      { id: 'sp4', tekst: 'Brannslanger og håndslukkere er synlige, tilgjengelige og har uskadet plombe', fullfort: true }
    ],
    merknader: 'Rømningsdør ved garderoben var blokkert av to akebrett. Disse ble umiddelbart flyttet til uteboden.',
    avvikFunnet: true,
    avvikBeskrivelse: 'To akebrett sperret rømningstrapp ved småbarnsgarderoben. Ryddet bort kl 07:35.',
    godkjentAvStyrer: true
  }
];

export const DelegertHMS: React.FC<DelegertHMSProps> = ({ onNavigate }) => {
  // --- SUB-TABS ---
  const [aktivHovedFane, setAktivHovedFane] = useState<'oppfolging' | 'bibliotek' | 'arkiv'>('oppfolging');

  // --- STATE: RUTINEBIBLIOTEK ---
  const [rutiner, setRutiner] = useState<Rutine[]>(() => {
    const saved = localStorage.getItem('styrern_rutiner_bibliotek');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return STANDARD_RUTINER;
  });

  // --- STATE: AKTIVE DELEGERINGER ---
  const [aktiveDelegeringer, setAktiveDelegeringer] = useState<Delegering[]>(() => {
    const saved = localStorage.getItem('styrern_delegerthms_oppgaver');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    const today = new Date();
    const overdueTime = new Date(today.getTime() - 45 * 60000); // 45 mins ago -> overdue
    const upcomingTime = new Date(today.getTime() + 90 * 60000); // in 1.5 hrs
    const eveningTime = new Date(today.getTime() + 240 * 60000); // in 4 hrs

    return [
      { 
        id: 101, 
        rutineId: 2,
        tittel: 'Sikkerhetsrunde uteområde & lekeplass', 
        kategori: 'Sikkerhet & Uteområde',
        base: 'Klatremus (Storebarn)', 
        sendtTid: '08:15', 
        sendtDato: today.toLocaleDateString('no-NO'),
        dueDate: overdueTime.toISOString(),
        status: 'Utført', 
        utfortAv: 'Fatima Al-Zahra',
        utfortTidspunkt: '08:45',
        frekvens: 'Ukentlig',
        type: 'sjekkliste',
        sjekkpunkter: [
          { id: 'sp1', tekst: 'Ingen farlig avfall eller knust glass i uteområdet', fullfort: true },
          { id: 'sp2', tekst: 'Gjerder og porter intakte og lukket', fullfort: true },
          { id: 'sp3', tekst: 'Fallunderlag mykt og fritt for skarpe gjenstander', fullfort: true }
        ],
        merknader: 'Uteområde godkjent.'
      },
      { 
        id: 102, 
        rutineId: 1,
        tittel: 'Sjekk av sovevogner & seler', 
        kategori: 'Sikkerhet & Uteområde',
        base: 'Trollstua (Småbarn)', 
        sendtTid: '12:30', 
        sendtDato: today.toLocaleDateString('no-NO'),
        dueDate: overdueTime.toISOString(), // Overdue example
        status: 'Venter', 
        utfortAv: null,
        frekvens: 'Månedlig',
        type: 'sjekkliste',
        sjekkpunkter: [
          { id: 'sp1', tekst: '5-punktssele er hel, låser forsvarlig og sitter stramt uten slakk', fullfort: false },
          { id: 'sp2', tekst: 'Hjulbrems virker effektivt på begge hjulsider', fullfort: false },
          { id: 'sp3', tekst: 'Insektsnett og regntrekk er uten rifter og sitter tett', fullfort: false }
        ]
      },
      { 
        id: 103, 
        rutineId: 3,
        tittel: 'Temperaturkontroll kjøleskap & kjølerom', 
        kategori: 'Mat-HMS & Hygiene',
        base: 'Kjøkken / Felles', 
        sendtTid: '07:45', 
        sendtDato: today.toLocaleDateString('no-NO'),
        dueDate: upcomingTime.toISOString(), // Upcoming example
        status: 'Venter', 
        utfortAv: null,
        frekvens: 'Daglig',
        type: 'sjekkliste',
        sjekkpunkter: [
          { id: 'sp1', tekst: 'Kjøleskap under 4,0 °C', fullfort: false },
          { id: 'sp2', tekst: 'Fryseboks under -18,0 °C', fullfort: false }
        ]
      },
      { 
        id: 104, 
        rutineId: 6,
        tittel: 'Stengesjekkliste for barnehagen', 
        kategori: 'Sikkerhet & Uteområde',
        base: 'Alle baser', 
        sendtTid: '16:00', 
        sendtDato: today.toLocaleDateString('no-NO'),
        dueDate: eveningTime.toISOString(),
        status: 'Venter', 
        utfortAv: null,
        frekvens: 'Daglig',
        type: 'sjekkliste',
        sjekkpunkter: [
          { id: 'sp1', tekst: 'Alle barn er hentet og utkvittert i systemet', fullfort: false },
          { id: 'sp2', tekst: 'Vinduer lukket og haspet', fullfort: false },
          { id: 'sp3', tekst: 'Elektriske apparater slått av', fullfort: false }
        ]
      }
    ];
  });

  // --- STATE: ARKIV FOR UTFØRTE KONTROLLER ---
  const [arkiv, setArkiv] = useState<ArkivertGjennomforing[]>(() => {
    const saved = localStorage.getItem('styrern_hms_arkiv');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_ARKIV;
  });

  // UI State
  const [sender, setSender] = useState<number | string | null>(null);
  const [valgtBase, setValgtBase] = useState('Alle baser');
  const [toastMelding, setToastMelding] = useState<string | null>(null);

  // Filter & Søk
  const [bibliotekSok, setBibliotekSok] = useState('');
  const [bibliotekKategoriFilter, setBibliotekKategoriFilter] = useState<string>('alle');
  
  const [arkivSok, setArkivSok] = useState('');
  const [arkivKategoriFilter, setArkivKategoriFilter] = useState<string>('alle');
  const [arkivBaseFilter, setArkivBaseFilter] = useState<string>('alle');
  const [arkivStartDate, setArkivStartDate] = useState<string>('');
  const [arkivEndDate, setArkivEndDate] = useState<string>('');

  // Modaler
  const [visOpprettRutineModal, setVisOpprettRutineModal] = useState(false);
  const [redigererRutine, setRedigererRutine] = useState<Rutine | null>(null);
  const [utforerDelegering, setUtforerDelegering] = useState<Delegering | null>(null);
  const [valgtArkivPost, setValgtArkivPost] = useState<ArkivertGjennomforing | null>(null);
  const [sletteRutine, setSletteRutine] = useState<Rutine | null>(null);

  // Ny / redigert rutine formdata
  const [rutineFormData, setRutineFormData] = useState<Rutine>({
    id: '',
    tittel: '',
    kategori: 'Sikkerhet & Uteområde',
    detaljer: '',
    frekvens: 'Ukentlig',
    standardMottaker: 'Alle baser',
    ansvarligRolle: 'Ped.leder',
    lovhjemmel: 'Forskrift om miljørettet helsevern i barnehager § 14',
    type: 'sjekkliste',
    sjekkpunkter: [
      { id: 'sp-1', tekst: 'Første sjekkpunkt...' }
    ]
  });

  // Utfylling av sjekkliste formdata
  const [utfyllingData, setUtfyllingData] = useState<{
    utfortAv: string;
    merknader: string;
    avvikFunnet: boolean;
    avvikBeskrivelse: string;
    sjekkpunkter: { id: string; tekst: string; fullfort: boolean }[];
  }>({
    utfortAv: 'Karoline Haug (Styrer)',
    merknader: '',
    avvikFunnet: false,
    avvikBeskrivelse: '',
    sjekkpunkter: []
  });

  // Synkroniser til localStorage
  useEffect(() => {
    localStorage.setItem('styrern_rutiner_bibliotek', JSON.stringify(rutiner));
  }, [rutiner]);

  useEffect(() => {
    localStorage.setItem('styrern_delegerthms_oppgaver', JSON.stringify(aktiveDelegeringer));
  }, [aktiveDelegeringer]);

  useEffect(() => {
    localStorage.setItem('styrern_hms_arkiv', JSON.stringify(arkiv));
  }, [arkiv]);

  const showToast = (msg: string) => {
    setToastMelding(msg);
    setTimeout(() => setToastMelding(null), 3500);
  };

  // Generer stengesjekklister (tilsvarer Cloud Function basert på malens dispatchTime & dueTime)
  const handleGenererStengesjekklister = () => {
    const baser = [
      'Trollstua (Småbarn)',
      'Multemyra (Storebarn)',
      'Klatremus (Storebarn)',
      'Bjørnehiet (Mellomgruppe)'
    ];

    const today = new Date();

    const stengeMal = rutiner.find(r => r.id === 6 || r.tittel.includes('Stengesjekkliste')) || {
      id: 6,
      tittel: 'Stengesjekkliste for barnehagen',
      kategori: 'Sikkerhet & Uteområde',
      detaljer: 'Avslutningsrutine ved dagens slutt. Sikre bygg, elektriske apparater og uteområde.',
      frekvens: 'Daglig',
      frequency: 'daily',
      activeDays: [1, 2, 3, 4, 5],
      dispatchTime: '15:00',
      dueTime: '16:45',
      sjekkpunkter: [
        { id: 'sp1', tekst: 'Alle barn er hentet og utkvittert i systemet' },
        { id: 'sp2', tekst: 'Vinduer lukket og haspet i samtlige rom' },
        { id: 'sp3', tekst: 'Kaffetraktere, vannkokere og komfyrer slått av og sikret' },
        { id: 'sp4', tekst: 'Uteområde ryddet for leker, og porter er låst' },
        { id: 'sp5', tekst: 'Ytterdører låst og innbruddsalarm aktivert' }
      ]
    };

    const dispatchTimeStr = stengeMal.dispatchTime || '15:00';
    const dueTimeStr = stengeMal.dueTime || '16:45';
    const [dueH, dueM] = dueTimeStr.split(':').map(Number);
    
    const dueTime = new Date(today);
    dueTime.setHours(dueH || 16, dueM || 45, 0, 0);

    const nyeOppgaver: Delegering[] = baser.map((baseName, idx) => ({
      id: Date.now() + idx,
      rutineId: stengeMal.id,
      tittel: stengeMal.tittel,
      kategori: (stengeMal.kategori as any) || 'Sikkerhet & Uteområde',
      base: baseName,
      sendtTid: dispatchTimeStr,
      sendtDato: today.toLocaleDateString('no-NO'),
      dueDate: dueTime.toISOString(),
      status: 'Venter',
      utfortAv: null,
      frekvens: 'Daglig',
      type: 'sjekkliste',
      sjekkpunkter: (stengeMal.sjekkpunkter || []).map(sp => ({
        id: sp.id,
        tekst: sp.tekst,
        fullfort: false
      }))
    }));

    setAktiveDelegeringer(prev => [...nyeOppgaver, ...prev]);
    showToast(`⏰ Genererte stengesjekklister (utsending ${dispatchTimeStr}, frist ${dueTimeStr}) for ${baser.length} avdelinger!`);
  };

  // Åpne modal for ny rutine
  const handleApneNyRutineModal = () => {
    setRutineFormData({
      id: Date.now(),
      tittel: '',
      kategori: 'Sikkerhet & Uteområde',
      detaljer: '',
      frekvens: 'Daglig',
      frequency: 'daily',
      activeDays: [1, 2, 3, 4, 5],
      dispatchTime: '15:00',
      dueTime: '16:45',
      standardMottaker: valgtBase !== 'Alle baser' ? valgtBase : 'Alle baser',
      ansvarligRolle: 'Ped.leder',
      lovhjemmel: 'Forskrift om miljørettet helsevern i barnehager § 14',
      type: 'sjekkliste',
      sjekkpunkter: [
        { id: `sp-${Date.now()}-1`, tekst: '' },
        { id: `sp-${Date.now()}-2`, tekst: '' }
      ]
    });
    setRedigererRutine(null);
    setVisOpprettRutineModal(true);
  };

  // Åpne modal for å redigere eksisterende rutine
  const handleApneRedigerRutineModal = (rutine: Rutine) => {
    setRutineFormData({
      ...rutine,
      sjekkpunkter: rutine.sjekkpunkter && rutine.sjekkpunkter.length > 0
        ? rutine.sjekkpunkter
        : [{ id: `sp-${Date.now()}`, tekst: rutine.detaljer || 'Kontroller oppgaven' }]
    });
    setRedigererRutine(rutine);
    setVisOpprettRutineModal(true);
  };

  // Lagre rutine (både ny og redigert)
  const handleLagreRutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rutineFormData.tittel.trim()) {
      showToast('Vennligst oppgi en tittel på rutinen.');
      return;
    }

    const filtrerteSjekkpunkter = rutineFormData.sjekkpunkter.filter(p => p.tekst.trim() !== '');

    const lagretRutine: Rutine = {
      ...rutineFormData,
      sjekkpunkter: filtrerteSjekkpunkter.length > 0 
        ? filtrerteSjekkpunkter 
        : [{ id: `sp-${Date.now()}`, tekst: rutineFormData.detaljer || 'Kontroll utført' }],
      sistEndretDato: new Date().toLocaleDateString('no-NO')
    };

    if (redigererRutine) {
      setRutiner(prev => prev.map(r => r.id === lagretRutine.id ? lagretRutine : r));
      showToast(`Rutinen "${lagretRutine.tittel}" ble oppdatert!`);
    } else {
      setRutiner(prev => [lagretRutine, ...prev]);
      showToast(`Ny rutine "${lagretRutine.tittel}" lagret i biblioteket!`);
    }

    setVisOpprettRutineModal(false);
  };

  // Slett rutine
  const handleBekreftSlettRutine = () => {
    if (!sletteRutine) return;
    setRutiner(prev => prev.filter(r => r.id !== sletteRutine.id));
    showToast(`Rutinen "${sletteRutine.tittel}" ble slettet.`);
    setSletteRutine(null);
  };

  // Deleger / send pushvarsel
  const handleDeleger = (rutine: Rutine) => {
    setSender(rutine.id);
    
    setTimeout(() => {
      const klokkeslett = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
      const dato = new Date().toLocaleDateString('no-NO');

      const nyeSjekkpunkter = (rutine.sjekkpunkter || []).map(sp => ({
        id: sp.id,
        tekst: sp.tekst,
        fullfort: false
      }));

      const nyDelegering: Delegering = {
        id: Date.now(),
        rutineId: rutine.id,
        tittel: rutine.tittel,
        kategori: rutine.kategori,
        base: valgtBase,
        sendtTid: klokkeslett,
        sendtDato: dato,
        status: 'Venter',
        utfortAv: null,
        detaljer: rutine.detaljer,
        lovhjemmel: rutine.lovhjemmel,
        frekvens: rutine.frekvens,
        type: rutine.type,
        sjekkpunkter: nyeSjekkpunkter.length > 0 ? nyeSjekkpunkter : [{ id: 'sp-1', tekst: rutine.detaljer, fullfort: false }]
      };

      setAktiveDelegeringer(prev => [nyDelegering, ...prev]);
      setSender(null);
      showToast(`Push-varsel for "${rutine.tittel}" sendt til ${valgtBase}!`);
    }, 800);
  };

  // Åpne modal for å fylle ut / utføre en sjekkliste
  const handleApneUtforModal = (oppgave: Delegering) => {
    setUtfyllingData({
      utfortAv: oppgave.utfortAv || 'Karoline Haug (Styrer)',
      merknader: oppgave.merknader || '',
      avvikFunnet: oppgave.avvikFunnet || false,
      avvikBeskrivelse: oppgave.avvikBeskrivelse || '',
      sjekkpunkter: oppgave.sjekkpunkter && oppgave.sjekkpunkter.length > 0
        ? oppgave.sjekkpunkter
        : [{ id: 'sp-1', tekst: oppgave.detaljer || 'Kontrollpunkt gjennomført', fullfort: oppgave.status === 'Utført' }]
    });
    setUtforerDelegering(oppgave);
  };

  // Fullfør og arkiver sjekkliste
  const handleFullforOgArkiver = () => {
    if (!utforerDelegering) return;

    const lockedTimestamp = new Date().toISOString();
    const tidspunkt = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
    const dato = new Date().toLocaleDateString('no-NO');

    const manglerSjekk = utfyllingData.sjekkpunkter.some(sp => !sp.fullfort);
    const hasAvvik = utfyllingData.avvikFunnet || manglerSjekk;
    const finalStatus: 'ok' | 'avvik' = hasAvvik ? 'avvik' : 'ok';

    let createdDevId: string | null = null;

    if (finalStatus === 'avvik') {
      createdDevId = `avvik_${Date.now()}`;
      
      // Sync avvik to localStorage for HMSAvvik
      try {
        const saved = localStorage.getItem('styrern_hms_avvik_list');
        const avvikList = saved ? JSON.parse(saved) : [];
        const nySak = {
          id: createdDevId,
          tittel: `Avvik ved: ${utforerDelegering.tittel}`,
          beskrivelse: utfyllingData.avvikBeskrivelse || utfyllingData.merknader || 'Avvik registrert under utfylling av sjekkliste',
          base: utforerDelegering.base || 'Trollstua',
          meldtAv: utfyllingData.utfortAv || 'Karoline Haug (Styrer)',
          dato: dato,
          status: 'Åpen',
          alvorlighetsgrad: 'Middels',
          checklistId: `ark-${Date.now()}`,
          kommentarer: [`Opprettet automatisk fra sjekkliste "${utforerDelegering.tittel}"`]
        };
        localStorage.setItem('styrern_hms_avvik_list', JSON.stringify([nySak, ...avvikList]));
      } catch (err) {
        console.error('Feil ved lagring av avvik fra sjekkliste:', err);
      }
    }

    // Frys innholdet som en array i dokumentet
    const frozenContent: FrozenChecklistQuestion[] = utfyllingData.sjekkpunkter.map(sp => ({
      question: sp.tekst,
      checked: sp.fullfort,
      note: sp.fullfort ? (utfyllingData.merknader || '') : (utfyllingData.avvikBeskrivelse || utfyllingData.merknader || 'Ikke godkjent')
    }));

    const templateId = (utforerDelegering as any).templateId || `template_${utforerDelegering.rutineId || '01'}`;

    // 1. Lag ny arkivpost med låst tidsstempel, uid, frozenContent og deviationId
    const nyArkivPost: ArkivertGjennomforing = {
      id: `ark-${Date.now()}`,
      templateId: templateId,
      title: utforerDelegering.tittel || utforerDelegering.title || 'Sjekkliste',
      department: utforerDelegering.base || 'Trollstua',
      completedAt: lockedTimestamp, // Tidsstempelet låses
      completedBy: {
        uid: 'user_123',
        name: utfyllingData.utfortAv || 'Karoline Haug'
      },
      status: finalStatus,
      frozenContent: frozenContent,
      deviationId: createdDevId,

      // Bakoverkompatibilitet
      delegeringId: utforerDelegering.id,
      rutineId: utforerDelegering.rutineId,
      tittel: utforerDelegering.tittel,
      kategori: utforerDelegering.kategori || 'Sikkerhet & Uteområde',
      base: utforerDelegering.base,
      frekvens: utforerDelegering.frekvens || 'Ukentlig',
      utfortDato: dato,
      utfortTidspunkt: tidspunkt,
      utfortAv: utfyllingData.utfortAv || 'Karoline Haug (Styrer)',
      rolle: 'Styrer / Ansatt',
      lovhjemmel: utforerDelegering.lovhjemmel || 'Internkontrollforskriften § 5',
      sjekkpunkter: utfyllingData.sjekkpunkter,
      merknader: utfyllingData.merknader,
      avvikFunnet: finalStatus === 'avvik',
      avvikBeskrivelse: utfyllingData.avvikBeskrivelse,
      godkjentAvStyrer: true
    };

    // 2. Legg til i arkivet
    setArkiv(prev => [nyArkivPost, ...prev]);

    // 3. Oppdater status i aktive delegeringer
    setAktiveDelegeringer(prev => prev.map(d => {
      if (d.id === utforerDelegering.id) {
        return {
          ...d,
          status: 'Utført',
          utfortAv: utfyllingData.utfortAv,
          utfortTidspunkt: `${dato} ${tidspunkt}`,
          sjekkpunkter: utfyllingData.sjekkpunkter,
          merknader: utfyllingData.merknader,
          avvikFunnet: finalStatus === 'avvik',
          avvikBeskrivelse: utfyllingData.avvikBeskrivelse
        };
      }
      return d;
    }));

    setUtforerDelegering(null);
    if (finalStatus === 'avvik') {
      showToast(`⚠️ "${nyArkivPost.title}" er fullført med registrert avvik (#${createdDevId})!`);
    } else {
      showToast(`✓ "${nyArkivPost.title}" er fullført og frosset i HMS-arkivet!`);
    }
  };

  // Hurtig-kvittering av status
  const toggleHurtigUtfort = (oppgave: Delegering) => {
    if (oppgave.status === 'Venter') {
      handleApneUtforModal(oppgave);
    } else {
      setAktiveDelegeringer(prev => prev.map(o => o.id === oppgave.id ? { ...o, status: 'Venter', utfortAv: null } : o));
      showToast(`Status for "${oppgave.tittel}" satt til venter.`);
    }
  };

  // Eksporter samlet arkiv-tilsynsrapport som PDF
  const handleEksporterSamletArkivPdf = () => {
    try {
      const doc = new jsPDF();
      const exportListe = filtrertArkiv.length > 0 ? filtrertArkiv : arkiv;
      doc.setFillColor(30, 27, 75);
      doc.rect(0, 0, 210, 36, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('EVENTYRSKOGEN BARNEHAGE', 15, 15);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(199, 210, 254);
      doc.text('REVISJONSRAPPORT: UTFØRTE HMS-RUTINER & SJEKKLISTER', 15, 23);

      doc.setFontSize(8);
      doc.setTextColor(165, 180, 252);
      const periodeTekst = (arkivStartDate || arkivEndDate) 
        ? ` | Periode: ${arkivStartDate || 'Start'} til ${arkivEndDate || 'I dag'}`
        : '';
      doc.text(`Utskriftsdato: ${new Date().toLocaleDateString('no-NO')}  |  Totalt ${exportListe.length} utførte kontroller${periodeTekst}  |  Ansvarlig: Karoline Haug (Styrer)`, 15, 30);

      let y = 48;

      exportListe.forEach((post, idx) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(15, y, 180, 22, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${idx + 1}. ${post.tittel}`, 20, y + 6.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(`Avdeling: ${post.base}  |  Dato: ${post.utfortDato} kl. ${post.utfortTidspunkt}  |  Signert: ${post.utfortAv}`, 20, y + 13);
        doc.text(`Kategori: ${post.kategori}  |  Status: Fullført  |  Avvik: ${post.avvikFunnet ? 'JA (Se merknad)' : 'Ingen'}`, 20, y + 18.5);

        y += 26;

        if (post.merknader) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          const lines = doc.splitTextToSize(`Notat: "${post.merknader}"`, 170);
          doc.text(lines, 22, y);
          y += 5 + (lines.length * 4);
        }
      });

      doc.save(`HMS_Arkiv_Eventyrskogen_${new Date().toLocaleDateString('no-NO').replace(/\./g, '-')}.pdf`);
      showToast('Fullstendig HMS-tilsynsrapport lastet ned som PDF!');
    } catch (e) {
      console.error(e);
      showToast('Kunne ikke eksportere PDF');
    }
  };

  // 1. Rens listen: Behold kun oppgaver som IKKE er fullført
  const activeTasks = useMemo(() => {
    return aktiveDelegeringer.filter(task => task.status !== 'completed' && task.status !== 'Utført');
  }, [aktiveDelegeringer]);

  // Hjelpefunksjon for å sjekke om fristen er passert
  const isOverdue = (dueDate?: string | number | Date) => {
    if (!dueDate) return false;
    try {
      return new Date(dueDate).getTime() < Date.now();
    } catch {
      return false;
    }
  };

  // Filtrert bibliotek
  const filtrerteRutiner = rutiner.filter(r => {
    const matcherSok = bibliotekSok === '' || 
      r.tittel.toLowerCase().includes(bibliotekSok.toLowerCase()) || 
      r.detaljer.toLowerCase().includes(bibliotekSok.toLowerCase());
    const matcherKat = bibliotekKategoriFilter === 'alle' || r.kategori === bibliotekKategoriFilter;
    return matcherSok && matcherKat;
  });

  // Filtrert arkiv med søk, kategori, base og datoperiode
  const filtrertArkiv = arkiv.filter(a => {
    const matcherSok = arkivSok === '' ||
      a.tittel.toLowerCase().includes(arkivSok.toLowerCase()) ||
      a.utfortAv.toLowerCase().includes(arkivSok.toLowerCase()) ||
      (a.merknader && a.merknader.toLowerCase().includes(arkivSok.toLowerCase()));
    const matcherKat = arkivKategoriFilter === 'alle' || a.kategori === arkivKategoriFilter;
    const matcherBase = arkivBaseFilter === 'alle' || a.base.toLowerCase().includes(arkivBaseFilter.toLowerCase());

    // Datofiltrering (Date Range)
    let matcherDato = true;
    if (arkivStartDate || arkivEndDate) {
      let postTime = 0;
      if (a.utfortDato) {
        if (a.utfortDato.includes('.')) {
          const parts = a.utfortDato.split('.');
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            postTime = new Date(`${year}-${month}-${day}T12:00:00`).getTime();
          }
        } else {
          postTime = new Date(a.utfortDato).getTime();
        }
      }

      if (arkivStartDate && postTime > 0) {
        const start = new Date(`${arkivStartDate}T00:00:00`).getTime();
        if (!isNaN(start) && postTime < start) matcherDato = false;
      }
      if (arkivEndDate && postTime > 0) {
        const end = new Date(`${arkivEndDate}T23:59:59`).getTime();
        if (!isNaN(end) && postTime > end) matcherDato = false;
      }
    }

    return matcherSok && matcherKat && matcherBase && matcherDato;
  });

  return (
    <div className="space-y-6">
      
      {/* TOAST VARSEL */}
      {toastMelding && (
        <div className="fixed bottom-6 right-6 z-[200] bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-slate-700 animate-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMelding}</span>
        </div>
      )}

      {/* 1. TOPP: Tittel, Handlinger og Mottaker-velger */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md">
              <ListChecks size={26} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
                <span>Delegert HMS, Sjekklister & Arkiv</span>
              </h2>
              <p className="text-slate-500 text-sm mt-0.5">
                Styrerens verktøy for å opprette, redigere, delegere og arkivere lovpålagte HMS-rutiner og sjekklister.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleGenererStengesjekklister}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer hover:scale-[1.01]"
            title="Kjører 15:00-rutine: Oppretter ubesvarte stengesjekklister for alle avdelinger"
          >
            <Clock size={15} className="text-amber-600 shrink-0" />
            <span>Generer stengesjekklister (kl 15:00)</span>
          </button>

          <button
            type="button"
            onClick={handleApneNyRutineModal}
            className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition shadow-sm cursor-pointer hover:scale-[1.01]"
          >
            <Plus size={16} />
            <span>Ny rutine / sjekkliste</span>
          </button>

          {/* Mottaker for utsending */}
          <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 pl-1.5">Mottaker:</span>
            <select 
              value={valgtBase}
              onChange={(e) => setValgtBase(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-bold rounded-lg px-2.5 py-1 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              {BASER.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* LEDERGJENNOMGANG FOR FORRIGE MÅNED */}
      <ManagerMonthlyReview 
        monthName="September 2026" 
        unreviewedCount={arkiv.filter(a => !a.godkjentAvStyrer).length || 42}
        onSignOff={() => showToast('✓ Ledergjennomgang for September 2026 er digitalt signert ut!')}
      />

      {/* 2. SUB-FANER (AKTIV OPPFØLGING, BIBLIOTEK & ARKIV) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAktivHovedFane('oppfolging')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
              aktivHovedFane === 'oppfolging'
                ? 'bg-[#1e1b4b] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock size={16} />
            <span>Aktiv oppfølging</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              aktivHovedFane === 'oppfolging' ? 'bg-indigo-500/40 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {aktiveDelegeringer.filter(a => a.status === 'Venter').length} venter
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAktivHovedFane('bibliotek')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
              aktivHovedFane === 'bibliotek'
                ? 'bg-[#1e1b4b] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckSquare size={16} />
            <span>Rutine- & Sjekklistebibliotek</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              aktivHovedFane === 'bibliotek' ? 'bg-indigo-500/40 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {rutiner.length} maler
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAktivHovedFane('arkiv')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
              aktivHovedFane === 'arkiv'
                ? 'bg-emerald-800 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FolderArchive size={16} className={aktivHovedFane === 'arkiv' ? 'text-emerald-300' : ''} />
            <span>Arkiv for utførte kontroller</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              aktivHovedFane === 'arkiv' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {arkiv.length} arkivert
            </span>
          </button>
        </div>

        {aktivHovedFane === 'arkiv' && (
          <ExportButton onClick={handleEksporterSamletArkivPdf} />
        )}
      </div>

      {/* 3. INNHOLD: FANE 1 - AKTIV OPPFØLGING & DELEGERING */}
      {aktivHovedFane === 'oppfolging' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* VENSTRE: Hurtig-delegering fra biblioteket */}
          <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Send size={18} className="text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">Send rutine til avdeling</h3>
              </div>
              <span className="text-xs text-slate-500">{rutiner.length} tilgjengelige maler</span>
            </div>

            <div className="p-4 flex-1 space-y-2.5 overflow-y-auto max-h-[620px]">
              {rutiner.map(rutine => (
                <div 
                  key={rutine.id}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all flex flex-col justify-between gap-3 bg-white"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-xs text-slate-900">{rutine.tittel}</h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full shrink-0">
                        {rutine.frekvens}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{rutine.detaljer}</p>
                    
                    {rutine.sjekkpunkter && rutine.sjekkpunkter.length > 0 && (
                      <div className="mt-2 flex items-center space-x-1.5 text-[11px] font-semibold text-indigo-700">
                        <CheckSquare size={13} />
                        <span>{rutine.sjekkpunkter.length} sjekkpunkter</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleApneRedigerRutineModal(rutine)}
                      className="text-slate-400 hover:text-indigo-600 text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                    >
                      <Edit2 size={12} />
                      <span>Rediger mal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleger(rutine)}
                      disabled={sender === rutine.id}
                      className="flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-200 hover:border-indigo-600 transition cursor-pointer shadow-2xs"
                    >
                      {sender === rutine.id ? (
                        <span className="flex items-center space-x-1">
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Sender...</span>
                        </span>
                      ) : (
                        <>
                          <Smartphone size={13} />
                          <span>Send til {valgtBase.split(' ')[0]}</span>
                          <Send size={11} className="ml-0.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HØYRE: Aktive delegerte oppgaver & status */}
          <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert size={18} className="text-indigo-600" />
                <h3 className="font-semibold text-slate-800 text-base">Aktiv Oppfølging & Delegeringer</h3>
              </div>
              <span className="text-sm text-indigo-600 font-medium bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                {activeTasks.length} venter på svar
              </span>
            </div>

            <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[620px]">
              {/* Rendre de filtrerte, aktive oppgavene */}
              {activeTasks.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500 opacity-60" />
                  <p className="text-slate-500 text-sm italic font-medium">Ingen utestående sjekklister akkurat nå.</p>
                  <p className="text-xs text-slate-400 mt-1">Alle delegerte oppgaver er kvittert ut og overført til arkivet.</p>
                </div>
              ) : (
                activeTasks.map((task) => {
                  const overdue = isOverdue(task.dueDate);
                  
                  return (
                    <div 
                      key={task.id} 
                      // 2. Visuell forfallsdato: Betinget Tailwind-styling
                      className={`flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 border rounded-lg bg-white transition-colors gap-3
                        ${overdue ? 'border-rose-300 bg-rose-50' : 'border-slate-200 hover:border-slate-300'}`
                      }
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className={`font-medium ${overdue ? 'text-rose-700' : 'text-slate-800'}`}>
                            {task.title || task.tittel}
                          </h4>
                          {overdue && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200/80 text-rose-800 uppercase tracking-wider">
                              Frist overskredet
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 flex flex-wrap items-center gap-3 mt-1">
                          <span className="font-medium text-slate-700">📍 {task.base}</span>
                          <span className={overdue ? 'text-rose-600 font-medium' : ''}>
                            Frist: {task.dueDate 
                              ? new Date(task.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                              : task.sendtTid
                            }
                          </span>
                          {task.frekvens && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {task.frekvens}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button 
                        type="button"
                        onClick={() => handleApneUtforModal(task)}
                        className="px-4 py-2 text-sm font-medium bg-amber-100 text-amber-800 rounded hover:bg-amber-200 border border-amber-200 cursor-pointer shrink-0 transition-colors"
                      >
                        Kvitter ut / fyll sjekkliste
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>💡 Klikk på «Kvitter ut / fyll sjekkliste» for å huke av sjekkpunkter og flytte til arkivet.</span>
              <span className="font-bold text-emerald-700">Digital sporbarhet iht. internkontrollforskriften</span>
            </div>
          </div>

        </div>
      )}

      {/* 4. INNHOLD: FANE 2 - RUTINE- OG SJEKKLISTEBIBLIOTEK */}
      {aktivHovedFane === 'bibliotek' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={bibliotekSok}
                  onChange={(e) => setBibliotekSok(e.target.value)}
                  placeholder="Søk i rutiner og sjekkpunkter..."
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none w-56 sm:w-72"
                />
              </div>

              <select
                value={bibliotekKategoriFilter}
                onChange={(e) => setBibliotekKategoriFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-xs font-bold text-slate-700 rounded-xl px-3 py-2 outline-none cursor-pointer"
              >
                <option value="alle">Alle kategorier</option>
                {KATEGORIER.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <button
              type="button"
              onClick={handleApneNyRutineModal}
              className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Opprett ny rutine</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtrerteRutiner.map(rutine => (
              <div 
                key={rutine.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                      {rutine.kategori}
                    </span>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                      {rutine.frekvens}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 leading-snug">{rutine.tittel}</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{rutine.detaljer}</p>

                  {rutine.lovhjemmel && (
                    <div className="mt-2.5 p-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] text-slate-600 font-medium">
                      ⚖️ <strong>Lovkrav:</strong> {rutine.lovhjemmel}
                    </div>
                  )}

                  {(rutine.dispatchTime || rutine.dueTime) && (
                    <div className="mt-2 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100 text-[10px] text-indigo-900 font-semibold flex items-center justify-between">
                      <span>⏰ Utsending: <strong>{rutine.dispatchTime || '15:00'}</strong></span>
                      <span>Frist: <strong>{rutine.dueTime || '16:45'}</strong></span>
                    </div>
                  )}

                  {/* SJEKKPUNKTER PREVIEW */}
                  {rutine.sjekkpunkter && rutine.sjekkpunkter.length > 0 && (
                    <div className="mt-3 space-y-1.5 pt-2.5 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Sjekkpunkter ({rutine.sjekkpunkter.length}):
                      </span>
                      {rutine.sjekkpunkter.map((sp, idx) => (
                        <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5"></span>
                          <span className="line-clamp-1">{sp.tekst}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleApneRedigerRutineModal(rutine)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                      title="Rediger rutine"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSletteRutine(rutine)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Slett rutine"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleger(rutine)}
                    className="flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-indigo-200 hover:border-indigo-600 transition cursor-pointer shadow-2xs"
                  >
                    <Send size={12} />
                    <span>Send til base</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. INNHOLD: FANE 3 - ARKIV FOR UTFØRTE KONTROLLER */}
      {aktivHovedFane === 'arkiv' && (
        <div className="space-y-4">
          
          {/* SØK & FILTRERING FOR ARKIV */}
          <ArchiveFilters
            search={arkivSok}
            onSearchChange={setArkivSok}
            category={arkivKategoriFilter}
            onCategoryChange={setArkivKategoriFilter}
            categories={KATEGORIER}
            department={arkivBaseFilter}
            onDepartmentChange={setArkivBaseFilter}
            departments={BASER}
            startDate={arkivStartDate}
            onStartDateChange={setArkivStartDate}
            endDate={arkivEndDate}
            onEndDateChange={setArkivEndDate}
            totalResultsCount={filtrertArkiv.length}
          />

          {/* ARKIVLISTE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {filtrertArkiv.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                Ingen utførte kontroller funnet i arkivet med valgte søkekriterier.
              </div>
            ) : (
              filtrertArkiv.map((post) => (
                <ArchiveTableRow
                  key={post.id}
                  record={post}
                  onOpenChecklist={(rec) => setValgtArkivPost(rec as any)}
                  onNavigateToDeviation={() => {
                    if (onNavigate) onNavigate('avvik');
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: OPPRETT / REDIGER RUTINE & SJEKKLISTE */}
      {visOpprettRutineModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-purple-950 text-white p-5 flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-800 rounded-xl">
                  <ListChecks size={22} className="text-indigo-200" />
                </div>
                <div>
                  <h4 className="font-bold text-base">
                    {redigererRutine ? 'Rediger HMS-rutine / Sjekkliste' : 'Opprett ny HMS-rutine & Sjekkliste'}
                  </h4>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Definer instruks, frekvens, lovhjemmel og sjekkpunkter for avdelingene.
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setVisOpprettRutineModal(false)}
                className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLagreRutine} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tittel på rutinen / sjekklisten *</label>
                <input
                  type="text"
                  required
                  value={rutineFormData.tittel}
                  onChange={(e) => setRutineFormData(prev => ({ ...prev, tittel: e.target.value }))}
                  placeholder="F.eks. Månedlig ettersyn av soveskur og vognseler"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={rutineFormData.kategori}
                    onChange={(e) => setRutineFormData(prev => ({ ...prev, kategori: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                  >
                    {KATEGORIER.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Frekvens / Intervall</label>
                  <select
                    value={rutineFormData.frekvens}
                    onChange={(e) => setRutineFormData(prev => ({ ...prev, frekvens: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                  >
                    {FREKVENSER.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Standard mottaker / Base</label>
                  <select
                    value={rutineFormData.standardMottaker}
                    onChange={(e) => setRutineFormData(prev => ({ ...prev, standardMottaker: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                  >
                    {BASER.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ansvarlig rolle</label>
                  <input
                    type="text"
                    value={rutineFormData.ansvarligRolle}
                    onChange={(e) => setRutineFormData(prev => ({ ...prev, ansvarligRolle: e.target.value }))}
                    placeholder="F.eks. Ped.leder / Verneombud"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                  />
                </div>
              </div>

              {/* STYRERENS TIDSINNSTILLINGER (DISPATCH TIME & DUE TIME) */}
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-indigo-950 block uppercase tracking-wider flex items-center space-x-1.5">
                  <Clock size={14} className="text-indigo-600" />
                  <span>Styrerens Tidsinnstillinger & Automatisk Utsending</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Utsendingstidspunkt (dispatchTime)
                    </label>
                    <input
                      type="time"
                      value={rutineFormData.dispatchTime || '15:00'}
                      onChange={(e) => setRutineFormData(prev => ({ ...prev, dispatchTime: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 block mt-0.5">Tidspunkt oppgaven dukker opp på avdelingen</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Frist / Forfallstidspunkt (dueTime)
                    </label>
                    <input
                      type="time"
                      value={rutineFormData.dueTime || '16:45'}
                      onChange={(e) => setRutineFormData(prev => ({ ...prev, dueTime: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 block mt-0.5">Tidspunktet oppgaven blir rød/forfalt i dashbordet</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Aktive dager (activeDays)</label>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {[
                      { day: 1, label: 'Man' },
                      { day: 2, label: 'Tir' },
                      { day: 3, label: 'Ons' },
                      { day: 4, label: 'Tor' },
                      { day: 5, label: 'Fre' }
                    ].map(({ day, label }) => {
                      const active = (rutineFormData.activeDays || [1, 2, 3, 4, 5]).includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const current = rutineFormData.activeDays || [1, 2, 3, 4, 5];
                            const updated = current.includes(day)
                              ? current.filter(d => d !== day)
                              : [...current, day].sort();
                            setRutineFormData(prev => ({ ...prev, activeDays: updated }));
                          }}
                          className={`px-3 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                            active
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lovhjemmel / Forskriftskrav (valgfritt)</label>
                <input
                  type="text"
                  value={rutineFormData.lovhjemmel || ''}
                  onChange={(e) => setRutineFormData(prev => ({ ...prev, lovhjemmel: e.target.value }))}
                  placeholder="F.eks. Forskrift om miljørettet helsevern i barnehager § 14"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Beskrivelse & instruks</label>
                <textarea
                  rows={2}
                  value={rutineFormData.detaljer}
                  onChange={(e) => setRutineFormData(prev => ({ ...prev, detaljer: e.target.value }))}
                  placeholder="Kort instruks til den som utfører kontrollen..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 outline-none"
                />
              </div>

              {/* DYNAMISK LISTE OVER SJEKKPUNKTER */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <CheckSquare size={14} className="text-indigo-600" />
                    <span>Sjekkpunkter ({rutineFormData.sjekkpunkter.length} punkter)</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setRutineFormData(prev => ({
                        ...prev,
                        sjekkpunkter: [
                          ...prev.sjekkpunkter,
                          { id: `sp-${Date.now()}-${prev.sjekkpunkter.length + 1}`, tekst: '' }
                        ]
                      }));
                    }}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Legg til sjekkpunkt</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {rutineFormData.sjekkpunkter.map((sp, idx) => (
                    <div key={sp.id} className="flex items-center space-x-2">
                      <span className="w-5 text-center text-xs font-bold text-slate-400">{idx + 1}.</span>
                      <input
                        type="text"
                        value={sp.tekst}
                        onChange={(e) => {
                          const oppdatert = e.target.value;
                          setRutineFormData(prev => ({
                            ...prev,
                            sjekkpunkter: prev.sjekkpunkter.map((p, i) => i === idx ? { ...p, tekst: oppdatert } : p)
                          }));
                        }}
                        placeholder={`Sjekkpunkt ${idx + 1}...`}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                      />
                      {rutineFormData.sjekkpunkter.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setRutineFormData(prev => ({
                              ...prev,
                              sjekkpunkter: prev.sjekkpunkter.filter((_, i) => i !== idx)
                            }));
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                          title="Fjern sjekkpunkt"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setVisOpprettRutineModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  {redigererRutine ? 'Lagre endringer' : 'Opprett rutine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UTFØR / KVITTER SJEKKLISTE & SEND TIL ARKIV */}
      {utforerDelegering && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white p-5 flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-800 rounded-xl">
                  <CheckSquare size={22} className="text-emerald-200" />
                </div>
                <div>
                  <h4 className="font-bold text-base">{utforerDelegering.tittel}</h4>
                  <p className="text-xs text-emerald-200 mt-0.5">
                    Avdeling: {utforerDelegering.base} • Sendt: {utforerDelegering.sendtDato || 'I dag'} kl. {utforerDelegering.sendtTid}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setUtforerDelegering(null)}
                className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {utforerDelegering.detaljer && (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                  <strong>Instruks:</strong> {utforerDelegering.detaljer}
                </div>
              )}

              {/* SJEKKPUNKTER MED STOR AVKRYSNING */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Huk av for gjennomførte sjekkpunkter:
                </label>

                {utfyllingData.sjekkpunkter.map((sp, idx) => (
                  <label 
                    key={sp.id || idx}
                    className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      sp.fullfort 
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold' 
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={sp.fullfort}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUtfyllingData(prev => ({
                          ...prev,
                          sjekkpunkter: prev.sjekkpunkter.map((item, i) => i === idx ? { ...item, fullfort: checked } : item)
                        }));
                      }}
                      className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs leading-relaxed flex-1">{sp.tekst}</span>
                  </label>
                ))}
              </div>

              {/* NOTAT / MERKNADER */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Merknader / observasjoner under kontrollen:
                </label>
                <textarea
                  rows={2}
                  value={utfyllingData.merknader}
                  onChange={(e) => setUtfyllingData(prev => ({ ...prev, merknader: e.target.value }))}
                  placeholder="F.eks. Alt i orden, ingen feil oppdaget..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* AVVIKSHÅNDTERING */}
              <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-amber-950">
                  <input
                    type="checkbox"
                    checked={utfyllingData.avvikFunnet}
                    onChange={(e) => setUtfyllingData(prev => ({ ...prev, avvikFunnet: e.target.checked }))}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Ble det oppdaget et avvik eller feil som må rettes?</span>
                </label>

                {utfyllingData.avvikFunnet && (
                  <input
                    type="text"
                    value={utfyllingData.avvikBeskrivelse}
                    onChange={(e) => setUtfyllingData(prev => ({ ...prev, avvikBeskrivelse: e.target.value }))}
                    placeholder="Beskriv avviket (f.eks. Løs skrue på klatrestativ)..."
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  />
                )}
              </div>

              {/* SIGNATURFELT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Utført og signert av *</label>
                  <input
                    type="text"
                    value={utfyllingData.utfortAv}
                    onChange={(e) => setUtfyllingData(prev => ({ ...prev, utfortAv: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dato & Klokkeslett</label>
                  <input
                    type="text"
                    disabled
                    value={`${new Date().toLocaleDateString('no-NO')} kl. ${new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}`}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-500"
                  />
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setUtforerDelegering(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Avbryt
              </button>

              <button
                type="button"
                onClick={handleFullforOgArkiver}
                className="flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <CheckCircle2 size={15} />
                <span>Fullfør og flytt til Arkiv</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ARKIV-INSPEKSJON (SE FULLFØRT OG FROSSET SJEKKLISTE) */}
      {valgtArkivPost && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-slate-800 rounded-xl">
                  <FolderArchive size={22} className="text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-bold text-base">{valgtArkivPost.title || valgtArkivPost.tittel}</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Malle-ID: <code className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px] text-emerald-300">{valgtArkivPost.templateId || 'sovevogn_ukentlig_01'}</code> • Avdeling: {valgtArkivPost.department || valgtArkivPost.base}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setValgtArkivPost(null)}
                className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* STATUS & LÅST TIDSSTEMPEL PANEL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Utført & Signert av:</span>
                  <span className="font-bold text-slate-800 text-sm">{valgtArkivPost.completedBy?.name || valgtArkivPost.utfortAv || 'Karoline Haug'}</span>
                  <span className="text-[10px] text-slate-500 block font-mono">UID: {valgtArkivPost.completedBy?.uid || 'user_123'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Låst Tidsstempel (completedAt):</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {valgtArkivPost.completedAt 
                      ? new Date(valgtArkivPost.completedAt).toLocaleString('no-NO') 
                      : `${valgtArkivPost.utfortDato} kl. ${valgtArkivPost.utfortTidspunkt}`}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono truncate">{valgtArkivPost.completedAt || new Date().toISOString()}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Avdeling:</span>
                  <span className="font-bold text-slate-800">{valgtArkivPost.department || valgtArkivPost.base}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Sjekkliste-status:</span>
                  {valgtArkivPost.status === 'ok' || (!valgtArkivPost.avvikFunnet && valgtArkivPost.status !== 'avvik') ? (
                    <span className="inline-flex items-center space-x-1 font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      <CheckCircle2 size={13} />
                      <span>OK (Ingen avvik)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                      <AlertTriangle size={13} />
                      <span>AVVIK REGISTRERT</span>
                    </span>
                  )}
                </div>
              </div>

              {/* TILKNYTTET AVVIK LINK HVIS deviationId FINNES */}
              {valgtArkivPost.deviationId && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <AlertTriangle className="text-rose-600 shrink-0" size={20} />
                    <div>
                      <span className="text-xs font-bold text-rose-950 block">Tilknyttet Avvikssak (#{valgtArkivPost.deviationId})</span>
                      <p className="text-[11px] text-rose-800">
                        {valgtArkivPost.avvikBeskrivelse || 'Avvik registrert under denne kontrollen.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setValgtArkivPost(null);
                      if (onNavigate) onNavigate('avvik');
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shrink-0 transition shadow-2xs cursor-pointer"
                  >
                    Åpne Avvik
                  </button>
                </div>
              )}

              {valgtArkivPost.lovhjemmel && (
                <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs text-indigo-900">
                  ⚖️ <strong>Lovhjemmel:</strong> {valgtArkivPost.lovhjemmel}
                </div>
              )}

              {/* DET VIKTIGSTE: FROZEN CONTENT (Frosset innhold som en array) */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <CheckSquare size={15} className="text-indigo-600" />
                    <span>Frosset innhold (frozenContent):</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    🔒 Låst dokument
                  </span>
                </div>

                <div className="space-y-2">
                  {(valgtArkivPost.frozenContent && valgtArkivPost.frozenContent.length > 0 
                    ? valgtArkivPost.frozenContent 
                    : (valgtArkivPost.sjekkpunkter || []).map(sp => ({
                        question: sp.tekst,
                        checked: sp.fullfort,
                        note: ''
                      }))
                  ).map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-xl border text-xs flex flex-col gap-1 transition-all ${
                        item.checked 
                          ? 'bg-emerald-50/60 border-emerald-200 text-slate-900' 
                          : 'bg-rose-50/70 border-rose-200 text-slate-900 font-medium'
                      }`}
                    >
                      <div className="flex items-start space-x-2.5">
                        <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                          item.checked ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                        }`}>
                          {item.checked ? '✓' : '✕'}
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 text-xs leading-relaxed">{item.question}</p>
                          {item.note && (
                            <p className="text-[11px] text-slate-600 italic mt-0.5">
                              Notat: "{item.note}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {valgtArkivPost.merknader && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hovedmerknad for kontrollen:</label>
                  <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 italic">
                    "{valgtArkivPost.merknader}"
                  </p>
                </div>
              )}

            </div>

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
                    doc.text('KONTROLLPROTOKOLL / SJEKKLISTE', 15, 13);
                    doc.setFontSize(8.5);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(199, 210, 254);
                    doc.text('Eventyrskogen Barnehage | Lovpålagt internkontroll jfr. Internkontrollforskriften § 5', 15, 21);

                    let y = 42;
                    doc.setFillColor(248, 250, 252);
                    doc.roundedRect(15, y, 180, 22, 2, 2, 'FD');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.setTextColor(15, 23, 42);
                    doc.text(`Rutine: ${valgtArkivPost.title || valgtArkivPost.tittel}`, 20, y + 7);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(71, 85, 105);
                    doc.text(`Avdeling: ${valgtArkivPost.department || valgtArkivPost.base}  |  Dato: ${valgtArkivPost.completedAt ? new Date(valgtArkivPost.completedAt).toLocaleString('no-NO') : valgtArkivPost.utfortDato}  |  Signert: ${valgtArkivPost.completedBy?.name || valgtArkivPost.utfortAv}`, 20, y + 15);

                    y += 30;

                    const exportContent = valgtArkivPost.frozenContent || (valgtArkivPost.sjekkpunkter || []).map(sp => ({ question: sp.tekst, checked: sp.fullfort, note: '' }));

                    exportContent.forEach((sp, idx) => {
                      doc.setFont('helvetica', 'bold');
                      doc.setFontSize(8.5);
                      doc.setTextColor(sp.checked ? 5 : 220, sp.checked ? 150 : 38, sp.checked ? 105 : 38);
                      doc.text(`[${sp.checked ? '✓' : '✕'}] Punkt ${idx + 1}:`, 18, y);
                      doc.setFont('helvetica', 'normal');
                      doc.setTextColor(51, 65, 85);
                      const lines = doc.splitTextToSize(sp.question, 160);
                      doc.text(lines, 38, y);
                      y += 6 + (lines.length * 4);
                    });

                    if (valgtArkivPost.merknader) {
                      y += 4;
                      doc.setFont('helvetica', 'bold');
                      doc.setFontSize(9);
                      doc.setTextColor(15, 23, 42);
                      doc.text('Merknader:', 18, y);
                      doc.setFont('helvetica', 'normal');
                      doc.setFontSize(8.5);
                      doc.text(valgtArkivPost.merknader, 20, y + 5);
                    }

                    doc.save(`HMS_Kontroll_${(valgtArkivPost.title || valgtArkivPost.tittel).replace(/\s+/g, '_')}_${valgtArkivPost.utfortDato}.pdf`);
                    showToast('Kontrollprotokoll lastet ned som PDF!');
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="flex items-center space-x-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 transition cursor-pointer"
              >
                <Download size={14} />
                <span>Last ned PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setValgtArkivPost(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Lukk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BEKREFT SLETTING AV RUTINE */}
      {sletteRutine && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 border border-slate-100 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Slett rutine fra biblioteket?</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Er du sikker på at du vil slette <strong>"{sletteRutine.tittel}"</strong>? Rutinen vil ikke lenger være tilgjengelig for utsending til basene.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSletteRutine(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={handleBekreftSlettRutine}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
              >
                Ja, slett rutine
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DelegertHMS;
