"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import Link from "next/link"
import { Card } from "@/components/ui/card"

export default function AccountNotifications() {
  const { user, isLoaded, supabaseUser } = useAuth()
  const [notifications, setNotifications] = useState<Record<string, any>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded || !user || !supabaseUser) return

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/app/consultations?userId=${encodeURIComponent(supabaseUser.id)}`, {
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        const list = (json?.consultations || []) as Record<string, any>[]
        const filtered =
          user.role === 'lawyer'
            ? list.filter((c) => c.lawyer_id === supabaseUser.id && c.status === 'Gözləyir')
            : list.filter(
                (c) =>
                  c.client_id === supabaseUser.id &&
                  ['Qəbul edildi', 'İmtina edildi', 'Tamamlandı'].includes(c.status)
              )
        setNotifications(filtered.slice(0, 10))
      } catch {}
      setLoading(false)
    }

    fetchNotifications()
  }, [user, isLoaded, supabaseUser])

  if (loading) {
    return <div className="text-sm text-muted-foreground p-4 text-center">Yüklənir...</div>
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center p-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-white/5">
        <p className="text-muted-foreground">Hazırda yeni bildirişiniz yoxdur.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {notifications.map((notif) => {
        let displayName = user?.role === 'lawyer' ? "Naməlum Vətəndaş" : "Vəkil";
        try {
          if (user?.role === 'lawyer') {
            if (Array.isArray(notif.client)) displayName = notif.client[0]?.name || displayName;
            else if (notif.client) displayName = notif.client?.name || displayName;
          } else {
            if (Array.isArray(notif.lawyer)) displayName = notif.lawyer[0]?.name || displayName;
            else if (notif.lawyer) displayName = notif.lawyer?.name || displayName;
          }
        } catch(e) {}

        let formattedDate = "";
        try {
          if (notif.created_at) {
            const d = new Date(notif.created_at);
            if (!isNaN(d.getTime())) {
              formattedDate = d.toLocaleString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            }
          }
        } catch(e) {}

        return (
          <Card key={notif.id} className="p-4 hover:border-primary/50 transition-colors">
            <Link href={`/consultations/${notif.id}`} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {displayName}
                </span>
                {formattedDate && (
                  <span className="text-xs text-muted-foreground">
                    {formattedDate}
                  </span>
                )}
              </div>
              {user?.role === 'lawyer' && (
                <div className="text-sm text-muted-foreground line-clamp-1">
                  {notif.problem_description}
                </div>
              )}
              {user?.role !== 'lawyer' && (
                <div className="text-sm">
                  Müraciətinizin statusu yeniləndi: <span className="font-semibold text-primary">{notif.status}</span>
                </div>
              )}
            </Link>
          </Card>
        )
      })}
    </div>
  )
}
