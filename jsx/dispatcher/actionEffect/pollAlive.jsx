/**
 * @fileoverview Poll alive effects handler — checks which effect nodes still
 * have their AE effect present on the host layer. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 */
// actionEffect/pollAlive.jsx — Poll alive effects handler (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

function _handlePollAliveEffects(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var entries = params.entries || [];
    var missingEffectNodeUUIDs = [];
    var i;

    for (i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var comp = findCompByUUID(entry.hostingCompUUID);
      if (!comp) {
        missingEffectNodeUUIDs.push(entry.nodeUUID);
        continue;
      }
      var layer = findLayerByUUID(comp, entry.layerNodeUUID);
      if (!layer) {
        missingEffectNodeUUIDs.push(entry.nodeUUID);
        continue;
      }
      var targetEffectName = entry.matchName + '__' + entry.nodeUUID;
      var found = false;
      var ei;
      var fx;
      for (ei = 1; ei <= layer.Effects.numProperties; ei++) {
        fx = layer.Effects.property(ei);
        if (fx.name === targetEffectName) {
          found = true;
          break;
        }
      }
      if (!found) {
        for (ei = 1; ei <= layer.Effects.numProperties; ei++) {
          fx = layer.Effects.property(ei);
          if (fx.matchName === entry.matchName) {
            found = true;
            break;
          }
        }
      }
      if (!found) missingEffectNodeUUIDs.push(entry.nodeUUID);
    }

    result.ok = true;
    result.data = { missingEffectNodeUUIDs: missingEffectNodeUUIDs };
  } catch (e) { result.error = e.toString(); }
  return result;
}
