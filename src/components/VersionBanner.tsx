import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';

const CURRENT_VERSION = 'v3.6.9';
const VERSION_KEY = 'blu_app_version';

export const VersionBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    try {
      const storedVersion = localStorage.getItem(VERSION_KEY);
      if (storedVersion && storedVersion !== CURRENT_VERSION) {
        setShowBanner(true);
      }
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    } catch (e) {
      console.warn('Kunne ikke lese/skrive versjon til localStorage:', e);
    }
  }, []);

  const handleHardReload = () => {
    setIsRefreshing(true);
    try {
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
      // Tøm unødvendige cacher ved behov
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch (e) {
      console.error('Feil ved tømming av cache:', e);
    }
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  if (!showBanner) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white px-4 py-2.5 text-xs font-medium flex items-center justify-between gap-3 shadow-md border-b border-indigo-700/60 sticky top-0 z-50">
      <div className="flex items-center gap-2 truncate">
        <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
        <span className="truncate">
          <strong className="font-bold text-white">Ny oppdatering ({CURRENT_VERSION}) er klar!</strong> Tøm hurtigbufferen for å sikre nyeste veilederfunksjoner.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleHardReload}
          disabled={isRefreshing}
          className="px-3 py-1 bg-white text-indigo-950 hover:bg-indigo-50 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Laster på nytt...' : 'Oppdater nå'}</span>
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="p-1 text-indigo-200 hover:text-white rounded-lg transition-colors cursor-pointer"
          title="Lukk banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
