"use server"

import fs from 'fs'
import path from 'path'
import { analyzeQuery, hybridSearch, validateLegalResponse, LAW_REGISTRY, loadAndParseKnowledgeBase, normalizeAz } from '@/lib/legal-rag'
import { findRelevantCourtAct, CourtAct } from '@/lib/court-precedents'
import { eqanunClient } from '@/lib/services/e_qanun_client'

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

    // 2. MULTI-STAGE HYBRID RETRIEVAL & RERANKING
    const retrievedChunks = hybridSearch(queryAnalysis, 15);

    // Check if query contains an explicit e-qanun link or document ID (1 to 60091)
    const urlIdMatch = query.match(/(?:results\/|document_id=|framework\/)(\d{1,6})/i);
    const numIdMatches = query.match(/\b\d{1,6}\b/g) || [];
    const targetDocId = urlIdMatch ? urlIdMatch[1] : (numIdMatches.find(d => {
      const n = parseInt(d, 10);
      return n >= 1 && n <= 60091 && (n < 1900 || n > 2100);
    }) || null);

    if (targetDocId) {
      const liveDoc = await eqanunClient.getDocument(targetDocId);
      if (liveDoc.api_status === 200 && liveDoc.text) {
        retrievedChunks.unshift({
          sourceId: `eqanun_live_${targetDocId}`,
          lawId: `eqanun_${targetDocId}`,
          lawName: liveDoc.title,
          articleNumber: targetDocId,
          articleTitle: `${liveDoc.title} (Akt № ${targetDocId})`,
          content: liveDoc.text.substring(0, 10000),
          sourceFile: `api_live_${targetDocId}`,
          sourceUrl: `https://www.e-qanun.ai/results/${targetDocId}`,
          score: 20000
        });
      }
    }

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

    // 3. COMPOSE STRICT GROUND-TRUTH CONTEXT FOR LLM
    const contextText = retrievedChunks.map((c, i) => {
      return `[MƏNBƏ ${i + 1}: ${c.articleTitle}] (Rəsmi URL: ${c.sourceUrl})\n${c.content.substring(0, 4000)}`;
    }).join("\n\n---\n\n");

    // 4. PREPARE STRICT LEGAL PROMPT — HUQUQAI ULTRA-PROFESSIONAL AZƏRBAYCAN HÜQUQİ RAG SİSTEMİ (76 PRİNSİP)
    const systemPrompt = `SƏN HUQUQAI ÜÇÜN ULTRA-PROFESSIONAL AZƏRBAYCAN HÜQUQİ RAG SİSTEMİSƏN.

SƏNİN ƏSAS VƏZİFƏN:
Azərbaycan Respublikasının qanunvericiliyinə dair istifadəçi suallarını təqdim edilmiş və yoxlanılmış RAG məlumatları (1-dən 60091-ə qədər e-qanun.ai API bazası) əsasında cavablandırmaqdır. Sən sadə chatbot deyilsən. Sən hüquqi araşdırma mühərrikisən.

ƏSAS VƏ DƏYİŞMƏZ PRİNSİPLƏR:
1. RAG-da təsdiqlənən hüquqi məlumatı düzgün və dəqiq izah et.
2. RAG-da təsdiqlənməyən hüquqi faktı uydurma (maddə nömrəsi, cərimə, müddət, rüsum, dövlət orqanı uydurma!).
3. Maddələri qarışdırma: Maddə 68, 69, 70, 74 və s. hər biri fərqli institutdur; bir maddənin məzmununu başqasına aid etmə!
4. Köhnə normanı qüvvədə olan norma kimi təqdim etmə (Current Law & Temporal Reasoning).
5. Mənbəsiz hüquqi nəticə çıxarma (NO EVIDENCE → NO LEGAL CLAIM. NO VERIFIED SOURCE → NO DEFINITIVE LEGAL CONCLUSION).
6. Məhkəmə qərarını qanun norması ilə eyniləşdirmə; yalnız normanın tətbiq nümunəsi kimi təqdim et.
7. MƏNBƏ PRIORİTETİ: Qüvvədə olan normativ hüquqi akt → Konkret maddə/bənd → Digər əlaqəli qanunlar → Konstitusiya Məhkəməsi qərarları → Ali Məhkəmə təcrübəsi.
8. MADDƏNİN BAŞLIĞINI MƏTNİNDƏN AYIR: Məsələn, "Maddə 1322 — Vərəsəlik şəhadətnaməsinin verildiyi müddət" normasını "Vərəsəlik hüququ altı aydan sonra əldə edilir" kimi şərh etmək qadağandır!
9. HÜQUQİ ANLAYIŞLARI QARIŞDIRMA: vərəsəlik hüququ, vərəsəlik şəhadətnaməsi, mirasın açılması, mirasın qəbulu, mirasdan imtina, məhrum edilmə, ləyaqətsiz vərəsə, vəsiyyət və qanun üzrə vərəsəlik anlayışlarını ayır və hər birinə konkret maddə göstər.
10. RELEVANCE SCORE: Yalnız 4/5 və 5/5 olan əsas normaları istifadə et. FEWER SOURCES + HIGHER LEGAL RELEVANCE.
8. MADDƏ NÖMRƏSİNİ YADDAŞDAN YAZMA QADAĞASI:
   * Model öz pretrained yaddaşından və ya təxminlə maddə nömrəsi yaza bilməz!
   * Məsələn: "İşdən əsassız çıxarıldıqda hara şikayət etməliyəm?" sualına model yaddaşından "Əmək Məcəlləsinin 62.5-ci maddəsi" kimi uydurma/təsadüfi maddə yaza bilməz! Əvvəlcə retrieval aparılmalı, rəsmi mətn yoxlanılmalı, maddə və bənd yalnız source-da varsa yazılmalıdır.
9. HÜQUQİ DOMEN CLASSIFICATION VƏ SOURCE MISMATCH BLOKLANMASI:
   * Sual əmək hüququna (işdən çıxarılma, əmək müqaviləsi, əməkhaqqı, işə bərpa, əmək mübahisəsi) aiddirsə, primary_domain = ƏMƏK HÜQUQU.
   * Semantic oxşarlığa görə Mülki Məcəllə çıxsa belə, ƏMƏK HÜQUQU sualında əsas normativ mənbə ƏMƏK MƏCƏLLƏSİ (və birbaşa əmək münasibətlərini tənzimləyən aktlar) olmalıdır; əlaqəsiz sənədlər DOWNRANK edilməlidir!
10. "MƏHKƏMƏYƏ MÜRACİƏT ET" KİMİ BOŞ VƏ ÜMUMİ CAVAB QADAĞANDIR:
   * "İşdən əsassız çıxarıldıqda hara şikayət etməliyəm?" sualına yalnız "Məhkəməyə müraciət edə bilərsiniz" demək QADAĞANDIR!
   * Cavab: Əsas hüquqi müdafiə vasitəsi + Müvafiq dövlət nəzarəti orqanı (Dövlət Əmək Müfəttişliyi Xidməti) + Məhkəməyə müraciət müddəti (Əmək Məcəlləsinin müvafiq fərdi əmək mübahisələri normaları) + İşə bərpa və əməkhaqqı tələbi + Konkret addımlar şəklində dəqiq qurulmalıdır.
11. MODALITY VƏ NEGATION QORUNMASI:
   * "edə bilər" ≠ "etməlidir"; "hüququ vardır" ≠ "məcburidir"; "yolveriləndir" ≠ "məcburidir".
   * "bilər" ifadəsini "mütləq etməlidir" kimi təqdim etmə!
12. DOCUMENT_ID QANUN MADDƏSİ DEYİL:
   * document_id = 60090 və ya 60091 yalnız e-Qanun API-nin texniki sənəd nömrəsidir. Heç vaxt "60090-cı maddə" kimi yazma!
13. RAG-DA MƏLUMAT YOXDURSA, AÇIQ BİLDİR:
   * "Bu məsələ üzrə təqdim olunan mənbələrdə kifayət qədər hüquqi əsas tapılmadı." de, özündən norma uydurma!
14. AİLƏ HÜQUQU VƏ BOŞANMA ZAMANI ƏMLAKIN BÖLÜNMƏSİ MƏCBURİ QAYDASI:
   * Ər-arvadın ümumi və ya birgə mülkiyyətinin bölünməsi YALNIZ Ailə Məcəlləsinin 32-ci (birgə mülkiyyət), 34-cü (hər birinin mülkiyyəti), 36-cı (ümumi əmlakın bölünməsi) və 37-ci (payların müəyyən edilməsi) maddələri ilə tənzimlənir.
   * QƏTİYYƏN Maddə 30-a ("Ər-arvadın soyad seçmək hüququ") istinad etmə! Əmlakın bölünməsi sualında soyad seçmək maddəsini göstərmək kobud hüquqi xətadır!

# MÜTLƏQ STANDART CAVAB FORMATI (JSON):
Aşağıdakı standart JSON strukturunda cavab ver:

{
  "cavab": "## Hüquqi sual\n[sualların hüquqi forması]\n\n## Qısa cavab\n[2–5 cümlə, birbaşa həll]\n\n## Hüquqi əsaslar\n\n### 1. [Normativ akt] — Maddə [X]\n[dəqiq və evidence-based izah]\n\n### 2. [Normativ akt] — Maddə [Y]\n[dəqiq və evidence-based izah]\n\n## Praktik izah\n[istifadəçinin vəziyyətinə və faktlara tətbiq]\n\n## Vacib məqamlar\n[müddətlər / istisnalar / zəruri şərtlər / prosedurlar]\n\n## Məhkəmə təcrübəsi\n[Yalnız kontekstdə relevant məhkəmə presedenti olduqda]\n\n## Mənbələr\n- Azərbaycan Respublikasının [Qanunun tam adı] — Maddə [X]\n- [Rəsmi e-Qanun və API istinadı]",
  "maddeler": [
    "Azərbaycan Respublikasının [Qanunun Adı] - Maddə [X]"
  ],
  "legal_basis": [
    {
      "law_name": "[Qanunun tam adı]",
      "article_number": "[Maddə nömrəsi, məs: 70, 739, 174, 57.1]",
      "article_title": "[Maddənin rəsmi başlığı]",
      "part_number": "[Hissə/bənd]",
      "claim": "[Bu normanın tətbiq edildiyi hüquqi nəticə]"
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
    // Use high-capability legal reasoning model: gpt-4o or gpt-4o-mini
    let reqModel = isOpr ? "openai/gpt-4o" : "gpt-4o"
    
    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(isOpr ? { "HTTP-Referer": "https://huquqai.az", "X-Title": "HuquqAI" } : {})
    }
    
    let body: any = {
      model: reqModel,
      response_format: { type: "json_object" },
      max_tokens: 2500,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
    }
    
    let response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    })

    // If Rate Limited (429), or model not found (404/400/402), fallback to gpt-4o-mini smoothly
    if (!response.ok && (response.status === 429 || response.status === 404 || response.status === 400 || response.status === 402)) {
      console.warn(`Primary model ${reqModel} returned ${response.status}. Falling back to gpt-4o-mini...`)
      // Wait 1.5s in case of rate limits
      await new Promise(res => setTimeout(res, 1500))
      body.model = isOpr ? "openai/gpt-4o-mini" : "gpt-4o-mini"
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
         throw new Error("Sistemdə qısa müddətli sıxlıq var. Zəhmət olmasa bir neçə saniyə sonra yenidən cəhd edin.")
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

    // 6. VALIDATE & ENFORCE TWO-PASS HALLUCINATION GUARD
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
    const isTruncated = targetTitle.endsWith("...")
    const cleanTargetTitle = isTruncated ? targetTitle.slice(0, -3).trim() : targetTitle
    const nTarget = normalizeAz(cleanTargetTitle);

    const articleMatch = cleanTargetTitle.match(/(?:madd[eə]\s*)?(\d+(?:\.\d+)*)/i);
    let targetArticle = articleMatch ? articleMatch[1] : null;
    
    // Only map known decimal articles like 571 -> 57.1, NEVER change 174, 173, etc.
    if (targetArticle === "571") targetArticle = "57.1";
    else if (targetArticle === "581") targetArticle = "58.1";
    else if (targetArticle === "1921") targetArticle = "192.1";

    const baseArtNum = targetArticle ? targetArticle.split('.')[0] : "";

    // 1. Direct High-Fidelity Extraction from Source Knowledge Base (Full Article Text)
    if (targetArticle) {
      try {
        const kbPath = path.join(process.cwd(), 'src/data/knowledge_base');
        if (fs.existsSync(kbPath)) {
          const files = fs.readdirSync(kbPath).filter(f => f.endsWith('.txt'));
          const tLow = cleanTargetTitle.toLowerCase();
          
          let matchedFiles = files.filter(f => {
            if (tLow.includes('mülki') && !tLow.includes('prosessual')) return f.includes('46944');
            if (tLow.includes('vergi')) return f.includes('46948');
            if (tLow.includes('əmək')) return f.includes('46943') || f.includes('46942_Əmək');
            if (tLow.includes('cinayət') && !tLow.includes('prosessual')) return f.includes('46947');
            if (tLow.includes('inzibati xəta') || tLow.includes('ixm')) return f.includes('46960');
            if (tLow.includes('istehlak')) return f.includes('istehlak') || f.includes('3289');
            if (tLow.includes('ailə')) return f.includes('46946');
            if (tLow.includes('konstitusiya')) return f.includes('897');
            return false;
          });

          if (matchedFiles.length === 0) {
            matchedFiles = files.filter(f => f.startsWith('eqanun_mega_') || f.startsWith('e_qanun_'));
          }

          const artCandidates = [targetArticle, baseArtNum];
          for (const artStr of artCandidates) {
            const prefixes = [
              '=== Maddə ' + artStr + '.',
              '=== Maddə ' + artStr + ' ',
              '=== Maddə ' + artStr + '===',
              'Maddə ' + artStr + '.',
              'Maddə ' + artStr + ' ',
              'Maddə ' + artStr + '–',
              'Maddə ' + artStr + '-'
            ];

            for (const file of matchedFiles) {
              const fileContent = fs.readFileSync(path.join(kbPath, file), 'utf-8');
              let startIdx = -1;
              for (const p of prefixes) {
                const idx = fileContent.indexOf(p);
                if (idx !== -1) {
                  startIdx = idx;
                  break;
                }
              }

              if (startIdx !== -1) {
                const searchStart = startIdx + 20;
                const nextMatch = fileContent.substring(searchStart).match(/(?:===\s*)?Madd[eə]\s+\d+/i);
                const nextIndex = (nextMatch && typeof nextMatch.index === 'number') ? nextMatch.index : -1;
                const endIdx = nextIndex !== -1 ? (searchStart + nextIndex) : (startIdx + 12000);
                const raw = fileContent.substring(startIdx, endIdx);
                const clean = raw
                  .replace(/===[^=\n\r]*===/g, '')
                  .replace(/\[\d+\]/g, '')
                  .replace(/\u00a0/g, ' ')
                  .replace(/^[ \t]+$/gm, '')
                  .replace(/\n{3,}/g, '\n\n')
                  .trim();

                if (clean && clean.length > 50) {
                  return {
                    title: cleanTargetTitle,
                    content: clean,
                    lawName: cleanTargetTitle.split('-')[0].trim(),
                    articleNumber: targetArticle,
                    sourceUrl: `https://www.e-qanun.ai`
                  };
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Error in high-fidelity article extraction:", err);
      }
    }

    // 2. Search parsed chunks by articleNumber or title
    const allChunks = loadAndParseKnowledgeBase();
    if (allChunks && allChunks.length > 0) {
      let match = allChunks.find(c => {
        const nTitle = normalizeAz(c.articleTitle);
        const isTitleMatch = isTruncated 
          ? nTitle.startsWith(nTarget) || nTitle.includes(nTarget)
          : nTitle === nTarget || nTitle.includes(nTarget);
        
        const isArticleMatch = targetArticle ? (c.articleNumber === targetArticle || c.articleNumber === baseArtNum) : true;
        return isTitleMatch && isArticleMatch;
      });

      if (!match && targetArticle) {
        const lawInTitle = Object.values(LAW_REGISTRY).find(l => 
          cleanTargetTitle.toLowerCase().includes(l.shortName.toLowerCase()) || 
          cleanTargetTitle.toLowerCase().includes(l.name.toLowerCase())
        );
        match = allChunks.find(c => 
          (lawInTitle ? c.lawId === lawInTitle.id : true) && 
          (c.articleNumber === targetArticle || c.articleNumber === baseArtNum || c.articleNumber.startsWith(baseArtNum))
        );
      }

      if (match) {
        return {
          title: match.articleTitle,
          content: match.content,
          lawName: match.lawName,
          articleNumber: match.articleNumber,
          sourceUrl: match.sourceUrl
        }
      }
    }

    // 3. Direct fetch via e-qanun client for any arbitrary ID (1 to 60091)
    const docIdMatch = cleanTargetTitle.match(/№\s*(\d+)/i) || cleanTargetTitle.match(/\b(\d{1,6})\b/);
    if (docIdMatch) {
      const docId = docIdMatch[1];
      const docRes = await eqanunClient.getDocument(docId);
      if (docRes.api_status === 200 && docRes.text) {
        return {
          title: docRes.title || cleanTargetTitle,
          content: docRes.text,
          lawName: docRes.title,
          articleNumber: docId,
          sourceUrl: docRes.source_url
        };
      }
    }

    return null;
  } catch (err) {
    console.error("Error in getDocumentByTitle:", err)
    return null;
  }
}
