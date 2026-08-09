/**
 * graph/engine/helpers/deepCopyNode.js
 *
 * Deep copies a node's data into a new object, skipping internal fields.
 * Arrays are shallow-cloned; objects are deep-cloned via deepClone utility.
 *
 * Dependencies: data/deepClone.js
 * Load before: graph/engine/helpers/index.js
 *
 * Exports: deepCopyNode
 */
// graph/engine/helpers/deepCopyNode.js
// DEPENDS ON: data/deepClone.js
// MUST LOAD BEFORE: graph/engine/helpers/index.js

window.__procedia_internal.hlp = window.__procedia_internal.hlp || {};

/**
 * Deep copies a node's data into a new object, skipping internal fields.
 * Arrays are shallow-cloned with .slice(); objects are deep-cloned via
 * deepClone utility (safe because node data is guaranteed JSON-serializable).
 *
 * @param {Object} src - Source node data
 * @returns {Object} Deep copy without id, dirty, _transplantLayerUUID
 */
window.__procedia_internal.hlp.deepCopyNode = function(src) {
  var copy = {};
  for (var key in src) {
    if (key === 'id' || key === 'dirty' || key === '_transplantLayerUUID') continue;
    copy[key] = window.__procedia_internal.deepClone(src[key]);
  }
  return copy;
};
