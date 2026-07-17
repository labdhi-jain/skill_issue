// LevelConfig.js — difficulty presets for all 6 levels

export const LEVELS = {
  npc: {
    id: 'npc',
    label: 'NPC',
    emoji: '🤖',
    description: 'you can do this. probably.',
    fontSize: 8,
    teleportOnZoom: true,
    autoTeleportInterval: null,
    microTeleport: false,
    timeLimit: 14,
    wordCount: 5,
    rotation: 0,
    opacityFlicker: false,
    ghostDecoys: 0,
    progressiveShrink: false,
    screenShake: false,
    fakeColor: false,
    color: '#D4FF3D',
  },
  mid: {
    id: 'mid',
    label: 'MID',
    emoji: '😐',
    description: 'mid effort. mid result.',
    fontSize: 6,
    teleportOnZoom: true,
    autoTeleportInterval: null,
    microTeleport: false,
    timeLimit: 11,
    wordCount: 8,
    rotation: 12,
    opacityFlicker: false,
    ghostDecoys: 0,
    progressiveShrink: false,
    screenShake: false,
    fakeColor: false,
    color: '#6BF0E3',
  },
  locked_in: {
    id: 'locked_in',
    label: 'LOCKED IN',
    emoji: '🔒',
    description: 'are you though?',
    fontSize: 6,
    teleportOnZoom: true,
    autoTeleportInterval: 4000,
    microTeleport: false,
    timeLimit: 13,
    wordCount: 12,
    rotation: 18,
    opacityFlicker: true,
    ghostDecoys: 0,
    progressiveShrink: false,
    screenShake: false,
    fakeColor: false,
    color: '#FF8C42',
  },
  sweaty: {
    id: 'sweaty',
    label: 'SWEATY',
    emoji: '💦',
    description: "you're trying too hard and it shows",
    fontSize: 5,
    teleportOnZoom: true,
    autoTeleportInterval: 2000,
    microTeleport: false,
    timeLimit: 10,
    wordCount: 15,
    rotation: 20,
    opacityFlicker: true,
    ghostDecoys: 3,
    progressiveShrink: false,
    screenShake: false,
    fakeColor: false,
    color: '#FF2079',
  },
  diabolical: {
    id: 'diabolical',
    label: 'DIABOLICAL',
    emoji: '😈',
    description: 'we do not apologize for this',
    fontSize: 4,
    teleportOnZoom: true,
    autoTeleportInterval: 1000,
    microTeleport: false,
    timeLimit: 8,
    wordCount: 20,
    rotation: 25,
    opacityFlicker: true,
    ghostDecoys: 4,
    progressiveShrink: true,
    screenShake: false,
    fakeColor: false,
    color: '#FF5A1F',
  },
  touch_grass: {
    id: 'touch_grass',
    label: 'TOUCH GRASS',
    emoji: '🌿',
    description: 'seek help. immediately.',
    fontSize: 3,
    teleportOnZoom: true,
    autoTeleportInterval: 800,
    microTeleport: true,
    timeLimit: 6,
    wordCount: 25,
    rotation: 30,
    opacityFlicker: true,
    ghostDecoys: 5,
    progressiveShrink: true,
    screenShake: true,
    fakeColor: true,
    color: '#FF2079',
  },
};

export const LEVEL_ORDER = ['npc', 'mid', 'locked_in', 'sweaty', 'diabolical', 'touch_grass'];

// MonkeyType-style common word pool
const WORD_POOL = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
  'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
  'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
  'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could',
  'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come',
  'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how',
  'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because',
  'any', 'these', 'give', 'day', 'most', 'us', 'great', 'between', 'need',
  'large', 'often', 'hand', 'high', 'place', 'hold', 'turn', 'was', 'where',
  'help', 'through', 'much', 'before', 'line', 'right', 'too', 'mean',
  'old', 'any', 'same', 'tell', 'boy', 'follow', 'came', 'want', 'show',
  'also', 'around', 'form', 'three', 'small', 'set', 'put', 'end', 'does',
  'another', 'well', 'large', 'need', 'big', 'play', 'spell', 'air', 'away',
  'animal', 'house', 'point', 'page', 'letter', 'mother', 'answer', 'found',
  'study', 'still', 'learn', 'plant', 'cover', 'food', 'sun', 'four', 'between',
  'state', 'keep', 'eye', 'never', 'last', 'let', 'thought', 'city', 'tree',
  'cross', 'farm', 'hard', 'start', 'might', 'story', 'saw', 'far', 'sea',
  'draw', 'left', 'late', 'run', 'while', 'press', 'close', 'night', 'real',
  'life', 'few', 'north', 'open', 'seem', 'together', 'next', 'white', 'children',
  'begin', 'got', 'walk', 'example', 'ease', 'paper', 'group', 'always', 'music',
  'those', 'both', 'mark', 'book', 'carry', 'took', 'science', 'eat', 'room',
  'friend', 'began', 'idea', 'fish', 'mountain', 'stop', 'once', 'base', 'hear',
  'horse', 'cut', 'sure', 'watch', 'color', 'face', 'wood', 'main', 'enough',
  'plain', 'girl', 'usual', 'young', 'ready', 'above', 'ever', 'red', 'list',
  'though', 'feel', 'talk', 'bird', 'soon', 'body', 'dog', 'family', 'direct',
  'pose', 'leave', 'song', 'measure', 'door', 'product', 'black', 'short', 'numeral',
  'class', 'wind', 'question', 'happen', 'complete', 'ship', 'area', 'half', 'rock',
  'order', 'fire', 'south', 'problem', 'piece', 'told', 'knew', 'pass', 'since',
  'top', 'whole', 'king', 'space', 'heard', 'best', 'hour', 'better', 'true',
  'during', 'hundred', 'five', 'remember', 'step', 'early', 'hold', 'west', 'ground',
  'interest', 'reach', 'fast', 'verb', 'sing', 'listen', 'six', 'table', 'travel',
  'less', 'morning', 'ten', 'simple', 'several', 'vowel', 'toward', 'war', 'lay',
  'against', 'pattern', 'slow', 'center', 'love', 'person', 'money', 'serve', 'appear',
  'road', 'map', 'rain', 'rule', 'govern', 'pull', 'cold', 'notice', 'voice',
  'fall', 'power', 'town', 'fine', 'drive', 'possible', 'print', 'machine', 'case',
];

// Extra hard words for higher levels
const HARD_WORD_POOL = [
  'necessary', 'particular', 'available', 'probably', 'government', 'community',
  'according', 'important', 'something', 'understand', 'everything', 'different',
  'experience', 'knowledge', 'situation', 'themselves', 'throughout', 'following',
  'represents', 'immediately', 'individual', 'collection', 'especially', 'recognize',
  'photograph', 'population', 'production', 'impossible', 'incredible', 'mysterious',
  'complicated', 'appreciate', 'accomplish', 'disappear', 'excitement', 'fascinating',
  'vocabulary', 'consequence', 'environment', 'achievement', 'perpendicular', 'catastrophe',
  'simultaneously', 'phenomenon', 'extraordinary', 'fundamental', 'approximately',
  'characteristic', 'conscientious', 'controversial', 'exaggerated', 'refrigerator',
  'unfortunately', 'miscellaneous', 'psychological', 'sophisticated', 'temperature',
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getRandomText(levelId) {
  const level = LEVELS[levelId];
  const count = level.wordCount;

  let pool;
  if (levelId === 'diabolical' || levelId === 'touch_grass') {
    // Mix common + hard words
    pool = [...WORD_POOL, ...HARD_WORD_POOL];
  } else if (levelId === 'sweaty') {
    // Slightly more hard words mixed in
    pool = [...WORD_POOL, ...HARD_WORD_POOL.slice(0, 20)];
  } else {
    pool = WORD_POOL;
  }

  return shuffle(pool).slice(0, count).join(' ');
}
