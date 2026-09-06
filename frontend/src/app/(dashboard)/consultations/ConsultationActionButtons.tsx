"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
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
  const supabase = createClient()
  const router = useRouter()

  if (status !== 'Gözləyir' && status !== 'pending') return null

  const handleUpdateStatus = async (e: React.MouseEvent, newStatus: string) => {
    e.preventDefault()
    e.stopPropagation()

    setIsUpdating(true)
    setFeedback(null)

    // 1. Update status in DB
    const { error } = await supabase
      .from("consultations")
      .update({ status: newStatus })
      .eq("id", consultationId)

    if (error) {
      setFeedback("Xəta baş verdi!")
      setIsUpdating(false)
      return
    }

    // 2. If accepted → send email notification to client
    if (newStatus === "Qəbul edildi") {
      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consultationId }),
        })
        setFeedback("Qəbul edildi! Müştəriyə bildiriş göndərildi ✓")
      } catch {
        setFeedback("Qəbul edildi! (Bildiriş göndərilmədi)")
      }
    } else {
      setFeedback("İmtina edildi.")
    }

    setIsUpdating(false)
    setTimeout(() => {
      setFeedback(null)
      router.refresh()
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
