import React, { useState, useEffect } from 'react';
import { Target, ArrowRight, BookOpen, Check } from 'lucide-react';

interface PedlederProgressionGuideProps {
  currentTheme?: string;
  targetGroup?: string;
  onInsertIntoWeeklyPlan?: (text: string, theme: string) => void;
}

// Denne komponenten lever i "Pedledern" (planleggingsverktøyet for avdelingene)
export default function PedlederProgressionGuide({ 
  currentTheme = "Natur, miljø og teknologi", 
  targetGroup = "Storbarn (3-5 år)",
  onInsertIntoWeeklyPlan
}: PedlederProgressionGuideProps) {
  const [copied, setCopied] = useState(false);
  const [goalText, setGoalText] = useState(
    "Systematisk utforskning. Vi bruker forstørrelsesglass, artsbestemmer insekter og snakker om bærekraft og allemannsretten. Barna introduseres for enkle naturvitenskapelige eksperimenter."
  );

  // Sjekk om det finnes oppdaterte data fra styrerens Progresjon-fane
  useEffect(() => {
    try {
      const savedV2 = localStorage.getItem('barnehage_progresjonsplaner_v2');
      if (savedV2) {
        const matrices = JSON.parse(savedV2);
        if (Array.isArray(matrices) && matrices.length > 0) {
          const match = matrices.find((m: any) => 
            m.theme?.toLowerCase().includes('natur') || 
            m.theme?.toLowerCase().includes('miljø') || 
            m.theme?.toLowerCase().includes('teknologi')
          ) || matrices[0];

          if (match && Array.isArray(match.groups)) {
            const group = match.groups.find((g: any) => g.name?.includes('3-5') || g.name?.toLowerCase().includes('storbarn')) || match.groups[1] || match.groups[0];
            if (group && group.text && group.text.trim()) {
              setGoalText(group.text.trim());
            }
          }
        }
      }
    } catch (e) {
      console.error("Kunne ikke laste progresjonsmål", e);
    }
  }, [currentTheme, targetGroup]);

  const handleInsert = () => {
    if (onInsertIntoWeeklyPlan) {
      onInsertIntoWeeklyPlan(goalText, currentTheme);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-indigo-50/80 rounded-xl border border-indigo-100 p-5 mb-6 shadow-sm animate-fade-in">
      <div className="flex items-start gap-4">
        
        {/* Ikon */}
        <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-lg shrink-0 mt-1 shadow-sm">
          <Target size={20} />
        </div>
        
        {/* Innhold */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded">
              Hentet fra Årsplanen
            </span>
          </div>
          
          <h4 className="text-sm font-bold text-indigo-900 mb-1">Progresjonsmål for denne uken</h4>
          <p className="text-xs text-indigo-700 mb-3 font-medium">
            Gjelder for: {currentTheme} <ArrowRight size={12} className="inline mx-1" /> {targetGroup}
          </p>
          
          {/* Boksen som viser teksten styreren skrev inn i "Progresjon"-fanen */}
          <div className="bg-white p-3.5 rounded-lg border border-indigo-100 text-sm text-slate-700 shadow-sm relative leading-relaxed">
            <BookOpen size={16} className="absolute right-3 top-3 text-slate-300" />
            "{goalText}"
          </div>

          {/* Action-knapp for å spare tid */}
          <button 
            type="button"
            onClick={handleInsert}
            className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Lagt til som ny økt i ukeplanen!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                Lim inn som utgangspunkt i min ukeplan
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
