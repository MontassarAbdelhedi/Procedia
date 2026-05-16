// graph/graphState.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: graph/nodes/nodeRegistry.js, graph/Wire/nodeState.js, ae/graphHooks.js
// ONLY file that mutates nodeMap and wireMap.

var graphState = (function() {

  // ─── Private state ───────────────────────────────────────────────────────────
  // nodeMap shape: { id, type, nodeKind, state, dirty, x, y, props, hostingComps }
  // wireMap shape: { id, fromNode, fromPort, toNode, toPort }
  var nodeMap   = {};
  var wireMap   = {};
  var tempGraph = { version: '2.0', nodes: {}, wires: {} };
  var selection = null;

  // ─── Event listeners ─────────────────────────────────────────────────────────
  var selectionListeners   = [];
  var changeListeners      = [];
  var stateChangeListeners = [];
  var wireAddedListeners   = [];
  var wireRemovedListeners = [];

  function fireSelectionChange(uuid) {
    for (var i = 0; i < selectionListeners.length; i++) selectionListeners[i](uuid);
  }
  function fireChange() {
    for (var i = 0; i < changeListeners.length; i++) changeListeners[i]();
  }
  function fireStateChange(uuid, oldState, newState) {
    for (var i = 0; i < stateChangeListeners.length; i++) stateChangeListeners[i](uuid, oldState, newState);
  }
  function fireWireAdded(wire) {
    for (var i = 0; i < wireAddedListeners.length; i++) wireAddedListeners[i](wire);
  }
  function fireWireRemoved(wire) {
    for (var i = 0; i < wireRemovedListeners.length; i++) wireRemovedListeners[i](wire);
  }

  // ─── tempGraph ───────────────────────────────────────────────────────────────

  function rebuildTempGraph() {
    var nodes = {};
    for (var uid in nodeMap) {
      if (!nodeMap.hasOwnProperty(uid)) continue;
      var n = nodeMap[uid];
      nodes[uid] = {
        type:         n.type,
        nodeKind:     n.nodeKind,
        state:        n.state,
        x:            n.x,
        y:            n.y,
        props:        n.props,
        hostingComps: n.hostingComps
      };
    }
    var wires = {};
    for (var wid in wireMap) {
      if (!wireMap.hasOwnProperty(wid)) continue;
      var w = wireMap[wid];
      wires[wid] = {
        fromNode: w.fromNode,
        fromPort: w.fromPort,
        toNode:   w.toNode,
        toPort:   w.toPort
      };
    }
    tempGraph = { version: '2.0', nodes: nodes, wires: wires };
  }

  // ─── Node API ─────────────────────────────────────────────────────────────────

  function addNode(nodeData) {
    if (!nodeData || !nodeData.id) return;
    // Keep position alias in sync for v2 renderer files until they are rewritten (T2.2)
    if (nodeData.x !== undefined && nodeData.y !== undefined) {
      nodeData.position = { x: nodeData.x, y: nodeData.y };
    }
    nodeMap[nodeData.id] = nodeData;
    rebuildTempGraph();
    fireChange();
  }

  function removeNode(uuid) {
    if (!nodeMap[uuid]) return;
    var oldState = nodeMap[uuid].state;
    delete nodeMap[uuid];

    for (var wid in wireMap) {
      if (!wireMap.hasOwnProperty(wid)) continue;
      var w = wireMap[wid];
      if (w.fromNode === uuid || w.toNode === uuid) {
        delete wireMap[wid];
      }
    }

    if (selection === uuid) {
      selection = null;
      fireSelectionChange(null);
    }

    rebuildTempGraph();
    fireChange();
  }

  function setNodeProp(uuid, key, value) {
    if (!nodeMap[uuid]) return;
    nodeMap[uuid].props[key] = value;
    nodeMap[uuid].dirty = true;
    fireChange();
  }

  function setNodeState(uuid, newState) {
    if (!nodeMap[uuid]) return;
    var oldState = nodeMap[uuid].state;
    nodeMap[uuid].state = newState;
    if (oldState !== newState) fireStateChange(uuid, oldState, newState);
    rebuildTempGraph();
    fireChange();
  }

  function setNodePosition(uuid, x, y) {
    if (!nodeMap[uuid]) return;
    nodeMap[uuid].x = x;
    nodeMap[uuid].y = y;
    nodeMap[uuid].position = { x: x, y: y };
    fireChange();
  }

  function getNode(uuid) {
    return nodeMap[uuid] || null;
  }

  function getAllNodes() {
    return nodeMap;
  }

  function updateNode(uuid, patch) {
    if (!nodeMap[uuid]) return;
    var n = nodeMap[uuid];
    var oldState = n.state;
    for (var key in patch) {
      if (patch.hasOwnProperty(key)) n[key] = patch[key];
    }
    if (patch.state !== undefined && patch.state !== oldState) {
      fireStateChange(uuid, oldState, patch.state);
    }
    rebuildTempGraph();
    fireChange();
  }

  // ─── Wire API ─────────────────────────────────────────────────────────────────

  function addWire(wireData) {
    if (!wireData || !wireData.id) return;
    wireMap[wireData.id] = wireData;
    rebuildTempGraph();
    fireWireAdded(wireData);
    fireChange();
  }

  function removeWire(wireId) {
    if (!wireMap[wireId]) return;
    var removed = wireMap[wireId];
    delete wireMap[wireId];
    rebuildTempGraph();
    fireWireRemoved(removed);
    fireChange();
  }

  function getWire(wireId) {
    return wireMap[wireId] || null;
  }

  function getAllWires() {
    return wireMap;
  }

  // ─── Selection API ────────────────────────────────────────────────────────────

  function setSelection(uuid) {
    selection = uuid || null;
    fireSelectionChange(selection);
    fireChange();
  }

  function getSelection() {
    return selection;
  }

  // ─── Subscription API ─────────────────────────────────────────────────────────

  function onChange(cb)          { changeListeners.push(cb); }
  function onSelectionChange(cb) { selectionListeners.push(cb); }
  function onNodeStateChange(cb) { stateChangeListeners.push(cb); }
  function onWireAdded(cb)       { wireAddedListeners.push(cb); }
  function onWireRemoved(cb)     { wireRemovedListeners.push(cb); }

  // ─── onDrop ───────────────────────────────────────────────────────────────────
  // Creates a node from a registry type at world coords (x, y).
  // T5.1 expands this with AE lifecycle calls (makeCompAlive, etc.).

  function onDrop(nodeType, x, y) {
    var def = nodeRegistry.getByType(nodeType);
    if (!def) return null;
    var id        = uuidGenerator.generateNodeId();
    var isComp    = (nodeType === 'CompNode' || nodeType === 'core/comp');
    var state     = isComp ? 'alive' : 'ghost';
    // Deep-copy defaultProps so each node gets its own props object
    var props = {};
    if (def.defaultProps) {
      for (var k in def.defaultProps) {
        if (def.defaultProps.hasOwnProperty(k)) props[k] = def.defaultProps[k];
      }
    }
    var hostingComps = isComp ? [id] : [];
    addNode({
      id:          id,
      type:        nodeType,
      nodeKind:    def.nodeKind || 'affected',
      state:       state,
      dirty:       false,
      x:           x,
      y:           y,
      props:       props,
      hostingComps: hostingComps
    });
    // CompNode: fire AE comp creation (guarded — fails silently until T6.1 JSX is ready)
    if (isComp && typeof callMakeNodeAlive === 'function') {
      callMakeNodeAlive(id);
    }
    return id;
  }

  // ─── onGhost ──────────────────────────────────────────────────────────────────
  // Called by cascadeGhost for each node that has lost its comp path.
  // AE parkLayer call is driven by the onNodeStateChange hook in ae/graphHooks.js —
  // do NOT call callMakeNodeGhost here to avoid duplicate parkLayer calls.

  function onGhost(uuid) {
    var n = nodeMap[uuid];
    if (!n) return;
    updateNode(uuid, { state: 'ghost', hostingComps: [] });
  }

  // ─── onAlive ──────────────────────────────────────────────────────────────────
  // Called when a node gains a comp path (wire committed, or cascaded).
  // Updates state + hostingComps. AE layer creation is guarded until T6.1.

  function onAlive(uuid) {
    var reachableComps = nodeState.getReachableComps(uuid);
    if (reachableComps.length === 0) return;
    // AE call is driven by the onNodeStateChange hook in ae/graphHooks.js.
    // Do NOT call callMakeNodeAlive here — updateNode fires stateChange which
    // triggers the hook, so a direct call here would create duplicate AE layers.
    updateNode(uuid, { state: 'alive', hostingComps: reachableComps });
  }

  // ─── onDelete ─────────────────────────────────────────────────────────────────
  // Removes a node and all its wires. Full AE teardown per architecture §3d.

  function onDelete(uuid) {
    if (!nodeMap[uuid]) return;
    var n          = nodeMap[uuid];
    var isCompNode = (n.type === 'CompNode' || n.type === 'core/comp');

    // Step 1 — AE teardown before removing from nodeMap.
    if (n.state === 'alive') {
      if (isCompNode) {
        // CompNode has no ghost state — delete the AE comp directly.
        if (typeof callDeleteComp === 'function') {
          callDeleteComp(uuid);
        }
      } else {
        // Non-comp alive: ghost first (parks layer for affected, clears effector state).
        onGhost(uuid);
      }
    }

    // Step 2 — Permanently delete the parked layer from reserved comp.
    // Only for affected non-comp nodes (now in ghost state after step 1, or was already ghost).
    if (!isCompNode && n.nodeKind === 'affected') {
      if (typeof callDeleteParkedLayer === 'function') {
        callDeleteParkedLayer(uuid);
      }
    }

    // Step 3 — Collect connected peers before wires are gone.
    var connectedNodes = [];
    var toRemove       = [];
    for (var wid in wireMap) {
      if (!wireMap.hasOwnProperty(wid)) continue;
      var w = wireMap[wid];
      if (w.fromNode === uuid || w.toNode === uuid) {
        toRemove.push(wid);
        var peer = (w.fromNode === uuid) ? w.toNode : w.fromNode;
        if (peer !== uuid) connectedNodes.push(peer);
      }
    }

    // Step 4 — Remove wires (fires wireRemoved events for graphHooks cascade at T12.2).
    for (var i = 0; i < toRemove.length; i++) {
      var removed = wireMap[toRemove[i]];
      delete wireMap[toRemove[i]];
      fireWireRemoved(removed);
    }

    // Step 5 — Remove node.
    delete nodeMap[uuid];
    if (selection === uuid) {
      selection = null;
      fireSelectionChange(null);
    }

    rebuildTempGraph();
    fireChange();

    // Step 6 — Re-evaluate connected peers: they may have lost their comp path.
    for (var j = 0; j < connectedNodes.length; j++) {
      var cid = connectedNodes[j];
      if (!nodeMap[cid]) continue;
      var newState = nodeState.evaluateNodeState(cid);
      if (nodeMap[cid].state !== newState) {
        if (newState === 'ghost') {
          onGhost(cid);
        } else {
          updateNode(cid, { state: newState });
        }
      }
    }
  }

  // ─── flushToPersistence ───────────────────────────────────────────────────────
  // Serializes nodeMap + wireMap to AE text layers. Called on panel unload.
  // Fire-and-forget — no await, no UI feedback needed.

  function flushToPersistence() {
    if (typeof callWriteNodeRegistry !== 'function') return;

    // Serialize nodes — strip internal tracking fields (_hostingCompUUID etc.)
    var nodesOut = {};
    for (var uid in nodeMap) {
      if (!nodeMap.hasOwnProperty(uid)) continue;
      var n = nodeMap[uid];
      nodesOut[uid] = {
        type:         n.type,
        nodeKind:     n.nodeKind,
        state:        n.state,
        x:            n.x,
        y:            n.y,
        props:        n.props,
        hostingComps: n.hostingComps,
        label:        n.label || ''
      };
    }
    var nodesJson = JSON.stringify({ version: '2.0', nodes: nodesOut });
    callWriteNodeRegistry(nodesJson);

    // Serialize wires.
    var wiresOut = [];
    for (var wid in wireMap) {
      if (!wireMap.hasOwnProperty(wid)) continue;
      var w = wireMap[wid];
      wiresOut.push({ id: wid, fromNode: w.fromNode, fromPort: w.fromPort, toNode: w.toNode, toPort: w.toPort });
    }
    var wiresJson = JSON.stringify({ version: '2.0', wires: wiresOut });
    callWriteWireRegistry(wiresJson);

    // Write comp membership for each alive CompNode.
    for (var cid in nodeMap) {
      if (!nodeMap.hasOwnProperty(cid)) continue;
      var cn = nodeMap[cid];
      if ((cn.type !== 'CompNode' && cn.type !== 'core/comp') || cn.state !== 'alive') continue;
      var members = [];
      for (var wid2 in wireMap) {
        if (!wireMap.hasOwnProperty(wid2)) continue;
        var cw = wireMap[wid2];
        if (cw.toNode === cid) members.push(cw.fromNode);
      }
      callWriteCompMembership(cid, JSON.stringify(members));
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  return {
    // State (read-only by convention — only this file writes)
    get nodeMap()   { return nodeMap; },
    get wireMap()   { return wireMap; },
    get tempGraph() { return tempGraph; },

    // tempGraph
    rebuildTempGraph: rebuildTempGraph,

    // Node mutations
    addNode:         addNode,
    removeNode:      removeNode,
    updateNode:      updateNode,
    setNodeProp:     setNodeProp,
    setNodeState:    setNodeState,
    setNodePosition: setNodePosition,
    getNode:         getNode,
    getAllNodes:      getAllNodes,

    // Wire mutations
    addWire:    addWire,
    removeWire: removeWire,
    getWire:    getWire,
    getAllWires: getAllWires,

    // Node lifecycle
    onDrop:   onDrop,
    onAlive:  onAlive,
    onGhost:  onGhost,
    onDelete: onDelete,

    // Selection
    setSelection: setSelection,
    getSelection: getSelection,

    // Persistence
    flushToPersistence: flushToPersistence,

    // Events
    onChange:          onChange,
    onSelectionChange: onSelectionChange,
    onNodeStateChange: onNodeStateChange,
    onWireAdded:       onWireAdded,
    onWireRemoved:     onWireRemoved
  };

}());
