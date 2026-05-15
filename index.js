'use strict';
/** Entry point — programmatic access to the skill's functions. */
const { computeBase } = require('./scripts/compute-base');
const { computeVarga } = require('./scripts/compute-varga');
const { getDasha } = require('./scripts/get-dasha');
const { getTransit } = require('./scripts/get-transit');
const { getAstrocartography } = require('./scripts/get-astrocartography');
const { answerQuestion } = require('./scripts/answer-question');
const { geocode } = require('./scripts/geocode');
const { classify } = require('./lib/classify');
const { scanYogas } = require('./lib/yoga-engine');
const { DIMENSIONS } = require('./lib/dimensions');
const cache = require('./lib/cache');
const adapter = require('./lib/sweph-adapter');

module.exports = {
  computeChart: computeBase,
  computeBase,
  getVarga: computeVarga,
  computeVarga,
  getChart: (slug) => cache.read(slug),
  getDasha,
  getTransits: getTransit,
  getTransit,
  getAstrocartography,
  answerQuestion,
  classifyQuestion: classify,
  scanYogas,
  dimensions: DIMENSIONS,
  geocode,
  listCachedPeople: cache.listCachedPeople,
  clearCache: cache.clearCache,
  slugify: cache.slugify,
  getEngineName: adapter.getEngineName,
};
