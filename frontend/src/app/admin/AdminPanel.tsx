"use client"

import { useState, useMemo, useCallback } from "react"
import {
  Users,
  Shield,
  Search,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  UserCheck,
  BarChart3,
  Crown,
  Download,
  CheckCircle2,
  Clock,
  Scale,
  MessageSquare,
  MessageSquareHeart,
  Star,
  User,
  BadgeCheck,
  AlertCircle,
  Loader2,
} from "lucide-react"

interface RealUser {
  id: string
  name: string
  surname: string
  email: string
  role: string
  avatar_url: string | null
  phone: string
  city: string
  license_number: string
  experience_years: number | null
  specialties: string[]
  is_verified: boolean
  created_at: string | null
  last_sign_in_at: string | null
  consultations_count: number
  conversations_count: number
  posts_count: number
}

interface DailyTrend {
  date: string
  label: string
  signups: number
  conversations: number
  consultations: number
}

interface AdminStats {
  totalUsers: number
  totalCitizens: number
  totalLawyers: number
  verifiedLawyers: number
  pendingLawyers: number
  activeLast24h: number
  activeLast7d: number
  newUsersLast7d: number
  totalConversations: number
  totalMessages: number
  totalConsultations: number
  totalCommunityPosts: number
  totalFeedbacks: number
}

interface FeedbackRecord {
  id: string
  name: string
  email?: string
  category: string
  rating: number
  subject: string
  message: string
  status?: string
  created_at: string
}

function formatDateAz(iso: string | null | undefined, withTime = false) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("az-AZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    })
  } catch {
    return "—"
  }
}

function getInitials(name: string, surname?: string) {
  const full = `${name || ""} ${surname || ""}`.trim()
  if (!full) return "İ"
  const parts = full.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0][0].toUpperCase()
}

export default function AdminPanel() {
  const [password, setPassword] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [passError, setPassError] = useState("")

  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [mailtoFallback, setMailtoFallback] = useState<{ email: string; subject: string; body: string } | null>(null)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([])
  const [users, setUsers] = useState<RealUser[]>([])
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([])

  const [activeTab, setActiveTab] = useState<"lawyers" | "users" | "feedbacks">("lawyers")
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "lawyer">("all")
  const [lawyerStatusFilter, setLawyerStatusFilter] = useState<"all" | "verified" | "pending">("all")
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [noteTargetId, setNoteTargetId] = useState<string | null>(null)
  const [noteMode, setNoteMode] = useState<"request_info" | "reject">("request_info")
  const [reviewNote, setReviewNote] = useState("")

  const loadOverview = useCallback(async (pass: string) => {
    setLoading(true)
    setErrorText(null)
    try {
      const res = await fetch("/api/admin/overview", {
        headers: { "x-admin-password": pass },
        cache: "no-store",
      })
      const data = await res.json()
      if (res.status === 401) {
        setAuthed(false)
        setPassError("Şifrə yanlışdır!")
        return false
      }
      if (!res.ok) {
        throw new Error(data.error || "Məlumatlar yüklənmədi")
      }
      setStats(data.stats)
      setDailyTrend(data.dailyTrend14d || [])
      setUsers(data.users || [])
      setFeedbacks(data.feedbacks || [])
      return true
    } catch (err: any) {
      setErrorText(err?.message || "Server xətası baş verdi")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setPassError("")
    const ok = await loadOverview(password)
    if (ok) {
      setAdminPassword(password)
      setAuthed(true)
    }
  }

  async function handleReviewAction(
    userId: string,
    action: "approve" | "reject" | "request_info",
    note?: string
  ) {
    setVerifyingId(userId)
    setErrorText(null)
    setActionNotice(null)
    try {
      const res = await fetch("/api/admin/overview", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ userId, action, note }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Əməliyyat yerinə yetirilmədi")
      }

      if (action === "approve" || action === "reject") {
        const nextVerified = action === "approve"
        const prevUser = users.find((u) => u.id === userId)
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_verified: nextVerified } : u))
        )
        if (prevUser && prevUser.is_verified !== nextVerified) {
          setStats((prev) => {
            if (!prev) return prev
            const delta = nextVerified ? 1 : -1
            return {
              ...prev,
              verifiedLawyers: prev.verifiedLawyers + delta,
              pendingLawyers: prev.pendingLawyers - delta,
            }
          })
        }
      }

      setNoteTargetId(null)
      setReviewNote("")

      const label =
        action === "approve"
          ? "Vəkil / Hüquqşünas təsdiqləndi."
          : action === "request_info"
          ? "Doğrulama məlumatı sorğusu qeydə alındı."
          : "Müraciət rədd edildi."
      const mailNote = data.emailSent
        ? ` E-poçt bildirişi göndərildi (${data.targetEmail || ""}).`
        : data.emailWarning
        ? ` (${data.emailWarning})`
        : ""
      setActionNotice(`${label}${mailNote}`)
      if (!data.emailSent && data.targetEmail) {
        setMailtoFallback({
          email: data.targetEmail,
          subject:
            action === "approve"
              ? "HÜQUQ AI — Hesabınız təsdiqləndi və aktivdir"
              : action === "request_info"
              ? "HÜQUQ AI — Doğrulama məlumatı tələb olunur"
              : "HÜQUQ AI — Qeydiyyat müraciətinizin statusu",
          body:
            note ||
            (action === "approve"
              ? "Təbriklər! HÜQUQ AI platformasında hesabınız təsdiqləndi və aktivdir."
              : action === "request_info"
              ? "Zəhmət olmasa vəsiqə / diplom təsdiq sənədinizi cavab olaraq göndərin."
              : "Təəssüf ki, müraciətiniz təsdiqlənmədi."),
        })
      } else {
        setMailtoFallback(null)
      }
    } catch (err: any) {
      setErrorText(err?.message || "Əməliyyat zamanı xəta")
    } finally {
      setVerifyingId(null)
    }
  }

  const lawyers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users
      .filter((u) => u.role === "lawyer")
      .filter((u) => {
        if (lawyerStatusFilter === "verified") return u.is_verified
        if (lawyerStatusFilter === "pending") return !u.is_verified
        return true
      })
      .filter((u) => {
        if (!q) return true
        const full = `${u.name} ${u.surname}`.toLowerCase()
        return (
          full.includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.license_number.toLowerCase().includes(q) ||
          u.specialties.some((s) => s.toLowerCase().includes(q))
        )
      })
  }, [users, search, lawyerStatusFilter])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users
      .filter((u) => (roleFilter === "all" ? true : roleFilter === "lawyer" ? u.role === "lawyer" : u.role !== "lawyer"))
      .filter((u) => {
        if (!q) return true
        const full = `${u.name} ${u.surname}`.toLowerCase()
        return full.includes(q) || u.email.toLowerCase().includes(q)
      })
  }, [users, roleFilter, search])

  const maxChartVal = useMemo(() => {
    const vals = dailyTrend.map((d) => Math.max(d.signups, d.conversations, d.consultations, 1))
    return Math.max(...vals, 1)
  }, [dailyTrend])

  function exportCSV() {
    const header = ["Ad Soyad", "E-poçt", "Rol", "Təsdiq", "Lisenziya", "Təcrübə (il)", "Qeydiyyat", "Son Giriş", "Söhbətlər", "Konsultasiyalar"]
    const rows = filteredUsers.map((u) => [
      `"${`${u.name} ${u.surname}`.trim()}"`,
      `"${u.email}"`,
      u.role === "lawyer" ? "Vəkil" : "Vətəndaş",
      u.role === "lawyer" ? (u.is_verified ? "Təsdiqlənib" : "Gözləyir") : "—",
      `"${u.license_number || ""}"`,
      u.experience_years ?? "",
      `"${formatDateAz(u.created_at, true)}"`,
      `"${formatDateAz(u.last_sign_in_at, true)}"`,
      u.conversations_count,
      u.consultations_count,
    ])
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `huquqai-real-users-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── LOGIN SCREEN ──
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#070b09] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-600/15 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-teal-600/10 rounded-full blur-[130px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-emerald-500/20 rounded-3xl p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">HuquqAI Admin</h1>
              <p className="text-sm text-white/50 mt-1">Real İstifadəçilər və Statistika Paneli</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Admin şifrəsini daxil edin"
                  className="w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-white/35 outline-none focus:border-emerald-500 transition-colors"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  aria-label="Şifrəni göstər"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passError && <p className="text-red-400 text-xs text-center">{passError}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Daxil Ol</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ── DASHBOARD ──
  return (
    <div className="min-h-screen bg-[#070b09] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[700px] h-[350px] bg-emerald-600/10 rounded-full blur-[180px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[350px] bg-teal-600/8 rounded-full blur-[160px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#070b09]/85 backdrop-blur-2xl border-b border-white/10 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/25">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-white text-sm sm:text-base leading-none">HuquqAI Admin</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Real Baza
                </span>
              </div>
              <p className="text-[11px] text-white/45 mt-0.5">Supabase Auth &amp; Verilənlər Bazası Statistikası</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 text-xs font-semibold text-white/75 hover:text-white border border-white/15 hover:border-emerald-500/40 rounded-xl px-3 py-2 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> CSV İxrac
            </button>
            <button
              onClick={() => loadOverview(adminPassword)}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-semibold text-white/75 hover:text-white border border-white/15 hover:border-emerald-500/40 rounded-xl px-3 py-2 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Yenilə
            </button>
            <button
              onClick={() => {
                setAuthed(false)
                setAdminPassword("")
                setPassword("")
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 border border-red-500/25 hover:border-red-500/50 rounded-xl px-3 py-2 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" /> Çıxış
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 relative z-10">
        {errorText && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs sm:text-sm text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

        {actionNotice && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionNotice}</span>
            </div>
            {mailtoFallback && (
              <a
                href={`mailto:${mailtoFallback.email}?subject=${encodeURIComponent(mailtoFallback.subject)}&body=${encodeURIComponent(mailtoFallback.body)}`}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0"
              >
                E-poçtla göndər ({mailtoFallback.email})
              </a>
            )}
          </div>
        )}

        {/* 4 Real Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white/50">Cəmi İstifadəçi</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">
              {stats?.totalUsers ?? 0}
            </p>
            <p className="text-[11px] text-white/45 mt-1">
              {stats?.totalCitizens ?? 0} vətəndaş · {stats?.totalLawyers ?? 0} vəkil
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-emerald-200/80">Qeydiyyatlı Vəkillər</span>
              <Scale className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">
              {stats?.totalLawyers ?? 0}
            </p>
            <p className="text-[11px] text-emerald-300/75 mt-1">
              {stats?.verifiedLawyers ?? 0} təsdiqlənib · {stats?.pendingLawyers ?? 0} gözləyir
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white/50">Real Aktivlik</span>
              <UserCheck className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">
              {stats?.activeLast7d ?? 0}
            </p>
            <p className="text-[11px] text-white/45 mt-1">
              Son 24s: {stats?.activeLast24h ?? 0} · Yeni (7g): +{stats?.newUsersLast7d ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white/50">Söhbət &amp; Müraciət</span>
              <MessageSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">
              {stats?.totalConversations ?? 0}
            </p>
            <p className="text-[11px] text-white/45 mt-1">
              {stats?.totalMessages ?? 0} mesaj · {stats?.totalConsultations ?? 0} konsultasiya
            </p>
          </div>
        </div>

        {/* Real 14-Day Trend Bar Chart */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Son 14 Günün Real Aktivliyi</h2>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-white/60">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Söhbətlər
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-400" /> Yeni Qeydiyyat
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Konsultasiya
              </span>
            </div>
          </div>

          <div className="grid grid-cols-14 gap-1.5 items-end h-28 pt-2">
            {dailyTrend.map((d) => {
              const convH = Math.max((d.conversations / maxChartVal) * 100, d.conversations > 0 ? 10 : 3)
              const signH = Math.max((d.signups / maxChartVal) * 100, d.signups > 0 ? 10 : 3)
              const consH = Math.max((d.consultations / maxChartVal) * 100, d.consultations > 0 ? 10 : 3)
              return (
                <div
                  key={d.date}
                  className="flex flex-col items-center gap-1 h-full justify-end group"
                  title={`${d.label}: ${d.conversations} söhbət, ${d.signups} qeydiyyat, ${d.consultations} konsultasiya`}
                >
                  <div className="w-full flex items-end justify-center gap-0.5 flex-1">
                    <div
                      style={{ height: `${convH}%` }}
                      className={`w-1.5 rounded-t ${d.conversations > 0 ? "bg-emerald-500" : "bg-white/10"}`}
                    />
                    <div
                      style={{ height: `${signH}%` }}
                      className={`w-1.5 rounded-t ${d.signups > 0 ? "bg-teal-400" : "bg-white/10"}`}
                    />
                    <div
                      style={{ height: `${consH}%` }}
                      className={`w-1.5 rounded-t ${d.consultations > 0 ? "bg-amber-400" : "bg-white/10"}`}
                    />
                  </div>
                  <span className="text-[9px] text-white/40 truncate max-w-full">
                    {d.date.slice(8)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Navigation Tabs + Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 bg-white/[0.04] p-1.5 rounded-2xl border border-white/10 w-fit">
            <button
              onClick={() => setActiveTab("lawyers")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "lawyers"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Vəkillər ({stats?.totalLawyers ?? 0})</span>
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "users"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Bütün İstifadəçilər ({stats?.totalUsers ?? 0})</span>
            </button>
            <button
              onClick={() => setActiveTab("feedbacks")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "feedbacks"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <MessageSquareHeart className="w-3.5 h-3.5" />
              <span>Rəylər ({feedbacks.length})</span>
            </button>
          </div>

          {activeTab !== "feedbacks" && (
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-white/35 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ad, e-poçt və ya lisenziya axtar..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/35 outline-none focus:border-emerald-500/60"
              />
            </div>
          )}
        </div>

        {/* TAB 1: REGISTERED LAWYERS */}
        {activeTab === "lawyers" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "verified", "pending"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setLawyerStatusFilter(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    lawyerStatusFilter === st
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                  }`}
                >
                  {st === "all"
                    ? `Hamısı (${users.filter((u) => u.role === "lawyer").length})`
                    : st === "verified"
                    ? `Təsdiqlənmiş (${users.filter((u) => u.role === "lawyer" && u.is_verified).length})`
                    : `Təsdiq Gözləyən (${users.filter((u) => u.role === "lawyer" && !u.is_verified).length})`}
                </button>
              ))}
            </div>

            {lawyers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center text-sm text-white/50">
                Uyğun qeydiyyatlı vəkil tapılmadı.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lawyers.map((lawyer) => (
                  <div
                    key={lawyer.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-4 hover:border-emerald-500/35 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-sm font-extrabold text-white shrink-0">
                          {getInitials(lawyer.name, lawyer.surname)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-extrabold text-white truncate">
                              {`${lawyer.name} ${lawyer.surname}`.trim() || "Adsız Mütəxəssis"}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-white/80">
                              {(lawyer.license_number || "").startsWith("HÜQ:") ? "Hüquqşünas" : "Vəkil"}
                            </span>
                          </div>
                          <p className="text-xs text-white/55 truncate">{lawyer.email}</p>
                        </div>
                      </div>

                      {lawyer.is_verified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                          <BadgeCheck className="w-3.5 h-3.5" /> Təsdiqlənib
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                          <Clock className="w-3.5 h-3.5" /> Gözləyir
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-black/25 rounded-xl p-3 border border-white/5">
                      <div>
                        <span className="text-white/40 block text-[10px]">Lisenziya №</span>
                        <span className="font-bold text-white">{lawyer.license_number || "Qeyd edilməyib"}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[10px]">Təcrübə</span>
                        <span className="font-bold text-white">
                          {lawyer.experience_years !== null ? `${lawyer.experience_years} il` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[10px]">Qeydiyyat</span>
                        <span className="text-white/80">{formatDateAz(lawyer.created_at)}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[10px]">Son Giriş</span>
                        <span className="text-white/80">{formatDateAz(lawyer.last_sign_in_at, true)}</span>
                      </div>
                    </div>

                    {lawyer.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {lawyer.specialties.map((sp) => (
                          <span
                            key={sp}
                            className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          >
                            {sp}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="space-y-3 pt-2 border-t border-white/10">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-white/50">
                          Konsultasiyalar: <strong className="text-white">{lawyer.consultations_count}</strong>
                        </span>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={verifyingId === lawyer.id}
                            onClick={() => {
                              setNoteTargetId(lawyer.id)
                              setNoteMode("request_info")
                              setReviewNote("")
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white/85 border border-white/10 transition-all"
                          >
                            Məlumat İstə
                          </button>

                          {!lawyer.is_verified ? (
                            <>
                              <button
                                type="button"
                                disabled={verifyingId === lawyer.id}
                                onClick={() => {
                                  setNoteTargetId(lawyer.id)
                                  setNoteMode("reject")
                                  setReviewNote("")
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/25 transition-all"
                              >
                                Rədd et
                              </button>
                              <button
                                type="button"
                                disabled={verifyingId === lawyer.id}
                                onClick={() => handleReviewAction(lawyer.id, "approve")}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm shadow-emerald-500/25 transition-all disabled:opacity-50"
                              >
                                {verifyingId === lawyer.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>Təsdiqlə</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={verifyingId === lawyer.id}
                              onClick={() => handleReviewAction(lawyer.id, "reject")}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-red-500/20 text-white/80 hover:text-red-300 border border-white/10 transition-all disabled:opacity-50"
                            >
                              {verifyingId === lawyer.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>Təsdiqi Ləğv Et</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {noteTargetId === lawyer.id && (
                        <div className="rounded-xl bg-black/35 border border-white/10 p-3 space-y-2.5">
                          <p className="text-xs font-bold text-white/85">
                            {noteMode === "request_info"
                              ? "E-poçtla doğrulama məlumatı istə (istəyə bağlı qeyd):"
                              : "Rədd etmə səbəbi (e-poçta əlavə olunacaq):"}
                          </p>
                          <input
                            type="text"
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            placeholder={
                              noteMode === "request_info"
                                ? "Məs: Zəhmət olmasa vəsiqə və ya diplomun şəklini göndərin..."
                                : "Məs: Təqdim edilən lisenziya nömrəsi təsdiqlənmədi..."
                            }
                            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder-white/35 outline-none focus:border-emerald-500"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setNoteTargetId(null)}
                              className="px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white"
                            >
                              Ləğv et
                            </button>
                            <button
                              type="button"
                              disabled={verifyingId === lawyer.id}
                              onClick={() => handleReviewAction(lawyer.id, noteMode, reviewNote)}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold text-white ${
                                noteMode === "request_info"
                                  ? "bg-emerald-600 hover:bg-emerald-500"
                                  : "bg-red-600 hover:bg-red-500"
                              }`}
                            >
                              {noteMode === "request_info" ? "Məlumat Sorğusu Göndər" : "Rədd Et və Bildir"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ALL REAL USERS */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["all", "user", "lawyer"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    roleFilter === r
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                  }`}
                >
                  {r === "all" ? "Hamısı" : r === "user" ? "Vətəndaşlar" : "Vəkillər"}
                </button>
              ))}
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] font-bold uppercase tracking-wider text-white/45">
                      <th className="px-5 py-3.5">#</th>
                      <th className="px-5 py-3.5">İstifadəçi</th>
                      <th className="px-5 py-3.5">E-poçt</th>
                      <th className="px-5 py-3.5">Rol</th>
                      <th className="px-5 py-3.5">Qeydiyyat</th>
                      <th className="px-5 py-3.5">Son Giriş</th>
                      <th className="px-5 py-3.5">Söhbətlər</th>
                      <th className="px-5 py-3.5">Konsultasiyalar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-white/45">
                          İstifadəçi tapılmadı.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u, idx) => (
                        <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="px-5 py-3.5 text-xs text-white/40 tabular-nums">{idx + 1}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 flex items-center justify-center text-xs font-bold shrink-0">
                                {getInitials(u.name, u.surname)}
                              </div>
                              <span className="font-semibold text-white">
                                {`${u.name} ${u.surname}`.trim() || "İstifadəçi"}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-white/70">{u.email || "—"}</td>
                          <td className="px-5 py-3.5">
                            {u.role === "lawyer" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                                <Shield className="w-3 h-3" /> Vəkil
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-white/80 text-xs font-semibold">
                                <User className="w-3 h-3" /> Vətəndaş
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-white/65">{formatDateAz(u.created_at)}</td>
                          <td className="px-5 py-3.5 text-xs text-white/65">{formatDateAz(u.last_sign_in_at, true)}</td>
                          <td className="px-5 py-3.5 text-xs font-bold text-white tabular-nums">{u.conversations_count}</td>
                          <td className="px-5 py-3.5 text-xs font-bold text-white tabular-nums">{u.consultations_count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REAL FEEDBACKS */}
        {activeTab === "feedbacks" && (
          <div className="space-y-3">
            {feedbacks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center text-sm text-white/50">
                Hələ real rəy yoxdur.
              </div>
            ) : (
              feedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-white">{fb.name || "Anonim"}</h3>
                      <p className="text-[11px] text-white/45">{formatDateAz(fb.created_at, true)}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= (fb.rating || 5) ? "fill-emerald-400 text-emerald-400" : "text-white/20"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {fb.subject && (
                    <p className="text-xs font-bold text-emerald-400">{fb.subject}</p>
                  )}
                  <p className="text-sm text-white/80 leading-relaxed">{fb.message}</p>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}
