import React from 'react';
import { 
  X, 
  HelpCircle, 
  BrainCircuit, 
  Compass, 
  Sparkles, 
  BookOpen, 
  Users, 
  Eye, 
  Layers, 
  CheckCircle2, 
  Lightbulb, 
  Clock,
  ArrowRight,
  ShieldCheck,
  ToggleLeft
} from 'lucide-react';

interface PlaggInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PlaggInfoModal({ isOpen, onClose }: PlaggInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-scaleIn flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 flex items-start justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
                Pedagogisk Veileder
              </span>
              <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                Anbefalt standard
              </span>
            </div>
            <h2 className="text-xl font-black flex items-center gap-2 mt-1">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
              Hva er PLAGG-metoden?
            </h2>
            <p className="text-xs text-indigo-200">
              Strukturert pedagogisk sekvens for dypere refleksjon, begrepslæring og hukommelse i barnehagen.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition"
            aria-label="Lukk"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Innhold */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-sm">
          
          {/* Hoveddefinisjon */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4">
            <h3 className="font-extrabold text-indigo-950 text-base mb-1.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Kjernen i PLAGG: Tre sammenhengende faser
            </h3>
            <p className="text-xs text-indigo-900 leading-relaxed mb-3">
              PLAGG er et didaktisk verktøy inspirert av High/Scope-modellens anerkjente <em>«Plan - Do - Review»</em>-sekvens, tilpasset norsk barnehagetradisjon og videreutviklet innen natur- og mestringspedagogikk.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
              <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-0.5">Fase 1 (PLA)</div>
                <div className="font-bold text-slate-900 text-sm">Planlegging</div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  Barna involveres i forberedelsene, formulerer intensjoner, undrer seg og stiller hypoteser før aktiviteten starter.
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-0.5">Fase 2 (G)</div>
                <div className="font-bold text-slate-900 text-sm">Gjennomføring</div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  Selve turen, leken, eksperimentet eller skapingen. Den voksne er med-undrende, støttende og tett på barna.
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                <div className="text-[10px] font-black text-purple-600 uppercase tracking-wider mb-0.5">Fase 3 (G)</div>
                <div className="font-bold text-slate-900 text-sm">Gjenkalling</div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  Aktiv gjenhenting og refleksjon etter aktiviteten. Barna setter ord på opplevelser, ser sammenhenger og konsoliderer minnet.
                </p>
              </div>
            </div>
          </div>

          {/* Viktig presisering: PLAGG vs Arbeidsboken */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-800 shrink-0 mt-0.5">
                <Lightbulb className="w-5 h-5 text-amber-700" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-amber-950 text-sm">
                  Viktig skille: PLAGG vs. Arbeidsboken
                </h4>
                <p className="text-xs text-amber-900 leading-relaxed">
                  <strong>Arbeidsboken</strong> er et spesifikt verktøy knyttet til <em>Skoggruppemetoden</em>, der barna har hver sin fysiske perm/arbeidsbok de tegner og limer inn i etter tur.
                </p>
                <p className="text-xs text-amber-900 leading-relaxed">
                  <strong>PLAGG</strong>, derimot, er en <em>universell didaktisk metode</em> som kan brukes uavhengig av om man har en arbeidsbok. Gjenkallingen kan like gjerne foregå i samlingsstund, rundt fruktbordet, ved å kjenne på ting i en sansepose, gjennom felles samtale eller ved å se på bilder på storskjerm.
                </p>
              </div>
            </div>
          </div>

          {/* De 5 fokusområdene i Gjenkalling */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              De 5 kognitive og relasjonelle fokusområdene i Gjenkalling
            </h3>
            
            <div className="space-y-2.5">
              {[
                {
                  fokus: 'Oppmerksomhet',
                  farge: 'text-blue-700 bg-blue-50 border-blue-200',
                  beskrivelse: 'Barnet øver på å rette og fastholde fokus på konkrete detaljer, lyder, sanseinntrykk eller hendelser fra aktiviteten.'
                },
                {
                  fokus: 'Hukommelse',
                  farge: 'text-purple-700 bg-purple-50 border-purple-200',
                  beskrivelse: 'Aktiv gjenhenting (retrieval practice). Barna rekonstruerer tidsrekkefølgen: "Hva gjorde vi først? Hva skjedde etterpå?".'
                },
                {
                  fokus: 'Leseforståelse & Bildeforståelse',
                  farge: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                  beskrivelse: 'Tidlig tekst- og symbolforståelse. Barna tolker tegn, kart, bilder, fotografier fra formiddagen eller egne skisser.'
                },
                {
                  fokus: 'Språklig bevisstgjøring',
                  farge: 'text-amber-700 bg-amber-50 border-amber-200',
                  beskrivelse: 'Målrettet begrepslæring i tråd med Språkløyper. Barna tar nye ord i aktiv bruk og forklarer sammenhenger.'
                },
                {
                  fokus: 'Kontakt & Relasjon',
                  farge: 'text-rose-700 bg-rose-50 border-rose-200',
                  beskrivelse: 'Felles oppmerksomhetsfokus (Joint Attention) mellom barn og voksne. Barna opplever å bli lyttet til og høre andres perspektiver.'
                }
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                  <span className={`text-[11px] font-black px-2 py-1 rounded-lg border shrink-0 ${item.farge}`}>
                    {item.fokus}
                  </span>
                  <p className="text-xs text-slate-700 leading-snug">
                    {item.beskrivelse}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Hvorfor er det standard, men valgfritt? */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <ToggleLeft className="w-4 h-4 text-slate-600" />
              Hvorfor anbefalt som standard, men valgfritt å slå av?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Forskning viser at uten en bevisst gjenkallingsfase forsvinner en stor del av barnas erfaringer i hverdagens støy. PLAGG sikrer at aktiviteten rammes inn, og at barna får bearbeidet inntrykkene.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Likevel har pedlederen full frihet: Dersom avdelingen en uke har alternative rutiner, heldagstur eller ønsker frilek i ettermiddagstiden, kan PLAGG-gjenkalling enkelt slås av med bryteren i planleggeren.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Forankret i Rammeplanen, Språkløyper og High/Scope
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Forstått, lukk veiledning
          </button>
        </div>

      </div>
    </div>
  );
}
