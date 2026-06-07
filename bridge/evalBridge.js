/**
 * Bridge between the panel UI and After Effects via CSInterface.evalScript.
 * The ONLY module permitted to call csInterface.evalScript().
 * Depends on: lib/CSInterface.js, data/uuidGenerator.js
 * Exports: evalBridge object with init, onReady, dispatch, dispatchBatch
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
    var extPath = _cs.getSystemPath(SystemPath.EXTENSION).replace(/\\/g, '/');
    var script = [
      '$.evalFile("' + extPath + '/jsx/json.jsx");',
      '$.evalFile("' + extPath + '/jsx/utils.jsx");',
      '$.evalFile("' + extPath + '/jsx/persistence.jsx");',
      // Action handlers — loaded before dispatcher.jsx so _handlers map resolves
      '$.evalFile("' + extPath + '/jsx/dispatcher/actions_schema.jsx");',
      '$.evalFile("' + extPath + '/jsx/dispatcher/actions_comp.jsx");',
      '$.evalFile("' + extPath + '/jsx/dispatcher/actions_layer.jsx");',
      '$.evalFile("' + extPath + '/jsx/dispatcher/actions_footage.jsx");',
      '$.evalFile("' + extPath + '/jsx/dispatcher/actions_property.jsx");',
      '$.evalFile("' + extPath + '/jsx/dispatcher/actions_park.jsx");',
      '$.evalFile("' + extPath + '/jsx/dispatcher/actions_matte.jsx");',
      '$.evalFile("' + extPath + '/jsx/dispatcher/actions_effect.jsx");',
      '$.evalFile("' + extPath + '/jsx/dispatcher/actions_graphExport.jsx");',
      // Core dispatcher — must be last (defines _handlers + dispatch/dispatchBatch)
      '$.evalFile("' + extPath + '/jsx/dispatcher/dispatcher.jsx");'
    ].join('\n');
    _cs.evalScript(script, function(result) {
      if (result && result.indexOf('Error') !== -1) {
        _preambleError = result;
        console.error('[evalBridge] preamble load failed: ' + result);
        _flushReadyCallbacks(false);
      } else {
        _preambleLoaded = true;
        console.log('[evalBridge] preamble loaded successfully');
        _flushReadyCallbacks(true);
      }
    });
  }

  /**
   * Checks whether the bridge is initialized and the preamble has been loaded.
   * @returns {boolean}
   */
  function _isBridgeAvailable() {
    return _cs !== null && _preambleLoaded;
  }

  /**
   * Sends a single command object to the host via evalScript.
   * The command is JSON-serialized and passed to the ExtendScript dispatch() function.
   * @param {Object} commandObj - Command with an `action` string and optional `params`
   * @returns {Promise<Object>} Resolves with the parsed response from the host
   */
  function dispatch(commandObj) {
    return new Promise(function(resolve, reject) {
      if (_cs === null) {
        reject(new Error('[evalBridge] csInterface not available — panel is running outside After Effects'));
        return;
      }
      if (!_preambleLoaded) {
        reject(new Error('[evalBridge] preamble not loaded: ' + (_preambleError || 'unknown error')));
        return;
      }

      console.log('[evalBridge] dispatch: ' + commandObj.action);
      var json = JSON.stringify(commandObj);
      var call = 'dispatch(' + JSON.stringify(json) + ')';
      _cs.evalScript(call, function(result) {
        try {
          var res = JSON.parse(result);
          if (res.ok) {
            console.log('[evalBridge] ok: ' + commandObj.action);
          } else {
            console.log('[evalBridge] error: ' + commandObj.action + ' — ' + res.error);
          }
          resolve(res);
        } catch(e) {
          console.log('[evalBridge] parse error — raw result: ' + result);
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
    return new Promise(function(resolve, reject) {
      if (_cs === null) {
        reject(new Error('[evalBridge] csInterface not available — panel is running outside After Effects'));
        return;
      }
      if (!_preambleLoaded) {
        reject(new Error('[evalBridge] preamble not loaded: ' + (_preambleError || 'unknown error')));
        return;
      }

      console.log('[evalBridge] dispatchBatch: ' + commandArray.length + ' commands');
      var json = JSON.stringify(commandArray);
      var call = 'dispatchBatch(' + JSON.stringify(json) + ')';
      _cs.evalScript(call, function(result) {
        try {
          var res = JSON.parse(result);
          if (res.ok) {
            console.log('[evalBridge] ok: dispatchBatch');
          } else {
            console.log('[evalBridge] error: dispatchBatch — ' + res.error);
          }
          resolve(res);
        } catch(e) {
          console.log('[evalBridge] parse error — raw result: ' + result);
          reject(new Error('[evalBridge] parse error — raw result: ' + result));
        }
      });
    });
  }

  return {
    init:          init,
    onReady:       onReady,
    dispatch:      dispatch,
    dispatchBatch: dispatchBatch
  };

})();
