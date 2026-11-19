"use client"

import { useState, useEffect, useMemo } from "react"
import { Star, Send, CheckCircle2, MessageSquarePlus, Quote, Sparkles, Loader2, User } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface FeedbackItem {
  id: string
  name: string
  category: string
  rating: number
  subject: string
  message: string
  created_at: string
  is_anonymous?: boolean
}

const CATEGORIES = [
  { id: "suggestion", label: "Təklif" },
  { id: "general", label: "Ümumi Rəy" },
  { id: "legal", label: "Hüquqi Məzmun" },
  { id: "bug", label: "Xəta Bildirişi" },
]

function getCategoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label || "Ümumi Rəy"
}

function getInitials(name: string) {
  const parts = (name || "A").trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (parts[0]?.[0] || "A").toUpperCase()
}

function formatDateAz(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("az-AZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

export default function FeedbackPage() {
  const { user, supabaseUser, isLoggedIn } = useAuth()

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [isLoadingList, setIsLoadingList] = useState(true)

  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [category, setCategory] = useState("general")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)

  useEffect(() => {
    if (isLoggedIn && user) {
      if (user.name && !name) setName(user.name)
      if (user.email && !email) setEmail(user.email)
    }
  }, [isLoggedIn, user])

  useEffect(() => {
    let cancelled = false
    async function loadFeedbacks() {
      try {
        const res = await fetch("/api/feedback", { cache: "no-store" })
        const data = await res.json()
        if (!cancelled && Array.isArray(data.feedbacks)) {
          setFeedbacks(data.feedbacks)
        }
      } catch (err) {
        console.error("Failed to fetch feedbacks:", err)
      } finally {
        if (!cancelled) setIsLoadingList(false)
      }
    }
    loadFeedbacks()
    return () => {
      cancelled = true
    }
  }, [])

  const averageRating = useMemo(() => {
    if (feedbacks.length === 0) return "5.0"
    const total = feedbacks.reduce((acc, item) => acc + (Number(item.rating) || 5), 0)
    return (total / feedbacks.length).toFixed(1)
  }, [feedbacks])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return

    setIsSubmitting(true)
    setErrorText(null)
    setSubmitSuccess(false)

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: supabaseUser?.id || null,
          name: isAnonymous ? "Anonim İstifadəçi" : name.trim() || "İstifadəçi",
          email: isAnonymous ? "" : email.trim(),
          category,
          rating,
          sentiment: rating >= 4 ? "excellent" : rating === 3 ? "normal" : "bad",
          subject: subject.trim() || getCategoryLabel(category),
          message: message.trim(),
          is_anonymous: isAnonymous,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Rəy göndərilərkən xəta baş verdi")
      }

      if (data.feedback) {
        setFeedbacks((prev) => [data.feedback, ...prev])
      }
      setSubject("")
      setMessage("")
      setRating(5)
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 4000)
    } catch (err: any) {
      setErrorText(err?.message || "Rəy göndərilərkən xəta baş verdi")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-8">
        {/* Clean Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-emerald-500/15 pb-6">
          <div className="space-y-1.5">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
              İstifadəçi Rəyləri
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Platforma haqqında fikirlərinizi paylaşın və digər istifadəçilərin rəylərinə baxın.
            </p>
          </div>

          <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 self-start sm:self-auto">
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Star className="w-4 h-4 fill-emerald-500 text-emerald-500" />
              <span className="text-base font-extrabold tabular-nums">{averageRating}</span>
            </div>
            <span className="h-4 w-px bg-emerald-200 dark:bg-emerald-800" />
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 tabular-nums">
              {feedbacks.length} rəy
            </span>
          </div>
        </div>

        {/* Main 2-column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left: Add Review Form */}
          <div className="lg:col-span-5 rounded-3xl border border-emerald-500/20 bg-white/90 dark:bg-slate-900/70 backdrop-blur-xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-sm shadow-emerald-500/25">
                <MessageSquarePlus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
                  Rəy əlavə et
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bir neçə saniyədə fikrinizi yazın
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Rating */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Qiymətləndirmə
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverRating || rating) >= star
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`${star} ulduz`}
                        className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-transform active:scale-95"
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            active
                              ? "fill-emerald-500 text-emerald-500"
                              : "text-slate-300 dark:text-slate-700"
                          }`}
                        />
                      </button>
                    )
                  })}
                  <span className="ml-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {rating}/5
                  </span>
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Kateqoriya
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const selected = category === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          selected
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/20"
                            : "bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400"
                        }`}
                      >
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Name + Anonymous */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="fb-name" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Adınız
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Anonim paylaş
                  </label>
                </div>
                {!isAnonymous && (
                  <Input
                    id="fb-name"
                    placeholder="Məsələn: Elvin Əliyev"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 text-sm"
                  />
                )}
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label htmlFor="fb-subject" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Başlıq (istəyə bağlı)
                </label>
                <Input
                  id="fb-subject"
                  placeholder="Qısa mövzu..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 text-sm"
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="fb-message" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Rəyiniz *
                  </label>
                  <span className="text-[11px] text-slate-400 tabular-nums">{message.length}/1000</span>
                </div>
                <Textarea
                  id="fb-message"
                  rows={4}
                  maxLength={1000}
                  placeholder="Fikrinizi, təklifinizi və ya təcrübənizi yazın..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 text-sm resize-none"
                  required
                />
              </div>

              {errorText && (
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl px-3 py-2">
                  {errorText}
                </p>
              )}

              {submitSuccess && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-3 py-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Rəyiniz uğurla əlavə olundu! Təşəkkür edirik.</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="w-full h-11 rounded-xl font-bold gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Göndərilir...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Rəyi Göndər</span>
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Right: Reviews Feed */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Son Rəylər</span>
              </h2>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Ən yenilər yuxarıda
              </span>
            </div>

            {isLoadingList ? (
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <span className="text-sm">Rəylər yüklənir...</span>
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10 p-12 text-center space-y-2">
                <User className="w-8 h-8 mx-auto text-emerald-600/60" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Hələ heç bir rəy yazılmayıb. İlk rəyi siz əlavə edin!
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {feedbacks.map((item) => (
                  <article
                    key={item.id}
                    className="group relative rounded-2xl border border-slate-200/80 dark:border-slate-800/90 bg-white/90 dark:bg-slate-900/65 backdrop-blur-md p-5 shadow-sm hover:border-emerald-500/40 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center text-xs font-extrabold shrink-0 shadow-sm shadow-emerald-500/20">
                          {getInitials(item.name)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-extrabold text-slate-950 dark:text-white truncate">
                            {item.name || "İstifadəçi"}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50">
                              {getCategoryLabel(item.category)}
                            </span>
                            {item.created_at && (
                              <span className="text-[11px] text-slate-400">
                                {formatDateAz(item.created_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= (Number(item.rating) || 5)
                                ? "fill-emerald-500 text-emerald-500"
                                : "text-slate-200 dark:text-slate-700"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {item.subject && (
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1.5">
                        {item.subject}
                      </p>
                    )}

                    <div className="flex gap-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <Quote className="w-4 h-4 text-emerald-500/50 shrink-0 mt-0.5" />
                      <p>{item.message}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
