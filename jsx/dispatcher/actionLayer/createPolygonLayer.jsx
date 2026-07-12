/**
 * @fileoverview Creates a regular polygon shape layer with computed vertices. (ES3-safe)
 * The polygon path is generated programmatically with N equally-spaced vertices on a circle.
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionLayer/createPolygonLayer.jsx — Create polygon layer handler (ES3-safe)

function _computePolygonVertices(sides, radius) {
  var vertices = [];
  var startAngle = -Math.PI / 2;
  var step = (2 * Math.PI) / sides;
  for (var i = 0; i < sides; i++) {
    var a = startAngle + i * step;
    vertices.push([radius * Math.cos(a), radius * Math.sin(a)]);
  }
  return vertices;
}

function _handleCreatePolygonLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'createPolygonLayer: host comp not found'; return result; }

    var layer = null;
    var isUpdate = false;
    if (params.layerUUID) {
      layer = findLayerByUUID(comp, params.layerUUID);
      if (layer) isUpdate = true;
    }

    if (!isUpdate) {
      layer = comp.layers.addShape();
      if (params.layerUUID) layer.comment = params.layerUUID;
    }
    if (params.label) layer.name = params.label;

    var shapes = layer.property('ADBE Root Vectors Group');
    if (!shapes) { result.error = 'createPolygonLayer: no shape contents'; return result; }

    if (isUpdate) {
      var numProps = shapes.numProperties;
      for (var i = numProps; i >= 1; i--) {
        var p = shapes.property(i);
        var mn = p.matchName;
        if (mn === 'ADBE Vector Graphic - Fill' || mn === 'ADBE Vector Graphic - Stroke') {
          p.remove();
        } else if (p.name && p.name.indexOf('__ProcediaPath__') === 0) {
          p.remove();
        }
      }
    }

    var nSides = params.sides !== undefined ? params.sides : 6;
    var rad = params.radius !== undefined ? params.radius : 100;
    var vertices = _computePolygonVertices(nSides, rad);

    var pathGroup = shapes.addProperty('ADBE Vector Shape - Group');
    pathGroup.name = '__ProcediaPath__';

    var myShape = new Shape();
    myShape.vertices = vertices;
    myShape.inTangents = [];
    myShape.outTangents = [];
    myShape.closed = true;

    var pathData = pathGroup.property('ADBE Vector Shape');
    if (pathData) {
      pathData.setValue(myShape);
    }

    var fill = shapes.addProperty('ADBE Vector Graphic - Fill');
    if (params.fill) fill.property('ADBE Vector Fill Color').setValue(params.fill);

    if (params.stroke && params.stroke.length === 4 && params.stroke[3] > 0) {
      var stroke = shapes.addProperty('ADBE Vector Graphic - Stroke');
      stroke.property('ADBE Vector Stroke Color').setValue(params.stroke);
      stroke.property('ADBE Vector Stroke Line Width').setValue(1);
    }

    if (!isUpdate) {
      if (params.position && params.position.length === 2) { layer.position.setValue(params.position); }
      if (params.rotation !== undefined && params.rotation !== null) { layer.rotation.setValue(params.rotation); }
      if (params.opacity !== undefined && params.opacity !== null) { layer.opacity.setValue(params.opacity); }
      if (params.scale && params.scale.length === 2) { layer.scale.setValue(params.scale); }
    }

    result.ok = true;
    result.data = { layerName: layer.name };
  } catch (e) { result.error = e.toString(); }
  return result;
}
