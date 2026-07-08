/**
 * @fileoverview Reorders a single effect on a layer (first, last, or swap). (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// applyActionEffect/reorderEffect.jsx — Reorder effect handler (ES3-safe)

function _handleReorderEffect(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'reorderEffect: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.layerNodeUUID;
    if (!layerUUID) { result.error = 'reorderEffect: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'reorderEffect: layer not found'; return result; }

    if (params.position === 'swap') {
      if (!params.targetMatchName || !params.targetNodeUUID) {
        result.error = 'reorderEffect: swap requires targetMatchName and targetNodeUUID';
        return result;
      }
      var targetName1 = params.matchName + '__' + params.nodeUUID;
      var targetName2 = params.targetMatchName + '__' + params.targetNodeUUID;
      var effects = layer.Effects;
      var ei, fx1 = null, fx2 = null, idx1 = -1, idx2 = -1;
      for (ei = 1; ei <= effects.numProperties; ei++) {
        var ef = effects.property(ei);
        if (ef.name === targetName1) { fx1 = ef; idx1 = ei; }
        if (ef.name === targetName2) { fx2 = ef; idx2 = ei; }
      }
      if (!fx1) {
        for (ei = 1; ei <= effects.numProperties; ei++) {
          var ef = effects.property(ei);
          if (ef.matchName === params.matchName) { fx1 = ef; idx1 = ei; break; }
        }
      }
      if (!fx2) {
        for (ei = 1; ei <= effects.numProperties; ei++) {
          var ef = effects.property(ei);
          if (ef.matchName === params.targetMatchName) { fx2 = ef; idx2 = ei; break; }
        }
      }
      if (!fx1 || !fx2) {
        result.error = 'reorderEffect: swap target effects not found';
        return result;
      }

      if (idx1 < idx2) {
        fx1.moveAfter(fx2);
        fx2.moveToBeginning();
      } else {
        fx2.moveAfter(fx1);
        fx1.moveToBeginning();
      }
      result.ok = true;
      result.data = { swapped: true };
      return result;
    }

    var targetEffectName = params.matchName + '__' + params.nodeUUID;
    var effects = layer.Effects;
    var ei, fx, found = false;
    for (ei = 1; ei <= effects.numProperties; ei++) {
      fx = effects.property(ei);
      if (fx.name === targetEffectName) { found = true; break; }
    }
    if (!found) {
      for (ei = 1; ei <= effects.numProperties; ei++) {
        fx = effects.property(ei);
        if (fx.matchName === params.matchName) { found = true; break; }
      }
    }
    if (!found) { result.error = 'reorderEffect: effect not found'; return result; }
    if (params.position === 'first') {
      fx.moveToBeginning();
    } else if (params.position === 'last') {
      fx.moveToEnd();
    }
    result.ok = true;
    result.data = { moved: params.position };
  } catch (e) { result.error = e.toString(); }
  return result;
}
