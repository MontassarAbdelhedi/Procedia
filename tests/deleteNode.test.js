import { describe, it, expect, beforeEach } from 'vitest';
import { loadGlobalScript } from './setup.js';

const modules = {};
window.__procedia_internal.registry = {
  get(name) { return modules[name]; },
  register(name, value) { modules[name] = value; },
};

loadGlobalScript('graph/engine/nodes/deleteNode/wireUtils.js');
modules.hlp = { findPathLayerUUID: () => null, refreshNodeUI: () => {} };
modules.lifecycle = { buildLifecycleCommand: () => null };
window.__procedia_internal.lifecycle = modules.lifecycle;
loadGlobalScript('graph/engine/nodes/deleteNode.js');

describe('deleteNode layer bypass', () => {
  beforeEach(() => {
    const wires = {};
    window.graphState = {
      getActiveComp: () => 'C',
      getNode: (id) => id === 'B' ? {
        id: 'B', nodeKind: 'effector', state: 'alive', hostingComps: ['C'], type: 'effects/test',
      } : { id, nodeKind: 'affected', state: 'alive', hostingComps: ['C'], type: 'layers/test' },
      getAllWires: () => wires,
      updateWire: (id, patch) => Object.assign(wires[id], patch),
      removeWire: (id) => { delete wires[id]; },
      removeNode: (id) => {
        Object.keys(wires).forEach((wireId) => {
          if (wires[wireId].fromNode === id || wires[wireId].toNode === id) delete wires[wireId];
        });
      },
      removeFromSelection: () => {},
    };
    window.nodeRegistry = { getDefinition: () => ({}) };
    window.evalBridge = { dispatch: () => {}, dispatchBatch: () => {} };
    window.cascadeAlgorithm = { isCompNode: () => false, cascadeGhost: () => {} };
  });

  function addWire(id, fromNode, toNode) {
    window.graphState.getAllWires()[id] = {
      id, type: 'layer', fromNode, fromPort: 'output', toNode, toPort: 'main_input',
    };
  }

  it('rewires the previous node to the next node', () => {
    addWire('AB', 'A', 'B');
    addWire('BC', 'B', 'C');

    window.__procedia_internal.ndel.deleteNode('B');

    expect(window.graphState.getAllWires()).toEqual({
      BC: expect.objectContaining({ fromNode: 'A', toNode: 'C' }),
    });
  });

  it('does not create a duplicate when the direct wire already exists', () => {
    addWire('AB', 'A', 'B');
    addWire('BC', 'B', 'C');
    addWire('AC', 'A', 'C');

    window.__procedia_internal.ndel.deleteNode('B');

    expect(window.graphState.getAllWires()).toEqual({
      AC: expect.objectContaining({ fromNode: 'A', toNode: 'C' }),
    });
  });
});
