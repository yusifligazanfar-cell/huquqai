"use server"

import { fetchRemoteGenerateDocument } from "@/lib/legal-rag/remote_backend"
import {
  DOCUMENT_TYPE_MAP,
  type LegalDocumentFormInput,
  resolveTargetCourt,
  buildDeterministicStructuredDoc,
  buildPartyBlocks,
  checkMissingDocumentRequirements,
  parseAttachmentsList,
} from "@/lib/legal-documents"
import {
  cleanParagraphLines,
  EDUCATIONAL_DECISION_BANNER,
  extractStructuredJson,
  PROFESSIONAL_REVIEW_NOTICE,
  serializeStructuredDocToMarkdown,
  toAzUpperCase,
  type DocumentClauseSection,
  type StructuredLegalDocument,
  type VerifiedLegalSourceRef,
} from "@/lib/legal-document-schema"

import { analyzeQuery } from '@/lib/legal-rag/analyzer'
import { hybridSearchAsync } from '@/lib/legal-rag/search'
import { generateLlmCompletion } from '@/lib/llm/client'
import { ALL_COURTS, findBestCourtMatch, Court } from '@/lib/courts'
import { getDocumentByTitle as resolveDocumentFromCorpus } from './chat'

export async function generatePetitionResponse(
  query: string,
  apiKeyParam?: string,
  history: { role: string; content: string }[] = [],
  skipInterview: boolean = false
) {
  try {
    const q = query.toLowerCase().trim()

    let passedKey = apiKeyParam?.trim() || ""
    if (passedKey.startsWith("gsk_")) {
      passedKey = ""
    }

    // 1. Match Official Court from courts.gov.az database based on conversation text
    const fullConvText = (query + " " + history.map(h => h.content).join(" ")).toLowerCase()
      .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
      .replace(/ə/g, 'e').replace(/ç/g, 'c').replace(/ş/g, 's')
      .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ğ/g, 'g')

    const matchedCourt = findBestCourtMatch(fullConvText)

    let courtContext = ""
    if (matchedCourt) {
      courtContext = `\n\nRƏSMİ MƏHKƏMƏ MƏLUMATLARI (courts.gov.az BAZASINDAN):
Məhkəmənin Tam Rəsmi Adı: ${matchedCourt.title}
Rəsmi Ünvanı: ${matchedCourt.address}
Əlaqə Telefonu: ${matchedCourt.phone || "Qeyd olunmayıb"}
Elektron Poçt: ${matchedCourt.email || "Qeyd olunmayıb"}
Məhkəmənin Növü: ${matchedCourt.type}
Baxdığı Ərazi: ${matchedCourt.region}
Rəsmi Portal Səhifəsi: ${matchedCourt.url}

QEYD: Ərizənin yuxarı sağ küncündəki müraciət hissəsində MÜTLƏQ məhz bu rəsmi adı ("${matchedCourt.title}") və ünvanı ("${matchedCourt.address}") yaz!\n`
    }

    // 2. RAG Search for Relevant Legal Provisions (56,983-doc SQLite + Knowledge Base + Supabase)
    const analysis = analyzeQuery(query, history)
    const retrievedChunks = await hybridSearchAsync(analysis, 8, query)

    let contextText = retrievedChunks.length > 0
      ? retrievedChunks.map(c => `[SƏNƏD: ${c.articleTitle}]\nURL: ${c.sourceUrl}\n${c.content.substring(0, 3000)}`).join("\n\n---\n\n")
      : "HEÇ BİR ƏLAVƏ QANUNVERİCİLİK MƏTNİ TAPILMADI."

    if (contextText.length > 35000) {
      contextText = contextText.substring(0, 35000)
    }

    // 3. Comprehensive HUQUQAI Professional Legal Petition Generator System Prompt
    let systemPrompt = `# HUQUQAI — PEŞƏKAR HÜQUQİ ƏRİZƏ GENERATORU

## ROL VƏ VƏZİFƏ
Sən Azərbaycan Respublikasının qanunvericiliyinə əsaslanan **peşəkar hüquqi sənəd hazırlama süni intellektisən**.
Əsas vəzifən istifadəçinin təqdim etdiyi faktlardan hüquqi vəziyyəti müəyyən etmək, uyğun hüquqi müraciət növünü seçmək, aidiyyəti məhkəmə və ya dövlət orqanını müəyyənləşdirmək, çatışmayan məlumatları toplamaq və sonda istifadəçinin təqdim etdiyi məlumatlara əsasən **peşəkar hüquqi ərizə/sənəd layihəsi hazırlamaqdır**.

---

## ƏSAS VƏ QƏTİ PRİNSİP: KONTEKST VƏ TƏKRAR SORUŞMAMAQ
İstifadəçinin bütün əvvəlki mesajlarını kontekst kimi dərindən analiz et.
**ƏN VACİB QAYDA:** İstifadəçi söhbətin əvvəlində və ya sonrakı mesajlarında hər hansı məlumatı artıq veribsə (məsələn: xitam tarixi, iş stajı, şirkət adı, məbləğ, problem, yaşayış yeri və s.), **HƏMİN MƏLUMATI YENİDƏN SORUŞMAQ QƏTİ QADAĞANDIR!**
Yalnız sənədin rəsmi tərtibatı üçün həqiqətən ÇATIŞMAYAN zəruri məlumatları soruş.

---

## 1. MƏCBURİ VƏ TƏXİRƏSALINMAZ QAYDA: DİNAMİK MƏLUMATLARI BİR-BİR (ADDIM-ADDIM) SORUŞ!
ƏRİZƏ LAYİHƏSİNİ İNDİ TƏRTİB ETMƏ! Cavabında QƏTİYYƏN [ƏRİZƏ] yazma və ərizə mətni/qaralaması çıxarma!

**ƏN ƏSAS ŞƏRT: BÜTÜN SUALLARI BİRDƏFƏYƏ / EYNİ ANDA VERMƏK QƏTİ QADAĞANDIR!**
İstifadəçini yormamaq və dəqiq məlumat almaq üçün sualları **TƏK-TƏK (BİR-BİR)**, addım-addım soruş:

- **Addım 1:** Əgər iddiaçının şəxsi məlumatları (Ad, soyad, ata adı, faktiki ünvan, telefon və FİN) hələ verilməyibsə, YALNIZ bunu soruş:
  *"Ərizəni rəsmi və hüquqi qüvvəyə malik şəkildə hazırlamaq üçün gəlin məlumatları addım-addım qeyd edək.*
  *1-ci addım: Zəhmət olmasa, **iddiaçı kimi adınızı, soyadınızı, ata adınızı, faktiki yaşayış ünvanınızı, əlaqə nömrənizi və FİN kodunuzu** qeyd edin."*
  (Başqa heç bir sual vermə, istifadəçinin cavabını gözlə!)

- **Addım 2:** İstifadəçi 1-ci addımı cavablandırdıqdan sonra növbəti mesajda YALNIZ cavabdeh məlumatını soruş:
  *"Təşəkkür edirəm. İndi isə 2-ci addım: Müraciət etdiyiniz **qarşı tərəfin (cavabdehin / şirkətin / dövlət orqanının) tam rəsmi adını və yerləşdiyi rayonu/ünvanı** qeyd edin (bu, aidiyyəti məhkəməni müəyyən etmək üçün vacibdir)."*

- **Addım 3:** İstifadəçi 2-ci addımı cavablandırdıqdan sonra YALNIZ hadisənin və ya qərarın tarixini soruş:
  *"3-cü addım: Zəhmət olmasa, **mübahisəli hadisənin, əmrin, xitamın və ya imtina qərarının dəqiq tarixini** qeyd edin."*

- **Addım 4:** İstifadəçi 3-cü addımı cavablandırdıqdan sonra YALNIZ konkret tələbləri soruş:
  *"Sonuncu addım: **Hadisənin əsas səbəbi nədir və məhkəmədən konkret hansı tələbinizin təmin olunmasını istəyirsiniz** (məsələn: dəymiş zərərin ödənilməsi, əmrin ləğvi, hüququn tanınması və s.)?"*

- **YEKUN:** Yalnız bütün bu addımlar tamamlandıqda (və ya istifadəçi açıq şəkildə "məlumatları vermək istəmirəm, sadəcə boş şablon ver" dedikdə), ilk sətrində \[ƏRİZƏ\] yazaraq tam hazır, bütün məlumatlar yerinə yazılmış ərizə sənədini təqdim et! Heç bir boş mötərizə buraxma!

---

## 2. MƏHKƏMƏ REKVİZİTLƏRİ VƏ AIDİYYƏT QAYDASI:
Sənədin təqdim ediləcəyi məhkəmə rekvizitləri rəsmi **courts.gov.az** bazasına əsaslanmalıdır.
${courtContext}
Əgər müraciət ediləcək rayon/şəhər hələ dəqiq məlum deyilsə, istifadəçidən hadisənin baş verdiyi və ya qarşı tərəfin yerləşdiyi rayonu/şəhəri soruş ki, courts.gov.az-dan dəqiq məhkəmə rekvizitləri tətbiq olunsun.

---

## 3. DİGƏR ZƏRURİ QAYDALAR:
1. **DƏQİQ AZƏRBAYCAN TERMİNOLOGİYASI:** 
   - Yalnız rəsmi adlardan istifadə et: "Azərbaycan Respublikasının Əmək Məcəlləsi", "Mülki Məcəllə", "İnzibati Prosessual Məcəllə" və s.
2. **AIDİYYƏTİN VƏ MƏHKƏMƏNİN TƏYİNİ:**
   - Əgər istifadəçi konkret məhkəmə adı qeyd edibsə, onu yaz. Əks halda mübahisənin xarakterinə uyğun olaraq müvafiq İnzibati və ya Rayon/Şəhər Məhkəməsini təyin et.
   - "Bakı Şəhər Məhkəməsi" adlı birinci instansiya məhkəməsi YOXDUR.

---

## 4. ƏRİZƏNİN TƏRTİBATI VƏ STANDART FORMATI (BÜTÜN MƏLUMATLAR TOPLANDIQDA):

Bütün zəruri məlumatlar toplandıqda (və ya istifadəçi birbaşa şablon tələb etdikdə), sənədi rəsmi Azərbaycan hüquqi tələblərinə və standartlarına tam uyğun hazırla.

**DİQQƏT: YALNIZ və YALNIZ tam hazır ərizə/iddia ərizəsi təqdim etdiyin halda cavabının ƏN BİRİNCİ SƏTRİNDƏ [ƏRİZƏ] açar sözü olmalıdır! Məlumat toplama mərhələsində [ƏRİZƏ] YAZMA!**

Format Strukturu (Rəsmi Azərbaycan Məhkəmə Standartı):

[ƏRİZƏ]
**[Məhkəmənin və ya Səlahiyyətli Orqanın Tam Rəsmi Adı]**  
(məsələn: **Bakı İnzibati Məhkəməsinə** / **Yasamal Rayon Məhkəməsinə**)

**İddiaçı:** [İstifadəçinin adı, soyadı, ata adı]  
**Ünvan:** [İstifadəçinin faktiki/qeydiyyat ünvanı]  
**Telefon:** [Telefon nömrəsi]  
**E-mail:** [Elektron poçt]  
**FİN:** [FİN kod]  

**Cavabdeh:** [Cavabdehin tam rəsmi adı]  
[Cavabdehin ünvanı]  

**Üçüncü şəxs:** [Zəruri hallarda müvafiq bələdiyyə və ya digər orqan]  

# İNZİBATİ İDDİA ƏRİZƏSİ
(və ya **İ D D İ A   Ə R İ Z Ə S İ**)

### [Mübahisəli məsələnin predmeti və tələbin mahiyyəti barədə hüquqi başlıq]

Mən, [Ad, Soyad], [hadisələrin xronoloji ardıcıllıqla şərhi]...

[İşin faktiki halları, əmrlər, sübutlar və qanunsuzluq barədə ətraflı şərh].

[Qanunvericilik normaları: Əmək Məcəlləsinin müvafiq maddələri (məs: 68, 69, 70, 71, 74, 288, 290, 300), Mülki Prosessual Məcəllənin və ya İnzibati Prosessual Məcəllənin maddələri ilə əsaslandırma].

Bu halların hamısının birlikdə hüquqi qiymətləndirilməsi zəruridir.

## MƏHKƏMƏDƏN XAHİŞ EDİRƏM:

### 1. [Birinci konkret tələb - məs: işə bərpa olunma və ya əmrin ləğvi]
### 2. [İkinci konkret tələb - məs: məcburi işburaxma dövrü üçün əmək haqqının ödənilməsi]
### 3. [Üçüncü konkret tələb - məhkəmə xərcləri və dövlət rüsumunun cavabdehin üzərinə qoyulması]

### Nəticə
[İddianın əsas məqsədini ifadə edən 1-2 cümləlik xülasə].

**Əlavələr (Qoşma):**
1. [İşəgötürənin əmri / xitam sənədi];
2. [Əmək müqaviləsinin və ya əmək kitabçasının surəti];
3. [Digər sübutlar və sənədlər];
4. [Dövlət rüsumu və poçt qəbzləri];
5. İddiaçının şəxsiyyət vəsiqəsinin surəti.

**İddiaçı:** __________________ / [Ad, Soyad]

**Tarix:** ___ / ___ / 2026

---

## 5. QƏTİ QADAĞALAR:
- ƏRİZƏNİN ƏVVƏLİNDƏ VƏ YA SONUNDA HEÇ BİR ÇAT CÜMLƏSİ YAZMA!
  (Məsələn: "Təşəkkür edirəm, təqdim etdiyiniz məlumatlar çox faydalıdır...", "Zəhmət olmasa, təqdim etdiyim ərizədəki boş yerləri doldurun..." kimi cümlələri QƏTİYYƏN YAZMA!)
- Cavabın DƏRHAL və BİRBAŞA \`[ƏRİZƏ]\` sözü ilə başlamalı və birbaşa sənədin özü (Məhkəmənin adı...) gəlməlidir! Sonda isə yalnız Tarix və İmza yeri ilə bitməlidir!
- Ərizənin altında heç bir qanun maddəsi siyahısı, keçid və ya şərh yazma!`;

    if (skipInterview) {
      systemPrompt += `\n\n[DİQQƏT: SİSTEM TƏLƏBİ]\nİstifadəçiyə BİRBAŞA ƏRİZƏ ŞABLONUNU TƏRTİB EDİN. Çatışmayan yerləri [Mötərizə içində] qeyd edin.\nİlk sözünüz MÜTLƏQ \`[ƏRİZƏ]\` olmalıdır!`
    }

    const userPrompt = `KONTEX (Azərbaycan Qanunvericilik Bazası):
${contextText}

İSTİFADƏÇİNİN SORĞUSU VƏ TARİXÇƏSİ:
${query}`

    const formattedHistory = history
      .filter((h) => h.role === "user" || h.role === "assistant")
      .map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      }))

    let rawAiContent = ""
    try {
      try {
        const llmRes = await generateLlmCompletion({
          messages: [
            { role: "system", content: systemPrompt },
            ...formattedHistory,
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          maxTokens: 3500,
          responseFormatJson: false,
          apiKeyParam: passedKey || undefined,
          timeoutMs: 15000,
        })
        rawAiContent = (llmRes.content || "").trim()
      } catch (primaryErr: any) {
        const remoteDoc = await fetchRemoteGenerateDocument(systemPrompt, userPrompt, 1900, 24000)
        if (remoteDoc) {
          rawAiContent = remoteDoc.trim().startsWith("[ƏRİZƏ]")
            ? remoteDoc.trim()
            : `[ƏRİZƏ]\n${remoteDoc.trim()}`
        } else {
          throw primaryErr
        }
      }
    } catch (llmErr: any) {
      console.error("[petition.ts] LLM synthesis failed:", llmErr?.message)
      const refs = retrievedChunks.slice(0, 4)
        .map(c => `- **${c.lawName}**${c.articleNumber ? ` — Maddə ${c.articleNumber}` : ""}: ${c.content.replace(/\s+/g, " ").trim().slice(0, 320)}...`)
        .join("\n")
      return {
        content: `## Hüquqi əsaslar\n\n${refs || "Müvafiq normativ akt tapılmadı."}\n\n## Qısa cavab\nHazırda ərizənin tam mətnini tərtib etmək mümkün olmadı. Zəhmət olmasa bir qədər sonra yenidən cəhd edin.`,
        citations: []
      }
    }
    const isFinalPetition = rawAiContent.includes("[ƏRİZƏ]")

    if (isFinalPetition) {
      // Sənədin əvvəlindəki söhbəti təmizlə (birbaşa [ƏRİZƏ]-dən başlasın)
      const petitionStartIndex = rawAiContent.indexOf("[ƏRİZƏ]")
      if (petitionStartIndex !== -1) {
        rawAiContent = rawAiContent.substring(petitionStartIndex)
      }

      // Sənədin sonunda "Zəhmət olmasa...", "Qeyd:...", "Hər hansı bir düzəliş..." kimi cümlələri təmizlə
      const outroMarkers = [
        "\nZəhmət olmasa",
        "\nQeyd:",
        "\n*Qeyd:",
        "\n**Qeyd:",
        "\nHər hansı bir",
        "\nÜmid edirəm"
      ]
      for (const marker of outroMarkers) {
        const markerIdx = rawAiContent.lastIndexOf(marker)
        if (markerIdx !== -1) {
          rawAiContent = rawAiContent.substring(0, markerIdx).trim()
        }
      }
    }

    return {
      content: rawAiContent,
      // Ərizə rejimində altında qanun maddələri siyahısı çıxarılmasın
      citations: []
    }
  } catch (error: any) {
    console.error("Petition Generator Error:", error)
    return {
      content: `Ərizə tərtibatçısı ilə əlaqə qurularkən xəta baş verdi: ${error.message || "Bilinməyən xəta"}`,
      citations: []
    }
  }
}

export async function getDocumentByTitle(targetTitle: string) {
  try {
    const resolved = await resolveDocumentFromCorpus(targetTitle)
    if (!resolved) return null
    return {
      title: resolved.title,
      content: resolved.content,
      lawName: resolved.lawName,
      articleNumber: resolved.articleNumber,
      sourceUrl: resolved.sourceUrl,
      source: resolved.lawName,
    }
  } catch (error) {
    console.error("getDocumentByTitle error:", error)
    return null
  }
}

export interface StructuredDocumentGenerationResult {
  text: string
  structuredDoc?: StructuredLegalDocument
  resolvedCourt: string
  provider: string
  missingInfoWarnings: string[]
  verifiedSources: VerifiedLegalSourceRef[]
  error?: string
}

export async function generateStructuredLegalDocument(
  input: LegalDocumentFormInput,
  apiKeyParam?: string
): Promise<StructuredDocumentGenerationResult> {
  const spec = DOCUMENT_TYPE_MAP[input.docType] || DOCUMENT_TYPE_MAP.petition
  const resolvedCourt = resolveTargetCourt(input)
  const facts = (input.facts || "").trim()
  const party1 = (input.party1 || "").trim()
  const missingInfoWarnings = checkMissingDocumentRequirements(input)

  if (!facts || !party1) {
    return {
      text: "",
      resolvedCourt,
      provider: "validation",
      missingInfoWarnings,
      verifiedSources: [],
      error: "Zəhmət olmasa tələb olunan xanaları (müraciət edən tərəf və faktiki hallar) doldurun.",
    }
  }

  let retrievedArticles = Array.isArray(input.legalArticles) ? [...input.legalArticles] : []
  if (retrievedArticles.length < 4) {
    try {
      const searchQuery = `${spec.ragQueryBoost} ${input.subtype || ""} ${facts} ${input.legalViolationInfo || ""} ${input.requests || ""}`.trim()
      const analysis = analyzeQuery(searchQuery)
      const chunks = await hybridSearchAsync(analysis, 6, searchQuery, { timeoutMs: 5500 })
      const seen = new Set(retrievedArticles.map((a) => `${a.title}::${a.articleNumber || ""}`))
      for (const ch of chunks) {
        const key = `${ch.lawName}::${ch.articleNumber || ""}`
        if (seen.has(key)) continue
        seen.add(key)
        retrievedArticles.push({
          title: ch.lawName,
          articleNumber: ch.articleNumber,
          content: ch.content,
          url: ch.sourceUrl,
        })
        if (retrievedArticles.length >= 6) break
      }
    } catch (ragErr) {
      console.warn("[petition.ts] generateStructuredLegalDocument RAG lookup skipped:", ragErr)
    }
  }

  const verifiedSources: VerifiedLegalSourceRef[] = retrievedArticles.slice(0, 6).map((a) => ({
    title: a.title,
    articleNumber: a.articleNumber || undefined,
    url: a.url || spec.officialTemplateReference.url || "https://www.e-qanun.ai",
    note: a.content.replace(/\s+/g, " ").trim().slice(0, 240),
    verified: true,
  }))

  const normsContext = retrievedArticles.length
    ? retrievedArticles
        .slice(0, 5)
        .map(
          (a, idx) =>
            `${idx + 1}. ${a.title}${a.articleNumber ? ` — Maddə ${a.articleNumber}` : ""}\n${a.content.slice(0, 850)}`
        )
        .join("\n\n")
    : `Əsas normativ baza: ${spec.legalBasisSummary}.`

  const today = new Date().toLocaleDateString("az-AZ")
  const baselineDoc = buildDeterministicStructuredDoc(input, resolvedCourt, verifiedSources)

  const systemPrompt = `${spec.systemInstruction}

SƏN YALNIZ ETİBARLI JSON FORMATINDA CAVAB VERMƏLİSƏN (heç bir giriş və ya sonluq söhbəti yazma).
JSON sxemi:
{
  "title": "${spec.documentHeading}",
  "subtitle": "Qısa alt başlıq (məs: Borcun tutulması haqqında)",
  "openingLine": "Birinci şəxs və ya rəsmi müqavilə preambulası",
  "sections": [
    {
      "heading": "Bölmə başlığı (məs: Faktiki hallar / Hüquqi əsaslandırma / 1. Müqavilənin predmeti)",
      "paragraphs": ["Rəsmi hüquqi üslubda tam abzaslar..."],
      "numberedItems": ["İstəyə bağlı nömrələnmiş bəndlər"]
    }
  ],
  "requestsHeading": "${spec.requestsHeading}",
  "requests": ["1-ci konkret tələb", "2-ci konkret tələb"]
}

QƏTİ QAYDALAR:
1. Yalnız verilən faktlara və aşağıda göstərilən qanunvericilik normalarına istinad et; mövcud olmayan qanun maddəsi, saxta məhkəmə qərarı və ya uydurma fakt YAZMA.
2. Emosional, danışıq və ya çat ifadələrindən istifadə etmə; rəsmi Azərbaycan hüquq üslubunda yaz.
3. Eyni məlumatı fərqli abzaslarda təkrarlama; faktlarla hüquqi nəticəni ayrıca abzaslarda fərqləndir.
4. Sənəddə əlavələr siyahısı YAZMA (sistem istifadəçinin real əlavələrini özü yerləşdirəcək).
5. Başlıqlarda Markdown işarələri (** və ya ##) istifadə etmə.`

  const userPrompt = [
    `Sənəd növü: ${spec.title}`,
    input.subtype ? `Alt kateqoriya: ${input.subtype}` : "",
    spec.requiresCourt ? `Ünvanlandığı məhkəmə / orqan: ${resolvedCourt}` : "",
    input.caseNumber?.trim() ? `İş №: ${input.caseNumber.trim()}` : "",
    input.disputedActInfo?.trim() ? `Mübahisələndirilən akt / qərar: ${input.disputedActInfo.trim()}` : "",
    input.mediationInfo?.trim() ? `Mediasiya / Pretenziya qeydi: ${input.mediationInfo.trim()}` : "",
    input.advocateInfo?.trim() ? `Vəkil / Nümayəndə: ${input.advocateInfo.trim()}` : "",
    input.referenceInfo?.trim() ? `${spec.referenceLabel}: ${input.referenceInfo.trim()}` : "",
    `${spec.party1RoleLabel}: ${party1}`,
    input.party2?.trim() ? `${spec.party2RoleLabel}: ${input.party2.trim()}` : "",
    input.amount?.trim() ? `${spec.amountLabel}: ${input.amount.trim()}` : "",
    `Faktiki hallar / Predmet:\n${facts}`,
    input.legalViolationInfo?.trim()
      ? `Pozulmuş maddi və prosessual normalar:\n${input.legalViolationInfo.trim()}`
      : "",
    input.requests?.trim() ? `${spec.requestsLabel}:\n${input.requests.trim()}` : "",
    input.chatContext?.trim()
      ? `Əvvəlki hüquqi təhlil konteksti:\n${input.chatContext.trim().slice(0, 1200)}`
      : "",
    `Tarix: ${today}`,
    `\nİstinad edilə biləcək rəsmi e-qanun normaları:\n${normsContext}`,
  ]
    .filter(Boolean)
    .join("\n\n")

  const mergeAiJsonToDoc = (parsed: Record<string, unknown>): StructuredLegalDocument | null => {
    const rawSections = Array.isArray(parsed.sections) ? parsed.sections : []
    const sections: DocumentClauseSection[] = rawSections
      .map((s: any) => {
        const paragraphs = Array.isArray(s?.paragraphs)
          ? s.paragraphs.map((p: unknown) => String(p || "").trim()).filter(Boolean)
          : typeof s?.content === "string"
          ? cleanParagraphLines(s.content)
          : []
        const numberedItems = Array.isArray(s?.numberedItems)
          ? s.numberedItems.map((it: unknown) => String(it || "").trim()).filter(Boolean)
          : undefined
        return {
          heading: typeof s?.heading === "string" ? s.heading.replace(/^#+\s*/, "").trim() : undefined,
          paragraphs,
          ...(numberedItems && numberedItems.length > 0 ? { numberedItems } : {}),
        }
      })
      .filter((s) => s.paragraphs.length > 0 || (s.numberedItems?.length ?? 0) > 0)

    if (sections.length === 0) return null

    const rawRequests = Array.isArray(parsed.requests)
      ? parsed.requests.map((r: unknown) => String(r || "").trim()).filter(Boolean)
      : baselineDoc.requests

    const parties = buildPartyBlocks(input, spec)
    const attachments = parseAttachmentsList(input.attachmentsText)

    const merged: StructuredLegalDocument = {
      ...baselineDoc,
      title:
        typeof parsed.title === "string" && parsed.title.trim()
          ? toAzUpperCase(parsed.title.replace(/^#+\s*/, "").trim())
          : baselineDoc.title,
      subtitle:
        typeof parsed.subtitle === "string" && parsed.subtitle.trim()
          ? parsed.subtitle.trim()
          : baselineDoc.subtitle,
      disclaimerBanner: spec.educationalOnly ? EDUCATIONAL_DECISION_BANNER : undefined,
      topRightParties: parties,
      openingLine:
        typeof parsed.openingLine === "string" && parsed.openingLine.trim()
          ? parsed.openingLine.trim()
          : baselineDoc.openingLine,
      sections,
      requestsHeading:
        spec.layoutMode === "contract-bilateral"
          ? undefined
          : typeof parsed.requestsHeading === "string" && parsed.requestsHeading.trim()
          ? parsed.requestsHeading.trim().toUpperCase()
          : spec.requestsHeading,
      requests: spec.layoutMode === "contract-bilateral" ? [] : rawRequests,
      attachments,
      missingInfoWarnings,
      legalSources: verifiedSources,
      officialTemplateReference: spec.officialTemplateReference,
      professionalReviewNotice: PROFESSIONAL_REVIEW_NOTICE,
    }
    return merged
  }

  const passedKey = (apiKeyParam || "").trim()
  try {
    const llmRes = await generateLlmCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.15,
      maxTokens: 3200,
      responseFormatJson: true,
      apiKeyParam: passedKey || undefined,
      timeoutMs: 14000,
    })
    const parsed = extractStructuredJson(llmRes.content || "")
    const merged = parsed ? mergeAiJsonToDoc(parsed) : null
    if (merged) {
      return {
        text: serializeStructuredDocToMarkdown(merged),
        structuredDoc: merged,
        resolvedCourt,
        provider: llmRes.provider || "llm",
        missingInfoWarnings,
        verifiedSources,
      }
    }
  } catch (primaryErr: any) {
    console.warn("[petition.ts] Primary LLM structured doc generation fallback:", primaryErr?.message)
  }

  const workerContent = await fetchRemoteGenerateDocument(systemPrompt, userPrompt, 3000, 28000, true)
  if (workerContent) {
    const parsed = extractStructuredJson(workerContent)
    const merged = parsed ? mergeAiJsonToDoc(parsed) : null
    if (merged) {
      return {
        text: serializeStructuredDocToMarkdown(merged),
        structuredDoc: merged,
        resolvedCourt,
        provider: "cloudflare-workers-ai",
        missingInfoWarnings,
        verifiedSources,
      }
    }
  }

  return {
    text: serializeStructuredDocToMarkdown(baselineDoc),
    structuredDoc: baselineDoc,
    resolvedCourt,
    provider: "template-fallback",
    missingInfoWarnings,
    verifiedSources,
  }
}
