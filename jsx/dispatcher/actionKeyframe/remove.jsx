// actionKeyframe/remove.jsx — _handleRemoveAllKeyframes, _handleRemoveKeyframe (ES3-safe)
// REQUIRES: json.jsx, utils.jsx

function _handleRemoveAllKeyframes(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'removeAllKeyframes: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.nodeUUID;
    if (!layerUUID) { result.error = 'removeAllKeyframes: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'removeAllKeyframes: layer not found: ' + layerUUID; return result; }
    if (params.key === 'fontSize' || params.key === 'color' || params.key === 'content') {
      var srcText = layer.text && layer.text.sourceText ? layer.text.sourceText : null;
      if (srcText) {
        while (srcText.numKeys > 0) { srcText.removeKey(1); }
        result.ok = true;
        return result;
      }
      result.error = 'removeAllKeyframes: text layer not found';
      return result;
    }

    var property = layer.property(params.key);
    if (!property) { result.error = 'removeAllKeyframes: property not found'; return result; }

    while (property.numKeys > 0) {
      property.removeKey(1);
    }

    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleRemoveKeyframe(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'removeKeyframe: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.nodeUUID;
    if (!layerUUID) { result.error = 'removeKeyframe: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'removeKeyframe: layer not found: ' + layerUUID; return result; }
    var kfTime = (params.time !== undefined && params.time !== null) ? Number(params.time) : comp.time;
    if (isNaN(kfTime)) { result.error = 'removeKeyframe: invalid time'; return result; }

    if (params.key === 'fontSize' || params.key === 'color' || params.key === 'content') {
      var srcText = layer.text && layer.text.sourceText ? layer.text.sourceText : null;
      if (srcText) {
        var nearestIndex = srcText.nearestKeyIndex(kfTime);
        if (nearestIndex > 0) {
          var nearestTime = srcText.keyTime(nearestIndex);
          if (Math.abs(nearestTime - kfTime) < 0.01) {
            srcText.removeKey(nearestIndex);
          }
        }
        result.ok = true;
        return result;
      }
      result.error = 'removeKeyframe: text layer not found';
      return result;
    }

    var property = layer.property(params.key);
    if (!property) { result.error = 'removeKeyframe: property not found'; return result; }
    var nearestIndex = property.nearestKeyIndex(kfTime);
    if (nearestIndex > 0) {
      var nearestTime = property.keyTime(nearestIndex);
      if (Math.abs(nearestTime - kfTime) < 0.01) {
        property.removeKey(nearestIndex);
      }
    }
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}
