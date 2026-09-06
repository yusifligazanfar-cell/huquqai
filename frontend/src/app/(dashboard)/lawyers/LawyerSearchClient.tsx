"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { CategoryIcon } from "@/components/ui/category-icon"

export default function LawyerSearchClient({ categories }: { categories: any[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const initialQuery = searchParams.get('q') || ''
  const initialCategory = searchParams.get('category') || ''

  const [query, setQuery] = useState(initialQuery)
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      updateUrl(query, selectedCategory)
    }, 500)

    return () => clearTimeout(handler)
  }, [query])

  const handleCategoryClick = (catId: string) => {
    const newCategory = selectedCategory === catId ? "" : catId
    setSelectedCategory(newCategory)
    updateUrl(query, newCategory)
  }

  const updateUrl = (q: string, category: string) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (category) params.set('category', category)
    
    router.push(`/lawyers?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="w-full">
      {/* Search Bar */}
      <div className="max-w-xl mx-auto mb-10 relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-primary transition-colors" />
        <input 
          type="text" 
          placeholder="İxtisas və ya ad üzrə axtar..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/60 dark:bg-card/60 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-primary/50 outline-none backdrop-blur-xl transition-all shadow-sm focus:shadow-md"
        />
      </div>

      {/* Categories Grid */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 px-2">Hüquq Sahələri (İxtisaslar)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id

            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`group relative flex flex-col items-center justify-center text-center p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1.5 overflow-hidden ${
                  isSelected 
                    ? 'bg-gradient-to-br from-primary to-blue-600 text-white border-transparent shadow-lg shadow-primary/30' 
                    : 'bg-white/80 dark:bg-card/40 border-slate-200 dark:border-white/10 hover:border-primary/50 hover:shadow-xl hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                {/* Subtle background glow on hover */}
                <div className={`absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl ${isSelected ? 'hidden' : 'block'}`} />
                
                <div className={`p-3 rounded-xl mb-3 transition-colors duration-300 ${
                  isSelected 
                    ? 'bg-white/20 text-white' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'
                }`}>
                  <CategoryIcon id={cat.id} className="w-6 h-6" />
                </div>
                
                <span className={`text-xs font-semibold leading-tight z-10 transition-colors duration-300 ${
                  isSelected 
                    ? 'text-white' 
                    : 'text-slate-700 dark:text-slate-300 group-hover:text-primary'
                }`}>
                  {cat.name_az}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
