'use strict';
/**
 * Transit scan over a window. Tracks all 9 planets, relative to BOTH the natal
 * D1 ascendant and the natal Moon (Chandra lagna). Flags sign ingresses,
 * retrograde stations, Sade-sati, and Saturn/Jupiter contacts on natal planets.
 *
 * Usage: node scripts/get-transit.js --person <slug> [--window 2y]
 */
const { DateTime } = require('luxon');
const cache = require('../lib/cache');
const astro = require('../lib/astro');
const C = require('../lib/constants');

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

function parseWindow(w) {
  const m = /^(\d+(?:\.\d+)?)\s*y$/i.exec(w || '2y');
  const years = m ? parseFloat(m[1]) : 2;
  return Math.min(years, 3); // max 3 years
}

async function getTransit(slug, windowStr) {
  const data = cache.read(slug);
  const years = parseWindow(windowStr);
  const ascSign = data.d1.ascendant.signIndex;
  const moonSign = data.d1.planets.Moon.signIndex;

  const start = DateTime.utc().startOf('day');
  const end = start.plus({ days: Math.round(years * 365.2425) });

  const natal = {};
  for (const p of C.PLANETS) natal[p] = data.d1.planets[p].longitude;

  const events = [];
  const prev = {};
  const SLOW = new Set(['Jupiter', 'Saturn', 'Rahu', 'Ketu']);

  for (let cursor = start; cursor <= end; cursor = cursor.plus({ days: 1 })) {
    const jd = astro.gregorianToJD(cursor);
    for (const p of C.PLANETS) {
      const { lon, retro } = await astro.planetLongitude(jd, p);
      const sign = Math.floor(lon / 30);
      const pr = prev[p];
      if (pr) {
        if (sign !== pr.sign) {
          events.push({
            type: 'ingress', planet: p, date: cursor.toISODate(),
            enters: C.SIGNS[sign],
            house_from_lagna: ((sign - ascSign + 12) % 12) + 1,
            house_from_moon: ((sign - moonSign + 12) % 12) + 1,
          });
        }
        if (retro !== pr.retro && !['Rahu', 'Ketu'].includes(p)) {
          events.push({
            type: retro ? 'retrograde-station' : 'direct-station',
            planet: p, date: cursor.toISODate(), sign: C.SIGNS[sign],
          });
        }
        if (SLOW.has(p) && cursor.day === 1) {
          for (const np of C.PLANETS) {
            const orb = Math.abs(((lon - natal[np] + 540) % 360) - 180);
            if (orb < 1) {
              events.push({
                type: 'contact', planet: p, over: `natal ${np}`,
                date: cursor.toISODate(), orb_deg: +orb.toFixed(2),
              });
            }
          }
        }
      }
      prev[p] = { sign, retro };
    }
  }

  const satIngress = events.filter((e) => e.type === 'ingress' && e.planet === 'Saturn');
  const sadeSati = satIngress
    .filter((e) => [12, 1, 2].includes(e.house_from_moon))
    .map((e) => ({ phase: e.house_from_moon === 12 ? 'rising' : e.house_from_moon === 1 ? 'peak' : 'setting', from: e.date, sign: e.enters }));

  return {
    slug,
    window: { from: start.toISODate(), to: end.toISODate(), years },
    relative_to: { lagna: C.SIGNS[ascSign], chandra_lagna: C.SIGNS[moonSign] },
    events,
    sade_sati: sadeSati.length ? sadeSati : 'not active in window',
  };
}

if (require.main === module) {
  const slug = arg('--person');
  if (!slug) { console.error('Usage: node scripts/get-transit.js --person <slug> [--window 2y]'); process.exit(1); }
  getTransit(slug, arg('--window'))
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => { console.error(JSON.stringify({ error: e.message })); process.exit(1); });
}

module.exports = { getTransit };
