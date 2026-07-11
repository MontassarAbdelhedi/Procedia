/**
 * Bridge between the panel UI and After Effects via CSInterface.evalScript.
 * The ONLY module permitted to call csInterface.evalScript().
 * Depends on: lib/CSInterface.js, data/uuidGenerator.js
 * Exports: evalBridge object with init, onReady, dispatch, dispatchBatch, fireAndForget
 */
// bridge/evalBridge.js
// DEPENDS ON: lib/CSInterface.js, data/uuidGenerator.js
// MUST LOAD BEFORE: graph/graphState.js, graph/engine/index.js, flush/dirtyFlusher.js, polling/missingNodes.js, polling/notifications.js, polling/externalDeletions.js, polling/poller.js
//
// THE ONLY FILE that calls csInterface.evalScript(). No other file may call it directly.
// Exposes: evalBridge.init(cs), evalBridge.dispatch(commandObj), evalBridge.dispatchBatch(commandArr)

var evalBridge = (function() {

  var _cs = null;
  var _preambleLoaded = false;
  var _preambleError = null;
  var _readyCallbacks = [];
  var _DISPATCH_TIMEOUT_MS = 10000;
  var _CMD_CHUNK_LIMIT = 15000;
  var _ALLOWED_ACTIONS = {
    'createComp': true, 'deleteComp': true, 'createTextLayer': true,
    'createNullLayer': true, 'createAdjustmentLayer': true, 'createShapeLayer': true,
    'createRectangleLayer': true, 'createEllipseLayer': true, 'createStarLayer': true,
    'createSquircleLayer': true, 'createGearLayer': true, 'createWaveLayer': true,
    'createFlowerLayer': true, 'addCompAsLayer': true, 'clearLayerParent': true,
    'parkLayer': true, 'unparkLayer': true, 'deleteParkedLayer': true,
    'deletePathLayer': true, 'setLayerProperty': true, 'setCompProperty': true,
    'setLayerParent': true, 'setLayerOrder': true, 'moveLayerBefore': true,
    'renameNode': true, 'focusComp': true, 'listComps': true,
    'focusCompByName': true, 'applyDynamicEffect': true, 'pollAliveEffects': true,
    'removeEffect': true, 'setEffectProperty': true, 'renameEffect': true,
    'setEffectEnabled': true, 'reorderEffect': true, 'reorderEffectChain': true,
    'setLayerEnabled': true, 'setLayerShy': true, 'setCompHideShyLayers': true, 'restampLayer': true, 'pollAliveNodes': true,
    'pollExternalDeletions': true, 'setBlendingMode': true, 'setLumaMatte': true,
    'setAlphaMatte': true, 'clearMatte': true, 'getMasksForLayer': true,
    'batchGetLayerProperties': true, 'batchGetEffectProperties': true,
    'readSchemaCache': true, 'writeSchemaCache': true, 'getAEVersion': true,
    'introspectEffect': true, 'readGraph': true, 'writeGraph': true,
    'writeGraphExport': true, 'saveGraphToFile': true, 'openGraphFile': true,
    'ensureReservedComp': true, 'browseAndImportFootage': true,
    'createFootageLayer': true, 'deleteFootageItem': true, 'importProject': true,
    'addKeyframe': true, 'removeKeyframe': true, 'removeAllKeyframes': true,
    'getKeyframeTimes': true, 'getCurrentTime': true, 'setCurrentTime': true,
    'batchGetKeyframeTimes': true, 'getKeyframeData': true, 'writeCmdChunk': true,
    'executeCmdFile': true, 'cleanupCmdFile': true,
    'beginUndoGroup': true, 'endUndoGroup': true
  };
  var _MAX_PARAMS_DEPTH = 6;

  function _yieldToUI() {
    return new Promise(function(resolve) {
      setTimeout(resolve, 0);
    });
  }

  function _generateTempId() {
    return 'tmp_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
  }

  function _validateCommandObj(commandObj) {
    if (!commandObj || typeof commandObj !== 'object' || commandObj instanceof Array) {
      return { valid: false, error: 'commandObj must be a plain object' };
    }
    if (typeof commandObj.action !== 'string') {
      return { valid: false, error: 'action must be a string' };
    }
    if (!_ALLOWED_ACTIONS[commandObj.action]) {
      return { valid: false, error: 'unknown action: ' + commandObj.action };
    }
    if (commandObj.params !== undefined && commandObj.params !== null) {
      if (typeof commandObj.params !== 'object' || commandObj.params instanceof Array) {
        return { valid: false, error: 'params must be a plain object or null' };
      }
      var depth = 0;
      function _checkDepth(obj, d) {
        if (d > _MAX_PARAMS_DEPTH) return false;
        if (typeof obj !== 'object' || obj === null) return true;
        if (obj instanceof Array) return true;
        for (var k in obj) {
          if (obj.hasOwnProperty(k)) {
            if (!_checkDepth(obj[k], d + 1)) return false;
          }
        }
        return true;
      }
      if (!_checkDepth(commandObj.params, 1)) {
        return { valid: false, error: 'params exceeds max depth of ' + _MAX_PARAMS_DEPTH };
      }
    }
    return { valid: true };
  }

  function _dispatchChunked(commandObj) {
    var json = JSON.stringify(commandObj);
    var chunkId = _generateTempId();
    var maxChunkLen = 12000;
    var totalChunks = Math.ceil(json.length / maxChunkLen);
    var index = 0;

    function writeNextChunk() {
      if (index >= totalChunks) {
        return _executeChunkedCmd(chunkId);
      }
      var chunk = json.substr(index * maxChunkLen, maxChunkLen);
      var writeCmd = {
        action: 'writeCmdChunk',
        params: { id: chunkId, index: index, data: chunk }
      };
      index++;
      return dispatch(writeCmd).then(function(res) {
        if (!res.ok) {
          throw new Error('[evalBridge] chunk write failed (chunk ' + (index - 1) + '): ' + (res.error || 'unknown'));
        }
        return _yieldToUI().then(writeNextChunk);
      });
    }

    return writeNextChunk();
  }

  function _executeChunkedCmd(chunkId) {
    var execCmd = {
      action: 'executeCmdFile',
      params: { id: chunkId }
    };
    return dispatch(execCmd).then(function(res) {
      dispatch({ action: 'cleanupCmdFile', params: { id: chunkId } });
      return res;
    }, function(err) {
      dispatch({ action: 'cleanupCmdFile', params: { id: chunkId } });
      throw err;
    });
  }

  function _dispatchBatchSequentially(commandArray) {
    var results = [];
    var index = 0;

    function next() {
      if (index >= commandArray.length) {
        return Promise.resolve({ ok: true, data: results });
      }
      var cmd = commandArray[index];
      index++;
      return dispatch(cmd).then(function(res) {
        results.push(res);
        if (!res.ok) {
          return Promise.resolve({ ok: false, data: results, error: 'Command ' + (index - 1) + ' failed: ' + (res.error || 'unknown') });
        }
        return _yieldToUI().then(next);
      });
    }

    return next();
  }

  /**
   * Invokes all registered ready callbacks with the given success flag and clears the queue.
   * @param {boolean} success - Whether the preamble loaded successfully
   */
  function _flushReadyCallbacks(success) {
    for (var i = 0; i < _readyCallbacks.length; i++) {
      _readyCallbacks[i](success);
    }
    _readyCallbacks = [];
  }

  /**
   * Registers a callback that fires once the JSX preamble has finished loading.
   * If already loaded, the callback is invoked immediately.
   * @param {function(boolean)} callback - Receives true on success, false on failure
   */
  function onReady(callback) {
    if (typeof callback !== 'function') return;
    if (_preambleLoaded) {
      callback(true);
      return;
    }
    if (_preambleError) {
      callback(false);
      return;
    }
    _readyCallbacks.push(callback);
  }

  /**
   * Initializes the bridge with a CSInterface instance and loads the JSX preamble
   * (json.jsx, utils.jsx, action handlers, and dispatcher) into the host.
   * @param {CSInterface} cs - An instance of CSInterface
   */
  function init(cs) {
    _cs = cs;
    _probePreamble(1);
  }

  /**
   * Probes AE connectivity with a trivial script before loading the full preamble.
   * This separates connectivity issues from preamble content errors.
   * @param {number} attempt - Current attempt number (1-based)
   */
  function _probePreamble(attempt) {
    _cs.evalScript('"probe"', function(result) {
      if (result === 'probe') {
        _loadPreamble(1);
        return;
      }
      if (attempt < 5) {
        var delay = 200 * attempt;
        console.warn('[evalBridge] probe attempt ' + attempt + ' returned: "' + result + '", retrying in ' + delay + 'ms');
        setTimeout(function() { _probePreamble(attempt + 1); }, delay);
        return;
      }
      _preambleError = 'AE not reachable after 5 probe attempts';
      console.error('[evalBridge] ' + _preambleError);
      _flushReadyCallbacks(false);
    });
  }

  /**
   * Loads the JSX preamble into the host.
   * @param {number} attempt - Current attempt number (1-based)
   */
  function _loadPreamble(attempt) {
    var extPath = _cs.getSystemPath(SystemPath.EXTENSION).replace(/\\/g, '/');
    var files = [
      '/jsx/json.jsx',
      '/jsx/utils.jsx',
      '/jsx/persistence.jsx',
      '/jsx/dispatcher/actions_schema.jsx',
      '/jsx/dispatcher/actions_comp.jsx',
      '/jsx/dispatcher/actions_layer.jsx',
      '/jsx/dispatcher/actions_footage.jsx',
      '/jsx/dispatcher/actions_property.jsx',
      '/jsx/dispatcher/actions_propertyGet.jsx',
      '/jsx/dispatcher/actions_park.jsx',
      '/jsx/dispatcher/actions_matte.jsx',
      '/jsx/dispatcher/actions_masks.jsx',
      '/jsx/dispatcher/actions_keyframe.jsx',
      '/jsx/dispatcher/actionEffect/apply.jsx',
      '/jsx/dispatcher/actionEffect/introspect.jsx',
      '/jsx/dispatcher/actionEffect/pollAlive.jsx',
      '/jsx/dispatcher/actionEffect/batchGetEffectProperties.jsx',
      '/jsx/dispatcher/actions_cmdChunk.jsx',
      '/jsx/dispatcher/actionImport/helpers.jsx',
      '/jsx/dispatcher/actionImport/read.jsx',
      '/jsx/dispatcher/actionImport/handler.jsx',
      '/jsx/dispatcher/actions_compList.jsx',
      '/jsx/dispatcher/actions_graphExport.jsx',
      '/jsx/dispatcher/dispatcher.jsx'
    ];
    _loadFilesSequentially(extPath, files, 0, attempt);
  }

  /**
   * Loads JSX files one at a time via separate evalScript calls.
   * This isolates which file causes AE to return empty.
   */
  function _loadFilesSequentially(extPath, files, index, attempt) {
    if (index >= files.length) {
      _preambleLoaded = true;
      _flushReadyCallbacks(true);
      return;
    }
    var filePath = extPath + files[index];
    _cs.evalScript('try { $.evalFile("' + filePath + '"); "ok" } catch(e) { "FAIL: " + e.toString() }', function(result) {
      if (result && result.indexOf('FAIL:') === 0) {
        console.error('[evalBridge] file load failed: ' + files[index] + ' — ' + result);
        if (attempt < 2) {
          setTimeout(function() { _loadFilesSequentially(extPath, files, index, attempt + 1); }, 200);
          return;
        }
        _preambleError = 'failed to load ' + files[index] + ': ' + result;
        _flushReadyCallbacks(false);
        return;
      }
      if (result === 'ok') {
        _loadFilesSequentially(extPath, files, index + 1, 1);
        return;
      }
      // Empty/unexpected result from this single file
      if (attempt < 2) {
        setTimeout(function() { _loadFilesSequentially(extPath, files, index, attempt + 1); }, 200);
        return;
      }
      _preambleError = 'failed to load ' + files[index] + ': empty/unexpected result "' + result + '"';
      console.error('[evalBridge] ' + _preambleError);
      _flushReadyCallbacks(false);
    });
  }

  /**
   * Sends a single command object to the host via evalScript.
   * The command is JSON-serialized and passed to the ExtendScript dispatch() function.
   * @param {Object} commandObj - Command with an `action` string and optional `params`
   * @returns {Promise<Object>} Resolves with the parsed response from the host
   */
  function dispatch(commandObj, _attempt) {
    _attempt = _attempt || 1;

    if (_attempt === 1) {
      var validation = _validateCommandObj(commandObj);
      if (!validation.valid) {
        return Promise.reject(new Error('[evalBridge] ' + validation.error));
      }
      var sizeJson = JSON.stringify(commandObj);
      var sizeCall = 'dispatch(' + JSON.stringify(sizeJson) + ')';
      if (sizeCall.length > _CMD_CHUNK_LIMIT) {
        return _dispatchChunked(commandObj);
      }
    }

    return new Promise(function(resolve, reject) {
      if (_cs === null) {
        reject(new Error('[evalBridge] csInterface not available — panel is running outside After Effects'));
        return;
      }
      if (!_preambleLoaded) {
        reject(new Error('[evalBridge] preamble not loaded: ' + (_preambleError || 'unknown error')));
        return;
      }

      var settled = false;
      var timeoutId = setTimeout(function() {
        if (settled) return;
        settled = true;
        reject(new Error('[evalBridge] dispatch timed out after ' + _DISPATCH_TIMEOUT_MS + 'ms (action: ' + commandObj.action + ')'));
      }, _DISPATCH_TIMEOUT_MS);

      var json = JSON.stringify(commandObj);
      var call = 'dispatch(' + JSON.stringify(json) + ')';
      _cs.evalScript(call, function(result) {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);

        if (result && typeof result === 'string' && result.indexOf('TypeError') !== -1) {
          if (_attempt < 3) {
            setTimeout(function() { resolve(dispatch(commandObj, _attempt + 1)); }, 50 * _attempt);
            return;
          }
          reject(new Error('[evalBridge] JSX error: ' + result));
          return;
        }
        try {
          var res = JSON.parse(result);
          resolve(res);
        } catch(e) {
          if (_attempt < 3) {
            setTimeout(function() { resolve(dispatch(commandObj, _attempt + 1)); }, 50 * _attempt);
            return;
          }
          reject(new Error('[evalBridge] parse error — raw result: ' + result));
        }
      });
    });
  }

  /**
   * Sends an array of command objects to the host in a single evalScript call.
   * @param {Object[]} commandArray - Array of command objects
   * @returns {Promise<Object>} Resolves with the parsed batch response
   */
  function dispatchBatch(commandArray) {
    if (!commandArray || !commandArray.length) {
      return Promise.reject(new Error('[evalBridge] dispatchBatch: expected non-empty array'));
    }
    for (var bi = 0; bi < commandArray.length; bi++) {
      var validation = _validateCommandObj(commandArray[bi]);
      if (!validation.valid) {
        return Promise.reject(new Error('[evalBridge] dispatchBatch item ' + bi + ': ' + validation.error));
      }
    }
    var batchJson = JSON.stringify(commandArray);
    var batchCall = 'dispatchBatch(' + JSON.stringify(batchJson) + ')';
    if (batchCall.length > _CMD_CHUNK_LIMIT) {
      return _dispatchBatchSequentially(commandArray);
    }

    return new Promise(function(resolve, reject) {
      if (_cs === null) {
        reject(new Error('[evalBridge] csInterface not available — panel is running outside After Effects'));
        return;
      }
      if (!_preambleLoaded) {
        reject(new Error('[evalBridge] preamble not loaded: ' + (_preambleError || 'unknown error')));
        return;
      }

      var settled = false;
      var timeoutId = setTimeout(function() {
        if (settled) return;
        settled = true;
        reject(new Error('[evalBridge] dispatchBatch timed out after ' + _DISPATCH_TIMEOUT_MS + 'ms'));
      }, _DISPATCH_TIMEOUT_MS);

      var json = JSON.stringify(commandArray);
      var call = 'dispatchBatch(' + JSON.stringify(json) + ')';
      _cs.evalScript(call, function(result) {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);

        try {
          var res = JSON.parse(result);
          resolve(res);
        } catch(e) {
          reject(new Error('[evalBridge] parse error — raw result: ' + result));
        }
      });
    });
  }

  /**
   * Fire-and-forget: sends a command without waiting for a response.
   * Used for beforeunload/emergency saves where the page may close before
   * the async callback fires. The ExtendScript side still executes synchronously.
   * @param {Object} commandObj - Command with an `action` string and optional `params`
   */
  function fireAndForget(commandObj) {
    if (_cs === null || !_preambleLoaded) return;
    var validation = _validateCommandObj(commandObj);
    if (!validation.valid) {
      console.warn('[evalBridge] fireAndForget validation failed: ' + validation.error);
      return;
    }
    var json = JSON.stringify(commandObj);
    var call = 'dispatch(' + JSON.stringify(json) + ')';
    _cs.evalScript(call, function(result) {
      if (result && typeof result === 'string' && (result.indexOf('FAIL') !== -1 || result.indexOf('TypeError') !== -1)) {
        console.warn('[evalBridge] fireAndForget error (action: ' + commandObj.action + '):', result);
      }
    });
  }

  return {
    init:          init,
    onReady:       onReady,
    dispatch:      dispatch,
    dispatchBatch: dispatchBatch,
    fireAndForget: fireAndForget
  };

})();
