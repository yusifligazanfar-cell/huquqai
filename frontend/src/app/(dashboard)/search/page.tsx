"use client"

import { useState, useEffect, type FormEvent, type KeyboardEvent, type ReactNode } from "react"
import {
  Search,
  FileText,
  ArrowRight,
  Clock,
  Loader2,
  Sparkles,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { motion, AnimatePresence } from "framer-motion"
import {
  executeSearch,
  enlargeSearchDocument,
  type SearchMode,
  type SearchResult,
} from "@/app/actions/search"

const SEARCH_MODES: Array<{ value: SearchMode; label: string; hint: string }> = [
  {
    value: "hybrid",
    label: "Hibrid (BM25 + Semantik)",
    hint: "Dəqiq maddə nömrələri və məna oxşarlığının birgə axtarışı",
  },
  {
    value: "semantic",
    label: "Semantik (Məna)",
    hint: "Vektor embeddings əsasında hüquqi məna yaxınlığı üzrə axtarış",
  },
  {
    value: "lexical",
    label: "Dəqiq Mətn",
    hint: "56,983 sənəd üzrə sürətli SQLite FTS5 açar söz axtarışı",
  },
]

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function renderHighlightedText(text: string, highlight: string): ReactNode {
  const words = Array.from(
    new Set(
      highlight
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 2)
    )
  ).slice(0, 8)

  if (words.length === 0) return text

  const pattern = new RegExp(`(${words.map(escapeRegex).join("|")})`, "gi")
  const parts = text.split(pattern)
  const lowerSet = new Set(words.map((w) => w.toLowerCase()))

  return parts.map((part, idx) =>
    lowerSet.has(part.toLowerCase()) ? (
      <mark
        key={idx}
        className="bg-yellow-300/60 dark:bg-yellow-500/40 text-yellow-950 dark:text-yellow-100 font-semibold px-1 py-0.5 rounded border border-yellow-400/40"
      >
        {part}
      </mark>
    ) : (
      <span key={idx}>{part}</span>
    )
  )
}

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [mode, setMode] = useState<SearchMode>("hybrid")
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [results, setResults] = useState<SearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false)
  const [enlargedDocs, setEnlargedDocs] = useState<Record<string, string>>({})
  const [loadingDocKey, setLoadingDocKey] = useState<string | null>(null)

  useEffect(() => {
    const savedState = localStorage.getItem("lexaz_search_page_history")
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        if (parsed) {
          if (parsed.query) setQuery(parsed.query)
          if (parsed.mode && ["hybrid", "semantic", "lexical"].includes(parsed.mode)) {
            setMode(parsed.mode)
          }
          if (Array.isArray(parsed.results)) setResults(parsed.results)
          if (parsed.hasSearched) setHasSearched(parsed.hasSearched)
        }
      } catch {
        console.error("Failed to parse search history")
      }
    }
    setHasLoadedHistory(true)
  }, [])

  useEffect(() => {
    if (hasLoadedHistory) {
      try {
        const resultsToSave = results.length > 25 ? results.slice(0, 25) : results
        localStorage.setItem(
          "lexaz_search_page_history",
          JSON.stringify({ query, mode, results: resultsToSave, hasSearched })
        )
      } catch {
        try {
          localStorage.setItem(
            "lexaz_search_page_history",
            JSON.stringify({ query, mode, results: [], hasSearched: false })
          )
        } catch {
          // ignore storage quota errors
        }
      }
    }
  }, [query, mode, results, hasSearched, hasLoadedHistory])

  const runSearch = async (targetMode: SearchMode = mode) => {
    const trimmed = query.trim()
    if (!trimmed) return

    setIsSearching(true)
    setHasSearched(true)
    setSearchError(null)

    try {
      const searchResults = await executeSearch(trimmed, targetMode)
      setResults(searchResults)
    } catch (error) {
      console.error("Search failed:", error)
      setSearchError("Axtarış zamanı texniki xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.")
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await runSearch(mode)
  }

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      return
    }
  }

  const handleOpenEnlarge = async (result: SearchResult) => {
    if (!result.documentId) return
    const cacheKey = `${result.documentId}::${result.articleNumber || "full"}`
    if (enlargedDocs[cacheKey] || loadingDocKey === cacheKey) return

    setLoadingDocKey(cacheKey)
    try {
      const full = await enlargeSearchDocument(result.documentId, result.articleNumber)
      if (full?.content) {
        setEnlargedDocs((prev) => ({ ...prev, [cacheKey]: full.content }))
      }
    } catch {
      // keep existing snippet fallback on error
    } finally {
      setLoadingDocKey(null)
    }
  }

  const elapsedLabel =
    results.length > 0 && typeof results[0].elapsedMs === "number"
      ? `${Math.max(0.01, results[0].elapsedMs / 1000).toFixed(2)}s ərzində tapıldı`
      : null

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <div className="fixed top-20 left-1/4 w-96 h-96 bg-primary/20 dark:bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-teal-600/15 dark:bg-teal-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl w-full mx-auto px-2 sm:px-4 md:px-6 pt-3 sm:pt-6 md:pt-10 flex-1 z-10 min-w-0">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3 sm:space-y-4 mb-6 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            Ağıllı Hüquq Axtarışı
          </h1>
          <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto px-1">
            56,983 rəsmi e-Qanun sənədi üzərində Hibrid BM25 + Semantik RAG mühərriki ilə dəqiq maddələri saniyələr içində tapın.
          </p>
        </motion.div>

        <search className="relative max-w-3xl mx-auto mb-8 sm:mb-10">
          <form
            method="GET"
            action="/search"
            onSubmit={handleSearch}
            aria-label="Qanunvericilik bazasında axtarış"
            className="space-y-4"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="legal-search-input" className="sr-only">
                Axtarmaq istədiyiniz hüquqi sual, açar söz və ya maddə nömrəsi
              </label>
              <span
                id="search-hint"
                className="text-xs text-muted-foreground text-center px-2"
              >
                Məsələn: &ldquo;Yaşa görə əmək pensiyası&rdquo;, &ldquo;Mülki Məcəllə 408&rdquo;, &ldquo;gecə vaxtı iş haqqı&rdquo;
              </span>

              <div className="relative group">
                <div className="absolute -inset-1 bg-primary/50 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-700 pointer-events-none" />
                <div className="relative flex items-center gap-1.5 bg-white/85 dark:bg-background/70 backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] p-1.5 pl-3.5 sm:p-2 sm:pl-5">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mr-1 sm:mr-2 shrink-0" aria-hidden="true" />
                  <Input
                    id="legal-search-input"
                    name="q"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Hüquqi sual və ya maddə axtarın..."
                    aria-describedby="search-hint"
                    required
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    enterKeyHint="search"
                    className="flex-1 min-w-0 bg-transparent border-none text-base focus-visible:ring-0 px-0 h-11"
                  />
                  <Button
                    type="submit"
                    disabled={isSearching || !query.trim()}
                    className="rounded-full h-11 px-4 sm:px-7 shrink-0 text-sm font-medium bg-primary text-white shadow-[0_4px_15px_rgba(234,88,12,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                        <span>Axtarılır</span>
                      </>
                    ) : (
                      "Axtar"
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <fieldset className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <legend className="sr-only">Axtarış rejimini seçin</legend>
              {SEARCH_MODES.map((m) => {
                const inputId = `search-mode-${m.value}`
                return (
                  <div key={m.value} className="relative">
                    <input
                      id={inputId}
                      type="radio"
                      name="search-mode"
                      value={m.value}
                      checked={mode === m.value}
                      onChange={() => {
                        setMode(m.value)
                        if (hasSearched && query.trim()) {
                          void runSearch(m.value)
                        }
                      }}
                      className="sr-only peer"
                    />
                    <label
                      htmlFor={inputId}
                      title={m.hint}
                      className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer border border-slate-200 dark:border-white/10 bg-white/75 dark:bg-card/50 text-muted-foreground hover:text-foreground peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 transition-colors"
                    >
                      {m.label}
                    </label>
                  </div>
                )
              })}
            </fieldset>
          </form>

          {isSearching && (
            <progress aria-label="Qanunvericilik axtarışı icra olunur" className="sr-only" />
          )}
          <div role="status" aria-live="polite" className="sr-only">
            {!isSearching && hasSearched && !searchError
              ? `${results.length} nəticə tapıldı.`
              : ""}
          </div>
          {searchError && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-300 dark:border-red-500/40 bg-red-50/90 dark:bg-red-950/40 px-4 py-3 text-sm text-red-800 dark:text-red-200"
            >
              {searchError}
            </div>
          )}
        </search>

        <div className="max-w-4xl mx-auto">
          {hasSearched && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">
                {isSearching ? "Nəticələr hazırlanır..." : `Nəticələr (${results.length})`}
              </h2>
              {!isSearching && results.length > 0 && elapsedLabel && (
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {elapsedLabel}
                </span>
              )}
            </div>
          )}

          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {results.map((result, index) => {
                const enlargeKey = result.documentId
                  ? `${result.documentId}::${result.articleNumber || "full"}`
                  : ""
                const fullText = (enlargeKey && enlargedDocs[enlargeKey]) || result.content
                const semPct =
                  typeof result.semanticScore === "number" && result.semanticScore > 0
                    ? Math.round(result.semanticScore * 100)
                    : null

                return (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: Math.min(index, 8) * 0.04 }}
                  >
                    <Card className="bg-slate-50/90 dark:bg-card/40 backdrop-blur-md border-slate-200 dark:border-white/5 overflow-hidden hover:bg-slate-100/90 dark:hover:bg-card/60 hover:border-slate-300 dark:hover:border-white/10 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 group">
                      <CardHeader className="pb-3 border-b border-slate-200 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.02]">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                              <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                            </div>
                            <h3 className="font-semibold text-lg text-foreground/90 group-hover:text-primary transition-colors">
                              {result.title}
                            </h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {semPct !== null && (
                              <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5">
                                Məna: {semPct}%
                              </Badge>
                            )}
                            <Badge variant="secondary" className="bg-secondary/70 border-slate-200 dark:border-white/5 text-foreground">
                              {result.source}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-4 sm:pt-5 pb-4 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line text-sm sm:text-[15px] [overflow-wrap:anywhere]">
                        {renderHighlightedText(result.content, query)}
                      </CardContent>

                      <CardFooter className="pt-0 pb-4 flex flex-wrap items-center justify-between gap-2">
                        {result.sourceUrl ? (
                          <a
                            href={result.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 min-h-9 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            e-qanun.ai rəsmi sənəd
                          </a>
                        ) : (
                          <span />
                        )}

                        <Dialog onOpenChange={(open) => { if (open) void handleOpenEnlarge(result) }}>
                          <DialogTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="min-h-9 text-primary hover:bg-primary/10 ml-auto group/btn"
                              />
                            }
                          >
                            Tam oxu
                            <ArrowRight
                              className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1"
                              aria-hidden="true"
                            />
                          </DialogTrigger>
                          <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[740px] bg-white/95 dark:bg-card/95 backdrop-blur-2xl border-slate-200 dark:border-white/10 max-h-[85dvh] overflow-y-auto p-4 sm:p-6">
                            <DialogHeader>
                              <DialogTitle className="text-lg sm:text-2xl font-bold flex items-start sm:items-center gap-2.5 sm:gap-3 text-slate-950 dark:text-white pr-6">
                                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                  <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                                </div>
                                <span className="[overflow-wrap:anywhere]">{result.title}</span>
                              </DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-wrap items-center gap-2 mt-1 mb-4">
                              <Badge variant="secondary" className="bg-secondary/70 border-slate-200 dark:border-white/5 text-foreground max-w-full whitespace-normal">
                                Mənbə: {result.source}
                              </Badge>
                              {result.sourceUrl && (
                                <a
                                  href={result.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline break-all"
                                >
                                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                  {result.sourceUrl}
                                </a>
                              )}
                            </div>
                            <div className="text-sm sm:text-[15px] leading-relaxed text-slate-900 dark:text-slate-100 whitespace-pre-line bg-secondary/30 dark:bg-secondary/20 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-white/5 [overflow-wrap:anywhere]">
                              {loadingDocKey === enlargeKey ? (
                                <span className="inline-flex items-center gap-2 text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                  Tam maddə mətni yüklənir...
                                </span>
                              ) : (
                                fullText
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardFooter>
                    </Card>
                  </motion.div>
                )
              })}

              {!isSearching && hasSearched && results.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 bg-white/80 dark:bg-card/30 rounded-3xl border border-slate-200 dark:border-white/5 backdrop-blur-sm shadow-sm"
                >
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-secondary/50 mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-medium mb-2 text-foreground">Heç bir nəticə tapılmadı</h3>
                  <p className="text-muted-foreground">
                    Fərqli açar sözlərlə yenidən cəhd edin, ya da &ldquo;Semantik (Məna)&rdquo; axtarış rejimini seçin.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
