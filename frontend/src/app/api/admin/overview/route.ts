import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
const EXPECTED_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123"

function isAuthorized(req: Request) {
  const pass = req.headers.get("x-admin-password") || ""
  return pass === EXPECTED_ADMIN_PASSWORD
}

function getAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "İcazəsiz giriş" }, { status: 401 })
  }

  const supabase = getAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase konfiqurasiyası tapılmadı" }, { status: 500 })
  }

  try {
    const [
      profilesRes,
      consultationsRes,
      conversationsRes,
      messagesRes,
      postsRes,
      feedbacksRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("consultations").select("id, client_id, lawyer_id, status, created_at"),
      supabase.from("conversations").select("id, user_id, created_at"),
      supabase.from("messages").select("id, conversation_id, role, created_at"),
      supabase.from("community_posts").select("id, user_id, created_at"),
      supabase.from("feedbacks").select("*").order("created_at", { ascending: false }),
    ])

    // Try fetching auth.users (requires service role key)
    let authUsersMap = new Map<string, { last_sign_in_at: string | null; email_confirmed_at: string | null; created_at: string | null; email: string | null }>()
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { data: authData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
        for (const u of authData?.users || []) {
          authUsersMap.set(u.id, {
            last_sign_in_at: u.last_sign_in_at || null,
            email_confirmed_at: u.email_confirmed_at || null,
            created_at: u.created_at || null,
            email: u.email || null,
          })
        }
      } catch (e) {
        console.warn("auth.admin.listUsers skipped:", e)
      }
    }

    const profiles = profilesRes.data || []
    const consultations = consultationsRes.data || []
    const conversations = conversationsRes.data || []
    const messages = messagesRes.data || []
    const posts = postsRes.data || []
    const feedbacks = feedbacksRes.data || []

    // Map per-user counts
    const consByUser = new Map<string, number>()
    for (const c of consultations) {
      if (c.client_id) consByUser.set(c.client_id, (consByUser.get(c.client_id) || 0) + 1)
      if (c.lawyer_id) consByUser.set(c.lawyer_id, (consByUser.get(c.lawyer_id) || 0) + 1)
    }

    const convByUser = new Map<string, number>()
    for (const cv of conversations) {
      if (cv.user_id) convByUser.set(cv.user_id, (convByUser.get(cv.user_id) || 0) + 1)
    }

    const postsByUser = new Map<string, number>()
    for (const p of posts) {
      if (p.user_id) postsByUser.set(p.user_id, (postsByUser.get(p.user_id) || 0) + 1)
    }

    const nowMs = Date.now()
    const dayMs = 86400000

    const users = profiles.map((p: any) => {
      const authInfo = authUsersMap.get(p.id)
      const createdAt = p.created_at || authInfo?.created_at || null
      const lastSignInAt = authInfo?.last_sign_in_at || null
      return {
        id: p.id,
        name: p.name || "",
        surname: p.surname || "",
        email: p.email || authInfo?.email || "",
        role: p.role || "user",
        avatar_url: p.avatar_url || null,
        phone: p.phone || "",
        city: p.city || "",
        license_number: p.license_number || "",
        experience_years: p.experience_years ?? null,
        specialties: Array.isArray(p.specialties) ? p.specialties : [],
        is_verified: Boolean(p.is_verified),
        created_at: createdAt,
        last_sign_in_at: lastSignInAt,
        consultations_count: consByUser.get(p.id) || 0,
        conversations_count: convByUser.get(p.id) || 0,
        posts_count: postsByUser.get(p.id) || 0,
      }
    })

    // Include any auth user missing from profiles
    const profileIds = new Set(profiles.map((p: any) => p.id))
    for (const [id, authInfo] of authUsersMap.entries()) {
      if (!profileIds.has(id)) {
        users.push({
          id,
          name: authInfo.email?.split("@")[0] || "İstifadəçi",
          surname: "",
          email: authInfo.email || "",
          role: "user",
          avatar_url: null,
          phone: "",
          city: "",
          license_number: "",
          experience_years: null,
          specialties: [],
          is_verified: false,
          created_at: authInfo.created_at,
          last_sign_in_at: authInfo.last_sign_in_at,
          consultations_count: consByUser.get(id) || 0,
          conversations_count: convByUser.get(id) || 0,
          posts_count: postsByUser.get(id) || 0,
        })
      }
    }

    const lawyers = users.filter((u) => u.role === "lawyer")
    const citizens = users.filter((u) => u.role !== "lawyer")
    const verifiedLawyers = lawyers.filter((l) => l.is_verified).length

    const activeLast24h = users.filter(
      (u) => u.last_sign_in_at && nowMs - new Date(u.last_sign_in_at).getTime() <= dayMs
    ).length
    const activeLast7d = users.filter(
      (u) => u.last_sign_in_at && nowMs - new Date(u.last_sign_in_at).getTime() <= 7 * dayMs
    ).length
    const newUsersLast7d = users.filter(
      (u) => u.created_at && nowMs - new Date(u.created_at).getTime() <= 7 * dayMs
    ).length

    // Real 14-day daily trend
    const dailyTrend14d: Array<{
      date: string
      label: string
      signups: number
      conversations: number
      consultations: number
    }> = []

    for (let i = 13; i >= 0; i--) {
      const d = new Date(nowMs - i * dayMs)
      const isoDay = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString("az-AZ", { day: "2-digit", month: "short" })

      const signups = users.filter((u) => u.created_at?.slice(0, 10) === isoDay).length
      const convs = conversations.filter((c: any) => c.created_at?.slice(0, 10) === isoDay).length
      const cons = consultations.filter((c: any) => c.created_at?.slice(0, 10) === isoDay).length

      dailyTrend14d.push({ date: isoDay, label, signups, conversations: convs, consultations: cons })
    }

    return NextResponse.json({
      stats: {
        totalUsers: users.length,
        totalCitizens: citizens.length,
        totalLawyers: lawyers.length,
        verifiedLawyers,
        pendingLawyers: lawyers.length - verifiedLawyers,
        activeLast24h,
        activeLast7d,
        newUsersLast7d,
        totalConversations: conversations.length,
        totalMessages: messages.length,
        totalConsultations: consultations.length,
        totalCommunityPosts: posts.length,
        totalFeedbacks: feedbacks.length,
      },
      dailyTrend14d,
      users,
      feedbacks,
    })
  } catch (err: any) {
    console.error("Admin overview error:", err)
    return NextResponse.json({ error: err?.message || "Məlumatlar yüklənmədi" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "İcazəsiz giriş" }, { status: 401 })
  }

  const supabase = getAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase konfiqurasiyası tapılmadı" }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { userId, is_verified } = body

    if (!userId || typeof is_verified !== "boolean") {
      return NextResponse.json({ error: "Yanlış sorğu parametrləri" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ is_verified })
      .eq("id", userId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Yenilənmə zamanı xəta" }, { status: 500 })
  }
}
