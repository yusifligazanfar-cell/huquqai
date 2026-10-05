"use server"

import fs from 'fs'
import path from 'path'
import { analyzeQuery } from '@/lib/legal-rag/analyzer'
import { hybridSearch } from '@/lib/legal-rag/search'
import { ALL_COURTS, findBestCourtMatch, Court } from '@/lib/courts'

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
    const apiKey = passedKey.length > 10 ? passedKey : process.env.OPENAI_API_KEY || ""

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

    // 2. RAG Search for Relevant Legal Provisions
    const analysis = analyzeQuery(query, history)
    const retrievedChunks = hybridSearch(analysis, 8)

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

## MƏHKƏMƏ REKVİZİTLƏRİ VƏ AIDİYYƏT QAYDASI:
Sənədin təqdim ediləcəyi məhkəmə rekvizitləri rəsmi **courts.gov.az** bazasına əsaslanmalıdır.
${courtContext}
Əgər müraciət ediləcək rayon/şəhər hələ dəqiq məlum deyilsə, istifadəçidən hadisənin baş verdiyi və ya qarşı tərəfin yerləşdiyi rayonu/şəhəri soruş ki, courts.gov.az-dan dəqiq məhkəmə rekvizitləri tətbiq olunsun.

---

## DİGƏR ZƏRURİ QAYDALAR:
1. **DƏQİQ AZƏRBAYCAN TERMİNOLOGİYASI:** 
   - Yalnız rəsmi adlardan istifadə et: "Azərbaycan Respublikasının Əmək Məcəlləsi" ("İş Kodeksi" və ya "Müəssisə Məcəlləsi" kimi qeyri-rəsmi sözlər İŞLƏTMƏ!).
   - Mülki Məcəllə, Ailə Məcəlləsi, Cinayət Məcəlləsi, İnzibati Xətalar Məcəlləsi, Mülki Prosessual Məcəllə, İnzibati Prosessual Məcəllə və s.
2. **AIDİYYƏTİN VƏ MƏHKƏMƏNİN TƏYİNİ:**
   - **Əgər istifadəçi konkret məhkəmə və ya orqan adı qeyd edibsə (məsələn: "Bakı İnzibati Məhkəməsi", "Nəsimi Rayon Məhkəməsi", "Şəki Rayon Məhkəməsi" və s.), DƏRHAL həmin məhkəməni yaz.**
   - **Əgər istifadəçi məhkəmə adını konkret qeyd ETMƏYİBSƏ, özündən təsadüfi rayon/şəhər (məsələn əsassız yerə Şəki və s.) UYDURMA!** Mübahisənin xarakterinə və əraziyə uyğun olaraq aidiyyəti məhkəməni dəqiq təyin et:
     * Dövlət orqanları (DƏDRX, İcra Hakimiyyəti, Nazirliklər, Torpaq və Kadastr mübahisələri və s.) ilə bağlı mübahisələr — **İnzibati Məhkəməyə** (ərazi üzrə məs: Bakı İnzibati Məhkəməsi, Sumqayıt İnzibati Məhkəməsi, Gəncə İnzibati Məhkəməsi və s.);
     * Mülki, ailə, vərəsəlik, borc, etibarnamə ləğvi, kompensasiya və s. vətəndaş mübahisələri — müvafiq Rayon və ya Şəhər Məhkəməsinə;
     * Əgər rayon tam məlum deyilsə, ümumi kontekstdən (Bakı və s.) çıxış edərək ən uyğun məhkəməni təyin et (məs: **Bakı İnzibati Məhkəməsinə** və ya **[İddiaçının/Cavabdehin yaşadığı rayon] Rayon Məhkəməsinə**).
   - "Bakı Şəhər Məhkəməsi" adlı birinci instansiya məhkəməsi YOXDUR (Rayon məhkəmələri və ya Bakı İnzibati Məhkəməsi mövcuddur).
3. **MƏLUMAT TOPLAMA MƏRHƏLƏSİ:**
   - Əgər ərizəni tərtib etmək üçün istifadəçinin adı, qarşı tərəfin adı/ünvanı, hadisənin baş verdiyi şəhər/rayon, tələb olunan dəqiq məbləğ kimi məlumatlar hələ məlum deyilsə, istifadəçidən bu çatışmayan məlumatları qısa, aydın və konkret nömrələnmiş formada soruş.
   - İstifadəçi bu məlumatları təqdim etdikdə və ya kifayət qədər fakt olduqda BİRBAŞA tam hüquqi sənədi tərtib et.

---

## MƏRHƏLƏ 12 — ƏRİZƏNİN TƏRTİBATI VƏ STANDART FORMATI:

Bütün zəruri məlumatlar toplandıqda (və ya istifadəçi birbaşa ərizə istədikdə), sənədi rəsmi Azərbaycan hüquqi tələblərinə və standartlarına tam uyğun hazırla.

**DİQQƏT: Əgər tam ərizə/iddia ərizəsi təqdim edirsənsə, cavabının ƏN BİRİNCİ SƏTRİNDƏ \[ƏRİZƏ\] açar sözü olmalıdır!**

Format Strukturu (Rəsmi Azərbaycan Məhkəmə Standartı):

[ƏRİZƏ]
**[Məhkəmənin və ya Səlahiyyətli Orqanın Tam Rəsmi Adı]**  
(məsələn: **Bakı İnzibati Məhkəməsinə** / **Yasamal Rayon Məhkəməsinə**)

**İddiaçı:** [Ad, soyad, ata adı]  
**Ünvan:** [ünvan]  
**Telefon:** [telefon]  
**E-mail:** [elektron poçt]  
**FİN:** [şəxsiyyət vəsiqəsinin FİN kodu]  

**Cavabdeh:** [Dövlət orqanının, təşkilatın və ya cavabdehin tam adı]  
[ərazi idarəsinin tam adı və ya ünvanı]  

**Üçüncü şəxs:** [Zəruri hallarda müvafiq bələdiyyə və ya digər orqan]  

# İNZİBATİ İDDİA ƏRİZƏSİ
(və ya **İ D D İ A   Ə R İ Z Ə S İ**)

### [Mübahisəli məsələnin predmeti və tələbin mahiyyəti barədə hüquqi başlıq]

Mən, [ad, soyad], [tarix, qərar və ya müqavilə ilə yaranmış ilkin faktlar xronoloji ardıcıllıqla]...

[İşin faktiki halları, əvvəlki məhkəmə aktları, plan-ölçü, çıxarış və inzibati orqanın imtinası barədə ətraflı şərh].

[Qanunvericilik normaları: Torpaq Məcəlləsinin 4, 9, 10, 46, 47, 66, 67, 68, 88-ci maddələri, İnzibati Prosessual Məcəllənin 8, 10, 32-ci maddələri, "Daşınmaz əmlakın dövlət reyestri haqqında" Qanun və s. əsaslandırma].

Bu sənədlərin hamısının birlikdə hüquqi qiymətləndirilməsi zəruridir.

## MƏHKƏMƏDƏN XAHİŞ EDİRƏM:

### 1. [Birinci konkret tələb - sənədin/plan-ölçünün hüquqi statusunun və bazada bərpasının təmin edilməsi]
### 2. [İkinci konkret tələb - torpağın hüquqi statusunun, kateqoriyasının və əsaslandırıcı aktların araşdırılması və məhkəməyə təqdim edilməsi]
### 3. [Üçüncü konkret tələb - mülkiyyətdəki obyektin altındakı və faktiki istifadədəki torpaq sahələrinə çıxarışın verilməsi (dövlət qeydiyyatının aparılması) vəzifəsinin cavabdehin üzərinə qoyulması]
### 4. [Əlavə əsassız iddiaların araşdırılması ("cərgə mağazalar" və s.)]
### 5. [Məhkəmə xərcləri və dövlət rüsumunun cavabdehin üzərinə qoyulması]

### Nəticə
[İddianın əsas məqsədini və qanuni gözləntini ifadə edən 1-2 abzaslıq xülasə].

**Əlavələr (Qoşma):**
1. [İşə aid qərarlar, müqavilələr];
2. [Əvvəlki məhkəmə aktları];
3. [Plan-ölçü sənədləri];
4. [Mülkiyyət çıxarışları];
5. [İmtina məktubu];
6. [Dövlət rüsumu və poçt qəbzləri];
7. Digər sübutlar.

**İddiaçı:** __________________ / [Ad, Soyad]

**Tarix:** ___ / ___ / 2026`;

    if (skipInterview) {
      systemPrompt += `\n\n[DİQQƏT: SİSTEM TƏLƏBİ]\nİstifadəçiyə BİRBAŞA ƏRİZƏ ŞABLONUNU TƏRTİB EDİN. Çatışmayan yerləri [Mötərizə içində] qeyd edin.\nİlk sözünüz MÜTLƏQ \`[ƏRİZƏ]\` olmalıdır!`
    }

    const userPrompt = `KONTEX (Azərbaycan Qanunvericilik Bazası):
${contextText}

İSTİFADƏÇİNİN SORĞUSU VƏ TARİXÇƏSİ:
${query}`

    const isOpr = apiKey.startsWith("sk-or-v1-")
    const endpoint = isOpr ? "https://openrouter.ai/api/v1/chat/completions" : "https://api.openai.com/v1/chat/completions"
    let reqModel = isOpr ? "openai/gpt-4o-mini" : "gpt-4o-mini"

    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(isOpr ? { "HTTP-Referer": "https://huquqai.az", "X-Title": "HuquqAI" } : {})
    }

    let body = {
      model: reqModel,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 3500,
    }

    let response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    })

    // If Rate Limited (429), retry
    if (!response.ok && response.status === 429) {
      console.warn(`Petition rate limit encountered, waiting 2.5s and retrying...`)
      await new Promise(res => setTimeout(res, 2500))
      response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      })
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Sistemdə qısa müddətli sıxlıq var. Zəhmət olmasa bir neçə saniyə sonra yenidən cəhd edin.")
      }
      if (response.status === 402) {
        throw new Error("Balansınız bitib (Payment Required). Zəhmət olmasa API hesabınıza vəsait əlavə edin.")
      }
      throw new Error(`API error: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      content: data.choices[0].message.content,
      citations: retrievedChunks.map(c => c.articleTitle)
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
    const kbPath = path.join(process.cwd(), 'src/data/knowledge_base')
    if (!fs.existsSync(kbPath)) return null

    const files = fs.readdirSync(kbPath).filter(f => f.endsWith('.txt'))
    const isTruncated = targetTitle.endsWith("...")
    const matchTitle = isTruncated ? targetTitle.slice(0, -3).trim() : targetTitle

    for (const file of files) {
      const filePath = path.join(kbPath, file)
      const text = fs.readFileSync(filePath, 'utf-8')
      const firstLine = text.split('\n')[0].replace(/===/g, '').trim()

      if (firstLine.toLowerCase().includes(matchTitle.toLowerCase()) || file.toLowerCase().includes(matchTitle.toLowerCase())) {
        return {
          title: firstLine,
          content: text,
          source: file.replace('.txt', '')
        }
      }
    }
    return null
  } catch (error) {
    console.error("getDocumentByTitle error:", error)
    return null
  }
}
