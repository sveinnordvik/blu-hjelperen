import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { auth, onAuthStateChanged } from './firebase';
import { isUnlimitedUser, isAdminUser, isPortalBetaUser, hasBluAccess } from './config/accessConfig';
import { RoleProvider, useRole, Role } from './context/RoleContext';

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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  if (role === 'STYRERN' || !canSwitch) return null;

  const roleNames: Record<Role, string> = {
    STYRERN: 'Styrer',
    PEDLEDERN: 'Pedagogisk leder',
    FAGARBEIDERN: 'Fagarbeider',
    ASSISTENTN: 'Assistent',
    VIKARN: 'Vikar',
    STUDENTN: 'Student (BLU-hjelperen)'
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
            onClick={() => setRole('STYRERN')} 
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

  // Når brukeren har svitsjet til en annen rolle enn STYRERN
  if (canSwitch && role !== 'STYRERN') {
    return (
      <div className="min-h-screen pt-11">
        <ModeBanner />
        {renderActiveApp()}
      </div>
    );
  }

  // Standard Styrer-visning og ruting
  return (
    <>
      <Routes>
        <Route path="/" element={<StyrernApp />} />
        <Route path="/styrer" element={<StyrernApp />} />
        <Route path="/pedleder" element={<PedledernApp />} />
        <Route path="/fagarbeider" element={<FagarbeidernApp />} />
        <Route path="/assistent" element={<AssistentnApp />} />
        <Route path="/vikar" element={<VikarnApp />} />
        <Route path="/blu-hjelperen" element={hasBluAccess ? <StudentnApp /> : <Navigate to="/styrer" replace />} />
        <Route path="/student" element={hasBluAccess ? <StudentnApp /> : <Navigate to="/styrer" replace />} />
        <Route path="/dashbord" element={hasBluAccess ? <StudentnApp /> : <Navigate to="/styrer" replace />} />
        <Route path="/tiltaksplan" element={<div className="min-h-screen bg-slate-50 p-4 md:p-8 pt-10"><TiltaksplanBygger /></div>} />
        <Route path="/portal" element={<PedPortalenForside isSvein={canSwitch} />} />
        <Route path="/portalen" element={<PedPortalenForside isSvein={canSwitch} />} />
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
    </RoleProvider>
  );
};

export default App;
