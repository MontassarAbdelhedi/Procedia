var graphState = (function() {

  // Private state — no other file may write to these directly
  var nodes = {};    // { [uuid]: { id, type, state, position, properties, ports } }
  var wires = {};    // { [wireId]: { id, fromNode, fromPort, toNode, toPort } }
  var selection = null;  // UUID of selected node, or null

  // Registered callbacks
  var selectionListeners = [];
  var changeListeners = [];

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
    var node = nodes[uuid];
    var keys = Object.keys(patch);
    for (var i = 0; i < keys.length; i++) {
      node[keys[i]] = patch[keys[i]];
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
    onSelectionChange: onSelectionChange,
    onChange:          onChange
  };

}());
