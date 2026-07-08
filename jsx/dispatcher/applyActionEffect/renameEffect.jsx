/**
 * @fileoverview Renames an effect on a layer. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// applyActionEffect/renameEffect.jsx — Rename effect handler (ES3-safe)

function _handleRenameEffect(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'renameEffect: host comp not found'; return result; }
    var layer = findLayerByUUID(comp, params.layerUUID);
    if (!layer) { result.error = 'renameEffect: layer not found'; return result; }
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
    if (!found && params.nodeUUID) {
      for (ei = 1; ei <= effects.numProperties; ei++) {
        fx = effects.property(ei);
        if (fx.matchName === params.effectMatchName) {
          found = true;
          break;
        }
      }
    }
    if (found) {
      fx.name = params.label;
    }
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}
