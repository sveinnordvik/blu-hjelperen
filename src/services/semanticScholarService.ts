import { LiteratureDocument, AccessType } from '../types/literature';
import { generateAPA7Reference } from '../utils/apaCitationGenerator';

export interface SemanticScholarAuthor {
  authorId?: string;
  name: string;
}

export interface SemanticScholarOpenAccessPdf {
  url: string;
  status?: string;
}

export interface SemanticScholarExternalIds {
  DOI?: string;
  ArXiv?: string;
  PubMed?: string;
  PubMedCentral?: string;
  ACL?: string;
  MAG?: string;
}

export interface SemanticScholarArticle {
  paperId: string;
  title: string;
  authors: SemanticScholarAuthor[];
  year: number | null;
  abstract: string | null;
  url: string | null;
  openAccessPdf: SemanticScholarOpenAccessPdf | null;
  externalIds?: SemanticScholarExternalIds;
  venue?: string | null;
  publicationVenue?: {
    name?: string;
    type?: string;
  } | null;
  journal?: {
    name?: string;
    volume?: string;
    pages?: string;
  } | null;
}

const SEMANTIC_SCHOLAR_BASE_URL = 'https://api.semanticscholar.org/graph/v1';
const REQUEST_FIELDS = 'paperId,title,authors,year,abstract,url,openAccessPdf,externalIds,venue,publicationVenue,journal';

/**
 * Søker etter akademiske artikler i Semantic Scholar Graph API.
 * Sorterer og prioriterer artikler med fulltekst Open Access PDF for fremtidig RAG-behandling.
 */
export async function searchArticles(
  query: string,
  options: { limit?: number; openAccessOnly?: boolean } = {}
): Promise<SemanticScholarArticle[]> {
  if (!query || !query.trim()) {
    return [];
  }

  const limit = options.limit || 20;
  const searchUrl = `${SEMANTIC_SCHOLAR_BASE_URL}/paper/search?query=${encodeURIComponent(
    query.trim()
  )}&limit=${limit}&fields=${REQUEST_FIELDS}`;

  try {
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('For mange forespørsler til Semantic Scholar API (429 Rate Limit). Vennligst vent litt og prøv igjen.');
      }
      throw new Error(`Semantic Scholar API feil (${response.status}: ${response.statusText})`);
    }

    const data = await response.json();
    const articles: SemanticScholarArticle[] = data.data || [];

    // Prioriter Open Access PDFer (legger de med openAccessPdf øverst)
    const sorted = [...articles].sort((a, b) => {
      const aHasPdf = Boolean(a.openAccessPdf?.url);
      const bHasPdf = Boolean(b.openAccessPdf?.url);
      if (aHasPdf && !bHasPdf) return -1;
      if (!aHasPdf && bHasPdf) return 1;
      return 0;
    });

    if (options.openAccessOnly) {
      return sorted.filter(art => Boolean(art.openAccessPdf?.url));
    }

    return sorted;
  } catch (error: any) {
    console.error('Feil ved søk i Semantic Scholar API:', error);
    throw new Error(error?.message || 'Kunne ikke hente artikler fra Semantic Scholar.');
  }
}

/**
 * Henter én presis artikkel fra Semantic Scholar basert på DOI.
 */
export async function getArticleByDoi(doi: string): Promise<SemanticScholarArticle | null> {
  if (!doi || !doi.trim()) {
    return null;
  }

  const cleanDoi = doi.trim()
    .replace(/^(https?:\/\/)?(dx\.)?doi\.org\//i, '')
    .replace(/^doi:/i, '');

  const doiUrl = `${SEMANTIC_SCHOLAR_BASE_URL}/paper/DOI:${encodeURIComponent(cleanDoi)}?fields=${REQUEST_FIELDS}`;

  try {
    const response = await fetch(doiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('For mange forespørsler til Semantic Scholar API (429 Rate Limit). Vennligst vent litt.');
      }
      throw new Error(`Klarte ikke å hente artikkel med DOI ${cleanDoi} (${response.status})`);
    }

    const article: SemanticScholarArticle = await response.json();
    return article;
  } catch (error: any) {
    console.error(`Feil ved oppslag på DOI ${doi}:`, error);
    throw new Error(error?.message || `Kunne ikke slå opp DOI ${doi}`);
  }
}

/**
 * Adapter-funksjon: Konverterer en Semantic Scholar artikkel til vår Firestore LiteratureDocument-modell,
 * så den enkelt kan sendes rett inn i addPublicDocument() eller addPrivateDocument().
 */
export function mapSemanticScholarToLiterature(
  article: SemanticScholarArticle,
  access: AccessType = 'felles',
  userId?: string
): Omit<LiteratureDocument, 'id'> {
  const authorNames = (article.authors || []).map(a => a.name).filter(Boolean);
  const yearNum = article.year || new Date().getFullYear();
  const pdfUrl = article.openAccessPdf?.url || undefined;
  const webUrl = article.url || (article.externalIds?.DOI ? `https://doi.org/${article.externalIds.DOI}` : undefined);

  const apaCitation = generateAPA7Reference({
    title: article.title,
    authors: authorNames,
    year: yearNum,
    venue: article.venue || article.publicationVenue?.name,
    journal: article.journal,
    doi: article.externalIds?.DOI,
    url: webUrl,
    openAccessPdfUrl: pdfUrl,
    sourceType: 'artikkel'
  });

  const nowIso = new Date().toISOString();

  return {
    title: article.title || 'Uten tittel',
    tittel: article.title || 'Uten tittel',
    authors: authorNames,
    forfattere: authorNames,
    year: yearNum,
    utgivelsesår: yearNum,
    createdAt: nowIso,
    opplastingsdato: nowIso,
    sourceType: 'artikkel',
    kildetype: 'artikkel',
    access,
    tilgang: access,
    userId: userId || '',
    fileUrl: pdfUrl,
    url: webUrl,
    description: article.abstract || undefined,
    apaCitation
  };
}
