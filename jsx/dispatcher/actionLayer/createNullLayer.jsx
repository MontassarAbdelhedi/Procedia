/**
 * @fileoverview Creates a null layer in the hosting comp. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionLayer/createNullLayer.jsx — Create null layer handler (ES3-safe)

function _handleCreateNullLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) {
      result.error = 'createNullLayer: host comp not found: ' + params.hostingCompUUID;
      return result;
    }
    var nullLayer = comp.layers.addNull();
    if (params.layerUUID) {
      nullLayer.comment = params.layerUUID;
    }
    result.ok = true;
    result.data = { layerName: nullLayer.name };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
