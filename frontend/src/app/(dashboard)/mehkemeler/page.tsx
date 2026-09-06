"use client"

import { useState, useMemo, useEffect } from "react"
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Search, 
  Landmark, 
  Scale, 
  Gavel, 
  SlidersHorizontal,
  X,
  Compass,
  ShieldCheck,
  ExternalLink,
  Navigation
} from "lucide-react"
import { ALL_COURTS, Court, getCourtTypes, getCourtRegions } from "@/lib/courts"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function CourtsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<string>("Hamısı")
  const [selectedRegion, setSelectedRegion] = useState<string>("Bütün regionlar")
  const [activeMapId, setActiveMapId] = useState<number | null>(null)
  const [visibleCount, setVisibleCount] = useState<number>(12)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Let the route render its UI immediately, then load list smoothly
    const t = setTimeout(() => setIsReady(true), 10)
    return () => clearTimeout(t)
  }, [])

  const courtTypes = useMemo(() => ["Hamısı", ...getCourtTypes()], [])
  const regions = useMemo(() => ["Bütün regionlar", ...getCourtRegions()], [])

  const filteredCourts = useMemo(() => {
    if (!isReady) return []
    return ALL_COURTS.filter((c) => {
      // Type filter
      if (selectedType !== "Hamısı" && c.type !== selectedType) {
        return false
      }

      // Region filter
      if (selectedRegion !== "Bütün regionlar" && c.region !== selectedRegion) {
        return false
      }

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
          .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
          .replace(/ə/g, 'e').replace(/ç/g, 'c').replace(/ş/g, 's')
          .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ğ/g, 'g')
          .trim()

        const title = c.title.toLowerCase()
          .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
          .replace(/ə/g, 'e').replace(/ç/g, 'c').replace(/ş/g, 's')
          .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ğ/g, 'g')

        const address = (c.address || "").toLowerCase()
          .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
          .replace(/ə/g, 'e').replace(/ç/g, 'c').replace(/ş/g, 's')
          .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ğ/g, 'g')

        const region = (c.region || "").toLowerCase()
          .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
          .replace(/ə/g, 'e').replace(/ç/g, 'c').replace(/ş/g, 's')
          .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ğ/g, 'g')

        return title.includes(q) || address.includes(q) || region.includes(q) || (c.phone && c.phone.includes(q))
      }

      return true
    })
  }, [searchQuery, selectedType, selectedRegion])

  // Reset pagination when filter or search changes
  const handleTypeChange = (type: string) => {
    setSelectedType(type)
    setVisibleCount(18)
  }

  const handleRegionChange = (reg: string) => {
    setSelectedRegion(reg)
    setVisibleCount(18)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setVisibleCount(18)
  }

  const displayedCourts = useMemo(() => {
    return filteredCourts.slice(0, visibleCount)
  }, [filteredCourts, visibleCount])

  const getTypeTheme = (type: string) => {
    switch (type) {
      case "Ali Məhkəmə":
        return {
          badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
          icon: <Landmark className="w-3.5 h-3.5 text-amber-500" />,
          glow: "group-hover:border-amber-500/40 group-hover:shadow-[0_12px_36px_rgba(245,158,11,0.12)]"
        }
      case "Apellyasiya məhkəmələri":
        return {
          badge: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
          icon: <Gavel className="w-3.5 h-3.5 text-indigo-500" />,
          glow: "group-hover:border-indigo-500/40 group-hover:shadow-[0_12px_36px_rgba(99,102,241,0.12)]"
        }
      case "Kommersiya məhkəmələri":
        return {
          badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          icon: <Building2 className="w-3.5 h-3.5 text-emerald-500" />,
          glow: "group-hover:border-emerald-500/40 group-hover:shadow-[0_12px_36px_rgba(16,185,129,0.12)]"
        }
      case "İnzibati məhkəmələr":
        return {
          badge: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
          icon: <Scale className="w-3.5 h-3.5 text-purple-500" />,
          glow: "group-hover:border-purple-500/40 group-hover:shadow-[0_12px_36px_rgba(168,85,247,0.12)]"
        }
      case "Ağır cinayətlər məhkəmələri":
        return {
          badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
          icon: <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />,
          glow: "group-hover:border-rose-500/40 group-hover:shadow-[0_12px_36px_rgba(244,63,94,0.12)]"
        }
      case "Hərbi məhkəmələr":
        return {
          badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
          icon: <Compass className="w-3.5 h-3.5 text-sky-500" />,
          glow: "group-hover:border-sky-500/40 group-hover:shadow-[0_12px_36px_rgba(14,165,233,0.12)]"
        }
      default:
        return {
          badge: "bg-primary/15 text-primary border-primary/30",
          icon: <Building2 className="w-3.5 h-3.5 text-primary" />,
          glow: "group-hover:border-primary/40 group-hover:shadow-[0_12px_36px_rgba(249,115,22,0.12)]"
        }
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-10 z-10">
        
        {/* Modern Page Header */}
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4 shadow-sm backdrop-blur-md">
            <Landmark className="w-3.5 h-3.5" />
            <span>Rəsmi Dövlət Portalı Məlumatları</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground mb-4">
            Azərbaycan Respublikasının Məhkəmələri
          </h1>

          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Bütün instansiya, rayon, şəhər, inzibati, kommersiya və ixtisaslaşmış məhkəmələrin rəsmi ünvanları, 
            əlaqə vasitələri və interaktiv xəritələri.
          </p>
        </div>

        {/* Modern Search & Filters Bar */}
        <div className="flex flex-col gap-4 mb-8 bg-card/70 dark:bg-card/40 backdrop-blur-2xl border border-border/70 p-4 sm:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Məhkəmənin adı, rayonu, ünvanı və ya telefon nömrəsi ilə axtarın..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-11 h-12 bg-background/80 dark:bg-background/50 rounded-2xl border-border/70 text-sm focus-visible:ring-primary shadow-sm"
              />
              {searchQuery && (
                <button 
                  onClick={() => handleSearchChange("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Region Selector */}
            <div className="w-full sm:w-72">
              <select
                value={selectedRegion}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="w-full h-12 px-4 bg-background/80 dark:bg-background/50 border border-border/70 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground shadow-sm cursor-pointer"
              >
                {regions.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Type Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-border/40">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0 ml-1 mr-1" />
            {courtTypes.map((type) => {
              const count = type === "Hamısı" 
                ? ALL_COURTS.length 
                : ALL_COURTS.filter(c => c.type === type).length

              const isSelected = selectedType === type

              return (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-2 border ${
                    isSelected
                      ? "bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/40"
                  }`}
                >
                  <span>{type}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-muted-foreground/15 text-muted-foreground"}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Counter Header */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Məhkəmələr:</span>
            <Badge variant="secondary" className="font-bold text-foreground px-2.5 py-0.5 rounded-full">
              {displayedCourts.length} / {filteredCourts.length}
            </Badge>
          </div>

          {(selectedType !== "Hamısı" || selectedRegion !== "Bütün regionlar" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedType("Hamısı")
                setSelectedRegion("Bütün regionlar")
                setSearchQuery("")
                setVisibleCount(18)
              }}
              className="text-xs h-8 text-primary hover:text-primary/80 font-medium"
            >
              Filtrləri sıfırla
            </Button>
          )}
        </div>

        {/* Modern Courts Grid with Fast Map Preview */}
        {!isReady ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-60 rounded-3xl border border-border/50 bg-card/40 p-6 space-y-4">
                <div className="h-4 w-24 bg-muted rounded-full" />
                <div className="h-6 w-3/4 bg-muted rounded-lg" />
                <div className="h-4 w-full bg-muted/60 rounded-md" />
                <div className="h-10 w-full bg-muted/40 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredCourts.length === 0 ? (
          <div className="text-center py-24 bg-card/40 rounded-3xl border border-dashed border-border p-8">
            <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground">Heç bir məhkəmə tapılmadı</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Axtarış sözünü dəyişin və ya seçilmiş filtrləri sıfırlayın.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedCourts.map((court) => {
                const theme = getTypeTheme(court.type)
                const mapQuery = encodeURIComponent(`${court.title} ${court.address || 'Azərbaycan'}`)
                const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`
                const mapEmbedSrc = `https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`
                const isMapLoaded = activeMapId === court.id

                return (
                  <div
                    key={court.id}
                    className={`bg-card/75 dark:bg-card/40 backdrop-blur-xl border border-border/70 rounded-3xl overflow-hidden transition-all duration-300 flex flex-col justify-between group shadow-sm hover:shadow-xl ${theme.glow}`}
                  >
                    <div>
                      {/* Interactive Lightweight Map Header */}
                      <div className="relative w-full h-40 bg-gradient-to-br from-emerald-950/20 via-background/40 to-muted/50 overflow-hidden border-b border-border/50">
                        {isMapLoaded ? (
                          <iframe
                            src={mapEmbedSrc}
                            title={court.title}
                            width="100%"
                            height="100%"
                            loading="lazy"
                            className="w-full h-full border-0 filter opacity-95 contrast-105"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 relative group/cover cursor-pointer"
                               onClick={() => setActiveMapId(court.id)}>
                            {/* Stylized Map Grid Pattern */}
                            <div className="absolute inset-0 opacity-20 dark:opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent pointer-events-none" />

                            <div className="relative z-10 flex flex-col items-center text-center">
                              <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mb-2 group-hover/cover:scale-110 group-hover/cover:bg-emerald-500/25 transition-all shadow-sm">
                                <Navigation className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-semibold text-foreground/90 group-hover/cover:text-primary transition-colors flex items-center gap-1">
                                Canlı xəritəni aç
                              </span>
                              <span className="text-[10px] text-muted-foreground mt-0.5">
                                İnteraktiv xəritə və ya Google Maps
                              </span>
                            </div>

                            {/* Direct External Map Link button */}
                            <a
                              href={googleMapsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="absolute bottom-2 right-3 z-20 text-[11px] font-medium text-muted-foreground hover:text-foreground bg-background/80 hover:bg-background px-2.5 py-1 rounded-lg border border-border/60 backdrop-blur-sm flex items-center gap-1 transition-all shadow-xs"
                              title="Google Maps-də birbaşa bax"
                            >
                              <span>Xəritədə aç</span>
                              <ExternalLink className="w-3 h-3 text-primary" />
                            </a>
                          </div>
                        )}

                        {/* Glassmorphic Type & Region Badges on Map */}
                        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/90 dark:bg-card/90 backdrop-blur-md border border-border/60 shadow-xs">
                            {theme.icon}
                            <span className="text-[11px] font-bold text-foreground">
                              {court.type}
                            </span>
                          </div>

                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-background/90 dark:bg-card/90 backdrop-blur-md border border-border/60 shadow-xs text-muted-foreground">
                            {court.region}
                          </span>
                        </div>
                      </div>

                      {/* Card Content Body */}
                      <div className="p-5">
                        {/* Court Title */}
                        <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors leading-snug mb-3">
                          {court.title}
                        </h3>

                        {/* Official Address */}
                        {court.address ? (
                          <div className="flex items-start gap-2.5 text-xs text-muted-foreground mb-4">
                            <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span className="line-clamp-2 leading-relaxed">{court.address}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground/50 mb-4">
                            <MapPin className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                            <span>Ünvan qeyd olunmayıb</span>
                          </div>
                        )}

                        {/* Contact Badges (Only render if available) */}
                        {(court.phone || court.email) && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {court.phone && (
                              <a
                                href={`tel:${court.phone.replace(/[^0-9+]/g, '')}`}
                                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 bg-muted/40 dark:bg-muted/20 hover:bg-emerald-500/10 hover:border-emerald-500/30 px-3 py-1.5 rounded-full border border-border/50 transition-all font-medium"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span>{court.phone}</span>
                              </a>
                            )}

                            {court.email && (
                              <a
                                href={`mailto:${court.email}`}
                                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-sky-600 dark:hover:text-sky-400 bg-muted/40 dark:bg-muted/20 hover:bg-sky-500/10 hover:border-sky-500/30 px-3 py-1.5 rounded-full border border-border/50 transition-all font-medium truncate max-w-[220px]"
                              >
                                <Mail className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                <span className="truncate">{court.email}</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Load More Button */}
            {visibleCount < filteredCourts.length && (
              <div className="mt-12 text-center">
                <Button
                  onClick={() => setVisibleCount((prev) => prev + 24)}
                  size="lg"
                  className="rounded-2xl px-8 h-12 bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all cursor-pointer"
                >
                  Daha çox göstər ({filteredCourts.length - visibleCount} məhkəmə qaldı)
                </Button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
