import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameState } from './hooks/useGameState';
import { LEVEL_ORDER } from './engine/LevelConfig';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Home from './pages/Home';
import LevelSelect from './pages/LevelSelect';
import Game from './pages/Game';
import Results from './pages/Results';
import Leaderboard from './pages/Leaderboard';
import './index.css';
import './App.css';

const LEVEL_UNLOCK_GATE = 50;

export default function App() {
  const { state, actions } = useGameState();
  const actionsRef = useRef(actions); // stable ref — avoids infinite loop
  actionsRef.current = actions;
  const [screen, setScreen]   = useState('landing'); // unauthenticated entry point
  const [authTab, setAuthTab] = useState('signin'); // which tab Auth should open with
  const [user, setUser]       = useState(null);
  const [bestScores, setBestScores] = useState({});
  const [screenKey, setScreenKey] = useState(0);

  // ── Global button ripple ────────────────────────────────────────────────────
  useEffect(() => {
    function handleClick(e) {
      const btn = e.target.closest('.btn');
      if (!btn) return;
      const ripple = document.createElement('span');
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.className = 'ripple';
      ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px`;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const goTo = useCallback((s) => {
    setScreen(s);
    setScreenKey(k => k + 1);
  }, []);

  // ── Load progress from server ───────────────────────────────────────────────
  const loadUserProgress = useCallback(async (token) => {
    try {
      const res = await fetch(`/api/scores/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const scoresData = await res.json();

      const bests = {};
      scoresData.forEach(s => { bests[s.level] = s.best_score; });
      setBestScores(bests);

      const unlocked = [LEVEL_ORDER[0]];
      for (let i = 0; i < LEVEL_ORDER.length - 1; i++) {
        if ((bests[LEVEL_ORDER[i]] || 0) >= LEVEL_UNLOCK_GATE) {
          unlocked.push(LEVEL_ORDER[i + 1]);
        } else {
          break;
        }
      }
      actionsRef.current.setUnlockedLevels(unlocked); // use ref — no dep needed
    } catch (e) {
      console.error('Failed to load progress:', e);
    }
  }, []); // stable — actionsRef.current always has latest actions

  // ── On mount: check for saved JWT ──────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('skill_issue_token');
    const saved = localStorage.getItem('skill_issue_user');
    if (token && saved) {
      try {
        fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data) {
              setUser(data);
              actions.setUsername(data.username);
              setScreen('home');
              loadUserProgress(token); // ← restore progress
            } else {
              localStorage.removeItem('skill_issue_token');
              localStorage.removeItem('skill_issue_user');
            }
          });
      } catch {
        setScreen('landing');
      }
    }
  }, []); // stable — actionsRef.current always has latest actions

  // ── Auth complete ───────────────────────────────────────────────────────────
  function handleAuth(userData) {
    setUser(userData);
    actions.setUsername(userData.username);
    setScreen('home');
    const token = localStorage.getItem('skill_issue_token');
    if (token) loadUserProgress(token); // ← restore progress after login
  }

  function handleLogout() {
    localStorage.removeItem('skill_issue_token');
    localStorage.removeItem('skill_issue_user');
    setUser(null);
    setScreen('landing');
  }

  // ── Level flow ──────────────────────────────────────────────────────────────
  function handleSelectLevel(levelId) {
    actions.setUsername(user?.username || '');
    actions.startLevel(levelId);
    setScreen('game');
  }

  function handleQuitGame() {
    setScreen('levelSelect');
  }

  function handleLeaderboard() {
    setScreen('leaderboard');
  }

  function handlePlayAgain() {
    if (state.currentLevelId && state.roundScores.length > 0) {
      const avg = state.roundScores.reduce((s, r) => s + r.percentage, 0) / state.roundScores.length;
      setBestScores(prev => ({
        ...prev,
        [state.currentLevelId]: Math.max(prev[state.currentLevelId] || 0, avg),
      }));
    }
    setScreen('levelSelect');
  }

  const gameOnLevelComplete = async () => {
    if (state.currentLevelId && state.roundScores.length > 0) {
      const avg = state.roundScores.reduce((s, r) => s + r.percentage, 0) / state.roundScores.length;

      // Update local bestScores
      setBestScores(prev => ({
        ...prev,
        [state.currentLevelId]: Math.max(prev[state.currentLevelId] || 0, avg),
      }));

      // Save to server leaderboard
      const token = localStorage.getItem('skill_issue_token');
      if (token) {
        try {
          await fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ level: state.currentLevelId, score: avg }),
          });
          // Re-fetch progress from server so unlock state is always server-truth
          await loadUserProgress(token);
        } catch { /* offline — unlocks still computed locally below */ }
      }

      // Enforce 50% gate: only unlock next level if avg >= 50
      const currentIdx = LEVEL_ORDER.indexOf(state.currentLevelId);
      const nextId = LEVEL_ORDER[currentIdx + 1];
      if (nextId && avg >= 50 && !state.unlockedLevels.includes(nextId)) {
        actions.setUnlockedLevels([...state.unlockedLevels, nextId]);
      }
    }
    setScreen('results');
  };

  return (
    <div className="app">
      {screen === 'landing' && (
        <div key={`landing-${screenKey}`} className="screen-enter">
          <Landing 
            onSignIn={() => { setAuthTab('signin'); goTo('auth'); }}
            onSignUp={() => { setAuthTab('signup'); goTo('auth'); }}
          />
        </div>
      )}

      {screen === 'auth' && (
        <div key={`auth-${screenKey}`} className="screen-enter">
          <Auth 
            onAuth={handleAuth} 
            initialTab={authTab} 
            onBack={() => goTo('landing')} 
          />
        </div>
      )}

      {screen === 'home' && (
        <div key={`home-${screenKey}`} className="screen-enter">
          <Home
            onPlay={() => goTo('levelSelect')}
            onLeaderboard={handleLeaderboard}
            username={user?.username || ''}
            onLogout={handleLogout}
          />
        </div>
      )}

      {screen === 'levelSelect' && (
        <div key={`ls-${screenKey}`} className="screen-enter">
          <LevelSelect
            onSelect={handleSelectLevel}
            onBack={() => goTo('home')}
            unlockedLevels={state.unlockedLevels}
            roundScores={bestScores}
          />
        </div>
      )}

      {screen === 'game' && (
        <div key={`game-${screenKey}`} className="screen-enter">
          <Game
            state={state}
            actions={actions}
            onLevelComplete={gameOnLevelComplete}
            onQuit={handleQuitGame}
          />
        </div>
      )}

      {screen === 'results' && (
        <div key={`results-${screenKey}`} className="screen-enter">
          <Results
            state={state}
            actions={actions}
            username={user?.username || ''}
            onPlayAgain={handlePlayAgain}
            onHome={() => goTo('home')}
            onLeaderboard={handleLeaderboard}
            onNextLevel={handleSelectLevel}
          />
        </div>
      )}

      {screen === 'leaderboard' && (
        <div key={`lb-${screenKey}`} className="screen-enter">
          <Leaderboard
            onBack={() => goTo(user ? 'levelSelect' : 'home')}
            username={user?.username || ''}
          />
        </div>
      )}
    </div>
  );
}
