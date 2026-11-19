import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"
import { getServerSession } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await getServerSession()
  if (!session?.userId) {
    return NextResponse.json({ conversations: [], messages: [] })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const qs = id ? `?id=${encodeURIComponent(id)}` : `?userId=${encodeURIComponent(session.userId)}`
  const { ok, data } = await cfFetch(`/app/conversations${qs}`)
  if (!ok) return NextResponse.json({ conversations: [], messages: [] })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { ok, status, data } = await cfFetch("/app/conversations", {
    method: "POST",
    body: JSON.stringify({
      user_id: session.userId,
      title: body.title,
      mode: body.mode || "chat",
    }),
  })
  return NextResponse.json(data, { status: ok ? 200 : status || 500 })
}

export async function DELETE(req: Request) {
  const session = await getServerSession()
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id") || ""
  const { ok, status, data } = await cfFetch(`/app/conversations?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  return NextResponse.json(data, { status: ok ? 200 : status || 500 })
}
