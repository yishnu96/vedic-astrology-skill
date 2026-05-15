'use strict';
/**
 * Data-driven yoga detector. Reads declarative rules from data/yoga-library.json
 * and evaluates them against a cached chart. Genuinely complex yogas
 * (Dhana family, Vipreet Raja, Neecha Bhanga, Mangal Dosha, Kaal Sarp, etc.)
 * route through detection_rule.custom to a dedicated function below.
 *
 * Input `chart` is the cached charts/<slug>.json object. We read chart.d1.
 */
const fs = require('fs');
const path = require('path');
const C = require('./constants');

const LIBRARY = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'yoga-library.json'), 'utf8'));

const BENEFICS = new Set(['Jupiter', 'Venus', 'Mercury', 'Moon']);
const MALEFICS = new Set(['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu']);
const KENDRAS = [1, 4, 7, 10];
const TRIKONAS = [1, 5, 9];
const DUSTHANAS = [6, 8, 12];

// --- chart accessors ---
function ctx(chart) {
  const d1 = chart.d1;
  const ascSign = d1.ascendant.signIndex;
  const P = d1.planets;
  const signOfHouse = (h) => (ascSign + h - 1) % 12;
  const houseLord = (h) => C.SIGN_LORDS[signOfHouse(h)];
  const lordHouse = (h) => P[houseLord(h)].house;
  const planetsInHouse = (h) => C.PLANETS.filter((p) => P[p].house === h);
  const houseOf = (p) => P[p].house;
  const dignityOf = (p) => P[p].dignity;
  const isStrong = (p) => ['exalted', 'own'].includes(P[p].dignity);
  // does planet p aspect house h (uses cached graha drishti)?
  const aspectsHouse = (p, h) => (d1.aspects[p] || []).includes(h);
  // houses-from: house number of sign s counted from reference house
  const houseFrom = (refHouse, count) => ((refHouse - 1 + count - 1) % 12) + 1;
  return { d1, ascSign, P, signOfHouse, houseLord, lordHouse, planetsInHouse, houseOf, dignityOf, isStrong, aspectsHouse, houseFrom };
}

// --- declarative rule evaluators ---

function evalKendraFromMoon(rule, x) {
  const moonHouse = x.houseOf('Moon');
  for (const pl of rule.planets) {
    const ph = x.houseOf(pl);
    const diff = ((ph - moonHouse + 12) % 12) + 1;
    if (KENDRAS.includes(diff)) {
      const afflicted = x.P[pl].dignity === 'debilitated' || x.P.Moon.dignity === 'debilitated';
      return { matched: true, strength: afflicted ? 'weak' : (x.isStrong(pl) ? 'strong' : 'medium'),
        detail: `${pl} in house ${diff} from Moon` };
    }
  }
  return { matched: false };
}

function evalConjunction(rule, x) {
  // single planet set, or pairs
  const pairs = rule.planets_pairs || (rule.planets ? [rule.planets] : []);
  for (const grp of pairs) {
    const houses = grp.map((p) => x.houseOf(p));
    const sameHouse = houses.every((h) => h === houses[0]);
    if (sameHouse) {
      if (rule.houses && !rule.houses.includes(houses[0])) continue;
      const allStrong = grp.every((p) => x.isStrong(p));
      return { matched: true, strength: allStrong ? 'strong' : 'medium', detail: `${grp.join(' + ')} conjunct in house ${houses[0]}` };
    }
    if (rule.allow_aspect) {
      // mutual aspect: does one aspect the other's house?
      if (x.aspectsHouse(grp[0], houses[1]) || x.aspectsHouse(grp[1], houses[0])) {
        return { matched: true, strength: 'weak', detail: `${grp.join(' + ')} in mutual aspect` };
      }
    }
  }
  return { matched: false };
}

function evalPlanetsInHouses(rule, x) {
  const list = rule.planets_all || rule.planets_any;
  const inHouses = list.filter((p) => rule.houses.includes(x.houseOf(p)));
  const need = rule.min_count || list.length;
  if (inHouses.length >= need) {
    const allStrong = inHouses.every((p) => x.isStrong(p));
    const anyAfflicted = inHouses.some((p) => x.P[p].dignity === 'debilitated');
    return { matched: true, strength: anyAfflicted ? 'weak' : (allStrong ? 'strong' : 'medium'),
      detail: `${inHouses.join(', ')} in houses ${rule.houses.join('/')}` };
  }
  return { matched: false };
}

function evalPlanetInHouses(rule, x) {
  const ph = x.houseOf(rule.planet);
  if (rule.houses.includes(ph)) {
    return { matched: true, strength: x.isStrong(rule.planet) ? 'strong' : 'medium', detail: `${rule.planet} in house ${ph}` };
  }
  return { matched: false };
}

function evalDignityInKendra(rule, x) {
  const p = rule.planet;
  if (KENDRAS.includes(x.houseOf(p)) && x.isStrong(p)) {
    const strength = x.dignityOf(p) === 'exalted' ? 'strong' : 'medium';
    return { matched: true, strength, detail: `${p} ${x.dignityOf(p)} in kendra (house ${x.houseOf(p)})` };
  }
  return { matched: false };
}

function evalLordInHouses(rule, x) {
  const lord = x.houseLord(rule.lord_of);
  const lh = x.houseOf(lord);
  if (rule.houses.includes(lh)) {
    const strong = x.isStrong(lord);
    return { matched: true, strength: strong ? 'weak' : 'medium', // strong dignity dilutes a dosha
      detail: `${rule.lord_of}th lord ${lord} in house ${lh}` };
  }
  return { matched: false };
}

// association of lords of set_a houses with lords of set_b houses
function evalLordAssociation(rule, x) {
  for (const a of rule.set_a) {
    for (const b of rule.set_b) {
      const la = x.houseLord(a);
      const lb = x.houseLord(b);
      if (la === lb) continue;
      const ha = x.houseOf(la);
      const hb = x.houseOf(lb);
      let how = null;
      if (ha === hb) how = 'conjunction';
      else if (x.aspectsHouse(la, hb) || x.aspectsHouse(lb, ha)) how = 'aspect';
      else if (x.signOfHouse(a) === x.P[lb].signIndex && x.signOfHouse(b) === x.P[la].signIndex) how = 'exchange';
      if (how) {
        const strong = x.isStrong(la) && x.isStrong(lb);
        return { matched: true, strength: how === 'conjunction' || how === 'exchange' ? (strong ? 'strong' : 'medium') : 'weak',
          detail: `${a}th lord ${la} and ${b}th lord ${lb} linked by ${how}` };
      }
    }
  }
  return { matched: false };
}

function evalMoonYoga(rule, x) {
  const mh = x.houseOf('Moon');
  const h2 = x.houseFrom(mh, 2);
  const h12 = x.houseFrom(mh, 12);
  const occ = (h) => x.planetsInHouse(h).filter((p) => p !== 'Moon' && p !== 'Sun');
  const in2 = occ(h2);
  const in12 = occ(h12);
  switch (rule.variant) {
    case 'sunapha':
      return in2.length ? { matched: true, strength: in2.some((p) => BENEFICS.has(p)) ? 'medium' : 'weak', detail: `${in2.join(',')} in 2nd from Moon` } : { matched: false };
    case 'anapha':
      return in12.length ? { matched: true, strength: in12.some((p) => BENEFICS.has(p)) ? 'medium' : 'weak', detail: `${in12.join(',')} in 12th from Moon` } : { matched: false };
    case 'durudhura':
      return (in2.length && in12.length) ? { matched: true, strength: 'medium', detail: `planets flanking Moon (2nd: ${in2.join(',')}; 12th: ${in12.join(',')})` } : { matched: false };
    case 'kemadruma': {
      const moonAlone = x.planetsInHouse(mh).filter((p) => p !== 'Moon').length === 0;
      if (!moonAlone || in2.length || in12.length) return { matched: false };
      // cancellation checks
      const kendraFromMoon = KENDRAS.some((k) => x.planetsInHouse(x.houseFrom(mh, k)).some((p) => p !== 'Moon'));
      const moonInKendraFromLagna = KENDRAS.includes(mh);
      const cancelled = kendraFromMoon || moonInKendraFromLagna || x.isStrong('Moon');
      return { matched: true, strength: cancelled ? 'weak' : (DUSTHANAS.includes(mh) ? 'strong' : 'medium'),
        detail: cancelled ? 'Kemadruma present but cancelled (kendra support / strong Moon)' : 'Moon isolated, no flanking planets, no cancellation' };
    }
    case 'adhi': {
      const benefInHouse = (k) => x.planetsInHouse(x.houseFrom(mh, k)).filter((p) => BENEFICS.has(p));
      const count = [6, 7, 8].reduce((n, k) => n + (benefInHouse(k).length ? 1 : 0), 0);
      if (count === 0) return { matched: false };
      return { matched: true, strength: count >= 3 ? 'strong' : count === 2 ? 'medium' : 'weak',
        detail: `benefics in ${count} of houses 6/7/8 from Moon` };
    }
    default:
      return { matched: false };
  }
}

function evalKartari(rule, x) {
  // Hem of a target house: planets in the houses immediately before and after.
  // Default target for marriage-relevant yogas is the 7th; we report any hemmed house.
  const benefHem = rule.polarity === 'benefic';
  const pool = benefHem ? BENEFICS : MALEFICS;
  for (let h = 1; h <= 12; h++) {
    const before = x.houseFrom(h, 12);
    const after = x.houseFrom(h, 2);
    const b = x.planetsInHouse(before).filter((p) => pool.has(p));
    const a = x.planetsInHouse(after).filter((p) => pool.has(p));
    const hemmed = x.planetsInHouse(h);
    // only report meaningful houses (1,7,10,4 + the hemmed house non-empty or a key bhava)
    if (b.length && a.length && [1, 2, 4, 5, 7, 9, 10].includes(h)) {
      return { matched: true, strength: 'medium', detail: `house ${h} hemmed by ${b.join(',')} (before) and ${a.join(',')} (after)` };
    }
  }
  return { matched: false };
}

// --- custom detectors ---

function dhanaYoga(rule, x) {
  const hits = [];
  for (const [a, b] of rule.lord_pairs) {
    const la = x.houseLord(a);
    const lb = x.houseLord(b);
    if (la === lb) { hits.push(`${a}th & ${b}th share lord ${la}`); continue; }
    const ha = x.houseOf(la);
    const hb = x.houseOf(lb);
    if (ha === hb) hits.push(`${a}th lord ${la} + ${b}th lord ${lb} conjunct (H${ha})`);
    else if (x.aspectsHouse(la, hb) || x.aspectsHouse(lb, ha)) hits.push(`${a}th lord ${la} & ${b}th lord ${lb} mutual aspect`);
    else if (x.signOfHouse(a) === x.P[lb].signIndex && x.signOfHouse(b) === x.P[la].signIndex) hits.push(`${a}th & ${b}th lords in exchange`);
  }
  if (!hits.length) return { matched: false };
  return { matched: true, strength: hits.length >= 3 ? 'strong' : hits.length === 2 ? 'medium' : 'weak',
    detail: `${hits.length} Dhana combination(s): ${hits.join('; ')}` };
}

function lakshmiYoga(rule, x) {
  const l9 = x.houseLord(9);
  const lagnaLord = x.houseLord(1);
  const l9Strong = x.isStrong(l9) && [...KENDRAS, ...TRIKONAS].includes(x.houseOf(l9));
  const lagnaStrong = !DUSTHANAS.includes(x.houseOf(lagnaLord)) && x.P[lagnaLord].dignity !== 'debilitated';
  if (l9Strong && lagnaStrong) return { matched: true, strength: x.dignityOf(l9) === 'exalted' ? 'strong' : 'medium',
    detail: `9th lord ${l9} ${x.dignityOf(l9)} in H${x.houseOf(l9)}, Lagna lord ${lagnaLord} well placed` };
  if (l9Strong) return { matched: true, strength: 'weak', detail: `9th lord ${l9} strong but Lagna lord ${lagnaLord} weak` };
  return { matched: false };
}

function rajaYoga(rule, x) {
  const kendraLords = [...new Set(KENDRAS.map((h) => x.houseLord(h)))];
  const trikonaLords = [...new Set(TRIKONAS.map((h) => x.houseLord(h)))];
  for (const kl of kendraLords) {
    for (const tl of trikonaLords) {
      if (kl === tl) continue;
      const hk = x.houseOf(kl);
      const ht = x.houseOf(tl);
      let how = null;
      if (hk === ht) how = 'conjunction';
      else if (x.aspectsHouse(kl, ht) || x.aspectsHouse(tl, hk)) how = 'aspect';
      if (how) {
        const strong = x.isStrong(kl) && x.isStrong(tl);
        return { matched: true, strength: how === 'conjunction' ? (strong ? 'strong' : 'medium') : 'weak',
          detail: `kendra lord ${kl} and trikona lord ${tl} linked by ${how}` };
      }
    }
  }
  return { matched: false };
}

function vipreetRajaYoga(rule, x) {
  const subtypes = { 6: 'Harsha', 8: 'Sarala', 12: 'Vimala' };
  const placed = [];
  for (const h of DUSTHANAS) {
    const lord = x.houseLord(h);
    if (DUSTHANAS.includes(x.houseOf(lord))) placed.push({ house: h, lord, in: x.houseOf(lord), sub: subtypes[h] });
  }
  if (!placed.length) return { matched: false };
  // interlink check: are two or more dusthana lords in each other's dusthanas?
  const interlinked = placed.length >= 2;
  return { matched: true, strength: interlinked ? 'strong' : 'medium',
    detail: `${placed.map((p) => `${p.sub} (${p.house}th lord ${p.lord} in ${p.in}th)`).join('; ')}` };
}

function neechaBhanga(rule, x) {
  const debilitated = C.PLANETS.filter((p) => x.P[p].dignity === 'debilitated');
  if (!debilitated.length) return { matched: false };
  const results = [];
  for (const p of debilitated) {
    const sign = x.P[p].signIndex;
    const conditions = [];
    // 1. dispositor of the debilitation sign is in a kendra from Lagna or Moon
    const dispositor = C.SIGN_LORDS[sign];
    const dispHouse = x.houseOf(dispositor);
    if (KENDRAS.includes(dispHouse)) conditions.push(`dispositor ${dispositor} in kendra from Lagna`);
    // 2. the planet that would be exalted in this sign is in a kendra
    const exaltRuler = Object.keys(C.EXALTATION).find((k) => C.EXALTATION[k] === sign);
    if (exaltRuler && KENDRAS.includes(x.houseOf(exaltRuler))) conditions.push(`exaltation-ruler ${exaltRuler} in kendra`);
    // 3. debilitated planet itself in a kendra from Lagna or Moon
    if (KENDRAS.includes(x.houseOf(p))) conditions.push(`${p} itself in a kendra`);
    // 4. dispositor is strong (own/exalted)
    if (x.isStrong(dispositor)) conditions.push(`dispositor ${dispositor} in own/exalted sign`);
    if (conditions.length) results.push({ planet: p, conditions });
  }
  if (!results.length) return { matched: false };
  const best = results.reduce((m, r) => Math.max(m, r.conditions.length), 0);
  return { matched: true, strength: best >= 3 ? 'strong' : best === 2 ? 'medium' : 'weak',
    detail: results.map((r) => `${r.planet} debilitation cancelled (${r.conditions.join('; ')})`).join(' | ') };
}

function mangalDosha(rule, x) {
  const refs = { Lagna: 1, Moon: x.houseOf('Moon'), Venus: x.houseOf('Venus') };
  const marsHouse = x.houseOf('Mars');
  const fromRefs = [];
  for (const [name, refHouse] of Object.entries(refs)) {
    const fromRef = ((marsHouse - refHouse + 12) % 12) + 1;
    if (rule.houses.includes(fromRef)) fromRefs.push(`${fromRef}th from ${name}`);
  }
  if (!fromRefs.length) return { matched: false };
  // cancellations
  const cancellations = [];
  const marsSign = x.P.Mars.signIndex;
  if ([0, 7, 9].includes(marsSign)) cancellations.push('Mars in own/exalted sign (Aries/Scorpio/Capricorn)');
  if ([3, 4].includes(marsSign)) cancellations.push('Mars in Cancer or Leo');
  if (x.houseOf('Jupiter') === marsHouse || x.aspectsHouse('Jupiter', marsHouse)) cancellations.push('Mars conjunct/aspected by Jupiter');
  // "both partners Manglik" and "age > 28" cannot be checked from one chart — noted, not asserted.
  const strength = cancellations.length ? 'weak' : (fromRefs.length === 3 ? 'strong' : fromRefs.length === 2 ? 'medium' : 'weak');
  return { matched: true, strength,
    detail: `Mars ${fromRefs.join(', ')}.${cancellations.length ? ' Cancellations: ' + cancellations.join('; ') + '.' : ' No chart-visible cancellation (still check: both partners Manglik, marriage after 28).'}` };
}

function kaalSarpDosha(rule, x) {
  const rahuLon = x.P.Rahu.longitude;
  const ketuLon = x.P.Ketu.longitude;
  // Walk from Rahu forward to Ketu; every other planet must lie within that arc.
  const arc = (lon) => (((lon - rahuLon) % 360) + 360) % 360;
  const ketuArc = arc(ketuLon);
  const others = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const inside = others.filter((p) => arc(x.P[p].longitude) < ketuArc);
  const outside = others.filter((p) => arc(x.P[p].longitude) >= ketuArc);
  if (outside.length === 0) {
    return { matched: true, strength: 'medium', detail: 'All 7 planets hemmed between the Rahu-Ketu axis (full Kaal Sarp).' };
  }
  if (inside.length >= 5 && outside.length <= 1) {
    return { matched: true, strength: 'weak', detail: `Partial Kaal Sarp — ${outside.join(',')} just outside the axis.` };
  }
  return { matched: false };
}

function mokshaYoga(rule, x) {
  const reasons = [];
  if (x.houseOf('Ketu') === 12) reasons.push('Ketu in 12th');
  if (x.houseOf('Jupiter') === 12) reasons.push('Jupiter in 12th');
  if (x.houseOf('Ketu') === 12 && x.houseOf('Jupiter') === 12) reasons.push('Jupiter + Ketu together in 12th');
  for (const h of [5, 9, 10]) if (x.houseOf(x.houseLord(h)) === 12) reasons.push(`${h}th lord in 12th`);
  if (!reasons.length) return { matched: false };
  const uniq = [...new Set(reasons)];
  return { matched: true, strength: uniq.length >= 3 ? 'strong' : uniq.length === 2 ? 'medium' : 'weak', detail: uniq.join('; ') };
}

function pravrajyaYoga(rule, x) {
  const byHouse = {};
  for (const p of C.PLANETS) {
    if (p === 'Rahu' || p === 'Ketu') continue;
    byHouse[x.houseOf(p)] = (byHouse[x.houseOf(p)] || []).concat(p);
  }
  for (const [h, ps] of Object.entries(byHouse)) {
    if (ps.length >= 4) {
      // dispositor link: is one of them lord of that house's sign?
      const lord = x.houseLord(Number(h));
      const hasDispositor = ps.includes(lord);
      return { matched: true, strength: hasDispositor ? 'strong' : 'medium',
        detail: `${ps.length} planets (${ps.join(',')}) in house ${h}${hasDispositor ? ', including its dispositor' : ''}` };
    }
  }
  return { matched: false };
}

const CUSTOM = { dhanaYoga, lakshmiYoga, rajaYoga, vipreetRajaYoga, neechaBhanga, mangalDosha, kaalSarpDosha, mokshaYoga, pravrajyaYoga };

const EVALUATORS = {
  'kendra-from-moon': evalKendraFromMoon,
  conjunction: evalConjunction,
  'planets-in-houses': evalPlanetsInHouses,
  'planet-in-houses': evalPlanetInHouses,
  'dignity-in-kendra': evalDignityInKendra,
  'lord-in-houses': evalLordInHouses,
  'lord-association': evalLordAssociation,
  'moon-yoga': evalMoonYoga,
  kartari: evalKartari,
};

/** Scan all yogas (optionally filter to those affecting `dimension`). */
function scanYogas(chart, dimension) {
  const x = ctx(chart);
  const out = [];
  for (const yoga of LIBRARY.yogas) {
    if (dimension && !yoga.dimensions_affected.includes(dimension)) continue;
    const rule = yoga.detection_rule;
    let res;
    try {
      if (rule.type === 'custom') res = CUSTOM[rule.custom](rule, x);
      else if (EVALUATORS[rule.type]) res = EVALUATORS[rule.type](rule, x);
      else res = { matched: false, error: `no evaluator for rule type ${rule.type}` };
    } catch (e) {
      res = { matched: false, error: e.message };
    }
    if (res && res.matched) {
      out.push({
        name: yoga.name,
        category: yoga.category,
        classical_source: yoga.classical_source,
        strength: res.strength,
        detail: res.detail,
        effect_summary: yoga.effects,
        dimensions_affected: yoga.dimensions_affected,
      });
    }
  }
  return out;
}

module.exports = { scanYogas };
