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
      
      // Fetch profile from Supabase
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        
      if (profileData) {
        setUser({
          name: profileData.name || meta?.full_name || meta?.name || session.user.email?.split('@')[0] || 'İstifadəçi',
          email: session.user.email || '',
          avatar: profileData.avatar_url || meta?.avatar_url || meta?.picture || '',
          coverImage: profileData.cover_url || '',
          bio: profileData.bio || '',
          role: profileData.role || 'client',
          specialties: profileData.specialties || [],
          hourlyRate: profileData.hourly_rate || 0,
          isVerified: profileData.is_verified || false,
          surname: profileData.surname || '',
          licenseNumber: profileData.license_number || '',
          experienceYears: profileData.experience_years || 0,
          certificates: profileData.certificates || [],
          education: profileData.education || [],
          workplaces: profileData.workplaces || [],
          faqs: profileData.faqs || [],
          unavailableDates: profileData.unavailable_dates || []
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

