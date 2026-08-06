/**
 * @fileoverview Layer property setter handler (ES3-safe).
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: _handlers.jsx (functions become globals for _handlers map)
 * Exports: _handleSetLayerProperty
 */
// actions_property.jsx — Layer property setter handler (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: _handlers.jsx (functions become globals for _handlers map)

/**
 * Sets a named property on a layer (e.g. position, opacity, rotation).
 * Handles standard layer properties and shape-specific properties
 * (width, height, roundness, fill, stroke) by navigating the shape Contents group.
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID, nodeUUID, key, value.
 * @return {Object} Result with .ok, .error.
 */
function _handleSetLayerProperty(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setLayerProperty: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.nodeUUID;
    if (!layerUUID) { result.error = 'setLayerProperty: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'setLayerProperty: layer not found'; return result; }

    var key = params.key;
    var value = params.value;
    var contents = layer.property('ADBE Root Vectors Group');

    if (key === 'label') {
      layer.name = String(value);
    } else if (key === 'width' || key === 'height') {
      if (contents) {
        var rect = contents.property('ADBE Vector Shape - Rect');
        if (rect) {
          var size = rect.property('ADBE Vector Rect Size').value;
          if (key === 'width') { size[0] = value; } else { size[1] = value; }
          rect.property('ADBE Vector Rect Size').setValue(size);
        } else {
          var ell = contents.property('ADBE Vector Shape - Ellipse');
          if (ell) {
            var size = ell.property('ADBE Vector Ellipse Size').value;
            if (key === 'width') { size[0] = value; } else { size[1] = value; }
            ell.property('ADBE Vector Ellipse Size').setValue(size);
          }
        }
      }
    } else if (key === 'roundness') {
      if (contents) {
        var rect = contents.property('ADBE Vector Shape - Rect');
        if (rect) {
          rect.property('ADBE Vector Rect Roundness').setValue(value);
        } else {
          var poly = contents.property('ADBE Vector Shape - Polystar');
          if (poly) {
            poly.property('ADBE Vector Polystar Roundness').setValue(value);
          }
        }
      }
    } else if (key === 'roundCorners') {
      if (contents) {
        var rect = contents.property('ADBE Vector Shape - Rect');
        if (rect) {
          if (!value) { rect.property('ADBE Vector Rect Roundness').setValue(0); }
        }
      }
    } else if (key === 'sides' || key === 'points') {
      if (contents) {
        var poly = contents.property('ADBE Vector Shape - Polystar');
        if (poly) {
          poly.property('ADBE Vector Polystar Points').setValue(value);
        }
      }
    } else if (key === 'outerRadius') {
      if (contents) {
        var poly = contents.property('ADBE Vector Shape - Polystar');
        if (poly) {
          poly.property('ADBE Vector Polystar Outer Radius').setValue(value);
        }
      }
    } else if (key === 'innerRadius') {
      if (contents) {
        var poly = contents.property('ADBE Vector Shape - Polystar');
        if (poly) {
          poly.property('ADBE Vector Polystar Inner Radius').setValue(value);
        }
      }
    } else if (key === 'fill') {
      if (contents) {
        var fill = contents.property('ADBE Vector Graphic - Fill');
        if (fill) {
          fill.property('ADBE Vector Fill Color').setValue(value);
        }
      }
    } else if (key === 'stroke') {
      if (contents) {
        var stroke = contents.property('ADBE Vector Graphic - Stroke');
        if (!stroke && value && value.length === 4 && value[3] > 0) {
          stroke = contents.addProperty('ADBE Vector Graphic - Stroke');
          stroke.property('ADBE Vector Stroke Line Width').setValue(1);
        }
        if (stroke) {
          stroke.property('ADBE Vector Stroke Color').setValue(value);
        }
      }
    } else if (key === 'depthOfField') {
      try { layer.depthOfField = Boolean(value); } catch (e) {}
    } else if (key === 'zoom') {
      try { layer.zoom.setValue(value); } catch (e) {}
    } else if (key === 'focusDistance') {
      try { layer.focusDistance.setValue(value); } catch (e) {}
    } else if (key === 'aperture') {
      try { layer.aperture.setValue(value); } catch (e) {}
    } else if (key === 'blurLevel') {
      try { layer.blurLevel.setValue(value); } catch (e) {}
    } else if (key === 'position') {
      layer.position.setValue(value);
    } else if (key === 'rotation') {
      layer.rotation.setValue(value);
    } else if (key === 'scale') {
      layer.scale.setValue(value);
    } else if (key === 'opacity') {
      layer.opacity.setValue(value);
    } else if (key === 'fontSize' || key === 'color' || key === 'content') {
      var td = layer.text && layer.text.sourceText ? layer.text.sourceText.value : null;
      if (td) {
        if (key === 'fontSize') td.fontSize = value;
        else if (key === 'color') td.fillColor = [value[0], value[1], value[2]];
        else if (key === 'content') td.text = String(value);
        layer.text.sourceText.setValue(td);
      }
    } else {
      var prop = layer.property(key);
      if (prop) prop.setValue(value);
    }

    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}
