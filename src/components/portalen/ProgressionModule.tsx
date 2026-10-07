import React, { useState, useEffect } from 'react';
import { GitMerge, Plus, Sparkles, Info, Trash2, CheckCircle, RefreshCw } from 'lucide-react';

export interface MatrixGroup {
  id: string;
  name: string;
  color: 'emerald' | 'amber' | 'indigo' | 'sky';
  text: string;
}

export interface ProgressionMatrixData {
  id: string;
  theme: string;
  groups: MatrixGroup[];
}

interface ProgressionModuleProps {
  monthPlans?: Record<string, any>;
  onNavigate?: (tab: string) => void;
}

export default function ProgressionModule({ monthPlans }: ProgressionModuleProps) {
  const [matrices, setMatrices] = useState<ProgressionMatrixData[]>(() => {
    const saved = localStorage.getItem('barnehage_progresjonsplaner_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Initial oppstart hvis tom state
  useEffect(() => {
    if (matrices.length === 0 && !localStorage.getItem('barnehage_progresjonsplaner_v2_initialized')) {
      localStorage.setItem('barnehage_progresjonsplaner_v2_initialized', 'true');
      loadDefaultOrExtractedMatrices();
    }
  }, []);

  // Lagre i localStorage
  useEffect(() => {
    localStorage.setItem('barnehage_progresjonsplaner_v2', JSON.stringify(matrices));
  }, [matrices]);

  const loadDefaultOrExtractedMatrices = () => {
    setIsGenerating(true);

    // Hent fagområder/emner fra månedene i årshjulet hvis tilgjengelig
    const extractedThemes = new Set<string>();
    if (monthPlans) {
      Object.values(monthPlans).forEach((plan: any) => {
        if (plan?.rammeplanRefs && Array.isArray(plan.rammeplanRefs)) {
          plan.rammeplanRefs.forEach((ref: string) => extractedThemes.add(ref));
        }
        if (plan?.primaryFagomrader && Array.isArray(plan.primaryFagomrader)) {
          plan.primaryFagomrader.forEach((ref: string) => extractedThemes.add(ref));
        }
      });
    }

    const defaultThemes = [
      "Språkutvikling og Kommunikasjon",
      "Natur, Bærekraft og Friluftsliv",
      "Kropp, bevegelse, mat og helse",
      "Etikk, religion og filosofi"
    ];

    const themesToUse = extractedThemes.size > 0 ? Array.from(extractedThemes) : defaultThemes;

    setTimeout(() => {
      const initialMatrices: ProgressionMatrixData[] = themesToUse.map((theme, index) => ({
        id: `matrix-${index}-${Date.now()}`,
        theme: theme,
        groups: [
          { 
            id: 'g1', 
            name: 'Småbarn (1-3 år)', 
            color: 'emerald', 
            text: index === 0 ? 'Mye bruk av pekebøker, konkreter og sang. Benevne det vi gjør i hverdagsrutinene. Sette ord på barnas følelser.' : 'Sanseopplevelser i trygge rammer. Mye veiledet utforskning og lek i lavt tempo.'
          },
          { 
            id: 'g2', 
            name: 'Storbarn (3-5 år)', 
            color: 'amber', 
            text: index === 0 ? 'Lese lengre fortellinger og eventyr. Samtaler rundt leirbålet. Leke med rim, regler og stavelser.' : 'Undre seg sammen i større grupper. Oppmuntre til barnas egne hypoteser og løsninger.'
          },
          { 
            id: 'g3', 
            name: 'Førskoleklubb (5-6 år)', 
            color: 'indigo', 
            text: index === 0 ? 'Bokstavlek, skrive egne navn og enkle ord. Gjenfortelling og dramatisering. Dialogiske samlinger.' : 'Mestringsoppgaver for skolestart. Mer selvstendig ansvar, prosjektarbeid og problemløsning.'
          }
        ]
      }));
      setMatrices(initialMatrices);
      setIsGenerating(false);
    }, 1200);
  };

  const addCustomGroup = (matrixId: string) => {
    setMatrices(prev => prev.map(m => {
      if (m.id === matrixId) {
        const colors: ('emerald' | 'amber' | 'indigo' | 'sky')[] = ['emerald', 'amber', 'indigo', 'sky'];
        const color = colors[m.groups.length % colors.length];
        return {
          ...m,
          groups: [...m.groups, { id: `custom-${Date.now()}`, name: 'Ny undergruppe / Spesialgruppe', color, text: '' }]
        };
      }
      return m;
    }));
  };

  const removeGroup = (matrixId: string, groupId: string) => {
    setMatrices(prev => prev.map(m => {
      if (m.id === matrixId) {
        return { ...m, groups: m.groups.filter(g => g.id !== groupId) };
      }
      return m;
    }));
  };

  const updateMatrixTheme = (matrixId: string, newTheme: string) => {
    setMatrices(prev => prev.map(m => m.id === matrixId ? { ...m, theme: newTheme } : m));
  };

  const updateGroupName = (matrixId: string, groupId: string, newName: string) => {
    setMatrices(prev => prev.map(m => {
      if (m.id === matrixId) {
        return {
          ...m,
          groups: m.groups.map(g => g.id === groupId ? { ...g, name: newName } : g)
        };
      }
      return m;
    }));
  };

  const updateGroupText = (matrixId: string, groupId: string, newText: string) => {
    setMatrices(prev => prev.map(m => {
      if (m.id === matrixId) {
        return {
          ...m,
          groups: m.groups.map(g => g.id === groupId ? { ...g, text: newText } : g)
        };
      }
      return m;
    }));
  };

  const addMatrix = () => {
    const newMatrix: ProgressionMatrixData = {
      id: `matrix-${Date.now()}`,
      theme: 'Nytt satsingsområde / Rammeplantema',
      groups: [
        { id: `g1-${Date.now()}`, name: 'Småbarn (1-3 år)', color: 'emerald', text: '' },
        { id: `g2-${Date.now()}`, name: 'Storbarn (3-5 år)', color: 'amber', text: '' },
        { id: `g3-${Date.now()}`, name: 'Førskoleklubb (5-6 år)', color: 'indigo', text: '' }
      ]
    };
    setMatrices(prev => [...prev, newMatrix]);
  };

  const deleteMatrix = (matrixId: string) => {
    setMatrices(prev => prev.filter(m => m.id !== matrixId));
    setConfirmDeleteId(null);
  };

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse bg-white rounded-xl border border-slate-200 shadow-sm my-4">
        <Sparkles className="text-indigo-500 w-12 h-12 mb-4 animate-spin" />
        <h3 className="text-lg font-bold text-[#1e1b4b]">Analyserer Pedagogisk Årshjul...</h3>
        <p className="text-slate-500 text-sm mt-2">Autogenererer progresjonsmatriser basert på valgte fagområder i årsplanen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header & Forklaring */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <GitMerge className="text-indigo-600" size={24} />
            <span>Didaktisk Progresjon</span>
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Systemet har kartlagt {matrices.length} unike satsingsområder i årshjulet ditt. Definer forventet progresjon mellom aldersgruppene.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={addMatrix}
            className="px-4 py-2 bg-[#1e1b4b] hover:bg-indigo-900 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={16} />
            <span>Legg til matrise</span>
          </button>

          <button
            type="button"
            onClick={loadDefaultOrExtractedMatrices}
            className="px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold border border-indigo-200 transition flex items-center gap-1.5 cursor-pointer"
            title="Søk i Årshjulet på nytt for fagområder"
          >
            <RefreshCw size={14} />
            <span>Re-analyser Årshjul</span>
          </button>

          <div className="flex items-start gap-2 bg-indigo-50 p-3 rounded-lg border border-indigo-100 max-w-xs">
            <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-800 leading-relaxed">
              Dataene herfra sendes direkte til <strong>Pedledern</strong>, slik at personalet alltid har aldersriktige mål foran seg når de planlegger uken.
            </p>
          </div>
        </div>
      </div>

      {/* TRINN 2: Det visuelle grensesnittet (Side-om-side-matrisen) */}
      <div className="space-y-6">
        {matrices.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
            <GitMerge className="w-12 h-12 text-indigo-400 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">Ingen progresjonsmatriser ennå</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Opprett en ny matrise manuelt eller re-analyser årshjulet for å hente fagområder automatisk.
            </p>
            <button
              onClick={addMatrix}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition"
            >
              + Opprett første matrise
            </button>
          </div>
        ) : (
          matrices.map((matrix) => (
            <div key={matrix.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              
              {/* Matrise Header */}
              <div className="bg-slate-50/90 border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <input 
                  type="text" 
                  value={matrix.theme}
                  onChange={(e) => updateMatrixTheme(matrix.id, e.target.value)}
                  className="text-lg font-extrabold text-slate-800 bg-transparent border-none focus:ring-0 w-full outline-none font-sans"
                  placeholder="Tittel på satsingsområde / fagområde..."
                />
                
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => addCustomGroup(matrix.id)}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold border border-indigo-200 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Legg til undergruppe</span>
                  </button>
                  {confirmDeleteId === matrix.id ? (
                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1 rounded-lg animate-fade-in">
                      <span className="text-xs font-bold text-rose-800">Slette dette temaet?</span>
                      <button
                        type="button"
                        onClick={() => deleteMatrix(matrix.id)}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded transition shadow-sm cursor-pointer"
                      >
                        Ja, slett
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded transition cursor-pointer"
                      >
                        Avbryt
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(matrix.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                      title="Slett matrise"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Matrise Kolonner */}
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                {matrix.groups.map((group, idx) => (
                  <div key={group.id} className="p-6 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 ${
                          group.color === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
                          group.color === 'amber' ? 'bg-amber-100 text-amber-800' :
                          group.color === 'indigo' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-sky-100 text-sky-800'
                        }`}>
                          {idx + 1}
                        </div>
                        <input 
                          type="text"
                          value={group.name}
                          onChange={(e) => updateGroupName(matrix.id, group.id, e.target.value)}
                          className="font-bold text-slate-800 text-sm bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-indigo-300 rounded px-1"
                        />
                      </div>
                      {matrix.groups.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => removeGroup(matrix.id, group.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded transition"
                          title="Fjern denne kolonnen"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Fokus i hverdagen
                      </label>
                      <textarea 
                        className="w-full min-h-[120px] p-3 text-sm text-slate-700 bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-y leading-relaxed font-sans"
                        value={group.text}
                        onChange={(e) => updateGroupText(matrix.id, group.id, e.target.value)}
                        placeholder="Skriv aldersriktige mål, aktivitetseksempler og tiltak..."
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Matrise Footer */}
              <div className="bg-slate-50 p-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span>Lagres og synkroniseres i sanntid med Pedledern</span>
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
