import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"
import { createEmailActionToken } from "@/lib/auth-session"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body?.email || "").trim().toLowerCase()
    const password = String(body?.password || "")
    const origin = new URL(req.url).origin

    const { ok, status, data } = await cfFetch<{ user?: any; error?: string }>("/app/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        ...body,
        email,
        password,
        email_verified: false,
      }),
    })

    if (!ok || !data?.user) {
      return NextResponse.json(
        { ok: false, error: data?.error || "Qeydiyyat zamanı xəta baş verdi." },
        { status: status || 400 }
      )
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json(
        { ok: false, error: "E-poçt xidməti (RESEND_API_KEY) konfiqurasiya edilməyib." },
        { status: 500 }
      )
    }

    const token = createEmailActionToken(email, "verify")
    const verifyUrl = `${origin}/api/auth/verify?token=${encodeURIComponent(token)}`
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
        subject: "HÜQUQ AI — E-poçtunuzu təsdiqləyin",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h2 style="margin: 0 0 12px; color: #0f172a;">HÜQUQ AI hesabınızı təsdiqləyin</h2>
            <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.6;">
              Bu e-poçt ünvanının sizə aid olduğunu təsdiqləmək və hesabınızı aktivləşdirmək üçün aşağıdakı düyməyə klikləyin:
            </p>
            <p style="margin: 24px 0; text-align: center;">
              <a href="${verifyUrl}" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold;">
                E-poçtu Təsdiqlə və Daxil Ol
              </a>
            </p>
            <p style="margin: 18px 0 0; color: #64748b; font-size: 12px;">
              Bu link 1 saat ərzində etibarlıdır. Əgər bu qeydiyyatı siz etməmisinizsə, bu məktuba məhəl qoymayın.
            </p>
          </div>
        `,
      }),
    })

    if (!resendRes.ok) {
      const errText = await resendRes.text().catch(() => "")
      console.error("[SIGNUP VERIFY EMAIL ERROR]", resendRes.status, errText)
      return NextResponse.json(
        { ok: false, error: "Təsdiq maili göndərilə bilmədi. Zəhmət olmasa yenidən cəhd edin." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      requiresVerification: true,
      email,
    })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Qeydiyyat xətası." },
      { status: 500 }
    )
  }
}
