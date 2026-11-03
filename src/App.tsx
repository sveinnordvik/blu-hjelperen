import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { auth, onAuthStateChanged, signInWithPopup, googleProvider, signInWithEmailAndPassword } from './firebase';
import { isUnlimitedUser, isAdminUser, isPortalBetaUser, hasBluAccess } from './config/accessConfig';
import { RoleProvider, useRole, Role } from './context/RoleContext';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, X } from 'lucide-react';

// Global Auth Modal implementation
const AuthModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (error: any) {
      console.error("Login Error:", error);
      alert("Feil ved innlogging: " + error.message);
    }
  };

  const handleEmailLogin = async () => {
    if (!loginEmail || !loginPassword) {
      alert("Vennligst fyll inn både e-post og passord.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      onClose();
    } catch (error: any) {
      console.error("Email Login Error:", error);
      alert("Feil ved innlogging: " + error.message);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary p-2 rounded-xl">
                    <Lock className="text-white w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900">Velkommen</h2>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <button 
                  onClick={handleLogin}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:border-primary/20 hover:bg-slate-50 transition-all group"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  Fortsett med Google
                </button>

                <div className="space-y-4">
                  <input 
                    type="email" 
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="E-post"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  <input 
                    type="password" 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Passord"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  <button 
                    onClick={handleEmailLogin}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                  >
                    Logg inn
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// -- 1. IMPORT AV DAGENS APP (Studentn / BLU-hjelperen) --
import StudentnApp from './components/student/StudentnApp'; 
import PedPortalenForside from './components/portalen/PedPortalenForside';

// -- 2. IMPORT AV DE NYE "PORTALEN"-APPENE --
import StyrernApp from './components/portalen/StyrernApp';
import PedledernApp from './components/portalen/PedledernApp';
import FagarbeidernApp from './components/portalen/FagarbeidernApp';
import AssistentnApp from './components/portalen/AssistentnApp';
import VikarnApp from './components/portalen/VikarnApp';
import TiltaksplanBygger from './components/portalen/TiltaksplanBygger';
import UserProfileModal from './components/common/UserProfileModal';

const ModeBanner = () => {
  const { role, setRole, canSwitch } = useRole();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  if (role === 'STYRERN' || !canSwitch) return null;

  const roleNames: Record<Role, string> = {
    STYRERN: 'Styrer',
    PEDLEDERN: 'Pedagogisk leder',
    FAGARBEIDERN: 'Fagarbeider',
    ASSISTENTN: 'Assistent',
    VIKARN: 'Vikar',
    STUDENTN: 'Student (BLU-hjelperen)',
    GUEST: 'Gjest'
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bg-slate-900 text-white px-4 py-2.5 text-xs sm:text-sm font-medium z-[9999] shadow-lg border-b border-indigo-500/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-200">
            Aktiv visning: <strong className="text-white font-bold">{roleNames[role]}</strong>
          </span>
          <span className="hidden md:inline text-slate-400 text-xs">
            (Trykk profil-badge øverst til høyre eller velg under for å bytte modus)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            title="Åpne profil og bytt modus"
          >
            <span>Bytt rolle</span>
          </button>
          <button 
            type="button"
            onClick={() => {
              setRole('STYRERN');
              navigate('/styrer');
            }} 
            className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Gå direkte tilbake til Styrern"
          >
            <span>Gå tilbake til Styrern</span>
            <span>➜</span>
          </button>
        </div>
      </div>
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
};

const MainApp = () => {
  const { role, canSwitch, hasBluAccess } = useRole();

  const renderActiveApp = () => {
    switch (role) {
      case 'STUDENTN': return hasBluAccess ? <StudentnApp /> : <StyrernApp />;
      case 'PEDLEDERN': return <PedledernApp />;
      case 'FAGARBEIDERN': return <FagarbeidernApp />;
      case 'ASSISTENTN': return <AssistentnApp />;
      case 'VIKARN': return <VikarnApp />;
      case 'STYRERN': return <StyrernApp />;
      default: return <StyrernApp />;
    }
  };

  // Når brukeren har byttet til en annen rolle enn STYRERN
  if (canSwitch && role && role !== 'STYRERN') {
    return (
      <div className="min-h-screen pt-11">
        <ModeBanner />
        {renderActiveApp()}
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<PedPortalenForside />} />
        <Route path="/portal" element={<PedPortalenForside />} />
        <Route path="/portalen" element={<PedPortalenForside />} />
        <Route path="/styrer" element={<StyrernApp />} />
        <Route path="/pedleder" element={<PedledernApp />} />
        <Route path="/fagarbeider" element={<FagarbeidernApp />} />
        <Route path="/assistent" element={<AssistentnApp />} />
        <Route path="/vikar" element={<VikarnApp />} />
        <Route path="/blu-hjelperen" element={hasBluAccess ? <StudentnApp /> : <Navigate to="/styrer" replace />} />
        <Route path="/student" element={hasBluAccess ? <StudentnApp /> : <Navigate to="/styrer" replace />} />
        <Route path="/dashbord" element={hasBluAccess ? <StudentnApp /> : <Navigate to="/styrer" replace />} />
        <Route path="/tiltaksplan" element={<div className="min-h-screen bg-slate-50 p-4 md:p-8 pt-10"><TiltaksplanBygger /></div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

const App = () => {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(() => {
    return auth.currentUser?.email || null;
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserEmail(user?.email || null);
    });
    return () => unsubscribe();
  }, []);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const handleOpenAuth = () => setIsAuthModalOpen(true);
    window.addEventListener('openAuthModal', handleOpenAuth);
    return () => window.removeEventListener('openAuthModal', handleOpenAuth);
  }, []);

  const isSvein = currentUserEmail?.toLowerCase() === 'svein.nordvik@gmail.com' || 
                  currentUserEmail?.toLowerCase() === 'sunniva.nordvik2@gmail.com' || 
                  isAdminUser(currentUserEmail);

  const isPortalBeta = isPortalBetaUser(currentUserEmail);
  const bluAccess = hasBluAccess(currentUserEmail);

  // Alle ledere / testbrukere i Portalen har tilgang til å bytte modus
  const canSwitchMode = true;

  return (
    <RoleProvider 
      canSwitch={canSwitchMode} 
      isSvein={isSvein} 
      isPortalBeta={isPortalBeta}
      hasBluAccess={bluAccess}
      currentUserEmail={currentUserEmail}
    >
      <MainApp />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </RoleProvider>
  );
};

export default App;
