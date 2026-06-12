/**
 * graph/import/index.js
 *
 * Public API for the AE project import feature.
 * Provides a single entry point: graphImport.importProject(aeData)
 *
 * Dependencies: graph/import/builder.js
 * Load before: index.js
 *
 * Exports: graphImport
 */

var graphImport = (function() {

  /**
   * Imports a full AE project structure into the Procedia graph.
   * Merges the imported nodes and wires into the existing graph state.
   *
   * @param {Object} aeData - Project structure from actions_import.jsx
   *        { comps: [..], footage: [..] }
   * @returns {Promise<Object>} Summary { comps, layers, effects, footage, unknowns, errors }
   */
  function importProject(aeData) {
    return __imp_builder.importProject(aeData);
  }

  return {
    importProject: importProject
  };

})();
