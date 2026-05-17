// graph/graphState/store.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: graph/graphState/lifecycle.js, graph/Wire/nodeState.js, ae/graphHooks.js
// Core state store — only this file initialises nodeMap and wireMap.

var graphState = (function() {

  // ─── Private state ───────────────────────────────────────────────────────────
  // nodeMap shape: { id, type, nodeKind, state, dirty, x, y, props, hostingComps }
  // wireMap shape: { id, fromNode, fromPort, toNode, toPort }
  var nodeMap   = {};
  var wireMap   = {};
  var tempGraph = { version: '2.0', nodes: {}, wires: {} };
  var selectedNodeIds = new Set();
  var lastSelectedId  = null;

  // ─── Event listeners ─────────────────────────────────────────────────────────
  var selectionListeners   = [];
  var changeListeners      = [];
  var stateChangeListeners = [];
  var wireAddedListeners   = [];
  var wireRemovedListeners = [];

  function fireSelectionChange() {
    var last = lastSelectedId;
    for (var i = 0; i < selectionListeners.length; i++) selectionListeners[i](last);
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
    delete nodeMap[uuid];

    for (var wid in wireMap) {
      if (!wireMap.hasOwnProperty(wid)) continue;
      var w = wireMap[wid];
      if (w.fromNode === uuid || w.toNode === uuid) {
        delete wireMap[wid];
      }
    }

    if (selectedNodeIds.has(uuid)) {
      selectedNodeIds.delete(uuid);
      if (lastSelectedId === uuid) {
        lastSelectedId = null;
        selectedNodeIds.forEach(function(sid) { lastSelectedId = sid; });
      }
      fireSelectionChange();
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
    wireData.dashOffset = 0;
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

  function setSelection(ids) {
    selectedNodeIds = new Set();
    lastSelectedId  = null;
    if (ids) {
      for (var i = 0; i < ids.length; i++) {
        selectedNodeIds.add(ids[i]);
        lastSelectedId = ids[i];
      }
    }
    fireSelectionChange();
    fireChange();
  }

  function addToSelection(id) {
    selectedNodeIds.add(id);
    lastSelectedId = id;
    fireSelectionChange();
    fireChange();
  }

  function removeFromSelection(id) {
    selectedNodeIds.delete(id);
    if (lastSelectedId === id) {
      lastSelectedId = null;
      selectedNodeIds.forEach(function(sid) { lastSelectedId = sid; });
    }
    fireSelectionChange();
    fireChange();
  }

  function clearSelection() {
    selectedNodeIds = new Set();
    lastSelectedId  = null;
    fireSelectionChange();
    fireChange();
  }

  function getLastSelected() {
    return lastSelectedId;
  }

  // ─── Subscription API ─────────────────────────────────────────────────────────

  function onChange(cb)          { changeListeners.push(cb); }
  function onSelectionChange(cb) { selectionListeners.push(cb); }
  function onNodeStateChange(cb) { stateChangeListeners.push(cb); }
  function onWireAdded(cb)       { wireAddedListeners.push(cb); }
  function onWireRemoved(cb)     { wireRemovedListeners.push(cb); }

  // ─── Internal batch helper for lifecycle.js ───────────────────────────────────
  // Removes wireIds from wireMap (firing wireRemoved per wire), removes the node,
  // resets selection if needed, then rebuilds and fires change once.
  // Used only by onDelete in lifecycle.js to replicate the exact original batching.

  function _deleteNodeBatch(uuid, wireIds) {
    for (var i = 0; i < wireIds.length; i++) {
      var removed = wireMap[wireIds[i]];
      if (removed) {
        delete wireMap[wireIds[i]];
        fireWireRemoved(removed);
      }
    }
    delete nodeMap[uuid];
    if (selectedNodeIds.has(uuid)) {
      selectedNodeIds.delete(uuid);
      if (lastSelectedId === uuid) {
        lastSelectedId = null;
        selectedNodeIds.forEach(function(sid) { lastSelectedId = sid; });
      }
      fireSelectionChange();
    }
    rebuildTempGraph();
    fireChange();
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

    // Selection
    get selectedNodeIds() { return selectedNodeIds; },
    setSelection:      setSelection,
    addToSelection:    addToSelection,
    removeFromSelection: removeFromSelection,
    clearSelection:    clearSelection,
    getLastSelected:   getLastSelected,

    // Events
    onChange:          onChange,
    onSelectionChange: onSelectionChange,
    onNodeStateChange: onNodeStateChange,
    onWireAdded:       onWireAdded,
    onWireRemoved:     onWireRemoved,

    // Internal — used by lifecycle.js only
    _deleteNodeBatch: _deleteNodeBatch
  };

}());
