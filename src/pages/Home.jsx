import { useState, useEffect, useRef } from 'react';
import { isShamed, getShameCount } from '../engine/RageFXController';
import './Home.css';

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  size: 4 + Math.random() * 20,
  left: Math.random() * 100,
  duration: 8 + Math.random() * 15,
  delay: Math.random() * 15,
  color: i % 3 === 0 ? '#FF2079' : i % 3 === 1 ? '#D4FF3D' : '#FF5A1F',
}));

const TAGLINES = [
  "the text runs the second you focus on it. read it anyway. type it anyway. cry later.",
  "your fingers are too slow. your brain is too slow. honestly? just give up.",
  "every round is a personal attack. we designed it that way. enjoy.",
  "this game does not care about your feelings. at all. zero.",
  "skill issue, but make it a lifestyle. welcome home.",
  "other typing games let you win. we are not other typing games.",
  "if you rage-quit, the game wins. if you don't, you still lose.",
  "the words are tiny because your patience is even smaller.",
];

// Neon cursor trail dot
function CursorTrail() {
  const dotsRef = useRef([]);
  const mouseRef = useRef({ x: -999, y: -999 });
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onMove(e) {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      const dot = document.createElement('div');
      dot.className = 'cursor-trail-dot';
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
      container.appendChild(dot);
      setTimeout(() => dot.remove(), 600);
    }

    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return <div ref={containerRef} className="cursor-trail-container" />;
}

export default function Home({ onPlay, onLeaderboard, username, onLogout }) {
  const [shamed] = useState(isShamed);
  const [shameCount] = useState(getShameCount);
  const [typerIdx, setTyperIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [tagline] = useState(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);

  // Typewriter effect for tagline
  useEffect(() => {
    if (typerIdx < tagline.length) {
      const t = setTimeout(() => {
        setTyped(tagline.slice(0, typerIdx + 1));
        setTyperIdx(i => i + 1);
      }, 28 + Math.random() * 18);
      return () => clearTimeout(t);
    }
  }, [typerIdx, tagline]);

  return (
    <div className="home-screen">
      <CursorTrail />

      {/* Floating particles */}
      <div className="home-particles">
        {PARTICLES.map(p => (
          <div
            key={p.id}
            className="particle"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.left}%`,
              background: p.color,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="home-content">
        {/* Tagline */}
        <p className="home-tagline">// a typing game with trust issues</p>

        {/* Giant glitch title */}
        <div className="home-title-wrap">
          <h1
            className="glitch-title"
            data-text="SKILL ISSUE"
            style={{ display: 'block' }}
          >
            SKILL
            <br />
            ISSUE
          </h1>
        </div>

        {/* Typewriter subtitle */}
        <p className="home-subtitle" style={{ marginTop: 24 }}>
          {typed}
          <span style={{
            display: 'inline-block',
            width: 2,
            height: '1em',
            background: 'var(--primary)',
            marginLeft: 2,
            verticalAlign: 'middle',
            animation: typerIdx >= tagline.length ? 'blink 1s infinite' : 'none',
          }} />
        </p>

        {/* Actions */}
        <div className="home-actions">
          {username && (
            <span className="home-username-display">👾 {username}</span>
          )}

          <button
            id="play-btn"
            className="btn btn-primary home-play-btn home-play-pulse"
            onClick={onPlay}
          >
            START SUFFERING →
          </button>

          <div className="home-secondary-actions">
            <button
              id="leaderboard-btn"
              className="btn btn-ghost"
              onClick={onLeaderboard}
            >
              🏆 leaderboard
            </button>
            <button
              id="how-to-btn"
              className="btn btn-ghost"
              onClick={() => document.getElementById('how-to-modal')?.showModal()}
            >
              ? how to play
            </button>
            {onLogout && (
              <button id="logout-btn" className="btn btn-ghost" onClick={onLogout}>
                🚪 log out
              </button>
            )}
          </div>

          {shamed && (
            <div className="shame-badge">
              🤡 CHEATER detected × {shameCount} — we see you
            </div>
          )}
        </div>
      </div>

      {/* How to play modal */}
      <dialog id="how-to-modal" style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        color: 'var(--text)',
        maxWidth: 480,
        width: '90vw',
        padding: 32,
        fontFamily: 'var(--font-ui)',
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--primary)', marginBottom: 16, fontSize: 24 }}>
          HOW TO PLAY
        </h2>
        <ol style={{ paddingLeft: 20, lineHeight: 2, color: 'var(--text-muted)' }}>
          <li>Tiny text appears somewhere on screen</li>
          <li><strong style={{ color: 'var(--accent)' }}>Read it</strong> — do NOT zoom in</li>
          <li>The moment you try to zoom, <strong style={{ color: 'var(--primary)' }}>it teleports</strong></li>
          <li>Type what you remember before the timer dies</li>
          <li>Partial credit = the actual rage engine</li>
          <li>3 rounds per level → brutal roast reveal</li>
        </ol>
        <p style={{ marginTop: 16, color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          tip: you cannot win. you can only lose less badly.
        </p>
        <button
          className="btn btn-primary"
          style={{ marginTop: 24, width: '100%' }}
          onClick={() => document.getElementById('how-to-modal')?.close()}
        >
          GOT IT (I didn't)
        </button>
      </dialog>
    </div>
  );
}
