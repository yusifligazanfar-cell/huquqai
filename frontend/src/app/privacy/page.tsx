"use client"

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PrivacyPolicy() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0A] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-[#111] rounded-3xl p-8 md:p-12 shadow-xl border border-slate-200 dark:border-white/5">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            className="gap-2 -ml-4 text-muted-foreground hover:text-foreground"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Geriyə
          </Button>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-black mb-8 tracking-tight text-slate-900 dark:text-white">
          Məxfilik Siyasəti
        </h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm md:text-base leading-relaxed text-muted-foreground">
          <p>
            <strong>Son yenilənmə tarixi:</strong> 10 İyul 2026
          </p>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-4">1. Ümumi Müddəalar</h2>
          <p>
            LexAZ AI ("Biz", "Şirkət", "Platforma") olaraq, şəxsi məlumatlarınızın məxfiliyinə və təhlükəsizliyinə böyük əhəmiyyət veririk. Bu Məxfilik Siyasəti, xidmətlərimizdən (SaaS) istifadə etdiyiniz zaman məlumatlarınızın necə toplandığını, istifadə edildiyini və qorunduğunu izah edir.
          </p>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-4">2. Topladığımız Məlumatlar</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Şəxsi İdentifikasiya Məlumatları:</strong> Ad, soyad, e-poçt ünvanı, profil şəkli və qeydiyyat zamanı təqdim etdiyiniz digər məlumatlar.</li>
            <li><strong>Ödəniş Məlumatları:</strong> Ödənişli xidmətlərimizdən istifadə etdiyiniz zaman (gələcəkdə aktiv ediləcək), abunəlik və ödəniş tarixçəsi. (Qeyd: Kredit kartı məlumatlarınız birbaşa olaraq Stripe və ya müvafiq ödəniş partnyorlarımız tərəfindən idarə olunur və bizim serverlərdə saxlanılmır).</li>
            <li><strong>İstifadə Məlumatları:</strong> Süni zəka ilə etdiyiniz yazışmalar, axtarış tarixçəsi və yaratdığınız sənədlər. Bu məlumatlar xidmətin keyfiyyətini artırmaq və sizə daha yaxşı təcrübə təqdim etmək üçün saxlanılır.</li>
            <li><strong>Texniki Məlumatlar:</strong> IP ünvanı, cihaz növü, brauzer versiyası və saytda keçirdiyiniz vaxt.</li>
          </ul>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-4">3. Məlumatların İstifadəsi</h2>
          <p>Topladığımız məlumatlar aşağıdakı məqsədlər üçün istifadə olunur:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Xidmətlərimizi təqdim etmək və idarə etmək.</li>
            <li>Abunəlik və ödəniş proseslərini həyata keçirmək.</li>
            <li>Süni zəka cavablarını və xidmət keyfiyyətini optimallaşdırmaq.</li>
            <li>Müştəri dəstəyi təmin etmək və texniki problemləri həll etmək.</li>
            <li>Hüquqi və təhlükəsizlik öhdəliklərimizi yerinə yetirmək.</li>
          </ul>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-4">4. Məlumatların Qorunması və Paylaşılması</h2>
          <p>
            Məlumatlarınız müasir şifrələmə texnologiyaları (AES-256) və təhlükəsizlik protokolları ilə qorunur. Biz məlumatlarınızı üçüncü tərəflərə (reklam şirkətlərinə və s.) satmırıq. Məlumatlar yalnız aşağıdakı hallarda paylaşıla bilər:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Hüquq-mühafizə orqanlarının qanuni tələbi əsasında.</li>
            <li>Xidmət təminatçıları (məs: ödəniş sistemləri, server provayderləri) ilə, yalnız xidmətin fəaliyyət göstərməsi üçün zəruri olan həcmdə.</li>
          </ul>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-4">5. Hüquqlarınız</h2>
          <p>Siz istənilən vaxt aşağıdakı hüquqlardan istifadə edə bilərsiniz:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Şəxsi məlumatlarınıza baxmaq və onlara düzəliş etmək.</li>
            <li>Hesabınızı və bütün yazışma/sənəd tarixçənizi birdəfəlik silmək (Məlumatın silinməsi geridönülməzdir).</li>
            <li>Məlumatlarınızın nüsxəsini tələb etmək.</li>
          </ul>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-4">6. Əlaqə</h2>
          <p>
            Bu siyasətlə bağlı hər hansı sualınız və ya narahatlığınız varsa, zəhmət olmasa bizimlə əlaqə saxlayın: <a href="mailto:support@lexaz.ai" className="text-primary hover:underline">support@lexaz.ai</a>
          </p>
        </div>
      </div>
    </div>
  )
}
