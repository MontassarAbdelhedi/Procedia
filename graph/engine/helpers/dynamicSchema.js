/**
 * graph/engine/helpers/dynamicSchema.js
 *
 * Fetches a dynamic effect property schema from the schema cache and applies
 * it to a node, creating secondary input ports and setting initial property
 * values. Syncs schema state to clones of the target node.
 *
 * Dependencies: graphState, schemaCache, nodeRegistry, helpers/refreshUI.js
 * Load before: graph/engine/helpers/index.js
 *
 * Exports: resolveDynamicSchema, applyDynamicSchema
 */
// graph/engine/helpers/dynamicSchema.js
// DEPENDS ON: graph/graphState, graph/schemaCache/index.js, graph/nodeRegistry.js,
//             graph/engine/helpers/refreshUI.js
// MUST LOAD BEFORE: graph/engine/helpers/index.js

window.__procedia_internal.hlp = window.__procedia_internal.hlp || {};

(function() {
  var hlp = window.__procedia_internal.hlp;

  /**
   * Fetches a dynamic schema by match name and applies it to the given node.
   *
   * @param {string} nodeId - Node ID to apply the schema to
   * @param {string} matchName - Schema match name to fetch
   */
  hlp.resolveDynamicSchema = function(nodeId, matchName) {
    if (typeof schemaCache === 'undefined' || !schemaCache.fetchSchema) {
      console.warn('[engine] schemaCache not available for', matchName);
      return;
    }
    schemaCache.fetchSchema(matchName).then(function(schema) {
      hlp.applyDynamicSchema(nodeId, schema);
      hlp.refreshNodeUI();
    }).catch(function(err) {
      console.error('[engine] dynamic schema failed for ' + matchName + ': ' + err);
      graphState.updateNode(nodeId, {
        dynamicSchema: { _error: true, matchName: matchName, message: String(err) },
        props: { _schemaError: String(err) }
      });
      hlp.refreshNodeUI();
    });
  };

  /**
   * Applies a dynamic schema to a node by creating secondary input ports and
   * setting initial property values.
   *
   * @param {string} nodeId - Node ID to update
   * @param {Object} schema - Schema object with properties array
   */
  hlp.applyDynamicSchema = function(nodeId, schema) {
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
  };
})();
