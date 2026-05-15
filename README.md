# vedic-astrology

A skill for computing and interpreting Vedic (Jyotisha) birth charts. Designed to be installed from [skills.sh](https://skills.sh/) and used by any AI agent (Claude Code, Cursor, Cline, Codex, Gemini CLI).

The agent-facing guide lives in [`SKILL.md`](./SKILL.md). This README covers install and operational detail.

## What it does

- Resolves a free-text place of birth to coordinates + historical timezone (geocoding cascade, no API keys).
- Computes D1 (Rasi), all 14 divisional charts, the full Vimshottari dasha tree, shadbala, ashtakavarga, karakamsha/swamsa, chalit, and upagrahas.
- Computes transits (relative to natal lagna and natal Moon) and astrocartography lines.
- Caches everything per person under `charts/<slug>.json` — computed once, reused forever.
- Encodes the classical reading protocol so agents interpret consistently.

## Install

```
npm install
```

### Astronomy engine — dual strategy

- **Primary:** `swisseph` (native node-gyp binding). Fastest, canonical. Requires a C++ toolchain + Python at install time.
- **Fallback:** `sweph-wasm` (pure WebAssembly). No build step, runs anywhere Node 18+ runs. Same Swiss Ephemeris algorithms.

`swisseph` is an `optionalDependency` — if its native build fails, `npm install` continues and the skill silently uses the WASM engine. All code imports from `lib/sweph-adapter.js`, never from a package directly. After install, `postinstall.js` writes `.engine-status.json` recording which engine loaded and whether the smoke test (Sun longitude at J2000.0 ≈ 280.46°) passed.

### Ephemeris data

By default the skill uses the **Moshier** ephemeris built into Swiss Ephemeris — no external data files, sufficient precision for Jyotish work. For higher precision, drop Swiss Ephemeris `.se1` files into `ephe/`; the adapter detects the directory and calls `swe_set_ephe_path` automatically.

## Usage

See `SKILL.md`. In brief:

```
node scripts/compute-base.js --input birth-data.json
node scripts/read-chart.js --person yishnu_1996-10-17 --topic career
node scripts/get-transit.js --person yishnu_1996-10-17 --window 2y
```

## Defaults

- Ayanamsa: Lahiri · House system: Whole Sign · Node: True Node

## Licensing notice

`package.json` declares `UNLICENSED`. Swiss Ephemeris itself is dual-licensed (GPL / commercial) by Astrodienst AG — anyone redistributing this skill commercially is responsible for their own Swiss Ephemeris licensing.

Geocoding powered by [Open-Meteo](https://open-meteo.com/) (CC BY 4.0) with fallback to [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/) (ODbL).

## Out of scope

Western astrology, tarot, numerology, palmistry; map rendering; synastry/compatibility; muhurta; prashna; remedial recommendations.
