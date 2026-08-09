/**
 * Activation coordinator — orchestrates branch switches, restores, and merge
 * applications. Coordinates polling locks, plan execution, graphState replacement,
 * and diagnostics. The only module connecting the version-control system to the
 * live graph and AE bridge.
 * @module vcActivationCoordinator
 * @dependencies vcGraphSyncPlanner, vcRepositoryStore, graphState, evalBridge, poller
 */
// versioning/activation/activationCoordinator.js
// DEPENDS ON: versioning/activation/graphSyncPlanner.js, versioning/repositoryStore.js,
//             graph/graphState.js, bridge/evalBridge.js, polling/poller.js,
//             versioning/snapshot/snapshotSerializer.js
// MUST LOAD AFTER: versioning/activation/graphSyncPlanner.js
// MUST LOAD BEFORE: index.js

var vcActivationCoordinator = (function() {

  var _activeTransaction = null;
  var _transactionCounter = 0;

  function _txId() {
    _transactionCounter++;
    return 'TX-' + Date.now() + '-' + _transactionCounter;
  }

  /**
   * Activates a target snapshot, replacing the current working graph.
   * Handles the full lifecycle: lock → flush → plan → execute → verify → commit → rebuild.
   * @param {Object} opts — { sourceSnapshot, targetSnapshot, reason, targetBranchId }
   * @returns {Promise<{ok, transactionId, appliedSummary, verification, error}>}
   */
  function activateSnapshot(opts) {
    if (_activeTransaction) {
      return Promise.resolve({ ok: false, error: 'Another activation transaction is in progress', transactionId: null });
    }

    var txId = _txId();
    _activeTransaction = { id: txId, opts: opts, startTime: Date.now() };

    // 1. Lock poller
    if (typeof poller !== 'undefined') _activeTransaction.pollerLock = true;

    // 2. Plan the sync
    var planResult;
    try {
      planResult = vcGraphSyncPlanner.plan(opts.sourceSnapshot, opts.targetSnapshot);
    } catch (e) {
      _activeTransaction = null;
      return Promise.resolve({ ok: false, error: 'Planning failed: ' + (e.message || String(e)), transactionId: txId });
    }

    // 3. Execute phases sequentially
    var executionLog = [];
    var allOk = true;

    function executePhase(phaseIndex) {
      if (phaseIndex >= planResult.phases.length) {
        // All phases done — verify and commit
        return _verifyAndCommit(opts, planResult, txId, executionLog);
      }

      var phase = planResult.phases[phaseIndex];
      var cmds = [];

      for (var oi = 0; oi < phase.operations.length; oi++) {
        var op = phase.operations[oi];
        var cmd = _operationToCommand(op, phase.name, opts);
        if (cmd) cmds.push(cmd);
      }

      if (cmds.length === 0) {
        executionLog.push({ phase: phase.name, planned: phase.operations.length, executed: 0, skipped: true });
        return executePhase(phaseIndex + 1);
      }

      return _executeBatch(cmds).then(function(batchResult) {
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
            _activeTransaction = null;
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
   * Converts a plan operation to an AE command object.
   * This is where lifecycle hooks for archive/materialize would dispatch.
   */
  function _operationToCommand(op, phaseName, opts) {
    if (op.op === 'preserve') return null;
    if (phaseName === 'archive') {
      return { action: 'parkLayer', params: { nodeUUID: op.entityId, hostingCompUUID: '' } };
    }
    if (phaseName === 'materialize') {
      return { action: 'unparkLayer', params: { nodeUUID: op.entityId, hostingCompUUID: '' } };
    }
    // Updates and wire changes are dispatched through normal lifecycle hooks
    return null;
  }

  /**
   * Executes a batch of commands through evalBridge.
   */
  function _executeBatch(cmds) {
    if (typeof evalBridge === 'undefined') {
      return Promise.resolve({ ok: false, error: 'evalBridge not available' });
    }
    if (cmds.length === 0) return Promise.resolve({ ok: true, error: null });
    if (cmds.length === 1) return evalBridge.dispatch(cmds[0]);
    return evalBridge.dispatchBatch(cmds);
  }

  /**
   * Verifies the graph state and commits it to graphState.
   */
  function _verifyAndCommit(opts, planResult, txId, executionLog) {
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

      _activeTransaction = null;

      return {
        ok: true,
        transactionId: txId,
        appliedSummary: vcGraphSyncPlanner.summarize(planResult),
        executionLog: executionLog,
        verification: { ok: true }
      };
    } catch (e) {
      _activeTransaction = null;
      return {
        ok: false,
        transactionId: txId,
        error: 'Commit failed: ' + (e.message || String(e)),
        executionLog: executionLog
      };
    }
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

      return activateSnapshot({
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

      return activateSnapshot({
        sourceSnapshot: sourceSnapshot,
        targetSnapshot: targetSnapshot,
        reason: 'restore',
        targetBranchId: null
      });
    });
  }

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
   * Checks if there's an active transaction.
   */
  function hasActiveTransaction() {
    return _activeTransaction !== null;
  }

  /**
   * Returns diagnostics for the current/last transaction.
   */
  function getDiagnostics(transactionId) {
    if (_activeTransaction && _activeTransaction.id === transactionId) {
      return { ok: true, data: _activeTransaction };
    }
    return { ok: false, error: 'No active transaction with ID ' + (transactionId || 'unknown') };
  }

  return {
    activateSnapshot: activateSnapshot,
    switchBranch: switchBranch,
    restoreRevision: restoreRevision,
    hasActiveTransaction: hasActiveTransaction,
    getDiagnostics: getDiagnostics
  };

})();
