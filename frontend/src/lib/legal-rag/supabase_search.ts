import type { StructuredChunk } from "./types";

export async function searchSupabaseHybrid(_params: {
  query: string;
  expandedQueries?: string[];
  targetFrameworkIds?: string[];
  articleNumbers?: string[];
  limit?: number;
}): Promise<StructuredChunk[]> {
  return [];
}

export async function searchSupabaseDocuments(
  _query: string,
  _limit = 8
): Promise<
  Array<{
    documentId: string;
    title: string;
    articleNumber?: string;
    snippet: string;
    sourceUrl?: string;
    score: number;
  }>
> {
  return [];
}
