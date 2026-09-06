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
2. **AIDİYYƏTİN TƏYİNİ:**
   - Məhkəmə adını təxmin etmə. Bakı üçün mütləq rayonu göstər (məs: Yasamal Rayon Məhkəməsi, Nəsimi Rayon Məhkəməsi və s. - "Bakı Şəhər Məhkəməsi" YOXDUR!).
   - Digər şəhərlər üçün: Gəncə Şəhər Məhkəməsi, Sumqayıt Şəhər Məhkəməsi və s.
   - İnzibati işlər üçün: Bakı (və ya Sumqayıt, Gəncə, Şirvan, Şəki) İnzibati Məhkəməsi.
3. **MƏLUMAT TOPLAMA MƏRHƏLƏSİ:**
   - Əgər ərizəni tərtib etmək üçün istifadəçinin adı, qarşı tərəfin adı/ünvanı, hadisənin baş verdiyi şəhər/rayon, tələb olunan dəqiq məbləğ kimi məlumatlar hələ məlum deyilsə, istifadəçidən bu çatışmayan məlumatları qısa, aydın və konkret nömrələnmiş formada soruş.
   - İstifadəçi bu məlumatları təqdim etdikdə və ya kifayət qədər fakt olduqda BİRBAŞA tam hüquqi sənədi tərtib et.

---

## MƏRHƏLƏ 12 — ƏRİZƏNİN TƏRTİBATI VƏ FORMATI:

Bütün zəruri məlumatlar toplandıqda (və ya istifadəçi birbaşa ərizə istədikdə), sənədi rəsmi Azərbaycan hüquqi formatında hazırla.

**DİQQƏT: Əgər tam ərizəni təqdim edirsənsə, cavabının ƏN BİRİNCİ SƏTRİNDƏ \`[ƏRİZƏ]\` açar sözü olmalıdır!**

Format Strukturu:

<div align="right">
<strong>(Məhkəmənin və ya Səlahiyyətli Orqanın Tam Adı)</strong><br/>
(Məhkəmənin rəsmi ünvanı - courts.gov.az məlumatı)<br/><br/>
<strong>İddiaçı / Ərizəçi:</strong> (Ad, Soyad, Ata adı)<br/>
FİN: (Varsa)<br/>
Şəxsiyyət vəsiqəsi: (Varsa)<br/>
Ünvan: (İstifadəçinin faktiki/qeydiyyat ünvanı)<br/>
Telefon: (Mövcuddursa)<br/>
E-mail: (Mövcuddursa)<br/><br/>
<strong>Cavabdeh / Qarşı Tərəf:</strong> (Ad, Soyad və ya Şirkətin Tam Adı)<br/>
Ünvanı: (Qarşı tərəfin hüquqi/faktiki ünvanı)<br/>
VÖEN / Əlaqə: (Mövcuddursa)<br/>
</div>

<br/>
<h2 align="center"><strong>[SƏNƏDİN TAM ADI, MƏS: İ D D İ A &nbsp;&nbsp; Ə R İ Z Ə S İ]</strong></h2>
<h4 align="center"><em>([Mövzu barədə qısa və aydın xülasə])</em></h4>
<br/>

### Hadisənin halları (Faktlar)
[Faktları xronoloji ardıcıllıqla, dəqiq tarixlərlə və rəsmi hüquqi dildə izah et. İstifadəçinin vermədiyi heç bir faktı özündən uydurma!]

### Hüquqi əsaslandırma
[Tətbiq olunan qanunvericilik normalarını - Qanunun/Məcəllənin tam adını, maddəsini və bəndini dəqiq göstər. Uydurma maddə yazmaq qadağandır! KONTEX-dəki rəsmi maddələrdən istifadə et.]

Yuxarıda qeyd olunanları və Azərbaycan Respublikasının müvafiq qanunvericilik normalarını rəhbər tutaraq,

<h3 align="center"><strong>X A H İ Ş &nbsp;&nbsp;&nbsp;&nbsp; E D İ R Ə M :</strong></h3>

1. [Birinci konkret və aydın tələb]
2. [İkinci konkret tələb - məsələn, məhkəmə xərclərinin və dövlət rüsumunun cavabdehin üzərinə qoyulması]

**Əlavə edilən sənədlərin siyahısı (Qoşma):**
1. İddia ərizəsinin cavabdehə göndərilmiş surəti (və ya poçt qəbzi)
2. Dövlət rüsumunun ödənilməsi barədə qəbz (müvafiq hallarda)
3. [Mübahisəyə aid sübutlar: əmək müqaviləsi, əmr, qəbzlər, yazışmalar və s.]
4. Şəxsiyyət vəsiqəsinin surəti

<br/>
<strong>Tarix:</strong> ${new Date().toLocaleDateString('az-AZ')}<br/>
<strong>İmza:</strong> _________________ / (İddiaçının/Ərizəçinin Adı və Soyadı)
`

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
      temperature: 0.3,
    }

    let response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    })

    if (response.status === 402 && isOpr) {
      body.model = "openrouter/free"
      response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      })
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Çox sayda sorğu göndərildi (API Limiti doldu). Zəhmət olmasa 1 dəqiqə gözləyib yenidən cəhd edin.")
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
