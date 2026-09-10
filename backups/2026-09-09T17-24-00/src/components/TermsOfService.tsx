import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Scale, ShieldCheck, UserCheck, CreditCard, Sparkles, FileText, Ban, RefreshCw, Mail } from 'lucide-react';

interface TermsOfServiceProps {
  onBack?: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
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
              <Scale className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Brukervilkår for BLU-Hjelperen
            </h1>
            <p className="text-slate-400 font-medium tracking-wide">
              Sist oppdatert: {lastUpdated}
            </p>
          </header>

          <div className="space-y-12">
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-medium">
              Ved å opprette en konto og bruke BLU-Hjelperen, godtar du følgende brukervilkår. Vennligst les disse nøye.
            </p>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight m-0">
                  1. Tjenesten
                </h2>
              </div>
              <p className="leading-relaxed">
                BLU-Hjelperen er et digitalt støtteverktøy for barnehagelærerstudenter og pedagoger. Tjenesten leverer KI-generert tekst, referansehåndtering og veiledning basert på nasjonale retningslinjer og pedagogiske metoder.
              </p>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <UserCheck className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight m-0">
                  2. Brukerkonto og ansvar
                </h2>
              </div>
              <ul className="space-y-3 list-none pl-0">
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0">Du er ansvarlig for å holde din innloggingsinformasjon sikker.</p>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0">Tjenesten er personlig. Det er ikke tillatt å dele din brukerkonto med andre.</p>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0">Du må være minst 18 år for å opprette et betalt abonnement.</p>
                </li>
              </ul>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight m-0">
                  3. Abonnement og betaling
                </h2>
              </div>
              <ul className="space-y-3 list-none pl-0">
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0">Vi tilbyr ulike abonnementsløsninger (Måned, År, og eventuelle kampanjeversjoner).</p>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0">Betaling skjer forskuddsvis via Stripe.</p>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0"><strong>Oppsigelse:</strong> Du kan når som helst si opp ditt abonnement via "Administrer abonnement" i appen. Tilgangen vil vare ut den perioden du allerede har betalt for.</p>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0"><strong>Refusjon:</strong> Vi tilbyr som hovedregel ikke refusjon for påbegynte abonnementsperioder, med mindre det foreligger tekniske feil som har hindret tilgang over lengre tid.</p>
                </li>
              </ul>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight m-0">
                  4. Bruk av kunstig intelligens (KI)
                </h2>
              </div>
              <ul className="space-y-3 list-none pl-0">
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0">BLU-Hjelperen bruker avanserte KI-modeller (Google Gemini) for å generere svar.</p>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0">Selv om vi tilstreber høy presisjon, kan KI-generert innhold inneholde feil eller unøyaktigheter.</p>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0">Som bruker er du selv ansvarlig for å kvalitetssikre og faktasjekke alle resultater, spesielt kildehenvisninger og faglige tekster, før de brukes i eksamensoppgaver eller formell dokumentasjon.</p>
                </li>
              </ul>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight m-0">
                  5. Immaterielle rettigheter
                </h2>
              </div>
              <ul className="space-y-3 list-none pl-0">
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0">Alt innhold, design, kode og merkevare tilhører BLU-Hjelperen.</p>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0">Du beholder eierskapet til tekstene du selv skriver inn i verktøyene, men gir BLU-Hjelperen rett til å prosessere disse for å levere tjenesten.</p>
                </li>
              </ul>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Ban className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight m-0">
                  6. Akseptabel bruk
                </h2>
              </div>
              <p className="leading-relaxed">
                Det er strengt forbudt å bruke tjenesten til:
              </p>
              <ul className="space-y-3 list-none pl-0">
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0">Ulovlige formål eller spredning av skadelig innhold.</p>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0">Forsøk på å kopiere, "skrape" eller reversere tjenestens kildekode.</p>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                  <p className="m-0">Systematisk misbruk av KI-ressursene.</p>
                </li>
              </ul>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <RefreshCw className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight m-0">
                  7. Endringer i tjenesten og vilkårene
                </h2>
              </div>
              <p className="leading-relaxed">
                Vi forbeholder oss retten til å endre tjenesten og disse vilkårene ved behov. Ved vesentlige endringer vil aktive abonnenter varsles via e-post.
              </p>
            </section>

            <section className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight m-0">
                  8. Kontakt
                </h2>
              </div>
              <p className="leading-relaxed">
                Har du spørsmål om vilkårene? Kontakt oss på:
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
