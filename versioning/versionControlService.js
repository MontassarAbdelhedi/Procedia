/**
 * Version Control Service — top-level orchestration and public API for the
 * Procedia versioning system. The UI and integration layer interacts with
 * the graph through this service only.
 *
 * Coordinates repositoryStore, branchService, revisionService, snapshot
 * serialization, and eventually the diff/merge/activation layers.
 * @module versionControl
 * @dependencies vcRepositoryStore, vcBranchService, vcRevisionService, vcSnapshotSerializer
 */
// versioning/versionControlService.js
// DEPENDS ON: versioning/repositoryStore.js, versioning/branchService.js,
//             versioning/revisionService.js, versioning/snapshot/snapshotSerializer.js,
//             versioning/snapshot/snapshotChecksum.js,
//             bridge/evalBridge.js, graph/graphState.js
// MUST LOAD AFTER: versioning/repositoryStore.js, versioning/branchService.js,
//                  versioning/revisionService.js
// MUST LOAD BEFORE: index.js

var versionControl = (function() {

  var store = vcRepositoryStore;
  var branches = vcBranchService;
  var revisions = vcRevisionService;
  var _initialized = false;
  var _migrateWhenReady = false;

  /**
   * Result helper — always returns { ok, data, error, warnings }.
   */
  function _ok(data) {
    return { ok: true, data: data, error: null, warnings: [] };
  }

  function _err(error, warnings) {
    return { ok: false, data: null, error: error, warnings: warnings || [] };
  }

  // ---- Initialization ----

  /**
   * Initializes the version control system.
   * If the project has a legacy persisted graph but no repository, migrates it.
   * If the project already has a repository, loads it.
   * Called during panel startup after bridge is ready.
   * @returns {Promise<{ok, data, error, warnings}>}
   */
  function initialize() {
    if (_initialized) return Promise.resolve(_ok({ alreadyInitialized: true }));

    if (typeof evalBridge === 'undefined') {
      return Promise.resolve(_err('evalBridge not loaded — cannot initialize version control'));
    }

    if (typeof graphState === 'undefined') {
      return Promise.resolve(_err('graphState not loaded — cannot initialize version control'));
    }

    // First, attempt to read existing repository from persistence
    return _loadFromRepository().then(function(loadResult) {
      if (loadResult.ok && loadResult.data.found) {
        var repo = loadResult.data.repository;
        if (repo && repo.schemaVersion) {
          store.setRepository(repo);
          _initialized = true;

          // Verify invariants
          var invResult = store.checkInvariants();
          return _ok({
            initialized: true,
            source: 'persisted',
            invariantViolations: invResult.violations
          });
        }
      }

      // No repository found — migrate from legacy graph
      return _migrateFromLegacy().then(function(migrateResult) {
        if (migrateResult.ok) {
          _initialized = true;
          // Immediately persist the migrated repo
          saveRepository();
          return _ok({ initialized: true, source: 'migrated' });
        }
        return _err(migrateResult.error);
      });
    });
  }

  /**
   * Reads the repository from AE persistence via evalBridge.
   * @returns {Promise<{ok, data, error}>}
   */
  function _loadFromRepository() {
    return evalBridge.dispatch({
      action: 'readRepo',
      params: {}
    }).then(function(res) {
      if (!res.ok) {
        return _ok({ found: false, repository: null, legacyGraph: null });
      }

      var data = res.data;
      if (data && data.repositoryJSON) {
        try {
          var repo = JSON.parse(data.repositoryJSON);
          return _ok({ found: true, repository: repo, legacyGraph: null });
        } catch (e) {
          // Repository JSON corrupt — try legacy migration
          return _ok({ found: false, repository: null, legacyGraph: data.legacyGraph || null });
        }
      }

      // No repository but maybe legacy graph
      return _ok({ found: false, repository: null, legacyGraph: data.legacyGraph || null });
    }, function(err) {
      return _ok({ found: false, repository: null, legacyGraph: null });
    });
  }

  /**
   * Migrates from a legacy Procedia project (no repository) to a versioned one.
   * 1. Captures the current graph as a snapshot.
   * 2. Initializes a new repository with it as the root revision.
   * 3. Creates the main branch.
   * @returns {Promise<{ok, data, error}>}
   */
  function _migrateFromLegacy() {
    try {
      // Check if there IS a graph to migrate
      var allNodes = graphState.getAllNodes();
      var hasNodes = false;
      for (var key in allNodes) {
        if (allNodes.hasOwnProperty(key)) { hasNodes = true; break; }
      }

      if (hasNodes) {
        // Capture current graph as root snapshot
        var rootSnapshot = vcSnapshotSerializer.captureActiveGraph();
        store.initRepository(rootSnapshot);
        return Promise.resolve(_ok({ migrated: true, hasExistingGraph: true }));
      } else {
        // Empty graph — still initialize, with an empty root
        var emptySnapshot = vcSnapshotSerializer.captureActiveGraph();
        store.initRepository(emptySnapshot);
        return Promise.resolve(_ok({ migrated: true, hasExistingGraph: false }));
      }
    } catch (e) {
      return Promise.resolve(_err('Migration failed: ' + (e.message || String(e))));
    }
  }

  // ---- Query API ----

  function isInitialized() {
    return _initialized;
  }

  /**
   * Sets initialized flag manually (for testing and recovery).
   * @param {boolean} value
   */
  function setInitialized(value) {
    _initialized = value;
  }

  function getRepositorySummary() {
    if (!_initialized) return _err('Version control not initialized');
    try {
      var repo = store.getRepository();
      var branchList = [];
      var allBranches = store.getAllBranches();
      for (var bid in allBranches) {
        if (allBranches.hasOwnProperty(bid)) {
          branchList.push({
            id: bid,
            name: allBranches[bid].name,
            isActive: bid === repo.activeBranchId,
            isProtected: allBranches[bid].isProtected,
            dirty: store.isBranchDirty(bid)
          });
        }
      }

      var revCount = 0;
      var allRevs = store.getAllRevisions();
      for (var r in allRevs) { if (allRevs.hasOwnProperty(r)) revCount++; }

      var snapCount = 0;
      var allSnaps = repo.snapshots;
      for (var s in allSnaps) { if (allSnaps.hasOwnProperty(s)) snapCount++; }

      var activeBranch = store.getActiveBranch();

      return _ok({
        repositoryId: repo.repositoryId,
        schemaVersion: repo.schemaVersion,
        activeBranchId: repo.activeBranchId,
        activeBranchName: activeBranch ? activeBranch.name : null,
        branchCount: branchList.length,
        revisionCount: revCount,
        snapshotCount: snapCount,
        createdAt: repo.createdAt,
        updatedAt: repo.updatedAt,
        branches: branchList
      });
    } catch (e) {
      return _err(e.message || String(e));
    }
  }

  function getActiveBranch() {
    if (!_initialized) return _err('Version control not initialized');
    try {
      var branch = store.getActiveBranch();
      if (!branch) return _err('No active branch');
      return _ok({
        id: branch.id,
        name: branch.name,
        headRevisionId: branch.headRevisionId,
        dirty: store.isBranchDirty(branch.id),
        isProtected: branch.isProtected
      });
    } catch (e) {
      return _err(e.message || String(e));
    }
  }

  function listBranches() {
    if (!_initialized) return _err('Version control not initialized');
    try {
      var repo = store.getRepository();
      var result = [];
      var allBranches = store.getAllBranches();
      for (var bid in allBranches) {
        if (allBranches.hasOwnProperty(bid)) {
          var b = allBranches[bid];
          result.push({
            id: b.id,
            name: b.name,
            isActive: bid === repo.activeBranchId,
            isProtected: b.isProtected,
            dirty: store.isBranchDirty(b.id),
            createdAt: b.createdAt,
            updatedAt: b.updatedAt
          });
        }
      }
      return _ok(result);
    } catch (e) {
      return _err(e.message || String(e));
    }
  }

  function listRevisions(opts) {
    if (!_initialized) return _err('Version control not initialized');
    try {
      var list = revisions.listRevisions(opts || {});
      return _ok(list);
    } catch (e) {
      return _err(e.message || String(e));
    }
  }

  /**
   * Compares two snapshots using the semantic diff engine.
   * @param {string} fromSnapshotId
   * @param {string} toSnapshotId
   * @returns {{ok, data, error, warnings}}
   */
  function compareSnapshots(fromSnapshotId, toSnapshotId) {
    if (!_initialized) return _err('Version control not initialized');
    try {
      var fromSnap = store.getSnapshot(fromSnapshotId);
      var toSnap = store.getSnapshot(toSnapshotId);
      if (!fromSnap) return _err('Source snapshot not found: ' + fromSnapshotId);
      if (!toSnap) return _err('Target snapshot not found: ' + toSnapshotId);

      var diff = vcSemanticDiff.diff(fromSnap, toSnap);
      return _ok(diff);
    } catch (e) {
      return _err(e.message || String(e));
    }
  }

  /**
   * Previews a merge from sourceBranch into the current branch.
   * @param {string} sourceBranchId
   * @returns {{ok, data, error, warnings}}
   */
  function previewMerge(sourceBranchId) {
    if (!_initialized) return _err('Version control not initialized');
    try {
      var currentBranch = store.getActiveBranch();
      if (!currentBranch) return _err('No active branch');

      var result = vcThreeWayMerge.merge(sourceBranchId, currentBranch.id);
      if (!result.ok) return _err(result.code || 'Merge failed');

      var counts = vcConflictResolver.getConflictCounts(result.conflicts);
      return _ok({
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
      return _err(e.message || String(e));
    }
  }

  /**
   * Resolves a merge conflict.
   * @param {string} conflictId
   * @param {{resolution: string, customValue?: *}} resolution
   * @param {Object} candidateGraph — the current merge candidate graph
   * @param {Object} oursGraph — our snapshot graph
   * @param {Object} theirsGraph — their snapshot graph
   * @param {Array} conflicts — full conflicts array (mutated in place)
   * @returns {{ok, data, error}}
   */
  function resolveConflict(conflictId, resolution, candidateGraph, oursGraph, theirsGraph, conflicts) {
    try {
      var conflict = null;
      for (var i = 0; i < conflicts.length; i++) {
        if (conflicts[i].id === conflictId) { conflict = conflicts[i]; break; }
      }
      if (!conflict) return _err('Conflict not found: ' + conflictId);

      var result = vcConflictResolver.resolveConflict(
        conflict, resolution.resolution, resolution.customValue,
        candidateGraph, oursGraph, theirsGraph
      );
      if (!result.ok) return _err(result.error);
      return _ok({ resolved: true });
    } catch (e) {
      return _err(e.message || String(e));
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
    if (!_initialized) return _err('Version control not initialized');
    try {
      // Validate no unresolved blocking conflicts
      if (!mergeSession.conflicts) mergeSession.conflicts = [];
      if (vcConflictResolver.hasUnresolvedConflicts(mergeSession.conflicts)) {
        return _err('Cannot apply merge with unresolved blocking conflicts');
      }

      // Validate candidate
      var validation = vcMergeValidator.validate(mergeSession.candidateSnapshot);
      if (!validation.ok) return _err('Merge candidate failed validation: ' + validation.errors.join('; '));

      // Store candidate snapshot
      var snapId = store.storeSnapshot(mergeSession.candidateSnapshot);

      // Get source and target branch heads for parents
      var sourceBranch = store.getBranch(mergeSession.sourceBranchId);
      var targetBranch = store.getActiveBranch();
      if (!sourceBranch || !targetBranch) return _err('Source or target branch not found');

      var parentIds = [
        targetBranch.headRevisionId,
        sourceBranch.headRevisionId
      ];

      // Create merge revision
      var revId = store.createRevision({
        message: message || 'Merge ' + sourceBranch.name + ' into ' + targetBranch.name,
        snapshotId: snapId,
        parentIds: parentIds,
        kind: 'merge',
        branchId: targetBranch.id,
        summary: mergeSession.summary || {}
      });

      // Advance target branch
      store.updateBranchHead(targetBranch.id, revId);
      store.updateBranchWorkingSnapshot(targetBranch.id, snapId);
      store.setBranchDirty(targetBranch.id, false);

      return _ok({ revisionId: revId });
    } catch (e) {
      return _err(e.message || String(e));
    }
  }

  /**
   * Switches to a different branch.
   * @param {string} branchId
   * @returns {Promise<{ok, data, error}>}
   */
  function switchBranch(branchId) {
    if (!_initialized) return _err('Version control not initialized');
    try {
      if (typeof vcActivationCoordinator === 'undefined') {
        return Promise.resolve(_err('Activation coordinator not loaded'));
      }
      return vcActivationCoordinator.switchBranch(branchId);
    } catch (e) {
      return Promise.resolve(_err(e.message || String(e)));
    }
  }

  /**
   * Restores a historical revision as the current working graph.
   * @param {string} revisionId
   * @returns {Promise<{ok, data, error}>}
   */
  function restoreRevision(revisionId) {
    if (!_initialized) return _err('Version control not initialized');
    try {
      if (typeof vcActivationCoordinator === 'undefined') {
        return Promise.resolve(_err('Activation coordinator not loaded'));
      }
      return vcActivationCoordinator.restoreRevision(revisionId);
    } catch (e) {
      return Promise.resolve(_err(e.message || String(e)));
    }
  }

  // ---- Mutation API ----

  /**
   * Creates a new immutable version from the current working graph.
   * @param {string} message
   * @returns {{ok, data, error, warnings}}
   */
  function createVersion(message) {
    if (!_initialized) return _err('Version control not initialized');
    if (!message || message.trim() === '') return _err('Version message is required');

    try {
      var result = revisions.createVersion({
        message: message.trim(),
        kind: 'user'
      });

      if (!result.ok) return _err(result.error);
      return _ok({ revisionId: result.revisionId });
    } catch (e) {
      return _err(e.message || String(e));
    }
  }

  /**
   * Creates a new branch.
   * @param {Object} options — { name, fromRevisionId? }
   * @returns {{ok, data, error, warnings}}
   */
  function createBranch(options) {
    if (!_initialized) return _err('Version control not initialized');
    if (!options || !options.name || options.name.trim() === '') return _err('Branch name is required');

    try {
      var result = branches.createBranch({
        name: options.name,
        fromRevisionId: options.fromRevisionId || null
      });

      if (!result.ok) return _err(result.error);
      return _ok({ branchId: result.branchId });
    } catch (e) {
      return _err(e.message || String(e));
    }
  }

  function renameBranch(branchId, name) {
    if (!_initialized) return _err('Version control not initialized');
    if (!name || name.trim() === '') return _err('Branch name is required');
    try {
      store.renameBranch(branchId, name);
      return _ok({ renamed: true });
    } catch (e) {
      return _err(e.message || String(e));
    }
  }

  function deleteBranch(branchId) {
    if (!_initialized) return _err('Version control not initialized');
    try {
      store.deleteBranch(branchId);
      return _ok({ deleted: true });
    } catch (e) {
      return _err(e.message || String(e));
    }
  }

  /**
   * Generates a suggested message for the next version based on changes
   * since the branch head.
   * @returns {string}
   */
  function getSuggestedVersionMessage() {
    if (!_initialized) return 'Save Version';
    try {
      var branch = store.getActiveBranch();
      if (!branch) return 'Save Version';

      var snapshot = vcSnapshotSerializer.captureActiveGraph();
      return revisions.generateSuggestedMessage(branch.headRevisionId, snapshot.id);
    } catch (e) {
      return 'Save Version';
    }
  }

  /**
   * Checks invariants and returns any violations.
   * @returns {{ok, data, error}}
   */
  function checkIntegrity() {
    if (!_initialized) return _err('Version control not initialized');
    try {
      var result = store.checkInvariants();
      return _ok(result);
    } catch (e) {
      return _err(e.message || String(e));
    }
  }

  // ---- Persistence ----

  /**
   * Saves the current repository to AE via the bridge.
   * Captures current worktree, serializes, and dispatches.
   * @returns {Promise<void>}
   */
  function saveRepository() {
    if (!_initialized) return;

    try {
      // Capture current worktree
      var branch = store.getActiveBranch();
      if (branch && store.isBranchDirty(branch.id)) {
        branches.saveWorkingSnapshot(branch.id);
      }

      var repo = store.getRepository();
      var repoJSON = JSON.stringify(repo);

      if (typeof evalBridge !== 'undefined') {
        evalBridge.fireAndForget({
          action: 'writeRepo',
          params: { repoJSON: repoJSON }
        });
      }
    } catch (e) {
      // Silent fail — persistence is best-effort
    }
  }

  /**
   * Serializes the complete repository for AE persistence.
   * @returns {Object|null}
   */
  function serializeRepository() {
    if (!_initialized) return null;
    try {
      var branch2 = store.getActiveBranch();
      if (branch2 && store.isBranchDirty(branch2.id)) {
        branches.saveWorkingSnapshot(branch2.id);
      }
      return store.getRepository();
    } catch (e) {
      return null;
    }
  }

  return {
        // Init
        initialize: initialize,
        isInitialized: isInitialized,
        setInitialized: setInitialized,

        // Query
        getRepositorySummary: getRepositorySummary,
        getActiveBranch: getActiveBranch,
        listBranches: listBranches,
        listRevisions: listRevisions,
        compareSnapshots: compareSnapshots,
        previewMerge: previewMerge,

        // Mutations
        createVersion: createVersion,
        createBranch: createBranch,
        renameBranch: renameBranch,
        deleteBranch: deleteBranch,
        resolveConflict: resolveConflict,
        applyMerge: applyMerge,

        // Activation
        switchBranch: switchBranch,
        restoreRevision: restoreRevision,

    // Helpers
    getSuggestedVersionMessage: getSuggestedVersionMessage,
    checkIntegrity: checkIntegrity,

        // Persistence
        serializeRepository: serializeRepository,
        saveRepository: saveRepository
  };

})();
