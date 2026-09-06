"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link, CheckCircle2, AlertCircle, FileSearch, Loader2, Database, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { scrapeEQanun } from "@/app/actions/scraper"

export default function DocumentAnalysisPage() {
  const [url, setUrl] = useState("")
  const [isScraping, setIsScraping] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; title?: string } | null>(null)

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setIsScraping(true)
    setResult(null)
    
    try {
      const res = await scrapeEQanun(url)
      setResult({
        success: res.success,
        message: res.success ? (res.message || "") : (res.error || "Bilinməyən xəta"),
        title: res.title
      })
      if (res.success) {
        setUrl("")
      }
    } catch (error) {
      setResult({ success: false, message: "Sistem xətası baş verdi. Yenidən cəhd edin." })
    } finally {
      setIsScraping(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-10">
      
      {/* Background Decorators */}
      <div className="fixed top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
      <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

      <div className="max-w-4xl w-full mx-auto px-6 pt-12 flex-1 z-10">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 mb-12"
        >
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-2 border border-primary/20 ring-1 ring-white/5">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Qanunvericilik Bazasını Genişləndir
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            E-qanun.az saytından istədiyiniz məcəllə, qanun və ya fərmanın linkini daxil edin. Süni zəka həmin sənədi oxuyacaq və yaddaşına yazacaq.
          </p>
        </motion.div>

        {/* Input Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card/40 backdrop-blur-md border-white/10 shadow-2xl overflow-hidden relative">
            {isScraping && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <p className="text-lg font-medium text-white">E-qanun səhifəsi analiz edilir...</p>
                <p className="text-sm text-muted-foreground mt-2">Bu proses sənədin həcmindən asılı olaraq 10-20 saniyə çəkə bilər.</p>
              </div>
            )}

            <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-6">
              <CardTitle className="text-xl flex items-center gap-2">
                <Link className="h-5 w-5 text-primary" />
                Link ilə İdxal
              </CardTitle>
              <CardDescription className="text-[15px]">
                Nümunə: https://e-qanun.az/framework/897 (Konstitusiya)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8 pb-8">
              <form onSubmit={handleImport} className="space-y-6">
                <div className="flex gap-4">
                  <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <FileSearch className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input 
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Məsələn: https://e-qanun.az/framework/..."
                      className="pl-12 h-14 bg-background/50 border-white/10 text-base focus-visible:ring-primary/50 transition-all rounded-xl"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isScraping || !url.trim()}
                    className="h-14 px-8 rounded-xl font-medium text-base shadow-lg hover:scale-105 transition-transform"
                  >
                    Məlumatı Gətir
                  </Button>
                </div>
              </form>

              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className={`p-4 rounded-xl border ${result.success ? "bg-green-500/10 border-green-500/20" : "bg-destructive/10 border-destructive/20"} flex items-start gap-4`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className={`font-semibold ${result.success ? "text-green-500" : "text-destructive"}`}>
                        {result.success ? "Uğurlu Əməliyyat" : "Xəta"}
                      </h4>
                      <p className="text-foreground/90 mt-1">{result.message}</p>
                      {result.title && (
                        <p className="text-sm text-muted-foreground mt-2 border-t border-white/10 pt-2">
                          Sənəd adı: <span className="text-white font-medium">{result.title}</span>
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <ShieldCheck className="h-4 w-4" />
          LexAZ AI yalnız rəsmi e-qanun.az domenindən olan sənədləri qəbul edir.
        </motion.div>

      </div>
    </div>
  )
}
