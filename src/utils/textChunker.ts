export interface ChunkMetadata {
  documentId: string;
  title: string;
  author?: string;
  authors?: string[];
  year?: number;
  pageNumber?: number;
  sectionTitle?: string;
  sourceType?: string;
  access?: 'privat' | 'felles';
  [key: string]: any;
}

export interface TextChunk {
  chunkId: string;
  documentId: string;
  text: string;
  chunkIndex: number;
  totalChunks: number;
  metadata: ChunkMetadata;
  pageNumber?: number;
  tokenCountEstimate?: number;
}

export interface ChunkingOptions {
  chunkSize?: number;  // Ca 500 - 1000 tegn (standard 700)
  overlap?: number;    // Overlapp mellom chunks (standard 150)
}

/**
 * Deler en lang tekst opp i fornuftige, overlappende avsnitt (chunks)
 * og bevarer metadata (f.eks. dokument-ID, sidetall, tittel, forfatter).
 */
export function chunkText(
  text: string,
  metadata: ChunkMetadata,
  options: ChunkingOptions = {}
): TextChunk[] {
  if (!text || !text.trim()) {
    return [];
  }

  const chunkSize = options.chunkSize || 750;
  const overlap = options.overlap || 150;
  const cleanText = text.trim().replace(/\r\n/g, '\n');

  // Del først opp i naturlige avsnitt
  const paragraphs = cleanText
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  const rawChunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (paragraph.length > chunkSize) {
      // Dersom et enkelt avsnitt er veldig langt, del det opp på setningsnivå
      if (currentChunk) {
        rawChunks.push(currentChunk.trim());
        currentChunk = '';
      }

      const sentences = paragraph.match(/[^.!?]+[.!?]+(\s+|$)/g) || [paragraph];
      let sentenceChunk = '';

      for (const sentence of sentences) {
        if ((sentenceChunk + sentence).length > chunkSize && sentenceChunk.length > 0) {
          rawChunks.push(sentenceChunk.trim());
          // Behold overlapp
          const overlapText = sentenceChunk.slice(Math.max(0, sentenceChunk.length - overlap));
          sentenceChunk = overlapText + sentence;
        } else {
          sentenceChunk += sentence;
        }
      }

      if (sentenceChunk) {
        currentChunk = sentenceChunk;
      }
    } else {
      if ((currentChunk + '\n\n' + paragraph).length > chunkSize && currentChunk.length > 0) {
        rawChunks.push(currentChunk.trim());
        // Ta med overlapp fra forrige chunk
        const overlapText = currentChunk.slice(Math.max(0, currentChunk.length - overlap));
        currentChunk = overlapText + '\n\n' + paragraph;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
      }
    }
  }

  if (currentChunk.trim()) {
    rawChunks.push(currentChunk.trim());
  }

  const totalChunks = rawChunks.length;

  return rawChunks.map((chunkStr, index) => {
    const chunkId = `${metadata.documentId}_chunk_${index + 1}`;
    const tokenEstimate = Math.ceil(chunkStr.length / 4);

    return {
      chunkId,
      documentId: metadata.documentId,
      text: chunkStr,
      chunkIndex: index,
      totalChunks,
      metadata: {
        ...metadata,
        chunkIndex: index,
        totalChunks
      },
      pageNumber: metadata.pageNumber,
      tokenCountEstimate: tokenEstimate
    };
  });
}
