const fs = require('fs');

let code = fs.readFileSync('src/components/tools/Samarbeidsverktoy.tsx', 'utf8');

// 1. Remove defaultDemoGroup and make groups start empty
const oldState = `  const [groups, setGroups] = useState<Group[]>([defaultDemoGroup]);
  const [activeGroupId, setActiveGroupId] = useState<string>('BACH-2026');`;

const newState = `  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('');`;

code = code.replace(oldState, newState);

// 2. Fix the checkAccess for max groups
const oldCreateBtn = `        <button 
          onClick={() => setShowCreateGroup(true)}
          className="w-full border-2 border-dashed border-primary/30 text-primary bg-primary-light/20 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-light/40 transition-colors"
        >
          <Plus className="w-5 h-5" /> Ny gruppe
        </button>`;

const newCreateBtn = `        <button 
          onClick={() => {
            if (pricingTier === 'free') {
              alert("Gratisbrukere kan kun delta i eksisterende grupper via invitasjonslenke.");
              setActiveTab('pricing');
            } else if (pricingTier === 'monthly' && groups.length >= 1) {
              alert("Premium Måned inkluderer maks 1 gruppe. Oppgrader til Semester-pakka for ubegrenset antall grupper.");
              setActiveTab('pricing');
            } else {
              setShowCreateGroup(true);
            }
          }}
          className="w-full border-2 border-dashed border-primary/30 text-primary bg-primary-light/20 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-light/40 transition-colors"
        >
          <Plus className="w-5 h-5" /> Ny gruppe
        </button>`;

code = code.replace(oldCreateBtn, newCreateBtn);

// 3. Fix the activeGroup early return
const oldEarlyReturn = `  if (!activeGroup) {
      return <div>Velg eller opprett en gruppe</div>;
  }`;

const newEarlyReturn = `  // Custom rendering when no active group exists
  if (!activeGroup) {
      return (
        <motion.div 
          key="collaboration-empty"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex-1 flex flex-col lg:flex-row gap-6 w-full"
        >
          {/* Left panel */}
          <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
            ${newCreateBtn}
          </div>
          {/* Main content */}
          <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[2rem] border border-slate-200 p-12 text-center h-[500px]">
            <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Velkommen til Basen!</h2>
            <p className="text-slate-500 mb-8 max-w-md">
              Her kan du opprette studiegrupper for å samarbeide om prosjekter, dele filer og koordinere arbeid.
            </p>
            {showCreateGroup && (
              <div className="flex gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <input 
                  type="text" 
                  value={newGroupName} 
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Navn på gruppen..."
                  className="px-4 py-2 rounded-xl text-sm border-slate-200 w-64 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button onClick={handleCreateGroup} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-primary/20">Opprett</button>
                <button onClick={() => setShowCreateGroup(false)} className="bg-slate-200 text-slate-600 px-3 py-2 rounded-xl">Avbryt</button>
              </div>
            )}
          </div>
        </motion.div>
      );
  }`;

code = code.replace(oldEarlyReturn, newEarlyReturn);


fs.writeFileSync('src/components/tools/Samarbeidsverktoy.tsx', code);
