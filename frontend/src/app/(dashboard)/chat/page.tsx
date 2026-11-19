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
import { generatePetitionResponse, generateStructuredLegalDocument } from "@/app/actions/petition"
import { useAuth } from "@/context/AuthContext"
import { createClient } from '@/utils/supabase/client'
import { useSearchParams } from 'next/navigation'
import { CORE_DOCUMENT_TYPES, DOCUMENT_TYPE_MAP, type DocumentTypeId, type LegalDocumentFormInput } from "@/lib/legal-documents"
import { DocumentCreatorForm } from "@/components/documents/DocumentCreatorForm"
import { DocumentIcon } from "@/components/documents/DocumentIcon"
import { DocumentResultSheet } from "@/components/documents/DocumentResultSheet"

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
  const [docModalOpen, setDocModalOpen] = useState(false)
  const [docModalType, setDocModalType] = useState<DocumentTypeId>("petition")
  const [docModalInitialFacts, setDocModalInitialFacts] = useState("")
  const [docModalContext, setDocModalContext] = useState("")
  const [docModalSources, setDocModalSources] = useState<{ title: string; articleNumber?: string; content: string }[]>([])
  const [docModalSessionKey, setDocModalSessionKey] = useState(0)
  const [isGeneratingModalDoc, setIsGeneratingModalDoc] = useState(false)
  const [docModalError, setDocModalError] = useState("")
  const recognitionRef = useRef<any>(null)
  const textareaRef1 = useRef<HTMLTextAreaElement>(null)
  const textareaRef2 = useRef<HTMLTextAreaElement>(null)

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

  const openDocModal = (type: DocumentTypeId, assistantMsg?: any) => {
    const idx = assistantMsg ? messages.findIndex((m) => m.id === assistantMsg.id) : messages.length - 1
    let lastUserPrompt = ""
    for (let i = (idx >= 0 ? idx : messages.length - 1); i >= 0; i--) {
      if (
        messages[i]?.role === "user" &&
        messages[i]?.content &&
        !messages[i].content.startsWith("Bu məsələ ilə bağlı")
      ) {
        lastUserPrompt = messages[i].content
        break
      }
    }
    const sources = Array.isArray(assistantMsg?.sources)
      ? assistantMsg.sources
          .filter((s: any) => s && (s.title || s.content))
          .map((s: any) => ({
            title: String(s.title || ""),
            articleNumber: s.articleNumber ? String(s.articleNumber) : undefined,
            content: String(s.content || ""),
          }))
      : []

    setDocModalType(type)
    setDocModalInitialFacts(lastUserPrompt)
    setDocModalContext(typeof assistantMsg?.content === "string" ? assistantMsg.content : "")
    setDocModalSources(sources)
    setDocModalError("")
    setDocModalSessionKey((k) => k + 1)
    setDocModalOpen(true)
  }

  const handleGenerateModalDocument = async (formInput: LegalDocumentFormInput) => {
    setIsGeneratingModalDoc(true)
    setDocModalError("")
    const spec = DOCUMENT_TYPE_MAP[formInput.docType] || DOCUMENT_TYPE_MAP.petition

    try {
      const res = await generateStructuredLegalDocument(formInput, apiKey)
      if (res.error) {
        setDocModalError(res.error)
        return
      }

      const userSummary = `${spec.title} hazırlayın (${formInput.party1})`
      const userMsgId = Date.now()
      const assistantMsgId = Date.now() + 1

      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", content: userSummary },
        {
          id: assistantMsgId,
          role: "assistant",
          content: res.text,
          structuredDoc: res.structuredDoc,
          docType: formInput.docType,
          docTitle: spec.title,
          docSlug: spec.slug,
          resolvedCourt: res.resolvedCourt,
          provider: res.provider,
          educationalOnly: spec.educationalOnly,
          isTyping: false,
          citations: [],
        },
      ])
      setIsPetitionMode(false)
      setDocModalOpen(false)

      if (supabaseUser && conversationId) {
        try {
          const supabase = createClient()
          await supabase.from("messages").insert([
            { conversation_id: conversationId, role: "user", content: userSummary },
            { conversation_id: conversationId, role: "assistant", content: res.text },
          ])
        } catch (dbErr) {
          console.warn("Chat modal document DB save skipped:", dbErr)
        }
      }
    } catch (err) {
      console.error("Chat modal document error:", err)
      setDocModalError("Sənəd hazırlanarkən gözlənilməz xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.")
    } finally {
      setIsGeneratingModalDoc(false)
    }
  }

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
        .slice(isPetitionMode ? -30 : -10)
        .map((m) => ({ role: m.role, content: m.content }));

      const lowerQ = userQuery.toLowerCase().trim();
      const wordCount = lowerQ.split(/\s+/).filter(Boolean).length;
      // Azerbaijani-safe word boundary (JS \b treats ə, ı, ö, ü, ğ, ş, ç as non-word characters, which previously caused "yaz" to match "yazışmalarını" and "hazırla" to match "hazırlandığı"!)
      const azStart = "(?:^|[\\s.,;:!?()\"«»'])";
      const azEnd = "(?=$|[\\s.,;:!?()\"«»'])";
      const docNounPat = "(?:ərizə|erize|iddia\\s+ərizəsi|iddia\\s+erizesi|şikayət\\s+ərizəsi|sikayet\\s+erizesi|müqavilə|muqavile|vəsatət|vesatet|etiraz\\s+ərizəsi|apellyasiya\\s+şikayəti|kassasiya\\s+şikayəti|etibarnamə|etibarname|pretenziya)";
      const cmdVerbPat = "(?:yaz|yazın|yazaq|hazırla|hazirla|hazırlayın|hazirlayin|tərtib\\s+et|tertib\\s+et|tərtib\\s+edin|formalasdir|formalaşdır)";
      const directDocCommandRe = new RegExp(
        `(?:${azStart}${docNounPat}[\\s\\S]{0,24}${azStart}${cmdVerbPat}${azEnd}|${azStart}${cmdVerbPat}[\\s\\S]{0,20}${azStart}${docNounPat}${azEnd})`,
        "i"
      );

      const hasLegalQuestionSignal =
        /\?/.test(userQuery) ||
        /(?:^|\n)\s*suallar?\s*:/i.test(userQuery) ||
        /(?:hansı hallarda|cinayət tərkibi|hüquqi tövsif|necə bölünür|nə qədərdir|cəriməsi nə|olarmı|bilərmi|məsuliyyət daşıyır|təsir göstərir|hüquqi qiymət)/i.test(lowerQ);

      // Only treat as an explicit document-drafting request when it is NOT a legal analysis question / kazus
      // (or when a short <= 22-word message directly commands drafting a document)
      const tailSlice = lowerQ.slice(-90);
      const explicitPetitionRequest =
        !hasLegalQuestionSignal &&
        wordCount <= 28 &&
        directDocCommandRe.test(tailSlice);

      const looksLikeStandaloneQuestion =
        hasLegalQuestionSignal ||
        wordCount > 35;

      if (isPetitionMode && looksLikeStandaloneQuestion) {
        setIsPetitionMode(false);
      }
      const isPetitionIntent =
        explicitPetitionRequest || (isPetitionMode && !looksLikeStandaloneQuestion);

      const detectDocTypeFromQuery = (q: string): DocumentTypeId => {
        const patterns: [RegExp, DocumentTypeId][] = [
          [/\b(?:etibarnamə|etibarname)\b/i, "power-of-attorney"],
          [/\b(?:pretenziya)\b/i, "pretension"],
          [/\b(?:barışıq|barisiq|saziş|sazis)\b/i, "settlement"],
          [/\b(?:icra məmur|icra memur)\b/i, "enforcement-complaint"],
          [/\b(?:inzibati iddia)\b/i, "admin-claim"],
          [/\b(?:konstitusiya şikayət|konstitusiya sikayet)\b/i, "constitutional-complaint"],
          [/\b(?:vəkil sorğu|vekil sorgu)\b/i, "attorney-inquiry"],
          [/\b(?:məhkəmə çıxış|mehkeme cixis|nitq)\b/i, "court-speech"],
          [/\b(?:hüquqi rəy|huquqi rey)\b/i, "legal-opinion"],
          [/\b(?:məzuniyyət|mezuniyyet|işdən azad|isden azad|əmək|emek)\b/i, "labor-document"],
          [/\b(?:müqavilə|muqavile)\b/i, "contract"],
          [/\b(?:apellyasiya)\b/i, "appeal"],
          [/\b(?:kassasiya|ali məhkəmə|ali mehkeme)\b/i, "cassation"],
          [/\b(?:vəsatət|vesatet)\b/i, "motion"],
          [/\b(?:etiraz)\b/i, "objection"],
          [/\b(?:qərar|qerar)\b/i, "qarar"],
        ];
        return patterns.find(([rx]) => rx.test(q))?.[1] || "petition";
      };

      const isBareDocCommand =
        !isPetitionMode &&
        explicitPetitionRequest &&
        userQuery.trim().split(/\s+/).length <= 10 &&
        !/\d{2,}/.test(userQuery);

      let response;
      if (isBareDocCommand) {
        const prevAssistant = [...messages]
          .reverse()
          .find((m) => m.role === "assistant" && m.content && !m.content.includes("[ƏRİZƏ]"));
        openDocModal(detectDocTypeFromQuery(lowerQ), prevAssistant);
        response = {
          content:
            "Sənəd hazırlama forması açıldı. İstədiyiniz sənəd növünü seçib məlumatları qeyd edin — təsdiq etdiyiniz anda tam sənəd hazırlanacaq.",
          citations: [],
        };
      } else if (isPetitionIntent) {
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
        audit_verified: Boolean((response as any).audit_verified),
        follow_ups: Array.isArray((response as any).follow_ups) ? (response as any).follow_ups : [],
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
                      <div className="w-full max-w-4xl">
                        <DocumentResultSheet
                          title={msg.docTitle || "Rəsmi Hüquqi Sənəd"}
                          slug={msg.docSlug || "huquqi-sened"}
                          content={msg.content}
                          structuredDoc={msg.structuredDoc}
                          resolvedCourt={msg.resolvedCourt}
                          provider={msg.provider}
                          educationalOnly={msg.educationalOnly}
                          onContentChange={(nextText, nextDoc) =>
                            setMessages((prev) =>
                              prev.map((m) =>
                                m.id === msg.id
                                  ? { ...m, content: nextText, ...(nextDoc ? { structuredDoc: nextDoc } : {}) }
                                  : m
                              )
                            )
                          }
                        />
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
                            <div className="flex items-center justify-between gap-2 mt-2">
                              {msg.audit_verified ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2.5 py-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Rəsmi mənbə ilə yoxlanıldı
                                </span>
                              ) : (
                                <span />
                              )}
                              <div className="opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <TTSButton text={msg.content} />
                              </div>
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

                  {msg.role === "assistant" && Array.isArray(msg.follow_ups) && msg.follow_ups.length > 0 && !msg.content.includes("[ƏRİZƏ]") && (
                    <div className="mt-2.5 flex flex-col gap-1.5 w-full">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Bu mövzu üzrə davam sualları
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.follow_ups.map((fq: string, fIdx: number) => (
                          <button
                            key={`${msg.id}-fq-${fIdx}`}
                            type="button"
                            disabled={isLoading}
                            onClick={() => {
                              const currentHistory = [...messages]
                              const tempUserMsg = { id: Date.now().toString(), role: "user", content: fq, citations: [] }
                              setMessages(prev => [...prev, tempUserMsg])
                              triggerAIResponse(fq, currentHistory)
                            }}
                            className="inline-flex items-center gap-1.5 text-left text-xs font-medium px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/80 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 border border-slate-200 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500/40 text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors disabled:opacity-50"
                          >
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">↳</span>
                            <span>{fq}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.role === "assistant" && !msg.isTyping && msg.content && !isPetitionMode && !msg.content.includes("[ƏRİZƏ]") && (
                    <div className="mt-3 p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 flex flex-col gap-3 w-full shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="text-sm font-extrabold text-slate-950 dark:text-white">
                            Bu məsələ ilə bağlı ərizə və ya sənəd hazırlamaq istəyirsiniz?
                          </span>
                          <span className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                            Lazım olan sənəd növünü seçin, məlumatları qeyd edin — dərhal tam sənəd formalaşdırılsın.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openDocModal("petition", msg)}
                          disabled={isLoading}
                          className="inline-flex items-center justify-center min-h-11 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                          Bütün 19 sənəd növü
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {CORE_DOCUMENT_TYPES.map((docTypeItem) => (
                          <button
                            key={docTypeItem.id}
                            type="button"
                            onClick={() => openDocModal(docTypeItem.id, msg)}
                            disabled={isLoading}
                            className="flex items-start gap-2.5 min-h-12 p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                          >
                            <span
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border shrink-0 mt-0.5 ${docTypeItem.accentClass}`}
                            >
                              <DocumentIcon name={docTypeItem.iconName} className="w-4 h-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-extrabold text-slate-950 dark:text-white leading-snug">
                                {docTypeItem.title}
                              </span>
                              <span className="block text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-tight mt-0.5">
                                {docTypeItem.description}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
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

      <Dialog open={docModalOpen} onOpenChange={setDocModalOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="sr-only">
            <DialogTitle>{DOCUMENT_TYPE_MAP[docModalType]?.title || "Sənəd Tərtibatçısı"}</DialogTitle>
            <DialogDescription>
              Məlumatları qeyd edin və rəsmi hüquqi sənəd hazırlayın.
            </DialogDescription>
          </DialogHeader>
          <DocumentCreatorForm
            key={`${docModalType}-${docModalSessionKey}`}
            docType={docModalType}
            onDocTypeChange={setDocModalType}
            allowDocTypeSwitch
            initialFacts={docModalInitialFacts}
            chatContext={docModalContext}
            legalArticles={docModalSources}
            isSubmitting={isGeneratingModalDoc}
            onGenerate={handleGenerateModalDocument}
            submitError={docModalError}
          />
        </DialogContent>
      </Dialog>
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
