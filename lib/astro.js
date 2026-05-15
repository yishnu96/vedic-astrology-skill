'use strict';
/** Core astronomical + Jyotisha helpers shared by all compute scripts. */
const { DateTime } = require('luxon');
const adapter = require('./sweph-adapter');
const C = require('./constants');

const norm360 = (x) => ((x % 360) + 360) % 360;

/** (dob, tob, IANA tz) -> Julian Day (UT). luxon handles historical DST/offset rules. */
function julianDayUT(dob, tob, tzName) {
  const dt = DateTime.fromISO(`${dob}T${tob}`, { zone: tzName });
  if (!dt.isValid) throw new Error(`Invalid date/time/zone: ${dob} ${tob} ${tzName} (${dt.invalidReason})`);
  const utc = dt.toUTC();
  return { dt, utc, jd: gregorianToJD(utc) };
}

function gregorianToJD(utc) {
  let y = utc.year;
  let m = utc.month;
  const dayFrac = utc.day + (utc.hour + utc.minute / 60 + utc.second / 3600) / 24;
  if (m <= 2) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + dayFrac + b - 1524.5;
}

/**
 * Lahiri ayanamsa at a given JD. swe_set_sid_mode(LAHIRI) is set by the adapter,
 * so swe_get_ayanamsa_ut returns the Lahiri value. We subtract it ourselves
 * rather than relying on the SEFLG_SIDEREAL flag — the bundled WASM build
 * silently ignores that flag, so manual subtraction is the portable path.
 */
async function ayanamsa(jd) {
  const eng = await adapter.load();
  return eng.swe_get_ayanamsa_ut(jd);
}

/** Sidereal longitude (Lahiri) for a planet at a given JD. */
async function planetLongitude(jd, planet) {
  const eng = await adapter.load();
  if (planet === 'Ketu') {
    const rahu = await planetLongitude(jd, 'Rahu');
    return { lon: norm360(rahu.lon + 180), speed: rahu.speed, retro: true };
  }
  const flags = (eng.SEFLG_SWIEPH != null ? eng.SEFLG_SWIEPH : 2) | (eng.SEFLG_SPEED != null ? eng.SEFLG_SPEED : 256);
  const body = C.SE_BODY[planet];
  const res = eng.swe_calc_ut(jd, body, flags);
  // Native binding returns an object; the WASM build returns an array.
  const tropLon = res.longitude != null ? res.longitude : res.x != null ? res.x[0] : res[0];
  const speed = res.longitudeSpeed != null ? res.longitudeSpeed : res.x != null ? res.x[3] : res[3] || 0;
  const sidLon = norm360(tropLon - eng.swe_get_ayanamsa_ut(jd));
  return { lon: sidLon, speed, retro: speed < 0 };
}

/** Sidereal ascendant (whole-sign system) for a JD + location. */
async function ascendant(jd, lat, lon) {
  const eng = await adapter.load();
  const res = eng.swe_houses(jd, lat, lon, 'W');
  const tropAsc = res.ascendant != null ? res.ascendant : res.ascmc ? res.ascmc[0] : res[1] && res[1][0];
  return norm360(tropAsc - eng.swe_get_ayanamsa_ut(jd));
}

/** Nakshatra + pada + nakshatra lord for a sidereal longitude. */
function nakshatraOf(lon) {
  const idx = Math.floor(norm360(lon) / C.NAKSHATRA_SPAN);
  const within = norm360(lon) - idx * C.NAKSHATRA_SPAN;
  const pada = Math.floor(within / C.PADA_SPAN) + 1;
  return {
    nakshatra: C.NAKSHATRAS[idx],
    index: idx,
    pada,
    lord: C.NAKSHATRA_DASHA_LORD[idx % 9],
  };
}

/** Whole-sign house of a longitude given the ascendant sign. */
function houseOf(lon, ascSign) {
  const sign = Math.floor(norm360(lon) / 30);
  return ((sign - ascSign + 12) % 12) + 1;
}

/** Dignity of a planet in a sign. */
function dignityOf(planet, sign) {
  if (C.EXALTATION[planet] === sign) return 'exalted';
  if (C.DEBILITATION[planet] === sign) return 'debilitated';
  if ((C.OWN_SIGNS[planet] || []).includes(sign)) return 'own';
  return 'neutral'; // friendly/enemy classification deferred — see references/jyotisha-fundamentals.md
}

/**
 * Varga sign for a given longitude and divisional chart.
 * Uses the standard divisor maps; D9/D10/D12/D30/D60 follow classical rules.
 */
function vargaSign(lon, vargaCode) {
  const D = C.VARGA_DIVISORS[vargaCode];
  if (!D) throw new Error(`Unknown varga ${vargaCode}`);
  const l = norm360(lon);
  const sign = Math.floor(l / 30);
  const within = l % 30;
  const part = Math.floor(within / (30 / D)); // 0-indexed division within the sign

  switch (vargaCode) {
    case 'D1':
      return sign;
    case 'D9': // Navamsa
      return (sign * 9 + part) % 12;
    case 'D10': // Dashamsa: odd signs from same sign, even signs from 9th
      return ((sign % 2 === 0 ? sign : (sign + 8) % 12) + part) % 12;
    case 'D12': // Dwadashamsa: from the sign itself
      return (sign + part) % 12;
    case 'D30': { // Trimsamsa: classical odd/even mapping
      const odd = sign % 2 === 0;
      const bands = odd
        ? [[5, 0], [10, 10], [18, 8], [25, 2], [30, 6]]   // Mars, Sat, Jup, Merc, Venus rulers' signs
        : [[5, 1], [12, 5], [20, 11], [25, 9], [30, 7]];
      for (const [edge, s] of bands) if (within < edge) return s;
      return sign;
    }
    default:
      // General rule for D2,D3,D4,D7,D16,D20,D24,D27,D60: count `part` signs from sign.
      return (sign + part) % 12;
  }
}

/** Houses aspected by a planet (Jyotisha graha drishti), as house numbers 1-12. */
function aspectedHouses(planetHouse, planet) {
  const counts = C.SPECIAL_ASPECTS[planet] || C.DEFAULT_ASPECT;
  return counts.map((c) => ((planetHouse - 1 + c - 1) % 12) + 1);
}

module.exports = {
  norm360, julianDayUT, gregorianToJD, ayanamsa, planetLongitude, ascendant,
  nakshatraOf, houseOf, dignityOf, vargaSign, aspectedHouses,
};
