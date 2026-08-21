import { describe, it, expect, beforeEach } from 'vitest';
import { loadGlobalScript } from '../setup.js';

describe('propagateAlive wire insertion', function() {
  var resolveRestamp;
  var dispatched;
  var nodes;
  var wires;

  beforeEach(function() {
    window.__procedia_internal = {
      deepClone: function(value) { return value; },
      registry: {
        get: function(name) {
          if (name === 'hlp') return {
            findPathLayerUUID: function() { return 'WIRE-new'; }
          };
        },
        register: function() {}
      },
      lifecycle: {
        buildLifecycleCommand: function(node, def, hookName, key, value, hostUUID) {
          return def[hookName](node, hostUUID, 'WIRE-old');
        }
      }
    };
    nodes = {
      'PROC-fill': {
        id: 'PROC-fill',
        type: 'effects/fill',
        nodeKind: 'effector',
        hostingComps: [],
        _transplantLayerUUID: 'WIRE-old',
        props: {}
      }
    };
    wires = {
      'WIRE-upstream': { id: 'WIRE-upstream', type: 'layer', fromNode: 'PROC-solid', toNode: 'PROC-fill' }
    };
    window.graphState = {
      getNode: function(id) { return nodes[id] || null; },
      getAllWires: function() { return wires; },
      updateNode: function(id, patch) {
        for (var key in patch) nodes[id][key] = patch[key];
      },
      updateWire: function() {},
    };
    window.nodeRegistry = {
      getDefinition: function() {
        return {
          onAlive: function(node, host, layerUUID) {
            return { action: 'applyDynamicEffect', params: { layerNodeUUID: layerUUID } };
          }
        };
      }
    };
    window.cascadeAlgorithm = { isCompNode: function() { return false; } };
    window.dirtyFlusher = { flush: function() {} };
    dispatched = [];
    window.evalBridge = {
      dispatch: function(command) {
        dispatched.push(command);
        if (command.action === 'restampLayer') {
          return new Promise(function(resolve) { resolveRestamp = resolve; });
        }
        return Promise.resolve({ ok: true });
      }
    };
    loadGlobalScript('graph/engine/propagate.js');
  });

  it('waits for restamp before applying a newly inserted effect', async function() {
    window.__procedia_internal.prop.propagateAlive('PROC-fill', 'PROC-comp', 'WIRE-new');

    expect(dispatched.map(function(command) { return command.action; })).toEqual(['restampLayer']);

    resolveRestamp({ ok: true });
    await Promise.resolve();
    await Promise.resolve();

    expect(dispatched.map(function(command) { return command.action; })).toEqual([
      'restampLayer',
      'applyDynamicEffect'
    ]);
    expect(dispatched[1].params.layerNodeUUID).toBe('WIRE-new');
  });
});
