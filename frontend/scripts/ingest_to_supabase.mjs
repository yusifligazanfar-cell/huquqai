#!/usr/bin/env node
/**
 * Syncs all 56,983 legal documents and chunks from `data/eqanun_full.sqlite`
 * (and optional 384-dim embeddings from `data/eqanun_embeddings.sqlite`)
 * into Supabase PostgreSQL + pgvector + FTS.
 *
 * Usage:
 *   node frontend/scripts/ingest_to_supabase.mjs [--codes-only] [--limit 500] [--offset 0] [--skip-schema]
 */

import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { DatabaseSync } from "node:sqlite";

const require = createRequire(import.meta.url);
const pg = require("pg");

const ROOT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");
const SQLITE_PATH = process.env.EQANUN_SQLITE_PATH || path.join(ROOT_DIR, "data/eqanun_full.sqlite");
const EMB_SQLITE_PATH = process.env.EQANUN_EMB_SQLITE_PATH || path.join(ROOT_DIR, "data/eqanun_embeddings.sqlite");
const SCHEMA_PATH = path.join(FRONTEND_DIR, "src/lib/db/schema.sql");

function loadEnvFiles() {
  const files = [
    path.join(FRONTEND_DIR, ".env.local"),
    path.join(FRONTEND_DIR, ".env"),
    path.join(ROOT_DIR, ".env.local"),
    path.join(ROOT_DIR, ".env"),
  ];
  for (const fp of files) {
    if (!fs.existsSync(fp)) continue;
    const lines = fs.readFileSync(fp, "utf-8").split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const PRIORITY_CODES = [
  "897", "46940", "46941", "46942", "46943", "46944", "46945", "46946",
  "46947", "46948", "46950", "46951", "46952", "46953", "46955", "46956",
  "46957", "46958", "46959", "46960", "3423", "9479", "3933", "18343",
  "2937", "257",
];

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    codesOnly: args.includes("--codes-only"),
    skipSchema: args.includes("--skip-schema"),
    limit: 0,
    offset: 0,
    batchDocs: 200,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) opts.limit = Number(args[++i]) || 0;
    if (args[i] === "--offset" && args[i + 1]) opts.offset = Number(args[++i]) || 0;
    if (args[i] === "--batch-docs" && args[i + 1]) opts.batchDocs = Number(args[++i]) || 200;
  }
  return opts;
}

const AZ_MAP = {
  "İ": "i", "I": "i", "ı": "i",
  "Ə": "e", "ə": "e",
  "Ö": "o", "ö": "o",
  "Ü": "u", "ü": "u",
  "Ğ": "g", "ğ": "g",
  "Ş": "s", "ş": "s",
  "Ç": "c", "ç": "c",
};

function normAz(s) {
  if (!s) return "";
  let out = "";
  for (let i = 0; i < s.length; i++) out += AZ_MAP[s[i]] ?? s[i];
  return out.toLowerCase().replace(/\s+/g, " ").trim();
}

function blobToVectorLiteral(buf) {
  if (!buf) return null;
  const arr = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
  if (arr.length === 0) return null;
  return "[" + Array.from(arr, (x) => Number(x.toFixed(6))).join(",") + "]";
}

async function main() {
  loadEnvFiles();
  const opts = parseArgs();

  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL;

  if (!dbUrl) {
    console.error("XƏTA: DATABASE_URL tapılmadı.");
    console.error("frontend/.env.local faylına Supabase Transaction/Session Pooler URL əlavə edin:");
    console.error('  DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"');
    process.exit(1);
  }

  if (!fs.existsSync(SQLITE_PATH)) {
    console.error(`XƏTA: SQLite indeksi tapılmadı: ${SQLITE_PATH}`);
    console.error("Əvvəlcə çalışdırın: python3 scripts/build_full_rag_index.py");
    process.exit(1);
  }

  const sqlite = new DatabaseSync(SQLITE_PATH, { readOnly: true });
  let embSqlite = null;
  if (fs.existsSync(EMB_SQLITE_PATH)) {
    embSqlite = new DatabaseSync(EMB_SQLITE_PATH, { readOnly: true });
    console.log(`384-dim vektor bazası tapıldı: ${EMB_SQLITE_PATH}`);
  }

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("PostgreSQL (Supabase) bağlantısı uğurlu!");

  if (!opts.skipSchema && fs.existsSync(SCHEMA_PATH)) {
    console.log("Schema tətbiq edilir (schema.sql)...");
    const sql = fs.readFileSync(SCHEMA_PATH, "utf-8");
    await client.query(sql);
    console.log("Schema hazırdır!");
  }

  let docQuery = "SELECT * FROM documents";
  const queryParams = [];
  if (opts.codesOnly) {
    docQuery += ` WHERE document_id IN (${PRIORITY_CODES.map(() => "?").join(",")})`;
    queryParams.push(...PRIORITY_CODES);
  }
  docQuery += " ORDER BY priority_boost DESC, CAST(document_id AS INTEGER) ASC";
  if (opts.limit > 0) {
    docQuery += ` LIMIT ${opts.limit}`;
  }
  if (opts.offset > 0) {
    docQuery += ` OFFSET ${opts.offset}`;
  }

  const docs = sqlite.prepare(docQuery).all(...queryParams);
  console.log(`Supabase-ə köçürüləcək sənəd sayı: ${docs.length}`);

  const selectChunksStmt = sqlite.prepare(
    "SELECT id, chunk_index, article_number, article_title, content FROM chunks WHERE document_id = ? ORDER BY chunk_index ASC"
  );
  const selectEmbStmt = embSqlite
    ? embSqlite.prepare("SELECT embedding FROM chunk_embeddings WHERE chunk_id = ?")
    : null;

  let uploadedDocs = 0;
  let uploadedChunks = 0;

  for (let i = 0; i < docs.length; i += opts.batchDocs) {
    const batch = docs.slice(i, i + opts.batchDocs);
    await client.query("BEGIN");
    try {
      for (const d of batch) {
        const docId = String(d.document_id);
        await client.query(
          `INSERT INTO legal_documents (
            document_id, title, title_norm, source_url, doc_type, is_repealed,
            priority_boost, article_count, char_length, full_text_length, last_synced_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $9, NOW()
          )
          ON CONFLICT (document_id) DO UPDATE SET
            title = EXCLUDED.title,
            title_norm = EXCLUDED.title_norm,
            source_url = EXCLUDED.source_url,
            doc_type = EXCLUDED.doc_type,
            is_repealed = EXCLUDED.is_repealed,
            priority_boost = EXCLUDED.priority_boost,
            article_count = EXCLUDED.article_count,
            char_length = EXCLUDED.char_length,
            last_synced_at = NOW()`,
          [
            docId,
            String(d.title),
            String(d.title_norm || normAz(String(d.title))),
            String(d.source_url),
            String(d.doc_type || "qanun"),
            Boolean(d.is_repealed),
            Number(d.priority_boost || 0),
            Number(d.article_count || 0),
            Number(d.char_length || 0),
          ]
        );

        // Replace chunks cleanly per document to remain idempotent
        await client.query("DELETE FROM legal_chunks WHERE document_id = $1", [docId]);

        const chunks = selectChunksStmt.all(docId);
        // Bulk insert chunks in groups of 100
        for (let c = 0; c < chunks.length; c += 100) {
          const slice = chunks.slice(c, c + 100);
          const values = [];
          const placeholders = [];
          let pIdx = 1;

          for (const ch of slice) {
            const artNum = String(ch.article_number || "");
            const artTitle = String(ch.article_title || "");
            const content = String(ch.content || "");
            const contentNorm = normAz(`${d.title} ${artTitle} ${content}`);
            let vec384 = null;
            if (selectEmbStmt) {
              const eRow = selectEmbStmt.get(Number(ch.id));
              if (eRow?.embedding) vec384 = blobToVectorLiteral(eRow.embedding);
            }

            placeholders.push(
              `($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, to_tsvector('simple', $${pIdx++}), to_tsvector('simple', $${pIdx++}), $${pIdx++}::vector)`
            );
            values.push(
              docId,
              Number(ch.chunk_index),
              artNum,
              artTitle,
              content,
              contentNorm,
              String(d.source_url),
              `${d.title} ${artTitle} ${content}`,
              contentNorm,
              vec384
            );
          }

          await client.query(
            `INSERT INTO legal_chunks (
              document_id, chunk_index, article_number, article_title,
              content, content_norm, source_url, tsv, tsv_norm, embedding_384
            ) VALUES ${placeholders.join(", ")}`,
            values
          );
          uploadedChunks += slice.length;
        }
        uploadedDocs++;
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }

    if (uploadedDocs % 500 === 0 || i + opts.batchDocs >= docs.length) {
      console.log(`  [${uploadedDocs}/${docs.length}] sənəd, ${uploadedChunks} parça (chunk) sinxronlaşdırıldı`);
    }
  }

  sqlite.close();
  if (embSqlite) embSqlite.close();
  await client.end();
  console.log(`TAMAMLANDI! ${uploadedDocs} sənəd, ${uploadedChunks} chunk Supabase-ə yazıldı.`);
}

main().catch((err) => {
  console.error("Xəta:", err);
  process.exit(1);
});
