"use client"

import { useEffect, useState, use } from "react"
import { createClient } from "@/utils/supabase/client"
import { formatDistanceToNow } from "date-fns"
import { az } from "date-fns/locale"
import Link from "next/link"
import { ArrowLeft, Send, Eye, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/context/AuthContext"

type Comment = {
  id: string
  content: string
  created_at: string
  is_lawyer_reply: boolean
  user_id: string
  profiles: {
    name: string
    avatar_url: string
    role: string
  }
}

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
}

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const postId = resolvedParams.id
  
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { user, supabaseUser } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    const fetchPostAndComments = async () => {
      if (!postId) return
      setIsLoading(true)
      
      // Fetch post
      const { data: postData } = await supabase
        .from('community_posts')
        .select(`*, profiles:user_id (name, avatar_url, role)`)
        .eq('id', postId)
        .single()
        
      if (postData) {
        setPost({
          ...postData,
          profiles: Array.isArray(postData.profiles) ? postData.profiles[0] : postData.profiles
        } as any)
        
        // Increment view count via RPC to bypass RLS
        await supabase.rpc('increment_view_count', { row_id: postId })
      }

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('community_comments')
        .select(`*, profiles:user_id (name, avatar_url, role)`)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (commentsData) {
        setComments(commentsData.map((c: any) => ({
          ...c,
          profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
        })) as any)
      }
      
      setIsLoading(false)
    }

    fetchPostAndComments()
  }, [postId])

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !supabaseUser || !postId) return

    setIsSubmitting(true)
    
    // Note: The trigger handle_community_reputation handles is_lawyer_reply flag and scoring on backend
    const { data, error } = await supabase
      .from('community_comments')
      .insert({
        post_id: postId,
        user_id: supabaseUser.id,
        content: newComment
      })
      .select(`*, profiles:user_id (name, avatar_url, role)`)
      .single()

    if (!error && data) {
      setNewComment("")
      const formattedComment = {
        ...data,
        profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
      }
      setComments(prev => [...prev, formattedComment as any])
      
      // Notify post author
      if (post && supabaseUser.id !== post.user_id) {
        fetch('/api/notify-comment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            postId: post.id, 
            commenterName: user?.name || supabaseUser.email 
          })
        }).catch(err => console.error("Failed to trigger notification:", err))
      }
    } else {
      console.error("Failed to add comment", error)
    }
    
    setIsSubmitting(false)
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Bu cavabı silmək istədiyinizə əminsiniz?")) return
    const { error } = await supabase.from('community_comments').delete().eq('id', commentId)
    if (!error) {
      setComments(comments.filter(c => c.id !== commentId))
    } else {
      console.error(error)
      alert("Silinərkən xəta baş verdi.")
    }
  }

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Yüklənir...</div>
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold mb-2">Sual tapılmadı</h2>
        <Link href="/community">
          <Button variant="outline">İcmaya qayıt</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-12">
      <Link href="/community" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="h-4 w-4" />
        İcmaya qayıt
      </Link>
      
      {/* Sual Başlığı */}
      <div className="p-6 md:p-8 rounded-xl border bg-card text-card-foreground shadow-sm relative">
        {supabaseUser?.id === post.user_id && (
          <div className="absolute top-6 right-6">
            <button 
              onClick={async () => {
                if (!confirm("Bu postu silmək istədiyinizə əminsiniz?")) return;
                const { error } = await supabase.from('community_posts').delete().eq('id', post.id);
                if (!error) {
                  window.location.href = '/community';
                } else {
                  console.error(error);
                  alert("Post silinərkən xəta baş verdi.");
                }
              }}
              className="text-red-500 hover:text-red-600 text-sm font-semibold flex items-center gap-1"
            >
              Postu Sil
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {post.category}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Eye className="h-3 w-3 ml-2" /> {post.views_count + 1}
          </span>
        </div>
        
        <h1 className="text-2xl md:text-3xl font-bold mb-6">{post.title}</h1>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
            {post.profiles?.avatar_url ? (
              <img src={post.profiles.avatar_url} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-medium uppercase">{post.profiles?.name?.charAt(0) || 'U'}</span>
            )}
          </div>
          <div>
            <div className="font-medium text-sm">{post.profiles?.name || 'İstifadəçi'}</div>
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: az })}
            </div>
          </div>
        </div>
        
        <div className="text-sm md:text-base whitespace-pre-wrap leading-relaxed border-t border-border/50 pt-6">
          {post.content}
        </div>
      </div>

      {/* Rəylər bölməsi */}
      <div className="flex flex-col gap-4 mt-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          Rəylər və Cavablar 
          <span className="bg-muted px-2 py-0.5 rounded-full text-sm font-normal text-muted-foreground">
            {comments.length}
          </span>
        </h3>
        
        <div className="flex flex-col gap-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm bg-muted/20 rounded-lg border border-dashed">
              Hələ heç bir rəy yazılmayıb. İlk cavab verən siz olun!
            </div>
          ) : (
            comments.map(comment => (
              <div 
                key={comment.id} 
                className={`p-4 md:p-5 rounded-xl border ${comment.is_lawyer_reply || comment.profiles?.role === 'lawyer' ? 'bg-primary/5 border-primary/20 shadow-sm shadow-primary/5' : 'bg-card text-card-foreground shadow-sm border-border/50'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
                      {comment.profiles?.avatar_url ? (
                        <img src={comment.profiles.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-medium uppercase">{comment.profiles?.name?.charAt(0) || 'U'}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        {comment.profiles?.role === 'lawyer' ? (
                          <Link href={`/lawyers/${comment.user_id}`} className="hover:underline text-primary">
                            {comment.profiles?.name || 'İstifadəçi'}
                          </Link>
                        ) : (
                          <>{comment.profiles?.name || 'İstifadəçi'}</>
                        )}
                        {(comment.is_lawyer_reply || comment.profiles?.role === 'lawyer') && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                            <ShieldCheck className="h-3 w-3" /> VƏKİL
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: az })}
                      </div>
                    </div>
                  </div>
                  {supabaseUser?.id === comment.user_id && (
                    <button onClick={() => handleDeleteComment(comment.id)} className="text-red-500 hover:text-red-600 text-xs font-semibold">
                      Sil
                    </button>
                  )}
                </div>
                
                <div className="text-sm whitespace-pre-wrap ml-11">
                  {comment.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Rəy yazma forması */}
      {supabaseUser ? (
        <div className="mt-6 p-5 rounded-xl border bg-card text-card-foreground shadow-sm">
          <form onSubmit={handleAddComment} className="flex flex-col gap-3">
            <h4 className="font-medium text-sm mb-1">Öz cavabınızı yazın</h4>
            <Textarea 
              placeholder={user?.role === 'lawyer' ? "Hüquqi məsləhətinizi bura yazın (Vəkil kimi)..." : "Fikrinizi və ya məsləhətinizi bura yazın..."} 
              rows={4}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="resize-none"
              required
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-muted-foreground">
                {user?.role === 'lawyer' ? "Bu suala cavab verməklə reytinq xalınızı artıracaqsınız." : ""}
              </span>
              <Button type="submit" disabled={isSubmitting || !newComment.trim()} className="gap-2 shrink-0">
                {isSubmitting ? "Göndərilir..." : "Göndər"}
                {!isSubmitting && <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="mt-6 p-6 rounded-xl border border-dashed text-center bg-muted/20">
          <p className="text-sm text-muted-foreground mb-4">Rəy yazmaq və ya cavab vermək üçün sistemə daxil olmalısınız.</p>
          <Link href="/login">
            <Button variant="outline">Daxil ol</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
