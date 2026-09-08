const fs = require('fs');

let code = fs.readFileSync('src/components/tools/SensorTool.tsx', 'utf8');

const oldCheckBtn = `              <button 
                onClick={handlePlagiarismCheck}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary-hover shadow-lg shadow-primary-light transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-5 h-5" /> Kjør integritetssjekk nå
              </button>`;

const newCheckBtn = `              <button 
                onClick={handlePlagiarismCheck}
                disabled={!(pricingTier === 'semester' || pricingTier === 'preview' || pricingTier === 'yearly')}
                className={pricingTier === 'semester' || pricingTier === 'preview' || pricingTier === 'yearly'
                  ? "w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                  : "w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black transition-all flex items-center justify-center gap-2 cursor-not-allowed"}
              >
                {pricingTier === 'semester' || pricingTier === 'preview' || pricingTier === 'yearly' ? (
                  <><ShieldCheck className="w-5 h-5" /> Kjør integritetssjekk nå</>
                ) : (
                  <><Lock className="w-5 h-5" /> 🔒 Krever Semester-pakka</>
                )}
              </button>`;

code = code.replace(oldCheckBtn, newCheckBtn);

fs.writeFileSync('src/components/tools/SensorTool.tsx', code);
