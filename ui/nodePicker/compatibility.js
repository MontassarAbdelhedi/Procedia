/**
 * @fileoverview Node compatibility filtering for the node picker.
 * Finds all node definitions that can accept a given wire type.
 * Depends on: nodeRegistry (global).
 * Exports: __np_compat.compatibleNodes
 */
// ui/nodePicker/compatibility.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: ui/nodePicker/index.js

var __np_compat = (function() {

  /**
   * Returns all node definitions that have an input port matching the given wire type.
   * @param {string} wireType The wire type to match.
   * @return {Array} Array of compatible node definitions.
   */
  function compatibleNodes(wireType) {
    var all = nodeRegistry.getAll();
    var results = [];
    for (var type in all) {
      var def = all[type];
      if (!def.ports) continue;
      for (var i = 0; i < def.ports.length; i++) {
        var p = def.ports[i];
        if ((p.category === 'mainInput' || p.category === 'secondaryInput') && p.type === wireType) {
          results.push(def);
          break;
        }
      }
    }
    return results;
  }

  return {
    compatibleNodes: compatibleNodes
  };

})();
