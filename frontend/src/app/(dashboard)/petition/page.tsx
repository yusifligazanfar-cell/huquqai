"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Clock, FileText, MessageSquare, Sparkles } from "lucide-react"
import { DocumentHubGrid } from "@/components/documents/DocumentHubGrid"
import { DocumentResultSheet } from "@/components/documents/DocumentResultSheet"
import { useAuth } from "@/context/AuthContext"
import { createClient } from "@/utils/supabase/client"

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
        const supabase = createClient()
        const { data: convs } = await supabase
          .from("conversations")
          .select("id, title, created_at")
          .eq("user_id", supabaseUser.id)
          .eq("type", "petition")
          .order("created_at", { ascending: false })
          .limit(6)

        if (!convs || convs.length === 0 || cancelled) return

        const convList = convs as { id: string; title: string | null; created_at: string }[]
        const ids = convList.map((c) => c.id)
        const { data: msgs } = await supabase
          .from("messages")
          .select("conversation_id, role, content, created_at")
          .in("conversation_id", ids)
          .eq("role", "assistant")
          .order("created_at", { ascending: false })

        if (cancelled) return

        const byConv = new Map<string, string>()
        for (const m of (msgs || []) as { conversation_id: string; content: string | null }[]) {
          if (!byConv.has(m.conversation_id) && m.content?.trim()) {
            byConv.set(m.conversation_id, m.content)
          }
        }

        const list: SavedPetition[] = convList
          .filter((c) => byConv.has(c.id))
          .map((c) => ({
            id: c.id,
            title: c.title || "Hüquqi Sənəd",
            created_at: c.created_at,
            content: byConv.get(c.id) || "",
          }))

        setSavedDocs(list)
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
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 px-3 py-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>HüquqAI Sənəd Tərtibatçısı</span>
            </div>
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
