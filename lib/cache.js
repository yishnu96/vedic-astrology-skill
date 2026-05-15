'use strict';
/** Per-person file cache. charts/<slug>.json. Compute once, reuse forever. */
const fs = require('fs');
const path = require('path');

const CHARTS_DIR = path.join(__dirname, '..', 'charts');

function slugify(name, dob) {
  return `${String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}_${dob}`;
}

function cachePath(slug) {
  return path.join(CHARTS_DIR, `${slug}.json`);
}

function exists(slug) {
  return fs.existsSync(cachePath(slug));
}

function read(slug) {
  const p = cachePath(slug);
  if (!fs.existsSync(p)) throw new Error(`No chart cached for "${slug}". Run compute-base.js first.`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function write(slug, data) {
  if (!fs.existsSync(CHARTS_DIR)) fs.mkdirSync(CHARTS_DIR, { recursive: true });
  fs.writeFileSync(cachePath(slug), JSON.stringify(data, null, 2));
  return cachePath(slug);
}

/** Merge a partial update into an existing cache file (used for lazy varga fill). */
function update(slug, patch) {
  const data = read(slug);
  Object.assign(data, patch);
  return { path: write(slug, data), data };
}

function listCachedPeople() {
  if (!fs.existsSync(CHARTS_DIR)) return [];
  return fs.readdirSync(CHARTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}

function clearCache(slug) {
  if (!slug) {
    listCachedPeople().forEach((s) => fs.unlinkSync(cachePath(s)));
    return;
  }
  if (exists(slug)) fs.unlinkSync(cachePath(slug));
}

module.exports = { CHARTS_DIR, slugify, cachePath, exists, read, write, update, listCachedPeople, clearCache };
