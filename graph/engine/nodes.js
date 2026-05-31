/**
 * graph/engine/nodes.js
 *
 * Node lifecycle operations for the graph engine: dropping, deleting, duplicating,
 * recreating, and locking nodes. Handles node kind-specific logic for data,
 * blending, matte, affected, and effector nodes.
 *
 * Dependencies: graphState, nodeRegistry, cascade/index.js, evalBridge,
 *               uuidGenerator, dirtyFlusher, engine/helpers.js, engine/propagate.js
 * Load before: engine/state.js, engine/index.js
 *
 * Exports: dropNode, deleteNode, deleteSelectedNodes, duplicateSelectedNodes,
 *          toggleLockSelectedNodes, recreateNode
 */
// graph/engine/nodes.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/cascade/index.js,
//             bridge/evalBridge.js, data/uuidGenerator.js, flush/dirtyFlusher.js,
//             graph/engine/helpers.js, graph/engine/propagate.js
// MUST LOAD BEFORE: engine/state.js, engine/index.js

var __e_nodes = (function() {
  var hlp  = __e_hlp;
  var prop = __e_prop;

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

  /**
   * Deletes a node from the graph. Handles node kind-specific cleanup:
   * dispatching onGhost/onDelete commands, cascade ghosting for comp nodes,
   * and removing all associated wires.
   *
   * @param {string} nodeId - ID of the node to delete
   */
  function deleteNode(nodeId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) {
      console.warn('[engine] deleteNode: node not found: ' + nodeId);
      return;
    }

    var def = nodeRegistry.getDefinition(nodeData.type);
    var delWireMap = graphState.getAllWires();

    if (nodeData.nodeKind === 'data') {
      var dataCmd = def ? def.onDelete(nodeData) : null;
      if (dataCmd) evalBridge.dispatch(dataCmd);

    } else if (nodeData.nodeKind === 'blending' || nodeData.nodeKind === 'matte') {
      var batchCmds = [];
      for (var bi = 0; bi < nodeData.hostingComps.length; bi++) {
        var bmHostUUID = nodeData.hostingComps[bi];
        var bmGhostCmd = null;
        if (nodeData.nodeKind === 'blending') {
          var blendUpstreamUUID = null;
          for (var bwId in delWireMap) {
            if (!delWireMap.hasOwnProperty(bwId)) continue;
            var bw = delWireMap[bwId];
            if (bw.toNode === nodeId && bw.toPort === 'main_input') {
              blendUpstreamUUID = hlp.findPathLayerUUID(bw.fromNode);
              break;
            }
          }
          bmGhostCmd = def ? def.onGhost(nodeData, bmHostUUID, blendUpstreamUUID) : null;
        } else {
          var matteTopUUID = null;
          for (var mwId in delWireMap) {
            if (!delWireMap.hasOwnProperty(mwId)) continue;
            var mw = delWireMap[mwId];
            if (mw.toNode === nodeId && mw.toPort === 'top_layer') {
              matteTopUUID = hlp.findPathLayerUUID(mw.fromNode);
              break;
            }
          }
          bmGhostCmd = def ? def.onGhost(nodeData, bmHostUUID, matteTopUUID) : null;
        }
        if (bmGhostCmd) batchCmds.push(bmGhostCmd);
      }
      if (batchCmds.length > 0) evalBridge.dispatchBatch(batchCmds);
      var bmDeleteCmd = def ? def.onDelete(nodeData) : null;
      if (bmDeleteCmd) evalBridge.dispatch(bmDeleteCmd);

    } else {
      if (nodeData.state === 'alive') {
        var affBatch = [];
        for (var ai = 0; ai < nodeData.hostingComps.length; ai++) {
          var affHostUUID = nodeData.hostingComps[ai];
          var affGhostCmd = null;
          if (nodeData.nodeKind === 'affected') {
            affGhostCmd = def ? def.onGhost(nodeData, affHostUUID) : null;
          } else {
            var effPathUUID = null;
            for (var ewId in delWireMap) {
              if (!delWireMap.hasOwnProperty(ewId)) continue;
              var ew = delWireMap[ewId];
              if (ew.toNode === nodeId && ew.toPort === 'main_input') {
                effPathUUID = hlp.findPathLayerUUID(ew.fromNode);
                break;
              }
            }
            affGhostCmd = def ? def.onGhost(nodeData, affHostUUID, effPathUUID) : null;
          }
          if (affGhostCmd) affBatch.push(affGhostCmd);
        }
        if (affBatch.length > 0) evalBridge.dispatchBatch(affBatch);
      }

      if (cascadeAlgorithm && cascadeAlgorithm.isCompNode && cascadeAlgorithm.isCompNode(nodeId)) {
        var cascadeWireIds = [];
        for (var cwId in delWireMap) {
          if (!delWireMap.hasOwnProperty(cwId)) continue;
          var cw = delWireMap[cwId];
          if (cw.toNode === nodeId && cw.type === 'layer' && cw._pathLayerUUID !== null) {
            cascadeWireIds.push(cwId);
          }
        }
        for (var ci = 0; ci < cascadeWireIds.length; ci++) {
          cascadeAlgorithm.cascadeGhost(cascadeWireIds[ci]);
        }
      }

      var affDeleteCmd = def ? def.onDelete(nodeData) : null;
      if (affDeleteCmd) evalBridge.dispatch(affDeleteCmd);
    }

    graphState.removeNode(nodeId);
    hlp.refreshNodeUI();

    graphState.removeFromSelection(nodeId);
  }

  /**
   * Deletes all currently selected nodes from the graph.
   */
  function deleteSelectedNodes() {
    var sel = graphState.getSelection().slice();
    if (sel.length === 0) return;
    for (var i = 0; i < sel.length; i++) {
      deleteNode(sel[i]);
    }
  }

  /**
   * Duplicates all selected nodes, offsetting copies by 30px in each axis.
   * New nodes replace the current selection.
   */
  function duplicateSelectedNodes() {
    var sel = graphState.getSelection().slice();
    if (sel.length === 0) return;
    var newIds = [];
    for (var i = 0; i < sel.length; i++) {
      var src = graphState.getNode(sel[i]);
      if (!src) continue;
      var copy = {};
      for (var key in src) {
        if (key === 'id' || key === 'dirty' || key === '_transplantLayerUUID') continue;
        if (Array.isArray(src[key])) {
          copy[key] = src[key].slice();
        } else if (typeof src[key] === 'object' && src[key] !== null) {
          copy[key] = JSON.parse(JSON.stringify(src[key]));
        } else {
          copy[key] = src[key];
        }
      }
      copy.id = uuidGenerator.node();
      copy.x = src.x + 30;
      copy.y = src.y + 30;
      copy.dirty = false;
      graphState.addNode(copy);
      newIds.push(copy.id);
    }
    graphState.replaceSelection(newIds);
    hlp.refreshNodeUI();
  }

  /**
   * Toggles the locked state of all selected nodes. If all are locked, unlocks
   * them; otherwise locks all.
   */
  function toggleLockSelectedNodes() {
    var sel = graphState.getSelection().slice();
    if (sel.length === 0) return;
    var allLocked = true;
    for (var i = 0; i < sel.length; i++) {
      var n = graphState.getNode(sel[i]);
      if (!n || !n.locked) { allLocked = false; break; }
    }
    var newLocked = !allLocked;
    for (var j = 0; j < sel.length; j++) {
      graphState.updateNode(sel[j], { locked: newLocked });
    }
    hlp.refreshNodeUI();
  }

  /**
   * Recreates a node that is in 'error' state by dispatching onAlive commands
   * for each of its hosting compositions. Handles node kind-specific logic.
   *
   * @param {string} nodeId - ID of the node to recreate
   */
  function recreateNode(nodeId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) { console.warn('[engine] recreateNode: node not found: ' + nodeId); return; }
    if (nodeData.state !== 'error') return;

    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return;

    var wireMap = graphState.getAllWires();

    for (var c = 0; c < nodeData.hostingComps.length; c++) {
      var hostUUID = nodeData.hostingComps[c];

      if (nodeData.nodeKind === 'affected') {
        var pathLayerUUID = hlp.findPathLayerUUID(nodeId);
        var cmd = def.onAlive(nodeData, hostUUID);
        if (cmd) {
          cmd.params.layerUUID = pathLayerUUID;
          (function(nId, cCmd) {
            evalBridge.dispatch(cCmd).then(function(res) {
              if (res.ok) {
                graphState.updateNode(nId, { state: 'alive' });
                hlp.refreshNodeUI();
              } else {
                console.error('[engine] recreateNode onAlive failed: ' + nId + ': ' + res.error);
              }
            });
          })(nodeId, cmd);
        }

      } else if (nodeData.nodeKind === 'effector') {
        var upstreamUUID = null;
        for (var wId in wireMap) {
          if (!wireMap.hasOwnProperty(wId)) continue;
          var w = wireMap[wId];
          if (w.toNode === nodeId && w.toPort === 'main_input') {
            upstreamUUID = hlp.findPathLayerUUID(w.fromNode);
            break;
          }
        }
        var cmd = def.onAlive(nodeData, hostUUID, upstreamUUID);
        if (cmd) {
          (function(nId, cCmd) {
            evalBridge.dispatch(cCmd).then(function(res) {
              if (res.ok) {
                graphState.updateNode(nId, { state: 'alive' });
                hlp.refreshNodeUI();
              }
            });
          })(nodeId, cmd);
        }

      } else if (nodeData.nodeKind === 'blending') {
        var blendUpstreamUUID = null;
        for (var bwId in wireMap) {
          if (!wireMap.hasOwnProperty(bwId)) continue;
          var bw = wireMap[bwId];
          if (bw.toNode === nodeId && bw.toPort === 'main_input') {
            blendUpstreamUUID = hlp.findPathLayerUUID(bw.fromNode);
            break;
          }
        }
        var cmd = def.onAlive(nodeData, hostUUID, blendUpstreamUUID);
        if (cmd) {
          (function(nId2, cCmd2) {
            evalBridge.dispatch(cCmd2).then(function(res) {
              if (res.ok) {
                graphState.updateNode(nId2, { state: 'alive' });
              }
            });
          })(nodeId, cmd);
        }

      } else if (nodeData.nodeKind === 'matte') {
        var matteTopUUID = null;
        var matteLayerUUID = null;
        for (var mwId in wireMap) {
          if (!wireMap.hasOwnProperty(mwId)) continue;
          var mw = wireMap[mwId];
          if (mw.toNode === nodeId) {
            if (mw.toPort === 'top_layer')   matteTopUUID   = hlp.findPathLayerUUID(mw.fromNode);
            if (mw.toPort === 'matte_layer') matteLayerUUID = hlp.findPathLayerUUID(mw.fromNode);
          }
        }
        var cmd = def.onAlive(nodeData, hostUUID, matteTopUUID, matteLayerUUID);
        if (cmd) {
          (function(nId2, cCmd2) {
            evalBridge.dispatch(cCmd2).then(function(res) {
              if (res.ok) {
                graphState.updateNode(nId2, { state: 'alive' });
              }
            });
          })(nodeId, cmd);
        }
      }
    }
  }

  return {
    dropNode:              dropNode,
    deleteNode:            deleteNode,
    deleteSelectedNodes:   deleteSelectedNodes,
    duplicateSelectedNodes: duplicateSelectedNodes,
    toggleLockSelectedNodes: toggleLockSelectedNodes,
    recreateNode:          recreateNode
  };

})();
