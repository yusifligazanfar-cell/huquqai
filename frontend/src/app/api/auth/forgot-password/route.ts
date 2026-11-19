import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"
import { createEmailActionToken, verifyEmailActionToken } from "@/lib/auth-session"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const action = body?.action as "request" | "confirm"

    if (action === "confirm") {
      const token = String(body?.token || "")
      const password = String(body?.password || "")
      const verified = verifyEmailActionToken(token, "reset")
      if (!verified) {
        return NextResponse.json(
          { ok: false, error: "Şifrə sıfırlama linki etibarsızdır və ya vaxtı bitib." },
          { status: 400 }
        )
      }
      const { ok, data } = await cfFetch<{ error?: string }>("/app/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email: verified.email, password }),
      })
      if (!ok) {
        return NextResponse.json(
          { ok: false, error: data?.error || "Şifrə yenilənə bilmədi." },
          { status: 400 }
        )
      }
      return NextResponse.json({ ok: true })
    }

    const email = String(body?.email || "").trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ ok: false, error: "E-poçt daxil edin." }, { status: 400 })
    }

    const { data: userRes } = await cfFetch<{ user?: any }>(
      `/app/auth/user?email=${encodeURIComponent(email)}`
    )
    if (!userRes?.user) {
      return NextResponse.json(
        { ok: false, error: "Bu e-poçt ünvanı ilə hesab tapılmadı." },
        { status: 404 }
      )
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json(
        { ok: false, error: "E-poçt xidməti (RESEND_API_KEY) konfiqurasiya edilməyib." },
        { status: 500 }
      )
    }

    const origin = new URL(req.url).origin
    const token = createEmailActionToken(email, "reset")
    const resetUrl = `${origin}/login?reset_token=${encodeURIComponent(token)}`
    const fromAddress = process.env.RESEND_FROM_EMAIL || "HuquqAI <noreply@huquqai.az>"

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject: "HÜQUQ AI — Şifrə sıfırlama",
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
            <h2>Şifrənizi yeniləyin</h2>
            <p>Yeni şifrə təyin etmək üçün aşağıdakı linkə klikləyin:</p>
            <p style="margin: 24px 0;">
              <a href="${resetUrl}" style="background:#059669;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold;">
                Yeni Şifrə Təyin Et
              </a>
            </p>
          </div>
        `,
      }),
    })

    if (!resendRes.ok) {
      return NextResponse.json(
        { ok: false, error: "Şifrə sıfırlama maili göndərilə bilmədi (Resend DNS təsdiqlənməyib)." },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Server xətası." },
      { status: 500 }
    )
  }
}
