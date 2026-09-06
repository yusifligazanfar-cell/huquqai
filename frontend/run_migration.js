const { Client } = require('pg');
const fs = require('fs');

async function migrate() {
  const client = new Client({
    connectionString: "postgresql://postgres:dygduj-4dafZi-ganfac@db.gfgsadxwkqgfydkncald.supabase.co:5432/postgres"
  });

  try {
    await client.connect();
    console.log("Connected to database");

    const sql = fs.readFileSync("/Users/gazanfaryusifli/.gemini/antigravity/brain/dd3190e8-93c0-4db3-9624-9c6b6cf3cba1/court_decisions_migration.sql", "utf8");
    
    await client.query(sql);
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

migrate();
