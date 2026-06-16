/**
 * graph/schemaCache/diff.js
 *
 * Schema diffing logic: compares two schemas by their properties and runs
 * the full version-diff algorithm that re-introspects every known schema
 * when the AE version has changed.
 *
 * Dependencies: bridge/evalBridge.js, schemaCache/state.js,
 *               schemaCache/persistence.js
 * Load before: schemaCache/index.js
 *
 * Exports (via __sc_diff): schemasAreDifferent, runVersionDiff
 */
// graph/schemaCache/diff.js
// DEPENDS ON: bridge/evalBridge.js, graph/schemaCache/state.js,
//             graph/schemaCache/persistence.js
// MUST LOAD BEFORE: graph/schemaCache/index.js

var __sc_diff = (function() {
  var _state   = __sc_state;
  var _persist = __sc_persist;

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
   * Compares cached schemas against the current AE version and updates
   * any that have changed (or removes those no longer available).
   * @param {string} newVersion - The current AE version string
   * @returns {Promise<void>} Resolves when diff is complete
   */
  function _runVersionDiff(newVersion) {
    var knownMatchNames = _state.memoryKeys();
    if (knownMatchNames.length === 0) {
      _state.setVersion(newVersion);
      _state.setReady(true);
      _persist.writeToDisk();
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
              _state.deleteKey(matchName);
              changed++;
              return;
            }
            if (_schemasAreDifferent(_state.getSchema(matchName), res.data)) {

              _state.storeSchema(matchName, res.data);
              changed++;
            }
          });
        });
      })(knownMatchNames[i]);
    }

    return chain.then(function() {
      _state.setVersion(newVersion);
      _state.setReady(true);

      _persist.writeToDisk();
    });
  }

  return {
    schemasAreDifferent: _schemasAreDifferent,
    runVersionDiff:      _runVersionDiff
  };

})();
