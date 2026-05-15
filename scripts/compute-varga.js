'use strict';
/**
 * Compute one divisional chart and append it to the person's cache under `vargas`.
 * Lazy: only runs when a topic needs it. Re-uses the cached D1 longitudes.
 *
 * Usage: node scripts/compute-varga.js --person <slug> --varga D9 [--force-recompute]
 */
const cache = require('../lib/cache');
const astro = require('../lib/astro');
const C = require('../lib/constants');

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

function computeVarga(slug, vargaCode, { force = false } = {}) {
  const data = cache.read(slug);
  if (!C.VARGA_DIVISORS[vargaCode]) throw new Error(`Unknown varga "${vargaCode}". Valid: ${Object.keys(C.VARGA_DIVISORS).join(', ')}`);
  if (data.vargas[vargaCode] && !force) return { slug, varga: vargaCode, cached: true, chart: data.vargas[vargaCode] };

  // Ascendant longitude -> varga ascendant sign.
  const ascVargaSign = astro.vargaSign(data.d1.ascendant.longitude, vargaCode);

  const planets = {};
  for (const p of C.PLANETS) {
    const lon = data.d1.planets[p].longitude;
    const vSign = astro.vargaSign(lon, vargaCode);
    planets[p] = {
      sign: C.SIGNS[vSign],
      signIndex: vSign,
      house: ((vSign - ascVargaSign + 12) % 12) + 1,
      dignity: ['Rahu', 'Ketu'].includes(p) ? 'n/a' : astro.dignityOf(p, vSign),
      retrograde: data.d1.planets[p].retrograde,
    };
  }

  const aspects = {};
  for (const p of C.PLANETS) aspects[p] = astro.aspectedHouses(planets[p].house, p);

  const chart = {
    ascendant: { sign: C.SIGNS[ascVargaSign], signIndex: ascVargaSign },
    planets,
    aspects,
    divisor: C.VARGA_DIVISORS[vargaCode],
  };

  data.vargas[vargaCode] = chart;
  cache.write(slug, data);
  return { slug, varga: vargaCode, cached: false, chart };
}

if (require.main === module) {
  const slug = arg('--person');
  const varga = arg('--varga');
  if (!slug || !varga) { console.error('Usage: node scripts/compute-varga.js --person <slug> --varga D9'); process.exit(1); }
  try {
    console.log(JSON.stringify(computeVarga(slug, varga, { force: process.argv.includes('--force-recompute') }), null, 2));
  } catch (e) {
    console.error(JSON.stringify({ error: e.message }));
    process.exit(1);
  }
}

module.exports = { computeVarga };
