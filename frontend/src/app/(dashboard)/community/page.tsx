"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { formatDistanceToNow } from "date-fns"
import { az } from "date-fns/locale"
import Link from "next/link"
import { MessageCircle, Eye, Plus, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/context/AuthContext"

type Post = {
  id: string
  title: string
  content: string
  category: string
  views_count: number
  created_at: string
  user_id: string
  profiles: {
    name: string
    avatar_url: string
    role: string
  }
  _count: {
    comments: number
  }
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { user, supabaseUser } = useAuth()
  const supabase = createClient()

  const fetchPosts = async () => {
    setIsLoading(true)
    
    // We need to fetch posts, join with profiles for author info
    // And also get comment counts. Supabase JS doesn't easily do relation counts in one query without a view,
    // but we can try to fetch them and manually count or use a clever select.
    const { data, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        profiles:user_id (name, avatar_url, role),
        community_comments (id)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Error fetching posts:", error)
    } else if (data) {
      const formattedPosts = data.map((post: any) => ({
        ...post,
        _count: { comments: post.community_comments?.length || 0 },
        profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
      })) as any
      
      setPosts(formattedPosts)
    }
    
    setIsLoading(false)
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim() || !supabaseUser) return

    setIsSubmitting(true)
    
    const { error } = await supabase
      .from('community_posts')
      .insert({
        user_id: supabaseUser.id,
        title: newTitle,
        content: newContent,
        category: 'Ümumi'
      })

    if (!error) {
      setNewTitle("")
      setNewContent("")
      setIsDialogOpen(false)
      fetchPosts()
    } else {
      console.error("Failed to create post", error)
    }
    
    setIsSubmitting(false)
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            İcma (Sual-Cavab)
          </h1>
          <p className="text-muted-foreground mt-1">
            Hüquqi suallarınızı verin və vəkillərdən cavab alın
          </p>
        </div>
        
        {supabaseUser && (
          <>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2 shrink-0 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" />
              Yeni Sual Ver
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Yeni hüquqi sual</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="title" className="text-sm font-medium">Mövzu (Qısa başlıq)</label>
                  <Input 
                    id="title" 
                    placeholder="Məsələn: Əmək müqaviləsinə xitam verilməsi..." 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="content" className="text-sm font-medium">Ətraflı məzmun</label>
                  <Textarea 
                    id="content" 
                    placeholder="Sualınızı və probleminizi ətraflı şəkildə yazın..." 
                    rows={5}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full gap-2 mt-2">
                  {isSubmitting ? "Paylaşılır..." : "Paylaş"}
                  {!isSubmitting && <Send className="h-4 w-4" />}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Yüklənir...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed flex flex-col items-center justify-center gap-3">
            <MessageCircle className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">Hələ heç bir sual verilməyib. İlk sualı siz verin!</p>
          </div>
        ) : (
          posts.map(post => (
            <Link href={`/community/${post.id}`} key={post.id} className="block group">
              <div className="p-5 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-200 border-border/50 hover:border-primary/30">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {post.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: az })}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold truncate group-hover:text-primary transition-colors">{post.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.content}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 text-muted-foreground shrink-0 mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-border/50 w-full md:w-auto justify-between md:justify-end">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-6 w-6 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
                        {post.profiles?.avatar_url ? (
                          <img src={post.profiles.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-medium uppercase">{post.profiles?.name?.charAt(0) || 'U'}</span>
                        )}
                      </div>
                      <span className="truncate max-w-[120px] hidden sm:inline-block font-medium">
                        {post.profiles?.name || 'İstifadəçi'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex items-center gap-1.5 text-sm" title="Baxış sayı">
                        <Eye className="h-4 w-4" />
                        <span>{post.views_count}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm" title="Rəylər">
                        <MessageCircle className="h-4 w-4" />
                        <span>{post._count.comments}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
