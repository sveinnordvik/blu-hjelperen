import React from 'react';
import { ShieldAlert, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

interface SpecialEducationCase {
  id: string;
  caseCode: string;
  department: string;
  status: 'Samtykke innhentet' | 'Henvisning sendt PPT' | 'Vedtak mottatt' | 'ITP opprettet' | 'Halvårsrapport levert';
  deadline: Date;
}

const Saksradar: React.FC = () => {
  // Mock data
  const cases: SpecialEducationCase[] = [
    { id: '1', caseCode: 'Sak #1 - Trolletua', department: 'Trolletua', status: 'Henvisning sendt PPT', deadline: new Date('2026-06-01') },
    { id: '2', caseCode: 'Sak #2 - Maurtua', department: 'Maurtua', status: 'ITP opprettet', deadline: new Date('2026-11-15') },
  ];

  const getStatusIndex = (status: string) => {
    const statuses = ['Samtykke innhentet', 'Henvisning sendt PPT', 'Vedtak mottatt', 'ITP opprettet', 'Halvårsrapport levert'];
    return statuses.indexOf(status);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
        <ShieldAlert className="text-indigo-600" />
        Saks- og Fristradar
      </h3>
      <div className="space-y-4">
        {cases.map((s) => (
          <div key={s.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-slate-900">{s.caseCode}</span>
              <span className="text-xs font-semibold text-slate-500">Frist: {s.deadline.toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              {['Samtykke', 'Henvisning', 'Vedtak', 'ITP', 'Halvårs'].map((step, i) => (
                <div key={step} className={`h-2 flex-1 rounded ${i <= getStatusIndex(s.status) ? 'bg-indigo-600' : 'bg-slate-200'}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Saksradar;
