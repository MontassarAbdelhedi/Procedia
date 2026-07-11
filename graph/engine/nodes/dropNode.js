/**
 * graph/engine/nodes/dropNode.js
 *
 * Drops a new node onto the graph. Handles data, blending, matte, affected,
 * and effector node creation, dynamic schema resolution, and onDrop dispatch.
 *
 * Dependencies: graphState, nodeRegistry, evalBridge, uuidGenerator,
 *               engine/helpers.js
 * Load before: nodes/deleteNode.js, nodes/index.js
 *
 * Exports: dropNode
 */
// graph/engine/nodes/dropNode.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js,
//             bridge/evalBridge.js, data/uuidGenerator.js,
//             graph/engine/helpers.js
// MUST LOAD BEFORE: nodes/deleteNode.js, nodes/index.js

window.__procedia_internal.ndrop = (function() {
  var registry = window.__procedia_internal.registry;
  var hlp = registry.get('hlp');

  /**
   * Drops a new node onto the graph at the given coordinates. Creates the node
   * data, dispatches onDrop command if applicable, and resolves dynamic schemas.
   *
   * @param {Object} nodeDef - Node definition from the registry
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object|null} The created node data, or null on failure
   */
  function dropNode(nodeDef, x, y) {
    if (!nodeDef) {
      console.error('[engine] dropNode: nodeDef is null or undefined');
      return null;
    }

    if (typeof undoManager !== 'undefined') undoManager.capture();

    var id = uuidGenerator.node();
    var _activeComp;

    var nodeData = {
      id:             id,
      type:           nodeDef.type,
      nodeKind:       nodeDef.nodeKind,
      dedicated:      nodeDef.dedicated,
      state:          'ghost',
      dirty:          false,
      x:              x,
      y:              y,
      props:          hlp.buildInitialProps(nodeDef.params),
      hostingComps:   [],
      hasParkedLayer: false,
      dynamicSchema:  null,
      secondaryPorts: null,
      locked:         false,
      disabled:       false
    };

    graphState.addNode(nodeData);
    hlp.refreshNodeUI();

    if (nodeDef.nodeKind === 'data' ||
        nodeDef.nodeKind === 'blending' ||
        nodeDef.nodeKind === 'matte' ||
        nodeDef.nodeKind === 'merge' ||
        nodeDef.nodeKind === 'multimerge') {
      graphState.updateNode(id, { state: 'alive' });
      if (nodeDef.params === 'dynamic' && nodeDef.matchName) {
        hlp.resolveDynamicSchema(id, nodeDef.matchName);
      }
      _activeComp = graphState.getActiveComp();
      if (_activeComp) {
        if (typeof graphState.addToFilteredNodes === 'function') graphState.addToFilteredNodes(id);
        if (nodeDef.nodeKind !== 'data' && registry.has('wires') && registry.get('wires').connectWire) {
          registry.get('wires').connectWire(id, 'output', _activeComp, 'main_input');
        }
      }
      if (typeof undoManager !== 'undefined') undoManager.commit('Drop ' + (nodeDef.label || nodeDef.type));
      return nodeData;
    }

    if (nodeDef.params === 'dynamic' && nodeDef.matchName) {
      hlp.resolveDynamicSchema(id, nodeDef.matchName);
    }

    var command = nodeDef.onDrop(nodeData);
    if (command === null) {
      _activeComp = graphState.getActiveComp();
      if (_activeComp) {
        if (nodeDef.nodeKind !== 'effector' && registry.has('wires') && registry.get('wires').connectWire) {
          if (registry.get('wires').connectWire(id, 'output', _activeComp, 'main_input')) {
            if (typeof graphState.addToFilteredNodes === 'function') graphState.addToFilteredNodes(id);
          }
        } else {
          if (typeof graphState.addToFilteredNodes === 'function') graphState.addToFilteredNodes(id);
        }
      }
      if (typeof undoManager !== 'undefined') undoManager.commit('Drop ' + (nodeDef.label || nodeDef.type));
      return nodeData;
    }

    (function(nId, nDef, cmd) {
      evalBridge.dispatch(cmd).then(function(res) {
        if (res.ok) {
          graphState.updateNode(nId, { state: 'alive' });
          var _activeComp = graphState.getActiveComp();
          if (_activeComp) {
            if (nDef.nodeKind !== 'effector' && registry.has('wires') && registry.get('wires').connectWire) {
              if (registry.get('wires').connectWire(nId, 'output', _activeComp, 'main_input')) {
                if (typeof graphState.addToFilteredNodes === 'function') graphState.addToFilteredNodes(nId);
              }
            } else {
              if (typeof graphState.addToFilteredNodes === 'function') graphState.addToFilteredNodes(nId);
            }
          }
          if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
          window.__procedia_internal.refreshUI({ renderer: false, minimap: false, inspector: false, statusBar: false });
        } else {
          console.error('[engine] onDrop dispatch failed: ' + res.error);
          graphState.updateNode(nId, { state: 'error' });
        }
        hlp.refreshNodeUI();
      });
    }(id, nodeDef, command));

    if (typeof envSnapshot !== 'undefined' && envSnapshot.addAction) {
      envSnapshot.addAction('dropNode', { type: nodeDef.type, label: nodeData.props.label });
    }

    if (typeof undoManager !== 'undefined') undoManager.commit('Drop ' + (nodeDef.label || nodeDef.type));
    return nodeData;
  }

  return {
    dropNode: dropNode
  };

})();
window.__procedia_internal.registry.register('ndrop', window.__procedia_internal.ndrop);
