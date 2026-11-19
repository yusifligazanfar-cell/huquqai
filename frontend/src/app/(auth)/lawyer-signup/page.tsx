"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function LawyerSignupRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("mode")
    const targetMode = mode === "login" ? "login" : "signup"
    router.replace(`/login?role=lawyer&mode=${targetMode}`)
  }, [router])

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
        <span>Yönləndirilir...</span>
      </div>
    </div>
  )
}
