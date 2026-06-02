/**
 * graph/schemaCache/persistence.js
 *
 * Persists the in-memory cache (AE version + schemas) to disk via
 * evalBridge.  Used by storeSchema() and after version-diff completion.
 *
 * Dependencies: bridge/evalBridge.js, schemaCache/state.js
 * Load before: schemaCache/index.js
 *
 * Exports (via __sc_persist): writeToDisk
 */
// graph/schemaCache/persistence.js
// DEPENDS ON: bridge/evalBridge.js, graph/schemaCache/state.js
// MUST LOAD BEFORE: graph/schemaCache/index.js

var __sc_persist = (function() {

  /**
   * Persists the current cache (AE version + schemas) to disk via evalBridge.
   */
  function _writeToDisk() {
    evalBridge.dispatch({
      action: 'writeSchemaCache',
      params: {
        cache: {
          aeVersion: __sc_state.getVersion(),
          schemas:   __sc_state.getCache()
        }
      }
    }).then(function(res) {
      if (!res.ok) console.error('[schemaCache] Failed to write cache:', res.error);
    });
  }

  return {
    writeToDisk: _writeToDisk
  };

})();
