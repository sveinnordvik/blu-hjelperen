import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Building, 
  FileText, 
  LogOut, 
  Key, 
  X, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Shield,
  Sparkles,
  Save,
  Info
} from 'lucide-react';
import { useRole, Role } from '../../context/RoleContext';
import { auth, signOut } from '../../firebase';
import { LegalModal } from './LegalModal';
import { OmPedPortalenView } from '../portalen/OmPedPortalenView';
import { useNavigate } from 'react-router-dom';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { role, setRole, canSwitch, isSvein, isPortalBeta, currentUserEmail } = useRole();
  const navigate = useNavigate();

  const roleRoutes: Record<Role, string> = {
    STYRERN: '/styrer',
    PEDLEDERN: '/pedleder',
    FAGARBEIDERN: '/fagarbeider',
    ASSISTENTN: '/assistent',
    VIKARN: '/vikar',
    STUDENTN: '/blu-hjelperen',
    GUEST: '/'
  };

  const isHavard = currentUserEmail?.toLowerCase() === 'havard.hovin@melhus.kommune.no' || isPortalBeta;

  // Personlige notater og ansvarsområder lagres i localStorage
  const [personalNotes, setPersonalNotes] = useState<string>(() => {
    return localStorage.getItem('user_profile_notes') || 
      (isSvein 
        ? 'Overordnet systemansvar, pedagogisk arkitektur, tilsynsberedskap og HMS-ledelse.' 
        : isHavard
          ? 'Betatesting av Portalen for Melhus kommune, evaluering av leder- og fagarbeiderverktøy.'
          : 'Daglig ledelse, personaloppfølging, foreldresamarbeid (SU) og budsjettansvar.');
  });
  const [phone, setPhone] = useState<string>(() => {
    return localStorage.getItem('user_profile_phone') || (isHavard ? '+47 72 85 80 00' : '+47 90 12 34 56');
  });
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [saveNotesSuccess, setSaveNotesSuccess] = useState(false);

  // Passordbytte dialog state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms'>('privacy');
  const [omPedPortalenModalOpen, setOmPedPortalenModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
    // Slett ALLE lagrede data knyttet til økten
    sessionStorage.clear();
    localStorage.clear();
    
    // Tving full re-innlasting for å fjerne alle cachede brukerdata
    window.location.href = '/'; 
  };

  const handleSaveNotes = () => {
    localStorage.setItem('user_profile_notes', personalNotes);
    localStorage.setItem('user_profile_phone', phone);
    setSaveNotesSuccess(true);
    setIsEditingNotes(false);
    setTimeout(() => setSaveNotesSuccess(false), 2500);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Det nye passordet må være minst 6 tegn.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passordene er ikke like. Vennligst sjekk igjen.' });
      return;
    }

    // Bekreftelse
    setPasswordMessage({ type: 'success', text: 'Passordet ble oppdatert.' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => {
      setShowPasswordChange(false);
      setPasswordMessage(null);
    }, 2000);
  };

  // Navn og profilinformasjon
  const userName = currentUserEmail 
    ? (isSvein ? 'Svein Nordvik' : isHavard ? 'Håvard Hovin' : 'Ukjent bruker') 
    : 'Ikke logget inn';
  const userInitials = currentUserEmail
    ? (isSvein ? 'SN' : isHavard ? 'HH' : 'UK')
    : '??';
  const userEmail = currentUserEmail || 'Ingen e-post tilknyttet';

  // Visningsnavn for aktiv rolle
  const roleDisplayNames: Record<Role, string> = {
    STYRERN: 'Styrer',
    PEDLEDERN: 'Pedagogisk leder',
    FAGARBEIDERN: 'Fagarbeider',
    ASSISTENTN: 'Assistent',
    VIKARN: 'Vikar',
    STUDENTN: 'Student (BLU-hjelperen)',
    GUEST: 'Gjest'
  };

  // Liste over roller brukeren kan bytte til
  // VIKTIG: Studentn er KUN synlig for Svein
  const availableRoles: { id: Role; label: string; desc: string; color: string }[] = [
    { id: 'STYRERN', label: 'Styrern', desc: 'Overordnet ledelse, HMS & bemanning', color: 'bg-indigo-600' },
    { id: 'PEDLEDERN', label: 'Pedledern', desc: 'Drift, ukeplan, dokumentasjon & PPT', color: 'bg-emerald-600' },
    { id: 'FAGARBEIDERN', label: 'Fagarbeidern', desc: 'Praksisnær pedagogikk & aktiviteter', color: 'bg-amber-600' },
    { id: 'ASSISTENTN', label: 'Assistentn', desc: 'Omsorg, rutiner & trygge rammer', color: 'bg-teal-600' },
    { id: 'VIKARN', label: 'Vikarn', desc: '5-minutters hurtigonboarding & sikkerhet', color: 'bg-cyan-700' },
    ...(isSvein ? [{ 
      id: 'STUDENTN' as Role, 
      label: 'Studentn', 
      desc: 'BLU-hjelperen (Kun synlig for Svein)', 
      color: 'bg-purple-600' 
    }] : [])
  ];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden my-auto border border-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOPPHEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <User className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Brukerprofil</h2>
                <p className="text-xs text-indigo-200">Personlig oversikt og systemtilganger</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              title="Lukk profilkort"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* HOVEDINNHOLD MED RULLING */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* BRUKER-BANNER */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white text-2xl font-black shadow-md border-2 border-white shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-xl text-slate-900 truncate">{userName}</h3>
                {isSvein && (
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                    Eier / Superbruker
                  </span>
                )}
                {isHavard && !isSvein && (
                  <span className="bg-blue-100 text-blue-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-300">
                    Betabruker • Melhus kommune
                  </span>
                )}
              </div>
              <p className="text-indigo-700 font-semibold text-sm mt-0.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                Aktiv modus: {roleDisplayNames[role]}
              </p>
            </div>
          </div>

          {/* KONTAKTINFORMASJON & TILHØRIGHET */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 block font-medium">E-post</span>
                <span className="text-slate-800 font-semibold truncate block">{userEmail}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <Phone className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[11px] text-slate-400 block font-medium">Telefon</span>
                {isEditingNotes ? (
                  <input 
                    type="text" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    className="w-full text-xs font-semibold text-slate-800 border-b border-indigo-400 focus:outline-none"
                  />
                ) : (
                  <span className="text-slate-800 font-semibold">{phone}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <Building className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 block font-medium">Barnehage</span>
                <span className="text-slate-800 font-semibold truncate block">Eventyrskogen Barnehage</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 block font-medium">Avdeling / Base</span>
                <span className="text-slate-800 font-semibold truncate block">Administrasjon & Ledelse</span>
              </div>
            </div>
          </div>

          {/* PERSONLIGE NOTATER & ANSVARSOMRÅDER */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Personlige notater og ansvarsområder</span>
              </div>
              <button 
                onClick={() => {
                  if (isEditingNotes) handleSaveNotes();
                  else setIsEditingNotes(true);
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                {isEditingNotes ? 'Fullfør' : 'Rediger'}
              </button>
            </div>
            
            {isEditingNotes ? (
              <div className="space-y-2 pt-1">
                <textarea 
                  rows={3}
                  value={personalNotes}
                  onChange={(e) => setPersonalNotes(e.target.value)}
                  placeholder="Skriv inn dine ansvarsområder, oppfølgingsnotater eller interne huskelapper..."
                  className="w-full text-xs p-3 rounded-xl border border-indigo-300 focus:ring-2 focus:ring-indigo-500 bg-white outline-none"
                />
                <button
                  onClick={handleSaveNotes}
                  className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 hover:bg-indigo-700 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  Lagre notat
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed italic bg-white p-3 rounded-xl border border-slate-100">
                &ldquo;{personalNotes}&rdquo;
              </p>
            )}

            {saveNotesSuccess && (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Notater lagret
              </p>
            )}
          </div>

          {/* BYTT MODUS / ROLLE (HURTIGNAVIGASJON) */}
          {canSwitch && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Bytt modus (Hurtignavigasjon)
                </h4>
                <span className="text-[11px] text-slate-500">Gå direkte til en annen rolle</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableRoles.map((r) => {
                  const isCurrent = role === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setRole(r.id);
                        onClose();
                        if (roleRoutes[r.id]) {
                          navigate(roleRoutes[r.id]);
                        }
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                        isCurrent 
                          ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-500' 
                          : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${r.color}`}></span>
                          <span className="font-bold text-xs text-slate-900">{r.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate block mt-0.5">{r.desc}</span>
                      </div>
                      {isCurrent ? (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASSORDBYTTE FORM (HVIS ÅPNET) */}
          {showPasswordChange && (
            <form onSubmit={handlePasswordSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-600" />
                  Bytt passord
                </h4>
                <button 
                  type="button" 
                  onClick={() => setShowPasswordChange(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Avbryt
                </button>
              </div>

              <div className="space-y-2">
                <input 
                  type="password"
                  placeholder="Gjeldende passord"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white outline-none focus:border-indigo-500"
                  required
                />
                <input 
                  type="password"
                  placeholder="Nytt passord (minst 6 tegn)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white outline-none focus:border-indigo-500"
                  required
                />
                <input 
                  type="password"
                  placeholder="Bekreft nytt passord"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {passwordMessage && (
                <div className={`p-2 rounded-lg text-xs font-semibold ${
                  passwordMessage.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {passwordMessage.text}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-lg transition"
              >
                Oppdater passord
              </button>
            </form>
          )}

          {/* HANDLINGSKNAPPER: OM PEDPORTALEN, BYTT PASSORD & LOGG UT */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
            <button 
              type="button"
              onClick={() => setOmPedPortalenModalOpen(true)} 
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/90 text-indigo-900 text-xs font-bold transition cursor-pointer"
            >
              <Info className="w-4 h-4 text-indigo-600" />
              Om PedPortalen & status
            </button>

            {!showPasswordChange && (
              <button 
                type="button"
                onClick={() => setShowPasswordChange(true)} 
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <Key className="w-4 h-4 text-slate-500" />
                Bytt passord
              </button>
            )}
            
            <button 
              type="button"
              onClick={handleLogout} 
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Logg ut
            </button>
          </div>

          {/* JURIDISK & PERSONVERN */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              <span>{(!isSvein && !isPortalBeta) || role === 'STUDENTN' ? 'BLU-hjelperen' : 'PedPortalen'} · v3.6.8</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setLegalTab('privacy');
                  setLegalModalOpen(true);
                }}
                className="text-slate-600 hover:text-indigo-600 hover:underline font-medium transition cursor-pointer"
              >
                Personvernerklæring
              </button>
              <span aria-hidden="true" className="opacity-40">·</span>
              <button
                type="button"
                onClick={() => {
                  setLegalTab('terms');
                  setLegalModalOpen(true);
                }}
                className="text-slate-600 hover:text-indigo-600 hover:underline font-medium transition cursor-pointer"
              >
                Brukervilkår
              </button>
            </div>
          </div>

        </div>
      </div>

      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalTab}
      />

      {/* Om PedPortalen Modal */}
      {omPedPortalenModalOpen && (
        <div className="fixed inset-0 z-[10005] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden my-auto border border-slate-100 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Om PedPortalen & Systemstatus</h3>
              </div>
              <button
                type="button"
                onClick={() => setOmPedPortalenModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <OmPedPortalenView />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
