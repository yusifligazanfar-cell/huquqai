"use client"

import { useState, useEffect } from "react"
import { Search, Filter, FileText, ArrowRight, BookOpen, Clock, Loader2, Sparkles, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu"
import { motion, AnimatePresence } from "framer-motion"
import { executeSearch, type SearchResult } from "@/app/actions/search"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false)

  useEffect(() => {
    // Load search history from local storage on mount
    const savedState = localStorage.getItem('lexaz_search_page_history')
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        if (parsed) {
          if (parsed.query) setQuery(parsed.query)
          if (parsed.results) setResults(parsed.results)
          if (parsed.hasSearched) setHasSearched(parsed.hasSearched)
        }
      } catch (e) {
        console.error("Failed to parse search history")
      }
    }
    setHasLoadedHistory(true)
  }, [])

  // Save search history whenever it changes
  useEffect(() => {
    if (hasLoadedHistory) {
      try {
        // Prevent storing massive arrays by limiting to top 25 results to save quota
        const resultsToSave = results.length > 25 ? results.slice(0, 25) : results;
        const stateToSave = { query, results: resultsToSave, hasSearched }
        localStorage.setItem('lexaz_search_page_history', JSON.stringify(stateToSave))
      } catch (error) {
        console.warn("Local storage quota exceeded. Saving query only without results.")
        try {
          // Fallback: save only the query
          localStorage.setItem('lexaz_search_page_history', JSON.stringify({ query, results: [], hasSearched: false }))
        } catch (e) {}
      }
    }
  }, [query, results, hasSearched, hasLoadedHistory])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)
    setHasSearched(true)
    
    try {
      // Simulate slight network delay for UI polish
      await new Promise(r => setTimeout(r, 600))
      const searchResults = await executeSearch(query)
      setResults(searchResults)
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setIsSearching(false)
    }
  }

  // Highlight query words in the text for better UX
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    
    // Simplistic highlighter for demo purposes
    const words = highlight.split(' ').filter(w => w.length > 2);
    let highlightedText = text;
    
    words.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<span class="bg-yellow-300/60 dark:bg-yellow-500/40 text-yellow-900 dark:text-yellow-200 font-bold px-1.5 py-0.5 rounded-md border border-yellow-400/30">$1</span>');
    });
    
    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  }

  return (
    <div className="flex flex-col min-h-screen pb-10">
      
      {/* Background Decorators */}
      <div className="fixed top-20 left-1/4 w-96 h-96 bg-primary/20 dark:bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-orange-600/20 dark:bg-orange-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl w-full mx-auto px-4 md:px-6 pt-6 md:pt-10 flex-1 z-10">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 mb-10"
        >
          <div className="inline-flex items-center justify-center p-4 bg-primary rounded-2xl mb-4 shadow-[0_0_20px_rgba(234,88,12,0.3)]">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Ağıllı Axtarış
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Süni zəka dəstəkli axtarış motoru vasitəsilə Azərbaycan Respublikasının qanunvericilik bazasında saniyələr içində dəqiq maddələri tapın.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative max-w-3xl mx-auto mb-12 group"
        >
          <div className="absolute -inset-1 bg-primary/50 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
          <form onSubmit={handleSearch} className="relative flex items-center bg-white/80 dark:bg-background/60 backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.1)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] p-2 pl-6">
            <Search className="h-5 w-5 text-muted-foreground mr-3" />
            <Input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Axtarmaq istədiyiniz mövzunu yazın (məs: gecə vaxtı, mülkiyyət hüququ...)" 
              className="flex-1 bg-transparent border-none text-base focus-visible:ring-0 px-0 h-12"
            />
            <Button 
              type="submit"
              disabled={isSearching || !query.trim()} 
              className="rounded-full h-12 px-8 font-medium bg-primary text-white shadow-[0_4px_15px_rgba(234,88,12,0.4)] hover:scale-105 active:scale-95 transition-all"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Axtar"}
            </Button>
          </form>
          

        </motion.div>

        {/* Results Area */}
        <div className="max-w-4xl mx-auto">
          {hasSearched && (
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {isSearching ? "Axtarılır..." : `Nəticələr (${results.length})`}
              </h2>
              {!isSearching && results.length > 0 && (
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  0.1s ərzində tapıldı
                </span>
              )}
            </div>
          )}

          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {results.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-slate-50/90 dark:bg-card/40 backdrop-blur-md border-slate-200 dark:border-white/5 overflow-hidden hover:bg-slate-100/90 dark:hover:bg-card/60 hover:border-slate-300 dark:hover:border-white/10 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 group">
                    <CardHeader className="pb-3 border-b border-slate-200 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.02]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <h3 className="font-semibold text-lg text-foreground/90 group-hover:text-primary transition-colors">
                            {result.title}
                          </h3>
                        </div>
                        <Badge variant="secondary" className="bg-secondary/70 hover:bg-secondary border-slate-200 dark:border-white/5 text-foreground">
                          {result.source}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-5 pb-5 text-muted-foreground leading-relaxed whitespace-pre-line text-[15px]">
                      {highlightText(result.content, query)}
                    </CardContent>
                    <CardFooter className="pt-0 pb-4">
                      <Dialog>
                        <DialogTrigger render={<Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 ml-auto group/btn" />}>
                          Tam oxu 
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[700px] bg-white/95 dark:bg-card/95 backdrop-blur-2xl border-slate-200 dark:border-white/10 max-h-[85vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-foreground">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <FileText className="h-5 w-5 text-primary" />
                              </div>
                              {result.title}
                            </DialogTitle>
                          </DialogHeader>
                          <Badge variant="secondary" className="w-fit bg-secondary/70 border-slate-200 dark:border-white/5 mt-1 mb-4 text-foreground">
                            Mənbə: {result.source}
                          </Badge>
                          <div className="text-[15px] leading-relaxed text-foreground/90 whitespace-pre-line bg-secondary/30 dark:bg-secondary/20 p-6 rounded-xl border border-slate-200 dark:border-white/5">
                            {result.content}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}

              {!isSearching && hasSearched && results.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 bg-white/80 dark:bg-card/30 rounded-3xl border border-slate-200 dark:border-white/5 backdrop-blur-sm shadow-sm"
                >
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-secondary/50 mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-medium mb-2 text-foreground">Heç bir nəticə tapılmadı</h3>
                  <p className="text-muted-foreground">Fərqli açar sözlərlə yenidən cəhd edin və ya imla səhvlərini yoxlayın.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  )
}
