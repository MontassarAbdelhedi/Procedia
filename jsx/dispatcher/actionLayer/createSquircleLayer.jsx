/**
 * @fileoverview Creates a squircle shape layer with computed superellipse path. (ES3-safe)
 * The squircle path is generated programmatically using the superellipse equation.
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionLayer/createSquircleLayer.jsx — Create squircle layer handler (ES3-safe)

function _computeSquircleVertices(width, height, roundness) {
  var n = 2 + (100 - roundness) * 0.98;
  if (n < 2) n = 2;
  if (n > 100) n = 100;
  var segments = 64;
  var hw = width / 2;
  var hh = height / 2;
  var vertices = [];
  var i;
  for (i = 0; i < segments; i++) {
    var t = (i / segments) * 2 * Math.PI;
    var cosT = Math.cos(t);
    var sinT = Math.sin(t);
    var sx = (cosT >= 0 ? 1 : -1) * Math.pow(Math.abs(cosT), 2 / n);
    var sy = (sinT >= 0 ? 1 : -1) * Math.pow(Math.abs(sinT), 2 / n);
    vertices.push([hw * sx, hh * sy]);
  }
  return vertices;
}

function _handleCreateSquircleLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'createSquircleLayer: host comp not found'; return result; }

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
    if (!shapes) { result.error = 'createSquircleLayer: no shape contents'; return result; }

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

    var w = params.width !== undefined ? params.width : 200;
    var h = params.height !== undefined ? params.height : 200;
    var r = params.roundness !== undefined ? params.roundness : 50;
    var vertices = _computeSquircleVertices(w, h, r);

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
