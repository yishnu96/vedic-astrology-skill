'use strict';
/**
 * Shadbala — six-source planetary strength.
 * v1 implements Sthana (positional, via dignity) and Naisargika (natural) bala
 * with real values, and provides structured placeholders for Dig, Kala, Cheshta,
 * and Drik bala so the cache shape is stable. Full classical Kala/Cheshta bala
 * needs sunrise + planetary-hour math — see references/jyotisha-fundamentals.md.
 * Treat `total` as indicative until the remaining components are implemented.
 */
const C = require('./constants');

// Naisargika (natural) bala in Virupas, classical constants.
const NAISARGIKA = {
  Sun: 60.0, Moon: 51.43, Venus: 42.86, Jupiter: 34.29,
  Mercury: 25.71, Mars: 17.14, Saturn: 8.57,
};

function sthanaBala(planet, signIndex) {
  if (['Rahu', 'Ketu'].includes(planet)) return 0;
  const dignity = C.EXALTATION[planet] === signIndex ? 'exalted'
    : C.DEBILITATION[planet] === signIndex ? 'debilitated'
      : (C.OWN_SIGNS[planet] || []).includes(signIndex) ? 'own' : 'neutral';
  const map = { exalted: 60, own: 45, neutral: 30, debilitated: 10 };
  return map[dignity];
}

function computeShadbala(planets, ascSign) {
  const out = {};
  for (const p of C.PLANETS) {
    const sthana = sthanaBala(p, planets[p].signIndex);
    const naisargika = NAISARGIKA[p] || 0;
    out[p] = {
      sthana,
      dig: null,      // directional — needs house-angle math
      kala: null,     // temporal — needs sunrise / day-night birth
      cheshta: null,  // motional — needs mean vs true longitude
      naisargika,
      drik: null,     // aspectual — needs benefic/malefic aspect tally
      total: sthana + naisargika,
      complete: false,
      note: 'Partial: Sthana + Naisargika only. Dig/Kala/Cheshta/Drik pending.',
    };
  }
  return out;
}

module.exports = { computeShadbala };
