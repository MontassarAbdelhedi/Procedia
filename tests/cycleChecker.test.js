import { describe, it, expect, beforeEach } from 'vitest';
import { loadGlobalScript } from './setup.js';

loadGlobalScript('graph/cycleChecker.js');

describe('cycleChecker', () => {
  let graphState;

  beforeEach(() => {
    graphState = {
      _wires: {},
      getAllWires() { return this._wires; },
    };
    window.graphState = graphState;
  });

  const checker = () => window.cycleChecker;

  function addWire(id, fromNode, toNode, type) {
    graphState._wires[id] = { id, fromNode, toNode, type: type || 'layer' };
  }

  it('exposes hasCycle function', () => {
    expect(typeof checker().hasCycle).toBe('function');
  });

  it('returns true for self-loop (A -> A is always a cycle)', () => {
    expect(checker().hasCycle('A', 'A')).toBe(true);
  });

  it('returns false for a simple chain', () => {
    addWire('w1', 'A', 'B', 'layer');
    addWire('w2', 'B', 'C', 'layer');
    expect(checker().hasCycle('A', 'C')).toBe(false);
  });

  it('detects a cycle from A -> C when C -> A exists', () => {
    addWire('w1', 'A', 'B', 'layer');
    addWire('w2', 'B', 'C', 'layer');
    addWire('w3', 'C', 'A', 'layer');
    expect(checker().hasCycle('A', 'C')).toBe(true);
  });

  it('ignores data-type wires in cycle detection', () => {
    addWire('w1', 'A', 'B', 'data');
    addWire('w2', 'B', 'C', 'data');
    expect(checker().hasCycle('A', 'C')).toBe(false);
  });

  it('handles diamond-shaped graphs with no cycle', () => {
    addWire('w1', 'A', 'B', 'layer');
    addWire('w2', 'A', 'C', 'layer');
    addWire('w3', 'B', 'D', 'layer');
    addWire('w4', 'C', 'D', 'layer');
    expect(checker().hasCycle('A', 'D')).toBe(false);
  });

  it('handles self-referencing wire', () => {
    addWire('w1', 'A', 'A', 'layer');
    expect(checker().hasCycle('A', 'A')).toBe(true);
  });
});
