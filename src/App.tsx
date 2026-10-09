import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { auth, onAuthStateChanged } from './firebase';
import { isAdminUser } from './config/accessConfig';

// -- 1. IMPORT AV DAGENS APP (Studentn / BLU-hjelperen) --
// Dette er koden du allerede har bygget, som vi lar være i fred.
import StudentnApp from './components/student/StudentnApp'; 
import PedPortalenForside from './components/portalen/PedPortalenForside';

// -- 2. IMPORT AV DE NYE "PORTALEN"-APPENE (Under utvikling) --
// Her henter vi inn de nye grensesnittene du skal bygge.
import StyrernApp from './components/portalen/StyrernApp';
import PedledernApp from './components/portalen/PedledernApp';
import FagarbeidernApp from './components/portalen/FagarbeidernApp';
import AssistentnApp from './components/portalen/AssistentnApp';
import VikarnApp from './components/portalen/VikarnApp';
import MorgenPulsen from './components/portalen/MorgenPulsen';
import DenSokratiskePlanleggeren from './components/portalen/DenSokratiskePlanleggeren';
import DidaktiskPlanlegger from './components/DidaktiskPlanlegger';
import Lederstotte from './components/portalen/Lederstotte';
import Observasjoner from './components/portalen/Observasjoner';

// =====================================================================
// 🛑 TILGANGSKONTROLL FOR UTVIKLERMENY (KUN FOR SVEIN) 🛑
// =====================================================================
// På blu-hjelperen.no og for alle vanlige brukere skal INGEN se denne boksen.
// Alle andre lander direkte i Studentn (BLU-hjelperen).
const isSveinUser = (email?: string | null): boolean => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized === 'svein.nordvik@gmail.com' || isAdminUser(normalized);
};

const checkSveinAccess = (userEmail?: string | null): boolean => {
  if (typeof window === 'undefined') return false;

  // 1. Er brukeren logget inn som Svein (eller admin)?
  if (isSveinUser(userEmail)) return true;

  // 2. Har Svein aktivert utviklermodus via URL-parameter i denne sesjonen? (f.eks. ?svein=true eller ?dev=svein)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('svein') === 'true' || params.get('dev') === 'svein') {
      sessionStorage.setItem('blu_svein_dev_session', 'true');
      return true;
    }
    if (sessionStorage.getItem('blu_svein_dev_session') === 'true') {
      return true;
    }
  } catch {}

  // 3. For ALLE andre: Boksen nede til høyre skal ALDRI vises!
  return false;
};

// Standard-modus er alltid "LIVE" slik at ekte brukere alltid rutes til StudentnApp
const PREVIEW_MODE = "LIVE";

// Liten interaktiv utvikler-meny for enkel testing mellom portalene i AI Studio (KUN FOR SVEIN)
const DevRoleBar: React.FC<{ current: string; onSelect: (role: string) => void }> = ({ current, onSelect }) => {
  const [collapsed, setCollapsed] = useState(false);

  const roles = [
    { id: 'LIVE', label: "Forside (Portal)", bg: 'bg-blue-600' },
    { id: 'STUDENTN', label: "BLU-hjelperen (Student)", bg: 'bg-indigo-600' },
    { id: 'PEDLEDERN', label: "Pedleder'n", bg: 'bg-teal-600' },
    { id: 'STYRERN', label: "Styrer'n", bg: 'bg-indigo-600' },
    { id: 'OBSERVASJONER', label: "Observasjoner 📝", bg: 'bg-emerald-600' },
    { id: 'LEDERSTOTTE', label: "Lederstøtte 🧠", bg: 'bg-emerald-700' },
    { id: 'DIDAKTISK', label: "Didaktisk Planlegger 📅", bg: 'bg-emerald-600' },
    { id: 'SOKRATISK', label: "Sokratisk Planlegger ✨", bg: 'bg-amber-600' },
    { id: 'MORGENPULSEN', label: "Morgen-pulsen ☀️", bg: 'bg-amber-600' },
    { id: 'FAGARBEIDERN', label: "Fagarbeider'n", bg: 'bg-amber-700' },
    { id: 'ASSISTENTN', label: "Assistent'n", bg: 'bg-sky-600' },
    { id: 'VIKARN', label: "Vikar'n", bg: 'bg-emerald-600' }
  ];

  return (
    <aside 
      aria-label="Utviklermodus forhåndsvisning"
      className="fixed bottom-3 right-3 z-50 flex flex-col items-end gap-1.5 font-sans pointer-events-auto"
    >
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="bg-slate-900/95 hover:bg-slate-900 text-white text-[11px] font-bold px-3 py-2 rounded-full shadow-2xl border border-slate-700 flex items-center gap-1.5 transition"
        >
          <span>🛠️ Bytt rolle ({current})</span>
        </button>
      ) : (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-2.5 rounded-2xl shadow-2xl border border-slate-700 flex flex-col gap-2 max-w-xs">
          <div className="flex items-center justify-between gap-3 px-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              🛠️ Sveins Test-meny
            </span>
            <button
              onClick={() => setCollapsed(true)}
              className="text-[10px] text-slate-400 hover:text-white px-1"
            >
              Skjul
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {roles.map(r => (
              <button
                key={r.id}
                onClick={() => onSelect(r.id)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition ${
                  current === r.id 
                    ? `${r.bg} text-white shadow-md ring-2 ring-white/30` 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
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

  const canViewDevRoleBar = checkSveinAccess(currentUserEmail);

  // Tillater raskt bytte direkte i preview for Svein
  const [activePreview, setActivePreview] = useState<string>(() => {
    try {
      return sessionStorage.getItem('blu_active_preview_role') || PREVIEW_MODE;
    } catch {
      return PREVIEW_MODE;
    }
  });

  const handleSelectRole = (role: string) => {
    setActivePreview(role);
    try {
      sessionStorage.setItem('blu_active_preview_role', role);
    } catch {}
  };

  // Hvis brukeren IKKE er Svein, overstyr ALLTID til "LIVE" (som ruter direkte til StudentnApp)
  const effectivePreview = canViewDevRoleBar ? activePreview : "LIVE";

  // -- SVEINS OVERSTYRINGER UNDER UTVIKLING --
  if (canViewDevRoleBar && effectivePreview === "STYRERN") {
    return (
      <>
        <StyrernApp />
        <DevRoleBar current={activePreview} onSelect={handleSelectRole} />
      </>
    );
  }
  if (canViewDevRoleBar && effectivePreview === "PEDLEDERN") {
    return (
      <>
        <PedledernApp />
        <DevRoleBar current={activePreview} onSelect={handleSelectRole} />
      </>
    );
  }
  if (canViewDevRoleBar && effectivePreview === "OBSERVASJONER") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-start items-center p-4 md:p-8 pt-12 font-sans text-slate-800">
        <Observasjoner />
        <DevRoleBar current={activePreview} onSelect={handleSelectRole} />
      </div>
    );
  }
  if (canViewDevRoleBar && effectivePreview === "LEDERSTOTTE") {
    return (
      <>
        <Lederstotte />
        <DevRoleBar current={activePreview} onSelect={handleSelectRole} />
      </>
    );
  }
  if (canViewDevRoleBar && effectivePreview === "DIDAKTISK") {
    return (
      <>
        <DidaktiskPlanlegger avdelingNavn="Blåbærtua" />
        <DevRoleBar current={activePreview} onSelect={handleSelectRole} />
      </>
    );
  }
  if (canViewDevRoleBar && effectivePreview === "SOKRATISK") {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <DenSokratiskePlanleggeren avdelingNavn="Blåbærtua" />
        </div>
        <DevRoleBar current={activePreview} onSelect={handleSelectRole} />
      </div>
    );
  }
  if (canViewDevRoleBar && effectivePreview === "MORGENPULSEN") {
    return (
      <>
        <MorgenPulsen />
        <DevRoleBar current={activePreview} onSelect={handleSelectRole} />
      </>
    );
  }
  if (canViewDevRoleBar && effectivePreview === "FAGARBEIDERN") {
    return (
      <>
        <FagarbeidernApp />
        <DevRoleBar current={activePreview} onSelect={handleSelectRole} />
      </>
    );
  }
  if (canViewDevRoleBar && effectivePreview === "ASSISTENTN") {
    return (
      <>
        <AssistentnApp />
        <DevRoleBar current={activePreview} onSelect={handleSelectRole} />
      </>
    );
  }
  if (canViewDevRoleBar && effectivePreview === "VIKARN") {
    return (
      <>
        <VikarnApp />
        <DevRoleBar current={activePreview} onSelect={handleSelectRole} />
      </>
    );
  }
  if (canViewDevRoleBar && effectivePreview === "STUDENTN") {
    return (
      <>
        <StudentnApp />
        <DevRoleBar current={activePreview} onSelect={handleSelectRole} />
      </>
    );
  }

  // -- HOVEDRUTING --
  return (
    <>
      <Routes>
        {/* Hovedadressen ( / ) møter nå brukerne med den nye forside-teaseren (både på blu-hjelperen.no og ellers) */}
        <Route 
          path="/" 
          element={<PedPortalenForside isSvein={canViewDevRoleBar} />} 
        />

        {/* Selve BLU-hjelperen (Studentn) */}
        <Route path="/blu-hjelperen" element={<StudentnApp />} />
        <Route path="/student" element={<StudentnApp />} />
        <Route path="/dashbord" element={<StudentnApp />} />

        {/* Fellessiden på PedPortalen */}
        <Route path="/portal" element={<PedPortalenForside isSvein={canViewDevRoleBar} />} />
        <Route path="/portalen" element={<PedPortalenForside isSvein={canViewDevRoleBar} />} />

        {/* Andre apper i økosystemet (STRENGT LÅST KUN FOR SVEIN) */}
        <Route path="/pedleder" element={canViewDevRoleBar ? <PedledernApp /> : <Navigate to="/blu-hjelperen" replace />} />
        <Route path="/pedledern" element={canViewDevRoleBar ? <PedledernApp /> : <Navigate to="/blu-hjelperen" replace />} />
        <Route path="/styrer" element={canViewDevRoleBar ? <StyrernApp /> : <Navigate to="/blu-hjelperen" replace />} />
        <Route path="/styrern" element={canViewDevRoleBar ? <StyrernApp /> : <Navigate to="/blu-hjelperen" replace />} />
        <Route path="/fagarbeider" element={canViewDevRoleBar ? <FagarbeidernApp /> : <Navigate to="/blu-hjelperen" replace />} />
        <Route path="/fagarbeidern" element={canViewDevRoleBar ? <FagarbeidernApp /> : <Navigate to="/blu-hjelperen" replace />} />
        <Route path="/assistent" element={canViewDevRoleBar ? <AssistentnApp /> : <Navigate to="/blu-hjelperen" replace />} />
        <Route path="/assistentn" element={canViewDevRoleBar ? <AssistentnApp /> : <Navigate to="/blu-hjelperen" replace />} />
        <Route path="/vikar" element={canViewDevRoleBar ? <VikarnApp /> : <Navigate to="/blu-hjelperen" replace />} />
        <Route path="/vikarn" element={canViewDevRoleBar ? <VikarnApp /> : <Navigate to="/blu-hjelperen" replace />} />

        {/* Lab-stiene (STRENGT LÅST KUN FOR SVEIN) */}
        <Route path="/portalen-lab/styrer" element={canViewDevRoleBar ? <StyrernApp /> : <Navigate to="/blu-hjelperen" replace />} />
        <Route path="/portalen-lab/pedleder" element={canViewDevRoleBar ? <PedledernApp /> : <Navigate to="/blu-hjelperen" replace />} />
        <Route path="/portalen-lab/fagarbeider" element={canViewDevRoleBar ? <FagarbeidernApp /> : <Navigate to="/blu-hjelperen" replace />} />
        <Route path="/portalen-lab/assistent" element={canViewDevRoleBar ? <AssistentnApp /> : <Navigate to="/blu-hjelperen" replace />} />
        <Route path="/portalen-lab/vikar" element={canViewDevRoleBar ? <VikarnApp /> : <Navigate to="/blu-hjelperen" replace />} />

        {/* Sikkerhetsnett */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {canViewDevRoleBar && (
        <DevRoleBar current={activePreview} onSelect={handleSelectRole} />
      )}
    </>
  );
};

export default App;
