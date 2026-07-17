// TextPlacer.js — computes next position for the floating text element

const PADDING = 60; // px from screen edges
const COOLDOWN_ZONES = 4; // remember last N positions to avoid repeating

/**
 * Get a random position on screen avoiding recent zones and edges
 * @param {number} width - viewport width
 * @param {number} height - viewport height
 * @param {Array} recentPositions - last N {x, y} positions
 * @param {number} textWidth - estimated text width in px
 * @param {number} textHeight - estimated text height in px
 * @returns {{ x, y, rotation, opacity, fontSize }}
 */
export function getNextPosition(width, height, recentPositions = [], options = {}) {
  const {
    fontSize = 10,
    rotation = 0,
    opacityFlicker = false,
    progressiveShrink = false,
    shrinkStep = 0,
    fakeColor = false,
  } = options;

  const textW = Math.min(fontSize * 50, width * 0.6);
  const textH = fontSize * 3;

  const maxX = width - textW - PADDING;
  const maxY = height - textH - PADDING;

  let x, y;
  let attempts = 0;

  do {
    x = PADDING + Math.random() * Math.max(0, maxX - PADDING);
    y = PADDING + Math.random() * Math.max(0, maxY - PADDING);
    attempts++;
  } while (
    attempts < 20 &&
    recentPositions.some(pos => Math.abs(pos.x - x) < 150 && Math.abs(pos.y - y) < 80)
  );

  const actualFontSize = progressiveShrink
    ? Math.max(fontSize - shrinkStep * 0.5, 2)
    : fontSize;

  const actualRotation = rotation > 0
    ? (Math.random() - 0.5) * 2 * rotation
    : 0;

  const actualOpacity = opacityFlicker
    ? 0.4 + Math.random() * 0.6
    : 1;

  return {
    x,
    y,
    fontSize: actualFontSize,
    rotation: actualRotation,
    opacity: actualOpacity,
    fakeColor,
  };
}

/**
 * Generate ghost decoy positions for SWEATY+
 */
export function getGhostPositions(count, width, height, mainPos) {
  const ghosts = [];
  for (let i = 0; i < count; i++) {
    let gx, gy;
    let attempts = 0;
    do {
      gx = 60 + Math.random() * (width - 180);
      gy = 60 + Math.random() * (height - 120);
      attempts++;
    } while (
      attempts < 15 &&
      (Math.abs(gx - mainPos.x) < 100 && Math.abs(gy - mainPos.y) < 60) ||
      ghosts.some(g => Math.abs(g.x - gx) < 80 && Math.abs(g.y - gy) < 50)
    );

    ghosts.push({
      x: gx,
      y: gy,
      rotation: (Math.random() - 0.5) * 30,
      opacity: 0.15 + Math.random() * 0.2,
    });
  }
  return ghosts;
}

/**
 * Micro teleport: small random offset within ~80px (for TOUCH GRASS)
 */
export function getMicroTeleportOffset() {
  return {
    dx: (Math.random() - 0.5) * 160,
    dy: (Math.random() - 0.5) * 80,
  };
}
