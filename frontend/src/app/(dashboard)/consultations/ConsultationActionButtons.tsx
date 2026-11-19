"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ConsultationActionButtons({
  consultationId,
  status,
}: {
  consultationId: string
  status: string
}) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const router = useRouter()

  if (status !== 'Gözləyir' && status !== 'pending') return null

  const handleUpdateStatus = async (e: React.MouseEvent, newStatus: string) => {
    e.preventDefault()
    e.stopPropagation()

    setIsUpdating(true)
    setFeedback(null)

    const res = await fetch("/api/app/consultations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: consultationId, status: newStatus }),
    })

    if (!res.ok) {
      setFeedback("Xəta baş verdi!")
      setIsUpdating(false)
      return
    }

    // 2. Send email notification to client for both Accept & Reject
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationId,
          event: newStatus === "İmtina edildi" ? "rejected" : "accepted",
        }),
      })
      setFeedback(
        newStatus === "Qəbul edildi"
          ? "Qəbul edildi! Müştəriyə bildiriş göndərildi ✓"
          : "İmtina edildi! Müştəriyə bildiriş göndərildi ✓"
      )
    } catch {
      setFeedback(newStatus === "Qəbul edildi" ? "Qəbul edildi!" : "İmtina edildi!")
    }

    try {
      window.dispatchEvent(new Event("notificationsUpdated"))
    } catch {}

    setIsUpdating(false)
    router.refresh()
    setTimeout(() => {
      setFeedback(null)
    }, 2500)
  }

  return (
    <div className="flex flex-col items-end gap-1.5 mt-3 sm:mt-0">
      <div className="flex items-center gap-2">
        <Button
          onClick={(e) => handleUpdateStatus(e, "İmtina edildi")}
          variant="destructive"
          size="sm"
          disabled={isUpdating}
          className="rounded-xl h-8 px-3 text-xs"
        >
          {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
          İmtina Et
        </Button>
        <Button
          onClick={(e) => handleUpdateStatus(e, "Qəbul edildi")}
          size="sm"
          disabled={isUpdating}
          className="rounded-xl h-8 px-3 text-xs bg-green-600 hover:bg-green-700 text-white"
        >
          {isUpdating ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <CheckCircle2 className="w-3 h-3 mr-1" />
          )}
          Qəbul Et
        </Button>
      </div>
      {feedback && (
        <span className="text-[11px] text-green-500 font-medium animate-in fade-in slide-in-from-bottom-1">
          {feedback}
        </span>
      )}
    </div>
  )
}
