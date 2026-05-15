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

  // ─── onAlive ──────────────────────────────────────────────────────────────────
  // Called when a node gains a comp path (wire committed, or cascaded).
  // Updates state + hostingComps. AE layer creation is guarded until T6.1.

  function onAlive(uuid) {
    var reachableComps = nodeState.getReachableComps(uuid);
    if (reachableComps.length === 0) return;
    updateNode(uuid, { state: 'alive', hostingComps: reachableComps });
    // AE call — fails gracefully until JSX preamble is ready (T6.1+)
    if (typeof callMakeNodeAlive === 'function') {
      callMakeNodeAlive(uuid);
    }
  }

  // ─── onDelete ─────────────────────────────────────────────────────────────────
  // Removes a node and all its wires. T5.4 expands with AE teardown.

  function onDelete(uuid) {
    if (!nodeMap[uuid]) return;
    // Save connected node IDs before removing wires
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
    for (var i = 0; i < toRemove.length; i++) {
      var removed = wireMap[toRemove[i]];
      delete wireMap[toRemove[i]];
      fireWireRemoved(removed);
    }
    delete nodeMap[uuid];
    if (selection === uuid) selection = null;
    rebuildTempGraph();
    fireChange();
    // Re-evaluate remaining connected nodes
    for (var i = 0; i < connectedNodes.length; i++) {
      var cid = connectedNodes[i];
      if (nodeMap[cid]) {
        updateNode(cid, { state: nodeState.evaluateNodeState(cid) });
      }
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
    onDelete: onDelete,

    // Selection
    setSelection: setSelection,
    getSelection: getSelection,

    // Events
    onChange:          onChange,
    onSelectionChange: onSelectionChange,
    onNodeStateChange: onNodeStateChange,
    onWireAdded:       onWireAdded,
    onWireRemoved:     onWireRemoved
  };

}());
