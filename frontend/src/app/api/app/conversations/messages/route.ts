import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"
import { getServerSession } from "@/lib/auth-session"

export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { ok, status, data } = await cfFetch("/app/conversations/messages", {
    method: "POST",
    body: JSON.stringify({
      conversation_id: body.conversation_id,
      items: body.items,
    }),
  })
  return NextResponse.json(data, { status: ok ? 200 : status || 500 })
}
