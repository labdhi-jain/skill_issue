// RageFXController.js — sounds, screen shake, taunts

// ─── Web Audio ───────────────────────────────────────────────────────────────
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(frequency, duration, type = 'sine', gain = 0.3) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio not available, silently fail
  }
}

/**
 * "Bonk" — dumb low thud on wrong answer
 */
export function playBonk() {
  playTone(80, 0.15, 'sawtooth', 0.4);
  setTimeout(() => playTone(60, 0.1, 'sawtooth', 0.3), 50);
}

/**
 * Smug jingle — near perfect, never full praise
 */
export function playSmugJingle() {
  const notes = [523, 659, 784, 659]; // C E G E — triumphant but cut short
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.15, 'triangle', 0.25), i * 120);
  });
  // Deliberate wrong ending note
  setTimeout(() => playTone(440, 0.2, 'sawtooth', 0.15), notes.length * 120);
}

/**
 * Teleport whoosh
 */
export function playTeleport() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {}
}

/**
 * Timer warning beep
 */
export function playTimerWarning() {
  playTone(880, 0.08, 'square', 0.1);
}

/**
 * Streak break — dramatic
 */
export function playStreakBreak() {
  const ctx = getAudioCtx();
  // Descending sad trombone-ish
  const notes = [392, 330, 294, 247];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.3, 'sawtooth', 0.3), i * 200);
  });
}

/**
 * Level complete
 */
export function playLevelComplete() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, 'triangle', 0.3), i * 100);
  });
}

// ─── DOM FX ──────────────────────────────────────────────────────────────────

/**
 * Shake a DOM element
 */
export function shakeElement(el, intensity = 'normal') {
  if (!el) return;
  const cls = intensity === 'big' ? 'screen-shake' : 'anim-shake';
  el.classList.remove(cls);
  void el.offsetWidth; // reflow
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 600);
}

/**
 * Flash the screen red
 */
export function flashScreen() {
  const overlay = document.getElementById('rage-overlay');
  if (!overlay) return;
  overlay.classList.remove('screen-flash');
  void overlay.offsetWidth;
  overlay.classList.add('screen-flash');
  setTimeout(() => overlay.classList.remove('screen-flash'), 500);
}

/**
 * Get mid-game floating taunt based on time left
 */
export const MID_GAME_TAUNTS = [
  "tick tock 🕐",
  "still looking?",
  "it moved again lol",
  "you had it. you had IT.",
  "maybe squint harder?",
  "blink and you'll miss it (you blinked)",
  "the text sees you panicking",
  "timer is NOT your friend",
  "reading is fundamental. apparently.",
  "maybe glasses would help",
  "zoom in. I dare you.",
  "it knows where you're looking",
  "the text is judging your eye movement",
  "have you considered giving up?",
];

export function getRandomMidGameTaunt() {
  return MID_GAME_TAUNTS[Math.floor(Math.random() * MID_GAME_TAUNTS.length)];
}

/**
 * Failure copy based on score delta
 */
export function getFailureCopy(percentage) {
  if (percentage === 0) return "zero. you typed literally nothing useful.";
  if (percentage < 30) return `${percentage}%? the audacity.`;
  if (percentage < 60) return `${percentage}%. close-ish. not really. no.`;
  if (percentage < 80) return `${percentage}%. so close it physically hurts.`;
  if (percentage < 90) return `${percentage}%... one word. ONE word off.`;
  return `${percentage}%. agonizing.`;
}

// ─── Cheat detection ─────────────────────────────────────────────────────────

const CHEAT_KEY = 'skill_issue_shame';

export function recordCheatAttempt(reason) {
  const existing = JSON.parse(localStorage.getItem(CHEAT_KEY) || '[]');
  existing.push({ reason, timestamp: Date.now() });
  localStorage.setItem(CHEAT_KEY, JSON.stringify(existing));
}

export function isShamed() {
  const data = JSON.parse(localStorage.getItem(CHEAT_KEY) || '[]');
  return data.length > 0;
}

export function getShameCount() {
  const data = JSON.parse(localStorage.getItem(CHEAT_KEY) || '[]');
  return data.length;
}
