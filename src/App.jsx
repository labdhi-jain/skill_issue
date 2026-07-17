import { useState } from 'react';
import { useGameState } from './hooks/useGameState';
import Home from './pages/Home';
import LevelSelect from './pages/LevelSelect';
import Game from './pages/Game';
import Results from './pages/Results';
import Leaderboard from './pages/Leaderboard';
import './index.css';
import './App.css';

export default function App() {
  const { state, actions } = useGameState();
  const [screen, setScreen] = useState('home');
  const [username, setUsername] = useState('');
  const [bestScores, setBestScores] = useState({});

  function handlePlayFromHome() {
    setScreen('levelSelect');
  }

  function handleSelectLevel(levelId) {
    // Sync username into game state so Results can read it
    actions.setUsername(username);
    actions.startLevel(levelId);
    setScreen('game');
  }

  function handleQuitGame() {
    setScreen('levelSelect');
  }

  function handleLeaderboard() {
    setScreen('leaderboard');
  }

  function handleBack() {
    setScreen(username ? 'levelSelect' : 'home');
  }

  // Called from Results when user clicks "ALL LEVELS" or "RETRY"
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

  // Called from Game when user clicks "SEE VERDICT →" after round 3
  // actions.levelComplete() is already called inside Game's handleContinue
  const gameOnLevelComplete = () => {
    // Update best scores
    if (state.currentLevelId && state.roundScores.length > 0) {
      const avg = state.roundScores.reduce((s, r) => s + r.percentage, 0) / state.roundScores.length;
      setBestScores(prev => ({
        ...prev,
        [state.currentLevelId]: Math.max(prev[state.currentLevelId] || 0, avg),
      }));
    }
    setScreen('results');
  };

  return (
    <div className="app">
      {screen === 'home' && (
        <Home
          onPlay={handlePlayFromHome}
          onLeaderboard={handleLeaderboard}
          username={username}
          onUsernameChange={setUsername}
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
          username={username}
          onPlayAgain={handlePlayAgain}
          onHome={() => setScreen('home')}
          onLeaderboard={handleLeaderboard}
          onNextLevel={handleSelectLevel}
        />
      )}

      {screen === 'leaderboard' && (
        <Leaderboard
          onBack={handleBack}
          username={username}
        />
      )}
    </div>
  );
}
