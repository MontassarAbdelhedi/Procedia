/**
 * @fileoverview Routes evalScript commands to action handlers (ES3-safe).
 * Entry point: dispatch(jsonStr) — called by evalBridge via csInterface.evalScript().
 * dispatchBatch(jsonStr) — calls multiple commands in sequence.
 * To add a new action: add a named handler function in the appropriate actions_*.jsx file
 * and register it in _handlers below.
 * REQUIRES: json.jsx, utils.jsx, actions_*.jsx (all loaded before this file in the preamble)
 * Exports: dispatch, dispatchBatch
 */
// dispatcher.jsx — Routes evalScript commands to action handlers (ES3-safe)
// REQUIRES: json.jsx, utils.jsx, actions_*.jsx (all loaded before this file in the preamble)
//
// Entry point: dispatch(jsonStr) — called by evalBridge via csInterface.evalScript()
// dispatchBatch(jsonStr) — calls multiple commands in sequence
// To add a new action: add a named handler function in the appropriate actions_*.jsx file
// and register it in _handlers below.

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

var _handlers = {
  'createComp':           _handleCreateComp,
  'deleteComp':           _handleDeleteComp,
  'createTextLayer':      _handleCreateTextLayer,
  'createNullLayer':      _handleCreateNullLayer,
  'createAdjustmentLayer': _handleCreateAdjustmentLayer,
  'createShapeLayer':     _handleCreateShapeLayer,
  'createRectangleLayer': _handleCreateRectangleLayer,
  'addCompAsLayer':       _handleAddCompAsLayer,
  'clearLayerParent':     _handleClearLayerParent,
  'parkLayer':            _handleParkLayer,
  'unparkLayer':          _handleUnparkLayer,
  'deleteParkedLayer':    _handleDeleteParkedLayer,
  'deletePathLayer':      _handleDeletePathLayer,
  'setLayerProperty':     _handleSetLayerProperty,
  'setCompProperty':      _handleSetCompProperty,
  'setLayerParent':       _handleSetLayerParent,
  'setLayerOrder':        _handleSetLayerOrder,
  'renameNode':           _handleRenameNode,
  'focusComp':            _handleFocusComp,
  'listComps':            _handleListComps,
  'focusCompByName':      _handleFocusCompByName,
  'applyDynamicEffect':   _handleApplyDynamicEffect,
  'pollAliveEffects':     _handlePollAliveEffects,
  'removeEffect':         _handleRemoveEffect,
  'setEffectProperty':    _handleSetEffectProperty,
  'renameEffect':         _handleRenameEffect,
  'setEffectEnabled':     _handleSetEffectEnabled,
  'reorderEffect':        _handleReorderEffect,
  'reorderEffectChain':   _handleReorderEffectChain,
  'setLayerEnabled':      _handleSetLayerEnabled,
  'restampLayer':         _handleRestampLayer,
  'pollAliveNodes':       _handlePollAliveNodes,
  'pollExternalDeletions': _handlePollExternalDeletions,
  'setBlendingMode':      _handleSetBlendingMode,
  'setLumaMatte':         _handleSetLumaMatte,
  'setAlphaMatte':        _handleSetAlphaMatte,
  'clearMatte':           _handleClearMatte,
  'getMasksForLayer':     _handleGetMasksForLayer,
  'batchGetLayerProperties': _handleBatchGetLayerProperties,
  'batchGetEffectProperties': _handleBatchGetEffectProperties,
  'readSchemaCache':      _handleReadSchemaCache,
  'writeSchemaCache':     _handleWriteSchemaCache,
  'getAEVersion':         _handleGetAEVersion,
  'introspectEffect':     _handleIntrospectEffect,
  'readGraph':            _handleReadGraph,
  'writeGraph':           _handleWriteGraph,
  'writeGraphExport':     _handleWriteGraphExport,
  'saveGraphToFile':      _handleSaveGraphToFile,
  'openGraphFile':        _handleOpenGraphFile,
  'ensureReservedComp':    _handleEnsureReservedComp,
  'browseAndImportFootage': _handleBrowseAndImportFootage,
  'createFootageLayer':    _handleCreateFootageLayer,
  'deleteFootageItem':     _handleDeleteFootageItem,
  'importProject':         _handleImportProject
};

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
    var results = [];
    var i;
    for (i = 0; i < commands.length; i++) {
      var res = _route(commands[i]);
      results.push(res);
      if (!res.ok) {
        result.error = 'Command ' + i + ' failed: ' + res.error;
        return JSON.stringify(result);
      }
    }
    result.ok = true;
    result.data = results;
  } catch (e) {
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
