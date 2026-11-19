import { NextResponse } from "next/server"
import { Resend } from "resend"
import { cfFetch } from "@/lib/cloudflare-db"

const EXPECTED_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123"

function isAuthorized(req: Request) {
  const pass = req.headers.get("x-admin-password") || ""
  return pass === EXPECTED_ADMIN_PASSWORD
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "İcazəsiz giriş" }, { status: 401 })
  }

  try {
    const res = await cfFetch("/app/admin/overview")
    if (!res.ok) {
      return NextResponse.json({ error: (res.data as any)?.error || "D1 xətası" }, { status: res.status })
    }
    return NextResponse.json(res.data)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Məlumatlar yüklənmədi" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "İcazəsiz giriş" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as {
      userId?: string
      is_verified?: boolean
      action?: "approve" | "reject" | "request_info"
      note?: string
    }

    if (!body.userId) {
      return NextResponse.json({ error: "userId tələb olunur" }, { status: 400 })
    }

    const resolvedAction: "approve" | "reject" | "request_info" =
      body.action || (body.is_verified ? "approve" : "reject")

    // Update directly in Cloudflare D1 (no RLS restriction!)
    const d1Res = await cfFetch<{ success?: boolean; profile?: any; error?: string }>(
      "/app/admin/review",
      {
        method: "PATCH",
        body: JSON.stringify({
          userId: body.userId,
          action: resolvedAction,
          note: body.note || "",
        }),
      }
    )

    if (!d1Res.ok || !d1Res.data?.success) {
      return NextResponse.json(
        { error: d1Res.data?.error || "Cloudflare D1 yenilənmədi" },
        { status: d1Res.status || 500 }
      )
    }

    const updatedProfile = d1Res.data.profile
    const targetEmail = updatedProfile?.email || ""

    // Send email notification via Resend
    let emailSent = false
    let emailWarning: string | null = null
    const resendApiKey = process.env.RESEND_API_KEY

    if (resendApiKey && targetEmail) {
      try {
        const resend = new Resend(resendApiKey)
        const fullName =
          `${updatedProfile?.name || ""} ${updatedProfile?.surname || ""}`.trim() ||
          "Hörmətli Mütəxəssis"
        const isJurist = (updatedProfile?.license_number || "").startsWith("HÜQ:")
        const titleRole = isJurist ? "Hüquqşünas" : "Vəkil"

        let subject = ""
        let heading = ""
        let bodyText = ""

        if (resolvedAction === "approve") {
          subject = `HÜQUQ AI — ${titleRole} hesabınız təsdiqləndi və aktivdir`
          heading = `✅ Təbriklər! ${titleRole} olaraq hesabınız aktivdir`
          bodyText = `Hörmətli <strong>${fullName}</strong>, müraciətiniz admin tərəfindən yoxlanıldı və təsdiqləndi. Artıq HÜQUQ AI platformasında ${titleRole.toLowerCase()} olaraq hesabınız tam aktivdir — profilinizə daxil olub müştəri müraciətlərini qəbul edə bilərsiniz.`
        } else if (resolvedAction === "request_info") {
          subject = `HÜQUQ AI — ${titleRole} qeydiyyatı üçün əlavə doğrulama məlumatı`
          heading = `📋 Doğrulama məlumatı tələb olunur`
          bodyText = `Hörmətli <strong>${fullName}</strong>, ${titleRole.toLowerCase()} qeydiyyatınızı tamamlamaq üçün əlavə doğrulama məlumatı tələb olunur.${body.note ? `<br/><br/><strong>Admin qeydi:</strong> ${body.note}` : " Zəhmət olmasa vəsiqə / diplom təsdiq sənədinizi cavab olaraq göndərin."}`
        } else {
          subject = `HÜQUQ AI — ${titleRole} qeydiyyat müraciətinizin statusu`
          heading = `❌ Müraciətiniz təsdiqlənmədi`
          bodyText = `Hörmətli <strong>${fullName}</strong>, təqdim etdiyiniz məlumatlar yoxlanıldı, lakin hazırkı mərhələdə ${titleRole.toLowerCase()} profiliniz təsdiqlənmədi.${body.note ? `<br/><br/><strong>Səbəb / Qeyd:</strong> ${body.note}` : ""}`
        }

        const { error: sendError } = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "HuquqAI <noreply@huquqai.az>",
          to: [targetEmail],
          subject,
          html: `
            <div style="font-family:'Segoe UI',Arial,sans-serif;background:#070b09;padding:32px 16px;color:#fff;">
              <div style="max-width:540px;margin:0 auto;background:#101915;border:1px solid rgba(16,185,129,0.25);border-radius:16px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#059669,#0d9488);padding:24px 32px;text-align:center;">
                  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">HÜQUQ AI</h1>
                </div>
                <div style="padding:28px 32px;">
                  <h2 style="margin:0 0 12px;color:#fff;font-size:18px;">${heading}</h2>
                  <p style="margin:0 0 24px;color:#cbd5e1;font-size:14px;line-height:1.65;">${bodyText}</p>
                  <a href="https://huquqai.az/account" style="display:inline-block;background:linear-gradient(135deg,#059669,#0d9488);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;">
                    Hesaba Daxil Ol
                  </a>
                </div>
              </div>
            </div>
          `,
        })
        if (sendError) {
          emailWarning = sendError.message || "Resend e-poçt xətası"
        } else {
          emailSent = true
        }
      } catch (mailErr: any) {
        emailWarning = mailErr?.message || "E-poçt göndərilmədi"
      }
    } else if (!resendApiKey) {
      emailWarning = "RESEND_API_KEY təyin edilməyib"
    } else if (!targetEmail) {
      emailWarning = "İstifadəçinin e-poçt ünvanı tapılmadı"
    }

    return NextResponse.json({
      success: true,
      action: resolvedAction,
      profile: updatedProfile,
      targetEmail,
      emailSent,
      emailWarning,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Yenilənmə zamanı xəta" }, { status: 500 })
  }
}
