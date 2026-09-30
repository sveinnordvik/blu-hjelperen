import React, { useState, useEffect } from 'react';
import { 
  X, 
  Brain, 
  Sparkles, 
  Check, 
  Save, 
  BookOpen, 
  Trees, 
  Baby, 
  GraduationCap, 
  Palette, 
  MessageSquareQuote,
  HelpCircle,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';
import { FolderType } from '../WorkspaceLayout';

export interface FolderContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: FolderType | null;
  onSaveContext: (folderId: string, customContext: string, focusArea?: string) => void;
}

const CONTEXT_TEMPLATES = [
  {
    id: 'natur',
    icon: Trees,
    title: 'Praksis: Natur & Friluft (3–5 år)',
    desc: 'Storbarnsavdeling med fokus på uteliv, risikofylt lek og medvirkning.',
    context: 'Praksis på storbarnsavdeling (3-5 år) med natur- og friluftsprofil.\n• Fokusområder: Risikofylt lek, barns medvirkning, relasjonskompetanse, Rammeplanens kap. 8.6 "Natur, miljø og teknologi".\n• Didaktisk mål: Støtte barnas nysgjerrighet og utforsking i ulendt terreng.'
  },
  {
    id: 'smabarn',
    icon: Baby,
    title: 'Praksis: Småbarn (1–3 år)',
    desc: 'Tilknytning, trygghet, omsorg og de minste barnas kroppslige lek.',
    context: 'Praksis på småbarnsavdeling (1-3 år).\n• Fokusområder: Tilknytningsteori (Trygghetssirkelen), omsorg i hverdagsrutiner (måltid, bleieskift), de minste barnas non-verbale kommunikasjon og kroppslige lek.\n• Faglig fokus: Være en sensitiv, nærværende og trygg voksen.'
  },
  {
    id: 'bachelor',
    icon: GraduationCap,
    title: 'Bachelor / Fordypning',
    desc: 'Akademisk oppgave, problemstilling, teori og metode.',
    context: 'Bacheloroppgave i barnehagelærerutdanningen.\n• Tema/Problemstilling: [Fyll inn problemstilling her]\n• Teorigrunnlag: Sosiokulturelt perspektiv (Vygotskij), barns perspektiv og medvirkning (Bae/Løkken).\n• Metode: Kvalitativ observasjon og semistrukturerte feltnotater.\n• Mål for veiledning: Hjelp meg å koble observasjoner stringent til teori og drøfting.'
  },
  {
    id: 'estetisk',
    icon: Palette,
    title: 'Kunst, kultur & kreativitet',
    desc: 'Estetiske fag, dramatisering, musikk og skapende prosesser.',
    context: 'Didaktisk prosjekt innen Kunst, kultur og kreativitet.\n• Fokusområder: Estetiske læringsprosesser, barns improvisasjon, musikk, forming og dramalek.\n• Mål: Å skape rom for barns egne estetiske uttrykk uten forhåndsdefinerte fasitsvar.'
  },
  {
    id: 'sprak',
    icon: MessageSquareQuote,
    title: 'Språkmiljø & Flerspråklighet',
    desc: 'Språkstimulering, dialogisk lesing og flerspråklig støtte.',
    context: 'Fokus på et rikt språkmiljø i barnehagen.\n• Fokusområder: Dialogisk lesing, begrepsinnlæring, flerspråklig støtte i lek og hverdagsaktiviteter.\n• Teori: Språkutvikling i samhandling (Gjems).'
  }
];

export function FolderContextModal({
  isOpen,
  onClose,
  folder,
  onSaveContext
}: FolderContextModalProps) {
  const [contextText, setContextText] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (folder) {
      setContextText(folder.customContext || '');
      setIsSaved(false);
    }
  }, [folder]);

  if (!isOpen || !folder) return null;

  const handleApplyPreset = (preset: typeof CONTEXT_TEMPLATES[0]) => {
    setSelectedPreset(preset.id);
    if (!contextText.trim() || confirm('Vil du overskrive nåværende kontekst med malen?')) {
      setContextText(preset.context);
    }
  };

  const handleSave = () => {
    onSaveContext(folder.id, contextText.trim());
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleClear = () => {
    setContextText('');
    setSelectedPreset(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center font-bold">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black">
                  KI-føringer & Kontekst
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                  {folder.name}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Gi Superveilederen, Feltveilederen og Skriveverkstedet bakgrunnskunnskap for denne mappen
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* INNHOLD */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          
          {/* HVA ER DETTE? INFO-BOKS */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 leading-relaxed">
              <strong className="font-bold text-slate-900 block mb-0.5">
                Hvordan fungerer felles mappekontekst?
              </strong>
              Når du stiller spørsmål i Superveilederen eller skriver oppgaver i Skriveverkstedet inne i denne mappen, 
              vil KI-en automatisk tilpasse rådene, didaktiske refleksjoner og kildehenvisninger til denne beskrivelsen.
            </div>
          </div>

          {/* HURTIGMALER */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">
              Velg en hurtigmal (eller skriv egen under)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {CONTEXT_TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                const isSelected = selectedPreset === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyPreset(tmpl)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-bold text-xs text-slate-900 leading-tight">
                          {tmpl.title}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">
                        {tmpl.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* EGEN KONTEKST TEKSTOMRÅDE */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                Mappens bakgrunnsinstruks & føringer
              </label>
              {contextText && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                >
                  Tøm felt
                </button>
              )}
            </div>

            <textarea
              rows={7}
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              placeholder="F.eks.: Dette er en praksisperiode på småbarnsavdeling med 12 barn (1-2 år). Vi har fokus på trygghet, måltidsfellesskap og Rammeplanens kapittel om omsorg og medvirkning..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all leading-relaxed custom-scrollbar resize-none"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Tips: Nevn gjerne alder på barna, emnekode, problemstilling eller spesifikke teoretikere du vil at veilederen skal vektlegge.
            </p>
          </div>

          {isSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Mappekonteksten er oppdatert og aktiv!</span>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-white transition-all cursor-pointer"
          >
            Avbryt
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Lagre føringer for mappen</span>
          </button>
        </div>

      </div>
    </div>
  );
}

export default FolderContextModal;
