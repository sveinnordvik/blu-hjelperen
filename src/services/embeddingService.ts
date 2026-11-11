/**
 * Midlertidig deaktivert embedding-tjeneste for å tette sikkerhetshull.
 * Generering av embeddings (vektorer) må flyttes til Firebase Cloud Functions senere ved behov.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  console.warn('Embedding-generering er midlertidig deaktivert av sikkerhetshensyn.');
  return []; // Returnerer en tom liste for at appen ikke skal krasje
}

export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  return texts.map(() => []);
}