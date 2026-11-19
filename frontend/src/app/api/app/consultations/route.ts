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
    const { ok, status, data } = await cfFetch<{ success?: boolean; consultation?: any }>(
      "/app/consultations",
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    )

    let meetingUrl: string | null = null

    if (ok && body.status === "Qəbul edildi" && body.id && process.env.CAL_API_KEY) {
      try {
        const detailRes = await cfFetch<{ consultation?: any }>(
          `/app/consultations?id=${encodeURIComponent(String(body.id))}`
        )
        const cons = detailRes?.data?.consultation
        const clientEmail = cons?.client?.email
        const clientName =
          `${cons?.client?.name || ""} ${cons?.client?.surname || ""}`.trim() || "HuquqAI Müştəri"

        if (cons?.preferred_date && cons?.preferred_time && clientEmail) {
          const eventTypeId = Number(process.env.CAL_EVENT_TYPE_ID || 6391794)
          const startIso = `${cons.preferred_date}T${cons.preferred_time}:00+04:00`
          const calRes = await fetch("https://api.cal.com/v2/bookings", {
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
                consultationId: String(cons.id),
                lawyerId: String(cons.lawyer_id || ""),
              },
            }),
          })
          const calJson = (await calRes.json().catch(() => ({}))) as any
          const calData = calJson?.data || {}
          meetingUrl =
            calData.meetingUrl ||
            calData.references?.[0]?.meetingUrl ||
            (typeof calData.location === "string" && calData.location.startsWith("http")
              ? calData.location
              : null) ||
            (calData.uid ? `https://app.cal.com/booking/${calData.uid}` : null)
        }
      } catch (calErr) {
        console.warn("Cal.com booking creation skipped:", calErr)
      }
    }

    return NextResponse.json({ ...data, meetingUrl }, { status: ok ? 200 : status || 500 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server xətası" }, { status: 500 })
  }
}
