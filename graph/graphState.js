/**
 * In-memory graph state: holds all nodes, wires, and selection state.
 * Provides CRUD operations for nodes and wires, a dirty-flag system,
 * multi-select tracking, and a stripped temp-graph snapshot used by
 * downstream modules (schemaCache, engine, cascade, etc.).
 * @module graphState
 * @dependencies none
 * @exports addNode, removeNode, updateNode, getNode, getAllNodes,
 *          addWire, removeWire, updateWire, getWire, getAllWires,
 *          updateProp, clearDirty,
 *          setSelection, getSelection, addToSelection, removeFromSelection,
 *          toggleSelection, isSelected, clearSelection, replaceSelection,
 *          getSelectionCount, onSelectionChange,
 *          rebuildTempGraph, loadGraph, clearGraph
 */
// graph/graphState.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: graph/schemaCache.js, graph/engine/index.js, graph/cascade/index.js,
//                   graph/portManager.js, graph/wireValidator.js, graph/cycleChecker.js

var graphState = (function() {

  var nodeMap   = {};
  var wireMap   = {};
  var tempGraph = { version: '4.0', nodes: {}, wires: {} };
  var selection = [];
  var _onSelectionChangeCb = null;

  var _strippedNodeFields = {
    dirty:                true,
    dynamicSchema:        true,
    secondaryPorts:       true,
    _transplantLayerUUID: true
  };

  // --- internal helpers ---

  /**
   * Rebuilds the stripped tempGraph snapshot from nodeMap and wireMap.
   * Strips internal fields (dirty, dynamicSchema, secondaryPorts, _transplantLayerUUID)
   * from node copies so the temp graph is safe for external consumers.
   */
  function rebuildTempGraph() {
    var newNodes = {};
    var newWires = {};

    for (var nodeId in nodeMap) {
      var srcNode  = nodeMap[nodeId];
      var copyNode = {};
      for (var field in srcNode) {
        if (!_strippedNodeFields[field]) {
          copyNode[field] = srcNode[field];
        }
      }
      newNodes[nodeId] = copyNode;
    }

    for (var wireId in wireMap) {
      var srcWire  = wireMap[wireId];
      var copyWire = {};
      for (var wfield in srcWire) {
        copyWire[wfield] = srcWire[wfield];
      }
      newWires[wireId] = copyWire;
    }

    tempGraph.nodes = newNodes;
    tempGraph.wires = newWires;
  }

  /**
   * Removes all wires connected to a given node UUID.
   * @param {string} uuid - Node identifier
   */
  function _removeWiresForNode(uuid) {
    var toRemove = [];
    for (var wireId in wireMap) {
      var wire = wireMap[wireId];
      if (wire.fromNode === uuid || wire.toNode === uuid) {
        toRemove.push(wireId);
      }
    }
    for (var i = 0; i < toRemove.length; i++) {
      delete wireMap[toRemove[i]];
    }
  }

  // --- node operations ---

  /**
   * Registers a new node in the graph state.
   * @param {Object} nodeData - Node data object with a unique id
   * @throws {Error} If nodeData.id is missing or already exists
   */
  function addNode(nodeData) {
    if (!nodeData || !nodeData.id) {
      throw new Error('graphState.addNode: nodeData.id is required');
    }
    if (nodeMap.hasOwnProperty(nodeData.id)) {
      throw new Error('graphState.addNode: node already exists: ' + nodeData.id);
    }
    nodeMap[nodeData.id] = nodeData;
    rebuildTempGraph();
  }

  /**
   * Removes a node and all wires connected to it.
   * @param {string} uuid - Node identifier to remove
   */
  function removeNode(uuid) {
    if (!nodeMap.hasOwnProperty(uuid)) return;
    _removeWiresForNode(uuid);
    delete nodeMap[uuid];
    rebuildTempGraph();
  }

  /**
   * Applies a partial patch to an existing node.
   * @param {string} uuid - Node identifier
   * @param {Object} patch - Key/value pairs to merge onto the node
   */
  function updateNode(uuid, patch) {
    if (!nodeMap.hasOwnProperty(uuid)) return;
    var node = nodeMap[uuid];
    for (var key in patch) {
      node[key] = patch[key];
    }
    rebuildTempGraph();
  }

  /**
   * Retrieves a node by UUID.
   * @param {string} uuid - Node identifier
   * @returns {Object|null} The node data, or null if not found
   */
  function getNode(uuid) {
    return nodeMap.hasOwnProperty(uuid) ? nodeMap[uuid] : null;
  }

  /**
   * Returns the entire node map (all nodes).
   * @returns {Object} Map of node uuid -> node data
   */
  function getAllNodes() {
    return nodeMap;
  }

  // --- wire operations ---

  /**
   * Registers a new wire in the graph state.
   * @param {Object} wireData - Wire data object with a unique id
   * @throws {Error} If wireData.id is missing or already exists
   */
  function addWire(wireData) {
    if (!wireData || !wireData.id) {
      throw new Error('graphState.addWire: wireData.id is required');
    }
    if (wireMap.hasOwnProperty(wireData.id)) {
      throw new Error('graphState.addWire: wire already exists: ' + wireData.id);
    }
    wireMap[wireData.id] = wireData;
    rebuildTempGraph();
  }

  /**
   * Removes a wire by its ID.
   * @param {string} wireId - Wire identifier to remove
   */
  function removeWire(wireId) {
    if (!wireMap.hasOwnProperty(wireId)) return;
    delete wireMap[wireId];
    rebuildTempGraph();
  }

  /**
   * Applies a partial patch to an existing wire.
   * @param {string} wireId - Wire identifier
   * @param {Object} patch - Key/value pairs to merge onto the wire
   */
  function updateWire(wireId, patch) {
    if (!wireMap.hasOwnProperty(wireId)) return;
    var wire = wireMap[wireId];
    for (var key in patch) {
      wire[key] = patch[key];
    }
    rebuildTempGraph();
  }

  /**
   * Retrieves a wire by its ID.
   * @param {string} wireId - Wire identifier
   * @returns {Object|null} The wire data, or null if not found
   */
  function getWire(wireId) {
    return wireMap.hasOwnProperty(wireId) ? wireMap[wireId] : null;
  }

  /**
   * Returns the entire wire map (all wires).
   * @returns {Object} Map of wire id -> wire data
   */
  function getAllWires() {
    return wireMap;
  }

  // --- property operations ---

  /**
   * Sets a property value on a node and marks the node as dirty.
   * @param {string} uuid - Node identifier
   * @param {string} key - Property key
   * @param {*} value - Property value
   */
  function updateProp(uuid, key, value) {
    if (!nodeMap.hasOwnProperty(uuid)) return;
    var node = nodeMap[uuid];
    if (!node.props) node.props = {};
    node.props[key] = value;
    node.dirty = true;
  }

  /**
   * Clears the dirty flag on a node.
   * @param {string} uuid - Node identifier
   */
  function clearDirty(uuid) {
    if (!nodeMap.hasOwnProperty(uuid)) return;
    nodeMap[uuid].dirty = false;
  }

  // --- selection (multi-select) ---

  /**
   * Fires the selection-change callback, if one is registered.
   */
  function _fireSelectionChange() {
    if (_onSelectionChangeCb) {
      _onSelectionChangeCb(selection);
    }
  }

  /**
   * Replaces the selection with a single UUID (or clears it if uuid is null).
   * @param {string|null} uuid - Node to select, or null to clear
   */
  function setSelection(uuid) {
    if (uuid === null || uuid === undefined) {
      selection = [];
    } else {
      selection = [uuid];
    }
    _fireSelectionChange();
  }

  /**
   * Returns the current selection array.
   * @returns {string[]} Array of selected UUIDs
   */
  function getSelection() {
    return selection;
  }

  /**
   * Adds a UUID to the selection if not already present.
   * @param {string} uuid - Node identifier to add
   */
  function addToSelection(uuid) {
    if (selection.indexOf(uuid) === -1) {
      selection.push(uuid);
    }
    _fireSelectionChange();
  }

  /**
   * Removes a UUID from the selection.
   * @param {string} uuid - Node identifier to remove
   */
  function removeFromSelection(uuid) {
    var idx = selection.indexOf(uuid);
    if (idx !== -1) {
      selection.splice(idx, 1);
    }
    _fireSelectionChange();
  }

  /**
   * Toggles a UUID in the selection (add if absent, remove if present).
   * @param {string} uuid - Node identifier to toggle
   */
  function toggleSelection(uuid) {
    var idx = selection.indexOf(uuid);
    if (idx !== -1) {
      selection.splice(idx, 1);
    } else {
      selection.push(uuid);
    }
    _fireSelectionChange();
  }

  /**
   * Checks whether a UUID is currently selected.
   * @param {string} uuid - Node identifier
   * @returns {boolean} True if selected
   */
  function isSelected(uuid) {
    return selection.indexOf(uuid) !== -1;
  }

  /**
   * Clears the entire selection.
   */
  function clearSelection() {
    selection = [];
    _fireSelectionChange();
  }

  /**
   * Returns the number of selected items.
   * @returns {number} Selection count
   */
  function getSelectionCount() {
    return selection.length;
  }

  /**
   * Replaces the selection with an array of UUIDs.
   * @param {string[]} uuids - Array of node identifiers (non-array input clears selection)
   */
  function replaceSelection(uuids) {
    if (!Array.isArray(uuids)) {
      selection = [];
    } else {
      selection = uuids.slice();
    }
    _fireSelectionChange();
  }

  /**
   * Registers a callback to fire whenever the selection changes.
   * @param {Function} callback - Called with the current selection array
   */
  function onSelectionChange(callback) {
    _onSelectionChangeCb = callback;
  }

  // --- graph operations ---

  /**
   * Replaces the entire graph state with the given graph data.
   * Initialises default fields (dirty, hasParkedLayer, secondaryPorts,
   * dynamicSchema, locked) where missing.
   * @param {Object} graphData - Object with nodes and wires maps
   */
  function loadGraph(graphData) {
    nodeMap   = {};
    wireMap   = {};
    selection = [];

    if (graphData && graphData.nodes) {
      for (var nodeId in graphData.nodes) {
        var node = graphData.nodes[nodeId];
        nodeMap[nodeId] = node;
        if (node.dirty         === undefined) node.dirty         = false;
        if (node.hasParkedLayer=== undefined) node.hasParkedLayer= false;
        if (node.secondaryPorts === undefined) node.secondaryPorts = null;
        if (node.dynamicSchema === undefined) node.dynamicSchema = null;
        if (node.locked === undefined) node.locked = false;
      }
    }

    if (graphData && graphData.wires) {
      for (var wireId in graphData.wires) {
        wireMap[wireId] = graphData.wires[wireId];
      }
    }

    rebuildTempGraph();
  }

  /**
   * Resets the graph state to empty (no nodes, no wires, no selection).
   */
  function clearGraph() {
    nodeMap   = {};
    wireMap   = {};
    tempGraph = { version: '4.0', nodes: {}, wires: {} };
    selection = [];
  }

  return {
    addNode:           addNode,
    removeNode:        removeNode,
    updateNode:        updateNode,
    getNode:           getNode,
    getAllNodes:        getAllNodes,

    addWire:           addWire,
    removeWire:        removeWire,
    updateWire:        updateWire,
    getWire:           getWire,
    getAllWires:        getAllWires,

    updateProp:        updateProp,
    clearDirty:        clearDirty,

    setSelection:        setSelection,
    getSelection:        getSelection,
    addToSelection:      addToSelection,
    removeFromSelection: removeFromSelection,
    toggleSelection:     toggleSelection,
    isSelected:          isSelected,
    clearSelection:      clearSelection,
    replaceSelection:    replaceSelection,
    getSelectionCount:   getSelectionCount,
    onSelectionChange:   onSelectionChange,

    rebuildTempGraph:  rebuildTempGraph,
    loadGraph:         loadGraph,
    clearGraph:        clearGraph
  };

})();
