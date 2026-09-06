"use client"

import { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, Clock, Sun, Moon } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"

export function Header() {
  const { isLoggedIn, user, isLoaded } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent rendering header if lawyer is in mandatory onboarding
  if (isLoaded && user?.role === 'lawyer') {
    const isMissingInfo = !user.licenseNumber || !user.experienceYears || !user.surname
    if (isMissingInfo) return null
  }

  const displayName = isLoaded && isLoggedIn && user ? user.name : "Qonaq İstifadəçi"
  const displayRole = isLoaded && isLoggedIn ? "User" : "Qeydiyyatsız"
  const initials = displayName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()

  return (
    <header className="sticky top-2 md:top-4 z-50 mx-2 md:mx-8 mb-4 md:mb-6 flex h-14 md:h-16 items-center justify-between rounded-2xl border border-slate-200 dark:border-white/5 bg-white/80 dark:bg-background/60 px-4 md:px-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-2xl transition-all">
      <div className="flex items-center gap-2 md:gap-4">
        <SidebarTrigger className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center p-0" />
      </div>
      <div className="flex items-center gap-3 sm:gap-5">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all hover:scale-105 active:scale-95"
            title={theme === "dark" ? "İşıqlı rejimə keç" : "Qaranlıq rejimə keç"}
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        )}

        <div className="h-5 w-[1px] bg-border/50"></div>
        <Link href="/account" className="flex items-center gap-3 cursor-pointer group">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-sm font-medium leading-none group-hover:text-primary transition-colors">{displayName}</span>
            <span className="text-xs text-muted-foreground mt-1">{displayRole}</span>
          </div>
          <Avatar className="h-10 w-10 border-2 border-primary/20 ring-2 ring-background group-hover:border-primary/50 transition-colors shadow-sm">
            <AvatarImage src={user?.avatar || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white font-semibold text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  )
}
