import { useState, useEffect, useRef } from 'react';
import { LEVELS, LEVEL_ORDER } from '../engine/LevelConfig';
import { getRoastTier, getRandomRoast, ROASTS } from '../engine/ScoringEngine';
import { playLevelComplete, playBonk, playStreakBreak } from '../engine/RageFXController';
import './Results.css';

const SPIN_DURATION = 2800; // ms
const SPIN_INTERVAL = 80;   // ms per slot change

function getAllRoasts() {
  return Object.values(ROASTS).flat();
}

export default function Results({ state, actions, username, onPlayAgain, onHome, onLeaderboard, onNextLevel }) {
  const { currentLevelId, roundScores, totalScore, streakCount } = state;
  const level = LEVELS[currentLevelId];
  const currentIdx = LEVEL_ORDER.indexOf(currentLevelId);
  const nextLevelId = LEVEL_ORDER[currentIdx + 1];

  const avgScore = roundScores.length > 0
    ? roundScores.reduce((s, r) => s + r.percentage, 0) / roundScores.length
    : 0;

  const tier = getRoastTier(avgScore);
  const finalRoast = getRandomRoast(tier);

  const [slotText, setSlotText] = useState('...');
  const [spinning, setSpinning] = useState(true);
  const [landed, setLanded] = useState(false);
  const [scoreColor, setScoreColor] = useState('var(--text)');
  const [rgbGlitch, setRgbGlitch] = useState(false);
  const [confetti, setConfetti] = useState([]);

  const allRoasts = useRef(getAllRoasts());
  const spinRef = useRef(null);

  // ── Slot machine spin ─────────────────────────────────────────────────────
  useEffect(() => {
    // Play appropriate sound
    if (avgScore >= 75) {
      playLevelComplete();
    } else if (avgScore < 40) {
      playBonk();
    } else {
      playStreakBreak();
    }

    // Start color flash based on score
    const scoreColorInterval = setInterval(() => {
      setScoreColor(c =>
        c === 'var(--text)'
          ? avgScore >= 75 ? 'var(--accent)' : 'var(--primary)'
          : 'var(--text)'
      );
    }, 100);

    // Slot spin
    let frame = 0;
    spinRef.current = setInterval(() => {
      const idx = frame % allRoasts.current.length;
      setSlotText(allRoasts.current[idx]);
      frame++;
    }, SPIN_INTERVAL);

    // RGB glitch during spin
    setRgbGlitch(true);

    // Land
    const landTimer = setTimeout(() => {
      clearInterval(spinRef.current);
      clearInterval(scoreColorInterval);
      setSpinning(false);
      setLanded(true);
      setRgbGlitch(false);
      setSlotText(finalRoast);

      const finalColor = avgScore >= 80 ? 'var(--accent)' : avgScore >= 50 ? 'var(--danger)' : 'var(--primary)';
      setScoreColor(finalColor);

      // Confetti for near-perfect
      if (avgScore >= 88) {
        const pieces = Array.from({ length: 40 }, (_, i) => ({
          id: i,
          left: Math.random() * 100,
          color: ['#FF2079', '#D4FF3D', '#FF5A1F', '#F0EBF8'][i % 4],
          duration: 2 + Math.random() * 2,
          delay: Math.random() * 1,
          rotation: Math.random() * 360,
        }));
        setConfetti(pieces);
      }

      // Save to leaderboard
      saveToLeaderboard(username, avgScore, currentLevelId);
    }, SPIN_DURATION);

    return () => {
      clearInterval(spinRef.current);
      clearInterval(scoreColorInterval);
      clearTimeout(landTimer);
    };
  }, []); // eslint-disable-line

  function saveToLeaderboard(name, score, levelId) {
    if (!name) return;
    try {
      const key = 'skill_issue_leaderboard';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push({
        username: name,
        score: Math.round(score * 1000) / 1000,
        level: levelId,
        timestamp: Date.now(),
      });
      existing.sort((a, b) => b.score - a.score);
      localStorage.setItem(key, JSON.stringify(existing.slice(0, 100)));
    } catch (e) {
      // localStorage may be blocked
    }
  }

  function getScoreStyle(pct) {
    if (pct >= 80) return { color: 'var(--accent)' };
    if (pct >= 60) return { color: 'var(--danger)' };
    return { color: 'var(--primary)' };
  }

  return (
    <div className="results-screen">
      {/* Confetti */}
      {confetti.length > 0 && (
        <div className="results-confetti">
          {confetti.map(p => (
            <div
              key={p.id}
              className="confetti-piece"
              style={{
                left: `${p.left}%`,
                background: p.color,
                borderRadius: p.id % 2 === 0 ? '50%' : '2px',
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                transform: `rotate(${p.rotation}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="results-level-badge">
        {level.emoji} {level.label} — level complete
      </div>

      <h1 className="results-title" style={{ color: scoreColor, transition: 'color 0.2s' }}>
        {spinning ? 'VERDICT LOADING...' : avgScore >= 80 ? 'RESPECTABLE (barely)' : avgScore >= 50 ? 'HONESTLY? MID.' : 'SKILL ISSUE.'}
      </h1>

      {/* Slot machine */}
      <div className="slot-machine">
        <div className="slot-score" style={{ color: scoreColor }}>
          {avgScore.toFixed(3)}%
        </div>
        <div className="slot-score-label">average accuracy</div>

        <div className="slot-reel">
          <div className={`slot-reel-text ${spinning ? 'spinning' : ''} ${landed ? 'landed' : ''} ${rgbGlitch ? 'slot-rgb-glitch' : ''}`}>
            {slotText}
          </div>
        </div>

        {/* Round breakdown */}
        <div className="round-breakdown">
          {roundScores.map((rs, i) => (
            <div key={i} className="round-breakdown-item">
              <span className="round-breakdown-pct" style={getScoreStyle(rs.percentage)}>
                {rs.percentage.toFixed(1)}%
              </span>
              <span className="round-breakdown-label">round {i + 1}</span>
            </div>
          ))}
        </div>

        {/* Streak */}
        {streakCount > 0 && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--accent)',
            background: 'rgba(212, 255, 61, 0.08)',
            border: '1px solid rgba(212, 255, 61, 0.2)',
            borderRadius: 20,
            padding: '6px 16px',
            display: 'inline-block',
            marginBottom: 8,
          }}>
            🔥 {streakCount}-streak maintained
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="results-actions">
        <button
          id="retry-btn"
          className="btn btn-primary"
          onClick={() => onNextLevel(currentLevelId)}
        >
          RETRY {level.label}
        </button>

        {nextLevelId && state.unlockedLevels.includes(nextLevelId) && (
          <button
            id="next-level-btn"
            className="btn btn-accent"
            onClick={() => onNextLevel(nextLevelId)}
          >
            {LEVELS[nextLevelId].emoji} NEXT: {LEVELS[nextLevelId].label} →
          </button>
        )}

        <button
          id="levels-btn"
          className="btn btn-ghost"
          onClick={onPlayAgain}
        >
          ALL LEVELS
        </button>

        <button
          id="leaderboard-from-results-btn"
          className="btn btn-ghost"
          onClick={onLeaderboard}
        >
          🏆 LEADERBOARD
        </button>
      </div>

      <div style={{
        marginTop: 24,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--text-dim)',
        letterSpacing: 2,
      }}>
        {username && `${username} · `}total score: {totalScore.toFixed(1)}pts
      </div>
    </div>
  );
}
