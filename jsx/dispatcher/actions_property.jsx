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
    layer.property(params.key).setValue(params.value);
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Clears the parent of a layer across all comps.
 * @param {Object} cmd Command with params: nodeUUID.
 * @return {Object} Result with .ok, .data (cleared), .error.
 */
function _handleClearLayerParent(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var nodeUUID = params.nodeUUID;
    var cleared = false;
    var proj = app.project;
    var ci;
    for (ci = 1; ci <= proj.numItems; ci++) {
      var item = proj.item(ci);
      if (!(item instanceof CompItem)) continue;
      var li;
      for (li = 1; li <= item.numLayers; li++) {
        var layer = item.layer(li);
        if (layer.comment === nodeUUID) {
          layer.parent = null;
          cleared = true;
          break;
        }
      }
      if (cleared) break;
    }
    if (!cleared) {
      result.error = 'clearLayerParent: layer not found: ' + nodeUUID;
      return result;
    }
    result.ok = true;
    result.data = { cleared: nodeUUID };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

/**
 * Sets or clears the parent of a child layer.
 * @param {Object} cmd Command with params: hostingCompUUID, childNodeUUID, parentNodeUUID.
 * @return {Object} Result with .ok, .error.
 */
function _handleSetLayerParent(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setLayerParent: host comp not found'; return result; }
    var childLayer = findLayerByUUID(comp, params.childNodeUUID);
    if (!childLayer) { result.error = 'setLayerParent: child layer not found'; return result; }
    if (params.parentNodeUUID) {
      var parentLayer = findLayerByUUID(comp, params.parentNodeUUID);
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
