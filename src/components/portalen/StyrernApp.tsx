import React, { useState, useEffect } from 'react';
import { callGoogleAIProxy } from '../../services/geminiService';
import { 
  LayoutDashboard, 
  Users, 
  ShieldAlert, 
  CalendarDays, 
  Bot, 
  BookOpen,
  Bell,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Send,
  Sparkles,
  PhoneCall,
  UserCheck,
  HeartHandshake,
  FileText,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Building,
  CheckSquare,
  Wrench,
  Flame,
  UtensilsCrossed,
  FileCheck,
  GraduationCap,
  FileSignature,
  ListChecks,
  CalendarRange,
  X,
  Award,
  Layers,
  Printer
} from 'lucide-react';
import Kontrollpanel from './Kontrollpanel';
import DagensOversikt from './DagensOversikt';
import Bemanningsradar from './Bemanningsradar';
import VaktlisteTurnus from './VaktlisteTurnus';
import HMSAvvik from './HMSAvvik';
import Saksradar from './Saksradar';
import AarshjulOgLovverk from './AarshjulOgLovverk';
import StyrerAI from './StyrerAI';
import Tilsynseksport from './Tilsynseksport';
import KompetanseMatrise from './KompetanseMatrise';
import Personalhandbok from './Personalhandbok';
import DelegertHMS from './DelegertHMS';
import PersonalHR from './PersonalHR';
import ITPMalbygger from './ITPMalbygger';
import UserProfileModal from '../common/UserProfileModal';
import PortalFooter from '../common/PortalFooter';
import { useRole } from '../../context/RoleContext';

interface Department {
  id: string;
  name: string;
  ageGroup: string;
  childrenCount: number;
  capacity: number;
  pedagogues: number;
  staffPresent: number;
  staffRequired: number;
  hasSickLeave: boolean;
  status: 'ok' | 'warning' | 'critical';
}

interface SickLeaveReport {
  id: string;
  name: string;
  role: string;
  dept: string;
  period: string;
  substituteStatus: 'assigned' | 'needed' | 'not_needed';
  substituteName?: string;
}

interface HMSIssue {
  id: string;
  title: string;
  location: string;
  category: 'Lekeplass' | 'Brannvern' | 'Inneklima' | 'Bygg/Vedlikehold' | 'Smittevern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  reportedDate: string;
  reportedBy: string;
  deadline: string;
  actionPlan: string;
}

interface YearEvent {
  id: string;
  title: string;
  month: string;
  category: 'Lovkrav & Tilsyn' | 'SU & Foreldresamarbeid' | 'Personal & HMS' | 'Pedagogikk' | 'Økonomi';
  deadline: string;
  completed: boolean;
  mandatory: boolean;
  description: string;
}

const StyrernApp: React.FC = () => {
  const { role, isSvein, isPortalBeta, currentUserEmail } = useRole();
  const isHavard = currentUserEmail?.toLowerCase() === 'havard.hovin@melhus.kommune.no' || isPortalBeta;
  const [activeTab, setActiveTab] = useState('oversikt');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Sub-fane styring for sammenslåtte hovedkategorier
  const [personalSubTab, setPersonalSubTab] = useState<'ansatte' | 'vaktliste' | 'bemanning' | 'kompetanse' | 'handbok'>('ansatte');
  const [kvalitetSubTab, setKvalitetSubTab] = useState<'avvik' | 'delegerthms' | 'tilsyn' | 'spesped'>('avvik');
  const [ressurserSubTab, setRessurserSubTab] = useState<'profil' | 'aarshjul' | 'progresjon' | 'lovverk' | 'itpmal'>('profil');
  const [exportTriggerCount, setExportTriggerCount] = useState(0);

  // OPPDATERT: Slått sammen til 5 krystallklare hovedfaner, pluss Kontrollpanel til høyre
  const navItems = [
    { id: 'oversikt', label: 'Oversikt', icon: LayoutDashboard },
    { id: 'personal', label: 'Personal & HR', icon: Users }, // Rommer Bemanning, Kompetanse, Håndbok
    { id: 'kvalitet', label: 'Kvalitet & HMS', icon: ShieldAlert }, // Rommer Avvik, Delegert HMS, Tilsyn
    { id: 'ressurser', label: 'Årshjul & Lovverk', icon: BookOpen },
    { id: 'ai', label: 'Styrer AI', icon: Bot }
  ];

  // Håndterer smart navigasjon fra underkomponenter (f.eks. knapper i oversikten)
  const handleNavigate = (target: string) => {
    switch (target) {
      case 'oversikt':
        setActiveTab('oversikt');
        break;
      case 'vaktliste':
      case 'turnus':
      case 'vaktplan':
        setActiveTab('personal');
        setPersonalSubTab('vaktliste');
        break;
      case 'ansatte':
      case 'kompetanse':
        setActiveTab('personal');
        setPersonalSubTab('ansatte');
        break;
      case 'bemanning':
        setActiveTab('personal');
        setPersonalSubTab('bemanning');
        break;
      case 'personalhandbok':
      case 'handbok':
        setActiveTab('personal');
        setPersonalSubTab('handbok');
        break;
      case 'personal':
        setActiveTab('personal');
        break;
      case 'hms':
      case 'avvik':
        setActiveTab('kvalitet');
        setKvalitetSubTab('avvik');
        break;
      case 'delegerthms':
        setActiveTab('kvalitet');
        setKvalitetSubTab('delegerthms');
        break;
      case 'tilsyn':
        setActiveTab('kvalitet');
        setKvalitetSubTab('tilsyn');
        break;
      case 'kvalitet':
        setActiveTab('kvalitet');
        break;
      case 'profil':
        setActiveTab('ressurser');
        setRessurserSubTab('profil');
        break;
      case 'progresjon':
      case 'progresjonsplaner':
        setActiveTab('ressurser');
        setRessurserSubTab('progresjon');
        break;
      case 'aarshjul':
        setActiveTab('ressurser');
        setRessurserSubTab('aarshjul');
        break;
      case 'lovverk':
        setActiveTab('ressurser');
        setRessurserSubTab('lovverk');
        break;
      case 'itpmal':
      case 'itp-mal':
      case 'malbygger':
        setActiveTab('ressurser');
        setRessurserSubTab('itpmal');
        break;
      case 'ressurser':
        setActiveTab('ressurser');
        break;
      case 'ai':
        setActiveTab('ai');
        break;
      case 'kontrollpanel':
        setActiveTab('kontrollpanel');
        break;
      default:
        setActiveTab(target);
    }
  };

  // Avdelingsdata for Eventyrskogen Barnehage
  const [departments, setDepartments] = useState<Department[]>([
    { id: 'dep-1', name: 'Blåbærtua', ageGroup: '3-6 år', childrenCount: 28, capacity: 30, pedagogues: 2, staffPresent: 5, staffRequired: 5, hasSickLeave: false, status: 'ok' },
    { id: 'dep-2', name: 'Revehiet', ageGroup: '3-6 år', childrenCount: 26, capacity: 28, pedagogues: 2, staffPresent: 4, staffRequired: 5, hasSickLeave: true, status: 'warning' },
    { id: 'dep-3', name: 'Moseplassen', ageGroup: '1-2 år', childrenCount: 12, capacity: 12, pedagogues: 1, staffPresent: 4, staffRequired: 4, hasSickLeave: false, status: 'ok' },
    { id: 'dep-4', name: 'Trollstua', ageGroup: '1-2 år', childrenCount: 12, capacity: 14, pedagogues: 1, staffPresent: 4, staffRequired: 4, hasSickLeave: false, status: 'ok' }
  ]);

  // Fraværsliste
  const [sickLeaves, setSickLeaves] = useState<SickLeaveReport[]>(() => {
    const saved = localStorage.getItem('styrern_sick_leaves');
    return saved ? JSON.parse(saved) : [
      { id: 's1', name: 'Lars Pettersen', role: 'Fagarbeider', dept: 'Revehiet', period: 'Mandag - Onsdag', substituteStatus: 'assigned', substituteName: 'Jonas Lie (Tilkallingsvikar)' },
      { id: 's2', name: 'Marit Simonsen', role: 'Assistent', dept: 'Moseplassen', period: 'Kun i dag (egenmelding)', substituteStatus: 'not_needed' }
    ];
  });

  // HMS & Avvik
  const [hmsIssues, setHmsIssues] = useState<HMSIssue[]>(() => {
    const saved = localStorage.getItem('styrern_hms_issues');
    return saved ? JSON.parse(saved) : [
      {
        id: 'h1',
        title: 'Løs kjetting på reke-husken i øvre uteområde',
        location: 'Uteområde vest',
        category: 'Lekeplass',
        severity: 'high',
        status: 'open',
        reportedDate: '04.10.2026',
        reportedBy: 'Karianne Moe (Verneombud)',
        deadline: '06.10.2026',
        actionPlan: 'Vaktmester kontaktet for umiddelbar låsing/utskifting av kjettinglenke.'
      },
      {
        id: 'h2',
        title: 'Selvlukkende dør til grovgarderobe henger i karmen',
        location: 'Revehiet grovgarderobe',
        category: 'Brannvern',
        severity: 'medium',
        status: 'in_progress',
        reportedDate: '02.10.2026',
        reportedBy: 'Ingrid Solberg (Ped.leder)',
        deadline: '09.10.2026',
        actionPlan: 'Smøring og justering av dørpumpe bestilt hos kommunal eiendomsdrift.'
      },
      {
        id: 'h3',
        title: 'Førstehjelpskoffert i barnevognhus manglet steril kompress',
        location: 'Barnevognskur',
        category: 'Lekeplass',
        severity: 'low',
        status: 'resolved',
        reportedDate: '28.09.2026',
        reportedBy: 'Morten Hansen (Ped.leder)',
        deadline: '30.09.2026',
        actionPlan: 'Koffert etterfylt og forseglet av HMS-ansvarlig.'
      }
    ];
  });

  // Årshjul og frister
  const [yearEvents, setYearEvents] = useState<YearEvent[]>(() => {
    const saved = localStorage.getItem('styrern_year_events');
    return saved ? JSON.parse(saved) : [
      { id: 'y1', title: 'Samarbeidsutvalget (SU): Konstituerende møte & årsplan-vedtak', month: 'Oktober', category: 'SU & Foreldresamarbeid', deadline: '20. oktober', completed: false, mandatory: true, description: 'Barnehageloven § 4 krever at hver barnehage har et samarbeidsutvalg og foreldreråd.' },
      { id: 'y2', title: 'Høst-brannøvelse med evakuering og opptelling', month: 'Oktober', category: 'Personal & HMS', deadline: '28. oktober', completed: true, mandatory: true, description: 'Gjennomføres i henhold til forskrift om brannforebygging.' },
      { id: 'y3', title: 'Gjennomføring av foreldresamtaler høst', month: 'November', category: 'SU & Foreldresamarbeid', deadline: '15. november', completed: false, mandatory: false, description: 'Pedagogiske ledere har samtaler med samtlige foresatte.' },
      { id: 'y4', title: 'Frist: Innsending av BASIL (Barnehage-statistikk til Udir)', month: 'Desember', category: 'Lovkrav & Tilsyn', deadline: '01. desember', completed: false, mandatory: true, description: 'Lovpålagt rapportering av barnetall, bemanning og pedagogdekning.' },
      { id: 'y5', title: 'Budsjettrevisjon og bestilling av vikarramme våren', month: 'Desember', category: 'Økonomi', deadline: '12. desember', completed: false, mandatory: true, description: 'Gjennomgang med eier/kommune.' }
    ];
  });

  // Styrer AI
  const [aiInput, setAiInput] = useState('');
  const [aiChat, setAiChat] = useState<{ role: 'user' | 'assistant'; text: string; time: string }[]>([
    { 
      role: 'assistant', 
      text: `Hei Karoline! Jeg er Styrer-AI for Eventyrskogen Barnehage. 

Jeg bistår deg med:
• **Barnehageloven & Rammeplanen**: Tilsyn, pedagognorm (§ 25), bemanningsnorm (§ 26), dispensasjoner og psykososialt miljø (§ 41).
• **Personalledelse & HMS**: Oppfølging av fravær, vernerunder, varslingssaker og lekeplass-sikkerhet.
• **Foreldresamarbeid & SU**: Maler for saksliste til Samarbeidsutvalget, svarbrev på klager og dialog ved overganger.
• **Tverrfaglig samarbeid**: Barnevernets opplysningsplikt (§ 46), PPT og helsestasjon.

Hva vil du at vi skal se på sammen i dag?`,
      time: '08:00'
    }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Sync state til localStorage
  useEffect(() => {
    localStorage.setItem('styrern_sick_leaves', JSON.stringify(sickLeaves));
  }, [sickLeaves]);

  useEffect(() => {
    localStorage.setItem('styrern_hms_issues', JSON.stringify(hmsIssues));
  }, [hmsIssues]);

  useEffect(() => {
    localStorage.setItem('styrern_year_events', JSON.stringify(yearEvents));
  }, [yearEvents]);

  // Nøkkeltall
  const totalChildren = departments.reduce((acc, d) => acc + d.childrenCount, 0);
  const totalCapacity = departments.reduce((acc, d) => acc + d.capacity, 0);
  const totalStaffPresent = departments.reduce((acc, d) => acc + d.staffPresent, 0);
  const openHmsCount = hmsIssues.filter(h => h.status !== 'resolved').length;
  const highHmsCount = hmsIssues.filter(h => h.status !== 'resolved' && (h.severity === 'high' || h.severity === 'critical')).length;

  const handleSendAi = async (customPrompt?: string) => {
    const textToSend = customPrompt || aiInput;
    if (!textToSend.trim()) return;

    const timeNow = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
    setAiChat(prev => [...prev, { role: 'user', text: textToSend.trim(), time: timeNow }]);
    if (!customPrompt) setAiInput('');
    setIsAiLoading(true);

    try {
      const fullPrompt = `Du er en erfaren og faglig tung rådgiver for barnehagestyrer Karoline Haug i Eventyrskogen Barnehage (78 barn, 4 avdelinger).
Forankre svarene dine presist i:
- Barnehageloven (spesielt formål § 1, barns rett til medvirkning § 3, samarbeidsutvalg § 4, pedagognorm § 25, bemanningsnorm § 26, psykososialt barnehagemiljø §§ 41-43, taushetsplikt § 44, opplysningsplikt til barnevernet § 46)
- Rammeplan for barnehagen (Udir)
- Arbeidsmiljøloven og internkontrollforskriften for helse, miljø og sikkerhet i barnehagen

Spørsmål fra styrer: "${textToSend}"

Svar strukturert med overskrifter, konkrete råd og eventuelle forslag til formuleringer som styrer direkte kan bruke.`;

      const data = await callGoogleAIProxy({
        model: 'gemini-3.8-flash',
        contents: fullPrompt
      });

      if (data?.text) {
        setAiChat(prev => [...prev, { 
          role: 'assistant', 
          text: data.text, 
          time: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }) 
        }]);
      } else {
        setTimeout(() => {
          setAiChat(prev => [...prev, {
            role: 'assistant',
            text: `### Juridisk og praktisk vurdering for Styrer:\n\n**1. Forankring i Barnehageloven:**\nHusk at barnehagen alltid skal ivareta barnas beste (§ 1). Ved eventuelle tilpasninger i bemanning må pedagognormen (§ 25) opprettholdes i kjernetiden.\n\n**2. Praktisk oppfølging i lederteamet:**\nInvolver pedagogiske ledere på avdelingsmøtet for å sikre enhetlig praksis og dokumenter tiltaket i internkontrollsystemet.\n\n**3. Dokumentasjonskrav:**\nOpprett et skriftlig notat i barnehagens arkiv i henhold til forvaltningslovens krav om saksbehandling.`,
            time: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
          }]);
        }, 600);
      }
    } catch {
      setAiChat(prev => [...prev, {
        role: 'assistant',
        text: `Faglig notat for Karoline:\n\nVed administrative spørsmål av denne typen anbefales det å konferere med kommunens barnehagemyndighet eller PBLs juridiske veiledningstjeneste for spesifikke tariff- og forskriftsspørsmål.`,
        time: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // En ruter-funksjon som bytter ut innholdet på skjermen basert på valgt fane
  const renderContent = () => {
    switch (activeTab) {
      case 'oversikt':
        return <DagensOversikt onNavigate={handleNavigate} widgetPosition="bottom" />;

      case 'personal':
        return (
          <div className="space-y-6">
            {/* Under-faner for Personal & HR */}
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-2">
              <button
                onClick={() => setPersonalSubTab('ansatte')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  personalSubTab === 'ansatte'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Users size={16} />
                <span>Ansatt-Hub & Krav</span>
              </button>
              <button
                onClick={() => setPersonalSubTab('vaktliste')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  personalSubTab === 'vaktliste'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <CalendarRange size={16} />
                <span>Vaktliste & Turnus</span>
              </button>
              <button
                onClick={() => setPersonalSubTab('bemanning')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  personalSubTab === 'bemanning'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Users size={16} />
                <span>Bemanningsradar (Norm)</span>
              </button>
              <button
                onClick={() => setPersonalSubTab('handbok')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  personalSubTab === 'handbok'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FileSignature size={16} />
                <span>Dynamisk Personalhåndbok</span>
              </button>
            </div>

            {/* Innhold basert på valgt under-fane */}
            {personalSubTab === 'ansatte' && <PersonalHR onNavigate={handleNavigate} />}
            {personalSubTab === 'vaktliste' && <VaktlisteTurnus onNavigate={handleNavigate} />}
            {personalSubTab === 'bemanning' && <Bemanningsradar onNavigate={handleNavigate} />}
            {personalSubTab === 'handbok' && <Personalhandbok onNavigate={handleNavigate} />}
          </div>
        );

      case 'kvalitet':
        return (
          <div className="space-y-6">
            {/* Under-faner for Kvalitet & HMS */}
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-2">
              <button
                onClick={() => setKvalitetSubTab('avvik')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  kvalitetSubTab === 'avvik'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <ShieldAlert size={16} />
                <span>HMS-Avvik & Internkontroll</span>
              </button>
              <button
                onClick={() => setKvalitetSubTab('delegerthms')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  kvalitetSubTab === 'delegerthms'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <ListChecks size={16} />
                <span>Delegert HMS & Sjekklister</span>
              </button>
              <button
                onClick={() => setKvalitetSubTab('tilsyn')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  kvalitetSubTab === 'tilsyn'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FileCheck size={16} />
                <span>Tilsynseksport & Dokumentasjon</span>
              </button>
              <button
                onClick={() => setKvalitetSubTab('spesped')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  kvalitetSubTab === 'spesped'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <ShieldAlert size={16} />
                <span>Spesialpedagogikk</span>
              </button>
            </div>

            {/* Innhold basert på valgt under-fane */}
            {kvalitetSubTab === 'avvik' && <HMSAvvik onNavigate={handleNavigate} />}
            {kvalitetSubTab === 'delegerthms' && <DelegertHMS onNavigate={handleNavigate} />}
            {kvalitetSubTab === 'tilsyn' && <Tilsynseksport onNavigate={handleNavigate} />}
            {kvalitetSubTab === 'spesped' && <Saksradar />}
          </div>
        );

      case 'ressurser':
        return (
          <div className="space-y-6">
            {/* Under-faner for Årshjul & Lovverk */}
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-2">
              <button
                onClick={() => setRessurserSubTab('profil')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  ressurserSubTab === 'profil'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Award size={16} />
                <span>Profil & Fundament</span>
              </button>
              <button
                onClick={() => setRessurserSubTab('aarshjul')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  ressurserSubTab === 'aarshjul'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <CalendarDays size={16} />
                <span>Pedagogisk Årshjul</span>
              </button>
              <button
                onClick={() => setRessurserSubTab('progresjon')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  ressurserSubTab === 'progresjon'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Layers size={16} />
                <span>Progresjon</span>
              </button>
              <button
                onClick={() => setRessurserSubTab('lovverk')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  ressurserSubTab === 'lovverk'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <BookOpen size={16} />
                <span>Styre, Lovverk & Beredskap</span>
              </button>
              <button
                onClick={() => setRessurserSubTab('itpmal')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  ressurserSubTab === 'itpmal'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Settings size={16} />
                <span>Malbygger: Tiltaksplan (ITP) 📋</span>
              </button>
            </div>

            {ressurserSubTab === 'itpmal' ? (
              <ITPMalbygger onNavigate={handleNavigate} />
            ) : (
              <AarshjulOgLovverk 
                activeSection={ressurserSubTab} 
                onNavigate={handleNavigate} 
              />
            )}
          </div>
        );

      case 'ai':
        return <StyrerAI />;

      case 'kontrollpanel':
        return <Kontrollpanel />;

      default:
        return <DagensOversikt onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* DEN MARINEBLÅ KOMMANDOSENTRALEN */}
      <header className="bg-[#1e1b4b] text-white shadow-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 border-b border-indigo-900/50">
            
            {/* LOGO & BARNEHAGENAVN (Klikk for å gå til hovedside) */}
            <div 
              onClick={() => setActiveTab('oversikt')}
              className="flex items-center space-x-3 shrink-0 mr-8 cursor-pointer hover:opacity-90 transition-opacity"
              title="Gå til hovedsiden (Oversikt)"
            >
              <div className="bg-indigo-600 p-2 rounded-lg shadow-inner">
                <LayoutDashboard size={20} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight tracking-wide">Styrern</span>
                <span className="text-[11px] text-indigo-300 uppercase tracking-wider font-semibold">Eventyrskogen Barnehage</span>
              </div>
            </div>

            {/* NAVIGASJONSFANER (Renere og færre) */}
            <nav className="hidden xl:flex space-x-2 flex-1 justify-center">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={`nav-xl-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-md transform scale-105' 
                        : 'text-indigo-100 hover:bg-[#2e2a5f] hover:text-white'
                    }`}
                  >
                    <item.icon size={16} className={isActive ? 'text-indigo-100' : 'text-indigo-300'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* HØYRE MENY (Fjernet bjellen, beholdt Kontrollpanel og Profil) */}
            <div className="flex items-center space-x-5 shrink-0 ml-8">
              
              <button 
                onClick={() => setActiveTab('kontrollpanel')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${activeTab === 'kontrollpanel' ? 'bg-indigo-600 text-white' : 'text-indigo-200 hover:text-white hover:bg-[#2e2a5f]'}`}
              >
                <Settings size={18} />
                <span className="hidden sm:inline">Kontrollpanel</span>
              </button>
              
              <div className="h-8 w-px bg-indigo-800"></div>
              
              <button 
                type="button"
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center space-x-3 cursor-pointer hover:bg-[#2e2a5f] p-1.5 rounded-lg transition-colors text-left"
                title="Klikk for å åpne Min profil og modusvelger"
              >
                <div className="bg-emerald-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#1e1b4b] shrink-0">
                  {isSvein ? 'SN' : isHavard ? 'HH' : 'KH'}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-sm font-medium leading-none text-slate-100">
                    {isSvein ? 'Svein Nordvik' : isHavard ? 'Håvard Hovin' : 'Karoline Haug'}
                  </span>
                  <span className="text-xs text-indigo-300 mt-1">
                    {isHavard ? 'Betabruker • Melhus' : 'Styrer'}
                  </span>
                </div>
              </button>
            </div>

          </div>
        </div>

        {/* Mobil/nettbrett navigasjonsstripe under xl-skjermer */}
        <div className="xl:hidden overflow-x-auto px-4 py-2 border-t border-indigo-900/60 flex items-center space-x-2 bg-[#17143e] scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={`nav-mob-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive ? 'bg-indigo-600 text-white shadow' : 'text-indigo-200 hover:bg-[#2e2a5f]'
                }`}
              >
                <item.icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setActiveTab('kontrollpanel')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'kontrollpanel' ? 'bg-indigo-600 text-white shadow' : 'text-indigo-200 hover:bg-[#2e2a5f]'
            }`}
          >
            <Settings size={14} />
            <span>Kontrollpanel</span>
          </button>
        </div>
      </header>

      {/* HOVEDINNHOLD (Arbeidsflaten som byttes ut) */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
        {renderContent()}
      </main>

      <PortalFooter />

      <UserProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </div>
  );
};

export default StyrernApp;
