import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Checks if the API key is present before making calls.
 * Throws a descriptive error if the key is missing.
 */
function validateApiKey() {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");
  }
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const SYSTEM_INSTRUCTION = `Du er BLU-Hjelperen sin erfarne, rettferdige og analytiske "Sensor og Skrivecoach". Din absolutte rettesnor er DMMHs offisielle vurderingskriterier og nasjonale retningslinjer for oppgaveskriving i barnehagelærerutdanningen (BLU).

--- DMMH VURDERINGSKRITERIER OG NASJONALE KRAV FOR BLU ---
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
3. Retningslinjer: Referer til DMMHs ressurser som Oria, Søk og Skriv, og SIKT (personvern).
4. Kritisk tenkning: Ikke bare gi svar, men still spørsmål som fremmer studentens egen refleksjon.
5. Du skal ALDRI skrive oppgaven FOR studenten, men veilede dem i prosessen.
6. Bruk norske begreper som er relevante for barnehagesektoren.

Referanse-URL (DMMH-standard): https://www.dmmh.no/bibliotek/skrive-og-referere/skrive-bacheloroppgave`;

export async function generateAcademicResponse(prompt: string, history: any[] = [], strictness: 'supportive' | 'balanced' | 'critical' = 'balanced', profile?: any, taskSetup?: any) {
  validateApiKey();
  if (!ai) {
    throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");
  }

  const profileContext = profile ? `
  Studentinformasjon:
  - Studieprogram: ${profile.studyProgram || 'Ikke oppgitt'}
  - Studiemodell: ${profile.studyModel || 'Ikke oppgitt'}
  - Spesialisering: ${profile.specialization || 'Ikke oppgitt'}
  - Aktuelle emner: ${profile.courses || 'Ikke oppgitt'}
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
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
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
  validateApiKey();
  if (!ai) throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Analyser følgende utkast eller idé til oppgave og gi kritisk tilbakemelding basert på akademiske standarder og nasjonale krav i barnehagelærerutdanningen.
      
      Du skal vurdere teksten spesifikt opp mot disse tolv faglige kravene:
      1. Rød tråd (sc1): Er det en tydelig sammenheng mellom problemstilling og konklusjon?
      2. Begrepsbruk (sc2): Er sentrale pedagogiske begreper definert og brukt korrekt?
      3. Teori og praksis (sc3): Er teorien tydelig koblet til eksempler fra barnehagen?
      4. Kildebruk (sc4): Er påstandene mine støttet av pensum eller Rammeplanen?
      5. Referanser (sc5): Er litteraturlisten komplett og i riktig stil (APA 7)?
      6. Parafrasering (sc6): Er kildene skrevet om med egne ord for å unngå plagiat?
      7. Faglig forankring (sc7): Er påstandene støttet av spesifikke henvisninger til pensum eller Rammeplanen?
      8. DMMH-standard (sc8): Er oppsettet i tråd med kravene i håndboka for oppgaveskriving?
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
                sc8: { type: Type.BOOLEAN, description: "DMMH-standard oppfylt" },
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

export async function brainstormPerspectives(topic: string) {
  validateApiKey();
  if (!ai) throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
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
}

export async function evaluateThesis(content: string) {
  validateApiKey();
  if (!ai) throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: `Du skal nå utføre en FAGLIG VURDERING av studentens utkast. Opptre som en konstruktiv sensor og vurder teksten opp mot DMMH-kriteriene.

STRUKTUR PÅ TILBAKEMELDINGEN:

### 🌟 Helhetsinntrykk
[Ros først! Trekk frem 2-3 ting som fungerer skikkelig bra knyttet til faglig innhold.]

### 📊 Vurdering mot DMMH-kriterier
- **Problemstilling:** [Er den tydelig besvart?]
- **Rød tråd:** [Er strukturen logisk?]
- **Teori og praksis:** [Klarer studenten å analysere empiri/praksis i lys av teorien? Vises det god profesjonsrefleksjon?]
- **Formkrav:** [Er kildebruken (APA-7) og språket på akademisk nivå?]

### 🛠️ Konkrete forbedringspunkter
[Gi 2-3 krystallklare, spesifikke råd om hva som må endres for å løfte oppgaven til neste karakternivå.]

### 🎯 Veiledende nivå
**Foreløpig nivå: [Karakter A-F]**
[Gi en forsiktig indikasjon på hvilket nivå teksten ligger på nå, strengt vurdert etter DMMHs karakterskala. Minn studenten på at dette er veiledende.]

Oppgave:
${content.substring(0, 30000)}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });

  return response.text || "Kunne ikke utføre vurderingen.";
}

export async function evaluateThesisAsDevilAdvocate(content: string) {
  validateApiKey();
  if (!ai) throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
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
}

export async function analyzeWithSystemPrompt(content: string, systemPrompt: string) {
  validateApiKey();
  if (!ai) throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: content.substring(0, 30000),
    config: {
      systemInstruction: systemPrompt,
    },
  });

  return response.text || "Kunne ikke generere analyse.";
}

export async function synthesizeEvaluations(results: string[]) {
  validateApiKey();
  if (!ai) throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
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
}

export async function checkPlagiarism(content: string) {
  validateApiKey();
  if (!ai) throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: `Du skal nå utføre en INTEGRITETSSJEKK (Dyp plagiat- og KI-sjekk). Analyser teksten for "røde flagg" knyttet til KI-bruk og mangelfull kildehenvisning.

VIKTIG: Du har ikke tilgang til eksterne plagiatdatabaser. Din sjekk vurderer språklige mønstre og kildemangler, ikke direkte kildekopiering fra nettet.

STRUKTUR PÅ TILBAKEMELDINGEN:

### 🚩 KI-faresignaler
[Pek ut typiske "KI-klisjeer", overdrevent formelt språk, eller strukturer som fremstår algoritmisk generert (f.eks. "i konklusjon", "et mangfoldig teppe av", "dykke ned i").]

### 🔍 Påstander uten dekning (Plagiat-fare)
[Identifiser spesifikke faglige påstander der studenten mangler referanser. Minn om at dette bryter med DMMHs krav til etterprøvbarhet.]

### 💡 Dom og tiltak
[Gi en vennlig vurdering av om teksten føles som studentens "egen stemme", og gi ett konkret råd for å gjøre teksten mer forankret i eget faglig skjønn og barnehagefaglig profesjonsutøvelse.]

Tekst:
${content.substring(0, 30000)}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });

  return response.text || "Kunne ikke utføre plagiat-sjekk.";
}

export async function analyzeMultiPdfs(texts: { name: string, content: string }[], query?: string) {
  validateApiKey();
  if (!ai) throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");

  const combinedText = texts.map(t => `DOKUMENT: ${t.name}\nINNHOLD:\n${t.content}`).join('\n\n---\n\n');

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
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
}

export async function checkAPA7(reference: string) {
  validateApiKey();
  if (!ai) throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
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
}

export async function getMethodologyAdvice(design: string, problem: string, tool: string, phase: string, context: string) {
  validateApiKey();
  if (!ai) throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
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
}

export async function evaluateSource(sourceDescription: string) {
  validateApiKey();
  if (!ai) throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
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
}

export async function performDeepSourceAnalysis(sourceDescription: string, evaluation: any) {
  validateApiKey();
  if (!ai) throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
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
}

export async function analyzePdfContent(text: string): Promise<string> {
  validateApiKey();
  if (!ai) throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
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
}

export async function analyzeAssignmentText(text: string) {
  validateApiKey();
  if (!ai) throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
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
}

export async function performDeepPdfAnalysis(text: string, initialAnalysis: any) {
  validateApiKey();
  if (!ai) throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: `Utfør en dypanalyse av følgende PDF-innhold.
    Full tekst (utdrag): ${text.substring(0, 30000)}
    
    Fokuser på metodisk tilnærming, teoretisk dybde, kritisk blikk og forslag til anvendelse.`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });

  return response.text;
}

export async function defineTerm(term: string): Promise<string> {
  validateApiKey();
  if (!ai) throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
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
}

export async function getLiteratureSuggestions(profile: any, topic: string) {
  validateApiKey();
  if (!ai) throw new Error("Mangler API-nøkkel i miljøvariablene (.env).");

  const profileContext = profile ? `
  Studentinformasjon for spissing av pensum:
  - Studieprogram: ${profile?.studyProgram || 'Ikke oppgitt'}
  - Studiemodell: ${profile?.studyModel || 'Ikke oppgitt'}
  ` : '';

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: `Du er en spesialisert akademisk bibliotekar og veileder for barnehagelærerstudenter (BLU) i Norge, med særskilt fokus på Dronning Mauds Minne Høgskole (DMMH). Din oppgave er å foreslå relevant, anerkjent og akademisk faglitteratur basert på studentens problemstilling eller tema: "${topic}".

${profileContext}

FØLG DISSE REGLENE STRENGT:
1. Pensum-fokus (DMMH): Du SKAL prioritere å hente faglitteratur som finnes på de offisielle pensumlistene til DMMH (https://www.dmmh.no/bibliotek/pensum). Foreslå litteratur som er standard på utdanningen (f.eks. forfattere som Bae, Hundeide, Moser, Lillemyr, etc.).
2. Rammeplanen: Du MÅ alltid inkludere konkrete forslag til hvordan studenten kan koble temaet sitt til "Rammeplan for barnehagen (2017)". Angi gjerne spesifikke kapitler eller fagområder i rammeplanen.
3. Kjerneområder og metode: Der det er relevant for studentens tema, hold fokus på kjernetemaer som lek, samspill og friluftsliv. I stedet for å låse deg til eller foreslå én spesifikk pedagogisk metode, skal du aktivt spørre studenten om de har valgt en særskilt metode de vil forankre oppgaven i.
4. Ingen hallusinasjoner: Du har IKKE lov til å finne på fiktive bøker, forfattere eller sidetall. Foreslå kun ekte, eksisterende litteratur. Hvis du er usikker, foreslå brede, anerkjente grunnbøker i pedagogikk.
5. Format: Bruk APA-7 standard for referansene. 

STRUKTUR PÅ SVARET DITT:
Svar nøyaktig i følgende format:

### 📚 Anbefalt faglitteratur (DMMH Pensum)
[List opp 3-4 relevante bøker/artikler i APA-7 format]
- Hvorfor denne er relevant: [Kort, presis begrunnelse på 1-2 senetninger]

### 📖 Kobling til Rammeplanen (2017)
- [Hvilket kapittel/del av rammeplanen som støtter opp under temaet, og hvorfor]

### 💡 Tips til søkeord
- [Gi studenten 3-4 gode søkeord de kan bruke i bibliotekets database (Oria) eller Google Scholar for å finne mer]

### 🔍 Videre refleksjon
[Spør studenten: "Skal oppgaven din knyttes opp mot en særskilt pedagogisk metode eller retning? Fortell meg gjerne hvilken, så kan jeg spisse litteraturforslagene enda mer mot ditt metodevalg!"]

### ⚙️ Et lite tips for bedre treff!
"Tips: Husk å legge inn **studieprogram** og **modell** i profilen din her i appen! Da kan jeg hente fram litteratur som treffer din spesifikke pensumliste enda bedre neste gang."`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });

  return response.text;
}

export async function helpWithFeedback(content: string, feedback: string) {
  if (!ai) throw new Error("Gemini API key is missing");

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
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
}
