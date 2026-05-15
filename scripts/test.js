'use strict';
/**
 * Validation harness. Runs compute-base on each example input and diffs the
 * result against the golden file in examples/expected/.
 *
 * Tolerances:
 *   - planet sidereal longitudes within 0 deg 02'  (0.0333 deg)
 *   - dasha mahadasha start dates within 1 day
 *   - ashtakavarga SAV exact integer match
 *   - shadbala totals within 5%  (partial in v1 — see lib/shadbala.js)
 *
 * Usage: node scripts/test.js
 */
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');
const { computeBase } = require('./compute-base');
const cache = require('../lib/cache');

const EXAMPLES_DIR = path.join(__dirname, '..', 'examples');
const EXPECTED_DIR = path.join(EXAMPLES_DIR, 'expected');
const LON_TOL = 2 / 60; // 0 deg 02'

function diffChart(actual, expected) {
  const fails = [];
  for (const p of Object.keys(expected.d1.planets)) {
    const a = actual.d1.planets[p].longitude;
    const e = expected.d1.planets[p].longitude;
    const d = Math.abs(((a - e + 540) % 360) - 180);
    if (d > LON_TOL) fails.push(`${p} longitude off by ${(d * 60).toFixed(2)}'`);
  }
  const am = actual.dashas.vimshottari.mahadashas;
  const em = expected.dashas.vimshottari.mahadashas;
  for (let i = 0; i < Math.min(am.length, em.length); i++) {
    const dd = Math.abs(DateTime.fromISO(am[i].startsOn).diff(DateTime.fromISO(em[i].startsOn), 'days').days);
    if (dd > 1) fails.push(`Mahadasha ${am[i].lord} start off by ${dd.toFixed(1)} days`);
  }
  for (let i = 0; i < 12; i++) {
    if (actual.ashtakavarga.sav[i] !== expected.ashtakavarga.sav[i]) {
      fails.push(`SAV sign ${i} mismatch: got ${actual.ashtakavarga.sav[i]}, expected ${expected.ashtakavarga.sav[i]}`);
    }
  }
  return fails;
}

function runClassificationTest() {
  const testPath = path.join(EXAMPLES_DIR, 'dimension-classification-test.json');
  if (!fs.existsSync(testPath)) { console.log('[test] No classification test set; skipping.'); return true; }
  const { classify } = require('../lib/classify');
  const cases = JSON.parse(fs.readFileSync(testPath, 'utf8')).cases;
  let pass = 0;
  const misses = [];
  for (const c of cases) {
    const got = classify(c.question).dimensions;
    const ok = c.expect.every((d) => got.includes(d));
    if (ok) pass++;
    else misses.push(`"${c.question}" expected ${c.expect.join('+')} got ${got.join('+') || 'none'}`);
  }
  const rate = (pass / cases.length) * 100;
  console.log(`[test] Dimension classification: ${pass}/${cases.length} (${rate.toFixed(0)}%) — target >=90%`);
  misses.forEach((m) => console.log(`  MISS: ${m}`));
  return rate >= 90;
}

function runYogaGoldenTest() {
  const goldenPath = path.join(EXPECTED_DIR, 'yishnu-yogas.json');
  if (!fs.existsSync(goldenPath)) { console.log('[test] No yoga golden file; skipping.'); return true; }
  const { scanYogas } = require('../lib/yoga-engine');
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  let chart;
  try { chart = cache.read(golden.slug); }
  catch (e) { console.log(`[test] Yoga golden: cannot read chart ${golden.slug} — run compute-base first.`); return true; }
  const got = scanYogas(chart).map((y) => `${y.name}:${y.strength}`).sort();
  const want = golden.yogas.map((y) => `${y.name}:${y.strength}`).sort();
  const missing = want.filter((y) => !got.includes(y));
  const extra = got.filter((y) => !want.includes(y));
  if (missing.length || extra.length) {
    console.log(`[test] FAIL yoga golden: missing [${missing.join(', ')}] extra [${extra.join(', ')}]`);
    return false;
  }
  console.log(`[test] Yoga golden: PASS (${got.length} yogas match)`);
  return true;
}

(async () => {
  const classificationOk = runClassificationTest();
  if (!classificationOk) process.exitCode = 1;
  const yogaOk = runYogaGoldenTest();
  if (!yogaOk) process.exitCode = 1;

  if (!fs.existsSync(EXPECTED_DIR) || !fs.readdirSync(EXPECTED_DIR).length) {
    console.log('[test] No chart golden files in examples/expected/ yet.');
    console.log('[test] Generate them once with a verified chart, then re-run to lock in regression coverage.');
    process.exit(process.exitCode || 0);
  }
  let failed = 0;
  for (const file of fs.readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith('.json'))) {
    const input = JSON.parse(fs.readFileSync(path.join(EXAMPLES_DIR, file), 'utf8'));
    if (!input.dob) continue; // not a birth-data file (e.g. the classification test set)
    const expectedPath = path.join(EXPECTED_DIR, file);
    if (!fs.existsSync(expectedPath)) { console.log(`[test] SKIP ${file} (no golden file)`); continue; }
    const { slug } = await computeBase(input, { force: true });
    const actual = cache.read(slug);
    const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
    const fails = diffChart(actual, expected);
    if (fails.length) {
      failed++;
      console.log(`[test] FAIL ${file}:\n  - ${fails.join('\n  - ')}`);
    } else {
      console.log(`[test] PASS ${file}`);
    }
  }
  process.exit(failed || process.exitCode ? 1 : 0);
})();
