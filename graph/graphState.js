// graph/graphState.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: graph/schemaCache.js, graph/engine.js, graph/cascadeAlgorithm.js,
//                   graph/portManager.js, graph/wireValidator.js, graph/cycleChecker.js

var graphState = (function() {

  var nodeMap   = {};
  var wireMap   = {};
  var tempGraph = { version: '4.0', nodes: {}, wires: {} };
  var selection = null;
  var _onSelectionChangeCb = null;

  var _strippedNodeFields = {
    dirty:                true,
    dynamicSchema:        true,
    secondaryPorts:       true,
    _transplantLayerUUID: true
  };

  // --- internal helpers ---

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

  function removeNode(uuid) {
    if (!nodeMap.hasOwnProperty(uuid)) return;
    _removeWiresForNode(uuid);
    delete nodeMap[uuid];
    rebuildTempGraph();
  }

  function updateNode(uuid, patch) {
    if (!nodeMap.hasOwnProperty(uuid)) return;
    var node = nodeMap[uuid];
    for (var key in patch) {
      node[key] = patch[key];
    }
    rebuildTempGraph();
  }

  function getNode(uuid) {
    return nodeMap.hasOwnProperty(uuid) ? nodeMap[uuid] : null;
  }

  function getAllNodes() {
    return nodeMap;
  }

  // --- wire operations ---

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

  function removeWire(wireId) {
    if (!wireMap.hasOwnProperty(wireId)) return;
    delete wireMap[wireId];
    rebuildTempGraph();
  }

  function updateWire(wireId, patch) {
    if (!wireMap.hasOwnProperty(wireId)) return;
    var wire = wireMap[wireId];
    for (var key in patch) {
      wire[key] = patch[key];
    }
    rebuildTempGraph();
  }

  function getWire(wireId) {
    return wireMap.hasOwnProperty(wireId) ? wireMap[wireId] : null;
  }

  function getAllWires() {
    return wireMap;
  }

  // --- property operations ---

  function updateProp(uuid, key, value) {
    if (!nodeMap.hasOwnProperty(uuid)) return;
    nodeMap[uuid].props[key] = value;
    nodeMap[uuid].dirty = true;
  }

  function clearDirty(uuid) {
    if (!nodeMap.hasOwnProperty(uuid)) return;
    nodeMap[uuid].dirty = false;
  }

  // --- selection ---

  function setSelection(uuid) {
    selection = uuid;
    if (_onSelectionChangeCb) {
      _onSelectionChangeCb(uuid);
    }
  }

  function getSelection() {
    return selection;
  }

  function onSelectionChange(callback) {
    _onSelectionChangeCb = callback;
  }

  // --- graph operations ---

  function loadGraph(graphData) {
    nodeMap   = {};
    wireMap   = {};
    selection = null;

    if (graphData && graphData.nodes) {
      for (var nodeId in graphData.nodes) {
        var node = graphData.nodes[nodeId];
        nodeMap[nodeId] = node;
        if (node.dirty         === undefined) node.dirty         = false;
        if (node.hasParkedLayer=== undefined) node.hasParkedLayer= false;
        if (node.secondaryPorts === undefined) node.secondaryPorts = null;
        if (node.dynamicSchema === undefined) node.dynamicSchema = null;
      }
    }

    if (graphData && graphData.wires) {
      for (var wireId in graphData.wires) {
        wireMap[wireId] = graphData.wires[wireId];
      }
    }

    rebuildTempGraph();
  }

  function clearGraph() {
    nodeMap   = {};
    wireMap   = {};
    tempGraph = { version: '4.0', nodes: {}, wires: {} };
    selection = null;
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

    setSelection:      setSelection,
    getSelection:      getSelection,
    onSelectionChange: onSelectionChange,

    rebuildTempGraph:  rebuildTempGraph,
    loadGraph:         loadGraph,
    clearGraph:        clearGraph
  };

})();
