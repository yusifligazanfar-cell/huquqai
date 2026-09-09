import { NextRequest, NextResponse } from "next/server";
import { generateLegalResponse } from "@/app/actions/chat";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = body.question || body.query || "";

    if (!question.trim()) {
      return NextResponse.json({ error: "Sual qeyd olunmayıb." }, { status: 400 });
    }

    const result = await generateLegalResponse(question);

    return NextResponse.json({
      question: question,
      answer: result.content,
      sources: (result.legal_basis || []).map((lb: any) => ({
        document_id: lb.source_id,
        law: lb.law_name,
        article: lb.article_number,
        article_title: lb.article_title || "",
        paragraph: lb.part_number || "",
        claim: lb.claim,
        source_url: lb.source_url
      })),
      citations: result.citations,
      precedent: (result as any).precedent || null
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || "Xəta baş verdi"
    }, { status: 500 });
  }
}
