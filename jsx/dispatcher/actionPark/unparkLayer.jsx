/**
 * @fileoverview Restores a parked layer from the Reserved Comp back to its host comp. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionPark/unparkLayer.jsx — Unpark layer handler (ES3-safe)

function _handleUnparkLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var reserved = findReservedComp();
    if (!reserved) { result.error = 'unparkLayer: reserved comp not found'; return result; }
    var hostComp = findCompByUUID(params.hostingCompUUID);
    if (!hostComp) { result.error = 'unparkLayer: host comp not found'; return result; }
    var layer = null;
    if (params.layerUUID) {
      layer = findLayerByUUID(reserved, params.layerUUID);
    }
    if (!layer && params.nodeUUID) {
      for (var lj = 1; lj <= reserved.numLayers; lj++) {
        var LN = reserved.layer(lj);
        if (LN.name === params.nodeUUID) { layer = LN; break; }
      }
    }
    if (!layer && params.nodeUUID) {
      layer = findLayerByUUID(reserved, params.nodeUUID);
    }
    if (!layer) { result.error = 'unparkLayer: layer not found in reserved comp'; return result; }
    layer.copyToComp(hostComp);
    layer.remove();
    if (params.layerUUID) {
      var hostLayer = null;
      for (var lj = 1; lj <= hostComp.numLayers; lj++) {
        var HL = hostComp.layer(lj);
        if (HL.name === params.nodeUUID) { hostLayer = HL; break; }
      }
      if (!hostLayer) hostLayer = findLayerByUUID(hostComp, params.layerUUID);
      if (hostLayer) hostLayer.comment = params.layerUUID;
    }
    result.ok = true;
    result.data = { unparked: true };
  } catch (e) { result.error = e.toString(); }
  return result;
}
