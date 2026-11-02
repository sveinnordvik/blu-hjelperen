import React, { useState } from 'react';
import { Sparkles, FileText, ClipboardList, BookOpen, Send } from 'lucide-react';

const SpesialpedagogiskVeiviser: React.FC = () => {
  const [step, setStep] = useState(1);

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
        <Sparkles className="text-teal-600" />
        Spesialpedagogisk Støttespiller
      </h2>
      
      <div className="flex gap-4 mb-8">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-teal-600' : 'bg-slate-200'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Steg 1: Før-henvisning</h3>
          <textarea className="w-full p-4 border rounded-xl" placeholder="Dokumenter tiltak som allerede er prøvd ut..." />
          <button onClick={() => setStep(2)} className="bg-teal-600 text-white px-6 py-2 rounded-xl">Neste</button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Steg 2: Pedagogisk kartlegging</h3>
          <p>Fyll ut de 7 punktene...</p>
          <button onClick={() => setStep(3)} className="bg-teal-600 text-white px-6 py-2 rounded-xl">Neste</button>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Steg 3: ITP-bygger</h3>
          <textarea className="w-full p-4 border rounded-xl" placeholder="Plan for foreldreveiledning..." />
          <button onClick={() => setStep(4)} className="bg-teal-600 text-white px-6 py-2 rounded-xl">Neste</button>
        </div>
      )}
      {step === 4 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Steg 4: Halvårsrapport</h3>
          <button className="bg-teal-600 text-white px-6 py-2 rounded-xl">Generer PDF for Visma/Sikkersak</button>
        </div>
      )}
    </div>
  );
};

export default SpesialpedagogiskVeiviser;
