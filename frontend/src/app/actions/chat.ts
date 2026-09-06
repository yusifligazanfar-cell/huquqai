"use server"

import fs from 'fs'
import path from 'path'
import { analyzeQuery, hybridSearch, validateLegalResponse, LAW_REGISTRY, loadAndParseKnowledgeBase, normalizeAz } from '@/lib/legal-rag'
import { findRelevantCourtAct, CourtAct } from '@/lib/court-precedents'

export async function generateLegalResponse(query: string, apiKeyParam?: string, history: {role: string, content: string}[] = []) {
  try {
    const q = query.toLowerCase().trim()
    
    // Use API key (passed key, or environment variable)
    let passedKey = apiKeyParam?.trim() || ""
    if (passedKey.startsWith("gsk_")) {
        passedKey = "" // Ignore old Groq keys saved in the user's browser
    }
    const apiKey = passedKey.length > 10 ? passedKey : process.env.OPENAI_API_KEY || ""
    
    // Handle Greetings
    if (q === "salam" || q.includes("salamlar") || q === "hi" || q === "salam.") {
      return {
        content: "Salam! Mən LexAZ AI (Azərbaycan Qanunvericiliyi üzrə Süni İntellekt Məsləhətçisi). Sizə hansı hüquqi məsələ və ya qanunvericilik maddəsi üzrə kömək edə bilərəm?",
        citations: [],
        legal_basis: [],
        sources: [],
        confidence: 1.0,
        citation_valid: true,
        needs_review: false
      }
    }

    // 1. QUERY ANALYSIS
    const queryAnalysis = analyzeQuery(query, history);

    // 2. HYBRID RETRIEVAL & RERANKING
    const retrievedChunks = hybridSearch(queryAnalysis, 15);

    if (retrievedChunks.length === 0) {
      return {
        content: "Təqdim edilmiş qanunvericilik bazasında bu suala kifayət qədər dəqiq hüquqi əsas tapılmadı.",
        citations: [],
        legal_basis: [],
        sources: [],
        confidence: 0.0,
        citation_valid: false,
        needs_review: true
      }
    }

    // 3. COMPOSE CONTEXT FOR LLM
    const contextText = retrievedChunks.map((c, i) => {
      return `[MƏNBƏ ${i + 1}: ${c.articleTitle}] (URL: ${c.sourceUrl})\n${c.content.substring(0, 4000)}`;
    }).join("\n\n---\n\n");

    // 4. PREPARE STRICT LEGAL PROMPT
    const systemPrompt = `Sən Azərbaycan Respublikasının qanunvericiliyi üzrə ali dərəcəli peşəkar hüquqşünas, hakim-məsləhətçi və analitik süni intellekt mühərrikisən (LexAZ / e-qanun modeli). Sənin cavabların dəqiq, elmi-praktiki cəhətdən əsaslandırılmış, dolğun və YALNIZ Azərbaycan Respublikasının rəsmi qanunvericilik bazasına (e-qanun.ai), Məcəllələrə və məhkəmə təcrübəsinə əsaslanmalıdır.

DİQQƏT - ƏSAS PRİNSİP: AI HEÇ VAXT MADDƏ VƏ MƏNBƏ UYDURA BİLMƏZ:
1. YALNIZ KONTEX-DƏ OLAN HÜQUQİ MƏNBƏLƏRƏ ƏSASLAN:
- Kontex-də olmayan heç bir qanun, maddə nömrəsi, hissə, bənd və ya URL uydurma!
- Sualın mövzusu ilə birbaşa əlaqəsi olmayan dəxilsiz maddələri qətiyyən əlavə etmə.
- Məsələnin həlli üçün Kontex-də kifayət qədər əsas yoxdursa, bunu açıq şəkildə bildir.

2. HÜQUQİ İNSTRUKTURLAR VƏ KAZUS TƏHLİLİ:
- Müqavilə forması (şifahi/yazılı/notarial - MM 405-408), mülkiyyət hüququnun keçmə anı (MM 178), vicdanlı əldə edənin müdafiəsi (MM 182), tələb hüquqları (pulun qaytarılması - MM 1091, zərərin əvəzi - MM 21, 445, 573, dələduzluq - CM 178).
- Faizlər, paylar (1/4, 1/3, 1/2), minimum yaşayış həddi mislləri və dəqiq müddətləri göstər.

3. MƏHKƏMƏ AİDİYYƏTİNİN VƏ SEÇİMİNİN TƏYİNİ:
- Əgər məsələ məhkəmə qaydasında həll edilməlidirsə, Mülki Prosessual Məcəllə (MPM Maddə 35/36), İnzibati Prosessual Məcəllə və ya Kommersiya Məhkəməsi qaydalarından çıxış edərək müraciət ediləcək konkret məhkəməni (məs: 'Cavabdehin qeydiyyatda olduğu rayon (şəhər) məhkəməsi', 'Bakı Kommersiya Məhkəməsi' və s.) avtomatik yaz və alternativ seçimləri izah et.

4. DƏQİQ İSTİNAD VƏ URL FORMATI:
- Hər bir hüquqi fikrin sonunda ardıcıl [1](https://www.e-qanun.ai/results/{ID}), [2](https://www.e-qanun.ai/results/{ID}) formatında dəqiq keçidlər qoy.

# JSON CAVAB STRUKTURU:
MÜTLƏQ aşağıdakı JSON formatında cavab ver:

{
  "cavab": "Süni intellekt əsaslı təhlil:\n\n**Hüquqi sual:**\n(İstifadəçinin sualının qısa və səlis hüquqi formülasyası)\n\n**Nəticə:**\n(Məsələnin dərin və hərtərəfli hüquqi təhlili, tətbiq olunan qanunvericilik normaları, tərəflərin hüquq və vəzifələri. Hər bir hüquqi fikrin sonunda [1](URL), [2](URL) kimi keçidləri qoy.)\n\n**İstinadlar:**\nAzərbaycan Respublikasının [Sənədin Adı]\n[Keçid et](URL)",
  "maddeler": [
    "Azərbaycan Respublikasının [Qanunun Adı] - Maddə [X]"
  ],
  "legal_basis": [
    {
      "law_name": "[Qanunun tam adı]",
      "article_number": "[Maddə nömrəsi]",
      "article_title": "[Maddənin başlığı]",
      "part_number": "[Hissə/bənd]",
      "claim": "[Bu normanın tətbiq edildiyi hüquqi iddia]"
    }
  ]
}`;

    const userPrompt = `KONTEX (Qanunvericilik Mətnləri):
${contextText}

İSTİFADƏÇİNİN SORĞUSU: 
${query}`;

    // 5. CALL AI MODEL
    const isOpr = apiKey.startsWith("sk-or-v1-")
    const endpoint = isOpr ? "https://openrouter.ai/api/v1/chat/completions" : "https://api.openai.com/v1/chat/completions"
    let reqModel = isOpr ? "openai/gpt-4o" : "gpt-4o"
    
    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(isOpr ? { "HTTP-Referer": "https://huquqai.az", "X-Title": "LexAZ" } : {})
    }
    
    let body = {
      model: reqModel,
      response_format: { type: "json_object" },
      max_tokens: 1500,
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
      const errText = await response.text()
      console.error(`AI API Xətası (${response.status}):`, errText)
      if (response.status === 429) {
         throw new Error("Çox sayda sorğu göndərildi (API Limiti doldu). Zəhmət olmasa 1 dəqiqə gözləyib yenidən cəhd edin.")
      }
      if (response.status === 402) {
         throw new Error("Balansınız bitib (Payment Required). Zəhmət olmasa API hesabınıza vəsait əlavə edin.")
      }
      throw new Error(`API xətası: ${response.statusText}`)
    }

    const data = await response.json()
    const rawContent = data.choices[0].message.content || "";
    let cleanedContent = rawContent.trim();
    if (cleanedContent.startsWith("```json")) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let parsedJson: any = {};
    try {
      parsedJson = JSON.parse(cleanedContent);
    } catch(e) {
      // Fallback regex extract for cavab field if full JSON fails
      const cavabMatch = cleanedContent.match(/"cavab"\s*:\s*"([\s\S]*?)(?:",\s*"maddeler"|"\s*\})/);
      if (cavabMatch) {
        try {
          parsedJson = {
            cavab: JSON.parse(`"${cavabMatch[1]}"`),
            maddeler: retrievedChunks.slice(0, 2).map(c => c.articleTitle)
          };
        } catch {
          parsedJson = {
            cavab: rawContent,
            maddeler: retrievedChunks.slice(0, 2).map(c => c.articleTitle)
          };
        }
      } else {
        parsedJson = {
          cavab: rawContent,
          maddeler: retrievedChunks.slice(0, 2).map(c => c.articleTitle)
        };
      }
    }


    // 6. VALIDATE & ENFORCE HALLUCINATION GUARD
    const validated = validateLegalResponse(parsedJson, retrievedChunks);

    // 7. MATCH RELEVANT REAL COURT PRECEDENT FROM 150 COURT ACTS
    const precedent = findRelevantCourtAct(query, validated.answer);

    return {
      content: validated.answer,
      citations: validated.citations,
      legal_basis: validated.legal_basis,
      sources: validated.sources,
      confidence: validated.confidence,
      citation_valid: validated.citation_valid,
      needs_review: validated.needs_review,
      precedent: precedent
    }

  } catch (error: any) {
    console.error("Legal RAG error:", error)
    return {
      content: `Xəta baş verdi: ${error.message || "Sistem xətası"}`,
      citations: [],
      legal_basis: [],
      sources: [],
      confidence: 0,
      citation_valid: false,
      needs_review: true
    }
  }
}

export async function getDocumentByTitle(targetTitle: string) {
  try {
    const allChunks = loadAndParseKnowledgeBase();
    if (!allChunks || allChunks.length === 0) return null;

    const isTruncated = targetTitle.endsWith("...")
    const cleanTargetTitle = isTruncated ? targetTitle.slice(0, -3).trim() : targetTitle
    const nTarget = normalizeAz(cleanTargetTitle);

    // Check if target mentions an article number
    const articleMatch = cleanTargetTitle.match(/(?:madd[eə]\s*)?(\d+(?:\.\d+)*)/i)
    const targetArticle = articleMatch ? articleMatch[1] : null

    // 1. Direct Article & Law Match
    if (targetArticle) {
      const match = allChunks.find(c => {
        const cNorm = normalizeAz(c.lawName);
        const isLawMatch = 
          (nTarget.includes("konstitusiya") && c.lawId === "konstitusiya") ||
          (nTarget.includes("aile") && c.lawId === "aile") ||
          (nTarget.includes("mulki") && c.lawId === "mulki") ||
          (nTarget.includes("emek") && c.lawId === "emek") ||
          (nTarget.includes("cinayet") && c.lawId === "cinayet") ||
          (nTarget.includes("inzibati") && c.lawId === "inzibati_xetalar") ||
          (nTarget.includes("vergi") && c.lawId === "vergi") ||
          (nTarget.includes("yol hereketi") && c.lawId === "yol_hereketi") ||
          cNorm.includes(nTarget) || nTarget.includes(cNorm);

        return isLawMatch && c.articleNumber === targetArticle;
      });

      if (match) {
        return {
          title: match.articleTitle,
          content: match.content,
          source: match.sourceFile
        }
      }
    }

    // 2. Title Substring Match
    const titleMatch = allChunks.find(c => 
      normalizeAz(c.articleTitle).includes(nTarget) || 
      nTarget.includes(normalizeAz(c.articleTitle))
    );

    if (titleMatch) {
      return {
        title: titleMatch.articleTitle,
        content: titleMatch.content,
        source: titleMatch.sourceFile
      }
    }

    return null;
  } catch (e) {
    console.error("getDocumentByTitle error:", e);
    return null;
  }
}
