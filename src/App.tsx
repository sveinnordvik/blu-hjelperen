import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// -- 1. IMPORT AV DAGENS APP (Studentn / BLU-hjelperen) --
// Dette er koden du allerede har bygget, som vi lar være i fred.
import StudentnApp from './components/student/StudentnApp'; 

// -- 2. IMPORT AV DE NYE "PORTALEN"-APPENE (Under utvikling) --
// Her henter vi inn de nye grensesnittene du skal bygge.
import StyrernApp from './components/portalen/StyrernApp';
import PedledernApp from './components/portalen/PedledernApp';
import FagarbeidernApp from './components/portalen/FagarbeidernApp';
import AssistentnApp from './components/portalen/AssistentnApp';
import VikarnApp from './components/portalen/VikarnApp';

// =====================================================================
// 🛑 UTVIKLER-BRYTER FOR AI STUDIO / EMERGENT 🛑
// =====================================================================
// Sett denne til "LIVE" når appen publiseres for ekte brukere.
// Når du utvikler, endrer du bare teksten under til rollen du vil se!
//
// Valg: "LIVE" | "STYRERN" | "PEDLEDERN" | "FAGARBEIDERN" | 
//       "ASSISTENTN" | "VIKARN" | "STUDENTN"
//
const PREVIEW_MODE = "PEDLEDERN"; // <-- Bytt denne når du jobber!
// =====================================================================

// Liten interaktiv utvikler-meny for enkel testing mellom portalene i AI Studio
const DevRoleBar: React.FC<{ current: string; onSelect: (role: string) => void }> = ({ current, onSelect }) => {
  const [collapsed, setCollapsed] = useState(false);

  const roles = [
    { id: 'STYRERN', label: "Styrer'n", bg: 'bg-indigo-600' },
    { id: 'PEDLEDERN', label: "Pedleder'n", bg: 'bg-teal-600' },
    { id: 'FAGARBEIDERN', label: "Fagarbeider'n", bg: 'bg-amber-600' },
    { id: 'ASSISTENTN', label: "Assistent'n", bg: 'bg-sky-600' },
    { id: 'VIKARN', label: "Vikar'n", bg: 'bg-emerald-600' },
    { id: 'STUDENTN', label: "Student'n (BLU)", bg: 'bg-blue-600' },
    { id: 'LIVE', label: "Live Ruter", bg: 'bg-slate-700' }
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
              🛠️ Portalen Test-meny
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
  // Tillater raskt bytte direkte i preview uten å måtte recompilere,
  // samtidig som PREVIEW_MODE fra koden bestemmer utgangspunktet!
  const [activePreview, setActivePreview] = useState(PREVIEW_MODE);

  // -- AI STUDIO OVERSTYRING --
  // Denne delen gjør at forhåndsvisningen i AI Studio/Emergent ignorerer 
  // nettadressen fullstendig og BARE viser det du har valgt i PREVIEW_MODE.
  if (activePreview === "STYRERN") {
    return (
      <>
        <StyrernApp />
        <DevRoleBar current={activePreview} onSelect={setActivePreview} />
      </>
    );
  }
  if (activePreview === "PEDLEDERN") {
    return (
      <>
        <PedledernApp />
        <DevRoleBar current={activePreview} onSelect={setActivePreview} />
      </>
    );
  }
  if (activePreview === "FAGARBEIDERN") {
    return (
      <>
        <FagarbeidernApp />
        <DevRoleBar current={activePreview} onSelect={setActivePreview} />
      </>
    );
  }
  if (activePreview === "ASSISTENTN") {
    return (
      <>
        <AssistentnApp />
        <DevRoleBar current={activePreview} onSelect={setActivePreview} />
      </>
    );
  }
  if (activePreview === "VIKARN") {
    return (
      <>
        <VikarnApp />
        <DevRoleBar current={activePreview} onSelect={setActivePreview} />
      </>
    );
  }
  if (activePreview === "STUDENTN") {
    return (
      <>
        <StudentnApp />
        <DevRoleBar current={activePreview} onSelect={setActivePreview} />
      </>
    );
  }

  // -- HOVEDRUTING (Når PREVIEW_MODE er "LIVE") --
  // Dette er slik appen fungerer på nett (f.eks på pedportalen.no)
  return (
    <>
      <Routes>
        {/* ======================================================= */}
        {/* DEN OFFENTLIGE STIEN (Dagens BLU-hjelperen uforandret)  */}
        {/* ======================================================= */}
        <Route path="/" element={<StudentnApp />} />
        <Route path="/dashbord" element={<StudentnApp />} />
        
        {/* ======================================================= */}
        {/* DE HEMMELIGE "PORTALEN"-STIENE (Låst for alle andre)    */}
        {/* ======================================================= */}
        {/* Disse kan du skrive inn i nettleseren for å teste live. */}
        <Route path="/portalen-lab/styrer" element={<StyrernApp />} />
        <Route path="/portalen-lab/pedleder" element={<PedledernApp />} />
        <Route path="/portalen-lab/fagarbeider" element={<FagarbeidernApp />} />
        <Route path="/portalen-lab/assistent" element={<AssistentnApp />} />
        <Route path="/portalen-lab/vikar" element={<VikarnApp />} />

        {/* ======================================================= */}
        {/* SIKKERHETSNETT:                                         */}
        {/* Hvis noen taster feil adresse, sendes de til startsiden.*/}
        {/* ======================================================= */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <DevRoleBar current={activePreview} onSelect={setActivePreview} />
    </>
  );
};

export default App;
