import { NextRequest, NextResponse } from "next/server";
import { eqanunClient } from "@/lib/services/e_qanun_client";
import { parseLegalHtml } from "@/lib/legal_parser/parser";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ document_id: string }> }
) {
  const { document_id } = await params;
  const doc = await eqanunClient.getDocument(document_id);

  if (!doc || !doc.text) {
    return NextResponse.json({
      document_id: document_id,
      api_status: doc?.api_status || 404,
      error: "Sənəd tapılmadı və ya əldə edilə bilmədi",
      source_url: `https://www.e-qanun.ai/results/${document_id}`
    }, { status: 404 });
  }

  const parsed = parseLegalHtml(doc.raw_html || doc.text, document_id, doc.title);

  return NextResponse.json({
    document_id: document_id,
    api_status: doc.api_status,
    source: doc.source,
    title: parsed.title,
    text_length: parsed.text_length,
    article_count: parsed.article_count,
    source_url: doc.source_url,
    articles: parsed.articles.slice(0, 10), // return first 10 for inspectable size
    first_500_chars: parsed.text.slice(0, 500)
  });
}
