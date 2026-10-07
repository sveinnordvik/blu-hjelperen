import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  ShieldCheck, 
  Activity, 
  Droplets, 
  Flame, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Search,
  Filter,
  Plus,
  Check,
  X
} from 'lucide-react';
import AnsattKort, { AnsattKravData } from './AnsattKort';

interface KravStatus {
  status: 'Godkjent' | 'Gyldig' | 'Utløper snart' | 'Mangler' | 'Utløpt' | 'Ikke påkrevd';
  dato: string;
}

interface AnsattKompetanse {
  id: number;
  navn: string;
  rolle: string;
  politiattest: KravStatus;
  forstehjelp: KravStatus;
  livredning: KravStatus;
  brannvern: KravStatus;
}

interface KompetanseMatriseProps {
  onNavigate?: (tab: string) => void;
}

const KompetanseMatrise: React.FC<KompetanseMatriseProps> = ({ onNavigate }) => {
  // MOCK-DATA: Ansatte og deres kompetansestatus (med LocalStorage støtte)
  const [ansatte, setAnsatte] = useState<AnsattKompetanse[]>(() => {
    const saved = localStorage.getItem('styrern_kompetanse_ansatte');
    return saved ? JSON.parse(saved) : [
      { 
        id: 1, 
        navn: 'Ingrid Solheim', 
        rolle: 'Pedagogisk leder', 
        politiattest: { status: 'Godkjent', dato: '15.08.2023' },
        forstehjelp: { status: 'Gyldig', dato: 'Gyldig til: Mai 2027' },
        livredning: { status: 'Gyldig', dato: 'Gyldig til: Jun 2027' },
        brannvern: { status: 'Utløper snart', dato: 'Utløper: Nov 2026' }
      },
      { 
        id: 2, 
        navn: 'Morten Hansen', 
        rolle: 'Assistent', 
        politiattest: { status: 'Godkjent', dato: '01.09.2024' },
        forstehjelp: { status: 'Utløpt', dato: 'Utløp: Aug 2026' },
        livredning: { status: 'Ikke påkrevd', dato: '-' },
        brannvern: { status: 'Gyldig', dato: 'Gyldig til: Okt 2027' }
      },
      { 
        id: 3, 
        navn: 'Lars Pettersen', 
        rolle: 'Vikar', 
        politiattest: { status: 'Mangler', dato: 'Venter på svar' },
        forstehjelp: { status: 'Mangler', dato: 'Må gjennomføres' },
        livredning: { status: 'Ikke påkrevd', dato: '-' },
        brannvern: { status: 'Utløpt', dato: 'Utløp: Sep 2026' }
      },
      { 
        id: 4, 
        navn: 'Fatima Al-Zahra', 
        rolle: 'Fagarbeider', 
        politiattest: { status: 'Godkjent', dato: '10.01.2022' },
        forstehjelp: { status: 'Gyldig', dato: 'Gyldig til: Mar 2027' },
        livredning: { status: 'Utløper snart', dato: 'Utløper: Des 2026' },
        brannvern: { status: 'Gyldig', dato: 'Gyldig til: Jan 2028' }
      },
      { 
        id: 5, 
        navn: 'Kari Nordmann', 
        rolle: 'Pedagogisk leder', 
        politiattest: { status: 'Godkjent', dato: '12.04.2024' },
        forstehjelp: { status: 'Gyldig', dato: 'Gyldig til: Jan 2028' },
        livredning: { status: 'Gyldig', dato: 'Gyldig til: Mai 2027' },
        brannvern: { status: 'Gyldig', dato: 'Gyldig til: Sep 2027' }
      }
    ];
  });

  const [sokTekst, setSokTekst] = useState('');
  const [filterType, setFilterType] = useState<'alle' | 'kritiske' | 'utloper'>('alle');
  const [valgtAnsattKort, setValgtAnsattKort] = useState<AnsattKravData | null>(null);

  useEffect(() => {
    localStorage.setItem('styrern_kompetanse_ansatte', JSON.stringify(ansatte));
  }, [ansatte]);

  // Beregner antall mangler dynamisk
  const harKritiskMangel = (ansatt: AnsattKompetanse) => {
    return [ansatt.politiattest, ansatt.forstehjelp, ansatt.livredning, ansatt.brannvern].some(
      k => k.status === 'Mangler' || k.status === 'Utløpt'
    );
  };

  const harUtloperSnart = (ansatt: AnsattKompetanse) => {
    return [ansatt.politiattest, ansatt.forstehjelp, ansatt.livredning, ansatt.brannvern].some(
      k => k.status === 'Utløper snart'
    );
  };

  let totalKritiske = 0;
  let totalUtloper = 0;
  ansatte.forEach(a => {
    [a.politiattest, a.forstehjelp, a.livredning, a.brannvern].forEach(k => {
      if (k.status === 'Mangler' || k.status === 'Utløpt') totalKritiske++;
      if (k.status === 'Utløper snart') totalUtloper++;
    });
  });

  const filtrerteAnsatte = ansatte.filter(a => {
    const matcherSok = a.navn.toLowerCase().includes(sokTekst.toLowerCase()) || 
                      a.rolle.toLowerCase().includes(sokTekst.toLowerCase());
    if (!matcherSok) return false;

    if (filterType === 'kritiske') return harKritiskMangel(a);
    if (filterType === 'utloper') return harUtloperSnart(a);
    return true;
  });

  // Interaktiv statusendring ved klikk (f.eks. etter gjennomført kurs)
  const oppdaterKravStatus = (
    ansattId: number, 
    felt: 'politiattest' | 'forstehjelp' | 'livredning' | 'brannvern'
  ) => {
    const nyttValg = prompt(
      `Endre status for ${felt.toUpperCase()}:\n1: Gyldig / Godkjent\n2: Utløper snart\n3: Utløpt / Mangler\n4: Ikke påkrevd`,
      '1'
    );

    if (!nyttValg) return;

    let nyStatus: KravStatus['status'] = 'Gyldig';
    let nyDato = 'Fornyet i dag';

    if (nyttValg === '1') {
      nyStatus = felt === 'politiattest' ? 'Godkjent' : 'Gyldig';
      nyDato = felt === 'politiattest' ? new Date().toLocaleDateString('no-NO') : 'Gyldig til: 2028';
    } else if (nyttValg === '2') {
      nyStatus = 'Utløper snart';
      nyDato = 'Utløper om 30 dager';
    } else if (nyttValg === '3') {
      nyStatus = felt === 'politiattest' ? 'Mangler' : 'Utløpt';
      nyDato = 'Må fornyes';
    } else if (nyttValg === '4') {
      nyStatus = 'Ikke påkrevd';
      nyDato = '-';
    }

    setAnsatte(prev => prev.map(a => {
      if (a.id === ansattId) {
        return {
          ...a,
          [felt]: { status: nyStatus, dato: nyDato }
        };
      }
      return a;
    }));
  };

  // Hjelpefunksjon for å tegne riktig badge basert på status
  const renderBadge = (krav: KravStatus, ansattId: number, felt: 'politiattest' | 'forstehjelp' | 'livredning' | 'brannvern') => {
    let farge = '';
    let Ikon = null;

    switch (krav.status) {
      case 'Godkjent':
      case 'Gyldig':
        farge = 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70';
        Ikon = CheckCircle2;
        break;
      case 'Utløper snart':
        farge = 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100/70';
        Ikon = Clock;
        break;
      case 'Mangler':
      case 'Utløpt':
        farge = 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100/70';
        Ikon = AlertTriangle;
        break;
      case 'Ikke påkrevd':
        farge = 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100/70';
        Ikon = null;
        break;
      default:
        farge = 'bg-slate-50 border-slate-200 text-slate-500';
    }

    return (
      <button 
        onClick={() => oppdaterKravStatus(ansattId, felt)}
        className={`w-full text-left flex flex-col items-start p-2.5 rounded-lg border transition cursor-pointer ${farge}`}
        title="Klikk for å oppdatere status eller registrere fornyelse"
      >
        <div className="flex items-center space-x-1.5 font-semibold text-sm">
          {Ikon && <Ikon size={14} />}
          <span>{krav.status}</span>
        </div>
        <span className="text-[11px] mt-1 opacity-80 font-medium tracking-wide">
          {krav.dato}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 1. TOPP: Tittel og Hurtigoversikt */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <GraduationCap className="text-indigo-600" size={28} />
            <span>Kompetanse- & Kravmatrise</span>
          </h2>
          <p className="text-slate-600 mt-1">Automatisk varsling av utløpte kurs og manglende attester.</p>
        </div>
        
        {/* Smarte varsel-piller */}
        <div className="flex space-x-3">
          <button 
            onClick={() => setFilterType(filterType === 'kritiske' ? 'alle' : 'kritiske')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-semibold shadow-sm transition border cursor-pointer ${
              filterType === 'kritiske'
                ? 'bg-rose-600 text-white border-rose-700'
                : 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle size={16} />
            <span>{totalKritiske} kritiske mangler</span>
          </button>
          
          <button 
            onClick={() => setFilterType(filterType === 'utloper' ? 'alle' : 'utloper')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-semibold shadow-sm transition border cursor-pointer ${
              filterType === 'utloper'
                ? 'bg-amber-600 text-white border-amber-700'
                : 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <Clock size={16} />
            <span>{totalUtloper} utløper snart</span>
          </button>
        </div>
      </div>

      {/* 2. SØK OG FILTER */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            value={sokTekst}
            onChange={(e) => setSokTekst(e.target.value)}
            placeholder="Søk etter ansatt eller rolle..." 
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-white"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium">Filter:</span>
          {(['alle', 'kritiske', 'utloper'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                filterType === type 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {type === 'alle' ? 'Alle ansatte' : type === 'kritiske' ? 'Kun mangler' : 'Utløper snart'}
            </button>
          ))}
        </div>
      </div>

      {/* 3. HOVEDMATRISEN (Tabell) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-700 text-sm">Ansatt</th>
                
                <th className="px-4 py-4 font-semibold text-slate-700 text-sm">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck size={16} className="text-slate-400" />
                    <span>Politiattest (§ 30)</span>
                  </div>
                </th>
                
                <th className="px-4 py-4 font-semibold text-slate-700 text-sm">
                  <div className="flex items-center space-x-2">
                    <Activity size={16} className="text-slate-400" />
                    <span>Førstehjelp</span>
                  </div>
                </th>
                
                <th className="px-4 py-4 font-semibold text-slate-700 text-sm">
                  <div className="flex items-center space-x-2">
                    <Droplets size={16} className="text-slate-400" />
                    <span>Livredning i vann</span>
                  </div>
                </th>
                
                <th className="px-4 py-4 font-semibold text-slate-700 text-sm">
                  <div className="flex items-center space-x-2">
                    <Flame size={16} className="text-slate-400" />
                    <span>Brannvern</span>
                  </div>
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100">
              {filtrerteAnsatte.map((ansatt) => (
                <tr key={ansatt.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div 
                      onClick={() => {
                        setValgtAnsattKort({
                          navn: ansatt.navn,
                          rolle: ansatt.rolle,
                          base: ansatt.navn === 'Lars Pettersen' ? 'Flytende' : 'Trollstua',
                          ansattDato: '01. okt 2026',
                          politiattest: { 
                            godkjent: ansatt.politiattest.status === 'Godkjent', 
                            datoFremvist: ansatt.politiattest.dato 
                          },
                          arbeidskontrakt: { 
                            godkjent: true, 
                            info: 'Signert elektronisk 28. sep 2026' 
                          },
                          taushetserklaring: { 
                            godkjent: true, 
                            info: 'Signert 28. sep 2026' 
                          },
                          hmsGjennomgang: { 
                            godkjent: ansatt.brannvern.status === 'Gyldig', 
                            info: ansatt.brannvern.status === 'Gyldig' ? 'Gjennomført og godkjent' : 'Mangler gjennomgang av branninstruks' 
                          }
                        });
                      }}
                      className="flex flex-col cursor-pointer group"
                      title="Klikk for å åpne ansattkort og compliance-status"
                    >
                      <span className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors underline decoration-dotted decoration-slate-300 group-hover:decoration-indigo-500">
                        {ansatt.navn}
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5 font-medium">{ansatt.rolle} • Se ansattkort</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    {renderBadge(ansatt.politiattest, ansatt.id, 'politiattest')}
                  </td>
                  <td className="px-4 py-4 align-top">
                    {renderBadge(ansatt.forstehjelp, ansatt.id, 'forstehjelp')}
                  </td>
                  <td className="px-4 py-4 align-top">
                    {renderBadge(ansatt.livredning, ansatt.id, 'livredning')}
                  </td>
                  <td className="px-4 py-4 align-top">
                    {renderBadge(ansatt.brannvern, ansatt.id, 'brannvern')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtrerteAnsatte.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            <CheckCircle2 size={36} className="mx-auto text-emerald-400 mb-2" />
            <p className="font-semibold text-slate-600">Ingen ansatte matcher gjeldende filter.</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center justify-between">
        <span>💡 Tips: Klikk på en status-rute for å oppdatere bekreftelse eller registrere gjennomført fornyelseskurs.</span>
        <span className="font-semibold text-indigo-700">Oppfyller Barnehagelovens krav til internkontroll</span>
      </div>

      {/* Modal for AnsattKort */}
      {valgtAnsattKort && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <AnsattKort 
              initialAnsatt={valgtAnsattKort} 
              onClose={() => setValgtAnsattKort(null)}
              onSaved={(oppdatert) => {
                setAnsatte(prev => prev.map(a => {
                  if (a.navn === oppdatert.navn) {
                    return {
                      ...a,
                      politiattest: {
                        status: oppdatert.politiattest.godkjent ? 'Godkjent' : 'Mangler',
                        dato: oppdatert.politiattest.datoFremvist || 'Mangler attest'
                      }
                    };
                  }
                  return a;
                }));
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default KompetanseMatrise;
