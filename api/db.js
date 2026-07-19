// server/db.js — Turso / libSQL database setup
import { createClient } from '@libsql/client';

let db;
try {
  db = createClient({
    url: process.env.TURSO_URL || 'file:skillissue.db',
    authToken: process.env.TURSO_TOKEN,
  });
} catch (err) {
  console.error("CRITICAL ERROR: Failed to initialize Turso client at boot. Check your TURSO_URL and TURSO_TOKEN.", err);
  // Create a dummy db object so the app doesn't crash at top-level import
  db = {
    execute: () => { throw new Error("Database not connected. Check TURSO_URL and TURSO_TOKEN in Vercel Environment Variables.") },
    executeMultiple: () => { throw new Error("Database not connected.") }
  };
}

export { db };

// ── Schema Initialization ─────────────────────────────────────────────────────
export async function initDB() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT UNIQUE NOT NULL,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL DEFAULT '',
      created_at    INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS otp_codes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT NOT NULL,
      code       TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used       INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS scores (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id   INTEGER NOT NULL REFERENCES users(id),
      level     TEXT NOT NULL,
      score     REAL NOT NULL,
      time      REAL NOT NULL DEFAULT 0,
      timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `);

  try {
    await db.execute(`ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''`);
  } catch { /* column already exists, fine */ }

  try {
    await db.execute(`ALTER TABLE users ADD COLUMN username TEXT NOT NULL DEFAULT ''`);
  } catch { /* column already exists, fine */ }
}

// ── User queries ──────────────────────────────────────────────────────────────
export async function getUserByEmail(email) {
  const rs = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] });
  return rs.rows[0];
}

export async function getUserByUsername(username) {
  const rs = await db.execute({ sql: 'SELECT * FROM users WHERE username = ?', args: [username] });
  return rs.rows[0];
}

export async function getUserById(id) {
  const rs = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
  return rs.rows[0];
}

export async function createUser(email, username, passwordHash) {
  const rs = await db.execute({
    sql: 'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?) RETURNING *',
    args: [email, username, passwordHash]
  });
  return rs.rows[0];
}

// ── OTP queries ───────────────────────────────────────────────────────────────
export async function insertOtp(email, code, expiresAt) {
  await db.execute({
    sql: 'INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)',
    args: [email, code, expiresAt]
  });
}

export async function getLatestOtp(email) {
  const rs = await db.execute({
    sql: 'SELECT * FROM otp_codes WHERE email = ? AND used = 0 ORDER BY id DESC LIMIT 1',
    args: [email]
  });
  return rs.rows[0];
}

export async function markOtpUsed(id) {
  await db.execute({ sql: 'UPDATE otp_codes SET used = 1 WHERE id = ?', args: [id] });
}

export async function deleteOldOtps(email, nowTime) {
  await db.execute({
    sql: 'DELETE FROM otp_codes WHERE email = ? OR expires_at < ?',
    args: [email, nowTime]
  });
}

// ── Score queries ─────────────────────────────────────────────────────────────
export async function insertScore(userId, level, score, time) {
  await db.execute({
    sql: 'INSERT INTO scores (user_id, level, score, time) VALUES (?, ?, ?, ?)',
    args: [userId, level, score, time]
  });
}

export async function getLeaderboard() {
  const rs = await db.execute(`
    SELECT u.username, s.level, s.score as best_score, s.time as best_time, COUNT(*) over(partition by u.id, s.level) as attempts
    FROM scores s JOIN users u ON s.user_id = u.id
    WHERE s.id = (
        SELECT id FROM scores
        WHERE user_id = u.id AND level = s.level
        ORDER BY score DESC, time ASC
        LIMIT 1
    )
    ORDER BY best_score DESC, best_time ASC LIMIT 100
  `);
  return rs.rows;
}

export async function getUserScores(userId) {
  const rs = await db.execute({
    sql: `
      SELECT level, score as best_score, time as best_time, COUNT(*) over(partition by level) as attempts 
      FROM scores s
      WHERE user_id = ? AND id = (
          SELECT id FROM scores
          WHERE user_id = ? AND level = s.level
          ORDER BY score DESC, time ASC
          LIMIT 1
      )
      ORDER BY best_score DESC, best_time ASC
    `,
    args: [userId, userId]
  });
  return rs.rows;
}
