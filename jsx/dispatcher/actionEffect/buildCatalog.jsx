/**
 * @fileoverview Handler stubs for effect catalog-building actions.
 * These are used by offline utility tools for building the effects catalog.
 * Currently no panel-side code dispatches these actions.
 * (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionEffect/buildCatalog.jsx — Effect catalog building stubs (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

function _handleEnumerateAllEffects(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var list = [];
    result.ok = true;
    result.data = { effects: list };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

function _handleBuildFullEffectCatalog(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    result.ok = true;
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
