import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

// In-memory fallback in case table hasn't been migrated yet
let memoryFeedbacks: any[] = [
  {
    id: "fb-initial-1",
    user_id: null,
    name: "Rəşad Məmmədli",
    email: "reshad.m@gmail.com",
    category: "suggestion",
    rating: 5,
    sentiment: "excellent",
    subject: "Mobil tətbiq versiyası",
    message: "HÜQUQ AI sistemi çox faydalıdır! Xüsusilə ərizə generatoru işimi çox asanlaşdırdı. Gələcəkdə iOS və Android üçün mobil tətbiq çıxarmağınızı çox arzulayırıq.",
    status: "reviewed",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: "fb-initial-2",
    user_id: null,
    name: "Aysel Qasımova",
    email: "aysel.qasimova@mail.ru",
    category: "general",
    rating: 5,
    sentiment: "excellent",
    subject: "Süni zəka vəkili çox dəqiq cavab verir",
    message: "Miras hüququ ilə bağlı sualıma çox detallı və Mülki Məcəllənin maddələrinə istinad edərək aydın cavab verdi. Çox təşəkkür edirəm!",
    status: "resolved",
    created_at: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    id: "fb-initial-3",
    user_id: null,
    name: "Elmir Hüseynov",
    email: "elmir.huseyn@outlook.com",
    category: "bug",
    rating: 4,
    sentiment: "good",
    subject: "Axtarış filtrləri",
    message: "Məhkəmə qərarları axtarışında tarix filtri əlavə olunsa daha rahat olar. Ümumilikdə platforma möhtəşəmdir.",
    status: "in_progress",
    created_at: new Date(Date.now() - 86400000 * 1).toISOString()
  }
]

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, rating, category, subject, message, sentiment, user_id, is_anonymous } = body

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "Rəy mətni daxil edilməlidir" }, { status: 400 })
    }

    const newFeedback = {
      id: `fb-${crypto.randomUUID()}`,
      user_id: user_id || null,
      name: is_anonymous ? "Anonim İstifadəçi" : (name?.trim() || "Anonim İstifadəçi"),
      email: is_anonymous ? "" : (email?.trim() || ""),
      category: category || "general",
      rating: Number(rating) || 5,
      sentiment: sentiment || "excellent",
      subject: subject?.trim() || "Rəy və Təklif",
      message: message.trim(),
      status: "new",
      is_anonymous: Boolean(is_anonymous),
      created_at: new Date().toISOString()
    }

    // Try inserting into Supabase
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const { data, error } = await supabase
          .from('feedbacks')
          .insert([newFeedback])
          .select()

        if (!error && data && data.length > 0) {
          return NextResponse.json({ success: true, feedback: data[0] })
        }
      } catch (dbErr) {
        console.warn("Supabase feedback insert error, falling back to memory:", dbErr)
      }
    }

    // Add to memory storage
    memoryFeedbacks.unshift(newFeedback)
    return NextResponse.json({ success: true, feedback: newFeedback })
  } catch (err: any) {
    console.error("Feedback submission error:", err)
    return NextResponse.json({ error: err.message || "Xəta baş verdi" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const { data, error } = await supabase
          .from('feedbacks')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data && data.length > 0) {
          return NextResponse.json({ feedbacks: data })
        }
      } catch (dbErr) {
        console.warn("Supabase fetch error, using fallback feedbacks:", dbErr)
      }
    }

    return NextResponse.json({ feedbacks: memoryFeedbacks })
  } catch (err: any) {
    return NextResponse.json({ feedbacks: memoryFeedbacks })
  }
}
