(function() {
  var _modules = {};
  window.__procedia_internal.registry = {
    register: function(name, module) {
      _modules[name] = module;
    },
    get: function(name) {
      if (!_modules[name]) throw new Error('[Procedia] engine dependency "' + name + '" not registered. Check load order.');
      return _modules[name];
    },
    has: function(name) {
      return !!_modules[name];
    }
  };
})();
