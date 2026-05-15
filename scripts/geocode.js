'use strict';
/**
 * Resolve a place string to { lat, lon, tz, resolved_name, confidence, candidates? }.
 * Cascade: Open-Meteo -> Nominatim -> bundled cities.json. No API keys.
 * Usage: node scripts/geocode.js --place "Bankura, West Bengal, India"
 */
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openMeteo(place) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.results || !data.results.length) return null;
  const r = data.results[0];
  return {
    lat: r.latitude,
    lon: r.longitude,
    tz: r.timezone, // IANA, e.g. "Asia/Kolkata"
    resolved_name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    confidence: 'open-meteo',
    candidates: data.results.length > 1
      ? data.results.map((c) => [c.name, c.admin1, c.country].filter(Boolean).join(', '))
      : undefined,
  };
}

async function nominatim(place) {
  await sleep(1100); // respect 1 req/sec policy
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=3&addressdetails=1`;
  const res = await fetch(url, { headers: { 'User-Agent': 'vedic-astrology-skill/1.0 (skills.sh)' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  const r = data[0];
  const lat = parseFloat(r.lat);
  const lon = parseFloat(r.lon);
  // Nominatim gives no timezone — resolve from coordinates.
  let tz = null;
  try {
    const { find } = require('geo-tz');
    tz = find(lat, lon)[0] || null;
  } catch (e) { /* geo-tz unavailable */ }
  return {
    lat, lon, tz,
    resolved_name: r.display_name,
    confidence: 'nominatim',
    candidates: data.length > 1 ? data.map((c) => c.display_name) : undefined,
  };
}

function offlineDB(place) {
  const dbPath = path.join(__dirname, '..', 'data', 'cities.json');
  if (!fs.existsSync(dbPath)) return null;
  const cities = JSON.parse(fs.readFileSync(dbPath, 'utf8')).filter((c) => c && c.name);
  const needle = place.toLowerCase().split(',')[0].trim();
  const hit = cities.find((c) => c.name.toLowerCase() === needle)
    || cities.find((c) => c.name.toLowerCase().includes(needle));
  if (!hit) return null;
  return {
    lat: hit.lat, lon: hit.lon, tz: hit.tz,
    resolved_name: [hit.name, hit.admin1, hit.country].filter(Boolean).join(', '),
    confidence: 'offline_db',
  };
}

async function geocode(place) {
  for (const fn of [openMeteo, nominatim]) {
    try {
      const r = await fn(place);
      if (r && r.lat != null && r.lon != null) return r;
    } catch (e) { /* try next */ }
  }
  const off = offlineDB(place);
  if (off) return off;
  throw new Error(`Could not resolve "${place}". Pass lat, lon, and tz (IANA zone like 'Asia/Kolkata') explicitly.`);
}

if (require.main === module) {
  const idx = process.argv.indexOf('--place');
  const place = idx >= 0 ? process.argv[idx + 1] : null;
  if (!place) { console.error('Usage: node scripts/geocode.js --place "<string>"'); process.exit(1); }
  geocode(place)
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => { console.error(JSON.stringify({ error: e.message })); process.exit(1); });
}

module.exports = { geocode };
