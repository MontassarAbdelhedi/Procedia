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
 *          applyDynamicSchema, findPathLayerUUID, propagateDataValue
 */
// graph/engine/helpers.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js,
//             graph/schemaCache/state.js, graph/schemaCache/persistence.js,
//             graph/schemaCache/diff.js, graph/schemaCache/index.js,
//             bridge/evalBridge.js, flush/dirtyFlusher.js
// MUST LOAD BEFORE: engine/propagate.js, engine/wires.js, engine/nodes/index.js, engine/state.js, engine/index.js

var __e_hlp = (function() {

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
    minimap.render();
    renderer.render();
    if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
    if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
    if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
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
  }

  /**
   * Finds the terminal layer UUID by walking downstream from a node.
   *
   * @param {string} nodeId - Starting node ID
   * @returns {string|null} The terminal wire UUID, or null
   */
  function _findPathLayerUUID(nodeId) {
    return _findPathLayerUUIDWithVisited(nodeId, {});
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
        if (wire._pathLayerUUID !== null) return wire._pathLayerUUID;
        var found = _findPathLayerUUIDWithVisited(wire.toNode, visited);
        if (found !== null) return found;
      }
    }
    return null;
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

  return {
    buildInitialProps:   _buildInitialProps,
    refreshNodeUI:       _refreshNodeUI,
    resolveDynamicSchema:_resolveDynamicSchema,
    applyDynamicSchema:  _applyDynamicSchema,
    findPathLayerUUID:   _findPathLayerUUID,
    propagateDataValue:  _propagateDataValue
  };

})();
