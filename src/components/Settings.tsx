import React from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  FileEdit, 
  Sparkles, 
  Bell, 
  CheckCircle2, 
  BellRing, 
  AlertCircle, 
  Smartphone, 
  ShieldCheck, 
  Download, 
  Trash2, 
  LogOut,
  ExternalLink,
  Share,
  MoreVertical
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import DeleteDataButton from './DeleteDataButton';
import { AIWarning } from './AIWarning';

interface SettingsProps {
  settings: any;
  setSettings: (settings: any) => void;
  pricingTier: string;
  selectedTheme: any;
  setSelectedTheme: (theme: any) => void;
  themes: any[];
  notificationSettings: any;
  handleUpdateNotificationPref: (key: string) => void;
  requestNotificationPermission: () => void;
  permissionStatus: NotificationPermission;
  handleExportData: () => void;
  handleDeleteData: () => void;
  user: any;
  handleLogout: () => void;
  onNavigate?: (tab: any) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  setSettings,
  pricingTier,
  selectedTheme,
  setSelectedTheme,
  themes,
  notificationSettings,
  handleUpdateNotificationPref,
  requestNotificationPermission,
  permissionStatus,
  handleExportData,
  handleDeleteData,
  user,
  handleLogout,
  onNavigate
}) => {
  return (
    <motion.div 
      key="settings"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col gap-6 pb-32"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Arbeidsområde */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-primary" /> Arbeidsområde
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-700">Vis tidtaker i toppmeny</p>
                <p className="text-[10px] text-slate-400">Pomodoro-klokke øverst.</p>
              </div>
              <button 
                onClick={() => setSettings({...settings, showTimerInHeader: !settings.showTimerInHeader})}
                className={cn(
                  "w-10 h-5 rounded-full relative transition-all",
                  settings.showTimerInHeader ? "bg-primary" : "bg-slate-200"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                  settings.showTimerInHeader ? "right-0.5" : "left-0.5"
                )} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-700">Vis innleveringsfrist</p>
                <p className="text-[10px] text-slate-400">Dager igjen i toppmenyen.</p>
              </div>
              <button 
                onClick={() => setSettings({...settings, showDeadlineInHeader: !settings.showDeadlineInHeader})}
                className={cn(
                  "w-10 h-5 rounded-full relative transition-all",
                  settings.showDeadlineInHeader ? "bg-primary" : "bg-slate-200"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                  settings.showDeadlineInHeader ? "right-0.5" : "left-0.5"
                )} />
              </button>
            </div>
          </div>
        </div>

        {/* Konto & Abonnement */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Konto & Abonnement
          </h3>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Aktiv plan</p>
            <p className="text-base font-black text-primary">
              {pricingTier === 'semester' ? 'Årsabonnement' : 
               pricingTier === 'monthly' ? 'Månedsabonnement' : 'Gratisversjon'}
            </p>
          </div>
          <button 
            onClick={() => window.open('https://billing.stripe.com/p/login/9B600c4Qq6Wx1qg42g18c00', '_blank', 'noopener,noreferrer')}
            className="w-full py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Administrer
          </button>
        </div>

        {/* Skrivepreferanser */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-primary" /> Skrivepreferanser
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Foretrukket målform</label>
              <select 
                value={settings.preferredLanguage}
                onChange={(e) => setSettings({...settings, preferredLanguage: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              >
                <option value="Bokmål">Bokmål</option>
                <option value="Nynorsk">Nynorsk</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Mitt studiested</label>
              <input 
                type="text"
                placeholder="F.eks. DMMH, NTNU, OsloMet..."
                value={settings.studiested || ''}
                onChange={(e) => setSettings({...settings, studiested: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
              <p className="text-[10px] text-slate-400">Brukes til å tilpasse litteratursøk og referanser.</p>
            </div>
          </div>
        </div>

        {/* Applikasjonstema */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Applikasjonstema
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all group",
                  selectedTheme.id === theme.id 
                    ? "border-primary bg-primary-light/30" 
                    : "border-slate-100 hover:border-slate-200 bg-slate-50"
                )}
                title={theme.name}
              >
                <div 
                  className="w-6 h-6 rounded-full shadow-sm group-hover:scale-110 transition-transform" 
                  style={{ backgroundColor: theme.color }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Varslinger og App-oppsett */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 md:col-span-2">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" /> Varslinger og App-oppsett
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Varslingspreferanser</p>
              
              {[
                { id: 'chat', label: 'Meldinger i gruppechat', desc: 'Få varsel når noen skriver i fellesskapet.' },
                { id: 'deadlines', label: 'Frister og milepæler', desc: 'Påminnelser om viktige datoer i oppgaven.' },
                { id: 'tips', label: 'Mentor-tips', desc: 'Daglige tips for akademisk skriving.' }
              ].map((pref) => (
                <div key={pref.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-700">{pref.label}</p>
                    <p className="text-[10px] text-slate-400">{pref.desc}</p>
                  </div>
                  <button 
                    onClick={() => handleUpdateNotificationPref(pref.id)}
                    className={cn(
                      "w-10 h-5 rounded-full relative transition-all",
                      notificationSettings[pref.id] ? "bg-primary" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                      notificationSettings[pref.id] ? "right-0.5" : "left-0.5"
                    )} />
                  </button>
                </div>
              ))}

              <button 
                onClick={requestNotificationPermission}
                disabled={permissionStatus === 'granted'}
                className={cn(
                  "w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg",
                  permissionStatus === 'granted' 
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-none cursor-default" 
                    : "bg-primary text-white hover:bg-primary-hover shadow-primary-light"
                )}
              >
                {permissionStatus === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Varslinger er aktive på denne enheten
                  </>
                ) : (
                  <>
                    <BellRing className="w-4 h-4" /> Aktiver varslinger på denne enheten
                  </>
                )}
              </button>
              {permissionStatus === 'denied' && (
                <p className="text-[10px] text-red-500 mt-2 flex items-center gap-1 bg-red-50 p-2 rounded-lg border border-red-100">
                  <AlertCircle className="w-3 h-3" />
                  Varslinger er blokkert i nettleseren din. Trykk på hengelåsen i adressefeltet for å tillate manuelt.
                </p>
              )}
            </div>

            <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl">
              <div className="flex items-center gap-2 mb-3 text-blue-700">
                <Smartphone className="w-5 h-5" />
                <h4 className="font-bold text-sm">Bruker du iPhone?</h4>
              </div>
              <p className="text-xs text-blue-600 mb-4 leading-relaxed">
                For å motta push-varsler må du legge BLU-Hjelperen til på hjemskjermen din:
              </p>
              <div className="space-y-3">
                {[
                  "Trykk på 'Del'-ikonet (firkant med pil opp) nederst i Safari.",
                  "Scroll ned og velg 'Legg til på hjemskjerm'.",
                  "Åpne appen fra det nye ikonet og aktiver varslinger her i innstillingene."
                ].map((step, i) => (
                  <div key={`setup-step-${i}-${step.substring(0, 10)}`} className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <p className="text-[11px] text-blue-800 leading-tight">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tips: Bruk som app */}
        <div className="bg-primary-light/10 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-primary/20 md:col-span-2">
          <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" /> 💡 Tips: Bruk som app
          </h3>
          <p className="text-sm font-bold text-slate-800 mb-1">Få BLU-Hjelperen på hjemskjermen</p>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Du kan bruke BLU-Hjelperen akkurat som en vanlig app uten å gå via nettleseren hver gang. 
            Dette gir deg mer skjermplass og raskere tilgang til dine verktøy.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* iPhone */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <Share className="w-4 h-4 text-primary" />
                </div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">For iPhone (Safari)</h4>
              </div>
              <ul className="space-y-2">
                <li className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-white border border-slate-200 text-primary rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">1</span>
                  <p className="text-[11px] text-slate-600 leading-tight">Trykk på <strong>"Del"-ikonet</strong> (firkant med pil opp) nederst i Safari.</p>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-white border border-slate-200 text-primary rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">2</span>
                  <p className="text-[11px] text-slate-600 leading-tight">Scroll ned og velg <strong>"Legg til på hjem-skjerm"</strong>.</p>
                </li>
              </ul>
            </div>

            {/* Android */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <MoreVertical className="w-4 h-4 text-primary" />
                </div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">For Android (Chrome/Edge)</h4>
              </div>
              <ul className="space-y-2">
                <li className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-white border border-slate-200 text-primary rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">1</span>
                  <p className="text-[11px] text-slate-600 leading-tight">Trykk på <strong>de tre prikkene</strong> øverst eller nederst i menyen.</p>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-white border border-slate-200 text-primary rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">2</span>
                  <p className="text-[11px] text-slate-600 leading-tight">Velg <strong>"Legg til på telefonen"</strong> eller <strong>"Installer app"</strong>.</p>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Data & Sikkerhet */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 md:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Data & Sikkerhet (GDPR)
              </h3>
              <p className="text-[10px] text-slate-400 italic">Dine data synkroniseres trygt i skyen og brukes aldri til KI-trening.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button 
                onClick={handleExportData}
                className="w-full sm:w-auto px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" /> Eksporter data
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Appen lagrer arbeidet ditt fortløpende i en sikker, kryptert skydatabase (Google Firebase). 
              Dette gjør at du sømløst kan bytte mellom mobil og PC uten å miste innhold. 
              Du eier dine egne data fullt og helt. <strong>Dine tekster brukes ALDRI til å trene opp verken våre eller eksterne kunstig intelligens-modeller (inkludert Sensor-modulen).</strong> 
              Du kan derfor trygt bruke verktøyene uten frykt for at arbeidet ditt vil deles, lagres i eksterne systemer, eller senere slå ut som plagiat. 
            </p>
          </div>

          <DeleteDataButton />

          <AIWarning compact={true} />
        </div>

        {/* Logg ut - Spesielt viktig for mobil */}
        {user && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 md:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <h3 className="text-base font-bold text-slate-900 mb-1">Avslutt økt</h3>
                <p className="text-[10px] text-slate-400">Logg ut av din brukerkonto på denne enheten.</p>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full sm:w-auto px-6 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-100"
              >
                <LogOut className="w-4 h-4" /> Logg ut
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
