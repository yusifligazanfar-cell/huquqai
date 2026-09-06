"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Save } from "lucide-react"

export default function LawyerProfileTab() {
  const { user, updateProfile } = useAuth()
  
  const [education, setEducation] = useState<any[]>(user?.education || [])
  const [workplaces, setWorkplaces] = useState<any[]>(user?.workplaces || [])
  const [faqs, setFaqs] = useState<any[]>(user?.faqs || [])
  const [unavailableDates, setUnavailableDates] = useState<string[]>(user?.unavailableDates || [])
  const [isUpdating, setIsUpdating] = useState(false)

  const handleSave = async () => {
    setIsUpdating(true)
    await updateProfile({
      education,
      workplaces,
      faqs,
      unavailableDates
    })
    setIsUpdating(false)
    alert("Peşəkar profiliniz uğurla yeniləndi!")
  }

  // --- Education ---
  const addEducation = () => setEducation([...education, { degree: "", institution: "", field: "" }])
  const updateEducation = (index: number, field: string, value: string) => {
    const newEd = [...education]
    newEd[index][field] = value
    setEducation(newEd)
  }
  const removeEducation = (index: number) => setEducation(education.filter((_, i) => i !== index))

  // --- Workplaces ---
  const addWorkplace = () => setWorkplaces([...workplaces, { name: "", address: "", hours: "" }])
  const updateWorkplace = (index: number, field: string, value: string) => {
    const newWp = [...workplaces]
    newWp[index][field] = value
    setWorkplaces(newWp)
  }
  const removeWorkplace = (index: number) => setWorkplaces(workplaces.filter((_, i) => i !== index))

  // --- FAQs ---
  const addFaq = () => setFaqs([...faqs, { question: "", answer: "" }])
  const updateFaq = (index: number, field: string, value: string) => {
    const newFq = [...faqs]
    newFq[index][field] = value
    setFaqs(newFq)
  }
  const removeFaq = (index: number) => setFaqs(faqs.filter((_, i) => i !== index))

  // --- Unavailable Dates ---
  const addDate = () => setUnavailableDates([...unavailableDates, ""])
  const updateDate = (index: number, value: string) => {
    const newDates = [...unavailableDates]
    newDates[index] = value
    setUnavailableDates(newDates)
  }
  const removeDate = (index: number) => setUnavailableDates(unavailableDates.filter((_, i) => i !== index))

  return (
    <>
      <CardHeader className="border-b border-slate-200 dark:border-white/5 pb-6 px-8 pt-8">
        <CardTitle className="text-2xl font-bold">Peşəkar Profil (Vəkil)</CardTitle>
        <CardDescription className="text-base mt-1">İctimai profilinizdə görünəcək detallı məlumatları burdan idarə edin.</CardDescription>
      </CardHeader>
      
      <CardContent className="p-8 flex flex-col gap-10">
        {/* Education */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-widest">Təhsil</h4>
            <Button size="sm" variant="outline" onClick={addEducation}><Plus className="w-4 h-4 mr-2" /> Əlavə et</Button>
          </div>
          {education.map((ed, idx) => (
            <div key={idx} className="flex flex-col gap-3 p-4 border rounded-xl border-slate-200 dark:border-white/10 relative">
              <Button size="icon" variant="ghost" className="absolute top-2 right-2 text-red-500" onClick={() => removeEducation(idx)}><Trash2 className="w-4 h-4" /></Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <Input placeholder="Dərəcə (məs: Bakalavr)" value={ed.degree || ''} onChange={e => updateEducation(idx, 'degree', e.target.value)} />
                <Input placeholder="Təhsil Müəssisəsi (məs: BDU)" value={ed.institution || ''} onChange={e => updateEducation(idx, 'institution', e.target.value)} />
                <Input placeholder="İxtisas (məs: Hüquqşünaslıq)" className="md:col-span-2" value={ed.field || ''} onChange={e => updateEducation(idx, 'field', e.target.value)} />
              </div>
            </div>
          ))}
          {education.length === 0 && <p className="text-muted-foreground text-sm">Hələ təhsil məlumatı əlavə edilməyib.</p>}
        </div>

        {/* Workplaces */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-widest">İş Yeri</h4>
            <Button size="sm" variant="outline" onClick={addWorkplace}><Plus className="w-4 h-4 mr-2" /> Əlavə et</Button>
          </div>
          {workplaces.map((wp, idx) => (
            <div key={idx} className="flex flex-col gap-3 p-4 border rounded-xl border-slate-200 dark:border-white/10 relative">
              <Button size="icon" variant="ghost" className="absolute top-2 right-2 text-red-500" onClick={() => removeWorkplace(idx)}><Trash2 className="w-4 h-4" /></Button>
              <div className="grid grid-cols-1 gap-4 mt-2">
                <Input placeholder="Müəssisə adı (Klinika / Ofis)" value={wp.name || ''} onChange={e => updateWorkplace(idx, 'name', e.target.value)} />
                <Input placeholder="Ünvan" value={wp.address || ''} onChange={e => updateWorkplace(idx, 'address', e.target.value)} />
                <Input placeholder="İş saatları (məs: B.e - C: 09:00 - 18:00)" value={wp.hours || ''} onChange={e => updateWorkplace(idx, 'hours', e.target.value)} />
              </div>
            </div>
          ))}
          {workplaces.length === 0 && <p className="text-muted-foreground text-sm">Hələ iş yeri əlavə edilməyib.</p>}
        </div>

        {/* FAQs */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-widest">Tez-tez verilən suallar (FAQ)</h4>
            <Button size="sm" variant="outline" onClick={addFaq}><Plus className="w-4 h-4 mr-2" /> Əlavə et</Button>
          </div>
          {faqs.map((faq, idx) => (
            <div key={idx} className="flex flex-col gap-3 p-4 border rounded-xl border-slate-200 dark:border-white/10 relative">
              <Button size="icon" variant="ghost" className="absolute top-2 right-2 text-red-500" onClick={() => removeFaq(idx)}><Trash2 className="w-4 h-4" /></Button>
              <div className="grid grid-cols-1 gap-4 mt-2">
                <Input placeholder="Sual" value={faq.question || ''} onChange={e => updateFaq(idx, 'question', e.target.value)} />
                <textarea 
                  placeholder="Cavab" 
                  value={faq.answer || ''} 
                  onChange={e => updateFaq(idx, 'answer', e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                />
              </div>
            </div>
          ))}
          {faqs.length === 0 && <p className="text-muted-foreground text-sm">Hələ sual əlavə edilməyib.</p>}
        </div>

        {/* Unavailable Dates */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
            <div>
              <h4 className="text-sm font-bold text-foreground uppercase tracking-widest">Müsait Olmayan Günlər</h4>
              <p className="text-xs text-muted-foreground">Bu günlərdə pasiyentlər randevu ala bilməyəcək.</p>
            </div>
            <Button size="sm" variant="outline" onClick={addDate}><Plus className="w-4 h-4 mr-2" /> Əlavə et</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {unavailableDates.map((date, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input type="date" value={date || ''} onChange={e => updateDate(idx, e.target.value)} className="flex-1" />
                <Button size="icon" variant="ghost" className="text-red-500 shrink-0" onClick={() => removeDate(idx)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
          {unavailableDates.length === 0 && <p className="text-muted-foreground text-sm">Müsait olmayan gün seçilməyib.</p>}
        </div>

        <div className="pt-4 flex items-center justify-end">
          <Button onClick={handleSave} disabled={isUpdating} size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-white px-8 h-12 rounded-xl text-base font-semibold shadow-[0_0_20px_rgba(234,88,12,0.3)] hover:shadow-[0_0_30px_rgba(234,88,12,0.5)] transition-all">
            <Save className="w-5 h-5" />
            {isUpdating ? "Saxlanılır..." : "Dəyişiklikləri Yadda Saxla"}
          </Button>
        </div>
      </CardContent>
    </>
  )
}
