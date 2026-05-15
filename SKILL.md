---
name: vedic-astrology
description: Compute and interpret Vedic (Jyotisha) birth charts using Swiss Ephemeris. Use this skill whenever the user mentions Vedic astrology, Jyotish, kundli, birth chart, navamsa, dasha, lagna, nakshatra, horoscope, or yogas — and whenever they ask a life-direction question that needs a chart. The skill auto-detects which of 14 life dimensions a question falls into: career, wealth/money, marriage, children/fertility, health, education, property, relationships/love, family/parents, travel/foreign, spirituality, obstacles/misfortune, deep karma/past-life, and life timing. So trigger on "when will I marry", "is this a good time for a career change", "any accident risk in my chart", "best city for my career", "will I have children", "why does everything go wrong", "what is my past-life karma", "what's my current dasha" — even when the user never says the word "astrology". The skill handles geocoding, historical timezone resolution, all 14+ divisional charts, Vimshottari dasha, shadbala, ashtakavarga, transits, astrocartography, and detection of 30+ classical yogas. Do not hand-roll ephemeris or chart math — call the bundled scripts.
---

# Vedic Astrology (Jyotisha)

This skill has two jobs:

1. **Compute once, reuse forever.** Never write ephemeris code or redo chart math. Call the bundled scripts; they return structured JSON and cache it per person. A recomputed chart is a bug.
2. **Route and read.** When the user asks a question, the dimension router classifies it into 1-3 of 14 life dimensions and runs each one's classical recipe — houses, lords, karakas, vargas, yogas, durability, dasha, transit. You turn the structured findings into prose.

You produce **prose for the user**. The scripts produce **JSON for you**. Never dump raw JSON at the user.

## When to use

Trigger on astrology jargon (Jyotish, kundli, lagna, navamsa, dasha, nakshatra, yoga, varga) **and** on plain life questions that need a chart. People rarely say "do Vedic astrology" — they ask the life question directly. Trigger anyway. See the 14 dimensions below.

## Required inputs

Collect this before the first computation. Only `name`, `dob`, `tob`, `pob` are strictly required.

```json
{
  "name": "Yishnu",
  "dob": "1996-10-17",
  "tob": "18:25",
  "pob": "Bankura, West Bengal, India",
  "lat": null, "lon": null, "tz": null,
  "current_location": "Mumbai, India",
  "gender": "male",
  "birth_time_accuracy": "exact"
}
```

- `lat`, `lon`, `tz` are **optional** — the skill geocodes `pob` and resolves the historical timezone itself. Do not ask the user for coordinates.
- `birth_time_accuracy` ∈ `exact | ±15min | ±1hr | unknown`. Birth-time-sensitive findings (D10, D24, D30, D60) are flagged low-confidence automatically when it is not `exact` — relay that flag.

## First-time setup

Write the birth-data JSON to a file, then:

```
node scripts/compute-base.js --input <birth-data.json>
```

This resolves geocoding, computes the full base bundle (D1, planetary aspects, Vimshottari dasha tree, shadbala, ashtakavarga, karakamsha/swamsa, chalit, upagrahas), and writes `charts/<person_slug>.json` where `slug` = `<lowercased_name>_<dob>` (e.g. `yishnu_1996-10-17`). Subsequent calls read the cache; vargas are lazy-filled on demand. Every later script takes `--person <slug>`; each person has an isolated cache file.

## Answering a question — the dimension router

This is the main entry point. Pass the user's question verbatim:

```
node scripts/answer-question.js --person <slug> --question "<the user's question>" [--max-dimensions 3]
```

It classifies the question into 1-3 of the 14 life dimensions, runs each dimension's classical recipe, scans yogas, pulls dasha and transit timing, optionally triggers astrocartography, and returns a `DimensionalReading` object with a `synthesis_hint`. If the question is ambiguous it returns `clarification_needed` instead of guessing — relay that question to the user.

### The 14 dimensions

| # | Dimension | Covers |
|---|-----------|--------|
| 1 | **career** | job, profession, promotion, business, government job |
| 2 | **wealth** | money, income, savings, investment, inheritance, sudden wealth |
| 3 | **marriage** | spouse, marriage timing, marital longevity, divorce risk |
| 4 | **children** | conception, fertility, progeny, IVF/adoption |
| 5 | **health** | disease risk, chronic conditions, mental health, surgery |
| 6 | **education** | subjects, exams, higher education, foreign study |
| 7 | **property** | house, real estate, vehicles, inherited property |
| 8 | **relationships** | romance, love, friendships, social network (distinct from marriage) |
| 9 | **family** | parents, siblings, ancestral matters, family disputes |
| 10 | **travel** | settling abroad, foreign jobs, visas, immigration |
| 11 | **spirituality** | spiritual path, guru, meditation, dharma, renunciation |
| 12 | **obstacles** | misfortune, enemies, lawsuits, accident risk, addiction |
| 13 | **karma** | past-life karma, soul lessons, karmic debt (needs exact birth time) |
| 14 | **timing** | "when" questions — current dasha, sade-sati, next-5-years overview (meta-dimension, overlays others) |

Full per-dimension recipes — houses, karakas, vargas, yogas, dasha logic, transit triggers, confidence rules — are in **`references/dimensions.md`**. Read it whenever you need the depth, or to handle a question that falls between dimensions.

### Universal reading order

Every life dimension follows the same classical order. The recipe and the orchestrator both encode it; understand it so you can reason about the findings JSON:

1. **D1 — the promise.** Is this area of life supported? Relevant house, its lord, occupants, aspects, karaka.
2. **Main varga — confirm or deny.** The dimension's divisional chart refines the D1 promise. Conflict between them must be stated honestly, not papered over.
3. **D27 / D30 — durability and vulnerability.**
4. **D60 — karmic depth.** Skipped or flagged low-confidence if birth time is not `exact`.
5. **Dasha + transit — timing.** Active Maha/Antar/Pratyantar; the next dasha window that activates this dimension; relevant transits.

### Event-style questions ("any accident risk?")

The `obstacles` dimension uses a **markers → activating dasha → transit window** pattern (in the `event_analysis` field). If D1 shows no markers, it says so and stops — report that plainly. If markers exist, report the elevated-risk windows with reasons **and mitigation**. Never a bare yes/no, never a certainty.

## Yoga detection

The skill detects 30+ classical yogas (BPHS / Phaladeepika / Saravali / Jaimini) and maps each to the dimensions it affects. `answer-question.js` runs the relevant yoga scan automatically per dimension. To scan directly:

```
node scripts/scan-yogas.js --person <slug> [--dimension <dimension>]
```

Detection is deterministic. Each hit returns name, category, classical source, strength (`weak | medium | strong`), the specific placement detail, and effect summary. See **`references/yoga-library.md`** for the full list and interpretation guidance.

Interpreting yogas: a yoga is a **tendency, not a verdict** — weigh its strength against the D1 promise and dasha timing. Doshas (Mangal Dosha especially) are heavily over-diagnosed in popular practice; the engine always reports chart-visible cancellations, and you must never alarm the user. Kaal Sarp Dosha is later tradition, not classical BPHS — present it cautiously, never as a curse.

## Astrocartography — when it runs

`answer-question.js` triggers astrocartography automatically when the dimension and question warrant it: **always** for the `travel` dimension; for `career`, `property`, `marriage`, `relationships` when the question mentions a location; rarely otherwise. You can also call it directly:

```
node scripts/get-astrocartography.js --person <slug> --scope local|international
```

Output is text only — planetary lines, nearby cities, effects from the bundled table. Never render a map. See `references/astrocartography-effects.md`.

## Other scripts

- `node scripts/get-transit.js --person <slug> [--window 2y]` — transit scan relative to natal lagna and natal Moon; flags Sade-sati, slow-planet contacts on natal points. Max 3 years.
- `node scripts/get-dasha.js --person <slug> [--at YYYY-MM-DD]` — active Maha/Antar/Pratyantar at a date.
- `node scripts/compute-varga.js --person <slug> --varga D9` — force-compute a specific divisional chart.

## Ethics

Jyotisha read responsibly. These rules are not optional:

- **Never predict death, terminal illness, or the exact timing of a death.** Refuse even if asked directly. For health and family dimensions, frame findings as "vulnerable periods supported by preventive care", never as a sentence.
- **Never frame anything as inescapable fate.** Difficult findings (obstacles, doshas, afflictions) must always be paired with mitigation and agency. A chart shows tendencies and timing, not a fixed verdict.
- **Use "elevated risk" language, never certainty,** for any adverse life-event question.
- **Birth-time-sensitive findings carry confidence flags.** D10/D24/D30/D60 are flagged when birth time is not `exact` — surface that caveat to the user in plain language. The `karma` dimension (D60-only) is refused outright without an exact birth time; relay the refusal and suggest birth-time rectification.
- **No remedies.** The skill computes and interprets; gems, mantras, and ritual prescriptions are out of scope.
- **Do not invent classical rules or yogas.** If the findings JSON does not support a claim, do not make it. If a classical source is ambiguous, say so.

## Output format

Return **prose** built on the structured JSON, using `synthesis_hint` as a starting point (you may ignore it and synthesise from raw findings). For each dimension: state the D1 promise, what the main varga and yogas add, durability, the dated dasha/transit windows, then one honest synthesis paragraph. Cite the chart and house you draw from ("your 10th lord Saturn sits in the 12th in D1…") so the reading is traceable. For multi-dimension questions, give each dimension its own short section, then a combined synthesis.

## Place-of-birth, timezone, engine

- Pass the raw place string as `pob` — never invent lat/lon, never ask the user for them. If geocoding returns an ambiguity warning, relay the candidates and ask which one. If it returns a could-not-resolve error, ask for the nearest well-known city.
- Timezones are stored as IANA names and resolved with the historical TZ database (DST and pre-1970 rule changes handled).
- The skill uses Swiss Ephemeris via a native binding with a pure-WASM fallback. After install, `.engine-status.json` records which engine loaded. If results look wrong, check it first.

## References

Pull these into context when you need the depth:

- `references/dimensions.md` — the 14 dimensions, full per-dimension recipes.
- `references/yoga-library.md` — the 30+ yoga library, detection, interpretation guidance.
- `references/jyotisha-fundamentals.md` — signs, houses, planets, dignities, aspects, karakas.
- `references/vargas-reference.md` — all divisional charts, what each governs, computation notes.
- `references/dasha-system.md` — Vimshottari structure, the cached dasha tree, how to read it.
- `references/astrocartography-effects.md` — planet × angle effect table and trigger rules.
