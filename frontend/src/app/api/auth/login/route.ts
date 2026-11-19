import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"
import { setSessionCookie } from "@/lib/auth-session"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body?.email || "").trim().toLowerCase()
    const password = String(body?.password || "")

    const { ok, status, data } = await cfFetch<{ user?: any; error?: string }>("/app/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })

    if (!ok || !data?.user) {
      return NextResponse.json(
        { ok: false, error: data?.error || "E-poçt və ya şifrə yanlışdır." },
        { status: status || 401 }
      )
    }

    const res = NextResponse.json({ ok: true, user: data.user })
    setSessionCookie(res, {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
    })
    return res
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Giriş xətası." },
      { status: 500 }
    )
  }
}
