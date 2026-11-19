import { NextRequest, NextResponse } from "next/server";
import { generateLegalResponse } from "@/app/actions/chat";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = body.question || body.query || "";

    if (!question.trim()) {
      return NextResponse.json({ error: "Sual qeyd olunmayıb." }, { status: 400 });
    }

    const history = Array.isArray(body.history)
      ? body.history
          .filter((h: any) => h && typeof h.role === "string" && typeof h.content === "string")
          .slice(-8)
      : [];

    const result = await generateLegalResponse(question, undefined, history);

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
      citation_valid: result.citation_valid,
      audit_verified: Boolean((result as any).audit_verified),
      follow_ups: Array.isArray((result as any).follow_ups) ? (result as any).follow_ups : [],
      precedent: (result as any).precedent || null
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || "Xəta baş verdi"
    }, { status: 500 });
  }
}
