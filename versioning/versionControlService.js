/**
 * Version Control Service — top-level orchestration and public API for the
 * Procedia versioning system. The UI and integration layer interacts with
 * the graph through this service only.
 *
 * Delegates to sub-modules: versionControlState, versionControlInit,
 * versionControlQueries, versionControlDiffMerge, versionControlResolve,
 * versionControlMutations, versionControlActivation, versionControlHelpers.
 * @module versionControl
 * @dependencies vcVersionControlState, vcVersionControlInit, vcVersionControlQueries,
 *               vcVersionControlDiffMerge, vcVersionControlResolve,
 *               vcVersionControlMutations, vcVersionControlActivation,
 *               vcVersionControlHelpers
 */
// versioning/versionControlService.js
// MUST LOAD BEFORE: index.js

var versionControl = (function() {

  var S = vcVersionControlState;
  var I = vcVersionControlInit;
  var Q = vcVersionControlQueries;
  var D = vcVersionControlDiffMerge;
  var R = vcVersionControlResolve;
  var M = vcVersionControlMutations;
  var A = vcVersionControlActivation;
  var H = vcVersionControlHelpers;

  return {
    initialize: I.initialize,
    isInitialized: S.isInitialized,
    setInitialized: S.setInitialized,

    getRepositorySummary: Q.getRepositorySummary,
    getActiveBranch: Q.getActiveBranch,
    listBranches: Q.listBranches,
    listRevisions: Q.listRevisions,
    compareSnapshots: D.compareSnapshots,
    previewMerge: D.previewMerge,

    createVersion: M.createVersion,
    createBranch: M.createBranch,
    renameBranch: M.renameBranch,
    deleteBranch: M.deleteBranch,
    resolveConflict: R.resolveConflict,
    applyMerge: R.applyMerge,

    switchBranch: A.switchBranch,
    restoreRevision: A.restoreRevision,

    getSuggestedVersionMessage: H.getSuggestedVersionMessage,
    checkIntegrity: H.checkIntegrity,

    serializeRepository: H.serializeRepository,
    saveRepository: H.saveRepository
  };

})();
