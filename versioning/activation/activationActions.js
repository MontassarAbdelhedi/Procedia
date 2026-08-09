/**
 * Activation actions — branch switching and revision restoration. Augments
 * vcActivationCoordinator with switchBranch and restoreRevision after the
 * coordinator is defined (avoids circular dependency on activateSnapshot).
 * @module vcActivationActions
 * @dependencies vcActivationCoordinator, vcSnapshotSerializer, vcRepositoryStore, poller
 */
// versioning/activation/activationActions.js
// DEPENDS ON: versioning/activation/activationCoordinator.js,
//             versioning/snapshot/snapshotSerializer.js,
//             versioning/repositoryStore.js,
//             polling/poller.js
// MUST LOAD AFTER: versioning/activation/activationCoordinator.js
// MUST LOAD BEFORE: index.js

var vcActivationActions = (function() {

  /**
   * Wraps an async operation in a poller write lock.
   */
  function _withWriteLock(fn) {
    if (typeof poller !== 'undefined' && poller.withWriteLock) {
      return poller.withWriteLock(fn);
    }
    return fn();
  }

  /**
   * Switches to a different branch.
   */
  function switchBranch(branchId) {
    return _withWriteLock(function() {
      var currentBranch = vcRepositoryStore.getActiveBranch();
      var targetBranch = vcRepositoryStore.getBranch(branchId);
      if (!targetBranch) return Promise.resolve({ ok: false, error: 'Branch not found: ' + branchId });

      // Capture current worktree
      var sourceSnapshot = vcSnapshotSerializer.captureActiveGraph();
      vcRepositoryStore.storeSnapshot(sourceSnapshot);
      if (currentBranch) {
        vcRepositoryStore.updateBranchWorkingSnapshot(currentBranch.id, sourceSnapshot.id);
      }

      // Load target snapshot
      var targetSnapshot = vcRepositoryStore.getSnapshot(targetBranch.workingSnapshotId);
      if (!targetSnapshot) return Promise.resolve({ ok: false, error: 'Target branch has no working snapshot' });

      return vcActivationCoordinator.activateSnapshot({
        sourceSnapshot: sourceSnapshot,
        targetSnapshot: targetSnapshot,
        reason: 'branch-switch',
        targetBranchId: branchId
      });
    });
  }

  /**
   * Restores a historical revision as the current working graph.
   */
  function restoreRevision(revisionId) {
    return _withWriteLock(function() {
      var revision = vcRepositoryStore.getRevision(revisionId);
      if (!revision) return Promise.resolve({ ok: false, error: 'Revision not found: ' + revisionId });

      var sourceSnapshot = vcSnapshotSerializer.captureActiveGraph();
      var targetSnapshot = vcRepositoryStore.getSnapshot(revision.snapshotId);
      if (!targetSnapshot) return Promise.resolve({ ok: false, error: 'Snapshot not found for revision' });

      return vcActivationCoordinator.activateSnapshot({
        sourceSnapshot: sourceSnapshot,
        targetSnapshot: targetSnapshot,
        reason: 'restore',
        targetBranchId: null
      });
    });
  }

  // Augment the coordinator with these methods
  vcActivationCoordinator.switchBranch = switchBranch;
  vcActivationCoordinator.restoreRevision = restoreRevision;

  return {
    switchBranch: switchBranch,
    restoreRevision: restoreRevision,
    withWriteLock: _withWriteLock
  };

})();
