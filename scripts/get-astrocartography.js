'use strict';
/**
 * Astrocartography: planetary lines (9 planets x 4 angles) with nearby cities and
 * effect text. Text output only — never renders a map. Call this ONLY for
 * location / love / career / property questions (see SKILL.md trigger rules).
 *
 * Line geometry: MC/IC lines are computed from each planet's natal right
 * ascension (longitude where the planet crosses the local meridian). AC/DC lines
 * are latitude-dependent curves; v1 approximates them as the MC longitude +/- 90
 * deg and flags `approximate: true`. Effects come from the bundled
 * interpretation table so agents never invent meanings.
 *
 * Usage: node scripts/get-astrocartography.js --person <slug> --scope local|international
 */
const fs = require('fs');
const path = require('path');
const cache = require('../lib/cache');
const C = require('../lib/constants');

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

const EFFECTS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'astrocartography-interpretations.json'), 'utf8'));

function loadCities() {
  const p = path.join(__dirname, '..', 'data', 'cities.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
}

function nearbyByLongitude(cities, targetLon, scope, countryHint) {
  const norm = ((targetLon % 360) + 360) % 360;
  const lon180 = norm > 180 ? norm - 360 : norm;
  let pool = cities;
  if (scope === 'local' && countryHint) pool = cities.filter((c) => c.country === countryHint);
  return pool
    .map((c) => ({ c, d: Math.abs(c.lon - lon180) }))
    .filter((x) => x.d < 8) // within ~8 deg longitude of the line
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .map((x) => [x.c.name, x.c.country].filter(Boolean).join(', '));
}

function getAstrocartography(slug, scope = 'international') {
  const data = cache.read(slug);
  const cities = loadCities();
  const countryHint = data.current_location_meta && data.current_location_meta.country;

  const lines = [];
  for (const planet of C.PLANETS) {
    const natalLon = data.d1.planets[planet].longitude;
    // Simplified: treat sidereal longitude as the meridian crossing reference.
    for (const angle of ['MC', 'IC', 'AC', 'DC']) {
      const offset = { MC: 0, IC: 180, AC: -90, DC: 90 }[angle];
      const lineLon = natalLon + offset;
      const effectEntry = (EFFECTS[planet] && EFFECTS[planet][angle]) || { effect: 'No interpretation available.' };
      lines.push({
        planet,
        angle,
        approximate: angle === 'AC' || angle === 'DC',
        nearby_places: nearbyByLongitude(cities, lineLon, scope, countryHint),
        effect: effectEntry.effect,
      });
    }
  }

  return {
    slug,
    scope,
    note: 'Line longitudes are simplified (sidereal-longitude reference). AC/DC are approximate. Use for directional guidance, not precise relocation.',
    lines,
  };
}

if (require.main === module) {
  const slug = arg('--person');
  if (!slug) { console.error('Usage: node scripts/get-astrocartography.js --person <slug> --scope local|international'); process.exit(1); }
  try {
    console.log(JSON.stringify(getAstrocartography(slug, arg('--scope') || 'international'), null, 2));
  } catch (e) {
    console.error(JSON.stringify({ error: e.message }));
    process.exit(1);
  }
}

module.exports = { getAstrocartography };
