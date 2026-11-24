/**
 * BLU-Hjelperen - Firebase Cloud Functions
 * 
 * 1. stripeWebhook: HTTP webhook som verifiserer Stripe-signatur og oppdaterer brukerens
 *    abonnement (pricingTier) eller vaskekreditter (humanizerCredits) sikkert på serveren.
 * 2. handleNewUserReferral: Firestore trigger på opprettelse av 'users/{userId}'
 *    som belønner verver (+10 vask) og ny student (+5 vask).
 */

const functions = require("firebase-functions");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { GoogleGenAI } = require("@google/genai");
const admin = require("firebase-admin");
const Stripe = require("stripe");

// API-nøkler hentes fra process.env (satt via GitHub Secrets .env-fil)

if (!admin.apps.length) {
  admin.initializeApp({
    databaseURL: "https://gen-lang-client-0721397173-default-rtdb.firebaseio.com",
    // Hvis du bruker Firestore med spesifikk ID:
  });
}

// For å sikre at Firestore bruker din eksisterende database-ID:
let db;
try {
  const { getFirestore } = require("firebase-admin/firestore");
  const specificDbId = process.env.FIRESTORE_DATABASE_ID || "ai-studio-6d584f24-0d3b-4358-ba43-396b2f0a6101";
  db = specificDbId ? getFirestore(specificDbId) : admin.firestore();
} catch (e) {
  db = admin.firestore();
}
// (Firebase henter som regel riktig database når prosjekt-ID er satt i miljøet, 
// men vi kan eksplisitt hente ut fra prosjektet om nødvendig).

// Sikker uthenting av eventuell arvete config-verdier uten at det krasjer v2/v1 runtime
function getSafeConfig() {
  try {
    if (typeof functions.config === "function") {
      return functions.config() || {};
    }
  } catch (e) {
    // functions.config() er utfaset i nyere runtime
  }
  return {};
}
const legacyConfig = getSafeConfig();

function cleanApiKey(raw) {
  if (!raw || typeof raw !== "string") return "";
  let cleaned = raw.replace(/[\u200B-\u200D\uFEFF\r\n]/g, "").trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  if (/^Bearer\s+/i.test(cleaned)) {
    cleaned = cleaned.replace(/^Bearer\s+/i, "").trim();
  }
  if (
    !cleaned ||
    cleaned === "MY_GEMINI_API_KEY" ||
    cleaned === "YOUR_API_KEY" ||
    cleaned === "undefined" ||
    cleaned === "null"
  ) {
    return "";
  }
  return cleaned;
}

// Henter alle konfigurerte nøkler i streng Free-Tier-først rekkefølge, uten duplikater
function getOrderedGeminiKeyCandidates() {
  const orderedSources = [
    { envName: "GEMINI_API_KEY_FREE", tier: "free", value: process.env.GEMINI_API_KEY_FREE },
    { envName: "GEMINI_API_KEY_PRIMARY", tier: "free", value: process.env.GEMINI_API_KEY_PRIMARY },
    { envName: "GEMINI_API_KEY", tier: "free", value: process.env.GEMINI_API_KEY },
    { envName: "API_KEY", tier: "free", value: process.env.API_KEY },
    { envName: "legacy_config", tier: "free", value: legacyConfig.gemini?.api_key || legacyConfig.gemini?.key },
    { envName: "GEMINI_API_KEY_PAID", tier: "paid", value: process.env.GEMINI_API_KEY_PAID },
    { envName: "GEMINI_API_KEY_BACKUP", tier: "paid", value: process.env.GEMINI_API_KEY_BACKUP },
  ];

  const seen = new Set();
  const candidates = [];
  for (const src of orderedSources) {
    const key = cleanApiKey(src.value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const prefixType = key.startsWith("AQ.") ? "AQ" : key.startsWith("AIza") ? "AIza" : "other";
    candidates.push({ envName: src.envName, tier: src.tier, key, prefixType });
  }
  return candidates;
}

function createGenAIClient(apiKey, useVertexAI) {
  return new GoogleGenAI({
    apiKey,
    ...(useVertexAI ? { vertexai: true } : {}),
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function isAuthOrKeyError(err) {
  const errMsg = err?.message || String(err || "");
  return (
    err?.status === 401 ||
    err?.status === 403 ||
    errMsg.includes("API_KEY_INVALID") ||
    errMsg.includes("API key not valid") ||
    errMsg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") ||
    errMsg.includes("UNAUTHENTICATED") ||
    errMsg.includes("PERMISSION_DENIED") ||
    errMsg.includes("API keys are not supported")
  );
}

function isDepletedCreditsError(err) {
  const errMsg = err?.message || String(err || "");
  return (
    err?.status === 402 ||
    errMsg.includes("prepayment credits are depleted") ||
    errMsg.includes("credits are depleted")
  );
}

function isQuotaOrTransientError(err) {
  const errMsg = err?.message || String(err || "");
  return (
    err?.status === 429 ||
    err?.status === 503 ||
    errMsg.includes("429") ||
    errMsg.includes("RESOURCE_EXHAUSTED") ||
    errMsg.includes("UNAVAILABLE") ||
    errMsg.includes("high demand") ||
    errMsg.includes("quota") ||
    errMsg.includes("credits") ||
    errMsg.includes("prepayment") ||
    errMsg.includes("depleted")
  );
}

// Sentral modell-normalisering: bruker alltid støttede Gemini 4 / 3.8 / 3.1-modeller
function normalizeGeminiModel(preferredModel) {
  const raw = (typeof preferredModel === "string" && preferredModel.trim()) ? preferredModel.trim() : "gemini-4-hydrogen";
  const lower = raw.toLowerCase();

  // TTS-modeller: bevar eksplisitt lite-tts, men oppgrader alle utgåtte/preview TTS-navn til flaggskipet gemini-3.8-flash-tts
  if (lower.includes("tts")) {
    return lower === "gemini-3.8-flash-lite-tts" ? "gemini-3.8-flash-lite-tts" : "gemini-3.8-flash-tts";
  }

  // Live / native-audio preview-modeller -> gemini-3.8-live
  if (lower.includes("native-audio") || (lower.includes("live") && (lower.includes("2.5") || lower.includes("preview")))) {
    return "gemini-3.8-live";
  }

  // Utgåtte eller ugyldige tekstmodell-aliaser -> gemini-4-hydrogen
  if (
    lower.includes("1.5") ||
    lower.includes("2.0") ||
    lower.includes("2.5") ||
    lower === "gemini-pro" ||
    lower === "gemini-flash" ||
    lower === "gemini-3.8-flash"
  ) {
    return "gemini-4-hydrogen";
  }

  return raw;
}

// Felles dørvakt for Cloud Functions: prøver ALLTID Free Tier-nøkler først (med AQ. Vertex Express-støtte),
// og kobler KUN inn betalt reservenøkkel ved kvote/saldo/autorisasjonsfeil.
async function generateWithFreeTierFirst(preferredModel, contents, config) {
  const keyCandidates = getOrderedGeminiKeyCandidates();
  if (keyCandidates.length === 0) {
    throw new Error("Mangler Gemini API-nøkkel på serveren (GEMINI_API_KEY_PRIMARY eller GEMINI_API_KEY).");
  }

  const normalizedModel = normalizeGeminiModel(preferredModel);
  const fallbackModel = normalizedModel.includes("tts") ? "gemini-3.8-flash-lite-tts" : "gemini-3.1-flash-lite";
  const modelCandidates = [normalizedModel, fallbackModel].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  const sanitizedConfig = config ? { ...config } : undefined;
  if (sanitizedConfig) {
    delete sanitizedConfig.temperature;
    delete sanitizedConfig.topP;
    delete sanitizedConfig.topK;
    delete sanitizedConfig.candidateCount;
  }

  const runWithClient = async (ai) => {
    let lastModelErr = null;
    for (let i = 0; i < modelCandidates.length; i++) {
      try {
        return await ai.models.generateContent({
          model: modelCandidates[i],
          contents,
          ...(sanitizedConfig ? { config: sanitizedConfig } : {}),
        });
      } catch (err) {
        lastModelErr = err;
        if (isAuthOrKeyError(err) || isDepletedCreditsError(err)) {
          throw err;
        }
        if (i < modelCandidates.length - 1) {
          const msg = err?.message || String(err);
          const isRateOrBusy = msg.includes("429") || msg.includes("503") || msg.includes("RESOURCE_EXHAUSTED") || err?.status === 429 || err?.status === 503;
          await new Promise((r) => setTimeout(r, isRateOrBusy ? 1200 : 400));
        }
      }
    }
    throw lastModelErr;
  };

  let lastErr = null;

  for (let i = 0; i < keyCandidates.length; i++) {
    const candidate = keyCandidates[i];
    const modesToTry = [false, true];
    let candidateLastErr = null;

    for (let mIdx = 0; mIdx < modesToTry.length; mIdx++) {
      const useVertexAI = modesToTry[mIdx];
      const modeLabel = useVertexAI ? "vertex-express" : "gemini-api";
      try {
        const ai = createGenAIClient(candidate.key, useVertexAI);
        return await runWithClient(ai);
      } catch (err) {
        candidateLastErr = err;
        lastErr = err;
        const errMsg = err?.message || String(err);
        console.warn(`[Cloud Functions Gemini] ${candidate.envName} (${candidate.tier}, ${candidate.prefixType}, ${modeLabel}) feilet (status=${err?.status || "ukjent"}): ${errMsg.replace(/\s+/g, " ").slice(0, 180)}`);

        if (mIdx === 0) {
          const shouldTryVertex =
            errMsg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") ||
            errMsg.includes("API keys are not supported");
          if (!shouldTryVertex) {
            break;
          }
        }
      }
    }

    const shouldFailover =
      isQuotaOrTransientError(candidateLastErr) ||
      isDepletedCreditsError(candidateLastErr) ||
      isAuthOrKeyError(candidateLastErr) ||
      candidateLastErr?.status === 404 ||
      String(candidateLastErr?.message || "").toLowerCase().includes("not found");

    if (!shouldFailover) {
      throw candidateLastErr;
    }

    if (i < keyCandidates.length - 1) {
      const next = keyCandidates[i + 1];
      console.warn(`[Cloud Functions Gemini] Bytter fra ${candidate.envName} (${candidate.tier}) til ${next.envName} (${next.tier})...`);
    }
  }

  throw lastErr;
}

// Hent Stripe API-nøkler fra environment variables eller Firebase Functions config
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || legacyConfig.stripe?.secret_key;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || legacyConfig.stripe?.webhook_secret;

// Initialiser Stripe SDK lazily/sikkert
const getStripe = () => {
  if (!stripeSecretKey) {
    throw new Error("Mangler STRIPE_SECRET_KEY i miljøvariabler.");
  }
  return new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
};

/**
 * =================================================================================
 * FUNKSJON 1: stripeWebhook (HTTP Request)
 * =================================================================================
 * Lytter på Stripe Webhooks, verifiserer signaturen og oppdaterer Firestore.
 * 
 * URL i Firebase: https://<region>-<project-id>.cloudfunctions.net/stripeWebhook
 */
exports.stripeWebhook = functions
  .region("europe-west1")
  .https.onRequest(async (req, res) => {
    // Kun POST-forespørsler er gyldige for webhooks
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      res.status(405).send("Method Not Allowed");
      return;
    }

    const sig = req.headers["stripe-signature"];
    if (!sig) {
      console.error("[Stripe Webhook] Mangler stripe-signature header.");
      res.status(400).send("Mangler stripe-signature header");
      return;
    }

    let event;
    try {
      const stripe = getStripe();
      // Merk: req.rawBody inneholder den eksakte rå-byten fra Stripe som kreves for signatursjekk
      event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret);
    } catch (err) {
      console.error("[Stripe Webhook] Feil ved verifisering av webhook-signatur:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    console.log(`[Stripe Webhook] Mottok event: ${event.type} (ID: ${event.id})`);

    // Håndter fullført Checkout Session
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // Hent ut client_reference_id (brukerens Firebase UID satt ved åpning av lenken)
      const uid = session.client_reference_id;
      if (!uid) {
        console.warn("[Stripe Webhook] Fant ingen client_reference_id på sesjonen. Sjekk at ?client_reference_id=UID ble sendt med lenken.", session.id);
        // Returner likevel 200 slik at Stripe ikke prøver på nytt i det uendelige
        res.status(200).json({ received: true, warning: "Mangler client_reference_id" });
        return;
      }

      const userRef = db.collection("users").doc(uid);

      try {
        // Analyser hva som ble kjøpt:
        // Prioritet 1: Metadata spesifisert på Payment Link eller Checkout Session
        // Prioritet 2: Beløp eller sesjonsmodus (subscription vs payment)
        const metadata = session.metadata || {};
        const mode = session.mode; // 'subscription' eller 'payment'
        const amountTotal = session.amount_total; // i øre (f.eks. 1000 = 10 kr, 10000 = 100 kr)

        let updateData = {
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastPayment: {
            sessionId: session.id,
            amount: amountTotal,
            currency: session.currency,
            status: session.payment_status,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }
        };

        // Sjekk om det er kjøp av Humanizer-vaskekreditter
        if (
          metadata.productType === "humanizer_credits" || 
          metadata.type === "credits" ||
          metadata.buy_credits ||
          mode === "payment" && (amountTotal === 1000 || amountTotal === 10000)
        ) {
          // Finn antall vask (standard: 10 vask hvis beløp er 100 kr / 10000 øre, ellers 1 vask for 10 kr)
          let creditsToAdd = 10;
          if (metadata.credits) {
            creditsToAdd = parseInt(metadata.credits, 10) || 10;
          } else if (metadata.buy_credits) {
            creditsToAdd = parseInt(metadata.buy_credits, 10) || 10;
          } else if (amountTotal === 1000) {
            creditsToAdd = 1;
          } else if (amountTotal === 10000) {
            creditsToAdd = 10;
          }

          updateData.humanizerCredits = admin.firestore.FieldValue.increment(creditsToAdd);
          console.log(`[Stripe Webhook] Kreditter kjøpt: Legger til ${creditsToAdd} vask for bruker ${uid}`);
        } 
        // Hvis det er et abonnement (f.eks. Semester-pakka eller årsabonnement)
        else {
          const planId = metadata.plan_id || metadata.planId || "semester";
          updateData.pricingTier = planId;
          updateData.subscriptionStatus = "active";
          if (session.subscription) {
            updateData.stripeSubscriptionId = session.subscription;
          }
          console.log(`[Stripe Webhook] Abonnement aktivert: Setter pricingTier='${planId}' for bruker ${uid}`);
        }

        // Oppdater brukerdokumentet atomisk i Firestore
        await userRef.set(updateData, { merge: true });

        // Loggfør betalingen i 'payments'-kolleksjonen for revisjon
        await db.collection("payments").doc(session.id).set({
          userId: uid,
          customerEmail: session.customer_details?.email || session.customer_email || null,
          sessionId: session.id,
          amountTotal: amountTotal,
          currency: session.currency,
          mode: mode,
          metadata: metadata,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`[Stripe Webhook] Firestore oppdatert for bruker ${uid}`);
      } catch (dbError) {
        console.error(`[Stripe Webhook] Feil ved oppdatering av Firestore for ${uid}:`, dbError);
        res.status(500).send("Database Update Error");
        return;
      }
    }

    // Returner 200 OK til Stripe
    res.status(200).json({ received: true });
  });

/**
 * =================================================================================
 * FUNKSJON 2: handleNewUserReferral (Firestore Trigger)
 * =================================================================================
 * Lytter på opprettelse av dokumenter i 'users'-kolleksjonen.
 * Sjekker om brukeren har feltet referredBy, og belønner verver (+10 vask) og ny bruker (+5 vask).
 */
exports.handleNewUserReferralV2 = onDocumentCreated(
  {
    document: "users/{userId}",
    region: "europe-west1",
    database: process.env.FIRESTORE_DATABASE_ID || "ai-studio-6d584f24-0d3b-4358-ba43-396b2f0a6101",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      return null;
    }

    const userId = event.params.userId;
    const userData = snap.data();

    if (!userData) {
      console.log(`[Vervesystem] Ingen data i dokumentet for bruker ${userId}.`);
      return null;
    }

    const referredBy = userData.referredBy;

    // Sjekk om det nye brukerdokumentet har feltet referredBy
    if (!referredBy || typeof referredBy !== "string" || !referredBy.trim()) {
      console.log(`[Vervesystem] Bruker ${userId} har ikke oppgitt verver (referredBy mangler).`);
      return null;
    }

    const cleanReferrerId = referredBy.trim();

    // Sikkerhet: Forhindre at brukeren verver seg selv
    if (cleanReferrerId === userId) {
      console.warn(`[Vervesystem] Bruker ${userId} forsøkte å verve seg selv. Ignoreres.`);
      return null;
    }

    // Idempotens-sjekk: Forhindre dobbel utbetaling
    if (userData.referralRewardProcessed) {
      console.log(`[Vervesystem] Bonus er allerede behandlet for bruker ${userId}.`);
      return null;
    }

    const referrerRef = db.collection("users").doc(cleanReferrerId);
    const newUserRef = db.collection("users").doc(userId);

    try {
      // Bekreft at ververen eksisterer i databasen
      const referrerSnap = await referrerRef.get();
      if (!referrerSnap.exists) {
        console.warn(`[Vervesystem] Verver med UID ${cleanReferrerId} finnes ikke i Firestore.`);
        return null;
      }

      console.log(`[Vervesystem] Belønner verver ${cleanReferrerId} og ny student ${userId}`);

      // Kjør en atomisk batch
      const batch = db.batch();

      // 1. Gi ververen 10 Humanizer-vask og øk totalt antall vervinger
      batch.update(referrerRef, {
        humanizerCredits: admin.firestore.FieldValue.increment(10),
        totalReferrals: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 2. Gi den nye studenten 5 ekstra vask i velkomstbonus og merk som behandlet
      batch.update(newUserRef, {
        humanizerCredits: admin.firestore.FieldValue.increment(5),
        referralRewardProcessed: true,
        referralRewardedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 3. Opprett en revisjonslogg i 'referrals'-kolleksjonen
      const logRef = db.collection("referrals").doc();
      batch.set(logRef, {
        referrerId: cleanReferrerId,
        referredUserId: userId,
        referrerCredits: 10,
        newUserCredits: 5,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();
      console.log(`[Vervesystem] Vellykket utbetaling for verver ${cleanReferrerId} og bruker ${userId}`);
      return { success: true, referrerId: cleanReferrerId, referredUserId: userId };
    } catch (err) {
      console.error(`[Vervesystem] Feil under utbetaling av vervebonus:`, err);
      return null;
    }
  }
);
// Sikre bakoverkompatibilitet for eksisterende Firestore trigger-navn
exports.handleNewUserReferral = exports.handleNewUserReferralV2;

/**
 * =================================================================================
 * FUNKSJON 3: api (HTTP Cloud Function / Firebase Hosting API-proxy)
 * =================================================================================
 * Håndterer /api/gemini/generate, /api/chat/message og /api/health for
 * frontend-klienter på Firebase Hosting (f.eks. bluhjelperen.no).
 */

// Enkel rate limiter for å forhindre tap av tokens og bots
const functionRateLimit = new Map();
function checkFuncRateLimit(ip, limit = 30, windowMs = 60000) {
  const now = Date.now();
  const rec = functionRateLimit.get(ip);
  if (!rec || now > rec.resetTime) {
    functionRateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (rec.count >= limit) return false;
  rec.count++;
  return true;
}

exports.api = onRequest(
  { 
    region: "europe-west1",
    invoker: "public"
  },
  async (req, res) => {
    // CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Firebase-Auth");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    const rawPath = req.path || req.url || "";

    // Helsesjekk
    if (rawPath.includes("/health")) {
      return res.status(200).json({ status: "ok", message: "BLU-Hjelperen Cloud Function API er operativ!" });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "POST, GET");
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const clientIp = (req.headers["x-forwarded-for"] || req.ip || "unknown").split(",")[0].trim();
    if (!checkFuncRateLimit(clientIp, 30, 60000)) {
      return res.status(429).json({ error: "For mange forespørsler. Vennligst vent litt (Rate limit)." });
    }

    // Krav om innlogging: Verifiser Firebase ID-token (støtter både Authorization: Bearer og X-Firebase-Auth)
    const authHeader = req.headers.authorization;
    const altAuthHeader = req.headers["x-firebase-auth"];
    let token = "";
    if (typeof altAuthHeader === "string" && altAuthHeader.trim()) {
      token = altAuthHeader.trim().replace(/^Bearer\s+/i, "").trim();
    } else if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.split("Bearer ")[1]?.trim() || "";
    }

    if (!token) {
      return res.status(401).json({
        code: "AUTH_REQUIRED",
        error: "Innlogging kreves for å bruke denne KI-funksjonen."
      });
    }

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.user = decodedUser;
    } catch (authErr) {
      console.warn("Ugyldig eller utløpt innloggingstoken:", authErr?.message || authErr);
      return res.status(401).json({
        code: "AUTH_INVALID",
        error: "Ugyldig eller utløpt innloggingstoken. Vennligst logg inn på nytt."
      });
    }

    if (getOrderedGeminiKeyCandidates().length === 0) {
      return res.status(500).json({
        code: "GEMINI_API_KEY_MISSING",
        error: "Mangler Gemini API-nøkkel på serveren. Vennligst legg inn GEMINI_API_KEY_PRIMARY eller GEMINI_API_KEY i GitHub Secrets / Firebase Secrets.",
      });
    }

    // Endepunkt: /api/gemini/generate (brukt av Superveileder, Sokratisk, RAG, APA osv.)
    if (rawPath.includes("/gemini/generate")) {
      try {
        const { model, contents, config } = req.body || {};

        let sanitizedContents = contents;
        if (Array.isArray(sanitizedContents)) {
          const firstUserIndex = sanitizedContents.findIndex((item) => item && (item.role === 'user' || !item.role));
          if (firstUserIndex > 0) {
            sanitizedContents = sanitizedContents.slice(firstUserIndex);
          }
        }

        const response = await generateWithFreeTierFirst(model, sanitizedContents, config);
        return res.status(200).json({ text: response.text || "" });
      } catch (error) {
        console.error("Feil i Cloud Function /api/gemini/generate:", error);
        let errMsg = error?.message || String(error);
        try {
          const parsed = JSON.parse(errMsg);
          if (parsed?.error?.message) errMsg = parsed.error.message;
        } catch (e) {}

        const isDepleted = isDepletedCreditsError(error);
        const isRateLimit = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || error?.status === 429;
        const isUnavailable = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || error?.status === 503 || errMsg.includes("high demand");
        const isInvalidKey = isAuthOrKeyError(error);

        if (isInvalidKey) {
          return res.status(502).json({
            code: "GEMINI_API_KEY_ERROR",
            error: "Ugyldig eller uautorisert Gemini API-nøkkel satt opp i Firebase Functions/GitHub Secrets."
          });
        }
        if (isDepleted) {
          return res.status(429).json({ error: "API-nøkkelen er tom for forhåndsbetalt saldo (Prepayment credits depleted). Gå til https://ai.studio/projects for å fylle på kreditt." });
        }
        if (isRateLimit) {
          return res.status(429).json({ error: "Kapasitetsgrensen for forespørsler er midlertidig nådd (429 Rate limit / Quota exceeded). Vent litt og prøv igjen." });
        }
        if (isUnavailable) {
          return res.status(503).json({ error: "KI-modellen opplever stor pågang akkurat nå (503 High Demand). Vent noen sekunder og prøv igjen." });
        }
        return res.status(500).json({ error: errMsg || "Feil ved generering av svar fra Gemini." });
      }
    }

    // Endepunkt: /api/chat/message (brukt av generell chat)
    if (rawPath.includes("/chat/message")) {
      try {
        const { history = [], newMessage, fileContext = '', fileName = '' } = req.body || {};
        if (!newMessage || typeof newMessage !== "string") {
          return res.status(400).json({ error: "Mangler 'newMessage' i forespørselen." });
        }

        const systemInstruction = `Du er BLU-hjelperen, en støttende, anerkjennende og faglig dyktig pedagogisk veileder for norske barnehagelærerstudenter (BLU). Ditt hovedmål er å hjelpe studentene med å koble teori og praksis.`;

        const contents = [];
        if (Array.isArray(history)) {
          for (const item of history) {
            if (item.parts && Array.isArray(item.parts)) {
              contents.push({
                role: item.role === 'model' || item.role === 'assistant' ? 'model' : 'user',
                parts: item.parts.map((p) => typeof p === 'string' ? { text: p } : p)
              });
            } else if (item.text || item.content) {
              contents.push({
                role: item.role === 'model' || item.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: item.text || item.content }]
              });
            }
          }
        }

        let promptText = newMessage;
        if (fileContext && typeof fileContext === 'string' && fileContext.trim().length > 0) {
          promptText = `[VEDLAGT DOKUMENT: ${fileName || 'Dokument'}]:\n"""\n${fileContext.trim().slice(0, 30000)}\n"""\n\nStudentens melding / spørsmål:\n${newMessage}`;
        }

        contents.push({
          role: "user",
          parts: [{ text: promptText }]
        });

        const response = await generateWithFreeTierFirst("gemini-4-hydrogen", contents, {
          systemInstruction,
          maxOutputTokens: 4096,
        });

        return res.status(200).json({ text: response.text || "" });
      } catch (error) {
        console.error("Feil i Cloud Function /api/chat/message:", error);
        return res.status(500).json({ error: error?.message || "Feil under chat-melding." });
      }
    }

    // Endepunkt: /api/superveilederen (REST/HTTP proxy)
    if (rawPath.includes("/superveilederen")) {
      try {
        const { message, documentContext, history = [] } = req.body || {};

        const baseSocraticPrompt = "Du er Superveilederen for barnehagelærerstudenter. Bruk sokratisk metode for å utforske deres refleksjoner. Ikke gi svaret direkte.";
        
        const documentAnalysisPrompt = `Du er BLU-hjelperen. Analyser det vedlagte dokumentet. Fokuser på akademisk språk, struktur og forankring i Rammeplanen. 
        
Dokumentinnhold: 
"""${documentContext}"""`;

        const systemPrompt = documentContext ? documentAnalysisPrompt : baseSocraticPrompt;

        const aiMessages = [
          { role: "system", content: systemPrompt },
          ...(Array.isArray(history) ? history : []),
          { role: "user", content: message || "Vennligst analyser det vedlagte dokumentet." }
        ];

        const contents = [];
        if (Array.isArray(history)) {
          for (const item of history) {
            if (!item || item.role === "system") continue;
            const role = item.role === "assistant" || item.role === "model" ? "model" : "user";
            const text = item.content || item.text || (Array.isArray(item.parts) ? item.parts.map(p => typeof p === "string" ? p : p.text).join(" ") : "");
            if (text) contents.push({ role, parts: [{ text }] });
          }
        }
        contents.push({
          role: "user",
          parts: [{ text: message || "Vennligst analyser det vedlagte dokumentet." }]
        });

        const response = await generateWithFreeTierFirst("gemini-4-hydrogen", contents, {
          systemInstruction: systemPrompt,
          maxOutputTokens: 4096,
        });

        return res.status(200).json({ 
          text: response.text || "",
          mode: documentContext ? "documentAnalysis" : "socratic",
          aiMessages
        });
      } catch (error) {
        console.error("Feil i /api/superveilederen:", error);
        return res.status(500).json({ error: error?.message || "Feil under samtale med Superveilederen." });
      }
    }

    // Endepunkt: /api/ask-blu (Beskyttet av Firebase Auth Bearer-token via middleware ovenfor)
    if (rawPath.includes("/ask-blu")) {
      try {
        const { prompt } = req.body || {};
        if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
          return res.status(400).json({ error: "Mangler gyldig 'prompt' i forespørselen." });
        }
        if (prompt.length > 40000) {
          return res.status(400).json({ error: "Forespørselen overstiger maksimal tillatt lengde på 40 000 tegn." });
        }

        const response = await generateWithFreeTierFirst("gemini-4-hydrogen", prompt.trim());

        return res.status(200).json({
          reply: response.text || "",
          user: req.user ? { uid: req.user.uid, email: req.user.email } : null
        });
      } catch (error) {
        console.error("Feil i Cloud Function /api/ask-blu:", error);
        return res.status(500).json({ error: error?.message || "Noe gikk galt under generering av tekst." });
      }
    }

    return res.status(404).json({ error: `Endepunktet '${rawPath}' ble ikke funnet på API-funksjonen.` });
  }
);

/**
 * =================================================================================
 * FUNKSJON 4: superveilederenChat (Cloud Function Callable)
 * =================================================================================
 * Håndterer dynamiske system-prompter basert på om et dokument er lagt ved:
 * - Ingen fil lagt ved -> baseSocraticPrompt (Superveilederen, sokratisk metode)
 * - Fil lagt ved (documentContext) -> documentAnalysisPrompt (BLU-hjelperen)
 */
exports.superveilederenChat = functions.region('europe-west1').https.onCall(async (data, context) => {
  const { message, documentContext, history = [] } = data || {};

  const baseSocraticPrompt = "Du er Superveilederen for barnehagelærerstudenter. Bruk sokratisk metode for å utforske deres refleksjoner. Ikke gi svaret direkte.";
  
  const documentAnalysisPrompt = `Du er BLU-hjelperen. Analyser det vedlagte dokumentet. Fokuser på akademisk språk, struktur og forankring i Rammeplanen. 
  
  Dokumentinnhold: 
  """${documentContext}"""`;

  // Dynamisk valg av system-prompt
  const systemPrompt = documentContext ? documentAnalysisPrompt : baseSocraticPrompt;

  // Bygg meldings-arrayen for AI-modellen
  const aiMessages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history : []),
    { role: "user", content: message || "Vennligst analyser det vedlagte dokumentet." }
  ];

  if (getOrderedGeminiKeyCandidates().length === 0) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      "Mangler Gemini API-nøkkel på serveren (GEMINI_API_KEY_PRIMARY eller GEMINI_API_KEY)."
    );
  }

  try {
    // Transformer meldinger til Gemini contents format
    const contents = [];
    if (Array.isArray(history)) {
      for (const item of history) {
        if (!item || item.role === "system") continue;
        const role = item.role === "assistant" || item.role === "model" ? "model" : "user";
        const text = item.content || item.text || (Array.isArray(item.parts) ? item.parts.map(p => typeof p === "string" ? p : p.text).join(" ") : "");
        if (text) contents.push({ role, parts: [{ text }] });
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: message || "Vennligst analyser det vedlagte dokumentet." }]
    });

    const response = await generateWithFreeTierFirst("gemini-4-hydrogen", contents, {
      systemInstruction: systemPrompt,
      maxOutputTokens: 4096,
    });

    return {
      text: response.text || "",
      mode: documentContext ? "documentAnalysis" : "socratic",
      aiMessages
    };
  } catch (error) {
    console.error("Feil i superveilederenChat:", error);
    throw new functions.https.HttpsError("internal", error?.message || "Feil under generering fra modellen.");
  }
});

/**
 * =================================================================================
 * FUNKSJON 5: checklistDispatcher (Scheduled Cloud Function)
 * =================================================================================
 * Kjører hvert 15. minutt hele døgnet.
 * Sjekker checklists_templates i Firestore for maler med matcher activeDays og dispatchTime=="HH:mm",
 * og oppretter automatisk aktive oppgaver (active_tasks) for alle avdelinger med dynamisk dueTime.
 */
const { onSchedule } = require("firebase-functions/v2/scheduler");

exports.checklistDispatcher = onSchedule(
  {
    schedule: "every 15 minutes",
    timeZone: "Europe/Oslo",
    region: "europe-west1",
  },
  async (event) => {
    try {
      const now = new Date();
      // Finn gjeldende ukedag (1-7: Mandag=1 ... Søndag=7)
      const currentDay = now.getDay() === 0 ? 7 : now.getDay(); 
      const currentTimeString = now.toLocaleTimeString('no-NO', { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit' });

      // SJEKK DATABASEN: Hent KUN de malene styreren har satt til å sendes NÅ
      let templatesSnapshot;
      try {
        templatesSnapshot = await db.collection("checklists_templates")
          .where("activeDays", "array-contains", currentDay)
          .where("dispatchTime", "==", currentTimeString)
          .get();
      } catch (queryErr) {
        console.warn("[checklistDispatcher] Spørring feilet eller indekserer. Henter alle maler og filtrerer i minnet:", queryErr.message);
        const allTemplates = await db.collection("checklists_templates").get();
        const matchedDocs = [];
        allTemplates.forEach(doc => {
          const d = doc.data();
          if (Array.isArray(d.activeDays) && d.activeDays.includes(currentDay) && d.dispatchTime === currentTimeString) {
            matchedDocs.push(doc);
          }
        });
        templatesSnapshot = { empty: matchedDocs.length === 0, forEach: cb => matchedDocs.forEach(cb) };
      }

      if (templatesSnapshot.empty) return; // Ingenting å sende ut akkurat nå

      // Hent alle avdelinger
      const departmentsSnapshot = await db.collection("departments").get();
      let depList = [];
      if (departmentsSnapshot.empty) {
        depList = [
          { name: "Trollstua (Småbarn)" },
          { name: "Multemyra (Storebarn)" },
          { name: "Klatremus (Storebarn)" },
          { name: "Bjørnehiet (Mellomgruppe)" },
          { name: "Kjøkken / Felles" }
        ];
      } else {
        departmentsSnapshot.forEach((doc) => depList.push(doc.data()));
      }

      const batch = db.batch();
      let totalCreated = 0;

      // Generer oppgavene dynamisk basert på styrerens egne tidsfrister
      templatesSnapshot.forEach((templateDoc) => {
        const template = templateDoc.data();
        
        // Regn ut nøyaktig frist (Date-objekt) basert på styrerens 'dueTime' (f.eks. "16:45")
        const dueTimeStr = template.dueTime || "16:45";
        const [dueHour, dueMinute] = dueTimeStr.split(':').map(Number);
        const dueDate = new Date(now);
        dueDate.setHours(dueHour || 16, dueMinute || 45, 0, 0);

        depList.forEach((dep) => {
          const newTaskRef = db.collection("active_tasks").doc();
          
          batch.set(newTaskRef, {
            templateId: templateDoc.id,
            title: template.title || "Sjekkliste for barnehagen",
            base: dep.name,
            status: "pending",
            dispatchTime: template.dispatchTime || currentTimeString,
            dueDate: dueDate.toISOString(), // Dynamisk frist satt av styrer
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            snapshot: template.questions || template.sjekkpunkter || []
          });
          totalCreated++;
        });
      });

      await batch.commit();
      console.log(`[checklistDispatcher] Genererte ${totalCreated} sjekklisteoppgaver for ${depList.length} avdelinger.`);
      return { success: true, count: totalCreated };
    } catch (err) {
      console.error("Feil i checklistDispatcher:", err);
      return null;
    }
  }
);

exports.generateClosingChecklists = exports.checklistDispatcher;

/**
 * =================================================================================
 * FUNKSJON 7: kallGeminiAPI (Dørvakt med automatisk fallback mellom primær og reserve)
 * =================================================================================
 * Kalles fra frontend via getFunctions(app, 'europe-west1') & httpsCallable('kallGeminiAPI')
 * eller via standard HTTP POST.
 */
exports.kallGeminiAPI = onCall(
  { 
    region: "europe-west1", 
    cors: true,
    invoker: "public"
  },
  async (request) => {
    // Sjekk autentisering hvis innlogging kreves
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Innlogging kreves for å bruke denne KI-funksjonen."
      );
    }

    try {
      const data = request.data || {};
      const { model, contents, config } = data;
      const actualContents = contents || data.prompt || data;

      if (getOrderedGeminiKeyCandidates().length === 0) {
        throw new HttpsError("failed-precondition", "Mangler gyldig GEMINI_API_KEY_PRIMARY (eller GEMINI_API_KEY).");
      }

      const response = await generateWithFreeTierFirst(model, actualContents, config || {});
      const textResult = response.text || "";

      return { 
        text: textResult, 
        resultatTekst: textResult, 
        success: true 
      };

    } catch (error) {
      console.warn("kallGeminiAPI feil:", error?.message || error);
      if (error instanceof HttpsError) {
        throw error;
      }
      const isDepleted = isDepletedCreditsError(error);
      const isInvalidKey = isAuthOrKeyError(error);
      const guidanceText = isDepleted 
        ? "Prosjektets forhåndsbetalte saldo er oppbrukt (Prepayment credits depleted). Oppdater nøkkelen eller fyll på saldo."
        : isInvalidKey
        ? "Ugyldig eller uautorisert Gemini API-nøkkel på serveren (GEMINI_API_KEY_PRIMARY / GEMINI_API_KEY)."
        : (error?.message || "En feil oppstod ved kommunikasjon med AI-assistenten.");

      throw new HttpsError(isInvalidKey ? "failed-precondition" : "internal", guidanceText);
    }
  }
);

// ============================================================================
// PEDPORTALEN: Felles AI-motor for Pedleder'n (PPT-logg, Sparring, Ukeplan)
// ============================================================================
exports.pedlederAI = functions.region('europe-west1').https.onCall(async (data, context) => {
  // 1. Sikkerhetssjekk
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Du må være logget inn for å bruke KI-assistenten.');
  }

  // 2. Valider prompt
  const prompt = data?.prompt;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Ingen prompt ble mottatt.');
  }

  // 3. Kall moderne @google/genai med Free Tier-dørvakt først
  try {
    const response = await generateWithFreeTierFirst("gemini-4-hydrogen", prompt.trim());
    return { success: true, resultatTekst: response.text || "" };
  } catch (error) {
    console.error("Gemini Feil i pedlederAI:", error);
    throw new functions.https.HttpsError('internal', 'Kunne ikke kontakte Gemini: ' + (error?.message || String(error)));
  }
});

/**
 * =================================================================================
 * FUNKSJON 9: askBlu (Firebase Cloud Functions Callable)
 * =================================================================================
 * 100% sikkerhetssertifisert metode for å kalle Gemini via Firebase.
 *
 * SIKKERHETSLAG:
 * 1. Skjuler API-nøkkel på serversiden (bruker Secret Manager / miljøvariabler).
 * 2. Håndhever streng Firebase Auth: Kun innloggede brukere slipper gjennom (context.auth).
 * 3. Automatisk CSRF- og CORS-beskyttelse via Firebase Callable Functions.
 * 4. Validering og lengdebegrensning på innkommende prompts.
 */
exports.askBlu = functions.region("europe-west1").https.onCall(async (data, context) => {
  // 1. Verifiser at brukeren faktisk er autentisert
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Autentisering kreves. Du må være logget inn for å bruke BLU-assistenten."
    );
  }

  // 2. Valider prompt
  const rawPrompt = (data && data.prompt) ? data.prompt : (typeof data === "string" ? data : "");
  if (!rawPrompt || typeof rawPrompt !== "string" || !rawPrompt.trim()) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Ugyldig forespørsel: 'prompt' må være en ikke-tom tekststreng."
    );
  }

  if (rawPrompt.length > 40000) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Forespørselen overstiger maksimal tillatt størrelse (40 000 tegn)."
    );
  }

  // 3. Sjekk at minst én API-nøkkel er konfigurert og kall Gemini med Free Tier først
  if (getOrderedGeminiKeyCandidates().length === 0) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Gemini API-nøkkel (GEMINI_API_KEY_PRIMARY / GEMINI_API_KEY) er ikke konfigurert i serverens miljø."
    );
  }

  // 4. Kall Gemini via felles Free Tier-dørvakt
  try {
    const response = await generateWithFreeTierFirst("gemini-4-hydrogen", rawPrompt.trim());

    return {
      success: true,
      reply: response.text || "",
      uid: context.auth.uid
    };
  } catch (err) {
    console.error("Feil i askBlu callable:", err);
    throw new functions.https.HttpsError(
      "internal",
      err?.message || "Noe gikk galt under generering av svar fra Gemini."
    );
  }
});






