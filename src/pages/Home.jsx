import { useState, useEffect } from 'react';
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

export default function Home({ onPlay, onLeaderboard, username, onUsernameChange }) {
  const [inputVal, setInputVal] = useState(username || '');
  const [shamed] = useState(isShamed);
  const [shameCount] = useState(getShameCount);
  const [typerIdx, setTyperIdx] = useState(0);
  const [typed, setTyped] = useState('');

  const subtitleWords = "the text runs the second you focus on it. read it anyway. type it anyway. cry later.";

  // Typewriter effect for subtitle
  useEffect(() => {
    if (typerIdx < subtitleWords.length) {
      const t = setTimeout(() => {
        setTyped(subtitleWords.slice(0, typerIdx + 1));
        setTyperIdx(i => i + 1);
      }, 30 + Math.random() * 20);
      return () => clearTimeout(t);
    }
  }, [typerIdx]);

  function handlePlay() {
    if (!inputVal.trim()) return;
    onUsernameChange(inputVal.trim());
    onPlay();
  }

  function handleKey(e) {
    if (e.key === 'Enter') handlePlay();
  }

  return (
    <div className="home-screen">
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
            animation: typerIdx >= subtitleWords.length ? 'blink 1s infinite' : 'none',
          }} />
        </p>

        {/* Username + Play */}
        <div className="home-actions">
          <div className="home-username-form">
            <input
              id="username-input"
              className="home-username-input"
              type="text"
              placeholder="enter your username"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={handleKey}
              maxLength={20}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <button
            id="play-btn"
            className="btn btn-primary home-play-btn"
            onClick={handlePlay}
            disabled={!inputVal.trim()}
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
          GOT IT (I don't)
        </button>
      </dialog>
    </div>
  );
}
