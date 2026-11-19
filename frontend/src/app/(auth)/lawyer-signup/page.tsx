"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Mail, ArrowRight, Loader2, Scale 
} from "lucide-react"
import { CategoryIcon } from "@/components/ui/category-icon"
import categoriesData from "@/data/lawyer_categories.json"

export default function LawyerSignupPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [isLoginMode, setIsLoginMode] = useState(false)
  const [practitionerType, setPractitionerType] = useState<"vekil" | "huquqsunas">("vekil")

  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("mode")
    if (mode === "login") {
      setIsLoginMode(true)
      setStep(2)
    }
  }, [])
  
  // Step 1: Onboarding Info
  const [name, setName] = useState("")
  const [surname, setSurname] = useState("")
  const [licenseNumber, setLicenseNumber] = useState("")
  const [educationDoc, setEducationDoc] = useState("")
  const [experienceYears, setExperienceYears] = useState("")
  const [hourlyRate, setHourlyRate] = useState("")
  const [workplaceName, setWorkplaceName] = useState("")
  const [workplaceAddress, setWorkplaceAddress] = useState("")
  const [eduInstitution, setEduInstitution] = useState("")
  const [eduDegree, setEduDegree] = useState("Bakalavr")
  const [eduField, setEduField] = useState("Hüquqşünaslıq")
  const [bio, setBio] = useState("")
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  
  // Step 2: Auth
  const [email, setEmail] = useState("")
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null)

  const supabase = createClient()

  const toggleSpecialty = (spec: string) => {
    setSelectedSpecialties(prev => 
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    )
  }

  const getNormalizedLicense = () => {
    if (practitionerType === "vekil") return licenseNumber.trim()
    const doc = educationDoc.trim()
    return doc ? `HÜQ: ${doc}` : "HÜQ: Hüquqşünas"
  }

  const buildStructuredFields = () => {
    const workplaces = workplaceName.trim()
      ? [{ name: workplaceName.trim(), address: workplaceAddress.trim(), hours: "09:00 - 18:00" }]
      : []
    const education = eduInstitution.trim()
      ? [{ degree: eduDegree.trim() || "Ali təhsil", institution: eduInstitution.trim(), field: eduField.trim() || "Hüquqşünaslıq" }]
      : []
    return {
      workplaces,
      education,
      hourlyRate: parseInt(hourlyRate, 10) || 0,
    }
  }

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    const extra = buildStructuredFields()
    const payload = JSON.stringify({
      practitionerType,
      name: name.trim(),
      surname: surname.trim(),
      licenseNumber: getNormalizedLicense(),
      experienceYears: parseInt(experienceYears, 10) || 0,
      bio: bio.trim(),
      specialties: selectedSpecialties,
      workplaces: extra.workplaces,
      education: extra.education,
      hourlyRate: extra.hourlyRate,
    })
    try {
      localStorage.setItem('pendingLawyerOnboarding', payload)
      sessionStorage.setItem('pendingLawyerOnboarding', payload)
    } catch {}
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const hasOnboardingData = !isLoginMode && Boolean(name.trim() || surname.trim())
    const extra = buildStructuredFields()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/account%3Frole=lawyer`,
        ...(hasOnboardingData
          ? {
              data: {
                role: 'lawyer',
                practitioner_type: practitionerType,
                name: name.trim(),
                surname: surname.trim(),
                full_name: `${name.trim()} ${surname.trim()}`.trim(),
                license_number: getNormalizedLicense(),
                experience_years: parseInt(experienceYears, 10) || 0,
                bio: bio.trim(),
                specialties: selectedSpecialties,
                workplaces: extra.workplaces,
                education: extra.education,
                hourly_rate: extra.hourlyRate,
              }
            }
          : {}),
      }
    })

    if (error) {
      setMessage({ text: error.message, type: 'error' })
    } else {
      setIsOtpSent(true)
      setMessage({
        text: isLoginMode
          ? "Giriş linki e-poçt ünvanınıza göndərildi! Linkə klikləyərək hesabınıza daxil ola bilərsiniz."
          : "Qeydiyyat linki e-poçt ünvanınıza göndərildi! Linkə kliklədikdən sonra anketiniz admin yoxlamasına göndəriləcək və hesabınıza daxil olacaqsınız.",
        type: 'success'
      })
    }
    setLoading(false)
  }

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/account%3Frole=lawyer`,
      }
    })
    
    if (error) {
      setMessage({ text: error.message, type: 'error' })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-slate-950 py-12">
      
      {/* Dynamic Animated Glass Background Orbs (Emerald/Teal Theme) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-emerald-500/25 to-teal-400/25 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-blob fixed" />
      <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-br from-teal-500/25 to-emerald-400/25 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000 fixed" />
      <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-emerald-400/20 to-teal-400/20 blur-[130px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-4000 fixed" />
      
      {/* Noise Texture Overlay for Premium Feel */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-overlay fixed" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

      <div className={`w-full ${step === 1 ? 'max-w-3xl' : 'max-w-[440px]'} relative z-10 transition-all duration-500`}>
        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-[2rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] p-6 sm:p-10 relative overflow-hidden group">
          
          {/* Subtle inner reflection highlight */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none rounded-[2rem]" />
          
          <div className="relative z-10">
            <div className="mb-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/30">
                <Scale className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-black dark:text-white mb-2">
                {isLoginMode && step === 2 ? "Vəkil və ya Hüquqşünas Girişi" : "Vəkil və ya Hüquqşünas Kimi Qoşulun"}
              </h1>
              <p className="text-slate-600 dark:text-slate-300 font-medium tracking-wide">
                {step === 1
                  ? "Müştərilərin sizi tapa bilməsi üçün anketinizi doldurun"
                  : isLoginMode
                    ? "Mövcud hesabınıza daxil olun"
                    : "Davam etmək üçün hesaba daxil olun"}
              </p>
            </div>

            {step === 1 ? (
              <form onSubmit={handleStep1Submit} className="space-y-6">
                {/* Separate Form Selector: Vəkil vs Hüquqşünas */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Fəaliyyət Statusunuzu Seçin
                  </label>
                  <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-slate-100/80 dark:bg-black/30 border border-slate-200/80 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setPractitionerType("vekil")}
                      className={`py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                        practitionerType === "vekil"
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Vəkil (Kollegiya üzvü)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPractitionerType("huquqsunas")}
                      className={`py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                        practitionerType === "huquqsunas"
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Hüquqşünas / Məsləhətçi
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">Adınız</label>
                    <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Məs: Əli" className="h-12 bg-white/50 dark:bg-black/20 border-white/30 dark:border-white/10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">Soyadınız</label>
                    <Input required value={surname} onChange={e => setSurname(e.target.value)} placeholder="Məs: Əliyev" className="h-12 bg-white/50 dark:bg-black/20 border-white/30 dark:border-white/10 rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {practitionerType === "vekil" ? (
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold">Vəkillər Kollegiyası Lisenziya Nömrəsi *</label>
                      <Input required value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} placeholder="Məs: VK-12345" className="h-12 bg-white/50 dark:bg-black/20 border-white/30 dark:border-white/10 rounded-xl" />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold">Ali Hüquq Təhsili / Diplom № *</label>
                      <Input required value={educationDoc} onChange={e => setEducationDoc(e.target.value)} placeholder="Məs: BDU Hüquq / Diplom № 04512" className="h-12 bg-white/50 dark:bg-black/20 border-white/30 dark:border-white/10 rounded-xl" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">İş Təcrübəsi (İl)</label>
                    <Input required type="number" min="0" max="60" value={experienceYears} onChange={e => setExperienceYears(e.target.value)} placeholder="Məs: 10" className="h-12 bg-white/50 dark:bg-black/20 border-white/30 dark:border-white/10 rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">İş Yeri (Ofis / Hüquq Bürosu) *</label>
                    <Input required value={workplaceName} onChange={e => setWorkplaceName(e.target.value)} placeholder="Məs: Bakı Hüquq Mərkəzi" className="h-12 bg-white/50 dark:bg-black/20 border-white/30 dark:border-white/10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">İş Yeri Ünvanı</label>
                    <Input value={workplaceAddress} onChange={e => setWorkplaceAddress(e.target.value)} placeholder="Məs: Bakı ş., Nizami küç. 45" className="h-12 bg-white/50 dark:bg-black/20 border-white/30 dark:border-white/10 rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">Təhsil Müəssisəsi *</label>
                    <Input required value={eduInstitution} onChange={e => setEduInstitution(e.target.value)} placeholder="Məs: Bakı Dövlət Universiteti" className="h-12 bg-white/50 dark:bg-black/20 border-white/30 dark:border-white/10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">Dərəcə</label>
                    <Input value={eduDegree} onChange={e => setEduDegree(e.target.value)} placeholder="Bakalavr / Magistr" className="h-12 bg-white/50 dark:bg-black/20 border-white/30 dark:border-white/10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">Saatlıq Xidmət Haqqı (AZN)</label>
                    <Input type="number" min="0" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="Məs: 50" className="h-12 bg-white/50 dark:bg-black/20 border-white/30 dark:border-white/10 rounded-xl" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Özünüz haqqında qısa məlumat (Bio)</label>
                  <Textarea 
                    required 
                    value={bio} 
                    onChange={e => setBio(e.target.value)} 
                    placeholder="Təcrübəniz, yanaşmanız və peşəkar fəaliyyətiniz haqqında məlumat verin..." 
                    className="min-h-[100px] rounded-xl resize-none bg-white/50 dark:bg-black/20 border-white/30 dark:border-white/10"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold">İxtisaslaşdığınız Hüquq Sahələri</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {categoriesData.map(category => {
                      const isSelected = selectedSpecialties.includes(category.name_az)
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => toggleSpecialty(category.name_az)}
                          className={`flex flex-col items-center justify-center gap-2 p-3 h-28 rounded-xl border text-center transition-all ${
                            isSelected 
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-md shadow-emerald-500/20' 
                              : 'bg-white/50 dark:bg-black/20 border-white/40 dark:border-white/10 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10'
                          }`}
                        >
                          <CategoryIcon id={category.id} className={`w-6 h-6 mb-1 ${isSelected ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                          <span className={`text-xs font-medium leading-tight line-clamp-2 ${
                            isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {category.name_az}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200/50 dark:border-white/10">
                  <Button type="submit" className="w-full h-14 text-base font-semibold rounded-xl transition-all hover:-translate-y-0.5">
                    Növbəti Addım <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              </form>
            ) : (
              // Step 2: Auth Form
              <div>
                {message && (
                  <div className={`p-4 mb-6 rounded-xl text-sm font-medium border backdrop-blur-md ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                    {message.text}
                  </div>
                )}

                {!isOtpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-5 mb-8">
                    <div className="space-y-2">
                      <div className="relative group/input">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within/input:text-amber-500 transition-colors" />
                        <Input 
                          type="email" 
                          placeholder="E-poçt ünvanınız" 
                          className="pl-12 h-14 bg-white/50 dark:bg-black/20 border-white/30 dark:border-white/10 focus-visible:ring-amber-500/30 focus-visible:border-amber-500/50 text-base shadow-inner rounded-xl transition-all"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-14 font-semibold text-base rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white transition-all hover:-translate-y-0.5" disabled={loading}>
                      {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                      {loading ? "Göndərilir..." : isLoginMode ? "Daxil Ol" : "Qeydiyyatı Tamamla"}
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
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Google ilə davam et</span>
                  </Button>
                </div>

                <div className="pt-4 mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginMode(false)
                      setStep(1)
                    }}
                    className="text-sm font-medium text-amber-500 hover:underline"
                  >
                    {isLoginMode ? "Yeni hesab? Anketi doldurub qeydiyyatdan keçin →" : "← Anketə qayıt"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer Links */}
        <div className="mt-8 text-center text-sm text-muted-foreground flex flex-col gap-2">
          <p>Müştərisiniz? <Link href="/login" className="text-amber-500 font-semibold hover:underline">Buradan daxil olun</Link></p>
        </div>
        
      </div>
    </div>
  )
}
