'use strict';
/**
 * Ashtakavarga — Bhinnashtakavarga (BAV) per planet + Sarvashtakavarga (SAV).
 * Uses the classical benefic-point contribution tables (Parashari). The seven
 * contributors are Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn plus the
 * Lagna. Result: for each of the 7 planets, a 12-sign array of bindus, and SAV
 * as the sign-wise sum.
 *
 * The contribution tables below are the standard Parashari "kakshya" tables,
 * expressed as: for contributor X, the houses (counted from X) in which the
 * subject planet gets a bindu.
 */
const C = require('./constants');

// Houses-from-contributor that yield a bindu. Source: classical Parashari tables.
// Keyed [subjectPlanet][contributor] -> array of house offsets (1-based).
const BAV_TABLE = {
  Sun: {
    Sun: [1, 2, 4, 7, 8, 9, 10, 11], Moon: [3, 6, 10, 11], Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [3, 5, 6, 9, 10, 11, 12], Jupiter: [5, 6, 9, 11], Venus: [6, 7, 12],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11], Lagna: [3, 4, 6, 10, 11, 12],
  },
  Moon: {
    Sun: [3, 6, 7, 8, 10, 11], Moon: [1, 3, 6, 7, 10, 11], Mars: [2, 3, 5, 6, 9, 10, 11],
    Mercury: [1, 3, 4, 5, 7, 8, 10, 11], Jupiter: [1, 4, 7, 8, 10, 11, 12], Venus: [3, 4, 5, 7, 9, 10, 11],
    Saturn: [3, 5, 6, 11], Lagna: [3, 6, 10, 11],
  },
  Mars: {
    Sun: [3, 5, 6, 10, 11], Moon: [3, 6, 11], Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [3, 5, 6, 11], Jupiter: [6, 10, 11, 12], Venus: [6, 8, 11, 12],
    Saturn: [1, 4, 7, 8, 9, 10, 11], Lagna: [1, 3, 6, 10, 11],
  },
  Mercury: {
    Sun: [5, 6, 9, 11, 12], Moon: [2, 4, 6, 8, 10, 11], Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [1, 3, 5, 6, 9, 10, 11, 12], Jupiter: [6, 8, 11, 12], Venus: [1, 2, 3, 4, 5, 8, 9, 11],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11], Lagna: [1, 2, 4, 6, 8, 10, 11],
  },
  Jupiter: {
    Sun: [1, 2, 3, 4, 7, 8, 9, 10, 11], Moon: [2, 5, 7, 9, 11], Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [1, 2, 4, 5, 6, 9, 10, 11], Jupiter: [1, 2, 3, 4, 7, 8, 10, 11], Venus: [2, 5, 6, 9, 10, 11],
    Saturn: [3, 5, 6, 12], Lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  Venus: {
    Sun: [8, 11, 12], Moon: [1, 2, 3, 4, 5, 8, 9, 11, 12], Mars: [3, 5, 6, 9, 11, 12],
    Mercury: [3, 5, 6, 9, 11], Jupiter: [5, 8, 9, 10, 11], Venus: [1, 2, 3, 4, 5, 8, 9, 10, 11],
    Saturn: [3, 4, 5, 8, 9, 10, 11], Lagna: [1, 2, 3, 4, 5, 8, 9, 11],
  },
  Saturn: {
    Sun: [1, 2, 4, 7, 8, 10, 11], Moon: [3, 6, 11], Mars: [3, 5, 6, 10, 11, 12],
    Mercury: [6, 8, 9, 10, 11, 12], Jupiter: [5, 6, 11, 12], Venus: [6, 11, 12],
    Saturn: [3, 5, 6, 11], Lagna: [1, 3, 4, 6, 10, 11],
  },
};

const BAV_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

function computeAshtakavarga(planets, ascSign) {
  const contributorSign = {};
  for (const p of BAV_PLANETS) contributorSign[p] = planets[p].signIndex;
  contributorSign.Lagna = ascSign;

  const bav = {};
  const sav = new Array(12).fill(0);

  for (const subject of BAV_PLANETS) {
    const bindus = new Array(12).fill(0);
    const table = BAV_TABLE[subject];
    for (const contributor of Object.keys(table)) {
      const fromSign = contributorSign[contributor];
      for (const offset of table[contributor]) {
        const targetSign = (fromSign + offset - 1) % 12;
        bindus[targetSign] += 1;
      }
    }
    bav[subject] = bindus;
    for (let i = 0; i < 12; i++) sav[i] += bindus[i];
  }

  return {
    bav,                       // per-planet 12-sign bindu arrays
    sav,                       // sign-wise total (max 56 per sign)
    signOrder: C.SIGNS,
    note: 'Bindus indexed by sign (0=Aries). SAV total across all signs should be 337.',
  };
}

module.exports = { computeAshtakavarga };
