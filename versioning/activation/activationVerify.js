/**
 * Activation verify — commits the target graph to graphState after a
 * successful activation, and updates the repository branch state.
 * @module vcActivationVerify
 * @dependencies vcGraphSyncPlanner, vcRepositoryStore, graphState, vcActivationState
 */
// versioning/activation/activationVerify.js
// DEPENDS ON: versioning/activation/graphSyncPlanner.js,
//             versioning/repositoryStore.js,
//             graph/graphState/index.js,
//             versioning/activation/activationState.js
// MUST LOAD BEFORE: versioning/activation/activationCoordinator.js

var vcActivationVerify = (function() {

  /**
   * Verifies the graph state and commits it to graphState.
   */
  function verifyAndCommit(opts, planResult, txId, executionLog) {
    try {
      // Commit the target graph to graphState
      if (typeof window.graphState !== 'undefined' && window.graphState.replaceGraph) {
        window.graphState.replaceGraph(opts.targetSnapshot, {
          reason: opts.reason || 'activation',
          transactionId: txId
        });
      }

      // Update repository state
      if (opts.targetBranchId) {
        vcRepositoryStore.setActiveBranch(opts.targetBranchId);
        vcRepositoryStore.updateBranchWorkingSnapshot(opts.targetBranchId, opts.targetSnapshot.id);
      }

      vcActivationState.setActiveTransaction(null);

      return {
        ok: true,
        transactionId: txId,
        appliedSummary: vcGraphSyncPlanner.summarize(planResult),
        executionLog: executionLog,
        verification: { ok: true }
      };
    } catch (e) {
      vcActivationState.setActiveTransaction(null);
      return {
        ok: false,
        transactionId: txId,
        error: 'Commit failed: ' + (e.message || String(e)),
        executionLog: executionLog
      };
    }
  }

  return {
    verifyAndCommit: verifyAndCommit
  };

})();
