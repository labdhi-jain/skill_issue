// useZoomDetect.js — detects zoom/focus gestures and fires onZoom callback

import { useEffect, useRef } from 'react';
import { recordCheatAttempt } from '../engine/RageFXController';

/**
 * Detects:
 * - Desktop: Ctrl+wheel, Ctrl+=, Ctrl+-, hover-dwell near text
 * - Mobile: two-finger pinch spread
 *
 * Fires onZoom() when detected.
 * Calls onDwell(true/false) as mouse approaches text.
 */
export function useZoomDetect({ onZoom, onDwell, textRef, enabled = true, levelId }) {
  const dwellTimerRef = useRef(null);
  const isDwellingRef = useRef(false);
  const lastPinchDistRef = useRef(null);
  const pinchSpreadRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    // ── Desktop: Ctrl+Wheel ──────────────────────────────────────────────────
    function handleWheel(e) {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          // Zooming in — the classic trap
          onZoom?.();
        }
      }
    }

    // ── Desktop: Ctrl+= / Ctrl+- ─────────────────────────────────────────────
    function handleKeyDown(e) {
      if (e.ctrlKey && (e.key === '=' || e.key === '+' || e.key === 'Equal')) {
        e.preventDefault();
        onZoom?.();
      }
      if (e.ctrlKey && (e.key === '-' || e.key === 'Minus')) {
        e.preventDefault();
        // Allow zoom-out (not a cheat), but still teleport at higher levels
        if (['diabolical', 'touch_grass'].includes(levelId)) {
          onZoom?.();
        }
      }
      // Detect F12 / devtools attempt
      if (e.key === 'F12') {
        recordCheatAttempt('F12 devtools attempt');
      }
    }

    // ── Desktop: Mouse hover-dwell near text ─────────────────────────────────
    function handleMouseMove(e) {
      if (!textRef?.current) return;
      const rect = textRef.current.getBoundingClientRect();
      const threshold = 100;

      const nearX = e.clientX >= rect.left - threshold && e.clientX <= rect.right + threshold;
      const nearY = e.clientY >= rect.top - threshold && e.clientY <= rect.bottom + threshold;
      const isNear = nearX && nearY;

      if (isNear && !isDwellingRef.current) {
        isDwellingRef.current = true;
        onDwell?.(true);
        dwellTimerRef.current = setTimeout(() => {
          // Hovered for 600ms = "leaning in to read" → teleport!
          onZoom?.();
          isDwellingRef.current = false;
          onDwell?.(false);
        }, 600);
      } else if (!isNear && isDwellingRef.current) {
        isDwellingRef.current = false;
        onDwell?.(false);
        clearTimeout(dwellTimerRef.current);
      }
    }

    // ── Mobile: Pinch-to-zoom via pointer events ──────────────────────────────
    const activeTouches = new Map();

    function handlePointerDown(e) {
      activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    function handlePointerMove(e) {
      if (!activeTouches.has(e.pointerId)) return;
      activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activeTouches.size === 2) {
        const points = [...activeTouches.values()];
        const dist = Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y
        );

        if (lastPinchDistRef.current !== null) {
          const delta = dist - lastPinchDistRef.current;
          pinchSpreadRef.current += delta;
          if (pinchSpreadRef.current > 30) {
            // Significant spread = pinch zoom in
            onZoom?.();
            pinchSpreadRef.current = 0;
          }
        }
        lastPinchDistRef.current = dist;
      }
    }

    function handlePointerUp(e) {
      activeTouches.delete(e.pointerId);
      if (activeTouches.size < 2) {
        lastPinchDistRef.current = null;
        pinchSpreadRef.current = 0;
      }
    }

    // ── Devtools detection via resize ─────────────────────────────────────────
    let devtoolsOpen = false;
    function checkDevtools() {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if ((widthDiff > threshold || heightDiff > threshold) && !devtoolsOpen) {
        devtoolsOpen = true;
        recordCheatAttempt('devtools detected via window resize');
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('resize', checkDevtools);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('resize', checkDevtools);
      clearTimeout(dwellTimerRef.current);
    };
  }, [enabled, onZoom, onDwell, textRef, levelId]);
}
