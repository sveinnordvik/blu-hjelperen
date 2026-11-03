import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Users, 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  Clock,
  CheckCircle2,
  X,
  UserCheck,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Shield
} from 'lucide-react';
import { useRole, Role } from '../../context/RoleContext';
import { LegalModal } from '../common/LegalModal';
import { useNavigate } from 'react-router-dom';

interface Ansatt {
  id: number;
  navn: string;
  rolle: string;
  base: string;
  prosent: number;
}

interface BaseItem {
  id: number;
  navn: string;
  alder: string;
  kapasitet: number;
  norm: string;
}

const DEFAULT_DEMO_BASER: BaseItem[] = [
  { id: 1, navn: 'Trollstua', alder: '0-3 år', kapasitet: 12, norm: '1:3' },
  { id: 2, navn: 'Multemyra', alder: '0-3 år', kapasitet: 12, norm: '1:3' },
  { id: 3, navn: 'Klatremus', alder: '3-6 år', kapasitet: 18, norm: '1:6' },
  { id: 4, navn: 'Bjørnehiet', alder: '3-6 år', kapasitet: 18, norm: '1:6' },
];

const Kontrollpanel: React.FC = () => {
  const { role, setRole, isSvein } = useRole();
  const navigate = useNavigate();

  const roleRoutes: Record<Role, string> = {
    STYRERN: '/styrer',
    PEDLEDERN: '/pedleder',
    FAGARBEIDERN: '/fagarbeider',
    ASSISTENTN: '/assistent',
    VIKARN: '/vikar',
    STUDENTN: '/blu-hjelperen',
    GUEST: '/'
  };
  // Styrer hvilken underfane vi er på inne i maskinrommet
  const [activeTab, setActiveTab] = useState<'baser' | 'innstillinger' | 'modus'>('baser');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms'>('privacy');

  // MOCK-DATA: Ansatte (med LocalStorage)
  const [ansatte, setAnsatte] = useState<Ansatt[]>(() => {
    const saved = localStorage.getItem('styrern_kontrollpanel_ansatte');
    return saved ? JSON.parse(saved) : [
      { id: 1, navn: 'Karoline Haug', rolle: 'Styrer', base: 'Administrasjon', prosent: 100 },
      { id: 2, navn: 'Ingrid Solheim', rolle: 'Pedagogisk leder', base: 'Trollstua', prosent: 100 },
      { id: 3, navn: 'Ola Nordvik', rolle: 'Barne- og ungdomsarbeider', base: 'Trollstua', prosent: 100 },
      { id: 4, navn: 'Lise Moen', rolle: 'Pedagogisk leder', base: 'Bjørnehiet', prosent: 80 },
      { id: 5, navn: 'Petter Strand', rolle: 'Vikar', base: 'Flytende', prosent: 0 },
    ];
  });

  // Sporing av om vi viser eksempeldata eller brukerens egne avdelinger
  const [isDemoData, setIsDemoData] = useState<boolean>(() => {
    const saved = localStorage.getItem('styrern_is_demo_baser');
    return saved === null ? true : saved === 'true';
  });

  // Baser (med LocalStorage)
  const [baser, setBaser] = useState<BaseItem[]>(() => {
    const saved = localStorage.getItem('styrern_kontrollpanel_baser');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_DEMO_BASER;
      }
    }
    return DEFAULT_DEMO_BASER;
  });

  // Innstillinger (med LocalStorage)
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('styrern_kontrollpanel_settings');
    return saved ? JSON.parse(saved) : {
      barnehageNavn: 'Eventyrskogen Barnehage',
      orgNummer: '987 654 321',
      logoUrl: '',
      apningStart: '07:00',
      apningSlutt: '17:00',
      kjerneStart: '09:30',
      kjerneSlutt: '14:30'
    };
  });

  useEffect(() => {
    localStorage.setItem('styrern_kontrollpanel_ansatte', JSON.stringify(ansatte));
  }, [ansatte]);

  useEffect(() => {
    localStorage.setItem('styrern_kontrollpanel_baser', JSON.stringify(baser));
  }, [baser]);

  useEffect(() => {
    localStorage.setItem('styrern_is_demo_baser', isDemoData ? 'true' : 'false');
  }, [isDemoData]);

  useEffect(() => {
    localStorage.setItem('styrern_kontrollpanel_settings', JSON.stringify(settings));
  }, [settings]);

  // Handlers for Ansatte
  const handleAddAnsatt = () => {
    const navn = prompt('Navn på ny ansatt:');
    if (!navn) return;
    const rolle = prompt('Rolle (Styrer / Pedagogisk leder / Barne- og ungdomsarbeider / Assistent / Vikar):') || 'Assistent';
    const base = prompt('Tilhørighet (Base):') || 'Trollstua';
    const prosent = parseInt(prompt('Stillingsprosent (f.eks. 100):') || '100', 10);

    setAnsatte(prev => [
      ...prev,
      { id: Date.now(), navn, rolle, base, prosent: isNaN(prosent) ? 100 : prosent }
    ]);
  };

  const handleEditAnsatt = (id: number) => {
    const target = ansatte.find(a => a.id === id);
    if (!target) return;
    const navn = prompt('Endre navn:', target.navn) || target.navn;
    const rolle = prompt('Endre rolle:', target.rolle) || target.rolle;
    const base = prompt('Endre base:', target.base) || target.base;
    const prosent = parseInt(prompt('Endre stillingsprosent:', target.prosent.toString()) || target.prosent.toString(), 10);

    setAnsatte(prev => prev.map(a => a.id === id ? { ...a, navn, rolle, base, prosent: isNaN(prosent) ? a.prosent : prosent } : a));
  };

  const handleDeleteAnsatt = (id: number) => {
    setAnsatte(prev => prev.filter(a => a.id !== id));
  };

  // Handlers for Baser & Eksempeldata
  const handleAddBase = () => {
    const navn = prompt('Navn på ny base / avdeling:');
    if (!navn || !navn.trim()) return;
    const alder = prompt('Aldersgruppe (f.eks. 0-3 år eller 3-6 år):', '3-6 år') || '3-6 år';
    const kapasitet = parseInt(prompt('Kapasitet (antall barn):', '18') || '18', 10);
    const norm = alder.includes('0-3') ? '1:3' : '1:6';

    const newBase: BaseItem = {
      id: Date.now(),
      navn: navn.trim(),
      alder,
      kapasitet: isNaN(kapasitet) ? 18 : kapasitet,
      norm
    };

    if (isDemoData) {
      // Hvis brukeren fortsatt hadde eksempeldata: erstatt dem umiddelbart med den nyopprettede basen!
      setBaser([newBase]);
      setIsDemoData(false);
      setDemoNotice(`Eksempeldataene ble automatisk erstattet med din nye avdeling "${newBase.navn}". Du kan når som helst gjenopprette eksempler.`);
    } else {
      setBaser(prev => [...prev, newBase]);
      setDemoNotice(`Avdelingen "${newBase.navn}" ble opprettet.`);
    }
  };

  const handleEditBase = (id: number) => {
    const target = baser.find(b => b.id === id);
    if (!target) return;
    const navn = prompt('Endre navn på basen:', target.navn) || target.navn;
    const alder = prompt('Endre aldersgruppe:', target.alder) || target.alder;
    const kapasitet = parseInt(prompt('Endre kapasitet:', target.kapasitet.toString()) || target.kapasitet.toString(), 10);
    const norm = alder.includes('0-3') ? '1:3' : '1:6';

    setBaser(prev => prev.map(b => b.id === id ? { ...b, navn, alder, kapasitet: isNaN(kapasitet) ? b.kapasitet : kapasitet, norm } : b));
  };

  const handleDeleteBase = (id: number) => {
    const target = baser.find(b => b.id === id);
    if (!target) return;
    if (window.confirm(`Er du sikker på at du vil slette avdelingen "${target.navn}"?`)) {
      setBaser(prev => {
        const updated = prev.filter(b => b.id !== id);
        return updated;
      });
      setIsDemoData(false);
      setDemoNotice(`Avdelingen "${target.navn}" ble slettet.`);
    }
  };

  const handleClearDemoData = () => {
    if (window.confirm('Vil du tømme alle eksempelavdelinger og starte med blanke ark?')) {
      setBaser([]);
      setIsDemoData(false);
      setDemoNotice('Eksempeldata er nå tømt. Du har blanke ark og kan opprette dine egne avdelinger.');
    }
  };

  const handleRestoreDemoData = () => {
    if (window.confirm('Vil du gjenopprette standard eksempelavdelinger? (Dette overskriver listen med 4 standardbaser)')) {
      setBaser(DEFAULT_DEMO_BASER);
      setIsDemoData(true);
      setDemoNotice('Eksempelavdelinger er gjenopprettet.');
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('styrern_kontrollpanel_settings', JSON.stringify(settings));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // RENDERING: Underfane for Ansatte & Roller
  const renderAnsatte = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Ansatte og tilganger</h3>
          <p className="text-sm text-slate-500">Administrer hvem som har tilgang til systemet og hvilken rolle de har.</p>
        </div>
        <button 
          onClick={handleAddAnsatt}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium text-sm"
        >
          <Plus size={16} />
          <span>Legg til ansatt</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="px-6 py-4 font-medium">Navn</th>
              <th className="px-6 py-4 font-medium">Rolle i systemet</th>
              <th className="px-6 py-4 font-medium">Tilhørighet (Base)</th>
              <th className="px-6 py-4 font-medium">Stilling</th>
              <th className="px-6 py-4 font-medium text-right">Handlinger</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ansatte.map((ansatt, aIdx) => (
              <tr key={`ansatt-${ansatt.id}-${aIdx}`} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-800">{ansatt.navn}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    ansatt.rolle === 'Styrer' ? 'bg-purple-100 text-purple-700' :
                    ansatt.rolle === 'Pedagogisk leder' ? 'bg-blue-100 text-blue-700' :
                    ansatt.rolle === 'Vikar' ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {ansatt.rolle}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600">{ansatt.base}</td>
                <td className="px-6 py-4 text-slate-600">{ansatt.prosent}%</td>
                <td className="px-6 py-4 flex justify-end space-x-3">
                  <button 
                    onClick={() => handleEditAnsatt(ansatt.id)}
                    className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                    title="Rediger ansatt"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteAnsatt(ansatt.id)}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                    title="Fjern ansatt"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // RENDERING: Underfane for Baser
  const renderBaser = () => (
    <div className="space-y-6">
      {demoNotice && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles size={18} className="text-indigo-600 shrink-0" />
            <span>{demoNotice}</span>
          </div>
          <button 
            onClick={() => setDemoNotice(null)}
            className="text-indigo-500 hover:text-indigo-800 p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {isDemoData && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-bold block mb-0.5">Eksempeldata er aktive</strong>
            Dette er forhåndsutfylte eksempelbaser for å vise systemets funksjoner. Så snart du trykker <strong>«Opprett ny base»</strong>, erstattes eksemplene umiddelbart med din nye avdeling. Du kan også tømme eller hente dem tilbake nedenfor.
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-800">Avdelinger / Baser</h3>
            {isDemoData ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                Eksempeldata
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                Aktive avdelinger ({baser.length})
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">Definer basene i barnehagen for korrekt utregning av bemanningsnorm og rollefordeling.</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {isDemoData ? (
            <button 
              onClick={handleClearDemoData}
              className="flex items-center space-x-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors font-medium text-xs cursor-pointer"
              title="Slett eksemplene og start med tom liste"
            >
              <Trash2 size={14} className="text-slate-500" />
              <span>Tøm eksempeldata</span>
            </button>
          ) : (
            <button 
              onClick={handleRestoreDemoData}
              className="flex items-center space-x-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors font-medium text-xs cursor-pointer"
              title="Gjenopprett 4 standard eksempelavdelinger"
            >
              <RotateCcw size={14} className="text-slate-500" />
              <span>Gjenopprett eksempler</span>
            </button>
          )}

          <button 
            onClick={handleAddBase}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium text-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>Opprett ny base</span>
          </button>
        </div>
      </div>

      {baser.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto">
            <Building2 size={24} />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800">Ingen avdelinger registrert ennå</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Start med blanke ark ved å opprette din barnehages avdelinger, eller gjenopprett eksempeldata hvis du vil utforske hvordan det ser ut.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button 
              onClick={handleAddBase}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-xs hover:bg-indigo-700 transition shadow-sm"
            >
              + Opprett første base
            </button>
            <button 
              onClick={handleRestoreDemoData}
              className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium text-xs hover:bg-slate-50 transition"
            >
              Gjenopprett eksempler
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {baser.map((base, bIdx) => (
            <div key={`base-${base.id}-${bIdx}`} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-800">{base.navn}</h4>
                    {isDemoData && (
                      <span className="text-[10px] text-amber-700 font-semibold">Eksempel</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => handleEditBase(base.id)}
                    className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-50 transition"
                    title="Rediger base"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteBase(base.id)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                    title="Slett base"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-2 mt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Aldersgruppe:</span>
                  <span className="font-medium text-slate-800">{base.alder}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kapasitet:</span>
                  <span className="font-medium text-slate-800">{base.kapasitet} barn</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Krav til norm:</span>
                  <span className="font-medium text-emerald-600">{base.norm}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // RENDERING: Underfane for Modus-bytte
  const renderModus = () => {
    // Studentn (BLU-hjelperen) skal KUN være synlig for Svein
    const roles: { id: Role; label: string; desc: string }[] = [
      { id: 'STYRERN', label: 'Styrer', desc: 'Overordnet ledelse, personal, HMS, bemanningsradar og innstillinger' },
      { id: 'PEDLEDERN', label: 'Pedagogisk leder', desc: 'Daglig drift, ukeplan, dokumentasjon, observasjoner og PPT' },
      { id: 'FAGARBEIDERN', label: 'Fagarbeider', desc: 'Praksisnær pedagogikk, idébank, hverdagsrutiner og fagbrev' },
      { id: 'ASSISTENTN', label: 'Assistent', desc: 'Trygghet, relasjonsarbeid, garderobe og «hva gjør jeg hvis»-støtte' },
      { id: 'VIKARN', label: 'Vikar', desc: '5-minutters hurtigonboarding, sikkerhet, avdelingsark og timeliste' },
      ...(isSvein ? [{ id: 'STUDENTN' as Role, label: 'Student (BLU-hjelperen)', desc: 'Bacheloroppgave, didaktisk planlegger og kildebank (Kun synlig for Svein)' }] : [])
    ];

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Valg av modus</h3>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
            Bytt mellom ulike roller for å se systemet fra deres perspektiv. Du kan når som helst gå tilbake til din egen styrer-rolle ved å trykke på din <strong>profil-badge</strong> (initial-sirkelen øverst til høyre), eller via <strong>returbanneret</strong> øverst på skjermen.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(r => (
            <button
              key={r.id}
              onClick={() => {
                setRole(r.id);
                if (roleRoutes[r.id]) {
                  navigate(roleRoutes[r.id]);
                }
              }}
              className={`p-6 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                role === r.id 
                  ? 'bg-indigo-50 border-indigo-500 shadow-sm ring-1 ring-indigo-500' 
                  : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="font-bold text-base text-slate-900">{r.label}</span>
                {role === r.id && <CheckCircle2 className="text-indigo-600" size={20} />}
              </div>
              <p className="text-xs text-slate-500 leading-normal">{r.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // RENDERING: Underfane for Systeminnstillinger
  const renderInnstillinger = () => (
    <div className="max-w-2xl space-y-8">
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-600" />
          Endringene dine er nå lagret!
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-slate-800">Generelle innstillinger</h3>
        <p className="text-sm text-slate-500 mb-6">Grunnleggende informasjon om barnehagen.</p>
        
        <div className="space-y-4 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Barnehagens logo (URL)</label>
            <input 
              type="text" 
              value={settings.logoUrl || ''}
              onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
              placeholder="Lim inn URL til logo-bilde..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Barnehagens navn</label>
            <input 
              type="text" 
              value={settings.barnehageNavn}
              onChange={(e) => setSettings({ ...settings, barnehageNavn: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Organisasjonsnummer</label>
            <input 
              type="text" 
              value={settings.orgNummer}
              onChange={(e) => setSettings({ ...settings, orgNummer: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm" 
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
          <Clock size={20} className="text-indigo-600" />
          <span>Tid og Bemanning</span>
        </h3>
        <p className="text-sm text-slate-500 mb-6">Disse tidene brukes til å styre varslene i Bemanningsradaren.</p>
        
        <div className="grid grid-cols-2 gap-6 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Åpningstid start</label>
            <input 
              type="time" 
              value={settings.apningStart}
              onChange={(e) => setSettings({ ...settings, apningStart: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Åpningstid slutt</label>
            <input 
              type="time" 
              value={settings.apningSlutt}
              onChange={(e) => setSettings({ ...settings, apningSlutt: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none text-sm" 
            />
          </div>
          <div className="col-span-2 pt-4 border-t border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-1">Kjernetid (Strenge krav til norm)</label>
            <p className="text-xs text-slate-500 mb-3">Utenfor disse tidene vil radaren vise redusert advarsel for underbemanning.</p>
            <div className="flex items-center space-x-4">
              <input 
                type="time" 
                value={settings.kjerneStart}
                onChange={(e) => setSettings({ ...settings, kjerneStart: e.target.value })}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg outline-none text-sm" 
              />
              <span className="text-slate-400">til</span>
              <input 
                type="time" 
                value={settings.kjerneSlutt}
                onChange={(e) => setSettings({ ...settings, kjerneSlutt: e.target.value })}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg outline-none text-sm" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* OM PEDPORTALEN & SYSTEMSTATUS */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
          <Shield size={20} className="text-indigo-600" />
          <span>Om PedPortalen & Systemstatus</span>
        </h3>
        <p className="text-sm text-slate-500 mb-6">Versjonskontroll, driftsstatus og juridiske rammer for barnehagen.</p>

        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Appversjon</span>
              <span className="text-base font-extrabold text-slate-900 mt-0.5 block">v3.6.2</span>
              <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                <CheckCircle2 size={12} /> Siste stabile utgave
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Driftsmiljø</span>
              <span className="text-base font-extrabold text-slate-900 mt-0.5 block">Produksjon</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Google Cloud Platform</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Oppdatert</span>
              <span className="text-base font-extrabold text-slate-900 mt-0.5 block">November 2026</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Automatisk synkronisert</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              <span className="font-semibold text-slate-800 block">Juridiske retningslinjer og personvern</span>
              <span className="text-slate-500">I henhold til GDPR, opplæringsloven og barnehageloven.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setLegalTab('privacy');
                  setLegalModalOpen(true);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold rounded-lg transition border border-slate-200 cursor-pointer"
              >
                Personvernerklæring
              </button>
              <button
                type="button"
                onClick={() => {
                  setLegalTab('terms');
                  setLegalModalOpen(true);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold rounded-lg transition border border-slate-200 cursor-pointer"
              >
                Brukervilkår
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSaveSettings}
          className="flex items-center space-x-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-sm"
        >
          <Save size={18} />
          <span>Lagre endringer</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Sidetittel for maskinrommet */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
          <Settings className="text-indigo-600" size={28} />
          <span>Kontrollpanel</span>
        </h2>
        <p className="text-slate-600 mt-1">Administrer avdelinger og systeminnstillinger for Portalen.</p>
      </div>

      {/* Navigasjonsmeny inne i Kontrollpanelet */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button 
            onClick={() => setActiveTab('baser')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'baser' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            <div className="flex items-center space-x-2">
              <Building2 size={18} />
              <span>Avdelinger / Baser</span>
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('innstillinger')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'innstillinger' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            <div className="flex items-center space-x-2">
              <Settings size={18} />
              <span>Systeminnstillinger</span>
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('modus')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'modus' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            <div className="flex items-center space-x-2">
              <UserCheck size={18} />
              <span>Valg av modus</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Innholdsområdet */}
      <div className="pt-4 animate-in fade-in duration-300">
        {activeTab === 'baser' && renderBaser()}
        {activeTab === 'innstillinger' && renderInnstillinger()}
        {activeTab === 'modus' && renderModus()}
      </div>

      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalTab}
      />
    </div>
  );
};

export default Kontrollpanel;
