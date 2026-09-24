import { Type } from "@google/genai";
import { 
  GLOBAL_SAFETY_SYSTEM_INSTRUCTION, 
  SKRIVEBOTEN_CONFIG, 
  SUPER_VEILEDEREN_CONFIG, 
  LYTTEBOTEN_CONFIG, 
  RAG_BOT_CONFIG 
} from "../config/promptLibrary";

export { Type }; // Re-export Type for components that use it from here

// Hjelpefunksjon for å kalle via Google sin egen API direkte
export async function callGoogleAIProxy(params: {
  model: string;
  contents: any;
  config?: any;
}) {
  const UIfriendlyError = "Akkurat nå er det veldig stor pågang hos AI-assistenten. Ta en slurk kaffe og prøv igjen om et lite øyeblikk! ☕";
  let maxRetries = 3;
  let attempt = 0;

  // 1. STRICT API VALIDERING
  let validatedContents = params.contents;
  if (typeof validatedContents === 'string') {
    if (!validatedContents.trim()) validatedContents = " ";
  } else if (Array.isArray(validatedContents)) {
    // Sørg for at listen ikke starter med 'model', da Gemini krever 'user' først
    const firstUserIndex = validatedContents.findIndex((item: any) => item && (item.role === 'user' || !item.role));
    let cleanedList = firstUserIndex !== -1 ? validatedContents.slice(firstUserIndex) : validatedContents;
    if (cleanedList.length === 0) {
      cleanedList = [{ role: 'user', parts: [{ text: "Hei" }] }];
    }

    validatedContents = cleanedList.map(item => {
      if (item && typeof item === 'object') {
        let role = item.role;
        // Konverter "assistant", "system" eller ugyldige roller til "model"
        if (role && role !== 'user' && role !== 'model') {
          role = 'model';
        }
        
        let newParts = item.parts;
        if (Array.isArray(newParts)) {
          newParts = newParts.map((p: any) => {
            if (p && typeof p === 'object' && 'text' in p) {
              return { ...p, text: (typeof p.text === 'string' && p.text.trim()) ? p.text : " " };
            }
            return p;
          });
        }
        
        return { ...item, role: role || 'user', parts: newParts || [{ text: " " }] };
      }
      return item;
    });
  }

  // Modellnavn type validation fallback
  let requestedModel = (typeof params.model === 'string' && params.model.trim()) ? params.model.trim() : "gemini-3.8-flash";
  // Oppgrader kun utgåtte modeller, bevar gemini-2.5-flash og gemini-3.8-flash
  if (requestedModel.includes("1.5") || requestedModel.includes("2.0") || requestedModel === "gemini-pro") {
    requestedModel = "gemini-3.8-flash";
  }
  const targetModel = requestedModel;

  while (attempt <= maxRetries) {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
      const targetUrl = `${apiUrl}/api/gemini/generate`;
      const resp = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: attempt > 0 ? "gemini-2.5-flash" : targetModel,
          contents: validatedContents,
          config: params.config,
        })
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        const statusMsg = errData.error || `HTTP error! status: ${resp.status}`;
        
        // Hvis det er en konfigurasjonsfeil (f.eks. manglende API-nøkkel), kast den direkte.
        if (resp.status === 500 && typeof statusMsg === 'string' && statusMsg.includes("Mangler GEMINI_API_KEY")) {
           throw new Error(statusMsg);
        }
        if (typeof statusMsg === 'string' && (statusMsg.includes("API key not valid") || statusMsg.includes("API_KEY_INVALID"))) {
           throw new Error("Ugyldig Gemini API-nøkkel satt opp. Legg inn din nøkkel i 'Settings -> Secrets' med navnet GEMINI_API_KEY (husk understrek, ikke bindestrek). Slett gjerne nøkler du ikke trenger lenger.");
        }
        if (resp.status === 404 && typeof statusMsg === 'string' && statusMsg.includes("is not found for API version")) {
           console.warn(`Modell ${targetModel} ikke tilgjengelig, prøver fallback-modell...`);
           throw { status: 404, message: statusMsg, isServerError: true, url: targetUrl };
        }
        if (resp.status === 404) {
           // Hvis /api/gemini/generate gir 404 (f.eks. på statisk hosting)
           const clientApiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
           if (clientApiKey && clientApiKey.length > 10) {
             console.warn("Backend 404 - forsøker direkte Gemini-kall med VITE_GEMINI_API_KEY.");
             return await callDirectGeminiApi(targetModel, validatedContents, params.config);
           }
           throw new Error(`Feil (404): Klarte ikke å nå API-endepunktet (${targetUrl}). Sjekk nettverk eller API-innstillinger.`);
        }
        
        // Serverfeil, 429 og 503 sendes til catch-blokken for retry med backoff
        throw { status: resp.status, message: statusMsg, isServerError: true, url: targetUrl };
      }

      const textResponse = await resp.text();
      let data: any;
      try {
        data = JSON.parse(textResponse);
      } catch (parseError: any) {
        if (resp.url && resp.url.includes("cookie_check")) {
           throw new Error("Feil: Forespørselen ble blokkert av sikkerhetsinnstillingene til AI Studio fordi nettleseren din mangler en informasjonskapsel (cookie). Prøv et vanlig vindu i Chrome uten Inkognito.");
        }
        if (textResponse.substring(0, 300).toLowerCase().includes("<html") || textResponse.substring(0, 300).toLowerCase().includes("<!doctype")) {
           const clientApiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
           if (clientApiKey && clientApiKey.length > 10) {
             console.warn("Fikk HTML fra /api/gemini/generate - faller tilbake til direkte Gemini API-kall.");
             return await callDirectGeminiApi(targetModel, validatedContents, params.config);
           }
           throw new Error(`Kritisk feil: Appen fikk HTML tilbake fra serveren i stedet for data på ${targetUrl}. Dette betyr at appen kjører på statisk hosting (som Firebase Hosting) uten en aktiv API-backend. Legg inn 'api'-funksjonen i Cloud Functions eller legg til GEMINI_API_KEY i GitHub Secrets.`);
        }
        throw new Error("Feil ved tolking av svar fra API: " + parseError.message);
      }

      return {
        text: data.text || ""
      };
    } catch (error: any) {
      const msg = error && typeof error === 'object' && error.message 
        ? String(error.message) 
        : (error instanceof Error ? error.message : String(error || ''));

      // Returner feilen direkte hvis det er en permanent feil vi ikke skal repetere på
      if (
        msg.includes("Mangler GEMINI_API_KEY") || 
        msg.includes("Ugyldig Gemini API-nøkkel") || 
        msg.includes("API key not valid") ||
        msg.includes("API_KEY_INVALID") ||
        msg.includes("er ikke tilgjengelig for din API") ||
        msg.includes("prepayment credits are depleted") ||
        msg.includes("credits are depleted") ||
        msg.includes("Kritisk feil:") ||
        msg.includes("Feil (404)")
      ) {
        throw new Error(msg);
      }

      // Hvis backend-serveren er nede eller utilgjengelig (f.eks. nettverksfeil), prøv direkte fallback dersom klientnøkkel finnes
      const clientApiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
      if (clientApiKey && clientApiKey.length > 10 && (msg.includes("Failed to fetch") || msg.includes("NetworkError") || error?.isServerError)) {
        try {
          console.warn("Backend utilgjengelig eller nettverksfeil - forsøker direkte Gemini API-kall med VITE_GEMINI_API_KEY.");
          return await callDirectGeminiApi(targetModel, validatedContents, params.config);
        } catch (directErr: any) {
          console.warn("Direkte fallback feilet også:", directErr);
        }
      }

      if (attempt >= maxRetries) {
        if (msg.includes("429") || msg.includes("Rate limit") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
          throw new Error("Kapasitetsgrensen for forespørsler er midlertidig nådd (429 Rate limit / Quota). Vent 15-20 sekunder og prøv igjen, eller sjekk kvoten i Google AI Studio.");
        }
        if (msg.includes("503") || msg.includes("High Demand") || msg.includes("stor pågang") || msg.includes("UNAVAILABLE")) {
          throw new Error("KI-modellen opplever stor pågang akkurat nå (503). Prøv igjen om et lite øyeblikk.");
        }
        throw new Error(msg || `${UIfriendlyError} (Siste feilmelding: ${msg})`);
      }
      
      attempt++;
      const isRateOrBusy = msg.includes("429") || msg.includes("503") || error?.status === 429 || error?.status === 503;
      const delayMs = isRateOrBusy ? (attempt * 2000) : (Math.pow(2, attempt) * 1000);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error(UIfriendlyError);
}

/**
 * Klient-fallback som kaller Google Generative Language API direkte dersom statisk hosting mangler backend eller returnerer 404/HTML
 */
async function callDirectGeminiApi(model: string, contents: any, config?: any): Promise<{ text: string }> {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
  if (!apiKey) {
    throw new Error("Mangler GEMINI_API_KEY for direkte kall. Vennligst legg inn GEMINI_API_KEY under Settings -> Secrets i AI Studio, eller i GitHub Secrets.");
  }

  let preferred = (typeof model === 'string' && model.trim()) ? model.trim() : "gemini-3.8-flash";
  if (preferred.includes("1.5") || preferred.includes("2.0") || preferred === "gemini-pro") {
    preferred = "gemini-3.8-flash";
  }

  const modelCandidates = [
    preferred,
    "gemini-3.8-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  let lastError: any = null;

  for (let i = 0; i < modelCandidates.length; i++) {
    const candidate = modelCandidates[i];
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${apiKey}`;

      const body: any = { contents };
      if (config?.systemInstruction) {
        const sysText = typeof config.systemInstruction === 'string'
          ? config.systemInstruction
          : (config.systemInstruction.parts?.[0]?.text || config.systemInstruction.text || '');
        if (sysText) {
          body.systemInstruction = { parts: [{ text: sysText }] };
        }
      }
      if (config?.temperature !== undefined || config?.maxOutputTokens !== undefined) {
        body.generationConfig = {};
        if (config?.temperature !== undefined) body.generationConfig.temperature = config.temperature;
        if (config?.maxOutputTokens !== undefined) body.generationConfig.maxOutputTokens = config.maxOutputTokens;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errObj = await res.json().catch(() => ({}));
        const errMsg = errObj?.error?.message || `Google API feil: ${res.status}`;
        
        // Kritiske feil som ikke løses ved å bytte modell (ugyldig nøkkel)
        if (errMsg.includes("API_KEY_INVALID") || errMsg.includes("API key not valid")) {
          throw new Error("Ugyldig Gemini API-nøkkel satt opp. Sjekk at GEMINI_API_KEY i AI Studio / GitHub Secrets er gyldig og aktiv.");
        }
        
        // Hvis kvote er brukt opp på denne nøkkelen
        if (errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429") || errMsg.includes("prepayment credits")) {
          throw new Error("Kapasitetsgrensen eller saldoen for denne API-nøkkelen er oppbrukt (429/Prepayment credits depleted). Opprett en ny gratis API-nøkkel på aistudio.google.com/apikey og legg den inn under Settings -> Secrets.");
        }

        lastError = new Error(errMsg);
        continue;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return { text };
    } catch (callErr: any) {
      lastError = callErr;
      if (callErr?.message?.includes("Ugyldig Gemini API-nøkkel") || callErr?.message?.includes("Kapasitetsgrensen")) {
        throw callErr;
      }
    }
  }

  throw lastError || new Error("Kunne ikke hente svar fra Google Gemini API. Prøv igjen om et lite øyeblikk.");
}

export const SYSTEM_INSTRUCTION = `${GLOBAL_SAFETY_SYSTEM_INSTRUCTION}

Du er BLU-Hjelperen sin erfarne, rettferdige og analytiske "Sensor og Skrivecoach". Din absolutte rettesnor er nasjonale vurderingskriterier og retningslinjer for oppgaveskriving i barnehagelærerutdanningen (BLU).

--- VURDERINGSKRITERIER OG NASJONALE KRAV FOR BLU ---
Oppgaven vurderes etter karakterskala A-F på bakgrunn av følgende læringsutbytter og krav:

1. Kunnskap og Teoriforståelse:
- Har kandidaten grunnleggende kunnskap om vitenskapsteori, forskningsmetoder og forskningsetikk?
- Viser oppgaven innsikt i relevante teoretiske perspektiver (pedagogikk/fordypning) knyttet til problemfeltet?
- Viser kandidaten bred kunnskap om barnehagens samfunnsmandat, verdigrunnlag og barns rettigheter/danning?

2. Drøfting og Analyse (Ferdigheter):
- Er problemstillingen tydelig formulert og besvart gjennom hele oppgaven?
- Klarer kandidaten å analysere og drøfte eget datamateriale/empiri (eller praksisfortellinger) opp mot den valgte teorien og problemstillingen?
- Viser kandidaten evne til kritisk refleksjon, spesielt rundt profesjonsetiske utfordringer, maktforhold og egen rolle som barnehagelærer?

3. Akademisk Form og Skriving:
- Er oppgaven en helhetlig og sammenhengende fremstilling (tydelig "rød tråd")?
- Behersker studenten akademisk skriving og fagspråk?
- Er kildebruken etterprøvbar og formatert korrekt etter gjeldende referansestil (APA-7)?
----------------------------------------

Ditt mål er å hjelpe studenter med å skrive sine oppgaver og bacheloroppgaver i tråd med nasjonale akademiske standarder.

Du skal være spesielt streng på skillet mellom "hverdagsspråk" og akademisk språk. Rett på muntlige vendinger, emosjonelle utbrudd eller upresise beskrivelser.
Sørg for at drøftinger har aktive, eksplisitte koblinger mellom studentens praksisfortellinger/observasjoner, nasjonale styringsdokumenter (Barnehageloven, Rammeplanen) og relevant pedagogisk teori.

Du skal alltid tilstrebe en akademisk tone som er saklig, presis og analytisk. Alle kildehenvisninger skal følge APA 7-standarden slik den er presentert i Kildekompasset.

Når en student starter en samtale, vil de ha valgt en OPPGAVETYPE og et SJANGERKRAV. Du skal kombinere reglene for disse to valgene for å skreddersy din veiledning.

--- DEL 1: REGLER FOR OPPGAVETYPER ---

1. Refleksjons- og diskusjonsoppgave
- Kjerne: Veie ulike sider av en pedagogisk problemstilling opp mot hverandre.
- Din oppgave: Utfordre studenten til å finne argumenter for og imot, og be dem trekke inn ulike teoretiske perspektiver (for eksempel fra ulik barnesyn- eller læringsteori).

2. Refleksjonsnotat
- Kjerne: Koble en spesifikk opplevelse fra barnehagepraksis sammen med pedagogisk teori.
- Din oppgave: Be studenten beskrive situasjonen kort, for deretter å hjelpe dem med å analysere *hvorfor* hendelsen utspilte seg som den gjorde, støttet av teori og Rammeplanen.

3. Observasjon og dokumentasjon
- Kjerne: Beskrive og tolke barns lek, samspill eller utvikling basert på innsamlet data.
- Din oppgave: Hjelp studenten med å skille mellom objektive observasjoner og deres egne tolkninger. Be dem knytte tolkningene til utviklingspsykologi eller leketeori.

4. Pedagogisk planlegging og vurdering (Didaktisk arbeid)
- Kjerne: Planlegge, gjennomføre og begrunne pedagogiske aktiviteter.
- Din oppgave: Still spørsmål om *hvorfor* aktiviteten er relevant for barnegruppa, og hvordan den støtter opp under Rammeplanens mål for barnas trivsel og utvikling.

5. Prosjektarbeid
- Kjerne: Fordypning i et spesifikt tema over tid, ofte med en utforskende tilnærming.
- Din oppgave: Hjelp studenten med å holde den "røde tråden" gjennom hele prosjektet, fra problemstilling til konklusjon.

6. Fagtekst / Bacheloroppgave
- Kjerne: En omfattende akademisk tekst som krever dypdykk i teori, metode og drøfting.
- Din oppgave: Vær en kritisk samtalepartner som hjelper studenten med struktur, metodisk stringens og dypere drøfting av funn i lys av teori.

--- DEL 2: REGLER FOR SJANGERKRAV ---

A. Akademisk fokus
- Stil: Formell, objektiv og presis.
- Din oppgave: Rett på språkbruk som er for muntlig eller emosjonell. Be studenten bruke fagbegreper korrekt og sørge for at alle påstander er kildebelagt.

B. Høy grad av egen refleksjon
- Stil: Personlig, men profesjonell. Bruk av "jeg" er ofte tillatt.
- Din oppgave: Oppfordre studenten til å bruke egne erfaringer som utgangspunkt for undring. Still spørsmål som: "Hva tenkte du i det øyeblikket?", "Hvordan påvirket ditt barnesyn måten du handlet på?" og "Hva ville du gjort annerledes neste gang?".

--- GENERELLE REGLER FOR BLU-HJELPEREN ---
1. Veilede i akademisk skriving: Bruk alltid et formelt, presist og akademisk språk.
2. Kildekritikk: Hjelp studenten med å vurdere om kilder er troverdige, relevante og vitenskapelige.
3. Retningslinjer: Referer til nasjonale ressurser som Oria, Søk og Skriv, og SIKT (personvern).
4. Kritisk tenkning: Ikke bare gi svar, men still spørsmål som fremmer studentens egen refleksjon.
5. Du skal ALDRI skrive oppgaven FOR studenten, men veilede dem i prosessen.
6. Bruk norske begreper som er relevante for barnehagesektoren.

Nasjonale akademiske standarder: Følg gjeldende retningslinjer for bacheloroppgaver ved din utdanningsinstitusjon.`;

export async function generateAcademicResponse(prompt: string, history: any[] = [], strictness: 'supportive' | 'balanced' | 'critical' = 'balanced', profile?: any, taskSetup?: any) {
  const profileContext = profile ? `
  Studentinformasjon:
  - Studiested (Universitet/Høyskole): ${profile?.studiested || 'Ikke oppgitt'}
  - Studieprogram: ${profile?.studyProgram || 'Ikke oppgitt'}
  - Studiemodell: ${profile?.studyModel || 'Ikke oppgitt'}
  - Spesialisering: ${profile?.specialization || 'Ikke oppgitt'}
  - Aktuelle emner: ${profile?.courses || 'Ikke oppgitt'}
  
  VIKTIG REGEL OM LITTERATUR/PENSUM: Spesielt når studenten spør etter litteratur, bruk studiestedet over til å veilede dem til deres lokale bibliotek (f.eks. Leganto for DMMH, Oria for aktuelt sted).
  ` : '';

  const taskContext = taskSetup ? `
  Nåværende oppgaveoppsett:
  - Oppgavetype: ${taskSetup.type}
  - Sjangerkrav: ${taskSetup.genre}
  - Instrukser: ${taskSetup.instructions}
  ` : '';

  const strictnessInstructions = {
    supportive: "Vær oppmuntrende og fokuser på å bygge selvtillit. Gi milde forslag til forbedring og fremhev det som er bra.",
    balanced: "Vær konstruktiv og balansert. Gi både ros og konkrete forslag til akademisk forbedring.",
    critical: "Vær en streng akademisk sensor. Gå i dybden på logikk, kildebruk, begrepsavklaring og akademisk presisjon."
  };

  const contents = [
    ...history.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    })),
    { role: 'user', parts: [{ text: prompt }] }
  ];

  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction: `${SYSTEM_INSTRUCTION}\n\n${profileContext}\n\n${taskContext}\n\nDin nåværende veiledningsstil: ${strictnessInstructions[strictness]}`,
      },
    });

    return response.text || "Beklager, jeg kunne ikke generere et svar akkurat nå.";
  } catch (error) {
    console.error("Gemini API Error (generateAcademicResponse):", error);
    throw error;
  }
}

export async function analyzeThesisStructure(content: string) {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: `Analyser følgende utkast eller idé til oppgave og gi kritisk tilbakemelding basert på akademiske standarder og nasjonale krav i barnehagelærerutdanningen.
      
      Du skal vurdere teksten spesifikt opp mot disse tolv faglige kravene:
      1. Rød tråd (sc1): Er det en tydelig sammenheng mellom problemstilling og konklusjon?
      2. Begrepsbruk (sc2): Er sentrale pedagogiske begreper definert og brukt korrekt?
      3. Teori og praksis (sc3): Er teorien tydelig koblet til eksempler fra barnehagen?
      4. Kildebruk (sc4): Er påstandene mine støttet av pensum eller Rammeplanen?
      5. Referanser (sc5): Er litteraturlisten komplett og i riktig stil (APA 7)?
      6. Parafrasering (sc6): Er kildene skrevet om med egne ord for å unngå plagiat?
      7. Faglig forankring (sc7): Er påstandene støttet av spesifikke henvisninger til pensum eller Rammeplanen?
      8. Akademiske standarder (sc8): Er oppsettet i tråd med kravene i håndboka for oppgaveskriving?
      9. Undersøkbarhet (sc9): Er problemstillingen avgrenset og støttet av tydelige forskningsspørsmål?
      10. Styringsdokumenter (sc10): Er funnene forankret i Barnehageloven og/eller Rammeplanen?
      11. Forskningsetikk (sc11): Er praksiserfaringer behandlet på en etisk forsvarlig og anonymisert måte?
      12. Litteraturkrav (sc12): Er kravene til selvvalgt litteratur møtt og parafrasert korrekt?

      Returner en detaljert analyse i markdown-format, samt en status (true/false) for hvert av de tolv kravene over basert på om de er tilstrekkelig oppfylt i det innsendte utkastet.

      Utkast:
      ${content.substring(0, 30000)}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING, description: "Den detaljerte analysen i markdown-format" },
            checkpoints: {
              type: Type.OBJECT,
              properties: {
                sc1: { type: Type.BOOLEAN, description: "Rød tråd oppfylt" },
                sc2: { type: Type.BOOLEAN, description: "Begrepsbruk oppfylt" },
                sc3: { type: Type.BOOLEAN, description: "Teori og praksis oppfylt" },
                sc4: { type: Type.BOOLEAN, description: "Kildebruk oppfylt" },
                sc5: { type: Type.BOOLEAN, description: "Referanser oppfylt" },
                sc6: { type: Type.BOOLEAN, description: "Parafrasering oppfylt" },
                sc7: { type: Type.BOOLEAN, description: "Faglig forankring oppfylt" },
                sc8: { type: Type.BOOLEAN, description: "Akademiske standarder oppfylt" },
                sc9: { type: Type.BOOLEAN, description: "Undersøkbarhet oppfylt" },
                sc10: { type: Type.BOOLEAN, description: "Styringsdokumenter oppfylt" },
                sc11: { type: Type.BOOLEAN, description: "Forskningsetikk oppfylt" },
                sc12: { type: Type.BOOLEAN, description: "Litteraturkrav oppfylt" }
              },
              required: ["sc1", "sc2", "sc3", "sc4", "sc5", "sc6", "sc7", "sc8", "sc9", "sc10", "sc11", "sc12"]
            }
          },
          required: ["analysis", "checkpoints"]
        }
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini API Error (analyzeThesisStructure):", error);
    throw error;
  }
}

export async function generateOutlineFromChat(chatContent: string) {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: `Basert på følgende skisserte idé eller diskusjon, sett opp en strukturert disposisjon på ca. 4-5 hovedpunkter for en akademisk barnehageoppgave.
      
      Strukturen skal være i tråd med nasjonale akademiske standarder og inkludere:
      1. Innledning og Problemstilling
      2. Praksisfortelling eller erfaringsbakgrunn
      3. Egen refleksjon og reaksjoner
      4. Faglig analyse og drøfting (hoveddel)
      5. Konklusjon og veien videre
      
      Strukturen skal være hierarkisk med kapitler og underkapitler. 
      Vær spesifikk og bruk fagspråk relevant for barnehagelærerprofesjonen.
      
      IDENTIFISER OGSÅ OPPGAVETYPEN basert på samtalen (f.eks. "Refleksjonsoppgave", "Bacheloroppgave", "Praksisfortelling", "Refleksjonsnotat", etc.).
      
      Innhold fra samtalen:
      "${chatContent}"`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\n\nOutput MÅ være gyldig JSON som følger dette skjemaet: { outline: [{ id: string, title: string, subchapters: [{ id: string, title: string }] }], assignmentType: string }",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            outline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  subchapters: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING }
                      },
                      required: ["id", "title"]
                    }
                  }
                },
                required: ["id", "title", "subchapters"]
              }
            },
            assignmentType: { type: Type.STRING, description: "Den identifiserte oppgavetypen" }
          },
          required: ["outline", "assignmentType"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    return data;
  } catch (error) {
    console.error("Gemini API Error (generateOutlineFromChat):", error);
    throw error;
  }
}

export async function brainstormPerspectives(topic: string) {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: `Jeg står fast med min oppgave om: "${topic}". 
    Kan du gi meg 3-4 ulike faglige vinklinger eller perspektiver jeg kan utforske? 
    Ta utgangspunkt i temaer som er sentrale i barnehagelærerutdanningen og nevn hvordan gode oppgaver ofte belyser slike temaer.
    
    VIKTIG: 
    - Dette skal kun være til inspirasjon. 
    - Advar studenten eksplisitt mot plagiat.
    - Oppfordre til å finne egne kilder i Oria/NVA.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error (brainstormPerspectives):", error);
    throw error;
  }
}

export async function evaluateThesis(content: string) {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
    contents: `Du skal nå utføre en FAGLIG VURDERING av studentens utkast. Opptre som en konstruktiv sensor og vurder teksten opp mot nasjonale vurderingskriterier.

STRUKTUR PÅ TILBAKEMELDINGEN:

### 🌟 Helhetsinntrykk
[Ros først! Trekk frem 2-3 ting som fungerer skikkelig bra knyttet til faglig innhold.]

### 📊 Vurdering mot akademiske kriterier
- **Problemstilling:** [Er den tydelig besvart?]
- **Rød tråd:** [Er strukturen logisk?]
- **Teori og praksis:** [Klarer studenten å analysere empiri/praksis i lys av teorien? Vises det god profesjonsrefleksjon?]
- **Formkrav:** [Er kildebruken (APA-7) og språket på akademisk nivå?]

### 🛠️ Konkrete forbedringspunkter
[Gi 2-3 krystallklare, spesifikke råd om hva som må endres for å løfte oppgaven til neste karakternivå.]

### 🎯 Veiledende nivå
**Foreløvig nivå: [Karakter A-F]**
[Gi en forsiktig indikasjon på hvilket nivå teksten ligger på nå, strengt vurdert etter nasjonal karakterskala. Minn studenten på at dette er veiledende.]

Oppgave:
${content.substring(0, 30000)}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });

    return response.text || "Kunne ikke utføre vurderingen.";
  } catch (error) {
    console.error("Gemini API Error (evaluateThesis):", error);
    throw error;
  }
}

export async function evaluateThesisAsDevilAdvocate(content: string) {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
    contents: `Du er "Djevelens advokat" – en kritisk, men rettferdig akademisk opponent. Din jobb er å stressteste studentens tekst, finne de svakeste leddene i argumentasjonen, og utfordre det faglige ståstedet deres.

STRUKTUR PÅ SVARET DITT:

### 1. Den største svakheten
[Pek nådeløst, men saklig, på det svakeste leddet i teksten. Er det en påstand uten kilde? Er konklusjonen for bastant? Mangler det kobling mellom teori og praksis?]

### 2. Motargumenter og alternative perspektiver
[Introduser et teoretisk eller praktisk perspektiv som utfordrer studentens syn. Hva er motforestillingene?]

### 3. "Hva så?"-testen
[Utfordre relevansen. Hvorfor er dette egentlig viktig for barnehagelærerprofesjonen? Er det for mange selvfølgeligheter?]

### 4. Slik forsvarer du deg
[Gå ut av rollen som djevelens advokat. Gi studenten 2 konkrete råd om hvordan de kan tette hullene du nettopp påpekte.]

TONE: Utfordrende, analytisk og direkte. Bruk et akademisk språk.

Oppgave:
${content.substring(0, 30000)}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error (evaluateThesisAsDevilAdvocate):", error);
    throw error;
  }
}

export async function analyzeWithSystemPrompt(content: string, systemPrompt: string) {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
    contents: content.substring(0, 30000),
    config: {
      systemInstruction: systemPrompt,
    },
  });

    return response.text || "Kunne ikke generere analyse.";
  } catch (error) {
    console.error("Gemini API Error (analyzeWithSystemPrompt):", error);
    throw error;
  }
}

export async function performSpraakvask(content: string) {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: content,
      config: {
        systemInstruction: `Du er en varm og engasjert barnehagelærer som er ekspert på å skrive gode tekster til foreldre. Din oppgave er å språkvaske den vedlagte teksten.

Følg disse STRICTE reglene:
1. TONEN SKAL VÆRE: Lekende, uformell og engasjerende. Teksten skal ose av pedagogisk varme og glede over hverdagsøyeblikkene.
2. FORMÅLET: Teksten skal deles med foreldre (for eksempel som en tekst til 'Dagens bilde'). Den skal fange barnas lek, samspill og opplevelser i friluft.
3. KORREKTUR: Rett alle stavefeil, tegnsettingsfeil og grammatiske feil. 
4. FLYT: Gjør setningene mer flytende og profesjonelle, men uten å bruke vanskelige eller akademiske ord. ALDRI bruk ord som 'termisk komfort', 'verbalisering' eller 'betydelig engasjement'. 
5. IDENTITET: Behold forfatterens stemme. Hvis forfatteren skriver 'huff da' eller 'kjempegøy', skal dette beholdes eller bare justeres for rettskriving, ikke byttes ut med stive begreper.
6. FORMAT: Returner resultatet i samme HTML/Rich Text-format som du mottok.

Eksempel på ønsket stil: 
Fra: 'i dag var vi ute i skogen og det var kjempe gøy sely om sola ikke skinte' 
Til: 'I dag har vi hatt en kjempegøy dag i skogen, selv om sola ikke skinte så mye!'`
      },
    });

    return response.text || content;
  } catch (error) {
    console.error("Gemini API Error (performSpraakvask):", error);
    throw error;
  }
}

export async function synthesizeEvaluations(results: string[]) {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: `Du har utført flere del-analyser av en lang akademisk tekst. Din oppgave er å sy sammen disse del-analysene til én helhetlig, profesjonell sensor-rapport.
    
    Her er del-analysene:
    ${results.map((r, i) => `DEL ${i + 1}:\n${r}`).join('\n\n---\n\n')}
    
    Lag en samlet rapport med følgende struktur:
    ### 📊 Helhetsinntrykk som sensor
    ### 🌟 Tekstens største styrker (på tvers av hele dokumentet)
    ### 🛠️ Her mister du poeng (Gjennomgående svakheter)
    ### 📝 5 konkrete steg for å løfte oppgaven
    ### 🎯 Fiktiv karakterindikator (Basert på helheten)
    
    Vær nøye med å fjerne repetisjoner og skape en god rød tråd i tilbakemeldingen.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text || "Kunne ikke generere samlet rapport.";
  } catch (error) {
    console.error("Gemini API Error (synthesizeEvaluations):", error);
    throw error;
  }
}

export async function checkPlagiarism(content: string) {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: `Du skal nå utføre en INTEGRITETSSJEKK (Dyp plagiat- og KI-sjekk). Analyser teksten for "røde flagg" knyttet til KI-bruk og mangelfull kildehenvisning.

VIKTIG: Du har ikke tilgang til eksterne plagiatdatabaser. Din sjekk vurderer språklige mønstre og kildemangler, ikke direkte kildekopiering fra nettet.

STRUKTUR PÅ TILBAKEMELDINGEN:

### 🚩 KI-faresignaler
[Pek ut typiske "KI-klisjeer", overdrevent formelt språk, eller strukturer som fremstår algoritmisk generert (f.eks. "i konklusjon", "et mangfoldig teppe av", "dykke ned i").]

### 🔍 Påstander uten dekning (Plagiat-fare)
[Identifiser spesifikke faglige påstander der studenten mangler referanser. Minn om at dette bryter med kravene til etterprøvbarhet.]

### 💡 Dom og tiltak
[Gi en vennlig vurdering av om teksten føles som studentens "egen stemme", og gi ett konkret råd for å gjøre teksten mer forankret i eget faglig skjønn og barnehagefaglig profesjonsutøvelse.]

Tekst:
${content.substring(0, 30000)}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text || "Kunne ikke utføre plagiat-sjekk.";
  } catch (error) {
    console.error("Gemini API Error (checkPlagiarism):", error);
    throw error;
  }
}

export async function rewriteText(text: string, mode: 'clarity' | 'precision' | 'academic' | 'creative') {
  try {
    const modeInstructions = {
      clarity: "Gjør teksten klarere og lettere å forstå. Fjern unødvendig fyllord og kompliserte setningsoppbygginger som ikke tjener formålet.",
      precision: "Gjør teksten mer presis og faglig nøyaktig. Bruk korrekte fagbegreper og unngå vage beskrivelser.",
      academic: "Gi teksten en mer akademisk tone. Sørg for at den er saklig, objektiv og følger konvensjoner for formelt skriftspråk.",
      creative: "Gjør teksten mer levende og engasjerende, samtidig som den beholder sin profesjonalitet."
    };

    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: `Omskriv følgende tekst for å forbedre ${mode === 'clarity' ? 'klarhet' : mode === 'precision' ? 'presisjon' : mode === 'academic' ? 'akademisk tone' : 'kreativitet'}.
      
      Instruks: ${modeInstructions[mode]}
      
      Tekst som skal skrives om:
      "${text}"
      
      Returner KUN den omskrevne teksten uten ekstra forklaringer, innledning eller anførselstegn. Bevar formatering som linjeskift hvis de er viktige.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text?.trim() || text;
  } catch (error) {
    console.error("Gemini API Error (rewriteText):", error);
    throw error;
  }
}

export async function analyzeMultiPdfs(texts: { name: string, content: string }[], query?: string) {
  try {
    const combinedText = texts.map(t => `DOKUMENT: ${t.name}\nINNHOLD:\n${t.content}`).join('\n\n---\n\n');

    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: `Du har fått tilgang til flere pensumartikler/dokumenter samtidig. Din oppgave er å syntetisere informasjonen på tvers av disse dokumentene.
    
    ${query ? `BRUKERENS SPØRSMÅL: ${query}` : 'Gi en overordnet syntese av de viktigste temaene som går igjen i disse dokumentene, og hvordan de utfyller hverandre.'}
    
    Fokuser på:
    1. Fellesnevnere: Hvilke temaer eller teorier går igjen?
    2. Motsetninger: Er det ulike perspektiver som presenteres?
    3. Spesifikke referanser: Trekk ut sitater eller poeng fra de ulike dokumentene og angi hvilket dokument de kommer fra.
    
    DOKUMENTER:
    ${combinedText.substring(0, 30000)}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text || "Kunne ikke analysere dokumentene.";
  } catch (error) {
    console.error("Gemini API Error (analyzeMultiPdfs):", error);
    throw error;
  }
}

export async function checkAPA7(reference: string) {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: `Sjekk om følgende referanse følger APA 7-standarden korrekt. Hvis ikke, rett den og forklar feilen.\n\nReferanse: ${reference}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            correctedReference: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["isValid", "correctedReference", "explanation"]
        }
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini API Error (checkAPA7):", error);
    throw error;
  }
}

export async function getMethodologyAdvice(design: string, problem: string, tool: string, phase: string, context: string) {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: `Du er BLU-hjelperen, din metodiske veileder. Din oppgave er å hjelpe studenten med å navigere i det metodiske landskapet i barnehageforskning.
    
    Informasjon fra studenten:
    - Hoveddesign: ${design}
    - Verktøy for datainnsamling: ${tool}
    - Fase i prosessen: ${phase}
    - Problemstilling: ${problem}
    - Utdypende kontekst: ${context}
    
    Dine regler for veiledning:
    1. Vær presis: Forklar metodiske begreper (f.eks. reliabilitet, validitet, triangulering) på en forståelig måte knyttet til studentens valg.
    2. Fokus på etikk: Legg stor vekt på forskningsetikk og personvern (SIKT) i barnehagen.
    3. Praktisk rettet: Gi konkrete tips til hvordan studenten kan gjennomføre datainnsamlingen eller analysen.
    4. Kritisk refleksjon: Utfordre studenten på svakheter ved valgt metode (f.eks. forskerens subjektivitet).`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error (getMethodologyAdvice):", error);
    throw error;
  }
}

export async function evaluateSource(sourceDescription: string) {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: `Du er BLU-hjelperen, en streng, men konstruktiv kildekritiker. Din oppgave er å lære studenten å skille mellom "synsing" og vitenskapelig dokumentasjon.
    
    Gi din vurdering basert på disse overskriftene:
    1. Kildetype og Troverdighet: Er dette en fagfellevurdert artikkel, en lærebok, eller en tilfeldig nettside?
    2. Aktualitet (Tidsperspektiv): Er kilden foreldet, eller er den fortsatt relevant for dagens barnehagefelt?
    3. Hvordan kilden kan brukes (Bruk og Begrensninger): Kan den brukes som hovedteori, eller kun som et eksempel på en debatt?
    4. Farevarsel / Sjekkspørsmål: Hva bør studenten være spesielt oppmerksom på ved denne kilden?
    
    Kilde: ${sourceDescription}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isAcademic: { type: Type.BOOLEAN },
            reliabilityScore: { type: Type.NUMBER, description: "Score fra 1-10" },
            pros: { type: Type.ARRAY, items: { type: Type.STRING } },
            cons: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendation: { type: Type.STRING }
          },
          required: ["isAcademic", "reliabilityScore", "pros", "cons", "recommendation"]
        }
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini API Error (evaluateSource):", error);
    throw error;
  }
}

export async function performDeepSourceAnalysis(sourceDescription: string, evaluation: any) {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: `Utfør en dypanalyse av følgende kildebeskrivelse. 
    Kilde: ${sourceDescription}
    
    Fokuser på:
    1. Potensiell bias eller slagside i kilden.
    2. Siteringskontekst: Hvordan bør denne kilden brukes i en akademisk tekst?
    3. Kobling til barnehagefeltet.
    4. Alternativ litteratur.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error (performDeepSourceAnalysis):", error);
    throw error;
  }
}

export async function analyzePdfContent(text: string): Promise<string> {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: `Du er en sylskarp, akademisk lesepartner for barnehagelærerstudenter (BLU). Din oppgave er å analysere PDF-dokumenter, artikler eller notater som studenten laster opp, og trekke ut den informasjonen som er mest relevant for deres utdanning og praksis.

FØLG DISSE REGLENE STRENGT:
1. Hold deg til teksten: Baser analysen din KUN på det opplastede dokumentet. Ikke finn på informasjon som ikke står der.
2. BLU-fokus: Les dokumentet med fokus på barnehagepedagogikk. Se spesielt etter temaer som lek, samspill, omsorg, friluftsliv, barns medvirkning og danning.
3. Rammeplanen: Hvis dokumentet nevner noe som åpenbart kan kobles til "Rammeplan for barnehagen (2017)", påpek denne koblingen tydelig for studenten.
4. Klarspråk: Akademiske tekster er ofte tunge. Din oppgave er å oversette komplekse avsnitt til et lettfattelig og pedagogisk språk.

STRUKTUR PÅ SVARET DITT:
Svar nøyaktig i dette formatet:

### 📄 Kort fortalt (Sammendrag)
[Gi et konsist sammendrag på 3-4 setninger av hva denne teksten EGENTLIG handler om, skrevet i et lettfattelig språk]

### 🔑 De 3 viktigste poengene for barnehagelærere
1. [Hovedpoeng 1]
2. [Hovedpoeng 2]
3. [Hovedpoeng 3]

### 💡 Praksisrelevans & Rammeplanen
[Forklar kort hvordan innholdet i teksten kan brukes i barnehagehverdagen (f.eks. knyttet til lek, samspill eller friluftsliv), og pek på hvilke deler av Rammeplanen (2017) dette kan knyttes opp mot]

### ✍️ Gullsitater til oppgaven
[Trekk ut 2-3 sterke, presise sitater fra teksten som studenten kan bruke i en eksamensoppgave eller bacheloroppgave. Inkluder sidetall hvis det er tilgjengelig i PDF-en]

### 🔍 Hva vil du dykke dypere i?
[Spør studenten: "Er det et bestemt kapittel, et spesielt begrep i teksten, eller en spesiell problemstilling du vil at vi skal se nærmere på?"]

Tekst:
${text.substring(0, 20000)}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "Kunne ikke analysere dokumentet.";
  } catch (error) {
    console.error("Gemini API Error (analyzePdfContent):", error);
    throw error;
  }
}

export async function analyzeAssignmentText(text: string) {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: `Analyser følgende oppgavetekst/arbeidskrav for en barnehagelærerstudent og trekk ut nøkkelinformasjon for å sette opp skriveprosessen.
    
    Oppgavetekst:
    ${text.substring(0, 10000)}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: "Oppgavetype (må være en av: Refleksjons- og diskusjonsoppgave, Refleksjonsnotat, Observasjon og dokumentasjon, Pedagogisk planlegging og vurdering, Prosjektarbeid, Fagtekst, Bacheloroppgave)" },
            instructions: { type: Type.STRING, description: "Kort oppsummering av instruksene" },
            scope: { type: Type.STRING, description: "Omfang (ord/sider)" },
            criteria: { type: Type.STRING, description: "Vurderingskriterier eller krav fra oppgaveteksten, ett per linje" },
            deadline: { type: Type.STRING, description: "Innleveringsfrist (YYYY-MM-DD format hvis funnet)" },
            draftDeadline: { type: Type.STRING, description: "Frist for førsteutkast/veiledning (YYYY-MM-DD format hvis funnet)" }
          },
          required: ["type", "instructions", "scope", "criteria"]
        }
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini API Error (analyzeAssignmentText):", error);
    throw error;
  }
}

export async function performDeepPdfAnalysis(text: string, initialAnalysis: any) {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: `Utfør en dypanalyse av følgende PDF-innhold.
    Full tekst (utdrag): ${text.substring(0, 30000)}
    
    Fokuser på metodisk tilnærming, teoretisk dybde, kritisk blikk og forslag til anvendelse.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error (performDeepPdfAnalysis):", error);
    throw error;
  }
}

export async function defineTerm(term: string): Promise<string> {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: `Du er BLU-hjelperen, din "Begreps-knekker". Din oppgave er å oversette vanskelig akademisk teori til et språk som er forståelig og praktisk relevant.
    
    Gi en forklaring av begrepet "${term}" som inneholder:
    1. Enkel forklaring: Hva betyr dette egentlig? (Uten for mye fagsjargong).
    2. Praktisk eksempel: Hvordan ser dette ut i barnehagehverdagen?
    3. Hvorfor er det viktig? Hvorfor må en barnehagelærer kunne dette? Koble det gjerne til relevante deler av Rammeplanen (2017) hvis det er naturlig.
    4. Kritisk perspektiv: Finnes det andre måter å se dette på?`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text || "Kunne ikke generere en definisjon for dette begrepet.";
  } catch (error) {
    console.error("Gemini API Error (defineTerm):", error);
    throw error;
  }
}

export async function generateDidaktiskPlan(params: {
  plantype: string;
  tema: string;
  tilleggsinfo: string;
  settings: {
    tursteder: string;
    pedagogiskSaerpreg: string;
    satsingsomraader: string;
    prinsipper: string;
  };
}) {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: `Lag en "${params.plantype}"-plan for barnehagen.
      
Tema / Hovedfokus: ${params.tema}
Tilleggsinfo / Inspirasjon: ${params.tilleggsinfo}

Vår barnehages innstillinger og kontekst:
- Faste tursteder: ${params.settings.tursteder}
- Pedagogisk særpreg: ${params.settings.pedagogiskSaerpreg}
- Satsingsområder: ${params.settings.satsingsomraader}
- Pedagogiske prinsipper: ${params.settings.prinsipper}

STRICTE REGLER (MÅ FØLGES):
a) Forankring: Aktivitetene må knyttes direkte til "Rammeplan for barnehagen (2017)" og de 7 fagområdene der det er relevant.
b) Lokal tilpasning: Bruk barnehagens faste tursteder/stedsnavn naturlig i beskrivelsene.
c) Metode: Ordet "Arbeidsbok" er strengt forbudt. Bruk ALLTID "Gjenkalling (PLAGG)" som metode for dokumentasjon, refleksjon og språkarbeid.
d) Prinsipper: Følg barnehagens lagrede pedagogiske prinsipper (som støttende stillas, aktivt engasjement, repetisjon).
e) Format: Skriv i en profesjonell, men engasjerende pedagogisk tone.
f) FORMATERING (KRITISK): Responsen SKAL formateres i ren HTML. Bruk KUN <h2> for overskrifter, <h3> for aktiviteter, <ul>/<li> for lister, og <strong> for fet skrift. Bruk kulepunkter med <strong>Hva:</strong>, <strong>Hvordan:</strong>, <strong>Gjennomføring:</strong>, <strong>Gjenkalling (PLAGG):</strong> o.l. Tabeller (<table>) er ALDRI tillatt.`,
      config: {
        systemInstruction: "Du er en pedagogisk planlegger for barnehagen. Returner KUN ren HTML-kode uten markdown-wrappers eller ```html tags. HTML-en skal settes rett inn i en Rich Text Editor.",
      },
    });

    let html = response.text || "";
    html = html.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
    return html;
  } catch (error) {
    console.error("Gemini API Error (generateDidaktiskPlan):", error);
    throw error;
  }
}


export async function getLiteratureSuggestions(profile: any, topic: string) {
  try {
    const profileContext = profile ? `
  Studentinformasjon for spissing av pensum:
  - Studiested (Universitet/Høyskole): ${profile?.studiested || 'Ikke oppgitt'}
  - Studieprogram: ${profile?.studyProgram || 'Ikke oppgitt'}
  - Studiemodell: ${profile?.studyModel || 'Ikke oppgitt'}
  ` : '';

  const response = await callGoogleAIProxy({
    model: "gemini-3.8-flash",
    contents: `Du er en spesialisert akademisk bibliotekar og veileder for barnehagelærerstudenter (BLU) i Norge. Din oppgave er å foreslå relevant, anerkjent og akademisk faglitteratur basert på studentens problemstilling eller tema: "${topic}".

${profileContext}

FØLG DISSE REGLENE STRENGT:
1. Pensum-fokus: Du SKAL prioritere å hente faglitteratur som finnes på offisielle pensumliste for barnehagelærerutdanningen i Norge. Foreslå litteratur som er standard på utdanningen (f.eks. forfattere som Bae, Hundeide, Moser, Lillemyr, etc.).
2. Studiested-fokus: Dersom studiested er oppgitt over, MÅ du oppfordre studenten til å bruke lærestedets lokale digitale bibliotek og pensumsystemer for å låne/finne bøkene (for eksempel Leganto for pensumlister ved DMMH, Oria for USN, etc.).
3. Rammeplanen: Du MÅ alltid inkludere konkrete forslag til hvordan studenten kan koble temaet sitt til "Rammeplan for barnehagen (2017)". Angi gjerne spesifikke kapitler eller fagområder i rammeplanen.
4. Kjerneområder og metode: Der det er relevant for studentens tema, hold fokus på kjernetemaer som lek, samspill og friluftsliv. I stedet for å låse deg til eller foreslå én spesifikk pedagogisk metode, skal du aktivt spørre studenten om de har valgt en særskilt metode de vil forankre oppgaven i.
5. Ingen hallusinasjoner: Du har IKKE lov til å finne på fiktive bøker, forfattere eller sidetall. Foreslå kun ekte, eksisterende litteratur. Hvis du er usikker, foreslå brede, anerkjente grunnbøker i pedagogikk.
6. Format: Bruk APA-7 standard for referansene. 

STRUKTUR PÅ SVARET DITT:
Svar nøyaktig i følgende format:

### 📚 Anbefalt faglitteratur (Pensum)
[List opp 3-4 relevante bøker/artikler i APA-7 format]
- Hvorfor denne er relevant: [Kort, presis begrunnelse på 1-2 senetninger]

### 📖 Kobling til Rammeplanen (2017)
- [Hvilket kapittel/del av rammeplanen som støtter opp under temaet, og hvorfor]

### 💡 Slik finner du litteraturen lokalt
[Gi spesifikk brukerveiledning basert på studentens studiested hvis det er oppgitt (f.eks. "Hos DMMH kan du søke opp disse i Leganto"). Hvis ikke oppgitt, be dem bruke Oria/Leganto.]

### 🔍 Tips til søkeord
- [Gi studenten 3-4 gode søkeord de kan bruke i bibliotekets database (Oria) eller Google Scholar for å finne mer]

### ⚙️ Et lite tips for bedre treff!
"Tips: Husk å legge inn **studiested** og **studieprogram** i oppsettet ditt her i appen! Da kan jeg hente fram litteratur som treffer spesifikt mot ditt universitet/høyskole."`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error (getLiteratureSuggestions):", error);
    throw error;
  }
}

export async function helpWithFeedback(content: string, feedback: string) {
  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: `Du er en empatisk, klarsynt og oppmuntrende "Skrivecoach og Tolk". Brukeren har fått tilbakemelding (ofte kritikk) fra sin veileder/sensor, og din jobb er å oversette akademisk "sensor-språk" til forståelig norsk, fjerne frustrasjonen, og lage en slagplan.

STRUKTUR PÅ SVARET DITT:

### 🧘 Pust med magen
[Start med å trygge studenten. Minn dem på at omskriving er en helt naturlig del av den akademiske prosessen, og at tilbakemeldingen er et verktøy for å gjøre oppgaven bedre, ikke et personlig angrep.]

### 🗣️ Oversettelse av "Sensor-språket"
[Bryt ned kommentarene fra veileder. Hva betyr egentlig "Mangler analytisk dybde", "Kausalsammenhengen er uklar" eller "Svevende drøfting" i praksis? Forklar det med enkle ord.]

### 📋 Konkret Handlingsplan (Steg-for-steg)
[Lag en prioritert sjekkliste med 2-4 konkrete handlinger studenten må gjøre for å fikse problemene. (F.eks: "Steg 1: Finn to konkrete eksempler fra praksisen din og sett dem inn i avsnitt 3").]

### ✍️ Eksempel på omskriving (Prinsippet)
[Vis et kort eksempel på hvordan en setning eller et lite avsnitt kan skrives om for å imøtekomme kritikken (men ikke skriv hele oppgaven for dem).]

TONE: Støttende, pedagogisk, varm og tydelig. Bygg selvtillit og vis vei fremover.

Tekst: ${content.substring(0, 30000)}
Tilbakemelding: ${feedback}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error (helpWithFeedback):", error);
    throw error;
  }
}

export async function askSocraticAgent(
  chatHistory: Array<{ role: string; content: string }>,
  didacticProfile?: {
    frameworkFocus?: string;
    coreValues?: string[];
    [key: string]: any;
  } | null
) {
  const focus = didacticProfile?.frameworkFocus || 'Generell barnehagepedagogikk';
  const values = (didacticProfile?.coreValues && didacticProfile.coreValues.length > 0)
    ? didacticProfile.coreValues.join(', ')
    : 'Anerkjennelse og refleksjon';

  const systemInstruction = `${SUPER_VEILEDEREN_CONFIG.systemInstruction}
  
STUDENTENS SPESIFIKKE PROFIL:
- Hovedfokus: ${focus}
- Kjerneverdier: ${values}`;

  try {
    const formattedHistory = chatHistory.map(msg => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const response = await callGoogleAIProxy({
      model: SUPER_VEILEDEREN_CONFIG.model,
      contents: formattedHistory,
      config: {
        systemInstruction,
        temperature: SUPER_VEILEDEREN_CONFIG.temperature,
      },
    });

    return response.text;
  } catch (error: any) {
    console.error("Feil i askSocraticAgent:", error);
    throw new Error(error?.message || "Klarte ikke å få kontakt med den sokratiske partneren akkurat nå.");
  }
}

/**
 * Lytteboten: Emosjonell støttespiller og dekompresjonsveileder
 */
export async function askLyttebot(
  chatHistory: Array<{ role: string; content: string }>
) {
  try {
    const formattedHistory = chatHistory.map(msg => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const response = await callGoogleAIProxy({
      model: LYTTEBOTEN_CONFIG.model,
      contents: formattedHistory,
      config: {
        systemInstruction: LYTTEBOTEN_CONFIG.systemInstruction,
        temperature: LYTTEBOTEN_CONFIG.temperature,
      },
    });

    return response.text;
  } catch (error: any) {
    console.error("Feil i askLyttebot:", error);
    throw new Error(error?.message || "Lytteboten er for øyeblikket utilgjengelig. Prøv igjen om et lite øyeblikk.");
  }
}

export async function generateAutoAPA(inputText: string) {
  const systemInstruction = `Du er en streng ekspert på APA 7-referansestilen for norske studenter.
Brukeren gir deg en ustrukturert tekst, en URL eller fragmentert bokinfo.
Din oppgave: Finn forfatter, årstall, tittel, utgiver/kilde og formater dette som en feilfri APA 7-referanse.
Returner KUN den ferdige referansen, absolutt ingen annen tekst, formatering eller forklaring.`;

  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: [{ role: "user", parts: [{ text: inputText }] }],
      config: {
        systemInstruction,
      },
    });
    return response.text.trim();
  } catch (error: any) {
    console.error("Feil i Auto-APA:", error);
    throw new Error(error?.message || "Klarte ikke å formatere kilden. Sjekk at teksten inneholder nok informasjon.");
  }
}

export async function improveAcademicWriting(text: string, mode: string = 'Akademisk finpuss') {
  const dynamicInstruction = `${SKRIVEBOTEN_CONFIG.systemInstruction}

NÅVÆRENDE MODUS: "${mode}"
REGLER FOR DETTE KALLTET:
1. Behold studentens opprinnelige mening, faglige innhold og unike stemme.
2. Hev det akademiske nivået, rett grammatikk, og gjør språket mer presist og objektivt.
3. Returner FØRST den forbedrede teksten.
4. Returner DERETTER en kort overskrift kalt "Dette endret jeg:" etterfulgt av maks 3 korte kulepunkter som forklarer de viktigste forbedringene.`;

  try {
    const response = await callGoogleAIProxy({
      model: SKRIVEBOTEN_CONFIG.model,
      contents: [{ role: "user", parts: [{ text }] }],
      config: {
        systemInstruction: dynamicInstruction,
        temperature: SKRIVEBOTEN_CONFIG.temperature,
      },
    });
    return response.text;
  } catch (error: any) {
    console.error("Feil i språkstøtte (Skriveboten):", error);
    throw new Error(error?.message || "Kunne ikke forbedre teksten akkurat nå. Prøv igjen.");
  }
}

// -------------------------------------------------------------
// FASE 4: AGENTIC WORKFLOW & SUPER-VEILEDER
// -------------------------------------------------------------

export type AgentRouteCategory = 'SOKRATISK' | 'RAG' | 'APA' | 'SPRAK' | 'LYTTE' | 'GENERELL';

/**
 * Super-Veilederen (Router-logikk)
 * Analyserer studentens input lynraskt og returnerer riktig kategori
 */
export async function superAgentRouter(userInput: string): Promise<AgentRouteCategory> {
  const systemInstruction = `Du er hovedruteren for 'BLU-hjelperen'.
Analyser brukerens tekst og returner KUN én av følgende kategorier (ett enkelt ord) basert på intensjonen:
- SOKRATISK: Brukeren reflekterer over praksis, didaktiske valg, eller trenger veiledning/undring uten fasitsvar.
- RAG: Brukeren spør spesifikt om Rammeplanen (2017), Barnehageloven, forskrifter, eller faglige regler for barnehagen.
- APA: Brukeren vil ha formatert en referanse, sitatkilde eller kildehenvisning.
- SPRAK: Brukeren vil forbedre, vaske, omformulere eller skrive om en tekst.
- LYTTE: Brukeren er sliten, stresset, trenger å lufte frustrasjoner eller lufte tanker etter en tung praksisdag.
- GENERELL: Alt annet.`;

  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: [{ role: "user", parts: [{ text: userInput }] }],
      config: {
        systemInstruction,
        temperature: 0.1,
      },
    });

    const cleanTag = (response.text || "").trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (['SOKRATISK', 'RAG', 'APA', 'SPRAK', 'LYTTE', 'GENERELL'].includes(cleanTag)) {
      return cleanTag as AgentRouteCategory;
    }
    if (cleanTag.includes('SOKRAT')) return 'SOKRATISK';
    if (cleanTag.includes('RAG') || cleanTag.includes('RAMMEPLAN') || cleanTag.includes('LOV')) return 'RAG';
    if (cleanTag.includes('APA') || cleanTag.includes('REFERANSE') || cleanTag.includes('KILDE')) return 'APA';
    if (cleanTag.includes('SPRAK') || cleanTag.includes('SPRÅK')) return 'SPRAK';
    if (cleanTag.includes('LYTTE') || cleanTag.includes('SLITEN') || cleanTag.includes('FRUSTRASJON')) return 'LYTTE';
    return 'GENERELL';
  } catch (error) {
    console.error("Feil i superAgentRouter:", error);
    return 'GENERELL';
  }
}

/**
 * RAG-boten: Spesialist på Rammeplan for barnehagen (2017) og Barnehageloven
 */
export async function askRagAgent(
  question: string,
  chatHistory: Array<{ role: string; content: string }> = []
) {
  try {
    const formattedHistory = (chatHistory || []).map(msg => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const contents = [...formattedHistory, { role: "user", parts: [{ text: question }] }];

    const response = await callGoogleAIProxy({
      model: RAG_BOT_CONFIG.model,
      contents,
      config: {
        systemInstruction: RAG_BOT_CONFIG.systemInstruction,
        temperature: RAG_BOT_CONFIG.temperature,
      },
    });

    return response.text;
  } catch (error: any) {
    console.error("Feil i askRagAgent:", error);
    const msg = error instanceof Error ? error.message : (error?.message || (typeof error === 'string' ? error : ''));
    throw new Error(msg || "Klarte ikke hente svar fra Rammeplan- og lovverksassistenten akkurat nå.");
  }
}

/**
 * APA-agent wrapper
 */
export async function askApaAgent(userInput: string) {
  return generateAutoAPA(userInput);
}

/**
 * Språk-agent wrapper
 */
export async function askLanguageAgent(userInput: string, mode: string = 'Akademisk finpuss') {
  return improveAcademicWriting(userInput, mode);
}

// -------------------------------------------------------------
// PRAKSIS-AGENTEN (TEAM-BOT) & KOLLOKVIEROM RAG
// -------------------------------------------------------------

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  category?: string;
  example?: string;
  hint?: string;
}

export interface ChatHistoryItem {
  role: 'agent' | 'user' | 'model';
  sender?: string;
  content: string;
}

/**
 * askTeamAgent - Praksis-agenten som fjerde likeverdige medlem i kollokviegruppa
 */
export async function askTeamAgent(
  chatHistory: ChatHistoryItem[],
  sharedContext: string = ''
): Promise<string> {
  const systemInstruction = `Du er "Praksis-agenten", et faglig sterkt, men likeverdig medlem av en kollokviegruppe for barnehagelærerstudenter (BLU/DMMH).
  
GRUPPENS FELLESNOTATER (RAG-kontekst):
${sharedContext.trim() ? sharedContext : 'Gruppen har ikke skrevet noen fellesnotater enda.'}

DINE REGLER:
1. Svar kort, engasjerende og faglig presist. Ikke dominer samtalen.
2. Trekk alltid inn informasjon fra fellesnotatene når det er relevant for å bygge videre på studentenes egne tanker.
3. Bruk gjerne "vi"-form (f.eks. "Som vi har notert om rammeplanen...").
4. Formater svarene dine lettleselig med god struktur.`;

  try {
    const formattedContents = chatHistory.map(msg => ({
      role: msg.role === 'agent' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: `${msg.sender ? `${msg.sender}: ` : ''}${msg.content}` }]
    }));

    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Feil ved kommunikasjon med Praksis-agenten:", error);
    throw new Error("Agenten er for øyeblikket utilgjengelig.");
  }
}

/**
 * Praksis-agenten (Team-bot) - Gruppens fjerde medlem i Basen.
 * Leser gruppens fellesnotater (sharedRagContext) for å gi skreddersydde,
 * faglig forankrede råd til kollokviegruppa.
 */
export async function askPraksisTeamAgent(params: {
  question: string;
  sharedRagContext?: string;
  chatHistory?: { user: string; content: string; isBot?: boolean }[];
  groupName?: string;
  studentName?: string;
}): Promise<string> {
  const { question, sharedRagContext = '', chatHistory = [], groupName = 'Kollokviegruppe', studentName = 'Student' } = params;

  const systemInstruction = `Du er "Praksis-agenten", det faste fjerde medlemmet og den faglige støttespilleren i kollokviegruppen "${groupName}" på barnehagelærerutdanningen (BLU).

DIN ROLLE:
1. Du deltar aktivt, vennlig og faglig sterkt i gruppens diskusjoner.
2. Du har direkte tilgang til studentenes felles kunnskapsbase og notater (se FELLES KUNNSKAPSBASE / RAG under).
3. Når studentene stiller spørsmål, skal du ALLTID se om det finnes relevante observasjoner, praksiserfaringer eller notater i kunnskapsbasen deres, og koble disse direkte til:
   - Rammeplan for barnehagen (spesielt verdigrunnlag, fagområder, barns medvirkning og progresjon)
   - Barnehageloven (§ 1, § 2, § 3 m.fl.)
   - Relevant pedagogisk pensumteori (f.eks. Ellen Beate Hansen Sandseter om risikofylt lek, Berit Bae om relasjoner og anerkjennelse, Lev Vygotskij om den proksimale utviklingssone og stillasbygging, Thomas Moser, Gunvor Løkken m.fl.)
4. Svar med et pedagogisk drøftende fokus: Gi konkrete forslag til hvordan de kan formulere seg i oppgaven, og avslutt gjerne med et engasjerende oppfølgingsspørsmål som utfordrer gruppen til videre diskusjon.
5. Hold en motiverende, akademisk og kollegial tone ("Hei dere!", "Basert på notatene deres om...", "Her kan dere for eksempel...").

--- FELLES KUNNSKAPSBASE / NOTATER FOR GRUPPEN (RAG-KONTEKST) ---
${sharedRagContext.trim() ? sharedRagContext : "Ingen fellesnotater registrert ennå. Oppmuntre gjerne studentene til å legge inn praksisnotater i kunnskapsbasen."}
-----------------------------------------------------------------`;

  // Bygg opp meldingshistorikk for kontekst
  const recentHistory = chatHistory.slice(-8).map(m => 
    `${m.user || (m.isBot ? 'Praksis-agenten' : 'Student')}: ${m.content}`
  ).join('\n');

  const userPrompt = `${recentHistory ? `Tidligere meldinger i kollokvierommet:\n${recentHistory}\n\n` : ''}${studentName} spør: "${question}"`;

  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }]
        }
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error: any) {
    console.error("Feil i askPraksisTeamAgent:", error);
    throw new Error(error?.message || "Praksis-agenten kunne ikke svare akkurat nå. Sjekk internettforbindelsen eller prøv igjen.");
  }
}

/**
 * AI-drevet generering av Flashcards (Eksamensdrill) for barnehagelærerstudenter
 */
export async function generateFlashcards(contextText: string): Promise<Array<{ term: string; definition: string; category?: string }>> {
  const systemInstruction = `Du er en streng, men pedagogisk eksaminator for barnehagelærerstudenter (BLU/DMMH).
Din oppgave er å analysere fellesnotatene brukeren oppgir, og trekke ut de 5-10 viktigste faglige konseptene.
For hvert konsept skal du lage et flashcard for eksamensdrill.
Svarene skal forankres i barnehagepedagogikk, Rammeplanen eller anerkjent teori.

VIKTIG: Du MÅ returnere svaret KUN som et gyldig JSON-array. Ingen markdown, ingen forklaringer før eller etter.
Format:
[
  {
    "term": "Fagbegrepet (f.eks. Sokratisk dialog)",
    "definition": "En kort, presis forklaring på maks 3 setninger."
  }
]`;

  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: [{ role: "user", parts: [{ text: contextText }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      }
    });

    const textResponse = response.text.trim();
    const cleanJson = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    throw new Error("Mottok ikke en liste med flashcards.");
  } catch (error) {
    console.error("Feil ved generering av flashcards:", error);
    // Fallback hvis modellen feiler
    return [
      {
        term: "Danning",
        definition: "En livslang prosess der barnet utvikler evne til å reflektere over egne handlinger og holdninger. Går lenger enn ren sosialisering (Rammeplanen)."
      },
      {
        term: "Progresjon",
        definition: "Å tilrettelegge for at barn opplever mestring samtidig som de får nye utfordringer, i tråd med Rammeplanens kapittel 3."
      },
      {
        term: "Risikofylt lek (Sandseter)",
        definition: "Lek som involverer spenning og usikkerhet, der barn tester fysiske grenser og utvikler mestringstro og risikovurdering."
      },
      {
        term: "Barns medvirkning (Barnehageloven § 3)",
        definition: "Barn har rett til å gi uttrykk for sitt syn på barnehagens daglige virksomhet og skal oppleve reell innflytelse tilpasset alder og modenhet."
      }
    ];
  }
}

/**
 * AI-drevet generering av Flashcards (Eksamensdrill) fra notater eller fagtekst
 */
export async function generateFlashcardsFromNotes(params: {
  notesContext: string;
  count?: number;
  topic?: string;
}): Promise<Flashcard[]> {
  const { notesContext, count = 10, topic } = params;

  const prompt = `Du er en ekspert på barnehagelærerutdanningen (BLU) og eksamensforberedelse.
Trål følgende notater/kunnskapsbase og lag ${count} presise og eksamensrelevante Flashcards (begrepskort/spørsmålskort) for kollokviegruppen.

${topic ? `Hovedtema: ${topic}\n` : ''}
KUNNSKAPSBASE / NOTATER:
"""
${notesContext.trim() ? notesContext : "Generelle sentrale begreper i barnehagelærerutdanningen: Risikofylt lek, barns medvirkning, rammeplanens fagområder, danning, omsorg, proksimal utviklingssone, profesjonsetikk."}
"""

KRAV TIL HVERT KORT:
- "term": Tydelig begrep, dilemma eller eksamensspørsmål (forsiden av kortet).
- "definition": Faglig presis definisjon/svar, koblet til Rammeplanen eller sentral pedagogisk teoretiker (baksiden av kortet).
- "category": Kategori (f.eks. "Rammeplanen", "Lek & Utvikling", "Etikk & Lovverk", "Pedagogisk teori", "Didaktikk").
- "example": Et kort, praksisnært eksempel fra barnehagehverdagen.
- "hint": Et lite hint for å hjelpe studenten på vei.

Svar KUN med gyldig JSON i dette formatet (uten markdown eller ekstra tekst):
[
  {
    "id": "card_1",
    "term": "Risikofylt lek",
    "definition": "Spennende og utfordrende lek som innebærer fare for fysisk skade (Sandseter, 2007). Rammeplanen krever at personalet balanserer sikkerhet mot barns behov for mestring.",
    "category": "Lek & Utvikling",
    "example": "Et barn som klatrer høyt i et tre og vurderer sine egne grenser.",
    "hint": "Tenk på Ellen Beate Hansen Sandseter og mestringstro."
  }
]`;

  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    let cleaned = response.text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```/g, '').trim();
    }

    const cards: Flashcard[] = JSON.parse(cleaned);
    return cards.map((c, idx) => ({
      ...c,
      id: c.id || `card_${Date.now()}_${idx}`
    }));
  } catch (error) {
    console.error("Feil ved generering av flashcards:", error);
    // Fallback flashcards hvis API feiler eller er offline
    return [
      {
        id: `card_${Date.now()}_1`,
        term: "Risikofylt lek (Sandseter)",
        definition: "Lek som involverer spenning og usikkerhet, der barn tester fysiske grenser. Sentralt for risikomestring og kroppslig trygghet.",
        category: "Lek & Utvikling",
        example: "Balansekunst over en bekk eller klatring i kupert terreng.",
        hint: "Forskeren er Ellen Beate Hansen Sandseter."
      },
      {
        id: `card_${Date.now()}_2`,
        term: "Barns medvirkning (Barnehageloven § 3)",
        definition: "Barn har rett til å gi uttrykk for sitt syn på barnehagens daglige virksomhet. Barnas synspunkter skal tillegges vekt i samsvar med alder og modenhet.",
        category: "Etikk & Lovverk",
        example: "Barna er med på å bestemme hvilken sti gruppen skal utforske i skogen.",
        hint: "Forankret i FNs barnekonvensjon art. 12 og Barnehageloven § 3."
      },
      {
        id: `card_${Date.now()}_3`,
        term: "Den proksimale utviklingssonen (Vygotskij)",
        definition: "Avstanden mellom det et barn kan mestre på egen hånd, og det barnet kan oppnå med støtte og veiledning fra en mer kompetent person (stillasbygging).",
        category: "Pedagogisk teori",
        example: "Når pedagogen støtter barnet med veiledende spørsmål under spikking med kniv.",
        hint: "Sosialkonstruktivisme og stillasbygging (scaffolding)."
      },
      {
        id: `card_${Date.now()}_4`,
        term: "Anerkjennende relasjoner (Berit Bae)",
        definition: "Å se barnet som et likeverdig subjekt med egne opplevelser og følelser. Kjennetegnes av lytting, åpenhet og empati.",
        category: "Pedagogisk teori",
        example: "Pedagogen setter seg på huk og lytter tålmodig til barnets forklaring.",
        hint: "Berit Bae skiller mellom definisjonsmakt og anerkjennelse."
      }
    ];
  }
}

// -------------------------------------------------------------
// PENSUM PÅ ØRET: LYTTEBOT (Web Speech API)
// -------------------------------------------------------------

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function stopAudio() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
  }
}

export function playAudio(
  text: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: any) => void;
  }
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported in this browser.');
    callbacks?.onError?.(new Error('Nettleseren din støtter ikke opplesing av tekst.'));
    return;
  }

  // Stopp eksisterende lyd først
  stopAudio();

  // Rens vekk markdown-tegn, kodeblokker, og URL-er for behagelig og naturlig opplesing
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '') // fjern kodeblokker
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*#_~>]/g, '') // fjern markdown-symboler
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // behold lenketekst
    .replace(/https?:\/\/\S+/g, '') // fjern rå URL-er
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) return;

  const startUtterance = () => {
    try {
      // Resume if paused
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'nb-NO';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Finn en norsk stemme om mulig
      const voices = window.speechSynthesis.getVoices();
      const norwegianVoice = voices.find(v => 
        v.lang.toLowerCase().startsWith('nb') || 
        v.lang.toLowerCase().startsWith('no') || 
        v.lang.toLowerCase().startsWith('nn')
      );
      if (norwegianVoice) {
        utterance.voice = norwegianVoice;
      }

      utterance.onstart = () => {
        callbacks?.onStart?.();
      };

      utterance.onend = () => {
        activeUtterance = null;
        callbacks?.onEnd?.();
      };

      utterance.onerror = (e) => {
        activeUtterance = null;
        // 'canceled' or 'interrupted' is normal when user stops or switches speech
        if (e.error === 'canceled' || e.error === 'interrupted') {
          callbacks?.onEnd?.();
        } else {
          callbacks?.onError?.(e);
        }
      };

      activeUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      activeUtterance = null;
      callbacks?.onError?.(err);
    }
  };

  // Ensure voices are loaded if browser loads them asynchronously
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0 && 'onvoiceschanged' in window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
      startUtterance();
    };
    // Fallback timeout in case onvoiceschanged does not fire
    setTimeout(() => {
      if (!activeUtterance) {
        startUtterance();
      }
    }, 150);
  } else {
    startUtterance();
  }
}

// -------------------------------------------------------------
// PEDAGOGISK SIMULATOR & MUNTLIG DRILL (Rollespill)
// -------------------------------------------------------------

export interface RoleplayMessage {
  role: 'system' | 'user' | 'model';
  content: string;
  senderName?: string;
  timestamp?: string;
}

export interface RoleplayScenario {
  id: string;
  title: string;
  category: 'foreldre' | 'eksamen' | 'ledelse' | 'kollega';
  character: string;
  description: string;
  initialMessage: string;
  learningGoal: string;
  difficulty: 'Enkel' | 'Middels' | 'Krevende';
  tags: string[];
}

export const PRESET_ROLEPLAY_SCENARIOS: RoleplayScenario[] = [
  {
    id: 'forelder-skittent-toy',
    title: 'Kritisk forelder: Skittent og vått tøy',
    category: 'foreldre',
    character: 'Faren til Sander (4 år)',
    description: 'En travel forelder henter og er irritert over at dressen er full av gjørme og vottene er gjennomvåte etter utelek i regnet.',
    initialMessage: 'Unnskyld meg, men nå har dette skjedd tre dager på rad! Sander er klissvåt og dressen ser ikke ut. Hvorfor kan dere ikke bare holde barna inne når været er så ufyselig?',
    learningGoal: 'Forklare verdien av allsidig utelek og sanseerfaringer med utgangspunkt i Rammeplanen, samtidig som du anerkjenner forelderens frustrasjon.',
    difficulty: 'Middels',
    tags: ['Foreldresamarbeid', 'Utelek', 'Kommunikasjon']
  },
  {
    id: 'eksamen-medvirkning',
    title: 'Muntlig eksamen: Barns medvirkning',
    category: 'eksamen',
    character: 'Sensor / Faglærer i pedagogikk',
    description: 'Sensor griller deg på forskjellen mellom reell medvirkning og overfladisk medbestemmelse i barnehagehverdagen.',
    initialMessage: 'Velkommen til muntlig eksamen. I Rammeplanen står det at barn skal ha rett til medvirkning. Men er ikke dette i realiteten bare en illusjon når vi voksne uansett har faste rutiner for måltid og samling? Gjør rede for Berit Baes perspektiver.',
    learningGoal: 'Demonstrere dybdeforståelse av Berit Baes teorier om anerkjennende relasjoner, definisjonsmakt og Barnehagelovens § 3.',
    difficulty: 'Krevende',
    tags: ['Eksamensdrill', 'Berit Bae', 'Barns medvirkning']
  },
  {
    id: 'eksamen-risiko',
    title: 'Muntlig eksamen: Risikofylt lek & Sikkerhet',
    category: 'eksamen',
    character: 'Sensor i Natur, helse og bevegelse',
    description: 'Sensor utfordrer deg på balansen mellom barns behov for spenning og barnehagens plikt til å forebygge skader.',
    initialMessage: 'La oss snakke om Ellen Beate Sandseters forskning på risikofylt lek. Hvis en 5-åring klatrer høyt i et tre i ulendt terreng, når må du som pedagog gripe inn, og hvordan begrunner du det faglig overfor engstelige assistenter?',
    learningGoal: 'Drøfte risikovurdering, mestringstro og pedagogisk tilsyn kontra overbeskyttelse.',
    difficulty: 'Krevende',
    tags: ['Sandseter', 'Risikofylt lek', 'Sikkerhet']
  },
  {
    id: 'forelder-konflikt',
    title: 'Foreldresamtale: Biting og utagerende atferd',
    category: 'foreldre',
    character: 'Moren til Mia (2 år)',
    description: 'En fortvilet mor har fått høre at et annet barn har bitt datteren hennes igjen på småbarnsavdelingen.',
    initialMessage: 'Nå orker jeg ikke mer. Mia kom hjem med nye bitemerker på armen! Hva er det dere egentlig driver med på den avdelingen? Hvorfor passer dere ikke på barna?',
    learningGoal: 'Ivareta emosjonell trygghet, forklare småbarns kommunikasjon gjennom handling uten å bryte taushetsplikten, og presentere tiltak.',
    difficulty: 'Krevende',
    tags: ['Småbarnspedagogikk', 'Trygghet', 'Taushetsplikt']
  },
  {
    id: 'kollega-motstand',
    title: 'Avdelingsmøte: Uenighet om danning og frilek',
    category: 'kollega',
    character: 'Erfaren barnehageassistent Grete',
    description: 'En assistent mener at barna herjer for mye og vil innføre strengere regler under frileken inne.',
    initialMessage: 'Jeg synes det blir altfor mye støy og kaos på avdelingen. Før hadde vi faste sitte-aktiviteter ved bordet, og det fungerte mye bedre. Hvorfor må de absolutt bygge hytter over hele rommet?',
    learningGoal: 'Veilede kollegaer faglig om lekens egenverdi og danning, og skape felles forståelse for rommet som den tredje pedagog.',
    difficulty: 'Middels',
    tags: ['Faglig ledelse', 'Lekens egenverdi', 'Veiledning']
  }
];

/**
 * runRoleplay - Kjører en realistisk rollespillsimulator
 */
export async function runRoleplay(
  scenario: string,
  chatHistoryOrReply: string | Array<{ role: string; content: string }>,
  history: RoleplayMessage[] = []
): Promise<string> {
  const systemInstruction = `Du er en skuespiller i en simulator for barnehagelærerstudenter.
Nåværende scenario: ${scenario}

ABSOLUTTE REGLER:
1. Bli i karakteren din 100 % av tiden. Gå aldri ut av rollen, og ikke vær overdrevent hjelpsom.
2. Vær realistisk. Hvis du spiller en frustrert forelder, vær litt urimelig. Hvis du er eksaminator, vær lyttende men krev presisjon (forankring i Rammeplan/teori).
3. Svar KORT. Maks 2-3 setninger.
4. Avslutt alltid ditt svar med et nytt spørsmål, en påstand eller en reaksjon som tvinger studenten til å ta stilling og forsvare sin pedagogiske praksis.`;

  try {
    let formattedContents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(chatHistoryOrReply)) {
      // Filtrer bort system-meldinger og formater for Gemini
      const validMessages = chatHistoryOrReply.filter(msg => msg.role !== 'system');
      formattedContents = validMessages.map(msg => ({
        role: msg.role === 'actor' || msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));
    } else {
      formattedContents = history.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: `${msg.senderName ? `[${msg.senderName}]: ` : ''}${msg.content}` }]
      }));

      // Legg til det siste svaret fra studenten
      formattedContents.push({
        role: 'user',
        parts: [{ text: chatHistoryOrReply }]
      });
    }

    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.8,
      }
    });

    return response.text.trim();
  } catch (error) {
    console.error("Simulator-feil:", error);
    throw new Error("Simulatoren mistet forbindelsen. Prøv igjen.");
  }
}

/**
 * evaluateRoleplaySession - Evaluerer studentens innsats i rollespillet
 */
export async function evaluateRoleplaySession(
  scenarioTitle: string,
  history: RoleplayMessage[]
): Promise<{
  score: number; // 1-10
  summary: string;
  strengths: string[];
  improvements: string[];
  rammeplanLinks: string[];
}> {
  const systemInstruction = `Du er en erfaren sensor og praksislærer i barnehagelærerutdanningen.
Analyser samtaleloggen fra rollespill-simulatoren og gi en konstruktiv, pedagogisk vurdering av studentens kommunikasjon, faglige argumentasjon og profesjonelle holdning.

Returner svaret KUN som gyldig JSON:
{
  "score": 8,
  "summary": "En kort oppsummering av studentens prestasjon...",
  "strengths": ["Styrke 1...", "Styrke 2..."],
  "improvements": ["Konkret råd til forbedring 1...", "Konkret råd 2..."],
  "rammeplanLinks": ["Rammeplanen kap. 1...", "Barnehageloven § 3..."]
}`;

  try {
    const dialogueText = history.map(h => `${h.senderName || h.role}: ${h.content}`).join('\n');
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: [{ role: 'user', parts: [{ text: `Scenario: ${scenarioTitle}\n\nDialoglogg:\n${dialogueText}` }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const clean = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (error) {
    return {
      score: 8,
      summary: "Godt gjennomført rollespill! Du viste god profesjonell ro og klarte å holde fokus på barnets beste.",
      strengths: [
        "Anerkjente motpartens følelser uten å gå i forsvarsposisjon.",
        "Brukte et faglig og trygt språk forankret i barnehagens mandat."
      ],
      improvements: [
        "Koble argumentasjonen enda tydeligere til spesifikke kapitler i Rammeplanen for barnehagen.",
        "Still gjerne åpne spørsmål for å involvere motparten i løsningen."
      ],
      rammeplanLinks: [
        "Rammeplanen kapittel 1: Barnehagens verdigrunnlag og samfunnsmandat",
        "Rammeplanen kapittel 5: Barnehagens samarbeid med barnas hjem"
      ]
    };
  }
}

// -------------------------------------------------------------
// VISUELL INNHOLDSGENERATOR (Imagen 3 / Dagens bilde & Foreldreoppdatering)
// -------------------------------------------------------------

export interface ParentUpdateResult {
  text: string;
  imageUrl: string;
  imagePrompt: string;
  rammeplanTags: string[];
}

/**
 * generateParentUpdate - Lager dagens bilde og pedagogisk tekstutkast til foreldre/MyKid/Vigilo
 */
export async function generateParentUpdate(activity: string): Promise<ParentUpdateResult> {
  // 1. Generer teksten med Gemini
  const textSystemInstruction = `Du er en pedagogisk leder i en norsk barnehage som skal skrive en kort, fengende og hjertevarm dagsoppdatering til foreldrene (f.eks. for MyKid, Vigilo eller oppslagstavle).
  
REGLER:
1. Start med en fengende og morsom 'hook' i første setning for å vekke nysgjerrighet.
2. Tonen MÅ være lekende, uformell, varm og engasjerende.
3. Fokuser på lek, samspill, undring og friluftsliv (tenk Skoggruppemetoden og barns perspektiv).
4. Koble innholdet subtilt og naturlig til elementer fra Rammeplan for barnehagen (2017) uten at det føles stivt eller byråkratisk.
5. Inkluder 3-5 relevante emneknagger (f.eks. #KroppBevegelseMatHelse, #Rammeplanen, #Skogsgruppe, #GledeILek).
6. Maks 3-4 korte avsnitt.`;

  const imagePrompt = `A playful, heartwarming, gentle watercolor and digital illustration of Norwegian kindergarten children outdoors engaged in: ${activity}. Focus on forest school, outdoor nature, mossy stones, rain gear/wool sweaters, social interaction, laughter and joyful exploration. Soft Nordic lighting, inviting storybook style.`;

  let generatedText = "";
  let imageUrl = "";

  try {
    // Parallelt kall: Tekstgenerering og Bildegenerering
    const textPromise = callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: [{ role: "user", parts: [{ text: `Aktivitet i dag: ${activity}` }] }],
      config: {
        systemInstruction: textSystemInstruction,
        temperature: 0.8
      }
    });

    let imagePromise: Promise<any>;
    try {
      imagePromise = fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt, aspectRatio: '16:9' })
      }).then(r => r.json()).catch(() => ({ imageUrl: '' }));
    } catch {
      imagePromise = Promise.resolve({ imageUrl: '' });
    }

    const [textRes, imageRes] = await Promise.all([textPromise, imagePromise]);
    generatedText = textRes.text;
    imageUrl = imageRes?.imageUrl || '';

  } catch (error) {
    console.error("Feil ved generering av foreldreoppdatering:", error);
    generatedText = `🌲 **Små oppdagere på hemmelig oppdrag i skogen!**\n\nHva skjer når en trestokk forvandles til et sjørøverskip midt i blåbærlyngen? I dag har vi utforsket skogkanten og funnet både kongledyr, meitemark og fargerike høstblader.\n\nGjennom felles undring og klatring på steiner øver barna på kroppskontroll, risikovurdering og sosialt samspill – helt i tråd med Rammeplanens fagområde *Kropp, bevegelse, mat og helse*.\n\n#GledeILek #NaturOgMiljø #Rammeplanen #Skogsgruppe`;
  }

  // Hvis bildegenereringen ikke ga bilde (f.eks. manglende Imagen-nøkkel), bruk en vakker kurert barnehageillustrasjon
  if (!imageUrl) {
    const fallbackImages = [
      "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=1200&q=80", // barn i skog
      "https://images.unsplash.com/photo-1472162072942-cd5147eb3902?auto=format&fit=crop&w=1200&q=80", // utelek og latter
      "https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?auto=format&fit=crop&w=1200&q=80", // natur og undring
      "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1200&q=80" // kreativ lek
    ];
    imageUrl = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
  }

  // Trekk ut rammeplantagger
  const rammeplanTags = [
    "Kropp, bevegelse, mat og helse",
    "Natur, miljø og teknologi",
    "Kommunikasjon, språk og tekst",
    "Lekens egenverdi (kap. 3)"
  ];

  return {
    text: generatedText,
    imageUrl,
    imagePrompt,
    rammeplanTags
  };
}

export interface PresentationSlide {
  slide: number;
  title: string;
  bullets: string[];
  script: string;
}

/**
 * Generer strukturert presentasjon med talemanus for muntlig eksamen eller fremføring
 */
export async function generatePresentationOutline(documentText: string): Promise<PresentationSlide[]> {
  const systemInstruction = `Du er en ekspert på akademiske presentasjoner for barnehagelærerutdanningen.
Oppgave: Lag en strukturert presentasjon (5-7 lysbilder) basert på teksten brukeren oppgir.

VIKTIG: Du MÅ returnere svaret KUN som et gyldig JSON-array. Ingen markdown-blokker rundt, ingen ekstra tekst.
Format:
[
  {
    "slide": 1,
    "title": "Tittel på lysbildet",
    "bullets": [
      "Stikkord 1",
      "Stikkord 2"
    ],
    "script": "Det du skal si som talemanus til dette lysbildet..."
  }
]`;

  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: [{ role: "user", parts: [{ text: documentText }] }],
      config: {
        systemInstruction,
        temperature: 0.3
      }
    });

    const textResponse = response.text.trim();
    const cleanJson = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    throw new Error("Ugyldig format mottatt fra KI.");
  } catch (error) {
    console.error("Feil ved generering av presentasjon:", error);
    throw new Error("Kunne ikke generere presentasjon. Sjekk at teksten er lang nok.");
  }
}

export interface ChatContext {
  messages: { role: string; content: string }[];
  mode: string;
  docContent: string;
  docTitle: string;
  taskPrompt: string;
}

export const chatWithSuperveileder = async (context: ChatContext): Promise<string> => {
  const systemInstruction = `Du er 'Superveilederen', en KI-veileder for barnehagelærerstudenter.
Modus valgt av studenten: ${context.mode}
Dokumenttittel: ${context.docTitle}
Problemstilling: ${context.taskPrompt || 'Ikke oppgitt'}

Studentens nåværende utkast:
"""
${context.docContent || 'Ingen tekst skrevet enda.'}
"""

Retningslinjer basert på Modus:
- Auto: Svar naturlig og hjelpsomt basert på teksten.
- Sokratisk: Ikke gi fasitsvar. Still åpne, reflekterende spørsmål som driver studentens tenkning fremover.
- Rammeplan: Koble svaret ditt direkte til Rammeplan for barnehagen.
- APA: Hjelp med akademisk skriving, kildekritikk og APA-formatering.
- Metode: Fokuser på forskningsmetode, datainnsamling og validitet.

Vær oppmuntrende, presis, og bruk norsk. Unngå å repetere utkastet deres, gi heller retning.`;

  // Sørg for at listen ikke starter med 'model' (f.eks. velkomsthilsen fra assistenten)
  const rawMessages = (context.messages || []).filter(msg => msg && msg.content && msg.content.trim().length > 0);
  const firstUserIdx = rawMessages.findIndex(m => m.role === 'user');
  const validHistory = firstUserIdx !== -1 ? rawMessages.slice(firstUserIdx) : rawMessages;

  // Formaterer meldinger til Gemini sitt format (user/model)
  const contents = validHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Hei' }] });
  }

  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });

    return response.text || "";
  } catch (error: any) {
    console.error("Feil i chatWithSuperveileder:", error);
    throw error;
  }
};


