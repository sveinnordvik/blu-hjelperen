// src/config/accessConfig.ts

/**
 * List of users with full, unlimited VIP access across all tools in BLU-Hjelperen,
 * including Humanizer-boten (unlimited washes/free from pay-per-use paywalls),
 * all pedagogical analysis tools, roleplay simulators, presentations, and admin tools.
 */
export const UNLIMITED_ACCESS_EMAILS = [
  'svein.nordvik@gmail.com',
  'sunniva.nordvik2@gmail.com',
  'annkarin78@hotmail.no'
];

export const ADMIN_EMAILS = [
  'svein.nordvik@gmail.com',
  'sunniva.nordvik2@gmail.com'
];

/**
 * Betabrukere for Portalen (Styrern, Pedledern, Fagarbeidern, Assistentn, Vikarn).
 * Disse brukerne har full tilgang til Portalen, men selve BLU-hjelperen (Studentn) er låst.
 */
export const PORTAL_BETA_EMAILS = [
  'havard.hovin@melhus.kommune.no'
];

/**
 * Sjekker om en bruker er betabruker for Portalen
 */
export const isPortalBetaUser = (email?: string | null): boolean => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return PORTAL_BETA_EMAILS.some(e => e.toLowerCase() === normalized);
};

/**
 * Sjekker om en bruker har tilgang til BLU-hjelperen (Studentn).
 * Håvard Hovin og andre rene portalbetabrukere har IKKE tilgang til BLU-hjelperen.
 */
export const hasBluAccess = (email?: string | null): boolean => {
  if (!email) return true;
  const normalized = email.trim().toLowerCase();
  if (PORTAL_BETA_EMAILS.some(e => e.toLowerCase() === normalized)) {
    return false;
  }
  return true;
};

/**
 * Check if an email has unlimited access to all tools and features (including Humanizer-boten)
 */
export const isUnlimitedUser = (email?: string | null): boolean => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return UNLIMITED_ACCESS_EMAILS.some(e => e.toLowerCase() === normalized);
};

/**
 * Check if an email has admin system rights
 */
export const isAdminUser = (email?: string | null): boolean => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some(e => e.toLowerCase() === normalized);
};

/**
 * Stripe Payment Links for Humanizer credits (Pay-per-use):
 * Opprett disse i Stripe Dashboard og legg inn dine Payment Links her.
 * I Stripe Dashboard under 'After payment' -> 'Don't show confirmation page / Redirect customers to your website':
 * - For 1 vask: https://din-app.web.app/?success=true&buy_credits=1
 * - For 10 vask: https://din-app.web.app/?success=true&buy_credits=10
 */
export const STRIPE_HUMANIZER_CREDITS_1_URL = 'https://buy.stripe.com/test_humanizer_1';
export const STRIPE_HUMANIZER_CREDITS_10_URL = 'https://buy.stripe.com/test_humanizer_10';

/**
 * Bygger en Stripe betalingslenke med brukerens Firebase UID som client_reference_id
 * og e-post pre-utfylt. Dette gjør at Stripe sender client_reference_id til webhooks 
 * ved checkout.session.completed slik at backend-funksjonen kan oppdatere Firestore sikkert.
 */
export const getStripePaymentUrl = (baseUrl: string, uid?: string, email?: string): string => {
  if (!baseUrl) return '';
  try {
    const url = new URL(baseUrl);
    if (uid) url.searchParams.set('client_reference_id', uid);
    if (email) url.searchParams.set('prefilled_email', email);
    return url.toString();
  } catch {
    const separator = baseUrl.includes('?') ? '&' : '?';
    const params: string[] = [];
    if (uid) params.push(`client_reference_id=${encodeURIComponent(uid)}`);
    if (email) params.push(`prefilled_email=${encodeURIComponent(email)}`);
    return `${baseUrl}${params.length ? separator + params.join('&') : ''}`;
  }
};


