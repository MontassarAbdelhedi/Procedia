/**
 * Branch service — higher-level branch operations on top of repositoryStore.
 * Handles worktree management, dirty flag computation, and branch
 * creation with auto-snapshot capture.
 * @module vcBranchService
 * @dependencies vcRepositoryStore, vcSnapshotSerializer
 */
// versioning/branchService.js
// DEPENDS ON: versioning/repositoryStore.js,
//             versioning/snapshot/snapshotSerializer.js
// MUST LOAD AFTER: versioning/repositoryStore.js
// MUST LOAD BEFORE: versioning/versionControlService.js

var vcBranchService = (function() {

  var store = vcRepositoryStore;

  /**
   * Saves the current working graph as the working snapshot for a branch.
   * @param {string} branchId
   * @returns {string} snapshot ID
   */
  function saveWorkingSnapshot(branchId) {
    var snapshot = vcSnapshotSerializer.captureActiveGraph();
    var snapId = store.storeSnapshot(snapshot);
    store.updateBranchWorkingSnapshot(branchId, snapId);
    store.setBranchDirty(branchId, false);
    return snapId;
  }

  /**
   * Creates a new branch from the current working graph or a specific revision.
   * @param {Object} opts — { name, fromRevisionId? }
   * @returns {{ok: boolean, branchId: string|null, error: string|null}}
   */
  function createBranch(opts) {
    try {
      var snapshot = null;
      var snapshotId = null;
      var headRevId = null;
      var baseRevId = null;

      if (opts.fromRevisionId) {
        var fromRev = store.getRevision(opts.fromRevisionId);
        if (!fromRev) return { ok: false, branchId: null, error: 'Revision not found: ' + opts.fromRevisionId };
        snapshot = store.getSnapshot(fromRev.snapshotId);
        if (!snapshot) return { ok: false, branchId: null, error: 'Snapshot not found for revision' };
        snapshotId = fromRev.snapshotId;
        headRevId = opts.fromRevisionId;
        baseRevId = opts.fromRevisionId;
      } else {
        // Branch from current work
        snapshot = vcSnapshotSerializer.captureActiveGraph();
        snapshotId = store.storeSnapshot(snapshot);
      }

      var branchId = store.createBranch({
        name: opts.name,
        snapshotId: snapshotId,
        headRevisionId: headRevId,
        fromRevisionId: opts.fromRevisionId || null,
        baseRevisionId: baseRevId
      });

      return { ok: true, branchId: branchId, error: null };
    } catch (e) {
      return { ok: false, branchId: null, error: e.message || String(e) };
    }
  }

  /**
   * Gets the current working graph snapshot for a branch.
   * Captures the active graph into a snapshot, stores it, and updates the branch.
   * @param {string} branchId
   * @returns {Object} snapshot
   */
  function captureBranchWorkingSnapshot(branchId) {
    return saveWorkingSnapshot(branchId);
  }

  /**
   * Computes and returns whether the active branch is dirty.
   * @returns {boolean}
   */
  function isDirty() {
    return store.isBranchDirty(store.getRepository().activeBranchId);
  }

  return {
    createBranch: createBranch,
    saveWorkingSnapshot: saveWorkingSnapshot,
    captureBranchWorkingSnapshot: captureBranchWorkingSnapshot,
    isDirty: isDirty
  };

})();
