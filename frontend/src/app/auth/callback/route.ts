import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const meta = data.user.user_metadata || {}
      const isLawyerSignup = rawNext.includes('role=lawyer') || meta.role === 'lawyer'

      if (isLawyerSignup) {
        const profileUpdate: Record<string, any> = {
          role: 'lawyer',
        }
        if (meta.name) profileUpdate.name = meta.name
        if (meta.surname) profileUpdate.surname = meta.surname
        if (meta.license_number) profileUpdate.license_number = meta.license_number
        if (typeof meta.experience_years === 'number') profileUpdate.experience_years = meta.experience_years
        if (meta.bio) profileUpdate.bio = meta.bio
        if (Array.isArray(meta.specialties)) profileUpdate.specialties = meta.specialties

        await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('id', data.user.id)
      }

      // Strip ?role=lawyer from redirect URL
      const cleanNext = rawNext.replace(/\?role=lawyer$/, '').replace(/&role=lawyer$/, '') || '/account'
      return NextResponse.redirect(`${origin}${cleanNext}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
}
