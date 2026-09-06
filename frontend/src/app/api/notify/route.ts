import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY missing, skipping email notification.")
      return NextResponse.json({ success: true, warning: 'RESEND_API_KEY missing' })
    }
    const resend = new Resend(resendApiKey)
    const { consultationId } = await req.json()

    if (!consultationId) {
      return NextResponse.json({ error: 'consultationId required' }, { status: 400 })
    }

    // Fetch full consultation with client + lawyer details
    const supabase = await createClient()
    const { data: consultation, error } = await supabase
      .from('consultations')
      .select(`
        *,
        client:profiles!consultations_client_id_fkey(id, name, email, avatar_url),
        lawyer:profiles!consultations_lawyer_id_fkey(id, name, email, avatar_url)
      `)
      .eq('id', consultationId)
      .single()

    if (error || !consultation) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
    }

    const clientEmail = consultation.client?.email
    const clientName = consultation.client?.name || 'Müraciət edən'
    const lawyerName = consultation.lawyer?.name || 'Vəkil'

    // Format date and time
    let dateStr = ''
    let timeStr = ''
    if (consultation.preferred_date) {
      const d = new Date(consultation.preferred_date)
      dateStr = d.toLocaleDateString('az-AZ', { day: '2-digit', month: 'long', year: 'numeric' })
    }
    if (consultation.preferred_time) {
      timeStr = consultation.preferred_time
    }
    if (!dateStr && consultation.created_at) {
      const d = new Date(consultation.created_at)
      dateStr = d.toLocaleDateString('az-AZ', { day: '2-digit', month: 'long', year: 'numeric' })
    }

    const meetLink = 'https://nitrocalls.site'

    if (!clientEmail) {
      console.warn('[NOTIFY] Client email not found, skipping email send')
      return NextResponse.json({ success: true, skipped: true })
    }

    const emailHtml = `
<!DOCTYPE html>
<html lang="az">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Konsultasiya Təsdiqləndi</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1d27;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6d28d9,#4f46e5);padding:32px 40px;text-align:center;">
              <div style="font-size:28px;margin-bottom:8px;">⚖️</div>
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">HuquqAI</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Hüquqi Konsultasiya Platforması</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 8px;color:#fff;font-size:20px;font-weight:700;">✅ Konsultasiyanız təsdiqləndi!</h2>
              <p style="margin:0 0 24px;color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;">
                Hörmətli <strong style="color:#a78bfa;">${clientName}</strong>, vəkil <strong style="color:#a78bfa;">${lawyerName}</strong> sizin müraciətinizi qəbul etdi.
              </p>

              <!-- Info Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(109,40,217,0.12);border:1px solid rgba(109,40,217,0.3);border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    ${dateStr ? `
                    <div style="margin-bottom:14px;">
                      <span style="color:rgba(255,255,255,0.45);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">📅 Tarix</span>
                      <div style="color:#fff;font-size:15px;font-weight:600;margin-top:4px;">${dateStr}</div>
                    </div>` : ''}
                    ${timeStr ? `
                    <div style="margin-bottom:14px;">
                      <span style="color:rgba(255,255,255,0.45);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">🕐 Saat</span>
                      <div style="color:#fff;font-size:15px;font-weight:600;margin-top:4px;">${timeStr}</div>
                    </div>` : ''}
                    <div>
                      <span style="color:rgba(255,255,255,0.45);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">🔗 Görüş Keçidi</span>
                      <div style="margin-top:6px;">
                        <a href="${meetLink}" style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#4f46e5);color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;">${meetLink}</a>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Problem -->
              ${consultation.problem_description ? `
              <div style="background:rgba(255,255,255,0.04);border-left:3px solid #6d28d9;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
                <div style="color:rgba(255,255,255,0.45);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Müraciət Mövzusu</div>
                <div style="color:rgba(255,255,255,0.8);font-size:14px;line-height:1.6;">${consultation.problem_description}</div>
              </div>` : ''}

              <p style="color:rgba(255,255,255,0.5);font-size:13px;line-height:1.6;margin:0;">
                Görüş keçidinə bağlantı tarixdə aktivləşəcək. Hər hansı sualınız olarsa platformamızda vəkillə mesajlaşa bilərsiniz.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid rgba(255,255,255,0.06);padding:20px 40px;text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.25);font-size:12px;">
                Bu məktub <a href="https://huquqai.az" style="color:rgba(109,40,217,0.8);text-decoration:none;">huquqai.az</a> platforması tərəfindən avtomatik göndərilmişdir.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

    const { data, error: sendError } = await resend.emails.send({
      from: 'HuquqAI <onboarding@resend.dev>',
      to: [clientEmail],
      subject: `✅ Konsultasiyanız təsdiqləndi — ${dateStr ? dateStr : 'Yaxın vaxtda'}`,
      html: emailHtml,
    })

    if (sendError) {
      console.error('[RESEND ERROR]', sendError)
      return NextResponse.json({ error: 'Email send failed', detail: sendError }, { status: 500 })
    }

    console.log('[EMAIL SENT] ID:', data?.id, '→', clientEmail)
    return NextResponse.json({ success: true, emailId: data?.id })

  } catch (error: any) {
    console.error('[NOTIFY ERROR]', error)
    return NextResponse.json({ error: 'Server error', detail: error?.message }, { status: 500 })
  }
}
