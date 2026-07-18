import { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import Auth from './pages/Auth';
import Home from './pages/Home';
import LevelSelect from './pages/LevelSelect';
import Game from './pages/Game';
import Results from './pages/Results';
import Leaderboard from './pages/Leaderboard';
import './index.css';
import './App.css';

const API = 'http://localhost:3001';

export default function App() {
  const { state, actions } = useGameState();
  const [screen, setScreen]   = useState('auth'); // starts at auth
  const [user, setUser]       = useState(null);   // { id, email, username }
  const [bestScores, setBestScores] = useState({});

  // ── On mount: check for saved JWT ──────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('skill_issue_token');
    const saved = localStorage.getItem('skill_issue_user');
    if (token && saved) {
      try {
        // Quick verify with server
        fetch(`${API}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data) {
              setUser(data);
              setScreen('home');
            } else {
              // Token expired — clear and stay on auth
              localStorage.removeItem('skill_issue_token');
              localStorage.removeItem('skill_issue_user');
            }
          });
      } catch {
        setScreen('auth');
      }
    }
  }, []);

  // ── Auth complete ───────────────────────────────────────────────────────────
  function handleAuth(userData) {
    setUser(userData);
    actions.setUsername(userData.username);
    setScreen('home');
  }

  function handleLogout() {
    localStorage.removeItem('skill_issue_token');
    localStorage.removeItem('skill_issue_user');
    setUser(null);
    setScreen('auth');
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

  const gameOnLevelComplete = () => {
    if (state.currentLevelId && state.roundScores.length > 0) {
      const avg = state.roundScores.reduce((s, r) => s + r.percentage, 0) / state.roundScores.length;
      setBestScores(prev => ({
        ...prev,
        [state.currentLevelId]: Math.max(prev[state.currentLevelId] || 0, avg),
      }));

      // Save to server leaderboard
      const token = localStorage.getItem('skill_issue_token');
      if (token) {
        fetch(`${API}/api/leaderboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ level: state.currentLevelId, score: avg }),
        }).catch(() => {});
      }
    }
    setScreen('results');
  };

  return (
    <div className="app">
      {screen === 'auth' && (
        <Auth onAuth={handleAuth} />
      )}

      {screen === 'home' && (
        <Home
          onPlay={() => setScreen('levelSelect')}
          onLeaderboard={handleLeaderboard}
          username={user?.username || ''}
          onLogout={handleLogout}
        />
      )}

      {screen === 'levelSelect' && (
        <LevelSelect
          onSelect={handleSelectLevel}
          onBack={() => setScreen('home')}
          unlockedLevels={state.unlockedLevels}
          roundScores={bestScores}
        />
      )}

      {screen === 'game' && (
        <Game
          state={state}
          actions={actions}
          onLevelComplete={gameOnLevelComplete}
          onQuit={handleQuitGame}
        />
      )}

      {screen === 'results' && (
        <Results
          state={state}
          actions={actions}
          username={user?.username || ''}
          onPlayAgain={handlePlayAgain}
          onHome={() => setScreen('home')}
          onLeaderboard={handleLeaderboard}
          onNextLevel={handleSelectLevel}
        />
      )}

      {screen === 'leaderboard' && (
        <Leaderboard
          onBack={() => setScreen(user ? 'levelSelect' : 'home')}
          username={user?.username || ''}
        />
      )}
    </div>
  );
}
