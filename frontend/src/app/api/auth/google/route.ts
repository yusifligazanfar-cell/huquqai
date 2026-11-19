import crypto from "crypto"
import { NextResponse } from "next/server"

const SECRET =
  process.env.SESSION_SECRET ||
  process.env.RESEND_API_KEY ||
  "huquqai-google-state-secret-v1"

function signState(b64: string) {
  return crypto.createHmac("sha256", SECRET).update(b64).digest("base64url")
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", url.origin))
  }

  const role = url.searchParams.get("role") === "lawyer" ? "lawyer" : "client"
  const mode = url.searchParams.get("mode") === "signup" ? "signup" : "login"
  const payload = { role, mode, exp: Date.now() + 10 * 60 * 1000 }
  const b64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  const state = `${b64}.${signState(b64)}`

  const redirectUri = `${url.origin}/api/auth/google/callback`
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  googleAuthUrl.searchParams.set("client_id", clientId)
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri)
  googleAuthUrl.searchParams.set("response_type", "code")
  googleAuthUrl.searchParams.set("scope", "openid email profile")
  googleAuthUrl.searchParams.set("state", state)
  googleAuthUrl.searchParams.set("prompt", "select_account")

  return NextResponse.redirect(googleAuthUrl.toString())
}
