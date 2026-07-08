/**
 * @fileoverview Enables or disables a layer's video switch in the hosting comp. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionLayer/setLayerEnabled.jsx — Set layer enabled handler (ES3-safe)

function _handleSetLayerEnabled(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setLayerEnabled: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.nodeUUID;
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'setLayerEnabled: layer not found'; return result; }
    layer.enabled = (params.enabled !== false);
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}
