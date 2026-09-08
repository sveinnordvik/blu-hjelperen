import React, { useState } from 'react';
import { getAuth, deleteUser } from 'firebase/auth';
import { getFirestore, doc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { Trash2, AlertTriangle, ShieldAlert, CheckCircle2, Loader2, X } from 'lucide-react';
import { auth as defaultAuth, db as defaultDb } from '../firebase';

interface DeleteDataButtonProps {
  onSuccess?: () => void;
  className?: string;
  buttonText?: string;
  variant?: 'danger-card' | 'button-only';
}

export default function DeleteDataButton({ 
  onSuccess, 
  className = '', 
  buttonText = 'Slett min konto og alle data',
  variant = 'danger-card'
}: DeleteDataButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Ingen innlogget bruker funnet.');
      }

      const db = getFirestore();
      const userId = user.uid;

      // 1. Slett undermapper/dokumenter (chats, chatHistory, documents, projects, process_logs) i Firestore ved hjelp av batch
      const batch = writeBatch(db);
      
      const subcollections = ['chats', 'chatHistory', 'documents', 'projects', 'process_logs'];
      for (const subcol of subcollections) {
        try {
          const subRef = collection(db, `users/${userId}/${subcol}`);
          const subSnapshot = await getDocs(subRef);
          subSnapshot.forEach((document) => {
            batch.delete(document.ref);
          });
        } catch (subErr) {
          console.warn(`Kunne ikke slette undersamling ${subcol}:`, subErr);
        }
      }

      // Slett brukerens hoveddokument i users-kolleksjonen
      const userDocRef = doc(db, 'users', userId);
      batch.delete(userDocRef);

      await batch.commit();

      // 2. Slett selve Firebase Auth-brukeren (fullstendig sletting av konto)
      await deleteUser(user);

      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
      
      // Full refresh eller reload hvis relevant
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      console.error('Feil ved sletting av data:', err);
      if (err?.code === 'auth/requires-recent-login') {
        setError('Sikkerhetskrav: Av sikkerhetsmessige årsaker krever sletting av konto at du nylig har logget inn. Vennligst logg ut og inn igjen, og prøv deretter på nytt.');
      } else {
        setError('Det oppstod en feil under sletting. Du må kanskje logge inn på nytt for å bekrefte identiteten din før sletting.');
      }
      setIsDeleting(false);
    }
  };

  return (
    <div className={className}>
      {variant === 'danger-card' ? (
        <div className="p-5 bg-red-50/70 rounded-2xl border border-red-200/80 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-red-950 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-600" />
                Slett all min data (GDPR)
              </h4>
              <p className="text-xs text-red-800/90 mt-1 leading-relaxed">
                I henhold til GDPR kan du når som helst slette all din historikk, innstillinger og brukerprofil permanent fra BLU-hjelperen. Denne handlingen kan ikke angres.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm cursor-pointer flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {buttonText}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm cursor-pointer text-xs flex items-center gap-2"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {buttonText}
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => !isDeleting && setIsOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h4 className="text-lg font-black text-slate-900 mb-2">Er du helt sikker?</h4>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Dette vil slette all chat-historikk, lagrede innstillinger og din konto permanent fra systemet vårt. Du vil ikke kunne gjenopprette informasjonen.
            </p>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <div className="mb-5 p-3.5 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Data og konto er nå permanent slettet. Omdirigerer...</span>
              </div>
            ) : (
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setIsOpen(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-slate-700 bg-slate-100 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleDeleteAllData}
                  disabled={isDeleting}
                  className="px-5 py-2.5 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-red-600/20"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sletter...
                    </>
                  ) : (
                    'Ja, slett alt permanent'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
