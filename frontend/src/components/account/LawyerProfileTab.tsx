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

  // --- Unavailable Dates, Weekdays & Hours ---
  const WEEKDAYS = [
    { day: 1, label: "1-ci gün (B.e)" },
    { day: 2, label: "2-ci gün (Ç.a)" },
    { day: 3, label: "3-cü gün (Çər)" },
    { day: 4, label: "4-cü gün (C.a)" },
    { day: 5, label: "5-ci gün (Cüm)" },
    { day: 6, label: "6-cı gün (Şənbə)" },
    { day: 0, label: "Bazar" },
  ]
  const ALL_SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]

  const toggleWeekdayOff = (day: number) => {
    const token = `WEEKDAY:${day}`
    setUnavailableDates((prev) =>
      prev.includes(token) ? prev.filter((x) => x !== token) : [...prev, token]
    )
  }

  const toggleSlotOff = (slot: string) => {
    const token = `SLOT_OFF:${slot}`
    setUnavailableDates((prev) =>
      prev.includes(token) ? prev.filter((x) => x !== token) : [...prev, token]
    )
  }

  const specificDates = unavailableDates.filter((d) => !d.startsWith("WEEKDAY:") && !d.startsWith("SLOT_OFF:"))
  const addDate = () => setUnavailableDates([...unavailableDates, ""])
  const updateDate = (specificIndex: number, value: string) => {
    let seen = -1
    setUnavailableDates(
      unavailableDates.map((item) => {
        if (!item.startsWith("WEEKDAY:") && !item.startsWith("SLOT_OFF:")) {
          seen++
          if (seen === specificIndex) return value
        }
        return item
      })
    )
  }
  const removeDate = (specificIndex: number) => {
    let seen = -1
    setUnavailableDates(
      unavailableDates.filter((item) => {
        if (!item.startsWith("WEEKDAY:") && !item.startsWith("SLOT_OFF:")) {
          seen++
          return seen !== specificIndex
        }
        return true
      })
    )
  }

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

        {/* Weekly Off-Days & Available Hours */}
        <div className="flex flex-col gap-5">
          <div className="border-b border-slate-200 dark:border-white/10 pb-2">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-widest">Randevu Qrafiki (Həftəlik Günlər və Saatlar)</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Müsait olmadığınız həftə günlərini (məs: 6-cı gün) və saatları seçin — saytda avtomatik bağlanacaq.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-muted-foreground">Müsait olmadığınız həftə günləri:</span>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((wd) => {
                const isOff = unavailableDates.includes(`WEEKDAY:${wd.day}`)
                return (
                  <button
                    key={wd.day}
                    type="button"
                    onClick={() => toggleWeekdayOff(wd.day)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      isOff
                        ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300"
                        : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {wd.label} {isOff ? "• Bağlı" : "• Açıq"}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-muted-foreground">Aktiv randevu saatları (bağlamaq üçün klikləyin):</span>
            <div className="flex flex-wrap gap-2">
              {ALL_SLOTS.map((slot) => {
                const isOff = unavailableDates.includes(`SLOT_OFF:${slot}`)
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleSlotOff(slot)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      isOff
                        ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 line-through"
                        : "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    }`}
                  >
                    {slot}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Specific Unavailable Dates */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
            <div>
              <h4 className="text-sm font-bold text-foreground uppercase tracking-widest">Xüsusi Müsait Olmayan Tarixlər</h4>
              <p className="text-xs text-muted-foreground">Konkret tarixlərdə randevu qəbulunu bağlayın.</p>
            </div>
            <Button size="sm" variant="outline" onClick={addDate}><Plus className="w-4 h-4 mr-2" /> Əlavə et</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {specificDates.map((date, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input type="date" value={date || ''} onChange={e => updateDate(idx, e.target.value)} className="flex-1" />
                <Button size="icon" variant="ghost" className="text-red-500 shrink-0" onClick={() => removeDate(idx)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
          {specificDates.length === 0 && <p className="text-muted-foreground text-sm">Xüsusi müsait olmayan tarix seçilməyib.</p>}
        </div>

        <div className="pt-4 flex items-center justify-end">
          <Button onClick={handleSave} disabled={isUpdating} size="lg" className="gap-2 px-8 h-12 rounded-xl text-base font-semibold transition-all">
            <Save className="w-5 h-5" />
            {isUpdating ? "Saxlanılır..." : "Dəyişiklikləri Yadda Saxla"}
          </Button>
        </div>
      </CardContent>
    </>
  )
}
