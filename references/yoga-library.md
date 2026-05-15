# Yoga Library

The skill detects 30+ classical yogas and maps each to the life dimensions it affects. Detection is deterministic — `lib/yoga-engine.js` reads declarative rules from `data/yoga-library.json`. Run via `scripts/scan-yogas.js --person <slug> [--dimension <dim>]`, or it runs automatically inside `answer-question.js` for each classified dimension.

## How detection works

Each yoga in `data/yoga-library.json` has a `detection_rule.type`. The engine evaluates it one of two ways:

- **Declarative** — simple rule types evaluated generically: `kendra-from-moon`, `conjunction`, `planets-in-houses`, `planet-in-houses`, `dignity-in-kendra`, `lord-in-houses`, `lord-association`, `moon-yoga`, `kartari`.
- **Custom** — `detection_rule.type: "custom"` routes to a dedicated function in `yoga-engine.js` for yogas whose logic is genuinely complex: Dhana family (10 lord-pairs), Raja Yoga, Vipreet Raja Yoga (Harsha/Sarala/Vimala), Neecha Bhanga, Lakshmi, Mangal Dosha (with cancellations), Kaal Sarp, Moksha, Pravrajya.

Each detected yoga returns `{ name, category, classical_source, strength, detail, effect_summary, dimensions_affected }`. Strength is `weak | medium | strong` per the yoga's `strength_assessment` rubric.

## The yogas (by category)

**Wealth (Dhana):** Dhana Yoga (10 classical lord-combinations as one family), Lakshmi Yoga, Maha Lakshmi Yoga, Vasumati Yoga, Chandra-Mangal Yoga, Adhi Yoga.

**Raja (power/authority):** Raja Yoga (kendra-trikona lord association), Dharma-Karmadhipati Yoga (9th+10th lord), Vipreet Raja Yoga (three sub-types — Harsha from 6th lord, Sarala from 8th, Vimala from 12th), Neecha Bhanga Raja Yoga (debilitation cancellation).

**Panch Mahapurusha (the 5 great-person yogas):** Ruchaka (Mars), Bhadra (Mercury), Hamsa (Jupiter), Malavya (Venus), Sasa (Saturn) — each: planet in own/exalted sign in a kendra.

**General benefic:** Gajakesari, Budhaditya, Saraswati, Sunapha, Anapha, Durudhura, Shubha Kartari.

**Difficult / dosha:** Kemadruma (with cancellation checks), Daridra, Mangal Dosha (with 5 cancellation rules), Kaal Sarp Dosha (full vs partial), Pitru Dosha, Guru Chandala, Angarak, Vish, Shapit, Paap Kartari.

**Spiritual / moksha:** Moksha Yoga, Pravrajya Yoga.

## Important notes on interpretation

- **Doshas are over-diagnosed in popular practice.** Mangal Dosha especially — the engine always reports chart-visible cancellations, and you should never alarm the user. A "weak" Mangal Dosha with a cancellation is barely worth mentioning.
- **Kaal Sarp Dosha is not a classical BPHS yoga** — it is later tradition. Present it cautiously and never as a curse.
- **Vipreet Raja Yoga is protective**, not harmful — dusthana lords in dusthanas convert adversity into eventual success.
- **A yoga is a tendency, not a verdict.** Strength matters: a "weak" yoga that is technically present may not meaningfully shape the life. Always weigh yoga strength against the D1 promise and dasha timing before making a claim.
- **Never invent yogas or alter detection rules.** If a classical source is ambiguous, surface it as a caveat rather than guessing.

## Adding a yoga

Add an entry to `data/yoga-library.json` using an existing `detection_rule.type` if one fits, or `type: "custom"` plus a new function in `yoga-engine.js`'s `CUSTOM` map. Always cite the `classical_source`.
