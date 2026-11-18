import {
  AlignmentType,
  BorderStyle,
  convertMillimetersToTwip,
  Document,
  Footer,
  LineRuleType,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx"
import { OFFICIAL_A4_FORMAT, toAzUpperCase, type StructuredLegalDocument } from "./legal-document-schema"

const FONT = OFFICIAL_A4_FORMAT.fontFamily
const BODY_SIZE = OFFICIAL_A4_FORMAT.bodyFontPt * 2 // 28 half-points = 14pt
const TITLE_SIZE = OFFICIAL_A4_FORMAT.titleFontPt * 2 // 30 half-points = 15pt
const SMALL_SIZE = 22 // 11pt for footer page numbering
const INDENT_125CM = convertMillimetersToTwip(12.5) // 1.25 sm = 709 twips
const LINE_150 = 360 // 1.5x line spacing
const LINE_120 = 288 // 1.2x compact header block

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
} as const

const CELL_NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
} as const

function run(text: string, opts: { bold?: boolean; italics?: boolean; size?: number } = {}): TextRun {
  return new TextRun({
    text,
    font: FONT,
    size: opts.size ?? BODY_SIZE,
    color: "000000",
    bold: opts.bold,
    italics: opts.italics,
  })
}

function justifiedBodyParagraph(text: string, indent = true): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.BOTH,
    indent: indent ? { firstLine: INDENT_125CM } : undefined,
    spacing: { line: LINE_150, lineRule: LineRuleType.AUTO, after: 120 },
    children: [run(text)],
  })
}

export function buildOfficialDocxDocument(doc: StructuredLegalDocument): Document {
  const children: (Paragraph | Table)[] = []

  // 1. Optional educational banner for Qərar Layihəsi (strictly required text, black & white)
  if (doc.disclaimerBanner) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: {
          top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
          left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
          right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        },
        spacing: { before: 80, after: 220, line: LINE_120, lineRule: LineRuleType.AUTO },
        children: [run(doc.disclaimerBanner, { bold: true, size: 24 })],
      })
    )
  }

  // 2. Top-Right Addressee & Party Header (Court petitions, appeals, cassations, state appeals, etc.)
  if (
    doc.layoutMode !== "contract-bilateral" &&
    (doc.topRightAddressee || doc.topRightParties.length > 0 || (doc.topRightCaseMeta?.length ?? 0) > 0)
  ) {
    const rightCellParagraphs: Paragraph[] = []

    if (doc.topRightAddressee) {
      rightCellParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.START,
          spacing: { line: LINE_120, lineRule: LineRuleType.AUTO, after: 120 },
          children: [run(doc.topRightAddressee, { bold: true })],
        })
      )
    }

    for (const meta of doc.topRightCaseMeta || []) {
      if (!meta.trim()) continue
      rightCellParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.START,
          spacing: { line: LINE_120, lineRule: LineRuleType.AUTO, after: 60 },
          children: [run(meta.trim())],
        })
      )
    }

    for (const party of doc.topRightParties) {
      rightCellParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.START,
          spacing: { line: LINE_120, lineRule: LineRuleType.AUTO, before: 80, after: 20 },
          children: [run(`${party.roleLabel}:`, { bold: true })],
        })
      )
      if (party.name.trim()) {
        rightCellParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.START,
            spacing: { line: LINE_120, lineRule: LineRuleType.AUTO, after: 20 },
            children: [run(party.name.trim())],
          })
        )
      }
      for (const detail of party.details || []) {
        if (!detail.trim()) continue
        rightCellParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.START,
            spacing: { line: LINE_120, lineRule: LineRuleType.AUTO, after: 20 },
            children: [run(detail.trim())],
          })
        )
      }
    }

    if (rightCellParagraphs.length === 0) {
      rightCellParagraphs.push(new Paragraph({ children: [] }))
    }

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 42, type: WidthType.PERCENTAGE },
                borders: CELL_NO_BORDERS,
                children: [new Paragraph({ children: [] })],
              }),
              new TableCell({
                width: { size: 58, type: WidthType.PERCENTAGE },
                borders: CELL_NO_BORDERS,
                children: rightCellParagraphs,
              }),
            ],
          }),
        ],
      })
    )

    children.push(new Paragraph({ spacing: { before: 120, after: 120 }, children: [] }))
  }

  // 3. Centered Document Title (Uppercase Bold 15pt) & Subtitle
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { before: 140, after: doc.subtitle ? 60 : 200, line: LINE_120, lineRule: LineRuleType.AUTO },
      children: [run(toAzUpperCase(doc.title), { bold: true, size: TITLE_SIZE })],
    })
  )

  if (doc.subtitle?.trim()) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        keepNext: true,
        spacing: { before: 0, after: 220, line: LINE_120, lineRule: LineRuleType.AUTO },
        children: [run(doc.subtitle.trim())],
      })
    )
  }

  // 4. Contract Location/Date Row & Preamble Parties
  if (doc.layoutMode === "contract-bilateral") {
    const placeDate = doc.dateLocationLine || doc.dateLine || ""
    const parts = placeDate.split(/\s*[—–-]\s*/)
    const leftPlace = parts[0] || "Bakı şəhəri"
    const rightDate = parts.slice(1).join(" - ") || doc.dateLine || ""

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: CELL_NO_BORDERS,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.START,
                    children: [run(leftPlace)],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: CELL_NO_BORDERS,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.END,
                    children: [run(rightDate)],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    )
    children.push(new Paragraph({ spacing: { after: 140 }, children: [] }))
  }

  // 5. Opening line
  if (doc.openingLine?.trim()) {
    children.push(justifiedBodyParagraph(doc.openingLine.trim(), true))
  }

  // 6. Document Sections (Facts, Legal Analysis, Contract Clauses)
  for (const sec of doc.sections) {
    if (sec.heading?.trim()) {
      children.push(
        new Paragraph({
          alignment:
            doc.layoutMode === "contract-bilateral" || doc.docType === "qarar"
              ? AlignmentType.CENTER
              : AlignmentType.START,
          keepNext: true,
          spacing: { before: 160, after: 100, line: LINE_150, lineRule: LineRuleType.AUTO },
          children: [run(sec.heading.trim(), { bold: true })],
        })
      )
    }

    for (const para of sec.paragraphs) {
      if (para.trim()) {
        children.push(justifiedBodyParagraph(para.trim(), true))
      }
    }

    if (sec.numberedItems && sec.numberedItems.length > 0) {
      sec.numberedItems.forEach((item, idx) => {
        const cleanItem = item.replace(/^\d+[.)]\s*/, "").trim()
        if (cleanItem) {
          children.push(justifiedBodyParagraph(`${idx + 1}. ${cleanItem}`, true))
        }
      })
    }
  }

  // 7. Demands / Requests Section ("MƏHKƏMƏDƏN XAHİŞ EDİRƏM:")
  if (doc.requests && doc.requests.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        keepNext: true,
        spacing: { before: 200, after: 120, line: LINE_150, lineRule: LineRuleType.AUTO },
        children: [run(toAzUpperCase(doc.requestsHeading || "MƏHKƏMƏDƏN XAHİŞ EDİRƏM:"), { bold: true })],
      })
    )

    doc.requests.forEach((req, idx) => {
      const cleanReq = req.replace(/^\d+[.)]\s*/, "").trim()
      if (cleanReq) {
        children.push(justifiedBodyParagraph(`${idx + 1}. ${cleanReq}`, true))
      }
    })
  }

  // 8. Attachments Section ("ƏLAVƏLƏR:" — ONLY actual user-provided items, never hallucinated)
  if (doc.attachments && doc.attachments.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.START,
        keepNext: true,
        spacing: { before: 200, after: 100, line: LINE_150, lineRule: LineRuleType.AUTO },
        children: [run("ƏLAVƏLƏR:", { bold: true })],
      })
    )
    doc.attachments.forEach((att, idx) => {
      const cleanAtt = att.replace(/^\d+[.)]\s*/, "").trim()
      if (cleanAtt) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.BOTH,
            indent: { left: convertMillimetersToTwip(6) },
            spacing: { line: LINE_150, lineRule: LineRuleType.AUTO, after: 60 },
            children: [run(`${idx + 1}. ${cleanAtt}`)],
          })
        )
      }
    })
  }

  // 9. Signatures & Date Block (Kept intact on the same page via cantSplit)
  children.push(new Paragraph({ spacing: { before: 260 }, children: [] }))

  if (doc.layoutMode === "contract-bilateral" && doc.topRightParties.length >= 2) {
    const leftParty = doc.topRightParties[0]
    const rightParty = doc.topRightParties[1]

    const partyColParagraphs = (party: typeof leftParty) => [
      new Paragraph({
        spacing: { line: LINE_120, lineRule: LineRuleType.AUTO, after: 60 },
        children: [run(toAzUpperCase(party.roleLabel), { bold: true })],
      }),
      new Paragraph({
        spacing: { line: LINE_120, lineRule: LineRuleType.AUTO, after: 40 },
        children: [run(party.name || "______________________")],
      }),
      ...(party.details || []).map(
        (d) =>
          new Paragraph({
            spacing: { line: LINE_120, lineRule: LineRuleType.AUTO, after: 20 },
            children: [run(d, { size: 24 })],
          })
      ),
      new Paragraph({
        spacing: { before: 220, line: LINE_120, lineRule: LineRuleType.AUTO },
        children: [run("İmza / Möhür: __________________")],
      }),
    ]

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 48, type: WidthType.PERCENTAGE },
                borders: CELL_NO_BORDERS,
                children: partyColParagraphs(leftParty),
              }),
              new TableCell({
                width: { size: 4, type: WidthType.PERCENTAGE },
                borders: CELL_NO_BORDERS,
                children: [new Paragraph({ children: [] })],
              }),
              new TableCell({
                width: { size: 48, type: WidthType.PERCENTAGE },
                borders: CELL_NO_BORDERS,
                children: partyColParagraphs(rightParty),
              }),
            ],
          }),
        ],
      })
    )
  } else {
    const sigRows = doc.signatures.map(
      (sig, i) =>
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              borders: CELL_NO_BORDERS,
              children: [
                new Paragraph({
                  alignment: AlignmentType.START,
                  spacing: { before: i > 0 ? 180 : 0, line: LINE_120, lineRule: LineRuleType.AUTO },
                  children: [run(i === 0 && doc.dateLine ? `Tarix: ${doc.dateLine}` : "")],
                }),
              ],
            }),
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              borders: CELL_NO_BORDERS,
              children: [
                new Paragraph({
                  alignment: AlignmentType.END,
                  spacing: { before: i > 0 ? 180 : 0, line: LINE_120, lineRule: LineRuleType.AUTO },
                  children: [
                    run(`${sig.role}: `, { bold: true }),
                    run(`__________________  ${sig.name || ""}`),
                  ],
                }),
              ],
            }),
          ],
        })
    )

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: sigRows,
      })
    )
  }

  return new Document({
    creator: "HüquqAI (huquqai.az)",
    title: doc.title,
    description: doc.subtitle || doc.title,
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(OFFICIAL_A4_FORMAT.widthMm),
              height: convertMillimetersToTwip(OFFICIAL_A4_FORMAT.heightMm),
            },
            margin: {
              top: convertMillimetersToTwip(OFFICIAL_A4_FORMAT.marginsMm.top),
              right: convertMillimetersToTwip(OFFICIAL_A4_FORMAT.marginsMm.right),
              bottom: convertMillimetersToTwip(OFFICIAL_A4_FORMAT.marginsMm.bottom),
              left: convertMillimetersToTwip(OFFICIAL_A4_FORMAT.marginsMm.left),
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.END,
                children: [
                  new TextRun({
                    children: ["Səhifə ", PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES],
                    font: FONT,
                    size: SMALL_SIZE,
                    color: "444444",
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })
}

export async function buildOfficialDocxBlob(doc: StructuredLegalDocument): Promise<Blob> {
  const docxDoc = buildOfficialDocxDocument(doc)
  return Packer.toBlob(docxDoc)
}

export async function buildOfficialDocxBuffer(doc: StructuredLegalDocument): Promise<Buffer> {
  const docxDoc = buildOfficialDocxDocument(doc)
  return Packer.toBuffer(docxDoc)
}
