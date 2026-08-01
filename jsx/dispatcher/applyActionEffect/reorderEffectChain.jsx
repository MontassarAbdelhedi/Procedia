/**
 * @fileoverview Reorders the entire effect chain on a layer. (ES3-safe)
 * Uses moveTo(index) — the only move method available on effects in this AE version.
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// applyActionEffect/reorderEffectChain.jsx — Reorder effect chain handler (ES3-safe)

function _handleReorderEffectChain(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var order = params.order;
    if (!order || order.length < 2) {
      result.error = 'reorderEffectChain: order array required with at least 2 entries';
      return result;
    }

    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'reorderEffectChain: host comp not found'; return result; }

    var layerUUID = params.layerUUID || params.layerNodeUUID;
    if (!layerUUID) { result.error = 'reorderEffectChain: layerUUID required'; return result; }

    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'reorderEffectChain: layer not found'; return result; }

    var effects = layer.Effects;
    var ei, fx, found;

    // Use moveTo(index) — the only move method available on effects in this AE version.
    // moveTo(1) moves the effect to position 1 (top of the stack).
    // Iterate the desired order bottom-to-top so the most upstream effect
    // ends up at the top after all iterations.
    for (var oi = order.length - 1; oi >= 0; oi--) {
      var entry = order[oi];
      var targetName = entry.matchName + '__' + entry.nodeUUID;

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
        continue;
      }

      fx.moveTo(1);
    }

    result.ok = true;
    result.data = { reordered: order.length };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
