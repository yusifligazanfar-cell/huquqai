"use client"

import { useState, useEffect, useRef } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, Clock, Sun, Moon, X } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"

export function Header() {
  const { isLoggedIn, user, isLoaded, supabaseUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    try {
      if (sessionStorage.getItem("dismissedPendingBanner") === "1") {
        setBannerDismissed(true)
      }
    } catch {}
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isLoaded || !isLoggedIn || !supabaseUser?.id) {
      setNotifications([])
      return
    }

    const fetchNotifs = async () => {
      try {
        const res = await fetch(
          `/api/app/consultations?userId=${encodeURIComponent(supabaseUser.id)}`,
          { cache: "no-store" }
        )
        const json = await res.json().catch(() => ({}))
        const list = (json?.consultations || []) as any[]
        const filtered = list.filter((c) => {
          if (c.lawyer_id === supabaseUser.id) return true
          if (
            c.client_id === supabaseUser.id &&
            ["Qəbul edildi", "İmtina edildi", "Tamamlandı"].includes(c.status)
          ) {
            return true
          }
          return false
        })
        setNotifications(filtered.slice(0, 8))
      } catch {}
    }

    fetchNotifs()
    const timer = setInterval(fetchNotifs, 25000)
    window.addEventListener("notificationsUpdated", fetchNotifs)
    return () => {
      clearInterval(timer)
      window.removeEventListener("notificationsUpdated", fetchNotifs)
    }
  }, [isLoaded, isLoggedIn, supabaseUser?.id, user?.role])

  const unreadCount =
    user?.role === "lawyer"
      ? notifications.filter((n) => n.status === "Gözləyir" || n.status === "pending").length
      : notifications.length

  // Prevent rendering header if lawyer is in mandatory onboarding
  if (isLoaded && user?.role === 'lawyer') {
    const isMissingInfo = !user.licenseNumber || !user.experienceYears || !user.surname
    if (isMissingInfo) return null
  }

  const displayName = isLoaded && isLoggedIn && user ? `${user.name || ""} ${user.surname || ""}`.trim() || user.name : "Qonaq İstifadəçi"
  const displayRole = isLoaded && isLoggedIn
    ? user?.role === "lawyer"
      ? user?.licenseNumber?.startsWith("HÜQ:")
        ? "Hüquqşünas"
        : "Vəkil"
      : "Müştəri"
    : "Qeydiyyatsız"
  const initials = displayName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()

  const isPendingLawyer = isLoaded && isLoggedIn && user?.role === "lawyer" && !user?.isVerified

  return (
    <>
      <header className="sticky top-2 md:top-4 z-40 mx-1 sm:mx-2 md:mx-8 mb-2.5 sm:mb-4 md:mb-6 flex h-14 md:h-16 items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/85 dark:bg-background/70 px-2.5 sm:px-4 md:px-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-2xl transition-all">
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <SidebarTrigger
          aria-label="Menyunu aç"
          className="h-11 w-11 sm:h-9 sm:w-9 shrink-0 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center p-0"
        />
        <Link href="/chat" className="flex items-center gap-2 md:hidden min-w-0">
          <img src="/logo.png" alt="HÜQUQ AI" className="h-7 w-auto shrink-0" />
          <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white truncate">
            HÜQUQ AI
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-11 h-11 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all hover:scale-105 active:scale-95"
            title={theme === "dark" ? "İşıqlı rejimə keç" : "Qaranlıq rejimə keç"}
            aria-label="Mövzunu dəyiş"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        )}

        {isLoaded && isLoggedIn && (
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              aria-label="Bildirişlər"
              className="relative w-11 h-11 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Bildirişlər</span>
                  <Link
                    href="/consultations"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Konsultasiyalar &rarr;
                  </Link>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Hazırda yeni bildirişiniz yoxdur.
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isPending = n.status === "Gözləyir" || n.status === "pending"
                      const peerName =
                        user?.role === "lawyer"
                          ? `${n.client?.name || ""} ${n.client?.surname || ""}`.trim() || "Müştəri"
                          : `${n.lawyer?.name || ""} ${n.lawyer?.surname || ""}`.trim() || "Vəkil"
                      return (
                        <Link
                          key={n.id}
                          href={`/consultations/${n.id}`}
                          onClick={() => setNotifOpen(false)}
                          className="block px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {user?.role === "lawyer"
                                ? `${peerName} randevu istədi`
                                : `${peerName} cavab verdi`}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                isPending
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                  : n.status === "Qəbul edildi"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                              }`}
                            >
                              {n.status}
                            </span>
                          </div>
                          {(n.preferred_date || n.preferred_time || n.meeting_url) && (
                            <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between gap-2">
                              <span>{n.preferred_date} {n.preferred_time ? `• ${n.preferred_time}` : ""}</span>
                              {n.meeting_url && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  Cal.com Linki ✓
                                </span>
                              )}
                            </p>
                          )}
                        </Link>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="h-5 w-[1px] bg-border/50 hidden sm:block"></div>
        {isLoaded && !isLoggedIn ? (
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs sm:text-sm min-h-11 sm:min-h-10 px-3.5 sm:px-4 rounded-xl shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            <span>Giriş et</span>
          </Link>
        ) : (
          <Link href="/account" className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-h-11">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-medium leading-none group-hover:text-primary transition-colors">{displayName}</span>
              <span className="text-xs text-muted-foreground mt-1">{displayRole}</span>
            </div>
            <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border-2 border-primary/20 ring-2 ring-background group-hover:border-primary/50 transition-colors shadow-sm">
              <AvatarImage src={user?.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white font-semibold text-xs">{initials}</AvatarFallback>
            </Avatar>
          </Link>
        )}
      </div>
    </header>
    {isPendingLawyer && !bannerDismissed && (
      <div className="mx-1 sm:mx-2 md:mx-8 mb-4 rounded-2xl border-2 border-amber-400/70 dark:border-amber-600/60 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/60 dark:via-orange-950/40 dark:to-amber-950/60 px-4 py-3 shadow-md shadow-amber-500/10 flex items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <span className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
            <Clock className="w-4 h-4" />
          </span>
          <p className="text-xs sm:text-sm font-semibold text-amber-950 dark:text-amber-200 leading-snug">
            <span className="font-extrabold">Qonaq rejimi (Təsdiq gözləyir):</span> Anketiniz admin tərəfindən yoxlanılır. Təsdiqlənənə qədər Vəkillər Kataloqunda görünmürsünüz.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/account"
            className="hidden sm:inline text-xs font-bold text-amber-800 dark:text-amber-300 underline underline-offset-2"
          >
            Profilimə bax &rarr;
          </Link>
          <button
            type="button"
            aria-label="Bildirişi bağla"
            onClick={() => {
              setBannerDismissed(true)
              try {
                sessionStorage.setItem("dismissedPendingBanner", "1")
              } catch {}
            }}
            className="p-1.5 rounded-lg text-amber-800/70 dark:text-amber-300/70 hover:text-amber-950 dark:hover:text-amber-100 hover:bg-amber-500/15 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )}
    </>
  )
}
