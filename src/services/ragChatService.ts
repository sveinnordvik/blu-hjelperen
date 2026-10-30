import { searchSimilarChunks, VectorSearchResult } from './vectorStoreService';
import { callGoogleAIProxy } from './geminiService';
import { generateAPA7Reference } from '../utils/apaCitationGenerator';

export interface RagSource {
  title: string;
  author?: string;
  authors?: string[];
  year?: number;
  pageNumber?: number;
  apaCitation?: string;
  documentId: string;
  chunkId: string;
  textSnippet: string;
  score: number;
}

export interface RagChatResponse {
  text: string;
  sources: RagSource[];
  chunksUsed: VectorSearchResult[];
}

/**
 * Superveileder RAG-orkestrator:
 * 1. Henter relevante tekst-chunks fra vektordatabasen
 * 2. Bygger en faglig forankret sokratisk System Prompt med obligatorisk kontekst
 * 3. Kaller Gemini for å generere et pedagogisk og kildebelagt svar
 */
export async function askSuperveilederen(
  userId: string,
  chatHistory: Array<{ role: string; content: string }>,
  currentQuery: string
): Promise<RagChatResponse> {
  if (!currentQuery || !currentQuery.trim()) {
    throw new Error('Spørsmål kan ikke være tomt.');
  }

  // 1. Hent relevante tekst-chunks fra vektordatabasen via semantisk søk
  let retrievedChunks: VectorSearchResult[] = [];
  try {
    retrievedChunks = await searchSimilarChunks(userId, currentQuery, 5, true);
  } catch (err) {
    console.warn('Kunne ikke hente vektorsøk-chunks, fortsetter uten ekstern kontekst:', err);
  }

  // 2. Formater uthentet bakgrunnsmateriale for system-prompten
  let contextText = '';
  const sourcesMap = new Map<string, RagSource>();

  retrievedChunks.forEach((chunk, index) => {
    const meta = chunk.metadata || {};
    const title = meta.title || meta.tittel || 'Akademisk kilde';
    const authors = meta.authors || meta.forfattere || (meta.author ? [meta.author] : []);
    const year = meta.year || meta.utgivelsesår || '';
    const page = chunk.pageNumber || meta.pageNumber || null;

    const apaStr = generateAPA7Reference({
      title,
      authors,
      year,
      sourceType: meta.sourceType || meta.kildetype || 'artikkel'
    });

    const sourceObj: RagSource = {
      title,
      authors,
      author: authors[0] || 'Kilde',
      year: Number(year) || undefined,
      pageNumber: page || undefined,
      apaCitation: apaStr,
      documentId: chunk.documentId,
      chunkId: chunk.chunkId,
      textSnippet: chunk.text,
      score: chunk.score
    };

    sourcesMap.set(chunk.chunkId, sourceObj);

    contextText += `\n--- KILDE-UTDRAG #${index + 1} ---
[Dokument ID: ${chunk.documentId}]
[Tittel: "${title}"]
[Forfattere: ${authors.join(', ')}]
[År: ${year || 'u.å.'}]
${page ? `[Sidetall: s. ${page}]` : ''}
[APA 7 Referanse: ${apaStr}]

Innhold fra litteraturen:
"${chunk.text}"
--- END KILDE-UTDRAG #${index + 1} ---\n`;
  });

  // 3. Bygg Sokratisk / Faglig Veileder System Prompt
  const ragSystemInstruction = `Du er "Superveilederen" – en varm, faglig sterk og sokratisk skriveveileder for barnehagelærerstudenter i Norge (BLU).

DIN OPPGAVE:
Svar på studentens spørsmål ved å bruke det obligatoriske bakgrunnsmaterialet (kildene) nedenfor.
Gi faglige, reflekterte og strukturere svar som hjelper studenten i oppgaveskrivingen og praksisrefleksjonen.

STRENGE REGLER FOR KILDEHENVISNING (APA 7):
1. Når du bruker informasjon fra kilde-utdragene nedenfor, MÅ du inkludere presise in-text kildehenvisninger direkte i teksten, f.eks. [Forfatter, År, s. X] eller [Kunnskapsdepartementet, 2017].
2. Bruk kildeutdragene aktivt for å gi forankrede sitater og teoretiske koblinger.
3. Dersom bakgrunnsmaterialet ikke er tilstrekkelig for å besvare spørsmålet fullstendig, gjør rede for dette og koble svaret mot Rammeplan for barnehagen (2017) og barnehagepedagogisk teori på en ryddig måte.
4. Ha en oppmuntrende, sokratisk tone. Still gjerne ett reflekterende kontrollspørsmål til slutt for å hjelpe studenten med videre skriving.

${contextText ? `OBLIGATORISK BAKGRUNNSMATERIALE (KILDER):
${contextText}` : 'Merk: Det ble ikke funnet direkte treff i den opplastede litteratursiloen. Svar generelt med god forankring i Rammeplanen for barnehagen (2017).'}`;

  // 4. Formater historikk og spørsmål for Gemini API
  const formattedContents = (chatHistory || []).map(h => ({
    role: h.role === 'model' || h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }]
  }));

  formattedContents.push({
    role: 'user',
    parts: [{ text: currentQuery }]
  });

  // 5. Kall Gemini API dynamisk basert på miljøvariabel VITE_GEMINI_MODEL for fremtidssikring
  const modelName = import.meta.env.VITE_GEMINI_MODEL || 'gemini-3.8-flash';
  const geminiResponse = await callGoogleAIProxy({
    model: modelName,
    contents: formattedContents,
    config: {
      systemInstruction: ragSystemInstruction,
      temperature: 0.7
    }
  });

  const responseText = geminiResponse.text || 'Mottok ingen tekst fra veilederen.';
  const sourcesList = Array.from(sourcesMap.values());

  return {
    text: responseText,
    sources: sourcesList,
    chunksUsed: retrievedChunks
  };
}
