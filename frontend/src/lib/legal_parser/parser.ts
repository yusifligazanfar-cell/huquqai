export interface ParsedParagraph {
  number: string;
  text: string;
}

export interface ParsedArticle {
  number: string;
  title: string;
  text: string;
  paragraphs: ParsedParagraph[];
}

export interface StructuredLegalDocument {
  document_id: number | string;
  title: string;
  text: string;
  text_length: number;
  article_count: number;
  articles: ParsedArticle[];
}

export function parseLegalHtml(htmlOrText: string, documentId: number | string, docTitle: string = ""): StructuredLegalDocument {
  let plainText = htmlOrText;
  
  // If HTML, strip HTML tags cleanly
  if (htmlOrText.includes("<") && htmlOrText.includes(">")) {
    plainText = htmlOrText
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*[\/]?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&quot;/gi, '"')
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">");
  }

  // Normalize newlines and spaces
  plainText = plainText.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");

  // Extract Document Title if not passed
  let title = docTitle;
  if (!title) {
    const titleMatch = plainText.match(/SƏNƏDİN ADI:\s*(.+)/i) || plainText.match(/^([^\n]+)/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    } else {
      title = `e-Qanun Sənədi № ${documentId}`;
    }
  }

  // Extract Articles: Look for patterns like "Maddə 172. Başlıq" or "Maddə 172"
  const articles: ParsedArticle[] = [];
  const lines = plainText.split("\n");
  
  let currentArticle: ParsedArticle | null = null;
  let currentLines: string[] = [];

  const articleRegex = /^(?:=== )?(?:Maddə|MADDƏ)\s*([0-9]+(?:\-[0-9]+)?(?:\.[0-9]+)?)(?:[\.\:\s—\-]+(.*))?$/i;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(articleRegex);
    if (match) {
      if (currentArticle) {
        currentArticle.text = currentLines.join("\n").trim();
        currentArticle.paragraphs = extractParagraphs(currentArticle.text);
        articles.push(currentArticle);
      }

      const artNum = match[1];
      const rawTitle = match[2] ? match[2].replace(/===/g, "").trim() : "";
      currentArticle = {
        number: artNum,
        title: rawTitle,
        text: "",
        paragraphs: []
      };
      currentLines = [trimmed];
    } else {
      if (currentArticle) {
        currentLines.push(trimmed);
      }
    }
  }

  if (currentArticle) {
    currentArticle.text = currentLines.join("\n").trim();
    currentArticle.paragraphs = extractParagraphs(currentArticle.text);
    articles.push(currentArticle);
  }

  return {
    document_id: documentId,
    title: title.replace(/===/g, "").trim(),
    text: plainText,
    text_length: plainText.length,
    article_count: articles.length,
    articles: articles
  };
}

function extractParagraphs(articleText: string): ParsedParagraph[] {
  const paragraphs: ParsedParagraph[] = [];
  const pLines = articleText.split("\n");

  const paraRegex = /^([0-9]+(?:\.[0-9]+)*)[\.\)]\s*(.*)/;
  let currentP: ParsedParagraph | null = null;
  let pTextLines: string[] = [];

  for (let line of pLines) {
    const trimmed = line.trim();
    const match = trimmed.match(paraRegex);
    if (match) {
      if (currentP) {
        currentP.text = pTextLines.join(" ").trim();
        paragraphs.push(currentP);
      }
      currentP = {
        number: match[1],
        text: match[2]
      };
      pTextLines = [match[2]];
    } else {
      if (currentP) {
        pTextLines.push(trimmed);
      }
    }
  }

  if (currentP) {
    currentP.text = pTextLines.join(" ").trim();
    paragraphs.push(currentP);
  }

  return paragraphs;
}
