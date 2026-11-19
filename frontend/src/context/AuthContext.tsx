"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"

export interface AuthUserSummary {
  id: string
  email: string
  user_metadata?: Record<string, any>
}

export interface UserProfile {
  name: string
  email: string
  avatar?: string
  coverImage?: string
  bio?: string
  role?: string
  specialties?: string[]
  hourlyRate?: number
  isVerified?: boolean
  surname?: string
  licenseNumber?: string
  experienceYears?: number
  certificates?: any[]
  education?: any[]
  workplaces?: any[]
  faqs?: any[]
  unavailableDates?: string[]
}

interface AuthContextType {
  isLoggedIn: boolean
  isLoaded: boolean
  user: UserProfile | null
  supabaseUser: AuthUserSummary | null
  logout: () => Promise<void>
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function mapDbProfileToUserProfile(dbProfile: Record<string, any>): UserProfile {
  return {
    name: dbProfile.name || "İstifadəçi",
    surname: dbProfile.surname || "",
    email: dbProfile.email || "",
    avatar: dbProfile.avatar_url || "",
    coverImage: dbProfile.cover_url || "",
    bio: dbProfile.bio || "",
    role: dbProfile.role || "client",
    specialties: Array.isArray(dbProfile.specialties) ? dbProfile.specialties : [],
    hourlyRate: Number(dbProfile.hourly_rate || 0),
    isVerified: Boolean(dbProfile.is_verified),
    licenseNumber: dbProfile.license_number || "",
    experienceYears: Number(dbProfile.experience_years || 0),
    certificates: Array.isArray(dbProfile.certificates) ? dbProfile.certificates : [],
    education: Array.isArray(dbProfile.education) ? dbProfile.education : [],
    workplaces: Array.isArray(dbProfile.workplaces) ? dbProfile.workplaces : [],
    faqs: Array.isArray(dbProfile.faqs) ? dbProfile.faqs : [],
    unavailableDates: Array.isArray(dbProfile.unavailable_dates) ? dbProfile.unavailable_dates : [],
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<AuthUserSummary | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      const dbUser = data?.user
      if (!dbUser?.id) {
        setSupabaseUser(null)
        setIsLoggedIn(false)
        setUser(null)
        setIsLoaded(true)
        return
      }

      setSupabaseUser({
        id: dbUser.id,
        email: dbUser.email || "",
        user_metadata: {
          role: dbUser.role || "client",
          name: dbUser.name || "",
          surname: dbUser.surname || "",
          full_name: `${dbUser.name || ""} ${dbUser.surname || ""}`.trim(),
        },
      })
      setIsLoggedIn(true)
      setUser(mapDbProfileToUserProfile(dbUser))
    } catch {
      setSupabaseUser(null)
      setIsLoggedIn(false)
      setUser(null)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  const logout = async () => {
    try {
      await fetch("/api/auth/session", { method: "DELETE" })
      localStorage.removeItem("pendingLawyerOnboarding")
      sessionStorage.removeItem("pendingLawyerOnboarding")
    } catch {}
    setUser(null)
    setSupabaseUser(null)
    setIsLoggedIn(false)
  }

  const updateProfile = async (newProfile: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...newProfile } : null))

    if (supabaseUser?.id) {
      const cfPayload: Record<string, any> = {
        id: supabaseUser.id,
        email: supabaseUser.email,
      }
      if (newProfile.name !== undefined) cfPayload.name = newProfile.name
      if (newProfile.surname !== undefined) cfPayload.surname = newProfile.surname
      if (newProfile.bio !== undefined) cfPayload.bio = newProfile.bio
      if (newProfile.avatar !== undefined) cfPayload.avatar_url = newProfile.avatar
      if (newProfile.coverImage !== undefined) cfPayload.cover_url = newProfile.coverImage
      if (newProfile.role !== undefined) cfPayload.role = newProfile.role
      if (newProfile.specialties !== undefined) cfPayload.specialties = newProfile.specialties
      if (newProfile.hourlyRate !== undefined) cfPayload.hourly_rate = newProfile.hourlyRate
      if (newProfile.licenseNumber !== undefined) cfPayload.license_number = newProfile.licenseNumber
      if (newProfile.experienceYears !== undefined) cfPayload.experience_years = newProfile.experienceYears
      if (newProfile.education !== undefined) cfPayload.education = newProfile.education
      if (newProfile.workplaces !== undefined) cfPayload.workplaces = newProfile.workplaces
      if (newProfile.faqs !== undefined) cfPayload.faqs = newProfile.faqs
      if (newProfile.unavailableDates !== undefined) cfPayload.unavailable_dates = newProfile.unavailableDates

      await fetch("/api/app/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfPayload),
      })
    }
  }

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, isLoaded, user, supabaseUser, logout, updateProfile, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
