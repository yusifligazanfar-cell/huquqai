"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Clock, FileText, MessageSquare, Sparkles } from "lucide-react"
import { DocumentHubGrid } from "@/components/documents/DocumentHubGrid"
import { DocumentResultSheet } from "@/components/documents/DocumentResultSheet"
import { useAuth } from "@/context/AuthContext"

interface SavedPetition {
  id: string
  title: string
  created_at: string
  content: string
}

export default function PetitionHubPage() {
  const { supabaseUser } = useAuth()
  const [savedDocs, setSavedDocs] = useState<SavedPetition[]>([])
  const [activeSaved, setActiveSaved] = useState<SavedPetition | null>(null)

  useEffect(() => {
    if (!supabaseUser) return
    let cancelled = false

    const loadSaved = async () => {
      try {
        const res = await fetch("/api/app/conversations", { cache: "no-store" })
        const json = await res.json().catch(() => ({}))
        const convList = ((json?.conversations || []) as { id: string; title: string | null; mode?: string; created_at: string }[])
          .filter((c) => c.mode === "petition")
          .slice(0, 6)

        if (convList.length === 0 || cancelled) return

        const list: SavedPetition[] = []
        for (const c of convList) {
          const mRes = await fetch(`/api/app/conversations?id=${encodeURIComponent(c.id)}`, { cache: "no-store" })
          const mJson = await mRes.json().catch(() => ({}))
          const assistantMsg = (mJson?.messages || []).find((m: any) => m.role === "assistant" && m.content?.trim())
          if (assistantMsg?.content) {
            list.push({
              id: c.id,
              title: c.title || "Hüquqi Sənəd",
              created_at: c.created_at,
              content: assistantMsg.content,
            })
          }
        }

        if (!cancelled) setSavedDocs(list)
      } catch (err) {
        console.warn("Saved documents fetch failed:", err)
      }
    }

    loadSaved()
    return () => {
      cancelled = true
    }
  }, [supabaseUser])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
              Rəsmi Hüquqi Sənəd Generatorları
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Azərbaycan Respublikasının Mülki, İnzibati, Əmək və Prosessual qanunvericiliyinə uyğun A4 formatlı rəsmi sənədlər hazırlayın — dərhal DOCX və PDF olaraq ixrac edin.
            </p>
          </div>

          <Link
            href="/chat"
            className="inline-flex items-center justify-center gap-2 min-h-12 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>Hüquqi Çatda sual ver</span>
          </Link>
        </header>

        <section aria-label="Sənəd növləri">
          <DocumentHubGrid />
        </section>

        {savedDocs.length > 0 && (
          <section aria-label="Son hazırlanan sənədlər" className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <h2 className="text-base sm:text-lg font-extrabold text-slate-950 dark:text-white">
                Son hazırladığınız sənədlər
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedDocs.map((doc) => {
                const isSelected = activeSaved?.id === doc.id
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setActiveSaved(isSelected ? null : doc)}
                    aria-pressed={isSelected}
                    className={`min-h-12 flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300"
                    }`}
                  >
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {doc.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(doc.created_at).toLocaleDateString("az-AZ")}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            {activeSaved && (
              <DocumentResultSheet
                title={activeSaved.title}
                slug="saxlanilan-sened"
                content={activeSaved.content}
                onContentChange={(next) =>
                  setActiveSaved((prev) => (prev ? { ...prev, content: next } : null))
                }
              />
            )}
          </section>
        )}
      </div>
    </div>
  )
}
