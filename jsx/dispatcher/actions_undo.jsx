/**
 * @fileoverview Undo group action handlers (ES3-safe).
 * REQUIRES: json.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 * Exports: _handleBeginUndoGroup, _handleEndUndoGroup
 */
// actions_undo.jsx — Undo group action handlers (ES3-safe)
// REQUIRES: json.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

/**
 * Begins an undo group with an optional name.
 * @param {Object} cmd Command with params: name (optional).
 * @return {Object} Result with .ok, .data, .error.
 */
function _handleBeginUndoGroup(cmd) {
  app.beginUndoGroup((cmd && cmd.params && cmd.params.name) || 'Procedia group');
  return { ok: true, data: null, error: null };
}

/**
 * Ends the current undo group.
 * @return {Object} Result with .ok, .data, .error.
 */
function _handleEndUndoGroup() {
  app.endUndoGroup();
  return { ok: true, data: null, error: null };
}
