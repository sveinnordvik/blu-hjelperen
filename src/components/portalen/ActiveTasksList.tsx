import React, { useMemo } from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface TaskItem {
  id: string | number;
  title: string;
  tittel?: string;
  base: string;
  dueDate: string | number | Date;
  status: 'pending' | 'completed' | 'Venter' | 'Utført';
  category?: string;
  kategori?: string;
  sjekkpunkter?: Array<{ id: string; tekst: string; fullfort: boolean }>;
}

interface ActiveTasksListProps {
  tasks: TaskItem[];
  onCompleteTask?: (task: TaskItem) => void;
  onOpenChecklist?: (task: TaskItem) => void;
}

export default function ActiveTasksList({ tasks, onCompleteTask, onOpenChecklist }: ActiveTasksListProps) {
  // 1. Rens listen: Behold kun oppgaver som IKKE er fullført
  const activeTasks = useMemo(() => {
    return tasks.filter(task => task.status !== 'completed' && task.status !== 'Utført');
  }, [tasks]);

  // Hjelpefunksjon for å sjekke om fristen er passert
  const isOverdue = (dueDate: string | number | Date) => {
    try {
      return new Date(dueDate).getTime() < Date.now();
    } catch {
      return false;
    }
  };

  const formatDueTime = (dueDate: string | number | Date) => {
    try {
      const d = new Date(dueDate);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-3">
      {/* Toppbånd / Header for listen */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-slate-800">Aktiv Oppfølging & Delegeringer</h3>
        <span className="text-sm text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded-md">
          {activeTasks.length} venter på svar
        </span>
      </div>

      {/* Rendre de filtrerte, aktive oppgavene */}
      {activeTasks.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-slate-500 text-sm italic">Ingen utestående sjekklister akkurat nå.</p>
        </div>
      ) : (
        activeTasks.map((task) => {
          const overdue = isOverdue(task.dueDate);
          const title = task.title || task.tittel || 'HMS Oppgave';
          const timeStr = formatDueTime(task.dueDate);
          
          return (
            <div 
              key={task.id} 
              // 2. Visuell forfallsdato: Betinget Tailwind-styling
              className={`flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 border rounded-xl bg-white transition-all gap-3 shadow-2xs
                ${overdue ? 'border-rose-300 bg-rose-50/70 shadow-rose-100/50' : 'border-slate-200 hover:border-slate-300'}`
              }
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className={`font-semibold text-sm sm:text-base ${overdue ? 'text-rose-700' : 'text-slate-800'}`}>
                    {title}
                  </h4>
                  {overdue && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-800">
                      <AlertTriangle size={11} />
                      Frist passert
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-500 flex flex-wrap items-center gap-3 mt-1">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                    📍 {task.base}
                  </span>
                  {timeStr && (
                    <span className={overdue ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
                      Frist: {timeStr}
                    </span>
                  )}
                </div>
              </div>
              
              <button 
                type="button"
                onClick={() => {
                  if (onOpenChecklist) onOpenChecklist(task);
                  else if (onCompleteTask) onCompleteTask(task);
                }}
                className="px-4 py-2 text-sm font-semibold bg-amber-100 text-amber-900 rounded-lg hover:bg-amber-200 border border-amber-300 transition-colors cursor-pointer shrink-0 shadow-2xs flex items-center justify-center space-x-1.5"
              >
                <Clock size={14} className={overdue ? 'text-rose-600' : 'text-amber-700'} />
                <span>Kvitter ut / fyll sjekkliste</span>
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
