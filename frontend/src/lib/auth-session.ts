import crypto from "crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"

export const SESSION_COOKIE_NAME = "huquqai_session"

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.RESEND_API_KEY ||
  "huquqai-cloudflare-session-secret-v1"

export interface SessionPayload {
  userId: string
  email: string
  role: string
  exp: number
}

function signB64(b64: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(b64).digest("base64url")
}

export function createSessionToken(user: { id: string; email: string; role: string }): string {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role || "client",
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  }
  const b64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  return `${b64}.${signB64(b64)}`
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token || !token.includes(".")) return null
  const [b64, sig] = token.split(".")
  if (!b64 || !sig || signB64(b64) !== sig) return null
  try {
    const parsed = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as SessionPayload
    if (!parsed.userId || Date.now() > parsed.exp) return null
    return parsed
  } catch {
    return null
  }
}

export async function getServerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value
  return verifySessionToken(raw)
}

export async function getServerUser(): Promise<Record<string, any> | null> {
  const session = await getServerSession()
  if (!session) return null
  const { ok, data } = await cfFetch<{ user?: Record<string, any> | null }>(
    `/app/auth/user?id=${encodeURIComponent(session.userId)}`
  )
  if (!ok || !data?.user) return null
  return data.user
}

export function setSessionCookie(
  res: NextResponse,
  user: { id: string; email: string; role: string }
) {
  const token = createSessionToken(user)
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  })
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}

export function createEmailActionToken(email: string, purpose: "verify" | "reset"): string {
  const payload = {
    email: email.trim().toLowerCase(),
    purpose,
    exp: Date.now() + 60 * 60 * 1000, // 1 hour
  }
  const b64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  return `${b64}.${signB64(b64)}`
}

export function verifyEmailActionToken(
  token: string,
  purpose: "verify" | "reset"
): { email: string } | null {
  if (!token || !token.includes(".")) return null
  const [b64, sig] = token.split(".")
  if (!b64 || !sig || signB64(b64) !== sig) return null
  try {
    const parsed = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as {
      email: string
      purpose: string
      exp: number
    }
    if (parsed.purpose !== purpose || Date.now() > parsed.exp || !parsed.email) return null
    return { email: parsed.email }
  } catch {
    return null
  }
}
