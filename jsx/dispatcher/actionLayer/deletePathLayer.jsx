/**
 * @fileoverview Deletes a layer from the hosting comp by layerUUID or nodeUUID. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionLayer/deletePathLayer.jsx — Delete path layer handler (ES3-safe)

function _handleDeletePathLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'deletePathLayer: host comp not found'; return result; }
    var layer = null;
    if (params.layerUUID) layer = findLayerByUUID(comp, params.layerUUID);
    if (!layer && params.nodeUUID) layer = findLayerByUUID(comp, params.nodeUUID);
    if (layer) layer.remove();
    result.ok = true;
    result.data = { deleted: !!layer };
  } catch (e) { result.error = e.toString(); }
  return result;
}
