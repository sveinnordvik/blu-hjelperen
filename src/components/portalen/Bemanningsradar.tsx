import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  ToggleLeft, 
  ToggleRight,
  UserX, 
  UserCheck, 
  ChevronRight, 
  Plus,
  Trash2,
  Edit2,
  ArrowRightLeft,
  CalendarRange,
  RefreshCw,
  X,
  CheckCircle2,
  UserPlus
} from 'lucide-react';

interface BaseData {
  id: number;
  navn: string;
  alder: string;
  barnTilStede: number;
  voksneTilStede: number;
}

export interface VaktItem {
  id: number;
  navn: string;
  base: string;
  dag?: string;
  tid: string;
  status: string;
  farge: string;
  merknad?: string;
}

interface BemanningsradarProps {
  onNavigate?: (tab: string) => void;
}

const BASER_NAVN = ['Trollstua', 'Multemyra', 'Klatremus', 'Bjørnehiet'];

const Bemanningsradar: React.FC<BemanningsradarProps> = ({ onNavigate }) => {
  // STATE: Kjernetid-bryteren (True = mellom 09:30 og 14:30)
  const [isKjernetid, setIsKjernetid] = useState(true);
  const [redigererVakt, setRedigererVakt] = useState<VaktItem | null>(null);
  const [visVikarModal, setVisVikarModal] = useState(false);
  const [visSykdomModal, setVisSykdomModal] = useState(false);
  const [toastMelding, setToastMelding] = useState<string | null>(null);

  // MOCK-DATA: Avdelinger med sanntidstall (synket med localStorage hvis endret)
  const [baser, setBaser] = useState<BaseData[]>(() => {
    try {
      const kpBaser = localStorage.getItem('styrern_kontrollpanel_baser');
      if (kpBaser) {
        const parsed = JSON.parse(kpBaser);
        if (Array.isArray(parsed)) {
          return parsed.map((b: any) => ({
            id: b.id,
            navn: b.navn,
            alder: b.alder,
            barnTilStede: Math.round((b.kapasitet || 18) * 0.8),
            voksneTilStede: b.alder?.includes('0-3') 
              ? Math.max(1, Math.ceil(Math.round((b.kapasitet || 12) * 0.8) / 3))
              : Math.max(1, Math.ceil(Math.round((b.kapasitet || 18) * 0.8) / 6))
          }));
        }
      }
    } catch {}

    const saved = localStorage.getItem('styrern_radar_baser');
    return saved ? JSON.parse(saved) : [
      { id: 1, navn: 'Trollstua', alder: '0-3 år', barnTilStede: 9, voksneTilStede: 3 },
      { id: 2, navn: 'Multemyra', alder: '0-3 år', barnTilStede: 10, voksneTilStede: 2 },
      { id: 3, navn: 'Klatremus', alder: '3-6 år', barnTilStede: 17, voksneTilStede: 3 },
      { id: 4, navn: 'Bjørnehiet', alder: '3-6 år', barnTilStede: 12, voksneTilStede: 2 },
    ];
  });

  // MOCK-DATA: Dagens vaktplan
  const [vaktplan, setVaktplan] = useState<VaktItem[]>(() => {
    const saved = localStorage.getItem('styrern_radar_vaktplan');
    return saved ? JSON.parse(saved) : [
      { id: 1, navn: 'Ingrid Solheim', base: 'Trollstua', dag: 'Mandag', tid: '07:30 - 15:00', status: 'Til stede', farge: 'text-emerald-700 bg-emerald-50' },
      { id: 2, navn: 'Morten Hansen', base: 'Trollstua', dag: 'Mandag', tid: '08:00 - 15:30', status: 'Til stede', farge: 'text-emerald-700 bg-emerald-50' },
      { id: 3, navn: 'Fatima Al-Zahra', base: 'Multemyra', dag: 'Mandag', tid: '08:30 - 16:00', status: 'Sykemeldt', farge: 'text-rose-700 bg-rose-50' },
      { id: 4, navn: 'Lars Pettersen', base: 'Multemyra', dag: 'Mandag', tid: '08:30 - 16:00', status: 'Vikar (Til stede)', farge: 'text-blue-700 bg-blue-50' },
      { id: 5, navn: 'Camilla Vik', base: 'Klatremus', dag: 'Mandag', tid: '09:00 - 16:30', status: 'Ikke ankommet', farge: 'text-amber-700 bg-amber-50' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('styrern_radar_baser', JSON.stringify(baser));
  }, [baser]);

  useEffect(() => {
    localStorage.setItem('styrern_radar_vaktplan', JSON.stringify(vaktplan));
  }, [vaktplan]);

  const visToast = (msg: string) => {
    setToastMelding(msg);
    setTimeout(() => setToastMelding(null), 3000);
  };

  // --- DUPLIKAT-DETEKSJON ---
  const finnDuplikater = () => {
    const counts: { [key: string]: VaktItem[] } = {};
    vaktplan.forEach(v => {
      const key = `${v.navn.trim().toLowerCase()}___${v.tid.trim()}`;
      if (!counts[key]) counts[key] = [];
      counts[key].push(v);
    });
    return Object.values(counts).filter(group => group.length > 1);
  };

  const duplikatGrupper = finnDuplikater();
  const harDuplikater = duplikatGrupper.length > 0;

  const handleRensDuplikater = () => {
    const seen = new Set<string>();
    const cleaned: VaktItem[] = [];
    vaktplan.forEach(v => {
      const key = `${v.navn.trim().toLowerCase()}___${v.tid.trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        cleaned.push(v);
      }
    });
    const fjernet = vaktplan.length - cleaned.length;
    setVaktplan(cleaned);
    visToast(`Fjernet ${fjernet} dobbeltoppføring(er) for vikar/ansatt.`);
  };

  const handleSlettVakt = (id: number, navn: string) => {
    const vaktSomSlettes = vaktplan.find(v => v.id === id);
    setVaktplan(prev => prev.filter(v => v.id !== id));
    
    // Hvis vikaren slettes, juster antall voksne på den basen
    if (vaktSomSlettes && vaktSomSlettes.status.includes('Vikar')) {
      setBaser(prev => prev.map(b => 
        b.navn.toLowerCase() === vaktSomSlettes.base.toLowerCase() 
          ? { ...b, voksneTilStede: Math.max(1, b.voksneTilStede - 1) } 
          : b
      ));
    }
    visToast(`Vakt for ${navn} ble slettet.`);
  };

  const handleFlyttBase = (vaktId: number, nyBase: string) => {
    const gammelVakt = vaktplan.find(v => v.id === vaktId);
    if (!gammelVakt || gammelVakt.base === nyBase) return;

    setVaktplan(prev => prev.map(v => v.id === vaktId ? { ...v, base: nyBase } : v));

    // Oppdater voksentallene mellom basene
    setBaser(prev => prev.map(b => {
      if (b.navn.toLowerCase() === gammelVakt.base.toLowerCase()) {
        return { ...b, voksneTilStede: Math.max(0, b.voksneTilStede - 1) };
      }
      if (b.navn.toLowerCase() === nyBase.toLowerCase()) {
        return { ...b, voksneTilStede: b.voksneTilStede + 1 };
      }
      return b;
    }));

    visToast(`${gammelVakt.navn} ble flyttet til ${nyBase}. Bemanningsnormen er oppdatert!`);
  };

  // LOGIKK: Utregning av bemanningsnorm og trafikklys-status
  const beregnStatus = (base: BaseData) => {
    const divisor = base.alder === '0-3 år' ? 3 : 6;
    const kravTilVoksne = Math.ceil(base.barnTilStede / divisor);
    const mangler = kravTilVoksne - base.voksneTilStede;
    const ratio = base.voksneTilStede > 0 ? (base.barnTilStede / base.voksneTilStede).toFixed(1) : base.barnTilStede.toString();

    if (mangler <= 0) {
      return { farge: 'bg-emerald-500', tekst: 'Norm oppfylt', ikon: CheckCircle, advarsel: false, ratio: `1:${ratio}` };
    } else {
      if (isKjernetid) {
        return { farge: 'bg-rose-500', tekst: `Mangler ${mangler} voksen`, ikon: AlertTriangle, advarsel: true, ratio: `1:${ratio}` };
      } else {
        return { farge: 'bg-amber-500', tekst: `Ytterkant (Mangler ${mangler})`, ikon: Clock, advarsel: true, ratio: `1:${ratio}` };
      }
    }
  };

  return (
    <div className="space-y-8">
      
      {/* TOAST VARSEL */}
      {toastMelding && (
        <div className="fixed bottom-6 right-6 z-[200] bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-slate-700 animate-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMelding}</span>
        </div>
      )}

      {/* 1. TOPP: Tittel og Kjernetid-bryter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <Users className="text-indigo-600" size={28} />
            <span>Bemanningsradar</span>
          </h2>
          <p className="text-slate-600 mt-1">Sanntidsoversikt over bemanning i forhold til lovkrav.</p>
        </div>
        
        <div className="flex items-center space-x-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex flex-col text-right">
            <span className="text-sm font-semibold text-slate-800">Kjernetid (09:30 - 14:30)</span>
            <span className="text-xs text-slate-500">Strenge krav til norm aktivert</span>
          </div>
          <button 
            onClick={() => setIsKjernetid(!isKjernetid)}
            className="text-indigo-600 hover:text-indigo-700 transition-colors focus:outline-none cursor-pointer"
            title={isKjernetid ? 'Slå av kjernetid' : 'Slå på kjernetid'}
          >
            {isKjernetid ? <ToggleRight size={40} /> : <ToggleLeft size={40} className="text-slate-400" />}
          </button>
        </div>
      </div>

      {/* 2. RADAREN: Statuskort pr avdeling */}
      {baser.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center space-y-2">
          <p className="text-sm font-bold text-slate-800">Ingen avdelinger registrert ennå</p>
          <p className="text-xs text-slate-500">Opprett avdelinger i Kontrollpanelet for å se sanntids bemanningsberegning og normstatus.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {baser.map((base) => {
            const status = beregnStatus(base);
            const StatusIkon = status.ikon;

          return (
            <div key={base.id} className={`relative bg-white rounded-2xl border-2 overflow-hidden shadow-sm transition-all duration-300 ${status.advarsel && isKjernetid ? 'border-rose-300 shadow-rose-100' : 'border-slate-200 hover:border-indigo-300'}`}>
              
              {/* Toppstripe med fargekode (Trafikklys) */}
              <div className={`h-2 w-full ${status.farge}`}></div>
              
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{base.navn}</h3>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{base.alder}</span>
                  </div>
                  <div className={`p-2 rounded-full ${status.advarsel ? (isKjernetid ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600') : 'bg-emerald-100 text-emerald-600'}`}>
                    <StatusIkon size={20} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 p-3 rounded-xl flex flex-col items-center justify-center border border-slate-100">
                    <span className="text-2xl font-bold text-slate-800">{base.barnTilStede}</span>
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Barn</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl flex flex-col items-center justify-center border border-slate-100">
                    <span className="text-2xl font-bold text-slate-800">{base.voksneTilStede}</span>
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Voksne</span>
                  </div>
                </div>

                <div className={`flex items-center justify-between p-3 rounded-xl border ${status.advarsel ? (isKjernetid ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200') : 'bg-emerald-50 border-emerald-200'}`}>
                  <span className={`text-sm font-semibold ${status.advarsel ? (isKjernetid ? 'text-rose-700' : 'text-amber-700') : 'text-emerald-700'}`}>
                    {status.tekst}
                  </span>
                  <span className={`text-sm font-bold ${status.advarsel ? (isKjernetid ? 'text-rose-700' : 'text-amber-700') : 'text-emerald-700'}`}>
                    {status.ratio}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* 3. VARSEL VED DOBBELTOPPFØRING (LARS PETTERSEN FLERE GANGER) */}
      {harDuplikater && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="font-bold text-amber-950 text-sm">
                Dobbeltoppføring oppdaget i vaktplanen!
              </h4>
              <p className="text-amber-800 text-xs mt-0.5">
                Samme person (f.eks. vikar) er registrert flere ganger på samme tidspunkt. 
                Rens opp for å sikre nøyaktig bemanningsberegning.
              </p>
            </div>
          </div>
          <button
            onClick={handleRensDuplikater}
            className="shrink-0 flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Slett dobbeltoppføringer</span>
          </button>
        </div>
      )}

      {/* 4. VAKTPLAN OG SYKEFRAVÆR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center bg-slate-50 gap-3">
          <div className="flex items-center space-x-3">
            <Clock size={20} className="text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-800">
              Dagens Vaktplan & Turnus
            </h3>
            {onNavigate && (
              <button
                onClick={() => onNavigate('vaktliste')}
                className="hidden sm:flex items-center space-x-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                <CalendarRange size={13} />
                <span>Åpne full turnusplan</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setVisSykdomModal(true)}
              className="text-xs bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-50 font-bold transition cursor-pointer"
            >
              Registrer sykefravær
            </button>
            <button 
              onClick={() => setVisVikarModal(true)}
              className="text-xs bg-indigo-600 text-white px-3.5 py-2 rounded-xl hover:bg-indigo-700 font-bold flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
            >
              <UserPlus size={14} />
              <span>Hent inn vikar</span>
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-slate-200 text-slate-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4">Ansatt</th>
                <th className="px-6 py-4">Avdeling (Flytt)</th>
                <th className="px-6 py-4">Arbeidstid</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Handlinger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vaktplan.map((vakt) => {
                const erDuplikat = vaktplan.filter(other => 
                  other.id !== vakt.id && 
                  other.navn.trim().toLowerCase() === vakt.navn.trim().toLowerCase() && 
                  other.tid.trim() === vakt.tid.trim()
                ).length > 0;

                return (
                  <tr key={vakt.id} className={`transition-colors ${erDuplikat ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}>
                    
                    {/* ANSATT */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${vakt.farge}`}>
                          {vakt.navn.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-800">{vakt.navn}</span>
                            {erDuplikat && (
                              <span className="bg-rose-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                                Duplikat
                              </span>
                            )}
                          </div>
                          {vakt.merknad && <span className="text-[11px] text-slate-400 block">{vakt.merknad}</span>}
                        </div>
                      </div>
                    </td>

                    {/* AVDELING MED HURTIG-FLYTT DROPDOWN */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5">
                        <select
                          value={vakt.base}
                          onChange={(e) => handleFlyttBase(vakt.id, e.target.value)}
                          className="bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 text-xs font-semibold px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          title="Flytt ansatt til en annen avdeling"
                        >
                          {BASER_NAVN.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* ARBEIDSTID */}
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs font-semibold">
                      {vakt.tid}
                    </td>

                    {/* STATUS */}
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 ${vakt.farge}`}>
                        {vakt.status === 'Sykemeldt' || vakt.status === 'Ikke ankommet' ? <UserX size={13} /> : <UserCheck size={13} />}
                        <span>{vakt.status}</span>
                      </span>
                    </td>

                    {/* STYRER HANDLINGER */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setRedigererVakt(vakt)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          title="Endre vakt og arbeidstid"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleSlettVakt(vakt.id, vakt.navn)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title={erDuplikat ? "Slett denne duplikaten" : "Slett vakt"}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: REDIGER VAKT */}
      {redigererVakt && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800">Endre vakt for {redigererVakt.navn}</h4>
              <button onClick={() => setRedigererVakt(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Arbeidstid</label>
                <input 
                  type="text" 
                  value={redigererVakt.tid} 
                  onChange={(e) => setRedigererVakt({ ...redigererVakt, tid: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Avdeling (Base)</label>
                <select
                  value={redigererVakt.base}
                  onChange={(e) => setRedigererVakt({ ...redigererVakt, base: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  {BASER_NAVN.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={redigererVakt.status}
                  onChange={(e) => setRedigererVakt({ ...redigererVakt, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="Til stede">Til stede</option>
                  <option value="Vikar (Til stede)">Vikar (Til stede)</option>
                  <option value="Sykemeldt">Sykemeldt</option>
                  <option value="Ikke ankommet">Ikke ankommet</option>
                  <option value="Avspasering">Avspasering</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button 
                onClick={() => setRedigererVakt(null)} 
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Avbryt
              </button>
              <button 
                onClick={() => {
                  setVaktplan(prev => prev.map(v => v.id === redigererVakt.id ? redigererVakt : v));
                  setRedigererVakt(null);
                  visToast('Vakten ble oppdatert!');
                }} 
                className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs cursor-pointer"
              >
                Lagre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HENT INN VIKAR */}
      {visVikarModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <UserPlus size={18} className="text-blue-600" />
                <h4 className="font-bold text-slate-800 text-base">Hent inn vikar</h4>
              </div>
              <button onClick={() => setVisVikarModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const navn = (form.elements.namedItem('navn') as HTMLSelectElement).value;
              const base = (form.elements.namedItem('base') as HTMLSelectElement).value;
              const tid = (form.elements.namedItem('tid') as HTMLInputElement).value;

              // DOBBELTOPPFØRINGSSJEKK:
              const alleredeSattOpp = vaktplan.find(v => v.navn.toLowerCase() === navn.toLowerCase() && v.tid === tid);
              if (alleredeSattOpp) {
                if (!confirm(`⚠️ OBS: ${navn} er allerede registrert på ${alleredeSattOpp.base} kl ${tid}! Vil du opprette en dobbeltoppføring?`)) {
                  return;
                }
              }

              setVaktplan(prev => [
                ...prev,
                {
                  id: Date.now(),
                  navn,
                  base,
                  dag: 'Mandag',
                  tid,
                  status: 'Vikar (Til stede)',
                  farge: 'text-blue-700 bg-blue-50'
                }
              ]);

              setBaser(prev => prev.map(b => b.navn.toLowerCase() === base.toLowerCase() ? { ...b, voksneTilStede: b.voksneTilStede + 1 } : b));
              setVisVikarModal(false);
              visToast(`Vikar ${navn} satt inn på ${base}!`);
            }} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Velg godkjent vikar</label>
                <select name="navn" className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold">
                  <option value="Lars Pettersen">Lars Pettersen (Godkjent rammeavtale)</option>
                  <option value="Jonas Lie">Jonas Lie (Tilkallingsvikar)</option>
                  <option value="Sara Amundsen">Sara Amundsen (Student)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Avdeling</label>
                <select name="base" className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold">
                  {BASER_NAVN.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Arbeidstid</label>
                <input name="tid" defaultValue="08:30 - 16:00" className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono" />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setVisVikarModal(false)} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                  Avbryt
                </button>
                <button type="submit" className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs cursor-pointer">
                  Tildel vikar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRER SYDOM */}
      {visSykdomModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-base">Registrer sykefravær</h4>
              <button onClick={() => setVisSykdomModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const navn = (form.elements.namedItem('navn') as HTMLInputElement).value;
              const base = (form.elements.namedItem('base') as HTMLSelectElement).value;

              setVaktplan(prev => [
                ...prev,
                {
                  id: Date.now(),
                  navn,
                  base,
                  dag: 'Mandag',
                  tid: '08:00 - 15:30',
                  status: 'Sykemeldt',
                  farge: 'text-rose-700 bg-rose-50'
                }
              ]);

              setVisSykdomModal(false);
              visToast(`Sykdom registrert for ${navn}.`);
            }} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Navn på ansatt</label>
                <input name="navn" placeholder="F.eks. Fatima Al-Zahra" required className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Avdeling</label>
                <select name="base" className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold">
                  {BASER_NAVN.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setVisSykdomModal(false)} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                  Avbryt
                </button>
                <button type="submit" className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs cursor-pointer">
                  Lagre fravær
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Bemanningsradar;
