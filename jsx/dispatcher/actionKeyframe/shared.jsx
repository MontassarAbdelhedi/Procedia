// actionKeyframe/shared.jsx — Shared keyframe helpers (ES3-safe)
// REQUIRES: json.jsx, utils.jsx

function _resolveShapeProperty(layer, key) {
  var contents = layer.property('ADBE Root Vectors Group');
  if (!contents) return null;

  if (key === 'width' || key === 'height') {
    var rect = contents.property('ADBE Vector Shape - Rect');
    if (rect) return rect.property('ADBE Vector Rect Size');
    var ell = contents.property('ADBE Vector Shape - Ellipse');
    if (ell) return ell.property('ADBE Vector Ellipse Size');
  } else if (key === 'roundness') {
    var rect = contents.property('ADBE Vector Shape - Rect');
    if (rect) return rect.property('ADBE Vector Rect Roundness');
    var poly = contents.property('ADBE Vector Shape - Polystar');
    if (poly) return poly.property('ADBE Vector Polystar Roundness');
  } else if (key === 'fill') {
    var fill = contents.property('ADBE Vector Graphic - Fill');
    if (fill) return fill.property('ADBE Vector Fill Color');
  } else if (key === 'stroke') {
    var stroke = contents.property('ADBE Vector Graphic - Stroke');
    if (stroke) return stroke.property('ADBE Vector Stroke Color');
  } else if (key === 'sides' || key === 'points') {
    var poly = contents.property('ADBE Vector Shape - Polystar');
    if (poly) return poly.property('ADBE Vector Polystar Points');
  } else if (key === 'outerRadius') {
    var poly = contents.property('ADBE Vector Shape - Polystar');
    if (poly) return poly.property('ADBE Vector Polystar Outer Radius');
  } else if (key === 'innerRadius') {
    var poly = contents.property('ADBE Vector Shape - Polystar');
    if (poly) return poly.property('ADBE Vector Polystar Inner Radius');
  }
  return null;
}
