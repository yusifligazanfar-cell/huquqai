"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { AlertCircle, Loader2, Sparkles, Wand2 } from "lucide-react"
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_MAP,
  type DocumentTypeId,
  getSuggestedCourtOptions,
  type LegalDocumentFormInput,
} from "@/lib/legal-documents"
import { DocumentIcon } from "./DocumentIcon"

const SAMPLE_PRESETS: Record<DocumentTypeId, Partial<LegalDocumentFormInput>> = {
  contract: {
    subtype: "Borc müqaviləsi",
    referenceInfo: "Bakı şəhəri, 12 ay müddətinə",
    party1: "Əliyev Rəşad Kamran oğlu (FİN: 1AB2C3D, Bakı şəh.)",
    party2: "Məmmədov Tural Elçin oğlu (FİN: 5EF6G7H, Bakı şəh.)",
    amount: "4 000 AZN",
    facts:
      "Borcverən tərəfindən 4 000 AZN məbləğində pul vəsaiti bank köçürməsi yolu ilə borcalana verilir. Borcalan həmin məbləği 12 ay ərzində hissə-hissə və ya müddətin sonunda tam qaytarmağı öhdəsinə götürür.",
    requests:
      "Gecikmə baş verdikdə hər gecikdirilmiş gün üçün 0,1% dəbbə pulu hesablanmalı, mübahisələr danışıqlar və məhkəmə qaydasında həll edilməlidir.",
  },
  petition: {
    courtName: "Nəsimi Rayon Məhkəməsinə",
    referenceInfo: "Mülki mübahisə — borc öhdəliyinin icrası",
    party1: "Əliyev Rəşad Kamran oğlu, Bakı şəhəri, Nəsimi rayonu",
    party2: "Məmmədov Tural Elçin oğlu, Bakı şəhəri, Nəsimi rayonu",
    amount: "3 500 AZN əsas borc",
    facts:
      "15.01.2026-cı il tarixində cavabdehin bank kartına 3 500 AZN məbləğində borc pul köçürmüşəm. Yazılı müqavilə bağlanmasa da, WhatsApp yazışmalarında borcu qaytaracağını təsdiq etmişdir, lakin ödəniş müddəti keçməsinə baxmayaraq borcu qaytarmır.",
    requests:
      "Cavabdehdən 3 500 AZN əsas borcun və ödənilmiş dövlət rüsumunun tutularaq iddiaçıya ödənilməsi barədə qətnamə qəbul edilməsini xahiş edirəm.",
  },
  appeal: {
    courtName: "Bakı Apellyasiya Məhkəməsinə",
    referenceInfo: "Nəsimi Rayon Məhkəməsinin 20.02.2026-cı il tarixli, 2(006)-912/2026 saylı qətnaməsi",
    party1: "Əliyev Rəşad Kamran oğlu (İddiaçı), Bakı şəhəri",
    party2: "Məmmədov Tural Elçin oğlu (Cavabdeh), Bakı şəhəri",
    amount: "5 000 AZN",
    facts:
      "Birinci instansiya məhkəməsi təqdim edilmiş bank çıxarışlarına və elektron yazışma sübutlarına lazımi hüquqi qiymət verməmiş, Mülki Məcəllənin 739-cu maddəsini düzgün tətbiq etmədən iddianı rədd etmişdir.",
    requests:
      "Nəsimi Rayon Məhkəməsinin qətnaməsi ləğv edilsin və iddianın təmin edilməsi barədə yeni qətnamə qəbul edilsin.",
  },
  cassation: {
    courtName: "Azərbaycan Respublikasının Ali Məhkəməsinə",
    referenceInfo: "Bakı Apellyasiya Məhkəməsinin 10.04.2026-cı il tarixli qətnaməsi",
    party1: "Əliyev Rəşad Kamran oğlu (İddiaçı) — Vəkil: Həsənov Elvin",
    party2: "Məmmədov Tural Elçin oğlu (Cavabdeh)",
    amount: "12 000 AZN",
    facts:
      "Apellyasiya instansiyası məhkəməsi MPM-in 88 və 217-ci maddələrinin tələblərini pozaraq iş üzrə mühüm əhəmiyyət kəsb edən yazılı etiraf sübutunu araşdırmamış, maddi hüquq normalarını yanlış şərh etmişdir.",
    requests:
      "Apellyasiya məhkəməsinin qətnaməsi ləğv edilsin və iş yenidən baxılması üçün apellyasiya instansiyası məhkəməsinə göndərilsin.",
  },
  motion: {
    subtype: "Sübutların tələb edilməsi barədə vəsatət",
    courtName: "Yasamal Rayon Məhkəməsinə",
    referenceInfo: "İş № 2(004)-318/2026",
    party1: "Əliyev Rəşad Kamran oğlu (İddiaçı)",
    party2: "Məmmədov Tural Elçin oğlu (Cavabdeh)",
    amount: "2 800 AZN bank köçürməsi",
    facts:
      "Cavabdehin adına açılmış hesab üzrə köçürmə təyinatı sənədlərini bank sirri səbəbindən iddiaçı olaraq müstəqil şəkildə əldə etmək mümkün olmadığından məhkəmə sorğusuna zərurət yaranmışdır.",
    requests:
      "Müvafiq bankdan 01.01.2026–01.03.2026-cı il tarixləri üzrə əməliyyat çıxarışlarının tələb edilməsi barədə qərardad qəbul edilsin.",
  },
  objection: {
    subtype: "Məhkəmə əmrinə etiraz ərizəsi",
    courtName: "Sabunçu Rayon Məhkəməsinə",
    referenceInfo: "04.03.2026-cı il tarixli məhkəmə əmri",
    party1: "Məmmədov Tural Elçin oğlu (Borclu), Bakı şəhəri",
    party2: "\"ABC Kredit\" MMC (Tələbkar)",
    amount: "1 450 AZN",
    facts:
      "Tələb olunan məbləğin əsas hissəsi artıq 12.02.2026-cı il tarixində ödənilmişdir, hesablanan cərimə faizləri isə müqavilə şərtlərinə uyğun deyil.",
    requests:
      "Tələbə dair əsaslı mübahisə mövcud olduğundan verilmiş məhkəmə əmrinin ləğv edilməsini xahiş edirəm.",
  },
  qarar: {
    courtName: "Nümunə Birinci İnstansiya Məhkəməsi (Tədris Ssenarisi)",
    referenceInfo: "Təhsil nümunəsi № 01/2026 — Mülki mübahisə",
    party1: "Şərti iddiaçı — A. Vəliyev",
    party2: "Şərti cavabdeh — B. Həsənov",
    amount: "3 000 AZN borc tələbi",
    facts:
      "Tərəflər arasında yazılı müqavilə olmadan bank köçürməsi ilə 3 000 AZN verilmişdir. İddiaçı bank qəbzi və mesaj yazışmalarını təqdim etmiş, cavabdeh borcun qaytarılmalı olduğunu inkar etməmişdir.",
    requests: "Tədris ssenarisi üzrə iddianın təmin edilməsi istiqamətində əsaslandırma layihəsi.",
  },
}

interface DocumentCreatorFormProps {
  docType: DocumentTypeId
  onDocTypeChange?: (nextType: DocumentTypeId) => void
  allowDocTypeSwitch?: boolean
  initialFacts?: string
  initialRequests?: string
  initialCourtName?: string
  chatContext?: string
  legalArticles?: { title: string; articleNumber?: string; content: string }[]
  isSubmitting: boolean
  onGenerate: (input: LegalDocumentFormInput) => Promise<void> | void
  submitError?: string
}

export function DocumentCreatorForm({
  docType,
  onDocTypeChange,
  allowDocTypeSwitch = false,
  initialFacts = "",
  initialRequests = "",
  initialCourtName = "",
  chatContext,
  legalArticles,
  isSubmitting,
  onGenerate,
  submitError,
}: DocumentCreatorFormProps) {
  const spec = DOCUMENT_TYPE_MAP[docType] || DOCUMENT_TYPE_MAP.petition
  const headingId = useId()
  const courtListId = useId()
  const baseId = useId()

  const [subtype, setSubtype] = useState(spec.subtypeOptions?.[0] || "")
  const [courtName, setCourtName] = useState(initialCourtName || spec.defaultCourt || "")
  const [referenceInfo, setReferenceInfo] = useState("")
  const [party1, setParty1] = useState("")
  const [party2, setParty2] = useState("")
  const [amount, setAmount] = useState("")
  const [facts, setFacts] = useState(initialFacts)
  const [requests, setRequests] = useState(initialRequests)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const party1Ref = useRef<HTMLInputElement>(null)
  const factsRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setSubtype(spec.subtypeOptions?.[0] || "")
    setCourtName((prev) =>
      initialCourtName ? initialCourtName : spec.defaultCourt || (spec.requiresCourt ? prev : "")
    )
    setTouched({})
  }, [docType, spec, initialCourtName])

  const courtOptions = useMemo(() => getSuggestedCourtOptions(docType), [docType])

  const errors = useMemo(() => {
    const out: Record<string, string> = {}
    if (!party1.trim()) {
      out.party1 = "Zəhmət olmasa birinci tərəfin (ərizəçinin) adını daxil edin."
    }
    if (!facts.trim()) {
      out.facts = "Zəhmət olmasa faktiki halları və ya sənədin şərtlərini qeyd edin."
    }
    return out
  }, [party1, facts])

  const fillSample = () => {
    const sample = SAMPLE_PRESETS[docType]
    if (!sample) return
    if (sample.subtype) setSubtype(sample.subtype)
    if (sample.courtName !== undefined) setCourtName(sample.courtName)
    if (sample.referenceInfo !== undefined) setReferenceInfo(sample.referenceInfo)
    if (sample.party1 !== undefined) setParty1(sample.party1)
    if (sample.party2 !== undefined) setParty2(sample.party2)
    if (sample.amount !== undefined) setAmount(sample.amount)
    if (!facts.trim() && sample.facts) setFacts(sample.facts)
    if (!requests.trim() && sample.requests) setRequests(sample.requests)
    setTouched({})
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setTouched({ party1: true, facts: true })

    if (errors.party1) {
      party1Ref.current?.focus()
      return
    }
    if (errors.facts) {
      factsRef.current?.focus()
      return
    }

    await onGenerate({
      docType,
      subtype: spec.subtypeOptions ? subtype : undefined,
      courtName: spec.requiresCourt ? courtName.trim() : undefined,
      referenceInfo: referenceInfo.trim() || undefined,
      party1: party1.trim(),
      party2: party2.trim() || undefined,
      amount: amount.trim() || undefined,
      facts: facts.trim(),
      requests: requests.trim() || undefined,
      chatContext,
      legalArticles,
    })
  }

  const inputClass =
    "w-full min-h-12 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base text-slate-950 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"

  const invalidInputClass =
    "w-full min-h-12 rounded-xl border-2 border-rose-600 dark:border-rose-500 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base text-slate-950 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby={headingId}
      className="space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border shrink-0 ${spec.accentClass}`}
          >
            <DocumentIcon name={spec.iconName} className="w-5 h-5" />
          </span>
          <div>
            <h2
              id={headingId}
              className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white tracking-tight"
            >
              {spec.title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {spec.description}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fillSample}
          className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3.5 py-2 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Nümunə ilə doldur</span>
        </button>
      </div>

      {allowDocTypeSwitch && onDocTypeChange && (
        <div>
          <label
            htmlFor={`${baseId}-doctype`}
            className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5"
          >
            Sənədin növü
          </label>
          <select
            id={`${baseId}-doctype`}
            value={docType}
            onChange={(e) => onDocTypeChange(e.target.value as DocumentTypeId)}
            className={inputClass}
          >
            {DOCUMENT_TYPES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {spec.educationalOnly && (
        <div
          role="note"
          className="rounded-xl border border-amber-300 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-950 dark:text-amber-200"
        >
          <strong className="font-bold">Diqqət:</strong> Bu alət{" "}
          <strong>yalnız təhsil məqsədilə</strong> şablon əsasında qərar mətn
          nümunələri hazırlayır və rəsmi məhkəmə aktı hesab edilmir.
        </div>
      )}

      {(spec.subtypeOptions || spec.requiresCourt || spec.referenceLabel) && (
        <fieldset className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4">
          <legend className="px-2 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Sənəd rekvizitləri
          </legend>

          {spec.subtypeOptions && (
            <div>
              <label
                htmlFor={`${baseId}-subtype`}
                className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5"
              >
                {spec.subtypeLabel}
              </label>
              <select
                id={`${baseId}-subtype`}
                value={subtype}
                onChange={(e) => setSubtype(e.target.value)}
                className={inputClass}
              >
                {spec.subtypeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {spec.requiresCourt && (
            <div>
              <label
                htmlFor={`${baseId}-court`}
                className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5"
              >
                Ünvanlandığı məhkəmə / orqan{" "}
                <span className="font-normal text-slate-500 dark:text-slate-400">
                  (istəyə bağlı — boş qalsa avtomatik təyin ediləcək)
                </span>
              </label>
              <input
                id={`${baseId}-court`}
                type="text"
                list={courtListId}
                value={courtName}
                onChange={(e) => setCourtName(e.target.value)}
                placeholder="Məs: Nəsimi Rayon Məhkəməsinə"
                className={inputClass}
              />
              <datalist id={courtListId}>
                {courtOptions.map((court) => (
                  <option key={court} value={court} />
                ))}
              </datalist>
            </div>
          )}

          {spec.referenceLabel && (
            <div>
              <label
                htmlFor={`${baseId}-ref`}
                className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5"
              >
                {spec.referenceLabel}
              </label>
              <input
                id={`${baseId}-ref`}
                type="text"
                value={referenceInfo}
                onChange={(e) => setReferenceInfo(e.target.value)}
                placeholder={spec.referencePlaceholder}
                className={inputClass}
              />
            </div>
          )}
        </fieldset>
      )}

      <fieldset className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4">
        <legend className="px-2 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Tərəflər və dəyər
        </legend>

        <div>
          <label
            htmlFor={`${baseId}-party1`}
            className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5"
          >
            {spec.party1Label}{" "}
            <span className="text-rose-600 dark:text-rose-400" aria-hidden="true">
              *
            </span>
          </label>
          <input
            ref={party1Ref}
            id={`${baseId}-party1`}
            type="text"
            autoComplete="name"
            required
            aria-required="true"
            aria-invalid={Boolean(touched.party1 && errors.party1)}
            aria-describedby={touched.party1 && errors.party1 ? `${baseId}-party1-err` : undefined}
            value={party1}
            onChange={(e) => setParty1(e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, party1: true }))}
            placeholder={spec.party1Placeholder}
            className={touched.party1 && errors.party1 ? invalidInputClass : inputClass}
          />
          {touched.party1 && errors.party1 && (
            <p
              id={`${baseId}-party1-err`}
              role="alert"
              className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-rose-700 dark:text-rose-400"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{errors.party1}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={`${baseId}-party2`}
              className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5"
            >
              {spec.party2Label}
            </label>
            <input
              id={`${baseId}-party2`}
              type="text"
              value={party2}
              onChange={(e) => setParty2(e.target.value)}
              placeholder={spec.party2Placeholder}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor={`${baseId}-amount`}
              className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5"
            >
              {spec.amountLabel}
            </label>
            <input
              id={`${baseId}-amount`}
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={spec.amountPlaceholder}
              className={inputClass}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4">
        <legend className="px-2 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Məzmun və tələblər
        </legend>

        <div>
          <label
            htmlFor={`${baseId}-facts`}
            className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5"
          >
            {spec.factsLabel}{" "}
            <span className="text-rose-600 dark:text-rose-400" aria-hidden="true">
              *
            </span>
          </label>
          <textarea
            ref={factsRef}
            id={`${baseId}-facts`}
            rows={5}
            required
            aria-required="true"
            aria-invalid={Boolean(touched.facts && errors.facts)}
            aria-describedby={touched.facts && errors.facts ? `${baseId}-facts-err` : undefined}
            value={facts}
            onChange={(e) => setFacts(e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, facts: true }))}
            placeholder={spec.factsPlaceholder}
            className={`${
              touched.facts && errors.facts ? invalidInputClass : inputClass
            } min-h-[130px] leading-relaxed`}
          />
          {touched.facts && errors.facts && (
            <p
              id={`${baseId}-facts-err`}
              role="alert"
              className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-rose-700 dark:text-rose-400"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{errors.facts}</span>
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`${baseId}-requests`}
            className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5"
          >
            {spec.requestsLabel}
          </label>
          <textarea
            id={`${baseId}-requests`}
            rows={3}
            value={requests}
            onChange={(e) => setRequests(e.target.value)}
            placeholder={spec.requestsPlaceholder}
            className={`${inputClass} min-h-[96px] leading-relaxed`}
          />
        </div>
      </fieldset>

      {submitError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-4 py-3 text-sm font-semibold text-rose-800 dark:text-rose-200 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="pt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p role="status" aria-live="polite" className="text-xs text-slate-600 dark:text-slate-400">
          {isSubmitting
            ? "Qanunvericilik normaları yoxlanılır və rəsmi sənəd mətni hazırlanır..."
            : "Məlumatları qeyd etdikdən sonra sənəd saniyələr içində tərtib ediləcək."}
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 min-h-12 px-6 py-3 rounded-xl text-base font-extrabold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white shadow-md shadow-indigo-600/20 transition-all w-full sm:w-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span>Hazırlanır...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" aria-hidden="true" />
              <span>Sənədi Hazırla</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
