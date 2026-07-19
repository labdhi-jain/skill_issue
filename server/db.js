// server/db.js — Turso / libSQL database setup
import { createClient } from '@libsql/client';

export const db = createClient({
  url: process.env.TURSO_URL || 'file:skillissue.db',
  authToken: process.env.TURSO_TOKEN,
});

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
export async function insertScore(userId, level, score) {
  await db.execute({
    sql: 'INSERT INTO scores (user_id, level, score) VALUES (?, ?, ?)',
    args: [userId, level, score]
  });
}

export async function getLeaderboard() {
  const rs = await db.execute(`
    SELECT u.username, s.level, MAX(s.score) as best_score, COUNT(*) as attempts
    FROM scores s JOIN users u ON s.user_id = u.id
    GROUP BY u.id, s.level ORDER BY best_score DESC LIMIT 100
  `);
  return rs.rows;
}

export async function getUserScores(userId) {
  const rs = await db.execute({
    sql: 'SELECT level, MAX(score) as best_score, COUNT(*) as attempts FROM scores WHERE user_id = ? GROUP BY level ORDER BY best_score DESC',
    args: [userId]
  });
  return rs.rows;
}
