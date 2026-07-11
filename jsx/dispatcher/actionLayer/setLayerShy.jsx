/**
 * @fileoverview Sets the shy state of a layer in the hosting comp. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionLayer/setLayerShy.jsx — Set layer shy handler (ES3-safe)

function _handleSetLayerShy(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setLayerShy: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.nodeUUID;
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'setLayerShy: layer not found'; return result; }
    layer.shy = (params.shy === true);
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}