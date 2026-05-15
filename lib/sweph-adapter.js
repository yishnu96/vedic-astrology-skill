'use strict';
/**
 * Engine cascade: native `swisseph` first, pure-WASM `sweph-wasm` as fallback.
 * Every script imports from here — never from `swisseph` or `sweph-wasm` directly —
 * so the cascade works without per-script try/catch.
 */
const fs = require('fs');
const path = require('path');

let engine = null;
let engineName = null;

const EPHE_DIR = path.join(__dirname, '..', 'ephe');

async function load() {
  if (engine) return engine;

  // Primary: native binding.
  try {
    engine = require('swisseph');
    engineName = 'swisseph-native';
  } catch (e) {
    // Fallback: WebAssembly build. Same Swiss Ephemeris algorithms.
    // The bundled wasm glue is a web-only Emscripten build — it only knows how
    // to fetch() the .wasm, which fails under Node. So we bypass SwissEPH.init()
    // (which only forwards `locateFile`), call the emscripten factory directly
    // with the wasm bytes via `wasmBinary`, and wrap the module in the SwissEPH
    // class ourselves (its constructor just stores the module).
    const sweph = require('sweph-wasm');
    const SwissEPH = sweph.default || sweph;
    const swephDir = path.dirname(require.resolve('sweph-wasm'));
    const factoryMod = require(path.join(swephDir, 'wasm', 'swisseph.cjs'));
    const factory = factoryMod.default || factoryMod;
    const wasmBinary = fs.readFileSync(path.join(swephDir, 'wasm', 'swisseph.wasm'));
    const emModule = await factory({ wasmBinary });
    engine = new SwissEPH(emModule);
    engineName = 'sweph-wasm';
  }

  // Use bundled .se1 files if present, otherwise the built-in Moshier ephemeris.
  if (fs.existsSync(EPHE_DIR) && fs.readdirSync(EPHE_DIR).some((f) => f.endsWith('.se1'))) {
    if (typeof engine.swe_set_ephe_path === 'function') engine.swe_set_ephe_path(EPHE_DIR);
  }

  // Sidereal mode: Lahiri ayanamsa is the Jyotisha default.
  if (typeof engine.swe_set_sid_mode === 'function') {
    const lahiri = engine.SE_SIDM_LAHIRI != null ? engine.SE_SIDM_LAHIRI : 1;
    engine.swe_set_sid_mode(lahiri, 0, 0);
  }

  return engine;
}

function getEngineName() {
  return engineName;
}

module.exports = { load, getEngineName, EPHE_DIR };
