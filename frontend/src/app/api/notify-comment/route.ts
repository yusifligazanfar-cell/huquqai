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
    const { postId, commenterName } = await req.json()

    if (!postId) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: post, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:profiles!user_id(id, name, email)
      `)
      .eq('id', postId)
      .single()

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const authorEmail = post.author?.email
    const authorName = post.author?.name || 'İstifadəçi'

    if (!authorEmail) {
      console.warn('[NOTIFY-COMMENT] Author email not found, skipping email send')
      return NextResponse.json({ success: true, skipped: true })
    }

    const postLink = `https://huquqai.az/community/${postId}`

    const emailHtml = `
<!DOCTYPE html>
<html lang="az">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Sualınıza cavab gəldi</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1d27;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#6d28d9,#4f46e5);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">HuquqAI İcması</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 8px;color:#fff;font-size:20px;font-weight:700;">Sualınıza yeni rəy var!</h2>
              <p style="margin:0 0 24px;color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;">
                Hörmətli <strong style="color:#a78bfa;">${authorName}</strong>, 
                <strong style="color:#a78bfa;">${commenterName || 'Bir istifadəçi'}</strong> sizin "${post.title}" başlıqlı sualınıza cavab yazdı.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(109,40,217,0.12);border:1px solid rgba(109,40,217,0.3);border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;text-align:center;">
                    <a href="${postLink}" style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#4f46e5);color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Cavabı Oxu</a>
                  </td>
                </tr>
              </table>
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
      to: [authorEmail],
      subject: `🔔 Sualınıza cavab gəldi!`,
      html: emailHtml,
    })

    if (sendError) {
      console.error('[RESEND ERROR]', sendError)
      return NextResponse.json({ error: 'Email send failed', detail: sendError }, { status: 500 })
    }

    console.log('[EMAIL SENT] ID:', data?.id, '→', authorEmail)
    return NextResponse.json({ success: true, emailId: data?.id })

  } catch (error: any) {
    console.error('[NOTIFY-COMMENT ERROR]', error)
    return NextResponse.json({ error: 'Server error', detail: error?.message }, { status: 500 })
  }
}
