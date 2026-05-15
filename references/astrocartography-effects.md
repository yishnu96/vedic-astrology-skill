# Astrocartography Effects & Trigger Rules

Astrocartography maps where in the world each natal planet's energy is amplified. The skill outputs **text only** — planetary lines, nearby cities, and effect descriptions. It never renders a map.

## When to call it

`get-astrocartography.js` is expensive and usually irrelevant. Call it **only** when:

- The question names or implies a **location** ("where should I move", "is Dubai good for me", "best country for…").
- The topic is **love/relationships** — relocation lines matter for partnership.
- The topic is **career** — best cities/countries for professional growth.
- The topic is **property** — buying, selling, or relocating a home.

For a general reading, a money question, a children question, etc. — **skip it**.

`read-chart.js` enforces this: only `career`, `marriage`, and `property` topics populate the `astrocartography` field.

## The four angles

- **AC (Ascendant)** — how you show up; identity, body, first impression.
- **DC (Descendant)** — relationships, partners, the other.
- **MC (Midheaven)** — career, public status, reputation, ambition.
- **IC (Imum Coeli)** — home, roots, family, inner foundation.

## The effect table

`data/astrocartography-interpretations.json` holds all 9 planets × 4 angles. Use it verbatim — do not invent line meanings. Quick orientation:

- **Jupiter lines** — growth, fortune, expansion. Jupiter-MC is the classic career-elevation line; Jupiter-DC favours beneficial partnerships.
- **Venus lines** — love, ease, beauty. Venus-DC is the classic relationship relocation line.
- **Sun lines** — visibility, authority, leadership. Sun-MC for reputation.
- **Saturn lines** — discipline and structure but weight and delay; generally avoid for ease, choose for serious long-term building.
- **Mars lines** — drive and energy but conflict/accident risk.
- **Rahu lines** — sudden rises, foreign opportunity, instability.
- **Ketu lines** — spiritual depth, detachment, low worldly drive.

## Scope

- `--scope international` — global lines, for "best country" questions.
- `--scope local` — restricts nearby-city lookup to the user's current country (from `current_location_meta`), for "best city within my country" questions.

## v1 accuracy caveat

Line geometry in v1 is **simplified** — MC/IC use the planet's sidereal longitude as the meridian reference, and AC/DC are approximated as ±90°. The `approximate: true` flag marks AC/DC lines. Use the output for **directional guidance** ("Jupiter-MC energy runs through the Gulf region — good for career") rather than precise relocation advice. A future version should compute true ACG curves from right ascension and declination with proper latitude solving.
