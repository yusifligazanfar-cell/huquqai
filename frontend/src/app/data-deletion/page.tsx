"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

export default function DataDeletionPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-6 hover:bg-muted"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Geri qayıt
        </Button>
        
        <div className="bg-card text-card-foreground rounded-xl shadow-lg border p-8 space-y-6">
          <h1 className="text-3xl font-bold text-primary">İstifadəçi Məlumatlarının Silinməsi (Data Deletion)</h1>
          <p className="text-sm text-muted-foreground border-b pb-4">
            Son yenilənmə tarixi: 10 İyul 2026
          </p>

          <div className="space-y-6 text-sm md:text-base leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold mb-3">Məlumatların Silinməsi Təlimatı</h2>
              <p className="text-muted-foreground mb-4">
                LexAZ AI platformasına Facebook ilə daxil olmusunuzsa və Facebook hesabınızın LexAZ AI ilə olan əlaqəsini və bizdə olan bütün şəxsi məlumatlarınızı (ad, e-poçt, profil şəkli və s.) silmək istəyirsinizsə, aşağıdakı addımları izləyə bilərsiniz:
              </p>
              
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <p><strong>Addım 1:</strong> Şəxsi Facebook hesabınıza daxil olun.</p>
                <p><strong>Addım 2:</strong> Yuxarı sağ küncdəki oxa klikləyərək <strong>"Tənzimləmələr və Məxfilik" (Settings & Privacy)</strong> və daha sonra <strong>"Tənzimləmələr" (Settings)</strong> bölməsinə keçin.</p>
                <p><strong>Addım 3:</strong> Sol menyudan <strong>"Tətbiqlər və Vebsaytlar" (Apps and Websites)</strong> bölməsini seçin.</p>
                <p><strong>Addım 4:</strong> Siyahıdan <strong>LexAZ AI</strong> tətbiqini tapın və yanındakı <strong>"Sil" (Remove)</strong> düyməsinə klikləyin.</p>
                <p><strong>Addım 5:</strong> Seçiminizi təsdiq etdikdən sonra Facebook məlumatlarınız dərhal platformamızla əlaqəsini kəsəcək və sistemimizdən avtomatik olaraq silinmə prosesinə başlanılacaq.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Hesabın Tamamilə Silinməsi (Alternativ)</h2>
              <p className="text-muted-foreground">
                Əgər LexAZ AI daxilindəki hesabınızı və bütün axtarış/söhbət tarixçənizi tamamilə məhv etmək istəyirsinizsə, bunu birbaşa tətbiq daxilindən (Profilim bölməsindən) edə bilərsiniz. Və ya bizə birbaşa müraciət edə bilərsiniz:
              </p>
              <p className="mt-2 font-medium">E-poçt: support@lexaz.ai</p>
              <p className="mt-1 font-medium">Instagram: @jusifle</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
