/**
 * @fileoverview Removes an effect from a layer. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// applyActionEffect/removeEffect.jsx — Remove effect handler (ES3-safe)

function _handleRemoveEffect(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'removeEffect: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.layerNodeUUID;
    if (!layerUUID) { result.error = 'removeEffect: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) {
      var reserved = findReservedComp();
      if (reserved) layer = findLayerByUUID(reserved, layerUUID);
    }
    if (!layer) { result.error = 'removeEffect: layer not found'; return result; }
    var targetEffectName = params.matchName + '__' + params.nodeUUID;
    var effects = layer.Effects;
    var ei;
    var fx;
    var found = false;
    for (ei = 1; ei <= effects.numProperties; ei++) {
      fx = effects.property(ei);
      if (fx.name === targetEffectName) {
        found = true;
        break;
      }
    }
    if (!found) {
      for (ei = 1; ei <= effects.numProperties; ei++) {
        fx = effects.property(ei);
        if (fx.matchName === params.matchName) {
          found = true;
          break;
        }
      }
    }
    if (found) fx.remove();
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}
