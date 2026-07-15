/**
 * graph/engine/helpers.js
 *
 * Internal helper functions for the graph engine: initial property building,
 * UI refresh utility, dynamic schema resolution/application, path layer UUID
 * lookup, and data value propagation.
 *
 * Dependencies: graphState, nodeRegistry, schemaCache/index.js, evalBridge, dirtyFlusher
 * Load before: engine/propagate.js, engine/wires.js, engine/nodes/index.js,
 *              engine/state.js, engine/index.js
 *
   * Exports: buildInitialProps, refreshNodeUI, resolveDynamicSchema,
   *          applyDynamicSchema, findPathLayerUUID, propagateDataValue,
   *          propagateDataDefaults, repropagateDataValues
 */
// graph/engine/helpers.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js,
//             graph/schemaCache/state.js, graph/schemaCache/persistence.js,
//             graph/schemaCache/diff.js, graph/schemaCache/index.js,
//             bridge/evalBridge.js, flush/dirtyFlusher.js
// MUST LOAD BEFORE: engine/propagate.js, engine/wires.js, engine/nodes/index.js, engine/state.js, engine/index.js

window.__procedia_internal.hlp = (function() {
  var registry = window.__procedia_internal.registry;
  var _pathLayerCache = {};

  /**
   * Builds an initial properties object from a node definition's params array.
   * If params is 'dynamic', returns an empty object.
   *
   * @param {Array|string} params - Node definition params array or 'dynamic'
   * @returns {Object} Initial properties keyed by param key
   */
  function _buildInitialProps(params) {
    if (params === 'dynamic') return {};
    var result = {};
    for (var i = 0; i < params.length; i++) {
      result[params[i].key] = params[i]['default'];
    }
    return result;
  }

  /**
   * Refreshes all UI components: minimap, renderer, wire renderer, inspector,
   * and status bar.
   */
  function _refreshNodeUI() {
    if (window.__procedia_internal._uiScheduler) {
      window.__procedia_internal._uiScheduler.scheduleUIUpdate();
    }
  }

  /**
   * Fetches a dynamic schema by match name and applies it to the given node.
   *
   * @param {string} nodeId - Node ID to apply the schema to
   * @param {string} matchName - Schema match name to fetch
   */
  function _resolveDynamicSchema(nodeId, matchName) {
    if (typeof schemaCache === 'undefined' || !schemaCache.fetchSchema) {
      console.warn('[engine] schemaCache not available for', matchName);
      return;
    }
    schemaCache.fetchSchema(matchName).then(function(schema) {
      _applyDynamicSchema(nodeId, schema);
      _refreshNodeUI();
    }).catch(function(err) {
      console.error('[engine] dynamic schema failed for ' + matchName + ': ' + err);
      graphState.updateNode(nodeId, { dynamicSchema: { matchName: matchName, properties: [] } });
      _refreshNodeUI();
    });
  }

  /**
   * Applies a dynamic schema to a node by creating secondary input ports and
   * setting initial property values.
   *
   * @param {string} nodeId - Node ID to update
   * @param {Object} schema - Schema object with properties array
   */
  function _applyDynamicSchema(nodeId, schema) {
    if (!schema || !schema.properties) return;
    var secondaryPorts = [];
    var initialProps = {};
    for (var i = 0; i < schema.properties.length; i++) {
      var prop = schema.properties[i];
      secondaryPorts.push({
        id:       prop.matchName,
        category: 'secondaryInput',
        type:     'data',
        capacity: 'single',
        label:    prop.label
      });
      initialProps[prop.matchName] = prop.defaultValue;
    }
    graphState.updateNode(nodeId, {
      secondaryPorts: secondaryPorts,
      dynamicSchema:  schema,
      props:          initialProps
    });

    var _allNodes = graphState.getAllNodes();
    var _cloneIds = [];
    for (var _id in _allNodes) {
      if (_allNodes[_id]._cloneMasterId === nodeId) {
        _cloneIds.push(_id);
      }
    }
    for (var _ci = 0; _ci < _cloneIds.length; _ci++) {
      var _clone = graphState.getNode(_cloneIds[_ci]);
      if (!_clone) continue;
      _clone.secondaryPorts = window.__procedia_internal.deepClone(secondaryPorts);
      _clone.dynamicSchema  = schema;
      _clone.props          = window.__procedia_internal.deepClone(initialProps);
    }
    if (_cloneIds.length > 0) {
      graphState.rebuildTempGraph();
    }
  }

  /**
   * Finds the terminal layer UUID by walking downstream from a node.
   *
   * @param {string} nodeId - Starting node ID
   * @returns {string|null} The terminal wire UUID, or null
   */
  function _findPathLayerUUID(nodeId) {
    if (_pathLayerCache.hasOwnProperty(nodeId)) return _pathLayerCache[nodeId];
    var result = _findPathLayerUUIDWithVisited(nodeId, {});
    _pathLayerCache[nodeId] = result;
    return result;
  }

  function _invalidatePathLayerCache() {
    _pathLayerCache = {};
  }

  /**
   * Internal recursive traversal to find the terminal layer UUID.
   *
   * @param {string} nodeId - Current node ID
   * @param {Object} visited - Visited set to prevent cycles
   * @returns {string|null} The terminal wire UUID, or null
   */
  function _findPathLayerUUIDWithVisited(nodeId, visited) {
    if (visited[nodeId]) return null;
    visited[nodeId] = true;
    var wireMap = graphState.getAllWires();
    for (var wireId in wireMap) {
      if (!wireMap.hasOwnProperty(wireId)) continue;
      var wire = wireMap[wireId];
      if (wire.fromNode === nodeId && wire.type === 'layer') {
        var toNodeData = graphState.getNode(wire.toNode);
        if (toNodeData && toNodeData.type === 'core/comp') return wire.id;
        var found = _findPathLayerUUIDWithVisited(wire.toNode, visited);
        if (found !== null) return found;
      }
    }
    return null;
  }

  /**
   * Dispatches a setExpression AE command for an Expression node wired to a target.
   * Handles both effector (effect property) and affected (layer property) targets.
   *
   * @param {string} targetNodeId - The target node ID
   * @param {string} propMatchName - The property match name (wire.toPort)
   * @param {string} expression - The expression string
   */
  function _dispatchExpressionToTarget(targetNodeId, propMatchName, expression) {
    var targetNode = graphState.getNode(targetNodeId);
    if (!targetNode) return;
    var targetDef = nodeRegistry.getDefinition(targetNode.type);
    if (!targetDef) return;
    if (!targetNode.hostingComps || targetNode.hostingComps.length === 0) return;
    var hostingCompUUID = targetNode.hostingComps[0];
    var upstreamNodeUUID = _findPathLayerUUID(targetNodeId);
    if (!upstreamNodeUUID) return;

    if (targetDef.nodeKind === 'effector' && targetDef.matchName) {
      evalBridge.dispatch({
        action: 'setExpression',
        params: {
          nodeUUID:        targetNodeId,
          hostingCompUUID: hostingCompUUID,
          layerNodeUUID:   upstreamNodeUUID,
          effectMatchName: targetDef.matchName,
          propMatchName:   propMatchName,
          expression:      expression
        }
      });
    } else {
      evalBridge.dispatch({
        action: 'setExpression',
        params: {
          nodeUUID:        targetNodeId,
          hostingCompUUID: hostingCompUUID,
          layerNodeUUID:   upstreamNodeUUID,
          effectMatchName: null,
          propMatchName:   propMatchName,
          expression:      expression
        }
      });
    }
  }

  /**
   * Propagates a data property value from a node to all connected data wire
   * targets and schedules a dirty flush.
   *
   * @param {string} fromNodeId - Source node ID
   * @param {string} key - Property key to propagate
   * @param {*} value - Property value
   */
  function _propagateDataValue(fromNodeId, key, value) {
    var fromNodeData = graphState.getNode(fromNodeId);
    if (!fromNodeData) return;

    // Expression nodes: skip in-memory prop update (expression is an AE-level
    // concern, not a property value) and dispatch setExpression to AE instead.
    if (fromNodeData.type === 'data/expression' && key === 'expression') {
      if (typeof value !== 'string' || value.trim() === '') return;
      if (typeof evalBridge === 'undefined') return;
      var wires = graphState.getAllWires();
      for (var wid in wires) {
        if (!wires.hasOwnProperty(wid)) continue;
        var w = wires[wid];
        if (w.fromNode === fromNodeId && w.type === 'data') {
          _dispatchExpressionToTarget(w.toNode, w.toPort, value);
        }
      }
      return;
    }

    var wires = graphState.getAllWires();
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.fromNode === fromNodeId && w.type === 'data') {
        graphState.updateProp(w.toNode, w.toPort, value);
        if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.schedule) dirtyFlusher.schedule();
      }
    }
  }

  /**
   * Propagates default values from target node definitions to all nodes
   * connected via data wires from the given source node.
   * Used when a data node is disabled — receivers fall back to their own defaults.
   *
   * @param {string} fromNodeId - The disabled data node ID
   */
  function _propagateDataDefaults(fromNodeId) {
    var wires = graphState.getAllWires();
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.fromNode === fromNodeId && w.type === 'data') {
        var targetNode = graphState.getNode(w.toNode);
        if (!targetNode) continue;
        var targetDef = nodeRegistry.getDefinition(targetNode.type);
        if (!targetDef) continue;

        if (targetDef.params === 'dynamic') {
          if (targetNode.dynamicSchema && targetNode.dynamicSchema.properties) {
            var props = targetNode.dynamicSchema.properties;
            for (var pi = 0; pi < props.length; pi++) {
              if (props[pi].matchName === w.toPort) {
                graphState.updateProp(w.toNode, w.toPort, props[pi].defaultValue);
                break;
              }
            }
          }
        } else {
          var params = targetDef.params || [];
          for (var j = 0; j < params.length; j++) {
            if (params[j].key === w.toPort) {
              graphState.updateProp(w.toNode, w.toPort, params[j]['default']);
              break;
            }
          }
        }
      }
    }
  }

  /**
   * Re-propagates all property values from a data node to its connected
   * data wire targets. Used when a data node is re-enabled.
   *
   * @param {string} fromNodeId - The re-enabled data node ID
   */
  function _repropagateDataValues(fromNodeId) {
    var nodeData = graphState.getNode(fromNodeId);
    if (!nodeData) return;
    for (var key in nodeData.props) {
      if (nodeData.props.hasOwnProperty(key)) {
        _propagateDataValue(fromNodeId, key, nodeData.props[key]);
      }
    }
  }

  /**
   * Deep copies a node's data into a new object, skipping internal fields.
   * Arrays are shallow-cloned with .slice(); objects are deep-cloned via JSON
   * round-trip (safe because node data is guaranteed JSON-serializable).
   *
   * @param {Object} src - Source node data
   * @returns {Object} Deep copy without id, dirty, _transplantLayerUUID
   */
  function _deepCopyNode(src) {
    var copy = {};
    for (var key in src) {
      if (key === 'id' || key === 'dirty' || key === '_transplantLayerUUID') continue;
      copy[key] = window.__procedia_internal.deepClone(src[key]);
    }
    return copy;
  }

  return {
    buildInitialProps:   _buildInitialProps,
    refreshNodeUI:       _refreshNodeUI,
    deepCopyNode:        _deepCopyNode,
    resolveDynamicSchema:_resolveDynamicSchema,
    applyDynamicSchema:  _applyDynamicSchema,
    findPathLayerUUID:   _findPathLayerUUID,
    invalidatePathLayerCache: _invalidatePathLayerCache,
    propagateDataValue:  _propagateDataValue,
    propagateDataDefaults:  _propagateDataDefaults,
    repropagateDataValues:  _repropagateDataValues
  };

})();
window.__procedia_internal.registry.register('hlp', window.__procedia_internal.hlp);

// Invalidate pathLayer cache whenever the graph is rebuilt (wires/nodes change)
var _origRebuild = graphState.rebuildTempGraph;
graphState.rebuildTempGraph = function() {
  window.__procedia_internal.hlp.invalidatePathLayerCache();
  _origRebuild();
};
