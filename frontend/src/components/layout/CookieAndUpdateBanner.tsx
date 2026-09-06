"use client"

import { useState, useEffect } from "react"
import { Cookie, Sparkles, Check, X, ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CookieAndUpdateBanner() {
  const [showCookie, setShowCookie] = useState(false)
  const [showUpdate, setShowUpdate] = useState(false)

  useEffect(() => {
    // Check cookie consent
    const consent = localStorage.getItem("huquqai_cookie_consent")
    if (!consent) {
      setShowCookie(true)
    }

    // Check version update notice
    const updateDismissed = localStorage.getItem("huquqai_v2_update_dismissed")
    if (!updateDismissed) {
      // Show notice after a slight delay
      const timer = setTimeout(() => {
        setShowUpdate(true)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const acceptCookies = () => {
    localStorage.setItem("huquqai_cookie_consent", "accepted")
    setShowCookie(false)
  }

  const dismissUpdate = () => {
    localStorage.setItem("huquqai_v2_update_dismissed", "true")
    setShowUpdate(false)
  }

  return (
    <>
      {/* 1. What's New / Version Update Notice Modal or Floating Toast */}
      {showUpdate && (
        <div className="fixed top-16 md:top-20 right-3 sm:right-6 z-50 max-w-md w-[calc(100vw-1.5rem)] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-white/95 dark:bg-slate-900/95 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-emerald-950/20 dark:shadow-black/60 backdrop-blur-xl relative">
            <button
              type="button"
              onClick={dismissUpdate}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg"
              title="Bağla"
              aria-label="Yenilənmə bildirişini bağla"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5 pr-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider mb-1">
                  Yeni Versiya v2.0
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Huquq AI Yeniləndi!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Rəsmi məhkəmələr bazası, dəqiq <strong>Rüsum Kalkulyatoru</strong>, təkmilləşdirilmiş süni zəka modeli və yeni dizayn istifadənizə verildi.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={dismissUpdate}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3.5 rounded-lg shadow-sm"
                  >
                    Aydındır
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Cookie Consent Bottom Banner */}
      {showCookie && (
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
