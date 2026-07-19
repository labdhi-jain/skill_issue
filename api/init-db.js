import 'dotenv/config';
import { initDB } from './db.js';

console.log("Connecting to Turso to initialize tables...");

initDB().then(() => {
  console.log("✅ Successfully created all tables in your Turso database!");
  process.exit(0);
}).catch(err => {
  console.error("❌ Failed to initialize database:", err);
  process.exit(1);
});
