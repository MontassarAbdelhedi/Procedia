/**
 * graph/schemaCache/state.js
 *
 * Internal in-memory cache state and public read-accessors for the schema
 * cache.  Owns the mutable state (`_memoryCache`, `_aeVersion`, `_ready`)
 * and exposes getter/setter functions so sibling sub‑modules can safely
 * read and write it.
 *
 * Dependencies: (none)
 * Load before: schemaCache/persistence.js, schemaCache/diff.js,
 *              schemaCache/index.js
 *
 * Exports (via __sc_state): getCache, setCache, deleteKey, storeSchema,
 *          getVersion, setVersion, getReady, setReady,
 *          memoryKeys, hasSchema, getSchema, isReady
 */
// graph/schemaCache/state.js
// (no external deps)
// MUST LOAD BEFORE: graph/schemaCache/persistence.js, graph/schemaCache/diff.js,
//                   graph/schemaCache/index.js

var __sc_state = (function() {

  var _memoryCache = {};
  var _aeVersion   = '';
  var _ready       = false;

  /**
   * Returns all keys currently in the in-memory cache.
   * @returns {string[]} Array of matchName keys
   */
  function _memoryKeys() {
    var keys = [];
    for (var k in _memoryCache) {
      if (_memoryCache.hasOwnProperty(k)) keys.push(k);
    }
    return keys;
  }

  /**
   * Checks whether a schema is already cached.
   * @param {string} matchName - Effect match name
   * @returns {boolean} True if cached
   */
  function _hasSchema(matchName) {
    return !!_memoryCache[matchName];
  }

  /**
   * Synchronously retrieves a cached schema.
   * @param {string} matchName - Effect match name
   * @returns {Object|null} The schema data, or null if not cached
   */
  function _getSchema(matchName) {
    return _memoryCache[matchName] || null;
  }

  /**
   * Returns whether the cache has finished initialising.
   * @returns {boolean} True if init has completed (successfully or not)
   */
  function _isReady() {
    return _ready;
  }

  return {
    // --- mutable state accessors (for __sc_persist, __sc_diff, __sc_index) ---
    getCache:     function()      { return _memoryCache; },
    setCache:     function(c)     { _memoryCache = c; },
    deleteKey:    function(k)     { delete _memoryCache[k]; },
    storeSchema:  function(mn,d)  { _memoryCache[mn] = d; },
    getVersion:   function()      { return _aeVersion; },
    setVersion:   function(v)     { _aeVersion = v; },
    getReady:     function()      { return _ready; },
    setReady:     function(v)     { _ready = v; },

    // --- public read accessors (forwarded by schemaCache/index.js) ---
    memoryKeys:   _memoryKeys,
    hasSchema:    _hasSchema,
    getSchema:    _getSchema,
    isReady:      _isReady
  };

})();
