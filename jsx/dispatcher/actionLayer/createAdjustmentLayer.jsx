/**
 * @fileoverview Creates an adjustment layer in the hosting comp. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionLayer/createAdjustmentLayer.jsx — Create adjustment layer handler (ES3-safe)

function _handleCreateAdjustmentLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'createAdjustmentLayer: host comp not found'; return result; }
    var layer = comp.layers.addShape();
    layer.adjustmentLayer = true;
    if (params.layerUUID) layer.comment = params.layerUUID;
    result.ok = true;
    result.data = { layerName: layer.name };
  } catch (e) { result.error = e.toString(); }
  return result;
}
