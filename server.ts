import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import admin from "firebase-admin";
import fs from "fs";
import cors from "cors";

// Last inn .env-filer hvis de finnes
dotenv.config();

// Initialiser Firebase Admin hvis nøkkel finnes
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    let keyStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
    let serviceAccount;
    
    // Check if it's a base64 encoded string (doesn't start with { or [)
    if (!keyStr.startsWith('{') && !keyStr.startsWith('[')) {
      try {
        const decoded = Buffer.from(keyStr, 'base64').toString('utf8');
        if (decoded.trim().startsWith('{')) {
          keyStr = decoded;
        }
      } catch (e) {
        // ignore
      }
    }
    
    // Strip surrounding quotes if the user accidentally included them in the actual env value
    if ((keyStr.startsWith("'") && keyStr.endsWith("'")) || (keyStr.startsWith('"') && keyStr.endsWith('"'))) {
      if (keyStr.length > 2 && keyStr[1] === '{') {
         keyStr = keyStr.slice(1, -1);
      }
    }

    try {
      if (fs.existsSync(keyStr)) {
         keyStr = fs.readFileSync(keyStr, 'utf8');
      }
    } catch(err) {}

    serviceAccount = JSON.parse(keyStr);
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase Admin initialized for FCM");
    } else {
      console.log("Firebase Admin already initialized");
    }
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY.");
    console.error("Please ensure it is a valid JSON string, a base64-encoded JSON string, or a path to the JSON file.");
    console.error("Error details:", error instanceof Error ? error.message : String(error));
  }
}

const getDirname = () => {
  if (typeof __dirname !== "undefined") return __dirname;
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch (e) {
    return process.cwd();
  }
};
const _dirname = getDirname();

// Sanitiserer og slår sammen historikk slik at Gemini API får gyldige, vekslende user/model-turer
function sanitizeContents(contents: any): any {
  if (!contents) return " ";
  if (typeof contents === "string") {
    return contents.trim() || " ";
  }
  if (!Array.isArray(contents)) {
    return contents;
  }

  // 1. Konverter elementer til standard form: { role: 'user'|'model', parts: [{ text: string }] }
  const rawList: Array<{ role: 'user' | 'model'; text: string }> = [];
  for (const item of contents) {
    if (!item) continue;
    if (typeof item === 'string') {
      if (item.trim()) rawList.push({ role: 'user', text: item.trim() });
      continue;
    }
    let role: 'user' | 'model' = (item.role === 'model' || item.role === 'assistant') ? 'model' : 'user';
    let text = '';
    if (Array.isArray(item.parts)) {
      text = item.parts.map((p: any) => typeof p === 'string' ? p : (p?.text || '')).join('\n').trim();
    } else if (item.text && typeof item.text === 'string') {
      text = item.text.trim();
    } else if (item.content && typeof item.content === 'string') {
      text = item.content.trim();
    }

    if (!text) continue;

    // Filtrer ut feilmeldinger fra klient/UI
    const lowerText = text.toLowerCase();
    if (
      lowerText.includes("det oppstod et midlertidig avbrudd") ||
      lowerText.includes("midlertidig feil under tilkobling") ||
      lowerText.includes("klarte ikke å nå api-endepunktet") ||
      lowerText.includes("feil (404)") ||
      lowerText.includes("du må være logget inn") ||
      lowerText.includes("serverfeil ved kontakt med gemini")
    ) {
      continue;
    }

    rawList.push({ role, text });
  }

  if (rawList.length === 0) {
    return [{ role: 'user', parts: [{ text: "Hei" }] }];
  }

  // 2. Dropp ledende 'model'-tur dersom første turn er 'model'
  const firstUserIdx = rawList.findIndex(t => t.role === 'user');
  const validList = firstUserIdx !== -1 ? rawList.slice(firstUserIdx) : rawList;

  // 3. Slå sammen påfølgende meldinger med SAMME rolle (f.eks. user, user -> én user med samlet tekst)
  const normalized: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  for (const turn of validList) {
    if (normalized.length > 0 && normalized[normalized.length - 1].role === turn.role) {
      const prevText = normalized[normalized.length - 1].parts[0].text;
      if (prevText !== turn.text) {
        normalized[normalized.length - 1].parts[0].text = `${prevText}\n\n${turn.text}`;
      }
    } else {
      normalized.push({
        role: turn.role,
        parts: [{ text: turn.text }]
      });
    }
  }

  return normalized.length > 0 ? normalized : [{ role: 'user', parts: [{ text: "Hei" }] }];
}

// Sentral modell-normalisering: bruker alltid støttede Gemini 4 / 3.8 / 3.1-modeller
function normalizeGeminiModel(preferredModel: string | undefined): string {
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

function isAuthOrKeyError(err: any): boolean {
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

function isDepletedCreditsError(err: any): boolean {
  const errMsg = err?.message || String(err || "");
  return (
    err?.status === 402 ||
    errMsg.includes("prepayment credits are depleted") ||
    errMsg.includes("credits are depleted")
  );
}

function isQuotaOrTransientError(err: any): boolean {
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

// Hjelpefunksjon for å kalle Gemini med intelligent fallback på tvers av modeller
async function callGenAIWithFallback(ai: any, preferredModel: string | undefined, contents: any, config: any) {
  const initial = normalizeGeminiModel(preferredModel);

  // Sørg for at contents alltid er strengt vekslende og uten feilmeldinger
  const sanitizedContents = sanitizeContents(contents);

  // Saniter config: Fjern utgåtte/avviste samplingsparametere for Gemini 4 / 3.1
  const sanitizedConfig = { ...(config || {}) };
  delete sanitizedConfig.temperature;
  delete sanitizedConfig.topP;
  delete sanitizedConfig.topK;
  delete sanitizedConfig.candidateCount;

  // Modellrekke for robusthet mot 404, 429 (kvote) og 503 (stor pågang)
  const fallbackModel = initial.includes("tts") ? "gemini-3.8-flash-lite-tts" : "gemini-3.1-flash-lite";
  const modelCandidates = [
    initial,
    fallbackModel
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  let lastError: any = null;

  for (let i = 0; i < modelCandidates.length; i++) {
    const currentModel = modelCandidates[i];
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: sanitizedContents,
        config: sanitizedConfig,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      const isQuotaOrRateLimit = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || err?.status === 429;
      const isUnavailable = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || err?.status === 503 || errMsg.includes("high demand");

      // Kritiske nøkkel-, autorisasjons- eller saldofeil kan ikke løses ved å bytte modell alene
      if (isAuthOrKeyError(err) || isDepletedCreditsError(err)) {
        throw err;
      }

      console.warn(`Modell ${currentModel} feilet (status: ${err?.status || 'ukjent'}, kvote: ${isQuotaOrRateLimit}, utilgjengelig: ${isUnavailable}). Forsøker neste kandidat (${modelCandidates[i + 1] || 'ingen'})...`);

      // Hvis flere modeller gjenstår, vent kort før neste kandidat
      if (i < modelCandidates.length - 1) {
        const waitTime = (isQuotaOrRateLimit || isUnavailable) ? 1200 : 400;
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
  }

  throw lastError;
}

const MISSING_API_KEY_GUIDANCE = `⚠️ **Ingen aktiv Gemini API-nøkkel ble funnet i servermiljøet:**\n\nServeren fant ingen gyldig verdi for \`GEMINI_API_KEY\`, \`GEMINI_API_KEY_PRIMARY\` eller \`GEMINI_API_KEY_FREE\` i miljøvariablene akkurat nå.\n\n**Slik sjekker du det:**\n1. Åpne **Settings > Secrets** i AI Studio (eller **GitHub Secrets** for produksjon).\n2. Bekreft at nøkkelen er lagret under \`GEMINI_API_KEY\` eller \`GEMINI_API_KEY_PRIMARY\` uten ekstra mellomrom eller anførselstegn.\n3. Last inn appen på nytt slik at serveren leser de oppdaterte miljøvariablene.\n\n*Alle øvrige verktøy, veiledere, pensumlister og didaktiske maler i appen fungerer som vanlig.*`;

const API_KEY_GUIDANCE = `⚠️ **Merk angående Gemini API-nøkkel:**\n\nGoogle avviste forespørselen med autorisasjonsfeil (\`401 UNAUTHENTICATED / API key not valid\`) på de konfigurerte nøklene.\n\n**Hva betyr dette?**\nBåde nøkler som starter med \`AQ.\` og \`AIza...\` er offisielle API-nøkler fra Google AI Studio. Når Google likevel svarer \`401 / ACCESS_TOKEN_TYPE_UNSUPPORTED\`, betyr det som regel at:\n1. Nøkkelen er **slettet/tilbakekalt**, eller ble **avkortet / feilkopiert** da den ble limt inn i **Settings > Secrets**, eller\n2. Prosjektet nøkkelen tilhører ikke har aktivert tilgang til Gemini API.\n\n**Slik løser du det på 1 minutt:**\n1. Åpne **[Google AI Studio (aistudio.google.com/app/apikey)](https://aistudio.google.com/app/apikey)**.\n2. Klikk på **"Create API key"** og velg **"Create API key in new project"** (uten betalingskort for gratis Free Tier).\n3. Kopier **hele** nøkkelen og oppdater \`GEMINI_API_KEY_PRIMARY\` (og/eller \`GEMINI_API_KEY\`) under **Settings > Secrets**.\n\n*Du kan fortsette å bruke alle verktøy, veiledere, pensumlister og didaktiske maler i appen som vanlig.*`;

const DEPLETED_CREDITS_GUIDANCE = `💳 **Prosjektets forhåndsbetalte saldo er oppbrukt (Prepayment credits depleted):**\n\nGoogle Cloud har registrert at prosjektet denne nøkkelen tilhører er knyttet til fakturering med forhåndsbetaling (Prepay Billing), og saldoen står for øyeblikket i 0 kr.\n\n**To enkle måter å løse dette på:**\n\n**Alternativ A (100% Gratis Free Tier – Anbefalt):**\n1. Åpne **[Google AI Studio (aistudio.google.com/app/apikey)](https://aistudio.google.com/app/apikey)**.\n2. Klikk **"Create API key"** og velg **"Create API key in new project"**.\n3. *Ikke* legg til betalingskort på dette nye prosjektet. Da forblir prosjektet på ekte **Free Tier** med gratis daglig kvote.\n4. Oppdater nøkkelen i **Settings > Secrets** i AI Studio som \`GEMINI_API_KEY_PRIMARY\` (eller \`GEMINI_API_KEY\`).\n\n**Alternativ B (Fyll på saldo på eksisterende prosjekt):**\n1. Gå til **[ai.studio/projects](https://ai.studio/projects)** eller Google Cloud Console Billing.\n2. Fyll på ønsket beløp (f.eks. $5 eller 50 kr) for å åpne API-tilgangen igjen.\n\n*Alle didaktiske verktøy, pensumlister og maler i appen kan fortsatt brukes som normalt.*`;

interface GeminiKeyCandidate {
  envName: string;
  tier: "free" | "paid";
  key: string;
  prefixType: "AQ" | "AIza" | "other";
}

function cleanApiKey(raw: string | undefined): string {
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
function getOrderedGeminiKeyCandidates(): GeminiKeyCandidate[] {
  const orderedSources: Array<{ envName: string; tier: "free" | "paid" }> = [
    { envName: "GEMINI_API_KEY_FREE", tier: "free" },
    { envName: "GEMINI_API_KEY_PRIMARY", tier: "free" },
    { envName: "GEMINI_API_KEY", tier: "free" },
    { envName: "API_KEY", tier: "free" },
    { envName: "GEMINI_API_KEY_PAID", tier: "paid" },
    { envName: "GEMINI_API_KEY_BACKUP", tier: "paid" },
  ];

  const seenKeys = new Set<string>();
  const candidates: GeminiKeyCandidate[] = [];

  for (const src of orderedSources) {
    const key = cleanApiKey(process.env[src.envName]);
    if (!key || seenKeys.has(key)) continue;
    seenKeys.add(key);
    const prefixType: "AQ" | "AIza" | "other" = key.startsWith("AQ.")
      ? "AQ"
      : key.startsWith("AIza")
        ? "AIza"
        : "other";
    candidates.push({
      envName: src.envName,
      tier: src.tier,
      key,
      prefixType,
    });
  }

  return candidates;
}

function createGenAIClient(GoogleGenAI: any, apiKey: string, useVertexAI: boolean) {
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

// Intelligent dørvakt: Prøver ALLTID alle Free Tier-nøkler først (støtter både AIza... og AQ.-nøkler),
// og kobler KUN inn betalt reservenøkkel dersom Free Tier feiler med kvote/saldo/autorisasjon.
async function callGenAIWithDualKeyFallback(preferredModel: string | undefined, contents: any, config: any) {
  const { GoogleGenAI } = await import("@google/genai");
  const candidates = getOrderedGeminiKeyCandidates();

  if (candidates.length === 0) {
    console.warn("[Gemini] Fant ingen gyldige API-nøkler i miljøvariablene (GEMINI_API_KEY_FREE / GEMINI_API_KEY_PRIMARY / GEMINI_API_KEY / GEMINI_API_KEY_PAID / GEMINI_API_KEY_BACKUP).");
    return { text: MISSING_API_KEY_GUIDANCE };
  }

  let lastError: any = null;
  let authErrorCount = 0;
  let depletedErrorCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    // Prøv alltid standard Gemini Developer API (vertexai: false) først for både AIza... og AQ. AI Studio-nøkler.
    // Prøv kun Vertex AI Express Mode (vertexai: true) som fallback hvis Gemini API avviser tokentypen.
    const modesToTry: boolean[] = [false, true];
    let candidateLastErr: any = null;

    for (let mIdx = 0; mIdx < modesToTry.length; mIdx++) {
      const useVertexAI = modesToTry[mIdx];
      const modeLabel = useVertexAI ? "vertex-express" : "gemini-api";

      try {
        const ai = createGenAIClient(GoogleGenAI, candidate.key, useVertexAI);
        return await callGenAIWithFallback(ai, preferredModel, contents, config);
      } catch (err: any) {
        candidateLastErr = err;
        lastError = err;
        const errMsg = err?.message || String(err);
        const safeSnippet = errMsg.replace(/\s+/g, " ").slice(0, 180);
        console.warn(`[Gemini] ${candidate.envName} (${candidate.tier}, ${candidate.prefixType}, ${modeLabel}) feilet (status=${err?.status || "ukjent"}): ${safeSnippet}`);

        // Kun prøv Vertex Express som sekundærmodus ved eksplisitt token-type-avvisning fra Gemini API
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

    if (isAuthOrKeyError(candidateLastErr)) {
      authErrorCount++;
    }
    if (isDepletedCreditsError(candidateLastErr)) {
      depletedErrorCount++;
    }

    // Hvis flere kandidater gjenstår, gå videre til neste (gjenværende Free Tier først, deretter Paid backup)
    const shouldFailover =
      isQuotaOrTransientError(candidateLastErr) ||
      isDepletedCreditsError(candidateLastErr) ||
      isAuthOrKeyError(candidateLastErr) ||
      candidateLastErr?.status === 404 ||
      String(candidateLastErr?.message || "").toLowerCase().includes("not found");

    if (!shouldFailover) {
      throw candidateLastErr;
    }

    if (i < candidates.length - 1) {
      const next = candidates[i + 1];
      console.warn(`[Gemini] Bytter fra ${candidate.envName} (${candidate.tier}) til neste nøkkelkandidat ${next.envName} (${next.tier})...`);
    }
  }

  if (depletedErrorCount > 0 && depletedErrorCount + authErrorCount === candidates.length) {
    return { text: DEPLETED_CREDITS_GUIDANCE };
  }
  if (authErrorCount === candidates.length) {
    return { text: API_KEY_GUIDANCE };
  }

  throw lastError;
}

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception thrown:", error);
});

async function startServer() {
  const app = express();
  
  // Støtt CLI-argumenter som --port 3000, --port=3000, --host 0.0.0.0, --host=0.0.0.0 fra dev-runneren
  let portFromArgs: number | undefined;
  let hostFromArgs: string = "0.0.0.0";
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--port" && process.argv[i + 1]) {
      const parsed = Number(process.argv[i + 1]);
      if (!isNaN(parsed) && parsed > 0) portFromArgs = parsed;
    } else if (arg.startsWith("--port=")) {
      const parsed = Number(arg.split("=")[1]);
      if (!isNaN(parsed) && parsed > 0) portFromArgs = parsed;
    } else if (arg === "-p" && process.argv[i + 1]) {
      const parsed = Number(process.argv[i + 1]);
      if (!isNaN(parsed) && parsed > 0) portFromArgs = parsed;
    } else if (arg === "--host" && process.argv[i + 1]) {
      hostFromArgs = process.argv[i + 1];
    } else if (arg.startsWith("--host=")) {
      hostFromArgs = arg.split("=")[1];
    }
  }

  // I AI Studio dev-miljø er Nginx bundet til port 8080 og proxyer til localhost:3000.
  // Dev-serveren må derfor lytte på port 3000 i development.
  const isDev = process.env.NODE_ENV !== "production";
  const PORT = portFromArgs || (isDev ? 3000 : (Number(process.env.PORT) || 3000));
  const HOST = hostFromArgs;

  // Tillat kall fra eksterne klienter (som Firebase Hosting) til dette Cloud Run-backenhet
  app.use(cors());
  app.options('*', cors());
  app.use(express.json({ limit: '50mb' }));

  // In-memory rate limiting map for å beskytte mot automatiserte bots og uendelige løkker
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  function checkRateLimit(ip: string, limit = 30, windowMs = 60000): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);
    if (!record || now > record.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
      return true;
    }
    if (record.count >= limit) {
      return false;
    }
    record.count++;
    return true;
  }

  // Autentiserings- og Rate-limiting middleware på alle AI-relaterte proxy-ruter
  app.use(["/api/gemini", "/api/chat", "/api/superveileder", "/api/superveilederen", "/api/superveilederenChat"], async (req, res, next) => {
    // 0. Tillat OPTIONS for CORS-preflight uten token-sjekk (svarer 200 OK med CORS-headere)
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    // 1. Rate limiting per IP (tillat 60 forespørsler per minutt for høyt trafikk-bruk)
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp, 60, 60000)) {
      return res.status(429).json({ error: "For mange forespørsler fra denne klienten. Vennligst vent litt (Rate limit beskyttelse)." });
    }

    // 2. Token-sjekk med sømløs fallback for gjester og portal-kall
    const authHeader = req.headers.authorization;
    let token = "dev-guest-token";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split("Bearer ")[1]?.trim() || "dev-guest-token";
    }

    // Hvis Firebase Admin er tilgjengelig, verifiser signaturen på ID-tokenet dersom det ikke er en gjest
    if (admin.apps.length && token && token !== "dev-guest-token") {
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        (req as any).user = decoded;
      } catch (tokenErr) {
        // Logg advarsel, men fortsett som gjest slik at studenter aldri opplever avbrudd
        console.warn("Mottok utløpt eller uverifisert token, fortsetter i gjestemodus:", tokenErr instanceof Error ? tokenErr.message : String(tokenErr));
      }
    }
    next();
  });

  // Helse-sjekk
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "BLU-Hjelperen Backend er oppe og kjører!" });
  });

  // Dedicated Chat Endpoint for BLU-hjelperen (/api/chat/message)
  app.post(["/api/chat/message", "/api/chat/message/", "/chat/message"], async (req, res) => {
    try {
      const { history = [], newMessage, fileContext = '', fileName = '' } = req.body;
      if (!newMessage || typeof newMessage !== 'string') {
        return res.status(400).json({ error: "Mangler 'newMessage' i forespørselen." });
      }

      if (newMessage.length > 50000 || (typeof fileContext === 'string' && fileContext.length > 100000)) {
        return res.status(400).json({ error: "Forespørselen overstiger maksimal tillatt datastørrelse." });
      }

      const systemInstruction = `Du er BLU-hjelperen, en støttende, anerkjennende og faglig dyktig pedagogisk veileder for norske barnehagelærerstudenter (BLU). 
Ditt hovedmål er å hjelpe studentene med å koble teori og praksis.

Når du svarer, følg disse retningslinjene:
1. Faglig forankring: Trekk alltid inn 'Rammeplan for barnehagens innhold og oppgaver' der det er naturlig. Bruk begreper som omsorg, lek, læring, danning og barns medvirkning riktig.
2. Pedagogisk tilnærming: Hjelp studenten til å reflektere selv fremfor å bare gi "fasitsvar". Still gjerne didaktiske spørsmål tilbake (Hva tenker du om...? Hvordan ville du håndtert...?).
3. Dokument- og oppgaveforståelse: Hvis studenten har lagt ved et dokument eller en oppgavetekst, ta utgangspunkt i innholdet og referer eksplisitt til relevante deler av teksten.
4. Tone: Vær empatisk, oppmuntrende og profesjonell.
5. Format: Hold svarene strukturerte, lettleste (bruk gjerne kulepunkter og korte avsnitt) og presise.
6. Begrensning: Minn studenten på å alltid bruke eget faglig skjønn og dobbeltsjekke pensum/faglitteratur hvis temaet er svært komplekst.`;

      // Konverter history til standard contents format for SDK
      const contents: any[] = [];
      if (Array.isArray(history)) {
        for (const item of history) {
          if (item.parts && Array.isArray(item.parts)) {
            contents.push({
              role: item.role === 'model' || item.role === 'assistant' ? 'model' : 'user',
              parts: item.parts.map((p: any) => typeof p === 'string' ? { text: p } : p)
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

      const response = await callGenAIWithDualKeyFallback("gemini-4-hydrogen", contents, {
        systemInstruction,
        maxOutputTokens: 4096,
      });

      res.json({ text: response.text || "" });
    } catch (error: any) {
      console.warn("Serverfeil ved kontakt med Gemini for /api/chat/message:", error?.message || error);
      let errMsg = error?.message || String(error);
      try {
        const parsed = JSON.parse(errMsg);
        if (parsed?.error?.message) {
          errMsg = parsed.error.message;
        }
      } catch {}

      const isDepleted = errMsg.includes("prepayment credits are depleted") || errMsg.includes("credits are depleted");
      const isRateLimit = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || error?.status === 429;
      const isUnavailable = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || error?.status === 503 || errMsg.includes("high demand");
      const isInvalidKey = errMsg.includes("API_KEY_INVALID") || errMsg.includes("API key not valid") || errMsg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") || errMsg.includes("UNAUTHENTICATED");

      if (isInvalidKey) {
        return res.json({ text: API_KEY_GUIDANCE });
      }
      if (isDepleted) {
        return res.json({ text: DEPLETED_CREDITS_GUIDANCE });
      }
      if (isRateLimit) {
        return res.status(429).json({ 
          error: "Superveilederen opplever stor pågang akkurat nå (mange studenter bruker tjenesten samtidig). Vent 10–15 sekunder og prøv igjen." 
        });
      }
      if (isUnavailable) {
        return res.status(503).json({
          error: "KI-modellen opplever midlertidig stor pågang (503). Vent noen sekunder og prøv igjen."
        });
      }
      if (error?.status === 404 || errMsg.toLowerCase().includes("not found")) {
        return res.status(502).json({
          error: "KI-modellen er midlertidig utilgjengelig eller opplever modell-migrering. Vennligst prøv igjen om noen sekunder."
        });
      }
      res.status(error?.status || 500).json({ error: errMsg || "Klarte ikke å hente svar fra KI-modellen." });
    }
  });

  // Gemini Proxy Endpoint
  app.post(["/api/gemini/generate", "/api/gemini/generate/", "/gemini/generate", "/api/gemini", "/gemini"], async (req, res) => {
    try {
      const { model, contents, config, prompt } = req.body;
      const actualContents = contents || prompt;

      // Beskyttelse mot gigantiske payloads
      const payloadStr = typeof actualContents === 'string' ? actualContents : JSON.stringify(actualContents || '');
      if (payloadStr.length > 150000) {
        return res.status(400).json({ error: "Payload for stor (maks 150 000 tegn)." });
      }

      const response = await callGenAIWithDualKeyFallback(model, actualContents, config);

      res.json({ text: response.text || "" });
    } catch (error: any) {
      console.warn("Gemini API advarsel:", error?.message || error);
      let errMsg = error?.message || String(error);
      try {
        const parsed = JSON.parse(errMsg);
        if (parsed?.error?.message) {
          errMsg = parsed.error.message;
        }
      } catch {}

      const isDepleted = errMsg.includes("prepayment credits are depleted") || errMsg.includes("credits are depleted") || error?.status === 402;
      const isRateLimit = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || error?.status === 429;
      const isUnavailable = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || error?.status === 503 || errMsg.includes("high demand");
      const isInvalidKey = errMsg.includes("API_KEY_INVALID") || errMsg.includes("API key not valid") || errMsg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") || errMsg.includes("UNAUTHENTICATED");

      if (isInvalidKey) {
        return res.json({ text: API_KEY_GUIDANCE });
      }
      if (isDepleted) {
        return res.json({ text: DEPLETED_CREDITS_GUIDANCE });
      }
      if (isRateLimit) {
        return res.status(429).json({
          error: "Superveilederen opplever stor pågang akkurat nå (mange studenter bruker tjenesten samtidig). Vent 10–15 sekunder og prøv igjen."
        });
      }
      if (isUnavailable) {
        return res.status(503).json({
          error: "KI-modellen opplever midlertidig stor pågang (503). Vent noen sekunder og prøv igjen."
        });
      }
      if (error?.status === 404 || errMsg.toLowerCase().includes("not found")) {
        return res.status(502).json({
          error: "KI-modellen er midlertidig utilgjengelig eller ikke funnet. Vennligst prøv igjen."
        });
      }

      res.status(error?.status || 500).json({ error: errMsg || "Klarte ikke å generere innhold." });
    }
  });

  // Gemini Image Generation Proxy Endpoint
  app.post(["/api/gemini/generate-image", "/api/gemini/generate-image/", "/gemini/generate-image"], async (req, res) => {
    try {
      const candidates = getOrderedGeminiKeyCandidates();
      const { prompt, aspectRatio = "16:9" } = req.body;
      const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
      const targetAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : "16:9";

      let imageUrl = "";

      if (candidates.length > 0) {
        const { GoogleGenAI } = await import("@google/genai");
        const imageModels = [
          { model: "gemini-3.1-flash-lite-image", imageConfig: { aspectRatio: targetAspectRatio as any, imageSize: "1K" } },
          { model: "gemini-nano-banana-2.1", imageConfig: { aspectRatio: targetAspectRatio as any } },
        ];

        for (const candidate of candidates) {
          if (imageUrl) break;
          const modesToTry = candidate.prefixType === "AQ" ? [false, true] : [false];
          for (const useVertexAI of modesToTry) {
            if (imageUrl) break;
            const ai = createGenAIClient(GoogleGenAI, candidate.key, useVertexAI);
            for (const cfg of imageModels) {
              try {
                const response = await ai.models.generateContent({
                  model: cfg.model,
                  contents: { parts: [{ text: prompt }] },
                  config: { imageConfig: cfg.imageConfig },
                });
                for (const cand of response.candidates || []) {
                  for (const part of cand.content?.parts || []) {
                    if (part.inlineData?.data) {
                      imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
                      break;
                    }
                  }
                  if (imageUrl) break;
                }
                if (imageUrl) break;
              } catch {
                // Prøv neste bildemodell/nøkkel
              }
            }
          }
        }
      }

      // Robust fallback hvis modellkvote er oppbrukt eller bildegenerering ikke ga treff
      if (!imageUrl) {
        const safePrompt = encodeURIComponent(String(prompt || "").trim() + ", kindergarten, norwegian barnehage, happy children, cozy atmosphere, realistic photography");
        imageUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=1200&height=800&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
      }

      res.json({ imageUrl });
    } catch (error: any) {
      console.error("Gemini Image generation error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Gemini Multi-Speaker / Standard Podcast Audio (TTS -> WAV) Endpoint
  app.post(["/api/gemini/podcast-audio", "/api/gemini/podcast-audio/", "/gemini/podcast-audio"], async (req, res) => {
    try {
      const { dialogue, qualityLevel = "studio", hostVoiceName, expertVoiceName } = req.body || {};
      if (!Array.isArray(dialogue) || dialogue.length === 0) {
        return res.status(400).json({ error: "Mangler gyldig 'dialogue'-liste for lydgenerering." });
      }
      if (dialogue.length > 20) {
        return res.status(400).json({ error: "For mange replikker i én lydbolk (maks 20 per kall)." });
      }

      const normalizedTurns = dialogue
        .map((turn: any) => ({
          speaker: turn?.speaker === "Ekspert" ? "Ekspert" : "Programleder",
          text: String(turn?.text || "").replace(/\s+/g, " ").trim().slice(0, 2500),
        }))
        .filter((turn) => turn.text.length > 0);

      if (normalizedTurns.length === 0) {
        return res.status(400).json({ error: "Ingen lesbar tekst å gjøre om til lyd." });
      }

      const totalChars = normalizedTurns.reduce((sum, t) => sum + t.text.length, 0);
      if (totalChars > 15000) {
        return res.status(400).json({ error: "Lydbolken overstiger maksimal lengde på 15 000 tegn." });
      }

      const candidates = getOrderedGeminiKeyCandidates();
      if (candidates.length === 0) {
        return res.status(503).json({
          error: "Ingen aktiv Gemini API-nøkkel er konfigurert på serveren for talesyntese."
        });
      }

      const ALLOWED_VOICES = new Set(["Kore", "Charon", "Puck", "Fenrir", "Zephyr"]);
      const safeHostVoice = ALLOWED_VOICES.has(hostVoiceName) ? hostVoiceName : "Kore";
      const safeExpertVoice = ALLOWED_VOICES.has(expertVoiceName) ? expertVoiceName : "Charon";
      const isStandardQuality = qualityLevel === "standard";

      const { GoogleGenAI } = await import("@google/genai");

      const targetModel = isStandardQuality
        ? "gemini-3.8-flash-lite-tts"
        : "gemini-3.8-flash-tts";

      const plainParts = [
        {
          text: isStandardQuality
            ? normalizedTurns.map((turn) => turn.text).join("\n\n")
            : normalizedTurns.map((turn) => `${turn.speaker}: ${turn.text}`).join("\n\n"),
        },
      ];

      const partsWithMetadata = normalizedTurns.map((turn) => ({
        text: isStandardQuality ? turn.text : `${turn.speaker}: ${turn.text}`,
        speechMetadata: {
          ...(isStandardQuality ? {} : { speaker: turn.speaker }),
          style: isStandardQuality
            ? "Clear, warm, fluent Norwegian educational narrator speaking natural Bokmål"
            : turn.speaker === "Programleder"
              ? "Warm, curious, engaging Norwegian podcast host speaking natural Bokmål"
              : "Articulate, knowledgeable, friendly Norwegian pedagogy expert speaking natural Bokmål",
        },
      }));

      const ttsConfig = isStandardQuality
        ? {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: safeHostVoice },
              },
            },
          }
        : {
            responseModalities: ["AUDIO"],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                  {
                    speaker: "Programleder",
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: safeHostVoice },
                    },
                  },
                  {
                    speaker: "Ekspert",
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: safeExpertVoice },
                    },
                  },
                ],
              },
            },
          };

      let lastError: any = null;
      let audioBase64 = "";
      let mimeType = "audio/wav";

      for (let i = 0; i < candidates.length; i++) {
        if (audioBase64) break;
        const candidate = candidates[i];
        const modesToTry = candidate.prefixType === "AQ" ? [false, true] : [false];

        for (let mIdx = 0; mIdx < modesToTry.length; mIdx++) {
          if (audioBase64) break;
          const useVertexAI = modesToTry[mIdx];

          const payloadAttempts = [
            { label: "plain-v1beta", apiVersion: undefined as string | undefined, parts: plainParts },
            { label: "meta-v1alpha", apiVersion: "v1alpha", parts: partsWithMetadata },
          ];

          for (const attempt of payloadAttempts) {
            try {
              const ai = new GoogleGenAI({
                apiKey: candidate.key,
                ...(useVertexAI ? { vertexai: true } : {}),
                ...(attempt.apiVersion ? { apiVersion: attempt.apiVersion } : {}),
                httpOptions: {
                  headers: {
                    "User-Agent": "aistudio-build",
                  },
                },
              });

              const response: any = await ai.models.generateContent({
                model: targetModel,
                contents: [{ role: "user", parts: attempt.parts }],
                config: ttsConfig,
              });

              for (const cand of response?.candidates || []) {
                for (const part of cand?.content?.parts || []) {
                  if (part?.inlineData?.data) {
                    audioBase64 = part.inlineData.data;
                    mimeType = part.inlineData.mimeType || "audio/wav";
                    break;
                  }
                }
                if (audioBase64) break;
              }
              if (audioBase64) break;
            } catch (err: any) {
              lastError = err;
              const errMsg = err?.message || String(err);
              console.warn(
                `[Gemini TTS] ${candidate.envName} (${useVertexAI ? "vertex-express" : "gemini-api"}, ${targetModel}, ${attempt.label}) feilet:`,
                errMsg.slice(0, 220)
              );
              if (isAuthOrKeyError(err) || isDepletedCreditsError(err) || isQuotaOrTransientError(err)) {
                break;
              }
            }
          }

          if (audioBase64) break;
          if (mIdx === 0 && lastError) {
            const errMsg = lastError?.message || String(lastError);
            const shouldTryVertex =
              errMsg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") ||
              errMsg.includes("API keys are not supported");
            if (!shouldTryVertex) break;
          }
        }
      }

      if (!audioBase64) {
        const errMsg = lastError?.message || String(lastError || "");
        if (isQuotaOrTransientError(lastError)) {
          return res.status(429).json({
            error: "Talesyntesen opplever stor pågang eller nådd kvote akkurat nå. Vent litt og prøv igjen – minuttene dine ble ikke trukket."
          });
        }
        return res.status(502).json({
          error: errMsg
            ? `Kunne ikke generere AI-lyd akkurat nå (${errMsg.slice(0, 140)}). Minuttene dine ble ikke trukket.`
            : "Kunne ikke generere AI-lyd akkurat nå. Minuttene dine ble ikke trukket."
        });
      }

      res.json({ audioBase64, mimeType });
    } catch (error: any) {
      console.error("Gemini Podcast TTS error:", error);
      res.status(500).json({
        error: "Uventet feil ved generering av podcast-lydfil. Minuttene dine ble ikke trukket."
      });
    }
  });

  // Superveilederen Chat Endpoint med dynamisk system-prompt
  app.post(["/api/superveilederen", "/api/superveilederenChat"], async (req, res) => {
    try {
      const { message, documentContext, history = [] } = req.body || {};

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

      const contents: any[] = [];
      if (Array.isArray(history)) {
        for (const item of history) {
          if (!item || item.role === "system") continue;
          const role = (item.role === "assistant" || item.role === "model") ? "model" : "user";
          const text = item.content || item.text || (Array.isArray(item.parts) ? item.parts.map((p: any) => typeof p === "string" ? p : p.text).join(" ") : "");
          if (text) {
            contents.push({ role, parts: [{ text }] });
          }
        }
      }

      contents.push({
        role: "user",
        parts: [{ text: message || "Vennligst analyser det vedlagte dokumentet." }]
      });

      const response = await callGenAIWithDualKeyFallback(
        "gemini-4-hydrogen",
        contents,
        {
          systemInstruction: systemPrompt,
          maxOutputTokens: 4096,
        }
      );

      res.json({
        text: response.text || "",
        mode: documentContext ? "documentAnalysis" : "socratic",
        aiMessages
      });
    } catch (error: any) {
      console.warn("Superveilederen endpoint advarsel:", error?.message || error);
      let errMsg = error?.message || String(error);
      const isInvalidKey = errMsg.includes("API_KEY_INVALID") || errMsg.includes("API key not valid") || errMsg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") || errMsg.includes("UNAUTHENTICATED");
      const isDepleted = errMsg.includes("prepayment credits are depleted") || errMsg.includes("credits are depleted") || error?.status === 402;
      if (isInvalidKey) {
        return res.json({
          text: API_KEY_GUIDANCE,
          mode: req.body?.documentContext ? "documentAnalysis" : "socratic",
          aiMessages: []
        });
      }
      if (isDepleted) {
        return res.json({
          text: DEPLETED_CREDITS_GUIDANCE,
          mode: req.body?.documentContext ? "documentAnalysis" : "socratic",
          aiMessages: []
        });
      }
      res.status(500).json({ error: String(error?.message || error) });
    }
  });

  // ask-blu Endpoint (speiler Cloud Function med sikkerhet og feilhåndtering)
  app.post(["/api/ask-blu", "/api/ask-blu/"], async (req, res) => {
    try {
      const { prompt } = req.body || {};
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return res.status(400).json({ error: "Mangler gyldig 'prompt' i forespørselen." });
      }

      if (prompt.length > 40000) {
        return res.status(400).json({ error: "Forespørselen overstiger maksimal tillatt lengde på 40 000 tegn." });
      }

      const response = await callGenAIWithDualKeyFallback(
        "gemini-4-hydrogen",
        prompt.trim(),
        {}
      );

      res.json({ reply: response.text || "" });
    } catch (error: any) {
      console.warn("ask-blu endpoint advarsel:", error?.message || error);
      let errMsg = error?.message || String(error);
      const isInvalidKey = errMsg.includes("API_KEY_INVALID") || errMsg.includes("API key not valid") || errMsg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") || errMsg.includes("UNAUTHENTICATED");
      const isDepleted = errMsg.includes("prepayment credits are depleted") || errMsg.includes("credits are depleted") || error?.status === 402;
      if (isInvalidKey) {
        return res.json({ reply: API_KEY_GUIDANCE });
      }
      if (isDepleted) {
        return res.json({ reply: DEPLETED_CREDITS_GUIDANCE });
      }
      res.status(500).json({ error: String(error?.message || error) });
    }
  });


  // FCM Sending Endpoint
  app.post("/api/send-notification", async (req, res) => {
    if (!admin.apps.length) {
      // res.status(503).json({ error: "Firebase Admin not initialized. Check FIREBASE_SERVICE_ACCOUNT_KEY in .env" });
      // We return 200 mapped so the client doesn't crash if they haven't set it up
      return res.status(200).json({ success: false, message: "Firebase Admin ikke konfigurert. Varsel ignorert." });
    }

    const { token, title, body } = req.body;

    if (!token || !title || !body) {
       return res.status(400).json({ error: "Missing token, title, or body" });
    }

    try {
      const message = {
        notification: { title, body },
        token: token,
      };

      const response = await admin.messaging().send(message);
      res.json({ success: true, response });
    } catch (error) {
      console.error("Error sending FCM message:", error);
      res.status(500).json({ error: "Failed to send message", details: String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist'))
      ? path.join(process.cwd(), 'dist')
      : path.join(process.cwd(), 'build');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (!fs.existsSync(indexPath)) {
         return res.status(404).send("<b>Frontend (index.html) mangler på serveren.</b> Sjekk at Cloud Build kjører bygget, eller at du har lastet opp dist/build-mappen. Sjekket sti: " + indexPath);
      }
      res.sendFile(indexPath);
    });
  }

  const tryListen = (attemptsLeft = 10, delay = 1000) => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
    });

    server.on("error", (err: any) => {
      try { server.close(); } catch {}
      if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
        console.warn(`Port ${PORT} is busy, retrying in ${delay}ms... (${attemptsLeft} attempts remaining)`);
        setTimeout(() => tryListen(attemptsLeft - 1, delay), delay);
      } else {
        console.error("Server listen error:", err);
        process.exit(1);
      }
    });

    const shutdown = () => {
      console.log("Shutting down server gracefully...");
      server.close(() => {
        process.exit(0);
      });
      setTimeout(() => process.exit(0), 1000).unref();
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  };

  tryListen();
}

startServer().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
