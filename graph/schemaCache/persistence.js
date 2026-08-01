/**
 * graph/schemaCache/persistence.js
 *
 * Persists the in-memory cache (AE version + schemas) to disk via
 * evalBridge.  Used by storeSchema() and after version-diff completion.
 *
 * Dependencies: bridge/evalBridge.js, schemaCache/state.js
 * Load before: schemaCache/index.js
 *
 * Exports (via window.__procedia_internal.scPersist): writeToDisk
 */
// graph/schemaCache/persistence.js
// DEPENDS ON: bridge/evalBridge.js, graph/schemaCache/state.js
// MUST LOAD BEFORE: graph/schemaCache/index.js

window.__procedia_internal.scPersist = (function() {

  /**
   * Persists the current cache (AE version + schemas) to disk via evalBridge.
   */
  function _writeToDisk() {
    evalBridge.dispatch({
      action: 'writeSchemaCache',
      params: {
        cache: {
          aeVersion: window.__procedia_internal.scState.getVersion(),
          schemas:   window.__procedia_internal.scState.getCache()
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
