"use client"

import { useState, useEffect } from "react"
import { Cookie, Sparkles, X, MessageSquareHeart, ExternalLink, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function CookieAndUpdateBanner() {
  const [mounted, setMounted] = useState(false)
  const [showCookie, setShowCookie] = useState(false)
  const [showVersionUpdate, setShowVersionUpdate] = useState(true)
  const [showFeedbackBanner, setShowFeedbackBanner] = useState(true)

  useEffect(() => {
    setMounted(true)
    // Check cookie consent
    const consent = localStorage.getItem("huquqai_cookie_consent")
    if (!consent) {
      setShowCookie(true)
    }
  }, [])

  const acceptCookies = () => {
    localStorage.setItem("huquqai_cookie_consent", "accepted")
    setShowCookie(false)
  }

  const dismissVersionUpdate = () => {
    setShowVersionUpdate(false)
  }

  const dismissFeedback = () => {
    setShowFeedbackBanner(false)
  }

  return (
    <>
      {/* 1. LexAZ V.3.0.1 Top Announcement Banner */}
      {showVersionUpdate && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg border-b border-emerald-400/30 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="max-w-7xl mx-auto px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-white font-extrabold text-[11px] tracking-wide shrink-0 border border-white/30 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                LexAZ V.3.0.1
              </span>
              <p className="truncate text-white/95 text-xs sm:text-sm">
                <strong>Yenilənmiş versiya aktivdir:</strong> Dəqiq məhkəmə aidiyyəti, peşəkar iddia/ərizə şablonları və birbaşa sənəd redaktə (Edit) rejimi təqdim edildi!
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={dismissVersionUpdate}
                className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
                title="Bağla"
                aria-label="Yenilənmə bildirişini bağla"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Feedback Request Floating Banner (https://huquqai.az/feedback) */}
      {showFeedbackBanner && (
        <div className="fixed bottom-4 md:bottom-6 right-3 sm:right-6 z-[9999] max-w-md w-[calc(100vw-1.5rem)] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white/95 dark:bg-slate-900/95 border-2 border-emerald-500/50 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-emerald-950/20 dark:shadow-black/70 backdrop-blur-xl relative">
            <button
              type="button"
              onClick={dismissFeedback}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg"
              title="Bağla"
              aria-label="Rəy bildirişini bağla"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5 pr-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                <MessageSquareHeart className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider mb-1">
                  Sizin Rəyiniz Vacibdir
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Huquq AI-ın inkişafı üçün rəy bildirin
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Xahiş olunur, Huquq AI platformasını daha da təkmilləşdirmək üçün təklif və rəylərinizi bizimlə bölüşəsiniz.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href="/feedback"
                    onClick={dismissFeedback}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-8 px-4 rounded-lg shadow-sm transition-all hover:scale-105"
                  >
                    <span>Rəy bildir</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={dismissFeedback}
                    className="text-xs h-8 px-3 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Daha sonra
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Cookie Consent Bottom-Left Banner */}
      {showCookie && !showFeedbackBanner && (
        <div className="fixed bottom-3 sm:bottom-6 left-3 sm:left-6 z-50 max-w-lg w-[calc(100vw-1.5rem)] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl dark:shadow-black/70 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5">
                <Cookie className="w-5 h-5" />
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">
                  Kuki (Cookie) Məlumatlandırması
                </span>
                Təcrübənizi yaxşılaşdırmaq və hüquqi xidmətləri fərdiləşdirmək üçün kuki fayllarından istifadə edirik.
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
              <Button
                size="sm"
                onClick={acceptCookies}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-8 px-4 rounded-lg shadow-sm"
              >
                Qəbul et
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
