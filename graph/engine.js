// graph/engine.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/schemaCache.js,
//             graph/cascadeAlgorithm.js, graph/wireValidator.js,
//             bridge/evalBridge.js, data/uuidGenerator.js, flush/dirtyFlusher.js
// MUST LOAD BEFORE: index.js

var engine = (function() {

  // ── Internal helpers ─────────────────────────────────────────

  function _buildInitialProps(params) {
    if (params === 'dynamic') return {};
    var result = {};
    for (var i = 0; i < params.length; i++) {
      result[params[i].key] = params[i]['default'];
    }
    return result;
  }

  function _refreshNodeUI() {
    minimap.render();
    renderer.render();
    if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
    if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
    if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
  }

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

  function _findPathLayerUUID(nodeId) {
    return _findPathLayerUUIDWithVisited(nodeId, {});
  }

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

  function _propagateAlive(nodeId, hostingCompUUID, pathLayerUUID) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;

    // Infinite loop guard
    for (var h = 0; h < nodeData.hostingComps.length; h++) {
      if (nodeData.hostingComps[h] === hostingCompUUID) return;
    }

    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return;

    // Wire-insertion transplant — the AE layer already exists,
    // just restamp its comment to the new node UUID
    if (nodeData._transplantLayerUUID) {
      var restampCmd = {
        action: 'restampLayer',
        params: {
          hostingCompUUID: hostingCompUUID,
          oldUUID:         nodeData._transplantLayerUUID,
          newUUID:         nodeData.id
        }
      };
      evalBridge.dispatch(restampCmd);

      var transplantHostingComps = nodeData.hostingComps.slice();
      transplantHostingComps.push(hostingCompUUID);
      graphState.updateNode(nodeId, {
        state:                'alive',
        hostingComps:         transplantHostingComps,
        _transplantLayerUUID: null
      });

      // Still traverse upstream
      var transplantWires = graphState.getAllWires();
      for (var twId in transplantWires) {
        if (!transplantWires.hasOwnProperty(twId)) continue;
        var tw = transplantWires[twId];
        if (tw.toNode !== nodeId || tw.type !== 'layer') continue;
        var tUpstreamData = graphState.getNode(tw.fromNode);
        if (!tUpstreamData) continue;
        if (tUpstreamData.nodeKind === 'data') continue;
        if (tUpstreamData.nodeKind === 'matte') continue;
        var alreadyAlive = false;
        for (var ti = 0; ti < tUpstreamData.hostingComps.length; ti++) {
          if (tUpstreamData.hostingComps[ti] === hostingCompUUID) { alreadyAlive = true; break; }
        }
        if (alreadyAlive) continue;
        _propagateAlive(tw.fromNode, hostingCompUUID, nodeData.id);
      }

      // If dirtyFlusher should run after transplant
      if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.flush) dirtyFlusher.flush();
      return;
    }

    var command = null;

    if (nodeData.nodeKind === 'affected') {
      command = def.onAlive(nodeData, hostingCompUUID);
      if (command !== null) {
        command.params.layerUUID = pathLayerUUID;
      }
    } else if (nodeData.nodeKind === 'effector') {
      command = def.onAlive(nodeData, hostingCompUUID, pathLayerUUID);
    } else if (nodeData.nodeKind === 'blending') {
      command = def.onAlive(nodeData, hostingCompUUID, pathLayerUUID);
    } else {
      // data, matte, comp — never propagated to
      return;
    }

    // Update state before recursing so the guard catches re-entry
    var updatedHostingComps = nodeData.hostingComps.slice();
    updatedHostingComps.push(hostingCompUUID);
    graphState.updateNode(nodeId, { state: 'alive', hostingComps: updatedHostingComps });

    // Traverse upstream layer wires FIRST — affected nodes must create AE layers
    // before downstream effectors try to apply effects to them.
    var wireMap = graphState.getAllWires();
    for (var wireId in wireMap) {
      if (!wireMap.hasOwnProperty(wireId)) continue;
      var wire = wireMap[wireId];
      if (wire.toNode !== nodeId || wire.type !== 'layer') continue;
      var upstreamData = graphState.getNode(wire.fromNode);
      if (!upstreamData) continue;
      if (upstreamData.nodeKind === 'data') continue;
      if (upstreamData.nodeKind === 'matte') continue;
      var alreadyAlive = false;
      for (var i = 0; i < upstreamData.hostingComps.length; i++) {
        if (upstreamData.hostingComps[i] === hostingCompUUID) { alreadyAlive = true; break; }
      }
      if (alreadyAlive) continue;
      _propagateAlive(wire.fromNode, hostingCompUUID, pathLayerUUID);
    }

    if (command !== null) {
      (function(nId, cmd) {
        evalBridge.dispatch(cmd).then(function(res) {
          if (!res.ok) {
            console.error('[engine] onAlive failed for ' + nId + ': ' + res.error);
            graphState.updateNode(nId, { state: 'error' });
          }
        });
      }(nodeId, command));
    }
  }

  function _checkMatteActivation(matteNodeId) {
    var matteNodeData = graphState.getNode(matteNodeId);
    if (!matteNodeData) return;

    // Condition 1: both input wires present
    var wireMap = graphState.getAllWires();
    var topWire = null;
    var matteWire = null;
    for (var wireId in wireMap) {
      if (!wireMap.hasOwnProperty(wireId)) continue;
      var wire = wireMap[wireId];
      if (wire.toNode !== matteNodeId) continue;
      if (wire.toPort === 'top_layer')   topWire   = wire;
      if (wire.toPort === 'matte_layer') matteWire = wire;
    }
    if (!topWire || !matteWire) return;

    var topUpstreamId   = topWire.fromNode;
    var matteUpstreamId = matteWire.fromNode;

    var topLayerUUID   = _findPathLayerUUID(topUpstreamId);
    var matteLayerUUID = _findPathLayerUUID(matteUpstreamId);

    // Condition 2: both upstream nodes share the same first-level hosting comp
    var topUpstreamData   = graphState.getNode(topUpstreamId);
    var matteUpstreamData = graphState.getNode(matteUpstreamId);
    if (!topUpstreamData || !matteUpstreamData) return;
    if (!topUpstreamData.hostingComps[0] || !matteUpstreamData.hostingComps[0]) return;
    if (topUpstreamData.hostingComps[0] !== matteUpstreamData.hostingComps[0]) return;

    var sharedCompUUID = topUpstreamData.hostingComps[0];

    // Condition 3: matte output wire connects to the same comp
    var outputWire = null;
    for (var wId in wireMap) {
      if (!wireMap.hasOwnProperty(wId)) continue;
      var w = wireMap[wId];
      if (w.fromNode === matteNodeId && w.type === 'layer') {
        outputWire = w;
        break;
      }
    }
    if (!outputWire || outputWire.toNode !== sharedCompUUID) return;

    // All three conditions met
    var def = nodeRegistry.getDefinition(matteNodeData.type);
    if (!def) return;
    var command = def.onAlive(matteNodeData, sharedCompUUID, topLayerUUID, matteLayerUUID);
    if (command) evalBridge.dispatch(command);
  }

  // ── Public API ───────────────────────────────────────────────

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
      props:          _buildInitialProps(nodeDef.params),
      hostingComps:   [],
      hasParkedLayer: false,
      dynamicSchema:  null,
      secondaryPorts: null
    };

    graphState.addNode(nodeData);
    _refreshNodeUI();

    // Immediately-alive nodeKinds — no onDrop, no ghost/alive cycle
    if (nodeDef.nodeKind === 'data' ||
        nodeDef.nodeKind === 'blending' ||
        nodeDef.nodeKind === 'matte') {
      graphState.updateNode(id, { state: 'alive' });
      if (nodeDef.params === 'dynamic' && nodeDef.matchName) {
        _resolveDynamicSchema(id, nodeDef.matchName);
      }
      return nodeData;
    }

    if (nodeDef.params === 'dynamic' && nodeDef.matchName) {
      _resolveDynamicSchema(id, nodeDef.matchName);
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
        _refreshNodeUI();
      });
    }(id, command));

    return nodeData;
  }

  function _firePathCreation(terminalWireId) {
    var wireMap = graphState.getAllWires();
    var wireData = wireMap[terminalWireId] || null;
    if (!wireData) {
      console.error('[engine] _firePathCreation: wire not found: ' + terminalWireId);
      return;
    }

    graphState.updateWire(terminalWireId, { _pathLayerUUID: terminalWireId });

    var compNodeData = graphState.getNode(wireData.toNode);
    var hostingCompUUID = (compNodeData && compNodeData.hostingComps && compNodeData.hostingComps[0]) || wireData.toNode;

    _propagateAlive(wireData.fromNode, hostingCompUUID, terminalWireId);

    if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.flush) {
      dirtyFlusher.flush();
    }
  }

  function connectWire(fromNodeId, fromPort, toNodeId, toPort, boundParam) {
    var fromNodeData = graphState.getNode(fromNodeId);
    var toNodeData   = graphState.getNode(toNodeId);
    if (!fromNodeData || !toNodeData) {
      console.error('[engine] connectWire: node not found');
      return false;
    }

    var fromDef = nodeRegistry.getDefinition(fromNodeData.type);
    if (!fromDef) {
      console.error('[engine] connectWire: node definition not found');
      return false;
    }

    var wireType = null;
    for (var i = 0; i < fromDef.ports.length; i++) {
      if (fromDef.ports[i].id === fromPort) {
        wireType = fromDef.ports[i].type;
        break;
      }
    }
    if (!wireType) {
      console.error('[engine] connectWire: fromPort not found on definition: ' + fromPort);
      return false;
    }

    var validation = wireValidator.canConnect(fromNodeId, fromPort, toNodeId, toPort, wireType);
    if (!validation.valid) {
      if (!(boundParam && validation.reason === 'Target port not found')) {
        console.warn('[engine] connectWire rejected:', validation.reason);
        return false;
      }
    }

    var wireData = {
      id:             uuidGenerator.wire(),
      type:           wireType,
      fromNode:       fromNodeId,
      fromPort:       fromPort,
      toNode:         toNodeId,
      toPort:         toPort,
      boundParam:     boundParam || null,
      _pathLayerUUID: null
    };

    graphState.addWire(wireData);
    _refreshNodeUI();

    if (wireType === 'parent') {
      if (fromNodeData.state === 'alive' && toNodeData.state === 'alive') {
        evalBridge.dispatch({
          action: 'setLayerParent',
          params: {
            hostingCompUUID: toNodeData.hostingComps[0],
            childNodeUUID:  fromNodeData.id,
            parentNodeUUID: toNodeData.id
          }
        });
      }
      return true;
    }

    if (wireType === 'data') {
      // Propagate the source node's current value to the target node
      for (var pk in fromNodeData.props) {
        if (!fromNodeData.props.hasOwnProperty(pk)) continue;
        if (pk === 'label') continue;
        graphState.updateProp(toNodeId, toPort, fromNodeData.props[pk]);
        if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.schedule) dirtyFlusher.schedule();
        break;
      }
      return true;
    }

    if (toNodeData.type === 'core/comp') {
      _firePathCreation(wireData.id);
      return true;
    }

    if (toNodeData.nodeKind === 'matte') {
      _checkMatteActivation(toNodeId);
      return true;
    }

    if (toNodeData.hostingComps.length > 0) {
      var pathLayerUUID = _findPathLayerUUID(toNodeId);
      if (pathLayerUUID) {
        _propagateAlive(fromNodeId, toNodeData.hostingComps[0], pathLayerUUID);
      }
      return true;
    }

    // Dormant reconnection — toNode is ghost but has active comp downstream
    if (wireType === 'layer' && toNodeData.hostingComps.length === 0 && toNodeData.hasParkedLayer) {
      var downstreamComps = cascadeAlgorithm.hasCompDownstream(toNodeId);
      if (downstreamComps.length > 0) {
        pathLayerUUID = _findPathLayerUUID(toNodeId);
        if (pathLayerUUID) {
          _propagateAlive(fromNodeId, downstreamComps[0], pathLayerUUID);
        }
      }
    }

    return true;
  }

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
              blendUpstreamUUID = _findPathLayerUUID(bw.fromNode);
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
              matteTopUUID = _findPathLayerUUID(mw.fromNode);
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
      // affected or effector
      if (nodeData.state === 'alive') {
        var affBatch = [];
        for (var ai = 0; ai < nodeData.hostingComps.length; ai++) {
          var affHostUUID = nodeData.hostingComps[ai];
          var affGhostCmd = null;
          if (nodeData.nodeKind === 'affected') {
            affGhostCmd = def ? def.onGhost(nodeData, affHostUUID) : null;
          } else {
            // effector: find pathLayerUUID from main_input wire
            var effPathUUID = null;
            for (var ewId in delWireMap) {
              if (!delWireMap.hasOwnProperty(ewId)) continue;
              var ew = delWireMap[ewId];
              if (ew.toNode === nodeId && ew.toPort === 'main_input') {
                effPathUUID = _findPathLayerUUID(ew.fromNode);
                break;
              }
            }
            affGhostCmd = def ? def.onGhost(nodeData, affHostUUID, effPathUUID) : null;
          }
          if (affGhostCmd) affBatch.push(affGhostCmd);
        }
        if (affBatch.length > 0) evalBridge.dispatchBatch(affBatch);
        // fire and forget — do not wait before onDelete
      }
      var affDeleteCmd = def ? def.onDelete(nodeData) : null;
      if (affDeleteCmd) evalBridge.dispatch(affDeleteCmd);
    }

    // Remove from graph — also removes all wires connected to this node
    graphState.removeNode(nodeId);
    _refreshNodeUI();

    // Remove from selection if this node was selected
    graphState.removeFromSelection(nodeId);
  }

  function deleteSelectedNodes() {
    var sel = graphState.getSelection().slice();
    if (sel.length === 0) return;
    for (var i = 0; i < sel.length; i++) {
      deleteNode(sel[i]);
    }
  }

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
    _refreshNodeUI();
  }

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
    _refreshNodeUI();
  }

  function disconnectWire(wireId) {
    var wireData = graphState.getWire(wireId);
    if (!wireData) {
      console.warn('[engine] disconnectWire: wire not found: ' + wireId);
      _refreshNodeUI();
      return;
    }

    if (wireData.type === 'parent') {
      evalBridge.dispatch({
        action: 'clearLayerParent',
        params: { nodeUUID: wireData.fromNode }
      });
      graphState.removeWire(wireId);
      _refreshNodeUI();
      return;
    }

    if (wireData.type === 'data') {
      graphState.removeWire(wireId);
      _refreshNodeUI();
      return;
    }

    // Layer wire — cascade owns removal
    cascadeAlgorithm.cascadeGhost(wireId);
    _refreshNodeUI();
  }

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

  function recreateNode(nodeId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) { console.warn('[engine] recreateNode: node not found: ' + nodeId); return; }
    if (nodeData.state !== 'error') return;

    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return;

    var wireMap = graphState.getAllWires();
    var errors = [];

    for (var c = 0; c < nodeData.hostingComps.length; c++) {
      var hostUUID = nodeData.hostingComps[c];

      if (nodeData.nodeKind === 'affected') {
        var pathLayerUUID = _findPathLayerUUID(nodeId);
        var cmd = def.onAlive(nodeData, hostUUID);
        if (cmd) {
          cmd.params.layerUUID = pathLayerUUID;
          (function(nId, cCmd) {
            evalBridge.dispatch(cCmd).then(function(res) {
              if (res.ok) {
                graphState.updateNode(nId, { state: 'alive' });
                _refreshNodeUI();
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
            upstreamUUID = _findPathLayerUUID(w.fromNode);
            break;
          }
        }
        var cmd = def.onAlive(nodeData, hostUUID, upstreamUUID);
        if (cmd) {
          (function(nId, cCmd) {
            evalBridge.dispatch(cCmd).then(function(res) {
              if (res.ok) {
                graphState.updateNode(nId, { state: 'alive' });
                _refreshNodeUI();
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
            blendUpstreamUUID = _findPathLayerUUID(bw.fromNode);
            break;
          }
        }
        var cmd = def.onAlive(nodeData, hostUUID, blendUpstreamUUID);
        if (cmd) {
          evalBridge.dispatch(cmd).then(function(res) {
            if (res.ok) {
              graphState.updateNode(nId, { state: 'alive' });
            }
          });
        }

      } else if (nodeData.nodeKind === 'matte') {
        var matteTopUUID = null;
        var matteLayerUUID = null;
        for (var mwId in wireMap) {
          if (!wireMap.hasOwnProperty(mwId)) continue;
          var mw = wireMap[mwId];
          if (mw.toNode === nodeId) {
            if (mw.toPort === 'top_layer')   matteTopUUID   = _findPathLayerUUID(mw.fromNode);
            if (mw.toPort === 'matte_layer') matteLayerUUID = _findPathLayerUUID(mw.fromNode);
          }
        }
        var cmd = def.onAlive(nodeData, hostUUID, matteTopUUID, matteLayerUUID);
        if (cmd) {
          evalBridge.dispatch(cmd).then(function(res) {
            if (res.ok) {
              graphState.updateNode(nId, { state: 'alive' });
            }
          });
        }
      }
    }
  }

  function setNodeProperty(nodeId, key, value) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) {
      console.warn('[engine] setNodeProperty: node not found:', nodeId);
      return;
    }
    graphState.updateProp(nodeId, key, value);
    if (nodeData.nodeKind === 'data' && key !== 'label') {
      _propagateDataValue(nodeId, key, value);
    }
    if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.schedule) dirtyFlusher.schedule();
  }

  return {
    dropNode:            dropNode,
    connectWire:         connectWire,
    deleteNode:          deleteNode,
    deleteSelectedNodes: deleteSelectedNodes,
    duplicateSelectedNodes: duplicateSelectedNodes,
    recreateNode:        recreateNode,
    toggleLockSelectedNodes: toggleLockSelectedNodes,
    disconnectWire:      disconnectWire,
    setNodeProperty:     setNodeProperty,
    _firePathCreation:   _firePathCreation,
    _applyDynamicSchema: _applyDynamicSchema
  };

}());
