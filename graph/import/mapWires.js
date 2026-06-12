/**
 * graph/import/mapWires.js
 *
 * Builds wire data objects from the imported AE project structure.
 * Creates layer chains, effect wiring, parent relationships, blending
 * mode splices, and track matte connections.
 *
 * Dependencies: uuidGenerator, graph/import/mapNodes.js
 * Load before: graph/import/builder.js
 *
 * Exports: buildCompWires, buildParentWires, getTerminalWireIds
 */

var __imp_wires = (function() {

  /**
   * Builds all layer and effect wires for a single comp.
   * Layers are sorted by AE stack order (bottom to top).
   * Each layer's effects are chained; the final node connects to the comp.
   * Track mattes insert a matte node into the chain.
   *
   * @param {Object} compData - Comp data from scanner
   * @param {Object} compNode - Corresponding Procedia Comp node
   * @param {Object[]} layerNodes - Array of {node, layerData} for each layer in this comp
   * @param {Object} effectMap - Map of layerUUID -> [effectorNode, ...]
   * @param {Object} blendingMap - Map of layerUUID -> blendingNode (or null)
   * @param {Object} matteMap - Map of topLayerUUID -> {matteNode, matteLayerNode}
   * @returns {Object[]} Array of wire data objects
   */
  function buildCompWires(compData, compNode, layerNodes, effectMap, blendingMap, matteMap) {
    var wires = [];

    for (var li = 0; li < layerNodes.length; li++) {
      var item = layerNodes[li];
      var layerNode = item.node;
      var layerData = item.layerData;
      var layerUUID = layerData.uuid;

      var chain = [layerUUID];

      var effects = effectMap[layerUUID] || [];
      for (var ei = 0; ei < effects.length; ei++) {
        chain.push(effects[ei].id);
      }

      var blendNode = blendingMap ? blendingMap[layerUUID] : null;
      if (blendNode) {
        chain.push(blendNode.id);
      }

      var matteInfo = matteMap ? matteMap[layerUUID] : null;
      if (matteInfo) {
        chain.push(matteInfo.matteNode.id);
      }

      chain.push(compData.uuid);

      for (var ci = 0; ci < chain.length - 1; ci++) {
        var fromId = chain[ci];
        var toId = chain[ci + 1];
        var isTerminal = (toId === compData.uuid);
        var wireId = uuidGenerator.wire();

        var wireData = {
          id:             wireId,
          type:           'layer',
          fromNode:       fromId,
          fromPort:       'output',
          toNode:         toId,
          toPort:         (toId === compData.uuid) ? 'main_input' : 'main_input',
          _pathLayerUUID: isTerminal ? wireId : null,
          boundParam:     null
        };

        wires.push(wireData);
      }

      if (matteInfo && matteInfo.matteLayerUUID) {
        var matteWireId = uuidGenerator.wire();
        wires.push({
          id:             matteWireId,
          type:           'layer',
          fromNode:       matteInfo.matteLayerUUID,
          fromPort:       'output',
          toNode:         matteInfo.matteNode.id,
          toPort:         'main_input',
          _pathLayerUUID: null,
          boundParam:     null
        });
      }
    }

    return wires;
  }

  /**
   * Builds parent-child relationship wires.
   *
   * @param {Object[]} layerNodes - Array of {node, layerData} with layerData.parentUUID
   * @returns {Object[]} Array of parent wire data objects
   */
  function buildParentWires(layerNodes) {
    var wires = [];
    for (var i = 0; i < layerNodes.length; i++) {
      var layerData = layerNodes[i].layerData;
      if (layerData.parentUUID) {
        wires.push({
          id:             uuidGenerator.wire(),
          type:           'parent',
          fromNode:       layerData.uuid,
          fromPort:       'child_of',
          toNode:         layerData.parentUUID,
          toPort:         'parent_of',
          _pathLayerUUID: null,
          boundParam:     null
        });
      }
    }
    return wires;
  }

  /**
   * Collects terminal wire IDs for reference.
   * @param {Object[]} wires - Array of wire data objects
   * @returns {string[]} Array of wire IDs with _pathLayerUUID set
   */
  function getTerminalWireIds(wires) {
    var ids = [];
    for (var i = 0; i < wires.length; i++) {
      if (wires[i]._pathLayerUUID !== null) {
        ids.push(wires[i].id);
      }
    }
    return ids;
  }

  return {
    buildCompWires:    buildCompWires,
    buildParentWires:  buildParentWires,
    getTerminalWireIds: getTerminalWireIds
  };

})();
