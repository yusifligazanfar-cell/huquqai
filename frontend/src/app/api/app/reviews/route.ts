import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"
import { getServerSession } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lawyerId = searchParams.get("lawyerId") || ""
  const { ok, data } = await cfFetch(`/app/reviews?lawyerId=${encodeURIComponent(lawyerId)}`)
  if (!ok) return NextResponse.json({ reviews: [] })
  return NextResponse.json({ reviews: data?.reviews || [] })
}

export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session?.userId) {
    return NextResponse.json({ error: "Rəy yazmaq üçün daxil olmalısınız." }, { status: 401 })
  }
  const body = await req.json()
  const { ok, status, data } = await cfFetch("/app/reviews", {
    method: "POST",
    body: JSON.stringify({
      lawyer_id: body.lawyer_id,
      client_id: session.userId,
      rating: body.rating,
      comment: body.comment,
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
  const { ok, status, data } = await cfFetch(`/app/reviews?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  return NextResponse.json(data, { status: ok ? 200 : status || 500 })
}
