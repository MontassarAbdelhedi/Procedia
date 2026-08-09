/**
 * Version Control Resolve — conflict resolution and merge application
 * for the version control service.
 * @module vcVersionControlResolve
 * @dependencies vcVersionControlState, vcConflictResolver, vcMergeValidator
 */
// versioning/versionControlResolve.js
// MUST LOAD AFTER: versioning/versionControlState.js
// MUST LOAD BEFORE: versioning/versionControlService.js

var vcVersionControlResolve = (function() {

  var S = vcVersionControlState;

  /**
   * Resolves a merge conflict.
   * @param {string} conflictId
   * @param {{resolution: string, customValue?: *}} resolution
   * @param {Object} candidateGraph
   * @param {Object} oursGraph
   * @param {Object} theirsGraph
   * @param {Array} conflicts — mutated in place
   * @returns {{ok, data, error}}
   */
  function resolveConflict(conflictId, resolution, candidateGraph, oursGraph, theirsGraph, conflicts) {
    try {
      var conflict = null;
      for (var i = 0; i < conflicts.length; i++) {
        if (conflicts[i].id === conflictId) { conflict = conflicts[i]; break; }
      }
      if (!conflict) return S.err('Conflict not found: ' + conflictId);
      var result = vcConflictResolver.resolveConflict(
        conflict, resolution.resolution, resolution.customValue,
        candidateGraph, oursGraph, theirsGraph
      );
      if (!result.ok) return S.err(result.error);
      return S.ok({ resolved: true });
    } catch (e) {
      return S.err(e.message || String(e));
    }
  }

  /**
   * Applies a merge after all conflicts are resolved.
   * Creates a merge revision and advances the target branch head.
   * @param {Object} mergeSession — { sourceBranchId, candidateSnapshot, conflicts }
   * @param {string} message
   * @returns {{ok, data, error}}
   */
  function applyMerge(mergeSession, message) {
    if (!S.isInitialized()) return S.err('Version control not initialized');
    try {
      if (!mergeSession.conflicts) mergeSession.conflicts = [];
      if (vcConflictResolver.hasUnresolvedConflicts(mergeSession.conflicts)) {
        return S.err('Cannot apply merge with unresolved blocking conflicts');
      }
      var validation = vcMergeValidator.validate(mergeSession.candidateSnapshot);
      if (!validation.ok) return S.err('Merge candidate failed validation: ' + validation.errors.join('; '));
      var snapId = S.getStore().storeSnapshot(mergeSession.candidateSnapshot);
      var sourceBranch = S.getStore().getBranch(mergeSession.sourceBranchId);
      var targetBranch = S.getStore().getActiveBranch();
      if (!sourceBranch || !targetBranch) return S.err('Source or target branch not found');
      var parentIds = [targetBranch.headRevisionId, sourceBranch.headRevisionId];
      var revId = S.getStore().createRevision({
        message: message || 'Merge ' + sourceBranch.name + ' into ' + targetBranch.name,
        snapshotId: snapId,
        parentIds: parentIds,
        kind: 'merge',
        branchId: targetBranch.id,
        summary: mergeSession.summary || {}
      });
      S.getStore().updateBranchHead(targetBranch.id, revId);
      S.getStore().updateBranchWorkingSnapshot(targetBranch.id, snapId);
      S.getStore().setBranchDirty(targetBranch.id, false);
      return S.ok({ revisionId: revId });
    } catch (e) {
      return S.err(e.message || String(e));
    }
  }

  return {
    resolveConflict: resolveConflict,
    applyMerge: applyMerge
  };

})();
