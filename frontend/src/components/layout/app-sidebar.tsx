"use client"

import * as React from "react"
import { Scale, MessageSquare, Search, LayoutDashboard, Settings, ChevronRight, FileText, User, MessageCircle, Users, MessageSquareHeart, Landmark, Calculator } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/context/AuthContext"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar"

const items = [
  { title: "Süni Zəka Vəkili", url: "/chat", icon: MessageSquare },
  { title: "Ağıllı Axtarış", url: "/search", icon: Search },
  { title: "Rüsum Kalkulyatoru", url: "/calculator", icon: Calculator },
  { title: "Ərizə Yaz", url: "/petition", icon: FileText },
  { title: "Məhkəmələr", url: "/mehkemeler", icon: Landmark },
  { title: "Vəkillər Kataloqu", url: "/lawyers", icon: Scale },
  { title: "Konsultasiyalar", url: "/consultations", icon: MessageCircle },
  { title: "İcma (Sual-Cavab)", url: "/community", icon: Users },
  { title: "Rəy və Təkliflər", url: "/feedback", icon: MessageSquareHeart },
  { title: "Profilim", url: "/account", icon: User },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { supabaseUser, user, isLoaded } = useAuth()
  const { setOpenMobile } = useSidebar()
  const [recentChats, setRecentChats] = useState<{id: string, title: string}[]>([])
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!supabaseUser) {
      setRecentChats([])
      setPendingCount(0)
      return
    }

    const fetchAndCleanupChats = async () => {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, updated_at')
        .eq('user_id', supabaseUser.id)
        .eq('type', 'chat')
        .order('updated_at', { ascending: false })
        
      if (error || !data) return
      
      setRecentChats(data.slice(0, 5))
      
      if (data.length > 5) {
        const idsToDelete = data.slice(5).map((c: any) => c.id)
        await supabase
          .from('conversations')
          .delete()
          .in('id', idsToDelete)
      }
    }
    
    const fetchPendingConsultations = async () => {
      if (user?.role !== 'lawyer') return
      const supabase = createClient()
      const { count, error } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .eq('lawyer_id', supabaseUser.id)
        .eq('status', 'pending')
      
      if (!error && count !== null) {
        setPendingCount(count)
      }
    }
    
    fetchAndCleanupChats()
    fetchPendingConsultations()
    
    const handleUpdate = () => {
      fetchAndCleanupChats()
    }
    
    window.addEventListener("chatHistoryUpdated", handleUpdate)
    
    // Realtime channel for consultations
    const supabase = createClient()
    let consultationsChannel: any = null
    
    if (user?.role === 'lawyer') {
      consultationsChannel = supabase
        .channel('sidebar_consultations')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'consultations',
          filter: `lawyer_id=eq.${supabaseUser.id}`
        }, () => {
          fetchPendingConsultations()
        })
        .subscribe()
    }
    
    return () => {
      window.removeEventListener("chatHistoryUpdated", handleUpdate)
      if (consultationsChannel) {
        supabase.removeChannel(consultationsChannel)
      }
    }
  }, [supabaseUser, user?.role])

  // Do not block initial render waiting for async profile fetch;
  // sidebar should be instantly visible and responsive on all devices.
  const isMissingInfo = isLoaded && user?.role === 'lawyer' && (!user.licenseNumber || !user.experienceYears || !user.surname)
  if (isMissingInfo) return null

  const handleNav = () => {
    setOpenMobile(false)
  }

  return (
    <Sidebar className="border-r border-slate-200 dark:border-white/5 bg-white dark:bg-background shadow-[4px_0_24px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      <SidebarHeader className="flex h-16 items-center justify-between px-4 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-primary/5">
        <Link href="/chat" onClick={handleNav} className="flex items-center gap-3 transition-all hover:opacity-80">
          <img src="/logo.png" alt="HÜQUQ AI" className="h-9 w-auto drop-shadow-md" />
          <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">
            HÜQUQ AI
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-3 pt-6">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-3 px-2 font-semibold">
            Əsas Menyu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {items.map((item) => {
                const isActive = pathname.startsWith(item.url)
                const showBadge = item.url === "/consultations" && pendingCount > 0
                return (
                  <SidebarMenuItem key={item.title}>
                    <Link
                      href={item.url}
                      prefetch={true}
                      onClick={handleNav}
                      className={`w-full flex items-center h-11 px-3 py-2 rounded-xl transition-all duration-150 group relative cursor-pointer touch-manipulation active:scale-[0.98] ${
                        isActive
                          ? "bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_12px_rgba(234,88,12,0.1)] font-medium"
                          : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/5 hover:text-foreground"
                      }`}
                    >
                      <div className="relative">
                        <item.icon className={`h-4 w-4 mr-3 transition-transform duration-150 ${isActive ? "scale-110 text-orange-500" : "group-hover:scale-110"}`} />
                      </div>
                      <span className="font-medium text-sm flex-1">{item.title}</span>
                      {showBadge && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                          {pendingCount > 9 ? '9+' : pendingCount}
                        </span>
                      )}
                      {isActive && !showBadge && <ChevronRight className="h-3.5 w-3.5 opacity-70 ml-auto" />}
                    </Link>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {supabaseUser && recentChats.length > 0 && (
          <SidebarGroup className="mt-8">
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-3 px-2 font-semibold flex items-center justify-between">
              <span>Son Çatlar</span>
              <span className="bg-primary/20 text-primary text-[9px] px-1.5 py-0.5 rounded-sm">{recentChats.length}/5</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {recentChats.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <Link
                      href={`/chat?id=${chat.id}`}
                      prefetch={true}
                      onClick={handleNav}
                      className="w-full flex items-center h-9 px-3 py-1 rounded-lg transition-all text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/5 hover:text-foreground text-xs cursor-pointer touch-manipulation active:scale-[0.98]"
                      title={chat.title || "Yeni Söhbət"}
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-2 opacity-50" />
                      <span className="font-medium truncate flex-1">{chat.title || "Yeni Söhbət"}</span>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-white/5 p-4 bg-background/80 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2.5 text-xs font-medium text-muted-foreground/80 px-2 py-1.5 rounded-lg bg-black/20 border border-white/5 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Sistem aktivdir
          </div>
        </div>
        
        <div className="flex flex-col gap-1.5 px-1">
          <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground/60">
            <Link href="/privacy" className="hover:text-primary transition-colors">Məxfilik Siyasəti</Link>
            <span>&bull;</span>
            <Link href="/terms" className="hover:text-primary transition-colors">İstifadə Şərtləri</Link>
          </div>
          
          <div className="text-center text-[10px] text-muted-foreground/50 mt-1">
            Developed by <a href="https://www.codfy.tech" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary/70 hover:text-primary transition-colors">Codfy</a>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
