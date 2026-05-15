'use strict';
/**
 * Jaimini helpers: chara karakas, Arudha Lagna / UpaPada, fertility sphutas.
 *
 * Tradition note: Jaimini lineages disagree on the 7- vs 8-karaka scheme and on
 * the exact ordinal of some karakas. This module follows the ordinals given
 * explicitly in the upgrade spec (AK=1, AmK=2, MK=3, PiK=4, PuK=5, lowest=DK)
 * using the 8-karaka scheme (7 planets + Rahu, Rahu's degree reckoned in
 * reverse). Where a reading hinges on a karaka assignment, flag the tradition
 * variance to the user.
 */
const C = require('./constants');

const CHARA_BODIES = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu'];

/** Compute the 8 chara karakas by degrees-within-sign (Rahu reckoned 30 - deg). */
function charaKarakas(d1planets) {
  const ranked = CHARA_BODIES.map((p) => {
    const deg = d1planets[p].degreesInSign;
    return { planet: p, advancement: p === 'Rahu' ? 30 - deg : deg };
  }).sort((a, b) => b.advancement - a.advancement);

  const labels = ['Atmakaraka', 'Amatyakaraka', 'Matrukaraka', 'Pitrukaraka',
    'Putrakaraka', 'Bhratrukaraka', 'Gnatikaraka', 'Darakaraka'];
  const out = {};
  ranked.forEach((r, i) => { out[labels[i]] = r.planet; });
  out._note = 'Ordinals follow the upgrade spec; Jaimini lineages vary. Verify before strong claims.';
  return out;
}

/**
 * Arudha pada of a house. Count from house to its lord, then the same count
 * onward. Classical exceptions: if the pada lands on the house itself, take the
 * 10th from it; if it lands in the 7th from the house, take the 4th from it.
 */
function arudhaOfHouse(ascSignIndex, house, d1planets) {
  const houseSign = (ascSignIndex + house - 1) % 12;
  const lord = C.SIGN_LORDS[houseSign];
  const lordSign = d1planets[lord].signIndex;
  const span = ((lordSign - houseSign + 12) % 12);
  let arudhaSign = (lordSign + span) % 12;
  const fromHouse = ((arudhaSign - houseSign + 12) % 12) + 1;
  if (fromHouse === 1) arudhaSign = (arudhaSign + 9) % 12; // 10th from itself
  else if (fromHouse === 7) arudhaSign = (arudhaSign + 3) % 12; // 4th from itself
  return { sign: C.SIGNS[arudhaSign], signIndex: arudhaSign, lord };
}

/** Arudha Lagna (A1) and Arudha of the 10th (A10) and UpaPada Lagna (UL = arudha of 12th). */
function arudhas(ascSignIndex, d1planets) {
  return {
    A1: arudhaOfHouse(ascSignIndex, 1, d1planets),
    A10: arudhaOfHouse(ascSignIndex, 10, d1planets),
    UL: arudhaOfHouse(ascSignIndex, 12, d1planets),
  };
}

/**
 * Fertility sphutas (per the upgrade spec's simplified definitions):
 *   Beeja Sphuta   = Sun + Venus longitudes        (male fertility)
 *   Kshetra Sphuta = Jupiter + Moon + Mars longitudes (female fertility)
 * Favourable when the resulting point falls in an odd/strong sign.
 */
function fertilitySphutas(d1planets) {
  const norm = (x) => ((x % 360) + 360) % 360;
  const beeja = norm(d1planets.Sun.longitude + d1planets.Venus.longitude);
  const kshetra = norm(d1planets.Jupiter.longitude + d1planets.Moon.longitude + d1planets.Mars.longitude);
  const judge = (lon) => {
    const sign = Math.floor(lon / 30);
    return { longitude: +lon.toFixed(2), sign: C.SIGNS[sign], favourable: sign % 2 === 0 ? 'odd-sign (favourable)' : 'even-sign (less favourable)' };
  };
  return {
    beeja: { ...judge(beeja), note: 'Sun + Venus. Male fertility indicator.' },
    kshetra: { ...judge(kshetra), note: 'Jupiter + Moon + Mars. Female fertility indicator.' },
  };
}

module.exports = { charaKarakas, arudhaOfHouse, arudhas, fertilitySphutas };
