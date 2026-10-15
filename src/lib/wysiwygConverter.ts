/**
 * WYSIWYG Konverteringsmodul for BLU-Hjelperen
 * Konverterer sømløst mellom Markdown (lagringsformat) og ren HTML (visuell Word-redigering)
 * slik at studenten slipper å se '#', '##', '###' i editoren.
 */

/**
 * Sikrer at første ord etter kulepunkt eller liste alltid starter med stor forbokstav (Word-regel).
 * Håndterer også innledende formateringstegn (*, _, `, ", «) og HTML-tagger.
 */
export function capitalizeListItemText(text: string): string {
  if (!text) return '';
  return text.replace(/^((?:<[^>]+>|[^a-zA-ZæøåÆØÅ0-9])*?)([a-zæøå])/, (_match, prefix, char) => {
    return prefix + char.toLocaleUpperCase('nb-NO');
  });
}

/**
 * Konverterer Markdown til ren HTML for contentEditable WYSIWYG editor
 */
export function markdownToHtml(md: string): string {
  if (!md || !md.trim()) {
    return '<p><br></p>';
  }

  const lines = md.split('\n');
  const htmlParts: string[] = [];

  // listStack holder styr på åpne <ul> / <ol> for sub-nivåer
  const listStack: Array<{ type: 'ul' | 'ol'; level: number }> = [];
  let inBlockquote = false;

  const closeListsToLevel = (targetLevel: number) => {
    while (listStack.length > 0 && listStack[listStack.length - 1].level > targetLevel) {
      const popped = listStack.pop()!;
      htmlParts.push(`</${popped.type}>`);
    }
  };

  const closeAllLists = () => {
    while (listStack.length > 0) {
      const popped = listStack.pop()!;
      htmlParts.push(`</${popped.type}>`);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      closeAllLists();
      if (inBlockquote) { htmlParts.push('</blockquote>'); inBlockquote = false; }
      continue;
    }

    // Page break / Sideskift
    if (
      trimmed === '<!-- pagebreak -->' || 
      trimmed === '---pagebreak---' || 
      trimmed === '--- sideskift ---' || 
      trimmed === '[SIDESKIFT]' ||
      trimmed === '***'
    ) {
      closeAllLists();
      if (inBlockquote) { htmlParts.push('</blockquote>'); inBlockquote = false; }
      htmlParts.push('<div class="page-break-indicator" contenteditable="false" data-pagebreak="true"><span class="page-break-line"></span><span class="page-break-badge">📄 Sideskift (Ny side)</span><span class="page-break-line"></span></div><p><br></p>');
      continue;
    }

    // Heading match (støtter #, ##, ### og rydder bort eventuelle doble koder som '# ###')
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeAllLists();
      if (inBlockquote) { htmlParts.push('</blockquote>'); inBlockquote = false; }
      
      const level = Math.min(3, headingMatch[1].length); // 1, 2 eller 3
      const cleanTitle = headingMatch[2].replace(/^#+\s*/, '').trim();
      
      htmlParts.push(`<h${level}>${formatInlineMarkdownToHtml(cleanTitle)}</h${level}>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      closeAllLists();
      if (!inBlockquote) {
        htmlParts.push('<blockquote>');
        inBlockquote = true;
      }
      htmlParts.push(`<p>${formatInlineMarkdownToHtml(trimmed.slice(2).trim())}</p>`);
      continue;
    }

    // Check for List items (bullet or numbered) with indentation
    const isUl = trimmed.startsWith('- ') || trimmed.startsWith('* ');
    const isOl = /^\d+\.\s+/.test(trimmed);

    if (isUl || isOl) {
      if (inBlockquote) { htmlParts.push('</blockquote>'); inBlockquote = false; }

      // Regn ut innrykksnivå (2 mellomrom eller 1 tab = 1 undernivå)
      const indentMatch = rawLine.match(/^(\s*)/);
      const indentLength = indentMatch ? indentMatch[1].replace(/\t/g, '  ').length : 0;
      const targetLevel = Math.max(0, Math.floor(indentLength / 2));
      const targetType = isUl ? 'ul' : 'ol';

      // Lukk dypere nivåer
      closeListsToLevel(targetLevel);

      // Hvis samme nivå men annen type (bytte mellom ul og ol), bytt
      if (listStack.length > 0 && listStack[listStack.length - 1].level === targetLevel && listStack[listStack.length - 1].type !== targetType) {
        const popped = listStack.pop()!;
        htmlParts.push(`</${popped.type}>`);
      }

      // Åpne nye undernivåer dersom targetLevel er dypere
      const currentLevel = listStack.length > 0 ? listStack[listStack.length - 1].level : -1;
      for (let l = currentLevel + 1; l <= targetLevel; l++) {
        listStack.push({ type: targetType, level: l });
        htmlParts.push(`<${targetType}>`);
      }

      let content = '';
      if (isUl) {
        content = trimmed.replace(/^[-*]\s+/, '');
      } else {
        content = trimmed.replace(/^\d+\.\s+/, '');
      }
      const capitalized = capitalizeListItemText(content);
      htmlParts.push(`<li>${formatInlineMarkdownToHtml(capitalized)}</li>`);
      continue;
    }

    // Regular Paragraph
    closeAllLists();
    if (inBlockquote) { htmlParts.push('</blockquote>'); inBlockquote = false; }
    htmlParts.push(`<p>${formatInlineMarkdownToHtml(trimmed)}</p>`);
  }

  closeAllLists();
  if (inBlockquote) htmlParts.push('</blockquote>');

  return htmlParts.join('') || '<p><br></p>';
}

/**
 * Tolker inline **bold**, *kursiv*, <u>understreking</u> og koder
 */
function formatInlineMarkdownToHtml(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

/**
 * Konverterer HTML-innhold fra editoren tilbake til ren Markdown
 * for lagring i Firebase og perfekt eksport til Word (.docx) og PDF (.pdf).
 */
export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return '';

  if (typeof document === 'undefined') {
    // Enkel regex-fallback for server-miljø
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n### $1\n\n')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n\n$1\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  const container = document.createElement('div');
  container.innerHTML = html;

  const result = walkDomNodeToMarkdown(container);
  return result.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Rekursiv DOM-vandrer som oversetter DOM-noder til ren Markdown
 */
function walkDomNodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue || '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  // Sideskift element
  if (el.getAttribute('data-pagebreak') === 'true' || el.classList.contains('page-break-indicator') || tag === 'hr') {
    return '\n\n<!-- pagebreak -->\n\n';
  }

  const childContent = Array.from(el.childNodes)
    .map(walkDomNodeToMarkdown)
    .join('');

  switch (tag) {
    case 'h1': {
      const cleanHeading = childContent.replace(/^#+\s*/, '').trim();
      return `\n\n# ${cleanHeading}\n\n`;
    }

    case 'h2': {
      const cleanHeading = childContent.replace(/^#+\s*/, '').trim();
      return `\n\n## ${cleanHeading}\n\n`;
    }

    case 'h3': {
      const cleanHeading = childContent.replace(/^#+\s*/, '').trim();
      return `\n\n### ${cleanHeading}\n\n`;
    }

    case 'b':
    case 'strong':
      return `**${childContent}**`;

    case 'i':
    case 'em':
      return `*${childContent}*`;

    case 'u':
      return `<u>${childContent}</u>`;

    case 'blockquote':
      return `\n\n> ${childContent.trim()}\n\n`;

    case 'ul':
    case 'ol': {
      const isNested = el.parentElement && ['li', 'ul', 'ol'].includes(el.parentElement.tagName.toLowerCase());
      const inner = Array.from(el.childNodes).map(walkDomNodeToMarkdown).join('');
      return isNested ? inner : `\n\n${inner.trim()}\n\n`;
    }

    case 'li': {
      // Regn ut innrykksnivå basert på antall forfedre som er ul eller ol
      let depth = 0;
      let curr = el.parentElement;
      while (curr && curr.tagName) {
        const t = curr.tagName.toLowerCase();
        if (t === 'ul' || t === 'ol') {
          depth++;
        }
        if (curr.classList?.contains('academic-editor-surface') || curr.getAttribute?.('contenteditable') === 'true') {
          break;
        }
        curr = curr.parentElement;
      }
      const listLevel = Math.max(0, depth - 1);
      const indent = '  '.repeat(listLevel);
      const parentTag = el.parentElement?.tagName.toLowerCase();

      // Skille mellom inline innhold og underlister
      const inlineChildren: Node[] = [];
      const nestedListChildren: Node[] = [];

      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i];
        if (child.nodeType === Node.ELEMENT_NODE && ['ul', 'ol'].includes((child as HTMLElement).tagName.toLowerCase())) {
          nestedListChildren.push(child);
        } else {
          inlineChildren.push(child);
        }
      }

      const rawText = inlineChildren.map(walkDomNodeToMarkdown).join('').trim();
      const capitalized = capitalizeListItemText(rawText);

      let prefix = '- ';
      if (parentTag === 'ol') {
        let idx = 1;
        let prev = el.previousElementSibling;
        while (prev) {
          if (prev.tagName.toLowerCase() === 'li') idx++;
          prev = prev.previousElementSibling;
        }
        prefix = `${idx}. `;
      }

      let line = `${indent}${prefix}${capitalized}\n`;

      if (nestedListChildren.length > 0) {
        line += nestedListChildren.map(walkDomNodeToMarkdown).join('');
      }

      return line;
    }

    case 'p':
    case 'div': {
      const trimmed = childContent.trim();
      return trimmed ? `\n\n${trimmed}\n\n` : '\n';
    }

    case 'br':
      return '\n';

    case 'code':
      return `\`${childContent}\``;

    default:
      return childContent;
  }
}

/**
 * Renser tekst for ren ordtelling og forhåndsvisning
 */
export function stripMarkdownAndHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*`_>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deler opp et dokument i ekte A4-sider (Word-ark).
 * Tar hensyn til eksplisitte sideskift og naturlig sidekapasitet (~380 ord per A4-side).
 */
export function splitDocumentIntoPages(fullContent: string, targetWordsPerPage: number = 380): string[] {
  if (!fullContent || typeof fullContent !== 'string' || !fullContent.trim()) {
    return [''];
  }

  // 1. Del på eventuelle eksplisitte sideskift
  const explicitSections = fullContent.split(/<!-- pagebreak -->|---pagebreak---|--- sideskift ---|\[SIDESKIFT\]|<div[^>]*data-pagebreak[^>]*>.*?<\/div>/gi);
  const resultPages: string[] = [];

  for (const section of explicitSections) {
    const trimmedSection = section.trim();
    if (!trimmedSection) {
      if (resultPages.length === 0) resultPages.push('');
      continue;
    }

    // Del seksjonen inn i avsnitt og overskriftsblokker
    const blocks = trimmedSection.split(/\n\s*\n/);
    let currentPageBlocks: string[] = [];
    let currentWords = 0;

    for (const block of blocks) {
      const cleanBlock = block.trim();
      if (!cleanBlock) continue;

      const wordsInBlock = cleanBlock.split(/\s+/).filter(Boolean).length;

      // Hvis blokken gjør at siden blir for lang (> targetWordsPerPage):
      if (currentPageBlocks.length > 0 && (currentWords + wordsInBlock > targetWordsPerPage)) {
        resultPages.push(currentPageBlocks.join('\n\n'));
        currentPageBlocks = [cleanBlock];
        currentWords = wordsInBlock;
      } else {
        currentPageBlocks.push(cleanBlock);
        currentWords += wordsInBlock;
      }
    }

    if (currentPageBlocks.length > 0) {
      resultPages.push(currentPageBlocks.join('\n\n'));
    }
  }

  return resultPages.length > 0 ? resultPages : [''];
}

