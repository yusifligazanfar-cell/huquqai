import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"
import { setSessionCookie, verifyEmailActionToken } from "@/lib/auth-session"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get("token") || ""
  const verified = verifyEmailActionToken(token, "verify")
  if (!verified) {
    return NextResponse.redirect(new URL("/login?error=invalid_verify_token", url.origin))
  }

  const { ok, data } = await cfFetch<{ user?: any }>("/app/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ email: verified.email }),
  })

  if (!ok || !data?.user) {
    return NextResponse.redirect(new URL("/login?error=user_not_found", url.origin))
  }

  const nextPath = data.user.role === "lawyer" ? "/account" : "/"
  const res = NextResponse.redirect(new URL(nextPath, url.origin))
  setSessionCookie(res, {
    id: data.user.id,
    email: data.user.email,
    role: data.user.role,
  })
  return res
}
