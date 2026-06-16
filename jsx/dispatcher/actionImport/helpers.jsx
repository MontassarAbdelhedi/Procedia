/**
 * @fileoverview Import helpers: UUID generation, transform reading, effect
 * property reading, and layer type classification. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx, actionImport/read.jsx, actionImport/handler.jsx
 */
// actionImport/helpers.jsx — Import helpers (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

var _import_uuid_counter = 0;

function _import_uuid(prefix) {
  _import_uuid_counter++;
  var ts = '';
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (var ci = 0; ci < 6; ci++) {
    ts += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + '-' + ts + '-' + String(_import_uuid_counter);
}

function _readTransformProp(layer, matchName, def) {
  try {
    var prop = layer.property(matchName);
    if (prop) return prop.value;
  } catch (e) {}
  return def;
}

function _readTransform(layer) {
  return {
    position:    _readTransformProp(layer, 'ADBE Position', [0, 0]),
    scale:       _readTransformProp(layer, 'ADBE Scale', [100, 100]),
    rotation:    _readTransformProp(layer, 'ADBE Rotate Z', 0),
    opacity:     _readTransformProp(layer, 'ADBE Opacity', 100),
    anchorPoint: _readTransformProp(layer, 'ADBE Anchor Point', [0, 0])
  };
}

function _readEffectProps(effect, arr) {
  for (var pi = 1; pi <= effect.numProperties; pi++) {
    var prop = effect.property(pi);
    try {
      var ptype = prop.propertyType;
      if (ptype === PropertyType.INDEXED_GROUP || ptype === PropertyType.NAMED_GROUP) {
        _readEffectProps(prop, arr);
      } else if (typeof prop.value !== 'undefined') {
        arr.push({ matchName: prop.matchName, value: prop.value });
      }
    } catch (e) {}
  }
}

function _readEffects(layer) {
  var result = [];
  try {
    var effectsGroup = layer.property('ADBE Effect Parade');
    if (!effectsGroup) return result;
    for (var ei = 1; ei <= effectsGroup.numProperties; ei++) {
      var effect = effectsGroup.property(ei);
      var props = [];
      _readEffectProps(effect, props);
      result.push({
        matchName: effect.matchName,
        name:      effect.name,
        index:     ei,
        properties: props
      });
    }
  } catch (e) {}
  return result;
}

function _layerType(layer) {
  if (layer instanceof TextLayer)       return 'text';
  if (layer instanceof ShapeLayer)      return 'shape';
  if (layer instanceof CameraLayer)     return 'camera';
  if (layer instanceof LightLayer)      return 'light';
  if (!(layer instanceof AVLayer))      return 'unknown';
  if (layer.nullLayer)                  return 'null';
  if (layer.adjustmentLayer)            return 'adjustment';
  if (layer.source instanceof CompItem) return 'precomp';
  if (layer.source instanceof FootageItem) {
    var ms = layer.source.mainSource;
    if (ms instanceof SolidSource) return 'solid';
    return 'footage';
  }
  return 'unknown';
}
