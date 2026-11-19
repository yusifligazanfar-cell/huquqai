"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CategoryIcon } from "@/components/ui/category-icon"
import categoriesData from "@/data/lawyer_categories.json"
import {
  Mail,
  ArrowRight,
  Loader2,
  Scale,
  User,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  Circle,
  ShieldCheck,
  Briefcase,
} from "lucide-react"

function getPasswordChecks(pw: string) {
  return {
    minLength: pw.length >= 8,
    hasUpper: /[A-Z]/.test(pw),
    hasDigit: /[0-9]/.test(pw),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pw),
  }
}

export default function LoginPage() {
  const [accountRole, setAccountRole] = useState<"citizen" | "lawyer">("citizen")
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password")

  // Customer / Common Auth fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Lawyer onboarding step (only when accountRole === "lawyer" && authMode === "signup")
  const [lawyerStep, setLawyerStep] = useState<1 | 2>(1)
  const [practitionerType, setPractitionerType] = useState<"vekil" | "huquqsunas">("vekil")
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

  const [isOtpSent, setIsOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roleParam = params.get("role")
    const modeParam = params.get("mode")
    if (roleParam === "lawyer") setAccountRole("lawyer")
    if (modeParam === "signup") setAuthMode("signup")
    if (modeParam === "login") setAuthMode("login")
  }, [])

  const pwChecks = getPasswordChecks(password)
  const isPasswordStrong =
    pwChecks.minLength && pwChecks.hasUpper && pwChecks.hasDigit && pwChecks.hasSpecial

  const handleEmailChange = (val: string) => {
    setEmail(val)
  }

  const toggleSpecialty = (spec: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    )
  }

  const getNormalizedLicense = () => {
    if (practitionerType === "vekil") return licenseNumber.trim()
    const doc = educationDoc.trim()
    return doc ? `HÜQ: ${doc}` : "HÜQ: Hüquqşünas"
  }

  const buildLawyerStructuredFields = () => {
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

  const handleLawyerStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const extra = buildLawyerStructuredFields()
    const payload = JSON.stringify({
      practitionerType,
      name: firstName.trim(),
      surname: lastName.trim(),
      licenseNumber: getNormalizedLicense(),
      experienceYears: parseInt(experienceYears, 10) || 0,
      bio: bio.trim(),
      specialties: selectedSpecialties,
      workplaces: extra.workplaces,
      education: extra.education,
      hourlyRate: extra.hourlyRate,
    })
    try {
      localStorage.setItem("pendingLawyerOnboarding", payload)
      sessionStorage.setItem("pendingLawyerOnboarding", payload)
    } catch {}
    setLawyerStep(2)
  }

  const handleResendSignupEmail = async () => {
    if (!email.trim()) return
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback${
          accountRole === "lawyer" ? "?next=/account%3Frole=lawyer" : ""
        }`,
      },
    })
    if (error) {
      setMessage({ text: error.message, type: "error" })
    } else {
      setMessage({
        text: "Təsdiq linki yenidən e-poçt ünvanınıza göndərildi.",
        type: "success",
      })
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (authMode === "signup") {
      const cleanEmail = email.trim().toLowerCase()
      if (!isPasswordStrong) {
        setMessage({
          text: "Şifrə minimum 8 simvol, 1 böyük hərf, 1 rəqəm və 1 özəl simvol içərməlidir.",
          type: "error",
        })
        setLoading(false)
        return
      }
      if (password !== confirmPassword) {
        setMessage({ text: "Şifrələr uyğun gəlmir.", type: "error" })
        setLoading(false)
        return
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
      const extra = buildLawyerStructuredFields()
      const metadata =
        accountRole === "lawyer"
          ? {
              role: "lawyer",
              practitioner_type: practitionerType,
              name: firstName.trim(),
              surname: lastName.trim(),
              full_name: fullName,
              license_number: getNormalizedLicense(),
              experience_years: parseInt(experienceYears, 10) || 0,
              bio: bio.trim(),
              specialties: selectedSpecialties,
              workplaces: extra.workplaces,
              education: extra.education,
              hourly_rate: extra.hourlyRate,
            }
          : {
              role: "citizen",
              name: firstName.trim(),
              surname: lastName.trim(),
              full_name: fullName,
            }

      const redirectNext = accountRole === "lawyer" ? "?next=/account%3Frole=lawyer" : ""
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback${redirectNext}`,
          data: metadata,
        },
      })

      if (error) {
        setMessage({ text: error.message, type: "error" })
      } else if (data.session) {
        window.location.assign(accountRole === "lawyer" ? "/account?role=lawyer" : "/")
        return
      } else {
        setIsOtpSent(true)
        setMessage({
          text:
            accountRole === "lawyer"
              ? "Qeydiyyat tamamlandı! E-poçtunuza göndərilən linkə kliklədikdən sonra anketiniz admin yoxlamasına göndəriləcək."
              : "Qeydiyyat tamamlandı! Hesabınızı aktivləşdirmək üçün e-poçtunuza göndərilən təsdiq linkinə klikləyin.",
          type: "success",
        })
      }
      setLoading(false)
      return
    }

    // Login mode (for both citizen and lawyer)
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

      window.location.assign(accountRole === "lawyer" ? "/account" : "/")
      return
    }

    const redirectNext = accountRole === "lawyer" ? "?next=/account" : ""
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback${redirectNext}`,
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
      setMessage({
        text: "Şifrə sıfırlamaq üçün əvvəlcə e-poçt ünvanınızı daxil edin.",
        type: "error",
      })
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
    const redirectNext =
      accountRole === "lawyer"
        ? authMode === "signup"
          ? "?next=/account%3Frole=lawyer"
          : "?next=/account"
        : ""
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback${redirectNext}`,
      },
    })

    if (error) {
      setMessage({ text: error.message, type: "error" })
      setLoading(false)
    }
  }

  const showLawyerStep1 = accountRole === "lawyer" && authMode === "signup" && lawyerStep === 1

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

      {/* RIGHT PART: Unified Modern Auth Form */}
      <div className="flex flex-col justify-between min-h-screen px-5 py-8 sm:px-10 lg:px-12 xl:px-16 bg-slate-50/70 dark:bg-slate-950 overflow-y-auto">
        <div className="lg:hidden flex items-center justify-center gap-2.5 pt-2">
          <img src="/logo.png" alt="HÜQUQ AI Logo" className="w-9 h-9 object-contain" />
          <span className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
            HÜQUQ AI
          </span>
        </div>

        <div className={`w-full ${showLawyerStep1 ? "max-w-[600px]" : "max-w-[460px]"} mx-auto my-auto py-6 transition-all`}>
          <div className="mb-5 text-center lg:text-left">
            <div className="hidden lg:inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 mb-4 p-2">
              <img src="/logo.png" alt="HÜQUQ AI Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              {authMode === "signup"
                ? accountRole === "lawyer"
                  ? "Vəkil / Hüquqşünas Qeydiyyatı"
                  : "Hesab Yaradın"
                : accountRole === "lawyer"
                  ? "Vəkil / Hüquqşünas Girişi"
                  : "Xoş gəldiniz"}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {authMode === "signup"
                ? accountRole === "lawyer"
                  ? lawyerStep === 1
                    ? "Müştərilərin sizi tapa bilməsi üçün anketinizi doldurun"
                    : "E-poçtunuzu təsdiqləyin və şifrə təyin edin"
                  : "Adi müştəri kimi qeydiyyatdan keçin"
                : "Şəxsi hüquq köməkçinizə daxil olun"}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/30 space-y-4">
            {/* Role Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50">
              <button
                type="button"
                onClick={() => {
                  setAccountRole("citizen")
                  setMessage(null)
                  setIsOtpSent(false)
                }}
                className={`h-10 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                  accountRole === "citizen"
                    ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <User className="w-4 h-4" />
                <span>Adi Müştəri</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountRole("lawyer")
                  setMessage(null)
                  setIsOtpSent(false)
                }}
                className={`h-10 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                  accountRole === "lawyer"
                    ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Scale className="w-4 h-4" />
                <span>Vəkil / Hüquqşünas</span>
              </button>
            </div>

            {/* Action Tabs: Daxil Ol / Qeydiyyat */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
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
                  setLawyerStep(1)
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
                className={`p-3.5 rounded-2xl text-sm font-medium border ${
                  message.type === "error"
                    ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400"
                    : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {message.text}
              </div>
            )}

            {showLawyerStep1 ? (
              <form onSubmit={handleLawyerStep1Submit} className="space-y-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPractitionerType("vekil")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      practitionerType === "vekil"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <p className="text-sm font-bold">Vəkil</p>
                    <p className={`text-[11px] mt-0.5 ${practitionerType === "vekil" ? "text-emerald-100" : "text-slate-500"}`}>
                      Vəkillər Kollegiyası üzvü
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPractitionerType("huquqsunas")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      practitionerType === "huquqsunas"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <p className="text-sm font-bold">Hüquqşünas</p>
                    <p className={`text-[11px] mt-0.5 ${practitionerType === "huquqsunas" ? "text-emerald-100" : "text-slate-500"}`}>
                      Ali hüquq təhsilli mütəxəssis
                    </p>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Adınız (Məs: Əli)"
                    className="h-11 rounded-xl bg-slate-50/70 dark:bg-slate-950"
                  />
                  <Input
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Soyadınız (Məs: Əliyev)"
                    className="h-11 rounded-xl bg-slate-50/70 dark:bg-slate-950"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {practitionerType === "vekil" ? (
                    <Input
                      required
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="Vəkil Vəsiqəsi № (VK-12345)"
                      className="h-11 rounded-xl bg-slate-50/70 dark:bg-slate-950"
                    />
                  ) : (
                    <Input
                      required
                      value={educationDoc}
                      onChange={(e) => setEducationDoc(e.target.value)}
                      placeholder="Diplom / Təhsil sənədi №"
                      className="h-11 rounded-xl bg-slate-50/70 dark:bg-slate-950"
                    />
                  )}
                  <Input
                    required
                    type="number"
                    min="0"
                    max="60"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    placeholder="İş Təcrübəsi (İl)"
                    className="h-11 rounded-xl bg-slate-50/70 dark:bg-slate-950"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    type="number"
                    min="0"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="Qiymət (AZN/saat)"
                    className="h-11 rounded-xl bg-slate-50/70 dark:bg-slate-950"
                  />
                  <Input
                    value={workplaceName}
                    onChange={(e) => setWorkplaceName(e.target.value)}
                    placeholder="İş yeri / Büro"
                    className="h-11 rounded-xl bg-slate-50/70 dark:bg-slate-950"
                  />
                  <Input
                    value={workplaceAddress}
                    onChange={(e) => setWorkplaceAddress(e.target.value)}
                    placeholder="Ofis ünvanı"
                    className="h-11 rounded-xl bg-slate-50/70 dark:bg-slate-950"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    required
                    value={eduInstitution}
                    onChange={(e) => setEduInstitution(e.target.value)}
                    placeholder="Universitet (Məs: BDU)"
                    className="h-11 rounded-xl bg-slate-50/70 dark:bg-slate-950"
                  />
                  <Input
                    value={eduDegree}
                    onChange={(e) => setEduDegree(e.target.value)}
                    placeholder="Dərəcə (Bakalavr/Magistr)"
                    className="h-11 rounded-xl bg-slate-50/70 dark:bg-slate-950"
                  />
                  <Input
                    value={eduField}
                    onChange={(e) => setEduField(e.target.value)}
                    placeholder="İxtisas"
                    className="h-11 rounded-xl bg-slate-50/70 dark:bg-slate-950"
                  />
                </div>

                <Textarea
                  required
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Özünüz və təcrübəniz haqqında qısa məlumat (Bio)..."
                  className="min-h-[80px] rounded-xl resize-none bg-slate-50/70 dark:bg-slate-950"
                />

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    İxtisaslaşdığınız Hüquq Sahələri
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                    {categoriesData.map((category) => {
                      const isSelected = selectedSpecialties.includes(category.name_az)
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => toggleSpecialty(category.name_az)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50"
                          }`}
                        >
                          <CategoryIcon
                            id={category.id}
                            className={`w-4 h-4 shrink-0 ${isSelected ? "text-white" : "text-slate-500"}`}
                          />
                          <span className="text-xs font-medium leading-tight line-clamp-2">
                            {category.name_az}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 font-bold rounded-xl">
                  Növbəti Addım: E-poçt və Şifrə
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            ) : !isOtpSent ? (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {authMode === "signup" && accountRole === "citizen" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative group/input">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/input:text-emerald-600 transition-colors" />
                      <Input
                        type="text"
                        placeholder="Adınız"
                        className="pl-10 h-12 bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl text-sm"
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
                        className="pl-10 h-12 bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div className="relative group/input">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/input:text-emerald-600 transition-colors" />
                  <Input
                    type="email"
                    placeholder="E-poçt ünvanınız"
                    className="pl-10 h-12 bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    required
                  />
                </div>

                {(authMode === "signup" || loginMethod === "password") && (
                  <div className="relative group/input">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/input:text-emerald-600 transition-colors" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={authMode === "signup" ? "Şifrə təyin edin" : "Şifrəniz"}
                      className="pl-10 pr-10 h-12 bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={authMode === "signup" ? 8 : 6}
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
                  <>
                    <div className="relative group/input">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/input:text-emerald-600 transition-colors" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Şifrəni təsdiqləyin"
                        className="pl-10 h-12 bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        minLength={8}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 text-[11px]">
                      {[
                        { ok: pwChecks.minLength, label: "Minimum 8 simvol" },
                        { ok: pwChecks.hasUpper, label: "1 böyük hərf (A-Z)" },
                        { ok: pwChecks.hasDigit, label: "1 rəqəm (0-9)" },
                        { ok: pwChecks.hasSpecial, label: "1 özəl simvol (!@#...)" },
                      ].map((rule) => (
                        <div
                          key={rule.label}
                          className={`flex items-center gap-1.5 font-medium ${
                            rule.ok ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"
                          }`}
                        >
                          {rule.ok ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>{rule.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
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
                  className="w-full h-12 font-bold text-sm sm:text-base rounded-xl transition-all"
                  disabled={loading || (authMode === "signup" && !isPasswordStrong)}
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

                {accountRole === "lawyer" && authMode === "signup" && (
                  <button
                    type="button"
                    onClick={() => setLawyerStep(1)}
                    className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 pt-1"
                  >
                    &larr; Anket məlumatlarına qayıt
                  </button>
                )}
              </form>
            ) : (
              <div className="space-y-2.5">
                {authMode === "signup" && (
                  <Button
                    type="button"
                    className="w-full h-12 rounded-xl font-semibold text-sm"
                    onClick={handleResendSignupEmail}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Təsdiq linkini yenidən göndər
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-sm"
                  onClick={() => setIsOtpSent(false)}
                >
                  Başqa e-poçt yoxla
                </Button>
              </div>
            )}

            {!showLawyerStep1 && (
              <>
                <div className="relative my-2">
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
                    className="h-11 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2.5 rounded-xl transition-all"
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
                      Google {accountRole === "lawyer" ? "(Vəkil)" : ""}
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2.5 rounded-xl transition-all"
                    onClick={() => handleOAuthLogin("facebook")}
                    disabled={loading}
                  >
                    <svg className="w-4 h-4 text-[#1877F2] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.114.198v3.625c-.523-.025-1.051-.039-1.586-.039-1.183 0-1.566.273-1.566 1.436v1.942h3.906l-.511 3.667h-3.395v7.98h-5.288z" />
                    </svg>
                    <span className="font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                      Facebook {accountRole === "lawyer" ? "(Vəkil)" : ""}
                    </span>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-4 pt-4">
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
