/**
 * Version Control Activation — branch switching and revision restoration
 * for the version control service.
 * @module vcVersionControlActivation
 * @dependencies vcVersionControlState, vcActivationCoordinator
 */
// versioning/versionControlActivation.js
// MUST LOAD AFTER: versioning/versionControlState.js
// MUST LOAD BEFORE: versioning/versionControlService.js

var vcVersionControlActivation = (function() {

  var S = vcVersionControlState;

  /**
   * Switches to a different branch.
   * @param {string} branchId
   * @returns {Promise<{ok, data, error}>}
   */
  function switchBranch(branchId) {
    if (!S.isInitialized()) return S.err('Version control not initialized');
    try {
      if (typeof vcActivationCoordinator === 'undefined') {
        return Promise.resolve(S.err('Activation coordinator not loaded'));
      }
      return vcActivationCoordinator.switchBranch(branchId);
    } catch (e) {
      return Promise.resolve(S.err(e.message || String(e)));
    }
  }

  /**
   * Restores a historical revision as the current working graph.
   * @param {string} revisionId
   * @returns {Promise<{ok, data, error}>}
   */
  function restoreRevision(revisionId) {
    if (!S.isInitialized()) return S.err('Version control not initialized');
    try {
      if (typeof vcActivationCoordinator === 'undefined') {
        return Promise.resolve(S.err('Activation coordinator not loaded'));
      }
      return vcActivationCoordinator.restoreRevision(revisionId);
    } catch (e) {
      return Promise.resolve(S.err(e.message || String(e)));
    }
  }

  return {
    switchBranch: switchBranch,
    restoreRevision: restoreRevision
  };

})();
