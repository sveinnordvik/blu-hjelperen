/**
 * WYSIWYG Konverteringsmodul for BLU-Hjelperen
 * Konverterer sømløst mellom Markdown (lagringsformat) og ren HTML (visuell Word-redigering)
 * slik at studenten slipper å se '#', '##', '###' i editoren.
 */

/**
 * Konverterer Markdown til ren HTML for contentEditable WYSIWYG editor
 */
export function markdownToHtml(md: string): string {
  if (!md || !md.trim()) {
    return '<p><br></p>';
  }

  const lines = md.split('\n');
  const htmlParts: string[] = [];

  let inUl = false;
  let inOl = false;
  let inBlockquote = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
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
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      if (inBlockquote) { htmlParts.push('</blockquote>'); inBlockquote = false; }
      htmlParts.push('<div class="page-break-indicator" contenteditable="false" data-pagebreak="true"><span class="page-break-line"></span><span class="page-break-badge">📄 Sideskift (Ny side)</span><span class="page-break-line"></span></div><p><br></p>');
      continue;
    }

    // Heading 1
    if (trimmed.startsWith('# ')) {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      if (inBlockquote) { htmlParts.push('</blockquote>'); inBlockquote = false; }
      htmlParts.push(`<h1>${formatInlineMarkdownToHtml(trimmed.slice(2).trim())}</h1>`);
      continue;
    }

    // Heading 2
    if (trimmed.startsWith('## ')) {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      if (inBlockquote) { htmlParts.push('</blockquote>'); inBlockquote = false; }
      htmlParts.push(`<h2>${formatInlineMarkdownToHtml(trimmed.slice(3).trim())}</h2>`);
      continue;
    }

    // Heading 3
    if (trimmed.startsWith('### ')) {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      if (inBlockquote) { htmlParts.push('</blockquote>'); inBlockquote = false; }
      htmlParts.push(`<h3>${formatInlineMarkdownToHtml(trimmed.slice(4).trim())}</h3>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      if (!inBlockquote) {
        htmlParts.push('<blockquote>');
        inBlockquote = true;
      }
      htmlParts.push(`<p>${formatInlineMarkdownToHtml(trimmed.slice(2).trim())}</p>`);
      continue;
    }

    // Unordered List
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (inBlockquote) { htmlParts.push('</blockquote>'); inBlockquote = false; }
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      if (!inUl) {
        htmlParts.push('<ul>');
        inUl = true;
      }
      htmlParts.push(`<li>${formatInlineMarkdownToHtml(trimmed.slice(2).trim())}</li>`);
      continue;
    }

    // Ordered List
    if (/^\d+\.\s+/.test(trimmed)) {
      if (inBlockquote) { htmlParts.push('</blockquote>'); inBlockquote = false; }
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (!inOl) {
        htmlParts.push('<ol>');
        inOl = true;
      }
      const itemContent = trimmed.replace(/^\d+\.\s+/, '').trim();
      htmlParts.push(`<li>${formatInlineMarkdownToHtml(itemContent)}</li>`);
      continue;
    }

    // Regular Paragraph
    if (inUl) { htmlParts.push('</ul>'); inUl = false; }
    if (inOl) { htmlParts.push('</ol>'); inOl = false; }
    if (inBlockquote) { htmlParts.push('</blockquote>'); inBlockquote = false; }
    htmlParts.push(`<p>${formatInlineMarkdownToHtml(trimmed)}</p>`);
  }

  if (inUl) htmlParts.push('</ul>');
  if (inOl) htmlParts.push('</ol>');
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
    case 'h1':
      return `\n\n# ${childContent.trim()}\n\n`;

    case 'h2':
      return `\n\n## ${childContent.trim()}\n\n`;

    case 'h3':
      return `\n\n### ${childContent.trim()}\n\n`;

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
      return `\n\n${childContent.trim()}\n\n`;

    case 'ol':
      return `\n\n${childContent.trim()}\n\n`;

    case 'li': {
      const parentTag = el.parentElement?.tagName.toLowerCase();
      if (parentTag === 'ol') {
        const idx = Array.from(el.parentElement?.children || []).indexOf(el) + 1;
        return `${idx}. ${childContent.trim()}\n`;
      }
      return `- ${childContent.trim()}\n`;
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
 * Tar hensyn til eksplisitte sideskift og automatisk sidekapasitet (~320 ord / 22 avsnittslinjer per A4-side).
 */
export function splitDocumentIntoPages(fullContent: string, targetWordsPerPage: number = 320): string[] {
  if (!fullContent || typeof fullContent !== 'string' || !fullContent.trim()) {
    return [''];
  }

  // 1. Del på eventuelle eksplisitte sideskift
  const explicitSections = fullContent.split(/<!-- pagebreak -->|---pagebreak---|--- sideskift ---|\[SIDESKIFT\]/g);
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
      const isHeading1 = cleanBlock.startsWith('# ') || cleanBlock.startsWith('<h1>');

      // Hvis blokken gjør at siden blir for lang (> targetWordsPerPage), eller H1 når siden allerede har innhold:
      if (currentPageBlocks.length > 0 && (currentWords + wordsInBlock > targetWordsPerPage || (isHeading1 && currentWords > 160))) {
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

