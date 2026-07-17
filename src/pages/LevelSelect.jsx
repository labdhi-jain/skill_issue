import { LEVELS, LEVEL_ORDER } from '../engine/LevelConfig';
import './LevelSelect.css';

export default function LevelSelect({ onSelect, onBack, unlockedLevels, roundScores = {} }) {
  return (
    <div className="level-select-screen">
      <button id="level-back-btn" className="btn btn-ghost level-select-back" onClick={onBack}>
        ← back
      </button>

      <div className="level-select-header">
        <h1 className="level-select-title">CHOOSE YOUR DOOM</h1>
        <p className="level-select-sub">// select difficulty · complete rounds · unlock next tier</p>
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
              className={`level-card ${isLocked ? 'locked' : ''}`}
              style={{ '--level-color': level.color, animationDelay: `${idx * 0.08}s` }}
              onClick={() => !isLocked && onSelect(id)}
              role="button"
              tabIndex={isLocked ? -1 : 0}
              onKeyDown={e => e.key === 'Enter' && !isLocked && onSelect(id)}
            >
              <div className="level-card-top">
                <span className="level-emoji">{level.emoji}</span>
                <span className={`level-badge ${isLocked ? 'locked' : ''}`}>
                  {isLocked ? '🔒 locked' : bestScore ? `best: ${bestScore.toFixed(1)}%` : 'unlocked'}
                </span>
              </div>

              <div className="level-name">{level.label}</div>
              <div className="level-desc">{level.description}</div>

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
