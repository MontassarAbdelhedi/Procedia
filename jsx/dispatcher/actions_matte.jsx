/**
 * @fileoverview Matte track-matte action handlers (ES3-safe).
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 * Exports: _handleSetLumaMatte, _handleSetAlphaMatte, _handleClearMatte
 */
// actions_matte.jsx — Matte track-matte action handlers (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

/**
 * Sets a luma track matte on the top layer using the matte layer.
 * @param {Object} cmd Command with params: hostingCompUUID, topLayerUUID, matteLayerUUID, invert.
 * @return {Object} Result with .ok, .error.
 */
function _handleSetLumaMatte(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setLumaMatte: host comp not found'; return result; }
    var topLayer = findLayerByUUID(comp, params.topLayerUUID);
    if (!topLayer) { result.error = 'setLumaMatte: top layer not found'; return result; }
    var matteLayer = findLayerByUUID(comp, params.matteLayerUUID);
    if (!matteLayer) { result.error = 'setLumaMatte: matte layer not found'; return result; }
    matteLayer.moveBefore(topLayer);
    topLayer.trackMatteType = TrackMatteType.LUMA;
    if (params.invert) topLayer.trackMatteType = TrackMatteType.LUMA_INVERTED;
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Sets an alpha track matte on the top layer using the matte layer.
 * @param {Object} cmd Command with params: hostingCompUUID, topLayerUUID, matteLayerUUID, invert.
 * @return {Object} Result with .ok, .error.
 */
function _handleSetAlphaMatte(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setAlphaMatte: host comp not found'; return result; }
    var topLayer = findLayerByUUID(comp, params.topLayerUUID);
    if (!topLayer) { result.error = 'setAlphaMatte: top layer not found'; return result; }
    var matteLayer = findLayerByUUID(comp, params.matteLayerUUID);
    if (!matteLayer) { result.error = 'setAlphaMatte: matte layer not found'; return result; }
    matteLayer.moveBefore(topLayer);
    topLayer.trackMatteType = params.invert ? TrackMatteType.ALPHA_INVERTED : TrackMatteType.ALPHA;
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Clears the track matte from a layer.
 * @param {Object} cmd Command with params: hostingCompUUID, topLayerUUID, layerUUID.
 * @return {Object} Result with .ok, .error.
 */
function _handleClearMatte(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'clearMatte: host comp not found'; return result; }
    var topLayerUUID = params.topLayerUUID || params.layerUUID;
    if (!topLayerUUID) { result.error = 'clearMatte: topLayerUUID required'; return result; }
    var topLayer = findLayerByUUID(comp, topLayerUUID);
    if (!topLayer) { result.error = 'clearMatte: top layer not found'; return result; }
    topLayer.trackMatteType = TrackMatteType.NO_TRACK_MATTE;
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}
