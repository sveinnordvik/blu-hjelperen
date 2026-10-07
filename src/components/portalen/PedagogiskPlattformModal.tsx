import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Sparkles, 
  Trees, 
  Upload, 
  FileText, 
  Check, 
  Compass, 
  Building, 
  Layers, 
  BookOpen, 
  Heart,
  Smile,
  Palette,
  Target,
  Sun,
  Award
} from 'lucide-react';
import { 
  BarnehageProfilData, 
  PedagogiskPlattformType, 
  PEDAGOGISKE_PLATTFORMER, 
  getBarnehageProfil, 
  saveBarnehageProfil 
} from '../../lib/pedagogiskPlattform';

interface PedagogiskPlattformModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileSaved?: (updated: BarnehageProfilData) => void;
}

export default function PedagogiskPlattformModal({
  isOpen,
  onClose,
  onProfileSaved
}: PedagogiskPlattformModalProps) {
  const [profil, setProfil] = useState<BarnehageProfilData>(getBarnehageProfil);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProfil(getBarnehageProfil());
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Bytt forhåndsdefinert plattform
  const handleSelectPreset = (type: PedagogiskPlattformType) => {
    const preset = PEDAGOGISKE_PLATTFORMER[type];
    setProfil(prev => ({
      ...prev,
      plattformType: type,
      plattformNavn: preset.navn,
      beskrivelse: preset.kortBeskrivelse,
      visjon: preset.visjon,
      kjerneverdier: preset.kjerneverdier,
      fagligForankringsMal: preset.fagligForankringsMal
    }));
  };

  // Simuler eller håndter opplasting av årsplan-PDF
  const handleAarsplanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfil(prev => ({
        ...prev,
        opplastetFilnavn: file.name,
        opplastetDato: new Date().toLocaleDateString('no-NO')
      }));
    }
  };

  const handleSave = () => {
    saveBarnehageProfil(profil);
    setSaveSuccess(true);
    if (onProfileSaved) {
      onProfileSaved(profil);
    }
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-scaleIn flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-900 via-emerald-950 to-stone-900 text-white p-6 flex items-start justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                KI-Grunnmuren & Felles DNA
              </span>
              <span className="text-xs text-stone-300 font-medium">Synkronisert for Styrer & Pedleder</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Barnehagens Pedagogiske Plattform
            </h2>
            <p className="text-xs text-stone-300 max-w-xl">
              Definer barnehagens felles verdigrunnlag og pedagogiske profil. KI-motoren bruker dette automatisk 
              til å forankre alle Dagens Bilde, ukeplaner og det faglige Månedsbrevet.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* 1. Barnehage- og Avdelingsnavn */}
          <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Building className="w-4 h-4 text-teal-600" />
              Barnehage og Avdeling
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Barnehagens navn:
                </label>
                <input 
                  type="text"
                  value={profil.barnehageNavn}
                  onChange={(e) => setProfil(prev => ({ ...prev, barnehageNavn: e.target.value }))}
                  placeholder="F.eks. Furutoppen Barnehage"
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Avdeling / Base:
                </label>
                <input 
                  type="text"
                  value={profil.avdelingsNavn}
                  onChange={(e) => setProfil(prev => ({ ...prev, avdelingsNavn: e.target.value }))}
                  placeholder="F.eks. Blåbærtua (3-6 år)"
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* 2. Velg pedagogisk profil (Friluftsbarnehage som standard) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Compass className="w-4 h-4 text-teal-600" />
                Velg Pedagogisk Profil & Læringssyn
              </h3>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Friluftsbarnehage er standard
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { type: 'friluft', label: 'Friluftsbarnehage', tag: 'Standard', desc: 'Natur, årstider, Skoggruppemetoden og risikomestring', icon: Trees },
                { type: 'montessori', label: 'Montessori', tag: 'Metode', desc: 'Selvstendighet, frihet under ansvar og tilrettelagt miljø', icon: Award },
                { type: 'reggio_emilia', label: 'Reggio Emilia', tag: 'Filosofi', desc: 'De 100 språk, rommet som 3. pedagog og utforskning', icon: Palette },
                { type: 'steiner', label: 'Steinerpedagogikk', tag: 'Tradisjon', desc: 'Rytme, danning, årstidsfester og naturlige materialer', icon: Sun },
                { type: 'idrett', label: 'Idrett & Bevegelse', tag: 'Profil', desc: 'Motorisk mestring, fysisk helse og aktiv lagånd', icon: Target },
                { type: 'kunst_kultur', label: 'Kunst & Kultur', tag: 'Profil', desc: 'Skaperglede, drama, forming, musikk og estetikk', icon: Sparkles }
              ].map(item => {
                const isSelected = profil.plattformType === item.type;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleSelectPreset(item.type as PedagogiskPlattformType)}
                    className={`p-3.5 rounded-2xl border text-left transition relative flex flex-col justify-between cursor-pointer ${
                      isSelected 
                        ? 'bg-teal-50/80 border-teal-500 ring-2 ring-teal-500/20 shadow-xs' 
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-teal-200 text-teal-900 font-extrabold' : 'bg-slate-100 text-slate-500'}`}>
                          {item.tag}
                        </span>
                      </div>
                      <div className="text-xs font-black text-slate-900">{item.label}</div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Barnehagens Verdigrunnlag & KI-Forankring */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-600" />
              Profilens Kjerneverdier og Faglig Fokus for KI-en
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Kjerneverdier & Pedagogisk syn:
              </label>
              <textarea 
                value={profil.kjerneverdier}
                onChange={(e) => setProfil(prev => ({ ...prev, kjerneverdier: e.target.value }))}
                rows={2}
                className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Hvordan KI skal formulere faglig forankring:
              </label>
              <textarea 
                value={profil.fagligForankringsMal}
                onChange={(e) => setProfil(prev => ({ ...prev, fagligForankringsMal: e.target.value }))}
                rows={3}
                className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed"
              />
            </div>
          </div>

          {/* 4. Opplasting av Årsplan (PDF) */}
          <div className="bg-amber-50/60 rounded-2xl border border-amber-200/80 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                Last opp barnehagens vedtatte Årsplan (PDF)
              </h3>
              {profil.opplastetFilnavn && (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-700" /> {profil.opplastetFilnavn}
                </span>
              )}
            </div>

            <p className="text-xs text-amber-900 leading-relaxed">
              Last opp barnehagens offisielle årsplan (PDF). Systemet henter automatisk ut barnehagens visjon, 
              satsingsområder og verdigrunnlag slik at KI-motoren speiler barnehagens unike profil.
            </p>

            <label className="border-2 border-dashed border-amber-300 hover:border-amber-400 bg-white/70 hover:bg-white rounded-xl p-4 text-center cursor-pointer transition flex items-center justify-center gap-3">
              <Upload className="w-5 h-5 text-amber-700" />
              <div className="text-left">
                <span className="text-xs font-bold text-slate-900 block">
                  {profil.opplastetFilnavn ? `Lastet opp: ${profil.opplastetFilnavn}` : 'Klikk for å laste opp Årsplan (PDF)'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {profil.opplastetDato ? `Sist oppdatert: ${profil.opplastetDato}` : 'Maks 25 MB • PDF format'}
                </span>
              </div>
              <input 
                type="file" 
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleAarsplanUpload} 
                className="hidden" 
              />
            </label>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {saveSuccess ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-600" /> Lagret og synkronisert!
              </span>
            ) : (
              <span>Gjelder for alle moduler i PedPortalen</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Lagre Plattform</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
