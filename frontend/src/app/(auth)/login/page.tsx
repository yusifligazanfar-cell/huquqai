"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, ArrowRight, Loader2, Scale } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null)

  const supabase = createClient()

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })

    if (error) {
      setMessage({ text: error.message, type: 'error' })
    } else {
      setIsOtpSent(true)
      setMessage({ text: "Giriş linki e-poçt ünvanınıza göndərildi! Zəhmət olmasa yoxlayın.", type: 'success' })
    }
    setLoading(false)
  }

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    })
    
    if (error) {
      setMessage({ text: error.message, type: 'error' })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      
      {/* Dynamic Animated Glass Background Orbs (Blue Theme) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-blue-600/40 to-cyan-400/40 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-blob" />
      <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-br from-sky-400/40 to-indigo-500/40 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000" />
      <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-blue-500/30 to-teal-400/30 blur-[130px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-4000" />
      
      {/* Noise Texture Overlay for Premium Feel */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

      <div className="w-full max-w-[440px] relative z-10 perspective-1000">
        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-[2rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] p-6 sm:p-10 transform transition-all hover:scale-[1.01] duration-500 relative overflow-hidden group">
          
          {/* Subtle inner reflection highlight */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none rounded-[2rem]" />
          
          <div className="relative z-10">
            <div className="mb-10 text-center">
              <img src="/logo.png" alt="HÜQUQ AI Logo" className="w-28 h-auto object-contain mx-auto mb-5 drop-shadow-2xl hover:scale-105 transition-transform" />
              <h1 className="text-4xl font-black tracking-tighter text-black dark:text-white mb-2">HÜQUQ AI</h1>
              <p className="text-slate-600 dark:text-slate-300 font-medium tracking-wide">Şəxsi hüquq köməkçinizə daxil olun</p>
            </div>

            {message && (
              <div className={`p-4 mb-6 rounded-xl text-sm font-medium border backdrop-blur-md ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                {message.text}
              </div>
            )}

            {!isOtpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-5 mb-8">
                <div className="space-y-2">
                  <div className="relative group/input">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within/input:text-primary transition-colors" />
                    <Input 
                      type="email" 
                      placeholder="E-poçt ünvanınız" 
                      className="pl-12 h-14 bg-white/50 dark:bg-black/20 border-white/30 dark:border-white/10 focus-visible:ring-primary/30 focus-visible:border-primary/50 text-base shadow-inner rounded-xl transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-14 font-semibold text-base rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                  {loading ? "Göndərilir..." : "Giriş Linki (OTP) Göndər"}
                  {!loading && <ArrowRight className="h-5 w-5 ml-2" />}
                </Button>
              </form>
            ) : (
              <div className="mb-8 space-y-4">
                <Button variant="outline" className="w-full h-14 rounded-xl border-white/40 dark:border-white/10 bg-white/20 dark:bg-black/20 hover:bg-white/40 dark:hover:bg-white/10 transition-colors" onClick={() => setIsOtpSent(false)}>
                  Başqa e-poçt yoxla
                </Button>
              </div>
            )}

            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/50 dark:border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs font-medium uppercase tracking-wider">
                <span className="bg-transparent px-4 text-slate-500 dark:text-slate-400">Və ya Sosial Şəbəkələrlə</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-14 bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 border-white/50 dark:border-white/5 flex items-center justify-center gap-3 rounded-xl transition-all hover:-translate-y-0.5"
                onClick={() => handleOAuthLogin('google')}
                disabled={loading}
              >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Google ilə daxil ol</span>
              </Button>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-14 bg-[#1877F2]/5 hover:bg-[#1877F2]/10 dark:bg-[#1877F2]/10 dark:hover:bg-[#1877F2]/20 border-[#1877F2]/20 flex items-center justify-center gap-3 rounded-xl transition-all hover:-translate-y-0.5"
                onClick={() => handleOAuthLogin('facebook')}
                disabled={loading}
              >
                <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.114.198v3.625c-.523-.025-1.051-.039-1.586-.039-1.183 0-1.566.273-1.566 1.436v1.942h3.906l-.511 3.667h-3.395v7.98h-5.288z" />
                </svg>
                <span className="font-semibold text-[#1877F2]">Facebook ilə daxil ol</span>
              </Button>
            </div>
            
            {/* Lawyer Section */}
            <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-white/10 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Vəkil kimi fəaliyyət göstərirsiniz?</p>
              <Link 
                href="/lawyer-signup" 
                className="inline-flex items-center justify-center w-full h-12 gap-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20 transition-all hover:-translate-y-0.5"
              >
                <Scale className="w-4 h-4" />
                Vəkil Kimi Daxil Ol / Qeydiyyat
              </Link>
            </div>
          </div>
        </div>
        
        {/* Footer Links */}
        <div className="mt-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-4">
          <Link href="/privacy" className="hover:text-primary transition-colors hover:underline">
            Məxfilik Siyasəti
          </Link>
          <span>&bull;</span>
          <Link href="/terms" className="hover:text-primary transition-colors hover:underline">
            İstifadə Şərtləri
          </Link>
        </div>
        
      </div>
    </div>
  )
}

