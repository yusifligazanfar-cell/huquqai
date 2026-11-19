"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, FileText, Sparkles } from "lucide-react"
import { generateStructuredLegalDocument } from "@/app/actions/petition"
import { useAuth } from "@/context/AuthContext"
import type { StructuredLegalDocument } from "@/lib/legal-document-schema"
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_MAP,
  type DocumentTypeId,
  type LegalDocumentFormInput,
} from "@/lib/legal-documents"
import { createClient } from "@/utils/supabase/client"
import { DocumentCreatorForm } from "./DocumentCreatorForm"
import { DocumentIcon } from "./DocumentIcon"
import { DocumentResultSheet, type DocumentVersionItem } from "./DocumentResultSheet"

export function DocumentCreatorWorkspace({ docType }: { docType: DocumentTypeId }) {
  const spec = DOCUMENT_TYPE_MAP[docType] || DOCUMENT_TYPE_MAP.petition
  const { supabaseUser } = useAuth()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [generatedText, setGeneratedText] = useState("")
  const [structuredDoc, setStructuredDoc] = useState<StructuredLegalDocument | undefined>(undefined)
  const [resolvedCourt, setResolvedCourt] = useState("")
  const [provider, setProvider] = useState("")
  const [lastInput, setLastInput] = useState<LegalDocumentFormInput | null>(null)
  const [versions, setVersions] = useState<DocumentVersionItem[]>([])
  const previewRef = useRef<HTMLDivElement>(null)

  const handleGenerate = async (input: LegalDocumentFormInput) => {
    setIsSubmitting(true)
    setSubmitError("")
    setLastInput(input)

    try {
      const savedKey =
        typeof window !== "undefined" ? localStorage.getItem("lexaz_groq_api_key") || "" : ""
      const res = await generateStructuredLegalDocument(input, savedKey || undefined)
      if (res.error) {
        setSubmitError(res.error)
        return
      }
      setGeneratedText(res.text)
      setStructuredDoc(res.structuredDoc)
      setResolvedCourt(res.resolvedCourt)
      setProvider(res.provider)

      const newVer: DocumentVersionItem = {
        id: String(Date.now()),
        label: `Versiya ${versions.length + 1}`,
        createdAt: new Date().toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" }),
        content: res.text,
        structuredDoc: res.structuredDoc,
        provider: res.provider,
      }
      setVersions((prev) => [newVer, ...prev].slice(0, 6))

      if (supabaseUser && res.text) {
        try {
          const supabase = createClient()
          const { data: convData } = await supabase
            .from("conversations")
            .insert({
              user_id: supabaseUser.id,
              type: "petition",
              title: `${spec.shortTitle}: ${input.party1}`.slice(0, 60),
            })
            .select()
            .single()

          if (convData) {
            await supabase.from("messages").insert([
              {
                conversation_id: convData.id,
                role: "user",
                content: `${spec.title} — ${input.party1}: ${input.facts}`.slice(0, 2000),
              },
              {
                conversation_id: convData.id,
                role: "assistant",
                content: res.text,
              },
            ])
          }
        } catch (dbErr) {
          console.warn("Supabase document save skipped:", dbErr)
        }
      }

      setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 100)
    } catch (err) {
      console.error("Document generation failed:", err)
      setSubmitError("Sənəd hazırlanarkən gözlənilməz xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectVersion = (verId: string) => {
    const found = versions.find((v) => v.id === verId)
    if (!found) return
    setGeneratedText(found.content)
    setStructuredDoc(found.structuredDoc)
    if (found.provider) setProvider(found.provider)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Link
              href="/petition"
              className="inline-flex items-center gap-2 min-h-11 px-3.5 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Bütün generatorlar (19)</span>
            </Link>

            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 min-h-11 px-3.5 py-2 rounded-xl text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>Hüquqi Çata qayıt</span>
            </Link>
          </div>

          <nav aria-label="Sənəd növləri keçid menyusu" className="-mx-1 px-1 overflow-x-auto pb-1">
            <div className="flex items-center gap-2 min-w-max">
              {DOCUMENT_TYPES.map((item) => {
                const active = item.id === docType
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex items-center gap-2 min-h-11 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                      active
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/20"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700"
                    }`}
                  >
                    <DocumentIcon name={item.iconName} className="w-4 h-4" />
                    <span>{item.shortTitle}</span>
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm">
            <DocumentCreatorForm
              docType={docType}
              isSubmitting={isSubmitting}
              onGenerate={handleGenerate}
              submitError={submitError}
            />
          </div>

          <div ref={previewRef} className="xl:col-span-7">
            {generatedText ? (
              <DocumentResultSheet
                title={spec.title}
                slug={spec.slug}
                content={generatedText}
                structuredDoc={structuredDoc}
                resolvedCourt={resolvedCourt}
                provider={provider}
                educationalOnly={spec.educationalOnly}
                versions={versions}
                onSelectVersion={handleSelectVersion}
                onRegenerate={lastInput ? () => handleGenerate(lastInput) : undefined}
                isRegenerating={isSubmitting}
                onContentChange={(nextText, nextDoc) => {
                  setGeneratedText(nextText)
                  if (nextDoc) setStructuredDoc(nextDoc)
                }}
              />
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[420px]">
                <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/50 mb-4">
                  <FileText className="w-7 h-7" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mb-2">
                  Rəsmi A4 Sənəd Önizləməsi Burada Görünəcək
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md leading-relaxed">
                  Soldakı rekvizitləri daxil edin (və ya &ldquo;Nümunə ilə doldur&rdquo; seçin) və{" "}
                  <strong className="text-slate-900 dark:text-white">Sənədi Hazırla</strong> düyməsinə
                  basın. Sənəd Times New Roman 14pt, 1.5 sətirarası interval, 1.25 sm abzas girintisi ilə
                  hazırlanacaq və əsl DOCX / A4 PDF olaraq ixrac ediləcək.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
