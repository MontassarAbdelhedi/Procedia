/**
 * Repository core — shared state, helpers, and init/access functions.
 * @module vcRepoCore
 */
// versioning/repository/storeCore.js
// DEPENDS ON: data/uuidGenerator.js
// MUST LOAD BEFORE: versioning/repository/snapshots.js, versioning/repository/revisions.js,
//                   versioning/repository/branchCRUD.js

var vcRepoCore = (function() {

  var _repo = null;

  function _vcId(prefix) {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
  }
  function _now() { return Date.now(); }
  function _getRepo() { return _repo; }

  /**
   * Initializes a new empty repository with a root snapshot and main branch.
   * @param {Object} rootSnapshot — the initial graph snapshot
   * @returns {Object} the new repository object
   */
  function initRepository(rootSnapshot) {
    var repoId = _vcId('REPO');
    var now = _now();
    var rootRevisionId = _vcId('REV');
    var mainBranchId = 'BR-main';
    var snapshotId = rootSnapshot ? rootSnapshot.id : _vcId('SNAP');

    var repo = {
      schemaVersion: 1,
      repositoryId: repoId,
      createdAt: now,
      updatedAt: now,
      activeBranchId: mainBranchId,
      branches: {},
      revisions: {},
      snapshots: {},
      managedArtifacts: {},
      storage: {
        currentGenerationId: null,
        previousGenerationId: null,
        lastVerifiedChecksum: null
      }
    };

    if (rootSnapshot) {
      repo.snapshots[snapshotId] = rootSnapshot;
    }

    if (!rootSnapshot) {
      throw new Error('Root snapshot required to initialize repository');
    }

    repo.revisions[rootRevisionId] = {
      id: rootRevisionId,
      parentIds: [],
      snapshotId: snapshotId,
      graphChecksum: rootSnapshot.checksum,
      message: 'Initial Procedia graph',
      kind: 'root',
      createdAt: now,
      branchIdAtCreation: mainBranchId,
      summary: { nodesAdded: 0, nodesRemoved: 0, nodesChanged: 0, wiresAdded: 0, wiresRemoved: 0, wiresChanged: 0 },
      generation: 0
    };

    repo.branches[mainBranchId] = {
      id: mainBranchId,
      name: 'main',
      normalizedName: 'main',
      headRevisionId: rootRevisionId,
      workingSnapshotId: snapshotId,
      baseRevisionId: rootRevisionId,
      dirty: false,
      createdFromRevisionId: rootRevisionId,
      createdAt: now,
      updatedAt: now,
      isProtected: true
    };

    _repo = repo;
    return repo;
  }

  function getRepository() { return _repo; }
  function setRepository(repo) { _repo = repo; }
  function hasRepository() { return _repo !== null; }

  return {
    _getRepo: _getRepo, _vcId: _vcId, _now: _now,
    initRepository: initRepository,
    getRepository: getRepository, setRepository: setRepository, hasRepository: hasRepository
  };
})();
