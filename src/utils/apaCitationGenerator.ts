export interface APA7InputData {
  title: string;
  authors?: Array<{ name: string } | string> | string[];
  year?: number | string | null;
  venue?: string | null;
  journal?: string | { name?: string; volume?: string; pages?: string } | null;
  doi?: string | null;
  url?: string | null;
  openAccessPdfUrl?: string | null;
  sourceType?: 'pdf' | 'url' | 'bok' | 'artikkel' | 'kapittel' | string;
  isBook?: boolean;
}

/**
 * Formaterer forfattere i henhold til APA 7:
 * Enkeltforfatter: Etternavn, F. M.
 * To forfattere: Etternavn, F. M., & Etternavn, F. M.
 * 3-20 forfattere: Etternavn, F. M., Etternavn, F. M., & Etternavn, F. M.
 * Over 20 forfattere: De første 19, ..., og den siste
 */
export function formatAPA7Authors(authors?: Array<{ name: string } | string> | string[]): string {
  if (!authors || authors.length === 0) {
    return '';
  }

  const parsedNames: string[] = authors.map((auth) => {
    const fullName = typeof auth === 'string' ? auth.trim() : (auth.name || '').trim();
    if (!fullName) return '';

    // Dersom forfatteren er en organisasjon (f.eks. Kunnskapsdepartementet, OECD, UNESCO, Udir)
    const isOrganization = /^(kunnskapsdepartementet|utdanningsdirektoratet|udir|lov om|fn|unicef|oecd|fagbokforlaget|lovdata)/i.test(fullName);
    if (isOrganization || !fullName.includes(' ')) {
      return fullName;
    }

    // Hvis skrevet som "Etternavn, Fornavn" fra før
    if (fullName.includes(',')) {
      const parts = fullName.split(',').map(s => s.trim());
      const lastName = parts[0];
      const rest = parts.slice(1).join(' ');
      const initials = rest
        .split(/\s+/)
        .map(n => (n[0] ? `${n[0].toUpperCase()}.` : ''))
        .filter(Boolean)
        .join(' ');
      return `${lastName}${initials ? `, ${initials}` : ''}`;
    }

    // "Fornavn M. Etternavn" -> "Etternavn, F. M."
    const tokens = fullName.split(/\s+/);
    const lastName = tokens[tokens.length - 1];
    const firstNames = tokens.slice(0, tokens.length - 1);
    const initials = firstNames
      .map(n => (n[0] ? `${n[0].toUpperCase()}.` : ''))
      .filter(Boolean)
      .join(' ');

    return `${lastName}${initials ? `, ${initials}` : ''}`;
  }).filter(Boolean);

  if (parsedNames.length === 0) return '';
  if (parsedNames.length === 1) return parsedNames[0];
  if (parsedNames.length === 2) return `${parsedNames[0]}, & ${parsedNames[1]}`;

  if (parsedNames.length <= 20) {
    const allExceptLast = parsedNames.slice(0, parsedNames.length - 1).join(', ');
    const last = parsedNames[parsedNames.length - 1];
    return `${allExceptLast}, & ${last}`;
  }

  // Over 20 forfattere
  const first19 = parsedNames.slice(0, 19).join(', ');
  const last = parsedNames[parsedNames.length - 1];
  return `${first19}, ... ${last}`;
}

/**
 * Genererer en ferdig formatert APA 7 referansestreng i markdown
 */
export function generateAPA7Reference(articleData: APA7InputData): string {
  const authorStr = formatAPA7Authors(articleData.authors);
  
  // Årstall
  let yearStr = 'u.å.'; // Uten år
  if (articleData.year) {
    const yStr = String(articleData.year).trim();
    if (yStr && yStr !== 'null' && yStr !== 'undefined') {
      yearStr = yStr;
    }
  }

  // Tittel
  const cleanTitle = (articleData.title || 'Uten tittel').trim().replace(/\.$/, '');

  // Tidsskrift / Venue
  let journalName = '';
  let volumeInfo = '';
  if (typeof articleData.journal === 'string') {
    journalName = articleData.journal.trim();
  } else if (articleData.journal && typeof articleData.journal === 'object') {
    journalName = (articleData.journal.name || '').trim();
    if (articleData.journal.volume) {
      volumeInfo = articleData.journal.volume;
      if (articleData.journal.pages) {
        volumeInfo += `, ${articleData.journal.pages}`;
      }
    }
  }

  if (!journalName && articleData.venue) {
    journalName = articleData.venue.trim();
  }

  // DOI / Lenke
  let linkStr = '';
  if (articleData.doi) {
    const cleanDoi = articleData.doi.replace(/^(https?:\/\/)?(dx\.)?doi\.org\//i, '').replace(/^doi:/i, '').trim();
    linkStr = `https://doi.org/${cleanDoi}`;
  } else if (articleData.openAccessPdfUrl) {
    linkStr = articleData.openAccessPdfUrl.trim();
  } else if (articleData.url) {
    linkStr = articleData.url.trim();
  }

  // Boksammensetting vs Tidsskriftsammensetting
  const isBook = articleData.isBook || articleData.sourceType === 'bok';

  let reference = '';

  if (authorStr) {
    reference += `${authorStr} `;
  } else {
    // Hvis ingen forfatter, starter vi med tittelen i henhold til APA 7
    if (isBook) {
      reference += `*${cleanTitle}*. `;
    } else {
      reference += `${cleanTitle}. `;
    }
  }

  reference += `(${yearStr}). `;

  if (authorStr) {
    if (isBook) {
      // For bok: tittelen i kursiv
      reference += `*${cleanTitle}*. `;
    } else {
      // For artikkel: tittel i standard skrift, tidsskrift i kursiv
      reference += `${cleanTitle}. `;
    }
  }

  if (journalName && !isBook) {
    reference += `*${journalName}*`;
    if (volumeInfo) {
      reference += `, ${volumeInfo}`;
    }
    reference += `. `;
  }

  if (linkStr) {
    reference += `${linkStr}`;
  }

  return reference.trim();
}

/**
 * Genererer in-text henvisning (f.eks. "(Bae, 2012)" eller "(Gjervan et al., 2021)")
 */
export function generateInTextCitation(articleData: APA7InputData): string {
  const yearStr = articleData.year ? String(articleData.year).trim() : 'u.å.';
  const authors = articleData.authors || [];

  if (authors.length === 0) {
    const shortTitle = (articleData.title || 'Uten tittel').slice(0, 20);
    return `("${shortTitle}...", ${yearStr})`;
  }

  const parsedFirstAuthor = typeof authors[0] === 'string' ? authors[0] : (authors[0].name || '');
  const isOrg = /^(kunnskapsdepartementet|utdanningsdirektoratet|udir|lov om|fn|unicef|oecd)/i.test(parsedFirstAuthor);

  let lastName = parsedFirstAuthor;
  if (!isOrg && parsedFirstAuthor.includes(' ')) {
    if (parsedFirstAuthor.includes(',')) {
      lastName = parsedFirstAuthor.split(',')[0].trim();
    } else {
      const parts = parsedFirstAuthor.trim().split(/\s+/);
      lastName = parts[parts.length - 1];
    }
  }

  if (authors.length === 1) {
    return `(${lastName}, ${yearStr})`;
  } else if (authors.length === 2) {
    const secondAuthor = typeof authors[1] === 'string' ? authors[1] : (authors[1].name || '');
    let secondLastName = secondAuthor;
    if (!isOrg && secondAuthor.includes(' ')) {
      if (secondAuthor.includes(',')) {
        secondLastName = secondAuthor.split(',')[0].trim();
      } else {
        const parts = secondAuthor.trim().split(/\s+/);
        secondLastName = parts[parts.length - 1];
      }
    }
    return `(${lastName} & ${secondLastName}, ${yearStr})`;
  } else {
    return `(${lastName} et al., ${yearStr})`;
  }
}
