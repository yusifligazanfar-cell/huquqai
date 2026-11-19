import { NextResponse } from "next/server"
import { clearSessionCookie, getServerUser } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getServerUser()
  return NextResponse.json({ user })
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  clearSessionCookie(res)
  return res
}
