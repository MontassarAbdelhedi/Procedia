/**
 * @fileoverview Batch effect property read handler (ES3-safe).
 * Reads effect property values from AE effects for polling.
 * REQUIRES: json.jsx, utils.jsx, applyActionEffect/findPropByMatchName.jsx
 * Load BEFORE: dispatcher.jsx
 * Exports: _handleBatchGetEffectProperties
 */

/**
 * Reads specified properties from multiple effects in a single call.
 * Accepts an array of {nodeUUID, hostingCompUUID, layerUUID, effectMatchName, keys}.
 * Returns {ok, data: {properties: {nodeUUID: {matchName: value, ...}, ...}}}.
 * @param {Object} cmd Command with params.entries array.
 * @return {Object} Result with .ok, .data.properties.
 */
function _handleBatchGetEffectProperties(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var entries = _cmdParams(cmd).entries || [];
    var output = {};

    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var comp = findCompByUUID(entry.hostingCompUUID);
      if (!comp) continue;
      var layer = findLayerByUUID(comp, entry.layerUUID);
      if (!layer) continue;

      // Look for the effect by its full name (matchName + '__' + nodeUUID),
      // then fall back to matchName alone
      var targetName = entry.effectMatchName + '__' + entry.nodeUUID;
      var effects = layer.Effects;
      var fx = null;
      var ei;
      for (ei = 1; ei <= effects.numProperties; ei++) {
        var e = effects.property(ei);
        if (e.name === targetName) { fx = e; break; }
      }
      if (!fx) {
        for (ei = 1; ei <= effects.numProperties; ei++) {
          var e = effects.property(ei);
          if (e.matchName === entry.effectMatchName) { fx = e; break; }
        }
      }
      if (!fx) continue;

      // Read each requested property
      var effectProps = {};
      for (var k = 0; k < entry.keys.length; k++) {
        var key = entry.keys[k];
        var prop = _findPropByMatchName(fx, key);
        if (prop) {
          if (prop.propertyValueType === PropertyValueType.COLOR) {
            effectProps[key] = [prop.value[0], prop.value[1], prop.value[2], prop.value[3]];
          } else {
            effectProps[key] = prop.value;
          }
        }
      }
      // Key by nodeUUID for direct reverse mapping on the panel side
      output[entry.nodeUUID] = effectProps;
    }

    result.ok = true;
    result.data = { properties: output };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
