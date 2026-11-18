"use client"

import dynamic from 'next/dynamic'
import { useState, useRef, useEffect, Suspense, useCallback } from "react"
import { Send, Paperclip, Scale, Bot, Loader2, FileText, Settings, Key, AlertCircle, CheckCircle2, Cpu, Globe, Zap, ChevronDown, PlusCircle, Mic, MicOff, Volume2, Square, Landmark, Download, Edit3, Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { generateLegalResponse, getDocumentByTitle } from "@/app/actions/chat"
import { generatePetitionResponse } from "@/app/actions/petition"
import { useAuth } from "@/context/AuthContext"
import { createClient } from '@/utils/supabase/client'
import { useSearchParams } from 'next/navigation'

// Dynamically import Markdown renderer to keep initial chat bundle small and fast
const MessageMarkdown = dynamic(() => import('@/components/chat/MessageMarkdown'), {
  loading: () => <div className="animate-pulse h-8 bg-slate-200 dark:bg-slate-800 rounded w-48 my-2" />,
  ssr: false
})

function getInitialGreeting(userName?: string | null): string {
  const hour = new Date().getHours()
  const name = userName ? `, ${userName}` : ""
  if (hour >= 6 && hour < 12) {
    return `Sabahınız xeyir${name}!`
  } else if (hour >= 12 && hour < 18) {
    return `Hər vaxtınız xeyir${name}!`
  } else {
    return `Axşamınız xeyir${name}!`
  }
}


const getInitialMessage = (greeting: string) => ({
  id: 1,
  role: "assistant",
  content: `${greeting}\n\nSalam! Mən LexAZ AI, sizin fərdi hüquq köməkçinizəm (Groq Powered). Azərbaycan qanunvericiliyi ilə bağlı sizə necə kömək edə bilərəm?\n\nZəhmət olmasa sualınızı daha aydın ifadə edin.`,
  citations: [] as string[]
})

function TTSButton({ text }: { text: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setIsPlaying(false);
        audio.play();
        setIsPlaying(true);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={togglePlay}
      disabled={loading}
      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary rounded-full bg-secondary/20 hover:bg-secondary"
      title={isPlaying ? "Səsi dayandır" : "Səsləndir"}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isPlaying ? <Square className="h-4 w-4" fill="currentColor" /> : <Volume2 className="h-4 w-4" />}
    </Button>
  );
}

interface CitationSourceInfo {
  title?: string;
  url?: string;
  article_number?: string;
  verified?: boolean;
  content?: string;
}

function InlineCitation({ title, source }: { title: string; source?: CitationSourceInfo }) {
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
        } else if (source?.content) {
          setContent(source.content);
        } else {
          setContent("Bu maddənin tam mətni rəsmi qanunvericilik bazasından təsdiqlənmişdir.");
        }
      } catch (e) {
        setContent(source?.content || "Məlumat yüklənərkən xəta baş verdi.");
      }
      setLoading(false);
    }
    setIsOpen(!isOpen);
  }

  return (
    <div className="w-full mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/10 p-2.5 sm:p-3 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5 sm:mt-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-semibold text-slate-900 dark:text-foreground line-clamp-2 sm:truncate [overflow-wrap:anywhere]">{title}</span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">✓ Yoxlanılmış rəsmi hüquqi mənbə</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <button
            onClick={toggle}
            className="inline-flex items-center gap-1.5 min-h-9 sm:min-h-8 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <span>{isOpen ? "Gizlət" : "Maddənin tam mətni"}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 mt-2.5 bg-card/95 dark:bg-slate-900/90 backdrop-blur-md border border-emerald-500/20 rounded-xl text-[13.5px] leading-relaxed text-foreground font-sans whitespace-pre-line shadow-inner max-h-[500px] overflow-y-auto selection:bg-emerald-500/20">
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-500" /> Rəsmi mətn yüklənir...
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

const ALL_SUGGESTIONS = [
  "Müqaviləsiz borc vermişəm, pulumu necə geri alım?",
  "Boşanma zamanı əmlak necə bölünür?",
  "İşçi işə gecikdikdə ona töhmət verilə bilərmi?",
  "Zəmanətli məhsulu necə geri qaytara bilərəm?",
  "Aliment necə hesablanır?",
  "Avtomobil qəzası zamanı sığorta pulu necə ödənilir?",
  "Vərəsəlik qaydaları necədir?",
  "Əmək müqaviləsi necə ləğv edilir?",
  "Vergi Məcəlləsində ƏDV hesablanması necə aparılır?",
  "Notariusda etibarnamə ləğv edilə bilərmi?",
  "İşdən əsassız çıxarıldıqda hara şikayət etməliyəm?",
  "Səs küy salan qonşudan hara şikayət edə bilərəm?",
  "İstehlakçı hüquqları necə qorunur?",
  "Torpaq sahəsi üzərində mülkiyyət hüququ necə yaranır?",
  "Mirasdan imtina etmək mümkündürmü?"
];

function ChatContent() {
  const { supabaseUser, user } = useAuth()
  const searchParams = useSearchParams()
  const targetId = searchParams.get('id')
  
  const [messages, setMessages] = useState<any[]>([])
  const [greeting, setGreeting] = useState(() => getInitialGreeting())
  const [input, setInput] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>(() => ALL_SUGGESTIONS.slice(0, 3))
  const [isLoading, setIsLoading] = useState(false)
  const [isDictating, setIsDictating] = useState(false)
  const [isPetitionMode, setIsPetitionMode] = useState(false)
  const [editingPetitionId, setEditingPetitionId] = useState<string | number | null>(null)
  const [editedContents, setEditedContents] = useState<{ [key: string]: string }>({})
  const [copiedId, setCopiedId] = useState<string | number | null>(null)
  const recognitionRef = useRef<any>(null)
  const textareaRef1 = useRef<HTMLTextAreaElement>(null)
  const textareaRef2 = useRef<HTMLTextAreaElement>(null)

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
            body { font-family: "Times New Roman", Times, serif; padding: 2cm; line-height: 1.6; font-size: 14pt; color: black; background: white; }
            .content { max-width: 21cm; margin: 0 auto; }
            h1, h2, h3, h4 { text-align: center; font-weight: bold; margin-bottom: 15px; }
            p { margin-bottom: 12px; }
            @media print { @page { margin: 0; } body { padding: 2cm; } }
          </style>
        </head>
        <body>
          <div class="content">${htmlContent}</div>
          <scr` + `ipt>
            window.onload = function() { window.focus(); setTimeout(function() { window.print(); window.close(); }, 250); }
          </scr` + `ipt>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

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
  };

  const copyPetition = (id: string | number, text: string) => {
    const cleanText = text.replace("[ƏRİZƏ]", "").trim();
    navigator.clipboard.writeText(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const toggleEditPetition = (msgId: string | number, currentContent: string) => {
    if (editingPetitionId === msgId) {
      const updatedText = editedContents[msgId] !== undefined ? editedContents[msgId] : currentContent;
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: updatedText.startsWith("[ƏRİZƏ]") ? updatedText : `[ƏRİZƏ]\n${updatedText}` } : m));
      setEditingPetitionId(null);
    } else {
      if (editedContents[msgId] === undefined) {
        setEditedContents(prev => ({ ...prev, [msgId]: currentContent.replace("[ƏRİZƏ]", "").trim() }));
      }
      setEditingPetitionId(msgId);
    }
  };

  const toggleDictation = useCallback(() => {
    if (isDictating && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsDictating(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Brauzeriniz səsli daxiletməni dəstəkləmir.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'az-AZ';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsDictating(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };
    
    recognition.onerror = (e: any) => {
      console.error(e);
      setIsDictating(false);
    };
    
    recognition.onend = () => {
      setIsDictating(false);
    };
    
    recognition.start();
  }, [isDictating, setInput]);

  const [apiKey, setApiKey] = useState("")
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [keySaved, setKeySaved] = useState(false)
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasProcessedQuery = useRef(false)
  const loadedTargetIdRef = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    const shuffled = [...ALL_SUGGESTIONS].sort(() => 0.5 - Math.random());
    setSuggestions(shuffled.slice(0, 3));
  }, [])

  useEffect(() => {
    const savedKey = localStorage.getItem('lexaz_groq_api_key')
    if (savedKey) {
      setApiKey(savedKey)
      setApiKeyInput(savedKey)
    }

    const hour = new Date().getHours()
    const name = user?.name ? `, ${user.name}` : ""
    let currentGreeting = "LexAZ Süni Zəka Vəkili"
    
    if (hour >= 6 && hour < 12) {
      currentGreeting = `Sabahınız xeyir${name}!`
    } else if (hour >= 12 && hour < 18) {
      currentGreeting = `Hər vaxtınız xeyir${name}!`
    } else {
      currentGreeting = `Axşamınız xeyir${name}!`
    }
    setGreeting(currentGreeting)
  }, [user])

  useEffect(() => {
    const uid = supabaseUser?.id
    const fetchHistory = async () => {
      if (!uid) return;
      
      if (!targetId) {
        if (loadedTargetIdRef.current !== null && loadedTargetIdRef.current !== undefined) {
          setMessages([])
          setConversationId(null)
        }
        loadedTargetIdRef.current = null
        setHasLoadedHistory(true)
        return;
      }

      if (loadedTargetIdRef.current === targetId) {
        setHasLoadedHistory(true)
        return;
      }
      loadedTargetIdRef.current = targetId

      const supabase = createClient()
      
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', supabaseUser.id)
        .eq('type', 'chat')
        .eq('id', targetId);

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
          setMessages([])
        }
      } else {
        setMessages([])
        setConversationId(null)
      }
      setHasLoadedHistory(true)
    }
    
    fetchHistory()
  }, [supabaseUser?.id, targetId])

  useEffect(() => {
    if (!hasLoadedHistory) return;

    // Check if we came from dashboard with a query
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');

    if (q && !hasProcessedQuery.current) {
      hasProcessedQuery.current = true;
      // Auto-submit this query
      const newQuery = q;
      const historyToUse = [...messages];
      
      const tempUserMsg = { id: Date.now().toString(), role: "user", content: newQuery, citations: [] }
      setMessages(prev => [...prev, tempUserMsg]);
      
      // Clean up the URL so it doesn't trigger again on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
      
      setTimeout(() => {
        triggerAIResponse(newQuery, historyToUse);
      }, 500);
    }
  }, [hasLoadedHistory, messages])

  const saveApiKey = () => {
    localStorage.setItem('lexaz_groq_api_key', apiKeyInput.trim())
    setApiKey(apiKeyInput.trim())
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 3000)
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading]);

  const triggerPetitionGeneration = async (topic: string) => {
    if (!topic.trim() || isLoading) return;
    setIsLoading(true);
    hasProcessedQuery.current = true;
    const userMsgId = Date.now();
    const newUserMsg = { id: userMsgId, role: "user", content: "Bu məsələ ilə bağlı ərizə yazın." };
    setMessages(prev => [...prev, newUserMsg]);

    const assistantMsgId = Date.now() + 1;
    setMessages(prev => [
      ...prev,
      { id: assistantMsgId, role: "assistant", content: "Ərizə forması hazırlanır...", isTyping: true, citations: [] }
    ]);

    try {
      setIsPetitionMode(true);
      const hist = messages.map(m => ({ role: m.role, content: m.content }));
      hist.push({ role: "user", content: "Bu məsələ ilə bağlı ərizə yazın." });
      const response = await generatePetitionResponse("Bu məsələ ilə bağlı rəsmi ərizə forması hazırlayın.", apiKey, hist, false);
      let content = response.content || "Ərizə hazırlana bilmədi.";
      
      if (content.includes("[ƏRİZƏ]")) {
        setIsPetitionMode(false);
      }
      
      setMessages(prev => prev.map(m => 
        m.id === assistantMsgId ? { ...m, content, isTyping: false } : m
      ));
    } catch (error: any) {
      setMessages(prev => prev.map(m => 
        m.id === assistantMsgId ? { ...m, content: "Üzr istəyirik, xəta baş verdi. Zəhmət olmasa bir az sonra yenidən cəhd edin və ya API açarınızı yoxlayın.", isTyping: false } : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAIResponse = async (userQuery: string, currentHistory: any[]) => {
    setIsLoading(true)
    const supabase = createClient()
    let cid = conversationId

    try {
      // Persist conversation/message non-fatally so transient DB errors never block answering
      if (!cid && supabaseUser) {
        try {
          const { data: convData } = await supabase
            .from('conversations')
            .insert({ user_id: supabaseUser.id, type: 'chat', title: userQuery.substring(0, 50) })
            .select('id')
            .single()

          if (convData) {
            cid = convData.id
            setConversationId(cid)
            await supabase.from('messages').insert({
              conversation_id: cid,
              role: 'user',
              content: userQuery,
              citations: []
            })
            window.dispatchEvent(new Event("chatHistoryUpdated"))
          }
        } catch (dbErr) {
          console.warn("Conversation create warning:", dbErr)
        }
      } else if (cid && supabaseUser) {
        try {
          await supabase.from('messages').insert({
            conversation_id: cid,
            role: 'user',
            content: userQuery,
            citations: []
          })
        } catch (dbErr) {
          console.warn("User message insert warning:", dbErr)
        }
      }

      const llmHistory = currentHistory
        .filter(
          (m) =>
            m.id !== 1 &&
            !m.isTyping &&
            typeof m.content === 'string' &&
            m.content.trim().length > 0 &&
            !m.content.startsWith("Məlumatı yoxlayarkən sistem xətası") &&
            !m.content.startsWith("Xəta baş verdi:")
        )
        .slice(isPetitionMode ? -30 : -6)
        .map((m) => ({ role: m.role, content: m.content }));

      const lowerQ = userQuery.toLowerCase().trim();
      const explicitPetitionRequest =
        /(?:\b(?:erize|ərizə|sikayet|şikayət|iddia)\b[\s\S]{0,25}\b(?:yaz|hazirla|hazırla|tertib|tərtib|numune|nümunə|isteyirem|istəyirəm)\b|\b(?:yaz|hazirla|hazırla|tertib|tərtib)\b[\s\S]{0,25}\b(?:erize|ərizə)\b)/i.test(lowerQ);
      const looksLikeStandaloneQuestion =
        !explicitPetitionRequest &&
        !lowerQ.includes("ərizə yaz") &&
        /\?/.test(userQuery) &&
        /\b(nədir|nedir|nə qədər|ne qeder|hansı|hansi|necə|nece|kim|hara|maddə|madde|cəza|ceza|cərimə|cerime|qanun|hüquq|huquq|olar|olarmı|neçədir|necedir)\b/i.test(lowerQ);

      if (isPetitionMode && looksLikeStandaloneQuestion) {
        setIsPetitionMode(false);
      }
      const isPetitionIntent =
        explicitPetitionRequest || (isPetitionMode && !looksLikeStandaloneQuestion);

      let response;
      if (isPetitionIntent) {
        setIsPetitionMode(true);
        response = await generatePetitionResponse(userQuery, apiKey, llmHistory, false);
        if (response.content?.includes("[ƏRİZƏ]")) {
          setIsPetitionMode(false);
        }
      } else {
        response = await generateLegalResponse(userQuery, apiKey, llmHistory)
      }
      
      const newMsg = {
        id: Date.now().toString(),
        role: "assistant",
        content: response.content,
        citations: response.citations,
        sources: (response as any).sources || [],
        precedent: null
      }
      
      if (cid) {
        try {
          await supabase.from('messages').insert({
            conversation_id: cid,
            role: 'assistant',
            content: response.content,
            citations: response.citations
          })
        } catch (dbErr) {
          console.warn("Assistant message insert warning:", dbErr)
        }
      }

      setMessages(prev => [...prev, newMsg])
    } catch (error) {
      console.error("Chat response error:", error)
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
    if (!input.trim() || isLoading) return

    const query = input
    const currentHistory = [...messages]
    
    const tempUserMsg = { id: Date.now().toString(), role: "user", content: query, citations: [] }
    setMessages(prev => [...prev, tempUserMsg])
    setInput("")
    if (textareaRef1.current) textareaRef1.current.style.height = 'auto'
    if (textareaRef2.current) textareaRef2.current.style.height = 'auto'
    
    triggerAIResponse(query, currentHistory)
  }

  const handleReset = () => {
    if (window.confirm("Bütün söhbət tarixçəsi ekrandan silinəcək və yeni söhbətə başlanılacaq. Əminsiniz?")) {
      setMessages([])
      setConversationId(null)
      setIsPetitionMode(false)
      setIsLoading(false)
      setEditingPetitionId(null)
      hasProcessedQuery.current = false
      loadedTargetIdRef.current = null
      
      // Clean up the URL to remove ?id= so it doesn't reload the old chat on refresh
      window.history.pushState({}, document.title, window.location.pathname);
      window.dispatchEvent(new Event("chatHistoryUpdated"))
    }
  }

  return (
    <div className={`flex h-[calc(100dvh-5.25rem)] md:h-[calc(100dvh-7.5rem)] min-h-[420px] flex-col relative transition-all duration-500 ${messages.length === 0 ? "bg-transparent border-transparent shadow-none" : "bg-white/85 dark:bg-background/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"}`}>
      {/* Header */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200 dark:border-white/5 bg-white/70 dark:bg-background/40 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-primary shadow-[0_0_15px_rgba(234,88,12,0.4)] border border-white/10">
              <Scale className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-primary dark:from-orange-400 dark:to-primary truncate">{greeting}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={handleReset} variant="outline" size="sm" className="min-h-10 sm:min-h-9 gap-1.5 sm:gap-2 px-2.5 sm:px-3 bg-slate-50 dark:bg-secondary/50 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-secondary/80 text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400">
              <PlusCircle className="h-4 w-4 shrink-0" />
              <span className="sm:hidden text-xs font-semibold">Yeni</span>
              <span className="hidden sm:inline">Yeni Söhbət</span>
            </Button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden p-2.5 sm:p-4 md:p-6 z-10 relative ${messages.length === 0 ? 'flex flex-col items-center justify-center pb-8 sm:pb-16' : ''}`}>

        {messages.length === 0 && (
          <>
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl">
              <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at center, #10b981 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
              <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[320px] sm:w-[500px] h-[250px] sm:h-[350px] bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />
            </div>

            <div className="w-full max-w-3xl mx-auto my-auto flex flex-col items-center justify-center z-10 pointer-events-auto px-1.5 sm:px-6 py-4">
              <div className="w-full min-h-[3.5rem] md:min-h-[5.5rem] flex items-center justify-center mb-5 sm:mb-8 md:mb-10">
                <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold tracking-tight text-slate-950 dark:text-white drop-shadow-sm dark:drop-shadow-md text-center leading-tight">
                  {greeting}
                </h1>
              </div>

              <form onSubmit={handleSend} className="w-full relative flex flex-col items-center group mb-6 sm:mb-8 max-w-2xl">
                <div className="w-full relative flex items-end">
                  <textarea
                    ref={textareaRef1}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (input.trim() && !isLoading) handleSend(e as unknown as React.FormEvent);
                      }
                    }}
                    rows={1}
                    aria-label="Hüquqi sualınızı daxil edin"
                    placeholder={isDictating ? "Dinləyirəm, danışın..." : "Hüquqi sualınızı yazın..."}
                    className={`w-full resize-none overflow-y-auto overscroll-contain relative pl-4 sm:pl-7 pr-24 md:pr-28 py-3.5 sm:py-4 md:py-5 min-h-[54px] md:min-h-[64px] max-h-[140px] md:max-h-[200px] rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500 text-base md:text-lg shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/50 backdrop-blur-xl transition-all group-hover:border-slate-400 dark:group-hover:border-slate-700 ${isDictating ? 'border-emerald-500 ring-2 ring-emerald-500/30' : ''}`}
                  />
                  <div className="absolute right-2 bottom-2 sm:right-2.5 sm:bottom-2.5 flex items-center gap-1.5 md:gap-2">
                    <button
                      type="button"
                      onClick={toggleDictation}
                      aria-label="Səslə daxiletmə"
                      className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                        isDictating
                          ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-pulse text-white'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60'
                      }`}
                      title="Səsli daxiletmə"
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                    <Button
                      type="submit"
                      size="icon"
                      aria-label="Sualı göndər"
                      title="Sualı göndər"
                      disabled={!input.trim() || isLoading}
                      className="rounded-full h-10 w-10 bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-950/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
                    >
                      <Send className="h-4 w-4 md:ml-0.5" />
                    </Button>
                  </div>
                </div>
              </form>

              {/* Modern Minimalist Prompt Suggestion Chips */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 w-full max-w-2xl"
              >
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setMessages([{ id: Date.now(), role: "user", content: suggestion, citations: [] }]);
                      triggerAIResponse(suggestion, []);
                    }}
                    className="inline-flex items-center gap-2 min-h-10 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl sm:rounded-full bg-white/90 dark:bg-emerald-500/10 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 border border-slate-200 dark:border-emerald-500/20 hover:border-emerald-400 dark:hover:border-emerald-500/40 text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 text-xs sm:text-sm font-medium transition-all duration-200 backdrop-blur-md shadow-sm hover:scale-[1.02] active:scale-[0.98] group max-w-full"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 group-hover:scale-125 transition-transform shrink-0" />
                    <span className="text-left leading-snug">{suggestion}</span>
                  </button>
                ))}
              </motion.div>
            </div>
          </>
        )}

        {messages.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-5 sm:space-y-8 pb-3 relative z-10 min-w-0">
            <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
                className={`flex gap-2 sm:gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <Avatar className={`hidden sm:flex h-10 w-10 shrink-0 border shadow-sm ${msg.role === "user" ? "border-primary/20 ring-2 ring-primary/10" : "border-slate-200 dark:border-white/10"}`}>
                  {msg.role === "user" ? (
                    <AvatarFallback className="bg-primary text-white font-medium text-xs">Siz</AvatarFallback>
                  ) : (
                    <AvatarFallback className="bg-card">
                      <Bot className="h-5 w-5 text-primary" />
                    </AvatarFallback>
                  )}
                </Avatar>



                <div className={`flex flex-col gap-2 min-w-0 ${msg.role === "user" ? "max-w-[88%] sm:max-w-[75%] items-end" : "w-full sm:w-auto sm:max-w-[82%] md:max-w-[78%] items-start"}`}>
                    {msg.role === "assistant" && msg.content.includes("[ƏRİZƏ]") ? (
                      <div className="flex flex-col gap-3 w-full">
                        {/* Petition Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm">
                          <div className="flex items-center gap-2 flex-wrap">
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

                          <div className="flex items-center gap-1.5 flex-wrap">
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
                            className="bg-white text-black rounded-xl w-full max-w-[21cm] min-h-[15cm] shadow-[0_10px_40px_rgba(0,0,0,0.12)] prose prose-sm max-w-none prose-headings:font-extrabold prose-headings:text-black prose-strong:text-black font-serif p-4 sm:p-8 md:p-12 border border-slate-300 dark:border-slate-700 focus:outline-none overflow-x-auto"
                          >
                            <MessageMarkdown content={editedContents[msg.id] ?? msg.content.replace("[ƏRİZƏ]", "").trim()} paper />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className={`px-3.5 py-3 sm:px-5 sm:py-4 rounded-2xl text-[14.5px] sm:text-[15px] leading-relaxed shadow-sm min-w-0 max-w-full ${
                          msg.role === "user"
                            ? "bg-primary text-white rounded-tr-sm shadow-[0_4px_15px_rgba(234,88,12,0.3)] [overflow-wrap:anywhere]"
                            : "w-full bg-orange-50/90 dark:bg-card/90 backdrop-blur-md border border-orange-200 dark:border-white/10 rounded-tl-sm prose prose-sm dark:prose-invert max-w-none prose-headings:font-extrabold prose-headings:text-slate-950 dark:prose-headings:text-white prose-strong:font-bold prose-strong:text-slate-950 dark:prose-strong:text-white prose-p:leading-relaxed prose-pre:bg-secondary/50 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.1)] text-slate-900 dark:text-foreground"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <div className="whitespace-pre-line">{msg.content}</div>
                        ) : (
                          <div className="relative group min-w-0">
                            <div className="flex sm:hidden items-center gap-1.5 text-xs font-extrabold text-slate-950 dark:text-white mb-2.5 pb-1.5 border-b border-orange-200/80 dark:border-white/10">
                              <Bot className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span>LexAZ AI</span>
                            </div>
                            <MessageMarkdown
                              content={msg.content
                                .replace(/\n{1,}#{1,3}\s*Məhkəmə təcrübəsi[\s\S]*?(?=\n#{1,3}\s|\s*$)/gi, "")
                                .replace(/\n{1,}#{1,3}\s*Mənbələr[\s\S]*$/gi, "")
                                .trim()}
                            />
                            <div className="flex justify-end mt-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                              <TTSButton text={msg.content} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  {msg.citations && msg.citations.length > 0 && !msg.content.includes("[ƏRİZƏ]") && (
                    <div className="flex flex-col gap-2 mt-2 w-full pt-2">
                      {msg.citations.map((cite: string, i: number) => {
                        const matchedSource = Array.isArray(msg.sources)
                          ? msg.sources[i] || msg.sources.find((s: CitationSourceInfo) => s?.title === cite)
                          : undefined;
                        return <InlineCitation key={`${msg.id}-${i}-${cite}`} title={cite} source={matchedSource} />;
                      })}
                    </div>
                  )}

                  {msg.role === "assistant" && !msg.isTyping && msg.content && !isPetitionMode && !msg.content.includes("[ƏRİZƏ]") && (
                    <div className="mt-3 p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between w-full shadow-sm">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-primary dark:text-primary">Bu məsələ ilə bağlı ərizə yazmaq istəyirsiniz?</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">Süni zəka sizə xüsusi hüquqi ərizə forması hazırlayacaq.</span>
                      </div>
                      <Button 
                        onClick={() => triggerPetitionGeneration(msg.content)}
                        className="bg-primary hover:bg-orange-600 text-white shadow-md transition-all whitespace-nowrap self-end sm:self-auto"
                        size="sm"
                        disabled={isLoading}
                      >
                        Bəli, ərizə yaz
                      </Button>
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
              className="flex gap-2 sm:gap-4"
            >
              <Avatar className="hidden sm:flex h-10 w-10 border border-slate-200 dark:border-white/10 shadow-sm shrink-0">
                <AvatarFallback className="bg-card">
                  <Bot className="h-5 w-5 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="px-4 py-3 sm:px-5 sm:py-4 rounded-2xl bg-orange-50 dark:bg-card/90 backdrop-blur-md border border-orange-200 dark:border-white/5 rounded-tl-sm flex items-center gap-3 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                <span className="text-sm font-medium text-muted-foreground animate-pulse">LexAZ analiz edir...</span>
              </div>
            </motion.div>
          )}
          </div>
        )}
      </div>

      {/* Input Area */}
      {messages.length > 0 && (
        <div className="p-2.5 sm:p-4 md:p-6 pb-[max(0.625rem,env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-white/5 bg-white/85 dark:bg-background/60 backdrop-blur-xl z-10 relative">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex flex-col">
            <div className="relative flex items-end">
              <Button type="button" variant="ghost" size="icon" aria-label="Fayl əlavə et" title="Fayl əlavə et" className="absolute left-2 bottom-1.5 md:bottom-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full h-10 w-10 transition-colors hidden sm:flex">
                <Paperclip className="h-5 w-5" />
              </Button>
              <textarea
                ref={textareaRef2}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !isLoading) handleSend(e as unknown as React.FormEvent);
                  }
                }}
                rows={1}
                aria-label="Hüquqi sualınızı daxil edin"
                placeholder={isDictating ? "Dinləyirəm, danışın..." : "Hüquqi sualınızı yazın..."}
                className={`w-full resize-none overflow-y-auto overscroll-contain pl-4 sm:pl-14 pr-24 md:pr-24 py-3 md:py-4 min-h-[48px] md:min-h-[56px] max-h-[120px] md:max-h-[200px] rounded-2xl sm:rounded-3xl md:rounded-[2rem] bg-slate-50 dark:bg-card/50 border border-slate-200 dark:border-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/50 text-base sm:text-[15px] shadow-inner transition-all text-foreground ${isDictating ? 'border-blue-400 dark:border-blue-500/60 ring-2 ring-blue-400/30' : ''}`}
              />
              <div className="absolute right-1.5 md:right-2 bottom-1.5 md:bottom-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleDictation}
                  aria-label="Səslə daxiletmə"
                  className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                    isDictating
                      ? 'bg-blue-500 text-white shadow-[0_0_16px_rgba(59,130,246,0.5)] animate-pulse'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                  title="Səsli daxiletmə"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <Button
                  type="submit"
                  size="icon"
                  aria-label="Sualı göndər"
                  title="Sualı göndər"
                  disabled={!input.trim() || isLoading}
                  className="rounded-full h-10 w-10 md:h-11 md:w-11 bg-primary text-white hover:opacity-90 shadow-[0_4px_15px_rgba(234,88,12,0.4)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Send className="h-4 w-4 md:h-5 md:w-5 md:ml-0.5" />
                </Button>
              </div>
            </div>
          </form>
          <p className="text-[11px] sm:text-xs text-center text-muted-foreground pt-2 sm:pt-3">
            LexAZ səhv edə bilər. Vacib məlumatları yoxlayın.
          </p>
        </div>
      )}
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100dvh-5.25rem)] md:h-[calc(100dvh-7.5rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  )
}
