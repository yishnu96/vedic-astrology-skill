# Divisional Charts (Vargas) Reference

The skill computes D1 upfront and the rest lazily (`compute-varga.js`), appending each to `charts/<slug>.json` under `vargas`. Each varga output has the same shape: `ascendant`, `planets` (sign/house/dignity per planet), `aspects`.

## The 14 charts

| Code | Name | Divisor | Governs | Pulled for |
|------|------|---------|---------|-----------|
| D1 | Rasi | 1 | The whole life — the base chart | Always (upfront) |
| D2 | Hora | 2 | Wealth, resources, sustenance | money |
| D3 | Drekkana | 3 | Siblings, courage, initiative | siblings/courage questions |
| D4 | Chaturthamsa | 4 | Property, fixed assets, home, mother | property |
| D7 | Saptamsa | 7 | Children, progeny, fertility | children |
| D9 | Navamsa | 9 | Marriage, dharma, the "fruit" of the chart; planetary strength check | marriage, general |
| D10 | Dashamsa | 10 | Career, profession, status, action | career |
| D12 | Dwadashamsa | 12 | Parents, ancestry, ancestral karma | parents questions |
| D16 | Shodashamsa | 16 | Vehicles, luxuries, comforts, conveyances | property (vehicles) |
| D20 | Vimshamsa | 20 | Spiritual practice, devotion, sadhana | spiritual |
| D24 | Chaturvimshamsa | 24 | Education, learning, academic life | education |
| D27 | Bhamsa / Saptavimshamsa | 27 | Strengths and weaknesses, resilience | every topic (durability) |
| D30 | Trimsamsa | 30 | Misfortunes, evils, vulnerabilities, health afflictions | every topic (vulnerability) |
| D60 | Shashtiamsa | 60 | Deep karma, the soul-level signature; the finest discriminator | every topic when birth time is exact; karma |

## How to read a varga

A varga **refines** the D1 promise — it does not replace it. The workflow:

1. Identify the houses in the varga that correspond to the D1 primary houses for the topic.
2. Check whether the varga ascendant and those houses are strong or afflicted.
3. **Confirmation** — D1 promises *and* the varga supports it → reliable result. **Conflict** — D1 promises but the varga denies (or vice versa) → say so honestly; the weaker chart tempers the stronger.

D9 is special: a planet strong in D1 but weak in D9 ("navamsa") loses much of its promise. Always sanity-check key planets against D9.

## Computation notes (v1)

`lib/astro.js → vargaSign()` implements:
- **D9, D10, D12, D30** — classical odd/even rules.
- **D2–D60 (others)** — the general "count `part` signs from the sign" rule.

The general rule is a reasonable approximation for several vargas but a few classical texts use variant schemes (notably D3, D7, D16, D20, D24, D27, D60 have alternate mappings in different traditions). If a reading hinges on a precise varga placement near a boundary, verify against a trusted ephemeris before making a strong claim.

D60 is the most birth-time-sensitive chart — a few minutes of birth-time error can shift placements. The skill flags D60 (and D30) `confidence: "low"` whenever `birth_time_accuracy` is not `exact`.
