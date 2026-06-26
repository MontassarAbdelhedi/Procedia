/**
 * @fileoverview Node compatibility filtering for the node picker.
 * Finds all node definitions compatible with a given wire type,
 * either as input (forward wiring) or output (reverse wiring).
 * Depends on: nodeRegistry (global).
 * Exports: __np_compat.compatibleNodes, __np_compat.compatibleOutputNodes
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

  /**
   * Returns all node definitions that have an output port matching the given wire type.
   * Used for reverse wiring (drag from input port → pick node to connect into it).
   * @param {string} wireType The wire type to match.
   * @return {Array} Array of compatible node definitions.
   */
  function compatibleOutputNodes(wireType) {
    var all = nodeRegistry.getAll();
    var results = [];
    for (var type in all) {
      var def = all[type];
      if (!def.ports) continue;
      for (var i = 0; i < def.ports.length; i++) {
        var p = def.ports[i];
        if (p.category === 'output' && p.type === wireType) {
          results.push(def);
          break;
        }
      }
    }
    return results;
  }

  return {
    compatibleNodes: compatibleNodes,
    compatibleOutputNodes: compatibleOutputNodes
  };

})();
