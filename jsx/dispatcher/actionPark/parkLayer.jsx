/**
 * @fileoverview Parks a layer from its host comp into the Reserved Comp. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx, actions_comp.jsx (for findOrCreateReservedComp)
 * Load BEFORE: dispatcher.jsx
 */
// actionPark/parkLayer.jsx — Park layer handler (ES3-safe)

function _handleParkLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var hostComp = findCompByUUID(params.hostingCompUUID);
    if (!hostComp) {
      result.error = 'parkLayer: host comp not found: ' + params.hostingCompUUID;
      return result;
    }
    var layer = null;
    if (params.layerUUID) {
      layer = findLayerByUUID(hostComp, params.layerUUID);
    }
    if (!layer && params.nodeUUID) {
      layer = findLayerByUUID(hostComp, params.nodeUUID);
    }
    if (!layer) {
      result.error = 'parkLayer: layer not found in host comp';
      return result;
    }
    var reserved = findOrCreateReservedComp();
    var savedComment = layer.comment;
    layer.copyToComp(reserved);
    var lk;
    for (lk = 1; lk <= reserved.numLayers; lk++) {
      var RL = reserved.layer(lk);
      if (RL.comment === savedComment) { RL.name = params.nodeUUID; break; }
    }
    layer.remove();
    result.ok = true;
    result.data = { parked: true };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
