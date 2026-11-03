import React, { useState } from 'react';
import { useRole } from '../../context/RoleContext';
import { LegalModal } from './LegalModal';
import { Shield, Scale } from 'lucide-react';

interface PortalFooterProps {
  className?: string;
  theme?: 'dark' | 'light';
}

export const PortalFooter: React.FC<PortalFooterProps> = ({ 
  className = '',
  theme = 'light'
}) => {
  const { role, isSvein, isPortalBeta } = useRole();
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms'>('privacy');

  const canAccessPortal = isSvein || isPortalBeta;
  const brandName = canAccessPortal ? 'PedPortalen' : 'BLU-hjelperen';
  const tagLine = canAccessPortal ? 'Profesjonsverktøy for barnehagen' : 'Digital partner for barnehagelærerstudiet';
  const appVersion = '3.6.4';

  const openLegal = (tab: 'privacy' | 'terms') => {
    setLegalTab(tab);
    setLegalModalOpen(true);
  };

  const isDark = theme === 'dark';

  return (
    <>
      <footer 
        className={`w-full py-6 px-4 border-t transition-colors mt-auto ${
          isDark 
            ? 'bg-[#151336] border-indigo-950/80 text-indigo-300/70' 
            : 'bg-white/80 border-slate-200/80 text-slate-500'
        } ${className}`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Varemerke og versjon */}
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span className={`font-bold ${isDark ? 'text-indigo-100' : 'text-slate-800'}`}>
              {brandName}
            </span>
            <span aria-hidden="true" className="opacity-40">·</span>
            <span>Versjon {appVersion}</span>
            <span aria-hidden="true" className="opacity-40">·</span>
            <span className="opacity-80">{tagLine}</span>
          </div>

          {/* Juridiske lenker */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openLegal('privacy')}
              className={`inline-flex items-center gap-1.5 font-medium transition hover:underline cursor-pointer ${
                isDark ? 'text-indigo-200 hover:text-white' : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              <Shield className="w-3.5 h-3.5 opacity-70" />
              <span>Personvernerklæring</span>
            </button>
            <span aria-hidden="true" className="opacity-40">·</span>
            <button
              type="button"
              onClick={() => openLegal('terms')}
              className={`inline-flex items-center gap-1.5 font-medium transition hover:underline cursor-pointer ${
                isDark ? 'text-indigo-200 hover:text-white' : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              <Scale className="w-3.5 h-3.5 opacity-70" />
              <span>Brukervilkår</span>
            </button>
          </div>
        </div>
      </footer>

      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalTab}
      />
    </>
  );
};

export default PortalFooter;
