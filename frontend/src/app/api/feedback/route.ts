import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const res = await cfFetch("/app/feedbacks", {
      method: "POST",
      body: JSON.stringify(body),
    })
    return NextResponse.json(res.data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Xəta baş verdi" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const res = await cfFetch("/app/feedbacks")
    return NextResponse.json(res.data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Xəta baş verdi" }, { status: 500 })
  }
}
