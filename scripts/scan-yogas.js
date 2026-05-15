'use strict';
/**
 * Detect classical yogas in a cached chart. With --dimension, returns only the
 * yogas relevant to that life dimension; otherwise returns all detected yogas.
 *
 * Usage: node scripts/scan-yogas.js --person <slug> [--dimension career]
 */
const cache = require('../lib/cache');
const { scanYogas } = require('../lib/yoga-engine');

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

if (require.main === module) {
  const slug = arg('--person');
  if (!slug) { console.error('Usage: node scripts/scan-yogas.js --person <slug> [--dimension <dim>]'); process.exit(1); }
  try {
    const chart = cache.read(slug);
    const dimension = arg('--dimension');
    const yogas = scanYogas(chart, dimension);
    console.log(JSON.stringify({ slug, dimension: dimension || 'all', count: yogas.length, yogas }, null, 2));
  } catch (e) {
    console.error(JSON.stringify({ error: e.message }));
    process.exit(1);
  }
}
