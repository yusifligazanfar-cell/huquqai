import { createClient } from "@/utils/supabase/server"
import { Shield, MapPin, Briefcase, Star, Clock, FileText, Share2, Bookmark, GraduationCap, Building2, HelpCircle } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import LawyerBookingWidget from "./LawyerBookingWidget"
import ReviewSection from "./ReviewSection"
import { Button } from "@/components/ui/button"

export default async function LawyerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: lawyer, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'lawyer')
    .single()

  if (error || !lawyer) {
    return notFound()
  }

  const initials = (lawyer.name || "V").split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
  const specialties = lawyer.specialties || []
  
  // Fetch reviews
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, client:profiles!client_id(name, avatar_url)')
    .eq('lawyer_id', id)
    .order('created_at', { ascending: false })
    
  const averageRating = reviews && reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "5.0"

  // Check if current user is the same as the lawyer
  const { data: { session } } = await supabase.auth.getSession()
  const isSelf = session?.user?.id === lawyer.id

  const tabs = [
    { id: "haqqinda", label: "Haqqında" },
    { id: "ixtisaslar", label: "İxtisaslar" },
    { id: "unvan", label: "İş yeri" },
    { id: "tehsil", label: "Təhsil" },
    { id: "reyler", label: `Rəylər (${reviews?.length || 0})` },
    { id: "faq", label: "FAQ" },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-background">
      {/* Background Decorators */}
      <div className="fixed top-20 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-8 pb-20 flex-1 z-10">
        
        {/* Breadcrumb / Back button */}
        <div className="mb-4">
          <Link href="/lawyers" className="text-sm font-medium text-slate-500 hover:text-primary transition-colors inline-flex items-center gap-1 bg-white/50 dark:bg-white/5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10 backdrop-blur-md">
            &larr; Kataloqa qayıt
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Header / Basic Info Card */}
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-full border-4 border-slate-50 dark:border-slate-800 bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg overflow-hidden">
                  {lawyer.avatar_url ? (
                    <img src={lawyer.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : initials}
                </div>
                
                <div className="flex-1 space-y-3">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                      {lawyer.name}
                      {lawyer.is_verified && (
                        <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] sm:text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 uppercase tracking-wider">
                          <Shield className="w-3 h-3" /> Təsdiqlənmiş
                        </span>
                      )}
                    </h1>
                    <div className="text-lg text-primary font-bold mt-1">
                      Hüquqşünas / Vəkil
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 flex-wrap">
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">
                      <Briefcase className="w-4 h-4 text-primary" />
                      <span className="font-semibold">{lawyer.experience_years || '5+'} il</span> təcrübə
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/10 px-2 py-1 rounded-md text-amber-700 dark:text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-bold">{averageRating}</span> ({reviews?.length || 0} rəy)
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="rounded-xl flex gap-2">
                      <Bookmark className="w-4 h-4" /> Yadda saxla
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl flex gap-2">
                      <Share2 className="w-4 h-4" /> Paylaş
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Navigation Tabs */}
            <div className="sticky top-0 z-30 bg-slate-50/90 dark:bg-background/90 backdrop-blur-xl border-y border-slate-200 dark:border-white/10 py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex gap-2 overflow-x-auto hide-scrollbar snap-x">
                {tabs.map((tab) => (
                  <a
                    key={tab.id}
                    href={`#${tab.id}`}
                    className="snap-start shrink-0 px-4 py-2 rounded-full text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {tab.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Content Sections */}
            <div className="space-y-8">
              
              {/* Haqqında */}
              <section id="haqqinda" className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm scroll-mt-24">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Haqqında
                </h2>
                <div className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {lawyer.bio ? (
                    lawyer.bio
                  ) : (
                    <p className="text-slate-500 italic">Hüquqşünas hələ özü haqqında məlumat qeyd etməyib. Lakin {lawyer.experience_years || '5+'} illik təcrübəyə malikdir və müxtəlif hüquq sahələrində peşəkar xidmət göstərir.</p>
                  )}
                </div>
              </section>

              {/* İxtisaslar və Xidmətlər */}
              <section id="ixtisaslar" className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm scroll-mt-24">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  İxtisaslar və Xidmətlər
                </h2>
                {specialties.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {specialties.map((spec: string, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{spec}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">İxtisas sahələri qeyd edilməyib.</p>
                )}
              </section>

              {/* İş yeri / Ünvan */}
              <section id="unvan" className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm scroll-mt-24">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  İş Yeri (Klinika / Ofis)
                </h2>
                {lawyer.workplaces && lawyer.workplaces.length > 0 ? (
                  <div className="space-y-6">
                    {lawyer.workplaces.map((wp: any, i: number) => (
                      <div key={i} className="flex flex-col sm:flex-row gap-6 p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                        <div className="flex-1 space-y-4">
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mərkəz</div>
                            <div className="font-bold text-lg text-foreground">{wp.name}</div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ünvan</div>
                            <div className="text-slate-700 dark:text-slate-300 flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-primary shrink-0 mt-1" />
                              {wp.address}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">İş Saatları</div>
                            <div className="text-slate-700 dark:text-slate-300">
                              {wp.hours}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">İş yeri məlumatı qeyd edilməyib.</p>
                )}
              </section>

              {/* Təhsil */}
              <section id="tehsil" className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm scroll-mt-24">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  Üzvlük və Təhsil
                </h2>
                {lawyer.education && lawyer.education.length > 0 ? (
                  <div className="space-y-6">
                    {lawyer.education.map((ed: any, i: number) => (
                      <div key={i} className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-700">
                        <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-1" />
                        <div className="text-sm font-bold text-slate-500 mb-1">{ed.degree}</div>
                        <div className="font-bold text-foreground text-lg">{ed.institution}</div>
                        <div className="text-slate-600 dark:text-slate-400 text-sm">{ed.field}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">Təhsil məlumatı qeyd edilməyib.</p>
                )}
              </section>

              {/* Rəylər */}
              <section id="reyler" className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm scroll-mt-24">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Pasiyent Rəyləri
                </h2>
                <ReviewSection lawyerId={lawyer.id} initialReviews={reviews || []} />
              </section>

              {/* FAQ */}
              <section id="faq" className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm scroll-mt-24">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  Tez-tez verilən suallar
                </h2>
                <div className="space-y-4">
                  {/* Default FAQs */}
                  <div className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                    <h4 className="font-bold text-foreground mb-2">{lawyer.name} ilə necə randevu ala bilərəm?</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Səhifənin sağ tərəfində yerləşən (mobil versiyada aşağıda) "Randevu Al" təqvimindən sizə uyğun vaxtı seçərək qısa təsvir yazmaqla anında randevu ala bilərsiniz.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                    <h4 className="font-bold text-foreground mb-2">Konsultasiya ödənişlidirmi?</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {lawyer.hourly_rate ? `Bəli, vəkilin saatlıq xidmət haqqı ${lawyer.hourly_rate} AZN təşkil edir.` : 'Vəkilin xidmət haqqı razılaşma yolu ilə müəyyən edilir. Müraciət etdikdən sonra vəkil sizinlə əlaqə saxlayıb detalları müzakirə edəcək.'}
                    </p>
                  </div>
                  
                  {/* Dynamic FAQs */}
                  {lawyer.faqs && lawyer.faqs.map((faq: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                      <h4 className="font-bold text-foreground mb-2">{faq.question}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          {/* Sidebar / Booking Widget */}
          <div className="lg:col-span-4 relative">
            {!isSelf ? (
              <LawyerBookingWidget lawyerId={lawyer.id} unavailableDates={lawyer.unavailable_dates || []} />
            ) : (
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-6 text-center sticky top-24">
                <h3 className="font-bold text-foreground mb-2">Sizin Profiliniz</h3>
                <p className="text-sm text-muted-foreground">Vətəndaşlar profilinizə baxdıqda burada randevu təqvimi görəcəklər.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
