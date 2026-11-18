"use client"

import { buildOfficialDocxBlob } from "./docx-exporter"
import {
  coerceMarkdownToStructuredDoc,
  OFFICIAL_A4_FORMAT,
  serializeStructuredDocToMarkdown,
  toAzUpperCase,
  type StructuredLegalDocument,
} from "./legal-document-schema"

export function stripDocumentTag(rawContent: string): string {
  return rawContent.replace(/^\s*\[ƏRİZƏ\]\s*/i, "").trim()
}

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function resolveExportDocument(
  source: StructuredLegalDocument | string,
  fallbackTitle = "Hüquqi Sənəd"
): StructuredLegalDocument {
  if (typeof source !== "string") return source
  return coerceMarkdownToStructuredDoc(source, {
    docType: "petition",
    title: fallbackTitle,
  })
}

export function buildOfficialA4PrintableHtml(doc: StructuredLegalDocument): string {
  const m = OFFICIAL_A4_FORMAT.marginsMm
  const parts: string[] = []

  if (doc.disclaimerBanner) {
    parts.push(`<div class="edu-banner">${escapeHtml(doc.disclaimerBanner)}</div>`)
  }

  if (
    doc.layoutMode !== "contract-bilateral" &&
    (doc.topRightAddressee || doc.topRightParties.length > 0 || (doc.topRightCaseMeta?.length ?? 0) > 0)
  ) {
    const headerLines: string[] = []
    if (doc.topRightAddressee) {
      headerLines.push(`<p class="hdr-addressee"><strong>${escapeHtml(doc.topRightAddressee)}</strong></p>`)
    }
    for (const meta of doc.topRightCaseMeta || []) {
      if (meta.trim()) headerLines.push(`<p class="hdr-line">${escapeHtml(meta.trim())}</p>`)
    }
    for (const p of doc.topRightParties) {
      headerLines.push(`<p class="hdr-role"><strong>${escapeHtml(p.roleLabel)}:</strong></p>`)
      if (p.name.trim()) headerLines.push(`<p class="hdr-line">${escapeHtml(p.name.trim())}</p>`)
      for (const d of p.details || []) {
        if (d.trim()) headerLines.push(`<p class="hdr-line">${escapeHtml(d.trim())}</p>`)
      }
    }
    parts.push(`<div class="right-header-wrap"><div class="right-header">${headerLines.join("")}</div></div>`)
  }

  parts.push(`<h1 class="doc-title">${escapeHtml(toAzUpperCase(doc.title))}</h1>`)
  if (doc.subtitle?.trim()) {
    parts.push(`<p class="doc-subtitle">${escapeHtml(doc.subtitle.trim())}</p>`)
  }

  if (doc.layoutMode === "contract-bilateral") {
    const placeDate = doc.dateLocationLine || doc.dateLine || ""
    const split = placeDate.split(/\s*[—–-]\s*/)
    const place = split[0] || "Bakı şəhəri"
    const dt = split.slice(1).join(" - ") || doc.dateLine || ""
    parts.push(
      `<div class="contract-date-row"><span>${escapeHtml(place)}</span><span>${escapeHtml(dt)}</span></div>`
    )
  }

  if (doc.openingLine?.trim()) {
    parts.push(`<p class="body-para">${escapeHtml(doc.openingLine.trim())}</p>`)
  }

  for (const sec of doc.sections) {
    if (sec.heading?.trim()) {
      const cls =
        doc.layoutMode === "contract-bilateral" || doc.docType === "qarar"
          ? "sec-heading centered"
          : "sec-heading"
      parts.push(`<h2 class="${cls}">${escapeHtml(sec.heading.trim())}</h2>`)
    }
    for (const p of sec.paragraphs) {
      if (p.trim()) parts.push(`<p class="body-para">${escapeHtml(p.trim())}</p>`)
    }
    if (sec.numberedItems && sec.numberedItems.length > 0) {
      sec.numberedItems.forEach((item, idx) => {
        const cleanItem = item.replace(/^\d+[.)]\s*/, "").trim()
        if (cleanItem) parts.push(`<p class="body-para">${idx + 1}. ${escapeHtml(cleanItem)}</p>`)
      })
    }
  }

  if (doc.requests && doc.requests.length > 0) {
    parts.push(
      `<h2 class="sec-heading centered requests-heading">${escapeHtml(
        toAzUpperCase(doc.requestsHeading || "MƏHKƏMƏDƏN XAHİŞ EDİRƏM:")
      )}</h2>`
    )
    doc.requests.forEach((r, idx) => {
      const cleanR = r.replace(/^\d+[.)]\s*/, "").trim()
      if (cleanR) parts.push(`<p class="body-para">${idx + 1}. ${escapeHtml(cleanR)}</p>`)
    })
  }

  if (doc.attachments && doc.attachments.length > 0) {
    parts.push(`<h3 class="att-heading">ƏLAVƏLƏR:</h3><ol class="att-list">`)
    for (const att of doc.attachments) {
      const cleanAtt = att.replace(/^\d+[.)]\s*/, "").trim()
      if (cleanAtt) parts.push(`<li>${escapeHtml(cleanAtt)}</li>`)
    }
    parts.push(`</ol>`)
  }

  if (doc.layoutMode === "contract-bilateral" && doc.topRightParties.length >= 2) {
    const p1 = doc.topRightParties[0]
    const p2 = doc.topRightParties[1]
    const renderCol = (p: typeof p1) => `
      <div class="sig-col">
        <p class="sig-role"><strong>${escapeHtml(p.roleLabel.toUpperCase())}</strong></p>
        <p>${escapeHtml(p.name)}</p>
        ${(p.details || []).map((d) => `<p class="sig-detail">${escapeHtml(d)}</p>`).join("")}
        <p class="sig-line">İmza / Möhür: __________________</p>
      </div>`
    parts.push(`<div class="contract-sigs">${renderCol(p1)}${renderCol(p2)}</div>`)
  } else {
    const sigHtml = doc.signatures
      .map(
        (sig, i) => `
      <div class="sig-row">
        <span>${i === 0 && doc.dateLine ? `Tarix: ${escapeHtml(doc.dateLine)}` : ""}</span>
        <span><strong>${escapeHtml(sig.role)}:</strong> __________________ ${escapeHtml(sig.name || "")}</span>
      </div>`
      )
      .join("")
    parts.push(`<div class="sig-block">${sigHtml}</div>`)
  }

  return `<!DOCTYPE html>
<html lang="az">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(doc.title)} — HüquqAI</title>
  <style>
    @page {
      size: A4 portrait;
      margin: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;
      @bottom-right {
        content: "Səhifə " counter(page) " / " counter(pages);
        font-family: "Times New Roman", Times, serif;
        font-size: 10pt;
        color: #444444;
      }
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: "Times New Roman", Times, serif;
      font-size: 14pt;
      line-height: 1.5;
    }
    .edu-banner {
      border: 1px solid #000000;
      padding: 6pt 10pt;
      text-align: center;
      font-size: 12pt;
      font-weight: 700;
      margin-bottom: 14pt;
    }
    .right-header-wrap {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 14pt;
    }
    .right-header {
      width: 58%;
      line-height: 1.25;
    }
    .right-header p { margin: 0 0 3pt 0; text-align: left; }
    .hdr-addressee { margin-bottom: 6pt !important; }
    .hdr-role { margin-top: 6pt !important; }
    .doc-title {
      font-size: 15pt;
      font-weight: 700;
      text-align: center;
      margin: 14pt 0 4pt 0;
      letter-spacing: 0.03em;
      break-after: avoid;
      page-break-after: avoid;
    }
    .doc-subtitle {
      font-size: 14pt;
      text-align: center;
      margin: 0 0 16pt 0;
      break-after: avoid;
      page-break-after: avoid;
    }
    .contract-date-row {
      display: flex;
      justify-content: space-between;
      margin: 6pt 0 14pt 0;
    }
    .sec-heading {
      font-size: 14pt;
      font-weight: 700;
      margin: 12pt 0 6pt 0;
      break-after: avoid;
      page-break-after: avoid;
    }
    .sec-heading.centered { text-align: center; }
    .requests-heading { margin-top: 16pt; }
    .body-para {
      margin: 0 0 8pt 0;
      text-align: justify;
      text-indent: 1.25cm;
      orphans: 3;
      widows: 3;
    }
    .att-heading {
      font-size: 14pt;
      font-weight: 700;
      margin: 14pt 0 6pt 0;
      break-after: avoid;
      page-break-after: avoid;
    }
    .att-list {
      margin: 0 0 12pt 18pt;
      padding: 0;
    }
    .att-list li {
      margin: 0 0 4pt 0;
      text-align: justify;
    }
    .sig-block {
      margin-top: 24pt;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sig-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 14pt;
    }
    .contract-sigs {
      display: flex;
      justify-content: space-between;
      gap: 18pt;
      margin-top: 24pt;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sig-col {
      width: 48%;
      line-height: 1.3;
    }
    .sig-col p { margin: 0 0 4pt 0; }
    .sig-detail { font-size: 12pt; }
    .sig-line { margin-top: 18pt !important; }
  </style>
</head>
<body>
${parts.join("\n")}
</body>
</html>`
}

export function downloadDocumentPdf(
  title: string,
  source: StructuredLegalDocument | string
): boolean {
  const doc = resolveExportDocument(source, title)
  const html = buildOfficialA4PrintableHtml(doc)

  try {
    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "0"
    iframe.setAttribute("aria-hidden", "true")
    document.body.appendChild(iframe)

    const idoc = iframe.contentDocument || iframe.contentWindow?.document
    if (idoc && iframe.contentWindow) {
      idoc.open()
      idoc.write(html)
      idoc.close()
      setTimeout(() => {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
        }, 1500)
      }, 250)
      return true
    }
  } catch (err) {
    console.warn("Iframe A4 print fallback triggered:", err)
  }

  const printWindow = window.open("", "_blank")
  if (!printWindow) return false
  printWindow.document.write(html)
  printWindow.document.close()
  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
  }, 250)
  return true
}

export async function downloadDocumentDocx(
  filenameBase: string,
  source: StructuredLegalDocument | string,
  fallbackTitle = "Hüquqi Sənəd"
): Promise<void> {
  const doc = resolveExportDocument(source, fallbackTitle)
  const blob = await buildOfficialDocxBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filenameBase || "huquqai-sened"}-${new Date().toISOString().slice(0, 10)}.docx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadDocumentWord(
  filenameBase: string,
  source: StructuredLegalDocument | string
): Promise<void> {
  return downloadDocumentDocx(filenameBase, source)
}

export async function copyDocumentText(source: StructuredLegalDocument | string): Promise<boolean> {
  try {
    const text =
      typeof source === "string"
        ? stripDocumentTag(source)
        : stripDocumentTag(serializeStructuredDocToMarkdown(source))
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
