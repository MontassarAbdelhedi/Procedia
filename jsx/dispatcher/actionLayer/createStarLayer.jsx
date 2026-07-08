/**
 * @fileoverview Creates a star shape layer in the hosting comp. (ES3-safe)
 * Uses Polystar path with points, outer radius, inner radius, and roundness.
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionLayer/createStarLayer.jsx — Create star layer handler (ES3-safe)

function _handleCreateStarLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'createStarLayer: host comp not found'; return result; }
    var layer = comp.layers.addShape();
    if (params.layerUUID) layer.comment = params.layerUUID;
    if (params.label) layer.name = params.label;

    var shapes = layer.property('ADBE Root Vectors Group');

    var starPath = shapes.addProperty('ADBE Vector Shape - Polystar');
    if (params.points !== undefined) {
      starPath.property('ADBE Vector Polystar Points').setValue(params.points);
    }
    if (params.outerRadius !== undefined) {
      starPath.property('ADBE Vector Polystar Outer Radius').setValue(params.outerRadius);
    }
    if (params.innerRadius !== undefined) {
      starPath.property('ADBE Vector Polystar Inner Radius').setValue(params.innerRadius);
    }
    if (params.roundness !== undefined) {
      starPath.property('ADBE Vector Polystar Roundness').setValue(params.roundness);
    }

    var fill = shapes.addProperty('ADBE Vector Graphic - Fill');
    if (params.fill) {
      fill.property('ADBE Vector Fill Color').setValue(params.fill);
    }

    if (params.stroke && params.stroke.length === 4 && params.stroke[3] > 0) {
      var stroke = shapes.addProperty('ADBE Vector Graphic - Stroke');
      stroke.property('ADBE Vector Stroke Color').setValue(params.stroke);
      stroke.property('ADBE Vector Stroke Line Width').setValue(1);
    }

    if (params.position && params.position.length === 2) { layer.position.setValue(params.position); }
    if (params.rotation !== undefined && params.rotation !== null) { layer.rotation.setValue(params.rotation); }
    if (params.opacity !== undefined && params.opacity !== null) { layer.opacity.setValue(params.opacity); }
    if (params.scale && params.scale.length === 2) { layer.scale.setValue(params.scale); }

    result.ok = true;
    result.data = { layerName: layer.name };
  } catch (e) { result.error = e.toString(); }
  return result;
}
