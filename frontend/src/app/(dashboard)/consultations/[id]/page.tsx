import { createClient } from "@/utils/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import ConsultationClient from "./ConsultationClient"

export default async function ConsultationDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect("/login")
  }

  const userId = session.user.id

  // Fetch consultation
  const { data: consultation, error } = await supabase
    .from('consultations')
    .select(`
      *,
      client:profiles!consultations_client_id_fkey(id, name, avatar_url),
      lawyer:profiles!consultations_lawyer_id_fkey(id, name, avatar_url)
    `)
    .eq('id', params.id)
    .single()

  if (error || !consultation) {
    return notFound()
  }

  // Ensure current user is either client or lawyer for this consultation
  if (consultation.client_id !== userId && consultation.lawyer_id !== userId) {
    return notFound()
  }

  // Fetch initial messages
  const { data: messages, error: messagesError } = await supabase
    .from('consultation_messages')
    .select('*')
    .eq('consultation_id', consultation.id)
    .order('created_at', { ascending: true })

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
