/**
 * graph/engine/helpers/dataPropagation.js
 *
 * Propagates data property values from a node to all connected data wire
 * targets. Handles enable/disable (fallback to defaults) and expression
 * dispatching for Expression nodes.
 *
 * Dependencies: graphState, nodeRegistry, dirtyFlusher,
 *               helpers/expressionDispatch.js, helpers/pathLayer.js
 * Load before: graph/engine/helpers/index.js
 *
 * Exports: propagateDataValue, propagateDataDefaults, repropagateDataValues
 */
// graph/engine/helpers/dataPropagation.js
// DEPENDS ON: graph/graphState, graph/nodeRegistry.js, flush/dirtyFlusher.js,
//             graph/engine/helpers/expressionDispatch.js, graph/engine/helpers/pathLayer.js
// MUST LOAD BEFORE: graph/engine/helpers/index.js

window.__procedia_internal.hlp = window.__procedia_internal.hlp || {};

(function() {
  var hlp = window.__procedia_internal.hlp;

  /**
   * Propagates a data property value from a node to all connected data wire
   * targets and schedules a dirty flush.
   *
   * @param {string} fromNodeId - Source node ID
   * @param {string} key - Property key to propagate
   * @param {*} value - Property value
   */
  hlp.propagateDataValue = function(fromNodeId, key, value) {
    var fromNodeData = graphState.getNode(fromNodeId);
    if (!fromNodeData) return;

    if (fromNodeData.type === 'data/expression' && key === 'expression') {
      if (typeof value !== 'string' || value.trim() === '') return;
      if (typeof evalBridge === 'undefined') return;
      var expressionWires = graphState.getAllWires();
      for (var ewId in expressionWires) {
        if (!expressionWires.hasOwnProperty(ewId)) continue;
        var ew = expressionWires[ewId];
        if (ew.fromNode === fromNodeId && ew.type === 'data') {
          hlp._dispatchExpressionToTarget(ew.toNode, ew.toPort, value);
        }
      }
      return;
    }

    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      if (!wires.hasOwnProperty(wireId)) continue;
      var wire = wires[wireId];
      if (wire.fromNode === fromNodeId && wire.type === 'data') {
        graphState.updateProp(wire.toNode, wire.toPort, value);
        if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.schedule) dirtyFlusher.schedule();
      }
    }
  };

  /**
   * Propagates default values from target node definitions to all nodes
   * connected via data wires from the given source node.
   * Used when a data node is disabled — receivers fall back to their own defaults.
   *
   * @param {string} fromNodeId - The disabled data node ID
   */
  hlp.propagateDataDefaults = function(fromNodeId) {
    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      if (!wires.hasOwnProperty(wireId)) continue;
      var wire = wires[wireId];
      if (wire.fromNode === fromNodeId && wire.type === 'data') {
        var targetNode = graphState.getNode(wire.toNode);
        if (!targetNode) continue;
        var targetDef = nodeRegistry.getDefinition(targetNode.type);
        if (!targetDef) continue;

        if (targetDef.params === 'dynamic') {
          if (targetNode.dynamicSchema && targetNode.dynamicSchema.properties) {
            var props = targetNode.dynamicSchema.properties;
            for (var propIndex = 0; propIndex < props.length; propIndex++) {
              if (props[propIndex].matchName === wire.toPort) {
                graphState.updateProp(wire.toNode, wire.toPort, props[propIndex].defaultValue);
                break;
              }
            }
          }
        } else {
          var params = targetDef.params || [];
          for (var j = 0; j < params.length; j++) {
            if (params[j].key === wire.toPort) {
              graphState.updateProp(wire.toNode, wire.toPort, params[j]['default']);
              break;
            }
          }
        }
      }
    }
  };

  /**
   * Re-propagates all property values from a data node to its connected
   * data wire targets. Used when a data node is re-enabled.
   *
   * @param {string} fromNodeId - The re-enabled data node ID
   */
  hlp.repropagateDataValues = function(fromNodeId) {
    var nodeData = graphState.getNode(fromNodeId);
    if (!nodeData) return;
    for (var key in nodeData.props) {
      if (nodeData.props.hasOwnProperty(key)) {
        hlp.propagateDataValue(fromNodeId, key, nodeData.props[key]);
      }
    }
  };
})();
