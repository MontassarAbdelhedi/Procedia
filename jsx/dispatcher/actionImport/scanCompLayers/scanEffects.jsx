/**
 * @fileoverview Effect scanner for import — reads all effects and their
 * leaf property values from an AE layer. (ES3-safe)
 * REQUIRES: (none)
 * Load BEFORE: scanCompLayers.jsx
 * Exports: _scanEffects, _walkEffectProperties
 */
// scanCompLayers/scanEffects.jsx — Import effect scanner (ES3-safe)

function _scanEffects(layer) {
  var effects = [];
  try {
    if (!layer.Effects || layer.Effects.numProperties === 0) return effects;
    for (var ei = 1; ei <= layer.Effects.numProperties; ei++) {
      var effect = layer.Effects.property(ei);
      if (!effect || !effect.matchName) continue;

      var effEntry = {
        matchName: effect.matchName,
        name:      effect.name,
        enabled:   effect.enabled !== false,
        properties: {}
      };

      _walkEffectProperties(effect, effEntry.properties);

      effects.push(effEntry);
    }
  } catch (e) {}
  return effects;
}

function _walkEffectProperties(parent, propsObj) {
  try {
    for (var pi = 1; pi <= parent.numProperties; pi++) {
      var prop = parent.property(pi);
      if (!prop) continue;
      if (prop.numProperties > 0) {
        _walkEffectProperties(prop, propsObj);
        continue;
      }
      if (typeof prop.setValue !== 'function') continue;
      if (prop.propertyValueType === undefined || prop.propertyValueType === null) continue;

      var key = prop.matchName;
      if (!key) key = prop.name;
      if (!key) continue;

      try {
        var val = prop.value;
        if (val instanceof Array) {
          var arr = [];
          for (var ai = 0; ai < val.length; ai++) arr.push(val[ai]);
          propsObj[key] = arr;
        } else {
          propsObj[key] = val;
        }
      } catch (e) {}
    }
  } catch (e) {}
}
