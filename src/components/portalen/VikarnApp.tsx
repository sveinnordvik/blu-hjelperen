import React, { useState, useEffect } from 'react';
import VikarAINodhjelp from '../mobile/VikarAINodhjelp';
import StaffMonthlyFocusWidget from './StaffMonthlyFocusWidget';
import { 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  Lock, 
  PhoneCall, 
  Sparkles, 
  Send, 
  Clock, 
  CheckCircle2, 
  HeartHandshake, 
  FileCheck2,
  Calendar,
  Plus,
  UserPlus,
  Heart,
  Smartphone,
  MessageSquare
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import UserProfileModal from '../common/UserProfileModal';
import PortalFooter from '../common/PortalFooter';

interface WorkLog {
  id: string;
  date: string;
  dept: string;
  hours: string;
  pedleder: string;
  note: string;
}

export default function VikarnApp() {
  const { setRole, canSwitch, isSvein, isPortalBeta, currentUserEmail } = useRole();
  const isHavard = currentUserEmail?.toLowerCase() === 'havard.hovin@melhus.kommune.no' || isPortalBeta;
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'onboarding' | 'avdelingsark' | 'redningsleker' | 'timeliste' | 'vikar-ai'>('onboarding');

  const DEFAULT_WORKLOGS: WorkLog[] = [
    { id: '1', date: '2026-10-05', dept: 'Moseplassen (1-3 år)', hours: '08:30 - 16:00 (7.5 t)', pedleder: 'Morten Hansen', note: 'God dag. Var med på sovevakt og tur i nærområdet.' }
  ];

  const [hasUserAddedWorklogs, setHasUserAddedWorklogs] = useState<boolean>(() => {
    return localStorage.getItem('vikarn_has_user_added_worklogs') === 'true';
  });

  const [workLogs, setWorkLogs] = useState<WorkLog[]>(() => {
    const saved = localStorage.getItem('vikarn_worklogs');
    return saved ? JSON.parse(saved) : DEFAULT_WORKLOGS;
  });

  const [dagensBrief, setDagensBrief] = useState<any>(() => {
    const saved = localStorage.getItem('pedportalen_dagens_vikarbrief');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    const handleBriefUpdated = () => {
      const saved = localStorage.getItem('pedportalen_dagens_vikarbrief');
      if (saved) {
        try {
          setDagensBrief(JSON.parse(saved));
        } catch {}
      }
    };
    window.addEventListener('pedportalen_vikarbrief_updated', handleBriefUpdated);
    return () => window.removeEventListener('pedportalen_vikarbrief_updated', handleBriefUpdated);
  }, []);

  useEffect(() => {
    localStorage.setItem('vikarn_worklogs', JSON.stringify(workLogs));
  }, [workLogs]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header (Styrern-design: Mørk Cyan bg-[#164e63]) */}
      <header className="w-full bg-[#164e63] text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Rolle (Klikk for å gå til hovedside) */}
          <div 
            onClick={() => setActiveTab('onboarding')}
            className="flex items-center gap-3 shrink-0 mr-4 cursor-pointer hover:opacity-90 transition-opacity"
            title="Gå til hovedsiden (5-minutters Onboarding)"
          >
            <div className="bg-cyan-600 p-2 rounded-lg text-white shadow-sm flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight tracking-wide">Vikarn</span>
              <span className="text-[11px] text-cyan-200 uppercase tracking-wider font-semibold">Eventyrskogen Barnehage</span>
            </div>
          </div>

          {/* Hovednavigasjon (Sentrert på stor skjerm) */}
          <nav className="hidden xl:flex space-x-2 flex-1 justify-center">
            {[
              { id: 'onboarding', label: '5-minutters Onboarding' },
              { id: 'avdelingsark', label: 'Viktige Hensyn & Sikkerhet' },
              { id: 'redningsleker', label: 'Redningsvester & Leker' },
              { id: 'timeliste', label: 'Min Timeliste' },
              { id: 'vikar-ai', label: 'Vikar-AI' }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'bg-cyan-600 text-white shadow-md transform scale-105' 
                      : 'text-cyan-100 hover:bg-[#155e75] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Profil / Modusvelger høyre side */}
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <div className="h-8 w-px bg-cyan-800/80 hidden sm:block"></div>

            <button 
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center space-x-3 cursor-pointer hover:bg-cyan-900/80 p-1.5 rounded-lg transition-colors text-left"
              title="Klikk for å åpne Min profil og modusvelger"
            >
              <div className="bg-cyan-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#164e63] shrink-0">
                {isSvein ? 'SN' : isHavard ? 'HH' : 'KH'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-sm font-medium leading-none text-slate-100">
                  {isSvein ? 'Svein Nordvik' : isHavard ? 'Håvard Hovin' : 'Karoline Haug'}
                </span>
                <span className="text-xs text-cyan-300 mt-1">
                  {isHavard ? 'Betabruker • Melhus' : 'Vikar'}
                </span>
              </div>
            </button>
            <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
          </div>

        </div>

        {/* Mobil/nettbrett navigasjonsstripe */}
        <div className="xl:hidden flex overflow-x-auto px-4 py-2 border-t border-cyan-800/60 gap-2 bg-[#083344] scrollbar-none">
          {[
            { id: 'onboarding', label: '5-minutters Onboarding' },
            { id: 'avdelingsark', label: 'Viktige Hensyn & Sikkerhet' },
            { id: 'redningsleker', label: 'Redningsvester & Leker' },
            { id: 'timeliste', label: 'Min Timeliste' },
            { id: 'vikar-ai', label: 'Vikar-AI' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap font-medium transition cursor-pointer ${
                activeTab === t.id ? 'bg-cyan-600 text-white shadow-sm font-semibold' : 'text-cyan-100 hover:bg-[#155e75] hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab 1: 5-min Onboarding */}
        {activeTab === 'onboarding' && (
          <div className="space-y-6">
            <StaffMonthlyFocusWidget />

            {/* Dagens Base-Brief fra pedleder hvis mottatt */}
            {dagensBrief && (
              <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-emerald-700/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Smartphone className="w-48 h-48 text-emerald-300" />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-800/80">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                      <UserPlus className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold bg-emerald-400 text-emerald-950 px-2 py-0.5 rounded-full">
                          Dagens Base-Brief mottatt!
                        </span>
                        <span className="text-xs text-emerald-200 font-semibold">
                          {dagensBrief.avdeling || 'Avdelingen'}
                        </span>
                        {dagensBrief.ukedag && (
                          <span className="text-[11px] bg-emerald-800/80 text-emerald-100 px-2 py-0.5 rounded-full border border-emerald-600/40 font-semibold">
                            {dagensBrief.ukedag}
                          </span>
                        )}
                        {dagensBrief.fagomrade && (
                          <span className="text-[11px] bg-teal-800/80 text-teal-100 px-2 py-0.5 rounded-full border border-teal-600/40 font-semibold">
                            {dagensBrief.fagomrade}
                          </span>
                        )}
                        {dagensBrief.pedagogiskProfil && (
                          <span className="text-[11px] bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full border border-amber-300/30 font-semibold">
                            {dagensBrief.pedagogiskProfil}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-black mt-1">
                        Velkommen til oss, {dagensBrief.vikarNavn || 'kjære vikar'}!
                      </h3>
                    </div>
                  </div>

                  <div className="text-xs text-emerald-300/90 sm:text-right">
                    <span className="block font-semibold">Kontaktperson i dag:</span>
                    <span className="font-bold text-white text-sm">{dagensBrief.kontaktperson}</span>
                  </div>
                </div>

                {dagensBrief.briefMelding && (
                  <div className="mt-4 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-xs text-emerald-100 leading-relaxed whitespace-pre-line font-medium shadow-inner">
                    <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider mb-1.5 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Personlig velkomstbrief fra pedleder:
                    </div>
                    {dagensBrief.briefMelding}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                  <div className="bg-emerald-800/40 border border-emerald-700/60 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 mb-1.5">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      Dagens plan & dagsrytme:
                    </div>
                    <p className="text-xs text-emerald-100 leading-relaxed whitespace-pre-line">
                      {dagensBrief.dagensPlan}
                    </p>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-400/30 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300 mb-1.5">
                      <Heart className="w-4 h-4 text-rose-400" />
                      Ditt viktigste fokus i dag:
                    </div>
                    <p className="text-xs text-amber-100 leading-relaxed font-medium">
                      {dagensBrief.hovedfokus}
                    </p>
                  </div>

                  <div className="bg-emerald-800/40 border border-emerald-700/60 p-4 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 mb-1.5">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        Pauseavvikling:
                      </div>
                      <p className="text-xs text-emerald-100 leading-relaxed">
                        {dagensBrief.pauser}
                      </p>
                    </div>

                    {dagensBrief.handbok && (
                      <div className="mt-3 pt-2 border-t border-emerald-700/40 text-[11px] text-emerald-300 flex items-center gap-1.5 font-bold">
                        <span>Sjekk fanen "Viktige hensyn" for barnelister og rutiner</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xl font-black text-slate-900">De 4 Gyldne Reglene for Barnehagevikaren</h2>
              <p className="text-xs text-slate-500">Les gjennom dette før du går inn på avdelingen. Tar kun 2 minutter!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 text-base">1. Streng Taushetsplikt (Lovpålagt)</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Alt du ser, hører eller opplever om barn og foreldre er strengt taushetsbelagt (straffeloven § 121 / barnehageloven § 44). Du kan aldri diskutere barn med venner, familie eller i sosiale medier.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 text-base">2. Ingen Privat Mobiltelefon</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Telefonen skal ligge i veska eller jakka i garderoben. Det er strengt forbudt å ta bilder eller video av barn i barnehagen med privat telefon.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 text-base">3. Porten og Barnetelling</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sjekk ALLTID at porten er skikkelig i lås når du går inn eller ut. Tell barna kontinuerlig når dere er ute eller forflytter dere mellom rom og uteplass.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 text-base">4. Spør heller én gang for mye!</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Er du usikker på om et barn kan hente en leke, eller hvem som skal hente i dag? Spør alltid pedleder eller fagarbeider. Ingen forventer at du kan alt som vikar!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Avdelingsark & Sikkerhet */}
        {activeTab === 'avdelingsark' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Sjekkliste for Avdelingen i Dag</h2>
              <p className="text-xs text-slate-500">Dette må du avklare med fast ansatt når vakten starter.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
              <div className="space-y-3">
                {[
                  { title: 'Allergier & Diett', desc: 'Er det noen barn med nøtteallergi, melk, gluten eller andre hensyn ved måltidet?' },
                  { title: 'Sovevakt-rutine', desc: 'Hvordan føres soveloggen? (I vogn med seler – sjekk hvert 10. minutt for pust og temperatur).' },
                  { title: 'Henteregler', desc: 'Hvis noen andre enn foreldrene skal hente barnet, må det alltid være forhåndsvarslet og godkjent av pedleder.' },
                  { title: 'Garderobeansvar', desc: 'Hvilken gruppe med barn har du ansvar for å hjelpe under påkledning?' }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <strong className="text-slate-900 font-bold text-sm block mb-1">{item.title}</strong>
                    <p className="text-xs text-slate-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Redningsleker */}
        {activeTab === 'redningsleker' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Vikar-Redningsvesten: Sanger og Leker</h2>
              <p className="text-xs text-slate-500">Ha disse i ermet – barna blir umiddelbart med!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2 shadow-sm">
                <h3 className="font-black text-slate-900 text-base">Hjulene på bussen</h3>
                <p className="text-xs text-slate-600">
                  Klassikeren over alle klassikere! Gjør bevegelser med armene (hjulene, vindusviskerne, hornet, babyene som sier "væ-væ-væ").
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2 shadow-sm">
                <h3 className="font-black text-slate-900 text-base">Bjørnen sover</h3>
                <p className="text-xs text-slate-600">
                  Enkelt og elsket av alle aldre. Den voksne eller et barn legger seg i midten under et teppe. Når sangen er slutt: "BØ!" og jagelek.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2 shadow-sm">
                <h3 className="font-black text-slate-900 text-base">Hode, skulder, kne og tå</h3>
                <p className="text-xs text-slate-600">
                  Perfekt for å få ut litt energi eller før samling. Start sakte, og øk tempoet mer og mer!
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2 shadow-sm">
                <h3 className="font-black text-slate-900 text-base">Lille Petter edderkopp</h3>
                <p className="text-xs text-slate-600">
                  Bruk fingrene for edderkoppen og armene for solen og regnet. Fanger oppmerksomheten med en gang.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Timeliste */}
        {activeTab === 'timeliste' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Min Vikarlogg & Timeregistrering</h2>
                <p className="text-xs text-slate-500">Hold orden på vaktene dine slik at du har full kontroll ved lønnskjøring.</p>
              </div>
              <div className="flex items-center gap-2">
                {hasUserAddedWorklogs ? (
                  <button 
                    onClick={() => {
                      if (window.confirm('Vil du gjenopprette standard eksempelvakt?')) {
                        setWorkLogs(DEFAULT_WORKLOGS);
                        setHasUserAddedWorklogs(false);
                        localStorage.setItem('vikarn_has_user_added_worklogs', 'false');
                      }
                    }}
                    className="text-xs text-slate-600 hover:text-emerald-800 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl font-semibold transition"
                  >
                    Gjenopprett eksempler
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      if (window.confirm('Vil du tømme eksempelvakten?')) {
                        setWorkLogs([]);
                        setHasUserAddedWorklogs(true);
                        localStorage.setItem('vikarn_has_user_added_worklogs', 'true');
                      }
                    }}
                    className="text-xs text-slate-600 hover:text-rose-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl font-semibold transition"
                  >
                    Tøm eksempler
                  </button>
                )}
                <button 
                  onClick={() => {
                    const dept = prompt('Avdeling (f.eks. Moseplassen):') || 'Avdeling';
                    const hours = prompt('Arbeidstid (f.eks. 08:00 - 15:30):') || '08:00 - 15:30';
                    const ped = prompt('Pedleder du jobbet med:') || 'Styrer';
                    const newLog: WorkLog = {
                      id: Date.now().toString(),
                      date: new Date().toISOString().split('T')[0],
                      dept,
                      hours,
                      pedleder: ped,
                      note: 'Vakt fullført'
                    };
                    if (!hasUserAddedWorklogs) {
                      setWorkLogs([newLog]);
                      setHasUserAddedWorklogs(true);
                      localStorage.setItem('vikarn_has_user_added_worklogs', 'true');
                    } else {
                      setWorkLogs(prev => [newLog, ...prev]);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" /> Registrer vakt
                </button>
              </div>
            </div>

            {workLogs.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3">
                <p className="font-bold text-slate-800 text-sm">Ingen registrerte vakter ennå</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Trykk «Registrer vakt» etter endt arbeidsdag for å lagre timene dine.
                </p>
                <button
                  onClick={() => {
                    setWorkLogs(DEFAULT_WORKLOGS);
                    setHasUserAddedWorklogs(false);
                    localStorage.setItem('vikarn_has_user_added_worklogs', 'false');
                  }}
                  className="bg-emerald-100 text-emerald-900 text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-200 transition"
                >
                  Hent eksempelvakt
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">
                {workLogs.map(log => (
                  <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{log.dept}</span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {log.hours}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Dato: {log.date} • Pedleder: {log.pedleder}</p>
                      <p className="text-xs text-slate-600 mt-1 italic">"{log.note}"</p>
                    </div>
                    <button 
                      onClick={() => setWorkLogs(prev => prev.filter(w => w.id !== log.id))}
                      className="text-xs text-rose-600 hover:underline self-end sm:self-center cursor-pointer"
                    >
                      Slett
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Vikar-AI */}
        {activeTab === 'vikar-ai' && (
          <div className="max-w-4xl mx-auto">
            <VikarAINodhjelp />
          </div>
        )}
      </main>

      <PortalFooter theme="dark" className="bg-emerald-950 border-emerald-900 text-emerald-200/80" />

      <UserProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </div>
  );
}
