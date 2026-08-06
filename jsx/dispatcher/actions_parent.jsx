/**
 * @fileoverview Layer parent handlers (ES3-safe).
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: _handlers.jsx (functions become globals for _handlers map)
 * Exports: _handleClearLayerParent, _handleSetLayerParent
 */
// actions_parent.jsx — Layer parent handlers (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: _handlers.jsx (functions become globals for _handlers map)

/**
 * Clears the parent of a child layer in the given comp.
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID.
 * @return {Object} Result with .ok, .data (cleared), .error.
 */
function _handleClearLayerParent(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'clearLayerParent: comp not found'; return result; }
    var layer = findLayerByUUID(comp, params.layerUUID);
    if (!layer) { result.error = 'clearLayerParent: layer not found: ' + params.layerUUID; return result; }
    layer.parent = null;
    result.ok = true;
    result.data = { cleared: params.layerUUID };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

/**
 * Sets the parent of a child layer in the given comp.
 * @param {Object} cmd Command with params: hostingCompUUID, childLayerUUID, parentLayerUUID.
 * @return {Object} Result with .ok, .error.
 */
function _handleSetLayerParent(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setLayerParent: host comp not found'; return result; }
    var childLayer = findLayerByUUID(comp, params.childLayerUUID);
    if (!childLayer) { result.error = 'setLayerParent: child layer not found'; return result; }
    if (params.parentLayerUUID) {
      var parentLayer = findLayerByUUID(comp, params.parentLayerUUID);
      if (!parentLayer) { result.error = 'setLayerParent: parent layer not found'; return result; }
      childLayer.parent = parentLayer;
    } else {
      childLayer.parent = null;
    }
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}
