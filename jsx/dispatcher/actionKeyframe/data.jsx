// actionKeyframe/data.jsx — _handleGetKeyframeData (ES3-safe)
// REQUIRES: json.jsx, utils.jsx, actionKeyframe/shared.jsx

function _handleGetKeyframeData(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'getKeyframeData: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.nodeUUID;
    if (!layerUUID) { result.error = 'getKeyframeData: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'getKeyframeData: layer not found'; return result; }

    var keyframes = [];
    if (params.key === 'fontSize' || params.key === 'color' || params.key === 'content') {
      var srcText = layer.text && layer.text.sourceText ? layer.text.sourceText : null;
      if (srcText) {
        for (var i = 1; i <= srcText.numKeys; i++) {
          keyframes.push({ time: srcText.keyTime(i), value: srcText.keyValue(i) });
        }
      }
    } else {
      var prop = _resolveShapeProperty(layer, params.key);
      if (!prop) { prop = layer.property(params.key); }
      if (prop) {
        for (var i = 1; i <= prop.numKeys; i++) {
          keyframes.push({ time: prop.keyTime(i), value: prop.keyValue(i) });
        }
      }
    }
    result.ok = true;
    result.data = { keyframes: keyframes };
  } catch (e) { result.error = e.toString(); }
  return result;
}
