import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"
import { createEmailActionToken, setSessionCookie } from "@/lib/auth-session"

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

    // Try sending verification email via Resend if configured
    let emailSent = false
    let emailWarning = ""
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      try {
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
              <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
                <h2>HÜQUQ AI hesabınızı təsdiqləyin</h2>
                <p>Qeydiyyatı tamamlamaq üçün aşağıdakı düyməyə klikləyin:</p>
                <p style="margin: 24px 0;">
                  <a href="${verifyUrl}" style="background:#059669;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold;">
                    E-poçtu Təsdiqlə
                  </a>
                </p>
              </div>
            `,
          }),
        })
        if (resendRes.ok) {
          emailSent = true
        } else {
          emailWarning = "Resend domeni təsdiqlənmədiyi üçün təsdiq maili göndərilmədi, hesabınız birbaşa açıldı."
        }
      } catch {
        emailWarning = "Təsdiq maili göndərilmədi, hesabınız birbaşa açıldı."
      }
    }

    const res = NextResponse.json({
      ok: true,
      user: data.user,
      emailSent,
      emailWarning,
    })
    setSessionCookie(res, {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
    })
    return res
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Qeydiyyat xətası." },
      { status: 500 }
    )
  }
}
