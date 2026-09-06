import { createClient } from "@/utils/supabase/server"
import { Shield, MapPin, Briefcase, Star, Search, MessageSquare } from "lucide-react"
import Link from "next/link"
import LawyerSearchClient from "./LawyerSearchClient"
import categoriesData from "@/data/lawyer_categories.json"

export default async function LawyersDirectoryPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ q?: string, category?: string }> 
}) {
  const supabase = await createClient()
  const params = await searchParams
  const q = params.q?.toLowerCase() || ''
  const categoryId = params.category || ''

  // Build the query
  let query = supabase
    .from('profiles')
    .select('*')
    .eq('role', 'lawyer')
    .order('is_verified', { ascending: false })

  // Apply filters
  if (categoryId) {
    // We assume the specialities contains the category name (az).
    // Let's find the category name based on id
    const selectedCat = categoriesData.find(c => c.id === categoryId)
    if (selectedCat) {
      // In Supabase JSONB arrays, we must pass the value as a JSON string
      // Otherwise it sends a Postgres array {value} which fails against JSONB
      query = query.contains('specialties', JSON.stringify([selectedCat.name_az]))
    }
  }

  if (q) {
    // Simple text search on name or bio
    query = query.or(`name.ilike.%${q}%,bio.ilike.%${q}%`)
  }

  const { data: lawyers, error } = await query

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-12 flex-1 z-10">
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Hüquqşünaslar Kataloqu</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            LexAZ platformasında qeydiyyatdan keçmiş peşəkar vəkillərlə və hüquqşünaslarla birbaşa əlaqə saxlayın, məsləhət alın.
          </p>
        </div>

        {/* Search and Category Client Component */}
        <LawyerSearchClient categories={categoriesData} />

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-xl text-center mb-6">
            Məlumatları yükləyərkən xəta baş verdi.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lawyers?.map((lawyer) => {
            const initials = (lawyer.name || "V").split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
            const specialties = lawyer.specialties || []

            return (
              <Link href={`/lawyers/${lawyer.id}`} key={lawyer.id} className="bg-white/80 dark:bg-card/40 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1 group flex flex-col cursor-pointer">
                <div className="h-24 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative">
                  {lawyer.cover_url && (
                    <img src={lawyer.cover_url} alt="Cover" className="w-full h-full object-cover opacity-60" />
                  )}
                  <div className="absolute -bottom-10 left-6">
                    <div className="w-20 h-20 rounded-full border-4 border-background bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-xl font-bold text-white shadow-lg overflow-hidden">
                      {lawyer.avatar_url ? (
                        <img src={lawyer.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : initials}
                    </div>
                  </div>
                </div>

                <div className="pt-12 px-6 pb-6 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-foreground flex items-center gap-2 group-hover:text-primary transition-colors">
                        {lawyer.name}
                        {lawyer.is_verified && (
                          <Shield className="w-4 h-4 text-blue-500 fill-blue-500" />
                        )}
                      </h3>
                      <p className="text-sm text-primary font-medium">Hüquqşünas / Vəkil</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mt-3 line-clamp-3 flex-1">
                    {lawyer.bio || "Hüquqşünas haqqında məlumat qeyd edilməyib."}
                  </p>

                  {specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {specialties.slice(0, 3).map((spec: string, i: number) => (
                        <span key={i} className="text-xs bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md border border-slate-200 dark:border-white/5">
                          {spec}
                        </span>
                      ))}
                      {specialties.length > 3 && (
                        <span className="text-xs bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md border border-slate-200 dark:border-white/5">
                          +{specialties.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <div className="text-sm font-semibold text-foreground">
                      {lawyer.hourly_rate ? `${lawyer.hourly_rate} AZN / saat` : 'Razılaşma yolu ilə'}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-primary group-hover:text-primary/80 transition-colors">
                      <MessageSquare className="w-4 h-4" />
                      Randevu Al
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}

          {lawyers?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-white/50 dark:bg-card/30 rounded-2xl border border-slate-200 dark:border-white/5">
              Bu axtarış üzrə hüquqşünas tapılmadı.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
