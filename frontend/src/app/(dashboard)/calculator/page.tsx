"use client"

import { useState, useMemo } from "react"
import { 
  Calculator, 
  Coins, 
  CheckCircle2, 
  RefreshCw, 
  BookOpen,
  ChevronDown,
  Info,
  Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import serviceCodesData from "@/data/service_codes.json"
import { calculateCourtFee, CalculationResponse } from "@/app/actions/calculator"

interface ChildCode {
  id: number;
  code: number;
  name: string;
  isConstantAmount: boolean;
  minRange: number;
  maxRange: number;
}

interface ParentCategory {
  code: number;
  name: string;
  minRange: number;
  maxRange: number;
  children: ChildCode[];
}

const CATEGORIES: ParentCategory[] = serviceCodesData as ParentCategory[];

export default function CalculatorPage() {
  const [selectedParentCode, setSelectedParentCode] = useState<number>(14221100)
  const [selectedSubCode, setSelectedSubCode] = useState<number>(14221102)
  const [claimAmount, setClaimAmount] = useState<string>("")
  const [pageCount, setPageCount] = useState<string>("1")

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [calcResult, setCalcResult] = useState<CalculationResponse | null>(null)
  const [hasCalculated, setHasCalculated] = useState<boolean>(false)

  const currentCategory = useMemo(() => {
    return CATEGORIES.find(c => c.code === selectedParentCode) || CATEGORIES[0]
  }, [selectedParentCode])

  const currentChild = useMemo(() => {
    return currentCategory.children.find(c => c.code === selectedSubCode) || currentCategory.children[0]
  }, [currentCategory, selectedSubCode])

  const handleParentChange = (code: number) => {
    setSelectedParentCode(code)
    const cat = CATEGORIES.find(c => c.code === code)
    if (cat && cat.children.length > 0) {
      setSelectedSubCode(cat.children[0].code)
    }
    setHasCalculated(false)
    setCalcResult(null)
  }

  const handleSubCodeChange = (code: number) => {
    setSelectedSubCode(code)
    setHasCalculated(false)
    setCalcResult(null)
  }

  const needsClaimAmount = useMemo(() => {
    if (!currentChild) return false
    return !currentChild.isConstantAmount && selectedParentCode !== 14221900
  }, [currentChild, selectedParentCode])

  const isCopyRequest = useMemo(() => {
    return selectedParentCode === 14221900 || selectedSubCode === 14221900
  }, [selectedParentCode, selectedSubCode])

  const handleCalculate = async () => {
    if (!currentChild) return
    setIsLoading(true)

    const numClaim = parseFloat(claimAmount) || 0
    const numPage = parseInt(pageCount, 10) || 1

    try {
      const res = await calculateCourtFee({
        parentServiceCode: selectedParentCode,
        serviceCode: selectedSubCode,
        claimAmount: numClaim,
        page: numPage
      })
      setCalcResult(res)
      setHasCalculated(true)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen text-foreground selection:bg-emerald-500/30 font-sans pb-20">
      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 pt-6 sm:pt-10 md:pt-14">
        
        {/* Header Title Section */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3.5 backdrop-blur-md">
            <Calculator className="w-3.5 h-3.5" />
            <span>Rəsmi Məhkəmə Rüsumu Kalkulyatoru</span>
          </div>
          
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3 leading-tight">
            Məhkəmə Dövlət Rüsumunun Hesablanması
          </h1>
        </div>

        {/* Main 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          
          {/* Left Column: Interactive Form Controls */}
          <div className="lg:col-span-7 bg-white/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-5 sm:p-8 backdrop-blur-xl shadow-xl dark:shadow-2xl shadow-slate-200/50 dark:shadow-black/50 space-y-6 sm:space-y-7">
            
            {/* Step 1: Parent Service Category */}
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold shadow-sm">
                    1
                  </span>
                  Müraciət və ya İddia Kateqoriyası
                </label>
                <span className="text-[11px] text-slate-500 font-medium">7 kateqoriya</span>
              </div>

              <div className="relative">
                <select
                  value={selectedParentCode}
                  onChange={(e) => handleParentChange(Number(e.target.value))}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-600 text-slate-900 dark:text-white rounded-2xl px-4 py-3.5 pr-10 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all cursor-pointer shadow-inner"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.code} value={cat.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2">
                      {cat.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <Badge variant="outline" className="border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 text-[11px] font-normal py-0.5">
                  Alt xidmətlər: <span className="text-slate-900 dark:text-slate-200 ml-1 font-medium">{currentCategory.children.length} növ</span>
                </Badge>
              </div>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800/70" />

            {/* Step 2: Child Service Code Selection */}
            <div className="space-y-2.5 sm:space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold shadow-sm">
                  2
                </span>
                Xidmətin Növü və İddia Dərəcəsi
              </label>

              <div className="relative">
                <select
                  value={selectedSubCode}
                  onChange={(e) => handleSubCodeChange(Number(e.target.value))}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-600 text-slate-900 dark:text-white rounded-2xl px-4 py-3.5 pr-10 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all cursor-pointer shadow-inner"
                >
                  {currentCategory.children.map((child) => (
                    <option key={child.code} value={child.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2">
                      {child.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              {currentChild && (
                <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/70 leading-relaxed flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-900 dark:text-slate-300 font-semibold">Seçilmiş alt xidmət: </span>
                    {currentChild.name}
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Dynamic Variable Inputs (Claim Amount or Page Count) */}
            {(needsClaimAmount || isCopyRequest) && (
              <>
                <div className="h-px bg-slate-200 dark:bg-slate-800/70" />
                <div className="space-y-2.5 sm:space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold shadow-sm">
                      3
                    </span>
                    {isCopyRequest ? "Sənədin Səhifə Sayı" : "İddia Qiyməti (Məbləğ)"}
                  </label>

                  {isCopyRequest ? (
                    <div>
                      <div className="relative">
                        <Input
                          type="number"
                          min={1}
                          max={500}
                          value={pageCount}
                          onChange={(e) => {
                            setPageCount(e.target.value)
                            setHasCalculated(false)
                          }}
                          placeholder="Məsələn: 4"
                          className="bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white font-mono text-base py-5 pl-4 pr-16 rounded-2xl focus:border-emerald-500 focus:ring-emerald-500/20"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 uppercase">
                          Səhifə
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Qanuna əsasən məhkəmə aktının surətinin təkrar verilməsi üçün hər səhifəyə 2 AZN rüsum tutulur.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Input
                          type="number"
                          min={currentChild?.minRange || 0}
                          max={currentChild?.maxRange > 0 ? currentChild.maxRange : undefined}
                          value={claimAmount}
                          onChange={(e) => {
                            setClaimAmount(e.target.value)
                            setHasCalculated(false)
                          }}
                          placeholder={
                            currentChild?.minRange && currentChild?.maxRange
                              ? `${currentChild.minRange} - ${currentChild.maxRange} AZN aralığında məbləğ daxil edin`
                              : currentChild?.minRange
                              ? `${currentChild.minRange} AZN-dən yuxarı məbləğ daxil edin`
                              : "Məsələn: 2500"
                          }
                          className="bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white font-mono text-base py-5 pl-4 pr-16 rounded-2xl focus:border-emerald-500 focus:ring-emerald-500/20"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                          AZN
                        </span>
                      </div>

                      {/* Range details badges */}
                      {currentChild && (
                        <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs">
                          {currentChild.minRange > 0 && (
                            <Badge variant="outline" className="border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400">
                              Minimum: <span className="text-slate-900 dark:text-slate-200 ml-1 font-mono font-semibold">{currentChild.minRange.toLocaleString()} AZN</span>
                            </Badge>
                          )}
                          {currentChild.maxRange > 0 && (
                            <Badge variant="outline" className="border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400">
                              Maksimum: <span className="text-slate-900 dark:text-slate-200 ml-1 font-mono font-semibold">{currentChild.maxRange.toLocaleString()} AZN</span>
                            </Badge>
                          )}
                          {currentChild.maxRange === 0 && currentChild.minRange > 0 && (
                            <Badge variant="outline" className="border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-emerald-600 dark:text-emerald-400">
                              Limit yoxdur ({currentChild.minRange.toLocaleString()} AZN-dən çox)
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Calculate Button */}
            <div className="pt-2">
              <Button
                onClick={handleCalculate}
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-6 rounded-2xl transition-all shadow-xl shadow-emerald-950/30 flex items-center justify-center gap-2.5 text-base active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Hesablanır...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 text-emerald-200" />
                    <span>Rüsumu Hesabla</span>
                  </>
                )}
              </Button>
            </div>

          </div>

          {/* Right Column: Dynamic Calculation Result or Modern Placeholder */}
          <div className="lg:col-span-5 space-y-6">
            
            {hasCalculated && calcResult ? (
              /* Calculated Result Card */
              <div className="bg-white/95 dark:bg-slate-900/80 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl dark:shadow-2xl shadow-slate-200/60 dark:shadow-black/70 relative overflow-hidden transition-all duration-300">
                
                <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between gap-4 mb-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Dövlət Rüsumu Nəticəsi
                  </span>
                </div>

                {/* Prominent Amount Box */}
                <div className="my-4 text-center py-7 px-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/90 rounded-2xl shadow-inner">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1 uppercase tracking-wider">
                    Ödənilməli olan dövlət rüsumu
                  </div>
                  <div className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline justify-center gap-2">
                    <span>{calcResult.totalAmount.toLocaleString()}</span>
                    <span className="text-2xl sm:text-3xl text-emerald-600 dark:text-emerald-400 font-bold">AZN</span>
                  </div>
                  {calcResult.explanation && (
                    <div className="text-xs text-emerald-700 dark:text-emerald-400/90 mt-3 font-medium bg-emerald-50 dark:bg-emerald-950/30 py-1.5 px-3 rounded-lg inline-block border border-emerald-200 dark:border-emerald-500/20">
                      {calcResult.explanation}
                    </div>
                  )}
                </div>

                {/* Details Breakdown */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs py-2.5 border-b border-slate-200 dark:border-slate-800/70">
                    <span className="text-slate-500 dark:text-slate-400">Tələb növü:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-300 text-right">
                      {currentChild?.isConstantAmount ? "Sabit dərəcə" : "İddia məbləğindən mütənasib"}
                    </span>
                  </div>

                  {needsClaimAmount && claimAmount && (
                    <div className="flex items-center justify-between text-xs py-2.5 border-b border-slate-200 dark:border-slate-800/70">
                      <span className="text-slate-500 dark:text-slate-400">Daxil edilmiş iddia qiyməti:</span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">
                        {parseFloat(claimAmount).toLocaleString()} AZN
                      </span>
                    </div>
                  )}

                  {isCopyRequest && (
                    <div className="flex items-center justify-between text-xs py-2.5 border-b border-slate-200 dark:border-slate-800/70">
                      <span className="text-slate-500 dark:text-slate-400">Səhifə sayı:</span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">
                        {pageCount} səhifə
                      </span>
                    </div>
                  )}
                </div>

                {/* Official Payment Note */}
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-slate-200 block mb-0.5">Dövlət rüsumunu necə ödəmək olar?</strong>
                    Rüsumu <strong className="text-slate-800 dark:text-slate-300">gpp.az (Hökumət Ödəniş Portalı)</strong>, <strong className="text-slate-800 dark:text-slate-300">ASAN Pay</strong> və ya bank filialları vasitəsilə birbaşa ödəyə bilərsiniz.
                  </div>
                </div>

              </div>
            ) : (
              /* Awaiting User Input Placeholder */
              <div className="bg-white/80 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-8 sm:p-10 backdrop-blur-xl text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                  <Calculator className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
                    Rüsum Məbləğini Görmək Üçün Hesablayın
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Sol paneldə müvafiq məhkəmə xidmət növünü və lazım gəldikdə iddia qiymətini daxil edib <strong className="text-emerald-600 dark:text-emerald-400">«Rüsumu Hesabla»</strong> düyməsini sıxın.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Legal FAQ & Guidance */}
            <div className="bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 space-y-4 text-xs text-slate-600 dark:text-slate-400 backdrop-blur-xl shadow-sm">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-200 text-sm">
                <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Məhkəmə Rüsumu haqqında Vacib Qeydlər
              </div>
              <ul className="space-y-3 list-disc pl-4 marker:text-emerald-500 leading-relaxed">
                <li>
                  <strong className="text-slate-800 dark:text-slate-300">İddia ərizələri üzrə:</strong> Qiymətləndirilən iddialar üzrə rüsum iddia qiymətinə proporsional pilləli faiz şkalası ilə hesablanır (məsələn, 1.000 manatadək sabit 30 AZN, 1.000–10.000 manat arası 30 AZN + 1% və s.).
                </li>
                <li>
                  <strong className="text-slate-800 dark:text-slate-300">Apellyasiya və kassasiya:</strong> Şikayətlərə görə rüsum birinci instansiya məhkəməsinə verilən iddia ərizəsi üçün müəyyən edilmiş dərəcənin 50 faizi həcmində tutulur.
                </li>
                <li>
                  <strong className="text-slate-800 dark:text-slate-300">Rüsumdan azad olma:</strong> Aliment tələbləri, əmək haqqı və işə bərpa üzrə iddialar qanunvericiliyə əsasən dövlət rüsumundan tam azaddır.
                </li>
              </ul>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
