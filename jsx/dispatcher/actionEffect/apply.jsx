/**
 * @fileoverview Effect lifecycle handlers: apply, remove, set property,
 * rename, and enable/disable. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 */
// actionEffect/apply.jsx — Effect CRUD handlers (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

function _findPropByMatchName(effect, matchName) {
  var pi;
  for (pi = 1; pi <= effect.numProperties; pi++) {
    var p = effect.property(pi);
    if (p.matchName === matchName) return p;
  }
  return null;
}

function _handleApplyDynamicEffect(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'applyDynamicEffect: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.layerNodeUUID;
    if (!layerUUID) { result.error = 'applyDynamicEffect: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'applyDynamicEffect: layer not found'; return result; }
    var effects = layer.Effects;
    var effect = effects.addProperty(params.matchName);
    if (params.nodeUUID) {
      effect.name = params.matchName + '__' + params.nodeUUID;
    }
    if (params.props) {
      for (var pk in params.props) {
        if (!params.props.hasOwnProperty(pk)) continue;
        try {
          var prop = _findPropByMatchName(effect, pk);
          if (prop) prop.setValue(params.props[pk]);
        } catch (propErr) {}
      }
    }
    if (!params._moveToBottom) {
      effect.moveToBeginning();
    }
    result.ok = true;
    result.data = { applied: params.matchName };
  } catch (e) { result.error = e.toString(); }
  return result;
}

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

function _handleReorderEffectChain(cmd) {
  var result = { ok: false, data: null, error: null };
  var debug = [];
  try {
    var params = _cmdParams(cmd);
    var order = params.order;
    debug.push('order received: ' + (order ? order.length : 'null') + ' entries');
    if (!order || order.length < 2) {
      result.error = 'reorderEffectChain: order array required with at least 2 entries';
      result._debug = debug;
      return result;
    }

    var comp = findCompByUUID(params.hostingCompUUID);
    debug.push('comp lookup: ' + (comp ? comp.name : 'null'));
    if (!comp) { result.error = 'reorderEffectChain: host comp not found'; result._debug = debug; return result; }

    var layerUUID = params.layerUUID || params.layerNodeUUID;
    debug.push('layerUUID: ' + layerUUID);
    if (!layerUUID) { result.error = 'reorderEffectChain: layerUUID required'; result._debug = debug; return result; }

    var layer = findLayerByUUID(comp, layerUUID);
    debug.push('layer lookup: ' + (layer ? layer.name : 'null'));
    if (!layer) { result.error = 'reorderEffectChain: layer not found'; result._debug = debug; return result; }

    var effects = layer.Effects;
    debug.push('total effects on layer: ' + effects.numProperties);

    var oi, ei, fx, found;
    // Log all effect names on the layer for comparison
    var effectNames = [];
    for (ei = 1; ei <= effects.numProperties; ei++) {
      fx = effects.property(ei);
      effectNames.push('#' + ei + ' name="' + fx.name + '" matchName="' + fx.matchName + '"');
    }
    debug.push('before: ' + effectNames.join(' | '));

    // Clean up any orphan anchors left from previous failed runs
    var cleanupAnchors = [];
    for (ei = 1; ei <= effects.numProperties; ei++) {
      fx = effects.property(ei);
      if (fx.name.indexOf('__anchor__') === 0) {
        cleanupAnchors.push(ei);
      }
    }
    for (ei = cleanupAnchors.length - 1; ei >= 0; ei--) {
      var anchorIdx = cleanupAnchors[ei];
      debug.push('removing orphan anchor at index ' + anchorIdx);
      effects.property(anchorIdx).remove();
    }

    // Enumerate available methods on the first effect for debugging
    var firstFx = effects.numProperties > 0 ? effects.property(1) : null;
    if (firstFx) {
      var methodNames = [];
      for (var mk in firstFx) {
        if (typeof firstFx[mk] === 'function') methodNames.push(mk);
      }
      debug.push('methods on fx: ' + methodNames.join(', '));
      debug.push('typeof moveToBeginning: ' + (typeof firstFx.moveToBeginning));
      debug.push('typeof moveToEnd: ' + (typeof firstFx.moveToEnd));
      debug.push('typeof moveAfter: ' + (typeof firstFx.moveAfter));
      debug.push('typeof moveBefore: ' + (typeof firstFx.moveBefore));
      debug.push('typeof moveTo: ' + (typeof firstFx.moveTo));
      debug.push('typeof remove: ' + (typeof firstFx.remove));
    }

    // Use moveTo(index) — the only move method available on effects in this AE version.
    // moveTo(1) moves the effect to position 1 (top of the stack).
    // Iterate the desired order bottom-to-top so the most upstream effect
    // ends up at the top after all iterations.
    for (oi = order.length - 1; oi >= 0; oi--) {
      var entry = order[oi];
      var targetName = entry.matchName + '__' + entry.nodeUUID;
      debug.push('--- entry ' + oi + ': targetName="' + targetName + '" ---');

      found = false;
      for (ei = 1; ei <= effects.numProperties; ei++) {
        fx = effects.property(ei);
        if (fx.name === targetName) {
          found = true;
          break;
        }
      }
      if (!found) {
        for (ei = 1; ei <= effects.numProperties; ei++) {
          fx = effects.property(ei);
          if (fx.matchName === entry.matchName) {
            found = true;
            break;
          }
        }
      }
      if (!found) {
        debug.push('EFFECT NOT FOUND, skipping');
        continue;
      }

      debug.push('calling moveTo(1) on fx.name="' + fx.name + '" (current index ' + ei + ')');
      fx.moveTo(1);
      debug.push('moveTo(1) completed');
    }

    // Log final effect order
    effectNames = [];
    for (ei = 1; ei <= effects.numProperties; ei++) {
      fx = effects.property(ei);
      effectNames.push('#' + ei + ' name="' + fx.name + '" matchName="' + fx.matchName + '"');
    }
    debug.push('after: ' + effectNames.join(' | '));

    result.ok = true;
    result.data = { reordered: order.length };
  } catch (e) {
    debug.push('EXCEPTION: ' + e.toString());
    result.error = e.toString();
  }
  result._debug = debug;
  return result;
}

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
