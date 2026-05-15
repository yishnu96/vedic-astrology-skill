'use strict';
/**
 * First-time computation for a person. Resolves geocoding if needed, computes the
 * full base bundle (D1, aspects, Vimshottari tree, shadbala, ashtakavarga,
 * karakamsha/swamsa, chalit, upagrahas), writes charts/<slug>.json.
 *
 * Usage: node scripts/compute-base.js --input birth-data.json [--force-recompute]
 */
const fs = require('fs');
const { DateTime } = require('luxon');
const astro = require('../lib/astro');
const cache = require('../lib/cache');
const adapter = require('../lib/sweph-adapter');
const C = require('../lib/constants');
const { buildDashaTree } = require('../lib/dasha');
const { geocode } = require('./geocode');
const { computeShadbala } = require('../lib/shadbala');
const { computeAshtakavarga } = require('../lib/ashtakavarga');

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}
const hasFlag = (flag) => process.argv.includes(flag);

async function computeBase(input, { force = false } = {}) {
  const warnings = [];
  const slug = cache.slugify(input.name, input.dob);
  if (cache.exists(slug) && !force) return { slug, cached: true, path: cache.cachePath(slug) };

  // --- Geocoding / timezone resolution ---
  let { lat, lon, tz } = input;
  let birthMeta = { pob: input.pob, lat, lon, tz, confidence: 'user-supplied' };
  if (lat == null || lon == null || tz == null) {
    const g = await geocode(input.pob);
    lat = lat != null ? lat : g.lat;
    lon = lon != null ? lon : g.lon;
    tz = tz != null ? tz : g.tz;
    birthMeta = { pob: input.pob, lat, lon, tz, resolved_name: g.resolved_name, confidence: g.confidence };
    if (g.candidates) {
      warnings.push(`Ambiguous place "${input.pob}" — multiple matches: ${g.candidates.join(' | ')}. Used first.`);
      birthMeta.candidates = g.candidates;
    }
  }
  if (typeof tz === 'string' && /^[+-]\d/.test(tz)) {
    warnings.push(`Timezone given as offset "${tz}" — historical DST may be wrong. Prefer an IANA zone name.`);
  }

  // current_location (for transits / astrocartography), cached separately.
  let currentLocationMeta = null;
  if (input.current_location) {
    try {
      const cg = await geocode(input.current_location);
      currentLocationMeta = { place: input.current_location, lat: cg.lat, lon: cg.lon, tz: cg.tz, confidence: cg.confidence };
    } catch (e) {
      warnings.push(`Could not geocode current_location "${input.current_location}": ${e.message}`);
    }
  }

  // --- Julian day ---
  const { utc, jd } = astro.julianDayUT(input.dob, input.tob, tz);

  // --- D1: ascendant + 9 planets ---
  const ascLon = await astro.ascendant(jd, lat, lon);
  const ascSign = Math.floor(ascLon / 30);
  const planets = {};
  for (const p of C.PLANETS) {
    const { lon: plon, speed, retro } = await astro.planetLongitude(jd, p);
    const sign = Math.floor(plon / 30);
    const nak = astro.nakshatraOf(plon);
    planets[p] = {
      longitude: plon,
      sign: C.SIGNS[sign],
      signIndex: sign,
      degreesInSign: +(plon % 30).toFixed(4),
      house: astro.houseOf(plon, ascSign),
      nakshatra: nak.nakshatra,
      pada: nak.pada,
      nakshatraLord: nak.lord,
      retrograde: p === 'Rahu' || p === 'Ketu' ? true : retro,
      dignity: ['Rahu', 'Ketu'].includes(p) ? 'n/a' : astro.dignityOf(p, sign),
      speed,
    };
  }

  // --- Planetary drishti ---
  const aspects = {};
  for (const p of C.PLANETS) {
    aspects[p] = astro.aspectedHouses(planets[p].house, p);
  }

  // --- Vimshottari dasha tree ---
  const dashaTree = buildDashaTree(planets.Moon.longitude, utc);

  // --- Shadbala + Ashtakavarga ---
  const shadbala = computeShadbala(planets, ascSign);
  const ashtakavarga = computeAshtakavarga(planets, ascSign);

  const bundle = {
    birth_input: input,
    birth_meta: birthMeta,
    current_location_meta: currentLocationMeta,
    d1: {
      ascendant: { longitude: ascLon, sign: C.SIGNS[ascSign], signIndex: ascSign, degreesInSign: +(ascLon % 30).toFixed(4) },
      planets,
      aspects,
    },
    dashas: { vimshottari: dashaTree },
    shadbala,
    ashtakavarga,
    karakamsha: { note: 'Jaimini karakamsha — derived from Atmakaraka navamsa sign. See references/jyotisha-fundamentals.md.', stub: true },
    swamsa: { note: 'Jaimini swamsa — lagna of the navamsa. See references/jyotisha-fundamentals.md.', stub: true },
    chalit: { note: 'Cuspal bhava chalit table. Stub — whole-sign houses used throughout v1.', stub: true },
    upagrahas: { note: 'Gulika, Mandi, and shadow upagrahas. Stub in v1.', stub: true },
    vargas: {}, // lazy-filled by compute-varga.js
    engine: adapter.getEngineName(),
    computed_at: new Date().toISOString(),
    ayanamsa: 'lahiri',
    house_system: 'whole-sign',
    node_type: 'true-node',
    birth_time_accuracy: input.birth_time_accuracy || 'exact',
    warnings,
  };

  const p = cache.write(slug, bundle);
  return { slug, cached: false, path: p, warnings };
}

if (require.main === module) {
  (async () => {
    const inputPath = arg('--input');
    if (!inputPath) { console.error('Usage: node scripts/compute-base.js --input <birth-data.json> [--force-recompute]'); process.exit(1); }
    const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    try {
      const r = await computeBase(input, { force: hasFlag('--force-recompute') });
      console.log(JSON.stringify(r, null, 2));
    } catch (e) {
      console.error(JSON.stringify({ error: e.message }));
      process.exit(1);
    }
  })();
}

module.exports = { computeBase };
