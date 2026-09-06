import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Check if next URL contains role=lawyer
      if (next.includes('role=lawyer')) {
        await supabase
          .from('profiles')
          .update({ role: 'lawyer' })
          .eq('id', data.user.id)
      }
      
      // Clean up the next URL from parameters if needed, but we can just redirect
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Uğursuz olarsa login səhifəsinə geri göndər
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
}
