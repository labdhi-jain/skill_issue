import 'dotenv/config';
import { db } from './db.js';

async function migrate() {
  console.log("Connecting to Turso to alter scores table...");
  try {
    await db.execute(`ALTER TABLE scores ADD COLUMN time REAL NOT NULL DEFAULT 0`);
    console.log("✅ Successfully added 'time' column to scores table!");
  } catch (err) {
    if (err.message && err.message.includes("duplicate column name")) {
      console.log("✅ Column 'time' already exists in scores table.");
    } else {
      console.error("❌ Failed to alter table:", err);
      process.exit(1);
    }
  }
  process.exit(0);
}

migrate();
