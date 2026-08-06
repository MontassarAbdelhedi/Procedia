/**
 * @fileoverview Layer property readers for import scanning (ES3-safe).
 * Reads transform properties and type-specific properties from AE layers.
 * REQUIRES: (none)
 * Load BEFORE: scanCompLayers.jsx
 * Exports: _readPosition, _readScale, _readRotation, _readOpacity,
 *          _readParentIndex, _readSourceName, _readPropValue,
 *          _readTextContent, _readFontSize, _readTextColor,
 *          _readLightType, _readLightColor, _readShapeFillColor, _readSolidColor
 */
// scanCompLayers/readProps.jsx — Import layer property readers (ES3-safe)

// --- Generic transform readers ---

function _readPosition(layer) {
  try {
    var v = layer.position.value;
    if (v.length >= 3) return [v[0], v[1], v[2]];
    return [v[0], v[1]];
  } catch (e) { return [0, 0]; }
}

function _readScale(layer) {
  try {
    var v = layer.scale.value;
    return [v[0], v[1]];
  } catch (e) { return [100, 100]; }
}

function _readRotation(layer) {
  try { return layer.rotation.value; }
  catch (e) { return 0; }
}

function _readOpacity(layer) {
  try { return layer.opacity.value; }
  catch (e) { return 100; }
}

function _readParentIndex(layer) {
  try {
    if (layer.parent === null) return 0;
    return layer.parent.index;
  } catch (e) { return 0; }
}

function _readSourceName(layer) {
  try {
    if (layer.source) return layer.source.name;
  } catch (e) {}
  return '';
}

function _readPropValue(layer, propName, defaultVal) {
  try {
    if (layer[propName] === undefined) return defaultVal;
    var v = layer[propName].value;
    if (v instanceof Array) {
      var arr = [];
      for (var ai = 0; ai < v.length; ai++) arr.push(v[ai]);
      return arr;
    }
    return v;
  } catch (e) { return defaultVal; }
}

// --- Text layer readers ---

function _readTextContent(layer) {
  try {
    var td = layer.text.sourceText.value;
    return td.text;
  } catch (e) { return ''; }
}

function _readFontSize(layer) {
  try {
    var td = layer.text.sourceText.value;
    return td.fontSize;
  } catch (e) { return 72; }
}

function _readTextColor(layer) {
  try {
    var td = layer.text.sourceText.value;
    var fc = td.fillColor;
    return [fc[0], fc[1], fc[2], 1];
  } catch (e) { return [1, 1, 1, 1]; }
}

// --- Light layer readers ---

function _readLightType(layer) {
  try { return layer.lightType.toString(); }
  catch (e) { return 'point'; }
}

function _readLightColor(layer) {
  try {
    var c = layer.color.value;
    return [c[0], c[1], c[2], 1];
  } catch (e) { return [1, 1, 1, 1]; }
}

// --- Shape layer readers ---

function _readShapeFillColor(layer) {
  try {
    var contents = layer.property('ADBE Root Vectors Group');
    if (!contents) return [1, 1, 1, 1];
    var fill = contents.property('ADBE Vector Graphic - Fill');
    if (!fill) return [1, 1, 1, 1];
    var c = fill.property('ADBE Vector Fill Color').value;
    return [c[0], c[1], c[2], 1];
  } catch (e) { return [1, 1, 1, 1]; }
}

// --- Solid layer readers ---

function _readSolidColor(layer) {
  try {
    if (layer.source && layer.source.mainSource instanceof SolidSource) {
      var sc = layer.source.mainSource.color;
      return [sc[0], sc[1], sc[2], 1];
    }
  } catch (e) {}
  return [0.5, 0.5, 0.5, 1];
}
