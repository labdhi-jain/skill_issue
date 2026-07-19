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
  const [displayScore, setDisplayScore] = useState(0); // animated counter

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

      // Animate score counter
      const start = Date.now();
      const duration = 1200;
      function tick() {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayScore(avgScore * eased);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);

      // Confetti for ≥80%
      if (avgScore >= 80) {
        const pieces = Array.from({ length: 50 }, (_, i) => ({
          id: i,
          left: Math.random() * 100,
          color: ['#FF2079', '#D4FF3D', '#FF5A1F', '#F0EBF8', '#7B61FF'][i % 5],
          duration: 2 + Math.random() * 2,
          delay: Math.random() * 1.2,
          rotation: Math.random() * 360,
          size: 6 + Math.random() * 8,
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
                width: p.size || 8,
                height: p.size || 8,
                borderRadius: p.id % 3 === 0 ? '50%' : p.id % 3 === 1 ? '2px' : '0%',
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
          {landed ? displayScore.toFixed(3) : '---'}%
        </div>
        <div className="slot-score-label">average accuracy</div>

        {/* Rage / success meter */}
        {landed && (
          <div className="rage-meter-wrap">
            <div
              className="rage-meter-bar"
              style={{
                width: `${Math.min(avgScore, 100)}%`,
                background: avgScore >= 80
                  ? 'linear-gradient(90deg, var(--accent-dark), var(--accent))'
                  : avgScore >= 50
                    ? 'linear-gradient(90deg, #b84000, var(--danger))'
                    : 'linear-gradient(90deg, #7a0020, var(--primary))',
              }}
            />
            <div className="rage-meter-labels">
              <span style={{ color: 'var(--primary)' }}>💀 PAIN</span>
              <span style={{ color: 'var(--accent)' }}>GLORY 🏆</span>
            </div>
          </div>
        )}

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

        {/* Show gate message when next level exists but wasn't unlocked */}
        {nextLevelId && !state.unlockedLevels.includes(nextLevelId) && landed && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: avgScore >= 50 ? 'var(--accent)' : 'var(--primary)',
            background: avgScore >= 50 ? 'rgba(212,255,61,0.08)' : 'rgba(255,32,121,0.08)',
            border: `1px solid ${avgScore >= 50 ? 'rgba(212,255,61,0.25)' : 'rgba(255,32,121,0.25)'}`,
            borderRadius: 12,
            padding: '10px 18px',
            letterSpacing: 1,
            marginTop: 4,
          }}>
            {avgScore >= 50
              ? `✅ ${LEVELS[nextLevelId].label} unlocked! go to All Levels to play it.`
              : `🔒 need 50%+ to unlock ${LEVELS[nextLevelId].label} — you got ${avgScore.toFixed(1)}%`}
          </div>
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
