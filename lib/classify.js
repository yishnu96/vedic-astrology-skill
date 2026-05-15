'use strict';
/**
 * Classify a free-text question into 1-3 life dimensions by keyword scoring
 * against data/dimension-keywords.json. Returns a confidence level so the
 * orchestrator can ask for clarification instead of guessing.
 */
const fs = require('fs');
const path = require('path');

const KEYWORDS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'dimension-keywords.json'), 'utf8'));

function classify(question, maxDimensions = 3) {
  const q = ` ${question.toLowerCase()} `;
  const scores = {};
  for (const dim of Object.keys(KEYWORDS)) {
    if (dim.startsWith('_')) continue;
    let score = 0;
    const hits = [];
    for (const phrase of KEYWORDS[dim]) {
      if (q.includes(` ${phrase} `) || q.includes(` ${phrase}`) || q.includes(`${phrase} `)) {
        // Longer phrases are stronger signals.
        score += 1 + phrase.split(' ').length * 0.5;
        hits.push(phrase);
      }
    }
    if (score > 0) scores[dim] = { score, hits };
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1].score - a[1].score);

  if (ranked.length === 0) {
    return {
      dimensions: [], confidence: 'none',
      clarification: 'I could not tell which life area this question is about. Could you rephrase — is it about career, marriage, money, health, children, education, property, relationships, family, travel, spirituality, obstacles, past-life karma, or timing?',
    };
  }

  const top = ranked.slice(0, maxDimensions);
  const topScore = top[0][1].score;
  // Keep dimensions within 60% of the top score; they are genuinely co-relevant.
  const selected = top.filter(([, v]) => v.score >= topScore * 0.6).map(([d]) => d);

  // "timing" almost always co-occurs; if a "when" question also matched a life
  // area, surface both rather than letting timing dominate alone.
  let confidence = 'high';
  if (ranked.length > 1 && ranked[1][1].score >= topScore * 0.85 && selected.length === 1) confidence = 'medium';
  if (topScore < 1.5) confidence = 'low';

  return {
    dimensions: selected,
    confidence,
    scores: Object.fromEntries(ranked.map(([d, v]) => [d, { score: +v.score.toFixed(2), matched: v.hits }])),
    clarification: confidence === 'low'
      ? `This question weakly matches "${selected.join(', ')}". If that's not right, tell me which life area you mean.`
      : null,
  };
}

module.exports = { classify };
