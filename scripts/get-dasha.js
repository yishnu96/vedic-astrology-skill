'use strict';
/**
 * Return the active Maha/Antar/Pratyantar dasha for a person at a given date.
 * Usage: node scripts/get-dasha.js --person <slug> [--at YYYY-MM-DD]
 */
const cache = require('../lib/cache');
const { activeAt } = require('../lib/dasha');

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

function getDasha(slug, at) {
  const data = cache.read(slug);
  const date = at || new Date().toISOString().slice(0, 10);
  const active = activeAt(data.dashas.vimshottari, date);
  if (!active) throw new Error(`Date ${date} falls outside the computed dasha range.`);
  return { slug, at: date, active };
}

if (require.main === module) {
  const slug = arg('--person');
  if (!slug) { console.error('Usage: node scripts/get-dasha.js --person <slug> [--at YYYY-MM-DD]'); process.exit(1); }
  try {
    console.log(JSON.stringify(getDasha(slug, arg('--at')), null, 2));
  } catch (e) {
    console.error(JSON.stringify({ error: e.message }));
    process.exit(1);
  }
}

module.exports = { getDasha };
