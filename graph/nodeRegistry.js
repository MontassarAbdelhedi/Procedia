/**
 * Central registry for node type definitions.
 * Provides register, lookup, category filtering, and type listing.
 * @module nodeRegistry
 * @dependencies none
 * @exports register, getDefinition, getAll, getByCategory, listTypes
 */
// graph/nodeRegistry.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: all node category files, graph/schemaCache/state.js, graph/schemaCache/persistence.js, graph/schemaCache/diff.js, graph/schemaCache/index.js, graph/engine/index.js

var nodeRegistry = (function() {

  var _registry = {};
  var _stubs = {};

  /**
   * Registers a new node type definition.
   * Replaces any existing stub for the same type.
   * @param {Object} def - Definition object with a non-empty string type
   * @throws {Error} If def.type is missing, empty, or already registered
   */
  function register(def) {
    if (!def || typeof def.type !== 'string' || def.type === '') {
      throw new Error('nodeRegistry.register: def.type is required');
    }
    if (_registry.hasOwnProperty(def.type) && !_stubs[def.type]) {
      throw new Error('nodeRegistry.register: type already registered: ' + def.type);
    }
    _registry[def.type] = def;
    delete _stubs[def.type];
  }

  /**
   * Registers a minimal stub definition (metadata only) for a node type.
   * Stubs are replaced when the full definition is registered later.
   * @param {Object} stub - Stub with at least type, label, category
   * @throws {Error} If stub.type is missing or empty
   */
  function registerStub(stub) {
    if (!stub || typeof stub.type !== 'string' || stub.type === '') {
      throw new Error('nodeRegistry.registerStub: stub.type is required');
    }
    if (_registry.hasOwnProperty(stub.type) && !_stubs[stub.type]) return;
    _registry[stub.type] = stub;
    _stubs[stub.type] = true;
  }

  /**
   * Looks up a node type definition by type string.
   * Auto-upgrades stubs to full definitions via effectNodeFactory when available.
   * @param {string} type - Node type identifier
   * @returns {Object|null} The definition, or null if not found
   */
  function getDefinition(type) {
    var def = _registry.hasOwnProperty(type) ? _registry[type] : null;
    if (def && _stubs[type] && typeof effectNodeFactory !== 'undefined' && effectNodeFactory.upgradeStub) {
      var fullDef = effectNodeFactory.upgradeStub(def);
      _registry[type] = fullDef;
      delete _stubs[type];
      return fullDef;
    }
    return def;
  }

  /**
   * Returns the entire registry map.
   * @returns {Object} Map of type -> definition
   */
  function getAll() {
    return _registry;
  }

  /**
   * Checks whether a given type has its full definition loaded (not a stub).
   * @param {string} type - Node type identifier
   * @returns {boolean} True if the type is registered with a full definition
   */
  function isLoaded(type) {
    return _registry.hasOwnProperty(type) && !_stubs[type];
  }

  /**
   * Returns all definitions belonging to a given category.
   * @param {string} category - Category name to filter by
   * @returns {Object[]} Array of matching definitions
   */
  function getByCategory(category) {
    var results = [];
    for (var type in _registry) {
      if (_registry[type].category === category) {
        results.push(_registry[type]);
      }
    }
    return results;
  }

  /**
   * Lists all registered type strings.
   * @returns {string[]} Array of type identifiers
   */
  function listTypes() {
    return Object.keys(_registry);
  }

  /**
   * Removes a type from the registry.
   * @param {string} type - Type identifier to remove
   */
  function unregister(type) {
    if (_registry.hasOwnProperty(type)) {
      delete _registry[type];
      delete _stubs[type];
    }
  }

  return {
    register:      register,
    registerStub:  registerStub,
    unregister:    unregister,
    getDefinition: getDefinition,
    getAll:        getAll,
    getByCategory: getByCategory,
    listTypes:     listTypes,
    isLoaded:      isLoaded
  };

})();
