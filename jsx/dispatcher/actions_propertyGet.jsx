/**
 * @fileoverview Batch layer property read handler (ES3-safe).
 * Reads transform and shape properties from AE layers in bulk.
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 * Exports: _handleBatchGetLayerProperties
 */

/**
 * Reads specified properties from multiple AE layers in a single call.
 * Accepts an array of {hostingCompUUID, layerUUID, keys}.
 * Returns {ok, data: {properties: {layerUUID: {key: value, ...}, ...}}}.
 * @param {Object} cmd Command with params.entries array.
 * @return {Object} Result with .ok, .data.properties.
 */
function _handleBatchGetLayerProperties(cmd) {
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

      var layerProps = {};
      for (var k = 0; k < entry.keys.length; k++) {
        var key = entry.keys[k];
        if (key === 'position') {
          var v = layer.position.value;
          layerProps[key] = [v[0], v[1]];
        } else if (key === 'rotation') {
          layerProps[key] = layer.rotation.value;
        } else if (key === 'scale') {
          var v = layer.scale.value;
          layerProps[key] = [v[0], v[1]];
        } else if (key === 'opacity') {
          layerProps[key] = layer.opacity.value;
        } else if (key === 'width' || key === 'height') {
          var contents = layer.property('ADBE Root Vectors Group');
          if (!contents) { layerProps[key] = null; continue; }
          var rect = contents.property('ADBE Vector Shape - Rect');
          if (rect) {
            var size = rect.property('ADBE Vector Rect Size').value;
            layerProps[key] = (key === 'width') ? size[0] : size[1];
          } else {
            var ell = contents.property('ADBE Vector Shape - Ellipse');
            if (ell) {
              var size = ell.property('ADBE Vector Ellipse Size').value;
              layerProps[key] = (key === 'width') ? size[0] : size[1];
            } else {
              layerProps[key] = null;
            }
          }
        } else if (key === 'roundness') {
          var contents = layer.property('ADBE Root Vectors Group');
          if (!contents) { layerProps[key] = null; continue; }
          var rect = contents.property('ADBE Vector Shape - Rect');
          if (rect) {
            layerProps[key] = rect.property('ADBE Vector Rect Roundness').value;
          } else {
            var poly = contents.property('ADBE Vector Shape - Polystar');
            if (poly) {
              layerProps[key] = poly.property('ADBE Vector Polystar Roundness').value;
            } else {
              layerProps[key] = null;
            }
          }
        } else if (key === 'sides' || key === 'points') {
          var contents = layer.property('ADBE Root Vectors Group');
          if (!contents) { layerProps[key] = null; continue; }
          var poly = contents.property('ADBE Vector Shape - Polystar');
          layerProps[key] = poly ? poly.property('ADBE Vector Polystar Points').value : null;
        } else if (key === 'outerRadius') {
          var contents = layer.property('ADBE Root Vectors Group');
          if (!contents) { layerProps[key] = null; continue; }
          var poly = contents.property('ADBE Vector Shape - Polystar');
          layerProps[key] = poly ? poly.property('ADBE Vector Polystar Outer Radius').value : null;
        } else if (key === 'innerRadius') {
          var contents = layer.property('ADBE Root Vectors Group');
          if (!contents) { layerProps[key] = null; continue; }
          var poly = contents.property('ADBE Vector Shape - Polystar');
          layerProps[key] = poly ? poly.property('ADBE Vector Polystar Inner Radius').value : null;
        } else if (key === 'fill') {
          var contents = layer.property('ADBE Root Vectors Group');
          if (!contents) { layerProps[key] = null; continue; }
          var fill = contents.property('ADBE Vector Graphic - Fill');
          if (!fill) { layerProps[key] = null; continue; }
          layerProps[key] = fill.property('ADBE Vector Fill Color').value;
        } else if (key === 'stroke') {
          var contents = layer.property('ADBE Root Vectors Group');
          if (!contents) { layerProps[key] = null; continue; }
          var stroke = contents.property('ADBE Vector Graphic - Stroke');
          if (!stroke) { layerProps[key] = null; continue; }
          layerProps[key] = stroke.property('ADBE Vector Stroke Color').value;
        }
      }
      output[entry.layerUUID] = layerProps;
    }

    result.ok = true;
    result.data = { properties: output };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
