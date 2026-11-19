import { getServerSession } from "@/lib/auth-session"
import { cfFetch } from "@/lib/cloudflare-db"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import ConsultationClient from "./ConsultationClient"

export default async function ConsultationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession()

  if (!session?.userId) {
    redirect("/login")
  }

  const userId = session.userId
  const { id } = await params

  const { ok, data } = await cfFetch<{ consultation?: any; messages?: any[] }>(
    `/app/consultations?id=${encodeURIComponent(id)}`
  )
  const consultation = data?.consultation
  const messages = (data?.messages || []).map((m: any) => ({
    ...m,
    message: m.content ?? m.message,
  }))

  if (!ok || !consultation) {
    return notFound()
  }

  // Ensure current user is either client or lawyer for this consultation
  if (consultation.client_id !== userId && consultation.lawyer_id !== userId) {
    return notFound()
  }

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <div className="fixed top-20 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 pt-8 flex-1 z-10 flex flex-col">
        <Link href="/consultations" className="text-sm font-medium text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1 w-max">
          <ChevronLeft className="w-4 h-4" /> Bütün Konsultasiyalar
        </Link>
        
        <ConsultationClient 
          consultation={consultation} 
          initialMessages={messages || []} 
          currentUserId={userId} 
        />
      </div>
    </div>
  )
}
