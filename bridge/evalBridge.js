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

  var _isWriting = false;

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

  function isWriting() {
    return _isWriting;
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

      _isWriting = true;

      try {
        csInterface.evalScript(call, function(result) {
          _isWriting = false;
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
        _isWriting = false;
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

      _isWriting = true;

      try {
        csInterface.evalScript(call, function(result) {
          _isWriting = false;
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
        _isWriting = false;
        reject(new Error('[evalBridge] evalScript threw: ' + e.message));
      }

    });
  }

  function writeGraph(graphData) {
    return new Promise(function(resolve, reject) {
      if (!_isBridgeAvailable()) {
        reject(new Error('[evalBridge] csInterface not available'));
        return;
      }
      var json = JSON.stringify(graphData);
      var call = _withDispatcherLoaded('writeGraph(' + JSON.stringify(json) + ')');
      _isWriting = true;
      try {
        csInterface.evalScript(call, function(result) {
          _isWriting = false;
          try { resolve(JSON.parse(result)); }
          catch(e) { reject(new Error('[evalBridge] writeGraph parse error')); }
        });
      } catch (e) {
        _isWriting = false;
        reject(new Error('[evalBridge] writeGraph evalScript threw: ' + e.message));
      }
    });
  }

  function readGraph() {
    return new Promise(function(resolve, reject) {
      if (!_isBridgeAvailable()) {
        reject(new Error('[evalBridge] csInterface not available'));
        return;
      }
      var call = _withDispatcherLoaded('readGraph()');
      _isWriting = true;
      try {
        csInterface.evalScript(call, function(result) {
          _isWriting = false;
          try { resolve(JSON.parse(result)); }
          catch(e) { reject(new Error('[evalBridge] readGraph parse error')); }
        });
      } catch (e) {
        _isWriting = false;
        reject(new Error('[evalBridge] readGraph evalScript threw: ' + e.message));
      }
    });
  }

  return {
    dispatch:      dispatch,
    dispatchBatch: dispatchBatch,
    isWriting:     isWriting,
    writeGraph:    writeGraph,
    readGraph:     readGraph
  };

})();
