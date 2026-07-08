/**
 * @fileoverview Enables or disables an effect on a layer. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// applyActionEffect/setEffectEnabled.jsx — Set effect enabled handler (ES3-safe)

function _handleSetEffectEnabled(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setEffectEnabled: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.layerNodeUUID;
    if (!layerUUID) { result.error = 'setEffectEnabled: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'setEffectEnabled: layer not found'; return result; }
    var targetEffectName = params.matchName + '__' + params.nodeUUID;
    var effects = layer.Effects;
    var ei;
    var fx;
    var found = false;
    for (ei = 1; ei <= effects.numProperties; ei++) {
      fx = effects.property(ei);
      if (fx.name === targetEffectName) {
        fx.enabled = (params.enabled !== false);
        found = true;
        break;
      }
    }
    if (!found) {
      for (ei = 1; ei <= effects.numProperties; ei++) {
        fx = effects.property(ei);
        if (fx.matchName === params.matchName) {
          fx.enabled = (params.enabled !== false);
          found = true;
          break;
        }
      }
    }
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}
