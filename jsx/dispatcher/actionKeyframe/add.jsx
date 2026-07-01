// actionKeyframe/add.jsx — _handleAddKeyframe (ES3-safe)
// REQUIRES: json.jsx, utils.jsx, actionKeyframe/shared.jsx

function _handleAddKeyframe(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'addKeyframe: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.nodeUUID;
    if (!layerUUID) { result.error = 'addKeyframe: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'addKeyframe: layer not found: ' + layerUUID; return result; }
    var key = params.key;
    var kfTime = (params.time !== undefined && params.time !== null) ? params.time : comp.time;

    if (key === 'fontSize' || key === 'color' || key === 'content') {
      var td = layer.text && layer.text.sourceText ? layer.text.sourceText.value : null;
      if (td) {
        if (params.value !== undefined) {
          if (key === 'fontSize') td.fontSize = params.value;
          else if (key === 'color') td.fillColor = params.value;
          else if (key === 'content') td.text = String(params.value);
        }
        layer.text.sourceText.setValueAtTime(kfTime, td);
        result.ok = true;
        result.data = { time: kfTime };
        return result;
      }
      result.error = 'addKeyframe: text layer not found for ' + key;
      return result;
    }

    if (key === 'width' || key === 'height') {
      var prop = _resolveShapeProperty(layer, key);
      if (prop && params.value !== undefined) {
        var size = prop.value;
        if (key === 'width') { size[0] = params.value; } else { size[1] = params.value; }
        prop.setValueAtTime(kfTime, size);
        result.ok = true;
        result.data = { time: kfTime };
        return result;
      }
      result.error = 'addKeyframe: shape size not found for ' + key;
      return result;
    }
    if (key === 'roundness') {
      var prop = _resolveShapeProperty(layer, key);
      if (prop) {
        prop.setValueAtTime(kfTime, params.value);
        result.ok = true;
        result.data = { time: kfTime };
        return result;
      }
      result.error = 'addKeyframe: shape roundness not found';
      return result;
    }
    if (key === 'sides' || key === 'points') {
      var prop = _resolveShapeProperty(layer, key);
      if (prop) {
        prop.setValueAtTime(kfTime, params.value);
        result.ok = true;
        result.data = { time: kfTime };
        return result;
      }
      result.error = 'addKeyframe: shape polystar points not found';
      return result;
    }
    if (key === 'outerRadius') {
      var prop = _resolveShapeProperty(layer, key);
      if (prop) {
        prop.setValueAtTime(kfTime, params.value);
        result.ok = true;
        result.data = { time: kfTime };
        return result;
      }
      result.error = 'addKeyframe: shape outer radius not found';
      return result;
    }
    if (key === 'innerRadius') {
      var prop = _resolveShapeProperty(layer, key);
      if (prop) {
        prop.setValueAtTime(kfTime, params.value);
        result.ok = true;
        result.data = { time: kfTime };
        return result;
      }
      result.error = 'addKeyframe: shape inner radius not found';
      return result;
    }
    if (key === 'fill') {
      var prop = _resolveShapeProperty(layer, key);
      if (prop) {
        prop.setValueAtTime(kfTime, params.value);
        result.ok = true;
        result.data = { time: kfTime };
        return result;
      }
      result.error = 'addKeyframe: shape fill not found';
      return result;
    }
    if (key === 'stroke') {
      var prop = _resolveShapeProperty(layer, key);
      if (prop) {
        prop.setValueAtTime(kfTime, params.value);
        result.ok = true;
        result.data = { time: kfTime };
        return result;
      }
      result.error = 'addKeyframe: shape stroke not found';
      return result;
    }

    var property = layer.property(key);
    if (!property || !property.canSetExpression) {
      result.error = 'addKeyframe: property not found or not animatable: ' + key;
      return result;
    }
    if (params.value !== undefined) {
      property.setValueAtTime(kfTime, params.value);
    } else {
      property.addKey(kfTime);
    }
    result.ok = true;
    result.data = { time: kfTime };
  } catch (e) { result.error = e.toString(); }
  return result;
}
