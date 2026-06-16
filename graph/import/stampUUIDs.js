/**
 * graph/import/stampUUIDs.js
 *
 * Ensures that imported Procedia UUIDs are stamped on the corresponding
 * After Effects objects. The ExtendScript scanner already stamps UUIDs
 * during the read phase (actionImport/read.jsx), so this module mainly
 * handles edge cases and verification.
 *
 * Dependencies: evalBridge
 * Load before: graph/import/builder.js
 *
 * Exports: verifyStamps
 */

var __imp_stamp = (function() {

  /**
   * Verifies that all stamped UUIDs are present on AE objects by polling
   * the alive nodes. This helps surface any stamping failures.
   *
   * @param {string[]} aliveNodeUUIDs - Node UUIDs expected to be alive
   * @returns {Promise}
   */
  function verifyStamps(aliveNodeUUIDs) {
    if (!aliveNodeUUIDs || aliveNodeUUIDs.length === 0) {
      return Promise.resolve({ ok: true, missing: [] });
    }
    return evalBridge.dispatch({
      action: 'pollAliveNodes',
      params: {
        uuidListJSON: JSON.stringify(aliveNodeUUIDs)
      }
    });
  }

  return {
    verifyStamps: verifyStamps
  };

})();
