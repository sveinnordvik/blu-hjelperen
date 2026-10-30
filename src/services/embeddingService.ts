/**
 * Genererer vektor-embeddings for tekst-chunks ved hjelp av Google Gemini API
 */

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || !text.trim()) {
    throw new Error('Tekst kan ikke være tom ved generering av embedding.');
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim() || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('Mangler VITE_GEMINI_API_KEY i miljøvariabler for å generere embeddings.');
  }

  const cleanText = text.trim();

  // 1. Prøv primært via @google/genai SDK
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

    const result = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: cleanText
    });

    if (result && result.embedding && Array.isArray(result.embedding.values)) {
      return result.embedding.values;
    }
  } catch (genaiErr) {
    console.warn('Feil ved generering av embedding via @google/genai, prøver @google/generative-ai fallback:', genaiErr);
  }

  // 2. Sekundær fallback via @google/generative-ai SDK
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey.trim());
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    const result = await model.embedContent(cleanText);
    if (result && result.embedding && Array.isArray(result.embedding.values)) {
      return result.embedding.values;
    }
  } catch (generativeErr: any) {
    console.error('Feil ved generering av embedding via @google/generative-ai:', generativeErr);
    throw new Error(`Kunne ikke generere embedding fra Gemini: ${generativeErr?.message || String(generativeErr)}`);
  }

  throw new Error('Mottok ingen gyldige embedding-verdier fra Gemini API.');
}

/**
 * Genererer embeddings for en matrise med tekster i parallell/sekvensielt
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const txt of texts) {
    const vec = await generateEmbedding(txt);
    embeddings.push(vec);
  }
  return embeddings;
}
