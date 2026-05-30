// bridge/evalBridge.js
// DEPENDS ON: lib/CSInterface.js, data/uuidGenerator.js
// MUST LOAD BEFORE: graph/graphState.js, graph/engine.js, flush/dirtyFlusher.js, polling/poller.js
//
// THE ONLY FILE that calls csInterface.evalScript(). No other file may call it directly.
// Exposes: evalBridge.init(cs), evalBridge.dispatch(commandObj), evalBridge.dispatchBatch(commandArr)

var evalBridge = (function() {

  var _cs = null;
  var _preambleLoaded = false;
  var _preambleError = null;
  var _readyCallbacks = [];

  function _flushReadyCallbacks(success) {
    for (var i = 0; i < _readyCallbacks.length; i++) {
      _readyCallbacks[i](success);
    }
    _readyCallbacks = [];
  }

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

  function init(cs) {
    _cs = cs;
    var extPath = _cs.getSystemPath(SystemPath.EXTENSION).replace(/\\/g, '/');
    var script = [
      '$.evalFile("' + extPath + '/jsx/json.jsx");',
      '$.evalFile("' + extPath + '/jsx/utils.jsx");',
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

  function _isBridgeAvailable() {
    return _cs !== null && _preambleLoaded;
  }

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
