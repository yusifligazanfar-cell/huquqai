"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User, Session } from '@supabase/supabase-js'

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
  supabaseUser: User | null
  logout: () => Promise<void>
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then((res: any) => {
      handleSession(res?.data?.session || null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      handleSession(session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSession = async (session: Session | null) => {
    if (session?.user) {
      setSupabaseUser(session.user)
      setIsLoggedIn(true)
      
      // If user profile is already populated for this same user, avoid re-fetching
      if (user && supabaseUser?.id === session.user.id) {
        setIsLoaded(true)
        return
      }
      
      const meta = session.user.user_metadata

      // Sync any pending lawyer/jurist signup form saved before OAuth/OTP redirect
      let pendingRaw: string | null = null
      try {
        pendingRaw = localStorage.getItem('pendingLawyerOnboarding') || sessionStorage.getItem('pendingLawyerOnboarding')
      } catch {}

      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw)
          await supabase.from('profiles').upsert({
            id: session.user.id,
            email: session.user.email || '',
            role: 'lawyer',
            name: pending.name || meta?.full_name || meta?.name || '',
            surname: pending.surname || '',
            license_number: pending.licenseNumber || '',
            experience_years: Number(pending.experienceYears) || 0,
            bio: pending.bio || '',
            specialties: Array.isArray(pending.specialties) ? pending.specialties : [],
            workplaces: Array.isArray(pending.workplaces) ? pending.workplaces : [],
            education: Array.isArray(pending.education) ? pending.education : [],
            hourly_rate: Number(pending.hourlyRate) || 0,
            is_verified: false,
          })
          localStorage.removeItem('pendingLawyerOnboarding')
          sessionStorage.removeItem('pendingLawyerOnboarding')
        } catch (syncErr) {
          console.error('Failed to sync pending lawyer onboarding:', syncErr)
        }
      }

      // Fetch profile from Supabase
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      // Sync & read authoritative verification/schedule state from Cloudflare D1
      let d1Profile: any = null
      try {
        const syncPayload = profileData
          ? {
              ...profileData,
              email: session.user.email || profileData.email || '',
              touch_login: true,
            }
          : {
              id: session.user.id,
              email: session.user.email || '',
              name: meta?.full_name || meta?.name || session.user.email?.split('@')[0] || 'İstifadəçi',
              avatar_url: meta?.avatar_url || meta?.picture || '',
              role: 'client',
              touch_login: true,
            }
        const d1Res = await fetch('/api/app/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(syncPayload),
        })
        if (d1Res.ok) {
          const d1Json = await d1Res.json()
          d1Profile = d1Json?.profile || null
        }
      } catch (d1Err) {
        console.warn('Cloudflare D1 profile sync skipped:', d1Err)
      }

      const merged = d1Profile || profileData
      if (merged) {
        setUser({
          name: merged.name || meta?.full_name || meta?.name || session.user.email?.split('@')[0] || 'İstifadəçi',
          email: session.user.email || '',
          avatar: merged.avatar_url || meta?.avatar_url || meta?.picture || '',
          coverImage: merged.cover_url || '',
          bio: merged.bio || '',
          role: merged.role || 'client',
          specialties: merged.specialties || [],
          hourlyRate: merged.hourly_rate || 0,
          isVerified: Boolean(merged.is_verified),
          surname: merged.surname || '',
          licenseNumber: merged.license_number || '',
          experienceYears: merged.experience_years || 0,
          certificates: merged.certificates || [],
          education: merged.education || [],
          workplaces: merged.workplaces || [],
          faqs: merged.faqs || [],
          unavailableDates: merged.unavailable_dates || []
        })
      } else {
        // Fallback if profile row is not yet created by trigger
        const defaultName = meta?.full_name || meta?.name || session.user.email?.split('@')[0] || 'İstifadəçi';
        const defaultAvatar = meta?.avatar_url || meta?.picture || '';
        
        // Try to create the missing profile row to fix foreign key issues
        try {
          await supabase.from('profiles').insert({
            id: session.user.id,
            name: defaultName,
            avatar_url: defaultAvatar,
            role: 'client'
          });
        } catch (insertError) {
          console.error("Failed to insert missing profile:", insertError);
        }

        setUser({
          name: defaultName,
          email: session.user.email || '',
          avatar: defaultAvatar,
          role: 'client'
        })
      }
    } else {
      setSupabaseUser(null)
      setUser(null)
      setIsLoggedIn(false)
    }
    setIsLoaded(true)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setSupabaseUser(null)
    setUser(null)
    setIsLoggedIn(false)
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !supabaseUser) return
    const updatedUser = { ...user, ...updates }
    setUser(updatedUser)
    
    // Update DB
    const dbUpdates = {
      name: updates.name,
      avatar_url: updates.avatar,
      cover_url: updates.coverImage,
      bio: updates.bio,
      role: updates.role,
      specialties: updates.specialties,
      hourly_rate: updates.hourlyRate,
      surname: updates.surname,
      license_number: updates.licenseNumber,
      experience_years: updates.experienceYears,
      certificates: updates.certificates,
      education: updates.education,
      workplaces: updates.workplaces,
      faqs: updates.faqs,
      unavailable_dates: updates.unavailableDates,
      updated_at: new Date().toISOString()
    }
    
    // Remove undefined fields
    Object.keys(dbUpdates).forEach(key => (dbUpdates as any)[key] === undefined && delete (dbUpdates as any)[key])
    
    await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', supabaseUser.id)

    try {
      await fetch('/api/app/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          ...dbUpdates,
        }),
      })
    } catch (d1Err) {
      console.warn('Cloudflare D1 profile update skipped:', d1Err)
    }
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoaded, user, supabaseUser, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

