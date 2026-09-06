"use client"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"


export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [greeting, setGreeting] = useState("Xoş Gəlmisiniz!")
  const [query, setQuery] = useState("")

  useEffect(() => {
    const hour = new Date().getHours()
    const name = user?.name ? `, ${user.name.split(' ')[0]}` : ""
    
    if (hour >= 6 && hour < 12) {
      setGreeting(`Sabahınız xeyir${name}!`)
    } else if (hour >= 12 && hour < 18) {
      setGreeting(`Hər vaxtınız xeyir${name}!`)
    } else {
      setGreeting(`Axşamınız xeyir${name}!`)
    }
  }, [user])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/chat?q=${encodeURIComponent(query)}`)
  }

  return (
    <div className="relative min-h-[calc(100vh-6rem)] flex flex-col justify-center items-center pb-12 text-center">
      {/* Background Glows */}
      <div className="absolute top-0 -left-10 w-96 h-96 bg-primary/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none"></div>
      <div className="absolute top-40 -right-10 w-96 h-96 bg-orange-500/10 rounded-full mix-blend-screen filter blur-[100px] opacity-30 pointer-events-none"></div>
      
      <div className="relative z-10 w-full max-w-3xl pt-6">
        <div className="w-full flex flex-col items-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-primary dark:from-orange-400 dark:to-primary mb-10 drop-shadow-sm text-center">
            {greeting}
          </h1>
          
          <form onSubmit={handleSearch} className="w-full relative flex items-center group max-w-2xl mx-auto">
            <Input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hər hansı bir sual soruş!" 
              aria-label="Hüquqi sualınızı daxil edin"
              className="w-full pl-6 pr-16 py-8 rounded-full bg-card/60 backdrop-blur-xl border-white/20 focus-visible:ring-primary/40 focus-visible:border-primary/50 text-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all group-hover:border-white/30 text-foreground"
            />
            <Button 
              type="submit" 
              size="icon" 
              aria-label="Sualı göndər"
              title="Sualı göndər"
              disabled={!query.trim()}
              className="absolute right-3 rounded-full h-12 w-12 bg-primary text-white hover:opacity-90 shadow-[0_4px_15px_rgba(234,88,12,0.4)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send className="h-5 w-5 ml-1" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
