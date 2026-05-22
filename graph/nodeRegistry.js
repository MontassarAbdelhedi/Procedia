// graph/nodeRegistry.js
// DEPENDS ON: none
// MUST LOAD BEFORE: all node category files, graph/engine.js

var nodeRegistry = (function() {

  var _registry = {};

  function register(def) {
    if (!def || typeof def.type !== 'string' || def.type === '') {
      throw new Error('nodeRegistry.register: def.type is required');
    }
    if (_registry[def.type] !== undefined) {
      throw new Error('nodeRegistry.register: type already registered: ' + def.type);
    }
    _registry[def.type] = def;
  }

  function getDefinition(type) {
    return _registry[type] !== undefined ? _registry[type] : null;
  }

  function getAll() {
    return _registry;
  }

  function getByCategory(category) {
    var result = [];
    for (var type in _registry) {
      if (_registry[type].category === category) {
        result.push(_registry[type]);
      }
    }
    return result;
  }

  function listTypes() {
    var types = [];
    for (var type in _registry) {
      types.push(type);
    }
    return types;
  }

  return {
    register:      register,
    getDefinition: getDefinition,
    getAll:        getAll,
    getByCategory: getByCategory,
    listTypes:     listTypes
  };

})();
