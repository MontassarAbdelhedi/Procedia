// graph/graphState.js
// DEPENDS ON: data/uuidGenerator.js
// MUST LOAD BEFORE: graph/engine.js, graph/cascadeAlgorithm.js, graph/portManager.js,
//                   graph/wireValidator.js, graph/cycleChecker.js

var graphState = (function() {

  var nodeMap   = {};
  var wireMap   = {};
  var tempGraph = { version: '4.0', nodes: {}, wires: {} };
  var selection = null;
  var _onSelectionChangeCb = null;

  // --- internal helpers ---

  function rebuildTempGraph() {
    var nodes = {};
    for (var uuid in nodeMap) {
      var src  = nodeMap[uuid];
      var copy = {};
      for (var key in src) {
        if (key === 'dirty' || key === 'portSlots') continue;
        copy[key] = src[key];
      }
      nodes[uuid] = copy;
    }

    var wires = {};
    for (var wireId in wireMap) {
      var wsrc  = wireMap[wireId];
      var wcopy = {};
      for (var wkey in wsrc) {
        wcopy[wkey] = wsrc[wkey];
      }
      wires[wireId] = wcopy;
    }

    tempGraph.nodes = nodes;
    tempGraph.wires = wires;
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
    if (nodeMap[nodeData.id] !== undefined) {
      throw new Error('graphState.addNode: node already exists: ' + nodeData.id);
    }
    nodeMap[nodeData.id] = nodeData;
    rebuildTempGraph();
  }

  function removeNode(uuid) {
    if (nodeMap[uuid] === undefined) return;
    _removeWiresForNode(uuid);
    delete nodeMap[uuid];
    rebuildTempGraph();
  }

  function updateNode(uuid, patch) {
    if (nodeMap[uuid] === undefined) return;
    for (var key in patch) {
      nodeMap[uuid][key] = patch[key];
    }
    rebuildTempGraph();
  }

  function getNode(uuid) {
    return nodeMap[uuid] !== undefined ? nodeMap[uuid] : null;
  }

  function getAllNodes() {
    return nodeMap;
  }

  // --- wire operations ---

  function addWire(wireData) {
    if (!wireData || !wireData.id) {
      throw new Error('graphState.addWire: wireData.id is required');
    }
    if (wireMap[wireData.id] !== undefined) {
      throw new Error('graphState.addWire: wire already exists: ' + wireData.id);
    }
    if (wireData._pathLayerUUID === undefined) wireData._pathLayerUUID = null;
    wireMap[wireData.id] = wireData;
    rebuildTempGraph();
  }

  function updateWire(wireId, fields) {
    if (wireMap[wireId] === undefined) return;
    for (var key in fields) {
      wireMap[wireId][key] = fields[key];
    }
    rebuildTempGraph();
  }

  function removeWire(wireId) {
    if (wireMap[wireId] === undefined) return;
    delete wireMap[wireId];
    rebuildTempGraph();
  }

  function getWire(wireId) {
    return wireMap[wireId] !== undefined ? wireMap[wireId] : null;
  }

  function getAllWires() {
    return wireMap;
  }

  // --- property operations ---

  function updateProp(uuid, key, value) {
    if (nodeMap[uuid] === undefined) return;
    nodeMap[uuid].props[key] = value;
    nodeMap[uuid].dirty = true;
  }

  function clearDirty(uuid) {
    if (nodeMap[uuid] === undefined) return;
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
    nodeMap  = {};
    wireMap  = {};
    selection = null;

    if (graphData && graphData.nodes) {
      for (var uuid in graphData.nodes) {
        var src  = graphData.nodes[uuid];
        var node = {};
        for (var key in src) {
          node[key] = src[key];
        }
        if (node.dirty === undefined)     node.dirty     = false;
        if (node.portSlots === undefined) node.portSlots = {};
        nodeMap[uuid] = node;
      }
    }

    if (graphData && graphData.wires) {
      for (var wireId in graphData.wires) {
        var wsrc  = graphData.wires[wireId];
        var wire  = {};
        for (var wkey in wsrc) {
          wire[wkey] = wsrc[wkey];
        }
        if (wire._pathLayerUUID === undefined) wire._pathLayerUUID = null;
        wireMap[wireId] = wire;
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

  function getTempGraph() {
    return tempGraph;
  }

  return {
    addNode:          addNode,
    removeNode:       removeNode,
    updateNode:       updateNode,
    getNode:          getNode,
    getAllNodes:       getAllNodes,

    addWire:          addWire,
    updateWire:       updateWire,
    removeWire:       removeWire,
    getWire:          getWire,
    getAllWires:       getAllWires,

    updateProp:       updateProp,
    clearDirty:       clearDirty,

    setSelection:     setSelection,
    getSelection:     getSelection,
    onSelectionChange: onSelectionChange,

    rebuildTempGraph: rebuildTempGraph,
    loadGraph:        loadGraph,
    clearGraph:       clearGraph,
    getTempGraph:     getTempGraph
  };

})();
