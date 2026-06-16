/**
 * @fileoverview Comp list action handler — enumerates all comps in the project,
 * excluding the reserved comp, and returns their names and UUIDs (if any).
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 * Exports: _handleListComps, _handleFocusCompByName
 */

/**
 * Returns an array of all comps (name + optional comment/UUID), excluding the reserved comp.
 * @param {Object} cmd Command (params unused).
 * @return {Object} Result with .ok, .data (array of { name, comment }), .error.
 */
function _handleListComps(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var comps = [];
    for (var i = 1; i <= app.project.numItems; i++) {
      try {
        var item = app.project.item(i);
        if (item instanceof CompItem) {
          if (item.name.indexOf('DO NOT DELETE') === 0) continue;
          comps.push({
            name: item.name,
            comment: item.comment || ''
          });
        }
      } catch (e) {}
    }
    result.ok = true;
    result.data = comps;
  } catch (e) {
    result.error = 'listComps: ' + e.toString();
  }
  return result;
}

/**
 * Opens the first comp whose name matches the given name in the viewer.
 * @param {Object} cmd Command with params: name.
 * @return {Object} Result with .ok, .error.
 */
function _handleFocusCompByName(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    if (!params || !params.name) {
      result.error = 'focusCompByName: name parameter required';
      return result;
    }
    var target = String(params.name);
    for (var i = 1; i <= app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item instanceof CompItem && item.name === target) {
        var viewer = item.openInViewer();
        if (!viewer) {
          result.error = 'focusCompByName: openInViewer returned null';
          return result;
        }
        result.ok = true;
        result.data = { name: target };
        return result;
      }
    }
    result.error = 'focusCompByName: comp not found: ' + target;
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
