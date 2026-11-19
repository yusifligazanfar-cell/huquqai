import crypto from "crypto"
import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({ ok: true, service: "huquqai-cal-webhook" })
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const secret = process.env.CAL_WEBHOOK_SECRET

    if (secret) {
      const sig = req.headers.get("x-cal-signature-256") || ""
      const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex")
      if (sig && sig !== expected) {
        return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 })
      }
    }

    const payload = rawBody ? JSON.parse(rawBody) : {}
    const triggerEvent = String(payload?.triggerEvent || "PING")
    const bookingPayload = payload?.payload || {}
    const consultationId = bookingPayload?.metadata?.consultationId

    if (consultationId) {
      let nextStatus: string | null = null
      if (triggerEvent === "BOOKING_CANCELLED" || triggerEvent === "BOOKING_REJECTED") {
        nextStatus = "İmtina edildi"
      }
      if (nextStatus) {
        await cfFetch("/app/consultations", {
          method: "PATCH",
          body: JSON.stringify({ id: String(consultationId), status: nextStatus }),
        }).catch(() => {})
      }
    }

    return NextResponse.json({ ok: true, triggerEvent })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Webhook error" }, { status: 400 })
  }
}
