import { useState, useMemo, useEffect } from 'react';
import { LEVELS, LEVEL_ORDER } from '../engine/LevelConfig';
import { isShamed } from '../engine/RageFXController';
import './Leaderboard.css';

function getScoreClass(score) {
  if (score >= 80) return 'great';
  if (score >= 50) return 'ok';
  return 'bad';
}

const RANK_EMOJI = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function Leaderboard({ onBack, username }) {
  const [filter, setFilter] = useState('all');
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const shamed = isShamed();

  useEffect(() => {
    fetch(`/api/leaderboard`)
      .then(r => r.json())
      .then(data => {
        // Normalise: server returns { username, level, best_score, best_time }
        setAllData(data.map(d => ({ username: d.username, level: d.level, score: d.best_score, time: d.best_time })));
      })
      .catch(() => {
        // Fallback to localStorage if server is down
        try {
          setAllData(JSON.parse(localStorage.getItem('skill_issue_leaderboard') || '[]'));
        } catch { setAllData([]); }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const base = filter === 'all' ? allData : allData.filter(e => e.level === filter);
    return base.slice(0, 20);
  }, [filter, allData]);

  // Find closest score above yours
  const myBestScore = allData
    .filter(e => e.username === username)
    .reduce((best, e) => Math.max(best, e.score), 0);

  const nextBetter = filtered.find(e => e.username !== username && e.score > myBestScore);
  const delta = nextBetter ? nextBetter.score - myBestScore : null;

  return (
    <div className="leaderboard-screen">
      <button id="lb-back-btn" className="btn btn-ghost leaderboard-back" onClick={onBack}>
        ← back
      </button>

      <div className="leaderboard-header">
        <h1 className="leaderboard-title">🏆 LEADERBOARD</h1>
        <p className="leaderboard-sub">// decimal precision · feel the robbery</p>
      </div>

      {/* Level filters */}
      <div className="leaderboard-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          ALL LEVELS
        </button>
        {LEVEL_ORDER.map(id => (
          <button
            key={id}
            className={`filter-btn ${filter === id ? 'active' : ''}`}
            onClick={() => setFilter(id)}
            style={{ '--level-color': LEVELS[id].color }}
          >
            {LEVELS[id].emoji} {LEVELS[id].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="leaderboard-empty">
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          loading scores...
        </div>
      ) : filtered.length === 0 ? (
        <div className="leaderboard-empty">
          <div style={{ fontSize: 32, marginBottom: 12 }}>💀</div>
          no scores yet.<br />be the first to suffer.
        </div>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>player</th>
              <th>level</th>
              <th style={{ textAlign: 'right' }}>time</th>
              <th style={{ textAlign: 'right' }}>accuracy</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry, i) => {
              const rank = i + 1;
              const isMe = entry.username === username;
              const entryShamed = shamed && entry.username === username;

              return (
                <tr
                  key={i}
                  className={`leaderboard-row ${rank <= 3 ? `top-${rank}` : ''} ${isMe ? 'is-me' : ''}`}
                >
                  <td>
                    <span className={`lb-rank lb-rank-${rank}`}>
                      {RANK_EMOJI[rank] || `#${rank}`}
                    </span>
                  </td>
                  <td>
                    <span className={`lb-username ${isMe ? 'lb-username-me' : ''}`}>
                      {entry.username}
                      {entryShamed && <span className="lb-cheat">🤡</span>}
                    </span>
                  </td>
                  <td>
                    <span className="lb-level">
                      {LEVELS[entry.level]?.emoji} {LEVELS[entry.level]?.label || entry.level}
                    </span>
                  </td>
                  <td>
                    <span className="lb-time">
                      {entry.time ? `${entry.time}s` : '--'}
                    </span>
                  </td>
                  <td>
                    <span className={`lb-score ${getScoreClass(entry.score)}`}>
                      {entry.score.toFixed(3)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* "Robbed" strip */}
      {username && myBestScore > 0 && delta !== null && (
        <div className="you-score-strip">
          <div>
            <div className="you-score-label">your best</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>
              {myBestScore.toFixed(3)}%
            </div>
          </div>
          <div>
            <div className={`you-score-delta ${delta < 2 ? 'robbed' : ''}`}>
              {delta < 2
                ? `😭 ${delta.toFixed(3)}% away from ${nextBetter.username}. you got robbed.`
                : `${delta.toFixed(1)}% behind the leader`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
