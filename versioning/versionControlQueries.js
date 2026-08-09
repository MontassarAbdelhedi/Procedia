/**
 * Version Control Queries — read-only query methods.
 * @module vcVersionControlQueries
 * @dependencies vcVersionControlState
 */
// versioning/versionControlQueries.js
// MUST LOAD AFTER: versioning/versionControlState.js
// MUST LOAD BEFORE: versioning/versionControlService.js
var vcVersionControlQueries = (function() {
  var S = vcVersionControlState;

  function getRepositorySummary() {
    if (!S.isInitialized()) return S.err('Version control not initialized');
    try {
      var repo = S.getStore().getRepository();
      var branchList = [];
      var allBranches = S.getStore().getAllBranches();
      for (var bid in allBranches) {
        if (allBranches.hasOwnProperty(bid)) {
          branchList.push({
            id: bid,
            name: allBranches[bid].name,
            isActive: bid === repo.activeBranchId,
            isProtected: allBranches[bid].isProtected,
            dirty: S.getStore().isBranchDirty(bid)
          });
        }
      }
      var revCount = 0,
          allRevs = S.getStore().getAllRevisions(),
          snapCount = 0,
          allSnaps = repo.snapshots;
      for (var r in allRevs) { if (allRevs.hasOwnProperty(r)) revCount++; }
      for (var s in allSnaps) { if (allSnaps.hasOwnProperty(s)) snapCount++; }
      var activeBranch = S.getStore().getActiveBranch();
      return S.ok({
        repositoryId: repo.repositoryId, schemaVersion: repo.schemaVersion,
        activeBranchId: repo.activeBranchId,
        activeBranchName: activeBranch ? activeBranch.name : null,
        branchCount: branchList.length, revisionCount: revCount,
        snapshotCount: snapCount, createdAt: repo.createdAt,
        updatedAt: repo.updatedAt, branches: branchList
      });
    } catch (e) {
      return S.err(e.message || String(e));
    }
  }

  function getActiveBranch() {
    if (!S.isInitialized()) return S.err('Version control not initialized');
    try {
      var branch = S.getStore().getActiveBranch();
      if (!branch) return S.err('No active branch');
      return S.ok({
        id: branch.id, name: branch.name, headRevisionId: branch.headRevisionId,
        dirty: S.getStore().isBranchDirty(branch.id), isProtected: branch.isProtected
      });
    } catch (e) {
      return S.err(e.message || String(e));
    }
  }

  function listBranches() {
    if (!S.isInitialized()) return S.err('Version control not initialized');
    try {
      var repo = S.getStore().getRepository();
      var result = [];
      var allBranches = S.getStore().getAllBranches();
      for (var bid in allBranches) {
        if (allBranches.hasOwnProperty(bid)) {
          var b = allBranches[bid];
          result.push({
            id: b.id, name: b.name, isActive: bid === repo.activeBranchId,
            isProtected: b.isProtected, dirty: S.getStore().isBranchDirty(b.id),
            createdAt: b.createdAt, updatedAt: b.updatedAt
          });
        }
      }
      return S.ok(result);
    } catch (e) {
      return S.err(e.message || String(e));
    }
  }

  function listRevisions(opts) {
    if (!S.isInitialized()) return S.err('Version control not initialized');
    try {
      return S.ok(S.getRevisions().listRevisions(opts || {}));
    } catch (e) {
      return S.err(e.message || String(e));
    }
  }

  return {
    getRepositorySummary: getRepositorySummary,
    getActiveBranch: getActiveBranch,
    listBranches: listBranches,
    listRevisions: listRevisions
  };
})();
