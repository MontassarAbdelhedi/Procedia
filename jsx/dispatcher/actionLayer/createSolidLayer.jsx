/**
 * @fileoverview Creates a solid layer in the hosting comp. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionLayer/createSolidLayer.jsx — Create solid layer handler (ES3-safe)

function _handleCreateSolidLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'createSolidLayer: host comp not found'; return result; }
    var w = params.width || 1920;
    var h = params.height || 1080;
    var c = params.color;
    if (!c || c.length < 3) { c = [0.5, 0.5, 0.5]; }
    var layer = comp.layers.addSolid([c[0], c[1], c[2]], params.label || 'Solid', w, h, 1);
    if (params.layerUUID) layer.comment = params.layerUUID;
    result.ok = true;
    result.data = { layerName: layer.name };
  } catch (e) { result.error = e.toString(); }
  return result;
}
