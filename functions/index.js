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
const admin = require("firebase-admin");
const Stripe = require("stripe");

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

// Hent Stripe API-nøkler fra environment variables eller Firebase Functions config
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret_key;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe?.webhook_secret;

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
exports.handleNewUserReferral = onDocumentCreated(
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
