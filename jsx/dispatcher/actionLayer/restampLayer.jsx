/**
 * @fileoverview Re-stamps a layer's comment UUID from oldUUID to newUUID. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionLayer/restampLayer.jsx — Restamp layer handler (ES3-safe)

function _handleRestampLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'restampLayer: host comp not found'; return result; }
    var layer = findLayerByUUID(comp, params.oldUUID);
    if (!layer) { result.error = 'restampLayer: layer not found'; return result; }
    layer.comment = params.newUUID;
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}
