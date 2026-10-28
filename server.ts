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
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized for FCM");
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

// Hjelpefunksjon for å kalle Gemini med intelligent fallback på tvers av modeller
async function callGenAIWithFallback(ai: any, preferredModel: string | undefined, contents: any, config: any) {
  let initial = (typeof preferredModel === "string" && preferredModel.trim()) ? preferredModel.trim() : "gemini-3.8-flash";
  // Oppgrader utgåtte modeller (1.5 og 2.0) til 3.8-flash
  if (initial.includes("1.5") || initial.includes("2.0") || initial === "gemini-pro") {
    initial = "gemini-3.8-flash";
  }

  // Modellrekke for robusthet mot 404 (modell ikke tilgjengelig for nøkkel), 429 (kvote) og 503 (stor pågang)
  // gemini-3.1-flash-lite har separat kvotepool og er lynrask som umiddelbar fallback
  const modelCandidates = [
    initial,
    "gemini-3.1-flash-lite"
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  let lastError: any = null;

  for (let i = 0; i < modelCandidates.length; i++) {
    const currentModel = modelCandidates[i];
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents,
        config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      const isQuotaOrRateLimit = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || err?.status === 429;
      const isUnavailable = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || err?.status === 503 || errMsg.includes("high demand");
      const isDepleted = errMsg.includes("prepayment credits are depleted") || errMsg.includes("credits are depleted");

      // Kritiske feil med selve API-nøkkelen kan ikke løses med å bytte modell
      if (errMsg.includes("API_KEY_INVALID") || errMsg.includes("API key not valid") || isDepleted) {
        throw err;
      }

      console.warn(`Modell ${currentModel} feilet (status: ${err?.status || 'ukjent'}, kvote: ${isQuotaOrRateLimit}, utilgjengelig: ${isUnavailable}). Forsøker neste kandidat (${modelCandidates[i + 1] || 'ingen'})...`);

      // Hvis flere modeller gjenstår, vent for å la per-sekund burst-kvote resette seg før neste kandidat
      if (i < modelCandidates.length - 1) {
        const waitTime = (isQuotaOrRateLimit || isUnavailable) ? 1400 : 500;
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
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
  
  // Støtt CLI-argumenter som --port 3000 fra dev-runneren
  let portFromArgs: number | undefined;
  const portIdx = process.argv.indexOf("--port");
  if (portIdx !== -1 && process.argv[portIdx + 1]) {
    const parsed = Number(process.argv[portIdx + 1]);
    if (!isNaN(parsed) && parsed > 0) {
      portFromArgs = parsed;
    }
  }

  // I AI Studio dev-miljø er Nginx bundet til port 8080 og proxyer til localhost:3000.
  // Dev-serveren må derfor lytte på port 3000 i development.
  const isDev = process.env.NODE_ENV !== "production";
  const PORT = portFromArgs || (isDev ? 3000 : (Number(process.env.PORT) || 3000));

  // Tillat kall fra eksterne klienter (som Firebase Hosting) til dette Cloud Run-backenhet
  app.use(cors());
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

  // Rate-limiting på alle AI-relaterte proxy-ruter (maks 30 forespørsler per minutt per IP)
  app.use(["/api/gemini", "/api/chat", "/api/superveileder"], (req, res, next) => {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp, 30, 60000)) {
      return res.status(429).json({ error: "For mange forespørsler fra denne klienten. Vennligst vent litt (Rate limit beskyttelse)." });
    }
    next();
  });

  // Helse-sjekk
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "BLU-Hjelperen Backend er oppe og kjører!" });
  });

  // Dedicated Chat Endpoint for BLU-hjelperen (/api/chat/message)
  app.post("/api/chat/message", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(500).json({ error: "Mangler GEMINI_API_KEY på serveren." });
      }

      const { history = [], newMessage, fileContext = '', fileName = '' } = req.body;
      if (!newMessage || typeof newMessage !== 'string') {
        return res.status(400).json({ error: "Mangler 'newMessage' i forespørselen." });
      }

      if (newMessage.length > 50000 || (typeof fileContext === 'string' && fileContext.length > 100000)) {
        return res.status(400).json({ error: "Forespørselen overstiger maksimal tillatt datastørrelse." });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

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

      const response = await callGenAIWithFallback(ai, "gemini-3.8-flash", contents, {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 4096,
      });

      res.json({ text: response.text || "" });
    } catch (error: any) {
      console.error("Serverfeil ved kontakt med Gemini for /api/chat/message:", error);
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
      const isInvalidKey = errMsg.includes("API_KEY_INVALID") || errMsg.includes("API key not valid");

      if (isInvalidKey) {
        return res.status(401).json({
          error: "Ugyldig Gemini API-nøkkel. Vennligst sjekk at nøkkelen er lagt inn under Settings -> Secrets som GEMINI_API_KEY."
        });
      }
      if (isDepleted) {
        return res.status(429).json({
          error: "API-nøkkelen er tom for forhåndsbetalt saldo (Prepayment credits depleted). Gå til https://ai.studio/projects for å fylle på kreditt, eller oppdater nøkkelen i Settings -> Secrets."
        });
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
      res.status(error?.status || 500).json({ error: errMsg || "Klarte ikke å hente svar fra KI-modellen." });
    }
  });

  // Gemini Proxy Endpoint
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      
      // Validering i tilfelle MY_GEMINI_API_KEY ligger igjen som default verdi
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
         return res.status(500).json({ error: "Mangler GEMINI_API_KEY på serveren. Vennligst legg inn GEMINI_API_KEY under Settings -> Secrets." });
      }

      const { model, contents, config, prompt } = req.body;
      const actualContents = contents || prompt;

      // Beskyttelse mot gigantiske payloads
      const payloadStr = typeof actualContents === 'string' ? actualContents : JSON.stringify(actualContents || '');
      if (payloadStr.length > 150000) {
        return res.status(400).json({ error: "Payload for stor (maks 150 000 tegn)." });
      }
      
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await callGenAIWithFallback(ai, model, actualContents, config);

      res.json({ text: response.text || "" });
    } catch (error: any) {
      console.error("Gemini API error:", error);
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
      const isInvalidKey = errMsg.includes("API_KEY_INVALID") || errMsg.includes("API key not valid");

      if (isInvalidKey) {
        return res.status(401).json({
          error: "Ugyldig Gemini API-nøkkel. Vennligst sjekk at nøkkelen er lagt inn under Settings -> Secrets som GEMINI_API_KEY."
        });
      }
      if (isDepleted) {
        return res.status(429).json({
          error: "API-nøkkelen er tom for forhåndsbetalt saldo (Prepayment credits depleted). Gå til https://ai.studio/projects for å administrere prosjekt og fakturering, eller oppdater nøkkelen i Settings -> Secrets."
        });
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

      res.status(error?.status || 500).json({ error: errMsg || "Klarte ikke å generere innhold." });
    }
  });

  // Gemini Image Generation Proxy Endpoint
  app.post("/api/gemini/generate-image", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(500).json({ error: "Mangler GEMINI_API_KEY på serveren." });
      }

      const { prompt, aspectRatio = "16:9" } = req.body;
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
      const targetAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : "16:9";

      let imageUrl = "";

      // 1. Forsøk primær bildemodell: gemini-3.1-flash-image
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: {
            parts: [{ text: prompt }]
          },
          config: {
            imageConfig: {
              aspectRatio: targetAspectRatio as any,
              imageSize: "1K"
            }
          }
        });

        const candidates = response.candidates || [];
        for (const cand of candidates) {
          for (const part of cand.content?.parts || []) {
            if (part.inlineData?.data) {
              imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              break;
            }
          }
          if (imageUrl) break;
        }
      } catch (err1) {
        // Forsøk neste modell
      }

      // 2. Forsøk sekundær bildemodell: gemini-3.1-flash-lite-image
      if (!imageUrl) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-image',
            contents: {
              parts: [{ text: prompt }]
            },
            config: {
              imageConfig: {
                aspectRatio: targetAspectRatio as any,
              }
            }
          });

          const candidates = response.candidates || [];
          for (const cand of candidates) {
            for (const part of cand.content?.parts || []) {
              if (part.inlineData?.data) {
                imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                break;
              }
            }
            if (imageUrl) break;
          }
        } catch (err2) {
          // Fallback til ekstern bildegenerator
        }
      }

      // 3. Robust fallback hvis modellkvote er oppbrukt
      if (!imageUrl) {
        const safePrompt = encodeURIComponent(prompt.trim() + ", kindergarten, norwegian barnehage, happy children, cozy atmosphere, realistic photography");
        imageUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=1200&height=800&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
      }

      res.json({ imageUrl });
    } catch (error: any) {
      console.error("Gemini Image generation error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Superveilederen Chat Endpoint med dynamisk system-prompt
  app.post(["/api/superveilederen", "/api/superveilederenChat"], async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

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

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

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

      const response = await callGenAIWithFallback(
        ai,
        "gemini-3.8-flash",
        contents,
        {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          maxOutputTokens: 4096,
        }
      );

      res.json({
        text: response.text || "",
        mode: documentContext ? "documentAnalysis" : "socratic",
        aiMessages
      });
    } catch (error: any) {
      console.error("Superveilederen endpoint error:", error);
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
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
