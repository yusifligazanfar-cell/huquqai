from bs4 import BeautifulSoup
import re

class LegalParser:
    @staticmethod
    def parse_legal_html(html_or_text: str, document_id: int, doc_title: str = ""):
        if "<" in html_or_text and ">" in html_or_text:
            soup = BeautifulSoup(html_or_text, "html.parser")
            plain_text = soup.get_text(separator="\n", strip=True)
        else:
            plain_text = html_or_text

        lines = plain_text.splitlines()
        title = doc_title
        if not title and lines:
            title = lines[0].strip()

        articles = []
        current_article = None
        current_lines = []

        article_regex = re.compile(r'^(?:=== )?(?:Maddə|MADDƏ)\s*([0-9]+(?:\-[0-9]+)?(?:\.[0-9]+)?)(?:[\.\:\s—\-]+(.*))?$', re.IGNORECASE)

        for line in lines:
            trimmed = line.strip()
            if not trimmed:
                continue

            match = article_regex.match(trimmed)
            if match:
                if current_article:
                    current_article["text"] = "\n".join(current_lines).strip()
                    articles.append(current_article)
                
                art_num = match.group(1)
                art_title = match.group(2).replace("===", "").strip() if match.group(2) else ""
                current_article = {
                    "number": art_num,
                    "title": art_title,
                    "text": "",
                    "paragraphs": []
                }
                current_lines = [trimmed]
            else:
                if current_article:
                    current_lines.append(trimmed)

        if current_article:
            current_article["text"] = "\n".join(current_lines).strip()
            articles.append(current_article)

        return {
            "document_id": document_id,
            "title": title,
            "text": plain_text,
            "text_length": len(plain_text),
            "article_count": len(articles),
            "articles": articles
        }
