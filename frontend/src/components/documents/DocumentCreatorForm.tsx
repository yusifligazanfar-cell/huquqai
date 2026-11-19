"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { AlertCircle, AlertTriangle, ChevronDown, Loader2, Paperclip, Sparkles, Wand2 } from "lucide-react"
import { DOCUMENT_SAMPLE_PRESETS } from "@/lib/legal-document-presets"
import {
  checkMissingDocumentRequirements,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_MAP,
  type DocumentTypeId,
  getSuggestedCourtOptions,
  type LegalDocumentFormInput,
} from "@/lib/legal-documents"
import { DocumentIcon } from "./DocumentIcon"

interface DocumentCreatorFormProps {
  docType: DocumentTypeId
  onDocTypeChange?: (nextType: DocumentTypeId) => void
  allowDocTypeSwitch?: boolean
  initialFacts?: string
  initialRequests?: string
  initialCourtName?: string
  chatContext?: string
  legalArticles?: { title: string; articleNumber?: string; content: string; url?: string }[]
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
  const [caseNumber, setCaseNumber] = useState("")
  const [disputedActInfo, setDisputedActInfo] = useState("")
  const [mediationInfo, setMediationInfo] = useState("")
  const [legalViolationInfo, setLegalViolationInfo] = useState("")
  const [advocateInfo, setAdvocateInfo] = useState("")

  const [party1, setParty1] = useState("")
  const [party1Id, setParty1Id] = useState("")
  const [party1Address, setParty1Address] = useState("")
  const [party1Phone, setParty1Phone] = useState("")
  const [party1Email, setParty1Email] = useState("")

  const [party2, setParty2] = useState("")
  const [party2Id, setParty2Id] = useState("")
  const [party2Address, setParty2Address] = useState("")

  const [amount, setAmount] = useState("")
  const [facts, setFacts] = useState(initialFacts)
  const [requests, setRequests] = useState(initialRequests)
  const [attachmentsText, setAttachmentsText] = useState("")
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
      out.party1 = `Zəhmət olmasa "${spec.party1RoleLabel}" xanəsini doldurun.`
    }
    if (!facts.trim()) {
      out.facts = "Zəhmət olmasa faktiki halları və ya sənədin əsas məzmununu daxil edin."
    }
    return out
  }, [party1, facts, spec.party1RoleLabel])

  const liveInputPreview: LegalDocumentFormInput = useMemo(
    () => ({
      docType,
      subtype: spec.subtypeOptions ? subtype : undefined,
      courtName: spec.requiresCourt || spec.fieldVisibility.showCourtOrAddressee ? courtName.trim() : undefined,
      referenceInfo: referenceInfo.trim() || undefined,
      caseNumber: caseNumber.trim() || undefined,
      disputedActInfo: disputedActInfo.trim() || undefined,
      mediationInfo: mediationInfo.trim() || undefined,
      legalViolationInfo: legalViolationInfo.trim() || undefined,
      advocateInfo: advocateInfo.trim() || undefined,
      party1: party1.trim(),
      party1Id: party1Id.trim() || undefined,
      party1Address: party1Address.trim() || undefined,
      party1Phone: party1Phone.trim() || undefined,
      party1Email: party1Email.trim() || undefined,
      party2: party2.trim() || undefined,
      party2Id: party2Id.trim() || undefined,
      party2Address: party2Address.trim() || undefined,
      amount: amount.trim() || undefined,
      facts: facts.trim(),
      requests: requests.trim() || undefined,
      attachmentsText: attachmentsText.trim() || undefined,
      chatContext,
      legalArticles,
    }),
    [
      docType,
      spec,
      subtype,
      courtName,
      referenceInfo,
      caseNumber,
      disputedActInfo,
      mediationInfo,
      legalViolationInfo,
      advocateInfo,
      party1,
      party1Id,
      party1Address,
      party1Phone,
      party1Email,
      party2,
      party2Id,
      party2Address,
      amount,
      facts,
      requests,
      attachmentsText,
      chatContext,
      legalArticles,
    ]
  )

  const preflightWarnings = useMemo(() => {
    if (!party1.trim() && !facts.trim()) return []
    return checkMissingDocumentRequirements(liveInputPreview)
  }, [liveInputPreview, party1, facts])

  const fillSample = () => {
    const sample = DOCUMENT_SAMPLE_PRESETS[docType]
    if (!sample) return
    if (sample.subtype) setSubtype(sample.subtype)
    if (sample.courtName !== undefined) setCourtName(sample.courtName)
    if (sample.referenceInfo !== undefined) setReferenceInfo(sample.referenceInfo)
    if (sample.caseNumber !== undefined) setCaseNumber(sample.caseNumber)
    if (sample.disputedActInfo !== undefined) setDisputedActInfo(sample.disputedActInfo)
    if (sample.mediationInfo !== undefined) setMediationInfo(sample.mediationInfo)
    if (sample.legalViolationInfo !== undefined) setLegalViolationInfo(sample.legalViolationInfo)
    if (sample.advocateInfo !== undefined) setAdvocateInfo(sample.advocateInfo)
    if (sample.party1 !== undefined) setParty1(sample.party1)
    if (sample.party1Id !== undefined) setParty1Id(sample.party1Id)
    if (sample.party1Address !== undefined) setParty1Address(sample.party1Address)
    if (sample.party1Phone !== undefined) setParty1Phone(sample.party1Phone)
    if (sample.party1Email !== undefined) setParty1Email(sample.party1Email)
    if (sample.party2 !== undefined) setParty2(sample.party2)
    if (sample.party2Id !== undefined) setParty2Id(sample.party2Id)
    if (sample.party2Address !== undefined) setParty2Address(sample.party2Address)
    if (sample.amount !== undefined) setAmount(sample.amount)
    if (!facts.trim() && sample.facts) setFacts(sample.facts)
    if (!requests.trim() && sample.requests) setRequests(sample.requests)
    if (sample.attachmentsText !== undefined) setAttachmentsText(sample.attachmentsText)
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

    await onGenerate(liveInputPreview)
  }

  const inputClass =
    "w-full min-h-12 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base text-slate-950 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"

  const invalidInputClass =
    "w-full min-h-12 rounded-xl border-2 border-rose-600 dark:border-rose-500 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base text-slate-950 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"

  const fv = spec.fieldVisibility

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
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">
              {spec.legalBasisSummary}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fillSample}
          className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
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
            Sənədin növü (19 generator)
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

      {(spec.educationalOnly || spec.limitationNote) && (
        <div
          role="note"
          className="rounded-xl border border-amber-300 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-xs sm:text-sm text-amber-950 dark:text-amber-200 leading-relaxed"
        >
          <strong className="font-bold">Hüquqi qeyd:</strong>{" "}
          {spec.limitationNote || spec.description}
        </div>
      )}

      {/* Fieldset 1: Addressee / Procedural Context */}
      {(spec.subtypeOptions || fv.showCourtOrAddressee || spec.referenceLabel || fv.showDisputedAct || fv.showCaseNumber) && (
        <fieldset className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4">
          <legend className="px-2 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Ünvan və prosessual rekvizitlər
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

          {(fv.showCourtOrAddressee || spec.requiresCourt) && (
            <div>
              <label
                htmlFor={`${baseId}-court`}
                className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5"
              >
                {spec.courtLabel || "Ünvanlandığı məhkəmə / orqan"}{" "}
                <span className="font-normal text-slate-500 dark:text-slate-400">
                  (boş qalsa avtomatik təyin ediləcək)
                </span>
              </label>
              <input
                id={`${baseId}-court`}
                type="text"
                list={courtListId}
                value={courtName}
                onChange={(e) => setCourtName(e.target.value)}
                placeholder={spec.courtPlaceholder || "Məs: Nəsimi Rayon Məhkəməsinə"}
                className={inputClass}
              />
              <datalist id={courtListId}>
                {courtOptions.map((court) => (
                  <option key={court} value={court} />
                ))}
              </datalist>
            </div>
          )}

          {fv.showDisputedAct && (
            <div>
              <label
                htmlFor={`${baseId}-disputed`}
                className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5"
              >
                Mübahisələndirilən qərar / qətnamə / inzibati akt (tarix və №)
              </label>
              <input
                id={`${baseId}-disputed`}
                type="text"
                value={disputedActInfo}
                onChange={(e) => setDisputedActInfo(e.target.value)}
                placeholder="Məs: 20.02.2026-cı il tarixli qətnamə"
                className={inputClass}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fv.showCaseNumber && (
              <div>
                <label
                  htmlFor={`${baseId}-caseno`}
                  className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5"
                >
                  İşin nömrəsi (əgər məlumdursa)
                </label>
                <input
                  id={`${baseId}-caseno`}
                  type="text"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder="Məs: 2(006)-912/2026"
                  className={inputClass}
                />
              </div>
            )}

            {spec.referenceLabel && (
              <div className={fv.showCaseNumber ? "" : "md:col-span-2"}>
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
          </div>

          {fv.showMediation && (
            <div>
              <label
                htmlFor={`${baseId}-mediation`}
                className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5"
              >
                Mediasiya / Pretenziya məlumatı (MPM m. 149.2.4, 149.2.4-1)
              </label>
              <input
                id={`${baseId}-mediation`}
                type="text"
                value={mediationInfo}
                onChange={(e) => setMediationInfo(e.target.value)}
                placeholder="Məs: İlkin mediasiya sessiyası keçirilib (Arayış № ...) və ya tələb olunmur"
                className={inputClass}
              />
            </div>
          )}

          {fv.showAdvocate && (
            <div>
              <label
                htmlFor={`${baseId}-advocate`}
                className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5"
              >
                Vəkil məlumatları və Order № (MPM m. 407.3 / Vəkil sorğusu)
              </label>
              <input
                id={`${baseId}-advocate`}
                type="text"
                value={advocateInfo}
                onChange={(e) => setAdvocateInfo(e.target.value)}
                placeholder="Məs: Vəkil Həsənov Elvin Məmməd oğlu, Order № 004512"
                className={inputClass}
              />
            </div>
          )}
        </fieldset>
      )}

      {/* Fieldset 2: Parties */}
      <fieldset className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4">
        <legend className="px-2 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Tərəflərin məlumatları
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

        {(fv.showParty2 !== false || fv.showAmount !== false) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fv.showParty2 !== false && (
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
            )}

            {fv.showAmount !== false && (
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
            )}
          </div>
        )}

        {/* Collapsible identification & address block (prevents clutter on mobile while giving full MPM 149 precision) */}
        <details className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 px-3.5 py-2.5">
          <summary className="cursor-pointer list-none flex items-center justify-between text-xs font-extrabold text-indigo-700 dark:text-indigo-300">
            <span>Şəxsiyyət və əlaqə rekvizitləri (FİN/VÖEN, Ünvan, Telefon, E-poçt)</span>
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          </summary>
          <div className="mt-3 space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${baseId}-p1id`} className="block text-xs font-bold mb-1">
                  FİN kod və ya VÖEN ({spec.party1RoleLabel})
                </label>
                <input
                  id={`${baseId}-p1id`}
                  type="text"
                  value={party1Id}
                  onChange={(e) => setParty1Id(e.target.value)}
                  placeholder="Məs: 1AB2C3D / VÖEN"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor={`${baseId}-p1phone`} className="block text-xs font-bold mb-1">
                  Əlaqə telefonu
                </label>
                <input
                  id={`${baseId}-p1phone`}
                  type="tel"
                  autoComplete="tel"
                  value={party1Phone}
                  onChange={(e) => setParty1Phone(e.target.value)}
                  placeholder="+994 50 ..."
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${baseId}-p1addr`} className="block text-xs font-bold mb-1">
                  Ünvan ({spec.party1RoleLabel})
                </label>
                <input
                  id={`${baseId}-p1addr`}
                  type="text"
                  autoComplete="street-address"
                  value={party1Address}
                  onChange={(e) => setParty1Address(e.target.value)}
                  placeholder="Şəhər, rayon, küçə"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor={`${baseId}-p1email`} className="block text-xs font-bold mb-1">
                  Elektron poçt ünvanı
                </label>
                <input
                  id={`${baseId}-p1email`}
                  type="email"
                  autoComplete="email"
                  value={party1Email}
                  onChange={(e) => setParty1Email(e.target.value)}
                  placeholder="ad@numune.az"
                  className={inputClass}
                />
              </div>
            </div>

            {fv.showParty2 !== false && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`${baseId}-p2id`} className="block text-xs font-bold mb-1">
                    Qarşı tərəfin VÖEN / FİN (məlumdursa)
                  </label>
                  <input
                    id={`${baseId}-p2id`}
                    type="text"
                    value={party2Id}
                    onChange={(e) => setParty2Id(e.target.value)}
                    placeholder="Məs: VÖEN"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={`${baseId}-p2addr`} className="block text-xs font-bold mb-1">
                    Qarşı tərəfin ünvanı
                  </label>
                  <input
                    id={`${baseId}-p2addr`}
                    type="text"
                    value={party2Address}
                    onChange={(e) => setParty2Address(e.target.value)}
                    placeholder="Rayon, ünvan"
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>
        </details>
      </fieldset>

      {/* Fieldset 3: Facts, Legal Grounds, Requests & Attachments */}
      <fieldset className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4">
        <legend className="px-2 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Faktlar, əsaslar və əlavələr
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

        {fv.showLegalViolation && (
          <div>
            <label
              htmlFor={`${baseId}-violation`}
              className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5"
            >
              Pozulmuş maddi və prosessual hüquq normaları
            </label>
            <textarea
              id={`${baseId}-violation`}
              rows={3}
              value={legalViolationInfo}
              onChange={(e) => setLegalViolationInfo(e.target.value)}
              placeholder="Məhkəmə və ya orqanın yanlış tətbiq etdiyi maddələri və prosessual pozuntuları qeyd edin..."
              className={`${inputClass} min-h-[84px] leading-relaxed`}
            />
          </div>
        )}

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

        <div>
          <label
            htmlFor={`${baseId}-attachments`}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5"
          >
            <Paperclip className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <span>
              Əlavə edilən sənədlərin siyahısı{" "}
              <span className="font-normal text-slate-500 dark:text-slate-400">
                (hər sətrə 1 sənəd — boş qalsa uydurma əlavə yazılmayacaq)
              </span>
            </span>
          </label>
          <textarea
            id={`${baseId}-attachments`}
            rows={2}
            value={attachmentsText}
            onChange={(e) => setAttachmentsText(e.target.value)}
            placeholder="Məs: Dövlət rüsumu qəbzi&#10;Bank köçürməsi çıxarışı"
            className={`${inputClass} min-h-[72px]`}
          />
        </div>
      </fieldset>

      {preflightWarnings.length > 0 && (
        <div
          role="note"
          className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200 space-y-1"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Tam sənəd üçün tövsiyə edilən məlumatlar:</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {preflightWarnings.slice(0, 3).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

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
            ? "Qanunvericilik normaları yoxlanılır və rəsmi A4 sənəd strukturlaşdırılır..."
            : "Təqdim edilən sənəd rəsmi A4 formatında hazırlanır, DOCX və PDF olaraq ixrac edilə bilər."}
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 min-h-12 px-6 py-3 rounded-xl text-base font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-white shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all w-full sm:w-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
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
