/**
 * @fileoverview Routes evalScript commands to action handlers (ES3-safe).
 * Entry point: dispatch(jsonStr) — called by evalBridge via csInterface.evalScript().
 * dispatchBatch(jsonStr) — calls multiple commands in sequence.
 * Handler functions are defined in actions_*.jsx files.
 * The handler registry is in _handlers.jsx.
 * To add a new action: add a handler function in the appropriate actions_*.jsx file,
 * register it in _handlers.jsx, and add the action to the _ALLOWED_ACTIONS whitelist in bridge/evalBridge.js.
 * REQUIRES: json.jsx, utils.jsx, all actions_*.jsx, _handlers.jsx (all loaded before this file in the preamble)
 * Exports: dispatch, dispatchBatch
 */
// dispatcher.jsx — Routes evalScript commands to action handlers (ES3-safe)
// REQUIRES: json.jsx, utils.jsx, all actions_*.jsx, _handlers.jsx (loaded before this file)
//
// Entry point: dispatch(jsonStr) — called by evalBridge via csInterface.evalScript()
// dispatchBatch(jsonStr) — calls multiple commands in sequence
// Handler functions are defined in actions_*.jsx files.
// The handler registry is in _handlers.jsx.
// To add a new action: see instructions in the file header above.

/**
 * Extracts the params sub-object from a command, defaulting to {}.
 * @param {Object} cmd The command object.
 * @return {Object} The params object.
 */
function _cmdParams(cmd) {
  return (cmd && cmd.params) ? cmd.params : {};
}

/**
 * Fallback handler when no handler is registered for an action.
 * @param {Object} cmd The command object.
 * @return {Object} Error result.
 */
function _handleGeneric(cmd) {
  return {
    ok: false,
    data: null,
    error: 'No handler for action: ' + (cmd && cmd.action ? cmd.action : 'unknown')
  };
}

/**
 * Public entry point called by evalBridge. Parses JSON and routes to the handler.
 * @param {string} jsonStr JSON-encoded command object with .action and .params.
 * @return {string} JSON-encoded result object.
 */
function dispatch(jsonStr) {
  var result = { ok: false, data: null, error: null };
  try {
    var cmd = JSON.parse(jsonStr);
    result = _route(cmd);
  } catch (e) {
    result.error = 'Dispatcher error: ' + e.toString();
  }
  return JSON.stringify(result);
}

/**
 * Public batch entry point — executes multiple commands sequentially.
 * @param {string} jsonStr JSON-encoded array of command objects.
 * @return {string} JSON-encoded result object.
 */
function dispatchBatch(jsonStr) {
  var result = { ok: false, data: null, error: null };
  try {
    var commands = JSON.parse(jsonStr);
    if (!commands || typeof commands.length !== 'number') {
      result.error = 'dispatchBatch: expected array of commands';
      return JSON.stringify(result);
    }
    app.beginUndoGroup('Procedia batch');
    var results = [];
    var i;
    for (i = 0; i < commands.length; i++) {
      var res = _route(commands[i]);
      results.push(res);
      if (!res.ok) {
        result.error = 'Command ' + i + ' failed: ' + res.error;
        app.endUndoGroup();
        return JSON.stringify(result);
      }
    }
    app.endUndoGroup();
    result.ok = true;
    result.data = results;
  } catch (e) {
    try { app.endUndoGroup(); } catch (ignore) {}
    result.error = 'dispatchBatch error: ' + e.toString();
  }
  return JSON.stringify(result);
}

/**
 * Routes a parsed command object to the correct handler function.
 * @param {Object} cmd The parsed command object with .action and optional .params.
 * @return {Object} The handler's result object with .ok, .data, .error.
 */
function _route(cmd) {
  if (!cmd || typeof cmd.action !== 'string') {
    return { ok: false, data: null, error: 'Invalid command: missing action' };
  }

  var handler = _handlers[cmd.action];
  if (!handler) {
    return _handleGeneric(cmd);
  }
  try {
    return handler(cmd);
  } catch (e) {
    return { ok: false, data: null, error: 'Handler error for ' + cmd.action + ': ' + e.toString() };
  }
}
