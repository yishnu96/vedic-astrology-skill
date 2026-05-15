'use strict';
/**
 * Dimension-router orchestrator. Classifies a natural-language question into
 * 1-3 of the 14 life dimensions, runs each dimension's classical recipe
 * (houses, lords, karakas, vargas, yogas, durability, dasha, transit,
 * astrocartography), and returns a structured DimensionalReading the agent
 * turns into prose.
 *
 * Usage: node scripts/answer-question.js --person <slug> --question "<text>" [--max-dimensions 3]
 */
const cache = require('../lib/cache');
const C = require('../lib/constants');
const { DIMENSIONS } = require('../lib/dimensions');
const { classify } = require('../lib/classify');
const { scanYogas } = require('../lib/yoga-engine');
const R = require('../lib/reading');
const jaimini = require('../lib/jaimini');
const { computeVarga } = require('./compute-varga');
const { getDasha } = require('./get-dasha');
const { getTransit } = require('./get-transit');
const { getAstrocartography } = require('./get-astrocartography');

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

function ensureVarga(slug, code) {
  if (!code) return null;
  try { return computeVarga(slug, code).chart; }
  catch (e) { return { error: e.message }; }
}

// Decide whether a location question warrants astrocartography for this dimension.
function astroTriggered(dimCfg, question) {
  const trig = (dimCfg.astrocartography || '').toLowerCase();
  if (trig.startsWith('always')) return true;
  const locationLanguage = /\b(where|which (city|country|place)|relocat|move|abroad|foreign|location|city|country)\b/i.test(question);
  if (trig.startsWith('not ') || trig.startsWith('rarely') || trig.startsWith('generally not')) {
    return /\b(where|which (city|country|place)|relocat|move to|abroad|foreign)\b/i.test(question);
  }
  return locationLanguage;
}

function birthTimeConfidenceWarning(chart, dimCfg) {
  const acc = chart.birth_time_accuracy || 'exact';
  if (acc === 'exact') return null;
  return `Birth time accuracy is "${acc}". ${dimCfg.confidence}`;
}

// --- meta-dimension: timing ---
async function buildTimingReading(slug, chart) {
  const today = new Date().toISOString().slice(0, 10);
  const activeDasha = getDasha(slug, today).active;
  const transits = await getTransit(slug, '3y');
  const md = chart.dashas.vimshottari.mahadashas;
  const horizon = addYears(today, 3);
  const upcomingDashaChanges = md
    .filter((m) => m.startsOn > today && m.startsOn < horizon)
    .map((m) => ({ lord: m.lord, startsOn: m.startsOn }));

  const buckets = { '0-3mo': [], '3-12mo': [], '12-24mo': [], '24-36mo': [] };
  for (const ev of transits.events) {
    const months = monthsBetween(today, ev.date);
    if (months <= 3) buckets['0-3mo'].push(ev);
    else if (months <= 12) buckets['3-12mo'].push(ev);
    else if (months <= 24) buckets['12-24mo'].push(ev);
    else buckets['24-36mo'].push(ev);
  }
  return {
    dimension: 'timing',
    meta: true,
    current_dasha: activeDasha,
    sade_sati: transits.sade_sati,
    upcoming_dasha_changes: upcomingDashaChanges,
    timeline: Object.entries(buckets).map(([window, events]) => ({
      window,
      event_count: events.length,
      key_events: events.filter((e) => ['Saturn', 'Jupiter', 'Rahu', 'Ketu'].includes(e.planet)).slice(0, 8),
    })),
    note: 'Apply this timeline as an overlay on any life-dimension reading the user also asked about.',
  };
}

function addYears(iso, n) {
  const d = new Date(iso); d.setFullYear(d.getFullYear() + n); return d.toISOString().slice(0, 10);
}
function monthsBetween(a, b) {
  return (new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24 * 30.44);
}

// --- a single life-dimension reading ---
async function buildDimensionReading(slug, chart, dimId, question) {
  const cfg = DIMENSIONS[dimId];

  if (cfg.metaDimension) return buildTimingReading(slug, chart);

  const warnings = [];
  const accuracy = chart.birth_time_accuracy || 'exact';

  // Karma dimension: refuse without an exact birth time.
  if (cfg.requiresExactBirthTime && accuracy !== 'exact') {
    return {
      dimension: dimId,
      refused: true,
      warning: `Deep-karma (D60) analysis requires an exact birth time. Yours is recorded as "${accuracy}". Even a 5-minute error makes the D60 unreliable, so I won't give specific past-life findings. Consider birth-time rectification first.`,
    };
  }

  // --- D1 findings ---
  const primary = {};
  for (const h of cfg.primaryHouses) primary[`${h}th`] = R.inspectHouse(chart, h);
  const secondary = {};
  for (const h of cfg.secondaryHouses) secondary[`${h}th`] = R.inspectHouse(chart, h);

  const karakaSet = [...cfg.karakas.primary, ...cfg.karakas.secondary];
  const charaKarakas = jaimini.charaKarakas(chart.d1.planets);
  const karakas = {};
  for (const k of karakaSet) {
    if (!chart.d1.planets[k]) continue;
    karakas[k] = {
      sign: chart.d1.planets[k].sign,
      house: chart.d1.planets[k].house,
      dignity: chart.d1.planets[k].dignity,
      role: (C.KARAKAS[k] || []).join(', '),
    };
  }
  const jaiminiKarakas = {};
  for (const jk of cfg.karakas.jaimini) {
    const planet = charaKarakas[jk];
    jaiminiKarakas[jk] = { planet, sign: chart.d1.planets[planet].sign, house: chart.d1.planets[planet].house };
  }

  // --- varga findings ---
  const vargaFindings = {};
  const mainVarga = ensureVarga(slug, cfg.mainVarga);
  if (mainVarga && !mainVarga.error && cfg.mainVarga !== 'D1') {
    const vargaHouses = {};
    for (const h of cfg.primaryHouses) vargaHouses[`${h}th`] = R.inspectVargaHouse(mainVarga, h);
    vargaFindings[cfg.mainVarga] = {
      ascendant: mainVarga.ascendant,
      houses: vargaHouses,
      note: `Does the ${cfg.mainVarga} confirm the D1 promise for ${cfg.name}?`,
    };
  } else if (mainVarga && mainVarga.error) {
    warnings.push(`Could not compute ${cfg.mainVarga}: ${mainVarga.error}`);
  }
  for (const sv of cfg.supportingVargas) {
    if (sv === 'D1') continue;
    const vc = ensureVarga(slug, sv);
    if (vc && !vc.error) vargaFindings[sv] = { ascendant: vc.ascendant, computed: true };
  }

  // --- durability ---
  const durability = {};
  for (const dv of cfg.durabilityVargas) {
    const vc = ensureVarga(slug, dv);
    durability[dv] = vc && !vc.error ? { ascendant: vc.ascendant, computed: true } : { error: vc && vc.error };
  }

  // --- karmic depth (D60) ---
  let karmicDepth = null;
  if (cfg.karmicVarga) {
    const vc = ensureVarga(slug, cfg.karmicVarga);
    karmicDepth = {
      [cfg.karmicVarga]: vc && !vc.error ? { ascendant: vc.ascendant, computed: true } : { error: vc && vc.error },
      confidence: accuracy === 'exact' ? 'high' : 'low',
      confidence_note: accuracy === 'exact' ? null : `Birth time "${accuracy}" — treat D60 findings as tentative.`,
    };
  }

  // --- yoga scan ---
  const yogasDetected = scanYogas(chart, dimId);

  // --- timing: dasha + transit ---
  const today = new Date().toISOString().slice(0, 10);
  const activeDasha = getDasha(slug, today).active;
  const transits = await getTransit(slug, '2y');

  const dimensionLords = resolveDimensionLords(chart, cfg);
  const nextWindow = findNextWindow(chart, today, dimensionLords);

  // --- event-style (obstacles): markers -> dasha -> transit ---
  let eventAnalysis = null;
  if (cfg.eventStyle) {
    eventAnalysis = buildEventAnalysis(chart, cfg, activeDasha, transits);
  }

  // --- astrocartography ---
  let astrocartography = null;
  if (astroTriggered(cfg, question)) {
    astrocartography = getAstrocartography(slug, /\b(local|within (my|the) country)\b/i.test(question) ? 'local' : 'international');
  }

  // --- extras (fertility sphutas, etc.) ---
  const extras = {};
  if ((cfg.extras || []).includes('fertilitySphutas')) {
    extras.fertilitySphutas = jaimini.fertilitySphutas(chart.d1.planets);
  }

  const btWarning = birthTimeConfidenceWarning(chart, cfg);
  if (btWarning) warnings.push(btWarning);
  if (cfg.ethicsCritical) {
    warnings.push('ETHICS: Frame difficult findings with mitigation, never as fate. Never predict death, terminal illness, or certain catastrophe — use "elevated risk supported by care" language.');
  }

  return {
    dimension: dimId,
    dimension_name: cfg.name,
    d1_findings: { primary_houses: primary, secondary_houses: secondary, karakas, jaimini_karakas: jaiminiKarakas },
    varga_findings: vargaFindings,
    yogas_detected: yogasDetected,
    durability,
    karmic_depth: karmicDepth,
    timing: {
      current_dasha: activeDasha,
      dimension_dasha_lords: dimensionLords,
      next_window_for_dimension: nextWindow,
      transit_alerts: transits.events.filter((e) => ['Saturn', 'Jupiter', 'Rahu', 'Ketu'].includes(e.planet)).slice(0, 12),
      sade_sati: transits.sade_sati,
      transit_trigger_rules: cfg.transitTriggers,
    },
    event_analysis: eventAnalysis,
    astrocartography,
    extras: Object.keys(extras).length ? extras : null,
    warnings,
  };
}

// Resolve the dimension's "dashaLords" descriptors into actual planet names.
function resolveDimensionLords(chart, cfg) {
  const lords = new Set();
  const ck = jaimini.charaKarakas(chart.d1.planets);
  for (const desc of cfg.dashaLords) {
    const m = desc.match(/^(\d+)(st|nd|rd|th) lord$/);
    if (m) { lords.add(R.houseLord(chart, Number(m[1])).planet); continue; }
    const occ = desc.match(/^(\d+)(st|nd|rd|th) occupants$/);
    if (occ) { R.occupantsOf(chart, Number(occ[1])).forEach((o) => lords.add(o.planet)); continue; }
    if (C.PLANETS.includes(desc)) { lords.add(desc); continue; }
    if (desc.startsWith('malefics in')) {
      for (const h of [6, 8, 12]) R.occupantsOf(chart, h).forEach((o) => {
        if (['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'].includes(o.planet)) lords.add(o.planet);
      });
      continue;
    }
    if (ck[desc]) lords.add(ck[desc]);
  }
  return [...lords];
}

// Find the next Maha/Antar period whose lord activates the dimension.
function findNextWindow(chart, today, dimensionLords) {
  const set = new Set(dimensionLords);
  for (const md of chart.dashas.vimshottari.mahadashas) {
    if (md.endsOn < today) continue;
    for (const ad of md.antardashas) {
      if (ad.endsOn < today) continue;
      if (set.has(md.lord) || set.has(ad.lord)) {
        return {
          start: ad.startsOn > today ? ad.startsOn : today,
          end: ad.endsOn,
          trigger: `${md.lord} mahadasha / ${ad.lord} antardasha — ${set.has(md.lord) ? md.lord : ad.lord} activates this dimension`,
        };
      }
    }
  }
  return null;
}

// Obstacles dimension: D1 markers -> activating dasha -> transit window.
function buildEventAnalysis(chart, cfg, activeDasha, transits) {
  const markerPlanets = cfg.karakas.primary;
  const markers = [];
  for (const h of cfg.primaryHouses) {
    const insp = R.inspectHouse(chart, h);
    const malefic = insp.occupants.filter((o) => markerPlanets.includes(o.planet));
    const malAspect = insp.aspectsTo.filter((a) => markerPlanets.includes(a));
    if (malefic.length || malAspect.length || insp.houseLord.dignity === 'debilitated') {
      markers.push({ house: h, occupants: malefic, aspectedBy: malAspect, lord: insp.houseLord });
    }
  }
  if (!markers.length) {
    return { markersPresent: false, verdict: 'no significant markers',
      note: 'D1 shows no markers for this event class. Report this plainly — do not drill into dasha/transit.' };
  }
  const markerLords = new Set();
  markers.forEach((m) => {
    markerLords.add(m.lord.planet);
    m.occupants.forEach((o) => markerLords.add(o.planet));
    m.aspectedBy.forEach((a) => markerLords.add(a));
  });
  const activeNow = [...markerLords].includes(activeDasha.maha) || [...markerLords].includes(activeDasha.antar);
  const windows = transits.events
    .filter((e) => e.type === 'ingress' && ['Mars', 'Saturn', 'Rahu', 'Ketu'].includes(e.planet)
      && cfg.primaryHouses.includes(e.house_from_lagna))
    .map((e) => ({ label: 'elevated-risk window', from: e.date, reason: `${e.planet} transits the ${e.house_from_lagna}th from lagna` }));
  return {
    markersPresent: true,
    markers,
    activating_dasha_lords: [...markerLords],
    activating_dasha_currently_running: activeNow,
    windows,
    note: 'Cross-reference activating dasha lords with the transit windows. Report elevated-risk windows with reasons + mitigation. Never a bare yes/no, never a certainty.',
  };
}

function synthesisHint(question, readings) {
  const parts = readings.map((r) => {
    if (r.refused) return `${r.dimension}: refused (needs exact birth time)`;
    if (r.meta) return `timing: current dasha ${r.current_dasha.maha}-${r.current_dasha.antar}, sade-sati ${typeof r.sade_sati === 'string' ? r.sade_sati : 'active'}`;
    const yogaNames = (r.yogas_detected || []).map((y) => `${y.name} (${y.strength})`).slice(0, 5);
    const win = r.timing && r.timing.next_window_for_dimension;
    return `${r.dimension}: ${yogaNames.length ? 'yogas — ' + yogaNames.join(', ') + '; ' : ''}${win ? 'next activating window ' + win.start + ' to ' + win.end : 'no clear activating window in range'}`;
  });
  return `Question: "${question}". ${parts.join(' | ')}. Synthesize in classical order per dimension (D1 promise -> main varga -> D27/D30 -> D60 -> dasha/transit), name conflicts between charts honestly, and frame any difficult finding with mitigation.`;
}

async function answerQuestion(slug, question, maxDimensions = 3) {
  const chart = cache.read(slug);
  const cls = classify(question, maxDimensions);

  if (cls.confidence === 'none' || (cls.confidence === 'low' && cls.dimensions.length === 0)) {
    return { question, classified_dimensions: [], confidence: cls.confidence,
      clarification_needed: cls.clarification, warnings: [] };
  }

  const readings = [];
  for (const dimId of cls.dimensions) {
    readings.push(await buildDimensionReading(slug, chart, dimId, question));
  }

  return {
    question,
    classified_dimensions: cls.dimensions,
    confidence: cls.confidence,
    classification_scores: cls.scores,
    clarification_needed: cls.clarification || null,
    warnings: [],
    readings,
    synthesis_hint: synthesisHint(question, readings),
  };
}

if (require.main === module) {
  const slug = arg('--person');
  const question = arg('--question');
  if (!slug || !question) {
    console.error('Usage: node scripts/answer-question.js --person <slug> --question "<text>" [--max-dimensions 3]');
    process.exit(1);
  }
  const maxDim = Number(arg('--max-dimensions')) || 3;
  answerQuestion(slug, question, maxDim)
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => { console.error(JSON.stringify({ error: e.message })); process.exit(1); });
}

module.exports = { answerQuestion };
