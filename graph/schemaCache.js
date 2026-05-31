/**
 * Schema cache for AE effect metadata.
 * On init it reads a persisted cache from disk, checks the AE version,
 * and re-introspects any schemas whose effect may have changed.
 * Exposes synchronous lookup and async fetch-on-miss.
 * @module schemaCache
 * @dependencies bridge/evalBridge.js, graph/nodeRegistry.js
 * @exports init, hasSchema, getSchema, storeSchema, fetchSchema, isReady
 */
// graph/schemaCache.js
// DEPENDS ON: bridge/evalBridge.js, graph/nodeRegistry.js
// MUST LOAD BEFORE: graph/engine/index.js

var schemaCache = (function() {

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
   * Initialises the schema cache: reads persisted cache, checks AE version,
   * and re-introspects schemas if the version changed.
   * @returns {Promise<void>} Resolves when initialisation is complete
   */
  function init() {
    return evalBridge.dispatch({ action: 'readSchemaCache' })
      .then(function(res) {
        if (!res.ok) {
          console.warn('[schemaCache] Could not read cache file:', res.error);
          _ready = true;
          return;
        }
        var cached = res.data;
        _aeVersion   = cached.aeVersion || '';
        _memoryCache = cached.schemas   || {};
        return evalBridge.dispatch({ action: 'getAEVersion' });
      })
      .then(function(res) {
        if (!res || !res.ok) {
          console.warn('[schemaCache] Could not get AE version');
          _ready = true;
          return;
        }
        var currentVersion = res.data.version;
        if (currentVersion === _aeVersion) {
          _ready = true;
          return;
        }
        console.log('[schemaCache] AE version changed — running schema diff');
        return _runVersionDiff(currentVersion);
      })
      .catch(function(err) {
        console.error('[schemaCache] init error:', err);
        _ready = true;
      });
  }

  /**
   * Checks whether a schema is already cached.
   * @param {string} matchName - Effect match name
   * @returns {boolean} True if cached
   */
  function hasSchema(matchName) {
    return !!_memoryCache[matchName];
  }

  /**
   * Synchronously retrieves a cached schema.
   * @param {string} matchName - Effect match name
   * @returns {Object|null} The schema data, or null if not cached
   */
  function getSchema(matchName) {
    return _memoryCache[matchName] || null;
  }

  /**
   * Returns whether the cache has finished initialising.
   * @returns {boolean} True if init has completed (successfully or not)
   */
  function isReady() {
    return _ready;
  }

  /**
   * Stores a schema in the in-memory cache and persists to disk.
   * @param {string} matchName - Effect match name
   * @param {Object} schemaData - Schema data to cache
   */
  function storeSchema(matchName, schemaData) {
    _memoryCache[matchName] = schemaData;
    _writeToDisk();
  }

  /**
   * Fetches a schema — returns cached value if available,
   * otherwise introspects via evalBridge and caches the result.
   * @param {string} matchName - Effect match name
   * @returns {Promise<Object>} The schema data
   * @throws {Error} If introspection fails
   */
  function fetchSchema(matchName) {
    if (_memoryCache[matchName]) {
      return Promise.resolve(_memoryCache[matchName]);
    }
    return evalBridge.dispatch({
      action: 'introspectEffect',
      params: { matchName: matchName }
    }).then(function(res) {
      if (!res.ok) {
        throw new Error(res.error || 'introspectEffect failed');
      }
      storeSchema(matchName, res.data);
      return res.data;
    });
  }

  /**
   * Compares cached schemas against the current AE version and updates
   * any that have changed (or removes those no longer available).
   * @param {string} newVersion - The current AE version string
   * @returns {Promise<void>} Resolves when diff is complete
   */
  function _runVersionDiff(newVersion) {
    var knownMatchNames = _memoryKeys();
    if (knownMatchNames.length === 0) {
      _aeVersion = newVersion;
      _ready = true;
      _writeToDisk();
      return Promise.resolve();
    }

    var chain = Promise.resolve();
    var changed = 0;
    var i;
    for (i = 0; i < knownMatchNames.length; i++) {
      (function(matchName) {
        chain = chain.then(function() {
          return evalBridge.dispatch({
            action: 'introspectEffect',
            params: { matchName: matchName }
          }).then(function(res) {
            if (!res.ok) {
              console.warn('[schemaCache] Effect removed in new AE version:', matchName);
              delete _memoryCache[matchName];
              changed++;
              return;
            }
            if (_schemasAreDifferent(_memoryCache[matchName], res.data)) {
              console.log('[schemaCache] Schema changed for:', matchName);
              _memoryCache[matchName] = res.data;
              changed++;
            }
          });
        });
      })(knownMatchNames[i]);
    }

    return chain.then(function() {
      _aeVersion = newVersion;
      _ready = true;
      console.log('[schemaCache] Diff complete — ' + changed + ' schema(s) updated');
      _writeToDisk();
    });
  }

  /**
   * Compares two schemas by their properties (length + matchName + type).
   * @param {Object} cachedSchema - Previously cached schema
   * @param {Object} newSchema - Freshly introspected schema
   * @returns {boolean} True if the schemas differ
   */
  function _schemasAreDifferent(cachedSchema, newSchema) {
    var cached = cachedSchema.properties || [];
    var fresh  = newSchema.properties    || [];
    if (cached.length !== fresh.length) return true;
    var cachedIndex = {};
    var ci;
    for (ci = 0; ci < cached.length; ci++) {
      cachedIndex[cached[ci].matchName] = cached[ci];
    }
    for (var j = 0; j < fresh.length; j++) {
      var prop = fresh[j];
      if (!cachedIndex[prop.matchName]) return true;
      if (cachedIndex[prop.matchName].type !== prop.type) return true;
    }
    return false;
  }

  /**
   * Persists the current cache (AE version + schemas) to disk via evalBridge.
   */
  function _writeToDisk() {
    evalBridge.dispatch({
      action: 'writeSchemaCache',
      params: { cache: { aeVersion: _aeVersion, schemas: _memoryCache } }
    }).then(function(res) {
      if (!res.ok) console.error('[schemaCache] Failed to write cache:', res.error);
    });
  }

  return {
    init:        init,
    hasSchema:   hasSchema,
    getSchema:   getSchema,
    storeSchema: storeSchema,
    fetchSchema: fetchSchema,
    isReady:     isReady
  };

})();
