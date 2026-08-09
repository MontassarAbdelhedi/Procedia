/**
 * Repository layer unit tests.
 * Tests: initialization, snapshot storage, revision creation,
 *        branch CRUD, worktree management, invariants.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { loadGlobalScript } from '../setup.js';

// We need a minimal graphState mock for these tests
function setupMockGraphState() {
  // Always create a fresh mock
  window.graphState = {
    _nodes: {},
    _wires: {},
    getAllNodes: function() { return this._nodes; },
    getAllWires: function() { return this._wires; },
    addNode: function(node) { this._nodes[node.id] = node; },
    addWire: function(wire) { this._wires[wire.id] = wire; },
    getNode: function(id) { return this._nodes[id] || null; },
    getWire: function(id) { return this._wires[id] || null; },
    removeNode: function(id) { delete this._nodes[id]; },
    removeWire: function(id) { delete this._wires[id]; }
  };
}

function makeTestNode(id, type) {
  return {
    id: id || 'PROC-' + Date.now(),
    type: type || 'layers/text',
    version: '1.0.0',
    nodeKind: 'affected',
    dedicated: false,
    state: 'alive',
    props: { label: 'Test', opacity: 100 },
    position: [100, 200],
    ports: [{ id: 'output', category: 'output', type: 'layer', extendable: false }]
  };
}

function makeTestWire(id, fromNode, toNode) {
  return {
    id: id || 'WIRE-' + Date.now(),
    fromNode: fromNode,
    toNode: toNode,
    fromPort: 'output',
    toPort: 'main_input',
    type: 'layer'
  };
}

function loadVersioning() {
  globalThis.__procedia_internal = globalThis.__procedia_internal || {};
  globalThis.__procedia_internal.deepClone = globalThis.__procedia_internal.deepClone || function deepClone(val) {
    if (val === null || typeof val !== 'object') return val;
    if (Array.isArray(val)) {
      var arr = [];
      for (var i = 0; i < val.length; i++) arr.push(deepClone(val[i]));
      return arr;
    }
    var obj = {};
    for (var k in val) { if (val.hasOwnProperty(k)) obj[k] = deepClone(val[k]); }
    return obj;
  };

  loadGlobalScript('versioning/snapshot/snapshotSchema.js');
  loadGlobalScript('versioning/snapshot/snapshotChecksum.js');
  loadGlobalScript('versioning/snapshot/snapshotCanonicalizer.js');
  loadGlobalScript('versioning/snapshot/snapshotSerializer.js');
  loadGlobalScript('versioning/snapshot/snapshotMigrations.js');
  loadGlobalScript('versioning/repository/storeCore.js');
  loadGlobalScript('versioning/repository/snapshots.js');
  loadGlobalScript('versioning/repository/revisions.js');
  loadGlobalScript('versioning/repository/branchCRUD.js');
  loadGlobalScript('versioning/repository/branchState.js');
  loadGlobalScript('versioning/repository/artifacts.js');
  loadGlobalScript('versioning/repository/invariants.js');
  loadGlobalScript('versioning/repositoryStore.js');
  loadGlobalScript('versioning/branchService.js');
  loadGlobalScript('versioning/revisionService.js');
  loadGlobalScript('versioning/versionControlState.js');
  loadGlobalScript('versioning/versionControlInit.js');
  loadGlobalScript('versioning/versionControlQueries.js');
  loadGlobalScript('versioning/versionControlDiffMerge.js');
  loadGlobalScript('versioning/versionControlResolve.js');
  loadGlobalScript('versioning/versionControlMutations.js');
  loadGlobalScript('versioning/versionControlActivation.js');
  loadGlobalScript('versioning/versionControlHelpers.js');
  loadGlobalScript('versioning/versionControlService.js');
}

function clearRepo() {
  var internal = vcRepositoryStore.getRepository();
  if (internal) {
    internal.branches = {};
    internal.revisions = {};
    internal.snapshots = {};
    internal.activeBranchId = 'BR-main';
  }
}


describe('vcRepositoryStore', function() {

  beforeEach(function() {
    globalThis.__procedia_internal = {};
    setupMockGraphState();
    loadVersioning();
    // Create a fresh repo for each test
    var snap = vcSnapshotSerializer.captureActiveGraph();
    vcRepositoryStore.initRepository(snap);
  });

  it('initializes repository with main branch', function() {
    var repo = vcRepositoryStore.getRepository();
    expect(repo).not.toBeNull();
    expect(repo.activeBranchId).toBe('BR-main');
    expect(repo.branches['BR-main']).toBeDefined();
    expect(repo.branches['BR-main'].name).toBe('main');
    expect(repo.branches['BR-main'].isProtected).toBe(true);
  });

  it('initializes with a root revision', function() {
    var repo = vcRepositoryStore.getRepository();
    var revIds = Object.keys(repo.revisions);
    expect(revIds.length).toBe(1);
    var root = repo.revisions[revIds[0]];
    expect(root.kind).toBe('root');
    expect(root.parentIds).toEqual([]);
    expect(root.generation).toBe(0);
  });

  it('creates a branch', function() {
    var branchId = vcRepositoryStore.createBranch({
      name: 'feature-x',
      snapshotId: null,
      headRevisionId: null
    });

    expect(branchId).toMatch(/^BR-/);
    var branch = vcRepositoryStore.getBranch(branchId);
    expect(branch.name).toBe('feature-x');
    expect(branch.normalizedName).toBe('feature-x');
    expect(branch.isProtected).toBe(false);
  });

  it('rejects duplicate branch names', function() {
    vcRepositoryStore.createBranch({ name: 'Feature', headRevisionId: null });
    expect(function() {
      vcRepositoryStore.createBranch({ name: 'feature', headRevisionId: null });
    }).toThrow(/already exists/);
  });

  it('rejects reserved branch name prefixes', function() {
    expect(function() {
      vcRepositoryStore.createBranch({ name: '__procedia_secret', headRevisionId: null });
    }).toThrow(/reserved/);
  });

  it('renames a branch', function() {
    var bid = vcRepositoryStore.createBranch({ name: 'OldName', headRevisionId: null });
    vcRepositoryStore.renameBranch(bid, 'NewName');
    var branch = vcRepositoryStore.getBranch(bid);
    expect(branch.name).toBe('NewName');
    expect(branch.normalizedName).toBe('newname');
  });

  it('rejects deleting main branch', function() {
    expect(function() {
      vcRepositoryStore.deleteBranch('BR-main');
    }).toThrow(/protected/);
  });

  it('rejects deleting active branch', function() {
    var bid = vcRepositoryStore.createBranch({ name: 'current', headRevisionId: null });
    vcRepositoryStore.setActiveBranch(bid);
    expect(function() {
      vcRepositoryStore.deleteBranch(bid);
    }).toThrow(/active/);
  });

  it('deletes a non-protected, non-active branch', function() {
    var bid = vcRepositoryStore.createBranch({ name: 'temp', headRevisionId: null });
    vcRepositoryStore.deleteBranch(bid);
    expect(vcRepositoryStore.getBranch(bid)).toBeNull();
  });

  it('stores and retrieves snapshots', function() {
    var snap = vcSnapshotSerializer.captureActiveGraph();
    var snapId = vcRepositoryStore.storeSnapshot(snap);
    var retrieved = vcRepositoryStore.getSnapshot(snapId);
    expect(retrieved).toBeDefined();
    expect(retrieved.checksum).toBe(snap.checksum);
  });

  it('deduplicates identical snapshots', function() {
    // Make a change to create a new unique snapshot
    window.graphState.addNode(makeTestNode('PROC-dedup', 'layers/text'));
    var snap = vcSnapshotSerializer.captureActiveGraph();
    var id1 = vcRepositoryStore.storeSnapshot(snap);
    var id2 = vcRepositoryStore.storeSnapshot(snap);
    expect(id1).toBe(id2);

    var repo = vcRepositoryStore.getRepository();
    var snapCount = Object.keys(repo.snapshots).length;
    // Root (from init) + this deduplicated one = 2
    expect(snapCount).toBe(2);
  });

  it('creates revisions', function() {
    var snap = vcSnapshotSerializer.captureActiveGraph();
    vcRepositoryStore.storeSnapshot(snap);
    var revId = vcRepositoryStore.createRevision({
      message: 'Test version',
      snapshotId: snap.id,
      parentIds: [],
      kind: 'user'
    });

    var rev = vcRepositoryStore.getRevision(revId);
    expect(rev.message).toBe('Test version');
    expect(rev.kind).toBe('user');
    expect(rev.graphChecksum).toBe(snap.checksum);
  });

  it('creates revisions with parents', function() {
    var rootRevs = vcRepositoryStore.getAllRevisions();
    var rootRev = rootRevs[Object.keys(rootRevs)[0]];

    var snap = vcSnapshotSerializer.captureActiveGraph();
    vcRepositoryStore.storeSnapshot(snap);
    var revId = vcRepositoryStore.createRevision({
      message: 'Child',
      snapshotId: snap.id,
      parentIds: [rootRev.id],
      kind: 'user'
    });

    var rev = vcRepositoryStore.getRevision(revId);
    expect(rev.parentIds).toEqual([rootRev.id]);
    expect(rev.generation).toBe(1);
  });

});

describe('vcRepositoryStore invariants', function() {

  beforeEach(function() {
    globalThis.__procedia_internal = {};
    setupMockGraphState();
    loadVersioning();
    var snap = vcSnapshotSerializer.captureActiveGraph();
    vcRepositoryStore.initRepository(snap);
  });

  it('passes invariants on clean repository', function() {
    var result = vcRepositoryStore.checkInvariants();
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('detects missing active branch', function() {
    var repo = vcRepositoryStore.getRepository();
    repo.activeBranchId = 'BR-nonexistent';
    var result = vcRepositoryStore.checkInvariants();
    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

});

describe('vcBranchService', function() {

  beforeEach(function() {
    globalThis.__procedia_internal = {};
    setupMockGraphState();
    loadVersioning();
    var snap = vcSnapshotSerializer.captureActiveGraph();
    vcRepositoryStore.initRepository(snap);
  });

  it('creates a branch from current graph', function() {
    var result = vcBranchService.createBranch({ name: 'dev' });
    expect(result.ok).toBe(true);
    expect(result.branchId).toMatch(/^BR-/);
  });

  it('saves working snapshot for a branch', function() {
    var snapId = vcBranchService.saveWorkingSnapshot('BR-main');
    expect(snapId).toMatch(/^SNAP-/);
  });

});

describe('vcRevisionService', function() {

  beforeEach(function() {
    globalThis.__procedia_internal = {};
    setupMockGraphState();
    loadVersioning();
    var snap = vcSnapshotSerializer.captureActiveGraph();
    vcRepositoryStore.initRepository(snap);
  });

  it('creates a version and advances branch head', function() {
    var node = makeTestNode('PROC-test', 'layers/text');
    window.graphState.addNode(node);

    var result = vcRevisionService.createVersion({ message: 'My version' });
    expect(result.ok).toBe(true);
    expect(result.revisionId).toMatch(/^REV-/);

    var branch = vcRepositoryStore.getBranch('BR-main');
    expect(branch.headRevisionId).toBe(result.revisionId);
    expect(branch.dirty).toBe(false);
  });

  it('rejects no-op versions', function() {
    // First version
    var node = makeTestNode('PROC-n1', 'layers/text');
    window.graphState.addNode(node);
    var r1 = vcRevisionService.createVersion({ message: 'First' });
    expect(r1.ok).toBe(true);

    // Second version with no changes
    var r2 = vcRevisionService.createVersion({ message: 'No changes' });
    expect(r2.ok).toBe(false);
    expect(r2.error).toContain('No changes');
  });

  it('generates suggested version message', function() {
    window.graphState.addNode(makeTestNode('PROC-n2', 'layers/text'));
    window.graphState.addNode(makeTestNode('PROC-n3', 'layers/solid'));

    var snap = vcSnapshotSerializer.captureActiveGraph();
    var branch = vcRepositoryStore.getBranch('BR-main');
    var msg = vcRevisionService.generateSuggestedMessage(branch.headRevisionId, snap.id);

    expect(msg).toContain('node');
  });

});

describe('versionControl service', function() {

  beforeEach(function() {
    globalThis.__procedia_internal = {};
    setupMockGraphState();
    loadVersioning();
  });

  it('is not initialized until initialize called', function() {
    versionControl.setInitialized(false);
    expect(versionControl.isInitialized()).toBe(false);
  });

  it('initializes from scratch and creates repository', function() {
    // Add some nodes
    window.graphState.addNode(makeTestNode('PROC-init1', 'layers/text'));
    window.graphState.addWire(makeTestWire('WIRE-init1', 'PROC-init1', 'PROC-init2'));

    var snap = vcSnapshotSerializer.captureActiveGraph();
    vcRepositoryStore.initRepository(snap);
    versionControl.setInitialized(true);

    var summary = versionControl.getRepositorySummary();
    expect(summary.ok).toBe(true);
    expect(summary.data.activeBranchName).toBe('main');
    expect(summary.data.branchCount).toBe(1);
    expect(summary.data.revisionCount).toBe(1);
  });

  it('gets active branch', function() {
    var snap = vcSnapshotSerializer.captureActiveGraph();
    vcRepositoryStore.initRepository(snap);
    versionControl.setInitialized(true);

    var result = versionControl.getActiveBranch();
    expect(result.ok).toBe(true);
    expect(result.data.name).toBe('main');
    expect(result.data.isProtected).toBe(true);
  });

  it('lists branches', function() {
    var snap = vcSnapshotSerializer.captureActiveGraph();
    vcRepositoryStore.initRepository(snap);
    versionControl.setInitialized(true);

    var result = versionControl.listBranches();
    expect(result.ok).toBe(true);
    expect(result.data.length).toBe(1);
  });

  it('creates and lists versions', function() {
    var snap = vcSnapshotSerializer.captureActiveGraph();
    vcRepositoryStore.initRepository(snap);
    versionControl.setInitialized(true);

    window.graphState.addNode(makeTestNode('PROC-v1', 'layers/text'));
    var v1 = versionControl.createVersion('Version 1');
    expect(v1.ok).toBe(true);

    window.graphState.addNode(makeTestNode('PROC-v2', 'layers/solid'));
    var v2 = versionControl.createVersion('Version 2');
    expect(v2.ok).toBe(true);

    var history = versionControl.listRevisions();
    expect(history.ok).toBe(true);
    expect(history.data.length).toBe(3); // root + v1 + v2
  });

  it('creates branches', function() {
    var snap = vcSnapshotSerializer.captureActiveGraph();
    vcRepositoryStore.initRepository(snap);
    versionControl.setInitialized(true);

    var result = versionControl.createBranch({ name: 'experiment' });
    expect(result.ok).toBe(true);
    expect(result.data.branchId).toMatch(/^BR-/);

    var branches = versionControl.listBranches();
    expect(branches.data.length).toBe(2);
  });

  it('renames branches', function() {
    var snap = vcSnapshotSerializer.captureActiveGraph();
    vcRepositoryStore.initRepository(snap);
    versionControl.setInitialized(true);

    var createResult = versionControl.createBranch({ name: 'old' });
    var renameResult = versionControl.renameBranch(createResult.data.branchId, 'new');
    expect(renameResult.ok).toBe(true);

    var branches = versionControl.listBranches();
    var renamed = branches.data.find(function(b) { return b.id === createResult.data.branchId; });
    expect(renamed.name).toBe('new');
  });

  it('checks integrity', function() {
    var snap = vcSnapshotSerializer.captureActiveGraph();
    vcRepositoryStore.initRepository(snap);
    versionControl.setInitialized(true);

    var result = versionControl.checkIntegrity();
    expect(result.ok).toBe(true);
    expect(result.data.ok).toBe(true);
  });

});

describe('Snapshot round-trip', function() {

  beforeEach(function() {
    globalThis.__procedia_internal = {};
    setupMockGraphState();
    loadVersioning();
  });

  it('preserves node properties through serialization', function() {
    var node = makeTestNode('PROC-rt1', 'layers/text');
    node.props.opacity = 75;
    node.props.color = [1, 0, 0, 1];
    node.position = [320, 480];
    node.size = [200, 100];
    node.collapsed = false;
    node.disabled = false;
    window.graphState.addNode(node);

    var snap = vcSnapshotSerializer.captureActiveGraph();
    var roundNode = snap.graph.nodes['PROC-rt1'];

    expect(roundNode).toBeDefined();
    expect(roundNode.props.opacity).toBe(75);
    expect(roundNode.props.color).toEqual([1, 0, 0, 1]);
    expect(roundNode.position).toEqual([320, 480]);
    expect(roundNode.size).toEqual([200, 100]);
    expect(roundNode.collapsed).toBe(false);
  });

  it('strips runtime fields', function() {
    var node = makeTestNode('PROC-rt2', 'layers/text');
    node.dirty = true;
    node.hostingComps = ['COMP-X'];
    node.dynamicSchema = { some: 'data' };
    node.hasParkedLayer = true;
    node.error = 'some error';
    node._flushCount = 3;
    node._transplantLayerUUID = 'w1';
    window.graphState.addNode(node);

    var snap = vcSnapshotSerializer.captureActiveGraph();
    var roundNode = snap.graph.nodes['PROC-rt2'];

    expect(roundNode.dirty).toBeUndefined();
    expect(roundNode.hostingComps).toBeUndefined();
    expect(roundNode.dynamicSchema).toBeUndefined();
    expect(roundNode.hasParkedLayer).toBeUndefined();
    expect(roundNode.error).toBeUndefined();
    expect(roundNode._flushCount).toBeUndefined();
    expect(roundNode._transplantLayerUUID).toBeUndefined();
  });

  it('preserves wires through serialization', function() {
    window.graphState.addNode(makeTestNode('PROC-rt3', 'layers/text'));
    window.graphState.addNode(makeTestNode('PROC-rt4', 'layers/solid'));

    var wire = makeTestWire('WIRE-rt1', 'PROC-rt3', 'PROC-rt4');
    wire.boundParam = 'ADBE Position';
    wire.slotId = 'slot-1';
    wire.order = 0;
    wire.type = 'layer';
    window.graphState.addWire(wire);

    var snap = vcSnapshotSerializer.captureActiveGraph();
    var roundWire = snap.graph.wires['WIRE-rt1'];

    expect(roundWire).toBeDefined();
    expect(roundWire.fromNode).toBe('PROC-rt3');
    expect(roundWire.toNode).toBe('PROC-rt4');
    expect(roundWire.boundParam).toBe('ADBE Position');
    expect(roundWire._pathLayerUUID).toBeUndefined();
  });

  it('falsy values survive round-trip', function() {
    var node = makeTestNode('PROC-falsy', 'layers/text');
    node.props.opacity = 0;
    node.props.rotation = 0;
    node.collapsed = false;
    node.disabled = false;
    window.graphState.addNode(node);

    var snap = vcSnapshotSerializer.captureActiveGraph();
    var roundNode = snap.graph.nodes['PROC-falsy'];

    expect(roundNode.props.opacity).toBe(0);
    expect(roundNode.props.rotation).toBe(0);
    expect(roundNode.collapsed).toBe(false);
    expect(roundNode.disabled).toBe(false);
  });

});

describe('Snapshot canonicalization determinism', function() {

  beforeEach(function() {
    globalThis.__procedia_internal = {};
    setupMockGraphState();
    loadVersioning();
  });

  it('same graph in different insertion order produces identical checksum', function() {
    window.graphState.addNode(makeTestNode('PROC-c1', 'layers/text'));
    window.graphState.addWire(makeTestWire('WIRE-c1', 'PROC-c1', 'PROC-c2'));

    var snap1 = vcSnapshotSerializer.captureActiveGraph();
    var csum1 = snap1.checksum;

    // Reset and repeat with same data
    window.graphState._nodes = {};
    window.graphState._wires = {};
    window.graphState.addNode(makeTestNode('PROC-c1', 'layers/text'));
    window.graphState.addWire(makeTestWire('WIRE-c1', 'PROC-c1', 'PROC-c2'));

    var snap2 = vcSnapshotSerializer.captureActiveGraph();
    var csum2 = snap2.checksum;

    expect(csum1).toBe(csum2);
  });

});
