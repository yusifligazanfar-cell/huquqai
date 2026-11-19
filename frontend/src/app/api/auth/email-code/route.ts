import { NextResponse } from "next/server"
import crypto from "crypto"

const SECRET =
  process.env.EMAIL_CODE_SECRET ||
  process.env.RESEND_API_KEY ||
  "huquqai-email-verify-fallback-secret"

function signPayload(payloadB64: string) {
  return crypto.createHmac("sha256", SECRET).update(payloadB64).digest("base64url")
}

function hashCode(email: string, code: string) {
  return crypto
    .createHmac("sha256", SECRET)
    .update(`${email.toLowerCase().trim()}:${code.trim()}`)
    .digest("hex")
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const action = body?.action as "send" | "verify"
    const email = String(body?.email || "").trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Düzgün e-poçt ünvanı daxil edin." },
        { status: 400 }
      )
    }

    if (action === "send") {
      const resendApiKey = process.env.RESEND_API_KEY
      if (!resendApiKey) {
        return NextResponse.json(
          { ok: false, error: "E-poçt xidməti (RESEND_API_KEY) konfiqurasiya edilməyib." },
          { status: 500 }
        )
      }

      const code = String(crypto.randomInt(100000, 1000000))
      const exp = Date.now() + 10 * 60 * 1000 // 10 minutes
      const payload = {
        email,
        codeHash: hashCode(email, code),
        exp,
      }
      const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
      const sig = signPayload(payloadB64)
      const token = `${payloadB64}.${sig}`

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
          subject: "HÜQUQ AI — E-poçt təsdiq kodu",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
              <h2 style="margin: 0 0 12px; color: #0f172a;">E-poçt ünvanınızı təsdiqləyin</h2>
              <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.6;">
                HÜQUQ AI platformasında qeydiyyatı davam etdirmək üçün aşağıdakı 6 rəqəmli təsdiq kodunu daxil edin:
              </p>
              <div style="background: #f1f5f9; border-radius: 12px; padding: 18px; text-align: center; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #059669;">
                ${code}
              </div>
              <p style="margin: 18px 0 0; color: #64748b; font-size: 12px;">
                Bu kod 10 dəqiqə ərzində etibarlıdır. Əgər bu sorğunu siz göndərməmisinizsə, bu məktuba məhəl qoymayın.
              </p>
            </div>
          `,
        }),
      })

      if (!resendRes.ok) {
        const errBody = await resendRes.text().catch(() => "")
        console.error("[EMAIL-CODE RESEND ERROR]", resendRes.status, errBody)
        return NextResponse.json(
          { ok: false, error: "Təsdiq kodu göndərilə bilmədi. E-poçt ünvanını yoxlayın." },
          { status: 500 }
        )
      }

      return NextResponse.json({ ok: true, token })
    }

    if (action === "verify") {
      const code = String(body?.code || "").trim()
      const token = String(body?.token || "").trim()
      if (!code || !token || !token.includes(".")) {
        return NextResponse.json(
          { ok: false, error: "Təsdiq kodu və ya token natamamdır." },
          { status: 400 }
        )
      }

      const [payloadB64, sig] = token.split(".")
      const expectedSig = signPayload(payloadB64)
      if (sig !== expectedSig) {
        return NextResponse.json(
          { ok: false, error: "Təsdiq tokeni etibarsızdır." },
          { status: 400 }
        )
      }

      const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
        email: string
        codeHash: string
        exp: number
      }

      if (Date.now() > parsed.exp) {
        return NextResponse.json(
          { ok: false, error: "Təsdiq kodunun müddəti bitib. Yenidən kod göndərin." },
          { status: 400 }
        )
      }

      if (parsed.email !== email) {
        return NextResponse.json(
          { ok: false, error: "E-poçt ünvanı uyğun gəlmir." },
          { status: 400 }
        )
      }

      if (hashCode(email, code) !== parsed.codeHash) {
        return NextResponse.json(
          { ok: false, error: "Təsdiq kodu yanlışdır." },
          { status: 400 }
        )
      }

      return NextResponse.json({ ok: true, verified: true })
    }

    return NextResponse.json({ ok: false, error: "Yanlış əməliyyat." }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Server xətası." },
      { status: 500 }
    )
  }
}
