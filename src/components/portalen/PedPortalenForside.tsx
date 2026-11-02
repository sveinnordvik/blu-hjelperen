import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Sparkles, 
  Lock, 
  ArrowRight, 
  LayoutDashboard, 
  Compass, 
  Palette, 
  HeartHandshake, 
  Zap, 
  ShieldCheck 
} from 'lucide-react';
import { useRole, Role } from '../../context/RoleContext';
import PortalFooter from '../common/PortalFooter';

interface PedPortalenForsideProps {
  onSelectApp?: (appId: string) => void;
  isSvein?: boolean;
}

export default function PedPortalenForside({ onSelectApp, isSvein: propIsSvein }: PedPortalenForsideProps) {
  const navigate = useNavigate();
  const { isSvein: contextIsSvein, isPortalBeta, hasBluAccess, setRole } = useRole();
  const isSvein = propIsSvein ?? contextIsSvein;

  // Har brukeren tilgang til Portalen-rollene (Betabruker Håvard, Svein, eller autorisert)
  const canAccessPortal = isSvein || isPortalBeta;
  const canAccessBlu = hasBluAccess;

  // Håndter navigasjon til BLU-hjelperen
  const handleOpenBlu = () => {
    if (!canAccessBlu) return;
    if (onSelectApp) {
      onSelectApp('student');
      return;
    }
    setRole('STUDENTN');
    navigate('/blu-hjelperen');
  };

  // Håndter navigasjon til en portalrolle
  const handleOpenRole = (roleId: Role, path: string) => {
    setRole(roleId);
    if (onSelectApp) {
      onSelectApp(roleId.toLowerCase());
      return;
    }
    navigate(path);
  };

  // De 5 offisielle portalrollene
  const portalRoles = [
    {
      id: 'STYRERN' as Role,
      title: 'Styrern',
      kicker: 'Overordnet ledelse',
      description: 'Bemanningsradar, HMS & avvik, vaktlister, årshjul og AI-lederstøtte.',
      icon: LayoutDashboard,
      path: '/styrer',
      color: 'bg-indigo-600',
      hoverBorder: 'hover:border-indigo-500',
      buttonBg: 'bg-indigo-600 hover:bg-indigo-700'
    },
    {
      id: 'PEDLEDERN' as Role,
      title: 'Pedledern',
      kicker: 'Pedagogisk ledelse',
      description: 'Didaktisk ukeplan, dagsrytme, månedsbrev, observasjoner og PPT-støtte.',
      icon: Compass,
      path: '/pedleder',
      color: 'bg-emerald-600',
      hoverBorder: 'hover:border-emerald-500',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700'
    },
    {
      id: 'FAGARBEIDERN' as Role,
      title: 'Fagarbeidern',
      kicker: 'Praksisnær pedagogikk',
      description: 'Idébank for barnegruppa, sansestimulering, hverdagsrutiner og fagbrev.',
      icon: Palette,
      path: '/fagarbeider',
      color: 'bg-amber-600',
      hoverBorder: 'hover:border-amber-500',
      buttonBg: 'bg-amber-600 hover:bg-amber-700'
    },
    {
      id: 'ASSISTENTN' as Role,
      title: 'Assistentn',
      kicker: 'Trygghet og omsorg',
      description: 'Trygghetsguiden «Hva gjør jeg hvis...», garderobeguide for vær og samlingsleker.',
      icon: HeartHandshake,
      path: '/assistent',
      color: 'bg-teal-600',
      hoverBorder: 'hover:border-teal-500',
      buttonBg: 'bg-teal-600 hover:bg-teal-700'
    },
    {
      id: 'VIKARN' as Role,
      title: 'Vikarn',
      kicker: 'Hurtigonboarding',
      description: '5-minutters introduksjon, sikkerhetsrutiner, avdelingsark og timeregistrering.',
      icon: Zap,
      path: '/vikar',
      color: 'bg-cyan-700',
      hoverBorder: 'hover:border-cyan-600',
      buttonBg: 'bg-cyan-700 hover:bg-cyan-800'
    }
  ];

  // Dummy teaser-moduler for ukjente/uinnloggede gjester
  const kommendeModuler = [
    { id: 'modul-1', farge: 'bg-indigo-600', sti: '/styrer' },
    { id: 'modul-2', farge: 'bg-emerald-600', sti: '/pedleder' },
    { id: 'modul-3', farge: 'bg-orange-500', sti: '/fagarbeider' },
    { id: 'modul-4', farge: 'bg-pink-500', sti: '/assistent' },
    { id: 'modul-5', farge: 'bg-teal-500', sti: '/vikar' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center p-6 md:p-12 font-sans">
      <div className="max-w-5xl w-full mt-4">
        
        {/* LOGO & OVERSKRIFT */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/20 text-white">
            <span className="text-2xl font-black tracking-tight">{canAccessPortal ? 'PED' : 'BLU'}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
            {canAccessPortal ? 'PedPortalen' : 'BLU-hjelperen'}
          </h1>
          <p className="text-slate-500 text-sm md:text-base mt-2 max-w-xl mx-auto">
            {canAccessPortal 
              ? 'Profesjonsverktøy for barnehageledere, pedagoger, fagarbeidere og assistenter.' 
              : 'Din digitale partner for pedagogisk praksis og faglig fordypning.'}
          </p>
        </div>

        {/* INFO-BOKS NÅR PORTALEN ER AKTIV */}
        {canAccessPortal && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-8 flex items-start gap-3.5 shadow-xs">
            <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-700 shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950 mb-0.5">
                Velkommen til Portalen (Beta-tilgang)
              </h3>
              <p className="text-xs md:text-sm text-emerald-900/90 leading-relaxed">
                Du har tilgang til alle fem profesjonsrollene i Portalen nedenfor. Velg ønsket rolle for å starte, eller bytt rolle når som helst via profil-badgen.
              </p>
            </div>
          </div>
        )}

        {!canAccessPortal && (
          <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-6 md:p-7 mb-10 flex flex-col md:flex-row items-start gap-4 shadow-xs">
            <div className="bg-blue-100 p-3 rounded-xl text-blue-600 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-blue-950 mb-1.5 flex items-center gap-2">
                Noe nytt og spennende er på vei!
              </h3>
              <p className="text-blue-900/90 leading-relaxed text-sm md:text-base">
                Vi jobber med spennende utvidelser og nye verktøy for barnehagen. I mellomtiden er{' '}
                <strong>BLU-hjelperen</strong> åpen og klar til bruk nedenfor!
              </p>
            </div>
          </div>
        )}

        {/* 1. BLU-HJELPEREN (ÅPEN HVIS canAccessBlu, LÅST FOR BETABRUKER HÅVARD) */}
        <div className="mb-10">
          {canAccessBlu ? (
            /* ÅPEN BLU-HJELPER */
            <button
              type="button"
              onClick={handleOpenBlu}
              className="w-full relative group p-7 md:p-8 rounded-3xl bg-white border-2 border-blue-500/30 hover:border-blue-600 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 text-left cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div className="flex items-start md:items-center gap-5">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/30 shrink-0 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-9 h-9 md:w-11 md:h-11" />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Aktiv og klar</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                    BLU-hjelperen
                  </h2>
                  <p className="text-slate-600 text-sm md:text-base mt-1 max-w-xl">
                    Din KI-drevne skrivepartner og veileder for bacheloroppgave og praksis.
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
          ) : (
            /* LÅST BLU-HJELPER FOR BETABRUKER */
            <div className="w-full p-7 md:p-8 rounded-3xl bg-slate-100/90 border-2 border-slate-300/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 opacity-90">
              <div className="flex items-start md:items-center gap-5">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-slate-300 text-slate-600 flex items-center justify-center shadow-inner shrink-0">
                  <Lock className="w-8 h-8 text-slate-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span>Reservert for studenter</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-slate-700">
                    BLU-hjelperen
                  </h2>
                  <p className="text-slate-500 text-sm md:text-base mt-1 max-w-xl">
                    Skrivepartner og didaktisk veileder for barnehagelærerutdanningen.
                  </p>
                  <p className="text-xs text-slate-400 mt-2 italic">
                    Denne modulen er låst for din brukerkonto. Bruk de åpne portalverktøyene nedenfor.
                  </p>
                </div>
              </div>

              <div className="shrink-0 self-end md:self-center">
                <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-200 text-slate-500 font-bold text-xs border border-slate-300 select-none cursor-not-allowed">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Kun for studenter</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2. PORTALENS ROLLER */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-5 px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {canAccessPortal ? 'Tilgjengelige roller i Portalen' : 'Kommende verktøy (under utvikling)'}
            </h3>
            {canAccessPortal && (
              <span className="text-xs font-semibold text-emerald-700">
                5 aktive roller
              </span>
            )}
          </div>

          {canAccessPortal ? (
            /* ÅPNE KORT FOR BETABRUKER / AUTORISERT */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {portalRoles.map((roleItem) => {
                const IconComponent = roleItem.icon;
                return (
                  <div
                    key={roleItem.id}
                    className={`bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between ${roleItem.hoverBorder}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl ${roleItem.color} flex items-center justify-center text-white shadow-sm`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {roleItem.kicker}
                        </span>
                      </div>
                      <h4 className="text-xl font-black text-slate-900 mb-2">
                        {roleItem.title}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed mb-6">
                        {roleItem.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenRole(roleItem.id, roleItem.path)}
                      className={`w-full py-2.5 px-4 rounded-xl ${roleItem.buttonBg} text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer`}
                    >
                      <span>Åpne {roleItem.title}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* LÅSTE / SLØREDE TEASER-KORT FOR IKKE-AUTORISERTE */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {kommendeModuler.map((modul, idx) => (
                <div
                  key={modul.id}
                  className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-xs flex flex-col min-h-[170px]"
                >
                  <div className="filter blur-[6px] select-none pointer-events-none opacity-40">
                    <div className={`${modul.farge} w-12 h-12 rounded-xl mb-4 opacity-50`}></div>
                    <div className="h-5 w-32 bg-slate-400 rounded mb-2"></div>
                    <div className="h-3 w-44 bg-slate-300 rounded mb-1.5"></div>
                    <div className="h-3 w-28 bg-slate-200 rounded"></div>
                  </div>

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

                    {isSvein && (
                      <button
                        onClick={() => navigate(modul.sti)}
                        className="mt-2 text-[10px] bg-slate-900 text-white font-bold px-2 py-1 rounded hover:bg-slate-800 transition cursor-pointer"
                      >
                        Dev test #{idx + 1}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <PortalFooter className="mt-auto max-w-5xl rounded-2xl bg-white border border-slate-200/80 shadow-xs" />
    </div>
  );
}
