// Logikk for formell «Sjekkliste før innlevering» (Eksport-sjekk for BLU)

export interface InlineQuoteIssue {
  quoteText: string;
  wordCount: number;
  snippet: string;
}

export interface SubmissionChecklistEvaluation {
  // Punkt 1: Tittel og kandidatnummer
  titleCheck: {
    passed: boolean;
    hasTitle: boolean;
    hasCandidateNumber: boolean;
    title: string;
    candidateNumber: string;
    message: string;
  };

  // Punkt 2: Ordantall innenfor rammen (Mål ± 10%)
  wordCountCheck: {
    passed: boolean;
    actualWords: number;
    targetWords: number;
    minAllowed: number;
    maxAllowed: number;
    deviationPercentage: number;
    status: 'perfect' | 'slightly_short' | 'too_short' | 'slightly_long' | 'too_long';
    message: string;
  };

  // Punkt 3: Blokksitat-sjekk (APA 7: sitater på 40 ord eller mer)
  blockQuoteCheck: {
    passed: boolean;
    longInlineQuotes: InlineQuoteIssue[];
    existingBlockQuotesCount: number;
    message: string;
  };

  // Valgfri bonus-sjekk: Litteraturliste / kildeliste
  bibliographyCheck: {
    passed: boolean;
    hasBibliography: boolean;
    message: string;
  };

  totalPassed: number;
  totalChecks: number;
  isReadyForSubmission: boolean;
}

/**
 * Finner sitater i løpende tekst med 40 ord eller mer som bør være blokksitat etter APA 7.
 */
export function findLongInlineQuotes(content: string): InlineQuoteIssue[] {
  if (!content) return [];

  // Fjern markdown blockquotes (linjer som starter med >) for ikke å feilflagge ekte blokksitater
  const linesWithoutBlockQuotes = content
    .split('\n')
    .filter(line => !line.trim().startsWith('>'))
    .join('\n');

  // Finn tekst inni vanlige anførselstegn: "...", «...», “...”, '...'
  const quoteRegexes = [
    /«([^»]{120,})»/g,
    /"([^"]{120,})"/g,
    /“([^”]{120,})”/g
  ];

  const issues: InlineQuoteIssue[] = [];

  for (const regex of quoteRegexes) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(linesWithoutBlockQuotes)) !== null) {
      const quoteText = match[1].trim();
      const words = quoteText.split(/\s+/).filter(w => w.length > 0);
      if (words.length >= 40) {
        issues.push({
          quoteText,
          wordCount: words.length,
          snippet: words.slice(0, 10).join(' ') + ' ... ' + words.slice(-6).join(' ')
        });
      }
    }
  }

  return issues;
}

/**
 * Teller antall faktiske blokksitater i teksten (> i markdown eller <blockquote> i html)
 */
export function countBlockQuotes(content: string): number {
  if (!content) return 0;
  const mdMatches = content.match(/^\s*>\s+.+/gm) || [];
  const htmlMatches = content.match(/<blockquote[^>]*>/gi) || [];
  return mdMatches.length + htmlMatches.length;
}

/**
 * Evaluerer teksten opp mot de 3 formelle høgskolekravene
 */
export function evaluateSubmissionChecklist(
  title: string,
  candidateNumber: string,
  content: string,
  targetWords: number = 1500
): SubmissionChecklistEvaluation {
  const cleanContent = (content || '').replace(/<[^>]*>/g, ' ').trim();
  const actualWords = cleanContent ? cleanContent.split(/\s+/).filter(w => w.length > 0).length : 0;

  // 1. Tittel og kandidatnummer
  const trimmedTitle = (title || '').trim();
  const trimmedCandidate = (candidateNumber || '').trim();
  const hasValidTitle = trimmedTitle.length > 2 && trimmedTitle.toLowerCase() !== 'uten tittel';
  const hasValidCandidate = trimmedCandidate.length > 0;
  const titlePassed = hasValidTitle && hasValidCandidate;

  let titleMsg = 'Tittel og kandidatnummer er registrert og klart for forsiden.';
  if (!hasValidTitle && !hasValidCandidate) {
    titleMsg = 'Oppgaven mangler både en dekkende tittel og kandidatnummer.';
  } else if (!hasValidTitle) {
    titleMsg = 'Oppgaven mangler tittel (sett en dekkende tittel i oppsettet).';
  } else if (!hasValidCandidate) {
    titleMsg = 'Kandidatnummer mangler. Høgskolen krever kandidatnummer for anonym sensur.';
  }

  // 2. Ordantall (Mål ± 10%)
  const effectiveTarget = targetWords > 0 ? targetWords : 1500;
  const minAllowed = Math.round(effectiveTarget * 0.9);
  const maxAllowed = Math.round(effectiveTarget * 1.1);

  let wordStatus: 'perfect' | 'slightly_short' | 'too_short' | 'slightly_long' | 'too_long' = 'perfect';
  let wordPassed = false;
  let wordMsg = '';

  const devPercentage = effectiveTarget > 0 
    ? Math.round(((actualWords - effectiveTarget) / effectiveTarget) * 100)
    : 0;

  if (actualWords >= minAllowed && actualWords <= maxAllowed) {
    wordPassed = true;
    wordStatus = 'perfect';
    wordMsg = `Perfekt innenfor rammen: ${actualWords.toLocaleString('nb-NO')} ord (Krav: ${effectiveTarget.toLocaleString('nb-NO')} ord ± 10% = ${minAllowed.toLocaleString('nb-NO')} – ${maxAllowed.toLocaleString('nb-NO')} ord).`;
  } else if (actualWords < minAllowed) {
    const diff = minAllowed - actualWords;
    if (diff <= 50) {
      wordStatus = 'slightly_short';
      wordMsg = `Nesten i mål: ${actualWords.toLocaleString('nb-NO')} ord (Mangler ${diff} ord for å nå minimumskravet på ${minAllowed.toLocaleString('nb-NO')} ord).`;
    } else {
      wordStatus = 'too_short';
      wordMsg = `For kort: ${actualWords.toLocaleString('nb-NO')} ord (Mangler ${diff} ord for å nå ${minAllowed.toLocaleString('nb-NO')} ord).`;
    }
  } else {
    const diff = actualWords - maxAllowed;
    if (diff <= 50) {
      wordStatus = 'slightly_long';
      wordMsg = `Akkurat i overkant: ${actualWords.toLocaleString('nb-NO')} ord (${diff} ord over maksgrensen på ${maxAllowed.toLocaleString('nb-NO')} ord).`;
    } else {
      wordStatus = 'too_long';
      wordMsg = `For langt: ${actualWords.toLocaleString('nb-NO')} ord (${diff} ord over maksgrensen på ${maxAllowed.toLocaleString('nb-NO')} ord).`;
    }
  }

  // 3. Blokksitat-sjekk (APA 7: sitater på 40 ord eller mer)
  const longInlineQuotes = findLongInlineQuotes(content);
  const existingBlockQuotesCount = countBlockQuotes(content);
  const blockQuotePassed = longInlineQuotes.length === 0;

  let blockQuoteMsg = '';
  if (blockQuotePassed) {
    if (existingBlockQuotesCount > 0) {
      blockQuoteMsg = `Alle sitater over 40 ord er forskriftsmessig satt som egne blokksitater (${existingBlockQuotesCount} blokksitat funnet).`;
    } else {
      blockQuoteMsg = 'Ingen sitater over 40 ord i løpende tekst – formelle sitatregler etter APA 7 er ivaretatt.';
    }
  } else {
    blockQuoteMsg = `Fant ${longInlineQuotes.length} sitat på 40 ord eller mer i løpende tekst. APA 7 krever at sitater på 40+ ord settes i eget innrykket avsnitt uten hermetegn.`;
  }

  // Bonus: Litteraturliste
  const lowerContent = (content || '').toLowerCase();
  const hasBibliography = lowerContent.includes('litteraturliste') || 
    lowerContent.includes('referanseliste') || 
    lowerContent.includes('referanser') ||
    lowerContent.includes('kilder');

  const bibMsg = hasBibliography
    ? 'Litteraturliste/referanseliste er funnet i oppgaven.'
    : 'Litteraturliste eller kildeavsnitt ble ikke funnet på slutten av teksten.';

  const coreChecks = [titlePassed, wordPassed, blockQuotePassed];
  const totalPassed = coreChecks.filter(Boolean).length;
  const isReadyForSubmission = totalPassed === 3;

  return {
    titleCheck: {
      passed: titlePassed,
      hasTitle: hasValidTitle,
      hasCandidateNumber: hasValidCandidate,
      title: trimmedTitle,
      candidateNumber: trimmedCandidate,
      message: titleMsg
    },
    wordCountCheck: {
      passed: wordPassed,
      actualWords,
      targetWords: effectiveTarget,
      minAllowed,
      maxAllowed,
      deviationPercentage: devPercentage,
      status: wordStatus,
      message: wordMsg
    },
    blockQuoteCheck: {
      passed: blockQuotePassed,
      longInlineQuotes,
      existingBlockQuotesCount,
      message: blockQuoteMsg
    },
    bibliographyCheck: {
      passed: hasBibliography,
      hasBibliography,
      message: bibMsg
    },
    totalPassed,
    totalChecks: 3,
    isReadyForSubmission
  };
}
