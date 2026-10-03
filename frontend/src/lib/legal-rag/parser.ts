import fs from 'fs';
import path from 'path';
import { StructuredChunk } from './types';
import { LAW_REGISTRY } from './registry';

let cachedChunks: StructuredChunk[] | null = null;

function detectLawInfo(content: string, fileName: string): { lawId: string; lawName: string; sourceUrl: string } {
  const head = content.substring(0, 1500).toUpperCase();

  // 1. Direct Framework ID Match from Filename or Header
  if (fileName.includes("İstehlakçıların_hüquqlarının_müdafiəsi") || head.includes("İSTEHLAKÇILARIN HÜQUQLARININ MÜDAFİƏSİ")) {
    return { lawId: "istehlakci", lawName: LAW_REGISTRY.istehlakci.name, sourceUrl: LAW_REGISTRY.istehlakci.sourceUrl };
  }
  if (fileName.includes("Şəhərsalma_və_Tikinti") || head.includes("ŞƏHƏRSALMA VƏ TİKİNTİ")) {
    return { lawId: "sehersalma", lawName: LAW_REGISTRY.sehersalma.name, sourceUrl: LAW_REGISTRY.sehersalma.sourceUrl };
  }
  if (fileName.includes("Yol_hərəkəti_haqqında") || (head.includes("YOL HƏRƏKƏTİ HAQQINDA") && !head.includes("İNZİBATİ"))) {
    return { lawId: "yol_hereketi", lawName: LAW_REGISTRY.yol_hereketi.name, sourceUrl: LAW_REGISTRY.yol_hereketi.sourceUrl };
  }
  if (fileName.includes("Mənzil_Məcəlləsi") || head.includes("AZƏRBAYCAN RESPUBLİKASININ MƏNZİL MƏCƏLLƏSİ")) {
    return { lawId: "menzil", lawName: LAW_REGISTRY.menzil.name, sourceUrl: LAW_REGISTRY.menzil.sourceUrl };
  }
  if (fileName.includes("46943_Əmək_Məcəlləsi") || fileName.includes("46942_Əmək_Məcəlləsi") || (head.includes("AZƏRBAYCAN RESPUBLİKASININ ƏMƏK MƏCƏLLƏSİ") && !head.includes("MEŞƏ"))) {
    return { lawId: "emek", lawName: LAW_REGISTRY.emek.name, sourceUrl: LAW_REGISTRY.emek.sourceUrl };
  }
  if (fileName.includes("46944_Mülki_Məcəllə") || (head.includes("AZƏRBAYCAN RESPUBLİKASININ MÜLKİ MƏCƏLLƏSİ") && !head.includes("PROSESSUAL"))) {
    return { lawId: "mulki", lawName: LAW_REGISTRY.mulki.name, sourceUrl: LAW_REGISTRY.mulki.sourceUrl };
  }
  if (fileName.includes("46946_Ailə_Məcəlləsi") || head.includes("AZƏRBAYCAN RESPUBLİKASININ AİLƏ MƏCƏLLƏSİ")) {
    return { lawId: "aile", lawName: LAW_REGISTRY.aile.name, sourceUrl: LAW_REGISTRY.aile.sourceUrl };
  }
  if (fileName.includes("46947") && (head.includes("CİNAYƏT MƏCƏLLƏSİ") && !head.includes("PROSESSUAL"))) {
    return { lawId: "cinayet", lawName: LAW_REGISTRY.cinayet.name, sourceUrl: LAW_REGISTRY.cinayet.sourceUrl };
  }
  if (fileName.includes("46960") || head.includes("AZƏRBAYCAN RESPUBLİKASININ İNZİBATİ XƏTALAR MƏCƏLLƏSİ")) {
    return { lawId: "inzibati_xetalar", lawName: LAW_REGISTRY.inzibati_xetalar.name, sourceUrl: LAW_REGISTRY.inzibati_xetalar.sourceUrl };
  }
  if (fileName.includes("46945") || head.includes("AZƏRBAYCAN RESPUBLİKASININ MÜLKİ PROSESSUAL MƏCƏLLƏSİ")) {
    return { lawId: "mulki_prosessual", lawName: LAW_REGISTRY.mulki_prosessual.name, sourceUrl: LAW_REGISTRY.mulki_prosessual.sourceUrl };
  }
  if (fileName.includes("46950") || head.includes("AZƏRBAYCAN RESPUBLİKASININ CİNAYƏT-PROSESSUAL MƏCƏLLƏSİ")) {
    return { lawId: "cinayet_prosessual", lawName: LAW_REGISTRY.cinayet_prosessual.name, sourceUrl: LAW_REGISTRY.cinayet_prosessual.sourceUrl };
  }
  if (fileName.includes("46948") && head.includes("VERGİ MƏCƏLLƏSİ")) {
    return { lawId: "vergi", lawName: LAW_REGISTRY.vergi.name, sourceUrl: LAW_REGISTRY.vergi.sourceUrl };
  }
  if (fileName.includes("46942_Torpaq_Məcəlləsi") || head.includes("AZƏRBAYCAN RESPUBLİKASININ TORPAQ MƏCƏLLƏSİ")) {
    return { lawId: "torpaq", lawName: LAW_REGISTRY.torpaq.name, sourceUrl: LAW_REGISTRY.torpaq.sourceUrl };
  }
  if (fileName.includes("897") || (head.includes("AZƏRBAYCAN RESPUBLİKASININ KONSTİTUSİYASI") && !head.includes("MƏCƏLLƏ"))) {
    return { lawId: "konstitusiya", lawName: LAW_REGISTRY.konstitusiya.name, sourceUrl: LAW_REGISTRY.konstitusiya.sourceUrl };
  }
  if (head.includes("MƏHKƏMƏLƏR VƏ HAKİMLƏR")) {
    return { lawId: "mehkimeler", lawName: LAW_REGISTRY.mehkimeler.name, sourceUrl: LAW_REGISTRY.mehkimeler.sourceUrl };
  }
  if (head.includes("TƏHSİL HAQQINDA")) {
    return { lawId: "tehsil", lawName: LAW_REGISTRY.tehsil.name, sourceUrl: LAW_REGISTRY.tehsil.sourceUrl };
  }

  // Fallback
  const docNameMatch = content.match(/SƏNƏDİN ADI:\s*([^\n\r]+)/i);
  const docIdMatch = content.match(/ID:\s*(\d+)/i) || fileName.match(/_(\d+)/);
  const detectedName = docNameMatch ? docNameMatch[1].trim() : fileName.replace('.txt', '').replace(/_/g, ' ');
  const detectedId = docIdMatch ? docIdMatch[1] : '1';

  return {
    lawId: fileName.replace('.txt', ''),
    lawName: detectedName,
    sourceUrl: `https://www.e-qanun.ai/results/${detectedId}`
  };
}

export function loadAndParseKnowledgeBase(): StructuredChunk[] {
  if (cachedChunks) return cachedChunks;

  const kbPath = path.join(process.cwd(), 'src/data/knowledge_base');
  if (!fs.existsSync(kbPath)) return [];

  const files = fs.readdirSync(kbPath).filter(f => f.endsWith('.txt'));
  const chunks: StructuredChunk[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const filePath = path.join(kbPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    const lawInfo = detectLawInfo(content, file);

    const rawSections = content.split(/\n\s*\n/);
    let mergedSections: string[] = [];
    let currentSection = "";

    for (const sec of rawSections) {
      const t = sec.trim();
      if (!t) continue;

      if (!currentSection) {
        currentSection = t;
      } else if (currentSection.length + t.length < 900 && !t.match(/^(?:maddə|bölmə|fəsil|\d+\.)/i)) {
        currentSection += "\n\n" + t;
      } else {
        mergedSections.push(currentSection);
        currentSection = t;
      }
    }
    if (currentSection) mergedSections.push(currentSection);

    let currentArticleNum = "";
    let currentArticleTitle = "";

    for (let i = 0; i < mergedSections.length; i++) {
      const sec = mergedSections[i];
      const headerMatch = sec.match(/(?:madd[eə]\s*)(\d+(?:[\.\-]\d+)*)(?:\s*[\.\-]\s*([^\n\r]+))?/i) ||
                         sec.match(/^(\d+(?:[\.\-]\d+)*)\s*[-–.]\s*ci\s*madd[eə](?:\s*[\.\-]\s*([^\n\r]+))?/i);

      if (headerMatch) {
        currentArticleNum = headerMatch[1].replace('-', '.');
        currentArticleTitle = headerMatch[2] ? headerMatch[2].trim() : `${lawInfo.lawName} - Maddə ${currentArticleNum}`;
      }

      const dedupeKey = `${lawInfo.lawId}_${currentArticleNum}_${sec.substring(0, 40)}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      chunks.push({
        sourceId: `${file}_sec_${i}`,
        lawId: lawInfo.lawId,
        lawName: lawInfo.lawName,
        articleNumber: currentArticleNum,
        articleTitle: currentArticleTitle || `${lawInfo.lawName} Maddə`,
        content: sec,
        sourceFile: file,
        sourceUrl: lawInfo.sourceUrl
      });
    }
  }

  cachedChunks = chunks;
  return chunks;
}
