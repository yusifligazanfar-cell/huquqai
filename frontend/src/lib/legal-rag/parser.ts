import fs from 'fs';
import path from 'path';
import { StructuredChunk } from './types';
import { LAW_REGISTRY } from './registry';

let cachedChunks: StructuredChunk[] | null = null;

function detectLawInfo(content: string, fileName: string): { lawId: string; lawName: string; sourceUrl: string } {
  const head = content.substring(0, 1500).toUpperCase();

  // 1. Direct Framework ID Match from Filename or Header
  if (fileName.includes("46943") || head.includes("AZƏRBAYCAN RESPUBLİKASININ ƏMƏK MƏCƏLLƏSİ") || head.includes("AZERBAYCAN RESPUBLIKASININ EMEK MECELLESI")) {
    return { lawId: "emek", lawName: LAW_REGISTRY.emek.name, sourceUrl: LAW_REGISTRY.emek.sourceUrl };
  }
  if (fileName.includes("46944") || head.includes("AZƏRBAYCAN RESPUBLİKASININ MÜLKİ MƏCƏLLƏSİ") || head.includes("AZERBAYCAN RESPUBLIKASININ MULKI MECELLESI")) {
    return { lawId: "mulki", lawName: LAW_REGISTRY.mulki.name, sourceUrl: LAW_REGISTRY.mulki.sourceUrl };
  }
  if (fileName.includes("46946") || head.includes("AZƏRBAYCAN RESPUBLİKASININ AİLƏ MƏCƏLLƏSİ") || head.includes("AZERBAYCAN RESPUBLIKASININ AILE MECELLESI")) {
    return { lawId: "aile", lawName: LAW_REGISTRY.aile.name, sourceUrl: LAW_REGISTRY.aile.sourceUrl };
  }
  if (fileName.includes("46947") || head.includes("AZƏRBAYCAN RESPUBLİKASININ CİNAYƏT MƏCƏLLƏSİ") || head.includes("AZERBAYCAN RESPUBLIKASININ CINAYET MECELLESI")) {
    return { lawId: "cinayet", lawName: LAW_REGISTRY.cinayet.name, sourceUrl: LAW_REGISTRY.cinayet.sourceUrl };
  }
  if (fileName.includes("46960") || head.includes("AZƏRBAYCAN RESPUBLİKASININ İNZİBATİ XƏTALAR MƏCƏLLƏSİ") || head.includes("AZERBAYCAN RESPUBLIKASININ INZIBATI XETALAR MECELLESI")) {
    return { lawId: "inzibati_xetalar", lawName: LAW_REGISTRY.inzibati_xetalar.name, sourceUrl: LAW_REGISTRY.inzibati_xetalar.sourceUrl };
  }
  if (fileName.includes("46945") || head.includes("AZƏRBAYCAN RESPUBLİKASININ MÜLKİ PROSESSUAL MƏCƏLLƏSİ")) {
    return { lawId: "mulki_prosessual", lawName: LAW_REGISTRY.mulki_prosessual.name, sourceUrl: LAW_REGISTRY.mulki_prosessual.sourceUrl };
  }
  if (fileName.includes("46950") || head.includes("AZƏRBAYCAN RESPUBLİKASININ CİNAYƏT-PROSESSUAL MƏCƏLLƏSİ") || head.includes("CİNAYƏT PROSESSUAL")) {
    return { lawId: "cinayet_prosessual", lawName: LAW_REGISTRY.cinayet_prosessual.name, sourceUrl: LAW_REGISTRY.cinayet_prosessual.sourceUrl };
  }
  if (fileName.includes("46948") || head.includes("AZƏRBAYCAN RESPUBLİKASININ VERGİ MƏCƏLLƏSİ") || head.includes("VERGI MECELLESI")) {
    return { lawId: "vergi", lawName: LAW_REGISTRY.vergi.name, sourceUrl: LAW_REGISTRY.vergi.sourceUrl };
  }
  if (fileName.includes("46942") || head.includes("AZƏRBAYCAN RESPUBLİKASININ TORPAQ MƏCƏLLƏSİ")) {
    return { lawId: "torpaq", lawName: LAW_REGISTRY.torpaq.name, sourceUrl: LAW_REGISTRY.torpaq.sourceUrl };
  }
  if (fileName.includes("Mənzil_Məcəlləsi") || head.includes("AZƏRBAYCAN RESPUBLİKASININ MƏNZİL MƏCƏLLƏSİ") || head.includes("AZERBAYCAN RESPUBLIKASININ MENZIL MECELLESI")) {
    return { lawId: "menzil", lawName: LAW_REGISTRY.menzil.name, sourceUrl: LAW_REGISTRY.menzil.sourceUrl };
  }
  if (fileName.includes("46955") && (head.includes("ŞƏHƏRSALMA VƏ TİKİNTİ") || head.includes("SEHERSALMA"))) {
    return { lawId: "sehersalma", lawName: LAW_REGISTRY.sehersalma.name, sourceUrl: LAW_REGISTRY.sehersalma.sourceUrl };
  }
  if (fileName.includes("46953") && (head.includes("YOL HƏRƏKƏTİ") || head.includes("YOL HEREKETI"))) {
    return { lawId: "yol_hereketi", lawName: LAW_REGISTRY.yol_hereketi.name, sourceUrl: LAW_REGISTRY.yol_hereketi.sourceUrl };
  }

  if (fileName.includes("897") || (head.includes("AZƏRBAYCAN RESPUBLİKASININ KONSTİTUSİYASI") && !head.includes("MƏCƏLLƏ"))) {
    return { lawId: "konstitusiya", lawName: LAW_REGISTRY.konstitusiya.name, sourceUrl: LAW_REGISTRY.konstitusiya.sourceUrl };
  }
  if (head.includes("İSTEHLAKÇILARIN HÜQUQLARININ MÜDAFİƏSİ")) {
    return { lawId: "istehlakci", lawName: LAW_REGISTRY.istehlakci.name, sourceUrl: LAW_REGISTRY.istehlakci.sourceUrl };
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

    // Split by Article headers
    const rawSections = content.split(/\n\s*\n/);
    let mergedSections: string[] = [];
    let currentSection = "";

    for (const sec of rawSections) {
      const t = sec.trim();
      if (!t) continue;

      if (!currentSection) {
        currentSection = t;
      } else if (/^(?:Maddə\s+\d+|[\d\.]+\s+Maddə)/i.test(t)) {
        mergedSections.push(currentSection);
        currentSection = t;
      } else {
        currentSection += "\n" + t;
      }

      if (currentSection.length > 4000) {
        mergedSections.push(currentSection);
        currentSection = "";
      }
    }
    if (currentSection) mergedSections.push(currentSection);

    for (const textChunk of mergedSections) {
      if (textChunk.length < 20 || seen.has(textChunk)) continue;
      seen.add(textChunk);

      const firstLine = textChunk.split('\n')[0].replace(/===/g, '').trim();
      
      // Extract Article Number
      let articleNum = "";
      const artMatch = firstLine.match(/(?:Maddə\s*(\d+(?:\.\d+)*)|(\d+)\.\s*Maddə|^(\d+(?:\.\d+)*)\.)/i);
      if (artMatch) {
        articleNum = artMatch[1] || artMatch[2] || artMatch[3] || "";
      }

      let articleTitle = firstLine;
      if (firstLine.length > 90) {
        articleTitle = articleNum ? `Maddə ${articleNum}` : firstLine.substring(0, 90) + "...";
      }

      const sourceId = `${lawInfo.lawId}_art_${articleNum || 'sec'}_${chunks.length}`;

      chunks.push({
        sourceId,
        lawId: lawInfo.lawId,
        lawName: lawInfo.lawName,
        articleNumber: articleNum,
        articleTitle: `${lawInfo.lawName} - ${articleTitle}`,
        content: textChunk,
        sourceFile: file,
        sourceUrl: lawInfo.sourceUrl
      });
    }
  }

  cachedChunks = chunks;
  return cachedChunks;
}
