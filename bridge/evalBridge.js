var evalBridge = (function() {

  function evalScript(fnCall) {
    return new Promise(function(resolve, reject) {
      if (!csInterface) {
        reject(new Error('[evalBridge] csInterface not available — running outside AE'));
        return;
      }
      csInterface.evalScript(fnCall, function(result) {
        try {
          var parsed = JSON.parse(result);
          resolve(parsed);
        } catch (e) {
          reject(new Error('[evalBridge] Parse error for call: ' + fnCall + ' — raw result: ' + result));
        }
      });
    });
  }

  return {
    evalScript: evalScript
  };

}());
