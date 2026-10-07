import React, { useState } from 'react';
import { 
  Users, 
  Baby, 
  ShieldAlert, 
  CalendarDays, 
  Bot, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import MorgenPulsen from './MorgenPulsen';
import StaffMonthlyFocusWidget from './StaffMonthlyFocusWidget';

interface DagensOversiktProps {
  onNavigate?: (tab: string) => void;
  widgetPosition?: 'top' | 'bottom';
}

const DagensOversikt: React.FC<DagensOversiktProps> = ({ onNavigate, widgetPosition = 'bottom' }) => {
  const [acknowledged, setAcknowledged] = useState(false);

  // MOCK-DATA: Personalliste for i dag (synket med vaktplan)
  const personalliste = (() => {
    const saved = localStorage.getItem('styrern_radar_vaktplan');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const dagens = parsed.filter(p => !p.dag || p.dag === 'Mandag');
          return (dagens.length > 0 ? dagens : parsed).map((p: any) => ({
            id: p.id,
            navn: p.navn,
            rolle: p.rolle || (p.status.includes('Vikar') ? 'Vikar' : 'Ansatt'),
            tid: p.tid,
            status: p.status,
            farge: p.status === 'Sykemeldt' 
              ? 'bg-rose-100 text-rose-700' 
              : p.status.includes('Vikar') 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-emerald-100 text-emerald-700'
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: 1, navn: 'Ingrid Solheim', rolle: 'Ped.leder', tid: '07:30 - 15:00', status: 'Tilstede', farge: 'bg-emerald-100 text-emerald-700' },
      { id: 2, navn: 'Morten Hansen', rolle: 'Assistent', tid: '08:00 - 15:30', status: 'Tilstede', farge: 'bg-emerald-100 text-emerald-700' },
      { id: 3, navn: 'Fatima Al-Zahra', rolle: 'Fagarbeider', tid: '08:30 - 16:00', status: 'Sykemeldt', farge: 'bg-rose-100 text-rose-700' },
      { id: 4, navn: 'Lars Pettersen', rolle: 'Vikar', tid: '08:30 - 16:00', status: 'Tilstede', farge: 'bg-blue-100 text-blue-700' },
      { id: 5, navn: 'Camilla Vik', rolle: 'Assistent', tid: '09:00 - 16:30', status: 'Kommer 09:00', farge: 'bg-amber-100 text-amber-700' },
    ];
  })();

  // MOCK-DATA: Åpne HMS-avvik
  const avviksliste = [
    { id: 1, tittel: 'Dør klemmer på småbarnsavdeling', base: 'Trollstua', dato: 'I dag', status: 'Åpen', kritisk: true },
    { id: 2, tittel: 'Manglende strøing utenfor porten', base: 'Uteområdet', dato: 'I går', status: 'Under utbedring', kritisk: false },
    { id: 3, tittel: 'Vannlekkasje på personaltoalett', base: 'Felles', dato: '2 dager siden', status: 'Åpen', kritisk: true },
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. TOPP-PANEL: KPI-kortene (Nøkkeltall) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Kort 1: Bemanning */}
        <div 
          onClick={() => onNavigate && onNavigate('bemanning')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-300 transition-colors"
          title="Klikk for å se Bemanningsradar"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Bemanning i dag</p>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-3xl font-bold text-slate-800">5/6</h3>
              <span className="text-sm font-medium text-emerald-600">voksne</span>
            </div>
          </div>
          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600 group-hover:bg-indigo-100 transition-colors">
            <Users size={24} />
          </div>
        </div>

        {/* Kort 2: Barn til stede */}
        <div 
          onClick={() => onNavigate && onNavigate('bemanning')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-300 transition-colors"
          title="Klikk for å se barnegrupper"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Barn til stede</p>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-3xl font-bold text-slate-800">42/44</h3>
              <span className="text-sm font-medium text-slate-500">barn i dag</span>
            </div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
            <Baby size={24} />
          </div>
        </div>

        {/* Kort 3: HMS & Avvik */}
        <div 
          onClick={() => onNavigate && onNavigate('hms')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-300 transition-colors"
          title="Klikk for å se HMS-avvik"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">HMS & Avvik</p>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-3xl font-bold text-rose-600">2</h3>
              <span className="text-sm font-medium text-slate-500">åpne</span>
            </div>
          </div>
          <div className="bg-rose-50 p-3 rounded-lg text-rose-600 group-hover:bg-rose-100 transition-colors">
            <ShieldAlert size={24} />
          </div>
        </div>

        {/* Kort 4: Årshjul & Frister */}
        <div 
          onClick={() => onNavigate && onNavigate('aarshjul')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-300 transition-colors"
          title="Klikk for å se Årshjul & Frister"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Neste frist</p>
            <h3 className="text-lg font-bold text-slate-800 leading-tight">Foreldresamtaler</h3>
            <p className="text-sm text-slate-500 mt-0.5">Om 14 dager</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg text-amber-600 group-hover:bg-amber-100 transition-colors">
            <CalendarDays size={24} />
          </div>
        </div>

      </div>

      {/* 1.5. MÅNEDENS FOKUS WIDGET FOR ANSATTE (HVIS PLASSERT ØVERST) */}
      {widgetPosition === 'top' && (
        <StaffMonthlyFocusWidget 
          onReadFullPlan={() => onNavigate && onNavigate('aarshjul')}
        />
      )}

      {/* 2. MELLOMSEKSJON: Statusrapport og Morgenpuls SIDE OM SIDE */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 my-6">
        
        {/* VENSTRE KOLONNE: Dagens statusrapport (Styrer AI) */}
        <div className="bg-[#1e1b4b] rounded-2xl p-6 text-white relative overflow-hidden shadow-md flex flex-col h-full">
          {/* Dekorativ bakgrunnseffekt */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 transform translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="flex items-center space-x-2 mb-4">
              <span className="bg-indigo-500/30 text-indigo-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Dagens statusrapport
              </span>
            </div>
            
            <h2 className="text-2xl font-bold mb-3 leading-snug text-white">
              God mandag! Bemanningsnormen er sikret med vikar på Moseplassen.
            </h2>
            
            <p className="text-indigo-200 text-sm leading-relaxed mb-6">
              Fatima er sykemeldt i dag, men vikar Lars Pettersen har takket ja til vakten. Han er plassert på Multemyra, og vi oppfyller lovkravet om bemanningstetthet i kjernetiden.
            </p>
            
            {/* Knapper dyttet ned til bunnen for å ligge på linje */}
            <div className="mt-auto flex flex-col sm:flex-row gap-3 pt-4 border-t border-indigo-800/50">
              <button 
                onClick={() => {
                  setAcknowledged(true);
                  setTimeout(() => setAcknowledged(false), 4000);
                }}
                className={`flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg transition-colors font-medium text-sm shadow-sm ring-1 ring-indigo-500 ring-offset-2 ring-offset-[#1e1b4b] flex-1 cursor-pointer ${
                  acknowledged 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {acknowledged ? <CheckCircle2 size={18} /> : <Bot size={18} />}
                <span>{acknowledged ? 'Beskjed mottatt' : 'Beskjed mottatt'}</span>
              </button>
              {onNavigate && (
                <button 
                  onClick={() => onNavigate('ai')}
                  className="flex items-center justify-center space-x-2 bg-transparent hover:bg-indigo-800/50 text-indigo-200 hover:text-white px-4 py-2.5 rounded-lg transition-colors font-medium text-sm flex-1 cursor-pointer"
                >
                  <Sparkles size={18} />
                  <span>Spør AI</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* HØYRE KOLONNE: Morgen-pulsen */}
        <div className="h-full flex flex-col">
          <MorgenPulsen />
        </div>

      </div>

      {/* 3. NEDRE SEKSJON: To kolonner (Personal og HMS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Venstre kolonne: Dagens Personalliste */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
              <Users size={20} className="text-indigo-600" />
              <span>Dagens Personalliste</span>
            </h3>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => onNavigate && onNavigate('kompetanse')}
                className="text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition"
                title="Gå til kompetanse- og kravmatrisen"
              >
                Krav & Attester
              </button>
              <button 
                onClick={() => onNavigate && onNavigate('vaktliste')}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center hover:underline cursor-pointer"
                title="Gå til vaktliste og turnus"
              >
                <span>Vaktplan & Turnus</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="p-2 flex-1">
            <ul className="divide-y divide-slate-50">
              {personalliste.map((person) => (
                <li key={person.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-800">{person.navn}</span>
                    <span className="text-xs text-slate-500">{person.rolle} • {person.tid}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${person.farge}`}>
                    {person.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Høyre kolonne: HMS & Internkontroll */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
              <ShieldAlert size={20} className="text-rose-600" />
              <span>HMS-Avvik & Internkontroll</span>
            </h3>
            <button 
              onClick={() => onNavigate && onNavigate('hms')}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center hover:underline"
            >
              <span>Gå til HMS</span>
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="p-2 flex-1">
            <ul className="divide-y divide-slate-50">
              {avviksliste.map((avvik) => (
                <li key={avvik.id} className="flex flex-col p-3 hover:bg-slate-50 rounded-lg transition-colors gap-2">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-slate-800 text-sm">{avvik.tittel}</span>
                    {avvik.status === 'Åpen' ? (
                      <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-semibold shrink-0">Åpen</span>
                    ) : (
                      <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-semibold shrink-0">Behandles</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-slate-500">
                    <span className="flex items-center space-x-1">
                      <AlertCircle size={14} className={avvik.kritisk ? 'text-rose-500' : 'text-slate-400'} />
                      <span>{avvik.base}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock size={14} />
                      <span>{avvik.dato}</span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>

      {/* MÅNEDENS FOKUS WIDGET FOR STYRERN (NEDERST I OVERSIKT) */}
      {widgetPosition === 'bottom' && (
        <StaffMonthlyFocusWidget 
          onReadFullPlan={() => onNavigate && onNavigate('aarshjul')}
        />
      )}

    </div>
  );
};

export default DagensOversikt;
