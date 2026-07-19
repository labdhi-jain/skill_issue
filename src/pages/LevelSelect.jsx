import { useState } from 'react';
import { LEVELS, LEVEL_ORDER } from '../engine/LevelConfig';
import './LevelSelect.css';

const SASS = [
  "lol no 💀",
  "earn it first",
  "come back when you're better",
  "nice try though",
  "not yet, champ",
  "score 50%+ on the previous level",
  "the lock is real, unlike your skills",
];

export default function LevelSelect({ onSelect, onBack, unlockedLevels, roundScores = {} }) {
  const [shaking, setShaking] = useState(null);
  const [sassMsg, setSassMsg] = useState('');

  function handleLockedClick(id) {
    const msg = SASS[Math.floor(Math.random() * SASS.length)];
    setSassMsg(msg);
    setShaking(id);
    setTimeout(() => setShaking(null), 500);
  }

  return (
    <div className="level-select-screen">
      <button id="level-back-btn" className="btn btn-ghost level-select-back" onClick={onBack}>
        ← back
      </button>

      <div className="level-select-header">
        <h1 className="level-select-title">
          CHOOSE YOUR DOOM
        </h1>
        <p className="level-select-sub">// select difficulty · score 50%+ · unlock next tier</p>
      </div>

      <div className="level-grid">
        {LEVEL_ORDER.map((id, idx) => {
          const level = LEVELS[id];
          const isUnlocked = unlockedLevels.includes(id);
          const isLocked = !isUnlocked;
          const bestScore = roundScores[id];

          return (
            <div
              key={id}
              id={`level-card-${id}`}
              className={`level-card ${isLocked ? 'locked' : 'unlocked'} ${shaking === id ? 'level-card-shake' : ''}`}
              style={{ '--level-color': level.color, animationDelay: `${idx * 0.08}s` }}
              onClick={() => isLocked ? handleLockedClick(id) : onSelect(id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && (isLocked ? handleLockedClick(id) : onSelect(id))}
            >
              <div className="level-card-top">
                <span className="level-emoji">{level.emoji}</span>
                <span className={`level-badge ${isLocked ? 'locked' : ''}`}>
                  {isLocked
                    ? (shaking === id ? sassMsg : '🔒 locked')
                    : bestScore != null
                      ? `best: ${bestScore.toFixed(1)}%`
                      : 'unlocked'}
                </span>
              </div>

              <div className="level-name">{level.label}</div>
              <div className="level-desc">{level.description}</div>

              {/* Best score progress bar */}
              {!isLocked && (
                <div className="level-score-bar-wrap">
                  <div
                    className="level-score-bar"
                    style={{
                      width: `${Math.min(bestScore || 0, 100)}%`,
                      background: bestScore >= 80
                        ? 'var(--accent)'
                        : bestScore >= 50
                          ? 'var(--danger)'
                          : 'var(--primary)',
                    }}
                  />
                </div>
              )}

              <div className="level-stats">
                <div className="level-stat-item">
                  <span className="level-stat-val">{level.fontSize}px</span>
                  <span className="level-stat-key">font</span>
                </div>
                <div className="level-stat-item">
                  <span className="level-stat-val">{level.timeLimit}s</span>
                  <span className="level-stat-key">time</span>
                </div>
                <div className="level-stat-item">
                  <span className="level-stat-val">{level.wordCount}</span>
                  <span className="level-stat-key">words</span>
                </div>
              </div>

              {isLocked && (
                <div className="level-lock-overlay">🔒</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
