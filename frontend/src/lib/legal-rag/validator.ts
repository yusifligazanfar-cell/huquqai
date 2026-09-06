import { StructuredChunk, LegalBasisItem, VerifiedSource, LegalResponsePayload } from './types';
import { LAW_REGISTRY } from './registry';

export function validateLegalResponse(
  rawJson: any,
  retrievedChunks: StructuredChunk[]
): LegalResponsePayload {
  const answer = rawJson.cavab || rawJson.answer || "";
  const rawBasis = rawJson.legal_basis || [];
  const rawMaddeler = rawJson.maddeler || [];

  const verifiedLegalBasis: LegalBasisItem[] = [];
  const verifiedSources: VerifiedSource[] = [];
  const validArticleTitles: string[] = [];

  // Index retrieved chunks by law & article
  const chunkMap = new Map<string, StructuredChunk>();
  for (const chunk of retrievedChunks) {
    const key = `${chunk.lawName.toLowerCase()}_${chunk.articleNumber}`;
    chunkMap.set(key, chunk);
  }

  let validCount = 0;
  let totalChecked = 0;

  // 1. Process and Validate Structured Legal Basis
  if (Array.isArray(rawBasis)) {
    for (const item of rawBasis) {
      totalChecked++;
      const lawName = item.law_name || "";
      const artNum = String(item.article_number || "").replace(/\D/g, '');
      
      // Match against known registry
      let matchedReg = Object.values(LAW_REGISTRY).find(l => 
        lawName.toLowerCase().includes(l.shortName.toLowerCase()) || 
        lawName.toLowerCase().includes(l.name.toLowerCase())
      );

      // Check if this article was in retrieved context
      const retrievedMatch = retrievedChunks.find(c => 
        (matchedReg ? c.lawId === matchedReg.id : true) && 
        (artNum ? c.articleNumber === artNum : true)
      );

      const isVerified = Boolean(retrievedMatch || (matchedReg && artNum));
      const sourceUrl = matchedReg ? matchedReg.sourceUrl : (retrievedMatch?.sourceUrl || "https://www.e-qanun.ai");

      if (isVerified) validCount++;

      const basisItem: LegalBasisItem = {
        source_id: retrievedMatch?.sourceId || `law_${matchedReg?.frameworkId || 'src'}_art_${artNum}`,
        law_name: matchedReg?.name || lawName,
        article_number: artNum || item.article_number || "",
        article_title: retrievedMatch?.articleTitle || item.article_title || (artNum ? `Maddə ${artNum}` : ""),
        part_number: item.part_number,
        subpart_identifier: item.subpart_identifier,
        source_url: sourceUrl,
        claim: item.claim || "",
        verified: isVerified
      };

      verifiedLegalBasis.push(basisItem);

      const titleStr = `${matchedReg?.shortName || lawName} - Maddə ${artNum}`;
      validArticleTitles.push(titleStr);

      verifiedSources.push({
        source_id: basisItem.source_id,
        title: titleStr,
        url: sourceUrl,
        article_number: artNum,
        verified: isVerified,
        content: retrievedMatch?.content
      });
    }
  }

  // 2. Process Maddələr array if legal_basis was empty
  if (verifiedLegalBasis.length === 0 && Array.isArray(rawMaddeler)) {
    for (const m of rawMaddeler) {
      const artMatch = String(m).match(/(\d+)/);
      const artNum = artMatch ? artMatch[1] : "";
      
      let matchedReg = Object.values(LAW_REGISTRY).find(l => 
        String(m).toLowerCase().includes(l.shortName.toLowerCase()) || 
        String(m).toLowerCase().includes(l.name.toLowerCase())
      );

      const retrievedMatch = retrievedChunks.find(c => 
        (matchedReg ? c.lawId === matchedReg.id : true) && 
        (artNum ? c.articleNumber === artNum : true)
      );

      const isVerified = Boolean(retrievedMatch || matchedReg);
      const sourceUrl = matchedReg ? matchedReg.sourceUrl : (retrievedMatch?.sourceUrl || "https://www.e-qanun.ai");

      validArticleTitles.push(String(m));
      verifiedSources.push({
        source_id: retrievedMatch?.sourceId || `src_${artNum}`,
        title: String(m),
        url: sourceUrl,
        article_number: artNum,
        verified: isVerified,
        content: retrievedMatch?.content
      });
    }
  }

  // Fallback to top retrieved chunks if model didn't return any structured basis
  if (verifiedSources.length === 0 && retrievedChunks.length > 0) {
    const topChunk = retrievedChunks[0];
    verifiedSources.push({
      source_id: topChunk.sourceId,
      title: topChunk.articleTitle,
      url: topChunk.sourceUrl,
      article_number: topChunk.articleNumber,
      verified: true,
      content: topChunk.content
    });
    validArticleTitles.push(topChunk.articleTitle);
  }

  // 3. Compute Empirical Confidence Score
  const citationValid = verifiedSources.some(s => s.verified);
  const confidence = citationValid ? (totalChecked > 0 ? Number((validCount / totalChecked).toFixed(2)) : 0.95) : 0.40;

  // 4. Extract citations list for UI
  const citations = Array.from(new Set(validArticleTitles.length > 0 ? validArticleTitles : retrievedChunks.slice(0, 3).map(c => c.articleTitle)));

  return {
    success: true,
    answer,
    legal_basis: verifiedLegalBasis,
    sources: verifiedSources,
    confidence: Math.max(0.75, confidence),
    citation_valid: citationValid,
    needs_review: confidence < 0.70,
    maddeler: citations,
    citations
  };
}
