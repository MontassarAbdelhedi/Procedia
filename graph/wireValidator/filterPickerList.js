/**
 * Filters a node list to only those with a mainInput port matching the
 * given wire type. Used for picker UI lists.
 * @module wireValidator/filterPickerList
 * @dependencies graph/nodeRegistry.js
 * @exports __wv.filterPickerList
 */
// graph/wireValidator/filterPickerList.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: graph/wireValidator/index.js

(function() {
  var wv = window.__wv = window.__wv || {};

  /**
   * Filters a list of nodes to only those that have a mainInput port
   * matching the given wire type. Used for picker UI lists.
   * @param {string} wireType - Wire type to filter by
   * @param {Object[]} nodeList - Array of node data objects
   * @returns {Object[]} Filtered array of matching nodes
   */
  wv.filterPickerList = function(wireType, nodeList) {
    if (!nodeList || nodeList.length === 0) return [];

    var result = [];
    for (var i = 0; i < nodeList.length; i++) {
      var nodeData = nodeList[i];
      if (!nodeData) continue;
      var def = nodeRegistry.getDefinition(nodeData.type);
      if (!def || !def.ports) continue;

      var matches = false;
      for (var p = 0; p < def.ports.length; p++) {
        var port = def.ports[p];
        if (port.type === wireType && port.category === 'mainInput') {
          matches = true;
          break;
        }
      }
      if (matches) result.push(nodeData);
    }
    return result;
  };
})();
