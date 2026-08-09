/**
 * Version Control State — shared state and result helpers for the
 * versionControl service modules.
 * @module vcVersionControlState
 */
// versioning/versionControlState.js
// DEPENDS ON: versioning/repositoryStore.js, versioning/branchService.js,
//             versioning/revisionService.js
// MUST LOAD AFTER: versioning/revisionService.js
// MUST LOAD BEFORE: versioning/versionControlInit.js

var vcVersionControlState = (function() {

  var _initialized = false;
  var _store = vcRepositoryStore;
  var _branches = vcBranchService;
  var _revisions = vcRevisionService;

  function ok(data) {
    return { ok: true, data: data, error: null, warnings: [] };
  }

  function err(error, warnings) {
    return { ok: false, data: null, error: error, warnings: warnings || [] };
  }

  return {
    isInitialized: function() { return _initialized; },
    setInitialized: function(v) { _initialized = v; },

    getStore: function() { return _store; },
    getBranches: function() { return _branches; },
    getRevisions: function() { return _revisions; },

    ok: ok,
    err: err
  };

})();
