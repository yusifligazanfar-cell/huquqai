import crypto from "crypto"
import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"
import { setSessionCookie } from "@/lib/auth-session"

const SECRET =
  process.env.SESSION_SECRET ||
  process.env.RESEND_API_KEY ||
  "huquqai-google-state-secret-v1"

function verifyState(state: string): { role: string; mode: string } | null {
  if (!state || !state.includes(".")) return null
  const [b64, sig] = state.split(".")
  const expected = crypto.createHmac("sha256", SECRET).update(b64).digest("base64url")
  if (sig !== expected) return null
  try {
    const parsed = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"))
    if (Date.now() > parsed.exp) return null
    return { role: parsed.role || "client", mode: parsed.mode || "login" }
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code") || ""
  const stateRaw = url.searchParams.get("state") || ""
  const state = verifyState(stateRaw)

  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=google_oauth_failed", url.origin))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || ""
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ""
  const redirectUri = `${url.origin}/api/auth/google/callback`

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/login?error=google_token_failed", url.origin))
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string }
  if (!tokenJson.access_token) {
    return NextResponse.redirect(new URL("/login?error=google_token_failed", url.origin))
  }

  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  })
  if (!userRes.ok) {
    return NextResponse.redirect(new URL("/login?error=google_profile_failed", url.origin))
  }

  const gUser = (await userRes.json()) as {
    email?: string
    given_name?: string
    family_name?: string
    name?: string
    picture?: string
  }

  if (!gUser.email) {
    return NextResponse.redirect(new URL("/login?error=google_email_missing", url.origin))
  }

  const { ok, status, data } = await cfFetch<{ user?: any; error?: string }>("/app/auth/oauth", {
    method: "POST",
    body: JSON.stringify({
      email: gUser.email,
      name: gUser.given_name || gUser.name || "",
      surname: gUser.family_name || "",
      avatar_url: gUser.picture || "",
      role: state.role,
      mode: state.mode,
    }),
  })

  if (!ok || !data?.user) {
    if (status === 403 && state.role === "lawyer") {
      return NextResponse.redirect(
        new URL("/login?role=lawyer&error=not_registered_as_lawyer", url.origin)
      )
    }
    return NextResponse.redirect(new URL("/login?error=google_db_failed", url.origin))
  }

  const nextUrl =
    data.user.role === "lawyer" || state.role === "lawyer" ? "/account" : "/"
  const res = NextResponse.redirect(new URL(nextUrl, url.origin))
  setSessionCookie(res, {
    id: data.user.id,
    email: data.user.email,
    role: data.user.role,
  })
  return res
}
