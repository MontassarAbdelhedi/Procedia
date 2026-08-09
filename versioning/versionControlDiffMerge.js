/**
 * Version Control Diff & Merge — snapshot comparison and merge preview
 * for the version control service.
 * @module vcVersionControlDiffMerge
 * @dependencies vcVersionControlState, vcSemanticDiff, vcThreeWayMerge,
 *               vcConflictResolver
 */
// versioning/versionControlDiffMerge.js
// MUST LOAD AFTER: versioning/versionControlState.js
// MUST LOAD BEFORE: versioning/versionControlService.js

var vcVersionControlDiffMerge = (function() {

  var S = vcVersionControlState;

  /**
   * Compares two snapshots using the semantic diff engine.
   * @param {string} fromSnapshotId
   * @param {string} toSnapshotId
   * @returns {{ok, data, error, warnings}}
   */
  function compareSnapshots(fromSnapshotId, toSnapshotId) {
    if (!S.isInitialized()) return S.err('Version control not initialized');
    try {
      var fromSnap = S.getStore().getSnapshot(fromSnapshotId);
      var toSnap = S.getStore().getSnapshot(toSnapshotId);
      if (!fromSnap) return S.err('Source snapshot not found: ' + fromSnapshotId);
      if (!toSnap) return S.err('Target snapshot not found: ' + toSnapshotId);
      return S.ok(vcSemanticDiff.diff(fromSnap, toSnap));
    } catch (e) {
      return S.err(e.message || String(e));
    }
  }

  /**
   * Previews a merge from sourceBranch into the current branch.
   * @param {string} sourceBranchId
   * @returns {{ok, data, error, warnings}}
   */
  function previewMerge(sourceBranchId) {
    if (!S.isInitialized()) return S.err('Version control not initialized');
    try {
      var currentBranch = S.getStore().getActiveBranch();
      if (!currentBranch) return S.err('No active branch');
      var result = vcThreeWayMerge.merge(sourceBranchId, currentBranch.id);
      if (!result.ok) return S.err(result.code || 'Merge failed');
      var counts = vcConflictResolver.getConflictCounts(result.conflicts);
      return S.ok({
        code: result.code,
        conflicts: result.conflicts,
        conflictCounts: counts,
        summary: result.summary,
        candidateSnapshot: result.candidateSnapshot,
        hasUnresolved: vcConflictResolver.hasUnresolvedConflicts(result.conflicts),
        baseSnapshotId: result.baseSnapshotId,
        oursSnapshotId: result.oursSnapshotId,
        theirsSnapshotId: result.theirsSnapshotId
      });
    } catch (e) {
      return S.err(e.message || String(e));
    }
  }

  return {
    compareSnapshots: compareSnapshots,
    previewMerge: previewMerge
  };

})();
