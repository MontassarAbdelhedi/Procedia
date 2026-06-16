/**
 * Schema cache for AE effect metadata.
 * On init it reads a persisted cache from disk, checks the AE version,
 * and re-introspects any schemas whose effect may have changed.
 * Exposes synchronous lookup and async fetch-on-miss.
 *
 * Aggregates the split sub‑modules (state.js, persistence.js, diff.js)
 * into the public `schemaCache` global.
 *
 * @module schemaCache
 * @dependencies schemaCache/state.js, schemaCache/persistence.js,
 *               schemaCache/diff.js, bridge/evalBridge.js
 * @exports init, hasSchema, getSchema, storeSchema, fetchSchema, isReady
 */
// graph/schemaCache/index.js
// DEPENDS ON: bridge/evalBridge.js,
//             graph/schemaCache/state.js, graph/schemaCache/persistence.js,
//             graph/schemaCache/diff.js
// MUST LOAD BEFORE: graph/engine/index.js

var schemaCache = (function() {

  var _state   = __sc_state;
  var _persist = __sc_persist;
  var _diff    = __sc_diff;

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
          _state.setReady(true);
          return;
        }
        var cached = res.data;
        _state.setVersion(cached.aeVersion || '');
        _state.setCache(cached.schemas   || {});
        return evalBridge.dispatch({ action: 'getAEVersion' });
      })
      .then(function(res) {
        if (!res || !res.ok) {
          console.warn('[schemaCache] Could not get AE version');
          _state.setReady(true);
          return;
        }
        var currentVersion = res.data.version;
        if (currentVersion === _state.getVersion()) {
          _state.setReady(true);
          return;
        }

        return _diff.runVersionDiff(currentVersion);
      })
      .catch(function(err) {
        console.error('[schemaCache] init error:', err);
        _state.setReady(true);
      });
  }

  /**
   * Stores a schema in the in-memory cache and persists to disk.
   * @param {string} matchName - Effect match name
   * @param {Object} schemaData - Schema data to cache
   */
  function storeSchema(matchName, schemaData) {
    _state.storeSchema(matchName, schemaData);
    _persist.writeToDisk();
  }

  /**
   * Fetches a schema — returns cached value if available,
   * otherwise introspects via evalBridge and caches the result.
   * @param {string} matchName - Effect match name
   * @returns {Promise<Object>} The schema data
   * @throws {Error} If introspection fails
   */
  function fetchSchema(matchName) {
    if (_state.hasSchema(matchName)) {
      return Promise.resolve(_state.getSchema(matchName));
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

  return {
    init:        init,
    hasSchema:   _state.hasSchema,
    getSchema:   _state.getSchema,
    storeSchema: storeSchema,
    fetchSchema: fetchSchema,
    isReady:     _state.isReady
  };

})();
