/**
 * @fileoverview Creates a rectangle shape layer in the hosting comp. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionLayer/createRectangleLayer.jsx — Create rectangle layer handler (ES3-safe)

function _handleCreateRectangleLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'createRectangleLayer: host comp not found'; return result; }
    var layer = comp.layers.addShape();
    if (params.layerUUID) layer.comment = params.layerUUID;
    if (params.label) layer.name = params.label;

    var shapes = layer.property('ADBE Root Vectors Group');

    // Add rectangle path
    var rectPath = shapes.addProperty('ADBE Vector Shape - Rect');
    if (params.width !== undefined && params.height !== undefined) {
      rectPath.property('ADBE Vector Rect Size').setValue([params.width, params.height]);
    }
    if (params.roundCorners) {
      rectPath.property('ADBE Vector Rect Roundness').setValue(params.roundness || 0);
    } else {
      rectPath.property('ADBE Vector Rect Roundness').setValue(0);
    }

    // Add fill
    var fill = shapes.addProperty('ADBE Vector Graphic - Fill');
    if (params.fill) {
      fill.property('ADBE Vector Fill Color').setValue(params.fill);
    }

    // Add stroke if non-transparent
    if (params.stroke && params.stroke.length === 4 && params.stroke[3] > 0) {
      var stroke = shapes.addProperty('ADBE Vector Graphic - Stroke');
      stroke.property('ADBE Vector Stroke Color').setValue(params.stroke);
      stroke.property('ADBE Vector Stroke Line Width').setValue(1);
    }

    // Layer transform
    if (params.position && params.position.length === 2) {
      layer.position.setValue(params.position);
    }
    if (params.rotation !== undefined && params.rotation !== null) {
      layer.rotation.setValue(params.rotation);
    }
    if (params.opacity !== undefined && params.opacity !== null) {
      layer.opacity.setValue(params.opacity);
    }
    if (params.scale && params.scale.length === 2) {
      layer.scale.setValue(params.scale);
    }

    result.ok = true;
    result.data = { layerName: layer.name };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
