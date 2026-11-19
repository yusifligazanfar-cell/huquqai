"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Mail,
  ArrowRight,
  Loader2,
  Scale,
  LogIn,
  UserPlus,
  User,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react"

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (authMode === "signup") {
      if (password.length < 6) {
        setMessage({ text: "Şifrə ən azı 6 simvoldan ibarət olmalıdır.", type: "error" })
        setLoading(false)
        return
      }
      if (password !== confirmPassword) {
        setMessage({ text: "Şifrələr uyğun gəlmir.", type: "error" })
        setLoading(false)
        return
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role: "citizen",
            name: firstName.trim(),
            surname: lastName.trim(),
            full_name: fullName,
          },
        },
      })

      if (error) {
        setMessage({ text: error.message, type: "error" })
      } else if (data.session) {
        window.location.assign("/")
        return
      } else {
        setIsOtpSent(true)
        setMessage({
          text: "Qeydiyyat tamamlandı! Hesabınızı aktivləşdirmək üçün e-poçtunuza göndərilən təsdiq linkinə klikləyin.",
          type: "success",
        })
      }
      setLoading(false)
      return
    }

    if (loginMethod === "password") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setMessage({
          text:
            error.message === "Invalid login credentials"
              ? "E-poçt və ya şifrə yanlışdır."
              : error.message,
          type: "error",
        })
        setLoading(false)
        return
      }

      window.location.assign("/")
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
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

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setMessage({ text: "Şifrə sıfırlamaq üçün əvvəlcə e-poçt ünvanınızı daxil edin.", type: "error" })
      return
    }
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/account`,
    })
    if (error) {
      setMessage({ text: error.message, type: "error" })
    } else {
      setMessage({
        text: "Şifrə sıfırlama linki e-poçt ünvanınıza göndərildi.",
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
      {/* LEFT PART: Full-bleed Video */}
      <div className="relative hidden lg:block overflow-hidden bg-[#06130f]">
        {!videoFailed && (
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onError={() => setVideoFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/login-video.mp4" type="video/mp4" />
          </video>
        )}
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

        <div className="w-full max-w-[460px] mx-auto my-auto py-6">
          <div className="mb-6 text-center lg:text-left">
            <div className="hidden lg:inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 mb-4 p-2">
              <img src="/logo.png" alt="HÜQUQ AI Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
              {authMode === "signup" ? "Hesab Yaradın" : "Xoş gəldiniz"}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1.5">
              {authMode === "signup"
                ? "Adi müştəri kimi qeydiyyatdan keçin"
                : "Şəxsi hüquq köməkçinizə daxil olun"}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/30">
            <div className="grid grid-cols-2 gap-1.5 p-1 mb-5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login")
                  setMessage(null)
                  setIsOtpSent(false)
                }}
                className={`h-10 rounded-lg text-sm font-bold transition-all ${
                  authMode === "login"
                    ? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Daxil Ol
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup")
                  setMessage(null)
                  setIsOtpSent(false)
                }}
                className={`h-10 rounded-lg text-sm font-bold transition-all ${
                  authMode === "signup"
                    ? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Qeydiyyat
              </button>
            </div>

            {message && (
              <div
                className={`p-3.5 mb-5 rounded-2xl text-sm font-medium border ${
                  message.type === "error"
                    ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400"
                    : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {message.text}
              </div>
            )}

            {!isOtpSent ? (
              <form onSubmit={handleSubmit} className="space-y-3.5 mb-5">
                {authMode === "signup" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative group/input">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/input:text-emerald-600 transition-colors" />
                      <Input
                        type="text"
                        placeholder="Adınız"
                        className="pl-10 h-12 bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 text-sm rounded-xl transition-all"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="relative group/input">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/input:text-emerald-600 transition-colors" />
                      <Input
                        type="text"
                        placeholder="Soyadınız"
                        className="pl-10 h-12 bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 text-sm rounded-xl transition-all"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="relative group/input">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/input:text-emerald-600 transition-colors" />
                  <Input
                    type="email"
                    placeholder="E-poçt ünvanınız"
                    className="pl-10 h-12 bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 text-sm rounded-xl transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {(authMode === "signup" || loginMethod === "password") && (
                  <div className="relative group/input">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/input:text-emerald-600 transition-colors" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={authMode === "signup" ? "Şifrə (min. 6 simvol)" : "Şifrəniz"}
                      className="pl-10 pr-10 h-12 bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 text-sm rounded-xl transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      aria-label="Şifrəni göstər"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                )}

                {authMode === "signup" && (
                  <div className="relative group/input">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/input:text-emerald-600 transition-colors" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Şifrəni təsdiqləyin"
                      className="pl-10 h-12 bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 text-sm rounded-xl transition-all"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                  </div>
                )}

                {authMode === "login" && (
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMethod((prev) => (prev === "password" ? "otp" : "password"))
                        setMessage(null)
                      }}
                      className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      {loginMethod === "password"
                        ? "Şifrəsiz (E-poçt linki) ilə daxil ol"
                        : "Şifrə ilə daxil ol"}
                    </button>
                    {loginMethod === "password" && (
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:underline"
                      >
                        Şifrəni unutdum
                      </button>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 font-bold text-sm sm:text-base rounded-xl transition-all mt-1"
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {loading
                    ? "Gözləyin..."
                    : authMode === "signup"
                      ? "Qeydiyyatdan Keç"
                      : loginMethod === "password"
                        ? "Daxil Ol"
                        : "Giriş Linki (OTP) Göndər"}
                  {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>
              </form>
            ) : (
              <div className="mb-5">
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-sm"
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
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-400">
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

          </div>

          {/* Lawyer Section */}
          <div className="mt-4 bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 text-center">
            <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 mb-3 flex items-center justify-center gap-1.5">
              <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Vəkil və ya hüquqşünas kimi fəaliyyət göstərirsiniz?</span>
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/lawyer-signup?mode=login"
                className="inline-flex items-center justify-center w-full h-11 gap-2 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm border border-slate-200 dark:border-slate-700 transition-all"
              >
                <LogIn className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Daxil Ol</span>
              </Link>
              <Link
                href="/lawyer-signup"
                className="inline-flex items-center justify-center w-full h-11 gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold text-sm border border-emerald-200 dark:border-emerald-800/60 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>Qeydiyyat</span>
              </Link>
            </div>
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
