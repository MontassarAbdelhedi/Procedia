/**
 * AE reconciliation engine for undoManager. Diffs snapshots and dispatches
 * lifecycle commands to bring AE in sync with the restored graph state.
 * @module undoManager/aeReconcile
 * @dependencies undoManager/state, nodeRegistry, evalBridge, engine/helpers
 * @internal
 */
// graph/undoManager/aeReconcile.js
// DEPENDS ON: graph/undoManager/state.js
// MUST LOAD AFTER: graph/undoManager/state.js
// MUST LOAD BEFORE: graph/undoManager/restore.js, graph/undoManager/index.js

(function(um) {

  function _lc() { return window.__procedia_internal.lifecycle; }

  function _dispatchNodeDelete(nodeData) {
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def || !def.onDelete) return;
    var cmd = def.onDelete(nodeData);
    if (cmd) evalBridge.dispatch(cmd);
    if (nodeData.nodeKind === 'effector' && nodeData.hostingComps && nodeData.hostingComps.length > 0) {
      var conn = _lc().resolveNodeConnections(nodeData);
      var ghostCmd = def.onGhost ? def.onGhost(nodeData, nodeData.hostingComps[0], conn.upstreamUUID) : null;
      if (ghostCmd) evalBridge.dispatch(ghostCmd);
    }
  }

  function _dispatchNodeAlive(nodeData) {
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def || !def.onAlive) return;
    _lc().forEachHostingComp(nodeData, function(hostUUID, conn) {
      var cmd = _lc().buildLifecycleCommand(nodeData, def, 'onAlive', undefined, undefined, hostUUID);
      if (cmd) {
        _lc().injectLayerUUID(cmd, nodeData);
        evalBridge.dispatch(cmd);
      }
    });

    if (nodeData.state === 'ghost' && nodeData.hasParkedLayer && nodeData.hostingComps && nodeData.hostingComps.length > 0) {
      evalBridge.dispatch({
        action: 'unparkLayer',
        params: { nodeUUID: nodeData.id, hostingCompUUID: nodeData.hostingComps[0] }
      });
    }
  }

  function _dispatchNodeGhost(nodeData) {
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def || !def.onGhost) return;
    _lc().forEachHostingComp(nodeData, function(hostUUID, conn) {
      var cmd = _lc().buildLifecycleCommand(nodeData, def, 'onGhost', undefined, undefined, hostUUID);
      if (cmd) {
        if (nodeData.nodeKind === 'blending') cmd.params.mode = 'NORMAL';
        evalBridge.dispatch(cmd);
      }
    });
  }

  function _dispatchPropChange(nodeData, key, value) {
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def || !def.onPropertyChange) return;
    _lc().forEachHostingComp(nodeData, function(hostUUID, conn) {
      var cmd = _lc().buildLifecycleCommand(nodeData, def, 'onPropertyChange', key, value, hostUUID);
      if (cmd) evalBridge.dispatch(cmd);
    });
  }

  function _dispatchWireDisconnect(wireData) {
    if (wireData.type === 'parent') {
      var childNodeData = graphState.getNode(wireData.fromNode);
      if (childNodeData && childNodeData.hostingComps && childNodeData.hostingComps.length > 0) {
        var hlp = window.__procedia_internal.hlp;
        if (hlp) {
          var childLayerUUID = hlp.findPathLayerUUID(wireData.fromNode);
          if (childLayerUUID) {
            evalBridge.dispatch({
              action: 'clearLayerParent',
              params: { hostingCompUUID: childNodeData.hostingComps[0], layerUUID: childLayerUUID }
            });
          }
        }
      }
    }
  }

  function _dispatchWireConnect(wireData) {
    if (wireData.type === 'parent') {
      var fromNode = graphState.getNode(wireData.fromNode);
      var toNode = graphState.getNode(wireData.toNode);
      if (fromNode && toNode && fromNode.state === 'alive' && toNode.state === 'alive') {
        var hlp = window.__procedia_internal.hlp;
        if (hlp) {
          var childLayerUUID = hlp.findPathLayerUUID(wireData.fromNode);
          var parentLayerUUID = hlp.findPathLayerUUID(wireData.toNode);
          if (childLayerUUID && parentLayerUUID) {
            evalBridge.dispatch({
              action: 'setLayerParent',
              params: {
                hostingCompUUID: toNode.hostingComps[0],
                childLayerUUID: childLayerUUID,
                parentLayerUUID: parentLayerUUID
              }
            });
          }
        }
      }
    }
  }

  function _reconcileAE(oldState, targetState) {
    evalBridge.dispatch({ action: 'beginUndoGroup', params: { name: 'Procedia undo' } });
    for (var oldId in oldState.nodes) {
      if (!oldState.nodes.hasOwnProperty(oldId)) continue;
      if (!targetState.nodes[oldId]) {
        _dispatchNodeDelete(oldState.nodes[oldId]);
      }
    }

    for (var newId in targetState.nodes) {
      if (!targetState.nodes.hasOwnProperty(newId)) continue;
      if (!oldState.nodes[newId] && targetState.nodes[newId].state === 'alive') {
        _dispatchNodeAlive(targetState.nodes[newId]);
      }
    }

    for (var chId in targetState.nodes) {
      if (!targetState.nodes.hasOwnProperty(chId)) continue;
      var oldN = oldState.nodes[chId];
      var newN = targetState.nodes[chId];
      if (!oldN || !newN) continue;

      if (oldN.state !== newN.state) {
        if (newN.state === 'alive') {
          _dispatchNodeAlive(newN);
        } else if (newN.state === 'ghost' && oldN.state === 'alive') {
          _dispatchNodeGhost(newN);
        }
      }

      if (newN.state === 'alive' && oldN.state === 'alive' && oldN.props && newN.props) {
        for (var key in newN.props) {
          if (!newN.props.hasOwnProperty(key)) continue;
          var oldVal = oldN.props[key];
          var newVal = newN.props[key];
          if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            _dispatchPropChange(newN, key, newVal);
          }
        }
      }
    }

    for (var oldWId in oldState.wires) {
      if (!oldState.wires.hasOwnProperty(oldWId)) continue;
      if (!targetState.wires[oldWId]) {
        _dispatchWireDisconnect(oldState.wires[oldWId]);
      }
    }

    for (var newWId in targetState.wires) {
      if (!targetState.wires.hasOwnProperty(newWId)) continue;
      if (!oldState.wires[newWId]) {
        _dispatchWireConnect(targetState.wires[newWId]);
      }
    }
    evalBridge.dispatch({ action: 'endUndoGroup' });
  }

  um._reconcileAE = _reconcileAE;

})(window.__procedia_internal.um);
