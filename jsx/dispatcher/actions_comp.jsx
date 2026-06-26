/**
 * @fileoverview CompNode action handlers (ES3-safe).
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 * Exports: findOrCreateReservedComp, _handleCreateComp, _handleDeleteComp,
 *          _handleSetCompProperty, _handleFocusComp, _handleEnsureReservedComp
 */
// actions_comp.jsx — CompNode action handlers (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

/**
 * Finds the reserved DO NOT DELETE comp, or creates it.
 * @return {CompItem}
 */
function findOrCreateReservedComp() {
  var reserved = findReservedComp();
  if (reserved) return reserved;
  var folder = findOrCreateProcediaFolder();
  var comp = app.project.items.addComp('DO NOT DELETE - Procedia Reserved', 1920, 1080, 1, 10, 30);
  comp.parentFolder = folder;
  return comp;
}

/**
 * Creates a new CompItem with the given parameters.
 * @param {Object} cmd Command with params: nodeUUID, label, width, height, duration, frameRate.
 * @return {Object} Result with .ok, .data (name), .error.
 */
function _handleCreateComp(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    if (!params.nodeUUID) {
      result.error = 'createComp: nodeUUID required';
      return result;
    }
    var folder = findOrCreateProcediaFolder();
    var label = params.label ? String(params.label) : 'Comp';
    var w = params.width || 1920;
    var h = params.height || 1080;
    var duration = params.duration || 10;
    var fps = params.frameRate || 30;
    var comp = app.project.items.addComp(label, w, h, 1, duration, fps);
    comp.comment = params.nodeUUID;
    comp.parentFolder = folder;
    result.ok = true;
    result.data = { name: comp.name };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

/**
 * Deletes a CompItem by its node UUID.
 * @param {Object} cmd Command with params: nodeUUID.
 * @return {Object} Result with .ok, .data (deleted UUID), .error.
 */
function _handleDeleteComp(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.nodeUUID);
    if (!comp) {
      result.error = 'deleteComp: comp not found: ' + params.nodeUUID;
      return result;
    }
    comp.remove();
    result.ok = true;
    result.data = { deleted: params.nodeUUID };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

/**
 * Sets a property (width, height, frameRate, duration, bgColor, label) on a CompItem.
 * @param {Object} cmd Command with params: nodeUUID, key, value.
 * @return {Object} Result with .ok, .error.
 */
function _handleSetCompProperty(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.nodeUUID);
    if (!comp) { result.error = 'setCompProperty: comp not found'; return result; }
    if (params.key === 'width') {
      var oldW = comp.width;
      var dX = (params.value - oldW) / 2;
      for (var wi = 1; wi <= comp.layers.length; wi++) {
        var wL = comp.layer(wi);
        if (wL && wL.position) {
          var wPos = wL.position.value;
          if (wL.position.dimensions === 2) {
            wL.position.setValue([wPos[0] + dX, wPos[1]]);
          } else if (wL.position.dimensions === 3) {
            wL.position.setValue([wPos[0] + dX, wPos[1], wPos[2]]);
          }
        }
      }
      comp.width = params.value;
    } else if (params.key === 'height') {
      var oldH = comp.height;
      var dY = (params.value - oldH) / 2;
      for (var hi = 1; hi <= comp.layers.length; hi++) {
        var hL = comp.layer(hi);
        if (hL && hL.position) {
          var hPos = hL.position.value;
          if (hL.position.dimensions === 2) {
            hL.position.setValue([hPos[0], hPos[1] + dY]);
          } else if (hL.position.dimensions === 3) {
            hL.position.setValue([hPos[0], hPos[1] + dY, hPos[2]]);
          }
        }
      }
      comp.height = params.value;
    } else if (params.key === 'frameRate') comp.frameRate = params.value;
    else if (params.key === 'duration')  comp.duration = params.value;
    else if (params.key === 'bgColor')   comp.bgColor = params.value;
    else if (params.key === 'label')     comp.name = String(params.value);
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Sets the active composition to the one matching nodeUUID.
 * @param {Object} cmd Command with params: nodeUUID.
 * @return {Object} Result with .ok, .error.
 */
function _handleFocusComp(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.nodeUUID);
    if (!comp) { result.error = 'focusComp: comp not found'; return result; }
    var viewer = comp.openInViewer();
    if (!viewer) { result.error = 'focusComp: openInViewer returned null'; return result; }
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Ensures the reserved DO NOT DELETE comp exists, creating it if needed.
 * @param {Object} cmd Command (params unused).
 * @return {Object} Result with .ok, .data (compName), .error.
 */
function _handleEnsureReservedComp(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = findOrCreateReservedComp();
    result.ok = true;
    result.data = { compName: comp.name };
  } catch (e) { result.error = e.toString(); }
  return result;
}
