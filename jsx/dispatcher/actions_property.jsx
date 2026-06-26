/**
 * @fileoverview Layer property/parent/order/blending handlers (ES3-safe).
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 * Exports: _handleSetLayerProperty, _handleClearLayerParent, _handleSetLayerParent,
 *          _handleSetLayerOrder, _handleSetBlendingMode
 */
// actions_property.jsx — Layer property/parent/order/blending handlers (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

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
        }
      }
    } else if (key === 'roundness' || key === 'roundCorners') {
      if (contents) {
        var rect = contents.property('ADBE Vector Shape - Rect');
        if (rect) {
          if (key === 'roundCorners' && !value) {
            rect.property('ADBE Vector Rect Roundness').setValue(0);
          } else if (key === 'roundCorners') {
            result.ok = true; return result;
          } else {
            rect.property('ADBE Vector Rect Roundness').setValue(value);
          }
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
    } else if (key === 'position') {
      layer.position.setValue(value);
    } else if (key === 'rotation') {
      layer.rotation.setValue(value);
    } else if (key === 'scale') {
      layer.scale.setValue(value);
    } else if (key === 'opacity') {
      layer.opacity.setValue(value);
    } else {
      layer.property(key).setValue(value);
    }

    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Clears the parent of a child layer in the given comp.
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID.
 * @return {Object} Result with .ok, .data (cleared), .error.
 */
function _handleClearLayerParent(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'clearLayerParent: comp not found'; return result; }
    var layer = findLayerByUUID(comp, params.layerUUID);
    if (!layer) { result.error = 'clearLayerParent: layer not found: ' + params.layerUUID; return result; }
    layer.parent = null;
    result.ok = true;
    result.data = { cleared: params.layerUUID };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

/**
 * Sets the parent of a child layer in the given comp.
 * @param {Object} cmd Command with params: hostingCompUUID, childLayerUUID, parentLayerUUID.
 * @return {Object} Result with .ok, .error.
 */
function _handleSetLayerParent(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setLayerParent: host comp not found'; return result; }
    var childLayer = findLayerByUUID(comp, params.childLayerUUID);
    if (!childLayer) { result.error = 'setLayerParent: child layer not found'; return result; }
    if (params.parentLayerUUID) {
      var parentLayer = findLayerByUUID(comp, params.parentLayerUUID);
      if (!parentLayer) { result.error = 'setLayerParent: parent layer not found'; return result; }
      childLayer.parent = parentLayer;
    } else {
      childLayer.parent = null;
    }
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Moves a layer up, down, or to the top of the layer stack.
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID, direction (top/up/down).
 * @return {Object} Result with .ok, .error.
 */
function _handleSetLayerOrder(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setLayerOrder: host comp not found'; return result; }
    var layer = findLayerByUUID(comp, params.layerUUID);
    if (!layer) { result.error = 'setLayerOrder: layer not found'; return result; }
    var dir = params.direction || 'top';
    if (dir === 'top') {
      layer.moveToBeginning();
    } else if (dir === 'up') {
      if (layer.index > 1) layer.moveBefore(comp.layer(layer.index - 1));
    } else if (dir === 'down') {
      if (layer.index < comp.numLayers) layer.moveAfter(comp.layer(layer.index + 1));
    }
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Sets the blending mode of a layer by string name (e.g. NORMAL, ADD, MULTIPLY).
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID, mode.
 * @return {Object} Result with .ok, .error.
 */
function _handleSetBlendingMode(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setBlendingMode: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.layerNodeUUID;
    if (!layerUUID) { result.error = 'setBlendingMode: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'setBlendingMode: layer not found'; return result; }
    var BLEND_MAP = {
      'NORMAL':       BlendingMode.NORMAL,
      'ADD':          BlendingMode.ADD,
      'MULTIPLY':     BlendingMode.MULTIPLY,
      'SCREEN':       BlendingMode.SCREEN,
      'OVERLAY':      BlendingMode.OVERLAY,
      'DARKEN':       BlendingMode.DARKEN,
      'LIGHTEN':      BlendingMode.LIGHTEN,
      'COLOR_DODGE':  BlendingMode.COLOR_DODGE,
      'COLOR_BURN':   BlendingMode.COLOR_BURN,
      'HARD_LIGHT':   BlendingMode.HARD_LIGHT,
      'SOFT_LIGHT':   BlendingMode.SOFT_LIGHT,
      'DIFFERENCE':   BlendingMode.DIFFERENCE,
      'EXCLUSION':    BlendingMode.EXCLUSION,
      'HUE':          BlendingMode.HUE,
      'SATURATION':   BlendingMode.SATURATION,
      'COLOR':        BlendingMode.COLOR,
      'LUMINOSITY':   BlendingMode.LUMINOSITY
    };
    var mode = BLEND_MAP[params.mode];
    if (mode !== undefined) layer.blendingMode = mode;
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}
