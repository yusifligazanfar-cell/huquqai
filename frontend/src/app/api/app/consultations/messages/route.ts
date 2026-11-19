import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"
import { getServerSession } from "@/lib/auth-session"

export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { ok, status, data } = await cfFetch("/app/consultations/messages", {
    method: "POST",
    body: JSON.stringify({
      consultation_id: body.consultation_id,
      sender_id: session.userId,
      content: body.content,
    }),
  })
  return NextResponse.json(data, { status: ok ? 200 : status || 500 })
}
