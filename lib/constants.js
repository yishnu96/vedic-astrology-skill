'use strict';
/** Shared Jyotisha constants: signs, nakshatras, lords, karakas, dasha periods. */

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

// Sign (0-indexed) -> ruling planet.
const SIGN_LORDS = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
];

const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

// Swiss Ephemeris body indices (Ketu derived from Rahu + 180°).
const SE_BODY = {
  Sun: 0, Moon: 1, Mars: 4, Mercury: 2, Jupiter: 5, Venus: 3, Saturn: 6, Rahu: 11, // SE_TRUE_NODE
};

// 27 nakshatras with their Vimshottari dasha lords.
const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

// Vimshottari dasha sequence and period lengths (years). Total = 120.
const DASHA_SEQUENCE = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const DASHA_YEARS = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};
// Nakshatra index % 9 -> starting dasha lord.
const NAKSHATRA_DASHA_LORD = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
];

// Natural significators.
const KARAKAS = {
  Sun: ['father', 'soul', 'authority', 'career'],
  Moon: ['mind', 'mother', 'emotions'],
  Mars: ['siblings', 'courage', 'land', 'accidents'],
  Mercury: ['intellect', 'speech', 'commerce', 'education'],
  Jupiter: ['wisdom', 'wealth', 'children', 'dharma', 'husband'],
  Venus: ['spouse', 'marriage', 'luxury', 'arts'],
  Saturn: ['longevity', 'discipline', 'service', 'sorrow'],
  Rahu: ['obsession', 'foreign', 'sudden events'],
  Ketu: ['detachment', 'spirituality', 'sudden loss'],
};

// Exaltation / debilitation signs (0-indexed).
const EXALTATION = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const DEBILITATION = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };

// Own signs (0-indexed) per planet.
const OWN_SIGNS = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5],
  Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};

// Special Jyotisha graha drishti (full aspects), as house counts from the planet.
const SPECIAL_ASPECTS = {
  Mars: [4, 7, 8],
  Jupiter: [5, 7, 9],
  Saturn: [3, 7, 10],
};
const DEFAULT_ASPECT = [7];

// Divisional chart divisors. D1 included for completeness.
const VARGA_DIVISORS = {
  D1: 1, D2: 2, D3: 3, D4: 4, D6: 6, D7: 7, D9: 9, D10: 10, D11: 11,
  D12: 12, D16: 16, D20: 20, D24: 24, D27: 27, D30: 30, D60: 60,
};

const NAKSHATRA_SPAN = 360 / 27; // 13°20'
const PADA_SPAN = NAKSHATRA_SPAN / 4; // 3°20'

module.exports = {
  SIGNS, SIGN_LORDS, PLANETS, SE_BODY, NAKSHATRAS,
  DASHA_SEQUENCE, DASHA_YEARS, NAKSHATRA_DASHA_LORD,
  KARAKAS, EXALTATION, DEBILITATION, OWN_SIGNS,
  SPECIAL_ASPECTS, DEFAULT_ASPECT, VARGA_DIVISORS,
  NAKSHATRA_SPAN, PADA_SPAN,
};
