/**
 * @fileoverview Layer order handlers (ES3-safe).
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: _handlers.jsx (functions become globals for _handlers map)
 * Exports: _handleSetLayerOrder, _handleMoveLayerBefore
 */
// actions_order.jsx — Layer order handlers (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: _handlers.jsx (functions become globals for _handlers map)

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
    } else if (dir === 'bottom') {
      var lastLayer = comp.layer(comp.numLayers);
      if (layer !== lastLayer) layer.moveAfter(lastLayer);
    }
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Moves a layer before a target layer in the same comp (drag-and-drop ordering).
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID, targetLayerUUID.
 * @return {Object} Result with .ok, .error.
 */
function _handleMoveLayerBefore(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'moveLayerBefore: host comp not found'; return result; }
    var layer = findLayerByUUID(comp, params.layerUUID);
    if (!layer) { result.error = 'moveLayerBefore: layer not found'; return result; }
    var target = findLayerByUUID(comp, params.targetLayerUUID);
    if (!target) { result.error = 'moveLayerBefore: target layer not found'; return result; }
    if (layer === target) { result.error = 'moveLayerBefore: cannot move layer before itself'; return result; }
    layer.moveBefore(target);
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}
