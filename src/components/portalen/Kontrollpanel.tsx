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
  X
} from 'lucide-react';

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

const Kontrollpanel: React.FC = () => {
  // Styrer hvilken underfane vi er på inne i maskinrommet
  const [activeTab, setActiveTab] = useState<'baser' | 'innstillinger'>('baser');
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  // MOCK-DATA: Baser (med LocalStorage)
  const [baser, setBaser] = useState<BaseItem[]>(() => {
    const saved = localStorage.getItem('styrern_kontrollpanel_baser');
    return saved ? JSON.parse(saved) : [
      { id: 1, navn: 'Trollstua', alder: '0-3 år', kapasitet: 12, norm: '1:3' },
      { id: 2, navn: 'Multemyra', alder: '0-3 år', kapasitet: 12, norm: '1:3' },
      { id: 3, navn: 'Klatremus', alder: '3-6 år', kapasitet: 18, norm: '1:6' },
      { id: 4, navn: 'Bjørnehiet', alder: '3-6 år', kapasitet: 18, norm: '1:6' },
    ];
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

  // Handlers for Baser
  const handleAddBase = () => {
    const navn = prompt('Navn på ny base / avdeling:');
    if (!navn) return;
    const alder = prompt('Aldersgruppe (f.eks. 0-3 år eller 3-6 år):') || '3-6 år';
    const kapasitet = parseInt(prompt('Kapasitet (antall barn):') || '18', 10);
    const norm = alder.includes('0-3') ? '1:3' : '1:6';

    setBaser(prev => [
      ...prev,
      { id: Date.now(), navn, alder, kapasitet: isNaN(kapasitet) ? 18 : kapasitet, norm }
    ]);
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
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Avdelinger / Baser</h3>
          <p className="text-sm text-slate-500">Definer basene i barnehagen for korrekt utregning av bemanningsnorm.</p>
        </div>
        <button 
          onClick={handleAddBase}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium text-sm"
        >
          <Plus size={16} />
          <span>Opprett ny base</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {baser.map((base, bIdx) => (
          <div key={`base-${base.id}-${bIdx}`} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                  <Building2 size={24} />
                </div>
                <h4 className="text-xl font-bold text-slate-800">{base.navn}</h4>
              </div>
              <button 
                onClick={() => handleEditBase(base.id)}
                className="text-slate-400 hover:text-indigo-600 p-1"
                title="Rediger base"
              >
                <Edit2 size={16} />
              </button>
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
    </div>
  );

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
        </nav>
      </div>

      {/* Innholdsområdet */}
      <div className="pt-4 animate-in fade-in duration-300">
        {activeTab === 'baser' && renderBaser()}
        {activeTab === 'innstillinger' && renderInnstillinger()}
      </div>
    </div>
  );
};

export default Kontrollpanel;
