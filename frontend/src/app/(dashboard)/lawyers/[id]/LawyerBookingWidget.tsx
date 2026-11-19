"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2, Calendar, Clock, CheckCircle2, Lock } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"

const generateDays = () => {
  const days = []
  for (let i = 0; i < 14; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    days.push(d)
  }
  return days
}

const timeSlots = [
  "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00"
]

const azDayNames = ["B.e", "Ç.a", "Ç", "C.a", "C", "Ş", "B"]
const azMonths = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"]

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function LawyerBookingWidget({
  lawyerId,
  unavailableDates = []
}: {
  lawyerId: string
  unavailableDates?: string[]
}) {
  const days = generateDays()
  const isDayUnavailable = (d: Date) =>
    unavailableDates.includes(toDateKey(d)) ||
    unavailableDates.includes(`WEEKDAY:${d.getDay()}`)

  const firstAvailableDay = days.find((d) => !isDayUnavailable(d)) || days[0]
  const [selectedDate, setSelectedDate] = useState<Date>(firstAvailableDay)
  const activeTimeSlots = timeSlots.filter(
    (t) =>
      !unavailableDates.includes(`SLOT_OFF:${t}`) &&
      !unavailableDates.includes(`WEEKDAY_SLOT_OFF:${selectedDate.getDay()}:${t}`)
  )
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const { isLoggedIn, isLoaded, supabaseUser } = useAuth()
  const isAuthenticated = isLoaded ? isLoggedIn : null

  // Booked slots: { "2026-07-29": ["10:00", "13:00"], ... }
  const [bookedSlots, setBookedSlots] = useState<Record<string, string[]>>({})
  const [loadingSlots, setLoadingSlots] = useState(true)

  const router = useRouter()

  // Fetch booked time slots for this lawyer
  useEffect(() => {
    const fetchBooked = async () => {
      setLoadingSlots(true)
      try {
        const res = await fetch(`/api/app/consultations?lawyerId=${encodeURIComponent(lawyerId)}`, {
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        const data = json?.consultations || []
        const map: Record<string, string[]> = {}
        data.forEach((c: any) => {
          let date = c.preferred_date
          let time = c.preferred_time

          if ((!date || !time) && c.problem_description) {
            const timeMatch = c.problem_description.match(/Saat:\s*(\d{2}:\d{2})/)
            if (timeMatch) time = timeMatch[1]
          }

          if (date && time) {
            if (!map[date]) map[date] = []
            if (!map[date].includes(time)) map[date].push(time)
          }
        })
        setBookedSlots(map)
      } catch {}
      setLoadingSlots(false)
    }

    fetchBooked()
  }, [lawyerId])

  const selectedDateKey = toDateKey(selectedDate)
  const bookedTimesForDay = bookedSlots[selectedDateKey] || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description.trim()) {
      alert("Zəhmət olmasa probleminizi qısa təsvir edin.")
      return
    }
    if (!selectedTime) {
      alert("Zəhmət olmasa saat seçin.")
      return
    }

    setIsSubmitting(true)

    if (!isLoggedIn || !supabaseUser) {
      alert("Konsultasiya almaq üçün sistemə daxil olmalısınız.")
      window.location.href = `/login?next=/lawyers/${lawyerId}`
      return
    }

    const formattedDate = `${selectedDate.getDate()} ${azMonths[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
    const finalDescription = `Təklif edilən vaxt: ${formattedDate} - Saat: ${selectedTime}\n\nProblemin təsviri:\n${description}`

    const d1Res = await fetch('/api/app/consultations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: supabaseUser.id,
        lawyer_id: lawyerId,
        problem_description: finalDescription,
        preferred_date: selectedDateKey,
        preferred_time: selectedTime,
      }),
    })
    const d1Json = await d1Res.json().catch(() => ({}))

    setIsSubmitting(false)

    if (!d1Res.ok || !d1Json?.success) {
      alert("Xəta baş verdi: " + (d1Json?.error || "Baza xətası"))
    } else {
      setBookedSlots(prev => ({
        ...prev,
        [selectedDateKey]: [...(prev[selectedDateKey] || []), selectedTime!]
      }))

      if (d1Json?.consultation?.id) {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consultationId: d1Json.consultation.id })
        }).catch(() => {})
      }

      setSuccess(true)
      setSelectedTime(null)
      setDescription("")
      setTimeout(() => {
        router.push("/consultations")
      }, 2000)
    }
  }

  return (
    <div id="booking-widget" className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden sticky top-24">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Randevu Al
        </h3>
      </div>

      <div className="p-4">
        {isAuthenticated === false ? (
          <div className="py-6 px-3 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-extrabold text-slate-950 dark:text-white">
                Randevu almaq üçün qeydiyyatdan keçin
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Vəkil və ya hüquqşünasdan randevu almaq üçün hesabınıza daxil olmalısınız.
              </p>
            </div>
            <Link href={`/login?next=/lawyers/${lawyerId}`} className="block">
              <Button className="w-full h-11 rounded-xl font-bold">
                Daxil Ol / Qeydiyyatdan Keç
              </Button>
            </Link>
          </div>
        ) : (
        <>
        {/* Month Name */}
        <div className="text-center font-bold text-slate-800 dark:text-white mb-4">
          {azMonths[selectedDate.getMonth()]} {selectedDate.getFullYear()}
        </div>

        {/* Horizontal Days Scroll */}
        <div className="flex overflow-x-auto pb-4 gap-2 snap-x hide-scrollbar">
          {days.map((d, i) => {
            const isSelected = d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth()
            const isUnavailable = isDayUnavailable(d)

            return (
              <button
                key={i}
                onClick={() => !isUnavailable && setSelectedDate(d)}
                disabled={isUnavailable}
                className={`snap-center shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-xl border transition-all ${
                  isUnavailable
                    ? 'border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
                    : isSelected
                      ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-card text-slate-600 dark:text-slate-300 hover:border-primary/50'
                }`}
              >
                <span className="text-[10px] font-bold uppercase opacity-80">
                  {azDayNames[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                </span>
                <span className="text-lg font-black">{d.getDate()}</span>
              </button>
            )
          })}
        </div>

        {/* Selected Date Header */}
        <div className="text-sm font-semibold text-center text-slate-600 dark:text-slate-400 mt-2 mb-4 border-t border-slate-200 dark:border-white/10 pt-4">
          {azDayNames[selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1]}, {selectedDate.getDate()} {azMonths[selectedDate.getMonth()]} {selectedDate.getFullYear()}
        </div>

        {/* Time Slots Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {loadingSlots ? (
            <div className="col-span-3 flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary/40" />
            </div>
          ) : activeTimeSlots.length === 0 ? (
            <div className="col-span-3 text-center text-xs text-muted-foreground py-3">
              Bu gün üçün aktiv randevu saatı yoxdur.
            </div>
          ) : (
            activeTimeSlots.map(time => {
              const isBooked = bookedTimesForDay.includes(time)
              const isSelected = selectedTime === time

              return (
                <button
                  key={time}
                  onClick={() => !isBooked && setSelectedTime(isSelected ? null : time)}
                  disabled={isBooked}
                  className={`py-2 px-1 text-sm font-bold rounded-lg border transition-all relative ${
                    isBooked
                      ? 'border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 text-red-300 dark:text-red-800 cursor-not-allowed'
                      : isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-card text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary'
                  }`}
                >
                  {isBooked ? (
                    <span className="flex flex-col items-center leading-tight">
                      <span className="text-xs">{time}</span>
                      <span className="text-[9px] font-bold text-red-400 dark:text-red-600 uppercase">Dolu</span>
                    </span>
                  ) : time}
                </button>
              )
            })
          )}
        </div>

        {/* Form if time selected */}
        {selectedTime && !success && (
          <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="space-y-3">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Problemin təsviri
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Məsələn: Əmək mübahisəsi barədə..."
                className="w-full min-h-[100px] p-3 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 focus:ring-2 focus:ring-primary/50 outline-none resize-none text-foreground"
              />
              <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl font-bold transition-all">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
                Randevu Al
              </Button>
            </div>
          </form>
        )}

        {/* Success */}
        {success && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 text-center animate-in zoom-in duration-300">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 mx-auto flex items-center justify-center mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-foreground">Tələbiniz göndərildi!</h4>
            <p className="text-xs text-muted-foreground mt-1">Konsultasiyalarım səhifəsinə yönləndirilirsiniz...</p>
          </div>
        )}
        </>
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-50 dark:bg-white/5 p-4 text-xs text-slate-500 dark:text-slate-400 text-center border-t border-slate-200 dark:border-white/10">
        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Niyə huquqai.az?</p>
        <p>Lisenziyalı və təsdiqlənmiş vəkillər</p>
        <p>Onlayn və ya ofis görüşləri</p>
      </div>
    </div>
  )
}
