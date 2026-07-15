/**
 * @fileoverview Preset Manager — save/load/delete/drop presets.
 * Presets are serialized subgraphs stored in localStorage.
 * Each preset registers as a dynamic node type under the "Presets" category.
 * @module presetManager
 */
// graph/presets/presetManager.js
// DEPENDS ON: graph/nodeRegistry.js, graph/graphState.js, data/uuidGenerator.js, data/deepClone.js
// MUST LOAD BEFORE: ui/nodeList/categories.js

var presetManager = (function() {

  var STORAGE_KEY = 'procedia_presets';
  var _presets = {};

  function _load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        _presets = JSON.parse(raw);
      } else {
        _presets = {};
      }
    } catch (e) {
      _presets = {};
    }
    return _presets;
  }

  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_presets));
    } catch (e) {
      console.warn('[presetManager] save failed:', e);
      if (typeof notificationBar !== 'undefined' && notificationBar.push) {
        notificationBar.push({
          severity: 'error',
          message: 'Failed to save preset: ' + e.message,
          duration: 4000
        });
      }
    }
  }

  function _sanitizeType(name) {
    return 'preset/' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unnamed';
  }

  function _buildNodeDef(name) {
    var typeId = _sanitizeType(name);
    return {
      type: typeId,
      label: name,
      category: 'Presets',
      version: '1.0.0',
      nodeKind: 'data',
      dedicated: false,
      _isPreset: true,
      _presetName: name,
      ports: [
        { id: 'output', category: 'output', type: 'layer', extendable: false }
      ],
      params: [
        { key: 'label', type: 'string', default: name, label: 'Label' }
      ],
      onDrop: function(nodeData) { return null; },
      onAlive: function(nodeData, hostingCompUUID) { return null; },
      onGhost: function(nodeData, hostingCompUUID) { return null; },
      onDelete: function(nodeData) { return null; },
      onPropertyChange: function(key, value, nodeData, hostingCompUUID) { return null; }
    };
  }

  function _registerPresetNode(name) {
    var typeId = _sanitizeType(name);
    if (typeof nodeRegistry.unregister === 'function') {
      nodeRegistry.unregister(typeId);
    }
    nodeRegistry.register(_buildNodeDef(name));
  }

  function _unregisterPresetNode(name) {
    var typeId = _sanitizeType(name);
    if (typeof nodeRegistry.unregister === 'function') {
      nodeRegistry.unregister(typeId);
    }
  }

  function init() {
    _load();
    for (var name in _presets) {
      if (_presets.hasOwnProperty(name)) {
        _registerPresetNode(name);
      }
    }
  }

  function listPresets() {
    return Object.keys(_presets);
  }

  function getPreset(name) {
    return _presets.hasOwnProperty(name) ? _presets[name] : null;
  }

  function savePreset(name, nodeIds) {
    if (!name || name.trim() === '') return false;
    name = name.trim();

    var presetNodes = [];
    var includedIds = {};
    for (var i = 0; i < nodeIds.length; i++) {
      var node = graphState.getNode(nodeIds[i]);
      if (!node) continue;
      includedIds[node.id] = true;
      presetNodes.push({
        id: node.id,
        type: node.type,
        nodeKind: node.nodeKind,
        dedicated: node.dedicated,
        props: window.__procedia_internal.deepClone(node.props),
        x: node.x,
        y: node.y,
        dynamicSchema: node.dynamicSchema ? window.__procedia_internal.deepClone(node.dynamicSchema) : null,
        secondaryPorts: node.secondaryPorts ? window.__procedia_internal.deepClone(node.secondaryPorts) : null,
        locked: !!node.locked,
        disabled: !!node.disabled,
        collapsed: !!node.collapsed,
        hasParkedLayer: !!node.hasParkedLayer
      });
    }

    if (presetNodes.length === 0) return false;

    var allWires = graphState.getAllWires();
    var presetWires = [];
    for (var wid in allWires) {
      if (!allWires.hasOwnProperty(wid)) continue;
      var w = allWires[wid];
      if (includedIds[w.fromNode] && includedIds[w.toNode]) {
        presetWires.push({
          id: w.id,
          fromNode: w.fromNode,
          toNode: w.toNode,
          fromPort: w.fromPort,
          toPort: w.toPort,
          type: w.type
        });
      }
    }

    var minX = Infinity, minY = Infinity;
    for (var ni = 0; ni < presetNodes.length; ni++) {
      if (presetNodes[ni].x < minX) minX = presetNodes[ni].x;
      if (presetNodes[ni].y < minY) minY = presetNodes[ni].y;
    }
    for (var n2 = 0; n2 < presetNodes.length; n2++) {
      presetNodes[n2].x -= minX;
      presetNodes[n2].y -= minY;
    }

    _presets[name] = {
      name: name,
      nodes: presetNodes,
      wires: presetWires
    };

    _save();
    _registerPresetNode(name);

    return true;
  }

  function deletePreset(name) {
    if (!_presets.hasOwnProperty(name)) return false;
    delete _presets[name];
    _save();
    _unregisterPresetNode(name);
    return true;
  }

  function dropPreset(name, x, y) {
    var preset = _presets[name];
    if (!preset || !preset.nodes || preset.nodes.length === 0) return null;

    if (typeof undoManager !== 'undefined') undoManager.capture();

    var idMap = {};
    var newNodeIds = [];
    for (var i = 0; i < preset.nodes.length; i++) {
      var oldId = preset.nodes[i].id;
      var newId = uuidGenerator.node();
      idMap[oldId] = newId;
      newNodeIds.push(newId);
    }

    var firstNodeId = null;
    for (var ni = 0; ni < preset.nodes.length; ni++) {
      var srcNode = preset.nodes[ni];
      var newNode = window.__procedia_internal.deepClone(srcNode);
      newNode.id = idMap[srcNode.id];
      newNode.x = x + srcNode.x;
      newNode.y = y + srcNode.y;
      newNode.state = 'ghost';
      newNode.hostingComps = [];
      newNode.hasParkedLayer = false;
      newNode.dirty = false;

      graphState.addNode(newNode);
      if (firstNodeId === null) firstNodeId = newNode.id;
    }

    var newWireIds = [];
    for (var wi = 0; wi < preset.wires.length; wi++) {
      var srcWire = preset.wires[wi];
      var newWire = {
        id: uuidGenerator.wire(),
        fromNode: idMap[srcWire.fromNode],
        toNode: idMap[srcWire.toNode],
        fromPort: srcWire.fromPort,
        toPort: srcWire.toPort,
        type: srcWire.type || 'layer'
      };
      graphState.addWire(newWire);
      newWireIds.push(newWire.id);
    }

    graphState.replaceSelection(newNodeIds);

    if (typeof undoManager !== 'undefined') undoManager.commit('Drop Preset ' + name);

    if (typeof window.__procedia_internal !== 'undefined' &&
        typeof window.__procedia_internal.refreshUI === 'function') {
      window.__procedia_internal.refreshUI({ minimap: false });
    }

    return {
      nodeIds: newNodeIds,
      wireIds: newWireIds
    };
  }

  init();

  return {
    listPresets: listPresets,
    getPreset: getPreset,
    savePreset: savePreset,
    deletePreset: deletePreset,
    dropPreset: dropPreset
  };

})();
