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
- Kontex-də olmayan heç bir qanun, fərman, sərəncam nömrəsi, məbləğ, tarix, maddə nömrəsi, hissə, bənd və ya URL uydurma!
- Sualın mövzusu ilə birbaşa əlaqəsi olmayan dəxilsiz maddələri (məsələn, 'Maddə 1' kimi əlaqəsiz maddələri) qətiyyən istinadlara əlavə etmə.
- Məsələnin həlli üçün Kontex-də kifayət qədər əsas yoxdursa və ya qanunvericilikdə hələ dəyişiklik yoxdursa, bunu birbaşa və açıq şəkildə bildir.

2. RƏQƏMLİ FAKTLAR, MƏBLƏĞLƏR, TARİXLƏR VƏ MÜDDƏTLƏRİN DƏQİQ GÖSTƏRİLMƏSİ (MÜTLƏQ TƏLƏB):
- Əgər sual minimum əmək haqqı, pensiya, cərimə, rüsum, müddət və ya faizlə bağlıdırsa:
  * Məbləği yalnız təqdim olunan rəsmi aktda/kontekstdə göstərilən ən son rəsmi məbləğlə qeyd et (Məsələn: Azərbaycan Respublikası Prezidentinin 2023-cü il 5 yanvar tarixli 3708 nömrəli Sərəncamına əsasən minimum aylıq əməkhaqqı 345 (üç yüz qırx beş) manat müəyyən edilmişdir).
  * Kontekstdəki rəsmi aktın nömrəsini, tarixini və qüvvəyə minmə vaxtını dəqiqliklə yaz.
  * Məbləğləri və müddətləri HƏM RƏQƏMLƏ, HƏM DƏ YAZI İLƏ açıq qeyd et!

3. MƏHKƏMƏ AİDİYYƏTİNİN VƏ PROSESİN TƏYİNİ:
- Əgər məsələ məhkəmə qaydasında həll edilməlidirsə, iddia ərizəsi veriləcək konkret məhkəməni və məhkəmə qərarı olmadan çıxarılmanın yolverilməzliyini aydın vurğula.

4. İSTİNADLAR VƏ MƏNBƏ TƏQDİMATI:
- Yalnız suala birbaşa cavab verən rəsmi aktlara və ya konkret maddələrə istinad et (məsələn: 'Azərbaycan Respublikası Prezidentinin 2023-cü il 5 yanvar tarixli 3708 nömrəli Sərəncamı' və ya 'Azərbaycan Respublikasının Əmək Məcəlləsi - Maddə 155').
- Ümumi, əlaqəsiz və ya təsadüfi maddələri istinad kimi göstərmə!

# JSON CAVAB STRUKTURU:
MÜTLƏQ aşağıdakı JSON formatında cavab ver:

{
  "cavab": "Süni intellekt əsaslı təhlil:\n\n**Hüquqi sual:**\n(İstifadəçinin sualının qısa və səlis hüquqi formülasyası)\n\n**Nəticə:**\n(Məsələnin dərin və hərtərəfli hüquqi təhlili, tətbiq olunan qanunvericilik normaları, rəqəmli faktlar, cərimələr, həm rəqəm həm yazı ilə müddətlər, tərəflərin hüquq və vəzifələri.)\n\n**İstinadlar:**\nAzərbaycan Respublikasının [Qanunun/Məcəllənin Adı] - Maddə [X]",
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
    let reqModel = isOpr ? "openai/gpt-4o-mini" : "gpt-4o-mini"
    
    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(isOpr ? { "HTTP-Referer": "https://huquqai.az", "X-Title": "LexAZ" } : {})
    }
    
    let body: any = {
      model: reqModel,
      response_format: { type: "json_object" },
      max_tokens: 1500,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
    }
    
    let response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    })

    if (response.status === 402 && isOpr) {
      body.model = "openrouter/auto"
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

    // 3. Fallback to 56,982 e-qanun documents catalog
    const docIdMatch = cleanTargetTitle.match(/\b\d{4,6}\b/);
    const targetDocId = docIdMatch ? docIdMatch[0] : null;
    const catalogPath = path.join(process.cwd(), 'src/data/eqanun_catalog.json');
    if (fs.existsSync(catalogPath)) {
      const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
      const catMatch = catalog.find((c: any) => 
        (targetDocId && c.id === targetDocId) || 
        normalizeAz(c.title).includes(nTarget) || 
        nTarget.includes(normalizeAz(c.title))
      );

      if (catMatch) {
        let docContent = "";
        try {
          const fileName = catMatch.file;
          const fullDir = path.resolve(process.cwd(), '../data/full_eqanun_corpus');
          const targetFile = path.resolve(fullDir, fileName);
          if (targetFile.startsWith(fullDir) && fs.existsSync(targetFile)) {
            docContent = fs.readFileSync(targetFile, 'utf-8');
          }
        } catch {
          // ignore
        }

        if (!docContent) {
          docContent = `Azərbaycan Respublikasının Qanunvericilik Aktı (ID: ${catMatch.id}).\nSənəd adı: ${catMatch.title}.\nRəsmi keçid: https://www.e-qanun.ai/results/${catMatch.id}`;
        }


        return {
          title: `e-Qanun Aktı № ${catMatch.id}: ${catMatch.title}`,
          content: docContent,
          source: catMatch.file
        };
      }
    }

    return null;
  } catch (e) {
    console.error("getDocumentByTitle error:", e);
    return null;
  }
}

