"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter, usePathname } from "next/navigation"

export function LawyerOnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (isLoggedIn && user?.role === 'lawyer') {
      // Check if essential lawyer fields are missing
      const isMissingInfo = !user.licenseNumber || !user.experienceYears || !user.surname
      
      // If missing info and not already on onboarding page
      if (isMissingInfo && pathname !== '/lawyer-onboarding') {
        setIsRedirecting(true)
        router.push('/lawyer-onboarding')
      } else {
        setIsRedirecting(false)
      }
    }
  }, [user, isLoggedIn, pathname, router])

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <>{children}</>
}
