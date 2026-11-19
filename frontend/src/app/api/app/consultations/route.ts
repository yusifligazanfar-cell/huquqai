import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"
import { getServerSession } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const lawyerId = searchParams.get("lawyerId")
  const userId = searchParams.get("userId")

  if (id) {
    const { ok, data } = await cfFetch(`/app/consultations?id=${encodeURIComponent(id)}`)
    if (!ok) return NextResponse.json({ consultation: null, messages: [] })
    return NextResponse.json(data)
  }

  if (lawyerId) {
    const { ok, data } = await cfFetch(`/app/consultations?lawyerId=${encodeURIComponent(lawyerId)}`)
    if (!ok) return NextResponse.json({ consultations: [] })
    return NextResponse.json({ consultations: data?.consultations || [] })
  }

  const targetUserId = userId || (await getServerSession())?.userId || ""
  const qs = targetUserId ? `?userId=${encodeURIComponent(targetUserId)}` : ""
  const { ok, data } = await cfFetch(`/app/consultations${qs}`)
  if (!ok) return NextResponse.json({ consultations: [] })
  return NextResponse.json({ consultations: data?.consultations || [] })
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession()
    const body = await req.json()
    const clientId = body.client_id || session?.userId
    if (!clientId || !body.lawyer_id) {
      return NextResponse.json({ error: "client_id və lawyer_id tələb olunur" }, { status: 400 })
    }
    const { ok, status, data } = await cfFetch<{ success?: boolean; consultation?: any }>(
      "/app/consultations",
      {
        method: "POST",
        body: JSON.stringify({ ...body, client_id: clientId }),
      }
    )

    if (ok && data?.consultation?.id && process.env.CAL_API_KEY && body.preferred_date && body.preferred_time) {
      try {
        const userRes = await cfFetch<{ user?: any }>(
          `/app/auth/user?id=${encodeURIComponent(clientId)}`
        )
        const clientEmail = userRes?.data?.user?.email || session?.email
        const clientName =
          `${userRes?.data?.user?.name || ""} ${userRes?.data?.user?.surname || ""}`.trim() ||
          "HuquqAI Müştəri"

        if (clientEmail) {
          const eventTypeId = Number(process.env.CAL_EVENT_TYPE_ID || 6391794)
          const startIso = `${body.preferred_date}T${body.preferred_time}:00+04:00`
          await fetch("https://api.cal.com/v2/bookings", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.CAL_API_KEY}`,
              "cal-api-version": "2024-08-13",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              start: startIso,
              eventTypeId,
              attendee: {
                name: clientName,
                email: clientEmail,
                timeZone: "Asia/Baku",
                language: "en",
              },
              metadata: {
                consultationId: String(data.consultation.id),
                lawyerId: String(body.lawyer_id),
              },
            }),
          }).catch(() => {})
        }
      } catch {}
    }

    return NextResponse.json(data, { status: ok ? 200 : status || 500 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server xətası" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession()
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const body = await req.json()
    const { ok, status, data } = await cfFetch("/app/consultations", {
      method: "PATCH",
      body: JSON.stringify(body),
    })
    return NextResponse.json(data, { status: ok ? 200 : status || 500 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server xətası" }, { status: 500 })
  }
}
