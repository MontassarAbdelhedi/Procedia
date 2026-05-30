// graph/nodeRegistry.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: all node category files, graph/schemaCache.js, graph/engine.js

var nodeRegistry = (function() {

  var _registry = {};

  function register(def) {
    if (!def || typeof def.type !== 'string' || def.type === '') {
      throw new Error('nodeRegistry.register: def.type is required');
    }
    if (_registry.hasOwnProperty(def.type)) {
      throw new Error('nodeRegistry.register: type already registered: ' + def.type);
    }
    _registry[def.type] = def;
  }

  function getDefinition(type) {
    return _registry.hasOwnProperty(type) ? _registry[type] : null;
  }

  function getAll() {
    return _registry;
  }

  function getByCategory(category) {
    var results = [];
    for (var type in _registry) {
      if (_registry[type].category === category) {
        results.push(_registry[type]);
      }
    }
    return results;
  }

  function listTypes() {
    return Object.keys(_registry);
  }

  return {
    register:      register,
    getDefinition: getDefinition,
    getAll:        getAll,
    getByCategory: getByCategory,
    listTypes:     listTypes
  };

})();
