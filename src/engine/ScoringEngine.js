// ScoringEngine.js — word-level diff scoring with partial credit

/**
 * Strip punctuation and lowercase a string
 */
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Levenshtein distance between two strings
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Score a single word match.
 * - exact match: 1.0
 * - off by 1 char: 0.7
 * - off by 2 chars: 0.4
 * - otherwise: 0
 */
function scoreWord(typed, target) {
  if (typed === target) return 1.0;
  const dist = levenshtein(typed, target);
  if (dist === 1) return 0.7;
  if (dist === 2) return 0.4;
  return 0;
}

/**
 * Main scoring function.
 * Returns { percentage, wordsCorrect, wordsTotal, wordScores, orderBonus }
 */
export function scoreAttempt(typedText, targetText) {
  const typedWords = normalize(typedText).split(/\s+/).filter(Boolean);
  const targetWords = normalize(targetText).split(/\s+/).filter(Boolean);

  if (typedWords.length === 0) {
    return { percentage: 0, wordsCorrect: 0, wordsTotal: targetWords.length, wordScores: [], orderBonus: 0 };
  }

  // Word-level matching — align typed to target by position
  const wordScores = [];
  let rawScore = 0;

  for (let i = 0; i < targetWords.length; i++) {
    const typed = typedWords[i] || '';
    const target = targetWords[i];
    const score = typed ? scoreWord(typed, target) : 0;
    wordScores.push({ typed, target, score });
    rawScore += score;
  }

  // Order bonus: +10% of base score if sequence is maintained
  // (i.e. no words were skipped/reordered)
  let orderBonus = 0;
  const allInOrder = wordScores.every((ws, i) => {
    if (!typedWords[i]) return false;
    return ws.score > 0;
  });
  if (allInOrder && typedWords.length >= targetWords.length * 0.8) {
    orderBonus = rawScore * 0.1;
  }

  const totalScore = Math.min(rawScore + orderBonus, targetWords.length);
  const percentage = Math.round((totalScore / targetWords.length) * 1000) / 10; // 1 decimal place

  const wordsCorrect = wordScores.filter(ws => ws.score === 1.0).length;

  return {
    percentage,
    wordsCorrect,
    wordsTotal: targetWords.length,
    wordScores,
    orderBonus: orderBonus > 0,
  };
}

/**
 * Get roast tier based on percentage
 */
export function getRoastTier(percentage) {
  if (percentage < 20) return 'catastrophic';
  if (percentage < 40) return 'bad';
  if (percentage < 60) return 'mid';
  if (percentage < 75) return 'almost';
  if (percentage < 88) return 'close';
  if (percentage < 96) return 'near_perfect';
  return 'perfect';
}

export const ROASTS = {
  catastrophic: [
    "did you even try? genuinely asking 💀",
    "bro closed their eyes and typed randomly",
    "my toddler could do better. actually.",
    "was this intentional?? we need to talk",
    "you read zero (0) words. incredible tbh",
    "the text was there. YOU were there. what happened.",
    "i've seen better attempts from autocorrect",
    "this is not it chief. this is so not it.",
  ],
  bad: [
    "your eyes work, right?",
    "bro typed 'the' wrong. THE. T-H-E.",
    "next time try having eyes",
    "what part of 'read it' confused you exactly",
    "i've seen cats type better on laptops",
    "ok but who raised you",
    "the reading comprehension is NOT there",
    "we're putting this score on the fridge ironically",
  ],
  mid: [
    "it's giving participation trophy energy",
    "C- but make it lowercase",
    "technically not zero. we'll mark that as progress.",
    "the bare minimum was almost reached today",
    "your effort was... present. sort of.",
    "congratulations on being mediocre with style",
    "at least you showed up. that's the only compliment available.",
    "mid. absolutely, spiritually mid.",
  ],
  almost: [
    "so close 😭 so so so close",
    "you were right THERE",
    "the skill issue is SO close to being resolved",
    "almost. ALMOST. ugh.",
    "we felt that. that must've hurt.",
    "heartbreaking performance. truly. poetic even.",
    "you grazed greatness and then fumbled it",
    "this loss will haunt your dreams specifically",
  ],
  close: [
    "so close 😭 this is genuinely painful",
    "the cruelest kind of failure — almost success",
    "87% of the way there which means 13% of skill issue remains",
    "statistically close. existentially devastating.",
    "we felt secondhand embarrassment at this one",
    "one more word and you'd have had it. ONE.",
    "the precision with which you failed is impressive",
    "your ancestors did not die for this score",
  ],
  near_perfect: [
    "ok but can you do it again?",
    "impressive. suspiciously impressive actually.",
    "we're checking for cheats. give us a moment.",
    "almost... almost... still a skill issue tho",
    "fine. you're fine. we won't admit we're impressed.",
    "the accuracy is concerning. we're watching you.",
    "not bad. we still won't say good.",
    "we'll allow it. this time. barely.",
  ],
  perfect: [
    "no you didn't.",
    "we don't believe this.",
    "report to IT immediately. something's wrong.",
    "...huh. ok. whatever. it's not that impressive.",
    "skill issue? apparently not. we hate this.",
    "literally how. we need an explanation.",
    "you've broken the game. happy? are you happy now?",
    "recount in progress... still perfect. this is fine.",
  ],
};

export function getRandomRoast(tier) {
  const roasts = ROASTS[tier] || ROASTS.mid;
  return roasts[Math.floor(Math.random() * roasts.length)];
}
