import { useState, useEffect } from 'react';
import './Mascot.css';

const IDLE = '🗿';
const FAST = '🥵';
const TYPO = '💀';
const PANIC = '⏳';
const DONE = '🏆';

export default function Mascot({ typed, targetText, timeLeft, phase, hasTypo }) {
  const [mood, setMood] = useState('idle'); // idle, fast, typo, panic, done
  const [speech, setSpeech] = useState('');

  // Determine typing speed and state
  useEffect(() => {
    if (phase !== 'reading') {
      setMood('done');
      setSpeech('');
      return;
    }

    if (hasTypo) {
      setMood('typo');
      setSpeech(Math.random() > 0.5 ? 'bruh' : '-10 aura');
      const timer = setTimeout(() => {
        setMood('idle');
        setSpeech('');
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (timeLeft <= 4) {
      setMood('panic');
      setSpeech('HURRY UP');
      return;
    }

    // Heuristics for "fast" (typed a bunch recently)
    if (typed.length > 5 && !hasTypo) {
      setMood('fast');
      setSpeech('');
      const timer = setTimeout(() => setMood('idle'), 500);
      return () => clearTimeout(timer);
    }

    setMood('idle');
    setSpeech('');

  }, [typed, hasTypo, timeLeft, phase]);

  let emoji = IDLE;
  let animClass = 'mascot-idle';

  switch (mood) {
    case 'fast':
      emoji = FAST;
      animClass = 'mascot-fast';
      break;
    case 'typo':
      emoji = TYPO;
      animClass = 'mascot-typo';
      break;
    case 'panic':
      emoji = PANIC;
      animClass = 'mascot-panic';
      break;
    case 'done':
      emoji = DONE;
      animClass = 'mascot-idle'; // slight bob
      break;
    default:
      emoji = IDLE;
      animClass = 'mascot-idle';
      break;
  }

  return (
    <div className={`mascot-container ${animClass}`}>
      {speech && <div className="mascot-bubble">{speech}</div>}
      <div className="mascot-emoji">{emoji}</div>
    </div>
  );
}
