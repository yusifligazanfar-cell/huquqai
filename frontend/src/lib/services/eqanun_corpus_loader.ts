import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const shardCache = new Map<number, Record<string, string>>();

export function getDocumentTextFromCorpus(documentId: string | number): string | null {
  try {
    const docIdStr = String(documentId).trim();
    const docIdNum = parseInt(docIdStr, 10);
    if (isNaN(docIdNum)) return null;

    const pid = ((docIdNum % 10) + 10) % 10;

    let shardData = shardCache.get(pid);
    if (!shardData) {
      const shardPath = path.join(process.cwd(), 'src/data/eqanun_shards', `shard_${pid}.json.gz`);
      if (fs.existsSync(shardPath)) {
        const compressedBuf = fs.readFileSync(shardPath);
        const decompressed = zlib.gunzipSync(compressedBuf).toString('utf-8');
        shardData = JSON.parse(decompressed);
        if (shardData) {
          shardCache.set(pid, shardData);
        }
      }
    }

    if (shardData && shardData[docIdStr]) {
      return shardData[docIdStr];
    }
  } catch (e) {
    console.error(`Error reading document ${documentId} from eqanun shards:`, e);
  }

  return null;
}
