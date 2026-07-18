// server/db.js — SQLite database setup
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'skillissue.db'));

db.pragma('journal_mode = WAL');

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
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

// ── Migration: add password_hash if upgrading from old schema ─────────────────
try {
  db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''`);
} catch { /* column already exists, fine */ }

try {
  db.exec(`ALTER TABLE users ADD COLUMN username TEXT NOT NULL DEFAULT ''`);
} catch { /* column already exists, fine */ }


// ── User queries ──────────────────────────────────────────────────────────────
export const getUserByEmail    = db.prepare('SELECT * FROM users WHERE email = ?');
export const getUserByUsername = db.prepare('SELECT * FROM users WHERE username = ?');
export const getUserById       = db.prepare('SELECT * FROM users WHERE id = ?');
export const createUser        = db.prepare(
  'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?) RETURNING *'
);

// ── OTP queries ───────────────────────────────────────────────────────────────
export const insertOtp    = db.prepare('INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)');
export const getLatestOtp = db.prepare('SELECT * FROM otp_codes WHERE email = ? AND used = 0 ORDER BY id DESC LIMIT 1');
export const markOtpUsed  = db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?');
export const deleteOldOtps = db.prepare('DELETE FROM otp_codes WHERE email = ? OR expires_at < ?');

// ── Score queries ─────────────────────────────────────────────────────────────
export const insertScore    = db.prepare('INSERT INTO scores (user_id, level, score) VALUES (?, ?, ?)');
export const getLeaderboard = db.prepare(`
  SELECT u.username, s.level, MAX(s.score) as best_score, COUNT(*) as attempts
  FROM scores s JOIN users u ON s.user_id = u.id
  GROUP BY u.id, s.level ORDER BY best_score DESC LIMIT 100
`);
export const getUserScores = db.prepare(`
  SELECT level, MAX(score) as best_score, COUNT(*) as attempts
  FROM scores WHERE user_id = ? GROUP BY level ORDER BY best_score DESC
`);

export default db;
