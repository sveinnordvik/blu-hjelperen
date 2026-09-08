const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldStructureBtn = `                    <button 
                      onClick={handleAnalyzeStructure}
                      disabled={!structureInput.trim() || isAnalyzingStructure || isGuest}
                      className={cn(
                        "mt-4 w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50",
                        (isAnalyzingStructure || isGuest) ? "bg-slate-100 text-slate-400" : "bg-cta text-white hover:bg-cta-hover shadow-lg shadow-cta/20"
                      )}
                    >
                      {isAnalyzingStructure ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Analyserer struktur...</>
                      ) : (
                        <>{isGuest ? '🔒 Logg inn for å bruke' : <><Sparkles className="w-4 h-4" /> Analyser med Gemini Pro</>}</>
                      )}
                    </button>`;

const newStructureBtn = `                    <button 
                      onClick={handleAnalyzeStructure}
                      disabled={!structureInput.trim() || isAnalyzingStructure || isGuest}
                      className={cn(
                        "mt-4 w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50",
                        (isAnalyzingStructure || isGuest) ? "bg-slate-100 text-slate-400" : 
                        (pricingTier === 'semester' || pricingTier === 'preview' || pricingTier === 'yearly') ? "bg-cta text-white hover:bg-cta-hover shadow-lg shadow-cta/20" :
                        "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                      )}
                    >
                      {isAnalyzingStructure ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Analyserer struktur...</>
                      ) : isGuest ? (
                        <>🔒 Logg inn for å bruke</>
                      ) : (pricingTier === 'semester' || pricingTier === 'preview' || pricingTier === 'yearly') ? (
                        <><Sparkles className="w-4 h-4" /> Analyser med Gemini Pro</>
                      ) : (
                        <>Kjør enkel analyse</>
                      )}
                    </button>`;

code = code.replace(oldStructureBtn, newStructureBtn);

fs.writeFileSync('src/App.tsx', code);
