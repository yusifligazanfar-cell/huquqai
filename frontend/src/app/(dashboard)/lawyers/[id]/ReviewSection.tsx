"use client"

import { useState } from "react"
import { Star, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/context/AuthContext"

export default function ReviewSection({ lawyerId, initialReviews }: { lawyerId: string, initialReviews: any[] }) {
  const { user, supabaseUser, isLoggedIn } = useAuth()
  const [reviews, setReviews] = useState(initialReviews)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoggedIn || !supabaseUser) return alert("Rəy yazmaq üçün sistemə daxil olmalısınız.")
    if (!comment.trim()) return alert("Rəy mətnini qeyd edin.")
    if (supabaseUser.id === lawyerId) return alert("Özünüzə rəy yaza bilməzsiniz.")

    setIsSubmitting(true)
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        lawyer_id: lawyerId,
        client_id: supabaseUser.id,
        rating,
        comment
      })
      .select('*, client:profiles!client_id(name, avatar_url)')
      .single()

    setIsSubmitting(false)

    if (error) {
      console.error(error)
      alert("Xəta baş verdi: " + error.message + " | Zəhmət olmasa bu xətanı mənə deyin.")
      setIsSubmitting(false)
      return
    } else if (data) {
      setReviews([data, ...reviews])
      setComment("")
      setRating(5)
      alert("Rəyiniz uğurla əlavə edildi!")
    }
  }

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Bu rəyi silmək istədiyinizə əminsiniz?")) return
    const supabase = createClient()
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId)
    if (error) {
      console.error(error)
      alert("Silinərkən xəta baş verdi.")
    } else {
      setReviews(reviews.filter((r: any) => r.id !== reviewId))
    }
  }

  return (
    <div className="space-y-8">
      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length > 0 ? (
          reviews.map((review, i) => (
            <div key={review.id || i} className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0">
                    {review.client?.avatar_url ? (
                      <img src={review.client.avatar_url} alt="Client" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">
                        {review.client?.name?.charAt(0) || "U"}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">{review.client?.name || "İstifadəçi"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString('az-AZ')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, idx) => (
                      <Star key={idx} className={`w-4 h-4 ${idx < review.rating ? 'fill-current' : 'text-slate-300 dark:text-slate-700'}`} />
                    ))}
                  </div>
                  {supabaseUser?.id === review.client_id && (
                    <button onClick={() => handleDelete(review.id)} className="text-red-500 hover:text-red-600 text-xs font-semibold">
                      Sil
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{review.comment}</p>
            </div>
          ))
        ) : (
          <div className="bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-8 text-center">
            <p className="text-slate-500">Hələ rəy yazılmayıb. İlk rəyi siz yazın!</p>
          </div>
        )}
      </div>

      {/* Review Form */}
      {isLoggedIn && (
        <div className="mt-8 border-t border-slate-200 dark:border-white/10 pt-6">
          <h4 className="font-bold text-foreground flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-primary" />
            Rəy Yaz
          </h4>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Qiymətləndirmə:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star className={`w-6 h-6 ${star <= rating ? 'fill-amber-500 text-amber-500' : 'text-slate-300 dark:text-slate-700'}`} />
                  </button>
                ))}
              </div>
            </div>
            <textarea
              placeholder="Vəkil haqqında fikirlərinizi yazın..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              required
              className="flex min-h-[100px] w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-background/40 px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all resize-y text-slate-900 dark:text-white"
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white px-6 rounded-xl">
                {isSubmitting ? "Göndərilir..." : "Rəyi Göndər"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
