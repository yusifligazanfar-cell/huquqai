export interface StructuredLaw {
  id: string;
  frameworkId: number;
  name: string;
  shortName: string;
  category: string;
  sourceUrl: string;
  fallbackUrl: string;
  files: string[];
}

export interface StructuredArticle {
  sourceId: string;
  lawId: string;
  lawName: string;
  articleNumber: string;
  articleTitle: string;
  partNumber?: string;
  subpartIdentifier?: string;
  text: string;
  sourceUrl: string;
}

export interface StructuredChunk {
  sourceId: string;
  lawId: string;
  lawName: string;
  articleNumber: string;
  articleTitle: string;
  partNumber?: string;
  subpartIdentifier?: string;
  content: string;
  sourceFile: string;
  sourceUrl: string;
  score?: number;
}

export interface QueryAnalysis {
  normalizedQuery: string;
  legalDomain: string;
  intent: string;
  entities: string[];
  keywords: string[];
  possibleLaws: string[];
  targetArticleNum: string | null;
  targetPart: string | null;
}

export interface LegalBasisItem {
  source_id: string;
  law_name: string;
  article_number: string;
  article_title?: string;
  part_number?: string;
  subpart_identifier?: string;
  source_url: string;
  claim: string;
  verified: boolean;
}

export interface VerifiedSource {
  source_id: string;
  title: string;
  url: string;
  article_number: string;
  verified: boolean;
  content?: string;
}

export interface LegalResponsePayload {
  success: boolean;
  answer: string;
  legal_basis: LegalBasisItem[];
  sources: VerifiedSource[];
  confidence: number;
  citation_valid: boolean;
  needs_review: boolean;
  maddeler: string[];
  citations: string[];
  debug?: {
    queryAnalysis: QueryAnalysis;
    retrievedCount: number;
    topProvisions: string[];
  };
}

export interface TestResultItem {
  question: string;
  expected_law: string;
  expected_article: string;
  actual_law: string;
  actual_article: string;
  citation_valid: boolean;
  source_valid: boolean;
  hallucination: boolean;
  score: number;
}
