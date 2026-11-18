"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, FileText, Sparkles } from "lucide-react"
import { generateStructuredLegalDocument } from "@/app/actions/petition"
import { useAuth } from "@/context/AuthContext"
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_MAP,
  type DocumentTypeId,
  type LegalDocumentFormInput,
} from "@/lib/legal-documents"
import { createClient } from "@/utils/supabase/client"
import { DocumentCreatorForm } from "./DocumentCreatorForm"
import { DocumentIcon } from "./DocumentIcon"
import { DocumentResultSheet } from "./DocumentResultSheet"

export function DocumentCreatorWorkspace({ docType }: { docType: DocumentTypeId }) {
  const spec = DOCUMENT_TYPE_MAP[docType] || DOCUMENT_TYPE_MAP.petition
  const { supabaseUser } = useAuth()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [generatedText, setGeneratedText] = useState("")
  const [resolvedCourt, setResolvedCourt] = useState("")
  const [provider, setProvider] = useState("")
  const previewRef = useRef<HTMLDivElement>(null)

  const handleGenerate = async (input: LegalDocumentFormInput) => {
    setIsSubmitting(true)
    setSubmitError("")

    try {
      const savedKey =
        typeof window !== "undefined" ? localStorage.getItem("lexaz_groq_api_key") || "" : ""
      const res = await generateStructuredLegalDocument(input, savedKey || undefined)
      if (res.error) {
        setSubmitError(res.error)
        return
      }
      setGeneratedText(res.text)
      setResolvedCourt(res.resolvedCourt)
      setProvider(res.provider)

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Link
              href="/petition"
              className="inline-flex items-center gap-2 min-h-11 px-3.5 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Bütün sənəd növləri</span>
            </Link>

            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 min-h-11 px-3.5 py-2 rounded-xl text-sm font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
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
                    className={`inline-flex items-center gap-2 min-h-11 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                      active
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700"
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm">
            <DocumentCreatorForm
              docType={docType}
              isSubmitting={isSubmitting}
              onGenerate={handleGenerate}
              submitError={submitError}
            />
          </div>

          <div ref={previewRef} className="lg:col-span-7">
            {generatedText ? (
              <DocumentResultSheet
                title={spec.title}
                slug={spec.slug}
                content={generatedText}
                resolvedCourt={resolvedCourt}
                provider={provider}
                educationalOnly={spec.educationalOnly}
                onContentChange={setGeneratedText}
              />
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[360px]">
                <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/50 mb-4">
                  <FileText className="w-7 h-7" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mb-2">
                  Sənəd önizləməsi burada görünəcək
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md leading-relaxed">
                  Soldakı məlumatları daxil edin (və ya &ldquo;Nümunə ilə doldur&rdquo; seçin) və{" "}
                  <strong className="text-slate-900 dark:text-white">Sənədi Hazırla</strong> düyməsinə
                  basın. Hazır sənədi düzəliş edə, kopyalaya, PDF və Word formatında yükləyə bilərsiniz.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
