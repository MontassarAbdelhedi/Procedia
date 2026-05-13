var graphState = (function() {

  // Private state — no other file may write to these directly
  var nodes = {};    // { [uuid]: { id, type, state, position, properties, ports } }
  var wires = {};    // { [wireId]: { id, fromNode, fromPort, toNode, toPort } }
  var selection = null;  // UUID of selected node, or null

  // Registered callbacks
  var selectionListeners = [];
  var changeListeners    = [];
  var stateChangeListeners = [];

  // ─── Internal helpers ─────────────────────────────────────────

  function fireSelectionChange(uuid) {
    for (var i = 0; i < selectionListeners.length; i++) {
      selectionListeners[i](uuid);
    }
  }

  function fireChange() {
    for (var i = 0; i < changeListeners.length; i++) {
      changeListeners[i]();
    }
  }

  function fireStateChange(uuid, oldState, newState) {
    for (var i = 0; i < stateChangeListeners.length; i++) {
      stateChangeListeners[i](uuid, oldState, newState);
    }
  }

  // ─── Node API ─────────────────────────────────────────────────

  function addNode(nodeData) {
    if (!nodeData || !nodeData.id) return;
    nodes[nodeData.id] = nodeData;
    fireChange();
  }

  function removeNode(uuid) {
    if (!nodes[uuid]) return;
    delete nodes[uuid];

    // Remove all wires referencing this UUID
    var wireIds = Object.keys(wires);
    for (var i = 0; i < wireIds.length; i++) {
      var wire = wires[wireIds[i]];
      if (wire.fromNode === uuid || wire.toNode === uuid) {
        delete wires[wireIds[i]];
      }
    }

    // Clear selection if we just removed the selected node
    if (selection === uuid) {
      selection = null;
      fireSelectionChange(null);
    }

    fireChange();
  }

  function updateNode(uuid, patch) {
    if (!nodes[uuid]) return;
    var n = nodes[uuid];
    var oldState = n.state;
    var keys = Object.keys(patch);
    for (var i = 0; i < keys.length; i++) {
      n[keys[i]] = patch[keys[i]];
    }
    if (patch.state !== undefined && patch.state !== oldState) {
      fireStateChange(uuid, oldState, patch.state);
    }
    fireChange();
  }

  function getNode(uuid) {
    return nodes[uuid] || null;
  }

  function getAllNodes() {
    return nodes;
  }

  // ─── Wire API ─────────────────────────────────────────────────

  function addWire(wireData) {
    if (!wireData || !wireData.id) return;
    wires[wireData.id] = wireData;
    fireChange();
  }

  function removeWire(wireId) {
    if (!wires[wireId]) return;
    delete wires[wireId];
    fireChange();
  }

  function getAllWires() {
    return wires;
  }

  function getWire(wireId) {
    return wires[wireId] || null;
  }

  // ─── Selection API ────────────────────────────────────────────

  function setSelection(uuid) {
    selection = uuid || null;
    fireSelectionChange(selection);
    fireChange();
  }

  function getSelection() {
    return selection;
  }

  // ─── Subscription API ─────────────────────────────────────────

  function onSelectionChange(callback) {
    selectionListeners.push(callback);
  }

  function onChange(callback) {
    changeListeners.push(callback);
  }

  function onNodeStateChange(callback) {
    stateChangeListeners.push(callback);
  }

  // ─── Public API ───────────────────────────────────────────────

  return {
    addNode:           addNode,
    removeNode:        removeNode,
    updateNode:        updateNode,
    getNode:           getNode,
    getAllNodes:        getAllNodes,
    addWire:           addWire,
    removeWire:        removeWire,
    getAllWires:        getAllWires,
    getWire:           getWire,
    setSelection:      setSelection,
    getSelection:      getSelection,
    onSelectionChange:  onSelectionChange,
    onChange:           onChange,
    onNodeStateChange:  onNodeStateChange
  };

}());
