import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"
import { getServerSession } from "@/lib/auth-session"

export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session?.userId) {
    return NextResponse.json({ error: "Şərh yazmaq üçün daxil olmalısınız." }, { status: 401 })
  }
  const body = await req.json()
  const { ok, status, data } = await cfFetch("/app/community/comments", {
    method: "POST",
    body: JSON.stringify({
      post_id: body.post_id,
      user_id: session.userId,
      content: body.content,
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
  const { ok, status, data } = await cfFetch(
    `/app/community/comments?id=${encodeURIComponent(id)}`,
    { method: "DELETE" }
  )
  return NextResponse.json(data, { status: ok ? 200 : status || 500 })
}
