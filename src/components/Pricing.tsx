import React from 'react';
import { 
  Check, 
  Zap, 
  Sparkles, 
  X,
  Coins,
  Gift,
  ShieldCheck,
  Users,
  CreditCard,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { STRIPE_HUMANIZER_CREDITS_1_URL, STRIPE_HUMANIZER_CREDITS_10_URL, getStripePaymentUrl } from '../config/accessConfig';

interface PricingModel {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  description?: string;
  stripeUrl?: string;
  popular?: boolean;
  mostProfitable?: boolean;
  priorityUpdates?: boolean;
  hidden?: boolean;
}

interface PricingProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  pricingTier: string;
  pricingModels: PricingModel[];
  handleCheckout: (model: PricingModel) => void;
  handleCancelSubscription: () => void;
  isGuest: boolean;
  humanizerCredits?: number;
  onBuyCredits?: (count: number) => void;
  userUid?: string;
  userEmail?: string;
}

export const Pricing: React.FC<PricingProps> = ({
  activeTab,
  setActiveTab,
  pricingTier,
  pricingModels,
  handleCheckout,
  handleCancelSubscription,
  isGuest,
  humanizerCredits,
  onBuyCredits,
  userUid,
  userEmail
}) => {
  const [copiedLink, setCopiedLink] = React.useState(false);

  const handleCopyReferralLink = () => {
    if (!userUid) {
      window.dispatchEvent(new CustomEvent('openAuthModal'));
      return;
    }
    const link = `${window.location.origin}/?ref=${userUid}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };
  const [showPromo, setShowPromo] = React.useState(false);
  const [promoExpired, setPromoExpired] = React.useState(false);
  const [showPricingModal, setShowPricingModal] = React.useState(false);

  React.useEffect(() => {
    if (activeTab === 'pricing') {
      setShowPricingModal(true);
    } else {
      setShowPricingModal(false);
    }

    // Sjekk URL-parametre for hemmelig kampanje
    const params = new URLSearchParams(window.location.search);
    const promo = params.get('promo');
    const path = window.location.pathname;

    if ((path.includes('/profil') || activeTab === 'profile') && promo === '24h') {
      setShowPricingModal(true); // Tving visning av pricing modal for å gi beskjed om utløpt tilbud
      
      const promoStartTime = localStorage.getItem('dmmh_promo_start');
      const now = Date.now();
      
      if (!promoStartTime) {
        localStorage.setItem('dmmh_promo_start', now.toString());
        setShowPromo(true);
        setPromoExpired(false);
      } else {
        const startTime = parseInt(promoStartTime, 10);
        // 24 hours = 24 * 60 * 60 * 1000 = 86400000 ms
        if (now - startTime < 86400000) {
          setShowPromo(true);
          setPromoExpired(false);
        } else {
          setShowPromo(false);
          setPromoExpired(true);
        }
      }
    }
  }, [activeTab]);

  const promoPlan: PricingModel = {
    id: 'promo-24h',
    name: 'Spesialtilbud: 24t Gratis Test',
    price: '0,-',
    period: ' de første 24t',
    description: 'Få full tilgang til alle Premium-verktøy i 24 timer. Deretter går abonnementet over til ordinær Semester-pakke. Du kan avslutte når som helst uten kostnad innen prøvetiden.',
    features: [
      'Full tilgang til alle Premium-verktøy',
      'Ubegrenset dypanalyse av dokumenter',
      'Eksklusiv tilgang til Sensor-modulen',
      'Ingen kostnad de første 24 timene',
      'Kan kanselleres når som helst'
    ],
    stripeUrl: 'https://buy.stripe.com/aFa4gs3MmdkV4Cs6ao18c05',
    popular: true
  };

  const displayedModels = showPromo 
    ? [promoPlan, ...pricingModels.filter(m => !m.hidden)]
    : pricingModels.filter(m => !m.hidden);

  return (
    <AnimatePresence>
      {showPricingModal && (
        <div key="ap-auto-124-1" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Sparkles className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Oppgrader din assistent</h2>
                  <p className="text-xs text-slate-400 font-medium">Velg planen som passer ditt studiebehov</p>
                </div>
              </div>
              <button onClick={() => setActiveTab('home')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {promoExpired && (
              <div key="ap-auto-124-2" className="bg-red-50 border-b border-red-100 p-4 text-center">
                <p className="text-sm text-red-600 font-bold">Tilbudet om 24-timers gratis testperiode har dessverre utløpt.</p>
              </div>
            )}

            <div className={cn(
              "flex-1 overflow-y-auto p-8 grid gap-6 custom-scrollbar",
              displayedModels.length > 3 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-3"
            )}>
              {displayedModels.map((model) => (
                <div 
                  key={`model-${model.id}`}
                  className={cn(
                    "p-6 rounded-3xl border-2 flex flex-col transition-all relative group transform hover:-translate-y-1",
                    pricingTier === model.id ? "border-primary bg-primary-light/10 ring-4 ring-primary/5" : 
                    model.id === 'semester' ? "border-primary/50 bg-gradient-to-b from-primary/5 to-transparent shadow-xl shadow-primary/10" : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg",
                    model.id === 'promo-24h' && "border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/20 shadow-xl shadow-amber-100"
                  )}
                >
                  {model.id === 'promo-24h' && (
                    <div key="ap-auto-124-3" className="absolute top-0 right-0 bg-amber-400 text-slate-900 text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest shadow-sm">
                      Tidsbegrenset
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={cn(
                        "text-lg font-black",
                        model.id === 'promo-24h' ? "text-amber-600" : "text-slate-900"
                      )}>{model.name}</h3>
                      {model.mostProfitable && (
                        <span key="ap-auto-124-4" className="bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm shadow-primary/20">
                          Mest populær
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-primary">{model.price}</span>
                      <span className="text-xs font-bold text-slate-400 uppercase">{model.period || '/ mnd'}</span>
                    </div>
                    {model.description && (
                      <p key="ap-auto-124-5" className="text-[11px] text-slate-500 font-medium mt-3 leading-relaxed italic">
                        {model.description}
                      </p>
                    )}
                    {model.priorityUpdates && (
                      <p key="ap-auto-124-6" className="text-[10px] text-amber-600 font-bold mt-2 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Først med oppdateringer & nye funksjoner
                      </p>
                    )}
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {model.features.map((feature, fIdx) => (
                      <li key={`${model.id}-feature-${fIdx}`} className="flex items-start gap-2 text-sm text-slate-600">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {model.stripeUrl && pricingTier !== model.id ? (
                    <a
                      href={getStripePaymentUrl(model.stripeUrl, userUid, userEmail)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        // Optionally call handleCheckout to close pricing tab if needed
                        // handleCheckout(model); 
                      }}
                      className={cn(
                        "w-full py-3 rounded-xl font-bold transition-all mt-auto border-2 text-center inline-block",
                        pricingTier === model.id ? "bg-slate-900 border-slate-900 text-white shadow-lg" : 
                        model.id === 'promo-24h' ? "bg-amber-400 border-amber-400 text-slate-900 hover:bg-amber-500 shadow-lg shadow-amber-200" :
                        model.id === 'semester' ? "bg-primary border-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20" :
                        model.id === 'monthly' ? "bg-transparent border-slate-200 text-slate-600 hover:border-primary hover:text-primary" :
                        "bg-slate-100 border-slate-100 text-slate-600 hover:bg-slate-200 hover:border-slate-200"
                      )}
                    >
                      {model.id === 'promo-24h' ? 'Start din gratis testperiode' : 
                       model.id === 'monthly' ? 'Velg Måned' : 
                       model.id === 'semester' ? 'Velg Semester-pakka' : 
                       model.id === 'free' ? 'Kom i gang' : 'Velg plan'}
                    </a>
                  ) : (
                    <button 
                      onClick={() => handleCheckout(model)}
                      disabled={pricingTier === model.id}
                      className={cn(
                        "w-full py-3 rounded-xl font-bold transition-all mt-auto border-2",
                        pricingTier === model.id ? "bg-slate-900 border-slate-900 text-white shadow-lg" : 
                        model.id === 'promo-24h' ? "bg-amber-400 border-amber-400 text-slate-900 hover:bg-amber-500 shadow-lg shadow-amber-200" :
                        model.id === 'semester' ? "bg-primary border-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20" :
                        model.id === 'monthly' ? "bg-transparent border-slate-200 text-slate-600 hover:border-primary hover:text-primary" :
                        "bg-slate-100 border-slate-100 text-slate-600 hover:bg-slate-200 hover:border-slate-200"
                      )}
                    >
                      {pricingTier === model.id ? 'Valgt plan' : 
                       model.id === 'promo-24h' ? 'Start din gratis testperiode' : 
                       model.id === 'monthly' ? 'Velg Måned' : 
                       model.id === 'semester' ? 'Velg Semester-pakka' : 
                       model.id === 'free' ? 'Kom i gang' : 'Velg plan'}
                    </button>
                  )}
                </div>
              ))}

              {/* Preview Example Section */}
              <div className="md:col-span-3 mt-8 p-8 bg-slate-50 rounded-3xl border border-slate-200">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1 space-y-4">
                    <h3 className="text-2xl font-black text-slate-900">Sensor-modulen: Dybden som utgjør forskjellen</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Med Semester-pakka låser du opp vår mest avanserte pedagogiske assistent. Du får ikke bare hjelp med struktur og skrivefeil, men dype faglige analyser som løfter det akademiske nivået i oppgaven din.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Gratis / Mnd</p>
                        <p className="text-xs text-slate-600 italic">"Teksten er grei, men mangler kilder."</p>
                      </div>
                      <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 shadow-sm">
                        <p className="text-[10px] font-bold text-primary uppercase mb-2">Semester-pakka</p>
                        <p className="text-xs text-slate-800 font-medium">"Analysen din av lekemiljøet er god, men du bør knytte den sterkere til Vygotskys proksimale utviklingssone (s. 45 i pensum) for å øke det akademiske nivået."</p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full md:w-72 shrink-0 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-bl-xl">
                      PREMIUM
                    </div>
                    <div className="space-y-4">
                      <div className="h-2 w-2/3 bg-slate-100 rounded-full" />
                      <div className="h-2 w-full bg-slate-100 rounded-full" />
                      <div className="h-2 w-1/2 bg-slate-100 rounded-full" />
                      <div className="pt-4 border-t border-slate-50 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Check className="w-3 h-3 text-emerald-600" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-700">Kilde-validering OK</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-blue-600" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-700">Pedagogisk dybde: Høy</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-slate-50 flex justify-center">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">AKADEMISK NIVÅ</p>
                        <p className="text-3xl font-black text-primary">HØYT</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tilleggsmoduler & Kampanjer: Humanizer-bot & Verveprogram */}
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Humanizer-bot Mikrotransaksjon */}
                <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
                          <Coins className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">Humanizer-boten</h4>
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            10,- kr per vask (Pay-per-use)
                          </span>
                        </div>
                      </div>
                      {humanizerCredits !== undefined && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase block">Din saldo</span>
                          <span className="inline-block text-xs font-black text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-lg border border-amber-200">
                            {humanizerCredits} {humanizerCredits === 1 ? 'vask' : 'vask'}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Humanizer-boten er <strong>aldri inkludert som ubegrenset</strong> i noe abonnement (heller ikke Semester-pakka). Dette er et bevisst etisk valg for å skape sunn friksjon og motvirke snarveier.
                    </p>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-700 space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-slate-800">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Etisk forankring
                      </p>
                      <p>
                        Gjennomgår teksten din for robotaktige vendinger og gir forslag som ivaretar din personlige stemme og akademiske integritet.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Enkeltkjøp via Stripe</span>
                      <span className="text-xs font-black text-amber-700">10 kr / gang</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          if (STRIPE_HUMANIZER_CREDITS_1_URL && !STRIPE_HUMANIZER_CREDITS_1_URL.includes('test_humanizer')) {
                            window.open(getStripePaymentUrl(STRIPE_HUMANIZER_CREDITS_1_URL, userUid, userEmail), '_blank', 'noopener,noreferrer');
                          } else {
                            // Hvis live Stripe-lenke ikke er lagt inn enda, åpne URL med ?success=true&buy_credits=1
                            window.open(`${window.location.origin}${window.location.pathname}?success=true&buy_credits=1`, '_self');
                          }
                        }}
                        className="py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Kjøp 1 vask (10,-)</span>
                      </button>
                      <button
                        onClick={() => {
                          if (STRIPE_HUMANIZER_CREDITS_10_URL && !STRIPE_HUMANIZER_CREDITS_10_URL.includes('test_humanizer')) {
                            window.open(getStripePaymentUrl(STRIPE_HUMANIZER_CREDITS_10_URL, userUid, userEmail), '_blank', 'noopener,noreferrer');
                          } else {
                            // Hvis live Stripe-lenke ikke er lagt inn enda, åpne URL med ?success=true&buy_credits=10
                            window.open(`${window.location.origin}${window.location.pathname}?success=true&buy_credits=10`, '_self');
                          }
                        }}
                        className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>Kjøp 10 vask (100,-)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Verveprogram */}
                <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary-light flex items-center justify-center text-primary">
                          <Gift className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">Verv en medstudent</h4>
                          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                            10 gratis vask + 50,- kr bonus
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Del din personlige vervelenke i kollokviegruppa. Når en medstudent registrerer seg, får du <strong>10 gratis Humanizer-vask</strong> og <strong>50 kr rabatt</strong> på Semester-pakka. Vennen din får <strong>5 gratis vask</strong> i velkomstbonus!
                    </p>

                    {/* Vervespor delingsfelt & Kopier-knapp */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-primary" /> Din unike vervelenke:
                        </span>
                        {userUid && (
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Aktiv
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={userUid ? `${window.location.origin}/?ref=${userUid}` : 'Logg inn for å hente din vervelenke'}
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 select-all outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={handleCopyReferralLink}
                          className={cn(
                            "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs",
                            copiedLink 
                              ? "bg-emerald-600 text-white" 
                              : "bg-primary text-white hover:bg-primary/90"
                          )}
                        >
                          {copiedLink ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>Kopiert!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Kopier min lenke</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 text-[11px] text-slate-800 space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-primary">
                        <Users className="w-3.5 h-3.5" /> Gjelder på Semester-pakka
                      </p>
                      <p>
                        Vervebonusen kan utelukkende benyttes som direkte rabatt ved oppgradering til <strong>Semester-pakka</strong> (opptil 100 kr totalrabatt).
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Ubegrenset antall vervinger</span>
                    <span className="text-xs font-black text-primary">+10 vask per venn</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center space-y-4">
              <p className="text-xs text-slate-400 font-medium">Alle priser er inkl. mva. Ingen bindingstid. Abonnementet fornyes automatisk til det sies opp.</p>
              {pricingTier !== 'free' && (
                <button key="ap-auto-124-7" 
                  onClick={handleCancelSubscription}
                  className="px-6 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                >
                  AVSLUTT ABONNEMENT
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
