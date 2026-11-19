"use client"

import { useEffect, useId, useMemo, useState } from "react"
import {
  AlertTriangle,
  BookOpen,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  FileDown,
  FileText,
  History,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react"
import {
  copyDocumentText,
  downloadDocumentDocx,
  downloadDocumentPdf,
  stripDocumentTag,
} from "@/lib/document-export"
import {
  cleanParagraphLines,
  coerceMarkdownToStructuredDoc,
  EDUCATIONAL_DECISION_BANNER,
  serializeStructuredDocToMarkdown,
  toAzUpperCase,
  type StructuredLegalDocument,
} from "@/lib/legal-document-schema"
import { OfficialA4DocumentPreview } from "./OfficialA4DocumentPreview"

export interface DocumentVersionItem {
  id: string
  label: string
  createdAt: string
  content: string
  structuredDoc?: StructuredLegalDocument
  provider?: string
}

interface DocumentResultSheetProps {
  title: string
  slug: string
  content: string
  structuredDoc?: StructuredLegalDocument
  resolvedCourt?: string
  provider?: string
  educationalOnly?: boolean
  versions?: DocumentVersionItem[]
  onSelectVersion?: (versionId: string) => void
  onRegenerate?: () => void
  isRegenerating?: boolean
  onContentChange?: (nextContent: string, nextDoc?: StructuredLegalDocument) => void
}

type SheetTabId = "a4" | "edit" | "sources"

export function DocumentResultSheet({
  title,
  slug,
  content,
  structuredDoc,
  resolvedCourt,
  provider,
  educationalOnly = false,
  versions,
  onSelectVersion,
  onRegenerate,
  isRegenerating = false,
  onContentChange,
}: DocumentResultSheetProps) {
  const baseId = useId()
  const [activeTab, setActiveTab] = useState<SheetTabId>("a4")
  const [copied, setCopied] = useState(false)
  const [downloadingDocx, setDownloadingDocx] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")

  const initialDoc = useMemo<StructuredLegalDocument>(() => {
    if (structuredDoc) return structuredDoc
    return coerceMarkdownToStructuredDoc(content, {
      docType: slug || "petition",
      title,
      disclaimerBanner: educationalOnly ? EDUCATIONAL_DECISION_BANNER : undefined,
      topRightAddressee: resolvedCourt,
    })
  }, [structuredDoc, content, slug, title, educationalOnly, resolvedCourt])

  const [workingDoc, setWorkingDoc] = useState<StructuredLegalDocument>(initialDoc)

  // Local editor fields derived cleanly from workingDoc
  const [editTitle, setEditTitle] = useState(initialDoc.title)
  const [editSubtitle, setEditSubtitle] = useState(initialDoc.subtitle || "")
  const [editAddressee, setEditAddressee] = useState(initialDoc.topRightAddressee || "")
  const [editBodyText, setEditBodyText] = useState("")
  const [editRequestsText, setEditRequestsText] = useState("")
  const [editAttachmentsText, setEditAttachmentsText] = useState("")

  const syncEditorFromDoc = (doc: StructuredLegalDocument) => {
    setEditTitle(doc.title)
    setEditSubtitle(doc.subtitle || "")
    setEditAddressee(doc.topRightAddressee || "")
    const bodyBlocks: string[] = []
    if (doc.openingLine) bodyBlocks.push(doc.openingLine)
    for (const sec of doc.sections) {
      if (sec.heading) bodyBlocks.push(`## ${sec.heading}`)
      for (const p of sec.paragraphs) bodyBlocks.push(p)
      if (sec.numberedItems?.length) {
        sec.numberedItems.forEach((it, idx) => bodyBlocks.push(`${idx + 1}. ${it}`))
      }
    }
    setEditBodyText(bodyBlocks.join("\n\n"))
    setEditRequestsText((doc.requests || []).join("\n"))
    setEditAttachmentsText((doc.attachments || []).join("\n"))
  }

  useEffect(() => {
    setWorkingDoc(initialDoc)
    syncEditorFromDoc(initialDoc)
  }, [initialDoc])

  const handleApplyEdits = () => {
    const blocks = editBodyText.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
    const parsedSections: StructuredLegalDocument["sections"] = []
    let currentHeading: string | undefined
    let currentParagraphs: string[] = []
    let openingLine = ""

    const flush = () => {
      if (currentHeading || currentParagraphs.length > 0) {
        parsedSections.push({
          ...(currentHeading ? { heading: currentHeading } : {}),
          paragraphs: currentParagraphs,
        })
      }
      currentHeading = undefined
      currentParagraphs = []
    }

    blocks.forEach((block, idx) => {
      if (block.startsWith("## ") || block.startsWith("### ")) {
        flush()
        currentHeading = block.replace(/^#{2,3}\s+/, "").trim()
      } else if (idx === 0 && parsedSections.length === 0 && !currentHeading && workingDoc.openingLine) {
        openingLine = block.replace(/\s+/g, " ")
      } else {
        currentParagraphs.push(...cleanParagraphLines(block))
      }
    })
    flush()

    const nextDoc: StructuredLegalDocument = {
      ...workingDoc,
      title: toAzUpperCase(editTitle.trim()) || workingDoc.title,
      subtitle: editSubtitle.trim() || undefined,
      topRightAddressee: editAddressee.trim() || undefined,
      openingLine: openingLine || undefined,
      sections: parsedSections.length > 0 ? parsedSections : workingDoc.sections,
      requests: editRequestsText
        .split(/\r?\n/)
        .map((r) => r.replace(/^\d+[.)]\s*/, "").trim())
        .filter(Boolean),
      attachments: editAttachmentsText
        .split(/\r?\n/)
        .map((a) => a.replace(/^\d+[.)]\s*/, "").trim())
        .filter(Boolean),
    }

    setWorkingDoc(nextDoc)
    const serialized = serializeStructuredDocToMarkdown(nextDoc)
    onContentChange?.(serialized, nextDoc)
    setActiveTab("a4")
    setStatusMessage("Sənəd üzərindəki düzəlişlər tətbiq edildi və A4 önizləmə yeniləndi.")
  }

  const handleCopy = async () => {
    const ok = await copyDocumentText(workingDoc)
    if (ok) {
      setCopied(true)
      setStatusMessage("Sənədin tam rəsmi mətni kopyalandı.")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handlePdf = () => {
    const ok = downloadDocumentPdf(workingDoc.title || title, workingDoc)
    setStatusMessage(
      ok
        ? "A4 PDF çap pəncərəsi açıldı. 'PDF olaraq saxla' seçə bilərsiniz."
        : "Çap pəncərəsi açıla bilmədi."
    )
  }

  const handleDocx = async () => {
    setDownloadingDocx(true)
    try {
      await downloadDocumentDocx(slug || "huquqai-sened", workingDoc, title)
      setStatusMessage("Rəsmi A4 .docx sənədi yükləndi.")
    } finally {
      setDownloadingDocx(false)
    }
  }

  const warningCount = workingDoc.missingInfoWarnings?.length || 0
  const sourceCount = workingDoc.legalSources?.length || 0

  return (
    <section
      aria-label={`${title} nəticə sənədi`}
      className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg overflow-hidden"
    >
      <div className="bg-slate-50/90 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 px-4 pt-3.5 sm:px-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60 shrink-0">
              <FileText className="w-4 h-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-950 dark:text-white truncate">
                  {title}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="w-3 h-3" aria-hidden="true" />
                  A4 Rəsmi Format
                </span>
              </div>
              {workingDoc.topRightAddressee && (
                <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                  Ünvanlanan: <span className="font-semibold text-slate-800 dark:text-slate-200">{workingDoc.topRightAddressee}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} aria-hidden="true" />
                <span>Yenidən hazırla</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  <span>Kopyalandı</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Kopyala</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePdf}
              className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <FileDown className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
              <span>PDF (A4)</span>
            </button>

            <button
              type="button"
              onClick={handleDocx}
              disabled={downloadingDocx}
              className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-white shadow-md shadow-emerald-500/20 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{downloadingDocx ? "Yüklənir..." : "DOCX yüklə"}</span>
            </button>
          </div>
        </div>

        {/* WAI-ARIA single-row horizontal scroll tablist */}
        <div
          role="tablist"
          aria-label="Sənəd baxış rejimi"
          className="flex items-center gap-1 overflow-x-auto border-t border-slate-200/80 dark:border-slate-800/80 pt-1"
        >
          <button
            type="button"
            role="tab"
            id={`${baseId}-tab-a4`}
            aria-selected={activeTab === "a4"}
            onClick={() => setActiveTab("a4")}
            className={`relative flex-none inline-flex items-center gap-1.5 min-h-11 px-3.5 py-2 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-indigo-600 ${
              activeTab === "a4"
                ? "text-indigo-700 dark:text-indigo-300 border-b-[3px] border-indigo-600 dark:border-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border-b-[3px] border-transparent"
            }`}
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
            <span>A4 Önizləmə</span>
          </button>

          <button
            type="button"
            role="tab"
            id={`${baseId}-tab-edit`}
            aria-selected={activeTab === "edit"}
            onClick={() => setActiveTab("edit")}
            className={`relative flex-none inline-flex items-center gap-1.5 min-h-11 px-3.5 py-2 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-indigo-600 ${
              activeTab === "edit"
                ? "text-indigo-700 dark:text-indigo-300 border-b-[3px] border-indigo-600 dark:border-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border-b-[3px] border-transparent"
            }`}
          >
            <Edit3 className="w-4 h-4" aria-hidden="true" />
            <span>Redaktə Et</span>
          </button>

          <button
            type="button"
            role="tab"
            id={`${baseId}-tab-sources`}
            aria-selected={activeTab === "sources"}
            onClick={() => setActiveTab("sources")}
            className={`relative flex-none inline-flex items-center gap-1.5 min-h-11 px-3.5 py-2 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-indigo-600 ${
              activeTab === "sources"
                ? "text-indigo-700 dark:text-indigo-300 border-b-[3px] border-indigo-600 dark:border-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border-b-[3px] border-transparent"
            }`}
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span>
              Hüquqi Əsaslar ({sourceCount})
              {warningCount > 0 ? ` • ${warningCount} Xəbərdarlıq` : ""}
            </span>
          </button>
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {statusMessage}
        </p>
      </div>

      {/* Warning banner directly visible above paper when procedural info is missing */}
      {warningCount > 0 && activeTab === "a4" && (
        <div className="bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2.5 sm:px-5 flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          <div className="space-y-0.5">
            <span className="font-bold">Çatışmayan prosessual rekvizitlər ({warningCount}): </span>
            <span>{workingDoc.missingInfoWarnings[0]}</span>
            {warningCount > 1 && (
              <button
                type="button"
                onClick={() => setActiveTab("sources")}
                className="ml-2 underline font-bold"
              >
                Hamısına bax ({warningCount})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Version switcher when multiple iterations exist */}
      {versions && versions.length > 1 && (
        <div className="bg-slate-100/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="inline-flex items-center gap-1 font-bold text-slate-600 dark:text-slate-400 shrink-0">
            <History className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Versiyalar:</span>
          </span>
          {versions.map((v) => {
            const isCurrent = stripDocumentTag(v.content) === stripDocumentTag(serializeStructuredDocToMarkdown(workingDoc))
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectVersion?.(v.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold border shrink-0 transition-colors ${
                  isCurrent
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-600"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400"
                }`}
              >
                {v.label} ({v.createdAt})
              </button>
            )
          })}
        </div>
      )}

      {/* Tab Panel 1: Official A4 Paper */}
      <div
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-a4`}
        tabIndex={0}
        hidden={activeTab !== "a4"}
      >
        <div className="p-3 sm:p-6 bg-slate-200/75 dark:bg-slate-950/60 space-y-4">
          <OfficialA4DocumentPreview doc={workingDoc} />
          <div className="max-w-[794px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 px-1">
            <p>{workingDoc.professionalReviewNotice}</p>
            {provider && (
              <span className="shrink-0 font-mono text-[11px] opacity-75">
                Mühərrik: {provider}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab Panel 2: Structured Editor */}
      <div
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-edit`}
        hidden={activeTab !== "edit"}
      >
        <div className="p-4 sm:p-6 space-y-4 bg-white dark:bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={`${baseId}-edit-title`}
                className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1"
              >
                Sənədin başlığı (mərkəzləşdirilmiş)
              </label>
              <input
                id={`${baseId}-edit-title`}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full min-h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-base text-slate-950 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor={`${baseId}-edit-subtitle`}
                className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1"
              >
                Alt başlıq
              </label>
              <input
                id={`${baseId}-edit-subtitle`}
                type="text"
                value={editSubtitle}
                onChange={(e) => setEditSubtitle(e.target.value)}
                className="w-full min-h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-base text-slate-950 dark:text-white"
              />
            </div>
          </div>

          {workingDoc.layoutMode !== "contract-bilateral" && (
            <div>
              <label
                htmlFor={`${baseId}-edit-addr`}
                className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1"
              >
                Ünvanlandığı məhkəmə / orqan (yuxarı sağ hissə)
              </label>
              <input
                id={`${baseId}-edit-addr`}
                type="text"
                value={editAddressee}
                onChange={(e) => setEditAddressee(e.target.value)}
                className="w-full min-h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-base text-slate-950 dark:text-white"
              />
            </div>
          )}

          <div>
            <label
              htmlFor={`${baseId}-edit-body`}
              className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1"
            >
              Əsas mətn bölmələri (bölmə başlıqlarını &ldquo;## Başlıq&rdquo; kimi saxlayın)
            </label>
            <textarea
              id={`${baseId}-edit-body`}
              value={editBodyText}
              onChange={(e) => setEditBodyText(e.target.value)}
              rows={12}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-3.5 text-base text-slate-950 dark:text-slate-100 font-serif leading-relaxed"
            />
          </div>

          {workingDoc.layoutMode !== "contract-bilateral" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={`${baseId}-edit-reqs`}
                  className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1"
                >
                  Tələblər (hər sətrə 1 tələb)
                </label>
                <textarea
                  id={`${baseId}-edit-reqs`}
                  value={editRequestsText}
                  onChange={(e) => setEditRequestsText(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 text-base text-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor={`${baseId}-edit-atts`}
                  className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1"
                >
                  Əlavələr siyahısı (hər sətrə 1 sənəd)
                </label>
                <textarea
                  id={`${baseId}-edit-atts`}
                  value={editAttachmentsText}
                  onChange={(e) => setEditAttachmentsText(e.target.value)}
                  rows={4}
                  placeholder="Mövcud əlavələrinizi hər sətirdə qeyd edin..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 text-base text-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleApplyEdits}
              className="inline-flex items-center gap-2 min-h-12 px-5 py-2.5 rounded-xl text-sm font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span>Dəyişiklikləri tətbiq et</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Panel 3: Verified Legal Basis & Missing Requirements */}
      <div
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-sources`}
        hidden={activeTab !== "sources"}
      >
        <div className="p-4 sm:p-6 space-y-5 bg-white dark:bg-slate-900">
          {warningCount > 0 && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/40 p-4 space-y-2">
              <h3 className="text-sm font-extrabold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                <span>Çatışmayan rekvizitlər və hüquqi yoxlama qeydləri</span>
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-amber-900 dark:text-amber-100">
                {workingDoc.missingInfoWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {workingDoc.officialTemplateReference && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">
                  Rəsmi Mənbə və Şablon İstinadı
                </h3>
                <a
                  href={workingDoc.officialTemplateReference.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:underline"
                >
                  <span>{workingDoc.officialTemplateReference.portalName}</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {workingDoc.officialTemplateReference.note}
              </p>
            </div>
          )}

          <div className="space-y-2.5">
            <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">
              İstifadə olunan Rəsmi Qanunvericilik Normaları ({sourceCount})
            </h3>
            {workingDoc.legalSources.length > 0 ? (
              <div className="space-y-2">
                {workingDoc.legalSources.map((src, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {src.title}
                        {src.articleNumber ? ` — Maddə ${src.articleNumber}` : ""}
                      </span>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
                      >
                        <span>Rəsmi mənbə</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </div>
                    {src.note && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {src.note}...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Standart prosessual baza tətbiq olunmuşdur.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
