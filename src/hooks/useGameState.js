// useGameState.js — central game state + dispatch

import { useReducer, useCallback } from 'react';
import { LEVELS, LEVEL_ORDER, getRandomText } from '../engine/LevelConfig';

// ─── State shape ─────────────────────────────────────────────────────────────
const initialState = {
  screen: 'home', // 'home' | 'levelSelect' | 'game' | 'result' | 'leaderboard'
  currentLevelId: 'npc',
  round: 1, // 1, 2, or 3
  roundsPerLevel: 3,
  phase: 'idle', // 'idle' | 'reading' | 'typing' | 'scored' | 'between_rounds'
  targetText: '',
  typedText: '',
  timeLeft: 20,
  score: null,           // current round score result
  roundScores: [],       // array of round score results for current level
  totalScore: 0,         // cumulative across levels
  streakCount: 0,
  teleportCount: 0,
  username: '',
  unlockedLevels: ['npc'],
};

// ─── Reducer ─────────────────────────────────────────────────────────────────
function gameReducer(state, action) {
  switch (action.type) {

    case 'SET_SCREEN':
      return { ...state, screen: action.screen };

    case 'SET_USERNAME':
      return { ...state, username: action.username };

    case 'START_LEVEL': {
      const levelId = action.levelId;
      const level = LEVELS[levelId];
      const text = getRandomText(levelId);
      return {
        ...state,
        currentLevelId: levelId,
        round: 1,
        roundScores: [],
        phase: 'reading',
        screen: 'game',
        targetText: text,
        typedText: '',
        timeLeft: level.timeLimit,
        score: null,
        teleportCount: 0,
      };
    }

    case 'NEXT_ROUND': {
      const level = LEVELS[state.currentLevelId];
      const text = getRandomText(state.currentLevelId);
      return {
        ...state,
        round: state.round + 1,
        phase: 'reading',
        targetText: text,
        typedText: '',
        timeLeft: level.timeLimit,
        score: null,
        teleportCount: 0,
      };
    }

    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    case 'SET_TIME':
      return { ...state, timeLeft: action.timeLeft };

    case 'SET_TYPED':
      return { ...state, typedText: action.text };

    case 'SUBMIT_ROUND': {
      const newRoundScores = [...state.roundScores, action.score];
      const newStreak = action.score.percentage >= 80
        ? state.streakCount + 1
        : 0;
      return {
        ...state,
        phase: 'scored',
        score: action.score,
        roundScores: newRoundScores,
        streakCount: newStreak,
      };
    }

    case 'INCREMENT_TELEPORT':
      return { ...state, teleportCount: state.teleportCount + 1 };

    case 'LEVEL_COMPLETE': {
      // Unlock next level
      const currentIdx = LEVEL_ORDER.indexOf(state.currentLevelId);
      const nextLevelId = LEVEL_ORDER[currentIdx + 1];
      const newUnlocked = nextLevelId && !state.unlockedLevels.includes(nextLevelId)
        ? [...state.unlockedLevels, nextLevelId]
        : state.unlockedLevels;

      const levelAvg = state.roundScores.reduce((sum, r) => sum + r.percentage, 0) / state.roundScores.length;
      const newTotal = state.totalScore + levelAvg;

      return {
        ...state,
        screen: 'result',
        phase: 'idle',
        unlockedLevels: newUnlocked,
        totalScore: newTotal,
      };
    }

    case 'RESET_GAME':
      return { ...initialState, username: state.username, unlockedLevels: state.unlockedLevels };

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const actions = {
    setScreen: useCallback((screen) => dispatch({ type: 'SET_SCREEN', screen }), []),
    setUsername: useCallback((username) => dispatch({ type: 'SET_USERNAME', username }), []),
    startLevel: useCallback((levelId) => dispatch({ type: 'START_LEVEL', levelId }), []),
    nextRound: useCallback(() => dispatch({ type: 'NEXT_ROUND' }), []),
    setPhase: useCallback((phase) => dispatch({ type: 'SET_PHASE', phase }), []),
    setTime: useCallback((timeLeft) => dispatch({ type: 'SET_TIME', timeLeft }), []),
    setTyped: useCallback((text) => dispatch({ type: 'SET_TYPED', text }), []),
    submitRound: useCallback((score) => dispatch({ type: 'SUBMIT_ROUND', score }), []),
    incrementTeleport: useCallback(() => dispatch({ type: 'INCREMENT_TELEPORT' }), []),
    levelComplete: useCallback(() => dispatch({ type: 'LEVEL_COMPLETE' }), []),
    resetGame: useCallback(() => dispatch({ type: 'RESET_GAME' }), []),
  };

  return { state, actions };
}
