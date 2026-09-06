"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Loader2, 
  Scale, 
  CheckCircle2
} from "lucide-react"
import { CategoryIcon } from "@/components/ui/category-icon"
import categoriesData from "@/data/lawyer_categories.json"
export default function LawyerOnboardingPage() {
  const { user, updateProfile, isLoggedIn } = useAuth()
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  // Form State
  const [name, setName] = useState("")
  const [surname, setSurname] = useState("")
  const [licenseNumber, setLicenseNumber] = useState("")
  const [experienceYears, setExperienceYears] = useState("")
  const [bio, setBio] = useState("")
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])

  // Initialize form with existing user data
  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setSurname(user.surname || "")
      setLicenseNumber(user.licenseNumber || "")
      setExperienceYears(user.experienceYears?.toString() || "")
      setBio(user.bio || "")
      setSelectedSpecialties(user.specialties || [])
    }
  }, [user])

  // Redirect if not a lawyer or already fully onboarded
  useEffect(() => {
    if (isLoggedIn && user) {
      if (user.role !== 'lawyer') {
        router.replace('/dashboard')
      } else if (user.licenseNumber && user.experienceYears && user.surname && !success) {
        // If they already have all required info and didn't just submit
        router.replace('/dashboard')
      }
    }
  }, [isLoggedIn, user, router, success])

  const toggleSpecialty = (spec: string) => {
    setSelectedSpecialties(prev => 
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    )
  }

  const handleSubmit = async (e?: React.FormEvent, dataToSubmit?: any) => {
    if (e) e.preventDefault()
    setLoading(true)
    
    try {
      const payload = dataToSubmit || {
        name,
        surname,
        licenseNumber,
        experienceYears: parseInt(experienceYears, 10),
        bio,
        specialties: selectedSpecialties
      }

      await updateProfile(payload)
      setSuccess(true)
      
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      console.error(err)
      alert("Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.")
      setLoading(false)
    }
  }

  // Check for pending onboarding data from the pre-signup form
  useEffect(() => {
    if (isLoggedIn && user && user.role === 'lawyer' && !success) {
      const pendingDataStr = sessionStorage.getItem('pendingLawyerOnboarding')
      if (pendingDataStr) {
        // Remove immediately to prevent duplicate submissions
        sessionStorage.removeItem('pendingLawyerOnboarding')
        try {
          const pendingData = JSON.parse(pendingDataStr)
          // Automatically submit the pending data
          handleSubmit(undefined, pendingData)
        } catch (e) {
          console.error("Failed to parse pending onboarding data", e)
        }
      }
    }
  }, [isLoggedIn, user, success])

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Profiliniz Uğurla Yeniləndi!</h1>
        <p className="text-muted-foreground text-lg">
          Məlumatlarınız bazaya əlavə edildi. İdarəetmə panelinə yönləndirilirsiniz...
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
          <Scale className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Vəkil Profilinizi Tamamlayın</h1>
        <p className="text-muted-foreground">
          Platformada müştərilərin sizi tapa bilməsi üçün zəhmət olmasa peşəkar məlumatlarınızı daxil edin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Adınız</label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Məs: Əli" className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Soyadınız</label>
            <Input required value={surname} onChange={e => setSurname(e.target.value)} placeholder="Məs: Əliyev" className="h-12 rounded-xl" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Vəkillər Kollegiyası Lisenziya Nömrəsi</label>
            <Input required value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} placeholder="Məs: VK-12345" className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">İş Təcrübəsi (İl)</label>
            <Input required type="number" min="0" max="60" value={experienceYears} onChange={e => setExperienceYears(e.target.value)} placeholder="Məs: 10" className="h-12 rounded-xl" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Özünüz haqqında qısa məlumat (Bio)</label>
          <Textarea 
            required 
            value={bio} 
            onChange={e => setBio(e.target.value)} 
            placeholder="Təcrübəniz, yanaşmanız və peşəkar fəaliyyətiniz haqqında məlumat verin..." 
            className="min-h-[120px] rounded-xl resize-none"
          />
        </div>

        <div className="space-y-4">
          <label className="text-sm font-semibold">İxtisaslaşdığınız Hüquq Sahələri</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                      ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)] text-amber-600 font-semibold'
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

        <div className="pt-6 border-t border-slate-200 dark:border-white/10">
          <Button type="submit" disabled={loading} className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Profilimi Təsdiqlə"}
          </Button>
        </div>
      </form>
    </div>
  )
}
