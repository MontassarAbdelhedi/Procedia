// actionKeyframe/times.jsx — _handleGetKeyframeTimes, _handleBatchGetKeyframeTimes (ES3-safe)
// REQUIRES: json.jsx, utils.jsx, actionKeyframe/shared.jsx

function _handleGetKeyframeTimes(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'getKeyframeTimes: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.nodeUUID;
    if (!layerUUID) { result.error = 'getKeyframeTimes: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'getKeyframeTimes: layer not found: ' + layerUUID; return result; }
    if (params.key === 'fontSize' || params.key === 'color' || params.key === 'content') {
      var srcText = layer.text && layer.text.sourceText ? layer.text.sourceText : null;
      if (srcText) {
        var times = [];
        var n = srcText.numKeys;
        for (var i = 1; i <= n; i++) { times.push(srcText.keyTime(i)); }
        result.ok = true;
        result.data = { times: times };
        return result;
      }
      result.error = 'getKeyframeTimes: text layer not found';
      return result;
    }

    var prop = _resolveShapeProperty(layer, params.key);
    if (!prop) { prop = layer.property(params.key); }
    if (!prop) { result.error = 'getKeyframeTimes: property not found'; return result; }

    var times = [];
    var n = prop.numKeys;
    for (var i = 1; i <= n; i++) {
      times.push(prop.keyTime(i));
    }

    result.ok = true;
    result.data = { times: times };
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleBatchGetKeyframeTimes(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var entries = params.entries || [];
    var results = [];
    for (var ei = 0; ei < entries.length; ei++) {
      var entry = entries[ei];
      var comp = findCompByUUID(entry.hostingCompUUID);
      if (!comp) { results.push({ key: entry.key, layerUUID: entry.layerUUID, times: [] }); continue; }
      var layer = findLayerByUUID(comp, entry.layerUUID);
      if (!layer) { results.push({ key: entry.key, layerUUID: entry.layerUUID, times: [] }); continue; }
      var times = [];
      if (entry.key === 'fontSize' || entry.key === 'color' || entry.key === 'content') {
        var srcText = layer.text && layer.text.sourceText ? layer.text.sourceText : null;
        if (srcText) {
          var n = srcText.numKeys;
          for (var i = 1; i <= n; i++) { times.push(srcText.keyTime(i)); }
        }
      } else {
        var prop = _resolveShapeProperty(layer, entry.key);
        if (!prop) { prop = layer.property(entry.key); }
        if (prop) {
          var n = prop.numKeys;
          for (var i = 1; i <= n; i++) { times.push(prop.keyTime(i)); }
        }
      }
      results.push({ key: entry.key, layerUUID: entry.layerUUID, times: times });
    }
    result.ok = true;
    result.data = { results: results };
  } catch (e) { result.error = e.toString(); }
  return result;
}
