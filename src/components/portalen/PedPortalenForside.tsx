import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Sparkles, Lock, ArrowRight } from 'lucide-react';

interface PedPortalenForsideProps {
  onSelectApp?: (appId: string) => void;
  isSvein?: boolean;
}

export default function PedPortalenForside({ onSelectApp, isSvein = false }: PedPortalenForsideProps) {
  const navigate = useNavigate();

  // Funksjon for å håndtere klikk (ruting til BLU-hjelperen)
  const handleOpenBlu = () => {
    if (onSelectApp) {
      onSelectApp('student');
      return;
    }
    navigate('/blu-hjelperen');
  };

  // 5 hemmelige kommende moduler (sløret / anonymisert slik at ingenting røpes)
  const kommendeModuler = [
    { id: 'modul-1', farge: 'bg-indigo-600', sti: '/portalen-lab/styrer' },
    { id: 'modul-2', farge: 'bg-emerald-600', sti: '/portalen-lab/pedleder' },
    { id: 'modul-3', farge: 'bg-orange-500', sti: '/portalen-lab/fagarbeider' },
    { id: 'modul-4', farge: 'bg-pink-500', sti: '/portalen-lab/assistent' },
    { id: 'modul-5', farge: 'bg-teal-500', sti: '/portalen-lab/vikar' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center p-6 md:p-12 font-sans">
      <div className="max-w-4xl w-full mt-6">
        
        {/* LOGO & OVERSKRIFT */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-5 shadow-lg shadow-blue-500/20 text-white">
            <span className="text-2xl font-black tracking-tight">BLU</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            BLU-hjelperen
          </h1>
        </div>

        {/* INFO-BOKS OM AT NOE NYTT OG SPENNENDE KOMMER */}
        <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-6 md:p-7 mb-10 flex flex-col md:flex-row items-start gap-4 shadow-sm">
          <div className="bg-blue-100 p-3 rounded-xl text-blue-600 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-blue-950 mb-1.5 flex items-center gap-2">
              Noe nytt og spennende er på vei!
            </h3>
            <p className="text-blue-900/90 leading-relaxed text-sm md:text-base">
              Vi jobber med spennende utvidelser og nye verktøy. I mellomtiden er{' '}
              <strong>BLU-hjelperen</strong> åpen og klar til bruk nedenfor!
            </p>
          </div>
        </div>

        {/* 1. AKTIV BOKS: BLU-HJELPEREN ALENE PÅ TOPPEN */}
        <div className="mb-10">
          <button
            type="button"
            onClick={handleOpenBlu}
            className="w-full relative group p-7 md:p-8 rounded-3xl bg-white border-2 border-blue-500/30 hover:border-blue-600 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-left cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          >
            <div className="flex items-start md:items-center gap-5">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/30 shrink-0 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-9 h-9 md:w-11 md:h-11" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Aktiv og klar
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                  BLU-hjelperen
                </h2>
                <p className="text-slate-600 text-sm md:text-base mt-1 max-w-xl">
                  Din KI-drevne skrivepartner og veileder.
                </p>
              </div>
            </div>

            <div className="shrink-0 self-end md:self-center">
              <span className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/30 group-hover:gap-3 transition-all">
                <span>Åpne BLU-hjelperen</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </button>
        </div>

        {/* 2. DE ANDRE BOKSENE UNDER: BLURRET SÅ DET IKKE VISES HVA SOM STÅR DER, BARE AT DET ER "NOE NYTT" */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Kommende verktøy (under utvikling)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {kommendeModuler.map((modul, idx) => (
              <div
                key={modul.id}
                className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-xs flex flex-col min-h-[170px]"
              >
                {/* Slør-lag over dummy-innhold så hemmelige navn ikke kan ses eller leses */}
                <div className="filter blur-[6px] select-none pointer-events-none opacity-40">
                  <div className={`${modul.farge} w-12 h-12 rounded-xl mb-4 opacity-50`}></div>
                  <div className="h-5 w-32 bg-slate-400 rounded mb-2"></div>
                  <div className="h-3 w-44 bg-slate-300 rounded mb-1.5"></div>
                  <div className="h-3 w-28 bg-slate-200 rounded"></div>
                </div>

                {/* Teaser-kort i midten med "Noe nytt" */}
                <div className="absolute inset-0 bg-slate-50/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mb-2 shadow-xs">
                    <Lock className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                    Noe nytt kommer
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Lanseres snart
                  </span>

                  {/* Hvis Svein tester, har han en diskret hurtiglenke til dev-lab */}
                  {isSvein && (
                    <button
                      onClick={() => navigate(modul.sti)}
                      className="mt-2 text-[10px] bg-slate-900 text-white font-bold px-2 py-1 rounded hover:bg-slate-800 transition"
                    >
                      Dev test #{idx + 1}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
