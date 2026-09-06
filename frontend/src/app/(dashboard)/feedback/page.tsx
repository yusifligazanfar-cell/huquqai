"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { 
  MessageSquareHeart, 
  Lightbulb, 
  Bug, 
  Star, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  Scale, 
  HelpCircle, 
  User, 
  Mail, 
  ShieldCheck, 
  Smile, 
  Meh, 
  Frown, 
  Heart, 
  Flame,
  ArrowRight,
  MessageCircle,
  ThumbsUp
} from "lucide-react"

type FeedbackCategory = "suggestion" | "bug" | "general" | "legal" | "other"
type SentimentType = "excellent" | "good" | "neutral" | "bad"

const CATEGORIES: { id: FeedbackCategory; title: string; desc: string; icon: React.ElementType; color: string; border: string; bg: string }[] = [
  {
    id: "suggestion",
    title: "Təklif və İdeyalar",
    desc: "Yeni funksiya, dizayn və ya təkmilləşdirmə ideyalarınız",
    icon: Lightbulb,
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10 hover:bg-amber-500/15"
  },
  {
    id: "bug",
    title: "Xəta və Nasazlıq",
    desc: "Saytda qarşılaşdığınız texniki problem və ya nasazlıq",
    icon: Bug,
    color: "text-red-400",
    border: "border-red-500/30",
    bg: "bg-red-500/10 hover:bg-red-500/15"
  },
  {
    id: "general",
    title: "Ümumi Rəy & Təəssürat",
    desc: "Platformadan istifadə təcrübəniz və ümumi fikirləriniz",
    icon: Star,
    color: "text-violet-400",
    border: "border-violet-500/30",
    bg: "bg-violet-500/10 hover:bg-violet-500/15"
  },
  {
    id: "legal",
    title: "Hüquqi Məzmun Təklifi",
    desc: "Ərizə şablonları, qanunvericilik və vəkil xidmətləri haqqında",
    icon: Scale,
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10 hover:bg-emerald-500/15"
  },
  {
    id: "other",
    title: "Digər / Sual",
    desc: "Əlavə sual, əməkdaşlıq və ya qeydləriniz",
    icon: HelpCircle,
    color: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/10 hover:bg-blue-500/15"
  }
]

const SENTIMENTS: { id: SentimentType; label: string; icon: React.ElementType; color: string }[] = [
  { id: "excellent", label: "Mükəmməl", icon: Heart, color: "text-pink-400" },
  { id: "good", label: "Razıyam", icon: Smile, color: "text-emerald-400" },
  { id: "neutral", label: "Normal", icon: Meh, color: "text-amber-400" },
  { id: "bad", label: "Narazıyam", icon: Frown, color: "text-red-400" }
]

const RATING_LABELS = ["", "Çox zəif", "Kafi", "Yaxşı", "Çox yaxşı", "Möhtəşəm!"]

export default function FeedbackPage() {
  const { user, supabaseUser, isLoggedIn } = useAuth()

  const [category, setCategory] = useState<FeedbackCategory>("suggestion")
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [sentiment, setSentiment] = useState<SentimentType>("excellent")
  
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const [publicFeedbacks, setPublicFeedbacks] = useState<any[]>([])

  useEffect(() => {
    if (isLoggedIn && user) {
      setName(user.name || "")
      setEmail(user.email || "")
    }
  }, [isLoggedIn, user])

  useEffect(() => {
    fetchFeedbacks()
  }, [])

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch("/api/feedback")
      const data = await res.json()
      if (data.feedbacks) {
        setPublicFeedbacks(data.feedbacks.slice(0, 4))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")

    if (!message.trim()) {
      setErrorMsg("Zəhmət olmasa, fikirlərinizi və ya rəyinizi qeyd edin.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: supabaseUser?.id || null,
          name: isAnonymous ? "Anonim İstifadəçi" : (name || "Anonim İstifadəçi"),
          email: isAnonymous ? "" : email,
          category,
          rating,
          sentiment,
          subject: subject.trim() || undefined,
          message: message.trim(),
          is_anonymous: isAnonymous
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Rəy göndərilərkən xəta baş verdi.")
      }

      setSubmitted(true)
      fetchFeedbacks()
    } catch (err: any) {
      setErrorMsg(err.message || "Xəta baş verdi. Zəhmət olmasa yenidən yoxlayın.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setSubmitted(false)
    setSubject("")
    setMessage("")
    setRating(5)
    setCategory("suggestion")
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] pb-12">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-950/50 via-background to-orange-950/30 border border-white/10 p-6 md:p-10 mb-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>İstifadəçi Əks Əlaqə Mərkəzi</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold text-foreground tracking-tight mb-3">
            Fikirləriniz və Təklifləriniz Bizim Üçün Dəyərlidir
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            HÜQUQ AI platformasını hər gün daha sürətli, dəqiq və rahat etmək üçün çalışırıq. Təklifinizi, qarşılaşdığınız xətanı və ya ümumi rəyinizi bizimlə bölüşün.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Form Column */}
        <div className="lg:col-span-8">
          <div className="rounded-3xl border border-white/10 bg-card/60 backdrop-blur-2xl p-6 md:p-8 shadow-xl">
            {submitted ? (
              <div className="py-12 px-4 text-center flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/25 mb-6">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                
                <h3 className="text-2xl font-bold text-foreground mb-2">Rəyiniz Üçün Təşəkkür Edirik! 🎉</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
                  Geri dönüşünüz qeydə alındı. Komandamız bütün təklif və xətaları diqqətlə nəzərdən keçirir və sistemi buna uyğun təkmilləşdirir.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={handleReset}
                    className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                  >
                    Yeni Rəy Göndər
                  </button>
                  <a
                    href="/chat"
                    className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-foreground font-semibold text-sm border border-white/10 transition-all"
                  >
                    Süni Zəka Vəkilinə Qayıt
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Category Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    1. Rəyinizin Kateqoriyası
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {CATEGORIES.map((cat) => {
                      const isSelected = category === cat.id
                      const Icon = cat.icon
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                            isSelected
                              ? `bg-primary/10 border-primary shadow-[0_0_20px_rgba(234,88,12,0.15)] ring-1 ring-primary`
                              : `${cat.bg} border-white/5 hover:border-white/20 text-muted-foreground hover:text-foreground`
                          }`}
                        >
                          <div className={`p-2 rounded-xl bg-black/20 ${cat.color} flex-shrink-0 mt-0.5`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className={`text-xs font-bold ${isSelected ? "text-foreground" : "text-foreground/90"}`}>
                              {cat.title}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                              {cat.desc}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Rating & Sentiment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                  {/* Star Rating */}
                  <div className="bg-white/3 border border-white/5 rounded-2xl p-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      2. Qiymətləndirmə (1-5 Ulduz)
                    </label>
                    <div className="flex items-center gap-1.5 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = (hoverRating || rating) >= star
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 hover:scale-125 transition-transform"
                          >
                            <Star
                              className={`w-6 h-6 transition-colors ${
                                active
                                  ? "fill-amber-400 text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                                  : "text-white/20 hover:text-white/40"
                              }`}
                            />
                          </button>
                        )
                      })}
                      <span className="ml-3 text-xs font-bold text-amber-400/90">
                        {RATING_LABELS[hoverRating || rating]}
                      </span>
                    </div>
                  </div>

                  {/* Mood / Sentiment */}
                  <div className="bg-white/3 border border-white/5 rounded-2xl p-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      3. Ümumi Təcrübəniz
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {SENTIMENTS.map((s) => {
                        const isSelected = sentiment === s.id
                        const Icon = s.icon
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSentiment(s.id)}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                              isSelected
                                ? "bg-white/10 border-white/30 text-white scale-105 shadow-md"
                                : "bg-black/20 border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/5"
                            }`}
                          >
                            <Icon className={`w-4 h-4 mb-1 ${s.color}`} />
                            <span className="text-[10px] font-semibold">{s.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* 4. Subject & Message */}
                <div className="space-y-4 pt-2 border-t border-white/5">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5">
                      Mövzu / Başlıq <span className="text-muted-foreground font-normal">(İstəyə bağlı)</span>
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Məs: Ərizə yükləmə formatı haqqında təklif..."
                      className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-foreground">
                        Fikirləriniz və ya Təklifiniz <span className="text-red-400">*</span>
                      </label>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {message.length}/1000
                      </span>
                    </div>
                    <textarea
                      rows={5}
                      maxLength={1000}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Saytda nəyi bəyəndiniz, nəyi dəyişmək istərdiniz və ya hansı xəta ilə qarşılaşdınız? Ətraflı qeyd edin..."
                      className="w-full bg-background/50 border border-white/10 rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary transition-all resize-none"
                    />
                  </div>
                </div>

                {/* 5. User Contact Information */}
                <div className="pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      4. Əlaqə Məlumatları
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary w-3.5 h-3.5"
                      />
                      <span>Anonim göndər</span>
                    </label>
                  </div>

                  {!isAnonymous && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Adınız və Soyadınız"
                            className="w-full bg-background/50 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs md:text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="E-poçt ünvanınız (Cavab üçün)"
                            className="w-full bg-background/50 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs md:text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                    {errorMsg}
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !message.trim()}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Rəyi Göndər</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Info Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Why Feedback Matters */}
          <div className="rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <MessageSquareHeart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Niyə Rəyiniz Vacibdir?</h3>
                <p className="text-[11px] text-muted-foreground">İstifadəçilərimizin səsi əsas prioritetimizdir</p>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Yeni Funksiyalar:</strong> Ən çox tələb olunan funksiyalar növbəti yenilənmələrdə tətbiq olunur.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <span><strong>Dəqiqlik və Sürət:</strong> Süni zəka vəkilinin qanunvericilik bazası sizin suallarınız əsasında genişləndirilir.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <span><strong>Tez Həll:</strong> Bildirilən texniki xətalar komandamız tərəfindən 24 saat ərzində araşdırılır.</span>
              </li>
            </ul>
          </div>

          {/* Direct Support Card */}
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-900/20 to-indigo-900/10 backdrop-blur-xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Birbaşa Dəstək</h4>
                <p className="text-[11px] text-muted-foreground">Təcili suallar və əməkdaşlıq</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              Təcili hüquqi suallarınız və ya platforma ilə tərəfdaşlıq təklifləriniz üçün bizə birbaşa yaza bilərsiniz:
            </p>

            <div className="space-y-2">
              <a
                href="mailto:info@huquqai.az"
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-foreground transition-all group"
              >
                <span className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-violet-400" />
                  info@huquqai.az
                </span>
                <ArrowRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </a>

              <a
                href="/chat"
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-foreground transition-all group"
              >
                <span className="flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5 text-orange-400" />
                  Süni Zəka ilə Canlı Söhbət
                </span>
                <ArrowRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </a>
            </div>
          </div>

          {/* Recent Community Feedbacks */}
          {publicFeedbacks.length > 0 && (
            <div className="rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ThumbsUp className="w-3.5 h-3.5 text-amber-400" />
                  Son Rəylər
                </h4>
                <span className="text-[10px] text-muted-foreground/60">{publicFeedbacks.length} rəy</span>
              </div>

              <div className="space-y-3">
                {publicFeedbacks.map((fb) => (
                  <div key={fb.id} className="p-3.5 rounded-2xl bg-white/3 border border-white/5 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-xs">{fb.name}</span>
                      <div className="flex items-center text-amber-400">
                        {Array.from({ length: fb.rating || 5 }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    {fb.subject && (
                      <div className="font-semibold text-foreground/80 text-[11px]">{fb.subject}</div>
                    )}
                    <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-3">
                      "{fb.message}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
