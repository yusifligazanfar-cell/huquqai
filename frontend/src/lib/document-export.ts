"use client"

export function stripDocumentTag(rawContent: string): string {
  return rawContent.replace(/^\s*\[ƏRİZƏ\]\s*/i, "").trim()
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatInlineMarkdown(text: string): string {
  const escaped = escapeHtml(text)
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
}

export function markdownToPrintableHtml(markdown: string): string {
  const lines = stripDocumentTag(markdown).split(/\r?\n/)
  const out: string[] = []
  let inList = false

  const closeList = () => {
    if (inList) {
      out.push("</ul>")
      inList = false
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      closeList()
      continue
    }
    if (line.startsWith("### ")) {
      closeList()
      out.push(`<h3>${formatInlineMarkdown(line.slice(4))}</h3>`)
    } else if (line.startsWith("## ")) {
      closeList()
      out.push(`<h2>${formatInlineMarkdown(line.slice(3))}</h2>`)
    } else if (line.startsWith("# ")) {
      closeList()
      out.push(`<h1>${formatInlineMarkdown(line.slice(2))}</h1>`)
    } else if (line.startsWith("> ")) {
      closeList()
      out.push(`<blockquote>${formatInlineMarkdown(line.slice(2))}</blockquote>`)
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        out.push("<ul>")
        inList = true
      }
      out.push(`<li>${formatInlineMarkdown(line.replace(/^[-*]\s+/, ""))}</li>`)
    } else if (/^\d+\.\s+/.test(line)) {
      if (!inList) {
        out.push("<ul>")
        inList = true
      }
      out.push(`<li>${formatInlineMarkdown(line)}</li>`)
    } else {
      closeList()
      out.push(`<p>${formatInlineMarkdown(line)}</p>`)
    }
  }
  closeList()
  return out.join("\n")
}

export function downloadDocumentPdf(title: string, markdown: string): boolean {
  const printWindow = window.open("", "_blank")
  if (!printWindow) return false
  const bodyHtml = markdownToPrintableHtml(markdown)
  printWindow.document.write(`<!DOCTYPE html>
<html lang="az">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)} — HüquqAI</title>
  <style>
    @page { size: A4; margin: 22mm; }
    body {
      font-family: "Times New Roman", Georgia, serif;
      font-size: 13pt;
      line-height: 1.6;
      color: #0f172a;
      max-width: 720px;
      margin: 0 auto;
    }
    h1, h2 { font-size: 15pt; text-align: center; margin: 18px 0 12px; font-weight: 700; }
    h3 { font-size: 13pt; margin: 14px 0 6px; font-weight: 700; }
    p { margin: 8px 0; text-align: justify; }
    ul { margin: 8px 0 8px 20px; padding: 0; }
    li { margin: 4px 0; }
    blockquote { border-left: 3px solid #64748b; margin: 10px 0; padding: 6px 12px; color: #334155; font-size: 11pt; }
  </style>
</head>
<body>
${bodyHtml}
<script>
  window.onload = function() {
    window.print();
    setTimeout(function() { window.close(); }, 600);
  };
</script>
</body>
</html>`)
  printWindow.document.close()
  return true
}

export function downloadDocumentWord(filenameBase: string, markdown: string): void {
  const bodyHtml = markdownToPrintableHtml(markdown)
  const docContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(filenameBase)}</title>
  <style>
    body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; color: #000000; }
    h1, h2 { font-size: 14pt; text-align: center; font-weight: bold; margin: 14pt 0 8pt; }
    h3 { font-size: 12pt; font-weight: bold; margin: 10pt 0 4pt; }
    p { margin: 6pt 0; text-align: justify; }
    ul { margin: 6pt 0 6pt 18pt; }
    li { margin: 3pt 0; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`
  const blob = new Blob(["\ufeff", docContent], { type: "application/msword;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filenameBase}-${new Date().toISOString().slice(0, 10)}.doc`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function copyDocumentText(markdown: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(stripDocumentTag(markdown))
    return true
  } catch {
    return false
  }
}
