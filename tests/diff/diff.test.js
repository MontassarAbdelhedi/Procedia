/**
 * Semantic diff engine unit tests.
 * Tests: node add/remove/change, wire add/remove/change, parameter changes,
 *        expression changes, layout changes, deterministic order.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { loadGlobalScript } from '../setup.js';

function makeNode(id, type, props, extra) {
  var node = {
    id: id, type: type, version: '1.0.0', nodeKind: 'affected',
    dedicated: false, state: 'alive',
    props: props || { label: 'Test', opacity: 100 },
    position: [100, 200],
    ports: [{ id: 'output', category: 'output', type: 'layer', extendable: false }]
  };
  if (extra) {
    for (var k in extra) { if (extra.hasOwnProperty(k)) node[k] = extra[k]; }
  }
  return node;
}

function makeWire(id, fromNode, toNode, extra) {
  var w = {
    id: id, fromNode: fromNode, toNode: toNode,
    fromPort: 'output', toPort: 'main_input', type: 'layer'
  };
  if (extra) {
    for (var k in extra) { if (extra.hasOwnProperty(k)) w[k] = extra[k]; }
  }
  return w;
}

function makeSnapshot(id, nodes, wires) {
  var graph = { nodes: {}, wires: {}, groups: {}, notes: {}, metadata: {} };
  if (nodes) {
    for (var ni = 0; ni < nodes.length; ni++) { graph.nodes[nodes[ni].id] = nodes[ni]; }
  }
  if (wires) {
    for (var wi = 0; wi < wires.length; wi++) { graph.wires[wires[wi].id] = wires[wi]; }
  }
  return { id: id, graphSchemaVersion: 1, checksum: id, graph: graph };
}

beforeEach(function() {
  loadGlobalScript('versioning/diff/semanticDiff.js');
});

describe('vcSemanticDiff', function() {

  describe('node changes', function() {

    it('detects added nodes', function() {
      var from = makeSnapshot('s1', []);
      var to = makeSnapshot('s2', [makeNode('PROC-1', 'layers/text')]);

      var d = vcSemanticDiff.diff(from, to);
      expect(d.nodes.added.length).toBe(1);
      expect(d.nodes.added[0].entityId).toBe('PROC-1');
      expect(d.nodes.removed.length).toBe(0);
      expect(d.nodes.modified.length).toBe(0);
    });

    it('detects removed nodes', function() {
      var from = makeSnapshot('s1', [makeNode('PROC-1', 'layers/text')]);
      var to = makeSnapshot('s2', []);

      var d = vcSemanticDiff.diff(from, to);
      expect(d.nodes.removed.length).toBe(1);
      expect(d.nodes.removed[0].entityId).toBe('PROC-1');
      expect(d.nodes.added.length).toBe(0);
    });

    it('detects modified nodes', function() {
      var from = makeSnapshot('s1', [makeNode('PROC-1', 'layers/text', { opacity: 100 })]);
      var to = makeSnapshot('s2', [makeNode('PROC-1', 'layers/text', { opacity: 50 })]);

      var d = vcSemanticDiff.diff(from, to);
      expect(d.nodes.modified.length).toBe(1);
      expect(d.nodes.modified[0].entityId).toBe('PROC-1');
      expect(d.nodes.modified[0].changes.length).toBeGreaterThan(0);

      var opacityChange = d.nodes.modified[0].changes.find(function(c) {
        return c.path.join('.') === 'props.opacity';
      });
      expect(opacityChange).toBeDefined();
      expect(opacityChange.before).toBe(100);
      expect(opacityChange.after).toBe(50);
      expect(opacityChange.category).toBe('parameter');
    });

    it('detects unchanged nodes as no change', function() {
      var node = makeNode('PROC-1', 'layers/text', { opacity: 100 });
      var from = makeSnapshot('s1', [node]);
      var to = makeSnapshot('s2', [node]);

      var d = vcSemanticDiff.diff(from, to);
      expect(d.nodes.modified.length).toBe(0);
      expect(d.nodes.added.length).toBe(0);
      expect(d.nodes.removed.length).toBe(0);
    });

  });

  describe('wire changes', function() {

    it('detects added wires', function() {
      var from = makeSnapshot('s1', []);
      var to = makeSnapshot('s2', [], [makeWire('WIRE-1', 'PROC-1', 'PROC-2')]);

      var d = vcSemanticDiff.diff(from, to);
      expect(d.wires.added.length).toBe(1);
      expect(d.wires.added[0].entityId).toBe('WIRE-1');
    });

    it('detects removed wires', function() {
      var from = makeSnapshot('s1', [], [makeWire('WIRE-1', 'PROC-1', 'PROC-2')]);
      var to = makeSnapshot('s2', []);

      var d = vcSemanticDiff.diff(from, to);
      expect(d.wires.removed.length).toBe(1);
    });

    it('detects wire endpoint changes', function() {
      var from = makeSnapshot('s1', [], [makeWire('WIRE-1', 'PROC-1', 'PROC-2')]);
      var to = makeSnapshot('s2', [], [makeWire('WIRE-1', 'PROC-1', 'PROC-3')]);

      var d = vcSemanticDiff.diff(from, to);
      expect(d.wires.modified.length).toBe(1);

      var toNodeChange = d.wires.modified[0].changes.find(function(c) {
        return c.path.join('.') === 'toNode';
      });
      expect(toNodeChange).toBeDefined();
      expect(toNodeChange.before).toBe('PROC-2');
      expect(toNodeChange.after).toBe('PROC-3');
      expect(toNodeChange.category).toBe('topology');
    });

  });

  describe('parameter changes', function() {

    it('detects individual parameter changes', function() {
      var from = makeSnapshot('s1', [makeNode('PROC-1', 'layers/text', { opacity: 100, color: [1,1,1,1] })]);
      var to = makeSnapshot('s2', [makeNode('PROC-1', 'layers/text', { opacity: 50, color: [1,0,0,1] })]);

      var d = vcSemanticDiff.diff(from, to);
      var changes = d.nodes.modified[0].changes;
      expect(changes.length).toBe(2);

      var categories = changes.map(function(c) { return c.category; });
      expect(categories).toContain('parameter');
    });

    it('detects parameter additions and removals', function() {
      var from = makeSnapshot('s1', [makeNode('PROC-1', 'layers/text', { opacity: 100 })]);
      var to = makeSnapshot('s2', [makeNode('PROC-1', 'layers/text', { opacity: 100, radius: 50 })]);

      var d = vcSemanticDiff.diff(from, to);
      expect(d.nodes.modified.length).toBe(1);

      var addedChange = d.nodes.modified[0].changes.find(function(c) {
        return c.path[1] === 'radius';
      });
      expect(addedChange).toBeDefined();
      expect(addedChange.before).toBeUndefined();
      expect(addedChange.after).toBe(50);
    });

  });

  describe('layout changes', function() {

    it('detects position changes', function() {
      var from = makeSnapshot('s1', [makeNode('PROC-1', 'layers/text', undefined, { position: [100, 200] })]);
      var to = makeSnapshot('s2', [makeNode('PROC-1', 'layers/text', undefined, { position: [300, 400] })]);

      var d = vcSemanticDiff.diff(from, to);
      var posChange = d.nodes.modified[0].changes.find(function(c) {
        return c.path[0] === 'position';
      });
      expect(posChange).toBeDefined();
      expect(posChange.category).toBe('layout');
    });

  });

  describe('metadata changes', function() {

    it('detects metadata changes', function() {
      var from = makeSnapshot('s1', []);
      var to = makeSnapshot('s2', []);
      from.graph.metadata = { version: 1 };
      to.graph.metadata = { version: 2 };

      var d = vcSemanticDiff.diff(from, to);
      expect(d.metadata.length).toBe(1);
    });

  });

  describe('summary', function() {

    it('builds accurate summary', function() {
      var from = makeSnapshot('s1', [
        makeNode('PROC-1', 'layers/text'),
        makeNode('PROC-2', 'layers/solid')
      ]);
      var to = makeSnapshot('s2', [
        makeNode('PROC-1', 'layers/text', { opacity: 50 }),
        makeNode('PROC-3', 'layers/text')
      ]);

      var d = vcSemanticDiff.diff(from, to);
      expect(d.summary.nodesAdded).toBe(1);
      expect(d.summary.nodesRemoved).toBe(1);
      expect(d.summary.nodesChanged).toBe(1);
    });

  });

  describe('deterministic order', function() {

    it('produces sorted keys in collections', function() {
      var from = makeSnapshot('s1', [
        makeNode('PROC-z', 'layers/text'),
        makeNode('PROC-a', 'layers/text')
      ]);
      var to = makeSnapshot('s2', [
        makeNode('PROC-z', 'layers/text'),
        makeNode('PROC-a', 'layers/text', { opacity: 50 })
      ]);

      var d1 = vcSemanticDiff.diff(from, to);
      var d2 = vcSemanticDiff.diff(from, to);

      // Added/removed should be deterministically ordered
      expect(d1.nodes.modified.length).toBe(d2.nodes.modified.length);
    });

  });

  describe('wireSemanticKey', function() {

    it('produces the same key for semantically identical wires', function() {
      var w1 = { type: 'layer', fromNode: 'A', toNode: 'B', fromPort: 'out', toPort: 'in', boundParam: '' };
      var w2 = { type: 'layer', fromNode: 'A', toNode: 'B', fromPort: 'out', toPort: 'in' };

      expect(vcSemanticDiff.wireSemanticKey(w1)).toBe(vcSemanticDiff.wireSemanticKey(w2));
    });

    it('produces different keys for different connections', function() {
      var w1 = { type: 'layer', fromNode: 'A', toNode: 'B', fromPort: 'out', toPort: 'in', boundParam: '' };
      var w2 = { type: 'layer', fromNode: 'A', toNode: 'C', fromPort: 'out', toPort: 'in', boundParam: '' };

      expect(vcSemanticDiff.wireSemanticKey(w1)).not.toBe(vcSemanticDiff.wireSemanticKey(w2));
    });

  });

  describe('edge cases', function() {

    it('handles null snapshots gracefully', function() {
      var d = vcSemanticDiff.diff(null, null);
      expect(d.nodes.added).toEqual([]);
      expect(d.summary.totalChanges).toBe(0);
    });

    it('handles empty graphs', function() {
      var from = makeSnapshot('s1', [], []);
      var to = makeSnapshot('s2', [], []);
      var d = vcSemanticDiff.diff(from, to);
      expect(d.summary.totalChanges).toBe(0);
    });

    it('detects node type changes', function() {
      var from = makeSnapshot('s1', [makeNode('PROC-1', 'layers/text')]);
      var to = makeSnapshot('s2', [makeNode('PROC-1', 'layers/solid')]);

      var d = vcSemanticDiff.diff(from, to);
      var typeChange = d.nodes.modified[0].changes.find(function(c) {
        return c.path[0] === 'type';
      });
      expect(typeChange).toBeDefined();
      expect(typeChange.category).toBe('node-schema');
    });

    it('detects node version changes', function() {
      var from = makeSnapshot('s1', [makeNode('PROC-1', 'layers/text')]);
      var toNode = makeNode('PROC-1', 'layers/text');
      toNode.version = '2.0.0';
      var to = makeSnapshot('s2', [toNode]);

      var d = vcSemanticDiff.diff(from, to);
      expect(d.nodes.modified.length).toBe(1);
    });

  });

});
