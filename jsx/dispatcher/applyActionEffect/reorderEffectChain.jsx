/**
 * @fileoverview Reorders the entire effect chain on a layer. (ES3-safe)
 * Uses moveTo(index) — the only move method available on effects in this AE version.
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// applyActionEffect/reorderEffectChain.jsx — Reorder effect chain handler (ES3-safe)

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
