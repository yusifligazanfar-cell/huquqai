import crypto from 'crypto';

export interface ParsedArticle {
  articleNumber: string;
  articleTitle: string;
  chapterNumber?: string;
  chapterTitle?: string;
  content: string;
}

export interface ParsedLegalDoc {
  documentId: string;
  title: string;
  actNumber?: string;
  articles: ParsedArticle[];
  plainText: string;
  contentHash: string;
}

/**
 * Cleans raw e-qanun HTML and extracts structural legal elements
 */
export function parseLegalHtml(documentId: string, rawHtml: string, fallbackTitle: string = ''): ParsedLegalDoc {
  // Strip script, style, meta tags
  let text = rawHtml
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<link[^>]*>/gi, '');

  // Extract title if available in <title> or <h1>
  let title = fallbackTitle;
  const titleMatch = rawHtml.match(/<title>([\s\S]*?)<\/title>/i) || rawHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (titleMatch && titleMatch[1]) {
    const cleanT = titleMatch[1].replace(/<[^>]+>/g, '').trim();
    if (cleanT.length > 5 && !cleanT.toLowerCase().includes('untitled')) {
      title = cleanT;
    }
  }

  // Normalize HTML breaks and paragraphs into clean newlines
  text = text
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // Clean extra spaces while preserving line breaks
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const plainText = lines.join('\n');
  const contentHash = crypto.createHash('sha256').update(plainText).digest('hex');

  // Extract Act Number (e.g., № 813-IQ or № 123)
  let actNumber: string | undefined;
  const actMatch = plainText.match(/№\s*([0-9]+(?:-[A-Za-zƏÖÜÇŞĞıöüçşğ]+)?)/i);
  if (actMatch) {
    actNumber = actMatch[1];
  }

  // Parse Articles: Look for patterns like "Maddə 57.", "Maddə 57-1.", "57.1.", "MADDƏ 1."
  const articles: ParsedArticle[] = [];
  let currentArticle: ParsedArticle | null = null;
  let currentChapterNum: string | undefined;
  let currentChapterTitle: string | undefined;

  const articleRegex = /^(?:madd[əe]\s*([0-9]+(?:[\.\-][0-9]+)?)|([0-9]+(?:[\.\-][0-9]+)?)\s*[-–.]\s*ci\s*madd[əe])(?:\s*[\.\-:]\s*(.*))?$/i;
  const chapterRegex = /^(?:f[əe]sil\s*([0-9IVXLCDM]+)|b[öo]lm[əe]\s*([0-9IVXLCDM]+))(?:\s*[\.\-:]\s*(.*))?$/i;

  for (const line of lines) {
    // Check chapter
    const chapMatch = line.match(chapterRegex);
    if (chapMatch) {
      currentChapterNum = chapMatch[1] || chapMatch[2];
      currentChapterTitle = chapMatch[3]?.trim();
      continue;
    }

    // Check article header
    const artMatch = line.match(articleRegex);
    if (artMatch) {
      if (currentArticle) {
        currentArticle.content = currentArticle.content.trim();
        articles.push(currentArticle);
      }
      const artNum = (artMatch[1] || artMatch[2]).replace('-', '.');
      const artTitle = (artMatch[3] || '').trim();
      currentArticle = {
        articleNumber: artNum,
        articleTitle: artTitle,
        chapterNumber: currentChapterNum,
        chapterTitle: currentChapterTitle,
        content: line + '\n'
      };
    } else if (currentArticle) {
      currentArticle.content += line + '\n';
    }
  }

  if (currentArticle) {
    currentArticle.content = currentArticle.content.trim();
    articles.push(currentArticle);
  }

  // If no structured "Maddə" detected, create a fallback monolithic article
  if (articles.length === 0 && plainText.length > 0) {
    articles.push({
      articleNumber: '1',
      articleTitle: title,
      content: plainText.slice(0, 15000)
    });
  }

  return {
    documentId,
    title,
    actNumber,
    articles,
    plainText,
    contentHash
  };
}
