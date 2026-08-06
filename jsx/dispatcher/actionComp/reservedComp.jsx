/**
 * @fileoverview Reserved comp management utilities and handler (ES3-safe).
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 * Exports: findOrCreateReservedComp, _handleEnsureReservedComp
 */
// actionComp/reservedComp.jsx — Reserved comp management (ES3-safe)
// REQUIRES: json.jsx, utils.jsx

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
