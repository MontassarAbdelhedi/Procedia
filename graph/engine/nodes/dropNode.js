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

var __e_ndrop = (function() {
  var hlp = __e_hlp;

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

    var id = uuidGenerator.node();

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
      secondaryPorts: null
    };

    graphState.addNode(nodeData);
    hlp.refreshNodeUI();

    if (nodeDef.nodeKind === 'data' ||
        nodeDef.nodeKind === 'blending' ||
        nodeDef.nodeKind === 'matte') {
      graphState.updateNode(id, { state: 'alive' });
      if (nodeDef.params === 'dynamic' && nodeDef.matchName) {
        hlp.resolveDynamicSchema(id, nodeDef.matchName);
      }
      return nodeData;
    }

    if (nodeDef.params === 'dynamic' && nodeDef.matchName) {
      hlp.resolveDynamicSchema(id, nodeDef.matchName);
    }

    var command = nodeDef.onDrop(nodeData);
    if (command === null) {
      return nodeData;
    }

    (function(nId, cmd) {
      evalBridge.dispatch(cmd).then(function(res) {
        if (res.ok) {
          graphState.updateNode(nId, { state: 'alive' });
        } else {
          console.error('[engine] onDrop dispatch failed: ' + res.error);
          graphState.updateNode(nId, { state: 'error' });
        }
        hlp.refreshNodeUI();
      });
    }(id, command));

    return nodeData;
  }

  return {
    dropNode: dropNode
  };

})();
