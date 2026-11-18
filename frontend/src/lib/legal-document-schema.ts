export const OFFICIAL_A4_FORMAT = {
  pageSize: "A4",
  widthMm: 210,
  heightMm: 297,
  marginsMm: {
    top: 20,
    right: 15,
    bottom: 20,
    left: 30,
  },
  fontFamily: "Times New Roman",
  bodyFontPt: 14,
  titleFontPt: 15,
  lineSpacing: 1.5,
  paragraphIndentCm: 1.25,
  textColor: "#000000",
  backgroundColor: "#ffffff",
} as const

export const EDUCATIONAL_DECISION_BANNER =
  "TƏDRİS VƏ NÜMUNƏ MƏQSƏDLİDİR. RƏSMİ MƏHKƏMƏ QƏRARI DEYİLDİR."

export const PROFESSIONAL_REVIEW_NOTICE =
  "Bu sənəd layihəsi süni intellekt vasitəsilə avtomatik hazırlanmışdır və vəkil və ya hüquqşünas yoxlamasını əvəz etmir. Məhkəməyə və ya dövlət orqanına təqdim etməzdən əvvəl faktiki rekvizitləri və qüvvədə olan normaları yoxlayın."

export type DocumentLayoutMode =
  | "court-right-header"
  | "contract-bilateral"
  | "formal-address"
  | "speech"
  | "opinion"

export interface PartyBlock {
  roleLabel: string
  name: string
  details?: string[]
}

export interface DocumentClauseSection {
  heading?: string
  paragraphs: string[]
  numberedItems?: string[]
}

export interface VerifiedLegalSourceRef {
  title: string
  articleNumber?: string
  url: string
  note?: string
  verified?: boolean
}

export interface OfficialTemplateReference {
  portalName: string
  url: string
  note: string
}

export interface StructuredLegalDocument {
  version: "1.0"
  docType: string
  layoutMode: DocumentLayoutMode
  disclaimerBanner?: string
  topRightAddressee?: string
  topRightCaseMeta?: string[]
  topRightParties: PartyBlock[]
  title: string
  subtitle?: string
  dateLocationLine?: string
  openingLine?: string
  sections: DocumentClauseSection[]
  requestsHeading?: string
  requests: string[]
  attachments: string[]
  signatures: Array<{ role: string; name: string }>
  dateLine?: string
  missingInfoWarnings: string[]
  legalSources: VerifiedLegalSourceRef[]
  officialTemplateReference?: OfficialTemplateReference
  professionalReviewNotice: string
}

export function toAzUpperCase(text: string): string {
  return String(text || "").toLocaleUpperCase("az-AZ")
}

export function cleanParagraphLines(text: string): string[] {
  return String(text || "")
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
}

export function serializeStructuredDocToMarkdown(doc: StructuredLegalDocument): string {
  const lines: string[] = ["[ƏRİZƏ]"]

  if (doc.disclaimerBanner) {
    lines.push(`> **${doc.disclaimerBanner}**`)
    lines.push("")
  }

  if (doc.layoutMode !== "contract-bilateral" && doc.topRightAddressee) {
    lines.push(`**${doc.topRightAddressee}**`)
    if (doc.topRightCaseMeta && doc.topRightCaseMeta.length > 0) {
      for (const m of doc.topRightCaseMeta) {
        if (m.trim()) lines.push(m.trim())
      }
    }
    for (const p of doc.topRightParties) {
      lines.push(`**${p.roleLabel}:** ${p.name}`)
      for (const d of p.details || []) {
        if (d.trim()) lines.push(d.trim())
      }
    }
    lines.push("")
  }

  lines.push(`# ${doc.title}`)
  if (doc.subtitle) {
    lines.push(`**${doc.subtitle}**`)
  }
  lines.push("")

  if (doc.layoutMode === "contract-bilateral") {
    if (doc.dateLocationLine) {
      lines.push(doc.dateLocationLine)
      lines.push("")
    }
    if (doc.topRightParties.length > 0) {
      for (const p of doc.topRightParties) {
        const detailStr = p.details?.length ? ` (${p.details.join(", ")})` : ""
        lines.push(`**${p.roleLabel}:** ${p.name}${detailStr}`)
      }
      lines.push("")
    }
  }

  if (doc.openingLine) {
    lines.push(doc.openingLine)
    lines.push("")
  }

  for (const sec of doc.sections) {
    if (sec.heading) {
      lines.push(`### ${sec.heading}`)
    }
    for (const p of sec.paragraphs) {
      if (p.trim()) {
        lines.push(p.trim())
        lines.push("")
      }
    }
    if (sec.numberedItems && sec.numberedItems.length > 0) {
      sec.numberedItems.forEach((item, idx) => {
        lines.push(`${idx + 1}. ${item.replace(/^\d+\.\s*/, "").trim()}`)
      })
      lines.push("")
    }
  }

  if (doc.requests && doc.requests.length > 0) {
    lines.push(`## ${doc.requestsHeading || "MƏHKƏMƏDƏN XAHİŞ EDİRƏM:"}`)
    doc.requests.forEach((req, idx) => {
      lines.push(`${idx + 1}. ${req.replace(/^\d+\.\s*/, "").trim()}`)
    })
    lines.push("")
  }

  if (doc.attachments && doc.attachments.length > 0) {
    lines.push("### ƏLAVƏLƏR:")
    doc.attachments.forEach((att, idx) => {
      lines.push(`${idx + 1}. ${att.replace(/^\d+\.\s*/, "").trim()}`)
    })
    lines.push("")
  }

  for (const sig of doc.signatures) {
    lines.push(`**${sig.role}:** ______________________ / ${sig.name}`)
  }
  if (doc.dateLine) {
    lines.push(`**Tarix:** ${doc.dateLine}`)
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

export function extractStructuredJson(raw: string): Record<string, unknown> | null {
  const cleaned = String(raw || "").trim()
  if (!cleaned) return null

  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1].trim() : cleaned

  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")
  if (start === -1 || end <= start) return null

  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1))
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export function coerceMarkdownToStructuredDoc(
  rawMarkdown: string,
  defaults: {
    docType: string
    layoutMode?: DocumentLayoutMode
    title?: string
    subtitle?: string
    disclaimerBanner?: string
    topRightAddressee?: string
    topRightParties?: PartyBlock[]
    requestsHeading?: string
    signatures?: Array<{ role: string; name: string }>
    legalSources?: VerifiedLegalSourceRef[]
    officialTemplateReference?: OfficialTemplateReference
  }
): StructuredLegalDocument {
  const cleaned = rawMarkdown.replace(/^\s*\[ƏRİZƏ\]\s*/i, "").trim()
  const lines = cleaned.split(/\r?\n/)

  let title = toAzUpperCase(defaults.title || "HÜQUQİ SƏNƏD")
  let subtitle = defaults.subtitle || ""
  const sections: DocumentClauseSection[] = []
  let currentSec: DocumentClauseSection = { paragraphs: [] }
  const requests: string[] = []
  const attachments: string[] = []
  let mode: "header" | "body" | "requests" | "attachments" = "body"
  const detectedHeaderLines: string[] = []
  let sawHeading = false

  const flushSection = () => {
    if (
      currentSec.heading ||
      currentSec.paragraphs.length > 0 ||
      (currentSec.numberedItems && currentSec.numberedItems.length > 0)
    ) {
      sections.push(currentSec)
    }
    currentSec = { paragraphs: [] }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith("> ")) continue

    if (/^#{1,2}\s+/.test(line)) {
      const hText = line.replace(/^#{1,2}\s+/, "").replace(/\*\*/g, "").trim()
      if (/XAHİŞ|NƏTİCƏ|TƏLƏB/i.test(hText) && sawHeading) {
        flushSection()
        mode = "requests"
        continue
      }
      if (/ƏLAVƏ/i.test(hText) && sawHeading) {
        flushSection()
        mode = "attachments"
        continue
      }
      if (!sawHeading) {
        title = toAzUpperCase(hText)
        sawHeading = true
        mode = "body"
        continue
      }
      flushSection()
      mode = "body"
      currentSec = { heading: hText, paragraphs: [] }
      continue
    }

    if (line.startsWith("### ")) {
      const h3Text = line.slice(4).replace(/\*\*/g, "").trim()
      if (/^ƏLAVƏ/i.test(h3Text)) {
        flushSection()
        mode = "attachments"
        continue
      }
      if (/XAHİŞ|NƏTİCƏ/i.test(h3Text) && sawHeading) {
        flushSection()
        mode = "requests"
        continue
      }
      flushSection()
      mode = "body"
      currentSec = { heading: h3Text, paragraphs: [] }
      continue
    }

    if (!sawHeading && detectedHeaderLines.length < 10) {
      detectedHeaderLines.push(line.replace(/\*\*/g, ""))
      continue
    }

    if (/^\*\*Tarix:\*\*/i.test(line) || /^\*\*İmza/i.test(line) || /_{5,}/.test(line)) {
      continue
    }

    const numMatch = line.match(/^(?:\d+[.)]|[-*])\s+(.*)$/)
    if (mode === "requests") {
      requests.push(numMatch ? numMatch[1].trim() : line.replace(/\*\*/g, "").trim())
    } else if (mode === "attachments") {
      attachments.push(numMatch ? numMatch[1].trim() : line.replace(/\*\*/g, "").trim())
    } else {
      if (numMatch) {
        currentSec.numberedItems = currentSec.numberedItems || []
        currentSec.numberedItems.push(numMatch[1].replace(/\*\*/g, "").trim())
      } else {
        currentSec.paragraphs.push(line.replace(/\*\*/g, "").trim())
      }
    }
  }
  flushSection()

  if (sections.length === 0 && detectedHeaderLines.length > 0) {
    sections.push({ paragraphs: detectedHeaderLines })
  }

  return {
    version: "1.0",
    docType: defaults.docType,
    layoutMode: defaults.layoutMode || "court-right-header",
    disclaimerBanner: defaults.disclaimerBanner,
    topRightAddressee: defaults.topRightAddressee || detectedHeaderLines[0],
    topRightParties: defaults.topRightParties || [],
    title,
    subtitle,
    sections,
    requestsHeading: defaults.requestsHeading || "MƏHKƏMƏDƏN XAHİŞ EDİRƏM:",
    requests,
    attachments,
    signatures: defaults.signatures || [{ role: "Təqdim edən", name: "" }],
    dateLine: new Date().toLocaleDateString("az-AZ"),
    missingInfoWarnings: [],
    legalSources: defaults.legalSources || [],
    officialTemplateReference: defaults.officialTemplateReference,
    professionalReviewNotice: PROFESSIONAL_REVIEW_NOTICE,
  }
}
