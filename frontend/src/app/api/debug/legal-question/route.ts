import { NextRequest, NextResponse } from "next/server";
import { analyzeQuery } from "@/lib/legal-rag/analyzer";
import { hybridSearch } from "@/lib/legal-rag/search";
import { generateLegalResponse } from "@/app/actions/chat";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = body.question || "";

    if (!question.trim()) {
      return NextResponse.json({ error: "Sual daxil edilməyib" }, { status: 400 });
    }

    // 1. Query Analysis
    const queryAnalysis = analyzeQuery(question);

    // 2. Retrieval of Real Legal Articles
    const retrievedChunks = hybridSearch(queryAnalysis, 5);

    const retrievedDocuments = Array.from(new Set(retrievedChunks.map(c => ({
      lawId: c.lawId,
      lawName: c.lawName,
      sourceFile: c.sourceFile,
      sourceUrl: c.sourceUrl
    }))));

    const retrievedArticles = retrievedChunks.map(c => ({
      law: c.lawName,
      article_number: c.articleNumber,
      article_title: c.articleTitle,
      source_url: c.sourceUrl,
      score: c.score,
      text_preview: c.content.slice(0, 300)
    }));

    // 3. AI Generation
    const aiResult = await generateLegalResponse(question);

    return NextResponse.json({
      question,
      query_analysis: queryAnalysis,
      retrieved_documents: retrievedDocuments,
      retrieved_articles: retrievedArticles,
      context_sent_to_llm: retrievedChunks.map(c => ({
        title: c.articleTitle,
        url: c.sourceUrl,
        length: c.content.length
      })),
      answer: aiResult.content,
      citations: aiResult.citations,
      legal_basis: aiResult.legal_basis,
      confidence: aiResult.confidence,
      citation_valid: aiResult.citation_valid
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
