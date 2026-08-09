/**
 * Merge engine unit tests.
 * Tests: merge-base selection, three-way merge rules, conflict creation,
 *        validation, conflict resolution.
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

function setupRepo(snapshot) {
  vcRepositoryStore.initRepository(snapshot);
}

function loadMerge() {
  globalThis.__procedia_internal = globalThis.__procedia_internal || {};
  globalThis.__procedia_internal.deepClone = globalThis.__procedia_internal.deepClone || function deepClone(val) {
    if (val === null || typeof val !== 'object') return val;
    if (Array.isArray(val)) { var arr = []; for (var i = 0; i < val.length; i++) arr.push(deepClone(val[i])); return arr; }
    var obj = {}; for (var k in val) { if (val.hasOwnProperty(k)) obj[k] = deepClone(val[k]); } return obj;
  };
  loadGlobalScript('versioning/snapshot/snapshotSchema.js');
  loadGlobalScript('versioning/snapshot/snapshotChecksum.js');
  loadGlobalScript('versioning/snapshot/snapshotCanonicalizer.js');
  loadGlobalScript('versioning/snapshot/snapshotSerializer.js');
  loadGlobalScript('versioning/snapshot/snapshotMigrations.js');
  loadGlobalScript('versioning/diff/semanticDiff.js');
  loadGlobalScript('versioning/merge/conflictFactory.js');
  loadGlobalScript('versioning/merge/mergeValidator.js');
  loadGlobalScript('versioning/repositoryStore.js');
  loadGlobalScript('versioning/merge/mergeBase.js');
  loadGlobalScript('versioning/merge/threeWayMerge.js');
  loadGlobalScript('versioning/merge/conflictResolver.js');
  loadGlobalScript('versioning/branchService.js');
  loadGlobalScript('versioning/revisionService.js');
  loadGlobalScript('versioning/versionControlService.js');
}

beforeEach(function() {
  globalThis.__procedia_internal = {};
  loadMerge();
});

describe('vcMergeBase', function() {

  it('finds no common ancestor for independent trees', function() {
    var snap = makeSnapshot('SNAP-root', [makeNode('PROC-0', 'layers/text')]);
    setupRepo(snap);

    var rootRevId = Object.keys(vcRepositoryStore.getRepository().revisions)[0];
    var rev1 = vcRepositoryStore.createRevision({ message: 'v1', snapshotId: 'SNAP-root', parentIds: [], kind: 'user' });
    var rev2 = vcRepositoryStore.createRevision({ message: 'v2', snapshotId: 'SNAP-root', parentIds: [], kind: 'user' });

    var result = vcMergeBase.findMergeBase(rev1, rev2);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('no_common_ancestor');
  });

  it('finds common ancestor through linear history', function() {
    var snap = makeSnapshot('SNAP-root', [makeNode('PROC-0', 'layers/text')]);
    setupRepo(snap);

    var rootRevId = Object.keys(vcRepositoryStore.getRepository().revisions)[0];
    var rev1 = vcRepositoryStore.createRevision({ message: 'v1', snapshotId: 'SNAP-root', parentIds: [rootRevId], kind: 'user' });
    var rev2 = vcRepositoryStore.createRevision({ message: 'v2', snapshotId: 'SNAP-root', parentIds: [rev1], kind: 'user' });

    var result = vcMergeBase.findMergeBase(rev1, rev2);
    expect(result.ok).toBe(true);
    expect(result.code).toBe('source_is_ancestor');
  });

  it('finds best common ancestor', function() {
    var snap = makeSnapshot('SNAP-root', [makeNode('PROC-0', 'layers/text')]);
    setupRepo(snap);

    var rootRevId = Object.keys(vcRepositoryStore.getRepository().revisions)[0];
    var rev1 = vcRepositoryStore.createRevision({ message: 'v1', snapshotId: 'SNAP-root', parentIds: [rootRevId], kind: 'user' });
    var rev2 = vcRepositoryStore.createRevision({ message: 'v2', snapshotId: 'SNAP-root', parentIds: [rootRevId], kind: 'user' });

    var result = vcMergeBase.findMergeBase(rev1, rev2);
    expect(result.ok).toBe(true);
    expect(result.mergeBaseId).toBe(rootRevId);
  });

});

describe('vcThreeWayMerge', function() {

  // Helper: set up repository with base, ours, theirs snapshots
  function setupThreeWay(baseNodes, oursNodes, theirsNodes, baseWires, oursWires, theirsWires) {
    var baseSnap = makeSnapshot('SNAP-base', baseNodes, baseWires);
    var oursSnap = makeSnapshot('SNAP-ours', oursNodes, oursWires);
    var theirsSnap = makeSnapshot('SNAP-theirs', theirsNodes, theirsWires);

    setupRepo(baseSnap);
    var rootRevId = Object.keys(vcRepositoryStore.getRepository().revisions)[0];

    vcRepositoryStore.storeSnapshot(oursSnap);
    vcRepositoryStore.storeSnapshot(theirsSnap);

    var oursRev = vcRepositoryStore.createRevision({ message: 'ours', snapshotId: 'SNAP-ours', parentIds: [rootRevId], kind: 'user' });
    var theirsRev = vcRepositoryStore.createRevision({ message: 'theirs', snapshotId: 'SNAP-theirs', parentIds: [rootRevId], kind: 'user' });

    var oursBranch = vcRepositoryStore.createBranch({ name: 'ours', snapshotId: 'SNAP-ours', headRevisionId: oursRev, baseRevisionId: oursRev });
    var theirsBranch = vcRepositoryStore.createBranch({ name: 'theirs', snapshotId: 'SNAP-theirs', headRevisionId: theirsRev, baseRevisionId: theirsRev });

    return { oursBranch: oursBranch, theirsBranch: theirsBranch };
  }

  it('merges independent node additions', function() {
    var result = setupThreeWay(
      [makeNode('PROC-base', 'layers/text')],
      [makeNode('PROC-base', 'layers/text'), makeNode('PROC-ours', 'layers/solid')],
      [makeNode('PROC-base', 'layers/text'), makeNode('PROC-theirs', 'layers/text')]
    );

    var mergeResult = vcThreeWayMerge.merge(result.theirsBranch, result.oursBranch);
    expect(mergeResult.ok).toBe(true);
    expect(mergeResult.code).toBe('merge');

    var mergedNodes = mergeResult.candidateSnapshot.graph.nodes;
    expect(mergedNodes['PROC-base']).toBeDefined();
    expect(mergedNodes['PROC-ours']).toBeDefined();
    expect(mergedNodes['PROC-theirs']).toBeDefined();
  });

  it('merges independent field changes on same node', function() {
    var result = setupThreeWay(
      [makeNode('PROC-1', 'layers/text', { opacity: 100, color: [1,1,1,1] })],
      [makeNode('PROC-1', 'layers/text', { opacity: 50, color: [1,1,1,1] })],
      [makeNode('PROC-1', 'layers/text', { opacity: 100, color: [1,0,0,1] })]
    );

    var mergeResult = vcThreeWayMerge.merge(result.theirsBranch, result.oursBranch);
    expect(mergeResult.ok).toBe(true);

    var merged = mergeResult.candidateSnapshot.graph.nodes['PROC-1'];
    expect(merged.props.opacity).toBe(50);
    expect(merged.props.color).toEqual([1, 0, 0, 1]);
  });

  it('detects same property changed differently as conflict', function() {
    var result = setupThreeWay(
      [makeNode('PROC-1', 'layers/text', { opacity: 100 })],
      [makeNode('PROC-1', 'layers/text', { opacity: 70 })],
      [makeNode('PROC-1', 'layers/text', { opacity: 40 })]
    );

    var mergeResult = vcThreeWayMerge.merge(result.theirsBranch, result.oursBranch);
    expect(mergeResult.conflicts.length).toBeGreaterThan(0);

    var hasPropertyConflict = mergeResult.conflicts.some(function(c) { return c.code === 'PROPERTY_PROPERTY'; });
    expect(hasPropertyConflict).toBe(true);
  });

  it('detects delete vs modify conflict', function() {
    var result = setupThreeWay(
      [makeNode('PROC-1', 'layers/text')],
      [makeNode('PROC-1', 'layers/text', { opacity: 50 })],
      []
    );

    var mergeResult = vcThreeWayMerge.merge(result.theirsBranch, result.oursBranch);
    expect(mergeResult.conflicts.length).toBeGreaterThan(0);

    var hasDeleteModify = mergeResult.conflicts.some(function(c) { return c.code === 'DELETE_MODIFY'; });
    expect(hasDeleteModify).toBe(true);
  });

  it('handles same-changed-to-same-value as no conflict', function() {
    var result = setupThreeWay(
      [makeNode('PROC-1', 'layers/text', { opacity: 100 })],
      [makeNode('PROC-1', 'layers/text', { opacity: 50 })],
      [makeNode('PROC-1', 'layers/text', { opacity: 50 })]
    );

    var mergeResult = vcThreeWayMerge.merge(result.theirsBranch, result.oursBranch);
    var hasOpacityConflict = mergeResult.conflicts.some(function(c) {
      return c.path && c.path.join('.') === 'props.opacity';
    });
    expect(hasOpacityConflict).toBe(false);
    expect(mergeResult.candidateSnapshot.graph.nodes['PROC-1'].props.opacity).toBe(50);
  });

  it('handles layout conflicts as non-blocking', function() {
    var result = setupThreeWay(
      [makeNode('PROC-1', 'layers/text', undefined, { position: [100, 200] })],
      [makeNode('PROC-1', 'layers/text', undefined, { position: [300, 400] })],
      [makeNode('PROC-1', 'layers/text', undefined, { position: [500, 600] })]
    );

    var mergeResult = vcThreeWayMerge.merge(result.theirsBranch, result.oursBranch);
    var layoutConflicts = mergeResult.conflicts.filter(function(c) { return c.severity === 'warning'; });
    expect(layoutConflicts.length).toBeGreaterThan(0);
    // Default resolution for layout is 'ours'
    expect(mergeResult.candidateSnapshot.graph.nodes['PROC-1'].position).toEqual([300, 400]);
  });

  it('handles fast-forward when source is ancestor', function() {
    var baseSnap = makeSnapshot('SNAP-root', [makeNode('PROC-base', 'layers/text')]);
    setupRepo(baseSnap);
    var rootRevId = Object.keys(vcRepositoryStore.getRepository().revisions)[0];

    var newSnap = makeSnapshot('SNAP-new', [makeNode('PROC-base', 'layers/text'), makeNode('PROC-new', 'layers/solid')]);
    vcRepositoryStore.storeSnapshot(newSnap);

    var newRev = vcRepositoryStore.createRevision({ message: 'new', snapshotId: 'SNAP-new', parentIds: [rootRevId], kind: 'user' });
    var newBranch = vcRepositoryStore.createBranch({ name: 'new', snapshotId: 'SNAP-new', headRevisionId: newRev });

    var mergeResult = vcThreeWayMerge.merge('BR-main', newBranch);
    expect(mergeResult.ok).toBe(true);
    expect(mergeResult.code).toBe('fast_forward');
  });

  it('merges wire additions from both sides', function() {
    var result = setupThreeWay(
      [makeNode('PROC-a', 'layers/text'), makeNode('PROC-b', 'layers/solid')],
      [makeNode('PROC-a', 'layers/text'), makeNode('PROC-b', 'layers/solid')],
      [makeNode('PROC-a', 'layers/text'), makeNode('PROC-b', 'layers/solid')],
      [],
      [makeWire('WIRE-ours', 'PROC-a', 'PROC-b')],
      [makeWire('WIRE-theirs', 'PROC-a', 'PROC-b', { fromPort: 'parent_of', type: 'parent' })]
    );

    var mergeResult = vcThreeWayMerge.merge(result.theirsBranch, result.oursBranch);
    expect(mergeResult.ok).toBe(true);
    expect(mergeResult.candidateSnapshot.graph.wires['WIRE-ours']).toBeDefined();
    expect(mergeResult.candidateSnapshot.graph.wires['WIRE-theirs']).toBeDefined();
  });

});

describe('vcMergeValidator', function() {

  it('validates a clean graph', function() {
    var node1 = makeNode('PROC-1', 'layers/text');
    node1.ports.push({ id: 'main_input', category: 'mainInput', type: 'layer' });
    var node2 = makeNode('PROC-2', 'layers/solid');
    node2.ports.push({ id: 'main_input', category: 'mainInput', type: 'layer' });
    var snap = makeSnapshot('SNAP-clean', [node1, node2], [
      makeWire('WIRE-1', 'PROC-1', 'PROC-2')
    ]);

    var result = vcMergeValidator.validate(snap);
    expect(result.ok).toBe(true);
  });

  it('detects missing endpoints', function() {
    var snap = makeSnapshot('SNAP-bad', [
      makeNode('PROC-1', 'layers/text')
    ], [
      makeWire('WIRE-1', 'PROC-1', 'PROC-missing')
    ]);

    var result = vcMergeValidator.validate(snap);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('detects layer cycles', function() {
    var snap = makeSnapshot('SNAP-cycle', [
      makeNode('PROC-1', 'layers/text'),
      makeNode('PROC-2', 'layers/text')
    ], [
      makeWire('WIRE-1', 'PROC-1', 'PROC-2'),
      makeWire('WIRE-2', 'PROC-2', 'PROC-1')
    ]);

    var result = vcMergeValidator.validate(snap);
    expect(result.ok).toBe(false);
  });

  it('detects missing ports', function() {
    var snap = makeSnapshot('SNAP-badport', [
      makeNode('PROC-1', 'layers/text'),
      makeNode('PROC-2', 'layers/text')
    ], [
      makeWire('WIRE-1', 'PROC-1', 'PROC-2', { fromPort: 'nonexistent_port' })
    ]);

    var result = vcMergeValidator.validate(snap);
    expect(result.ok).toBe(false);
  });

  it('detects duplicate semantic wires', function() {
    var snap = makeSnapshot('SNAP-dup', [
      makeNode('PROC-1', 'layers/text'),
      makeNode('PROC-2', 'layers/text')
    ], [
      makeWire('WIRE-1', 'PROC-1', 'PROC-2'),
      makeWire('WIRE-2', 'PROC-1', 'PROC-2')
    ]);

    var result = vcMergeValidator.validate(snap);
    expect(result.ok).toBe(false);
  });

});

describe('vcConflictResolver', function() {

  it('resolves property conflict by choosing ours', function() {
    var conflict = vcConflictFactory.propertyConflict('node', 'PROC-1', ['props', 'opacity'], 100, 70, 40, 'blocking');
    var candidateGraph = { nodes: { 'PROC-1': { props: { opacity: 70 } } }, wires: {} };
    var oursGraph = { nodes: { 'PROC-1': { props: { opacity: 70 } } }, wires: {} };
    var theirsGraph = { nodes: { 'PROC-1': { props: { opacity: 40 } } }, wires: {} };

    var result = vcConflictResolver.resolveConflict(conflict, 'ours', null, candidateGraph, oursGraph, theirsGraph);
    expect(result.ok).toBe(true);
    expect(conflict.resolution).toBe('ours');
    expect(conflict.resolvedValue).toBe(70);
  });

  it('resolves property conflict by choosing theirs', function() {
    var conflict = vcConflictFactory.propertyConflict('node', 'PROC-1', ['props', 'opacity'], 100, 70, 40, 'blocking');
    var candidateGraph = { nodes: { 'PROC-1': { props: { opacity: 70 } } }, wires: {} };
    var oursGraph = { nodes: { 'PROC-1': { props: { opacity: 70 } } }, wires: {} };
    var theirsGraph = { nodes: { 'PROC-1': { props: { opacity: 40 } } }, wires: {} };

    var result = vcConflictResolver.resolveConflict(conflict, 'theirs', null, candidateGraph, oursGraph, theirsGraph);
    expect(result.ok).toBe(true);
    expect(conflict.resolution).toBe('theirs');
    expect(conflict.resolvedValue).toBe(40);
  });

  it('detects unresolved conflicts', function() {
    var conflicts = [
      vcConflictFactory.propertyConflict('node', 'PROC-1', ['props', 'opacity'], 100, 70, 40, 'blocking'),
      vcConflictFactory.layoutConflict('node', 'PROC-2', ['position'], [0,0], [100,100])
    ];

    expect(vcConflictResolver.hasUnresolvedConflicts(conflicts)).toBe(true);

    conflicts[0].resolution = 'ours';
    expect(vcConflictResolver.hasUnresolvedConflicts(conflicts)).toBe(false);
  });

  it('reports conflict counts', function() {
    var conflicts = [
      vcConflictFactory.propertyConflict('node', 'PROC-1', ['p'], 1, 2, 3, 'blocking'),
      vcConflictFactory.propertyConflict('node', 'PROC-2', ['p'], 1, 2, 3, 'blocking'),
      vcConflictFactory.layoutConflict('node', 'PROC-3', ['position'], [0,0], [100,100])
    ];

    var counts = vcConflictResolver.getConflictCounts(conflicts);
    expect(counts.blocking).toBe(2);
    expect(counts.warning).toBe(1);
    expect(counts.total).toBe(3);
  });

});

describe('Integration: merge → validate → resolve', function() {

  it('produces a valid merged graph for clean merges', function() {
    // Two independent node additions should merge cleanly
    var result = (function() {
      return (function(nodes, wires) {
        var baseNodes = [makeNode('PROC-a', 'layers/text'), makeNode('PROC-b', 'layers/solid')];
        var oursNodes = [makeNode('PROC-a', 'layers/text'), makeNode('PROC-b', 'layers/solid'), makeNode('PROC-c', 'layers/text')];
        var theirsNodes = [makeNode('PROC-a', 'layers/text'), makeNode('PROC-b', 'layers/solid'), makeNode('PROC-d', 'layers/camera')];

        var baseSnap = makeSnapshot('SNAP-base', baseNodes, []);
        setupRepo(baseSnap);
        var rootRevId = Object.keys(vcRepositoryStore.getRepository().revisions)[0];

        var oursSnap = makeSnapshot('SNAP-ours', oursNodes, []);
        var theirsSnap = makeSnapshot('SNAP-theirs', theirsNodes, []);
        vcRepositoryStore.storeSnapshot(oursSnap);
        vcRepositoryStore.storeSnapshot(theirsSnap);

        var oursRev = vcRepositoryStore.createRevision({ message: 'ours', snapshotId: 'SNAP-ours', parentIds: [rootRevId], kind: 'user' });
        var theirsRev = vcRepositoryStore.createRevision({ message: 'theirs', snapshotId: 'SNAP-theirs', parentIds: [rootRevId], kind: 'user' });

        var oursBranch = vcRepositoryStore.createBranch({ name: 'ours', snapshotId: 'SNAP-ours', headRevisionId: oursRev });
        var theirsBranch = vcRepositoryStore.createBranch({ name: 'theirs', snapshotId: 'SNAP-theirs', headRevisionId: theirsRev });

        return vcThreeWayMerge.merge(theirsBranch, oursBranch);
      })();
    })();

    expect(result.ok).toBe(true);

    // Validate the merged candidate
    var validation = vcMergeValidator.validate(result.candidateSnapshot);
    expect(validation.ok).toBe(true);
  });

});
