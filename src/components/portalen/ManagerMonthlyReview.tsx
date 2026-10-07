import React, { useState, useEffect } from 'react';

interface ManagerMonthlyReviewProps {
  monthName?: string;
  unreviewedCount?: number;
  onSignOff?: () => void;
}

export default function ManagerMonthlyReview({ 
  monthName = "September 2026", 
  unreviewedCount: initialUnreviewedCount,
  onSignOff 
}: ManagerMonthlyReviewProps) {
  const [isSigned, setIsSigned] = useState<boolean>(() => {
    const storageKey = `styrern_monthly_review_signed_${monthName.replace(/\s+/g, '_').toLowerCase()}`;
    return localStorage.getItem(storageKey) === 'true';
  });

  const [realCount, setRealCount] = useState<number>(initialUnreviewedCount ?? 42);

  useEffect(() => {
    try {
      const savedArkiv = localStorage.getItem('styrern_hms_arkiv');
      if (savedArkiv) {
        const items = JSON.parse(savedArkiv);
        if (Array.isArray(items)) {
          const unreviewed = items.filter((item: any) => !item.manager_reviewed && !item.godkjentAvStyrer);
          if (unreviewed.length > 0) {
            setRealCount(unreviewed.length);
          } else if (initialUnreviewedCount !== undefined) {
            setRealCount(initialUnreviewedCount);
          }
        }
      }
    } catch (e) {
      console.error('Kunne ikke hente arkiv for ledergjennomgang:', e);
    }
  }, [initialUnreviewedCount]);

  const handleSignOff = () => {
    try {
      // Oppdaterer status på alle arkiverte sjekklister og rutiner i databasen / localStorage
      const savedArkiv = localStorage.getItem('styrern_hms_arkiv');
      if (savedArkiv) {
        const items = JSON.parse(savedArkiv);
        if (Array.isArray(items)) {
          const updatedItems = items.map((item: any) => ({
            ...item,
            manager_reviewed: true,
            godkjentAvStyrer: true,
            reviewedAt: new Date().toISOString(),
            reviewedBy: { uid: 'user_123', name: 'Karoline Haug (Styrer)' }
          }));
          localStorage.setItem('styrern_hms_arkiv', JSON.stringify(updatedItems));
        }
      }

      // Lagre at denne måneden er kvittert ut
      const storageKey = `styrern_monthly_review_signed_${monthName.replace(/\s+/g, '_').toLowerCase()}`;
      localStorage.setItem(storageKey, 'true');

      setIsSigned(true);

      if (onSignOff) {
        onSignOff();
      }
    } catch (err) {
      console.error('Feil ved utsignering av ledergjennomgang:', err);
      setIsSigned(true);
    }
  };

  if (isSigned) return null; // Skjules når måneden er kvittert ut

  return (
    <div className="bg-[#1e1b4b] border border-indigo-900/60 rounded-xl p-5 mb-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in duration-200">
      <div>
        <h3 className="font-semibold text-lg flex items-center gap-2 text-white">
          <svg className="w-5 h-5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          <span className="text-white font-bold text-lg">Ledergjennomgang for {monthName}</span>
        </h3>
        <p className="text-indigo-100 text-sm mt-1.5 font-medium leading-relaxed">
          Det er <span className="font-bold text-amber-300 underline decoration-amber-400/50 underline-offset-2">{realCount} fullførte sjekklister og rutiner</span> som krever styrers endelige godkjenning for forrige måned.
        </p>
      </div>
      
      <button 
        type="button"
        onClick={handleSignOff}
        className="shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-lg transition-all border border-emerald-400 cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2"
      >
        <span>Signer ut måneden digitalt</span>
      </button>
    </div>
  );
}
