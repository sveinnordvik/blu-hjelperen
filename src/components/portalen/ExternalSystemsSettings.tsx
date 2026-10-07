import React, { useState, useEffect } from 'react';
import { Settings, Link2, Info, Save, CheckCircle2 } from 'lucide-react';

export default function ExternalSystemsSettings() {
  // State for å lagre valgt hovedsystem
  const [selectedSystem, setSelectedSystem] = useState(() => {
    return localStorage.getItem('pedportalen_external_system') || 'MyKid';
  });
  const [customSystem, setCustomSystem] = useState(() => {
    return localStorage.getItem('pedportalen_external_custom_system') || '';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Liste over de mest vanlige systemene i norske barnehager
  const platforms = [
    { id: 'MyKid', name: 'MyKid', desc: 'Foreldrekommunikasjon' },
    { id: 'Kidplan', name: 'Kidplan', desc: 'Administrasjon & foreldre' },
    { id: 'Vigilo', name: 'Vigilo', desc: 'Oppvekstsystem' },
    { id: 'VismaFlyt', name: 'Visma Flyt', desc: 'Barnehageadministrasjon' },
    { id: 'PBLMentor', name: 'PBL Mentor', desc: 'HMS & personal' },
    { id: 'Annet', name: 'Annet system...', desc: 'Spesifiser eget' }
  ];

  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem('pedportalen_external_system', selectedSystem);
    localStorage.setItem('pedportalen_external_custom_system', customSystem);
    
    // Simulerer backend-/database-lagring
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage('Systeminnstillinger lagret!');
      setTimeout(() => setSaveMessage(''), 3000);
    }, 600);
  };

  const currentSystemName = selectedSystem === 'Annet' && customSystem.trim() ? customSystem.trim() : selectedSystem;

  return (
    <div className="max-w-3xl bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
      
      {/* Header for innstillingsboksen */}
      <div className="border-b border-slate-200 bg-slate-50 p-6 flex items-center gap-3">
        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
          <Link2 size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#1e1b4b]">Eksterne Systemer & Terminologi</h2>
          <p className="text-sm text-slate-500">Angi hvilke andre plattformer barnehagen benytter.</p>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6">
        
        {/* Forklaring */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 items-start">
          <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 leading-relaxed">
            <strong>Hvorfor trenger vi dette?</strong><br />
            Når du velger barnehagens primærsystem under, vil PedPortalen automatisk tilpasse språket sitt. Knapper og instrukser vil for eksempel endre seg fra "Publiser til foreldreportal" til "Publiser til {currentSystemName}". Dette forhindrer forvirring for ansatte og vikarer. På sikt vil dette også åpne for direkte datautveksling mellom systemene.
          </div>
        </div>

        {/* Valg av system (Radio Cards) */}
        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-3 uppercase tracking-wider">
            Primært system for foreldrekommunikasjon
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {platforms.map((platform) => {
              const isSelected = selectedSystem === platform.id;
              
              return (
                <div 
                  key={platform.id}
                  onClick={() => setSelectedSystem(platform.id)}
                  className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-indigo-600 bg-indigo-50 shadow-sm' 
                      : 'border-slate-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                      {platform.name}
                    </h4>
                    {isSelected && <CheckCircle2 size={16} className="text-indigo-600" />}
                  </div>
                  <p className={`text-xs ${isSelected ? 'text-indigo-700' : 'text-slate-500'}`}>
                    {platform.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Egendefinert input hvis "Annet" er valgt */}
        {selectedSystem === 'Annet' && (
          <div className="animate-fade-in-up bg-slate-50 p-4 rounded-lg border border-slate-200">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Navn på barnehagens system
            </label>
            <input 
              type="text" 
              value={customSystem}
              onChange={(e) => setCustomSystem(e.target.value)}
              placeholder="F.eks. BarnehageWeb, Famly..."
              className="w-full p-2.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            />
          </div>
        )}
        
        {/* Status for fremtidig integrasjon (Visuell teaser) */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
          <Settings size={14} className="text-slate-400 shrink-0" />
          <p className="text-xs text-slate-500 italic">
            Automatisert API-integrasjon mot {currentSystemName} for overføring av årsplan og sjekklister er under kartlegging.
          </p>
        </div>

      </div>

      {/* Lagre-bånd nederst */}
      <div className="border-t border-slate-200 bg-slate-50 p-4 flex justify-between items-center">
        <div className="text-sm font-medium text-emerald-600 flex items-center gap-2">
          {saveMessage && <><CheckCircle2 size={16} /> {saveMessage}</>}
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-[#1e1b4b] hover:bg-indigo-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-70 cursor-pointer shadow-sm"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Lagre systemvalg
        </button>
      </div>

    </div>
  );
}
