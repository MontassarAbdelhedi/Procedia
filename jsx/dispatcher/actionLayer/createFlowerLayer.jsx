/**
 * @fileoverview Creates a flower shape layer with computed parametric path. (ES3-safe)
 * The flower path is generated programmatically using a petal-based formula.
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionLayer/createFlowerLayer.jsx — Create flower layer handler (ES3-safe)

function _computeFlowerVertices(petals, outerRadius, innerRadius) {
  var segments = 128;
  var vertices = [];
  var i;
  for (i = 0; i < segments; i++) {
    var theta = (i / segments) * 2 * Math.PI;
    var petalFactor = (1 + Math.cos(petals * theta)) / 2;
    var r = innerRadius + (outerRadius - innerRadius) * Math.pow(petalFactor, 0.7);
    vertices.push([r * Math.cos(theta), r * Math.sin(theta)]);
  }
  return vertices;
}

function _handleCreateFlowerLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'createFlowerLayer: host comp not found'; return result; }

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
    if (!shapes) { result.error = 'createFlowerLayer: no shape contents'; return result; }

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

    var nPetals = params.petals !== undefined ? params.petals : 8;
    var outerR = params.outerRadius !== undefined ? params.outerRadius : 100;
    var innerR = params.innerRadius !== undefined ? params.innerRadius : 40;
    var vertices = _computeFlowerVertices(nPetals, outerR, innerR);

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
