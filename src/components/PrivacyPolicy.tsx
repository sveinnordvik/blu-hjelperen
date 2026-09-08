import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Shield, Lock, Eye, Cloud, Database, Mail } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack?: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  const lastUpdated = "April 2024";

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-700 selection:bg-primary/10">
      {/* Header / Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center">
          <button
            onClick={handleBack}
            className="group flex items-center gap-2 px-4 py-2 -ml-4 rounded-full hover:bg-slate-50 transition-all text-slate-500 hover:text-primary"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold tracking-tight">Tilbake til appen</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="prose prose-slate max-w-none"
        >
          <header className="mb-16">
            <div className="inline-flex items-center justify-center p-3 bg-primary-light/30 rounded-2xl mb-6">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Personvernerklæring for BLU-Hjelperen
            </h1>
            <p className="text-slate-400 font-medium tracking-wide">
              Sist oppdatert: {lastUpdated}
            </p>
          </header>

          <div className="space-y-12">
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-medium">
              I BLU-Hjelperen tar vi ditt personvern på alvor. Denne personvernerklæringen forklarer hvordan vi samler inn, bruker og beskytter dine personopplysninger når du bruker appen vår.
            </p>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight m-0">
                  1. Hvilke opplysninger samler vi inn?
                </h2>
              </div>
              <p className="leading-relaxed">
                Når du bruker BLU-Hjelperen, samler vi inn følgende informasjon for å kunne levere tjenesten til deg:
              </p>
              <ul className="space-y-3 list-none pl-0">
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0"><strong>Kontoinformasjon:</strong> E-postadresse og navn (når du oppretter konto via Google eller e-post).</p>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0"><strong>Betalingsinformasjon:</strong> Hvis du kjøper et abonnement, håndteres betalingen av vår sikre betalingspartner (Stripe). Vi lagrer aldri dine kredittkortdetaljer i våre systemer.</p>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0"><strong>Brukergenerert innhold:</strong> Tekst og stikkord du skriver inn i appens verktøy (for eksempel i referansegeneratoren eller tekstverktøyene) for å kunne generere de svarene du ber om.</p>
                </li>
              </ul>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight m-0">
                  2. Hvordan bruker vi informasjonen?
                </h2>
              </div>
              <p className="leading-relaxed">
                Vi bruker opplysningene dine utelukkende til å:
              </p>
              <ul className="space-y-3 list-none pl-0">
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0">Gi deg tilgang til appens funksjoner og opprettholde din brukerkonto.</p>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0">Håndtere abonnementer og betalinger.</p>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0">Forbedre tjenesten og rette eventuelle tekniske feil.</p>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0">Sende deg viktige oppdateringer om kontoen din eller appen (kun driftsrelatert, ingen spam).</p>
                </li>
              </ul>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Cloud className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight m-0">
                  3. Tredjepartstjenester vi deler data med
                </h2>
              </div>
              <p className="leading-relaxed">
                For at appen skal fungere, bruker vi anerkjente og sikre underleverandører:
              </p>
              <ul className="space-y-3 list-none pl-0">
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0"><strong>Google Firebase:</strong> Brukes for sikker innlogging og trygg lagring av din bruker profil.</p>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0"><strong>Stripe:</strong> Brukes for å behandle betalinger og administrere ditt abonnement på en trygg måte.</p>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0"><strong>Google Gemini (KI-modell):</strong> Brukes for å generere tekst og analyser basert på dine prompts. Teksten du legger inn sendes til KI-modellen for prosessering, men brukes ikke av Google til å trene deres offentlige modeller.</p>
                </li>
              </ul>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Database className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight m-0">
                  4. Datasikkerhet og sletting
                </h2>
              </div>
              <p className="leading-relaxed">
                Dine data lagres trygt. Du eier din egen informasjon, og du kan når som helst be om å få se hvilke data vi har lagret om deg, eller be om at kontoen din og all tilhørende data slettes permanent.
              </p>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight m-0">
                  5. Informasjonskapsler (Cookies)
                </h2>
              </div>
              <p className="leading-relaxed">
                Vi bruker kun strengt nødvendige informasjonskapsler for å holde deg innlogget og huske at du har et aktivt abonnement. Vi bruker ikke sporingsteknologi for reklameformål.
              </p>
            </section>

            <section className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight m-0">
                  6. Kontakt oss
                </h2>
              </div>
              <p className="leading-relaxed">
                Har du spørsmål om personvern, eller ønsker du å slette kontoen din?
              </p>
              <a 
                href="mailto:post@blu-hjelperen.no" 
                className="inline-block text-primary font-bold hover:underline"
              >
                post@blu-hjelperen.no
              </a>
            </section>
          </div>
        </motion.article>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-12 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400 font-medium">
          © {new Date().getFullYear()} BLU-Hjelperen. Alle rettigheter reservert.
        </p>
      </footer>
    </div>
  );
};
