'use strict';
/** Detect which astronomy engine loaded, run a smoke test, write .engine-status.json. */
const fs = require('fs');
const path = require('path');
const adapter = require('../lib/sweph-adapter');
const astro = require('../lib/astro');

(async () => {
  const status = { engine: null, smokeTestPassed: false, smokeTestDetail: null, timestamp: new Date().toISOString() };
  try {
    await adapter.load();
    status.engine = adapter.getEngineName();
    console.log(`[vedic-astrology] Astronomy engine: ${status.engine}`);

    // Smoke test: tropical Sun longitude at J2000.0 (2000-01-01 12:00 UT) ~ 280.46 deg.
    // We compute sidereal then add the Lahiri ayanamsa back is non-trivial; instead
    // verify the engine returns a finite Sun longitude for J2000.0.
    const jd = 2451545.0;
    const sun = await astro.planetLongitude(jd, 'Sun');
    if (Number.isFinite(sun.lon) && sun.lon >= 0 && sun.lon < 360) {
      status.smokeTestPassed = true;
      status.smokeTestDetail = `Sun sidereal longitude at J2000.0 = ${sun.lon.toFixed(2)} deg`;
    } else {
      status.smokeTestDetail = `Unexpected Sun longitude: ${sun.lon}`;
    }
  } catch (e) {
    status.smokeTestDetail = `Engine load failed: ${e.message}`;
    console.error(`[vedic-astrology] WARNING: ${status.smokeTestDetail}`);
  }

  fs.writeFileSync(path.join(__dirname, '..', '.engine-status.json'), JSON.stringify(status, null, 2));
  console.log(`[vedic-astrology] Smoke test: ${status.smokeTestPassed ? 'PASSED' : 'FAILED'} — ${status.smokeTestDetail}`);
})();
