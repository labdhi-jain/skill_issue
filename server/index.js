// server/index.js — Express backend for SKILL ISSUE
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  getUserByEmail, getUserByUsername, getUserById, createUser,
  insertOtp, getLatestOtp, markOtpUsed, deleteOldOtps,
  insertScore, getLeaderboard, getUserScores,
} from './db.js';
import { sendOtpEmail } from './mailer.js';

const app        = express();
const PORT       = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_production';

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
// Step 1 of sign-up: send OTP to verify the email is real
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !isValidEmail(email))
    return res.status(400).json({ error: 'Please enter a valid email address.' });

  const lowerEmail = email.toLowerCase().trim();

  // Don't let an existing user re-register
  if (getUserByEmail.get(lowerEmail))
    return res.status(409).json({ error: 'This email is already registered. Please sign in.' });

  const code      = generateOtp();
  const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 min

  deleteOldOtps.run(lowerEmail, Math.floor(Date.now() / 1000));
  insertOtp.run(lowerEmail, code, expiresAt);

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
// Step 2 of sign-up: verify the OTP (returns a short-lived verified token)
app.post('/api/auth/verify-otp', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code)
    return res.status(400).json({ error: 'Email and code are required.' });

  const lowerEmail = email.toLowerCase().trim();
  const now        = Math.floor(Date.now() / 1000);
  const otp        = getLatestOtp.get(lowerEmail);

  if (!otp)
    return res.status(400).json({ error: 'No code found. Please request a new one.' });
  if (otp.expires_at < now)
    return res.status(400).json({ error: 'Code expired. Please request a new one.' });
  if (otp.code !== String(code).trim())
    return res.status(400).json({ error: 'Wrong code. Try again.' });

  markOtpUsed.run(otp.id);

  // Issue a short-lived "email verified" token (5 min) — used to finalise registration
  const verifiedToken = jwt.sign({ emailVerified: lowerEmail }, JWT_SECRET, { expiresIn: '5m' });
  res.json({ success: true, verifiedToken });
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
// Step 3 of sign-up: set username + password, create account
app.post('/api/auth/register', async (req, res) => {
  const { verifiedToken, username, password } = req.body;

  if (!verifiedToken || !username || !password)
    return res.status(400).json({ error: 'All fields are required.' });
  if (username.trim().length < 2)
    return res.status(400).json({ error: 'Username must be at least 2 characters.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  // Validate the verified token
  let emailVerified;
  try {
    emailVerified = jwt.verify(verifiedToken, JWT_SECRET).emailVerified;
  } catch {
    return res.status(400).json({ error: 'Email verification expired. Please start over.' });
  }

  // Check username not taken
  if (getUserByUsername.get(username.trim()))
    return res.status(409).json({ error: 'Username already taken. Pick another.' });

  const passwordHash = await bcrypt.hash(password, 10);
  let user;
  try {
    user = createUser.get(emailVerified, username.trim(), passwordHash);
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
// Sign in with email (or username) + password
app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password)
    return res.status(400).json({ error: 'Email/username and password are required.' });

  const id   = identifier.trim().toLowerCase();
  const user = isValidEmail(id) ? getUserByEmail.get(id) : getUserByUsername.get(identifier.trim());

  if (!user)
    return res.status(401).json({ error: 'No account found with that email or username.' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match)
    return res.status(401).json({ error: 'Wrong password.' });

  const token = makeJwt(user.id);
  res.json({
    success: true,
    token,
    user: { id: user.id, email: user.email, username: user.username },
  });
});

// ── GET /api/me ───────────────────────────────────────────────────────────────
app.get('/api/me', authMiddleware, (req, res) => {
  const user = getUserById.get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, email: user.email, username: user.username });
});

// ── GET /api/leaderboard ──────────────────────────────────────────────────────
app.get('/api/leaderboard', (_req, res) => {
  res.json(getLeaderboard.all());
});

// ── POST /api/leaderboard ─────────────────────────────────────────────────────
app.post('/api/leaderboard', authMiddleware, (req, res) => {
  const { level, score } = req.body;
  if (!level || score === undefined)
    return res.status(400).json({ error: 'level and score required' });
  insertScore.run(req.userId, level, score);
  res.json({ success: true });
});

// ── GET /api/scores/me ────────────────────────────────────────────────────────
app.get('/api/scores/me', authMiddleware, (req, res) => {
  res.json(getUserScores.all(req.userId));
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`\n🎮 SKILL ISSUE server running on http://localhost:${PORT}\n`);
});
