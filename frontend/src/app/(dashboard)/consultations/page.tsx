import { createClient } from "@/utils/supabase/server"
import { Shield, Clock, CheckCircle2, XCircle, MessageSquare } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import ConsultationActionButtons from "./ConsultationActionButtons"

export default async function ConsultationsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect("/login")
  }

  const userId = session.user.id

  const { data: consultations, error } = await supabase
    .from('consultations')
    .select(`
      *,
      client:profiles!consultations_client_id_fkey(id, name, avatar_url),
      lawyer:profiles!consultations_lawyer_id_fkey(id, name, avatar_url)
    `)
    .or(`client_id.eq.${userId},lawyer_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Consultation fetch error:", error)
  }

  const incomingRequests = consultations?.filter(c => c.lawyer_id === userId) || []
  const outgoingRequests = consultations?.filter(c => c.client_id === userId) || []

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'Gözləyir':
      case 'pending': return <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 w-max"><Clock className="w-3 h-3" /> Gözləyir</span>
      case 'Qəbul edildi': return <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3" /> Qəbul Edildi</span>
      case 'İmtina edildi': return <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 w-max"><XCircle className="w-3 h-3" /> İmtina Edildi</span>
      case 'Tamamlandı': return <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 w-max"><Shield className="w-3 h-3" /> Tamamlandı</span>
      default: return null
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <div className="fixed top-20 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 pt-12 flex-1 z-10 space-y-12">
        
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Konsultasiyalarım</h1>
          <p className="text-muted-foreground">Bütün hüquqi məsləhətləşmələrinizi buradan idarə edin.</p>
        </div>

        {/* INCOMING — vəkil üçün, düymələr Link xaricindədir */}
        {incomingRequests.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground border-b border-slate-200 dark:border-white/10 pb-2">
              Sizə Gələn Müraciətlər (Vəkil kimi)
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {incomingRequests.map(req => (
                <div key={req.id} className="bg-white/70 dark:bg-card/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-5 rounded-2xl hover:shadow-lg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Info — sadəcə bu hissə kliklenəndə naviqasiya edir */}
                  <Link href={`/consultations/${req.id}`} className="flex items-center gap-4 flex-1 min-w-0 group">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
                      {req.client?.avatar_url
                        ? <img src={req.client.avatar_url} alt="A" className="w-full h-full object-cover" />
                        : req.client?.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{req.client?.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-1">{req.problem_description}</div>
                    </div>
                  </Link>
                  {/* Status + Buttons — Link xaricindədir, klik konflikti yoxdur */}
                  <div className="flex items-center gap-3 sm:ml-auto shrink-0 flex-wrap">
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(req.created_at).toLocaleDateString('az-AZ')}
                    </div>
                    <StatusBadge status={req.status} />
                    <ConsultationActionButtons consultationId={req.id} status={req.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OUTGOING — user müraciətləri */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground border-b border-slate-200 dark:border-white/10 pb-2">
            Mənim Müraciətlərim (Vətəndaş kimi)
          </h2>
          {outgoingRequests.length === 0 ? (
            <div className="bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-8 text-center text-muted-foreground">
              Hələ heç bir vəkilə konsultasiya üçün müraciət etməmisiniz.
              <div className="mt-4">
                <Link href="/lawyers">
                  <button className="bg-primary text-white px-6 py-2 rounded-xl font-semibold hover:bg-primary/90 transition-colors">
                    Vəkillər Kataloquna Keç
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {outgoingRequests.map(req => (
                <Link href={`/consultations/${req.id}`} key={req.id}>
                  <div className="bg-white/70 dark:bg-card/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-5 rounded-2xl hover:shadow-lg transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold overflow-hidden">
                        {req.lawyer?.avatar_url ? <img src={req.lawyer.avatar_url} alt="A" className="w-full h-full object-cover" /> : req.lawyer?.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                          {req.lawyer?.name} <Shield className="w-3 h-3 text-blue-500" />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Vəkilə müraciətiniz</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:ml-auto">
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(req.created_at).toLocaleDateString('az-AZ')}
                      </div>
                      <StatusBadge status={req.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
