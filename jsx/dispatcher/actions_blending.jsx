/**
 * @fileoverview Layer blending mode handler (ES3-safe).
 * REQUIRES: json.jsx, utils.jsx, blend_map.jsx
 * Load BEFORE: _handlers.jsx (functions become globals for _handlers map)
 * Exports: _handleSetBlendingMode
 */
// actions_blending.jsx — Layer blending mode handler (ES3-safe)
// REQUIRES: json.jsx, utils.jsx, blend_map.jsx
// Load BEFORE: _handlers.jsx (functions become globals for _handlers map)

/**
 * Sets the blending mode of a layer by string name (e.g. NORMAL, ADD, MULTIPLY).
 * Uses the global BLEND_MAP defined in blend_map.jsx.
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID, mode.
 * @return {Object} Result with .ok, .error.
 */
function _handleSetBlendingMode(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setBlendingMode: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.layerNodeUUID;
    if (!layerUUID) { result.error = 'setBlendingMode: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'setBlendingMode: layer not found'; return result; }
    var mode = BLEND_MAP[params.mode];
    if (mode !== undefined) layer.blendingMode = mode;
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}
