'use strict';
/** Vimshottari dasha: Mahadasha -> Antardasha -> Pratyantardasha. */
const { DateTime } = require('luxon');
const C = require('./constants');

const YEAR_DAYS = 365.2425;

/** Order the 9 dasha lords starting from `startLord`. */
function sequenceFrom(startLord) {
  const i = C.DASHA_SEQUENCE.indexOf(startLord);
  return C.DASHA_SEQUENCE.slice(i).concat(C.DASHA_SEQUENCE.slice(0, i));
}

/**
 * Build the full dasha tree.
 * @param moonLon sidereal longitude of the natal Moon
 * @param birthUTC luxon DateTime (UTC) of birth
 */
function buildDashaTree(moonLon, birthUTC) {
  const nakIndex = Math.floor(((moonLon % 360) + 360) % 360 / C.NAKSHATRA_SPAN);
  const within = (((moonLon % 360) + 360) % 360) - nakIndex * C.NAKSHATRA_SPAN;
  const fraction = within / C.NAKSHATRA_SPAN; // portion of current nakshatra elapsed

  const startLord = C.NAKSHATRA_DASHA_LORD[nakIndex % 9];
  const seq = sequenceFrom(startLord);

  // First mahadasha is partially elapsed at birth.
  const firstFullYears = C.DASHA_YEARS[startLord];
  const elapsedYears = firstFullYears * fraction;

  let cursor = birthUTC.minus({ days: elapsedYears * YEAR_DAYS });
  const mahadashas = [];

  for (let cycle = 0; cycle < 1; cycle++) {
    for (const lord of seq) {
      const years = C.DASHA_YEARS[lord];
      const start = cursor;
      const end = cursor.plus({ days: years * YEAR_DAYS });
      mahadashas.push({
        lord,
        years,
        startsOn: start.toISODate(),
        endsOn: end.toISODate(),
        antardashas: buildAntardashas(lord, start, years),
      });
      cursor = end;
    }
  }
  return { startNakshatra: C.NAKSHATRAS[nakIndex], startLord, mahadashas };
}

function buildAntardashas(mahaLord, mahaStart, mahaYears) {
  const seq = sequenceFrom(mahaLord);
  let cursor = mahaStart;
  const out = [];
  for (const lord of seq) {
    const years = (mahaYears * C.DASHA_YEARS[lord]) / 120;
    const start = cursor;
    const end = cursor.plus({ days: years * YEAR_DAYS });
    out.push({
      lord,
      startsOn: start.toISODate(),
      endsOn: end.toISODate(),
      pratyantardashas: buildPratyantardashas(lord, start, years),
    });
    cursor = end;
  }
  return out;
}

function buildPratyantardashas(antarLord, antarStart, antarYears) {
  const seq = sequenceFrom(antarLord);
  let cursor = antarStart;
  const out = [];
  for (const lord of seq) {
    const years = (antarYears * C.DASHA_YEARS[lord]) / 120;
    const start = cursor;
    const end = cursor.plus({ days: years * YEAR_DAYS });
    out.push({ lord, startsOn: start.toISODate(), endsOn: end.toISODate() });
    cursor = end;
  }
  return out;
}

/** Find the active Maha/Antar/Pratyantar on a given ISO date. */
function activeAt(tree, isoDate) {
  const t = DateTime.fromISO(isoDate);
  const within = (a, b) => t >= DateTime.fromISO(a) && t < DateTime.fromISO(b);
  for (const md of tree.mahadashas) {
    if (!within(md.startsOn, md.endsOn)) continue;
    for (const ad of md.antardashas) {
      if (!within(ad.startsOn, ad.endsOn)) continue;
      for (const pd of ad.pratyantardashas) {
        if (within(pd.startsOn, pd.endsOn)) {
          return { maha: md.lord, antar: ad.lord, pratyantar: pd.lord, startsOn: pd.startsOn, endsOn: pd.endsOn, mahaEndsOn: md.endsOn, antarEndsOn: ad.endsOn };
        }
      }
    }
  }
  return null;
}

module.exports = { buildDashaTree, activeAt, sequenceFrom };
