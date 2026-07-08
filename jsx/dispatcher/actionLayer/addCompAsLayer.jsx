/**
 * @fileoverview Adds a pre-comp as a layer within a hosting comp. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionLayer/addCompAsLayer.jsx — Add comp as layer handler (ES3-safe)

function _handleAddCompAsLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'addCompAsLayer: host comp not found'; return result; }
    var precomp = findCompByUUID(params.nodeUUID);
    if (!precomp) { result.error = 'addCompAsLayer: pre-comp not found'; return result; }
    var layer = comp.layers.add(precomp);
    if (params.layerUUID) layer.comment = params.layerUUID;
    result.ok = true;
    result.data = { layerName: layer.name };
  } catch (e) { result.error = e.toString(); }
  return result;
}
