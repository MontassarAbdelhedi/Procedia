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

  function _getWires() {
    var wires = graphState.getAllWires();
    return wires || {};
  }

  function _findUpstreamNodeUUID(nodeId) {
    var hlp = window.__e_hlp;
    if (!hlp) return null;
    var wires = _getWires();
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.toNode === nodeId && (w.toPort === 'main_input' || w.toPort === 'output')) {
        return hlp.findPathLayerUUID(w.fromNode) || w.id;
      }
    }
    return null;
  }

  function _findPortUUID(nodeId, portId) {
    var hlp = window.__e_hlp;
    if (!hlp) return null;
    var wires = _getWires();
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.toNode === nodeId && w.toPort === portId) {
        return hlp.findPathLayerUUID(w.fromNode) || w.id;
      }
    }
    return null;
  }

  function _dispatchNodeDelete(nodeData) {
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def || !def.onDelete) return;
    var cmd = def.onDelete(nodeData);
    if (cmd) evalBridge.dispatch(cmd);
    if (nodeData.nodeKind === 'effector' && nodeData.hostingComps && nodeData.hostingComps.length > 0) {
      var ghostCmd = def.onGhost ? def.onGhost(nodeData, nodeData.hostingComps[0], _findUpstreamNodeUUID(nodeData.id)) : null;
      if (ghostCmd) evalBridge.dispatch(ghostCmd);
    }
  }

  function _dispatchNodeAlive(nodeData) {
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def || !def.onAlive) return;
    var hlp = window.__e_hlp;
    if (!hlp) return;

    if (nodeData.nodeKind === 'affected') {
      for (var ci = 0; ci < (nodeData.hostingComps || []).length; ci++) {
        var hostUUID = nodeData.hostingComps[ci];
        var cmd = def.onAlive(nodeData, hostUUID);
        if (cmd) {
          cmd.params = cmd.params || {};
          cmd.params.layerUUID = hlp.findPathLayerUUID(nodeData.id);
          evalBridge.dispatch(cmd);
        }
      }
    } else if (nodeData.nodeKind === 'effector') {
      var upstreamUUID = _findUpstreamNodeUUID(nodeData.id);
      for (var ci = 0; ci < (nodeData.hostingComps || []).length; ci++) {
        var hostUUID = nodeData.hostingComps[ci];
        var cmd = def.onAlive(nodeData, hostUUID, upstreamUUID);
        if (cmd) evalBridge.dispatch(cmd);
      }
    } else if (nodeData.nodeKind === 'blending') {
      var blendUpstream = _findUpstreamNodeUUID(nodeData.id);
      for (var ci = 0; ci < (nodeData.hostingComps || []).length; ci++) {
        var hostUUID = nodeData.hostingComps[ci];
        var cmd = def.onAlive(nodeData, hostUUID, blendUpstream);
        if (cmd) evalBridge.dispatch(cmd);
      }
    } else if (nodeData.nodeKind === 'matte') {
      var topUUID = _findPortUUID(nodeData.id, 'top_layer');
      var matteUUID = _findPortUUID(nodeData.id, 'matte_layer');
      for (var ci = 0; ci < (nodeData.hostingComps || []).length; ci++) {
        var hostUUID = nodeData.hostingComps[ci];
        var cmd = def.onAlive(nodeData, hostUUID, topUUID, matteUUID);
        if (cmd) evalBridge.dispatch(cmd);
      }
    }

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
    var hlp = window.__e_hlp;
    if (!hlp) return;

    if (nodeData.nodeKind === 'affected') {
      for (var ci = 0; ci < (nodeData.hostingComps || []).length; ci++) {
        var hostUUID = nodeData.hostingComps[ci];
        var cmd = def.onGhost(nodeData, hostUUID);
        if (cmd) evalBridge.dispatch(cmd);
      }
    } else if (nodeData.nodeKind === 'effector') {
      var upstreamUUID = _findUpstreamNodeUUID(nodeData.id);
      for (var ci = 0; ci < (nodeData.hostingComps || []).length; ci++) {
        var hostUUID = nodeData.hostingComps[ci];
        var cmd = def.onGhost(nodeData, hostUUID, upstreamUUID);
        if (cmd) evalBridge.dispatch(cmd);
      }
    } else if (nodeData.nodeKind === 'blending') {
      var blendUpstream = _findUpstreamNodeUUID(nodeData.id);
      for (var ci = 0; ci < (nodeData.hostingComps || []).length; ci++) {
        var hostUUID = nodeData.hostingComps[ci];
        var cmd = def.onGhost(nodeData, hostUUID, blendUpstream);
        if (cmd) {
          cmd.params.mode = 'NORMAL';
          evalBridge.dispatch(cmd);
        }
      }
    } else if (nodeData.nodeKind === 'matte') {
      var topUUID = _findPortUUID(nodeData.id, 'top_layer');
      var matteUUID = _findPortUUID(nodeData.id, 'matte_layer');
      for (var ci = 0; ci < (nodeData.hostingComps || []).length; ci++) {
        var hostUUID = nodeData.hostingComps[ci];
        var cmd = def.onGhost(nodeData, hostUUID, topUUID);
        if (cmd) evalBridge.dispatch(cmd);
      }
    }
  }

  function _dispatchPropChange(nodeData, key, value) {
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def || !def.onPropertyChange) return;
    var hlp = window.__e_hlp;
    if (!hlp) return;

    var hostingComps = nodeData.hostingComps || [];
    if (nodeData.nodeKind === 'affected') {
      for (var ci = 0; ci < hostingComps.length; ci++) {
        var cmd = def.onPropertyChange(key, value, nodeData, hostingComps[ci]);
        if (cmd) evalBridge.dispatch(cmd);
      }
    } else if (nodeData.nodeKind === 'effector') {
      var upstreamUUID = _findUpstreamNodeUUID(nodeData.id);
      for (var ci = 0; ci < hostingComps.length; ci++) {
        var cmd = def.onPropertyChange(key, value, nodeData, hostingComps[ci], upstreamUUID);
        if (cmd) evalBridge.dispatch(cmd);
      }
    } else if (nodeData.nodeKind === 'blending') {
      var blendUpstream = _findUpstreamNodeUUID(nodeData.id);
      for (var ci = 0; ci < hostingComps.length; ci++) {
        var cmd = def.onPropertyChange(key, value, nodeData, hostingComps[ci], blendUpstream);
        if (cmd) evalBridge.dispatch(cmd);
      }
    } else if (nodeData.nodeKind === 'matte') {
      var topUUID = _findPortUUID(nodeData.id, 'top_layer');
      var matteUUID = _findPortUUID(nodeData.id, 'matte_layer');
      for (var ci = 0; ci < hostingComps.length; ci++) {
        var cmd = def.onPropertyChange(key, value, nodeData, hostingComps[ci], topUUID, matteUUID);
        if (cmd) evalBridge.dispatch(cmd);
      }
    }
  }

  function _dispatchWireDisconnect(wireData) {
    if (wireData.type === 'parent') {
      var childNodeData = graphState.getNode(wireData.fromNode);
      if (childNodeData && childNodeData.hostingComps && childNodeData.hostingComps.length > 0) {
        var hlp = window.__e_hlp;
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
        var hlp = window.__e_hlp;
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
  }

  um._reconcileAE = _reconcileAE;

})(window.__um);
