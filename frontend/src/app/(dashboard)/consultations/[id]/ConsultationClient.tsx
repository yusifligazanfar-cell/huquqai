"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Send, CheckCircle2, XCircle, Shield, AlertTriangle,
  MessageSquare, Calendar, Clock, User, FileText,
  ChevronDown, ChevronUp
} from "lucide-react"

export default function ConsultationClient({ 
  consultation, 
  initialMessages, 
  currentUserId 
}: { 
  consultation: any, 
  initialMessages: any[], 
  currentUserId: string 
}) {
  const [messages, setMessages] = useState(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [status, setStatus] = useState(consultation.status)
  const [isUpdating, setIsUpdating] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const supabase = createClient()
  const isLawyer = currentUserId === consultation.lawyer_id
  const otherParty = isLawyer ? consultation.client : consultation.lawyer

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel(`consultation_${consultation.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'consultation_messages',
        filter: `consultation_id=eq.${consultation.id}`
      }, (payload: any) => {
        setMessages(prev => [...prev, payload.new])
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'consultations',
        filter: `id=eq.${consultation.id}`
      }, (payload: any) => {
        setStatus(payload.new.status)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [consultation.id, supabase])

  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdating(true)
    const { error } = await supabase
      .from('consultations')
      .update({ status: newStatus })
      .eq('id', consultation.id)
      
    if (!error) {
      setStatus(newStatus)
      // Send email notification to client when accepted
      if (newStatus === 'Qəbul edildi') {
        try {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consultationId: consultation.id }),
          })
        } catch (e) {
          console.warn('Email notification failed', e)
        }
      }
    }
    setIsUpdating(false)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const msg = newMessage
    setNewMessage("")

    const { error } = await supabase
      .from('consultation_messages')
      .insert({
        consultation_id: consultation.id,
        sender_id: currentUserId,
        message: msg
      })

    if (error) {
      console.error("Error sending message:", error)
      setNewMessage(msg)
    }
  }

  // Format date
  const createdAt = consultation.created_at ? new Date(consultation.created_at) : null
  const formattedDate = createdAt
    ? createdAt.toLocaleDateString('az-AZ', { day: '2-digit', month: 'long', year: 'numeric' })
    : ""
  const formattedTime = createdAt
    ? createdAt.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
    : ""

  // Preferred time
  const preferredDate = consultation.preferred_date
    ? new Date(consultation.preferred_date).toLocaleDateString('az-AZ', { day: '2-digit', month: 'long', year: 'numeric' })
    : null
  const preferredTime = consultation.preferred_time || null

  const statusColors: Record<string, string> = {
    'Gözləyir': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    'Qəbul edildi': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    'İmtina edildi': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    'Tamamlandı': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  }
  const statusColor = statusColors[status] || 'bg-slate-100 text-slate-700 border-slate-200'

  return (
    <div className="flex flex-col gap-4 pb-10">

      {/* ── Detallı Müraciət Kartı ── */}
      <div className="bg-white/70 dark:bg-card/40 backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden">
        
        {/* Card Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-xl overflow-hidden border border-primary/20 shadow">
              {otherParty?.avatar_url ? (
                <img src={otherParty.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary">{otherParty?.name?.[0]?.toUpperCase() || 'U'}</span>
              )}
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg flex items-center gap-2">
                {otherParty?.name}
                {!isLawyer && <Shield className="w-4 h-4 text-blue-500" />}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isLawyer ? 'Vətəndaş (Müraciət edən)' : 'Hüquqşünas / Vəkil'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${statusColor}`}>
              {status}
            </span>

            {/* Accept / Reject Buttons for Lawyer */}
            {status === 'Gözləyir' && isLawyer && (
              <>
                <Button
                  onClick={() => handleUpdateStatus('İmtina edildi')}
                  variant="destructive"
                  size="sm"
                  disabled={isUpdating}
                  className="rounded-xl gap-1"
                >
                  <XCircle className="w-4 h-4" /> İmtina Et
                </Button>
                <Button
                  onClick={() => handleUpdateStatus('Qəbul edildi')}
                  size="sm"
                  disabled={isUpdating}
                  className="rounded-xl bg-green-600 hover:bg-green-700 text-white gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" /> Qəbul Et
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Collapsible Details Body */}
        <div>
          <button
            onClick={() => setDetailsOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 sm:px-6 py-3 text-sm font-semibold text-foreground hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2 text-primary">
              <FileText className="w-4 h-4" />
              Müraciətin Tam Detalları
            </span>
            {detailsOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {detailsOpen && (
            <div className="px-5 sm:px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Problem Təsviri - full width */}
              <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  <FileText className="w-3.5 h-3.5" />
                  Problemin Təsviri
                </div>
                <p className="text-foreground leading-relaxed text-sm whitespace-pre-wrap">
                  {consultation.problem_description || "—"}
                </p>
              </div>

              {/* Müraciət tarixi */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Müraciət Tarixi
                </div>
                <p className="text-foreground font-medium text-sm">{formattedDate}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{formattedTime}</p>
              </div>

              {/* Təklif edilən vaxt */}
              {(preferredDate || preferredTime) && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    <Clock className="w-3.5 h-3.5" />
                    Təklif Edilən Vaxt
                  </div>
                  {preferredDate && <p className="text-foreground font-medium text-sm">{preferredDate}</p>}
                  {preferredTime && <p className="text-muted-foreground text-xs mt-0.5">Saat: {preferredTime}</p>}
                </div>
              )}

              {/* Müraciətin ID-si */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  <User className="w-3.5 h-3.5" />
                  Müraciət ID
                </div>
                <p className="text-foreground font-mono text-xs break-all">{consultation.id}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Chat Panel ── */}
      <div className="flex flex-col h-[500px] bg-white/70 dark:bg-card/40 backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl">
        
        {/* Chat Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Mesajlar</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg, i) => {
            const isMine = msg.sender_id === currentUserId
            return (
              <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                  isMine 
                    ? 'bg-primary text-white rounded-br-sm' 
                    : 'bg-slate-100 dark:bg-slate-800 text-foreground rounded-bl-sm border border-slate-200 dark:border-white/10'
                }`}>
                  <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                  <div className={`text-[10px] mt-2 text-right ${isMine ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })}
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm flex-col gap-3 opacity-70">
              <MessageSquare className="w-10 h-10" />
              <p>Hələ heç bir mesaj yoxdur.</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 sm:p-5 bg-white/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-white/10">
          {status === 'Qəbul edildi' ? (
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <Input 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Mesajınızı yazın..." 
                className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/10 h-12"
              />
              <Button type="submit" disabled={!newMessage.trim()} className="rounded-xl h-12 px-6 bg-primary hover:bg-primary/90 text-white">
                <Send className="w-5 h-5" />
              </Button>
            </form>
          ) : (
            <div className="text-center text-muted-foreground text-sm flex items-center justify-center gap-2 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
              <AlertTriangle className="w-4 h-4" />
              {status === 'Gözləyir' 
                ? 'Mesajlaşmaq üçün vəkilin konsultasiyanı qəbul etməsi lazımdır.' 
                : 'Bu konsultasiya aktiv deyil.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
