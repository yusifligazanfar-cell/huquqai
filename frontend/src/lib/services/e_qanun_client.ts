import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface EQanunDocResponse {
  data?: string[];
  doc_name?: string;
  percentages?: any;
  index?: number;
}

export class EQanunClient {
  private baseUrl = "https://api.e-qanun.ai/api/v2/enlarge/documents";

  async getDocument(documentId: number | string): Promise<{
    document_id: number | string;
    api_status: number;
    title: string;
    raw_html?: string;
    text: string;
    source: string;
    source_url: string;
  }> {
    const docIdStr = String(documentId);
    const sourceUrl = `https://www.e-qanun.ai/results/${docIdStr}`;

    // 1. First Attempt: Call Python Fetch Bridge (Native TLS & urllib passes Cloudflare)
    try {
      const scriptPath = path.join(process.cwd(), 'src/lib/services/fetch_doc_py.py');
      if (fs.existsSync(scriptPath)) {
        const { stdout } = await execFileAsync('python3', [scriptPath, docIdStr], { timeout: 12000 });
        if (stdout && stdout.trim()) {
          const res = JSON.parse(stdout);
          if (res.api_status === 200 && res.html) {
            return {
              document_id: documentId,
              api_status: 200,
              title: res.title || `e-Qanun Sənədi № ${docIdStr}`,
              raw_html: res.html,
              text: res.html,
              source: "api.e-qanun.ai (LIVE PYTHON BRIDGE)",
              source_url: sourceUrl
            };
          }
        }
      }
    } catch (e: any) {
      // Python bridge not available (e.g. serverless without python runtime) or timed out
    }

    // 2. Second Attempt: Direct Node Fetch
    try {
      const url = `${this.baseUrl}?index=0&semantic_weight=1&document_id=${docIdStr}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Referer": "https://www.e-qanun.ai/"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const json: EQanunDocResponse = await resp.json();
        if (json.data && json.data.length > 0) {
          const rawHtml = json.data[0];
          return {
            document_id: documentId,
            api_status: resp.status,
            title: json.doc_name || `e-Qanun Sənədi № ${docIdStr}`,
            raw_html: rawHtml,
            text: rawHtml,
            source: "api.e-qanun.ai (LIVE API)",
            source_url: sourceUrl
          };
        }
      }
    } catch (e: any) {
      // Node fetch failed
    }

    // 3. Third Attempt: Ingested Full Corpus (56,982 indexed documents)
    try {
      const catalogPath = path.join(process.cwd(), 'src/data/eqanun_catalog.json');
      if (fs.existsSync(catalogPath)) {
        const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
        const entry = Array.isArray(catalog) ? catalog.find((c: any) => String(c.id) === docIdStr) : catalog[docIdStr];
        if (entry && entry.file) {
          const corpusDir = path.resolve(process.cwd(), '../data/full_eqanun_corpus');
          const filePath = path.join(corpusDir, entry.file);
          if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            return {
              document_id: documentId,
              api_status: 200,
              title: entry.title || `e-Qanun Sənədi № ${docIdStr}`,
              text: fileContent,
              source: `e-qanun ingested corpus (${entry.file})`,
              source_url: sourceUrl
            };
          }
        }
      }
    } catch (e) {
      // ignore
    }

    return {
      document_id: documentId,
      api_status: 404,
      title: `e-Qanun Sənədi № ${docIdStr}`,
      text: "",
      source: "not_found",
      source_url: sourceUrl
    };
  }
}

export const eqanunClient = new EQanunClient();
