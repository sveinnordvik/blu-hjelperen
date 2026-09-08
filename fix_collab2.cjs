const fs = require('fs');

let code = fs.readFileSync('src/components/tools/Samarbeidsverktoy.tsx', 'utf8');

const oldCheck = `  if (pricingTier !== 'semester' && pricingTier !== 'yearly' && pricingTier !== 'premium') {
    return (
      <motion.div 
        key="collaboration"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto my-12"
      >
        <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center mb-6">
          <Users className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-4">Basen er inkludert i Semester-pakka</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          Tilgang til å opprette egne studiegrupper i Basen er en del av Semester-pakka og Premium Måned. Oppgrader for å samarbeide effektivt med kollokviegruppen din! ✨
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <button 
            onClick={() => setActiveTab('pricing')}
            className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" /> Se prisplaner
          </button>
          <button 
            onClick={() => setActiveTab('home')}
            className="flex-1 bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-100 transition-all"
          >
            Tilbake til oversikt
          </button>
        </div>
      </motion.div>
    );
  }`;

const newCheck = ``;

code = code.replace(oldCheck, newCheck);

fs.writeFileSync('src/components/tools/Samarbeidsverktoy.tsx', code);
