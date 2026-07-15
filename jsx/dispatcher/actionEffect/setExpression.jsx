/**
 * @fileoverview Sets an expression on an effect or layer property. (ES3-safe)
 * If effectMatchName is provided, finds the property within an effect.
 * Otherwise, finds the property on the layer by trying the shorthand accessor
 * first (layer.rotation, layer.position, etc.) then falling back to
 * layer.property(key).
 * REQUIRES: json.jsx, utils.jsx, applyActionEffect/findPropByMatchName.jsx
 * Load BEFORE: dispatcher.jsx
 */
// applyActionEffect/setExpression.jsx — Set expression handler (ES3-safe)

function _handleSetExpression(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setExpression: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.layerNodeUUID;
    if (!layerUUID) { result.error = 'setExpression: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'setExpression: layer not found'; return result; }

    var prop = null;

    if (params.effectMatchName) {
      // Find property within an effect
      var targetEffectName = params.effectMatchName + '__' + params.nodeUUID;
      var effects = layer.Effects;
      var ei, fx, found = false;
      for (ei = 1; ei <= effects.numProperties; ei++) {
        fx = effects.property(ei);
        if (fx.name === targetEffectName) { found = true; break; }
      }
      if (!found) {
        for (ei = 1; ei <= effects.numProperties; ei++) {
          fx = effects.property(ei);
          if (fx.matchName === params.effectMatchName) { found = true; break; }
        }
      }
      if (found) {
        prop = _findPropByMatchName(fx, params.propMatchName);
      }
    } else {
      // Find property directly on the layer
      // Try shorthand accessor first (layer.rotation, layer.position, etc.)
      try { prop = layer[params.propMatchName]; } catch (e) { prop = null; }
      if (!prop || typeof prop.expression === 'undefined') {
        try { prop = layer.property(params.propMatchName); } catch (e) { prop = null; }
      }
    }

    if (prop && typeof prop.expression !== 'undefined') {
      try { prop.expression = String(params.expression); } catch (e) {}
    }
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}
