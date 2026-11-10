import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  Info, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  FileText, 
  Lock, 
  Scale, 
  AlertTriangle,
  Server,
  Activity,
  Layers,
  GraduationCap
} from 'lucide-react';
import { LegalModal } from '../common/LegalModal';

interface OmPedPortalenViewProps {
  className?: string;
  embedded?: boolean;
}

export const OmPedPortalenView: React.FC<OmPedPortalenViewProps> = ({ 
  className = '',
  embedded = false 
}) => {
  const [showOlderVersions, setShowOlderVersions] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms'>('privacy');

  const openLegal = (tab: 'privacy' | 'terms') => {
    setLegalTab(tab);
    setLegalModalOpen(true);
  };

  return (
    <div className={`space-y-6 text-slate-800 ${className}`}>
      
      {/* Sidetittel hvis den ikke er embedded */}
      {!embedded && (
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-bold mb-2">
            <Info className="w-3.5 h-3.5 text-indigo-600" />
            <span>PedPortalen v3.6.6 (Sikkerhet, Drift & Progresjon)</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Om PedPortalen & Systemstatus</h2>
          <p className="text-slate-500 text-sm mt-1">Versjonskontroll, faglige rammer, driftsstatus og juridiske betingelser for barnehagen.</p>
        </div>
      )}

      {/* Hovedkort: Om PedPortalen */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xs border border-slate-200 space-y-6">
        
        {/* Tittel og Ingress */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="bg-indigo-600 p-3.5 rounded-2xl text-white shadow-sm shrink-0">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">PedPortalen</h3>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Det digitale profesjons- og ledelsesverktøyet for barnehagens ledere, pedagoger, fagarbeidere, assistenter og vikarer.
            </p>
          </div>
        </div>

        {/* Beskrivelse */}
        <div className="text-xs md:text-sm leading-relaxed text-slate-700 space-y-3">
          <p className="font-bold text-slate-900 text-sm md:text-base">
            Samler barnehageloven, Rammeplanen, HMS, bemanningsstyring og didaktisk praksis i ett helhetlig system.
          </p>
          <p>
            PedPortalen er utviklet for å gi barnehageledere og ansatte en trygg, effektiv og praksisnær barnehagehverdag. 
            Ved å kombinere juridisk og didaktisk fagkunnskap med moderne KI-støtte, forenkler appen alt fra dagsrytme, ukeplaner og månedsbrev 
            til tilsyn, HMS-avvik, vaktlister og spesialpedagogiske tiltaksplaner (ITP).
          </p>
        </div>

        {/* 2 Søyler: Personvern/GDPR & KI-Etikk */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
            <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Personvern, GDPR & SIKT</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Alle barnehagedata, observasjoner og personalnotater lagres kryptert i Google Firebase (EU/EØS-skylagring). 
              Oppfyller GDPR, Normen for informasjonssikkerhet i helse- og skolesektoren og Udirs retningslinjer. Data deles aldri med tredjeparter.
            </p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
            <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Ansvarlig bruk av KI i Barnehagen</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              KI-assistentene (Styrer-AI, Pedleder-AI, Assistentn-AI) er trent som reflekterende sparringspartnere forankret i Rammeplanen. 
              Det faglige, skjønnsmessige og juridiske ansvaret ligger alltid hos barnehagens kvalifiserte personal.
            </p>
          </div>
        </div>

        {/* DRIFTSSTATUS OG SYSTEMMÅLINGER */}
        <div className="pt-4 border-t border-slate-100">
          <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>Systemstatus & Driftsmiljø</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Appversjon</span>
              <span className="text-base font-extrabold text-slate-900 mt-0.5 block">v3.6.6</span>
              <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Produksjonsklar
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Driftsstatus</span>
              <span className="text-base font-extrabold text-emerald-700 mt-0.5 block flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                100% Operativ
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Google Cloud Infrastructure</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Siste oppdatering</span>
              <span className="text-base font-extrabold text-slate-900 mt-0.5 block">November 2026</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Kryptografisk verifisert</span>
            </div>
          </div>
        </div>

        {/* Versjonshistorikk & Kildegrunnlag */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          
          {/* Venstre kolonne: Versjonshistorikk */}
          <div>
            <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Versjonshistorikk</span>
            </h4>
            
            <div className="space-y-2 text-xs">
              {/* Siste versjon */}
              <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-200/80">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <strong className="text-indigo-950 font-bold">v3.6.6 – Sikkerhet, KI-arkitektur & Stabilitet (November 2026)</strong>
                  <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200 shrink-0">
                    Aktiv
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed mt-1">
                  Herdet KI-arkitektur med Secret Manager, token-autentisering for eksterne endepunkter, ressursoptimalisering og forsterket systemstabilitet på tvers av samtlige portalfunksjoner.
                </p>
              </div>

              {/* Nedtrekk for tidligere versjoner */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowOlderVersions(!showOlderVersions)}
                  className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 py-1 cursor-pointer"
                >
                  <span>Tidligere versjoner (v3.6.5, v3.6.4, v3.6.1, v3.6.0)</span>
                  {showOlderVersions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showOlderVersions && (
                  <div className="space-y-2 mt-2 pl-2 border-l-2 border-slate-200 text-[11px] text-slate-600">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                      <strong className="text-slate-900 block font-bold mb-0.5">v3.6.5 (November 2026)</strong>
                      <span>Didaktisk ukeplan, Bemanningsradar, Morgenpuls-rapportering, PPT-Skjold for anonymiserte bekymringsmeldinger, ITP-malbygger, HMS-avvik og samordnet versjonskontroll på tvers av alle 5 roller.</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                      <strong className="text-slate-900 block font-bold mb-0.5">v3.6.4 (November 2026)</strong>
                      <span>Pedagogisk Grunnsyn Builder, Sokratisk veileder for barnehagelærere og Word/PDF-eksport.</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                      <strong className="text-slate-900 block font-bold mb-0.5">v3.6.1 (Oktober 2026)</strong>
                      <span>Integrasjon av Fagarbeidern idédatabase og Assistentn "Hva gjør jeg hvis..." trygghetsguide.</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                      <strong className="text-slate-900 block font-bold mb-0.5">v3.6.0 (Oktober 2026)</strong>
                      <span>Lansering av Styrern brennlinje, HMS-radar, vaktliste/turnus og årshjul med lovkrav.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Høyre kolonne: Kildegrunnlag & Lovverk */}
          <div>
            <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Kildegrunnlag & Lovverk</span>
            </h4>
            
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-indigo-600 font-bold">📜</span>
                <div>
                  <strong className="text-slate-900 block">Lov om barnehager (Barnehageloven)</strong>
                  <span>Spesielt §§ 1, 2, 3, 4, 19, 31, 37, 41 og 42 om formål, innhold, barnets beste, spesialpedagogikk og internkontroll.</span>
                </div>
              </li>

              <li className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-indigo-600 font-bold">📘</span>
                <div>
                  <strong className="text-slate-900 block">Forskrift om rammeplan for barnehagen</strong>
                  <span>De 7 fagområdene, leken som kjerne, omsorg, danning, medvirkning og progresjon.</span>
                </div>
              </li>

              <li className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-indigo-600 font-bold">🏛️</span>
                <div>
                  <strong className="text-slate-900 block">Utdanningsdirektoratet (Udir) & SIKT</strong>
                  <span>Nasjonale faglige veiledere for barnehageledelse, tilsyn og personvern (GDPR).</span>
                </div>
              </li>

              <li className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-indigo-600 font-bold">🕊️</span>
                <div>
                  <strong className="text-slate-900 block">FNs Barnekonvensjon</strong>
                  <span>Barns rett til trygghet, hvile, lek, medvirkning og utvikling.</span>
                </div>
              </li>
            </ul>
          </div>

        </div>

        {/* Bruksvilkår & Viktig ansvarsfraskrivelse */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
            <strong className="font-bold flex items-center gap-1.5 text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Viktig ansvarsfraskrivelse og faglig skjønn</span>
            </strong>
            <p className="leading-relaxed text-amber-900/90">
              PedPortalen er et beslutningsstøtte- og effektiviseringsverktøy for barnehagens ansatte. Kunstig intelligens kan generere forslag til ukeplaner, månedsbrev eller forarbeid til PPT, men erstatter aldri formelle forvaltningsvedtak eller kvalifisert pedagogisk/juridisk skjønn. Barnehagens styrer og pedagogiske ledere er selv ansvarlige for innholdet i sine planer og meldinger.
            </p>
          </div>

          {/* Knapper for Juridisk modal */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500 font-medium space-y-1">
              <span className="block">PedPortalen © {new Date().getFullYear()} S. Nordvik · Med enerett.</span>
              <span className="block">Support: <a href="mailto:support@pedportalen.no" className="hover:text-indigo-600 hover:underline">support@pedportalen.no</a></span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openLegal('privacy')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-bold rounded-lg text-xs transition border border-slate-200 cursor-pointer"
              >
                Personvernerklæring
              </button>
              <button
                type="button"
                onClick={() => openLegal('terms')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-bold rounded-lg text-xs transition border border-slate-200 cursor-pointer"
              >
                Brukervilkår
              </button>
            </div>
          </div>
        </div>

      </div>

      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalTab}
      />
    </div>
  );
};

export default OmPedPortalenView;
