import { useState, useEffect, useRef, useCallback } from 'react';
import { LEVELS } from '../engine/LevelConfig';
import { getNextPosition, getGhostPositions, getMicroTeleportOffset } from '../engine/TextPlacer';
import { scoreAttempt, getRoastTier, getRandomRoast } from '../engine/ScoringEngine';
import { playBonk, playSmugJingle, playTeleport, playTimerWarning, playStreakBreak, flashScreen, getRandomMidGameTaunt } from '../engine/RageFXController';
import { useZoomDetect } from '../hooks/useZoomDetect';
import Mascot from '../components/Mascot';
import './Game.css';

const ROUNDS_PER_LEVEL = 3;

export default function Game({ state, actions, onLevelComplete, onQuit }) {
  const {
    currentLevelId, round, phase, targetText, timeLeft,
    score, streakCount, teleportCount,
  } = state;

  const level = LEVELS[currentLevelId];

  // ── Text position state ───────────────────────────────────────────────────
  const [textPos, setTextPos] = useState({ x: 100, y: 200, fontSize: level.fontSize, rotation: 0, opacity: 1 });
  const [ghostPositions, setGhostPositions] = useState([]);
  const [isTeleporting, setIsTeleporting] = useState(false);
  const [shrinkStep, setShrinkStep] = useState(0);
  const [isDwelling, setIsDwelling] = useState(false);
  const [midTaunt, setMidTaunt] = useState(null);
  const [midTauntPos, setMidTauntPos] = useState({ x: 100, y: 100 });
  const [typed, setTyped] = useState('');
  const [roundResult, setRoundResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [fakeProgress, setFakeProgress] = useState(0);
  const [streakBroken, setStreakBroken] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // ── Pre-round Countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'reading') {
      if (countdown > 0) {
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
      } else if (countdown === 0) {
        const t = setTimeout(() => setCountdown(null), 600); // Briefly show "GO!"
        return () => clearTimeout(t);
      }
    } else {
      setCountdown(3);
    }
  }, [phase, countdown]);

  const recentPositions = useRef([]);
  const timerRef = useRef(null);
  const autoTeleportRef = useRef(null);
  const microTeleportRef = useRef(null);
  const tauntTimerRef = useRef(null);
  const textRef = useRef(null);
  const inputRef = useRef(null);
  const localTimeRef = useRef(level.timeLimit);
  const submittedRef = useRef(false);

  // ── Place text at a random position ───────────────────────────────────────
  const placeText = useCallback((isTeleport = false) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight - 180; // leave room for HUD + typing area

    const newStep = isTeleport ? shrinkStep + 1 : 0;
    if (isTeleport) setShrinkStep(newStep);

    const pos = getNextPosition(vw, vh, recentPositions.current, {
      fontSize: level.fontSize,
      rotation: level.rotation,
      opacityFlicker: level.opacityFlicker,
      progressiveShrink: level.progressiveShrink,
      shrinkStep: newStep,
      fakeColor: level.fakeColor,
    });

    // Add top offset for HUD (64px) + timer (4px)
    pos.y = Math.max(80, pos.y + 68);

    recentPositions.current = [
      { x: pos.x, y: pos.y },
      ...recentPositions.current.slice(0, 3),
    ];

    setTextPos(pos);

    // Ghost decoys
    if (level.ghostDecoys > 0) {
      const ghosts = getGhostPositions(level.ghostDecoys, vw, vh, pos);
      setGhostPositions(ghosts.map(g => ({ ...g, y: g.y + 68 })));
    }
  }, [level, shrinkStep]);

  // ── Teleport handler ──────────────────────────────────────────────────────
  const doTeleport = useCallback(() => {
    if (phase !== 'reading') return;
    setIsTeleporting(true);
    playTeleport();
    placeText(true);
    actions.incrementTeleport();
    setTimeout(() => setIsTeleporting(false), 250);
  }, [phase, placeText, actions]);

  // ── Zoom detection ────────────────────────────────────────────────────────
  useZoomDetect({
    onZoom: doTeleport,
    onDwell: setIsDwelling,
    textRef,
    enabled: phase === 'reading',
    levelId: currentLevelId,
  });

  // ── Round start ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'reading' || countdown !== null) return;

    setShrinkStep(0);
    setTyped('');
    setRoundResult(null);
    setShowResult(false);
    setFakeProgress(0);
    recentPositions.current = [];
    placeText(false);

    // Focus input after short delay
    setTimeout(() => inputRef.current?.focus(), 100);

    // Auto-teleport timer
    if (level.autoTeleportInterval) {
      autoTeleportRef.current = setInterval(doTeleport, level.autoTeleportInterval);
    }

    // Micro-teleport (TOUCH GRASS)
    if (level.microTeleport) {
      microTeleportRef.current = setInterval(() => {
        if (phase !== 'reading') return;
        const { dx, dy } = getMicroTeleportOffset();
        setTextPos(prev => ({
          ...prev,
          x: Math.max(60, Math.min(window.innerWidth - 200, prev.x + dx)),
          y: Math.max(80, Math.min(window.innerHeight - 200, prev.y + dy)),
        }));
      }, 1200);
    }

    // Mid-game taunts
    tauntTimerRef.current = setInterval(() => {
      const tx = 80 + Math.random() * (window.innerWidth - 260);
      const ty = 90 + Math.random() * (window.innerHeight - 300);
      setMidTaunt(getRandomMidGameTaunt());
      setMidTauntPos({ x: tx, y: ty });
      setTimeout(() => setMidTaunt(null), 3000);
    }, 5000 + Math.random() * 3000);

    return () => {
      clearInterval(autoTeleportRef.current);
      clearInterval(microTeleportRef.current);
      clearInterval(tauntTimerRef.current);
    };
  }, [phase, round, countdown]); // eslint-disable-line

  // ── Timer countdown ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'reading' || countdown !== null) {
      clearInterval(timerRef.current);
      return;
    }

    localTimeRef.current = level.timeLimit;
    submittedRef.current = false;
    actions.setTime(level.timeLimit);

    timerRef.current = setInterval(() => {
      localTimeRef.current -= 1;
      actions.setTime(localTimeRef.current);

      if (localTimeRef.current <= 0) {
        clearInterval(timerRef.current);
        if (!submittedRef.current) {
          handleSubmit(true);
        }
        return;
      }
      if (localTimeRef.current === 4) playTimerWarning();

      // Fake progress: fills based on time, not accuracy (the troll)
      const elapsed = level.timeLimit - localTimeRef.current;
      const ratio = elapsed / level.timeLimit;
      setFakeProgress(Math.min(ratio * 100, 95));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase, round, countdown]); // eslint-disable-line

  // ── Submit attempt ────────────────────────────────────────────────────────
  const handleSubmit = useCallback((timeUp = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    clearInterval(timerRef.current);
    clearInterval(autoTeleportRef.current);
    clearInterval(microTeleportRef.current);
    clearInterval(tauntTimerRef.current);

    const finalTyped = inputRef.current ? inputRef.current.value : typed;
    const result = scoreAttempt(finalTyped, targetText);
    const tier = getRoastTier(result.percentage);
    const roast = getRandomRoast(tier);
    result.roast = roast;
    result.tier = tier;
    result.timeUp = timeUp;
    result.timeTaken = level.timeLimit - localTimeRef.current;

    // FX
    if (result.percentage < 60) {
      playBonk();
      flashScreen();
    } else if (result.percentage >= 85) {
      playSmugJingle();
    }

    // Streak break drama
    if (streakCount >= 2 && result.percentage < 80) {
      setStreakBroken(true);
      setTimeout(() => setStreakBroken(false), 2000);
    }

    actions.submitRound(result);
    setRoundResult(result);
    setFakeProgress(result.percentage); // snap to truth
    setShowResult(true);
  }, [phase, typed, targetText, streakCount, actions]);

  // ── Continue to next round / level complete ───────────────────────────────
  const handleContinue = useCallback(() => {
    setShowResult(false);
    if (round >= ROUNDS_PER_LEVEL) {
      actions.levelComplete(); // unlocks next level in reducer
      onLevelComplete?.();     // tells App.jsx to switch to results screen
    } else {
      actions.nextRound();
    }
  }, [round, actions, onLevelComplete]);

  useEffect(() => {
    if (!showResult) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleContinue();
      }
    };
    // Delay attaching to prevent catching the same Enter keydown that submitted the form
    const timer = setTimeout(() => {
      window.addEventListener('keydown', handleKeyDown);
    }, 100);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showResult, handleContinue]);

  // ── Keyboard submit ───────────────────────────────────────────────────────
  function handleInputKey(e) {
    if (e.key === 'Enter') handleSubmit(false);
  }

  // ── Timer bar color ───────────────────────────────────────────────────────
  const timerRatio = timeLeft / level.timeLimit;
  const timerColor = timerRatio > 0.5
    ? 'var(--accent)'
    : timerRatio > 0.25
      ? 'var(--danger)'
      : '#FF0040';

  // ── Screen shake for TOUCH GRASS ──────────────────────────────────────────
  useEffect(() => {
    if (!level.screenShake || phase !== 'reading') return;
    const interval = setInterval(() => {
      document.body.style.transform = `translate(${(Math.random()-0.5)*4}px, ${(Math.random()-0.5)*2}px)`;
    }, 100);
    return () => {
      clearInterval(interval);
      document.body.style.transform = '';
    };
  }, [level.screenShake, phase]);

  // ── Score color ───────────────────────────────────────────────────────────
  function getScoreClass(pct) {
    if (pct >= 80) return 'great';
    if (pct >= 50) return 'ok';
    return 'bad';
  }

  return (
    <div className="game-screen" id="game-screen">
      {/* Pre-round Countdown Overlay */}
      {phase === 'reading' && countdown !== null && (
        <div className="countdown-overlay">
          <div className={`countdown-number ${countdown === 0 ? 'go' : ''}`}>
            {countdown > 0 ? countdown : 'GO!'}
          </div>
        </div>
      )}

      {/* Rage flash overlay */}
      <div id="rage-overlay" />

      {/* HUD */}
      <div className="game-hud">
        <div className="hud-level">
          <span className="hud-level-name" style={{ '--level-color': level.color }}>
            {level.emoji} {level.label}
          </span>
          <span className="hud-round">round {round}/{ROUNDS_PER_LEVEL}</span>
        </div>

        <div className={`hud-streak ${streakCount === 0 ? 'dead' : ''}`}>
          🔥 {streakCount > 0 ? `${streakCount} streak` : 'no streak'}
        </div>

        <button className="btn btn-ghost hud-quit" onClick={onQuit}>quit</button>
      </div>

      {/* Timer bar (real) */}
      <div className="timer-container">
        <div className="timer-bar-bg">
          <div
            className="timer-bar-fill"
            style={{ width: `${timerRatio * 100}%`, background: timerColor }}
          />
        </div>
      </div>

      <div className={`timer-display ${timeLeft <= 3 ? 'warning' : ''}`}>
        {timeLeft}s
      </div>




      {/* Ghost decoy texts */}
      {ghostPositions.map((g, i) => (
        <div
          key={i}
          className="ghost-text"
          style={{
            left: g.x,
            top: g.y,
            transform: `rotate(${g.rotation}deg)`,
            opacity: g.opacity,
            '--rot': `${g.rotation}deg`,
          }}
        >
          {targetText.split(' ').sort(() => Math.random() - 0.5).slice(0, 4).join(' ')}
        </div>
      ))}

      {/* THE TINY TELEPORTING TEXT */}
      <div
        ref={textRef}
        className={`floating-text-wrap ${isTeleporting ? 'teleporting' : ''}`}
        style={{
          left: textPos.x,
          top: textPos.y,
        }}
      >
        <div
          className="floating-text-content"
          style={{
            fontSize: textPos.fontSize,
            transform: `rotate(${textPos.rotation}deg)`,
            opacity: textPos.opacity,
            color: level.fakeColor
              ? `hsl(${Math.random() * 30 + 250}, 20%, 20%)`
              : 'var(--text)',
            transition: 'color 0.5s',
          }}
        >
          {targetText}
        </div>
      </div>

      {/* Mid-game taunts */}
      {midTaunt && phase === 'reading' && (
        <div
          className="mid-taunt"
          style={{ left: midTauntPos.x, top: midTauntPos.y }}
        >
          {midTaunt}
        </div>
      )}

      {/* Dwell indicator */}
      {isDwelling && (
        <div
          className="dwell-ring"
          style={{ left: textPos.x + 20, top: textPos.y + 10 }}
        />
      )}

      {/* Streak break drama */}
      {streakBroken && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 300,
          fontFamily: 'var(--font-display)',
          fontSize: '40px',
          color: 'var(--primary)',
          textAlign: 'center',
          animation: 'scaleIn 0.3s ease, fadeOut 0.3s ease 1.7s forwards',
          textShadow: '0 0 40px var(--primary)',
        }}>
          💔 STREAK BROKEN
          <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 8 }}>
            how could you let this happen
          </div>
        </div>
      )}

      <Mascot 
        typed={typed} 
        targetText={targetText} 
        timeLeft={timeLeft} 
        phase={phase} 
        hasTypo={typed.length > 0 && !targetText.startsWith(typed)} 
      />

      {/* Typing area */}
      <div className="typing-area">
        <div className="typing-inner">
          <input
            ref={inputRef}
            id="typing-input"
            type="text"
            className={`typing-input ${timeLeft === 0 ? 'time-up' : ''}`}
            placeholder={timeLeft === 0 ? "time's up 💀" : "type what you read..."}
            value={typed}
            onChange={e => setTyped(e.target.value)}
            onKeyDown={handleInputKey}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={showResult}
          />
          <button
            id="submit-btn"
            className="btn btn-primary typing-submit-btn"
            onClick={() => handleSubmit(false)}
            disabled={showResult || !typed.trim()}
          >
            SUBMIT
          </button>
        </div>
        <div className="typing-hint">
          press enter to submit · ctrl+scroll = teleport · hover near text = teleport · {teleportCount} teleports so far
        </div>
      </div>

      {/* Round result overlay */}
      {showResult && roundResult && (
        <div className="round-result-overlay">
          <div className="round-result-card">
            <div className="tag" style={{ marginBottom: 8 }}>
              ROUND {round} RESULT
            </div>

            <div className={`round-score-display ${getScoreClass(roundResult.percentage)}`}>
              {roundResult.percentage.toFixed(1)}%
            </div>

            <div className="round-taunt-text">
              {roundResult.roast}
            </div>

            {/* Word breakdown */}
            {roundResult.wordScores && (
              <div className="word-breakdown">
                {roundResult.wordScores.map((ws, i) => (
                  <span
                    key={i}
                    className={`word-chip ${ws.score === 1 ? 'correct' : ws.score > 0 ? 'partial' : 'wrong'}`}
                    title={`typed: "${ws.typed}" → target: "${ws.target}"`}
                  >
                    {ws.target}
                  </span>
                ))}
              </div>
            )}

            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--text-dim)',
              marginBottom: 20,
            }}>
              {roundResult.wordsCorrect}/{roundResult.wordsTotal} words correct
              {roundResult.orderBonus && ' · +order bonus'}
            </div>

            <button
              id="continue-btn"
              className="btn btn-primary round-continue-btn"
              onClick={handleContinue}
            >
              {round >= ROUNDS_PER_LEVEL ? 'SEE VERDICT →' : `NEXT ROUND (${round + 1}/${ROUNDS_PER_LEVEL}) →`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
