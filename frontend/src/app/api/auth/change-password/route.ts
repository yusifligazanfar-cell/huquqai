import { NextResponse } from "next/server"
import { cfFetch } from "@/lib/cloudflare-db"
import { getServerSession } from "@/lib/auth-session"

function isStrongPassword(pw: string) {
  return (
    pw.length >= 8 &&
    /[A-Z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pw)
  )
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession()
    if (!session?.userId) {
      return NextResponse.json({ ok: false, error: "Daxil olmalısınız." }, { status: 401 })
    }

    const body = await req.json()
    const currentPassword = String(body?.currentPassword || "")
    const newPassword = String(body?.newPassword || "")

    if (!isStrongPassword(newPassword)) {
      return NextResponse.json(
        { ok: false, error: "Yeni şifrə minimum 8 simvol, 1 böyük hərf, 1 rəqəm və 1 özəl simvol içərməlidir." },
        { status: 400 }
      )
    }

    const { ok, status, data } = await cfFetch<{ error?: string }>("/app/auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        userId: session.userId,
        currentPassword,
        newPassword,
      }),
    })

    if (!ok) {
      return NextResponse.json(
        { ok: false, error: data?.error || "Şifrə dəyişdirilə bilmədi." },
        { status: status || 400 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Server xətası." },
      { status: 500 }
    )
  }
}
