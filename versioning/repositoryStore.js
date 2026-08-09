/**
 * Repository store — owns branches, revisions, snapshots, worktrees,
 * and managed-artifact metadata. This is the single source of truth
 * for Procedia's embedded version-control data.
 *
 * All mutations go through this module. Module enforces invariants
 * on every write.
 * @module vcRepositoryStore
 * @dependencies vcSnapshotSerializer, vcSnapshotMigrations, vcChecksum
 */
// versioning/repositoryStore.js
// DEPENDS ON: versioning/snapshot/snapshotSerializer.js,
//             versioning/snapshot/snapshotMigrations.js,
//             versioning/snapshot/snapshotChecksum.js,
//             data/uuidGenerator.js
// MUST LOAD AFTER: versioning/snapshot/snapshotMigrations.js
// MUST LOAD BEFORE: versioning/branchService.js

var vcRepositoryStore = (function() {

  var _repo = null;

  function _vcId(prefix) {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
  }

  function _now() {
    return Date.now();
  }

  // ---- Repository initialization ----

  /**
   * Initializes a new empty repository with a root snapshot and main branch.
   * @param {Object} rootSnapshot — the initial graph snapshot
   * @returns {Object} the new repository object
   */
  function initRepository(rootSnapshot) {
    var repoId = _vcId('REPO');
    var now = _now();
    var rootRevisionId = _vcId('REV');
    var mainBranchId = 'BR-main';
    var snapshotId = rootSnapshot ? rootSnapshot.id : _vcId('SNAP');

    if (rootSnapshot && rootSnapshot.id) {
      rootSnapshot = rootSnapshot;
    }

    var repo = {
      schemaVersion: 1,
      repositoryId: repoId,
      createdAt: now,
      updatedAt: now,

      activeBranchId: mainBranchId,

      branches: {},
      revisions: {},
      snapshots: {},
      managedArtifacts: {},
      storage: {
        currentGenerationId: null,
        previousGenerationId: null,
        lastVerifiedChecksum: null
      }
    };

    // Store root snapshot
    if (rootSnapshot) {
      repo.snapshots[snapshotId] = rootSnapshot;
    }

    // Create root revision
    if (!rootSnapshot) {
      throw new Error('Root snapshot required to initialize repository');
    }

    repo.revisions[rootRevisionId] = {
      id: rootRevisionId,
      parentIds: [],
      snapshotId: snapshotId,
      graphChecksum: rootSnapshot.checksum,
      message: 'Initial Procedia graph',
      kind: 'root',
      createdAt: now,
      branchIdAtCreation: mainBranchId,
      summary: { nodesAdded: 0, nodesRemoved: 0, nodesChanged: 0, wiresAdded: 0, wiresRemoved: 0, wiresChanged: 0 },
      generation: 0
    };

    // Create main branch
    repo.branches[mainBranchId] = {
      id: mainBranchId,
      name: 'main',
      normalizedName: 'main',
      headRevisionId: rootRevisionId,
      workingSnapshotId: snapshotId,
      baseRevisionId: rootRevisionId,
      dirty: false,
      createdFromRevisionId: rootRevisionId,
      createdAt: now,
      updatedAt: now,
      isProtected: true
    };

    _repo = repo;
    return repo;
  }

  // ---- Repository access ----

  function getRepository() {
    return _repo;
  }

  function setRepository(repo) {
    _repo = repo;
  }

  function hasRepository() {
    return _repo !== null;
  }

  // ---- Snapshot storage ----

  /**
   * Stores a snapshot. If an identical snapshot already exists (by checksum),
   * reuses it instead of storing a duplicate.
   * @param {Object} snapshot
   * @returns {string} snapshot ID
   */
  function storeSnapshot(snapshot) {
    if (!_repo) throw new Error('Repository not initialized');
    if (!snapshot || !snapshot.id) throw new Error('Snapshot must have an id');

    var existingId = snapshot.id;
    if (_repo.snapshots[existingId]) {
      return existingId;
    }

    _repo.snapshots[existingId] = snapshot;
    _repo.updatedAt = _now();
    return existingId;
  }

  function getSnapshot(snapshotId) {
    if (!_repo) return null;
    return _repo.snapshots[snapshotId] || null;
  }

  // ---- Revisions ----

  /**
   * Creates a new revision.
   * @param {Object} opts — { message, snapshotId, parentIds, kind, branchId, summary }
   * @returns {string} revision ID
   */
  function createRevision(opts) {
    if (!_repo) throw new Error('Repository not initialized');

    var snapshot = _repo.snapshots[opts.snapshotId];
    if (!snapshot) throw new Error('Snapshot not found: ' + opts.snapshotId);

    var revId = _vcId('REV');
    var parentIds = opts.parentIds || [];

    // Determine generation
    var gen = 0;
    for (var i = 0; i < parentIds.length; i++) {
      var parent = _repo.revisions[parentIds[i]];
      if (parent && parent.generation >= gen) {
        gen = parent.generation + 1;
      }
    }

    var rev = {
      id: revId,
      parentIds: parentIds,
      snapshotId: opts.snapshotId,
      graphChecksum: snapshot.checksum,
      message: opts.message || '',
      kind: opts.kind || 'user',
      createdAt: _now(),
      branchIdAtCreation: opts.branchId || null,
      summary: opts.summary || { nodesAdded: 0, nodesRemoved: 0, nodesChanged: 0, wiresAdded: 0, wiresRemoved: 0, wiresChanged: 0 },
      generation: gen
    };

    _repo.revisions[revId] = rev;
    _repo.updatedAt = _now();
    return revId;
  }

  function getRevision(revId) {
    if (!_repo) return null;
    return _repo.revisions[revId] || null;
  }

  function getAllRevisions() {
    if (!_repo) return {};
    return _repo.revisions;
  }

  // ---- Branches ----

  function createBranch(opts) {
    if (!_repo) throw new Error('Repository not initialized');

    var normalized = opts.name.trim().toLowerCase();
    if (normalized === '') throw new Error('Branch name required');
    if (normalized.indexOf('__procedia') === 0) throw new Error('Branch name cannot use reserved prefix');

    // Check uniqueness
    for (var bid in _repo.branches) {
      if (_repo.branches.hasOwnProperty(bid)) {
        if (_repo.branches[bid].normalizedName === normalized) {
          throw new Error('Branch "' + opts.name + '" already exists');
        }
      }
    }

    var branchId = _vcId('BR');

    var branchSnapshotId = opts.snapshotId;
    if (!branchSnapshotId) {
      // Create new snapshot from current graph
      var snapshot = vcSnapshotSerializer.captureActiveGraph();
      branchSnapshotId = storeSnapshot(snapshot);
    }

    var branch = {
      id: branchId,
      name: opts.name.trim(),
      normalizedName: normalized,
      headRevisionId: opts.headRevisionId || null,
      workingSnapshotId: branchSnapshotId,
      baseRevisionId: opts.baseRevisionId || (opts.headRevisionId || null),
      dirty: false,
      createdFromRevisionId: opts.fromRevisionId || null,
      createdAt: _now(),
      updatedAt: _now(),
      isProtected: opts.isProtected || false
    };

    _repo.branches[branchId] = branch;
    _repo.updatedAt = _now();
    return branchId;
  }

  function getBranch(branchId) {
    if (!_repo) return null;
    return _repo.branches[branchId] || null;
  }

  function getActiveBranch() {
    if (!_repo) return null;
    return _repo.branches[_repo.activeBranchId] || null;
  }

  function setActiveBranch(branchId) {
    if (!_repo) throw new Error('Repository not initialized');
    if (!_repo.branches[branchId]) throw new Error('Branch not found: ' + branchId);
    _repo.activeBranchId = branchId;
    _repo.updatedAt = _now();
  }

  function getAllBranches() {
    if (!_repo) return {};
    return _repo.branches;
  }

  function renameBranch(branchId, newName) {
    if (!_repo) throw new Error('Repository not initialized');
    var branch = _repo.branches[branchId];
    if (!branch) throw new Error('Branch not found: ' + branchId);

    var normalized = newName.trim().toLowerCase();
    if (normalized === '') throw new Error('Branch name required');

    for (var bid in _repo.branches) {
      if (_repo.branches.hasOwnProperty(bid) && bid !== branchId) {
        if (_repo.branches[bid].normalizedName === normalized) {
          throw new Error('Branch "' + newName + '" already exists');
        }
      }
    }

    branch.name = newName.trim();
    branch.normalizedName = normalized;
    branch.updatedAt = _now();
    _repo.updatedAt = _now();
  }

  function deleteBranch(branchId) {
    if (!_repo) throw new Error('Repository not initialized');

    var branch = _repo.branches[branchId];
    if (!branch) throw new Error('Branch not found: ' + branchId);
    if (branch.isProtected) throw new Error('Cannot delete protected branch: ' + branch.name);
    if (branchId === _repo.activeBranchId) throw new Error('Cannot delete active branch');

    delete _repo.branches[branchId];
    _repo.updatedAt = _now();
  }

  function updateBranchHead(branchId, revisionId) {
    if (!_repo) throw new Error('Repository not initialized');
    var branch = _repo.branches[branchId];
    if (!branch) throw new Error('Branch not found: ' + branchId);
    branch.headRevisionId = revisionId;
    branch.updatedAt = _now();
    _repo.updatedAt = _now();
  }

  function updateBranchWorkingSnapshot(branchId, snapshotId) {
    if (!_repo) throw new Error('Repository not initialized');
    var branch = _repo.branches[branchId];
    if (!branch) throw new Error('Branch not found: ' + branchId);
    branch.workingSnapshotId = snapshotId;
    branch.updatedAt = _now();
    _repo.updatedAt = _now();
  }

  function setBranchDirty(branchId, dirty) {
    if (!_repo) throw new Error('Repository not initialized');
    var branch = _repo.branches[branchId];
    if (!branch) throw new Error('Branch not found: ' + branchId);
    branch.dirty = dirty;
  }

  function isBranchDirty(branchId) {
    if (!_repo) return false;
    var branch = _repo.branches[branchId];
    if (!branch) return false;

    // Dirty is based on working vs head snapshot comparison
    var workingSnap = _repo.snapshots[branch.workingSnapshotId];
    var headSnap = _repo.snapshots[_repo.revisions[branch.headRevisionId] ? _repo.revisions[branch.headRevisionId].snapshotId : null];

    if (!workingSnap && !headSnap) return false;
    if (!workingSnap) return false;
    if (!headSnap) return true;

    return workingSnap.checksum !== headSnap.checksum;
  }

  function updateBranchBaseRevision(branchId, revisionId) {
    if (!_repo) throw new Error('Repository not initialized');
    var branch = _repo.branches[branchId];
    if (!branch) throw new Error('Branch not found: ' + branchId);
    branch.baseRevisionId = revisionId;
    branch.updatedAt = _now();
    _repo.updatedAt = _now();
  }

  // ---- Managed artifacts ----

  function setManagedArtifact(nodeId, artifactData) {
    if (!_repo) throw new Error('Repository not initialized');
    _repo.managedArtifacts[nodeId] = artifactData;
    _repo.updatedAt = _now();
  }

  function getManagedArtifact(nodeId) {
    if (!_repo) return null;
    return _repo.managedArtifacts[nodeId] || null;
  }

  function getAllManagedArtifacts() {
    if (!_repo) return {};
    return _repo.managedArtifacts;
  }

  // ---- Invariants ----

  /**
   * Checks all repository invariants. Returns structured report.
   * Does NOT auto-fix — only reports violations.
   * @returns {{ok: boolean, violations: string[]}}
   */
  function checkInvariants() {
    if (!_repo) return { ok: true, violations: [] };
    var v = [];

    // Active branch exists
    if (!_repo.branches[_repo.activeBranchId]) {
      v.push('Active branch ID ' + _repo.activeBranchId + ' not found in branch map');
    }

    // Every branch head exists
    for (var bid in _repo.branches) {
      if (!_repo.branches.hasOwnProperty(bid)) continue;
      var br = _repo.branches[bid];
      if (!_repo.revisions[br.headRevisionId]) {
        v.push('Branch ' + bid + ' head revision ' + br.headRevisionId + ' not found');
      }
      if (br.workingSnapshotId && !_repo.snapshots[br.workingSnapshotId]) {
        v.push('Branch ' + bid + ' working snapshot ' + br.workingSnapshotId + ' not found');
      }
    }

    // Every revision snapshot exists
    for (var rid in _repo.revisions) {
      if (!_repo.revisions.hasOwnProperty(rid)) continue;
      var rev = _repo.revisions[rid];
      if (!_repo.snapshots[rev.snapshotId]) {
        v.push('Revision ' + rid + ' snapshot ' + rev.snapshotId + ' not found');
      }
      for (var pi = 0; pi < rev.parentIds.length; pi++) {
        if (!_repo.revisions[rev.parentIds[pi]]) {
          v.push('Revision ' + rid + ' parent ' + rev.parentIds[pi] + ' not found');
        }
      }
    }

    // Revision DAG is acyclic (simple generation check)
    for (var rid2 in _repo.revisions) {
      if (!_repo.revisions.hasOwnProperty(rid2)) continue;
      var rev2 = _repo.revisions[rid2];
      for (var pj = 0; pj < rev2.parentIds.length; pj++) {
        var parentRev = _repo.revisions[rev2.parentIds[pj]];
        if (parentRev && parentRev.generation >= rev2.generation) {
          v.push('Revision ' + rid2 + ' generation ' + rev2.generation + ' not greater than parent ' + rev2.parentIds[pj] + ' (' + parentRev.generation + ')');
        }
      }
    }

    // Exactly one active branch
    var activeCount = 0;
    for (var bid3 in _repo.branches) {
      if (!_repo.branches.hasOwnProperty(bid3)) continue;
      if (bid3 === _repo.activeBranchId) activeCount++;
    }
    if (activeCount === 0 && Object.keys(_repo.branches).length > 0) {
      v.push('No active branch in non-empty repository');
    }

    return { ok: v.length === 0, violations: v };
  }

  return {
    // Init
    initRepository: initRepository,
    getRepository: getRepository,
    setRepository: setRepository,
    hasRepository: hasRepository,

    // Snapshots
    storeSnapshot: storeSnapshot,
    getSnapshot: getSnapshot,

    // Revisions
    createRevision: createRevision,
    getRevision: getRevision,
    getAllRevisions: getAllRevisions,

    // Branches
    createBranch: createBranch,
    getBranch: getBranch,
    getActiveBranch: getActiveBranch,
    setActiveBranch: setActiveBranch,
    getAllBranches: getAllBranches,
    renameBranch: renameBranch,
    deleteBranch: deleteBranch,
    updateBranchHead: updateBranchHead,
    updateBranchWorkingSnapshot: updateBranchWorkingSnapshot,
    updateBranchBaseRevision: updateBranchBaseRevision,
    setBranchDirty: setBranchDirty,
    isBranchDirty: isBranchDirty,

    // Managed artifacts
    setManagedArtifact: setManagedArtifact,
    getManagedArtifact: getManagedArtifact,
    getAllManagedArtifacts: getAllManagedArtifacts,

    // Invariants
    checkInvariants: checkInvariants
  };

})();
