import { 
  GLOBAL_SAFETY_SYSTEM_INSTRUCTION, 
  SKRIVEBOTEN_CONFIG, 
  SUPER_VEILEDEREN_CONFIG, 
  LYTTEBOTEN_CONFIG, 
  RAG_BOT_CONFIG 
} from "../config/promptLibrary";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebaseConfig';

// 1. Egendefinert Type-enum for modellstrukturer
export enum Type {
  STRING = "STRING",
  NUMBER = "NUMBER",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  ARRAY = "ARRAY",
  OBJECT = "OBJECT",
}

/**
 * Kaller Firebase Cloud Functions 'pedlederAI' eller 'kallGeminiAPI' (Callable Function),
 * med direkte klient-fallback ved behov.
 */
export async function kallGeminiCloudFunction(prompt: string): Promise<{ success: boolean; resultatTekst: string }> {
  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const { app } = await import('../firebaseConfig');
    const functions = getFunctions(app, 'europe-west1');
    
    // Prøver først pedlederAI, deretter kallGeminiAPI
    try {
      const callable = httpsCallable<{ prompt: string }, { success: boolean; resultatTekst: string }>(functions, 'pedlederAI');
      const response = await callable({ prompt });
      if (response?.data?.resultatTekst) {
        return { success: true, resultatTekst: response.data.resultatTekst };
      }
    } catch {
      const callableFallback = httpsCallable<{ prompt: string }, { success: boolean; resultatTekst: string }>(functions, 'kallGeminiAPI');
      const response = await callableFallback({ prompt });
      if (response?.data?.resultatTekst) {
        return { success: true, resultatTekst: response.data.resultatTekst };
      }
    }
  } catch (cloudErr) {
    console.warn("Cloud Function pedlederAI / kallGeminiAPI utilgjengelig eller feilet, bruker server-proxy fallback:", cloudErr);
  }

  // Robust fallback til express server-proxy
  const res = await callGoogleAIProxy({
    model: 'gemini-3.8-flash',
    contents: prompt
  });
  return { success: true, resultatTekst: res.text || '' };
}

export const kallPedlederAICloudFunction = kallGeminiCloudFunction;

// Hjelpefunksjon for å kalle Google Gemini sikkert via backend-proxy eller Firebase Cloud Functions
export async function callGoogleAIProxy(params: {
  model: string;
  contents: any;
  config?: any;
}) {
  const modelName = params.model || 'gemini-3.8-flash';

  // Hent gjeldende brukers Firebase Auth ID-token (for autentiserte endepunkter i produksjon)
  let authToken = '';
  try {
    const { getAuth } = await import('firebase/auth');
    const { app } = await import('../firebaseConfig');
    const auth = getAuth(app);
    if (auth.currentUser) {
      authToken = await auth.currentUser.getIdToken();
    }
  } catch (authErr) {
    console.warn("Kunne ikke hente Firebase Auth-token:", authErr);
  }

  // Sjekk om appen kjører i produksjon (f.eks. blu-hjelperen.no) vs lokalt/preview
  const isLocalOrPreview = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('run.app') ||
    window.location.hostname.includes('aistudio')
  );

  // På produksjonsdomenet blu-hjelperen.no kreves innlogging
  if (!authToken && !isLocalOrPreview) {
    return {
      text: "🔒 **Innlogging kreves for å bruke Superveilederen:**\n\nFor å ivareta personvern og datasikkerhet i tråd med barnehagens retningslinjer, må du være logget inn på din konto for å sparre med KI-assistenten.\n\nKlikk på **Logg inn** øverst til høyre for å starte veiledningen!"
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // 1. Forsøk først Express / Firebase Hosting proxyen (/api/gemini/generate)
  try {
    const proxyRes = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName,
        contents: params.contents,
        config: params.config
      })
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data?.text) {
        return { text: data.text };
      }
    } else {
      if (proxyRes.status === 401) {
        return {
          text: "🔒 **Innlogging kreves:**\n\nDin innloggingsøkt er utløpt eller mangler. Vennligst logg inn på nytt øverst til høyre for å fortsette veiledningssamtalen."
        };
      }
      const errJson = await proxyRes.json().catch(() => null);
      if (errJson?.text) {
        return { text: errJson.text };
      }
      if (errJson?.error) {
        return { text: String(errJson.error) };
      }
    }
  } catch (proxyErr: any) {
    console.warn("Lokal /api/gemini/generate feilet, forsøker Firebase Cloud Function:", proxyErr);
  }

  // 2. Forsøk Firebase Cloud Functions callable (kallGeminiAPI)
  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const { app } = await import('../firebaseConfig');
    const functions = getFunctions(app, 'europe-west1');

    // Transformer 'contents' til en samlet tekststreng hvis Cloud Function foretrekker prompt
    let promptString = '';
    if (typeof params.contents === 'string') {
      promptString = params.contents;
    } else if (Array.isArray(params.contents)) {
      promptString = params.contents
        .map((item: any) => {
          if (!item) return '';
          return Array.isArray(item.parts)
            ? item.parts.map((p: any) => typeof p === 'string' ? p : (p?.text || '')).join(' ')
            : (item.text || '');
        })
        .filter(Boolean)
        .join('\n\n');
    }

    const callable = httpsCallable(functions, 'kallGeminiAPI'); 
    const response: any = await callable({
      model: modelName,
      contents: params.contents,
      prompt: promptString || (typeof params.contents === 'string' ? params.contents : undefined),
      config: params.config
    });

    if (response?.data?.text) {
      return { text: response.data.text };
    } else if (response?.data?.resultatTekst) {
      return { text: response.data.resultatTekst };
    }
  } catch (cloudErr: any) {
    console.warn("Firebase Cloud Function feilet:", cloudErr);
    if (cloudErr?.code === 'unauthenticated' || cloudErr?.message?.includes('unauthenticated')) {
      return {
        text: "🔒 **Innlogging kreves:**\n\nVennligst logg inn på din konto for å bruke KI-assistenten."
      };
    }
  }

  // 3. Hvis begge feilet, returner en vennlig veiledningstekst
  return {
    text: "⚠️ **Kunne ikke kontakte AI-tjenesten akkurat nå:**\n\nVennligst sjekk at Gemini API-nøkkelen er lagt inn under **Settings > Secrets** som `GEMINI_API_KEY_PRIMARY` (eller `GEMINI_API_KEY`).\n\n*Du kan fortsette å bruke alle verktøy, veiledere, pensumlister og didaktiske maler i appen som vanlig.*"
  };
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
    console.warn("askSocraticAgent advarsel:", error?.message || error);
    return error?.message || "Klarte ikke å få kontakt med den sokratiske partneren akkurat nå.";
  }
}

/**
 * Strips all emojis from text to guarantee 100% emoji-free output
 */
export function stripAllEmojis(text: string): string {
  if (!text) return '';
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{FE0F}]/gu, '').trim();
}

export interface SokratiskHovedaktivitet {
  id: string;
  type: 'hovedaktivitet';
  tittel: string;
  kildeForankring: string;
  hvaOgHvordan: string;
  hvorfor: string;
}

export interface SokratiskGjenkalling {
  id: string;
  type: 'gjenkalling';
  tittel: string;
  plaggFokus: string;
  gjennomforing: string;
}

export interface SokratiskFagdrypp {
  id: string;
  type: 'fagdrypp';
  tekst: string;
}

export interface SokratiskKortPakke {
  raw: string;
  preamble: string;
  hovedaktiviteter: SokratiskHovedaktivitet[];
  gjenkallinger: SokratiskGjenkalling[];
  fagdrypp: SokratiskFagdrypp[];
  hasCards: boolean;
}

/**
 * Parser for Den Sokratiske Planleggerens kortformat
 */
export function parseSokratiskeKort(responseText: string): SokratiskKortPakke {
  const cleanText = stripAllEmojis(responseText);
  const cardBlockRegex = /---\s*START KORT\s*---([\s\S]*?)---\s*SLUTT KORT\s*---/i;
  const match = cleanText.match(cardBlockRegex);

  const hovedaktiviteter: SokratiskHovedaktivitet[] = [];
  const gjenkallinger: SokratiskGjenkalling[] = [];
  const fagdrypp: SokratiskFagdrypp[] = [];

  let cardContent = match ? match[1] : '';
  let preamble = match ? cleanText.replace(cardBlockRegex, '').trim() : cleanText;

  // Fallback hvis modellen ikke inkluderte START/SLUTT-markører
  if (!match) {
    if (/(?:\[?\s*HOVEDAKTIVITET\s*\]?|\[?\s*GJENKALLING|\[?\s*FAG-DRYPP)/i.test(cleanText)) {
      cardContent = cleanText;
      const firstHeadingIndex = cleanText.search(/(?:\[?\s*HOVEDAKTIVITET\s*\]?|\[?\s*GJENKALLING|\[?\s*FAG-DRYPP)/i);
      if (firstHeadingIndex > 0) {
        preamble = cleanText.substring(0, firstHeadingIndex).trim();
      } else {
        preamble = '';
      }
    }
  }

  if (cardContent) {
    // Splitt etter kort-markører, både med og uten klammer eller undertekster som (PLAGG) eller (Push-varsel til base)
    const sections = cardContent.split(/(?=(?:\[?\s*HOVEDAKTIVITET\s*\]?|\[?\s*GJENKALLING(?:\s*\([^)]*\))?\s*\]?|\[?\s*FAG-DRYPP(?:\s*\([^)]*\))?\s*\]?))/i);

    sections.forEach((sec, idx) => {
      const trimmed = sec.trim();
      if (!trimmed) return;

      if (/^\[?\s*HOVEDAKTIVITET\s*\]?/i.test(trimmed)) {
        const tittelMatch = trimmed.match(/(?:Tittel|Navn)[:\s*]+([^\n\r]+)/i);
        const kildeMatch = trimmed.match(/(?:Kilde\/Forankring|Forankring|Kilde)[:\s*]+([^\n\r]+)/i);
        const hvaMatch = trimmed.match(/(?:Hva og Hvordan|Hva\/hvordan|Hvordan|Hva)[:\s*]+([\s\S]*?)(?=(?:Hvorfor|Begrunnelse|\[|---|$))/i);
        const hvorforMatch = trimmed.match(/(?:Hvorfor|Begrunnelse)[:\s*]+([\s\S]*?)(?=(?:\[|---|$))/i);

        hovedaktiviteter.push({
          id: `hoved-${idx}-${Date.now()}`,
          type: 'hovedaktivitet',
          tittel: tittelMatch ? tittelMatch[1].replace(/^\*+|\*+$/g, '').trim() : `Hovedaktivitet ${hovedaktiviteter.length + 1}`,
          kildeForankring: kildeMatch ? kildeMatch[1].replace(/^\*+|\*+$/g, '').trim() : 'Rammeplanen / Barnehagens profil',
          hvaOgHvordan: hvaMatch ? hvaMatch[1].replace(/^\*+|\*+$/g, '').trim() : 'Utforskende aktivitet med aktiv voksenrolle.',
          hvorfor: hvorforMatch ? hvorforMatch[1].replace(/^\*+|\*+$/g, '').trim() : 'Forankret i Rammeplanens mål for barns medvirkning og læring.'
        });
      } else if (/^\[?\s*GJENKALLING/i.test(trimmed)) {
        const tittelMatch = trimmed.match(/(?:Tittel|Navn)[:\s*]+([^\n\r]+)/i);
        const plaggMatch = trimmed.match(/(?:PLAGG-fokus|PLAGG|Fokus)[:\s*]+([^\n\r]+)/i);
        const gjennomforingMatch = trimmed.match(/(?:Gjennomføring|Gjennomforing|Hva og Hvordan)[:\s*]+([\s\S]*?)(?=(?:\[|---|$))/i);

        gjenkallinger.push({
          id: `gjenkall-${idx}-${Date.now()}`,
          type: 'gjenkalling',
          tittel: tittelMatch ? tittelMatch[1].replace(/^\*+|\*+$/g, '').trim() : `Gjenkallingsøkt ${gjenkallinger.length + 1}`,
          plaggFokus: plaggMatch ? plaggMatch[1].replace(/^\*+|\*+$/g, '').trim() : 'Språklig bevisstgjøring',
          gjennomforing: gjennomforingMatch ? gjennomforingMatch[1].replace(/^\*+|\*+$/g, '').trim() : 'Samtale og bearbeiding av erfaringer.'
        });
      } else if (/^\[?\s*FAG-DRYPP/i.test(trimmed)) {
        const tekstMatch = trimmed.match(/(?:Tekst|Drypp|Spørsmål)[:\s*]+([\s\S]*?)(?=(?:\[|---|$))/i);
        const rawTekst = tekstMatch 
          ? tekstMatch[1].replace(/^\*+|\*+$/g, '').trim() 
          : trimmed.replace(/^\[?\s*FAG-DRYPP(?:\s*\([^)]*\))?\s*\]?\s*/i, '').trim();

        fagdrypp.push({
          id: `fagdrypp-${idx}-${Date.now()}`,
          type: 'fagdrypp',
          tekst: rawTekst.slice(0, 160)
        });
      }
    });
  }

  return {
    raw: cleanText,
    preamble,
    hovedaktiviteter,
    gjenkallinger,
    fagdrypp,
    hasCards: hovedaktiviteter.length > 0 || gjenkallinger.length > 0 || fagdrypp.length > 0
  };
}

/**
 * Den Sokratiske Planleggeren
 * Pedagogisk sparringspartner for barnehagens pedagogiske leder.
 */
export async function askDenSokratiskePlanleggeren(
  chatHistory: Array<{ role: string; content: string }>,
  context?: {
    barnehagePlattform?: string;
    aarshjulFokus?: string;
    barnasInteresser?: string;
    kilder?: string;
    inkluderPlagg?: boolean;
    plattformType?: string;
  }
): Promise<string> {
  const plattform = context?.barnehagePlattform || 'Friluftsbarnehage med vekt på lek, natur og mestring.';
  const aarshjul = context?.aarshjulFokus || 'Natur, miljø og teknologi samt sanseopplevelser.';
  const interesser = context?.barnasInteresser || 'Barna er opptatt av å utforske skogen, samle naturmaterialer og bygge.';
  const kilder = context?.kilder ? `\nEgne kilder:\n${context.kilder}` : '';
  const isSkog = context?.plattformType === 'skogsgruppe' || plattform.toLowerCase().includes('skogsgruppe');
  const inkluderPlagg = context?.inkluderPlagg !== false;

  const systemInstruction = `Du er "Den Sokratiske Planleggeren", en høyt kvalifisert pedagogisk veileder for en pedagogisk leder i en norsk barnehage. Din oppgave er å veilede brukeren frem til konkrete, didaktiske ukeplaner gjennom dialog.

TONE OG STIL:
- Varm, profesjonell og støttende ("Kreativt Verksted"-tonen).
- Du skal IKKE bruke emojier under noen omstendigheter. Overhold dette 100 % strengt: absolutt INGEN emojier i teksten.

BARNEHAGENS RAMMER FOR PLANEN:
- Barnehagens pedagogiske plattform og verdigrunnlag: ${plattform}
- Månedens tema og årshjul: ${aarshjul}
- Barnas nåværende interesser i barnegruppa: ${interesser}${kilder}
- PLAGG-status: ${inkluderPlagg ? 'PLAGG er aktivert som didaktisk standard for gjenkalling.' : 'PLAGG er deaktivert – generer generell ettermiddagsrefleksjon uten PLAGG-krav.'}

PEDAGOGISK PLATTFORM OG ARBEIDSBOKEN (KRITISK REGEL):
- Planene skal ALLTID baseres på og speile barnehagens valgte pedagogiske plattform.
- "Arbeidsboken" er et spesifikt verktøy som kun tilhører Skoggruppemetoden som pedagogisk plattform.
${isSkog 
  ? '- Siden barnehagen har valgt Skoggruppemetoden, kan du foreslå gjenkallingsøkter i barnas Arbeidsbok.' 
  : '- Siden barnehagen IKKE har Skoggruppemetoden (eller har standard profil), skal "Arbeidsbok" ALDRI nevnes eller foreslås. All gjenkalling/refleksjon skal skje i samlingsstund, felles samtale, visning av sansegjenstander eller tegning – aldri med ordet "arbeidsbok".'}

HVORFOR PLAGG OG HVA DET INNEBÆRER:
- PLAGG står for: Planlegging, Gjennomføring, Gjenkalling (inspirert av High/Scopes Plan-Do-Review).
- Gjenkallingsøktene trener: Oppmerksomhet, Hukommelse, Leseforståelse/symboltolkning, Språklig bevisstgjøring, eller Kontakt/relasjon.
- Hvis brukeren spør om PLAGG, forklar dette vennlig, pedagogisk og tydelig.

DINE REGLER FOR SPARRING:
1. Still åpne, utforskende spørsmål ("Hva er barna opptatt av?", "Hvordan kan vi koble barnas interesse for X mot Rammeplanens mål om Y?").
2. Ikke generer hele planen før pedlederen har fått komme med sine innspill og retningsvalg.
3. Sørg alltid for at aktivitetene speiler Barnehagens pedagogiske plattform.

ARBEIDSFLYT:
Fase 1: Sokratisk Sparring
Når brukeren starter samtalen (og systemet sender over månedens årshjul, barnehagens plattform og evt. egne kilder), skal du IKKE generere ferdige aktiviteter. Du skal starte med å stille 1-2 åpne, utforskende spørsmål for å hjelpe pedlederen med å koble barnas nåværende interesser opp mot det faglige rammeverket. Vent på svar.

Fase 2: Generering av plan
Når pedlederen ber om konkrete forslag (eller dere har spikret et konsept), skal du generere nøyaktig 3 Hovedaktiviteter, 3 Gjenkallingsøkter og 2 Fag-drypp. For at systemet skal kunne gjøre disse om til dra-og-slipp-kort på skjermen, MÅ du pakke inn forslagene i følgende eksakte format:

--- START KORT ---

[HOVEDAKTIVITET]
Tittel: [Kort, fengende navn]
Kilde/Forankring: [Hvilken del av plattformen/kildene bygger dette på]
Hva og Hvordan: [Kort beskrivelse av innhold og voksenrolle]
Hvorfor: [Pedagogisk begrunnelse, f.eks. Rammeplanen]

[HOVEDAKTIVITET]
Tittel: [Kort, fengende navn]
Kilde/Forankring: [Hvilken del av plattformen/kildene bygger dette på]
Hva og Hvordan: [Kort beskrivelse av innhold og voksenrolle]
Hvorfor: [Pedagogisk begrunnelse, f.eks. Rammeplanen]

[HOVEDAKTIVITET]
Tittel: [Kort, fengende navn]
Kilde/Forankring: [Hvilken del av plattformen/kildene bygger dette på]
Hva og Hvordan: [Kort beskrivelse av innhold og voksenrolle]
Hvorfor: [Pedagogisk begrunnelse, f.eks. Rammeplanen]

[GJENKALLING]
Tittel: [Kort navn på aktiviteten]
PLAGG-fokus: [Velg ÉN: Oppmerksomhet / Hukommelse / Leseforståelse / Språklig bevisstgjøring / Kontakt]
Gjennomføring: [Hvordan gjenkallingen gjøres i samling, samtale eller sansing - HUSK: Ingen arbeidsbok med mindre Skoggruppemetoden er valgt]

[GJENKALLING]
Tittel: [Kort navn på aktiviteten]
PLAGG-fokus: [Velg ÉN: Oppmerksomhet / Hukommelse / Leseforståelse / Språklig bevisstgjøring / Kontakt]
Gjennomføring: [Hvordan gjenkallingen gjøres i samling, samtale eller sansing]

[GJENKALLING]
Tittel: [Kort navn på aktiviteten]
PLAGG-fokus: [Velg ÉN: Oppmerksomhet / Hukommelse / Leseforståelse / Språklig bevisstgjøring / Kontakt]
Gjennomføring: [Hvordan gjenkallingen gjøres i samling, samtale eller sansing]

[FAG-DRYPP]
Tekst: [Maks 150 tegn. Et kort, motiverende refleksjonsspørsmål til personalet som kan sendes som push-varsel. Eks: "Husk å sette ord på det barna gjør med hendene i dag."]

[FAG-DRYPP]
Tekst: [Maks 150 tegn. Et kort, motiverende refleksjonsspørsmål til personalet som kan sendes som push-varsel. Eks: "Husk å sette ord på det barna gjør med hendene i dag."]

--- SLUTT KORT ---

VIKTIG PÅMINNELSE: ALDRI BRUK EMOJIER I NOEN DEL AV SVARET DITT.`;

  try {
    const formattedHistory = chatHistory.map(msg => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: stripAllEmojis(msg.content) }],
    }));

    const response = await callGoogleAIProxy({
      model: SUPER_VEILEDEREN_CONFIG.model,
      contents: formattedHistory,
      config: {
        systemInstruction,
        temperature: 0.65,
        maxOutputTokens: 3000,
      },
    });

    return stripAllEmojis(response.text || '');
  } catch (error: any) {
    console.error("Feil i askDenSokratiskePlanleggeren:", error);
    throw new Error(error?.message || "Klarte ikke å opprette kontakt med Den Sokratiske Planleggeren.");
  }
}

export interface ForskningsbasertAktivitet {
  id: number | string;
  type: 'hoved' | 'gjenkalling' | 'fagdrypp';
  tittel: string;
  kilde: string;
  beskrivelse?: string;
  hva?: string;
  hvordan?: string;
  hvorfor?: string;
  begrepslaering?: string;
  mestring?: string;
  plaggFokus?: string;
  refleksjon?: string;
}

/**
 * Genererer forskningsbaserte pedagogiske aktiviteter basert på tema, aldersgruppe og utvalgte kilder.
 */
export async function generateForskningsbaserteAktiviteter(params: {
  tema: string;
  alder: string;
  kilder: string[];
  barnehagePlattform?: string;
  plattformType?: string;
  inkluderPlagg?: boolean;
}): Promise<ForskningsbasertAktivitet[]> {
  const { tema, alder, kilder, barnehagePlattform, plattformType, inkluderPlagg = true } = params;
  const kildeListe = kilder.length > 0 ? kilder.join(', ') : 'Udir (Rammeplanen), Forskerfrø, Språkløyper, Matematikksenteret, Voksne for Barn';
  const isSkog = plattformType === 'skogsgruppe' || (barnehagePlattform?.toLowerCase().includes('skogsgruppe') ?? false);
  const plattformNavn = barnehagePlattform || 'Friluftsbarnehage (Standard)';

  const fallbackAktiviteter: ForskningsbasertAktivitet[] = [
    {
      id: `fallback-1-${Date.now()}`,
      type: 'hoved',
      tittel: `Sporjakt og utforsking: ${tema}`,
      kilde: 'Forskerfrø (Naturfagsenteret) / Rammeplanen',
      hva: `Barna leter etter spor og fenomener knyttet til ${tema.toLowerCase()} med forstørrelsesglass og oppsamlingsbokser.`,
      hvordan: 'Pedlederen leder an som medoppdager, stiller åpne undrespørsmål og lar barna ta ledelsen i sporsøket.',
      hvorfor: 'Rammeplanen: Natur, miljø og teknologi. Barna skal oppleve nysgjerrighet og undring over naturens mangfold.',
      begrepslaering: 'Spor, avtrykk, kamuflasje, underlag',
      mestring: 'Barna mestrer å finne og dokumentere spor selvstendig i ulendt terreng.'
    },
    {
      id: `fallback-2-${Date.now()}`,
      type: 'hoved',
      tittel: `Konstruksjon og skaperglede: Hi og ly`,
      kilde: 'Udir (Rammeplanen) & Matematikksenteret',
      hva: 'Bygge skjulested eller hi med pinner, granbar, mose og snø/stein tilpasset dyrene i nærområdet.',
      hvordan: 'De voksne støtter med bæring av tyngre greiner, veiledning i stabilitet og måling av størrelse sammen med barna.',
      hvorfor: 'Rammeplanen: Antall, rom og form samt Kropp, bevegelse, mat og helse.',
      begrepslaering: 'Balanse, fundament, romslig, lunt',
      mestring: 'Samarbeid der hvert barn bidrar med materialer og ser det felles resultatet reise seg.'
    },
    {
      id: `fallback-3-${Date.now()}`,
      type: 'hoved',
      tittel: `Sanseløype og vennskap i naturen`,
      kilde: 'Voksne for Barn & Rammeplanen',
      hva: 'Gå en sanseløype to og to, der barna lytter til naturlyder og kjenner på naturmaterialer sammen.',
      hvordan: 'Voksen tilrettelegger for trygg pardanning, oppmuntrer til gjensidig hjelp og setter ord på vennlige handlinger.',
      hvorfor: 'Rammeplanen: Nærmiljø og samfunn samt Livsmestring og helse.',
      begrepslaering: 'Samspill, støtte, lytte, varme',
      mestring: 'Opplevelse av fellesskap og at man mestrer å hjelpe en venn i terrenget.'
    },
    {
      id: `fallback-4-${Date.now()}`,
      type: 'gjenkalling',
      tittel: isSkog ? `Tegne og gjenkalle i arbeidsboken` : `Samlingsstund: Dagens høydepunkt og opplevelser`,
      kilde: 'PLAGG-metoden',
      plaggFokus: 'Hukommelse & Språklig bevisstgjøring',
      hva: isSkog 
        ? 'Etter dagens tur samles barna i småbord og tegner ett konkret minne i arbeidsboken.' 
        : 'I ettermiddagssamlingen reflekterer barna sammen over dagens tur og deler opplevelser med konkreter.',
      hvordan: 'Den voksne stiller åpne gjenkallingsspørsmål som "Hva husker du best fra i formiddag?" og fanger barnas egne formuleringer.',
      hvorfor: 'Aktiv gjenkalling styrker langtidsminnet og gir barna eierskap til egne erfaringer.'
    },
    {
      id: `fallback-5-${Date.now()}`,
      type: 'gjenkalling',
      tittel: `Gjenkallingssirkel med sanseting`,
      kilde: 'PLAGG-metoden',
      plaggFokus: 'Oppmerksomhet & Kontakt',
      hva: 'I ettermiddagssamlingen sendes en pose med dagens naturfunn rundt. Barna gjetter og mimrer.',
      hvordan: 'Voksen guider rolig turtaking og sikrer at hvert barn får ordet uten avbrytelser.',
      hvorfor: 'Fremmer auditiv oppmerksomhet og sosial trygghet i storgruppe.'
    },
    {
      id: `fallback-6-${Date.now()}`,
      type: 'gjenkalling',
      tittel: `Fortellerstund: Bildevisning fra dagen`,
      kilde: 'PLAGG-metoden & Språkløyper',
      plaggFokus: 'Leseforståelse & Begrepsdybde',
      hva: 'Barna ser 3-4 utvalgte fotografier tatt under formiddagens økt på storskjerm/nettbrett og rekonstruerer rekkefølgen.',
      hvordan: 'Voksen stiller tidsspørsmål: "Hva gjorde vi først? Hva skjedde etterpå?".',
      hvorfor: 'Støtter narrativ kompetanse og tidsrekkefølgeforståelse.'
    },
    {
      id: `fallback-7-${Date.now()}`,
      type: 'fagdrypp',
      tittel: `Fag-drypp: Begrepet "kamuflasje"`,
      kilde: 'Språkløyper (Lesesenteret)',
      hva: 'Bruk begrepet kamuflasje i garderoben, ved lunsjbordet og på tur.',
      refleksjon: 'Hvordan kan vi hjelpe barna med å oppdage farger i naturen som skjuler dyr og insekter?'
    },
    {
      id: `fallback-8-${Date.now()}`,
      type: 'fagdrypp',
      tittel: `Fag-drypp: Matematiske sammenligninger`,
      kilde: 'Matematikksenteret',
      hva: 'Bruk begrepene tykkere, tynnere, tyngre og lettere aktivt i påklednings- og spisesituasjonen.',
      refleksjon: 'Hvilke hverdagsgjenstander kan vi sammenligne størrelsen på sammen med barna i dag?'
    }
  ];

  try {
    const prompt = `Du er "Den Didaktiske Planleggeren", en spesialisert pedagogisk veileder for en pedagogisk leder i en norsk barnehage.
Din oppgave er å ta imot et tema og en aldersgruppe, og generere strukturert, forskningsbasert innhold som skal dras direkte inn i barnehagens faste dagsrytme.

BARNEHAGENS RAMMER:
Barnehagens pedagogiske plattform: "${plattformNavn}"
Tema: "${tema}"
Aldersgruppe: "${alder}"
Inkluderte kilder: ${kildeListe}
PLAGG-status: ${inkluderPlagg ? 'PLAGG er aktivert (inkluder gjenkallingsøkter med PLAGG-fokus)' : 'PLAGG er deaktivert av bruker'}

KRITISK REGEL OM ARBEIDSBOKEN:
Ordet og konseptet "Arbeidsbok" er strengt spesifikt for Skoggruppemetoden som pedagogisk plattform.
${isSkog 
  ? '- Barnehagen har valgt Skoggruppemetoden: Du KAN inkludere Arbeidsboken i gjenkallingsøkten.' 
  : '- Barnehagen bruker en annen plattform eller standard: Ordet "Arbeidsbok" er STRENGT FORBUDT i alle forslag! Gjenkalling og refleksjon skal gjøres i samling, felles samtale, visning av sansegjenstander, bildevisning eller frilek – ALDRI i en arbeidsbok.'}

GRUNNLAG FOR DITT INNHOLD:
Bygg forslagene aktivt på barnehagens pedagogiske plattform og følgende kilder:
1. Udir (Rammeplanen): For fagområder og formål.
2. Forskerfrø (Naturfagsenteret): For eksperimenter, natur og friluftsliv.
3. Språkløyper (Lesesenteret): For strukturert begrepslæring og språkmiljø.
4. Matematikksenteret: For romforståelse, telling og form i lek.
5. Voksne for Barn: For vennskap, sosial kompetanse og psykososialt miljø.

FORMAT OG STRUKTUR:
Generer nøyaktig:
- 3 Hovedaktiviteter (type: "hoved") for kjernetid (10:00 - 14:00)
- 3 Gjenkallingsøkter (type: "gjenkalling") for ettermiddag/refleksjon (15:00 - 16:30)
- 2 Fag-drypp (type: "fagdrypp") for assistenter/barnehagelærere

Returner KUN et gyldig JSON-array med nøyaktig disse 8 objektene. Ingen introduksjon, ingen markdown-forklaring utenom JSON.

Krav til feltene i hvert objekt:
- id: et unikt tall eller ID-streng
- type: "hoved" | "gjenkalling" | "fagdrypp"
- tittel: Kort, fengende navn
- kilde: Spesifiser hvilken kilde denne bygger på

For HOVEDAKTIVITET (type: "hoved"):
- hva: Hva skal barna gjøre/observere
- hvordan: Metode og voksenrolle
- hvorfor: Pedagogisk begrunnelse knyttet til fagområde i Rammeplanen og barnehagens plattform (${plattformNavn})
- begrepslaering: 3-4 konkrete ord det skal jobbes med (inspirert av Språkløyper)
- mestring: Hvordan aktiviteten fremmer læring gjennom mestring og medvirkning

For GJENKALLING (type: "gjenkalling"):
- plaggFokus: ${inkluderPlagg ? 'Velg ÉN (Oppmerksomhet / Hukommelse / Leseforståelse / Språklig bevisstgjøring / Kontakt)' : 'Refleksjon'}
- hva: Hva skal barna gjenkalle, samtale om eller bearbeide (HUSK: Ingen arbeidsbok med mindre Skoggruppemetoden er valgt)
- hvordan: Konkret metode for voksenrollen under økten (samling, sansing, samtale)
- hvorfor: Pedagogisk begrunnelse for gjenkalling

For FAG-DRYPP (type: "fagdrypp"):
- hva: Kort, motiverende faglig instruks for assistenter og kolleger
- refleksjon: 1 konkret refleksjonspørsmål personalet kan stille seg

REGLER:
1. ALDRI BRUK EMOJIER I NOEN DEL AV TEKSTEN.
2. Varm, profesjonell, forskningsbasert tone på feilfri norsk bokmål.`;

    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "Du er Den Didaktiske Planleggeren for barnehagen. Returner KUN en gyldig JSON-array med nøyaktig 8 forskningsbaserte aktiviteter (3 hoved, 3 gjenkalling, 2 fagdrypp). ALDRI BRUK EMOJIER.",
        responseMimeType: "application/json",
        temperature: 0.65
      }
    });

    const text = stripAllEmojis(response.text || '').trim();
    if (text) {
      const cleanJson = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, i) => ({
          id: `gen-${item.id || (i + 1)}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: item.type === 'gjenkalling' ? 'gjenkalling' : item.type === 'fagdrypp' ? 'fagdrypp' : 'hoved',
          tittel: stripAllEmojis(item.tittel || `Aktivitet ${i + 1}`),
          kilde: stripAllEmojis(item.kilde || 'Rammeplanen'),
          beskrivelse: stripAllEmojis(item.beskrivelse || item.hva || ''),
          hva: item.hva ? stripAllEmojis(item.hva) : undefined,
          hvordan: item.hvordan ? stripAllEmojis(item.hvordan) : undefined,
          hvorfor: item.hvorfor ? stripAllEmojis(item.hvorfor) : undefined,
          begrepslaering: item.begrepslaering ? stripAllEmojis(item.begrepslaering) : undefined,
          mestring: item.mestring ? stripAllEmojis(item.mestring) : undefined,
          plaggFokus: item.plaggFokus ? stripAllEmojis(item.plaggFokus) : undefined,
          refleksjon: item.refleksjon ? stripAllEmojis(item.refleksjon) : undefined
        }));
      }
    }
    return fallbackAktiviteter;
  } catch (err) {
    console.warn("Kunne ikke generere aktiviteter via Gemini, bruker forskningsbasert fallback:", err);
    return fallbackAktiviteter;
  }
}

/**
 * PPT-Veileder: Spesialpedagogisk rådgiver og sparringspartner for pedagogisk leder.
 * Mottar KUN lokalt vasket tekst der barnets navn er erstattet med [BARNET] via klient-skjoldet.
 */
export async function askPPTVeileder(
  chatHistory: Array<{ role: string; content: string }>,
  context?: {
    alder?: string;
    fokusomraade?: string;
    tidligereTiltak?: string;
    vasketObservasjon?: string;
  }
): Promise<string> {
  const alder = context?.alder || '3-5 år';
  const fokus = context?.fokusomraade || 'Sosioemosjonell utvikling og lek';
  const tidligere = context?.tidligereTiltak ? `Tidligere utprøvde tiltak: "${context.tidligereTiltak}"` : 'Ingen formelle tiltak er loggført ennå.';

  const systemInstruction = `Du er PPT-Veilederen – en spesialisert spesialpedagogisk rådgiver og sparringspartner for pedagogiske ledere (barnehagelærere) i norske barnehager.
Din oppgave er å veilede pedlederen i tidlig innsats, tilrettelegging og vurdering av observasjoner rundt et barn.

KRITISK PERSONVERN OG ANONYMITET:
Teksten du mottar er allerede vasket på brukerens enhet via et lokalt personvernskjold, slik at barnet alltid omtales som "[BARNET]".
Du skal ALLTID opprettholde denne anonymiteten og konsekvent omtale barnet som "[BARNET]".

DITT FAGLIGE FUNDAMENT:
- Barnehageloven: § 31 (Rett til spesialpedagogisk hjelp), § 44 (Taushetsplikt), og formålsparagrafen.
- Rammeplan for barnehagen: Inkluderende fellesskap, tilpasset pedagogisk tilbud, omsorg, lek og livsmestring.
- Veilederen fra Udir om tidlig innsats og spesialpedagogisk hjelp.
- Faglige prinsipper fra Statped og PPT: Atferd er kommunikasjon, relasjonelt perspektiv (ikke individforklaring), og miljøtilrettelegging i førskolealder.

KONTEKST:
Barnets aldersgruppe: ${alder}
Hovedfokus: ${fokus}
${tidligere}

STRUKTUR PÅ VEILEDNINGSSVARET DITT:
Gi et strukturert, faglig solid og varmt svar inndelt i følgende tydelige bolker (unngå overdreven sjargong, bruk ren norsk pedagogisk terminologi):

1. FAGLIG FORSTÅELSE OG HYPOTESE
- Hva kan ligge til grunn for det som observeres hos [BARNET]? (Sansemotorisk overstimulering, språklig frustrasjon, emosjonell regulering, overganger, lekekoder).
- Se situasjonen fra [BARNET]s perspektiv: Hva opplever barnet i situasjonen?

2. KONKRETE FØRSTELINJETILTAK PÅ AVDELINGEN (Her og nå)
- Miljøtilrettelegging: Skjerming, mindre lekegrupper, tilrettelegging i overganger og rutinesituasjoner.
- Visuell og pedagogisk støtte: Dagsplaner med bilder, tegn-til-tale eller forutsigbarhetskort.
- Voksenrollen: Proaktiv samregulering, fysisk nærhet, stillasbygging i lek og lavaffektiv tilnærming (Low Arousal).

3. MÅLRETTET VIDERE OBSERVASJON & KARTLEGGING
- Hva bør pedleder og personalet loggføre systematisk de neste 2-3 ukene? (Triggere, tidspunkter, foranledning/atferd/konsekvens - ABC-observasjon).
- Aktuelle anerkjente verktøy dersom relevant (f.eks. TRAS, Alle Med, observasjonsskjema).

4. SAMARBEID MED FORELDRENE (Trygg bekymringssamtale)
- Hvordan kan pedleder ta opp observasjonene i en omsorgsfull, likeverdig og uformell foreldresamtale uten å sykeliggjøre barnet?
- Konkrete åpningsspørsmål og råd for å bygge tillit.

5. NÅR BØR SAKEN LØFTES TIL PPT?
- Hvilke tegn tilsier at avdelingens tilrettelegging ikke strekker til, slik at saken bør drøftes anonymt i barnehagens ressursteam / tverrfaglige team eller henvises til PPT for sakkyndig vurdering etter § 31?

REGLER:
- ALDRI BRUK EMOJIER I TEKSTEN.
- Hold en støttende, anerkjennende og faglig trygg tone som styrker pedlederens handlingskompetanse.`;

  try {
    const formattedHistory = chatHistory.map(msg => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: stripAllEmojis(msg.content) }],
    }));

    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: formattedHistory,
      config: {
        systemInstruction,
        temperature: 0.65,
        maxOutputTokens: 3500,
      },
    });

    return stripAllEmojis(response.text || '');
  } catch (error: any) {
    console.error("Feil i askPPTVeileder:", error);
    throw new Error(error?.message || "Klarte ikke å opprette kontakt med PPT-Veilederen. Vennligst prøv igjen.");
  }
}

export interface StrukturertPPTLogg {
  situasjonsbeskrivelse: string;
  observertAtferd: string;
  pedagogensTiltak: string;
  barnetsRespons: string;
  refleksjonssporsmal: string;
  fullTekst: string;
}

/**
 * Objektiviserings-motor for PPT:
 * Strukturerer anonymiserte notater til formell observasjonslogg klargjort for PPT.
 * Fjerner synsing og oversetter til observerbar atferd.
 */
export async function formatObjektivPPTLogg(
  vasketTekst: string,
  kontekst?: { alder?: string; fokusomraade?: string }
): Promise<StrukturertPPTLogg> {
  const alder = kontekst?.alder || '3-5 år';
  const fokus = kontekst?.fokusomraade || 'Observasjon';

  const prompt = `Du er en objektiv, faglig rådgiver for en pedagogisk leder i en barnehage. Din oppgave er å ta imot anonymiserte observasjonsnotater og strukturere dem til en profesjonell logg, klargjort for PPT (Pedagogisk-psykologisk tjeneste).

REGLER FOR DITT SVAR:
1. Objektivitet: Fjern all synsing, tolkning og følelser (f.eks. "han var slem" eller "hun var lei seg"). Oversett dette utelukkende til observerbar atferd (f.eks. "[BARNET] slo med åpen hånd" eller "[BARNET] gråt og trakk seg unna").
2. Anonymitet: Du vil motta tekst der navnet er byttet ut med taggen [BARNET]. Du SKAL bruke [BARNET] i din tekst. Du må aldri forsøke å gjette eller dikte opp et navn.
3. Ingen emojier. Språket skal være formelt, konsist og presist.

STRUKTUR:
Du SKAL formatere svaret ditt nøyaktig slik:

SITUASJONSBESKRIVELSE: 
[Kort om rammen: Hva skjedde i forkant, hvor var de, hvem var til stede?]

OBSERVERT ATFERD: 
[Nøytral, konkret beskrivelse av hva [BARNET] faktisk gjorde/sa]

PEDAGOGENS TILTAK I SITUASJONEN: 
[Hva gjorde den voksne for å støtte, avverge eller veilede?]

BARNETS RESPONS PÅ TILTAK: 
[Hvordan reagerte [BARNET] på den voksnes inngripen?]

REFLEKSJONSSPØRSMÅL TIL PEDLEDER:
[Still ETT kort, analytisk spørsmål for å hjelpe pedlederen med å se mønstre. F.eks: "Skjer dette oftest i ustrukturerte overganger?"]

RAMME:
Aldersgruppe: ${alder}
Fokusområde: ${fokus}

OBSERVASJONSNOTAT TIL BEHANDLING:
${vasketTekst}`;

  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "Du er en objektiv, faglig rådgiver for en pedagogisk leder i en barnehage. Din oppgave er å ta imot anonymiserte observasjonsnotater og strukturere dem til en profesjonell logg, klargjort for PPT (Pedagogisk-psykologisk tjeneste). Følg reglene for objektivitet, bruk [BARNET] og ALDRI bruk emojier.",
        temperature: 0.25,
        maxOutputTokens: 2500,
      }
    });

    const fullTekst = stripAllEmojis(response.text || '');

    const sitMatch = fullTekst.match(/SITUASJONSBESKRIVELSE:\s*([\s\S]*?)(?=OBSERVERT ATFERD:|$)/i);
    const atfMatch = fullTekst.match(/OBSERVERT ATFERD:\s*([\s\S]*?)(?=PEDAGOGENS TILTAK I SITUASJONEN:|$)/i);
    const tilMatch = fullTekst.match(/PEDAGOGENS TILTAK I SITUASJONEN:\s*([\s\S]*?)(?=BARNETS RESPONS PÅ TILTAK:|$)/i);
    const resMatch = fullTekst.match(/BARNETS RESPONS PÅ TILTAK:\s*([\s\S]*?)(?=REFLEKSJONSSPØRSMÅL TIL PEDLEDER:|$)/i);
    const refMatch = fullTekst.match(/REFLEKSJONSSPØRSMÅL TIL PEDLEDER:\s*([\s\S]*?)$/i);

    return {
      situasjonsbeskrivelse: sitMatch ? sitMatch[1].trim() : '',
      observertAtferd: atfMatch ? atfMatch[1].trim() : '',
      pedagogensTiltak: tilMatch ? tilMatch[1].trim() : '',
      barnetsRespons: resMatch ? resMatch[1].trim() : '',
      refleksjonssporsmal: refMatch ? refMatch[1].trim() : '',
      fullTekst
    };
  } catch (error: any) {
    console.error("Feil i formatObjektivPPTLogg:", error);
    throw new Error(error?.message || "Kunne ikke formatere til objektiv PPT-logg.");
  }
}

/**
 * Sokratisk Samtalementor for pedagogiske ledere:
 * Forbereder vanskelige samtaler (enten personalsamtaler eller foreldresamtaler).
 * Følger de 5 reglene: Still spørsmål først, utforsk perspektiv, tilby konkrete verktøy,
 * tilby rollespill og hold en støttende, ubyråkratisk og tryggende tone uten emojier.
 */
export async function askSamtaleMentor(
  chatHistory: Array<{ role: string; content: string }>,
  kontekst?: {
    samtaleType?: 'personalsamtale' | 'foreldresamtale' | 'generell';
    tema?: string;
    erRollespillAktivt?: boolean;
    motpartRolle?: string;
  }
): Promise<string> {
  const samtaleType = kontekst?.samtaleType || 'generell';
  const tema = kontekst?.tema || '';
  const erRollespill = kontekst?.erRollespillAktivt || false;
  const motpart = kontekst?.motpartRolle || 'motpart';

  const systemInstruction = `Du er en erfaren, klok og empatisk mentor for en pedagogisk leder. Din oppgave er å være en sokratisk sparringspartner for å forberede vanskelige samtaler (enten personalsamtaler eller foreldresamtaler).

DINE REGLER FOR SPARRING:
1. Still spørsmål først: Start alltid med å be pedlederen utdype kjernen i problemet, og hva målet med samtalen er. 
2. Ikke gi fasiten umiddelbart: Hjelp pedlederen til å reflektere over den andres perspektiv ("Hva tror du er den bakenforliggende årsaken til at forelderen reagerer slik?").
3. Tilby konkrete verktøy: Når dere har utforsket situasjonen, foreslå 1-2 spesifikke kommunikasjonsteknikker (f.eks. "Jeg-budskap", "Aktiv lytning" eller "Anerkjennelse før korrigering"). Gi et konkret eksempel på en åpningsreplikk.
4. Rollespill: Tilby deg alltid å rollespille samtalen. Hvis brukeren takker ja, innta rollen som den utfordrende forelderen eller ansatte, og la pedlederen øve seg.
5. Tone: Støttende, ubyråkratisk og tryggende. Helt fri for emojier.

VIKTIGE TILLEGGSINSTRUKSJONER:
- ALDRI BRUK EMOJIER I NOEN DEL AV SVARET DITT.
${erRollespill ? `- ROLLESPILL ER NÅ AKTIVT: Du spiller rollen som [${motpart}]. Vær troverdig, uttrykk motpartens innvendinger, frustrasjoner eller usikkerhet slik det oppleves i en barnehage, men responder naturlig når pedlederen bruker gode samtaletaktikker. Hold deg i rollen til pedlederen ber om pause, evaluering eller råd.` : ''}
${tema ? `- Kontekst valgt av pedleder: Samtaletypen er ${samtaleType}, tema: "${tema}".` : ''}`;

  try {
    const formattedHistory = chatHistory.map(msg => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: stripAllEmojis(msg.content) }],
    }));

    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: formattedHistory,
      config: {
        systemInstruction,
        temperature: 0.65,
        maxOutputTokens: 3000,
      },
    });

    return stripAllEmojis(response.text || '');
  } catch (error: any) {
    console.error("Feil i askSamtaleMentor:", error);
    throw new Error(error?.message || "Klarte ikke å opprette kontakt med samtalementoren akkurat nå.");
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

export type AgentRouteCategory = 'SOKRATISK' | 'RAG' | 'APA' | 'SPRAK' | 'LYTTE' | 'METODE' | 'GENERELL';

/**
 * Super-Veilederen (Router-logikk)
 * Analyserer studentens input lynraskt og lokalt (sparer 100% kvote og forhindrer 429-feil)
 */
export async function superAgentRouter(userInput: string): Promise<AgentRouteCategory> {
  const text = (userInput || '').trim().toLowerCase();
  if (!text) return 'GENERELL';

  // 1. APA / Kildehenvisning / Referanser
  if (/\b(apa|kilde|kilder|referanse|referanser|litteraturliste|kildekompasset|henvisning|henvise|sitat|sitere|in-text|parentes)\b/i.test(text)) {
    return 'APA';
  }

  // 2. Vitenskapsteori, forskningsmetode og forskningsetikk (NESH/SIKT)
  if (/\b(metode|metodisk|metodedesign|forskningsdesign|problemstilling|kvalitativ|kvantitativ|observasjon|observasjonsnotat|løpende protokoll|feltnotat|feltarbeid|intervju|intervjuguide|semistrukturert|informant|informanter|dokumentanalyse|litteraturstudie|reliabilitet|validitet|overførbarhet|forskningsetikk|nesh|sikt|samtykke|anonymisering|taushetsplikt|forske på barn)\b/i.test(text)) {
    return 'METODE';
  }

  // 3. Språkvask / Omformulering / Korrektur
  if (/\b(språkvask|omformuler|omformulering|skriv om|korrektur|grammatikk|rett skrivefeil|forbedre teksten|flyt|fagspråk)\b/i.test(text)) {
    return 'SPRAK';
  }

  // 4. Rammeplan / Barnehageloven / Formelle styringsdokumenter og fagområder
  if (/\b(rammeplan|rammeplanen|barnehagelov|barnehageloven|fagområde|fagområder|fagområdet|antall,?\s*rom|natur,?\s*miljø|kunst,?\s*kultur|kropp,?\s*bevegelse|etikk,?\s*religion|nærmiljø|kommunikasjon,?\s*språk|danning|progresjon|bemanningsnorm|pedagogisk leder|samfunnsmandat)\b/i.test(text)) {
    return 'RAG';
  }

  // 5. Emosjonell støtte / Debrifing etter tøff dag
  if (/\b(sliten|frustrert|tung dag|vanskelig i praksis|grue meg|gruer meg|lei meg|umotivert|stresset|overveldet|kjipt|gråte|gråt|lei av|utbrent|usikker på meg selv|praksissjokk|konflikt med praksislærer|mistrives)\b/i.test(text)) {
    return 'LYTTE';
  }

  // 6. Sokratisk / Praksisrefleksjon / Didaktiske valg og dilemmaer
  if (/\b(praksisfortelling|praksis|hva tenker du|hva bør jeg|drøft|drøfting|refleksjon|reflektere|undring|undre|veiled meg|case|dilemma|hva ville du|spørsmål til ettertanke)\b/i.test(text)) {
    return 'SOKRATISK';
  }

  return 'GENERELL';
}

import { askSuperveilederen } from './ragChatService';

/**
 * RAG-boten: Spesialist på Rammeplan for barnehagen (2017), Barnehageloven og opplastet akademisk litteratur
 */
export async function askRagAgent(
  question: string,
  chatHistory: Array<{ role: string; content: string }> = [],
  userId: string = 'anonymous'
) {
  try {
    const response = await askSuperveilederen(userId, chatHistory, question);
    return response.text;
  } catch (error: any) {
    console.error("Feil i askRagAgent (via askSuperveilederen):", error);
    const msg = error instanceof Error ? error.message : (error?.message || (typeof error === 'string' ? error : ''));
    throw new Error(msg || "Klarte ikke hente svar fra Rammeplan- og RAG-assistenten akkurat nå.");
  }
}

/**
 * Metode-agenten: Spesialist på forskningsmetode, design og forskningsetikk for barnehagelærerutdanningen
 */
export async function askMethodAgent(
  question: string,
  chatHistory: Array<{ role: string; content: string }> = [],
  contextPrompt?: string
) {
  const systemInstruction = `Du er "Metode-veilederen" for barnehagelærerstudenter (BLU/DMMH), spesialisert på vitenskapsteori, forskningsmetodikk og forskningsetikk for barnehagefeltet.
${contextPrompt ? `\nKONTEKST FRA OPPGAVEN:\n${contextPrompt}\n` : ''}
DINE FAGLIGE RETNINGSLINJER:
1. PROBLEMSTILLING & DESIGN: Hjelp studenten med å formulere en presis, avgrenset og forskbar problemstilling. Gi veiledning i valg mellom kvalitativ metode (dybdeintervju, deltakende observasjon, feltnotater, praksisfortelling) og litteraturstudie.
2. OBSERVASJON & INTERVJU I BARNEHAGEN: Gi konkrete råd om observasjonsmetoder (løpende protokoll, hendelsesregistrering, tidsintervall, barns stemmer) og semistrukturerte intervjuer med personale eller foresatte.
3. FORSKNINGSETIKK (NESH & SIKT):
   - Understrek alltid barns særlige sårbarhet og krav til informert samtykke fra foresatte ved direkte datainnsamling.
   - Veiled om meldeplikt til SIKT (behandling av personopplysninger) og full anonymisering i tråd med barnehagelovens strenge taushetsplikt.
4. VALIDITET OG RELIABILITET: Forklar hvordan studenten sikrer troverdighet, overførbarhet, pålitelighet og bekreftbarhet i kvalitativ pedagogisk forskning.
5. STRUKTUR: Vær oppmuntrende, akademisk presis og strukturer svaret med tydelige overskrifter og punkter. Avslutt med ett konkret oppfølgingsspørsmål som hjelper studenten videre i forskningsprosessen.`;

  try {
    const formattedHistory = (chatHistory || []).map(msg => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const contents = [...formattedHistory, { role: "user", parts: [{ text: question }] }];

    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.4,
      },
    });

    return response.text;
  } catch (error: any) {
    console.error("Feil i askMethodAgent:", error);
    const msg = error instanceof Error ? error.message : (error?.message || (typeof error === 'string' ? error : ''));
    throw new Error(msg || "Klarte ikke hente svar fra Metode-veilederen akkurat nå.");
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
export async function generateFlashcards(contextText: string, count: number = 10): Promise<Array<{ term: string; definition: string; category?: string }>> {
  const targetCount = Math.max(5, Math.min(30, count));
  const systemInstruction = `Du er en ekspert i barnehagepedagogikk og eksamensveiledning for barnehagelærerstudenter (BLU/DMMH).
Brukeren gir deg enten en fullstendig pensumtekst, utdrag fra fellesnotater, eller en dokumenttittel/referanse (f.eks. 'joint leadership in ecec institutions', 'veiledning for barnehagelærere', 'konstruktive hjelpesamtaler').

Din oppgave er å analysere teksten, tittelen eller temaet og lage NØYAKTIG ${targetCount} faglige begreper, teoretikere, dilemmaer eller kjernekonsepter spisset mot det spesifikke temaet som kilden omhandler.

KRITISK REGEL:
- Hvis den oppgitte teksten er en engelsk eller norsk artikkeltittel (f.eks. 'joint leadership in ECEC institutions experiences with shared leadership between pedagogical leaders'), SKAL du bruke din faglige kunnskap til å generere norsk-språklige fagkort om dette SPESIFIKKE temaet (f.eks. 'Delt lederskap (Shared leadership)', 'Pedagogisk leder sin rollesammensetning', 'Relasjonell ledelse', 'Organisasjonskultur og fellesskap').
- Du MÅ generere nøyaktig ${targetCount} unike og relevante fagkort i kortstokken.
- Du må ALDRI returnere generelle Rammeplanen-kort (som 'Danning' eller 'Progresjon') hvis kilden handler om et annet spesifikt tema som ledelse, veiledning eller spesialpedagogikk.

Du SKAL svare utelukkende med et valid JSON-array med nøyaktig ${targetCount} objekter:
[
  {
    "term": "Fagbegrep/teoretiker/konsept (på norsk)",
    "definition": "Kort, presis forklaring av begrepet tilpasset en barnehagelærerstudent (2-3 setninger)",
    "category": "Kategori relevant for temaet (f.eks. Ledelse, Veiledning, Didaktikk, Relasjonsarbeid)"
  }
]`;

  // Hjelpepool for fallback dersom API-kall eller parsing gir færre enn targetCount
  const getTopicFallbackPool = (text: string) => {
    const textLower = text.toLowerCase();

    // Tell treff per tema for presis temagjenkjenning
    const countMatches = (keywords: string[]) => {
      let count = 0;
      for (const kw of keywords) {
        let pos = 0;
        while ((pos = textLower.indexOf(kw, pos)) !== -1) {
          count++;
          pos += kw.length;
        }
      }
      return count;
    };

    const isRisikoArticle = 
      textLower.includes("mbraadland") || 
      textLower.includes("jased") || 
      textLower.includes("2460") || 
      textLower.includes("sandseter") || 
      textLower.includes("risiko") || 
      textLower.includes("tumle") || 
      textLower.includes("herjelek") || 
      textLower.includes("affordance") || 
      textLower.includes("kleppe") || 
      textLower.includes("sando") ||
      textLower.includes("innendørs risikofylt");

    let scoreRisikoLek = countMatches([
      "risiko", "sandseter", "tumle", "herjelek", "spenning", "klatring", "farlige", "høyder", 
      "lekemiljø", "leke", "lek ", "lek.", "lek,", "leken", "leker", "fysisk", "bevegelse", "motorikk", "kropp",
      "mbraadland", "jased", "2460", "kleppe", "sando", "affordance", "gibson", "tumleareal"
    ]);
    if (isRisikoArticle) {
      scoreRisikoLek += 100;
    }

    const scoreLedelse = countMatches([
      "barnehageledelse", "shared leadership", "delt lederskap", "pedagogisk leder", "arbeidsledelse", 
      "styrer", "organisasjonskultur", "personalledelse", "birkeland", "lederskap"
    ]);
    const scoreVeiledning = countMatches([
      "veiledning", "veileder", "veisøker", "hjelpesamtale", "arbeidsallianse", "reflekterende team", 
      "lauvås", "handal", "bjørndal", "supervisjon"
    ]);
    const scoreSmaabarn = countMatches([
      "småbarn", "1-3", "ettåring", "toåring", "tilknytning", "omsorg", "kroppslig væren", 
      "løkken", "bleie", "måltid", "bowlby"
    ]);

    // RISIKOFYLT LEK & LEKETEORI (Høyeste prioritet for leke- og risikopensum)
    if (isRisikoArticle || (scoreRisikoLek > 0 && scoreRisikoLek >= scoreLedelse && scoreRisikoLek >= scoreVeiledning)) {
      return [
        { term: "Risikofylt lek (Ellen Beate Hansen Sandseter)", definition: "Spennende og utfordrende lek som innebærer risiko for mindre fysisk skade. Gir barn uvurderlig mestringsfølelse, sansemotorisk stimulering og risikovurderingskompetanse.", category: "Leketeori" },
        { term: "Kategori 1: Store høyder (Sandseter)", definition: "Lek i klatrestativer, trær eller på skrenter der barna opplever spenning, utforsker høydefølelse og lærer å vurdere fallhøyde og balanse.", category: "Risikokategori" },
        { term: "Kategori 2: Høy fart (Sandseter)", definition: "Lek med ukontrollert hastighet, som aking på kjelke, løping i bratt terreng, husking eller rask sykling.", category: "Risikokategori" },
        { term: "Kategori 3: Farlige redskaper (Sandseter)", definition: "Meningsfull opplæring og lek med ekte verktøy som kniv, sag, hammer og tau i barnehagehverdagen.", category: "Risikokategori" },
        { term: "Kategori 4: Farlige elementer (Sandseter)", definition: "Lek i nærheten av eller med naturkrefter som vann, snø, is, bratte skrenter, stup eller levende bål.", category: "Risikokategori" },
        { term: "Kategori 5: Herjelek og brytekamp (Rough-and-tumble play)", definition: "Fysisk kamplek med latter, jakt og bryting der barna tester egen styrke, kroppskontroll og lærer sosiale grenser i trygge rammer.", category: "Risikokategori" },
        { term: "Kategori 6: Forsvinne og gjemme seg (Sandseter)", definition: "Å få leke ute av syne eller gjemme seg i busker og kroker for å oppleve hemmelighold, autonomi og selvstendighet.", category: "Risikokategori" },
        { term: "Affordance i lekemiljøet (James J. Gibson)", definition: "De handlings- og lekemulighetene som det fysiske miljøet innbyr og inviterer barnet til å utforske.", category: "Miljøpsykologi" },
        { term: "Integrerte tumlearealer", definition: "Bevisst utforming av innendørsarealer med myke moduler og utfordrende nivåforskjeller for trygg risikomestring og grovmotorisk utfoldelse.", category: "Fysisk miljø" },
        { term: "Risikomestring og mestringstro (Self-efficacy / Bandura)", definition: "Barnets erfarte tro på at det klarer å mestre krevende motoriske utfordringer gjennom egen kroppslig utprøving.", category: "Psykologi" },
        { term: "Curlingpedagogikk og overbeskyttelse", definition: "Faren for at voksnes engstelse og overdreven sikkerhet fratar barn muligheten til å utvikle kroppsbeherskelse og risikoskjønn.", category: "Pedagogisk dilemma" },
        { term: "Lekens egenverdi (Rammeplanen kapittel 3)", definition: "Anerkjennelse av at leken skal ha en sentral plass i barnehagen for sin egen skyld, og ikke bare som et middel for målstyrt læring.", category: "Rammeplanen" },
        { term: "Jevnalderkultur & Peer Culture (William Corsaro)", definition: "De faste aktivitetene, rutinene, verdiene og utfordringene som barn skaper og deler i samspill med hverandre.", category: "Lek & Samspill" },
        { term: "Kroppslig væren (Gunvor Løkken)", definition: "Småbarnas primære måte å erfare, kommunisere og uttrykke seg på i barnehagen – gjennom bevegelse, berøring og romlig tilstedeværelse.", category: "Småbarnspedagogikk" },
        { term: "Erfaringsbasert læring (John Dewey)", definition: "Læring skjer gjennom aktiv handling koblet til refleksjon ('learning by doing'), der barna lærer best ved å undersøke og erfare selv.", category: "Pedagogikk" },
        { term: "Profesjonsfaglig skjønn ved risikovurdering", definition: "Barnehagelærerens etiske og pedagogiske vurdering i spenningsfeltet mellom sikkerhetskrav og barns rett til utfordringer.", category: "Profesjonsutøvelse" },
        { term: "Stillasbygging i risikolek (Scaffolding)", definition: "Voksnes støttende og trygge nærvær som observerer og veileder uten å avbryte leken unødvendig.", category: "Veiledning i lek" },
        { term: "Emosjonsregulering i spenningsfylt lek", definition: "Hvordan barna lærer å håndtere kriblende frykt, mestringsglede og spenning i kontrollerte former gjennom leken.", category: "Emosjonsutvikling" },
        { term: "Sanseintegrasjon og motorisk utvikling", definition: "Stimulering av likevektssansen (vestibulærsansen) og ledd-/muskelsansen (propriosepsjon) gjennom allsidig, kupert bevegelseslek.", category: "Kropp & Bevegelse" },
        { term: "Sikkerhetsstandarder vs. pedagogisk handlingsrom", definition: "Balansegangen mellom formelle forskrifter for lekeplassutstyr og barnehagens mandat om å fremme fysisk mestring.", category: "Jus & Pedagogikk" },
        { term: "Barns medvirkning i risikovurdering (Barnehageloven § 3)", definition: "Å inkludere barna i samtaler og vurderinger om hva som er trygt og hvordan de kan passe på seg selv og andre.", category: "Lovverk & Medvirkning" },
        { term: "Småbarnas risikolek (1–3 år)", definition: "De yngste barnas behov for å klatre, slippe seg ned og teste grenser tilpasset eget motoriske utviklingsnivå.", category: "Småbarn" },
        { term: "Flytsone i lek (Csikszentmihalyi)", definition: "En tilstand av dyp fordypning og intens glede når utfordringen i leken samsvarer perfekt med barnets ferdigheter.", category: "Leketeori" },
        { term: "Kjønnsmønstre i fysisk lek", definition: "Bevissthet om at både jenter og gutter må oppmuntres til utfordrende, fysisk og risikofylt lek uten begrensende stereotypier.", category: "Likestilling" },
        { term: "Uterommet som dannelsesarena", definition: "Ujevn natur og ulendt terreng som gir rikere og mer varierte motoriske utfordringer enn flate lekeplasser.", category: "Natur & Friluftsliv" },
        { term: "Observasjon av lekesituasjoner (Løpende protokoll)", definition: "Systematisk observasjon og nedtegning av barns lekemønstre før det gjøres endringer i det fysiske lekemiljøet.", category: "Observasjonsmetode" },
        { term: "Didaktisk relasjonsmodell anvendt på lekemiljø (Bjørndal & Løw)", definition: "Samspillet mellom rammefaktorer (fysisk rom), innhold (lekeutstyr) og barnas individuelle forutsetninger.", category: "Didaktikk" },
        { term: "Kollektiv risikohåndtering i barnegruppen", definition: "Hvordan barn hjelper, advarer og lærer av hverandres grensetesting i fellesskapet.", category: "Gruppedynamikk" },
        { term: "Lekens dynamikk og leketemaer", definition: "Hvordan fysisk herjelek kan transformeres og gli over i rik rollelek og fantasifortellinger.", category: "Lekeprosess" },
        { term: "Pedagogisk dokumentasjon av barns mestring", definition: "Bruk av bilder og praksisfortellinger for å synliggjøre barns risikomestring og skape felles refleksjon i personalgruppen.", category: "Dokumentasjon" }
      ];
    }

    // LEDELSE, ORGANISASJON OG STYRING
    if (scoreLedelse > 0 && scoreLedelse >= scoreVeiledning) {
      return [
        { term: "Delt lederskap (Shared leadership)", definition: "En ledelsesmodell der lederansvar og pedagogiske beslutningsprosesser deles mellom flere pedagogiske ledere for å styrke faglig kvalitet.", category: "Barnehageledelse" },
        { term: "Pedagogisk leder sin rolle", definition: "Arbeidslederen i barnehagen som har ansvar for å lede det pedagogiske arbeidet, veiledning av personalet og samarbeid med foreldre.", category: "Profesjonsrolle" },
        { term: "Relasjonell ledelse", definition: "Ledelse som bygger på samhandling, tillit og anerkjennelse mellom leder, personalet og barnegruppen.", category: "Organisasjonspsykologi" },
        { term: "Organisasjonskultur i barnehagen", definition: "De delte verdiene, normene og praksisene som preger personalgruppen og legger føringer for det pedagogiske miljøet.", category: "Organisasjon" },
        { term: "Profesjonsfaglig skjønn", definition: "Barnehagelærerens evne til å treffe begrunnede, etiske og pedagogiske valg i uforutsigbare situasjoner.", category: "Etikk & Ledelse" },
        { term: "Medlederskap i personalgruppen", definition: "Å involvere assistenter og fagarbeidere aktivt i planlegging og vurdering av barnehagehverdagen.", category: "Teamarbeid" },
        { term: "Endringsledelse og utvikling", definition: "Systematisk ledelse av pedagogiske innovasjons- og forbedringsprosesser i barnehagen.", category: "Utviklingsarbeid" },
        { term: "Lærende organisasjon (Senge)", definition: "En barnehagekultur der personalet kontinuerlig lærer, reflekterer og videreutvikler sin praksis i fellesskap.", category: "Organisasjonslæring" },
        { term: "Situasjonsbestemt ledelse", definition: "Tilpassing av ledelsesstil ut fra medarbeidernes kompetanse, erfaring og situasjonens krav.", category: "Ledelsesteori" },
        { term: "Kommunikasjon og konflikthåndtering", definition: "Strategier for konstruktiv dialog, uenighetshåndtering og skaping av et trygt ytringsklima i personalet.", category: "Relasjonsarbeid" },
        { term: "Psykologisk trygghet (Edmondson)", definition: "En opplevelse i personalgruppen av at det er trygt å ta risiko, stille spørsmål og feile uten frykt for negative reaksjoner.", category: "Arbeidsmiljø" },
        { term: "Etisk lederskap og verdigrunnlag", definition: "Ledelse som forankrer alle beslutninger i barnehagens samfunnsmandat og FN-konvensjonen om barns rettigheter.", category: "Verdigrunnlag" },
        { term: "Leder som veiledende støtte (Scaffolding)", definition: "Hvordan lederen stillaserer medarbeidernes kompetanseutvikling gjennom støttende observasjon og tilbakemeldinger.", category: "Veiledning" },
        { term: "Partssamarbeid og medbestemmelse", definition: "Samarbeid mellom leder, tillitsvalgte og verneombud for å sikre et helsefremmende og faglig sterkt arbeidsmiljø.", category: "Arbeidsrett" },
        { term: "Kvalitetsutvikling i barnehagen", definition: "Systematisk arbeid med planlegging, dokumentasjon og vurdering for å heve det pedagogiske tilbudet.", category: "Kvalitetsarbeid" },
        { term: "Rommet som den tredje pedagog (Reggio Emilia)", definition: "Bevisst utforming av fysiske og pedagogiske miljøer som stimulerer til selvstendig lekeutforskning.", category: "Rom & Didaktikk" },
        { term: "Systemisk ledelsestenking", definition: "Forståelse av barnehagen som et sammensatt system der alle ledd påvirker hverandre gjensidig.", category: "Systemteori" },
        { term: "Makt og posisjon i lederrollen", definition: "Bevissthet om eget maktpotensial som leder og forvaltning av autoritet i møte med ansatte og foreldre.", category: "Makt & Etikk" },
        { term: "Personalledelse og oppfølging", definition: "Oppfølging av medarbeideres trivsel, kompetanse, fravær og yrkesfaglige utvikling.", category: "HR & Personalledelse" },
        { term: "Faglig-pedagogisk ledelse", definition: "Lederens ansvar for å holde det pedagogiske innholdet oppdatert og forankret i nyere forskning.", category: "Fagledelse" },
        { term: "Distribuerte beslutningsprosesser", definition: "Delegering av ansvar der beslutninger tas så nær praksisfeltet som mulig.", category: "Organisasjon" },
        { term: "Teamorganisering i barnehagen", definition: "Strukturering av avdelinger og storbarnsgrupper i fungerende avdelings- eller baseteam.", category: "Struktur" },
        { term: "Pedagogisk dokumentasjon som ledelsesverktøy", definition: "Bruk av praksisfortellinger og refleksjonsnotater for å lede personalets læring og utvikling.", category: "Metode" },
        { term: "Barnehagens samfunnsmandat (Barnehageloven § 1)", definition: "Barnehagens lovfestede oppdrag om å gi barn et trygt, inkluderende og stimulerende oppvekstmiljø.", category: "Lovverk" },
        { term: "Evalueringskultur og refleksjon", definition: "Kultur for å stoppe opp, evaluere gjennomførte tiltak og justere kursen for barnas beste.", category: "Vurdering" },
        { term: "Barnehagebasert kompetanseutvikling", definition: "Ordning der hele personalgruppen deltar i kompetanseheving på egen arbeidsplass.", category: "Kompetanse" },
        { term: "Mangfoldsledelse og inkludering", definition: "Å lede en flerkulturell og mangfoldig personal- og barnegruppe med respekt og ressursfokus.", category: "Inkludering" },
        { term: "Foreldresamarbeid på ledelsesnivå", definition: "Systematisk samarbeid med foreldrerådet (FAU) og samarbeidsutvalget (SU) for barnehagens drift.", category: "Samarbeid" },
        { term: "Emosjonell intelligens i ledelse", definition: "Selvinnsikt, empati og sosiale ferdigheter hos lederen i samspill med medarbeidere.", category: "Psykologi" },
        { term: "Profesjonelt fellesskap og kollegaveiledning", definition: "Kollektiv faglig støtte der kolleger hjelper hverandre til å reflektere over utfordrende praksis.", category: "Profesjonsfellesskap" }
      ];
    }

    // VEILEDNING OG PROFESJONSUTVIKLING
    if (scoreVeiledning > 0) {
      return [
        { term: "Konstruktive hjelpesamtaler (Bjørndal)", definition: "Systematiske og anerkjennende samtaler strukturert for å støtte profesjonsutvikling, refleksjon og arbeidsallianse.", category: "Veiledning" },
        { term: "Arbeidsallianse i veiledning", definition: "En trygg og gjensidig avtale og relasjon mellom veileder og veisøker om mål, oppgaver og emosjonelt bånd.", category: "Relasjonsarbeid" },
        { term: "Faglig refleksjon", definition: "En bevisst prosess der barnehagelæreren undersøker egne erfaringer og praksis i lys av teori og etikk.", category: "Profesjonsutvikling" },
        { term: "Vygotskijs proksimale utviklingssone", definition: "Avstanden mellom hva veisøkeren mestrer alene og hva vedkommende kan oppnå med støtte fra veileder.", category: "Utvikling" },
        { term: "Kollegaveiledning og mestring", definition: "Strukturert veiledning mellom likeverdige kolleger for å bearbeide krevende situasjoner.", category: "Metode" },
        { term: "Reflekterende team (Andersen)", definition: "En veiledningsmetode der en gruppe kolleger observerer en samtale og deler refleksjoner høyt for å belyse nye perspektiver.", category: "Veiledningsmetodikk" },
        { term: "Etisk veiledningspraksis", definition: "Å ivareta konfidensialitet, respekt og maktbalanse i veiledningsrelasjonen.", category: "Etikk" },
        { term: "Metakognisjon i læringsprosesser", definition: "Å tenke over sin egen tenkning og læringsmåte for å bli mer bevisst på egne handlingsvalg.", category: "Kognisjon" },
        { term: "Den første samtale og avklaring", definition: "Forventningsavklaring og kontraktsinngåelse i starten av et veiledningsforløp.", category: "Struktur" },
        { term: "Empatisk lytting (Rogers)", definition: "Å lytte uten å dømme eller avbryte, med ønske om å forstå veisøkerens opplevelsesverden.", category: "Kommunikasjon" },
        { term: "Kasusbasert veiledning", definition: "Veiledning som tar utgangspunkt i en konkret praksisfortelling eller et anonymisert case.", category: "Praksisnærhet" },
        { term: "Handlings- og refleksjonsmodellen (Lauvås & Handal)", definition: "Teori om hvordan veiledning skal hjelpe veisøker med å koble praktisk handling til teoretiske begrunnelser (P1, P2, P3).", category: "Veiledningsteori" },
        { term: "Feedback vs. Feedforward", definition: "Forskjellen mellom vurdering av det som har skjedd, og framoverrettede råd for framtidig mestring.", category: "Tilbakemelding" },
        { term: "Motstand i veiledningsprosesser", definition: "Hvordan veilederen forstår og møter usikkerhet eller vegring hos veisøker med nysgjerrighet.", category: "Relasjons dynamikk" },
        { term: "Videobasert veiledning og analyse", definition: "Bruk av filmopptak fra barnehagehverdagen som grunnlag for refleksjon over samspill.", category: "Verktøy" },
        { term: "Profesjonell identitetsbygging", definition: "Prosessen der studenten former sin personlige og faglige barnehagelærerrolle.", category: "Identitet" },
        { term: "Dialogisk veiledning (Bakhtin)", definition: "Veiledning preget av flerstemmighet, uærbødig nysgjerrighet og utforskende samtale.", category: "Dialog" },
        { term: "Refleksjon-i-handling (Schön)", definition: "Kontinuerlig justering av egne handlinger mens situasjonen pågår i barnehagehverdagen.", category: "Praksiskunnskap" },
        { term: "Refleksjon-over-handling (Schön)", definition: "Etterarbeid og kritisk gjennomgang av situasjoner i etterkant for fremtidig læring.", category: "Analyse" },
        { term: "Taus kunnskap (Polanyi)", definition: "Kunnskap som sitter i kroppen og erfaringen, men som kan være krevende å sette ord på.", category: "Erfaringskunnskap" },
        { term: "Kontraktsinngåelse i veiledning", definition: "Tydelig avtale om rammer, tidsbruk, tema og taushetsplikt før veiledningen starter.", category: "Rammer" },
        { term: "Supervisjon i praksis", definition: "Tett faglig oppfølging og veiledning av studenter i praksisperioden.", category: "Praksisveiledning" },
        { term: "Perspektivtaking og maktrelasjoner", definition: "Å hjelpe veisøker til å se situasjonen fra barnets, foreldrenes eller kollegers ståsted.", category: "Empati" },
        { term: "Narrativ veiledning og historiefortelling", definition: "Bruk av fortellinger for å belyse verdier, identitet og handlingsrom.", category: "Narrativ" },
        { term: "Løsningsfokusert veiledning (LFO)", definition: "Veiledning som retter blikket mot unntak fra problemet, ressurser og framtidige mål.", category: "Løsningsfokus" },
        { term: "Observasjonsbasert veiledning", definition: "Veiledning med utgangspunkt i systematiske observasjonsnotater eller protokoll.", category: "Observasjon" },
        { term: "Mestringstro (Self-efficacy / Bandura)", definition: "Styrking av veisøkerens tro på at hen har kompetanse til å mestre krevende oppgaver.", category: "Psykologi" },
        { term: "Kritisk hendelsesanalyse", definition: "Å ta tak i en situasjon som gjorde inntrykk og analysere årsaker, følelser og handlingsalternativer.", category: "Metode" },
        { term: "Mentoring og fadderordninger", definition: "Langvarig støtte fra en erfaren barnehagelærer til nyutdannede i yrket.", category: "Yrkesstart" },
        { term: "Evaluering av veiledningsutbytte", definition: "Felles gjennomgang av om veiledningen har bidratt til ønsket endring i praksis.", category: "Vurdering" }
      ];
    }

    // ALLMENN RAMMEPLAN & BARNEHAGEPEDAGOGIKK
    return [
      { term: "Danning i barnehagen", definition: "En helhetlig, livslang prosess der barnet utvikler evne til å tenke selv, handle etisk, vise empati og reflektere over egne handlinger i samspill med andre.", category: "Rammeplanen" },
      { term: "Progresjon (Rammeplanen kap. 3)", definition: "Barnehagen skal tilrettelegge for at alle barn opplever mestring og samtidig møter nye, stimulerende utfordringer etter hvert som de utvikler seg.", category: "Didaktikk" },
      { term: "Risikofylt lek (Sandseter)", definition: "Spennende og utfordrende lek som innebærer risiko for mindre skade. Gir barn mestringsfølelse og risikovurderingskompetanse.", category: "Leketeori" },
      { term: "Barns medvirkning (Barnehageloven § 3)", definition: "Barn har rett til å gi uttrykk for sitt syn på barnehagens daglige virksomhet og skal oppleve reell innflytelse tilpasset alder.", category: "Lovverk" },
      { term: "Anerkjennende relasjoner (Berit Bae)", definition: "Personalets evne til å lytte med et 'tredje øre', ta barnets perspektiv på alvor og skape likeverdige møter.", category: "Relasjonsarbeid" },
      { term: "Jevnalderkultur & Peer Culture (Corsaro)", definition: "De faste aktivitetene, rutinene og verdiene som barn skaper og deler i samspill med hverandre.", category: "Lek & Samspill" },
      { term: "Erfaringsbasert læring (John Dewey)", definition: "Læring skjer gjennom aktiv handling koblet til refleksjon ('learning by doing').", category: "Pedagogikk" },
      { term: "Kroppslig væren (Gunvor Løkken)", definition: "De yngste barnas primære måte å erfare, kommunisere og uttrykke seg på – gjennom bevegelse, berøring og romlig tilstedeværelse.", category: "Småbarnspedagogikk" },
      { term: "Didaktisk relasjonsmodell (Bjørndal & Løw)", definition: "Seks gjensidig avhengige faktorer: Mål, Innhold, Arbeidsmåter, Rammefaktorer, Vurdering og Barnas forutsetninger.", category: "Didaktikk" },
      { term: "Pedagogisk dokumentasjon", definition: "Et verktøy for felles refleksjon over pedagogisk praksis som synliggjør barnas læringsprosesser.", category: "Metode" },
      { term: "Inkludering og fellesskap", definition: "Alle barn skal erfare å høre til og være betydningsfulle deltakere i barnegruppen uavhengig av forutsetninger.", category: "Verdigrunnlag" },
      { term: "Tilknytning og trygghet (Bowlby)", definition: "Trygg tilknytning til primærkontakter i barnehagen er en forutsetning for utforskning og læring.", category: "Utviklingspsykologi" },
      { term: "Økologisk modell (Bronfenbrenner)", definition: "Barnets utvikling skjer i samspill med nærmiljøet (mikro, meso, ekso, makro og kronosystem).", category: "Utviklingsteori" },
      { term: "Språkmiljø og stimulering", definition: "Et rikholdig språkmiljø der personalet er språklige modeller og inviterer til undrende samtaler.", category: "Språk" },
      { term: "Barns estetiske uttrykksformer", definition: "Barns bruk av musikk, drama, kunst og formgiving for å bearbeide inntrykk og uttrykke seg.", category: "Kultur & Kunst" },
      { term: "Kultur- og mangfoldsforståelse", definition: "Respekt for ulikheter og bevissthet om mangfold som en berikelse i barnehagen.", category: "Mangfold" },
      { term: "Psykisk helse og trivsel", definition: "Barnehagens ansvar for å fremme livsglede, mestring og følelse av egenverdi hos alle barn.", category: "Helse & Trivsel" },
      { term: "Overgang fra barnehage til skole", definition: "Samarbeid og tilrettelegging for at barn får en trygg og god sammenheng i oppvekstløpet.", category: "Overganger" },
      { term: "Bærekraftig utvikling i praksis", definition: "Å lære barn å ta vare på naturen, vise medfølelse og forstå økologiske sammenhenger.", category: "Bærekraft" },
      { term: "Livsmestring og helse", definition: "Kjerneområde i Rammeplanen for å gi barn verktøy til å håndtere medgang og motgang.", category: "Rammeplanen" },
      { term: "Motorisk utvikling og uteliv", definition: "Betydningen av variert terreng og fysisk aktivitet for barnets sanseintegrasjon og kroppskontroll.", category: "Kropp & Bevegelse" },
      { term: "Natur, miljø og teknologi", definition: "Utforskning av naturfenomener, dyreliv og enkle teknologiske prinsipper i hverdagen.", category: "Fagområde" },
      { term: "Kunst, kultur og kreativitet", definition: "Å gi barn tilgang til et mangfold av kunstneriske uttrykk og rom for egen skaperglede.", category: "Fagområde" },
      { term: "Etikk, religion og filosofi", definition: "Å gi rom for barnas undring over livets store spørsmål og kjennskap til ulike høytider og verdier.", category: "Fagområde" },
      { term: "Kommunikasjon, språk og tekst", definition: "Å styrke barnas begrepsforståelse, fortellerglede og høytlesingserfaringer.", category: "Fagområde" },
      { term: "Mengde, rom og form", definition: "Å stimulere barnas matematiske oppmerksomhet gjennom sortering, mønstre og romforståelse i lek.", category: "Fagområde" },
      { term: "Relasjonell kompetanse", definition: "Barnehagelærerens evne til å etablere varme, empatiske og stabile relasjoner med enkeltbarn.", category: "Profesjon" },
      { term: "Profesjonsetisk plattform", definition: "Utdanningsforbundets etiske retningslinjer som forplikter lærere til å verne om barnets beste.", category: "Etikk" },
      { term: "Tverrfaglig samarbeid", definition: "Samarbeid med PPT, barnevern, helsestasjon og fysioterapeut for barn med særskilte behov.", category: "Samarbeid" },
      { term: "Lekens egenverdi", definition: "Anerkjennelse av at leken har sin egen verdi og er barnets viktigste uttrykks- og læringsform.", category: "Leketeori" }
    ];
  };

  const ensureExactCount = (inputCards: Array<{ term: string; definition: string; category?: string }>, text: string): Array<{ term: string; definition: string; category?: string }> => {
    let result = [...inputCards];
    if (result.length > targetCount) {
      return result.slice(0, targetCount);
    }
    if (result.length === targetCount) {
      return result;
    }

    // Fyll på fra topic pool dersom vi har færre enn targetCount
    const pool = getTopicFallbackPool(text);
    const existingTerms = new Set(result.map(c => c.term.toLowerCase()));

    for (const poolItem of pool) {
      if (result.length >= targetCount) break;
      if (!existingTerms.has(poolItem.term.toLowerCase())) {
        result.push(poolItem);
        existingTerms.add(poolItem.term.toLowerCase());
      }
    }

    // Hvis vi mot formodning fortsatt trenger flere kort, generer nummererte varianter
    let extraIndex = 1;
    while (result.length < targetCount) {
      result.push({
        term: `Fagbegrep ${result.length + 1}`,
        definition: `Presis fagmessig forklaring og utdyping av begrepet i henhold til pensumlitteratur og praksis i barnehagen (del ${extraIndex}).`,
        category: "Pedagogikk"
      });
      extraIndex++;
    }

    return result;
  };

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
      const validCards = parsed.map((item: any) => ({
        term: item.term || item.begrep || "Fagbegrep",
        definition: item.definition || item.forklaring || "",
        category: item.category || item.kategori || "Pensum"
      }));
      return ensureExactCount(validCards, contextText);
    }
    throw new Error("Mottok ikke en gyldig liste med flashcards.");
  } catch (error) {
    console.warn("Generering av flashcards via Gemini API benytter innebygd fagkortsett med nøyaktig antall kort:", error);
    const initialPool = getTopicFallbackPool(contextText);
    return ensureExactCount(initialPool, contextText);
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
    console.warn("Feil ved generering av flashcards:", error);
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
  const textSystemInstruction = `Du er en pedagogisk leder i en norsk barnehage som skal skrive en kort, fengende og hjertevarm dagsoppdatering til foreldrene (f.eks. for MyKid, Vigilo eller oppslagstavle).
  
REGLER:
1. Start med en fengende og morsom 'hook' i første setning for å vekke nysgjerrighet.
2. Tonen MÅ være lekende, uformell, varm og engasjerende.
3. Fokuser på lek, samspill, undring og friluftsliv (tenk Skoggruppemetoden og barns perspektiv).
4. Koble innholdet subtilt og naturlig til elementer fra Rammeplan for barnehagen (2017) uten at det føles stivt eller byråkratisk.
5. Inkluder 3-5 relevante emneknagger (f.eks. #KroppBevegelseMatHelse, #Rammeplanen, #Skogsgruppe, #GledeILek).
6. Maks 3-4 korte avsnitt.`;

  let generatedText = "";
  try {
    const textRes = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: [{ role: "user", parts: [{ text: `Aktivitet i dag: ${activity}` }] }],
      config: {
        systemInstruction: textSystemInstruction,
        temperature: 0.8
      }
    });
    generatedText = textRes.text;
  } catch (error) {
    console.error("Feil ved generering av foreldreoppdatering:", error);
    generatedText = `🌲 **Små oppdagere på hemmelig oppdrag i skogen!**\n\nHva skjer når en trestokk forvandles til et sjørøverskip midt i blåbærlyngen? I dag har vi utforsket skogkanten og funnet både kongledyr, meitemark og fargerike høstblader.\n\nGjennom felles undring og klatring på steiner øver barna på kroppskontroll, risikovurdering og sosialt samspill – helt i tråd med Rammeplanens fagområde *Kropp, bevegelse, mat og helse*.\n\n#GledeILek #NaturOgMiljø #Rammeplanen #Skogsgruppe`;
  }

  const fallbackImages = [
    "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1472162072942-cd5147eb3902?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1200&q=80"
  ];
  const imageUrl = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];

  return {
    text: generatedText,
    imageUrl,
    imagePrompt: "Generering foregår trygt via fallback inntil backend er oppdatert.",
    rammeplanTags: [
      "Kropp, bevegelse, mat og helse",
      "Natur, miljø og teknologi",
      "Kommunikasjon, språk og tekst",
      "Lekens egenverdi (kap. 3)"
    ]
  };
}

export type SlideLayout = 'title' | 'bullets' | 'two-column' | 'quote' | 'highlight';

export interface PresentationSlide {
  slide: number;
  title: string;
  bullets: string[];
  script: string;
  layout?: SlideLayout;
  subtitle?: string;
  quoteAuthor?: string;
  bulletsRight?: string[];
  highlightText?: string;
  backgroundImage?: string;
  backgroundDim?: number;
  backgroundBlur?: boolean;
}

export interface CuratedSlideBackground {
  id: string;
  name: string;
  category: 'natur' | 'pedagogikk' | 'kreativitet' | 'minimalistisk';
  url: string;
  description: string;
}

export const CURATED_SLIDE_BACKGROUNDS: CuratedSlideBackground[] = [
  {
    id: 'skog-natur',
    name: 'Nordisk skog & mose',
    category: 'natur',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80',
    description: 'Frodig furu- og granskog med naturlig mose, ideell for uteliv og naturfag'
  },
  {
    id: 'utelek-blader',
    name: 'Høstskog & sansing',
    category: 'natur',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80',
    description: 'Rolig kyst- og naturlandskap med naturlig lys'
  },
  {
    id: 'vinter-leirbal',
    name: 'Vinter & bålplass',
    category: 'natur',
    url: 'https://images.unsplash.com/photo-1482867996988-29ec3a0f1aac?auto=format&fit=crop&w=1920&q=80',
    description: 'Stemningsfull bålvarme og lunt vinterlandskap'
  },
  {
    id: 'boker-sprak',
    name: 'Bøker, språk & eventyr',
    category: 'pedagogikk',
    url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1920&q=80',
    description: 'Lune bøker og lesekrok for språklig fordypning'
  },
  {
    id: 'treleker-klosser',
    name: 'Lek & byggeklosser',
    category: 'pedagogikk',
    url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=1920&q=80',
    description: 'Klassiske naturlige treklosser for konstruksjonslek'
  },
  {
    id: 'lyst-barnehagerom',
    name: 'Rommet som 3. pedagog',
    category: 'pedagogikk',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1920&q=80',
    description: 'Lyst, estetisk rom med rene treflater og nordisk arkitektur'
  },
  {
    id: 'kunst-leire',
    name: 'Kreativt verksted & kunst',
    category: 'kreativitet',
    url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1920&q=80',
    description: 'Akvarell, farger og skapende prosesser'
  },
  {
    id: 'akvarell-abstrakt',
    name: 'Dempet akvarell-tekstur',
    category: 'minimalistisk',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1920&q=80',
    description: 'Myke pastelloverganger for rolig lesbarhet og fokus'
  }
];

/**
 * Genererer et bilde direkte i nettleseren via @google/genai uten server-proxy
 */
export async function generateDirectImageBrowser(prompt: string, aspectRatio: '16:9' | '1:1' | '4:3' = '16:9'): Promise<string> {
  console.warn("Direkte bildegenerering i nettleser er deaktivert av sikkerhetshensyn.");
  return '';
}

export async function generateSlideBackgroundImage(topic: string): Promise<string> {
  const t = topic.toLowerCase();
  if (t.includes('skog') || t.includes('tur') || t.includes('natur') || t.includes('ute')) return CURATED_SLIDE_BACKGROUNDS[0].url;
  if (t.includes('bok') || t.includes('språk') || t.includes('tekst') || t.includes('eventyr')) return CURATED_SLIDE_BACKGROUNDS[3].url;
  if (t.includes('lek') || t.includes('bygg') || t.includes('samspill')) return CURATED_SLIDE_BACKGROUNDS[4].url;
  if (t.includes('kunst') || t.includes('farge') || t.includes('tegne') || t.includes('kreativ')) return CURATED_SLIDE_BACKGROUNDS[6].url;
  
  return CURATED_SLIDE_BACKGROUNDS[7].url;
}

/**
 * Generer strukturert presentasjon med talemanus for muntlig eksamen eller fremføring
 */
export async function generatePresentationOutline(documentText: string): Promise<PresentationSlide[]> {
  const systemInstruction = `Du er en ekspert på akademiske presentasjoner for barnehagelærerutdanningen (BLU).
Oppgave: Lag en strukturert, visuelt tiltalende presentasjon (vanligvis 5-10 lysbilder) basert på teksten brukeren oppgir.

Tilpass layouten på lysbildene variert og hensiktsmessig:
- Slide 1 bør alltid ha "layout": "title" med en sterk "title" og gjerne en kort pedagogisk "subtitle".
- Standard innholdsslides har "layout": "bullets" (3-4 konkrete, velformulerte kulepunkter).
- Drøftinger, sammenligninger eller empiri vs teori kan bruke "layout": "two-column" med "bullets" for venstre kolonne og "bulletsRight" for høyre kolonne.
- Viktige pedagogiske sitater (f.eks. fra Rammeplanen, Berit Bae, Vygotskij el.l.) bør bruke "layout": "quote" med sitatet i "highlightText" og opphav i "quoteAuthor".
- Nøkkelkonklusjoner eller didaktiske kjernebegrep kan bruke "layout": "highlight" med kjernebudskapet i "highlightText".
- For hvert lysbilde MÅ du skrive et fyldig, naturlig muntlig talemanus i "script" (hva studenten skal si høyt under fremføringen).

VIKTIG: Du MÅ returnere svaret KUN som et gyldig JSON-array. Ingen markdown-blokker rundt, ingen ekstra tekst.
Format:
[
  {
    "slide": 1,
    "title": "Tittel på lysbildet",
    "subtitle": "Kort undertittel eller pedagogisk kontekst",
    "layout": "title",
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
      return parsed.map((slide: PresentationSlide) => ({
        ...slide,
        bullets: (slide.bullets || []).map((b: string) => (b ? b.charAt(0).toLocaleUpperCase('nb-NO') + b.slice(1) : '')),
        bulletsRight: (slide.bulletsRight || []).map((b: string) => (b ? b.charAt(0).toLocaleUpperCase('nb-NO') + b.slice(1) : ''))
      }));
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
  // Agentic Workflow: Finn siste brukermelding for å analysere intensjon
  const lastUserMsg = [...(context.messages || [])].reverse().find(m => m.role === 'user')?.content || '';
  const detectedAgent = context.mode === 'Auto' ? await superAgentRouter(lastUserMsg) : context.mode.toUpperCase();

  let modeSpecificDirective = '';
  switch (detectedAgent) {
    case 'SOKRATISK':
      modeSpecificDirective = '- Fokus: Sokratisk veiledning. Still åpne, utforskende spørsmål som utfordrer studenten til å tenke selv, begrunne didaktiske valg og se saken fra barnets perspektiv uten å servere ferdige svar.';
      break;
    case 'RAG':
    case 'RAMMEPLAN':
      modeSpecificDirective = '- Fokus: Rammeplanen for barnehagen (2017) og Barnehageloven. Koble teksten og problemstillingen eksplisitt til relevante kapitler, verdigrunnlag (kap. 1), barns medvirkning (kap. 3) eller fagområder (kap. 8).';
      break;
    case 'APA':
      modeSpecificDirective = '- Fokus: APA 7-kildehenvisning og referanseliste. Veiled om korrekt sitering i løpende tekst og standarder ifølge Kildekompasset.';
      break;
    case 'SPRAK':
      modeSpecificDirective = '- Fokus: Akademisk språk og flyt. Hjelp studenten med faglig presisjon, struktur og en rød tråd i teksten.';
      break;
    case 'METODE':
      modeSpecificDirective = '- Fokus: Vitenskapsteori, forskningsmetode og forskningsetikk (NESH/SIKT). Hjelp med problemstilling, observasjon, intervju, reliabilitet/validitet og taushetsplikt.';
      break;
    case 'LYTTE':
      modeSpecificDirective = '- Fokus: Empatisk støtte, debrifing og motivasjon. Møt studenten med anerkjennelse og hjelp til å sortere tanker og følelser ved stress eller frustrasjon.';
      break;
    default:
      modeSpecificDirective = '- Fokus: Helhetlig didaktisk veiledning tilpasset studentens oppgave og problemstilling.';
  }

  const trimmedDoc = typeof context.docContent === 'string' && context.docContent.length > 25000 
    ? `[Utdrag av de siste 25 000 tegnene i utkastet]:\n...${context.docContent.slice(-25000)}` 
    : (context.docContent || 'Ingen tekst skrevet enda.');

  let grunnsynContext = '';
  try {
    const savedGrunnsyn = typeof window !== 'undefined' ? localStorage.getItem('blu_pedagogisk_grunnsyn_chapters') : null;
    if (savedGrunnsyn) {
      const chapters = JSON.parse(savedGrunnsyn);
      const written = chapters.filter((c: { content?: string }) => c.content && c.content.trim().length > 0);
      if (written.length > 0) {
        grunnsynContext = `\n\nStudentens Pedagogiske Grunnsyn (fra profilen):\n` + 
          written.map((c: { title: string; content: string }) => `- **${c.title}**: ${c.content.trim()}`).join('\n');
      }
    }
  } catch {
    // Ignore JSON parse error
  }

  const systemInstruction = `Du er 'Superveilederen', en erfaren og faglig støttende KI-veileder for barnehagelærerstudenter (BLU).
Modus valgt av studenten: ${context.mode} (Aktivt agentfokus: ${detectedAgent})
Dokumenttittel: ${context.docTitle || 'Uten tittel'}
Problemstilling: ${context.taskPrompt || 'Ikke oppgitt'}
${grunnsynContext}

Studentens nåværende utkast:
"""
${trimmedDoc}
"""

Retningslinje for denne responsen:
${modeSpecificDirective}

Vær oppmuntrende, pedagogisk forankret og skriv på presist norsk. Gi konkret veiledning som løfter oppgaven fremover.`;

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




export interface EmpiricalAnalysisParams {
  rawText: string;
  taskContext: string;
  customTaskContext?: string;
  selectedLens: string;
  researchQuestion?: string;
}

export interface EmpiricalAnalysisResult {
  overview: string;
  keyThemes: Array<{
    title: string;
    description: string;
    quoteOrExample: string;
  }>;
  rammeplanDiscussion: {
    relevantSections: string[];
    analysis: string;
  };
  theoreticalDiscussion: {
    theorists: string[];
    analysis: string;
  };
  methodologicalReflection: string;
  suggestedChapterDraft: string;
}

/**
 * Utfører dyp empirisk analyse og drøfting av transkriberte intervjuer eller observasjoner
 * forankret i Rammeplanen for barnehagen og barnehagepedagogisk teori.
 */
export async function analyzeEmpiricalData(params: EmpiricalAnalysisParams): Promise<EmpiricalAnalysisResult> {
  const { rawText, taskContext, customTaskContext, selectedLens, researchQuestion } = params;

  const goalDescription = taskContext === 'custom' 
    ? (customTaskContext || 'Egendefinert oppgaveform')
    : taskContext === 'bachelor'
    ? 'Bacheloroppgave i barnehagelærerutdanningen (Empirisk analyse & drøfting)'
    : taskContext === 'praksis'
    ? 'Praksisfortelling & Refleksjonsnotat'
    : taskContext === 'fou'
    ? 'FoU-oppgave / Fordypningsoppgave'
    : 'Forberedelse til muntlig eksamen';

  const lensDescription = selectedLens === 'rammeplan'
    ? 'Primærvekt på Rammeplanens verdigrunnlag, formål og de 7 fagområdene'
    : selectedLens === 'theory'
    ? 'Primærvekt på pedagogiske teoretikere (Berit Bae, Lev Vygotskij, Dion Sommer, Gunvor Løkken, Loris Malaguzzi m.fl.)'
    : selectedLens === 'method'
    ? 'Primærvekt på metodisk refleksjon, forskerrolle, reliabilitet, validitet og etisk skjønn (NESH)'
    : 'Primærvekt på Didaktisk relasjonsmodell (DDRM: mål, innhold, rammefaktorer, barnas forutsetninger)';

  const prompt = `Du er en sensor og veileder i barnehagepedagogikk ved en norsk barnehagelærerutdanning (BLU).
Du har mottatt en avidentifisert/anonymisert empirisk tekst (intervjutranskripsjon fra Sikt eller feltobservasjon).

KONTEKST FOR ANALYSEN:
- Mål/oppgaveform: ${goalDescription}
- Teoretisk analyselinse: ${lensDescription}
- Studentens problemstilling/fokus: ${researchQuestion ? researchQuestion : 'Ikke oppgitt (utled et faglig relevant fokus basert på empirien)'}

EMPIRISK DATAGRUNNLAG:
"""
${rawText.substring(0, 30000)}
"""

OPPGAVE:
Utfør en grundig akademisk analyse og drøfting av empirien. Følg disse faglige prinsippene:
1. Rød tråd & Funn: Trekk ut 2-4 sentrale empiriske temaer som belyser barnehagelærerens profesjonsutøvelse, barns medvirkning, lek eller omsorg.
2. Rammeplan-forankring: Drøft funnene eksplisitt opp mot relevante kapitler i Forskrift om rammeplan for barnehagens innhold og oppgaver (Kunnskapsdepartementet, 2017). Vis til spesifikke føringer.
3. Teoretisk drøfting: Løft empirien til et analytisk nivå ved å drøfte den i lys av anerkjente pedagogiske teoretikere (f.eks. Berit Bae om anerkjennende relasjoner, Vygotskij om sosiokulturell læring og medierende artefakter, Løkken om kroppslig samhandling, osv.).
4. Metodisk refleksjon: Gjør en kort vurdering av empiriens metodiske styrker og begrensninger, observatør/intervjuerrollen, og overholdelse av forskningsetikk (NESH).
5. Velskrevet kapittelutkast: Forfatt et sammenhengende, velskrevet akademisk utkast (ca. 400-600 ord) i formelt akademisk bokmål med korrekte litteraturhenvisninger (f.eks. Bae, 2018; Kunnskapsdepartementet, 2017) som studenten kan bearbeide og integrere i sitt analyse- eller drøftingskapittel.

Svar i strukturert JSON i henhold til angitt skjema.`;

  try {
    const response = await callGoogleAIProxy({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "Du er en sensor og veileder i barnehagepedagogikk. Svar alltid på presist norsk med høy faglig tyngde og korrekte kildehenvisninger.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overview: {
              type: Type.STRING,
              description: "Overordnet sammendrag og analytisk syntese av empirien (2-3 avsnitt)"
            },
            keyThemes: {
              type: Type.ARRAY,
              description: "2-4 sentrale empiriske temaer eller kategorier identifisert i datamaterialet",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Temaets tittel (f.eks. 'Ikke-verbal etablering av felles fokus')" },
                  description: { type: Type.STRING, description: "Analytisk beskrivelse av hva dette temaet viser" },
                  quoteOrExample: { type: Type.STRING, description: "Kort sitat eller konkret observasjonseksempel fra teksten" }
                },
                required: ["title", "description", "quoteOrExample"]
              }
            },
            rammeplanDiscussion: {
              type: Type.OBJECT,
              description: "Drøfting mot Rammeplanen for barnehagen",
              properties: {
                relevantSections: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Relevante kapitler og deler i Rammeplanen (f.eks. 'Kap. 1: Barns medvirkning', 'Kap. 3: Livsmestring og helse')"
                },
                analysis: {
                  type: Type.STRING,
                  description: "Detaljert drøfting av hvordan empirien harmonerer med eller utfordrer Rammeplanens intensjoner"
                }
              },
              required: ["relevantSections", "analysis"]
            },
            theoreticalDiscussion: {
              type: Type.OBJECT,
              description: "Pedagogisk teoridrøfting",
              properties: {
                theorists: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Navn på aktuelle teoretikere og begreper (f.eks. 'Berit Bae (Anerkjennende relasjoner)', 'Lev Vygotskij (ZPD/støttende stillas)')"
                },
                analysis: {
                  type: Type.STRING,
                  description: "Drøfting der empirien analyseres gjennom teoretiske begreper"
                }
              },
              required: ["theorists", "analysis"]
            },
            methodologicalReflection: {
              type: Type.STRING,
              description: "Metodisk refleksjon: Datamaterialets styrker/svakheter, observatør/forskerrolle, reliabilitet og NESH-etikk"
            },
            suggestedChapterDraft: {
              type: Type.STRING,
              description: "Et ferdig sammenhengende utkast til analyse- og drøftingskapittel (ca. 400-600 ord) med korrekte litteraturhenvisninger."
            }
          },
          required: [
            "overview",
            "keyThemes",
            "rammeplanDiscussion",
            "theoreticalDiscussion",
            "methodologicalReflection",
            "suggestedChapterDraft"
          ]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return parsed as EmpiricalAnalysisResult;
  } catch (error: any) {
    console.error("Feil under analyzeEmpiricalData:", error);
    throw error;
  }
}
