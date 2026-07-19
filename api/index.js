// server/index.js — Express backend for SKILL ISSUE (Vercel Ready)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  initDB, getUserByEmail, getUserByUsername, getUserById, createUser,
  insertOtp, getLatestOtp, markOtpUsed, deleteOldOtps,
  insertScore, getLeaderboard, getUserScores,
} from './db.js';
import { sendOtpEmail } from './mailer.js';

const app        = express();
const PORT       = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_production';

// Vercel serverless functions handle CORS themselves via vercel.json usually, 
// but we keep this for local dev and specific origins.
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function makeJwt(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !isValidEmail(email))
    return res.status(400).json({ error: 'Please enter a valid email address.' });

  const lowerEmail = email.toLowerCase().trim();

  // Don't let an existing user re-register
  const existing = await getUserByEmail(lowerEmail);
  if (existing)
    return res.status(409).json({ error: 'This email is already registered. Please sign in.' });

  const code      = generateOtp();
  const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 min

  await deleteOldOtps(lowerEmail, Math.floor(Date.now() / 1000));
  await insertOtp(lowerEmail, code, expiresAt);

  try {
    await sendOtpEmail(lowerEmail, code);
  } catch (err) {
    console.error('Mail send failed:', err.message);
    return res.status(422).json({
      error: 'Could not deliver email. Check that your Gmail App Password is set in .env and that the address exists.',
    });
  }

  res.json({ success: true, message: 'Verification code sent!' });
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code)
    return res.status(400).json({ error: 'Email and code are required.' });

  const lowerEmail = email.toLowerCase().trim();
  const now        = Math.floor(Date.now() / 1000);
  
  const otp = await getLatestOtp(lowerEmail);

  if (!otp)
    return res.status(400).json({ error: 'No code found. Please request a new one.' });
  if (otp.expires_at < now)
    return res.status(400).json({ error: 'Code expired. Please request a new one.' });
  if (otp.code !== String(code).trim())
    return res.status(400).json({ error: 'Wrong code. Try again.' });

  await markOtpUsed(otp.id);

  const verifiedToken = jwt.sign({ emailVerified: lowerEmail }, JWT_SECRET, { expiresIn: '5m' });
  res.json({ success: true, verifiedToken });
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { verifiedToken, username, password } = req.body;

  if (!verifiedToken || !username || !password)
    return res.status(400).json({ error: 'All fields are required.' });
  if (username.trim().length < 2)
    return res.status(400).json({ error: 'Username must be at least 2 characters.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  let emailVerified;
  try {
    emailVerified = jwt.verify(verifiedToken, JWT_SECRET).emailVerified;
  } catch {
    return res.status(400).json({ error: 'Email verification expired. Please start over.' });
  }

  const existingName = await getUserByUsername(username.trim());
  if (existingName)
    return res.status(409).json({ error: 'Username already taken. Pick another.' });

  const passwordHash = await bcrypt.hash(password, 10);
  let user;
  try {
    user = await createUser(emailVerified, username.trim(), passwordHash);
  } catch {
    return res.status(409).json({ error: 'Email already registered.' });
  }

  const token = makeJwt(user.id);
  res.json({
    success: true,
    token,
    user: { id: user.id, email: user.email, username: user.username },
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password)
    return res.status(400).json({ error: 'Please provide email/username and password.' });

  const lowerIdent = identifier.toLowerCase().trim();
  
  let user = await getUserByEmail(lowerIdent);
  if (!user) user = await getUserByUsername(identifier.trim());

  if (!user)
    return res.status(401).json({ error: 'Invalid credentials.' });

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch)
    return res.status(401).json({ error: 'Invalid credentials.' });

  const token = makeJwt(user.id);
  res.json({
    success: true,
    token,
    user: { id: user.id, email: user.email, username: user.username },
  });
});

// ── GET /api/me ───────────────────────────────────────────────────────────────
app.get('/api/me', authMiddleware, async (req, res) => {
  const user = await getUserById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, email: user.email, username: user.username });
});

// ── POST /api/leaderboard ─────────────────────────────────────────────────────
app.post('/api/leaderboard', authMiddleware, async (req, res) => {
  const { level, score, time } = req.body;
  if (!level || typeof score !== 'number')
    return res.status(400).json({ error: 'Missing level or score.' });

  await insertScore(req.userId, level, score, time || 0);
  res.json({ success: true });
});

// ── GET /api/leaderboard ──────────────────────────────────────────────────────
app.get('/api/leaderboard', async (req, res) => {
  const rows = await getLeaderboard();
  res.json(rows);
});

// ── GET /api/scores/me ────────────────────────────────────────────────────────
app.get('/api/scores/me', authMiddleware, async (req, res) => {
  const scores = await getUserScores(req.userId);
  res.json(scores);
});

// ── STARTUP ───────────────────────────────────────────────────────────────────
// We only call app.listen if we are NOT running in a Vercel serverless environment
// Vercel serverless environments don't like app.listen()
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  initDB().then(() => {
    app.listen(PORT, () => {
      console.log(`\n🎮 SKILL ISSUE server running on http://localhost:${PORT}\n`);
    });
  }).catch(err => {
    console.error("Failed to init DB:", err);
  });
}

// Export for Vercel
export default app;
