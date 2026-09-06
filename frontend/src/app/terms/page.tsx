"use client"

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TermsOfService() {
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
          İstifadə Şərtləri
        </h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm md:text-base leading-relaxed text-muted-foreground">
          <p>
            <strong>Son yenilənmə tarixi:</strong> 10 İyul 2026
          </p>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-4">1. Şərtlərin Qəbulu</h2>
          <p>
            LexAZ AI ("Xidmət") platformasına daxil olmaqla və ya ondan istifadə etməklə, bu İstifadə Şərtləri ilə razılaşdığınızı təsdiq edirsiniz. Əgər bu şərtlərlə razı deyilsinizsə, lütfən xidmətimizdən istifadə etməyin.
          </p>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-4">2. Xidmətin Təsviri</h2>
          <p>
            LexAZ AI, Azərbaycan Respublikasının qanunvericiliyi əsasında hüquqi suallara cavab verən, sənəd (ərizə, müqavilə və s.) tərtib edən və hüquqi axtarışlar həyata keçirən Süni Zəka (SaaS) platformasıdır. 
            <strong>Vacib Qeyd:</strong> LexAZ AI rəsmi hüquqi məsləhətçi və ya vəkil deyil. Sistem tərəfindən verilən cavablar yalnız məlumat xarakterlidir və rəsmi hüquqi fəaliyyət üçün peşəkar vəkilə müraciət etməyiniz tövsiyə olunur.
          </p>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-4">3. Abunəlik və Ödənişlər (SaaS)</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Xidmət Paketləri:</strong> LexAZ AI gələcəkdə həm pulsuz (məhdud), həm də ödənişli (Premium) abunəlik paketləri təklif edə bilər. Ödənişli paketlər aylıq və ya illik yenilənən abunəlik modeli əsasında fəaliyyət göstərir.</li>
            <li><strong>Ödənişin İcrası:</strong> Ödənişlər təhlükəsiz üçüncü tərəf provayderləri (Stripe və s.) vasitəsilə həyata keçirilir. Abunəlik ləğv edilmədikcə avtomatik olaraq növbəti dövr üçün yenilənir.</li>
            <li><strong>Geri Ödəniş (Refund):</strong> Xidmətin rəqəmsal təbiətinə görə, istifadə edilmiş abunəlik ayları üçün geri ödəniş edilmir. Lakin abunəliyi istənilən vaxt ləğv edə bilərsiniz.</li>
          </ul>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-4">4. İstifadəçi Öhdəlikləri</h2>
          <p>Siz Xidmətdən istifadə edərkən aşağıdakı qaydalara riayət etməyə razılaşırsınız:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Platformaya zərər verə biləcək zərərli kodlar və ya kiber hücumlar etməmək.</li>
            <li>Sistemi həddindən artıq yükləyəcək avtomatlaşdırılmış sorğular (botlar) göndərməmək.</li>
            <li>Xidmətdən hər hansı qeyri-qanuni və ya dələduzluq məqsədi ilə istifadə etməmək.</li>
          </ul>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-4">5. Fikri Mülkiyyət Hüquqları</h2>
          <p>
            Platformanın arxitekturası, dizaynı, alqoritmləri və loqosu LexAZ AI-yə məxsusdur. Süni zəka tərəfindən sizin üçün yaradılmış sənədlər və mətnlər (ərizələr, müqavilələr) isə sizin tərəfinizdən istədiyiniz kimi istifadə edilə bilər.
          </p>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-4">6. Məsuliyyətin Məhdudlaşdırılması</h2>
          <p>
            Şirkət, LexAZ AI tərəfindən verilən cavabların və ya yaradılan sənədlərin 100% dəqiqliyinə zəmanət vermir. Platformadan istifadə nəticəsində yaranan hər hansı birbaşa, dolayısı və ya təsadüfi zərərlərə görə Şirkət məsuliyyət daşımır.
          </p>

          <h2 className="text-xl font-bold text-foreground mt-8 mb-4">7. Şərtlərin Dəyişdirilməsi</h2>
          <p>
            Biz bu İstifadə Şərtlərinə istənilən vaxt dəyişiklik etmək hüququnu özümüzdə saxlayırıq. Mühüm dəyişikliklər olduqda bu barədə e-poçt vasitəsilə və ya sayt daxilində sizə əvvəlcədən məlumat veriləcəkdir.
          </p>
        </div>
      </div>
    </div>
  )
}
