/**
 * Repository branch CRUD — create, query, rename, and delete branches.
 * @module vcRepoBranchCRUD
 * @dependencies vcRepoCore, vcRepoSnapshots, vcSnapshotSerializer
 */
// versioning/repository/branchCRUD.js
// DEPENDS ON: versioning/repository/storeCore.js,
//             versioning/repository/snapshots.js,
//             versioning/snapshot/snapshotSerializer.js

var vcRepoBranchCRUD = (function() {
  function _repo() { return vcRepoCore._getRepo(); }

  function createBranch(opts) {
    if (!_repo()) throw new Error('Repository not initialized');
    var normalized = opts.name.trim().toLowerCase();
    if (normalized === '') throw new Error('Branch name required');
    if (normalized.indexOf('__procedia') === 0) throw new Error('Branch name cannot use reserved prefix');
    for (var bid in _repo().branches) {
      if (_repo().branches.hasOwnProperty(bid)) {
        if (_repo().branches[bid].normalizedName === normalized) {
          throw new Error('Branch "' + opts.name + '" already exists');
        }
      }
    }
    var branchId = vcRepoCore._vcId('BR');
    var branchSnapshotId = opts.snapshotId;
    if (!branchSnapshotId) {
      var snapshot = vcSnapshotSerializer.captureActiveGraph();
      branchSnapshotId = vcRepoSnapshots.storeSnapshot(snapshot);
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
      createdAt: vcRepoCore._now(),
      updatedAt: vcRepoCore._now(),
      isProtected: opts.isProtected || false
    };
    _repo().branches[branchId] = branch;
    _repo().updatedAt = vcRepoCore._now();
    return branchId;
  }

  function getBranch(branchId) {
    if (!_repo()) return null;
    return _repo().branches[branchId] || null;
  }

  function getAllBranches() {
    if (!_repo()) return {};
    return _repo().branches;
  }

  function renameBranch(branchId, newName) {
    if (!_repo()) throw new Error('Repository not initialized');
    var branch = _repo().branches[branchId];
    if (!branch) throw new Error('Branch not found: ' + branchId);
    var normalized = newName.trim().toLowerCase();
    if (normalized === '') throw new Error('Branch name required');
    for (var bid in _repo().branches) {
      if (_repo().branches.hasOwnProperty(bid) && bid !== branchId) {
        if (_repo().branches[bid].normalizedName === normalized) {
          throw new Error('Branch "' + newName + '" already exists');
        }
      }
    }
    branch.name = newName.trim();
    branch.normalizedName = normalized;
    branch.updatedAt = vcRepoCore._now();
    _repo().updatedAt = vcRepoCore._now();
  }

  function deleteBranch(branchId) {
    if (!_repo()) throw new Error('Repository not initialized');
    var branch = _repo().branches[branchId];
    if (!branch) throw new Error('Branch not found: ' + branchId);
    if (branch.isProtected) throw new Error('Cannot delete protected branch: ' + branch.name);
    if (branchId === _repo().activeBranchId) throw new Error('Cannot delete active branch');
    delete _repo().branches[branchId];
    _repo().updatedAt = vcRepoCore._now();
  }

  return {
    createBranch: createBranch, getBranch: getBranch, getAllBranches: getAllBranches,
    renameBranch: renameBranch, deleteBranch: deleteBranch
  };
})();
