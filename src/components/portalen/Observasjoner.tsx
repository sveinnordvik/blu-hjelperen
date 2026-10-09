import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  Trash2, 
  Edit3, 
  FolderOpen, 
  Plus, 
  ShieldCheck, 
  Check, 
  X, 
  Calendar, 
  Tag, 
  Sparkles,
  AlertTriangle
} from 'lucide-react';

export interface ObservasjonItem {
  id: string | number;
  tekst: string;
  status: 'aktiv' | 'arkiv' | 'aktive';
  tittel?: string;
  dato?: string;
  fagomrade?: string;
  pedagogiskRefleksjon?: string;
}

export interface ObservasjonerProps {
  onNavigateToPPT?: (tekst: string) => void;
  avdelingNavn?: string;
  className?: string;
}

const DEFAULT_OBSERVASJONER: ObservasjonItem[] = [
  { 
    id: 1, 
    tekst: "Barnet strevde i overgangen mellom frilek og samling, og trengte støtte til regulering. Viste tegn til uro da rydde-signalet kom brått.", 
    status: 'aktiv',
    tittel: 'Overgangsfase frilek til samling',
    dato: '2026-10-09',
    fagomrade: 'Kommunikasjon, språk og tekst',
    pedagogiskRefleksjon: 'Vurdere tettere voksenoppfølging og visuell forberedelse 5 minutter før rydding starter.'
  },
  { 
    id: 2, 
    tekst: "Samspill i sandkassa: To treåringer ønsket den samme røde spaden. I stedet for konflikt observerte vi at det ene barnet tilbød en bøtte i bytte.", 
    status: 'arkiv',
    tittel: 'Samspill og deling i sandkassa',
    dato: '2026-10-02',
    fagomrade: 'Etikk, religion og filosofi',
    pedagogiskRefleksjon: 'Dette viser gryende prososial kompetanse og forhandlingsevne. Som pedagoger må vi gi barna tid før vi griper inn.'
  },
  {
    id: 3,
    tekst: "Språkstimulering under måltidet: Bordet med 4-åringer diskuterte hvor melken kommer fra. Barna delte erfaringer fra gårdsbesøk og undret seg sammen.",
    status: 'aktiv',
    tittel: 'Måltidssamtale og begrepslæring',
    dato: '2026-10-05',
    fagomrade: 'Natur, miljø og teknologi',
    pedagogiskRefleksjon: 'Måltidet er en uvurderlig arena for hverdagssamtaler og begrepslæring i trygge rammer.'
  }
];

export default function Observasjoner({ 
  onNavigateToPPT, 
  avdelingNavn = 'Blåbærtua',
  className = ''
}: ObservasjonerProps) {
  const [visning, setVisning] = useState<'aktive' | 'arkiv'>('aktive'); // 'aktive' eller 'arkiv'
  
  // State for observasjonene med localStorage-persistering
  const [observasjoner, setObservasjoner] = useState<ObservasjonItem[]>(() => {
    try {
      const saved = localStorage.getItem('pedledern_observasjoner_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Kunne ikke laste observasjoner fra localStorage', e);
    }
    return DEFAULT_OBSERVASJONER;
  });

  // Skjema for ny observasjon
  const [visNySkjema, setVisNySkjema] = useState(false);
  const [nyTekst, setNyTekst] = useState('');
  const [nyTittel, setNyTittel] = useState('');
  const [nyFagomrade, setNyFagomrade] = useState('Kommunikasjon, språk og tekst');
  const [nyRefleksjon, setNyRefleksjon] = useState('');

  // Slettemodal (trygg sletting uten at iframe blokkerer window.confirm)
  const [sletteKandidatId, setSletteKandidatId] = useState<string | number | null>(null);

  // Lagre til localStorage ved endring
  useEffect(() => {
    try {
      localStorage.setItem('pedledern_observasjoner_list', JSON.stringify(observasjoner));
    } catch (e) {
      console.warn('Feil ved lagring av observasjoner', e);
    }
  }, [observasjoner]);

  const slettObservasjon = (id: string | number) => {
    // Bruk modalbekreftelse for å unngå iframe-blokkering
    setSletteKandidatId(id);
  };

  const bekrefteSletting = () => {
    if (sletteKandidatId !== null) {
      setObservasjoner(prev => prev.filter(obs => obs.id !== sletteKandidatId));
      setSletteKandidatId(null);
    }
  };

  const avbrytSletting = () => {
    setSletteKandidatId(null);
  };

  const arkiverObservasjon = (id: string | number) => {
    setObservasjoner(prev => prev.map(obs => 
      obs.id === id ? { ...obs, status: 'arkiv' } : obs
    ));
  };

  const gjenopprettObservasjon = (id: string | number) => {
    setObservasjoner(prev => prev.map(obs => 
      obs.id === id ? { ...obs, status: 'aktiv' } : obs
    ));
  };

  const leggTilObservasjon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nyTekst.trim()) return;

    const nyObs: ObservasjonItem = {
      id: Date.now(),
      tekst: nyTekst.trim(),
      status: 'aktiv',
      tittel: nyTittel.trim() || `Observasjon ${new Date().toLocaleDateString('no-NO')}`,
      dato: new Date().toISOString().split('T')[0],
      fagomrade: nyFagomrade,
      pedagogiskRefleksjon: nyRefleksjon.trim() || undefined
    };

    setObservasjoner(prev => [nyObs, ...prev]);
    setNyTekst('');
    setNyTittel('');
    setNyRefleksjon('');
    setVisNySkjema(false);
    setVisning('aktive');
  };

  // Filtrerer med støtte for både 'aktiv' og 'aktive'
  const synligeObservasjoner = observasjoner.filter(obs => {
    if (visning === 'aktive') {
      return obs.status === 'aktiv' || obs.status === 'aktive';
    }
    return obs.status === 'arkiv';
  });

  const antallAktive = observasjoner.filter(o => o.status === 'aktiv' || o.status === 'aktive').length;
  const antallArkiv = observasjoner.filter(o => o.status === 'arkiv').length;

  return (
    <div className={`max-w-4xl mx-auto w-full ${className}`}>
      
      {/* Topp-meny for modulen: Aktive / Arkiv Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900">Observasjoner</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {avdelingNavn}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pedagogisk dokumentasjon for avdelingsmøter, didaktisk refleksjon og PPT-samarbeid.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Toggle Aktive / Arkiv */}
          <div className="flex bg-slate-200 p-1 rounded-lg">
            <button 
              onClick={() => setVisning('aktive')}
              className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-all ${
                visning === 'aktive' 
                  ? 'bg-white shadow-sm text-slate-900 font-semibold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 className="w-4 h-4 text-emerald-600" />
              <span>Aktive</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                visning === 'aktive' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-300 text-slate-700'
              }`}>
                {antallAktive}
              </span>
            </button>
            <button 
              onClick={() => setVisning('arkiv')}
              className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-all ${
                visning === 'arkiv' 
                  ? 'bg-white shadow-sm text-slate-900 font-semibold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderOpen className="w-4 h-4 text-amber-600" />
              <span>Arkiv</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                visning === 'arkiv' ? 'bg-amber-100 text-amber-800' : 'bg-slate-300 text-slate-700'
              }`}>
                {antallArkiv}
              </span>
            </button>
          </div>

          {/* Knapp for ny observasjon */}
          <button
            onClick={() => setVisNySkjema(!visNySkjema)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ny observasjon</span>
          </button>
        </div>
      </div>

      {/* Skjema for ny observasjon (ekspanderbart) */}
      {visNySkjema && (
        <form 
          onSubmit={leggTilObservasjon}
          className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm mb-6 space-y-4 animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Legg til ny observasjon
            </h3>
            <button 
              type="button" 
              onClick={() => setVisNySkjema(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tittel / situasjon (valgfritt)
              </label>
              <input 
                type="text"
                placeholder="F.eks. Samspill i sandkassa..."
                value={nyTittel}
                onChange={e => setNyTittel(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rammeplanens fagområde
              </label>
              <select
                value={nyFagomrade}
                onChange={e => setNyFagomrade(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="Kommunikasjon, språk og tekst">Kommunikasjon, språk og tekst</option>
                <option value="Kropp, bevegelse, mat og helse">Kropp, bevegelse, mat og helse</option>
                <option value="Kunst, kultur og kreativitet">Kunst, kultur og kreativitet</option>
                <option value="Natur, miljø og teknologi">Natur, miljø og teknologi</option>
                <option value="Antall, rom og form">Antall, rom og form</option>
                <option value="Etikk, religion og filosofi">Etikk, religion og filosofi</option>
                <option value="Nærmiljø og samfunn">Nærmiljø og samfunn</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observasjonstekst *
            </label>
            <textarea 
              rows={3}
              placeholder="Beskriv hendelsen objektivt (hvem, hva, hvor, barns reaksjon)..."
              value={nyTekst}
              onChange={e => setNyTekst(e.target.value)}
              required
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pedagogisk refleksjon & tiltak (valgfritt)
            </label>
            <textarea 
              rows={2}
              placeholder="Hva betyr dette didaktisk? Hvilke tiltak eller rammer kan støtte barna?"
              value={nyRefleksjon}
              onChange={e => setNyRefleksjon(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setVisNySkjema(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm"
            >
              Lagre observasjon
            </button>
          </div>
        </form>
      )}

      {/* Rende ut kortene basert på valgt visning */}
      <div className="space-y-4">
        {synligeObservasjoner.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
            {visning === 'aktive' ? (
              <>
                <Edit3 className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="font-semibold text-slate-700 text-sm">Ingen aktive observasjoner</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Trykk på &quot;Ny observasjon&quot; ovenfor for å registrere en praksisfortelling fra avdelingens hverdag.
                </p>
              </>
            ) : (
              <>
                <FolderOpen className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="font-semibold text-slate-700 text-sm">Arkivet er tomt</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Når du arkiverer observasjoner fra listen over aktive, samles de trygt her.
                </p>
              </>
            )}
          </div>
        ) : (
          synligeObservasjoner.map(obs => (
            <div 
              key={obs.id} 
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative group hover:border-slate-300 transition-all"
            >
              
              {/* Eventuell tittel og metadata */}
              {(obs.tittel || obs.dato || obs.fagomrade) && (
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pr-20">
                  <div className="flex items-center gap-2">
                    {obs.tittel && (
                      <h3 className="font-bold text-slate-900 text-sm">{obs.tittel}</h3>
                    )}
                    {obs.dato && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {obs.dato}
                      </span>
                    )}
                  </div>
                  {obs.fagomrade && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {obs.fagomrade}
                    </span>
                  )}
                </div>
              )}

              {/* Hovedtekst for observasjonen */}
              <p className="text-slate-700 text-sm leading-relaxed">{obs.tekst}</p>

              {/* Eventuell pedagogisk refleksjon */}
              {obs.pedagogiskRefleksjon && (
                <div className="mt-3 text-xs text-teal-900 bg-teal-50/70 p-3 rounded-lg border border-teal-100">
                  <strong className="text-teal-950 font-semibold block mb-0.5">Pedagogisk refleksjon:</strong>
                  {obs.pedagogiskRefleksjon}
                </div>
              )}

              {/* Bunn-handlinger: feks. overføre til PPT med Skjold */}
              {onNavigateToPPT && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">Taushetsbelagt pedagogisk notat</span>
                  <button
                    onClick={() => onNavigateToPPT(obs.tittel ? `${obs.tittel}: ${obs.tekst}` : obs.tekst)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 hover:bg-emerald-50 px-2.5 py-1 rounded-md transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ta med til PPT-veilederen (Skjold-vaskes)</span>
                  </button>
                </div>
              )}
              
              {/* Handlingsknapper som dukker opp ved hover (og alltid tilgjengelig på touch) */}
              <div className="absolute top-4 right-4 flex items-center gap-2 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {visning === 'aktive' ? (
                  <button 
                    onClick={() => arkiverObservasjon(obs.id)} 
                    className="p-2 text-slate-400 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-lg transition" 
                    title="Arkiver"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                ) : (
                  <button 
                    onClick={() => gjenopprettObservasjon(obs.id)} 
                    className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg transition" 
                    title="Gjenopprett til aktive"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                )}
                
                <button 
                  onClick={() => slettObservasjon(obs.id)} 
                  className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg transition" 
                  title="Slett permanent"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
            </div>
          ))
        )}
      </div>

      {/* Bekreftelsesdialog for permanent sletting */}
      {sletteKandidatId !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-scaleUp">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Slett observasjon permanent?</h4>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Er du sikker på at du vil slette denne observasjonen permanent? Handlingen kan ikke angres.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={avbrytSletting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={bekrefteSletting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition"
              >
                Ja, slett permanent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
