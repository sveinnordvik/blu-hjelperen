import React, { useState, useEffect } from 'react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { 
  User, 
  Settings as SettingsIcon, 
  Info, 
  Save, 
  Shield, 
  Cloud, 
  Smartphone, 
  Download, 
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  Check,
  CheckCircle2,
  RefreshCw,
  Clock,
  Database,
  Lock,
  BookOpen,
  Sparkles,
  CreditCard,
  Zap,
  UserCheck,
  LogOut,
  ArrowUpCircle,
  ShieldCheck,
  ExternalLink,
  Share,
  MoreVertical,
  Bell,
  BellRing,
  LayoutDashboard,
  FileEdit,
  Library,
  Moon,
  Loader2,
  FileText,
  FileCode,
  Gift,
  Copy,
  Users,
  ChevronDown,
  ChevronUp,
  FolderArchive
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import DeleteDataButton from './DeleteDataButton';
import { AIWarning } from './AIWarning';

export interface ProfileProps {
  initialMenu?: 'profile' | 'settings' | 'about' | string;
  profile: any;
  setProfile: (profile: any) => void;
  handleSaveProfile?: () => Promise<void> | void;
  isSavingProfile?: boolean;
  user: any;
  handleLogout: () => void;
  setShowAuthModal?: (show: boolean) => void;
  pedagogicalProfile?: any;
  setShowWelcomeGuide?: (show: boolean) => void;
  isSaving?: boolean;
  isSyncing?: boolean;
  isQuotaExceeded?: boolean;
  lastCloudSyncTime?: number;
  handleManualSync?: () => Promise<void> | void;
  lowStressMode?: boolean;
  setLowStressMode?: (val: boolean) => void;
  pricingTier?: string;
  pricingModels?: any[];
  handleCancelSubscription?: () => void;
  settings?: any;
  setSettings?: (settings: any) => void;
  selectedTheme?: any;
  setSelectedTheme?: (theme: any) => void;
  themes?: any[];
  notificationSettings?: any;
  handleUpdateNotificationPref?: (key: string) => void;
  requestNotificationPermission?: () => void;
  permissionStatus?: NotificationPermission;
  handleExportData?: () => void;
  handleDeleteData?: () => void;
  onNavigate?: (tab: any) => void;
}

export function Profile({
  initialMenu = 'profile',
  profile,
  setProfile,
  handleSaveProfile,
  isSavingProfile = false,
  user,
  handleLogout,
  setShowAuthModal,
  pedagogicalProfile,
  setShowWelcomeGuide,
  isSaving = false,
  isSyncing = false,
  isQuotaExceeded = false,
  lastCloudSyncTime = 0,
  handleManualSync,
  lowStressMode = false,
  setLowStressMode,
  pricingTier = 'free',
  pricingModels = [],
  handleCancelSubscription,
  settings = {},
  setSettings,
  selectedTheme,
  setSelectedTheme,
  themes = [],
  notificationSettings = {},
  handleUpdateNotificationPref,
  requestNotificationPermission,
  permissionStatus = 'default',
  handleExportData,
  handleDeleteData,
  onNavigate
}: ProfileProps) {
  const [activeMenu, setActiveMenu] = useState<string>(initialMenu || 'profile');
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [showOlderVersions, setShowOlderVersions] = useState(false);
  const referralCode = profile?.referralCode || (user?.uid ? user.uid.substring(0, 7).toUpperCase() : 'BLU-2026');
  const referralUrl = typeof window !== 'undefined' ? `${window.location.origin}?ref=${referralCode}` : `https://bluhjelperen.no?ref=${referralCode}`;

  useEffect(() => {
    if (initialMenu && ['profile', 'settings', 'about'].includes(initialMenu)) {
      setActiveMenu(initialMenu);
    }
  }, [initialMenu]);

  const menuItems = [
    { 
      id: 'profile', 
      title: 'Min Profil', 
      shortTitle: 'Min Profil',
      subtitle: 'Personalia og studieløp', 
      icon: <User className="w-4 h-4" />,
      activeColor: 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500/30 font-black',
      iconColor: 'text-indigo-600',
      badgeColor: 'bg-indigo-50 border-indigo-200/60 text-indigo-700',
      hideActions: true 
    },
    { 
      id: 'settings', 
      title: 'Innstillinger', 
      shortTitle: 'Innstillinger',
      subtitle: 'App, tema og sikkerhet', 
      icon: <SettingsIcon className="w-4 h-4" />,
      activeColor: 'bg-violet-600 text-white shadow-sm ring-1 ring-violet-500/30 font-black',
      iconColor: 'text-violet-600',
      badgeColor: 'bg-violet-50 border-violet-200/60 text-violet-700',
      hideActions: true 
    },
    { 
      id: 'about', 
      title: 'Om BLU-Hjelperen', 
      shortTitle: 'Om appen',
      subtitle: 'Versjon og vilkår', 
      icon: <Info className="w-4 h-4" />,
      activeColor: 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500/30 font-black',
      iconColor: 'text-emerald-600',
      badgeColor: 'bg-emerald-50 border-emerald-200/60 text-emerald-700',
      hideActions: true 
    }
  ];

  return (
    <WorkspaceLayout
      title="Konto"
      subtitle="Administrer din bruker"
      icon={<User className="w-6 h-6" />}
      actionButtonLabel={user ? "Logg ut" : "Logg inn"}
      onActionClick={() => {
        if (user) {
          handleLogout();
        } else if (setShowAuthModal) {
          setShowAuthModal(true);
        }
      }}
      historyItems={menuItems}
      activeItemId={activeMenu}
      onItemClick={(id) => setActiveMenu(id)}
      historySectionTitle=""
    >
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-10 bg-slate-50 flex justify-center custom-scrollbar">
        <div className="max-w-4xl w-full">

          {/* Mobil Tommelvennlig Hurtigmeny (Fargekodede piller for rask og tydelig navigasjon) */}
          <div className="md:hidden sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md pb-3 pt-1 mb-4">
            <div className="grid grid-cols-3 p-1.5 bg-slate-200/80 rounded-2xl gap-1.5 border border-slate-300/50 shadow-xs">
              {menuItems.map((item) => {
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={`mobile-tab-${item.id}`}
                    onClick={() => setActiveMenu(item.id)}
                    className={cn(
                      "py-2.5 px-1.5 rounded-xl text-xs font-bold flex flex-col min-[390px]:flex-row items-center justify-center gap-1 min-[390px]:gap-1.5 transition-all min-h-[48px] cursor-pointer active:scale-95 text-center leading-tight select-none",
                      isActive 
                        ? item.activeColor 
                        : "bg-white/85 text-slate-700 hover:text-slate-900 hover:bg-white border border-slate-200/70 shadow-2xs"
                    )}
                  >
                    <span className={cn(
                      "shrink-0",
                      isActive ? "text-white" : item.iconColor
                    )}>
                      {item.icon}
                    </span>
                    <span className="whitespace-normal leading-tight">
                      {item.id === 'about' ? (
                        <>
                          <span className="hidden min-[410px]:inline">Om BLU-Hjelperen</span>
                          <span className="min-[410px]:hidden">Om BLU</span>
                        </>
                      ) : (
                        item.title
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* VISNING 1: MIN PROFIL                                                    */}
          {/* ========================================================================= */}
          {activeMenu === 'profile' && (
            <motion.div 
              key="view-profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 sm:space-y-8 pb-16"
            >
              {/* Toppseksjon med tittel og Lagre-knapp */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-bold mb-2">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Brukerprofil & Studieløp</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Min Profil</h2>
                  <p className="text-slate-500 text-sm mt-1">Dine opplysninger og studieinformasjon.</p>
                </div>
                {handleSaveProfile && (
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className={cn(
                      "w-full sm:w-auto min-h-[48px] px-6 py-3.5 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md cursor-pointer active:scale-[0.98]",
                      isSavingProfile && "opacity-70 cursor-not-allowed"
                    )}
                  >
                    {isSavingProfile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isSavingProfile ? 'Lagrer...' : 'Lagre endringer'}
                  </button>
                )}
              </div>

              {/* Advarsel hvis profilen er ufullstendig */}
              {(!profile?.studyProgram || !profile?.studentId || !profile?.deadline) && (
                <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
                  <div className="bg-amber-100 p-2.5 rounded-xl shrink-0 text-amber-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-900">Fullfør profilen din</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Fyll ut studieprogram, studentnummer og innleveringsfrist for å få bedre personlige forslag og påminnelser.
                    </p>
                  </div>
                </div>
              )}

              {/* Brukerkort med profilbilde og sammendrag */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
                  <div className="relative">
                    {user?.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={profile?.name || "Profilbilde"} 
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 rounded-full object-cover border-4 border-slate-50 shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center text-primary border-4 border-slate-50 shadow-md">
                        <User className="w-10 h-10" />
                      </div>
                    )}
                    {user && (
                      <div className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1 rounded-full shadow border-2 border-white" title="Innlogget">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div className="text-center sm:text-left flex-1">
                    <h3 className="text-xl md:text-2xl font-black text-slate-900">{profile?.name || user?.displayName || 'Studentprofil'}</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{profile?.email || user?.email || 'Ikke oppgitt e-post'}</p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                      {(profile?.studiested || profile?.college) && (
                        <span className="px-3 py-1 bg-indigo-50 border border-indigo-200/60 text-indigo-700 rounded-lg text-xs font-bold">
                          {profile?.studiested || profile?.college}
                        </span>
                      )}
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
                        {profile?.studyProgram || 'Ingen studieprogram valgt'}
                      </span>
                      <span className="px-3 py-1 bg-primary/10 text-primary font-bold rounded-lg text-xs">
                        {pricingModels.find(m => m.id === pricingTier)?.name || (pricingTier === 'semester' ? 'Semester / År' : 'Gratis')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Informasjonsskjema */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Fullt Navn</label>
                    <input 
                      type="text" 
                      value={profile?.name || ''} 
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="F.eks. Svein Nordvik"
                      className="w-full py-3.5 px-4 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">E-postadresse</label>
                    <input 
                      type="email" 
                      value={profile?.email || ''} 
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      placeholder="student@dmmh.no"
                      className="w-full py-3.5 px-4 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Studentnummer</label>
                    <input 
                      type="text" 
                      value={profile?.studentId || ''} 
                      onChange={(e) => setProfile({ ...profile, studentId: e.target.value })}
                      placeholder="Ditt studentnummer"
                      className="w-full py-3.5 px-4 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Kandidatnummer</label>
                    <input 
                      type="text" 
                      value={profile?.candidateId || ''} 
                      onChange={(e) => setProfile({ ...profile, candidateId: e.target.value })}
                      placeholder="F.eks. 101"
                      className="w-full py-3.5 px-4 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Kull / Årgang</label>
                    <input 
                      type="text" 
                      value={profile?.year || ''} 
                      onChange={(e) => setProfile({ ...profile, year: e.target.value })}
                      placeholder="F.eks. 2024-2027"
                      className="w-full py-3.5 px-4 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Innleveringsfrist</label>
                    <input 
                      type="date" 
                      value={profile?.deadline || ''} 
                      onChange={(e) => setProfile({ ...profile, deadline: e.target.value })}
                      className="w-full py-3.5 px-4 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Studiested (Høyskole/Uni)</label>
                    <input 
                      type="text" 
                      value={profile?.studiested || profile?.college || ''} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfile({ ...profile, studiested: val, college: val });
                        if (setSettings) setSettings({ ...settings, studiested: val });
                      }}
                      placeholder="F.eks. DMMH, OsloMet, NTNU..."
                      className="w-full py-3.5 px-4 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Studieprogram</label>
                    <select 
                      value={profile?.studyProgram || ''} 
                      onChange={(e) => {
                        if (e.target.value === 'Annet' && pricingTier !== 'semester' && onNavigate) {
                          onNavigate('pricing');
                          return;
                        }
                        setProfile({ ...profile, studyProgram: e.target.value });
                      }}
                      className="w-full py-3.5 px-4 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                    >
                      <option value="">Velg studieprogram...</option>
                      <option value="Barnehagelærer, heltid">Barnehagelærer, heltid</option>
                      <option value="Barnehagelærer, deltid">Barnehagelærer, deltid</option>
                      <option value="Barnehagelærer med vekt på musikk, drama, kunst og håndverk">Barnehagelærer med vekt på musikk, drama, kunst og håndverk</option>
                      <option value="Barnehagelærer med vekt på natur og friluftsliv">Barnehagelærer med vekt på natur og friluftsliv</option>
                      <option value="Barnehagelærer med vekt på flerkulturell forståelse">Barnehagelærer med vekt på flerkulturell forståelse</option>
                      <option value="Annet">Annet / Egendefinert... {pricingTier !== 'semester' ? '🔒' : ''}</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Spesialisering / Fordypning</label>
                    <input 
                      type="text" 
                      value={profile?.specialization || ''} 
                      onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                      placeholder="F.eks. Natur, helse og bevegelse"
                      className="w-full py-3.5 px-4 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Studiemodell</label>
                    <input 
                      type="text" 
                      value={profile?.studyModel || ''} 
                      onChange={(e) => setProfile({ ...profile, studyModel: e.target.value })}
                      placeholder="F.eks. 2023-modell"
                      className="w-full py-3.5 px-4 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Aktuelle emner (pensumforslag)</label>
                    <input 
                      type="text" 
                      value={profile?.courses || ''} 
                      onChange={(e) => setProfile({ ...profile, courses: e.target.value })}
                      placeholder="F.eks. BHG3000, PED2000"
                      className="w-full py-3.5 px-4 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                    />
                  </div>
                </div>

                {handleSaveProfile && (
                  <div className="flex justify-end mt-6 pt-6 border-t border-slate-100">
                    <button 
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className={cn(
                        "w-full sm:w-auto min-h-[48px] px-8 py-3.5 bg-primary text-white rounded-xl text-base sm:text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary-hover transition-all shadow-md cursor-pointer active:scale-[0.98]",
                        isSavingProfile && "opacity-70 cursor-not-allowed"
                      )}
                    >
                      {isSavingProfile ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isSavingProfile ? 'Lagrer...' : 'Lagre profil'}
                    </button>
                  </div>
                )}
              </div>

              {/* Pedagogisk Profil & Rammeplan */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2.5 rounded-2xl text-primary">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Pedagogisk profil & Rammeplan</h3>
                      <p className="text-xs text-slate-400 font-medium">Ditt faglige fokus fra Velkomstguiden</p>
                    </div>
                  </div>
                  {setShowWelcomeGuide && (
                    <button 
                      onClick={() => setShowWelcomeGuide(true)}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-primary-light/20 hover:text-primary hover:border-primary/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      Åpne Prinsipp-sjekk / Guide
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Fokusområde i Rammeplanen</span>
                    <p className="text-sm font-bold text-slate-900">
                      {pedagogicalProfile?.frameworkFocus || "Ikke valgt ennå"}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Dine kjernebegreper & verdier</span>
                    {pedagogicalProfile?.coreValues && pedagogicalProfile.coreValues.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {pedagogicalProfile.coreValues.map((v: string, i: number) => (
                          <span key={`core-val-${i}-${v}`} className="px-2.5 py-0.5 bg-white border border-slate-200 text-primary font-bold text-xs rounded-lg shadow-xs">
                            {v}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">Ingen verdier valgt ennå</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Databehandling & Synkronisering */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-600">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Databehandling & Synkronisering</h3>
                    <p className="text-xs text-slate-400">Alt du gjør lagres lokalt i nettleseren og kan synkroniseres til skyen.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800 text-sm">Sky-synkronisering</p>
                      {isSaving || isSyncing ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Synkroniserer...
                        </span>
                      ) : isQuotaExceeded ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                          <AlertTriangle className="w-3 h-3" /> Utsett pga. kvote
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" /> Synkronisert
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Sist lagret: {lastCloudSyncTime > 0 ? new Date(lastCloudSyncTime).toLocaleTimeString('no-NO') : 'Venter på første synkronisering...'}
                    </p>
                  </div>
                  {handleManualSync && (
                    <button 
                      onClick={handleManualSync}
                      disabled={isSaving || isSyncing || isQuotaExceeded || !user}
                      className={cn(
                        "px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold shadow-xs hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer",
                        (isQuotaExceeded || !user) && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", (isSaving || isSyncing) && "animate-spin")} />
                      Synkroniser nå
                    </button>
                  )}
                </div>

                {!user && (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                    <Lock className="w-4 h-4 text-blue-500 shrink-0" />
                    <p className="text-xs text-blue-800">
                      Du bruker appen som gjest. Data lagres kun i din nettleser. Logg inn for å få automatisk sikkerhetskopi på tvers av PC og mobil.
                    </p>
                  </div>
                )}
              </div>

              {/* Abonnement & Brukerkonto */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shadow-md shrink-0",
                      pricingTier === 'free' ? "bg-slate-100 text-slate-400" : 
                      pricingTier === 'preview' ? "bg-emerald-500 text-white" :
                      "bg-primary text-white"
                    )}>
                      {pricingTier === 'preview' ? <Zap className="w-7 h-7 animate-pulse" /> : <CreditCard className="w-7 h-7" />}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Abonnementsstatus</span>
                      <h4 className="text-lg md:text-xl font-black text-slate-900 mt-0.5">
                        {pricingTier === 'preview' ? '24-timers Preview aktiv' : 
                         pricingModels.find(m => m.id === pricingTier)?.name || (pricingTier === 'semester' ? 'Semesterabonnement' : 'Gratisversjon')}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {user ? `Innlogget som ${user.email}` : 'Ikke innlogget – gratis lokalversjon'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                    {!user ? (
                      <button 
                        onClick={() => setShowAuthModal && setShowAuthModal(true)}
                        className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <UserCheck className="w-4 h-4" /> Logg inn
                      </button>
                    ) : (
                      <button 
                        onClick={handleLogout}
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Logg ut
                      </button>
                    )}

                    {pricingTier !== 'preview' && onNavigate && (
                      <button 
                        onClick={() => onNavigate('pricing')}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        {pricingTier === 'free' ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <SettingsIcon className="w-3.5 h-3.5" />}
                        {pricingTier === 'free' ? 'Oppgrader nå' : 'Administrer abonnement'}
                      </button>
                    )}

                    {pricingTier !== 'free' && pricingTier !== 'preview' && handleCancelSubscription && (
                      <button 
                        onClick={handleCancelSubscription}
                        className="px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 hover:bg-red-100 transition-all cursor-pointer"
                      >
                        Si opp
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Verveprogram (50 kr rabatt på Semester-pakka) */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-100 p-2.5 rounded-2xl text-amber-700 shrink-0">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">Verv en medstudent</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs">
                          50,- bonus
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">Både du og medstudenten får 50 kr i bonus som rabatt på Semester-pakka</p>
                    </div>
                  </div>
                  <div className="bg-primary/5 px-4 py-2 rounded-2xl border border-primary/15 text-left sm:text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Din vervebonus</span>
                    <span className="text-sm font-black text-primary">50,- kr opptjent</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Del din unike vervelenke med kollokviegruppen eller venner på kullet. Når de registrerer seg, aktiveres en 50 kr velkomstbonus for dem, og du mottar 50 kr i kreditt som kan trekkes fra ved kjøp av <strong>Semester-pakka</strong>.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                  <div className="flex-1 px-3 py-2 text-xs font-mono text-slate-700 select-all truncate">
                    {referralUrl}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(referralUrl);
                      setCopiedReferral(true);
                      setTimeout(() => setCopiedReferral(false), 2000);
                    }}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs"
                  >
                    {copiedReferral ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Kopiert!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Kopier vervelenke</span>
                      </>
                    )}
                  </button>
                </div>
                
                <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                  <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Vervebonusen kan utelukkende innløses som prisavslag på Semester-pakka (opptil 100 kr totalrabatt).</span>
                </div>
              </div>

              {/* Sikkerhetsinfo */}
              <div className="p-5 bg-primary/5 rounded-2xl border border-primary/15 flex items-start gap-4">
                <ShieldCheck className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-slate-700 leading-relaxed">
                  Informasjonen du oppgir brukes utelukkende til å gi en tilpasset veiledning for dine emner og din bacheloroppgave. Dataene dine lagres trygt i en kryptert skydatabase (Firebase), og brukes <strong>aldri</strong> til å trene opp eksterne KI-modeller.
                </p>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* VISNING 2: INNSTILLINGER                                                 */}
          {/* ========================================================================= */}
          {activeMenu === 'settings' && (
            <motion.div 
              key="view-settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 pb-16"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-200/60 text-violet-700 text-xs font-bold mb-2">
                  <SettingsIcon className="w-3.5 h-3.5 text-violet-600" />
                  <span>Preferanser & System</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Innstillinger</h2>
                <p className="text-slate-500 text-sm mt-1">Applikasjon, tema, varslinger og datasikkerhet.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Arbeidsområde */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-primary" /> Arbeidsområde
                  </h3>
                  <div className="space-y-4">
                    {setSettings && (
                      <>
                        <div 
                          onClick={() => setSettings({ ...settings, showTimerInHeader: !settings?.showTimerInHeader })}
                          className="flex items-center justify-between py-2 px-2 -mx-2 rounded-xl hover:bg-slate-50 active:bg-slate-100 cursor-pointer min-h-[44px] transition-colors"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-700">Vis tidtaker i toppmeny</p>
                            <p className="text-[10px] text-slate-400">Pomodoro-klokke øverst.</p>
                          </div>
                          <div 
                            className={cn(
                              "w-11 h-6 rounded-full relative transition-all shrink-0",
                              settings?.showTimerInHeader ? "bg-primary" : "bg-slate-200"
                            )}
                          >
                            <div className={cn(
                              "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-xs",
                              settings?.showTimerInHeader ? "right-0.5" : "left-0.5"
                            )} />
                          </div>
                        </div>

                        <div 
                          onClick={() => setSettings({ ...settings, showDeadlineInHeader: !settings?.showDeadlineInHeader })}
                          className="flex items-center justify-between py-2 px-2 -mx-2 rounded-xl hover:bg-slate-50 active:bg-slate-100 cursor-pointer min-h-[44px] transition-colors"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-700">Vis innleveringsfrist</p>
                            <p className="text-[10px] text-slate-400">Dager igjen i toppmenyen.</p>
                          </div>
                          <div 
                            className={cn(
                              "w-11 h-6 rounded-full relative transition-all shrink-0",
                              settings?.showDeadlineInHeader ? "bg-primary" : "bg-slate-200"
                            )}
                          >
                            <div className={cn(
                              "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-xs",
                              settings?.showDeadlineInHeader ? "right-0.5" : "left-0.5"
                            )} />
                          </div>
                        </div>
                      </>
                    )}

                    {setLowStressMode && (
                      <div 
                        onClick={() => setLowStressMode(!lowStressMode)}
                        className="flex items-center justify-between py-2 px-2 -mx-2 rounded-xl hover:bg-slate-50 active:bg-slate-100 cursor-pointer min-h-[44px] pt-2 border-t border-slate-100 transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Moon className="w-3.5 h-3.5 text-primary" /> Lav-stress modus
                          </p>
                          <p className="text-[10px] text-slate-400">Roligere grensesnitt for dyp skriving.</p>
                        </div>
                        <div 
                          className={cn(
                            "w-11 h-6 rounded-full relative transition-all shrink-0",
                            lowStressMode ? "bg-primary" : "bg-slate-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-xs",
                            lowStressMode ? "right-0.5" : "left-0.5"
                          )} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Applikasjonstema */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Applikasjonstema
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">Velg fargestil for appen:</p>
                  
                  {themes && themes.length > 0 && setSelectedTheme ? (
                    <div className="grid grid-cols-4 gap-2.5">
                      {themes.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => setSelectedTheme(theme)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all cursor-pointer group",
                            selectedTheme?.id === theme.id 
                              ? "border-primary bg-primary/5" 
                              : "border-slate-100 hover:border-slate-200 bg-slate-50"
                          )}
                          title={theme.name}
                        >
                          <div 
                            className="w-7 h-7 rounded-full shadow-xs group-hover:scale-110 transition-transform" 
                            style={{ backgroundColor: theme.color }}
                          />
                          <span className="text-[10px] font-bold text-slate-700 truncate max-w-[60px]">{theme.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 rounded-full bg-slate-900 ring-2 ring-offset-2 ring-primary cursor-pointer"></div>
                      <div className="w-8 h-8 rounded-full bg-indigo-600 cursor-pointer"></div>
                      <div className="w-8 h-8 rounded-full bg-emerald-600 cursor-pointer"></div>
                      <div className="w-8 h-8 rounded-full bg-amber-500 cursor-pointer"></div>
                    </div>
                  )}
                </div>

                {/* Skrivepreferanser */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileEdit className="w-4 h-4 text-primary" /> Skrivepreferanser
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Foretrukket målform</label>
                      <select 
                        value={settings?.preferredLanguage || 'Bokmål'}
                        onChange={(e) => setSettings && setSettings({ ...settings, preferredLanguage: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                      >
                        <option value="Bokmål">Bokmål</option>
                        <option value="Nynorsk">Nynorsk</option>
                      </select>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Mitt studiested</label>
                      <input 
                        type="text"
                        placeholder="F.eks. DMMH, NTNU, OsloMet, NORD..."
                        value={settings?.studiested || profile?.studiested || profile?.college || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (setSettings) setSettings({ ...settings, studiested: val });
                          setProfile({ ...profile, studiested: val, college: val });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                      />
                      <p className="text-[10px] text-slate-400">Brukes til å tilpasse litteratursøk og referanser.</p>
                    </div>
                  </div>
                </div>

                {/* Konto & Stripe Portal */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" /> Betaling & Portal
                  </h3>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Aktiv plan</p>
                    <p className="text-base font-black text-primary">
                      {pricingTier === 'semester' ? 'Semesterabonnement' : 
                       pricingTier === 'monthly' ? 'Månedsabonnement' : 'Gratisversjon'}
                    </p>
                  </div>
                  <button 
                    onClick={() => window.open('https://billing.stripe.com/p/login/9B600c4Qq6Wx1qg42g18c00', '_blank', 'noopener,noreferrer')}
                    className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Administrer via Stripe
                  </button>
                </div>
              </div>

              {/* Varslinger og App-oppsett */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" /> Varslinger og App-oppsett
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Varslingspreferanser</p>
                    
                    {[
                      { id: 'chat', label: 'Meldinger i gruppechat', desc: 'Få varsel når noen skriver i fellesskapet.' },
                      { id: 'deadlines', label: 'Frister og milepæler', desc: 'Påminnelser om viktige datoer i oppgaven.' },
                      { id: 'tips', label: 'Mentor-tips', desc: 'Daglige tips for akademisk skriving.' }
                    ].map((pref) => (
                      <div key={pref.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-xs font-bold text-slate-700">{pref.label}</p>
                          <p className="text-[10px] text-slate-400">{pref.desc}</p>
                        </div>
                        {handleUpdateNotificationPref && (
                          <button 
                            onClick={() => handleUpdateNotificationPref(pref.id)}
                            className={cn(
                              "w-10 h-5 rounded-full relative transition-all cursor-pointer",
                              notificationSettings[pref.id] ? "bg-primary" : "bg-slate-200"
                            )}
                          >
                            <div className={cn(
                              "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-xs",
                              notificationSettings[pref.id] ? "right-0.5" : "left-0.5"
                            )} />
                          </button>
                        )}
                      </div>
                    ))}

                    {requestNotificationPermission && (
                      <button 
                        onClick={requestNotificationPermission}
                        disabled={permissionStatus === 'granted'}
                        className={cn(
                          "w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer",
                          permissionStatus === 'granted' 
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-none cursor-default" 
                            : "bg-primary text-white hover:bg-primary-hover shadow-primary/20"
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
                    )}
                  </div>

                  <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2 text-blue-700">
                      <Smartphone className="w-4 h-4" />
                      <h4 className="font-bold text-xs">Motta varsler på iPhone?</h4>
                    </div>
                    <p className="text-xs text-blue-600 mb-3 leading-relaxed">
                      For å motta push-varsler på iOS må BLU-Hjelperen legges til på hjemskjermen:
                    </p>
                    <div className="space-y-2">
                      {[
                        "Trykk på Del-ikonet (firkant med pil opp) i Safari.",
                        "Scroll ned og velg 'Legg til på Hjem-skjerm'.",
                        "Åpne appen derfra og tillat varsler."
                      ].map((step, i) => (
                        <div key={`step-${i}`} className="flex gap-2.5 items-start">
                          <span className="shrink-0 w-4 h-4 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[9px] font-bold">
                            {i + 1}
                          </span>
                          <p className="text-[11px] text-blue-800 leading-tight">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Installer app / Bruk som app */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-indigo-500" /> Installer app (PWA)
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                  Slik legger du BLU-Hjelperen til på hjemskjermen for en renere app-følelse uten nettleserlinjer.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Share className="w-4 h-4 text-primary" />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">For iPhone (Safari)</h4>
                    </div>
                    <ol className="text-xs text-slate-600 space-y-2 pl-4 list-decimal">
                      <li>Trykk på <strong>Del</strong>-ikonet (firkant med pil opp) nederst.</li>
                      <li>Scroll ned og velg <strong>Legg til på Hjem-skjerm</strong>.</li>
                      <li>Bekreft med <strong>Legg til</strong> øverst til høyre.</li>
                    </ol>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                      <MoreVertical className="w-4 h-4 text-primary" />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">For Android (Chrome)</h4>
                    </div>
                    <ol className="text-xs text-slate-600 space-y-2 pl-4 list-decimal">
                      <li>Trykk på de <strong>tre prikkene</strong> øverst til høyre.</li>
                      <li>Velg <strong>Installer app</strong> eller <strong>Legg til på startskjerm</strong>.</li>
                      <li>Følg anvisningene på skjermen.</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Sikkerhet (GDPR) */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 border-l-4 border-l-red-500 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                      <Shield className="w-5 h-5 text-red-500" /> Data & Sikkerhet (GDPR)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Dine data synkroniseres trygt og brukes aldri til KI-trening.</p>
                  </div>
                  {handleExportData && (
                    <button 
                      onClick={handleExportData}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all cursor-pointer self-start sm:self-auto shadow-xs"
                    >
                      <Download className="w-4 h-4" /> Eksporter data
                    </button>
                  )}
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                  Appen lagrer arbeidet ditt fortløpende i en sikker, kryptert skydatabase (Google Firebase). Du eier dine egne data fullt og helt. <strong>Dine tekster brukes ALDRI til å trene opp kunstig intelligens-modeller.</strong>
                </div>

                {/* Slett konto / data */}
                <div className="pt-2">
                  <DeleteDataButton />
                </div>

                <AIWarning compact={true} />
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* VISNING 3: OM APPEN                                                     */}
          {/* ========================================================================= */}
          {activeMenu === 'about' && (
            <motion.div 
              key="view-about"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 pb-16"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-bold mb-2">
                  <Info className="w-3.5 h-3.5 text-emerald-600" />
                  <span>BLU-Hjelperen v3.4.3</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Om BLU-Hjelperen</h2>
                <p className="text-slate-500 text-sm mt-1">Versjon, kildegrunnlag og vilkår.</p>
              </div>
              
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                  <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                    <Info className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">BLU-Hjelperen</h3>
                    <p className="text-xs text-slate-500">Din digitale veileder for barnehagelærerstudiet</p>
                  </div>
                </div>

                <div className="text-sm leading-relaxed text-slate-700 space-y-3">
                  <p className="font-bold text-base text-slate-900">
                    Din digitale veileder for akademisk skriving og didaktisk refleksjon.
                  </p>
                  <p>
                    Denne applikasjonen er din digitale skrivepartner gjennom barnehagelærerstudiet. Appen er utviklet for å støtte studenter i deres studiehverdag, uavhengig av universitet eller høyskole. Ved å kombinere pedagogisk fagkunnskap med avansert KI-teknologi, gir BLU-Hjelperen deg veiledning i alt fra didaktiske planer og refleksjonsoppgaver til bacheloroppgaven.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-sm">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Personvern & Sikkerhet
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Dine dokumenter og profildata lagres kryptert i en Google Firebase-database. Dataene er private for din bruker og brukes aldri til KI-trening eller tredjeparter.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-amber-600" /> Ansvarlig bruk av KI
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      KI-en veileder og stiller sokratiske spørsmål for å styrke din egen skriving og refleksjon. Husk alltid å verifisere offisielle kilder som Rammeplanen og Lovdata.
                    </p>
                  </div>
                </div>

                {/* Versjonshistorikk & Kilder */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm">
                      <FileCode className="w-4 h-4 text-primary" /> Versjonshistorikk
                    </h4>
                    <div className="space-y-2 text-xs">
                      {/* Siste / Gjeldende versjon */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-primary/20 bg-primary/5">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <strong className="text-slate-900 block font-bold">v3.5.0 (September 2026)</strong>
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Nyeste</span>
                        </div>
                        <span className="text-slate-600">Ekte Word A4-ark med separate sider, 2,54 cm akademiske marger, topp- og bunntekst, samt automatisk tekstoverføring ved overskridelse. 2-linjers akademisk verktøylinje med Angre/Gjenta, skrifttyper (Times New Roman, Calibri, Arial, Georgia), linjeavstand, overskrifter (H1–H3), synlig Søk & erstatt og + Kilde (APA 7). Word-stil Zoom-glidebryter (50 % – 175 %) og hurtigmeny. Ekspansiv Fokusmodus med valgfrie bredder (Normal, Bred 1024px, Ekstra bred, Full) og skriftstørrelser (18px–28px) uten indre scrollbokser. Sanntidsanalyse med ord, tegn, avsnitt, lesetid og LIX-lesbarhetsindeks.</span>
                      </div>

                      {/* Mappe/nedtrekk for eldre versjoner */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setShowOlderVersions(!showOlderVersions)}
                          className="w-full py-2 px-3 bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border border-slate-200/60"
                        >
                          <span className="flex items-center gap-2">
                            <FolderArchive className="w-3.5 h-3.5 text-slate-500" />
                            <span>Tidligere versjoner (v3.4.3, v3.4.2, v3.4.1, v3.4.0, v3.3.0)</span>
                          </span>
                          {showOlderVersions ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </button>

                        {showOlderVersions && (
                          <ul className="space-y-2 mt-2 pt-1 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                            <li className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60">
                              <strong className="text-slate-800 block mb-0.5">v3.4.3 (September 2026)</strong>
                              <span className="text-slate-500">Avhuking (multi-select) og smart kildeoverføring i Kildebanken: Huk av kilder fra standardpensum eller egne kilder, og overfør dem direkte til valgfri oppgave/mappe med automatisk APA 7-alfabetisering, flytende handlingslinje for hurtigkopiering av kildelister, samt forklaring av pensum-RAG på Hjem-fanen.</span>
                            </li>
                            <li className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60">
                              <strong className="text-slate-800 block mb-0.5">v3.4.2 (September 2026)</strong>
                              <span className="text-slate-500">Permanent sky- og hurtigbufferlagring av samtaler i Superveilederen og prosesslogger knyttet direkte til mapper og oppgaver, visning av lagrede prosesslogger i sidepanelet med mulighet for hurtiginnsetting i oppgaveteksten, samt modulær ytelsesoptimalisering (code-splitting av eksport- og PDF-motorer) for maksimal responsivitet og rask oppstart.</span>
                            </li>
                            <li className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60">
                              <strong className="text-slate-800 block mb-0.5">v3.4.1 (September 2026)</strong>
                              <span className="text-slate-500">Ny frittstående Kildebank (APA 7) integrert under Ressurser og Skriving for enkel kildehåndtering uavhengig av oppgaver, ny oppgavetype «Notater & Kladdeblokk» med åpen og fri disposisjon, samt hurtigknapp «+ Nytt notat / kladd» for umiddelbar skriving og idémyldring i Skriveverkstedet.</span>
                            </li>
                            <li className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60">
                              <strong className="text-slate-800 block mb-0.5">v3.4.0 (September 2026)</strong>
                              <span className="text-slate-500">Presis 16:9 HD Widescreen PowerPoint-eksport motor (.pptx) med garantert rammepassform og automatiske foredragsholdernotater, ny utskrifts- og PDF-generator for presentasjoner, direkte utklippstavle-kopiering av fullstendig tekst og manus, stabilitetsoppgradering i Skriveverkstedet (WYSIWYG), samt renset mobilvisning i verktøydashboardet.</span>
                            </li>
                            <li className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60">
                              <strong className="text-slate-800 block mb-0.5">v3.3.0 (September 2026)</strong>
                              <span className="text-slate-500">Brukergrensesnitt- og stabilitetsoppgradering. Fullstendig eliminering av avbrytende nettleservarsler (popups) til fordel for sømløse in-app bannere, nye ferdigbygde barnehagepedagogiske flashcards-kortstokker, og forbedret kildeformatering.</span>
                            </li>
                            <li className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60">
                              <strong className="text-slate-800 block mb-0.5">v3.2.0 (September 2026)</strong>
                              <span className="text-slate-500">Avansert dokumenteksport til Word (.docx) og PDF (.pdf) med 4 høyskolenivå forsidetemaer, innholdsfortegnelse med hierarki og dot-leaders, samt APA 7-krav (14pt/12pt overskrifter med sideskift for H1, 1,5 linjeavstand, 2,54 cm marger, blokksitater og hengende innrykk).</span>
                            </li>
                            <li className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60">
                              <strong className="text-slate-800 block mb-0.5">v3.1.4 (September 2026)</strong>
                              <span className="text-slate-500">Robust flermodell-fallback (veksler automatisk mellom Gemini-modeller ved kvotebegrensninger), optimalisert token-beskyttelse og synlig versjonsindikator i bunnteksten.</span>
                            </li>
                            <li className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60">
                              <strong className="text-slate-800 block mb-0.5">v3.1.3 (September 2026)</strong>
                              <span className="text-slate-500">Brukervennlig håndtering ved stor pågang på KI-assistenten med «Prøv igjen nå»-knapp, studentvennlig feilvarsling og forbedret Basen-mobilvisning.</span>
                            </li>
                            <li className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60">
                              <strong className="text-slate-800 block mb-0.5">v3.1.1 (September 2026)</strong>
                              <span className="text-slate-500">Oppgradert Gemini-modellfallback, forbedret feilhåndtering og feilrensing i Superveileder, samt optimalisert ytelse.</span>
                            </li>
                            <li className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60">
                              <strong className="text-slate-800 block mb-0.5">v3.0.0 (September 2026)</strong>
                              <span className="text-slate-500">Ny WorkspaceLayout-sidemeny, samlet Konto-hub, automatisk deployment og optimalisert ytelse.</span>
                            </li>
                            <li className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60">
                              <strong className="text-slate-800 block mb-0.5">v2.0.0 (April 2026)</strong>
                              <span className="text-slate-500">Lansering av Basen, didaktisk planlegger og oppgraderte AI-motorer.</span>
                            </li>
                            <li className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60">
                              <strong className="text-slate-800 block mb-0.5">v1.0.0 (Februar 2026)</strong>
                              <span className="text-slate-500">Første versjon lansert for barnehagelærerstudenter.</span>
                            </li>
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm">
                      <Library className="w-4 h-4 text-primary" /> Kildegrunnlag
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-600">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>Kildekompasset og APA 7-manual</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>Utdanningsdirektoratet (Rammeplan for barnehagen)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>Barnehageloven og offisielle forskrifter</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>Forskningsetiske retningslinjer (NESH / SIKT)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>Nasjonale retningslinjer for barnehagelærerutdanning</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Bruksvilkår og Ansvarsfraskrivelse */}
                <div className="space-y-4 pt-2">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-2 text-xs">
                      <FileText className="w-4 h-4 text-primary" /> Bruksvilkår & Retningslinjer
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Denne assistenten er ment som et <strong>supplement</strong> til ordinær veiledning fra faglærer og bibliotekets tjenester. Den erstatter ikke formell veiledning. All bruk av KI-generert tekst i din endelige oppgave må skje i tråd med gjeldende regler for fusk og kildebruk ved ditt lærested.
                    </p>
                  </div>

                  <div className="p-5 bg-amber-50/70 rounded-2xl border border-amber-200/60">
                    <h4 className="font-bold text-amber-900 mb-1.5 flex items-center gap-2 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Viktig ansvarsfraskrivelse
                    </h4>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Dette er et KI-basert verktøy. Kunstig intelligens kan generere feilaktig informasjon, hallusinere kilder eller misforstå kontekst. Du som student er selv fullt ansvarlig for innholdet i dine egne tekster og akademiske arbeider, og for å kontrollere at alle referanser og påstander stemmer.
                    </p>
                  </div>
                </div>

                {/* Opphavsrett og vilkår-lenker */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                  <p>© 2026 S. Nordvik. Alle rettigheter forbeholdt.</p>
                  <div className="flex items-center gap-3">
                    {onNavigate && (
                      <>
                        <button 
                          onClick={() => onNavigate('privacy')}
                          className="text-primary hover:underline font-medium cursor-pointer"
                        >
                          Personvernerklæring
                        </button>
                        <span>•</span>
                        <button 
                          onClick={() => onNavigate('terms')}
                          className="text-primary hover:underline font-medium cursor-pointer"
                        >
                          Brukervilkår
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </WorkspaceLayout>
  );
}
