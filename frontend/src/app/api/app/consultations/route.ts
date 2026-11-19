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
    const { ok, status, data } = await cfFetch("/app/consultations", {
      method: "POST",
      body: JSON.stringify({ ...body, client_id: clientId }),
    })
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
