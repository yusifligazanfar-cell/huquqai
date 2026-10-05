"use client"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'

import { useState, useRef, useEffect } from "react"
import { Send, Paperclip, Scale, Bot, Loader2, FileText, Settings, Key, AlertCircle, CheckCircle2, Cpu, Globe, Zap, ChevronDown, Download, PlusCircle, Edit3, Check, Copy, Lock, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"

import { generatePetitionResponse, getDocumentByTitle } from "@/app/actions/petition"
import { useAuth } from "@/context/AuthContext"
import { createClient } from '@/utils/supabase/client'

const INITIAL_MESSAGES = [
  {
    id: 1,
    role: "assistant",
    content: "Salam! Mən LexAZ Elektron Ərizə köməkçisiyəm. Hansı quruma və ya nə barədə ərizə (və ya şikayət) yazmaq istəyirsiniz? Zəhmət olmasa, qısaca mövzunu deyin, mən sizə ardıcıl suallar verərək ərizənizi peşəkar şəkildə tərtib edəcəyəm.",
    citations: [] as string[]
  }
]

function InlineCitation({ title }: { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!isOpen && !content) {
      setLoading(true);
      try {
        const doc = await getDocumentByTitle(title);
        if (doc) {
          setContent(doc.content);
        } else {
          setContent("Bu maddənin tam mətni məlumat bazasında tapılmadı.");
        }
      } catch (e) {
        setContent("Sistem xətası.");
      }
      setLoading(false);
    }
    setIsOpen(!isOpen);
  }

  return (
    <div className="w-full mt-2">
      <button 
        onClick={toggle}
        className="flex w-full items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/60 border border-border/50 rounded-xl text-[13px] font-medium text-foreground/80 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 text-left">
          <FileText className="h-4 w-4 shrink-0 text-primary/70" />
          <span>{title}</span>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-5 mt-2 bg-card/60 backdrop-blur-md border border-border/50 rounded-xl text-[14px] leading-relaxed text-foreground/90 whitespace-pre-line shadow-inner max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin" /> Yüklənir...
                </div>
              ) : (
                content
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function PetitionPage() {
  const { supabaseUser, isLoggedIn, isLoaded } = useAuth()
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [keySaved, setKeySaved] = useState(false)
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [editingPetitionId, setEditingPetitionId] = useState<string | number | null>(null)
  const [editedContents, setEditedContents] = useState<{ [key: string]: string }>({})
  const [copiedId, setCopiedId] = useState<string | number | null>(null)

  useEffect(() => {
    // Load API Key from local storage on mount
    const savedKey = localStorage.getItem('lexaz_groq_api_key')
    if (savedKey) {
      setApiKey(savedKey)
      setApiKeyInput(savedKey)
    }
  }, [])

  useEffect(() => {
    const fetchHistory = async () => {
      if (!supabaseUser) return;
      const supabase = createClient()
      
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', supabaseUser.id)
        .eq('type', 'petition')
        .order('created_at', { ascending: false })
        .limit(1)

      if (convs && convs.length > 0) {
        const cid = convs[0].id
        setConversationId(cid)
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', cid)
          .order('created_at', { ascending: true })
          
        if (msgs && msgs.length > 0) {
          setMessages(msgs)
        } else {
          setMessages(INITIAL_MESSAGES)
        }
      } else {
        setMessages(INITIAL_MESSAGES)
      }
      setHasLoadedHistory(true)
    }

    if (supabaseUser && !hasLoadedHistory) {
      fetchHistory()
    }
  }, [supabaseUser, hasLoadedHistory])

  const saveApiKey = () => {
    localStorage.setItem('lexaz_groq_api_key', apiKeyInput.trim())
    setApiKey(apiKeyInput.trim())
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 3000)
  }

  const downloadPDF = (id: string | number) => {
    const element = document.getElementById(`petition-${id}`);
    if (!element) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Zəhmət olmasa, pop-up pəncərələrə icazə verin.");
      return;
    }
    
    const htmlContent = element.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>LexAZ Ərizə</title>
          <style>
            body { 
              font-family: "Times New Roman", Times, serif; 
              padding: 2cm; 
              line-height: 1.6; 
              font-size: 14pt; 
              color: black;
              background: white;
            }
            .content { max-width: 21cm; margin: 0 auto; }
            h1, h2, h3, h4 { text-align: center; font-weight: bold; margin-bottom: 15px; }
            p { margin-bottom: 12px; }
            @media print {
              @page { margin: 0; }
              body { padding: 2cm; }
            }
          </style>
        </head>
        <body>
          <div class="content">
            ${htmlContent}
          </div>
          <scr` + `ipt>
            window.onload = function() { 
              window.focus(); 
              setTimeout(function() { window.print(); window.close(); }, 250);
            }
          </scr` + `ipt>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const downloadWord = (id: string | number) => {
    const element = document.getElementById(`petition-${id}`);
    if (!element) return;
    
    const htmlContent = element.innerHTML;
    
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body style='font-family: \"Times New Roman\", Times, serif; font-size: 14pt; padding: 2cm;'>";
    const footer = "</body></html>";
    const sourceHTML = header + htmlContent + footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = 'LexAZ-Erize.doc';
    fileDownload.click();
    document.body.removeChild(fileDownload);
  }

  const copyPetition = (id: string | number, text: string) => {
    const cleanText = text.replace("[ƏRİZƏ]", "").trim();
    navigator.clipboard.writeText(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  const toggleEditPetition = (msgId: string | number, currentContent: string) => {
    if (editingPetitionId === msgId) {
      // Save changes back to message
      const updatedText = editedContents[msgId] !== undefined ? editedContents[msgId] : currentContent;
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: updatedText.startsWith("[ƏRİZƏ]") ? updatedText : `[ƏRİZƏ]\n${updatedText}` } : m));
      setEditingPetitionId(null);
    } else {
      if (editedContents[msgId] === undefined) {
        setEditedContents(prev => ({ ...prev, [msgId]: currentContent.replace("[ƏRİZƏ]", "").trim() }));
      }
      setEditingPetitionId(msgId);
    }
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading]);

  const triggerAIResponse = async (userQuery: string, currentHistory: any[]) => {
    setIsLoading(true)
    const supabase = createClient()
    let cid = conversationId

    try {
      if (!cid && supabaseUser) {
        const { data: convData } = await supabase
          .from('conversations')
          .insert({ user_id: supabaseUser.id, type: 'petition', title: userQuery.substring(0, 50) })
          .select('id')
          .single()
        
        if (convData) {
          cid = convData.id
          setConversationId(cid)
          
          // İlk default mesajı da yazaq DB-yə
          await supabase.from('messages').insert([
            { conversation_id: cid, role: 'assistant', content: INITIAL_MESSAGES[0].content, citations: [] },
            { conversation_id: cid, role: 'user', content: userQuery, citations: [] }
          ])
        }
      } else if (cid && supabaseUser) {
        await supabase.from('messages').insert({
          conversation_id: cid,
          role: 'user',
          content: userQuery,
          citations: []
        })
      }

      // Filter out the initial greeting, and keep the last 30 messages for context
      const llmHistory = currentHistory
        .filter(m => m.id !== 1)
        .slice(-30)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await generatePetitionResponse(userQuery, apiKey, llmHistory)
      
      const newMsg = {
        id: Date.now().toString(),
        role: "assistant",
        content: response.content,
        citations: response.citations
      }
      
      if (cid) {
        await supabase.from('messages').insert({
          conversation_id: cid,
          role: 'assistant',
          content: response.content,
          citations: response.citations
        })
      }

      setMessages(prev => [...prev, newMsg])
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: "Məlumatı yoxlayarkən sistem xətası baş verdi.",
        citations: []
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const query = input
    const currentHistory = [...messages]
    const tempUserMsg = { id: Date.now().toString(), role: "user", content: query, citations: [] }
    setMessages(prev => [...prev, tempUserMsg])
    setInput("")
    triggerAIResponse(query, currentHistory)
  }

  const handleReset = () => {
    if (window.confirm("Bütün söhbət tarixçəsi ekrandan silinəcək və yeni ərizəyə başlanılacaq. Əminsiniz?")) {
      setMessages(INITIAL_MESSAGES)
      setConversationId(null)
    }
  }

  // If user is loaded and not logged in, enforce login screen
  if (isLoaded && !isLoggedIn) {
    return (
      <div className="flex h-[calc(100svh-6rem)] md:h-[calc(100vh-8rem)] flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/90 dark:bg-card/60 backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 text-primary shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-3">
            Giriş etmək tələb olunur
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            Hüquqi ərizə və şikayət tərtibatçısından istifadə etmək, sənədlərinizi yadda saxlamaq və redaktə etmək üçün zəhmət olmasa hesabınıza daxil olun.
          </p>
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] gap-2"
              onClick={() => window.location.href = '/login'}
            >
              <LogIn className="w-4 h-4" />
              Hesaba Daxil Ol
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => window.location.href = '/login'}
            >
              Hesabınız yoxdur? Qeydiyyatdan keçin
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100svh-6rem)] md:h-[calc(100vh-8rem)] flex-col bg-white/80 dark:bg-background/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative">


      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-white/50 dark:bg-background/40 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-[0_0_15px_rgba(234,88,12,0.4)] border border-white/10">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">LexAZ Ərizə/Şikayət Tərtibatçısı</h2>
          </div>
        </div>
        
        <Button onClick={handleReset} variant="outline" size="sm" className="gap-2 bg-slate-50 dark:bg-secondary/50 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-secondary/80 text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400">
          <PlusCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Yeni Söhbət</span>
        </Button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 z-10">
        <div className="max-w-4xl mx-auto space-y-8 pb-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
                className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <Avatar className={`h-10 w-10 border shadow-sm ${msg.role === "user" ? "border-primary/20 ring-2 ring-primary/10" : "border-slate-200 dark:border-white/10"}`}>
                  {msg.role === "user" ? (
                    <AvatarFallback className="bg-primary text-white font-medium text-xs">Siz</AvatarFallback>
                  ) : (
                    <AvatarFallback className="bg-card">
                      <Bot className="h-5 w-5 text-primary" />
                    </AvatarFallback>
                  )}
                </Avatar>



                <div className={`flex flex-col gap-2 max-w-[85%] md:max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className="flex flex-col gap-2">
                    {msg.role === "assistant" && msg.content.includes("[ƏRİZƏ]") ? (
                      <div className="flex flex-col gap-3 w-full">
                        {/* Petition Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary">
                              <Scale className="h-3.5 w-3.5" />
                              Hüquqi Ərizə Sənədi
                            </span>
                            {editingPetitionId === msg.id && (
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium animate-pulse">
                                ● Redaktə rejimi aktivdir
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              onClick={() => toggleEditPetition(msg.id, msg.content)}
                              variant={editingPetitionId === msg.id ? "default" : "outline"}
                              size="sm"
                              className={`h-8 gap-1.5 text-xs font-semibold ${
                                editingPetitionId === msg.id
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "border-slate-300 dark:border-white/20 hover:bg-slate-200 dark:hover:bg-slate-700"
                              }`}
                            >
                              {editingPetitionId === msg.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  Yadda saxla
                                </>
                              ) : (
                                <>
                                  <Edit3 className="h-3.5 w-3.5 text-primary" />
                                  Düzəliş et (Edit)
                                </>
                              )}
                            </Button>

                            <Button
                              onClick={() => copyPetition(msg.id, editedContents[msg.id] ?? msg.content)}
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs border-slate-300 dark:border-white/20 hover:bg-slate-200 dark:hover:bg-slate-700"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  Kopyalandı
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" />
                                  Kopyala
                                </>
                              )}
                            </Button>

                            <Button 
                              onClick={() => downloadPDF(msg.id)}
                              className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white shadow-sm"
                              size="sm"
                            >
                              <Download className="h-3.5 w-3.5" />
                              PDF
                            </Button>
                            <Button 
                              onClick={() => downloadWord(msg.id)}
                              className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                              size="sm"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Word
                            </Button>
                          </div>
                        </div>

                        {/* Petition Body (Editable Textarea vs Rendered Sheet) */}
                        {editingPetitionId === msg.id ? (
                          <div className="relative w-full">
                            <textarea
                              value={editedContents[msg.id] ?? msg.content.replace("[ƏRİZƏ]", "").trim()}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditedContents(prev => ({ ...prev, [msg.id]: val }));
                              }}
                              rows={20}
                              className="w-full p-6 text-sm md:text-base font-serif leading-relaxed bg-white text-slate-900 border-2 border-primary/40 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[450px]"
                              placeholder="Ərizə mətnində istədiyiniz düzəlişi edin..."
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              * Düzəlişləri bitirdikdən sonra yuxarıdakı <strong>"Yadda saxla"</strong> düyməsinə klikləyin.
                            </p>
                          </div>
                        ) : (
                          <div 
                            id={`petition-${msg.id}`}
                            className="bg-white text-black rounded-xl max-w-[21cm] min-h-[15cm] shadow-[0_10px_40px_rgba(0,0,0,0.12)] prose prose-sm max-w-none font-serif p-8 md:p-12 border border-slate-300 dark:border-slate-700 focus:outline-none"
                          >
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]} 
                              rehypePlugins={[
                                rehypeRaw, 
                                [rehypeSanitize, {
                                  ...defaultSchema,
                                  attributes: {
                                    ...defaultSchema.attributes,
                                    '*': ['className', 'align', 'style']
                                  }
                                }]
                              ]}
                            >
                              {editedContents[msg.id] ?? msg.content.replace("[ƏRİZƏ]", "").trim()}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div 
                        className={`px-5 py-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                          msg.role === "user" 
                            ? "bg-primary text-white rounded-tr-sm shadow-[0_4px_15px_rgba(234,88,12,0.3)]" 
                            : "bg-orange-50 dark:bg-card/90 backdrop-blur-md border border-orange-200 dark:border-white/5 rounded-tl-sm prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-secondary/50 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.1)] text-orange-950 dark:text-foreground"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <div className="whitespace-pre-line">{msg.content}</div>
                        ) : (
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]} 
                            rehypePlugins={[
                              rehypeRaw, 
                              [rehypeSanitize, {
                                ...defaultSchema,
                                ...defaultSchema,
                                attributes: {
                                  ...defaultSchema.attributes,
                                  '*': ['className', 'align', 'style']
                                }
                              }]
                            ]}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        )}
                      </div>
                    )}
                  </div>

                  {msg.citations && msg.citations.length > 0 && !msg.content.includes("[ƏRİZƏ]") && (
                    <div className="flex flex-col gap-2 mt-2 w-full pt-2">
                      {msg.citations.map((cite: string, i: number) => (
                        <InlineCitation key={i} title={cite} />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4"
            >
              <Avatar className="h-10 w-10 border border-slate-200 dark:border-white/10 shadow-sm">
                <AvatarFallback className="bg-card">
                  <Bot className="h-5 w-5 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="px-5 py-4 rounded-2xl bg-orange-50 dark:bg-card/90 backdrop-blur-md border border-orange-200 dark:border-white/5 rounded-tl-sm flex items-center gap-3 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium text-muted-foreground animate-pulse">LexAZ analiz edir...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 border-t border-slate-200 dark:border-white/5 bg-white/80 dark:bg-background/60 backdrop-blur-xl z-10 relative">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center">
          <Button type="button" variant="ghost" size="icon" className="absolute left-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full h-10 w-10 transition-colors">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Cavabınızı bura yazın..." 
            className="w-full pl-6 pr-14 py-6 md:pl-14 md:pr-14 md:py-7 rounded-[2rem] md:rounded-full bg-slate-50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-primary/40 focus-visible:border-primary/50 text-[15px] shadow-inner transition-all text-foreground"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || isLoading}
            className="absolute right-2 rounded-full h-11 w-11 bg-primary text-white hover:opacity-90 shadow-[0_4px_15px_rgba(234,88,12,0.4)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send className="h-5 w-5 ml-1" />
          </Button>
        </form>
        <p className="text-xs text-center text-muted-foreground py-3 bg-white/50 dark:bg-background/50 border-t border-slate-200 dark:border-white/5 backdrop-blur-xl">
          LexAZ səhv edə bilər. Vacib məlumatları yoxlayın.
        </p>
      </div>
    </div>
  )
}
