# Vimshottari Dasha System

The skill uses **Vimshottari** — the standard 120-year dasha system. Computed upfront by `lib/dasha.js`, stored in `charts/<slug>.json` under `dashas.vimshottari`.

## Structure

A three-level tree:
- **Mahadasha** — the major period, ruled by one of the 9 dasha lords.
- **Antardasha** — the sub-period within a mahadasha.
- **Pratyantardasha** — the sub-sub-period within an antardasha.

Each node has `lord`, `startsOn`, `endsOn` (ISO dates).

## Period lengths

| Lord | Years |
|------|-------|
| Ketu | 7 |
| Venus | 20 |
| Sun | 6 |
| Moon | 10 |
| Mars | 7 |
| Rahu | 18 |
| Jupiter | 16 |
| Saturn | 19 |
| Mercury | 17 |

Total = 120 years. Antardashas and pratyantardashas are proportional sub-divisions: a lord's antardasha within a mahadasha lasts `mahaYears × lordYears / 120`.

## Starting point

The Moon's nakshatra at birth determines the starting mahadasha lord and how much of it is already elapsed at birth:
- Nakshatra index (0–26) `% 9` → starting lord (Ashwini→Ketu, Bharani→Venus, …).
- The fraction of the nakshatra the Moon has traversed = the fraction of the first mahadasha already spent.

`lib/dasha.js` back-dates the cursor so the *remaining* portion of the first mahadasha starts at birth.

## Reading the tree

- **Active period** — `get-dasha.js --person <slug> [--at DATE]` returns the running Maha/Antar/Pratyantar. `read-chart.js` calls this for "today" automatically and puts it in `timing.activeDasha`.
- **Timing a result** — a topic fructifies most readily during the maha/antar of:
  - the lord of the relevant house, or
  - the natural karaka for the topic, or
  - a planet placed in or aspecting the relevant house.
- **Upcoming windows** — scan forward in the tree for the next occurrence of those lords as maha or antar.

## Caveats

- Dasha math depends entirely on the Moon's longitude, which is fast-moving — birth-time error propagates directly into dasha dates. For `birth_time_accuracy` worse than `exact`, treat period boundaries as approximate (±weeks to ±months depending on accuracy).
- v1 computes one full 120-year cycle starting from birth. For someone older than 120 (not expected) the tree would need a second cycle.
- Always pair dasha with transit. A dasha *opens the door*; the transit *triggers the event*. Neither alone is sufficient for timing.
