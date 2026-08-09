/**
 * Version Control Init — initialization and legacy migration.
 * @module vcVersionControlInit
 * @dependencies vcVersionControlState
 */
// versioning/versionControlInit.js
// MUST LOAD AFTER: versioning/versionControlState.js
// MUST LOAD BEFORE: versioning/versionControlService.js
// Dependencies: evalBridge, graphState, vcSnapshotSerializer

var vcVersionControlInit = (function() {

  var S = vcVersionControlState;

  /**
   * Initializes the version control system.
   * @returns {Promise<{ok, data, error, warnings}>}
   */
  function initialize() {
    if (S.isInitialized()) return Promise.resolve(S.ok({ alreadyInitialized: true }));
    if (typeof evalBridge === 'undefined') {
      return Promise.resolve(S.err('evalBridge not loaded — cannot initialize version control'));
    }
    if (typeof graphState === 'undefined') {
      return Promise.resolve(S.err('graphState not loaded — cannot initialize version control'));
    }
    function loadFromRepository() {
      return evalBridge.dispatch({ action: 'readRepo', params: {} }).then(function(res) {
        if (!res.ok) return S.ok({ found: false, repository: null, legacyGraph: null });
        var data = res.data;
        if (data && data.repositoryJSON) {
          try {
            var repo = JSON.parse(data.repositoryJSON);
            return S.ok({ found: true, repository: repo, legacyGraph: null });
          } catch (e) {
            return S.ok({ found: false, repository: null, legacyGraph: data.legacyGraph || null });
          }
        }
        return S.ok({ found: false, repository: null, legacyGraph: data.legacyGraph || null });
      }, function(err) {
        return S.ok({ found: false, repository: null, legacyGraph: null });
      });
    }
    function migrateFromLegacy() {
      try {
        var allNodes = graphState.getAllNodes();
        var hasNodes = false;
        for (var key in allNodes) {
          if (allNodes.hasOwnProperty(key)) { hasNodes = true; break; }
        }
        var snapshot = vcSnapshotSerializer.captureActiveGraph();
        S.getStore().initRepository(snapshot);
        return Promise.resolve(S.ok({ migrated: true, hasExistingGraph: hasNodes }));
      } catch (e) {
        return Promise.resolve(S.err('Migration failed: ' + (e.message || String(e))));
      }
    }
    return loadFromRepository().then(function(loadResult) {
      if (loadResult.ok && loadResult.data.found) {
        var repo = loadResult.data.repository;
        if (repo && repo.schemaVersion) {
          S.getStore().setRepository(repo);
          S.setInitialized(true);
          var invResult = S.getStore().checkInvariants();
          return S.ok({ initialized: true, source: 'persisted', invariantViolations: invResult.violations });
        }
      }
      return migrateFromLegacy().then(function(migrateResult) {
        if (migrateResult.ok) {
          S.setInitialized(true);
          if (typeof versionControl !== 'undefined') versionControl.saveRepository();
          return S.ok({ initialized: true, source: 'migrated' });
        }
        return S.err(migrateResult.error);
      });
    });
  }

  return { initialize: initialize };

})();
