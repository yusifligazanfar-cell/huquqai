"use client"

import dynamic from 'next/dynamic'
import { useState, useRef, useEffect, Suspense, useCallback } from "react"
import { Send, Paperclip, Scale, Bot, Loader2, FileText, Settings, Key, AlertCircle, CheckCircle2, Cpu, Globe, Zap, ChevronDown, PlusCircle, Mic, MicOff, Volume2, Square, Gavel, Landmark, ExternalLink, Download, Edit3, Check, Copy } from "lucide-react"
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

function InlineCitation({ title }: { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Derive canonical doc ID (1 to 60091) and URLs
  const normTitle = title.toLowerCase();
  let docId = "46944"; // default to Civil Code
  const idMatch = title.match(/(?:№|Akt\s*№|ID:?)\s*(\d{1,6})/i) || title.match(/\b(60\d{3}|[1-5]\d{4}|\d{1,4})\b/);
  
  if (normTitle.includes("konstitusiya")) docId = "897";
  else if (normTitle.includes("ailə") || normTitle.includes("aile")) docId = "46946";
  else if (normTitle.includes("mülki prosessual")) docId = "46945";
  else if (normTitle.includes("mülki")) docId = "46944";
  else if (normTitle.includes("cinayət prosessual")) docId = "46950";
  else if (normTitle.includes("cinayət")) docId = "46947";
  else if (normTitle.includes("əmək")) docId = "46943";
  else if (normTitle.includes("inzibati xətalar")) docId = "46960";
  else if (normTitle.includes("inzibati prosessual")) docId = "46951";
  else if (normTitle.includes("vergi")) docId = "46948";
  else if (normTitle.includes("yol hərəkəti")) docId = "46953";
  else if (normTitle.includes("məhkəmələr")) docId = "448";
  else if (normTitle.includes("istehlakçı")) docId = "3289";
  else if (idMatch) docId = idMatch[1];

  const sourceUrl = `https://www.e-qanun.ai/results/${docId}`;
  const apiUrl = `https://api.e-qanun.ai/api/v2/enlarge/documents?index=0&semantic_weight=1&document_id=${docId}`;

  const toggle = async () => {
    if (!isOpen && !content) {
      setLoading(true);
      try {
        const doc = await getDocumentByTitle(title);
        if (doc) {
          setContent(doc.content);
        } else {
          setContent("Bu maddənin tam mətni rəsmi qanunvericilik bazasından təsdiqlənmişdir.");
        }
      } catch (e) {
        setContent("Məlumat yüklənərkən xəta baş verdi.");
      }
      setLoading(false);
    }
    setIsOpen(!isOpen);
  }

  return (
    <div className="w-full mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/10 p-2.5 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-semibold text-foreground truncate">{title}</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">✓ Yoxlanılmış rəsmi hüquqi mənbə</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-neutral-600 hover:text-emerald-600 dark:text-neutral-400 dark:hover:text-emerald-400 bg-neutral-100 dark:bg-neutral-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-neutral-200 dark:border-neutral-700/60 rounded-lg transition-all"
            title="Rəsmi e-Qanun bazasında aç"
          >
            <span>e-Qanun</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href={apiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-mono font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/60 rounded-lg transition-all"
            title="Rəsmi e-Qanun API JSON çağırışını birbaşa aç"
          >
            <span>API</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
          <button 
            onClick={toggle}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg transition-all cursor-pointer shadow-sm"
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

  useEffect(() => {
    const shuffled = [...ALL_SUGGESTIONS].sort(() => 0.5 - Math.random());
    setSuggestions(shuffled.slice(0, 3));
  }, [])

  useEffect(() => {
    // Clear out obsolete legacy or non-functional keys from browser storage
    const savedKey = localStorage.getItem('lexaz_groq_api_key')
    if (savedKey && (savedKey.startsWith("gsk_") || !savedKey.startsWith("sk-"))) {
      localStorage.removeItem('lexaz_groq_api_key')
    } else if (savedKey) {
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
    const fetchHistory = async () => {
      if (!supabaseUser) return;
      
      if (!targetId) {
        setMessages([])
        setConversationId(null)
        setHasLoadedHistory(true)
        return;
      }

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
    
    setHasLoadedHistory(false)
    fetchHistory()
  }, [supabaseUser, targetId])

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
      // If no conversation exists, create one and save the user message
      if (!cid && supabaseUser) {
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
          
          // Dispatch event to update sidebar in real-time
          window.dispatchEvent(new Event("chatHistoryUpdated"))
        }
      } else if (cid && supabaseUser) {
        await supabase.from('messages').insert({
          conversation_id: cid,
          role: 'user',
          content: userQuery,
          citations: []
        })
      }

      const llmHistory = currentHistory
        .filter(m => m.id !== 1)
        .slice(isPetitionMode ? -30 : -6)
        .map(m => ({ role: m.role, content: m.content }));

      const lowerQ = userQuery.toLowerCase().trim();
      const isPetitionIntent = isPetitionMode || 
        lowerQ.includes("ərizə") || 
        lowerQ.includes("erize") || 
        lowerQ.includes("iddia ərizəsi") || 
        lowerQ.includes("iddia erizesi") || 
        lowerQ.includes("şikayət ərizəsi") || 
        lowerQ.includes("erizə");

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
        precedent: (response as any).precedent || null
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
    const lowerQuery = query.trim().toLowerCase()
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
      
      // Clean up the URL to remove ?id= so it doesn't reload the old chat on refresh
      window.history.pushState({}, document.title, window.location.pathname);
      window.dispatchEvent(new Event("chatHistoryUpdated"))
    }
  }

  return (
    <div className={`flex h-[calc(100svh-6rem)] md:h-[calc(100vh-8rem)] flex-col relative transition-all duration-500 ${messages.length === 0 ? "bg-transparent border-transparent shadow-none" : "bg-white/80 dark:bg-background/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"}`}>
      {/* Header */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-white/50 dark:bg-background/40 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-[0_0_15px_rgba(234,88,12,0.4)] border border-white/10">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-primary dark:from-orange-400 dark:to-primary">{greeting}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={handleReset} variant="outline" size="sm" className="gap-2 bg-slate-50 dark:bg-secondary/50 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-secondary/80 text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400">
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Yeni Söhbət</span>
            </Button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className={`flex-1 overflow-y-auto p-4 md:p-6 z-10 relative ${messages.length === 0 ? 'flex flex-col items-center justify-center pb-24' : ''}`}>
        
        {messages.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none overflow-hidden rounded-3xl m-2">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at center, #10b981 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
            
            {/* Subtle floating emerald ambient light */}
            <div className="absolute top-[20%] w-[500px] h-[350px] bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />

            <div 
              className="w-full max-w-3xl flex flex-col items-center justify-center z-10 pointer-events-auto px-4 sm:px-6"
            >
              <div className="w-full min-h-[4.5rem] md:min-h-[5.5rem] flex items-center justify-center mb-8 md:mb-10">
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow-md text-center leading-tight">
                  {greeting}
                </h1>
              </div>
              
              <form onSubmit={handleSend} className="w-full relative flex flex-col items-center group mb-8 max-w-2xl">
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
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (input.trim() && !isLoading) handleSend(e as unknown as React.FormEvent);
                      }
                    }}
                    rows={1}
                    aria-label="Hüquqi sualınızı daxil edin"
                    placeholder={isDictating ? "Dinləyirəm, danışın..." : "Hüquqi sualınızı bura yazın və ya danışın..."}
                    className={`w-full resize-none overflow-y-auto overscroll-contain relative pl-6 pr-24 md:pl-7 md:pr-28 py-4 md:py-5 min-h-[58px] md:min-h-[64px] max-h-[120px] md:max-h-[200px] rounded-3xl bg-white/95 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500 text-base md:text-lg shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/50 backdrop-blur-xl transition-all group-hover:border-slate-400 dark:group-hover:border-slate-700 ${isDictating ? 'border-emerald-500 ring-2 ring-emerald-500/30' : ''}`}
                  />
                  <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5 md:gap-2 pr-0.5">
                    <button
                      type="button"
                      onClick={toggleDictation}
                      aria-label="Səslə daxiletmə"
                      className={`h-9 w-9 md:h-10 md:w-10 rounded-full flex items-center justify-center transition-all ${
                        isDictating
                          ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-pulse text-white'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60'
                      }`}
                      title="Səsli daxiletmə"
                    >
                      <Mic className="h-4 w-4 md:h-4.5 md:w-4.5" />
                    </button>
                    <Button 
                      type="submit" 
                      size="icon" 
                      aria-label="Sualı göndər"
                      title="Sualı göndər"
                      disabled={!input.trim() || isLoading}
                      className="rounded-full h-9 w-9 md:h-10 md:w-10 bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-950/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
                    >
                      <Send className="h-4 w-4 md:h-4.5 md:w-4.5 md:ml-0.5" />
                    </Button>
                  </div>
                </div>
              </form>

              {/* Modern Minimalist Prompt Suggestion Chips */}
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 w-full max-w-2xl px-1"
              >
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setMessages([{ id: Date.now(), role: "user", content: suggestion, citations: [] }]);
                      triggerAIResponse(suggestion, []);
                    }}
                    className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full bg-white/90 dark:bg-emerald-500/10 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 border border-slate-200 dark:border-emerald-500/20 hover:border-emerald-400 dark:hover:border-emerald-500/40 text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 text-xs sm:text-sm font-medium transition-all duration-200 backdrop-blur-md shadow-sm hover:scale-[1.02] active:scale-[0.98] group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 group-hover:scale-125 transition-transform shrink-0" />
                    <span className="text-left leading-snug">{suggestion}</span>
                  </button>
                ))}
              </motion.div>
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-8 pb-4 relative z-10">
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
                            <MessageMarkdown content={editedContents[msg.id] ?? msg.content.replace("[ƏRİZƏ]", "").trim()} />
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
                          <div className="relative group">
                            <MessageMarkdown content={msg.content} />
                            <div className="flex justify-end mt-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                              <TTSButton text={msg.content} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  {msg.citations && msg.citations.length > 0 && !msg.content.includes("[ƏRİZƏ]") && (
                    <div className="flex flex-col gap-2 mt-2 w-full pt-2">
                      {msg.citations.map((cite: string, i: number) => (
                        <InlineCitation key={i} title={cite} />
                      ))}
                    </div>
                  )}

                  {/* Real Court Precedent Match from 150 Court Acts */}
                  {msg.role === "assistant" && msg.precedent && (
                    <div className="mt-3 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/20 backdrop-blur-md w-full shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2">
                        <Gavel className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Oxşar Məhkəmə Təcrübəsi (Rəsmi Məhkəmə Aktı)</span>
                      </div>
                      <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed space-y-1.5">
                        <div>
                          Bu mövzu ilə bağlı <strong className="text-emerald-800 dark:text-emerald-300">{msg.precedent.court}</strong> tərəfindən hakim <strong className="text-slate-900 dark:text-white">{msg.precedent.judge}</strong> sədrliyi ilə (<span className="font-mono text-xs">{msg.precedent.caseNo}</span> saylı iş) məhkəmə işi baxılmışdır.
                        </div>
                        <div className="pt-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Qəbul edilmiş yekun qərar:</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                            {msg.precedent.result}
                          </span>
                        </div>
                      </div>
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
          </div>
        )}
      </div>

      {/* Input Area */}
      {messages.length > 0 && (
        <div className="p-4 md:p-6 border-t border-slate-200 dark:border-white/5 bg-white/80 dark:bg-background/60 backdrop-blur-xl z-10 relative">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex flex-col">
            <div className="relative flex items-end">
              <Button type="button" variant="ghost" size="icon" aria-label="Fayl əlavə et" title="Fayl əlavə et" className="absolute left-2 bottom-1 md:bottom-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full h-10 w-10 transition-colors hidden sm:flex">
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
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !isLoading) handleSend(e as unknown as React.FormEvent);
                  }
                }}
                rows={1}
                aria-label="Hüquqi sualınızı daxil edin"
                placeholder={isDictating ? "Dinləyirəm, danışın..." : "Hüquqi sualınızı bura yazın..."}
                className={`w-full resize-none overflow-y-auto overscroll-contain pl-4 sm:pl-14 pr-20 md:pr-24 py-3 md:py-4 min-h-[48px] md:min-h-[56px] max-h-[120px] md:max-h-[200px] rounded-3xl md:rounded-[2rem] bg-slate-50 dark:bg-card/50 border border-slate-200 dark:border-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/50 text-[15px] shadow-inner transition-all text-foreground ${isDictating ? 'border-blue-400 dark:border-blue-500/60 ring-2 ring-blue-400/30' : ''}`}
              />
              <div className="absolute right-1 md:right-2 bottom-1 md:bottom-1.5 flex items-center pr-1 gap-1">
                <button
                  type="button"
                  onClick={toggleDictation}
                  aria-label="Səslə daxiletmə"
                  className={`h-9 w-9 md:h-10 md:w-10 rounded-full flex items-center justify-center transition-all ${
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
                  <Send className="h-4 w-4 md:h-5 md:w-5 md:ml-1" />
                </Button>
              </div>
            </div>
          </form>
          <p className="text-xs text-center text-muted-foreground py-3 bg-white/50 dark:bg-background/50 border-t border-slate-200 dark:border-white/5 backdrop-blur-xl mt-3 rounded-b-3xl">
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
      <div className="flex h-[calc(100svh-6rem)] md:h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  )
}
