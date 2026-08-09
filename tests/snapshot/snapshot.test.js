/**
 * Snapshot layer unit tests.
 * Tests: schema validation, checksum determinism, canonicalization,
 *        serialization round-trips, runtime field stripping.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { loadGlobalScript } from '../setup.js';

// Load dependencies in order
beforeEach(function() {
  globalThis.__procedia_internal = {};
});

function loadSnapshotInfra() {
  loadGlobalScript('versioning/snapshot/snapshotSchema.js');
  loadGlobalScript('versioning/snapshot/snapshotChecksum.js');
  loadGlobalScript('versioning/snapshot/snapshotCanonicalizer.js');
}

describe('vcChecksum', function() {

  it('produces deterministic checksums', function() {
    loadGlobalScript('versioning/snapshot/snapshotChecksum.js');

    var a = vcChecksum.checksum({ nodes: { a: 1 }, wires: { b: 2 } });
    var b = vcChecksum.checksum({ nodes: { a: 1 }, wires: { b: 2 } });
    expect(a).toBe(b);
  });

  it('produces different checksums for different values', function() {
    loadGlobalScript('versioning/snapshot/snapshotChecksum.js');

    var a = vcChecksum.checksum({ x: 1 });
    var b = vcChecksum.checksum({ x: 2 });
    expect(a).not.toBe(b);
  });

  it('produces consistent length hex strings', function() {
    loadGlobalScript('versioning/snapshot/snapshotChecksum.js');

    var c = vcChecksum.checksum('hello');
    expect(typeof c).toBe('string');
    expect(c.length).toBe(8);
  });

  it('verify returns true for correct checksums', function() {
    loadGlobalScript('versioning/snapshot/snapshotChecksum.js');

    var val = { test: 123 };
    var csum = vcChecksum.checksum(val);
    expect(vcChecksum.verify(val, csum)).toBe(true);
    expect(vcChecksum.verify(val, 'deadbeef')).toBe(false);
  });

  it('handles nested objects', function() {
    loadGlobalScript('versioning/snapshot/snapshotChecksum.js');

    var a = { deep: { nested: { value: [1, 2, 3] } } };
    var b = { deep: { nested: { value: [1, 2, 3] } } };
    expect(vcChecksum.checksum(a)).toBe(vcChecksum.checksum(b));
  });

});

describe('vcCanonicalizer', function() {

  it('sorts object keys lexically', function() {
    loadGlobalScript('versioning/snapshot/snapshotCanonicalizer.js');

    var obj = { zebra: 1, apple: 2, banana: 3 };
    var result = vcCanonicalizer.canonicalize(obj);
    var keys = Object.keys(result);
    expect(keys).toEqual(['apple', 'banana', 'zebra']);
  });

  it('preserves array order', function() {
    loadGlobalScript('versioning/snapshot/snapshotCanonicalizer.js');

    var arr = [3, 1, 2];
    var result = vcCanonicalizer.canonicalize(arr);
    expect(result).toEqual([3, 1, 2]);
  });

  it('recursively sorts nested objects', function() {
    loadGlobalScript('versioning/snapshot/snapshotCanonicalizer.js');

    var obj = { z: { c: 1, a: 2 }, a: { y: 3, x: 4 } };
    var result = vcCanonicalizer.canonicalize(obj);
    var keys = Object.keys(result);
    expect(keys).toEqual(['a', 'z']);
    expect(Object.keys(result.a)).toEqual(['x', 'y']);
    expect(Object.keys(result.z)).toEqual(['a', 'c']);
  });

  it('canonicalizeGraph sorts nodes and wires by UUID', function() {
    loadGlobalScript('versioning/snapshot/snapshotCanonicalizer.js');

    var graph = {
      nodes: { 'PROC-c': { id: 'PROC-c' }, 'PROC-a': { id: 'PROC-a' }, 'PROC-b': { id: 'PROC-b' } },
      wires: { 'WIRE-z': { id: 'WIRE-z' }, 'WIRE-x': { id: 'WIRE-x' } }
    };
    var result = vcCanonicalizer.canonicalizeGraph(graph);

    var nodeKeys = Object.keys(result.nodes);
    expect(nodeKeys).toEqual(['PROC-a', 'PROC-b', 'PROC-c']);
    var wireKeys = Object.keys(result.wires);
    expect(wireKeys).toEqual(['WIRE-x', 'WIRE-z']);
  });

  it('produces identical JSON for differently-ordered input', function() {
    loadGlobalScript('versioning/snapshot/snapshotCanonicalizer.js');

    var graph1 = { nodes: { 'PROC-b': { id: 'PROC-b', props: { opacity: 100 } }, 'PROC-a': { id: 'PROC-a' } }, wires: {} };
    var graph2 = { nodes: { 'PROC-a': { id: 'PROC-a' }, 'PROC-b': { id: 'PROC-b', props: { opacity: 100 } } }, wires: {} };

    var canon1 = vcCanonicalizer.canonicalizeGraph(graph1);
    var canon2 = vcCanonicalizer.canonicalizeGraph(graph2);

    expect(JSON.stringify(canon1)).toBe(JSON.stringify(canon2));
  });

});

describe('vcSnapshotSchema', function() {

  it('validates a minimal valid snapshot', function() {
    loadSnapshotInfra();

    var snapshot = {
      id: 'SNAP-abc',
      graphSchemaVersion: 1,
      checksum: 'abc12345',
      graph: {
        nodes: { 'PROC-1': { id: 'PROC-1', type: 'layers/text' } },
        wires: { 'WIRE-1': { id: 'WIRE-1', fromNode: 'PROC-1', toNode: 'PROC-2', fromPort: 'output', toPort: 'main_input' } }
      }
    };

    var result = vcSnapshotSchema.validateSnapshot(snapshot);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects snapshot missing required node fields', function() {
    loadSnapshotInfra();

    var snapshot = {
      id: 'SNAP-x',
      graphSchemaVersion: 1,
      checksum: 'abc',
      graph: {
        nodes: { 'PROC-1': { type: 'layers/text' } },  // missing 'id'
        wires: {}
      }
    };

    var result = vcSnapshotSchema.validateSnapshot(snapshot);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('strips runtime fields from nodes', function() {
    loadSnapshotInfra();

    var node = {
      id: 'PROC-x',
      type: 'layers/text',
      dirty: true,
      hostingComps: ['COMP-1'],
      state: 'alive',
      props: { opacity: 100 }
    };

    vcSnapshotSchema.stripNodeRuntimeFields(node);
    expect(node.dirty).toBeUndefined();
    expect(node.hostingComps).toBeUndefined();
    expect(node.state).toBe('alive'); // state is kept in snapshot
    expect(node.id).toBe('PROC-x');
    expect(node.props).toBeDefined();
  });

  it('strips runtime fields from wires', function() {
    loadSnapshotInfra();

    var wire = {
      id: 'WIRE-x',
      fromNode: 'PROC-a',
      toNode: 'PROC-b',
      fromPort: 'output',
      toPort: 'main_input',
      _pathLayerUUID: 'WIRE-x'
    };

    vcSnapshotSchema.stripWireRuntimeFields(wire);
    expect(wire._pathLayerUUID).toBeUndefined();
    expect(wire.id).toBe('WIRE-x');
  });

});
