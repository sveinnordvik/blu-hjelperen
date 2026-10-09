import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  ArrowRight, 
  Sparkles, 
  BookOpen, 
  Leaf, 
  Sun, 
  Coffee, 
  Utensils, 
  Users, 
  Printer, 
  RotateCcw, 
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';
import { 
  getStoredDagsrytme, 
  getFullstendigDagsplanForDag, 
  DagsrytmeSlot, 
  FullstendigDagsrytmeElement
} from '../../lib/pedagogiskPlattform';

interface DagensDagsrytmeAvdelingProps {
  avdelingNavn?: string;
  onNavigateToUkeplan?: () => void;
  onFagomradeDetected?: (fagomrade: string, detaljer: string) => void;
}

const UKEDAGER = [
  { dagNum: 1, navn: 'Mandag', kortNavn: 'Man', erTur: false },
  { dagNum: 2, navn: 'Tirsdag', kortNavn: 'Tir', erTur: false },
  { dagNum: 3, navn: 'Onsdag', kortNavn: 'Ons', erTur: false },
  { dagNum: 4, navn: 'Torsdag', kortNavn: 'Tor', erTur: false },
  { dagNum: 5, navn: 'Fredag (Tur)', kortNavn: 'Fre (Tur)', erTur: true },
];

export default function DagensDagsrytmeAvdeling({
  avdelingNavn = 'Blåbærtua',
  onNavigateToUkeplan,
  onFagomradeDetected
}: DagensDagsrytmeAvdelingProps) {
  // Bestem dagens ukedag (1-5, med Mandag som standard i helgen)
  const initialDag = useMemo(() => {
    const d = new Date().getDay();
    if (d >= 1 && d <= 5) return d;
    return 1;
  }, []);

  const [valgtDagNum, setValgtDagNum] = useState<number>(initialDag);

  // Hent lagrede data fra Ukeplanen
  const [ukeTittel, setUkeTittel] = useState<string>(() => {
    return localStorage.getItem('didaktisk_uke_tittel') || 'Uke 4 (Vinter)';
  });

  const [dagsrytmeSlots, setDagsrytmeSlots] = useState<DagsrytmeSlot[]>(() => {
    return getStoredDagsrytme();
  });

  const [plasserteAktiviteter, setPlasserteAktiviteter] = useState<Record<string, any[]>>(() => {
    try {
      const saved = localStorage.getItem('didaktisk_planlegger_grid');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // Gjennomførte økter for dagen (sjekkliste for avdelingens voksne)
  const [fullforteOkter, setFullforteOkter] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`pedportalen_fullforte_dag_${valgtDagNum}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [apneDetaljer, setApneDetaljer] = useState<Record<string, boolean>>({});

  // Lytt til oppdateringer fra DidaktiskPlanlegger og dagsrytmen
  useEffect(() => {
    const handleGridUpdate = (e: any) => {
      if (e?.detail) {
        if (e.detail.grid) setPlasserteAktiviteter(e.detail.grid);
        if (e.detail.slots) setDagsrytmeSlots(e.detail.slots);
        if (e.detail.ukeTittel) setUkeTittel(e.detail.ukeTittel);
      }
    };

    const handleSlotsUpdate = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setDagsrytmeSlots(e.detail);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'didaktisk_planlegger_grid' && e.newValue) {
        try { setPlasserteAktiviteter(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === 'didaktisk_egendefinert_dagsrytme' && e.newValue) {
        try { setDagsrytmeSlots(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === 'didaktisk_uke_tittel' && e.newValue) {
        setUkeTittel(e.newValue);
      }
    };

    window.addEventListener('didaktisk_planlegger_grid_updated', handleGridUpdate);
    window.addEventListener('pedportalen_dagsrytme_updated', handleSlotsUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('didaktisk_planlegger_grid_updated', handleGridUpdate);
      window.removeEventListener('pedportalen_dagsrytme_updated', handleSlotsUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Last lagrede fullførte økter når valgt dag endres
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`pedportalen_fullforte_dag_${valgtDagNum}`);
      if (saved) {
        setFullforteOkter(JSON.parse(saved));
      } else {
        setFullforteOkter({});
      }
    } catch {
      setFullforteOkter({});
    }
  }, [valgtDagNum]);

  // Lagre fullførte økter
  const toggleFullfort = (elementId: string) => {
    setFullforteOkter(prev => {
      const oppdatert = { ...prev, [elementId]: !prev[elementId] };
      try {
        localStorage.setItem(`pedportalen_fullforte_dag_${valgtDagNum}`, JSON.stringify(oppdatert));
      } catch {}
      return oppdatert;
    });
  };

  const handleNullstillFullforte = () => {
    setFullforteOkter({});
    try {
      localStorage.removeItem(`pedportalen_fullforte_dag_${valgtDagNum}`);
    } catch {}
  };

  // Generer fullstendig dagsplan for valgt dag
  const fullstendigDagsplan = useMemo(() => {
    return getFullstendigDagsplanForDag(valgtDagNum, plasserteAktiviteter, dagsrytmeSlots);
  }, [valgtDagNum, plasserteAktiviteter, dagsrytmeSlots]);

  // Tell statistikk
  const totalOkter = fullstendigDagsplan.length;
  const fullforteAntall = fullstendigDagsplan.filter(e => fullforteOkter[e.id]).length;
  const planlagteAktiviteterAntall = fullstendigDagsplan.reduce(
    (acc, cur) => acc + cur.plasserteAktiviteter.length, 
    0
  );

  // Stabil ref for onFagomradeDetected for å hindre uendelig re-render-løkke
  const onFagomradeDetectedRef = useRef(onFagomradeDetected);
  useEffect(() => {
    onFagomradeDetectedRef.current = onFagomradeDetected;
  }, [onFagomradeDetected]);

  const lastEmittedRef = useRef<{ fag: string; detalj: string } | null>(null);

  // Send fagområde-oppdatering til foreldre-komponenten kun når det er reell endring
  useEffect(() => {
    const alleKort = fullstendigDagsplan.flatMap(e => e.plasserteAktiviteter);
    if (alleKort.length > 0 && onFagomradeDetectedRef.current) {
      const hovedKort = alleKort[0];
      const kilde = hovedKort.kilde || '';
      let fagomrade = 'Natur, miljø og teknologi';
      if (kilde.includes('Språkløyper') || (hovedKort.tittel && hovedKort.tittel.toLowerCase().includes('språk'))) {
        fagomrade = 'Kommunikasjon, språk og tekst';
      } else if (kilde.includes('Matematikk') || (hovedKort.tittel && hovedKort.tittel.toLowerCase().includes('tall'))) {
        fagomrade = 'Antall, rom og form';
      } else if (kilde.includes('Voksne') || (hovedKort.tittel && hovedKort.tittel.toLowerCase().includes('venn'))) {
        fagomrade = 'Nærmiljø og samfunn';
      }
      const nyDetalj = `${hovedKort.tittel || ''} (${kilde})`;
      
      if (!lastEmittedRef.current || lastEmittedRef.current.fag !== fagomrade || lastEmittedRef.current.detalj !== nyDetalj) {
        lastEmittedRef.current = { fag: fagomrade, detalj: nyDetalj };
        onFagomradeDetectedRef.current(fagomrade, nyDetalj);
      }
    }
  }, [fullstendigDagsplan]);

  const valgtDagInfo = UKEDAGER.find(d => d.dagNum === valgtDagNum) || UKEDAGER[0];
  const erIdag = valgtDagNum === initialDag;

  const toggleDetaljer = (id: string) => {
    setApneDetaljer(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      {/* Toppseksjon med tittel, ukeplan-status og handlinger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-600" />
              Dagens Dagsrytme på {avdelingNavn}
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              Fullstendig dag
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>Synkronisert med ukeplan:</span>
            <span className="font-semibold text-slate-700 underline decoration-teal-300">
              {ukeTittel}
            </span>
            <span>•</span>
            <span className="font-medium text-emerald-700">
              {planlagteAktiviteterAntall} planlagte aktiviteter i dag
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrint}
            title="Skriv ut dagsplan for avdelingens oppslagstavle"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Skriv ut dagsplan</span>
          </button>

          {onNavigateToUkeplan && (
            <button
              onClick={onNavigateToUkeplan}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>Gå til Ukeplan</span>
              <ArrowRight className="w-3 h-3 text-teal-600" />
            </button>
          )}
        </div>
      </div>

      {/* Ukedagsvelger (Mandag - Fredag) */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
          {UKEDAGER.map(dag => {
            const erAktiv = dag.dagNum === valgtDagNum;
            const erIdagDag = dag.dagNum === initialDag;
            return (
              <button
                key={`dag-btn-${dag.dagNum}`}
                onClick={() => setValgtDagNum(dag.dagNum)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  erAktiv
                    ? 'bg-white text-teal-900 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span>{dag.navn}</span>
                {erIdagDag && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold uppercase tracking-wider">
                    I dag
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Fremdriftsindikator for avdelingen */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Gjennomført:</span>
            <span className="font-bold text-teal-700">{fullforteAntall} / {totalOkter}</span>
          </div>
          {fullforteAntall > 0 && (
            <button
              onClick={handleNullstillFullforte}
              title="Nullstill avkrysninger for i dag"
              className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Nullstill</span>
            </button>
          )}
        </div>
      </div>

      {/* Tidslinje for fullstendig dagsrytme */}
      <div className="mt-5 space-y-3">
        {fullstendigDagsplan.map((element) => {
          const erFullfort = Boolean(fullforteOkter[element.id]);
          const harKort = element.plasserteAktiviteter.length > 0;
          const erApen = Boolean(apneDetaljer[element.id]);

          // Fargeprofil og ikon etter kategori
          let bgClass = 'bg-slate-50 border-slate-100 text-slate-900';
          let timeBadgeClass = 'text-teal-800 bg-teal-50 border-teal-100';

          if (element.kategori === 'morgen') {
            bgClass = 'bg-amber-50/40 border-amber-100/70 text-slate-900';
            timeBadgeClass = 'text-amber-800 bg-amber-100/60 border-amber-200';
          } else if (element.kategori === 'frokost' || element.kategori === 'lunsj') {
            bgClass = 'bg-teal-50/50 border-teal-100 text-slate-900';
            timeBadgeClass = 'text-teal-900 bg-teal-100/80 border-teal-200';
          } else if (element.kategori === 'utetid') {
            bgClass = 'bg-emerald-50/50 border-emerald-100 text-slate-900';
            timeBadgeClass = 'text-emerald-900 bg-emerald-100/80 border-emerald-200';
          } else if (element.kategori === 'frukt') {
            bgClass = 'bg-orange-50/40 border-orange-100/70 text-slate-900';
            timeBadgeClass = 'text-orange-900 bg-orange-100/60 border-orange-200';
          } else if (element.kategori === 'refleksjon') {
            bgClass = 'bg-indigo-50/40 border-indigo-100/70 text-slate-900';
            timeBadgeClass = 'text-indigo-900 bg-indigo-100/60 border-indigo-200';
          } else if (harKort) {
            bgClass = 'bg-emerald-50/70 border-emerald-200 shadow-xs text-slate-900';
            timeBadgeClass = 'text-emerald-950 bg-emerald-200 border-emerald-300 font-extrabold';
          }

          return (
            <div
              key={element.id}
              className={`rounded-xl border p-3.5 transition-all ${bgClass} ${
                erFullfort ? 'opacity-60 bg-slate-50/80 border-slate-200' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Avkrysningsknapp for gjennomført */}
                  <button
                    onClick={() => toggleFullfort(element.id)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-600 transition shrink-0 cursor-pointer"
                    title={erFullfort ? 'Merk som ikke gjennomført' : 'Merk som gjennomført'}
                  >
                    {erFullfort ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                    )}
                  </button>

                  {/* Tidspunkt-badge */}
                  <div className={`text-xs font-black px-2.5 py-1 rounded-lg border shrink-0 text-center min-w-[5.8rem] ${timeBadgeClass}`}>
                    {element.tid}
                  </div>

                  {/* Innhold / tittel */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className={`text-xs block font-bold ${erFullfort ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {element.tittel}
                      </strong>

                      {/* Merkelapper */}
                      {element.erFastRutine && (
                        <span className="text-[10px] text-slate-500 bg-white/80 border border-slate-200 px-1.5 py-0.2 rounded font-medium">
                          Fellesrutine
                        </span>
                      )}

                      {harKort && (
                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Fra Ukeplan ({element.plasserteAktiviteter.length})</span>
                        </span>
                      )}
                    </div>

                    {element.undertekst && !harKort && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {element.undertekst}
                      </p>
                    )}

                    {/* Vis plasserte aktiviteter fra ukeplanen hvis tilstede */}
                    {harKort && (
                      <div className="mt-2 space-y-2">
                        {element.plasserteAktiviteter.map((akt, aktIdx) => {
                          const erHoved = akt.type === 'hoved';
                          const erGjenkalling = akt.type === 'gjenkalling';
                          
                          return (
                            <div 
                              key={`dagsplan-akt-${akt.id || aktIdx}`}
                              className={`p-2.5 rounded-lg border text-xs ${
                                erHoved 
                                  ? 'bg-white border-emerald-200 text-emerald-950 shadow-xs' 
                                  : erGjenkalling
                                  ? 'bg-white border-indigo-200 text-indigo-950 shadow-xs'
                                  : 'bg-white border-amber-200 text-amber-950 shadow-xs'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-extrabold text-xs">
                                      {akt.tittel}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                      erHoved 
                                        ? 'bg-emerald-100 text-emerald-800' 
                                        : erGjenkalling
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {erHoved ? 'Hovedaktivitet' : erGjenkalling ? 'Gjenkalling (PLAGG)' : 'Fagdrypp'}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      Kilde: {akt.kilde}
                                    </span>
                                  </div>

                                  {akt.beskrivelse && (
                                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                                      {akt.beskrivelse}
                                    </p>
                                  )}

                                  {/* Tilleggsinformasjon hvis åpnet eller tilstede */}
                                  {erApen && (
                                    <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
                                      {akt.hvorfor && (
                                        <div>
                                          <span className="font-bold text-slate-700">Rammeplan / Hvorfor: </span>
                                          {akt.hvorfor}
                                        </div>
                                      )}
                                      {akt.plaggFokus && (
                                        <div>
                                          <span className="font-bold text-indigo-700">PLAGG-fokus: </span>
                                          {akt.plaggFokus}
                                        </div>
                                      )}
                                      {akt.begrepslaering && (
                                        <div>
                                          <span className="font-bold text-teal-700">Begrepslæring: </span>
                                          {akt.begrepslaering}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={() => toggleDetaljer(element.id)}
                                  className="text-[10px] text-teal-700 hover:text-teal-900 font-bold shrink-0 underline"
                                >
                                  {erApen ? 'Skjul' : 'Detaljer'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bunntekst med didaktisk råd og kobling */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-teal-600" />
          <span>Dagsrytmen gir forutsigbare rammer for barna, og fleksibilitet for med-undrende pedagoger.</span>
        </div>
        {onNavigateToUkeplan && (
          <button
            onClick={onNavigateToUkeplan}
            className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Tilpass tidspunkter i Ukeplanen</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
