// bridge/evalBridge.js
// DEPENDS ON: lib/CSInterface.js
// MUST LOAD BEFORE: graph/graphState.js, graph/engine.js, flush/dirtyFlusher.js, polling/poller.js

var csInterface = null;
if (typeof CSInterface !== 'undefined' && typeof window.__adobe_cep__ !== 'undefined') {
  try {
    csInterface = new CSInterface();
  } catch (e) {
    csInterface = null;
  }
}

var evalBridge = (function() {

  function _isBridgeAvailable() {
    return csInterface != null && typeof csInterface.evalScript === 'function';
  }

  function _getDispatcherPath() {
    if (
      csInterface == null ||
      typeof csInterface.getSystemPath !== 'function' ||
      typeof SystemPath === 'undefined'
    ) {
      return null;
    }

    var root = csInterface.getSystemPath(SystemPath.EXTENSION);
    if (!root) return null;

    root = String(root).replace(/\\/g, '/').replace(/\/$/, '');
    return root + '/jsx/dispatcher/dispatcher.jsx';
  }

  function _withDispatcherLoaded(call) {
    var dispatcherPath = _getDispatcherPath();
    if (!dispatcherPath) return call;

    return '$.evalFile(new File(' + JSON.stringify(dispatcherPath) + ')); ' + call;
  }

  function dispatch(commandObj) {
    return new Promise(function(resolve, reject) {

      if (!_isBridgeAvailable()) {
        reject(new Error('[evalBridge] csInterface not available — panel is running outside After Effects'));
        return;
      }

      console.log('[evalBridge] dispatch: ' + commandObj.action);

      var json = JSON.stringify(commandObj);
      var call = _withDispatcherLoaded('dispatch(' + JSON.stringify(json) + ')');

      try {
        csInterface.evalScript(call, function(result) {
          var res;
          try {
            res = JSON.parse(result);
          } catch (e) {
            console.log('[evalBridge] parse error — raw result: ' + result);
            reject(new Error('[evalBridge] parse error — raw result: ' + result));
            return;
          }

          if (res.ok) {
            console.log('[evalBridge] ok: ' + commandObj.action);
          } else {
            console.log('[evalBridge] error: ' + commandObj.action + ' — ' + res.error);
          }

          resolve(res);
        });
      } catch (e) {
        reject(new Error('[evalBridge] evalScript threw: ' + e.message));
      }

    });
  }

  function dispatchBatch(commandArray) {
    return new Promise(function(resolve, reject) {

      if (!_isBridgeAvailable()) {
        reject(new Error('[evalBridge] csInterface not available — panel is running outside After Effects'));
        return;
      }

      console.log('[evalBridge] dispatchBatch: ' + commandArray.length + ' commands');

      var json = JSON.stringify(commandArray);
      var call = _withDispatcherLoaded('dispatchBatch(' + JSON.stringify(json) + ')');

      try {
        csInterface.evalScript(call, function(result) {
          var res;
          try {
            res = JSON.parse(result);
          } catch (e) {
            console.log('[evalBridge] parse error — raw result: ' + result);
            reject(new Error('[evalBridge] parse error — raw result: ' + result));
            return;
          }

          if (res.ok) {
            console.log('[evalBridge] ok: dispatchBatch');
          } else {
            console.log('[evalBridge] error: dispatchBatch — ' + res.error);
          }

          resolve(res);
        });
      } catch (e) {
        reject(new Error('[evalBridge] evalScript threw: ' + e.message));
      }

    });
  }

  return {
    dispatch:      dispatch,
    dispatchBatch: dispatchBatch
  };

})();
