"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, ArrowRight, Loader2, Scale, ShieldCheck, FileText, Sparkles } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null)

  const supabase = createClient()

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage({ text: error.message, type: "error" })
    } else {
      setIsOtpSent(true)
      setMessage({
        text: "Giriş linki e-poçt ünvanınıza göndərildi! Zəhmət olmasa yoxlayın.",
        type: "success",
      })
    }
    setLoading(false)
  }

  const handleOAuthLogin = async (provider: "google" | "facebook") => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage({ text: error.message, type: "error" })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-slate-950">
      {/* LEFT PART: Video / Visual Showcase */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 xl:p-14 overflow-hidden bg-[#06130f] text-white">
        {/* Ambient Emerald Motion Backdrop (always active behind video) */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-[480px] h-[480px] rounded-full bg-emerald-600/25 blur-[130px] animate-blob" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[460px] h-[460px] rounded-full bg-teal-500/20 blur-[130px] animate-blob animation-delay-2000" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: "radial-gradient(#10b981 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        {/* Video Layer (place custom video at /public/login-video.mp4) */}
        {!videoFailed && (
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            onError={() => setVideoFailed(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-55"
          >
            <source src="/login-video.mp4" type="video/mp4" />
          </video>
        )}

        {/* Dark Gradient Readability Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#040d0a] via-[#040d0a]/55 to-[#040d0a]/40 pointer-events-none" />

        {/* Top Brand Badge */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center p-2">
            <img src="/logo.png" alt="HÜQUQ AI" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white block leading-none">
              HÜQUQ AI
            </span>
            <span className="text-xs text-emerald-300/80 font-medium">
              Azərbaycan Hüquq Platforması
            </span>
          </div>
        </div>

        {/* Center / Bottom Showcase Copy */}
        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 text-xs font-bold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Rəsmi e-Qanun &amp; Məhkəmə Təcrübəsi</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-black tracking-tight leading-[1.15] text-white">
            Hüquqi suallarınıza saniyələr içində dəqiq, maddə əsaslı cavablar.
          </h2>

          <p className="text-sm xl:text-base text-slate-300/90 leading-relaxed">
            Azərbaycan Respublikasının qüvvədə olan məcəllələri və normativ aktları əsasında süni zəka təhlili, rəsmi sənəd tərtibatı və vəkillərlə birbaşa əlaqə.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 p-3.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mb-2" />
              <p className="text-xs font-bold text-white">Rəsmi Mənbə</p>
              <p className="text-[11px] text-slate-300/75 mt-0.5">56,983+ sənəd</p>
            </div>
            <div className="rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 p-3.5">
              <FileText className="w-4 h-4 text-emerald-400 mb-2" />
              <p className="text-xs font-bold text-white">Sənəd Hazırla</p>
              <p className="text-[11px] text-slate-300/75 mt-0.5">DOCX &amp; A4 PDF</p>
            </div>
            <div className="rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 p-3.5">
              <Scale className="w-4 h-4 text-emerald-400 mb-2" />
              <p className="text-xs font-bold text-white">Vəkil Dəstəyi</p>
              <p className="text-[11px] text-slate-300/75 mt-0.5">Birbaşa məsləhət</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PART: Modern Clean Login Form */}
      <div className="flex flex-col justify-between min-h-screen px-5 py-8 sm:px-10 lg:px-14 xl:px-20 bg-slate-50/70 dark:bg-slate-950">
        {/* Mobile Top Compact Video/Brand Header */}
        <div className="lg:hidden flex items-center justify-center gap-2.5 pt-2">
          <img src="/logo.png" alt="HÜQUQ AI Logo" className="w-9 h-9 object-contain" />
          <span className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
            HÜQUQ AI
          </span>
        </div>

        <div className="w-full max-w-[420px] mx-auto my-auto py-8">
          <div className="mb-8 text-center lg:text-left">
            <div className="hidden lg:inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 mb-5 p-2">
              <img src="/logo.png" alt="HÜQUQ AI Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
              Xoş gəldiniz
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1.5">
              Şəxsi hüquq köməkçinizə daxil olun
            </p>
          </div>

          {message && (
            <div
              className={`p-4 mb-6 rounded-2xl text-sm font-medium border ${
                message.type === "error"
                  ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400"
                  : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {message.text}
            </div>
          )}

          {!isOtpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4 mb-6">
              <div className="relative group/input">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within/input:text-emerald-600 transition-colors" />
                <Input
                  type="email"
                  placeholder="E-poçt ünvanınız"
                  className="pl-12 h-13 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 text-base rounded-xl shadow-sm transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full h-13 font-bold text-base rounded-xl transition-all"
                disabled={loading}
              >
                {loading && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
                {loading ? "Göndərilir..." : "Giriş Linki (OTP) Göndər"}
                {!loading && <ArrowRight className="h-5 w-5 ml-2" />}
              </Button>
            </form>
          ) : (
            <div className="mb-6">
              <Button
                variant="outline"
                className="w-full h-13 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                onClick={() => setIsOtpSent(false)}
              >
                Başqa e-poçt yoxla
              </Button>
            </div>
          )}

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs font-semibold uppercase tracking-wider">
              <span className="bg-slate-50 dark:bg-slate-950 px-3 text-slate-400">
                Və ya Sosial Şəbəkələrlə
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2.5 rounded-xl transition-all"
              onClick={() => handleOAuthLogin("google")}
              disabled={loading}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                Google
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-12 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2.5 rounded-xl transition-all"
              onClick={() => handleOAuthLogin("facebook")}
              disabled={loading}
            >
              <svg className="w-4 h-4 text-[#1877F2] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.114.198v3.625c-.523-.025-1.051-.039-1.586-.039-1.183 0-1.566.273-1.566 1.436v1.942h3.906l-.511 3.667h-3.395v7.98h-5.288z" />
              </svg>
              <span className="font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                Facebook
              </span>
            </Button>
          </div>

          {/* Lawyer Section */}
          <div className="mt-7 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-3">
              Vəkil kimi fəaliyyət göstərirsiniz?
            </p>
            <Link
              href="/lawyer-signup"
              className="inline-flex items-center justify-center w-full h-12 gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold text-sm border border-emerald-200 dark:border-emerald-800/60 transition-all"
            >
              <Scale className="w-4 h-4" />
              <span>Vəkil Kimi Daxil Ol / Qeydiyyat</span>
            </Link>
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-4">
          <Link href="/privacy" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors hover:underline">
            Məxfilik Siyasəti
          </Link>
          <span>&bull;</span>
          <Link href="/terms" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors hover:underline">
            İstifadə Şərtləri
          </Link>
        </div>
      </div>
    </div>
  )
}
