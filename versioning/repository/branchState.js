/**
 * Repository branch state — active branch, head/working/base revision, dirty tracking.
 * @module vcRepoBranchState
 * @dependencies vcRepoCore
 */
// versioning/repository/branchState.js
// DEPENDS ON: versioning/repository/storeCore.js

var vcRepoBranchState = (function() {

  function _repo() { return vcRepoCore._getRepo(); }

  function getActiveBranch() {
    if (!_repo()) return null;
    return _repo().branches[_repo().activeBranchId] || null;
  }

  function setActiveBranch(branchId) {
    if (!_repo()) throw new Error('Repository not initialized');
    if (!_repo().branches[branchId]) throw new Error('Branch not found: ' + branchId);
    _repo().activeBranchId = branchId;
    _repo().updatedAt = vcRepoCore._now();
  }

  function updateBranchHead(branchId, revisionId) {
    if (!_repo()) throw new Error('Repository not initialized');
    var branch = _repo().branches[branchId];
    if (!branch) throw new Error('Branch not found: ' + branchId);
    branch.headRevisionId = revisionId;
    branch.updatedAt = vcRepoCore._now();
    _repo().updatedAt = vcRepoCore._now();
  }

  function updateBranchWorkingSnapshot(branchId, snapshotId) {
    if (!_repo()) throw new Error('Repository not initialized');
    var branch = _repo().branches[branchId];
    if (!branch) throw new Error('Branch not found: ' + branchId);
    branch.workingSnapshotId = snapshotId;
    branch.updatedAt = vcRepoCore._now();
    _repo().updatedAt = vcRepoCore._now();
  }

  function updateBranchBaseRevision(branchId, revisionId) {
    if (!_repo()) throw new Error('Repository not initialized');
    var branch = _repo().branches[branchId];
    if (!branch) throw new Error('Branch not found: ' + branchId);
    branch.baseRevisionId = revisionId;
    branch.updatedAt = vcRepoCore._now();
    _repo().updatedAt = vcRepoCore._now();
  }

  function setBranchDirty(branchId, dirty) {
    if (!_repo()) throw new Error('Repository not initialized');
    var branch = _repo().branches[branchId];
    if (!branch) throw new Error('Branch not found: ' + branchId);
    branch.dirty = dirty;
  }

  function isBranchDirty(branchId) {
    if (!_repo()) return false;
    var branch = _repo().branches[branchId];
    if (!branch) return false;

    var workingSnap = _repo().snapshots[branch.workingSnapshotId];
    var headRev = _repo().revisions[branch.headRevisionId];
    var headSnap = _repo().snapshots[headRev ? headRev.snapshotId : null];

    if (!workingSnap && !headSnap) return false;
    if (!workingSnap) return false;
    if (!headSnap) return true;

    return workingSnap.checksum !== headSnap.checksum;
  }

  return {
    getActiveBranch: getActiveBranch,
    setActiveBranch: setActiveBranch,
    updateBranchHead: updateBranchHead,
    updateBranchWorkingSnapshot: updateBranchWorkingSnapshot,
    updateBranchBaseRevision: updateBranchBaseRevision,
    setBranchDirty: setBranchDirty,
    isBranchDirty: isBranchDirty
  };

})();
