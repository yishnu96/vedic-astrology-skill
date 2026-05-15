# Jyotisha Fundamentals

Reference for interpreting the structured JSON the skill produces. Pull this in when you need the underlying logic.

## Signs and lords

| # | Sign | Lord | Element | Quality |
|---|------|------|---------|---------|
| 1 | Aries | Mars | Fire | Movable |
| 2 | Taurus | Venus | Earth | Fixed |
| 3 | Gemini | Mercury | Air | Dual |
| 4 | Cancer | Moon | Water | Movable |
| 5 | Leo | Sun | Fire | Fixed |
| 6 | Virgo | Mercury | Earth | Dual |
| 7 | Libra | Venus | Air | Movable |
| 8 | Scorpio | Mars | Water | Fixed |
| 9 | Sagittarius | Jupiter | Fire | Dual |
| 10 | Capricorn | Saturn | Earth | Movable |
| 11 | Aquarius | Saturn | Air | Fixed |
| 12 | Pisces | Jupiter | Water | Dual |

## Houses (bhavas)

1 self/body · 2 wealth/family/speech · 3 siblings/courage/effort · 4 home/mother/comfort · 5 children/intellect/poorva-punya · 6 enemies/disease/service/debt · 7 spouse/partnership · 8 longevity/transformation/the hidden · 9 dharma/fortune/father/guru · 10 career/status/action · 11 gains/networks/elder siblings · 12 loss/expenditure/moksha/foreign.

**Kendras** (1,4,7,10) — pillars of strength. **Trikonas** (1,5,9) — dharma/fortune. **Dusthanas** (6,8,12) — difficulty. **Upachaya** (3,6,10,11) — houses that improve over time.

## Planets

- **Benefics** (natural): Jupiter, Venus, well-placed Mercury, waxing Moon.
- **Malefics** (natural): Saturn, Mars, Sun, Rahu, Ketu, waning Moon.
- A benefic/malefic still acts through the houses it rules — functional nature depends on the lagna.

## Dignities

- **Exalted** — strongest. Sun/Aries, Moon/Taurus, Mars/Capricorn, Mercury/Virgo, Jupiter/Cancer, Venus/Pisces, Saturn/Libra.
- **Debilitated** — weakest, opposite sign of exaltation.
- **Own sign** — strong and comfortable.
- **Friendly / neutral / enemy** — relational dignity. v1 of the skill reports `neutral` for the non-own/non-exalt/non-debil case; refine with the classical friendship table when nuance matters: e.g. Sun's friends are Moon/Mars/Jupiter, enemies Venus/Saturn.

Rahu and Ketu have no dignity in the classical sense (`dignity: "n/a"` in the JSON).

## Graha drishti (planetary aspects)

All planets aspect the 7th house/planet from themselves. Additionally:
- **Mars** aspects the 4th and 8th.
- **Jupiter** aspects the 5th and 9th.
- **Saturn** aspects the 3rd and 10th.

These are full aspects. The skill's `d1.aspects` field lists the house numbers each planet aspects.

## Karakas (significators)

Natural significators are in `data/karaka-table.json`. The most-used: Sun (soul/father/authority), Moon (mind/mother), Mars (energy/land/siblings), Mercury (intellect/speech), Jupiter (wisdom/wealth/children), Venus (spouse/luxury), Saturn (longevity/discipline/karma).

Jaimini **chara karakas** (Atmakaraka etc., assigned by degree) are noted in the cache as `karakamsha`/`swamsa` — these are stubs in v1; compute manually if a reading needs them.

## Nakshatras

27 lunar mansions, each 13°20'. Each has a Vimshottari dasha lord (see `dasha-system.md`). The Moon's nakshatra at birth sets the dasha sequence. Each nakshatra has 4 padas of 3°20' — the pada drives the D9 (navamsa) placement.
