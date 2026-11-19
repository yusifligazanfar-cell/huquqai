import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"
import { getServerSession } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const noView = searchParams.get("noView")
  const qs = id
    ? `?id=${encodeURIComponent(id)}${noView === "1" ? "&noView=1" : ""}`
    : ""
  const { ok, data } = await cfFetch(`/app/community${qs}`)
  if (!ok) return NextResponse.json(id ? { post: null, comments: [] } : { posts: [] })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session?.userId) {
    return NextResponse.json({ error: "Paylaşım üçün daxil olmalısınız." }, { status: 401 })
  }
  const body = await req.json()
  const { ok, status, data } = await cfFetch("/app/community", {
    method: "POST",
    body: JSON.stringify({
      user_id: session.userId,
      title: body.title,
      content: body.content,
      category: body.category,
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
  const { ok, status, data } = await cfFetch(`/app/community?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  return NextResponse.json(data, { status: ok ? 200 : status || 500 })
}
