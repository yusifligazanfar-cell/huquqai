"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Save, Calendar, Clock, CheckCircle2, X } from "lucide-react"

export default function LawyerProfileTab() {
  const { user, updateProfile } = useAuth()
  
  const [education, setEducation] = useState<any[]>(user?.education || [])
  const [workplaces, setWorkplaces] = useState<any[]>(user?.workplaces || [])
  const [faqs, setFaqs] = useState<any[]>(user?.faqs || [])
  const [unavailableDates, setUnavailableDates] = useState<string[]>(user?.unavailableDates || [])
  const [newOffDate, setNewOffDate] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [savedBanner, setSavedBanner] = useState(false)

  const handleSave = async () => {
    setIsUpdating(true)
    setSavedBanner(false)
    await updateProfile({
      education,
      workplaces,
      faqs,
      unavailableDates
    })
    setIsUpdating(false)
    setSavedBanner(true)
    setTimeout(() => setSavedBanner(false), 4000)
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
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-foreground">Randevu Qrafiki (Günlər və Saatlar)</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bağladığınız günlər və saatlar müştəri randevu təqvimində avtomatik deaktiv olur.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setUnavailableDates((prev) => [
                    ...prev.filter((x) => !x.startsWith("WEEKDAY:")),
                    "WEEKDAY:6",
                    "WEEKDAY:0",
                  ])
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-all"
              >
                Həftəiçi (1–5)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUnavailableDates((prev) => prev.filter((x) => !x.startsWith("WEEKDAY:")))
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-all"
              >
                Hər gün açıq
              </button>
            </div>
          </div>

          {/* 7-day grid */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Həftənin günləri
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {WEEKDAYS.map((wd) => {
                const isOff = unavailableDates.includes(`WEEKDAY:${wd.day}`)
                const shortTitle = wd.day === 0 ? "Bazar" : `${wd.day}-ci gün`
                const subLabel =
                  wd.day === 0
                    ? "İstirahət"
                    : wd.day === 6
                      ? "Şənbə"
                      : wd.label.match(/\(([^)]+)\)/)?.[1] || ""
                return (
                  <button
                    key={wd.day}
                    type="button"
                    onClick={() => toggleWeekdayOff(wd.day)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                      isOff
                        ? "bg-white/60 dark:bg-slate-900/50 border-red-200/80 dark:border-red-900/50 text-slate-500"
                        : "bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800/70 shadow-sm"
                    }`}
                  >
                    <div>
                      <p className={`text-xs font-extrabold ${isOff ? "text-slate-500" : "text-slate-900 dark:text-white"}`}>
                        {shortTitle}
                      </p>
                      <p className="text-[11px] text-slate-400">{subLabel}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                        isOff ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isOff ? "bg-red-500" : "bg-emerald-500"}`} />
                      {isOff ? "Bağlı" : "Açıq"}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time slots */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Randevu saatları
              </span>
              <button
                type="button"
                onClick={() =>
                  setUnavailableDates((prev) => prev.filter((x) => !x.startsWith("SLOT_OFF:")))
                }
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Bütün saatları aç
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
              {ALL_SLOTS.map((slot) => {
                const isOff = unavailableDates.includes(`SLOT_OFF:${slot}`)
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleSlotOff(slot)}
                    className={`h-10 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      isOff
                        ? "bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 line-through"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm"
                    }`}
                  >
                    <span>{slot}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Specific Unavailable Dates */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-bold text-foreground">Xüsusi Müsait Olmayan Tarixlər</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Məzuniyyət, məhkəmə iclası və ya bayram günlərini təqvimdən bağlayın.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={newOffDate}
                onChange={(e) => setNewOffDate(e.target.value)}
                className="h-10 w-44 rounded-xl bg-white dark:bg-slate-900"
              />
              <Button
                type="button"
                size="sm"
                className="h-10 px-4 rounded-xl font-bold"
                disabled={!newOffDate}
                onClick={() => {
                  if (!newOffDate) return
                  if (!unavailableDates.includes(newOffDate)) {
                    setUnavailableDates((prev) => [...prev, newOffDate])
                  }
                  setNewOffDate("")
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Bağla
              </Button>
            </div>
          </div>

          {specificDates.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {specificDates.map((date, idx) => (
                <div
                  key={`${date}-${idx}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 text-xs font-bold text-red-600 dark:text-red-300 shadow-sm"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{date || "Tarix seçilməyib"}</span>
                  <button
                    type="button"
                    onClick={() => removeDate(idx)}
                    aria-label="Tarixi sil"
                    className="p-0.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/60"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Xüsusi müsait olmayan tarix seçilməyib.
            </p>
          )}
        </div>

        {savedBanner && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Peşəkar profiliniz və randevu qrafikiniz yadda saxlanıldı!</span>
          </div>
        )}

        <div className="pt-2 flex items-center justify-end">
          <Button
            onClick={handleSave}
            disabled={isUpdating}
            size="lg"
            className="gap-2 px-8 h-12 rounded-xl text-sm sm:text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all"
          >
            <Save className="w-4 h-4" />
            {isUpdating ? "Saxlanılır..." : "Dəyişiklikləri Yadda Saxla"}
          </Button>
        </div>
      </CardContent>
    </>
  )
}
