/**
 * @fileoverview Sets a property on an existing effect. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx, applyActionEffect/findPropByMatchName.jsx
 * Load BEFORE: dispatcher.jsx
 */
// applyActionEffect/setEffectProperty.jsx — Set effect property handler (ES3-safe)

function _handleSetEffectProperty(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setEffectProperty: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.layerNodeUUID;
    if (!layerUUID) { result.error = 'setEffectProperty: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'setEffectProperty: layer not found'; return result; }
    var targetEffectName = params.effectMatchName + '__' + params.nodeUUID;
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
        if (fx.matchName === params.effectMatchName) {
          found = true;
          break;
        }
      }
    }
    if (found) {
      var prop = _findPropByMatchName(fx, params.propMatchName);
      if (prop && typeof prop.setValue === 'function') prop.setValue(params.value);
    }
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}
