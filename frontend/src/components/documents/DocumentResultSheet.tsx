"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Check, Copy, Edit3, FileDown, FileText, Save, Sparkles } from "lucide-react"
import {
  copyDocumentText,
  downloadDocumentPdf,
  downloadDocumentWord,
  stripDocumentTag,
} from "@/lib/document-export"

const MessageMarkdown = dynamic(() => import("@/components/chat/MessageMarkdown"), {
  ssr: false,
})

interface DocumentResultSheetProps {
  title: string
  slug: string
  content: string
  resolvedCourt?: string
  provider?: string
  educationalOnly?: boolean
  onContentChange?: (nextContent: string) => void
}

export function DocumentResultSheet({
  title,
  slug,
  content,
  resolvedCourt,
  provider,
  educationalOnly = false,
  onContentChange,
}: DocumentResultSheetProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(() => stripDocumentTag(content))
  const [copied, setCopied] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")

  useEffect(() => {
    setDraft(stripDocumentTag(content))
    setIsEditing(false)
  }, [content])

  const cleanText = stripDocumentTag(content)
  const activeText = isEditing ? draft : cleanText

  const handleToggleEdit = () => {
    if (isEditing) {
      const updated = `[ƏRİZƏ]\n${draft.trim()}`
      onContentChange?.(updated)
      setIsEditing(false)
      setStatusMessage("Düzəlişlər yadda saxlanıldı.")
    } else {
      setDraft(cleanText)
      setIsEditing(true)
    }
  }

  const handleCopy = async () => {
    const ok = await copyDocumentText(activeText)
    if (ok) {
      setCopied(true)
      setStatusMessage("Sənəd mətni mübadilə buferinə kopyalandı.")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handlePdf = () => {
    const opened = downloadDocumentPdf(title, activeText)
    if (!opened) {
      setStatusMessage("Çap pəncərəsini açmaq üçün brauzerdə pop-up icazəsini aktiv edin.")
    }
  }

  const handleWord = () => {
    downloadDocumentWord(slug || "huquqai-sened", activeText)
    setStatusMessage("Word (.doc) faylı yükləndi.")
  }

  return (
    <section
      aria-label={`${title} nəticə sənədi`}
      className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg overflow-hidden"
    >
      <div className="bg-slate-50/90 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 sm:px-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                  Hazırdır
                </span>
              </div>
              {resolvedCourt && (
                <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                  Ünvanlanan orqan: <span className="font-semibold text-slate-800 dark:text-slate-200">{resolvedCourt}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleEdit}
              className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {isEditing ? (
                <>
                  <Save className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  <span>Yadda saxla</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Düzəliş et</span>
                </>
              )}
            </button>

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
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={handleWord}
              className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Word</span>
            </button>
          </div>
        </div>

        {educationalOnly && (
          <p className="mt-2.5 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 rounded-lg px-3 py-2">
            Yalnız təhsil məqsədilə şablon əsasında yaradılmışdır. Rəsmi məhkəmə aktı hesab edilmir.
          </p>
        )}

        <p role="status" aria-live="polite" className="sr-only">
          {statusMessage}
        </p>
      </div>

      <div className="p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-950/40">
        {isEditing ? (
          <div className="space-y-2">
            <label
              htmlFor={`doc-edit-${slug}`}
              className="block text-sm font-bold text-slate-900 dark:text-slate-100"
            >
              Sənəd mətnini redaktə edin
            </label>
            <textarea
              id={`doc-edit-${slug}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={18}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-base text-slate-950 dark:text-slate-100 font-mono leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            />
          </div>
        ) : (
          <div className="rounded-xl bg-white text-slate-900 border border-slate-200/90 shadow-sm p-5 sm:p-8 max-w-full overflow-x-auto">
            <MessageMarkdown content={cleanText} paper />
          </div>
        )}
        {provider === "template-fallback" && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Qeyd: Şablon əsasında strukturlaşdırılmış ilkin layihə hazırlandı. Yuxarıdakı &ldquo;Düzəliş et&rdquo; düyməsi ilə istədiyiniz bəndləri yeniləyə bilərsiniz.
          </p>
        )}
      </div>
    </section>
  )
}
