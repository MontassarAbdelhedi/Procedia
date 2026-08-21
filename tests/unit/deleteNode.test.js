import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadGlobalScript } from '../setup.js';

var modules = {};
var nodes = {};
var wires = {};
var selection = [];
var activeComp = null;

var refreshNodeUI = vi.fn();
var dispatch = vi.fn(function() { return Promise.resolve({ ok: true }); });
var dispatchBatch = vi.fn(function() { return Promise.resolve({ ok: true }); });
var cascadeGhost = vi.fn();

window.__procedia_internal.registry = {
  get: function(name) { return modules[name]; },
  register: function(name, module) { modules[name] = module; }
};

modules.hlp = {
  findPathLayerUUID: function() { return 'WIRE-terminal'; },
  refreshNodeUI: refreshNodeUI
};
modules.ndel_wireUtils = {
  _resolveLayerUUIDForComp: function() { return 'WIRE-terminal'; }
};

window.__procedia_internal.lifecycle = {
  buildLifecycleCommand: function(nodeData, def, hookName, key, value, hostUUID) {
    if (!def || !def[hookName]) return null;
    if (hookName === 'onGhost') {
      return def.onGhost(nodeData, hostUUID, 'WIRE-terminal');
    }
    return def[hookName](nodeData);
  }
};

window.graphState = {
  getNode: function(id) { return nodes[id] || null; },
  getAllWires: function() { return wires; },
  getActiveComp: function() { return activeComp; },
  updateWire: function(id, patch) { Object.assign(wires[id], patch); },
  removeWire: function(id) { delete wires[id]; },
  removeNode: function(id) {
    for (var wireId in wires) {
      if (wires[wireId].fromNode === id || wires[wireId].toNode === id) {
        delete wires[wireId];
      }
    }
    delete nodes[id];
  },
  removeFromSelection: function(id) {
    var index = selection.indexOf(id);
    if (index !== -1) selection.splice(index, 1);
  },
  getSelection: function() { return selection; }
};

window.nodeRegistry = {
  getDefinition: function(type) {
    if (type !== 'effects/fill') return null;
    return {
      onGhost: function(nodeData, hostingCompUUID, layerUUID) {
        return {
          action: 'removeEffect',
          params: {
            nodeUUID: nodeData.id,
            hostingCompUUID: hostingCompUUID,
            layerNodeUUID: layerUUID,
            matchName: 'ADBE Fill'
          }
        };
      },
      onDelete: function() { return null; }
    };
  }
};

window.evalBridge = {
  dispatch: dispatch,
  dispatchBatch: dispatchBatch
};

window.cascadeAlgorithm = {
  isCompNode: function() { return false; },
  cascadeGhost: cascadeGhost
};

loadGlobalScript('graph/engine/nodes/deleteNode.js');

describe('deleteNode active-comp effector bypass', function() {
  beforeEach(function() {
    nodes = {
      'PROC-footage': {
        id: 'PROC-footage',
        type: 'core/footage',
        nodeKind: 'affected',
        state: 'alive',
        hostingComps: ['PROC-compA'],
        props: { label: 'Footage' }
      },
      'PROC-fill': {
        id: 'PROC-fill',
        type: 'effects/fill',
        nodeKind: 'effector',
        state: 'alive',
        hostingComps: ['PROC-compA'],
        props: { label: 'Fill' }
      },
      'PROC-compA': {
        id: 'PROC-compA',
        type: 'core/comp',
        nodeKind: 'affected',
        dedicated: true,
        state: 'alive',
        hostingComps: [],
        props: { label: 'compA' }
      }
    };
    wires = {
      'WIRE-input': {
        id: 'WIRE-input',
        type: 'layer',
        fromNode: 'PROC-footage',
        fromPort: 'output',
        toNode: 'PROC-fill',
        toPort: 'main_input',
        _pathLayerUUID: 'WIRE-input'
      },
      'WIRE-terminal': {
        id: 'WIRE-terminal',
        type: 'layer',
        fromNode: 'PROC-fill',
        fromPort: 'output',
        toNode: 'PROC-compA',
        toPort: 'main_input',
        _pathLayerUUID: 'WIRE-terminal'
      }
    };
    selection = ['PROC-fill'];
    activeComp = 'PROC-compA';
    refreshNodeUI.mockClear();
    dispatch.mockClear();
    dispatchBatch.mockClear();
    cascadeGhost.mockClear();
  });

  it('rewires footage to the comp without parking or replacing the path layer', function() {
    modules.ndel.deleteNode('PROC-fill');

    expect(nodes['PROC-fill']).toBeUndefined();
    expect(nodes['PROC-footage'].state).toBe('alive');
    expect(nodes['PROC-footage'].hostingComps).toEqual(['PROC-compA']);
    expect(wires['WIRE-input']).toBeUndefined();
    expect(wires['WIRE-terminal']).toEqual({
      id: 'WIRE-terminal',
      type: 'layer',
      fromNode: 'PROC-footage',
      fromPort: 'output',
      toNode: 'PROC-compA',
      toPort: 'main_input',
      _pathLayerUUID: 'WIRE-terminal'
    });
    expect(cascadeGhost).not.toHaveBeenCalled();
    expect(dispatchBatch).toHaveBeenCalledWith([{
      action: 'removeEffect',
      params: {
        nodeUUID: 'PROC-fill',
        hostingCompUUID: 'PROC-compA',
        layerNodeUUID: 'WIRE-terminal',
        matchName: 'ADBE Fill'
      }
    }]);
  });

  it('keeps the existing cascade behavior when the effector path is incomplete', function() {
    delete wires['WIRE-terminal'];

    modules.ndel.deleteNode('PROC-fill');

    expect(cascadeGhost).toHaveBeenCalledWith('WIRE-input');
    expect(wires['WIRE-input']).toBeUndefined();
  });
});
