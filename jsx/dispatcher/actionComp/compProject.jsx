/**
 * @fileoverview Project-level operations handlers (ES3-safe).
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 * Exports: _handleGetProjectIdentifier, _handleSaveAsDialog
 */
// actionComp/compProject.jsx — Project-level operation handlers (ES3-safe)
// REQUIRES: json.jsx, utils.jsx

/**
 * Returns a unique identifier for the current AE project.
 * Uses fullPath if saved, otherwise constructs from project name.
 * @param {Object} cmd Command (params unused).
 * @return {Object} Result with .ok, .data (projectId), .error.
 */
function _handleGetProjectIdentifier(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var proj = app.project;
    var projectId = proj.fullPath && proj.fullPath !== ''
      ? proj.fullPath
      : 'unsaved_' + (proj.name || 'Untitled');
    result.ok = true;
    result.data = { projectId: projectId };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

/**
 * Opens AE's native Save As dialog so the user can save a copy
 * before Procedia modifies the project structure.
 * @param {Object} cmd Command (params unused).
 * @return {Object} Result with .ok, .data (projectPath), .error.
 */
function _handleSaveAsDialog(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var saved = app.project.saveWithDialog();
    result.ok = true;
    result.data = { projectPath: app.project.fullPath, saved: saved };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
