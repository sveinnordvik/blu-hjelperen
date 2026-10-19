import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, Plus, Trash2, GripVertical, 
  Sparkles, Type, Info, CheckCircle2, ArrowUp, ArrowDown,
  RotateCcw, ShieldCheck
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';

export interface MalFeltDef {
  id: string;
  tittel: string;
  hjelpetekst: string;
  aiStottet: boolean;
}

export const STANDARD_UDIR_MAL: MalFeltDef[] = [
  { id: 'bakgrunn', tittel: '1. Bakgrunn for tiltaket', hjelpetekst: 'Kort oppsummering av sakkyndig vurdering og enkeltvedtak.', aiStottet: false },
  { id: 'langsiktige_maal', tittel: '2. Langsiktige mål', hjelpetekst: 'Overordnede mål fra enkeltvedtaket.', aiStottet: false },
  { id: 'kortsiktige_maal', tittel: '3. Kortsiktige mål (SMARTe)', hjelpetekst: 'Spesifikke, Målbare, Aksepterte, Realistiske, Tidsavgrensede (Trondheims-modellen).', aiStottet: true },
  { id: 'organisering', tittel: '4. Innhold, organisering og metoder', hjelpetekst: 'Hva skal gjøres? Hvordan? Hvem har ansvaret? Hvor?', aiStottet: true },
  { id: 'foreldresamarbeid', tittel: '5. Samarbeid med hjemmet', hjelpetekst: 'Hvordan og hvor ofte skal foreldrene involveres?', aiStottet: false },
  { id: 'evaluering', tittel: '6. Plan for evaluering', hjelpetekst: 'Når og hvordan skal tiltakene evalueres?', aiStottet: false }
];

export default function ITPMalbygger({ onNavigate }: { onNavigate?: (target: string) => void }) {
  // Styrerens "Master"-mal. Vi starter med Udir/Trondheim-oppsettet som standard eller henter fra lagring.
  const [malFelter, setMalFelter] = useState<MalFeltDef[]>(() => {
    try {
      const lagret = localStorage.getItem('itp_master_mal');
      if (lagret) {
        const parsed = JSON.parse(lagret);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => ({
            id: String(item.id),
            tittel: item.tittel || '',
            hjelpetekst: item.hjelpetekst || '',
            aiStottet: Boolean(item.aiStottet ?? (item.type === 'ai-stottet'))
          }));
        }
      }
    } catch {}
    return STANDARD_UDIR_MAL;
  });

  const [harUlagredeEndringer, setHarUlagredeEndringer] = useState(false);
  const [publiserer, setPubliserer] = useState(false);
  const [publisertMelding, setPublisertMelding] = useState<string | null>(null);

  // Last inn fra Firestore ved oppstart hvis tilgjengelig
  useEffect(() => {
    let isMounted = true;
    async function hentFraFirestore() {
      try {
        if (!db) return;
        const malDocRef = doc(db, 'barnehage_innstillinger', 'itp_mal');
        const snap = await getDoc(malDocRef);
        if (snap.exists() && isMounted) {
          const data = snap.data();
          if (Array.isArray(data?.felter) && data.felter.length > 0) {
            setMalFelter(data.felter);
            localStorage.setItem('itp_master_mal', JSON.stringify(data.felter));
          }
        }
      } catch (err) {
        console.log("Firestore henting av itp_mal (bruker lokal mal):", err);
      }
    }
    hentFraFirestore();
    return () => { isMounted = false; };
  }, []);

  // Oppdaterer et spesifikt felt i malen
  const oppdaterFelt = (id: string, nokkel: keyof MalFeltDef, verdi: any) => {
    setMalFelter(prev => prev.map(felt => 
      felt.id === id ? { ...felt, [nokkel]: verdi } : felt
    ));
    setHarUlagredeEndringer(true);
  };

  // Toggle for å skru av/på KI-assistent for et felt
  const toggleAI = (id: string) => {
    setMalFelter(prev => prev.map(felt => 
      felt.id === id ? { ...felt, aiStottet: !felt.aiStottet } : felt
    ));
    setHarUlagredeEndringer(true);
  };

  // Flytt felt opp eller ned
  const flyttFelt = (index: number, retning: 'opp' | 'ned') => {
    const nyIndex = retning === 'opp' ? index - 1 : index + 1;
    if (nyIndex < 0 || nyIndex >= malFelter.length) return;
    
    const kopi = [...malFelter];
    const [flyttet] = kopi.splice(index, 1);
    kopi.splice(nyIndex, 0, flyttet);
    setMalFelter(kopi);
    setHarUlagredeEndringer(true);
  };

  // Slette et felt fra malen
  const slettFelt = (id: string) => {
    if (window.confirm('Er du sikker på at du vil slette dette feltet fra barnehagens felles mal?')) {
      setMalFelter(prev => prev.filter(felt => felt.id !== id));
      setHarUlagredeEndringer(true);
    }
  };

  // Tilbakestill til Udir-standard
  const tilbakestillTilStandard = () => {
    if (window.confirm('Vil du tilbakestille malen til Utdanningsdirektoratet og Trondheim kommunes standard oppsett?')) {
      setMalFelter(STANDARD_UDIR_MAL);
      setHarUlagredeEndringer(true);
    }
  };

  // Legge til et nytt, tomt felt nederst
  const leggTilFelt = () => {
    const nyttFelt: MalFeltDef = {
      id: `felt_${Date.now()}`,
      tittel: `${malFelter.length + 1}. Nytt avsnitt`,
      hjelpetekst: 'Beskriv hva pedlederne skal fylle inn her...',
      aiStottet: false
    };
    setMalFelter([...malFelter, nyttFelt]);
    setHarUlagredeEndringer(true);
  };

  // "Publiser"-knappen med både lokal synk og Firestore-støtte
  const handlePubliser = async () => {
    setPubliserer(true);
    
    try {
      // 1. Vi peker på et spesifikt dokument i databasen: 'barnehage_innstillinger/itp_mal'
      const malRef = doc(db, 'barnehage_innstillinger', 'itp_mal');
      
      // 2. Vi lagrer hele arrayen med overskrifter (malFelter) til databasen
      await setDoc(malRef, { 
        felter: malFelter, 
        sistOppdatert: new Date().toISOString(),
        oppdatertAv: auth?.currentUser?.email || "Styrer"
      });

      // Lokal backup og hendelse for umiddelbar oppdatering i samme sesjon
      localStorage.setItem('itp_master_mal', JSON.stringify(malFelter));
      window.dispatchEvent(new CustomEvent('itp_mal_updated', { detail: malFelter }));

      setHarUlagredeEndringer(false);
      setPublisertMelding("ITP-malen er publisert! Alle pedledere har nå det nye oppsettet på sine skjermer.");
      alert("ITP-malen er publisert! Alle pedledere har nå det nye oppsettet på sine skjermer.");
    } catch (error) {
      console.error("Feil ved lagring til Firestore:", error);
      alert("Kunne ikke publisere malen. Sjekk internettforbindelsen.");
    } finally {
      setPubliserer(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 font-sans text-slate-800 p-4 sm:p-6 pb-16">
      
      {/* HEADER for Styrern (Mørkeblå / Indigo) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600 shadow-sm">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Malbygger: Tiltaksplan (ITP)</h1>
            <p className="text-sm text-slate-500">Definer standarden for spesialpedagogisk dokumentasjon i barnehagen</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={tilbakestillTilStandard}
            className="px-3.5 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition"
            title="Tilbakestill til Udir/Trondheim standard"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Udir-standard</span>
          </button>

          <button 
            onClick={handlePubliser}
            disabled={!harUlagredeEndringer || publiserer}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
              harUlagredeEndringer 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:scale-[1.01]' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {publiserer ? <Sparkles className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {publiserer ? 'Publiserer mal...' : 'Lagre & Publiser til Pedledere'}
          </button>
        </div>
      </div>

      {/* SUKSESS-MELDING */}
      {publisertMelding && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center gap-3 animate-fadeIn shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold">{publisertMelding}</p>
        </div>
      )}

      {/* INFO-BOKS */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900 leading-relaxed">
          <strong>Slik fungerer det:</strong> Endringene du publiserer her oppdaterer umiddelbart skjemaet og PDF-eksporten inne på <strong>Pedleder&apos;n</strong>. 
          Du kan skru på <em>KI-Veileder</em> for felter der personalet har nytte av didaktisk og spesialpedagogisk støtte (f.eks. ved utforming av SMARTe mål etter Trondheims-modellen).
        </div>
      </div>

      {/* LISTEN MED MAL-FELTER */}
      <div className="space-y-4">
        {malFelter.map((felt, index) => (
          <div key={felt.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 group hover:border-indigo-200 transition-colors">
            
            {/* Sorteringskontroller */}
            <div className="flex md:flex-col items-center justify-between md:justify-center gap-2 text-slate-400 border-b md:border-b-0 md:border-r border-slate-100 pb-2 md:pb-0 md:pr-3">
              <div className="flex items-center gap-1">
                <GripVertical className="w-5 h-5 text-slate-300" />
                <span className="text-xs font-bold text-slate-500">#{index + 1}</span>
              </div>
              <div className="flex md:flex-col gap-1">
                <button
                  type="button"
                  onClick={() => flyttFelt(index, 'opp')}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-20 text-slate-500"
                  title="Flytt opp"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => flyttFelt(index, 'ned')}
                  disabled={index === malFelter.length - 1}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-20 text-slate-500"
                  title="Flytt ned"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Redigeringsfelter */}
            <div className="flex-1 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Overskrift i PDF / Skjema
                </label>
                <input 
                  type="text" 
                  value={felt.tittel}
                  onChange={(e) => oppdaterFelt(felt.id, 'tittel', e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Hjelpetekst til Pedlederen
                </label>
                <input 
                  type="text" 
                  value={felt.hjelpetekst}
                  onChange={(e) => oppdaterFelt(felt.id, 'hjelpetekst', e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-xs text-slate-600 bg-slate-50"
                />
              </div>
            </div>

            {/* Kontroller (KI-toggle og Slett) */}
            <div className="w-full md:w-48 flex flex-row md:flex-col items-center md:items-end justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
              
              <div className="w-auto md:w-full">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 hidden md:block text-right">
                  Inndata-verktøy
                </label>
                <button 
                  type="button"
                  onClick={() => toggleAI(felt.id)}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border shadow-xs ${
                    felt.aiStottet 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {felt.aiStottet ? <Sparkles className="w-4 h-4 text-emerald-600" /> : <Type className="w-4 h-4 text-slate-400" />}
                  {felt.aiStottet ? 'KI-Støtte PÅ' : 'Kun Ren Tekst'}
                </button>
              </div>

              <button 
                type="button"
                onClick={() => slettFelt(felt.id)}
                className="text-slate-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors"
                title="Slett felt fra malen"
              >
                <Trash2 className="w-5 h-5" />
              </button>

            </div>
          </div>
        ))}
      </div>

      {/* LEGG TIL NYTT FELT */}
      <button 
        type="button"
        onClick={leggTilFelt}
        className="w-full py-4 border-2 border-dashed border-indigo-200 text-indigo-700 hover:text-indigo-800 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-50/70 hover:border-indigo-300 transition-colors"
      >
        <Plus className="w-5 h-5" /> Legg til nytt avsnitt i malen
      </button>

      {/* HURTIGKNAPP TIL FORHÅNDSVISNING */}
      {onNavigate && (
        <div className="pt-4 flex justify-end">
          <button
            type="button"
            onClick={() => onNavigate('pedleder')}
            className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            Se hvordan malen ser ut for Pedleder&apos;n →
          </button>
        </div>
      )}

    </div>
  );
}
