import { pipeline } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';

async function buildVectorDB() {
  console.log("Loading multilingual embedding model (this may take a few seconds)...");
  
  // Use a small, extremely fast multilingual model that is great for local Node environments
  const extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');

  const kbPath = path.join(process.cwd(), 'src/data/knowledge_base');
  const files = fs.readdirSync(kbPath).filter(f => f.endsWith('.txt'));
  
  let allChunks = [];

  console.log("Chunking documents...");
  for (const file of files) {
    const filePath = path.join(kbPath, file);
    const text = fs.readFileSync(filePath, 'utf-8');
    const sections = text.split(/\n\s*\n/);
    
    for (const section of sections) {
      if (section.trim().length > 20) {
        let chunkTitle = "";
        const firstLine = section.trim().split('\n')[0];
        if (firstLine.length < 70) {
          chunkTitle = firstLine;
        } else {
          const match = firstLine.match(/^([\d\.]+|Maddə \d+\.)/);
          if (match) {
            chunkTitle = match[0] + " bəndi";
          } else {
            chunkTitle = file.replace('.txt', '');
          }
        }
        allChunks.push({ content: section.trim(), source: file, title: chunkTitle });
      }
    }
  }

  console.log(`Extracted ${allChunks.length} chunks. Starting vector embeddings...`);
  console.log(`Note: Local embedding may take a few minutes on the CPU.`);

  // Array to hold final DB
  const vectorDB = [];
  
  let count = 0;
  for (const chunk of allChunks) {
    // Generate vector
    const output = await extractor(chunk.content, { pooling: 'mean', normalize: true });
    // Convert Float32Array to standard array so it can be JSON serialized
    const vector = Array.from(output.data);
    
    vectorDB.push({
      title: chunk.title,
      source: chunk.source,
      content: chunk.content,
      embedding: vector
    });

    count++;
    if (count % 100 === 0) {
      console.log(`Processed ${count} / ${allChunks.length} chunks...`);
    }
  }

  const dbPath = path.join(process.cwd(), 'src/data/vector_db.json');
  fs.writeFileSync(dbPath, JSON.stringify(vectorDB), 'utf-8');
  console.log(`\nSuccess! Created local Vector DB at ${dbPath}`);
}

buildVectorDB().catch(console.error);
