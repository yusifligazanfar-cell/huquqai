"use client"

import { toAzUpperCase, type StructuredLegalDocument } from "@/lib/legal-document-schema"

interface OfficialA4DocumentPreviewProps {
  doc: StructuredLegalDocument
}

/**
 * Renders an authentic Azerbaijan Republic A4 legal document preview.
 * Forces an explicit light-mode paper surface (`colorScheme: "only light"`,
 * white `#ffffff` background, black `#000000` ink, Times New Roman, 1.5 line
 * spacing, 1.25 cm paragraph indent) regardless of app theme.
 */
export function OfficialA4DocumentPreview({ doc }: OfficialA4DocumentPreviewProps) {
  const isRightHeader =
    doc.layoutMode !== "contract-bilateral" &&
    Boolean(doc.topRightAddressee || doc.topRightParties.length > 0 || (doc.topRightCaseMeta?.length ?? 0) > 0)

  const placeDate = doc.dateLocationLine || doc.dateLine || ""
  const splitPlaceDate = placeDate.split(/\s*[—–-]\s*/)
  const contractPlace = splitPlaceDate[0] || "Bakı şəhəri"
  const contractDate = splitPlaceDate.slice(1).join(" - ") || doc.dateLine || ""

  return (
    <div
      style={{
        colorScheme: "only light",
        backgroundColor: "#ffffff",
        color: "#000000",
        fontFamily: '"Times New Roman", Times, Georgia, serif',
      }}
      className="mx-auto w-full max-w-[794px] bg-white text-black border border-slate-300 shadow-md px-5 py-7 sm:px-[14mm] sm:py-[15mm] md:pl-[26mm] md:pr-[15mm] md:py-[18mm] text-[15px] sm:text-[14pt] leading-[1.5]"
    >
      {doc.disclaimerBanner && (
        <div className="border border-black px-3 py-2 text-center text-xs sm:text-[11.5pt] font-bold mb-5 tracking-wide">
          {doc.disclaimerBanner}
        </div>
      )}

      {isRightHeader && (
        <div className="flex justify-end mb-6">
          <div className="w-full sm:w-[60%] text-left leading-[1.28] space-y-1.5">
            {doc.topRightAddressee && (
              <p className="font-bold mb-2 [overflow-wrap:anywhere]">{doc.topRightAddressee}</p>
            )}

            {doc.topRightCaseMeta && doc.topRightCaseMeta.length > 0 && (
              <div className="space-y-0.5 text-[13.5px] sm:text-[13pt]">
                {doc.topRightCaseMeta.map((meta, idx) => (
                  <p key={idx} className="[overflow-wrap:anywhere]">
                    {meta}
                  </p>
                ))}
              </div>
            )}

            {doc.topRightParties.map((party, idx) => (
              <div key={idx} className="pt-1.5 space-y-0.5">
                <p className="font-bold">{party.roleLabel}:</p>
                {party.name && <p className="[overflow-wrap:anywhere]">{party.name}</p>}
                {(party.details || []).map((detail, dIdx) => (
                  <p key={dIdx} className="text-[13.5px] sm:text-[13pt] [overflow-wrap:anywhere]">
                    {detail}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center mb-5 space-y-1">
        <h3 className="text-[17px] sm:text-[15pt] font-bold tracking-[0.03em] leading-snug">
          {toAzUpperCase(doc.title)}
        </h3>
        {doc.subtitle && (
          <p className="text-[15px] sm:text-[14pt] leading-snug">{doc.subtitle}</p>
        )}
      </div>

      {doc.layoutMode === "contract-bilateral" && (
        <div className="flex items-center justify-between gap-4 mb-5 text-[14.5px] sm:text-[14pt]">
          <span>{contractPlace}</span>
          <span>{contractDate}</span>
        </div>
      )}

      {doc.openingLine && (
        <p className="text-justify mb-3 [text-indent:1.25cm] [overflow-wrap:anywhere]">
          {doc.openingLine}
        </p>
      )}

      <div className="space-y-3">
        {doc.sections.map((sec, sIdx) => (
          <div key={sIdx} className="space-y-2">
            {sec.heading && (
              <h4
                className={`font-bold text-[15px] sm:text-[14pt] mt-3 mb-1 ${
                  doc.layoutMode === "contract-bilateral" || doc.docType === "qarar"
                    ? "text-center"
                    : "text-left [text-indent:1.25cm]"
                }`}
              >
                {sec.heading}
              </h4>
            )}
            {sec.paragraphs.map((para, pIdx) => (
              <p
                key={pIdx}
                className="text-justify [text-indent:1.25cm] [overflow-wrap:anywhere]"
              >
                {para}
              </p>
            ))}
            {sec.numberedItems && sec.numberedItems.length > 0 && (
              <div className="space-y-1.5">
                {sec.numberedItems.map((item, iIdx) => (
                  <p
                    key={iIdx}
                    className="text-justify [text-indent:1.25cm] [overflow-wrap:anywhere]"
                  >
                    {iIdx + 1}. {item.replace(/^\d+[.)]\s*/, "")}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {doc.requests && doc.requests.length > 0 && (
        <div className="mt-5 space-y-2">
          <h4 className="font-bold text-center text-[15px] sm:text-[14pt] tracking-[0.02em]">
            {toAzUpperCase(doc.requestsHeading || "MƏHKƏMƏDƏN XAHİŞ EDİRƏM:")}
          </h4>
          <div className="space-y-1.5">
            {doc.requests.map((req, rIdx) => (
              <p
                key={rIdx}
                className="text-justify [text-indent:1.25cm] [overflow-wrap:anywhere]"
              >
                {rIdx + 1}. {req.replace(/^\d+[.)]\s*/, "")}
              </p>
            ))}
          </div>
        </div>
      )}

      {doc.attachments && doc.attachments.length > 0 && (
        <div className="mt-5 space-y-1.5">
          <h4 className="font-bold text-[15px] sm:text-[14pt]">ƏLAVƏLƏR:</h4>
          <ol className="list-decimal pl-6 space-y-1">
            {doc.attachments.map((att, aIdx) => (
              <li key={aIdx} className="text-justify [overflow-wrap:anywhere]">
                {att.replace(/^\d+[.)]\s*/, "")}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-8 pt-2">
        {doc.layoutMode === "contract-bilateral" && doc.topRightParties.length >= 2 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 leading-[1.3]">
            {doc.topRightParties.slice(0, 2).map((party, pIdx) => (
              <div key={pIdx} className="space-y-1">
                <p className="font-bold uppercase text-[14px] sm:text-[13pt]">
                  {party.roleLabel}
                </p>
                <p className="[overflow-wrap:anywhere]">{party.name}</p>
                {(party.details || []).map((d, dIdx) => (
                  <p key={dIdx} className="text-[13px] sm:text-[12pt] [overflow-wrap:anywhere]">
                    {d}
                  </p>
                ))}
                <p className="pt-4">İmza / Möhür: __________________</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {doc.signatures.map((sig, sIdx) => (
              <div
                key={sIdx}
                className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2"
              >
                <span>{sIdx === 0 && doc.dateLine ? `Tarix: ${doc.dateLine}` : ""}</span>
                <span className="sm:text-right">
                  <strong>{sig.role}:</strong> __________________ {sig.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
