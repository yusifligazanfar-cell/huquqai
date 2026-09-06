"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, User, Bell, Shield, Paintbrush } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SettingsPage() {
  const { isLoggedIn } = useAuth()

  return (
    <div className="flex flex-col min-h-screen pb-10">
      
      {/* Background Decorators */}
      <div className="fixed top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
      <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

      <div className="max-w-4xl w-full mx-auto px-6 pt-10 flex-1 z-10">
        
        {/* Header Section */}
        <div className="mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-primary rounded-2xl mb-4 shadow-[0_0_20px_rgba(234,88,12,0.3)]">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Tənzimləmələr
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Platforma ayarlarını və şəxsi seçimlərinizi idarə edin.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Settings Cards */}
          <Card className="bg-card/40 backdrop-blur-3xl border-white/5 hover:border-white/10 transition-colors md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Hesab
              </CardTitle>
              <CardDescription>
                {isLoggedIn ? "Şəxsi məlumatlarınızı idarə edin" : "Hesaba daxil olun və ya qeydiyyatdan keçin"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground mb-4">
                Hesab ayarlarınızı yeniləmək üçün ayrıca profil səhifəsinə keçid edin.
              </div>
              <Link href="/account">
                <Button>Hesabı İdarə Et</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-3xl border-white/5 hover:border-white/10 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paintbrush className="h-5 w-5 text-orange-500" />
                Görünüş
              </CardTitle>
              <CardDescription>
                Sistemin vizual mövzusu
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              "Qaranlıq (Premium Glassmorphism)" mövzusu aktivdir.
            </CardContent>
          </Card>
          
          <Card className="bg-card/40 backdrop-blur-3xl border-white/5 hover:border-white/10 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-500" />
                Bildirişlər
              </CardTitle>
              <CardDescription>
                Qanunvericilik dəyişiklikləri
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Yeniləmələr haqqında e-poçt bildirişləri aktivdir.
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-3xl border-white/5 hover:border-white/10 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-500" />
                Məxfilik
              </CardTitle>
              <CardDescription>
                Məlumatların qorunması
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Axtarış və chat tarixçəniz cihazınızda lokal olaraq saxlanılır.
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
