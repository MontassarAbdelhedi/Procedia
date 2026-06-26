/**
 * @fileoverview Layer creation & management action handlers (ES3-safe).
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 * Exports: _handleCreateTextLayer, _handleCreateNullLayer, _handleCreateAdjustmentLayer,
 *          _handleCreateShapeLayer, _handleCreateRectangleLayer,
 *          _handleAddCompAsLayer, _handleDeletePathLayer,
 *          _handleRenameNode, _handleRestampLayer
 */
// actions_layer.jsx — Layer creation & management action handlers (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

/**
 * Creates a text layer in the hosting comp.
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID, content, position, rotation, opacity, fontSize, label.
 * @return {Object} Result with .ok, .data (layerName), .error.
 */
function _handleCreateTextLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) {
      result.error = 'createTextLayer: host comp not found: ' + params.hostingCompUUID;
      return result;
    }
    var textLayer = comp.layers.addText(params.content || 'Text');
    if (params.layerUUID) {
      textLayer.comment = params.layerUUID;
    }
    if (params.position && params.position.length === 2) {
      textLayer.position.setValue(params.position);
    }
    if (params.rotation !== undefined && params.rotation !== null) {
      textLayer.rotation.setValue(params.rotation);
    }
    if (params.opacity !== undefined && params.opacity !== null) {
      textLayer.opacity.setValue(params.opacity);
    }
    if (params.fontSize !== undefined && params.fontSize !== null) {
      var textDoc = textLayer.text.sourceText.value;
      if (textDoc) {
        textDoc.fontSize = params.fontSize;
        textLayer.text.sourceText.setValue(textDoc);
      }
    }
    if (params.label) {
      textLayer.name = params.label;
    }
    result.ok = true;
    result.data = { layerName: textLayer.name };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

/**
 * Creates a null layer in the hosting comp.
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID.
 * @return {Object} Result with .ok, .data (layerName), .error.
 */
function _handleCreateNullLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) {
      result.error = 'createNullLayer: host comp not found: ' + params.hostingCompUUID;
      return result;
    }
    var nullLayer = comp.layers.addNull();
    if (params.layerUUID) {
      nullLayer.comment = params.layerUUID;
    }
    result.ok = true;
    result.data = { layerName: nullLayer.name };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

/**
 * Creates an adjustment layer (shape layer with adjustmentLayer=true) in the hosting comp.
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID.
 * @return {Object} Result with .ok, .data (layerName), .error.
 */
function _handleCreateAdjustmentLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'createAdjustmentLayer: host comp not found'; return result; }
    var layer = comp.layers.addShape();
    layer.adjustmentLayer = true;
    if (params.layerUUID) layer.comment = params.layerUUID;
    result.ok = true;
    result.data = { layerName: layer.name };
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Creates a shape layer in the hosting comp.
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID, label.
 * @return {Object} Result with .ok, .data (layerName), .error.
 */
function _handleCreateShapeLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'createShapeLayer: host comp not found'; return result; }
    var layer = comp.layers.addShape();
    if (params.layerUUID) layer.comment = params.layerUUID;
    if (params.label) layer.name = params.label;
    result.ok = true;
    result.data = { layerName: layer.name };
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Creates a rectangle shape layer in the hosting comp.
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID, width, height, roundness, fill, stroke, position, rotation, scale, opacity, label.
 * @return {Object} Result with .ok, .data (layerName), .error.
 */
function _handleCreateRectangleLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'createRectangleLayer: host comp not found'; return result; }
    var layer = comp.layers.addShape();
    if (params.layerUUID) layer.comment = params.layerUUID;
    if (params.label) layer.name = params.label;

    var shapes = layer.property('ADBE Root Vectors Group');

    // Add rectangle path
    var rectPath = shapes.addProperty('ADBE Vector Shape - Rect');
    if (params.width !== undefined && params.height !== undefined) {
      rectPath.property('ADBE Vector Rect Size').setValue([params.width, params.height]);
    }
    if (params.roundCorners) {
      rectPath.property('ADBE Vector Rect Roundness').setValue(params.roundness || 0);
    } else {
      rectPath.property('ADBE Vector Rect Roundness').setValue(0);
    }

    // Add fill
    var fill = shapes.addProperty('ADBE Vector Graphic - Fill');
    if (params.fill) {
      fill.property('ADBE Vector Fill Color').setValue(params.fill);
    }

    // Add stroke if non-transparent
    if (params.stroke && params.stroke.length === 4 && params.stroke[3] > 0) {
      var stroke = shapes.addProperty('ADBE Vector Graphic - Stroke');
      stroke.property('ADBE Vector Stroke Color').setValue(params.stroke);
      stroke.property('ADBE Vector Stroke Line Width').setValue(1);
    }

    // Layer transform
    if (params.position && params.position.length === 2) {
      layer.position.setValue(params.position);
    }
    if (params.rotation !== undefined && params.rotation !== null) {
      layer.rotation.setValue(params.rotation);
    }
    if (params.opacity !== undefined && params.opacity !== null) {
      layer.opacity.setValue(params.opacity);
    }
    if (params.scale && params.scale.length === 2) {
      layer.scale.setValue(params.scale);
    }

    result.ok = true;
    result.data = { layerName: layer.name };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

/**
 * Adds a pre-comp as a layer within a hosting comp.
 * @param {Object} cmd Command with params: hostingCompUUID, nodeUUID, layerUUID.
 * @return {Object} Result with .ok, .data (layerName), .error.
 */
function _handleAddCompAsLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'addCompAsLayer: host comp not found'; return result; }
    var precomp = findCompByUUID(params.nodeUUID);
    if (!precomp) { result.error = 'addCompAsLayer: pre-comp not found'; return result; }
    var layer = comp.layers.add(precomp);
    if (params.layerUUID) layer.comment = params.layerUUID;
    result.ok = true;
    result.data = { layerName: layer.name };
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Deletes a layer from the hosting comp by layerUUID or nodeUUID.
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID, nodeUUID.
 * @return {Object} Result with .ok, .data (deleted), .error.
 */
function _handleDeletePathLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'deletePathLayer: host comp not found'; return result; }
    var layer = null;
    if (params.layerUUID) layer = findLayerByUUID(comp, params.layerUUID);
    if (!layer && params.nodeUUID) layer = findLayerByUUID(comp, params.nodeUUID);
    if (layer) layer.remove();
    result.ok = true;
    result.data = { deleted: !!layer };
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Renames a layer's display name in the hosting comp.
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID, nodeUUID, label.
 * @return {Object} Result with .ok, .error.
 */
function _handleRenameNode(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'renameNode: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.nodeUUID;
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'renameNode: layer not found'; return result; }
    layer.name = String(params.label);
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Enables or disables a layer's video switch in the hosting comp.
 * @param {Object} cmd Command with params: hostingCompUUID, nodeUUID, enabled.
 * @return {Object} Result with .ok, .error.
 */
function _handleSetLayerEnabled(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setLayerEnabled: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.nodeUUID;
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'setLayerEnabled: layer not found'; return result; }
    layer.enabled = (params.enabled !== false);
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Re-stamps a layer's comment UUID from oldUUID to newUUID.
 * @param {Object} cmd Command with params: hostingCompUUID, oldUUID, newUUID.
 * @return {Object} Result with .ok, .error.
 */
function _handleRestampLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'restampLayer: host comp not found'; return result; }
    var layer = findLayerByUUID(comp, params.oldUUID);
    if (!layer) { result.error = 'restampLayer: layer not found'; return result; }
    layer.comment = params.newUUID;
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}
