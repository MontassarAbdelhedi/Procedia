/**
 * Central registry for node type definitions.
 * Provides register, lookup, category filtering, and type listing.
 * @module nodeRegistry
 * @dependencies none
 * @exports register, getDefinition, getAll, getByCategory, listTypes
 */
// graph/nodeRegistry.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: all node category files, graph/schemaCache.js, graph/engine/index.js

var nodeRegistry = (function() {

  var _registry = {};

  /**
   * Registers a new node type definition.
   * @param {Object} def - Definition object with a non-empty string type
   * @throws {Error} If def.type is missing, empty, or already registered
   */
  function register(def) {
    if (!def || typeof def.type !== 'string' || def.type === '') {
      throw new Error('nodeRegistry.register: def.type is required');
    }
    if (_registry.hasOwnProperty(def.type)) {
      throw new Error('nodeRegistry.register: type already registered: ' + def.type);
    }
    _registry[def.type] = def;
  }

  /**
   * Looks up a node type definition by type string.
   * @param {string} type - Node type identifier
   * @returns {Object|null} The definition, or null if not found
   */
  function getDefinition(type) {
    return _registry.hasOwnProperty(type) ? _registry[type] : null;
  }

  /**
   * Returns the entire registry map.
   * @returns {Object} Map of type -> definition
   */
  function getAll() {
    return _registry;
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

  return {
    register:      register,
    getDefinition: getDefinition,
    getAll:        getAll,
    getByCategory: getByCategory,
    listTypes:     listTypes
  };

})();
