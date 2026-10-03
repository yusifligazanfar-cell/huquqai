import fs from 'fs';
import path from 'path';
import { eqanunClient } from '../services/e_qanun_client';
import { parseLegalHtml, ParsedLegalDoc } from './parser';

export interface IngestionProgress {
  totalDocs: number;
  processedDocs: number;
  successfulDocs: number;
  failedDocs: number;
  currentDocumentId: number;
  isPaused: boolean;
  lastUpdated: string;
}

const CHECKPOINT_FILE = path.join(process.cwd(), 'src/data/ingestion_checkpoint.json');

export class IngestionWorker {
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  loadCheckpoint(): IngestionProgress {
    try {
      if (fs.existsSync(CHECKPOINT_FILE)) {
        return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
      }
    } catch (e) {
      // ignore
    }
    return {
      totalDocs: 60019,
      processedDocs: 0,
      successfulDocs: 0,
      failedDocs: 0,
      currentDocumentId: 1,
      isPaused: false,
      lastUpdated: new Date().toISOString()
    };
  }

  saveCheckpoint(progress: IngestionProgress) {
    try {
      const dir = path.dirname(CHECKPOINT_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(progress, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save checkpoint:', e);
    }
  }

  async processDocument(docId: number): Promise<ParsedLegalDoc | null> {
    try {
      const res = await eqanunClient.getDocument(docId);
      if (res.api_status === 200 && (res.raw_html || res.text)) {
        const raw = res.raw_html || res.text;
        return parseLegalHtml(String(docId), raw, res.title);
      }
    } catch (e) {
      console.error(`Error processing document ${docId}:`, e);
    }
    return null;
  }

  async runBatch(startId: number, batchSize: number = 20): Promise<{ processed: number; succeeded: number }> {
    let succeeded = 0;
    let processed = 0;

    for (let i = 0; i < batchSize; i++) {
      const docId = startId + i;
      if (docId > 60019) break;

      const parsed = await this.processDocument(docId);
      processed++;
      if (parsed && parsed.articles.length > 0) {
        succeeded++;
      }
    }

    const progress = this.loadCheckpoint();
    progress.processedDocs += processed;
    progress.successfulDocs += succeeded;
    progress.failedDocs += (processed - succeeded);
    progress.currentDocumentId = startId + processed;
    progress.lastUpdated = new Date().toISOString();
    this.saveCheckpoint(progress);

    return { processed, succeeded };
  }

  getStatus(): IngestionProgress {
    return this.loadCheckpoint();
  }
}

export const ingestionWorker = new IngestionWorker();
