import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Lock, 
  Users, 
  Sparkles, 
  MessageSquareHeart, 
  PenTool, 
  CheckCircle2, 
  Loader2
} from 'lucide-react';

/**
 * BetaContractModal
 * 
 * En sperre-modal for betatestere av PedPortalen. Modalen tvinger brukeren
 * til å lese igjennom og akseptere betabetingelser, taushetsplikt og retningslinjer
 * før tilgang gis.
 * 
 * Props:
 * - isOpen: boolean (om modalen skal vises)
 * - userId: string (valgfri ID på brukeren)
 * - userEmail: string (valgfri e-post)
 * - onSignComplete: function (kalles når kontrakten er signert og lagret)
 */
export default function BetaContractModal({ 
  isOpen = true, 
  userId = 'current-user-id',
  userEmail = 'bruker@example.com',
  onSignComplete 
}) {
  const [isChecked, setIsChecked] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const isFormValid = isChecked && typedName.trim().length > 2;

  /**
   * handleSignContract
   * Håndterer digital signering og mockup av Firebase backend-operasjoner.
   */
  const handleSignContract = async (e) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const timestamp = new Date().toISOString();
      const signedName = typedName.trim().toUpperCase();

      // =========================================================================
      // MOCKUP / PLACEHOLDER FOR FIREBASE & PDF GENERATION BACKEND LOGIC
      // =========================================================================

      /* 
       STEP 1: GENERER PDF AV KONTRAKTEN (pseudokode med jsPDF)
       -------------------------------------------------------------------------
       import { jsPDF } from "jspdf";
       const doc = new jsPDF();
       doc.setFontSize(16);
       doc.text("PedPortalen - Betatesteravtale & Taushetsplikt", 20, 20);
       doc.setFontSize(11);
       doc.text(`Signert av: ${signedName}`, 20, 35);
       doc.text(`E-post: ${userEmail}`, 20, 42);
       doc.text(`Tidsstempel: ${timestamp}`, 20, 49);
       doc.text("Status: Godkjent & Akseptert", 20, 56);
       // ... legg til avtaleteks ...
       const pdfBlob = doc.output('blob');
      */
      console.log(`[PDF Gen] Genererer kontrakt PDF for ${signedName} (${timestamp})...`);

      /* 
       STEP 2: LAST OPP PDF TIL FIREBASE STORAGE
       -------------------------------------------------------------------------
       import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
       const storage = getStorage();
       const storageRef = ref(storage, `users/${userId}/contracts/betakontrakt.pdf`);
       const snapshot = await uploadBytes(storageRef, pdfBlob);
       const pdfDownloadUrl = await getDownloadURL(snapshot.ref);
      */
      console.log(`[Firebase Storage] Laster opp betakontrakt.pdf til /users/${userId}/contracts/betakontrakt.pdf`);
      const pdfDownloadUrl = `https://storage.googleapis.com/pedportalen-mock/users/${userId}/contracts/betakontrakt.pdf`;

      /* 
       STEP 3: OPPDATER BRUKERENS FIRESTORE-DOKUMENT
       -------------------------------------------------------------------------
       import { db } from '../firebase';
       import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
       const userDocRef = doc(db, 'users', userId);
       await updateDoc(userDocRef, {
         harSignertBetaKontrakt: true,
         signaturNavn: signedName,
         signaturDato: serverTimestamp(),
         kontraktPdfUrl: pdfDownloadUrl
       });
      */
      console.log(`[Firestore] Oppdaterer users/${userId}: harSignertBetaKontrakt = true`);

      /* 
       STEP 4: OPPRETT MAIL-DOKUMENT (for Firebase Trigger Email Extension)
       -------------------------------------------------------------------------
       import { collection, addDoc } from 'firebase/firestore';
       await addDoc(collection(db, 'mail'), {
         to: ['svein.nordvik@gmail.com'],
         message: {
           subject: `ATT: PedPortalen Kontrakt - Signert av ${signedName}`,
           html: `
             <h2>Ny signert betakontrakt mottatt!</h2>
             <p><strong>Tester:</strong> ${signedName} (${userEmail})</p>
             <p><strong>Bruker-ID:</strong> ${userId}</p>
             <p><strong>Tidsstempel:</strong> ${timestamp}</p>
             <p><a href="${pdfDownloadUrl}">Klikk her for å laste ned signert PDF-kontrakt</a></p>
           `
         }
       });
      */
      console.log(`[Firebase Mail] Sendt varsel om signert kontrakt til svein.nordvik@gmail.com`);

      // Simulert nettverksforsinkelse
      await new Promise((resolve) => setTimeout(resolve, 1200));

      setIsSuccess(true);

      // Korte sekunder visning før modal lukkes
      setTimeout(() => {
        if (onSignComplete) {
          onSignComplete();
        }
      }, 600);

    } catch (error) {
      console.error("Feil ved signering av betakontrakt:", error);
      alert("Kunne ikke fullføre signeringen. Vennligst prøv igjen.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
      {/* Modal Container */}
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden text-slate-800">
        
        {/* Header (Sticky top) */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 px-6 py-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <ShieldCheck className="w-7 h-7 text-teal-100" />
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 mb-1 text-[11px] font-semibold tracking-wider text-teal-100 uppercase bg-white/20 rounded-full">
                Eksklusiv Pilot-Tilgang
              </span>
              <h2 className="text-xl sm:text-2xl font-bold leading-tight">
                Velkommen som Pilot-tester for PedPortalen!
              </h2>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base divide-y divide-slate-100">
          
          {/* Ingress */}
          <div className="bg-teal-50/70 border border-teal-100 rounded-xl p-4 sm:p-5 text-teal-950">
            <p className="font-medium leading-relaxed">
              Vi er utrolig glade for å ha deg med på laget! Du får nå eksklusiv tilgang til en tidlig versjon av PedPortalen – et helt nytt økosystem bygget for å fjerne tidstyver og løfte det pedagogiske arbeidet i barnehagen. For at vi skal kunne teste systemet best mulig før det lanseres offentlig, har vi noen enkle spilleregler vi ber deg lese gjennom og godkjenne.
            </p>
          </div>

          {/* Seksjon 1 */}
          <div className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-teal-800 font-bold text-base sm:text-lg">
              <Sparkles className="w-5 h-5 text-teal-600 shrink-0" />
              <h3>1. Slik fungerer testingen (De to fasene)</h3>
            </div>
            <p className="text-slate-600">
              Verdien i PedPortalen ligger i hvordan de ulike rollene snakker sammen.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1">
                <h4 className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                  Fase 1 (Nivå-testing)
                </h4>
                <p className="text-xs sm:text-sm text-slate-600">
                  Som vår "Champion" vil du først få tilgang til å teste funksjonene på tvers av de ulike nivåene, én etter én, for å gi tilbakemeldinger på helheten i appen.
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1">
                <h4 className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Fase 2 (Lag-testing)
                </h4>
                <p className="text-xs sm:text-sm text-slate-600">
                  Etter hvert vil vi gi tilgang til utvalgte testpersoner i din barnehage på de andre nivåene, slik at dere kan teste hvordan systemet fungerer i dynamisk samspill.
                </p>
              </div>
            </div>
          </div>

          {/* Seksjon 2 */}
          <div className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-teal-800 font-bold text-base sm:text-lg">
              <Lock className="w-5 h-5 text-teal-600 shrink-0" />
              <h3>2. Hemmelighold og beskyttelse av idé (Taushetsplikt)</h3>
            </div>
            <p className="text-slate-600">
              PedPortalen er fortsatt et hemmelig prosjekt, og det unike designet, funksjonene og konseptet (vår "IP") eies i sin helhet av systemets skaper. For å beskytte dette ber vi om følgende:
            </p>
            <ul className="space-y-3 mt-2">
              <li className="flex items-start gap-3 bg-amber-50/60 border border-amber-200/60 p-3.5 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900">"What happens in the portal, stays in the portal": </span>
                  <span className="text-slate-700">Du kan gjerne fortelle kollegaer at du tester et nytt og spennende verktøy, men vi ber deg om å ikke dele skjermbilder, skjermopptak, kildekode eller innloggingsdetaljer med utenforstående eller konkurrerende aktører.</span>
                </div>
              </li>
              <li className="flex items-start gap-3 bg-amber-50/60 border border-amber-200/60 p-3.5 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900">Ingen kopiering: </span>
                  <span className="text-slate-700">Funksjoner, design og logikk du får tilgang til skal ikke kopieres eller brukes til å utvikle konkurrerende tjenester.</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Seksjon 3 */}
          <div className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-teal-800 font-bold text-base sm:text-lg">
              <Users className="w-5 h-5 text-teal-600 shrink-0" />
              <h3>3. Realistisk bruk i testfasen</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              For at vi skal få testet appen slik den faktisk vil fungere i din arbeidshverdag, oppfordrer vi deg til å bruke den så reelt som mulig. Du kan trygt bruke ekte navn på ansatte når du for eksempel tester bemanningsradaren eller planleggingsverktøyene. Når det gjelder barn og foresatte, er systemet allerede bygget med innebygde anonymiserings-skjold (blant annet i ITP-byggeren og ved generering av «Dagens Bilde»). Du kan derfor trygt teste disse verktøyene på reelle pedagogiske situasjoner, vel vitende om at appen sørger for at personvernet ivaretas.
            </p>
          </div>

          {/* Seksjon 4 */}
          <div className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-teal-800 font-bold text-base sm:text-lg">
              <MessageSquareHeart className="w-5 h-5 text-teal-600 shrink-0" />
              <h3>4. Dine tilbakemeldinger er gull verdt!</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Målet med denne testfasen er å finne feil, forbedre brukeropplevelsen og bygge et verktøy som faktisk fungerer i en hektisk barnehagehverdag. Dine ærlige tilbakemeldinger – enten det gjelder noe som er fantastisk, eller noe som er skikkelig frustrerende – gir oss nøyaktig det vi trenger for å gjøre PedPortalen perfekt.
            </p>
          </div>

        </div>

        {/* Digital Signatur Sticky Footer */}
        <div className="sticky bottom-0 z-20 bg-slate-50 border-t border-slate-200 p-5 sm:p-6 shadow-lg space-y-4">
          <form onSubmit={handleSignContract} className="space-y-4">
            {/* Avkrysningsboks */}
            <label className="flex items-start gap-3 cursor-pointer group select-none">
              <input 
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-1 w-5 h-5 text-teal-600 border-slate-300 rounded focus:ring-teal-500 focus:ring-offset-0 cursor-pointer accent-teal-600"
              />
              <span className="text-xs sm:text-sm text-slate-700 group-hover:text-slate-900 leading-snug">
                Jeg bekrefter at jeg forstår og aksepterer spillereglene for betatestingen og taushetsplikten knyttet til prosjektet.
              </span>
            </label>

            {/* Input & Signeringsknapp Row */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <PenTool className="w-4 h-4" />
                </div>
                <input 
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Navn med blokkbokstaver (digital signatur)"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono tracking-wider uppercase placeholder:normal-case placeholder:font-sans placeholder:tracking-normal"
                />
              </div>

              <button
                type="submit"
                disabled={!isFormValid || isSubmitting || isSuccess}
                className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-2 whitespace-nowrap min-w-[180px] ${
                  isFormValid && !isSubmitting && !isSuccess
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 hover:shadow-lg active:scale-[0.99]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signerer...</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Signert!</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Signer og fortsett</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
