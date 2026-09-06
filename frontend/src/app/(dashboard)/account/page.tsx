"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, LogIn, LogOut, Save, Camera, Mail, Shield, Bell, Key, CreditCard, LayoutDashboard, Palette, Moon, Sun, Monitor } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/client"
import { CategoryIcon } from "@/components/ui/category-icon"
import categoriesData from "@/data/lawyer_categories.json"
import LawyerProfileTab from "@/components/account/LawyerProfileTab"
import AccountNotifications from "@/components/account/AccountNotifications"
import Link from "next/link"

export default function AccountPage() {
  const { isLoggedIn, user, logout, updateProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [bio, setBio] = useState(user?.bio || "")
  const [role, setRole] = useState(user?.role || "client")
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(user?.specialties || [])
  const [hourlyRate, setHourlyRate] = useState(user?.hourlyRate?.toString() || "0")
  const [licenseNumber, setLicenseNumber] = useState(user?.licenseNumber || "")
  const [experienceYears, setExperienceYears] = useState(user?.experienceYears?.toString() || "")
  const [activeTab, setActiveTab] = useState("personal")
  const [isUpdating, setIsUpdating] = useState(false)

  // Sync state when user object loads from DB
  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setEmail(user.email || "")
      setBio(user.bio || "")
      setRole(user.role || "client")
      setSelectedSpecialties(user.specialties || [])
      setHourlyRate(user.hourlyRate?.toString() || "0")
      setLicenseNumber(user.licenseNumber || "")
      setExperienceYears(user.experienceYears?.toString() || "")
    }
  }, [user])

  // File Input Refs
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.email}-${type}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)

      // Update profile
      if (type === 'avatar') {
        await updateProfile({ avatar: publicUrl })
      } else {
        await updateProfile({ coverImage: publicUrl })
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Şəkil yüklənərkən xəta baş verdi. Zəhmət olmasa daha kiçik ölçülü şəkil seçin və ya internetinizi yoxlayın.')
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    await updateProfile({ 
      name, 
      email, 
      bio, 
      role, 
      specialties: role === 'lawyer' ? selectedSpecialties : undefined,
      hourlyRate: role === 'lawyer' ? parseFloat(hourlyRate) || 0 : undefined,
      licenseNumber: role === 'lawyer' ? licenseNumber : undefined,
      experienceYears: role === 'lawyer' ? parseInt(experienceYears, 10) || 0 : undefined
    })
    setIsUpdating(false)
    alert("Məlumatlarınız uğurla yeniləndi!")
  }

  // Helper for generating initials
  const initials = (name || "Qonaq").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 pt-8 flex-1 z-10">
        
        {isLoggedIn ? (
          <div className="space-y-6">
            {/* Cover and Avatar Section */}
            <div className="relative rounded-3xl overflow-hidden bg-white/80 dark:bg-card/40 backdrop-blur-3xl border border-slate-200 dark:border-white/5 shadow-2xl">
              {/* Cover Image */}
              <div className="h-48 md:h-64 w-full relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={coverInputRef} 
                  className="hidden" 
                  onChange={(e) => handleImageUpload(e, 'cover')} 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/80 to-blue-600/80 mix-blend-multiply z-10" />
                <img 
                  src={user?.coverImage || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop"} 
                  alt="Cover" 
                  className="w-full h-full object-cover"
                />
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="absolute top-4 right-4 z-20 bg-black/50 text-white hover:bg-black/70 border-none backdrop-blur-md"
                  onClick={() => coverInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Örtüyü Dəyiş
                </Button>
              </div>

              {/* Profile Info Row */}
              <div className="px-6 sm:px-10 pb-8 relative flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8 -mt-16 sm:-mt-20 z-20">
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={avatarInputRef} 
                    className="hidden" 
                    onChange={(e) => handleImageUpload(e, 'avatar')} 
                  />
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-background bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-4xl font-bold text-white shadow-xl overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : initials}
                  </div>
                  <button 
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-2 right-2 p-2 bg-primary rounded-full text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 text-center sm:text-left mb-2">
                  <div className="flex items-center justify-center sm:justify-start gap-3">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{name}</h1>
                    {user?.isVerified && (
                      <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold px-2 py-1 rounded-md">
                        Təsdiqlənmiş Vəkil
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-600 dark:text-slate-300 mt-1">
                    <Mail className="w-4 h-4" />
                    <span>{email}</span>
                  </div>
                  {user?.role === 'lawyer' && (
                    <div className="mt-2 text-sm text-primary font-medium">
                      Hüquqşünas / Vəkil
                    </div>
                  )}
                </div>

                <div className="mb-2">
                  <Button variant="destructive" onClick={logout} className="gap-2 shadow-lg">
                    <LogOut className="w-4 h-4" />
                    Çıxış Et
                  </Button>
                </div>
              </div>
            </div>

            {/* Layout Split: Sidebar + Main Content */}
            <div className="flex flex-col md:flex-row gap-8 items-start mt-8">
              
              {/* Left Sidebar Menu */}
              <div className="w-full md:w-72 shrink-0 flex flex-col gap-2">
                <div className="px-4 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hesab Ayarları</h3>
                </div>
                <button 
                  onClick={() => setActiveTab("personal")}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-sm font-semibold ${activeTab === "personal" ? "bg-primary/15 text-primary shadow-[inset_0_0_20px_rgba(234,88,12,0.1)]" : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/5 hover:text-foreground"}`}
                >
                  <User className={`w-5 h-5 ${activeTab === "personal" ? "text-primary" : "opacity-70"}`} />
                  Şəxsi Məlumatlar
                </button>
                {user?.role === 'lawyer' && (
                  <button 
                    onClick={() => setActiveTab("lawyer_profile")}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-sm font-semibold ${activeTab === "lawyer_profile" ? "bg-primary/15 text-primary shadow-[inset_0_0_20px_rgba(234,88,12,0.1)]" : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/5 hover:text-foreground"}`}
                  >
                    <User className={`w-5 h-5 ${activeTab === "lawyer_profile" ? "text-primary" : "opacity-70"}`} />
                    Peşəkar Profil
                  </button>
                )}
                <button 
                  onClick={() => setActiveTab("security")}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-sm font-semibold ${activeTab === "security" ? "bg-primary/15 text-primary shadow-[inset_0_0_20px_rgba(234,88,12,0.1)]" : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/5 hover:text-foreground"}`}
                >
                  <Shield className={`w-5 h-5 ${activeTab === "security" ? "text-primary" : "opacity-70"}`} />
                  Təhlükəsizlik
                </button>
                <button 
                  onClick={() => setActiveTab("notifications")}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-sm font-semibold ${activeTab === "notifications" ? "bg-primary/15 text-primary shadow-[inset_0_0_20px_rgba(234,88,12,0.1)]" : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/5 hover:text-foreground"}`}
                >
                  <Bell className={`w-5 h-5 ${activeTab === "notifications" ? "text-primary" : "opacity-70"}`} />
                  Bildirişlər
                </button>
                <button 
                  onClick={() => setActiveTab("appearance")}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-sm font-semibold ${activeTab === "appearance" ? "bg-primary/15 text-primary shadow-[inset_0_0_20px_rgba(234,88,12,0.1)]" : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/5 hover:text-foreground"}`}
                >
                  <Palette className={`w-5 h-5 ${activeTab === "appearance" ? "text-primary" : "opacity-70"}`} />
                  Görünüş
                </button>
                
                <div className="px-4 pb-2 pt-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ödənişlər</h3>
                </div>
                <button 
                  onClick={() => setActiveTab("billing")}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-sm font-semibold ${activeTab === "billing" ? "bg-primary/15 text-primary shadow-[inset_0_0_20px_rgba(234,88,12,0.1)]" : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/5 hover:text-foreground"}`}
                >
                  <CreditCard className={`w-5 h-5 ${activeTab === "billing" ? "text-primary" : "opacity-70"}`} />
                  Abunəlik (Tezliklə)
                </button>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 w-full">
                <Card className="bg-white/70 dark:bg-card/30 backdrop-blur-3xl border-slate-200 dark:border-white/5 relative overflow-hidden shadow-2xl rounded-3xl">
                  {activeTab === "personal" && (
                    <>
                      <CardHeader className="border-b border-slate-200 dark:border-white/5 pb-6 px-8 pt-8">
                        <CardTitle className="text-2xl font-bold">Şəxsi Məlumatlar</CardTitle>
                        <CardDescription className="text-base mt-1">Profil məlumatlarınızı buradan yeniləyə bilərsiniz.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-8">
                        <form onSubmit={handleProfileUpdate} className="flex flex-col gap-10">
                          
                          {/* Basic Info Section */}
                          <div className="flex flex-col gap-6">
                            <div className="border-b border-slate-200 dark:border-white/10 pb-3">
                              <h4 className="text-sm font-bold text-foreground uppercase tracking-widest">Ümumi Məlumatlar</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="flex flex-col gap-3">
                                <label className="text-sm font-semibold text-muted-foreground ml-1" htmlFor="profile-name">Ad və Soyad</label>
                                <Input 
                                  id="profile-name" 
                                  value={name} 
                                  onChange={e => setName(e.target.value)} 
                                  className="bg-slate-50 dark:bg-background/40 border-slate-200 dark:border-white/10 h-12 text-base px-4 rounded-xl focus-visible:ring-primary/50 transition-all text-slate-900 dark:text-white"
                                />
                              </div>
                              <div className="flex flex-col gap-3">
                                <label className="text-sm font-semibold text-muted-foreground ml-1" htmlFor="profile-email">E-poçt Ünvanı</label>
                                <Input 
                                  id="profile-email" 
                                  type="email" 
                                  value={email} 
                                  onChange={e => setEmail(e.target.value)} 
                                  className="bg-slate-50 dark:bg-background/40 border-slate-200 dark:border-white/10 h-12 text-base px-4 rounded-xl focus-visible:ring-primary/50 transition-all text-slate-900 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Bio Section */}
                          <div className="flex flex-col gap-6">
                            <div className="border-b border-slate-200 dark:border-white/10 pb-3">
                              <h4 className="text-sm font-bold text-foreground uppercase tracking-widest">Profil Detalları</h4>
                            </div>
                            
                            <div className="flex flex-col gap-3">
                              <label className="text-sm font-semibold text-muted-foreground ml-1">Platformadakı Rolunuz</label>
                              <select 
                                value={role} 
                                onChange={(e) => setRole(e.target.value)}
                                className="bg-slate-50 dark:bg-background/40 border-slate-200 dark:border-white/10 h-12 text-base px-4 rounded-xl focus-visible:ring-primary/50 transition-all text-slate-900 dark:text-white"
                              >
                                <option value="client">Vətəndaş (Sual Verən)</option>
                                <option value="lawyer">Hüquqşünas / Vəkil</option>
                              </select>
                              <p className="text-xs text-muted-foreground ml-1 mt-1">Hüquqşünas seçdikdə digər istifadəçilər sizdən konsultasiya ala bilər.</p>
                            </div>

                            {role === 'lawyer' && (
                              <div className="flex flex-col gap-6 mt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="flex flex-col gap-3">
                                    <label className="text-sm font-semibold text-muted-foreground ml-1" htmlFor="profile-license">Vəkillər Kollegiyası Lisenziya Nömrəsi</label>
                                    <Input 
                                      id="profile-license" 
                                      value={licenseNumber} 
                                      onChange={e => setLicenseNumber(e.target.value)} 
                                      placeholder="Məs: VK-12345"
                                      className="bg-slate-50 dark:bg-background/40 border-slate-200 dark:border-white/10 h-12 text-base px-4 rounded-xl focus-visible:ring-primary/50 transition-all text-slate-900 dark:text-white"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-3">
                                    <label className="text-sm font-semibold text-muted-foreground ml-1" htmlFor="profile-experience">İş Təcrübəsi (İl)</label>
                                    <Input 
                                      id="profile-experience" 
                                      type="number"
                                      min="0"
                                      max="60"
                                      value={experienceYears} 
                                      onChange={e => setExperienceYears(e.target.value)} 
                                      placeholder="Məs: 10"
                                      className="bg-slate-50 dark:bg-background/40 border-slate-200 dark:border-white/10 h-12 text-base px-4 rounded-xl focus-visible:ring-primary/50 transition-all text-slate-900 dark:text-white"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="flex flex-col gap-3">
                                    <label className="text-sm font-semibold text-muted-foreground ml-1" htmlFor="profile-hourly">Saatlıq Xidmət Haqqı (AZN)</label>
                                    <Input 
                                      id="profile-hourly" 
                                      type="number"
                                      value={hourlyRate} 
                                      onChange={e => setHourlyRate(e.target.value)} 
                                      className="bg-slate-50 dark:bg-background/40 border-slate-200 dark:border-white/10 h-12 text-base px-4 rounded-xl focus-visible:ring-primary/50 transition-all text-slate-900 dark:text-white"
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-col gap-3 mt-4">
                                  <label className="text-sm font-semibold text-muted-foreground ml-1">İxtisas Sahələriniz (Toxunaraq seçin)</label>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {categoriesData.map(category => {
                                      const isSelected = selectedSpecialties.includes(category.name_az)
                                      return (
                                        <button
                                          key={category.id}
                                          type="button"
                                          onClick={() => {
                                            setSelectedSpecialties(prev => 
                                              prev.includes(category.name_az) 
                                                ? prev.filter(s => s !== category.name_az) 
                                                : [...prev, category.name_az]
                                            )
                                          }}
                                          className={`flex flex-col items-center justify-center gap-2 p-3 h-28 rounded-xl border text-center transition-all ${
                                            isSelected
                                              ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(234,88,12,0.15)] text-primary font-semibold'
                                              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-background/40 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                                          }`}
                                        >
                                          <CategoryIcon id={category.id} className="w-6 h-6 mb-1" />
                                          <span className="text-xs leading-tight line-clamp-2">{category.name_az}</span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex flex-col gap-3 mt-2">
                              <label className="text-sm font-semibold text-muted-foreground ml-1" htmlFor="profile-bio">Haqqında (Bio)</label>
                              <textarea 
                                id="profile-bio" 
                                placeholder={role === 'lawyer' ? "Təcrübəniz və xidmətləriniz haqqında yazın..." : "Özünüz haqqında qısa məlumat yazın..."}
                                value={bio}
                                onChange={e => setBio(e.target.value)}
                                className="flex min-h-[120px] w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-background/40 px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-y text-slate-900 dark:text-white"
                              />
                              <p className="text-xs text-muted-foreground ml-1 mt-1">Bu məlumat digər istifadəçilər tərəfindən görülə bilər.</p>
                            </div>
                          </div>
                          
                          <div className="pt-4 flex items-center justify-end">
                            <Button type="submit" size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-white px-8 h-12 rounded-xl text-base font-semibold shadow-[0_0_20px_rgba(234,88,12,0.3)] hover:shadow-[0_0_30px_rgba(234,88,12,0.5)] transition-all">
                              <Save className="w-5 h-5" />
                              Dəyişiklikləri Yadda Saxla
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </>
                  )}
                  
                  {activeTab === "lawyer_profile" && (
                    <LawyerProfileTab />
                  )}
                  
                  {activeTab === "security" && (
                    <div className="p-12 text-center">
                      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Key className="w-10 h-10 text-primary opacity-80" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-3">Şifrəni Yenilə</h3>
                      <p className="text-muted-foreground max-w-md mx-auto text-lg">Təhlükəsizlik məqsədilə şifrənizi periodik olaraq yeniləməyiniz tövsiyə olunur. (Tezliklə)</p>
                    </div>
                  )}

                  {activeTab === "notifications" && (
                    <div className="p-8">
                      <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-white/10 pb-4">
                        <div className="p-3 bg-primary/10 rounded-xl">
                          <Bell className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-foreground">Bildirişlər</h3>
                          <p className="text-muted-foreground">Sizə gələn müraciətlər və bildirişlər</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-lg">Gözləyən Müraciətlər</h4>
                          <Link href="/consultations">
                            <Button variant="outline" size="sm">Bütün Müraciətlərə Bax</Button>
                          </Link>
                        </div>
                        
                        {/* We will fetch and display notifications here via a new component to keep it clean */}
                        <AccountNotifications />
                      </div>
                    </div>
                  )}
                  
                  {activeTab === "appearance" && (
                    <>
                      <CardHeader className="border-b border-slate-200 dark:border-white/5 pb-6 px-8 pt-8">
                        <CardTitle className="text-2xl font-bold text-foreground">Görünüş</CardTitle>
                        <CardDescription className="text-base mt-1">Sistemin vizual mövzusunu buradan dəyişdirə bilərsiniz.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-8">
                        <div className="flex flex-col gap-6">
                           <div className="border-b border-slate-200 dark:border-white/10 pb-3">
                             <h4 className="text-sm font-bold text-foreground uppercase tracking-widest">Mövzu Seçimi</h4>
                           </div>
                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <button 
                                onClick={() => setTheme('light')} 
                                className={`border rounded-2xl p-6 flex flex-col items-center gap-4 transition-all ${theme === 'light' ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(234,88,12,0.15)]' : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-background/40 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                              >
                                <Sun className={`w-8 h-8 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span className={`font-semibold ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`}>Açıq</span>
                              </button>
                              <button 
                                onClick={() => setTheme('dark')} 
                                className={`border rounded-2xl p-6 flex flex-col items-center gap-4 transition-all ${theme === 'dark' ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(234,88,12,0.15)]' : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-background/40 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                              >
                                <Moon className={`w-8 h-8 ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span className={`font-semibold ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`}>Qaranlıq</span>
                              </button>
                              <button 
                                onClick={() => setTheme('system')} 
                                className={`border rounded-2xl p-6 flex flex-col items-center gap-4 transition-all ${theme === 'system' ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(234,88,12,0.15)]' : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-background/40 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                              >
                                <Monitor className={`w-8 h-8 ${theme === 'system' ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span className={`font-semibold ${theme === 'system' ? 'text-primary' : 'text-muted-foreground'}`}>Sistem</span>
                              </button>
                           </div>
                        </div>
                      </CardContent>
                    </>
                  )}
                  
                  {activeTab === "billing" && (
                    <div className="p-12 text-center">
                      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CreditCard className="w-10 h-10 text-primary opacity-80" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-3">Ödənişlər və Abunəlik</h3>
                      <p className="text-muted-foreground max-w-md mx-auto text-lg">Premium xidmətlər aktivləşdikdə abunəliyinizi buradan idarə edə biləcəksiniz. (Tezliklə)</p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        ) : (
          /* Login Redirect State */
          <div className="max-w-md mx-auto pt-12 text-center">
            <Card className="bg-card/40 backdrop-blur-3xl border-white/5 shadow-2xl p-12">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Hesaba daxil olmalısınız</h2>
              <p className="text-muted-foreground mb-8">
                Profil məlumatlarınıza baxmaq və dəyişdirmək üçün zəhmət olmasa sistemə daxil olun.
              </p>
              <Button size="lg" className="w-full gap-2 text-base font-semibold" onClick={() => window.location.href = '/login'}>
                <LogIn className="h-5 w-5" />
                Daxil Ol səhifəsinə keç
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
