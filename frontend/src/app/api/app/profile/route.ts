import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id") || ""
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const res = await cfFetch(`/app/profile?id=${encodeURIComponent(id)}`)
  return NextResponse.json(res.data, { status: res.status })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const res = await cfFetch("/app/sync-profile", {
    method: "POST",
    body: JSON.stringify(body),
  })
  return NextResponse.json(res.data, { status: res.status })
}
