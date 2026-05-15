'use strict';
/** Shared house-inspection helpers used by the dimension orchestrator. */
const C = require('./constants');

const MALEFICS = new Set(['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun']);

function signOfHouse(ascSignIndex, house) {
  return (ascSignIndex + house - 1) % 12;
}

function houseLord(chart, house) {
  const ascSign = chart.d1.ascendant.signIndex;
  const sign = signOfHouse(ascSign, house);
  const lord = C.SIGN_LORDS[sign];
  const lp = chart.d1.planets[lord];
  return { planet: lord, sign: C.SIGNS[sign], dignity: lp.dignity, house: lp.house };
}

function occupantsOf(chart, house) {
  return C.PLANETS
    .filter((p) => chart.d1.planets[p].house === house)
    .map((p) => ({ planet: p, dignity: chart.d1.planets[p].dignity, retrograde: chart.d1.planets[p].retrograde }));
}

function aspectsToHouse(chart, house) {
  return C.PLANETS.filter((p) => (chart.d1.aspects[p] || []).includes(house));
}

/** Coarse verdict from lord dignity + occupants + aspects. The agent refines. */
function verdictFor(lord, occupants, aspectsTo) {
  let score = 0;
  if (lord.dignity === 'exalted' || lord.dignity === 'own') score += 2;
  if (lord.dignity === 'debilitated') score -= 2;
  if ([6, 8, 12].includes(lord.house)) score -= 1;
  for (const o of occupants) {
    if (o.dignity === 'exalted' || o.dignity === 'own') score += 1;
    else if (o.dignity === 'debilitated') score -= 1;
    score += MALEFICS.has(o.planet) ? -0.5 : 0.5;
  }
  for (const a of aspectsTo) score += MALEFICS.has(a) ? -0.5 : 0.5;
  if (score >= 2) return 'strong';
  if (score >= 0.5) return 'moderate';
  if (score >= -1) return 'weak';
  return 'afflicted';
}

function inspectHouse(chart, house) {
  const lord = houseLord(chart, house);
  const occupants = occupantsOf(chart, house);
  const aspectsTo = aspectsToHouse(chart, house);
  return {
    house,
    sign: C.SIGNS[signOfHouse(chart.d1.ascendant.signIndex, house)],
    houseLord: lord,
    occupants,
    aspectsTo,
    verdict: verdictFor(lord, occupants, aspectsTo),
  };
}

/** Inspect the corresponding house in a varga chart (sign + occupants only). */
function inspectVargaHouse(vargaChart, house) {
  if (!vargaChart || vargaChart.error) return { error: vargaChart && vargaChart.error };
  const ascSign = vargaChart.ascendant.signIndex;
  const sign = (ascSign + house - 1) % 12;
  const occupants = C.PLANETS.filter((p) => vargaChart.planets[p].house === house);
  return { house, sign: C.SIGNS[sign], occupants };
}

module.exports = { signOfHouse, houseLord, occupantsOf, aspectsToHouse, verdictFor, inspectHouse, inspectVargaHouse, MALEFICS };
