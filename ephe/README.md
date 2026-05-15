# Swiss Ephemeris data files (optional)

This directory is **optional**. By default the skill uses the **Moshier** ephemeris built into Swiss Ephemeris — no data files needed, sufficient precision for Jyotish work.

For higher precision, drop Swiss Ephemeris `.se1` files here (e.g. `sepl_18.se1`, `semo_18.se1` covering the relevant date range). `lib/sweph-adapter.js` detects any `.se1` file in this directory and calls `swe_set_ephe_path` automatically; otherwise it falls back to Moshier.

Download from: https://www.astro.com/ftp/swisseph/ephe/

Note the Swiss Ephemeris licensing terms (GPL / commercial dual-license by Astrodienst AG) before redistributing these files.
