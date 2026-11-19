import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lawyerId = searchParams.get("lawyerId") || ""
  const qs = lawyerId ? `?lawyerId=${encodeURIComponent(lawyerId)}` : ""
  const res = await cfFetch(`/app/consultations${qs}`)
  return NextResponse.json(res.data, { status: res.status })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const res = await cfFetch("/app/consultations", {
    method: "POST",
    body: JSON.stringify(body),
  })
  return NextResponse.json(res.data, { status: res.status })
}
