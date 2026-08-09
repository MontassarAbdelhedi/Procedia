/**
 * Activation coordinator — orchestrates snapshot activation (lock → plan → execute →
 * verify). Connects the VC system to the live graph and AE bridge. switchBranch and
 * restoreRevision are attached by activationActions.js.
 * @module vcActivationCoordinator
 */
// versioning/activation/activationCoordinator.js
// DEPENDS ON: activation/graphSyncPlanner.js, repositoryStore.js, graph/graphState/index.js,
//             bridge/evalBridge.js, polling/poller.js, snapshot/snapshotSerializer.js,
//             activation/activationState.js, activationCommands.js, activationVerify.js
// MUST LOAD AFTER: activationState.js, activationCommands.js, activationVerify.js
// MUST LOAD BEFORE: activationActions.js

var vcActivationCoordinator = (function() {

  /**
   * Activates a target snapshot, replacing the current working graph.
   * @param {Object} opts — { sourceSnapshot, targetSnapshot, reason, targetBranchId }
   */
  function activateSnapshot(opts) {
    if (vcActivationState.hasActiveTransaction()) {
      return Promise.resolve({ ok: false, error: 'Another activation transaction is in progress', transactionId: null });
    }

    var txId = vcActivationState._txId();
    vcActivationState.setActiveTransaction({ id: txId, opts: opts, startTime: Date.now() });

    // 1. Lock poller
    if (typeof poller !== 'undefined') vcActivationState.getActiveTransaction().pollerLock = true;

    // 2. Plan the sync
    var planResult;
    try {
      planResult = vcGraphSyncPlanner.plan(opts.sourceSnapshot, opts.targetSnapshot);
    } catch (e) {
      vcActivationState.setActiveTransaction(null);
      return Promise.resolve({ ok: false, error: 'Planning failed: ' + (e.message || String(e)), transactionId: txId });
    }

    // 3. Execute phases sequentially
    var executionLog = [];
    var allOk = true;

    function executePhase(phaseIndex) {
      if (phaseIndex >= planResult.phases.length) {
        // All phases done — verify and commit
        return Promise.resolve(vcActivationVerify.verifyAndCommit(opts, planResult, txId, executionLog));
      }

      var phase = planResult.phases[phaseIndex];
      var cmds = [];

      for (var oi = 0; oi < phase.operations.length; oi++) {
        var op = phase.operations[oi];
        var cmd = vcActivationCommands.operationToCommand(op, phase.name);
        if (cmd) cmds.push(cmd);
      }

      if (cmds.length === 0) {
        executionLog.push({ phase: phase.name, planned: phase.operations.length, executed: 0, skipped: true });
        return executePhase(phaseIndex + 1);
      }

      return vcActivationCommands.executeBatch(cmds).then(function(batchResult) {
        executionLog.push({
          phase: phase.name,
          planned: phase.operations.length,
          executed: cmds.length,
          ok: batchResult.ok,
          error: batchResult.error
        });

        if (!batchResult.ok) {
          allOk = false;
          return _reconcile(opts, txId, executionLog).then(function(recResult) {
            vcActivationState.setActiveTransaction(null);
            return {
              ok: false,
              transactionId: txId,
              error: 'Phase ' + phase.name + ' failed: ' + batchResult.error,
              executionLog: executionLog,
              reconciled: recResult.ok,
              reconciliationError: recResult.error
            };
          });
        }

        return executePhase(phaseIndex + 1);
      });
    }

    return executePhase(0);
  }

  /**
   * Attempts to reconcile back to source state on failure.
   */
  function _reconcile(opts, txId, executionLog) {
    // Best-effort: activate the source snapshot to restore state
    return activateSnapshot({
      sourceSnapshot: opts.targetSnapshot,
      targetSnapshot: opts.sourceSnapshot,
      reason: 'reconcile',
      targetBranchId: null
    });
  }

  return {
    activateSnapshot: activateSnapshot,
    hasActiveTransaction: vcActivationState.hasActiveTransaction,
    getDiagnostics: vcActivationState.getDiagnostics
    // switchBranch and restoreRevision are attached by activationActions.js
  };

})();
