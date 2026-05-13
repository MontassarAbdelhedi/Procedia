var evalBridge = (function() {

  var _preamble = '';

  // Called once at startup with the concatenated JSX source.
  // Every subsequent evalScript call will prepend this so the JSX functions
  // are always defined in the same scope as the invocation — required in
  // AE 2025 where evalScript calls do not share a persistent global scope.
  function setPreamble(src) {
    _preamble = src || '';
  }

  function evalScript(fnCall) {
    // Wrap in IIFE so AE surfaces the return value of fnCall regardless of
    // how many statements the preamble contains.
    var script = _preamble
      ? '(function(){\n' + _preamble + '\nreturn (' + fnCall + ');\n}())'
      : fnCall;
    return new Promise(function(resolve, reject) {
      if (!csInterface) {
        reject(new Error('[evalBridge] csInterface not available — running outside AE'));
        return;
      }
      csInterface.evalScript(script, function(result) {
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
    evalScript: evalScript,
    setPreamble: setPreamble
  };

}());
