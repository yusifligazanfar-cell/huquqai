"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  User,
  LogIn,
  LogOut,
  Save,
  Camera,
  Mail,
  Shield,
  Bell,
  Key,
  CreditCard,
  Palette,
  Moon,
  Sun,
  Monitor,
  CheckCircle2,
  Scale,
  Briefcase,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Circle,
  X,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CategoryIcon } from "@/components/ui/category-icon"
import categoriesData from "@/data/lawyer_categories.json"
import LawyerProfileTab from "@/components/account/LawyerProfileTab"
import AccountNotifications from "@/components/account/AccountNotifications"
import Link from "next/link"

export default function AccountPage() {
  const { isLoggedIn, user, logout, updateProfile } = useAuth()
  const { theme, setTheme } = useTheme()

  const [name, setName] = useState(user?.name || "")
  const [surname, setSurname] = useState(user?.surname || "")
  const [email, setEmail] = useState(user?.email || "")
  const [bio, setBio] = useState(user?.bio || "")
  const [role, setRole] = useState(user?.role || "client")
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(user?.specialties || [])
  const [hourlyRate, setHourlyRate] = useState(user?.hourlyRate?.toString() || "0")
  const [licenseNumber, setLicenseNumber] = useState(user?.licenseNumber || "")
  const [experienceYears, setExperienceYears] = useState(user?.experienceYears?.toString() || "")
  const [activeTab, setActiveTab] = useState("personal")
  const [isUpdating, setIsUpdating] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [resetMessage, setResetMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [sendingReset, setSendingReset] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [showPasswords, setShowPasswords] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setSurname(user.surname || "")
      setEmail(user.email || "")
      setBio(user.bio || "")
      setRole(user.role || "client")
      setSelectedSpecialties(user.specialties || [])
      setHourlyRate(user.hourlyRate?.toString() || "0")
      setLicenseNumber(user.licenseNumber || "")
      setExperienceYears(user.experienceYears?.toString() || "")
    }
  }, [user])

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover") => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error("File read error"))
        reader.onload = () => {
          const img = new Image()
          img.onerror = () => reject(new Error("Image decode error"))
          img.onload = () => {
            const maxDim = type === "avatar" ? 400 : 1200
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
            const canvas = document.createElement("canvas")
            canvas.width = Math.max(1, Math.round(img.width * scale))
            canvas.height = Math.max(1, Math.round(img.height * scale))
            const ctx = canvas.getContext("2d")
            if (!ctx) return reject(new Error("Canvas unavailable"))
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            resolve(canvas.toDataURL("image/jpeg", 0.8))
          }
          img.src = String(reader.result)
        }
        reader.readAsDataURL(file)
      })

      if (type === "avatar") {
        await updateProfile({ avatar: dataUrl })
      } else {
        await updateProfile({ coverImage: dataUrl })
      }
      setSaveMessage("Şəkil uğurla yeniləndi.")
      setTimeout(() => setSaveMessage(null), 3500)
    } catch (error) {
      console.error("Error uploading image:", error)
      alert("Şəkil yüklənərkən xəta baş verdi. Zəhmət olmasa daha kiçik ölçülü şəkil seçin.")
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    setSaveMessage(null)
    await updateProfile({
      name,
      surname,
      email,
      bio,
      role,
      specialties: role === "lawyer" ? selectedSpecialties : undefined,
      hourlyRate: role === "lawyer" ? parseFloat(hourlyRate) || 0 : undefined,
      licenseNumber: role === "lawyer" ? licenseNumber : undefined,
      experienceYears: role === "lawyer" ? parseInt(experienceYears, 10) || 0 : undefined,
    })
    setIsUpdating(false)
    setSaveMessage("Məlumatlarınız uğurla yadda saxlanıldı.")
    setTimeout(() => setSaveMessage(null), 4000)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetMessage(null)

    const isStrong =
      newPassword.length >= 8 &&
      /[A-Z]/.test(newPassword) &&
      /[0-9]/.test(newPassword) &&
      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(newPassword)

    if (!isStrong) {
      setResetMessage({
        text: "Yeni şifrə minimum 8 simvol, 1 böyük hərf, 1 rəqəm və 1 özəl simvol içərməlidir.",
        type: "error",
      })
      return
    }
    if (newPassword !== confirmNewPassword) {
      setResetMessage({ text: "Yeni şifrələr uyğun gəlmir.", type: "error" })
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setResetMessage({ text: data.error || "Şifrə yenilənə bilmədi.", type: "error" })
      } else {
        setCurrentPassword("")
        setNewPassword("")
        setConfirmNewPassword("")
        setResetMessage({ text: "Şifrəniz uğurla yeniləndi!", type: "success" })
      }
    } catch {
      setResetMessage({ text: "Şəbəkə xətası baş verdi.", type: "error" })
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSendPasswordReset = async () => {
    if (!email.trim()) return
    setSendingReset(true)
    setResetMessage(null)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", email: email.trim().toLowerCase() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setResetMessage({ text: data.error || "Link göndərilə bilmədi.", type: "error" })
      } else {
        setResetMessage({ text: "Şifrə yeniləmə linki e-poçt ünvanınıza göndərildi.", type: "success" })
      }
    } catch {
      setResetMessage({ text: "Şəbəkə xətası baş verdi.", type: "error" })
    } finally {
      setSendingReset(false)
    }
  }

  const fullName = `${name} ${surname}`.trim() || "İstifadəçi"
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  const roleLabel =
    role === "lawyer"
      ? licenseNumber?.startsWith("HÜQ:")
        ? "Hüquqşünas"
        : "Vəkil"
      : "Adi Müştəri"

  const navItems = [
    { id: "personal", label: "Şəxsi Məlumatlar", icon: User },
    ...(user?.role === "lawyer" ? [{ id: "lawyer_profile", label: "Peşəkar Profil", icon: Briefcase }] : []),
    { id: "security", label: "Təhlükəsizlik", icon: Shield },
    { id: "notifications", label: "Bildirişlər", icon: Bell },
    { id: "appearance", label: "Görünüş", icon: Palette },
    { id: "billing", label: "Abunəlik", icon: CreditCard },
  ]

  return (
    <div className="flex flex-col min-h-screen pb-14">
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 flex-1 z-10">
        {isLoggedIn ? (
          <div className="space-y-6">
            {role === "lawyer" && !user?.isVerified && !guestBannerDismissed && (
              <div className="rounded-2xl border-2 border-amber-400/80 dark:border-amber-600/70 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/60 dark:via-orange-950/40 dark:to-amber-950/60 p-4 sm:p-5 shadow-lg shadow-amber-500/10 flex items-start justify-between gap-3.5">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-sm sm:text-base font-extrabold text-amber-950 dark:text-amber-200">
                      Qonaq rejimi — Admin təsdiqi gözlənilir
                    </h2>
                    <p className="text-xs sm:text-sm font-medium text-amber-900/90 dark:text-amber-200/85 leading-relaxed">
                      Anketiniz admin tərəfindən yoxlanılır. Təsdiqlənənə qədər Vəkillər Kataloqunda görünmürsünüz və müştərilərdən randevu qəbul edə bilmirsiniz. Təsdiqdən sonra e-poçtunuza bildiriş göndəriləcək.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Bildirişi bağla"
                  onClick={() => setGuestBannerDismissed(true)}
                  className="p-1.5 rounded-lg text-amber-800/70 dark:text-amber-300/70 hover:text-amber-950 dark:hover:text-amber-100 hover:bg-amber-500/15 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Hero Profile Card */}
            <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-lg shadow-slate-200/40 dark:shadow-black/30">
              <div className="h-36 sm:h-44 w-full relative overflow-hidden bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900">
                <input
                  type="file"
                  accept="image/*"
                  ref={coverInputRef}
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, "cover")}
                />
                {user?.coverImage && (
                  <img src={user.coverImage} alt="Cover" className="w-full h-full object-cover opacity-80" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/15" />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="absolute top-4 right-4 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/45 hover:bg-black/65 text-white text-xs font-semibold backdrop-blur-md border border-white/15 transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Örtüyü Dəyiş</span>
                </button>
              </div>

              <div className="px-5 sm:px-8 pt-4 pb-6 relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-20">
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-5">
                  <div className="relative group shrink-0 -mt-16 sm:-mt-20">
                    <input
                      type="file"
                      accept="image/*"
                      ref={avatarInputRef}
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, "avatar")}
                    />
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-white dark:border-slate-900 bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-3xl font-black text-white shadow-xl overflow-hidden">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      aria-label="Profil şəklini dəyiş"
                      className="absolute -bottom-1.5 -right-1.5 p-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white shadow-md transition-all border-2 border-white dark:border-slate-900"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-center sm:text-left pb-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                        {fullName}
                      </h1>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {role === "lawyer" && <Scale className="w-3 h-3" />}
                        {roleLabel}
                      </span>
                      {user?.isVerified && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Təsdiqlənmiş
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-1">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{email}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={logout}
                  className="gap-2 rounded-xl border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 self-center sm:self-end"
                >
                  <LogOut className="w-4 h-4" />
                  Çıxış Et
                </Button>
              </div>
            </div>

            {/* Mobile Horizontal Tabs */}
            <div className="flex md:hidden gap-2 overflow-x-auto pb-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      active
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Desktop Split Layout */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Left Sidebar Nav */}
              <div className="hidden md:flex w-64 shrink-0 flex-col gap-1.5 bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-sm">
                <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Hesab Ayarları
                </p>
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-sm font-semibold ${
                        active
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? "text-emerald-600 dark:text-emerald-400" : "opacity-70"}`} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Main Content Area */}
              <div className="flex-1 w-full">
                <Card className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-lg shadow-slate-200/40 dark:shadow-black/30 rounded-3xl overflow-hidden">
                  {activeTab === "personal" && (
                    <>
                      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-5 px-6 sm:px-8 pt-6">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <CardTitle className="text-xl sm:text-2xl font-bold">Şəxsi Məlumatlar</CardTitle>
                            <CardDescription className="text-sm mt-1">
                              Profil məlumatlarınızı buradan yeniləyə bilərsiniz.
                            </CardDescription>
                          </div>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                            {roleLabel}
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="p-6 sm:p-8">
                        {saveMessage && (
                          <div className="mb-6 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>{saveMessage}</span>
                          </div>
                        )}

                        <form onSubmit={handleProfileUpdate} className="space-y-7">
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                              Ümumi Məlumatlar
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor="profile-name">
                                  Ad
                                </label>
                                <Input
                                  id="profile-name"
                                  value={name}
                                  onChange={(e) => setName(e.target.value)}
                                  className="bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-11 rounded-xl"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor="profile-surname">
                                  Soyad
                                </label>
                                <Input
                                  id="profile-surname"
                                  value={surname}
                                  onChange={(e) => setSurname(e.target.value)}
                                  className="bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-11 rounded-xl"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor="profile-email">
                                E-poçt Ünvanı
                              </label>
                              <Input
                                id="profile-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-11 rounded-xl"
                              />
                            </div>
                          </div>

                          {role === "lawyer" && (
                            <div className="space-y-5 pt-2 border-t border-slate-100 dark:border-slate-800">
                              <div
                                className={`rounded-2xl border p-4 text-xs sm:text-sm font-medium ${
                                  user?.isVerified
                                    ? "bg-emerald-50 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300"
                                    : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300"
                                }`}
                              >
                                {user?.isVerified
                                  ? "Hesabınız admin tərəfindən təsdiqlənib və aktivdir. Artıq müştərilər sizi kataloqda görə və randevu ala bilər."
                                  : "Qonaq rejimi: Anketiniz admin tərəfindən yoxlanılır (təsdiq gözləyir). Təsdiqlənənə qədər Vəkillər Kataloqunda görünmürsünüz."}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor="profile-license">
                                    Lisenziya / Vəsiqə №
                                  </label>
                                  <Input
                                    id="profile-license"
                                    value={licenseNumber}
                                    onChange={(e) => setLicenseNumber(e.target.value)}
                                    placeholder="Məs: VK-12345"
                                    className="bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-11 rounded-xl"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor="profile-experience">
                                    İş Təcrübəsi (İl)
                                  </label>
                                  <Input
                                    id="profile-experience"
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={experienceYears}
                                    onChange={(e) => setExperienceYears(e.target.value)}
                                    className="bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-11 rounded-xl"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor="profile-hourly">
                                    Saatlıq Haqq (AZN)
                                  </label>
                                  <Input
                                    id="profile-hourly"
                                    type="number"
                                    value={hourlyRate}
                                    onChange={(e) => setHourlyRate(e.target.value)}
                                    className="bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-11 rounded-xl"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2.5">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                  İxtisas Sahələriniz
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                  {categoriesData.map((category) => {
                                    const isSelected = selectedSpecialties.includes(category.name_az)
                                    return (
                                      <button
                                        key={category.id}
                                        type="button"
                                        onClick={() =>
                                          setSelectedSpecialties((prev) =>
                                            prev.includes(category.name_az)
                                              ? prev.filter((s) => s !== category.name_az)
                                              : [...prev, category.name_az]
                                          )
                                        }
                                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                                          isSelected
                                            ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold"
                                            : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 hover:border-emerald-500/40 text-slate-700 dark:text-slate-300"
                                        }`}
                                      >
                                        <CategoryIcon id={category.id} className="w-4 h-4 shrink-0" />
                                        <span className="text-xs leading-tight line-clamp-2">{category.name_az}</span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor="profile-bio">
                              Haqqında (Bio)
                            </label>
                            <textarea
                              id="profile-bio"
                              placeholder={
                                role === "lawyer"
                                  ? "Təcrübəniz və xidmətləriniz haqqında yazın..."
                                  : "Özünüz haqqında qısa məlumat yazın..."
                              }
                              value={bio}
                              onChange={(e) => setBio(e.target.value)}
                              className="flex min-h-[110px] w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 transition-all resize-y text-slate-900 dark:text-white"
                            />
                            <p className="text-xs text-slate-400">
                              Bu məlumat digər istifadəçilər tərəfindən görülə bilər.
                            </p>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              type="submit"
                              disabled={isUpdating}
                              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 h-11 rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20"
                            >
                              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              <span>{isUpdating ? "Yadda saxlanır..." : "Dəyişiklikləri Yadda Saxla"}</span>
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </>
                  )}

                  {activeTab === "lawyer_profile" && <LawyerProfileTab />}

                  {activeTab === "security" && (
                    <>
                      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-5 px-6 sm:px-8 pt-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl">
                            <Key className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <CardTitle className="text-xl sm:text-2xl font-bold">Şifrə və Təhlükəsizlik</CardTitle>
                            <CardDescription className="text-sm mt-0.5">
                              Şifrənizi buradan birbaşa dəyişə və ya e-poçtunuza sıfırlama linki göndərə bilərsiniz.
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-6 sm:p-8 space-y-6">
                        {resetMessage && (
                          <div
                            className={`p-3.5 rounded-2xl text-xs sm:text-sm font-medium border ${
                              resetMessage.type === "error"
                                ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400"
                                : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {resetMessage.text}
                          </div>
                        )}

                        <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                              Cari Şifrə <span className="text-slate-400 font-normal">(Google ilə daxil olmusunuzsa boş buraxın)</span>
                            </label>
                            <div className="relative">
                              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input
                                type={showPasswords ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Cari şifrəniz"
                                className="pl-10 pr-10 h-11 rounded-xl bg-slate-50/70 dark:bg-slate-950"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords((p) => !p)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                              >
                                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                Yeni Şifrə
                              </label>
                              <Input
                                type={showPasswords ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Yeni şifrə"
                                minLength={8}
                                required
                                className="h-11 rounded-xl bg-slate-50/70 dark:bg-slate-950"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                Yeni Şifrəni Təsdiqlə
                              </label>
                              <Input
                                type={showPasswords ? "text" : "password"}
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                placeholder="Təkrar daxil edin"
                                minLength={8}
                                required
                                className="h-11 rounded-xl bg-slate-50/70 dark:bg-slate-950"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 text-[11px]">
                            {[
                              { ok: newPassword.length >= 8, label: "Minimum 8 simvol" },
                              { ok: /[A-Z]/.test(newPassword), label: "1 böyük hərf (A-Z)" },
                              { ok: /[0-9]/.test(newPassword), label: "1 rəqəm (0-9)" },
                              { ok: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(newPassword), label: "1 özəl simvol (!@#...)" },
                            ].map((rule) => (
                              <div
                                key={rule.label}
                                className={`flex items-center gap-1.5 font-medium ${
                                  rule.ok ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"
                                }`}
                              >
                                {rule.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Circle className="w-3.5 h-3.5 shrink-0" />}
                                <span>{rule.label}</span>
                              </div>
                            ))}
                          </div>

                          <Button
                            type="submit"
                            disabled={changingPassword}
                            className="h-11 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {changingPassword && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Şifrəni Yenilə
                          </Button>
                        </form>

                        <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <p className="text-xs text-muted-foreground">
                            Cari şifrənizi unutmusunuz? E-poçtunuza (<strong>{email}</strong>) sıfırlama linki göndərin.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSendPasswordReset}
                            disabled={sendingReset}
                            className="rounded-xl shrink-0"
                          >
                            {sendingReset && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                            E-poçta Link Göndər
                          </Button>
                        </div>
                      </CardContent>
                    </>
                  )}

                  {activeTab === "notifications" && (
                    <div className="p-6 sm:p-8">
                      <div className="flex items-center justify-between gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl">
                            <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-foreground">Bildirişlər</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Sizə gələn müraciətlər və bildirişlər
                            </p>
                          </div>
                        </div>
                        <Link href="/consultations">
                          <Button variant="outline" size="sm" className="rounded-xl">
                            Bütün Müraciətlər
                          </Button>
                        </Link>
                      </div>
                      <AccountNotifications />
                    </div>
                  )}

                  {activeTab === "appearance" && (
                    <>
                      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-5 px-6 sm:px-8 pt-6">
                        <CardTitle className="text-xl sm:text-2xl font-bold">Görünüş</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          Sistemin vizual mövzusunu buradan dəyişdirə bilərsiniz.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 sm:p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {[
                            { id: "light", label: "Açıq", icon: Sun },
                            { id: "dark", label: "Qaranlıq", icon: Moon },
                            { id: "system", label: "Sistem", icon: Monitor },
                          ].map((opt) => {
                            const Icon = opt.icon
                            const active = theme === opt.id
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setTheme(opt.id)}
                                className={`border rounded-2xl p-6 flex flex-col items-center gap-3 transition-all ${
                                  active
                                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                                    : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-emerald-500/40"
                                }`}
                              >
                                <Icon className="w-7 h-7" />
                                <span className="font-bold text-sm">{opt.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </CardContent>
                    </>
                  )}

                  {activeTab === "billing" && (
                    <div className="p-10 sm:p-12 text-center space-y-4">
                      <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-center mx-auto">
                        <CreditCard className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-foreground">Ödənişlər və Abunəlik</h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Premium xidmətlər aktivləşdikdə abunəliyinizi buradan idarə edə biləcəksiniz. (Tezliklə)
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto pt-12 text-center">
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl p-8 sm:p-10">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Shield className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Hesaba daxil olmalısınız</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Profil məlumatlarınıza baxmaq və dəyişdirmək üçün sistemə daxil olun.
              </p>
              <Button
                size="lg"
                className="w-full gap-2 text-sm font-bold rounded-xl"
                onClick={() => (window.location.href = "/login")}
              >
                <LogIn className="h-4 w-4" />
                Daxil Ol səhifəsinə keç
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
