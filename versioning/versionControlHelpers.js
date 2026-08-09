/**
 * Version Control Helpers — suggested messages, integrity checks,
 * and persistence for the version control service.
 * @module vcVersionControlHelpers
 * @dependencies vcVersionControlState, vcSnapshotSerializer
 */
// versioning/versionControlHelpers.js
// MUST LOAD AFTER: versioning/versionControlState.js
// MUST LOAD BEFORE: versioning/versionControlService.js

var vcVersionControlHelpers = (function() {

  var S = vcVersionControlState;

  /**
   * Generates a suggested message for the next version based on changes
   * since the branch head.
   * @returns {string}
   */
  function getSuggestedVersionMessage() {
    if (!S.isInitialized()) return 'Save Version';
    try {
      var branch = S.getStore().getActiveBranch();
      if (!branch) return 'Save Version';
      var snapshot = vcSnapshotSerializer.captureActiveGraph();
      return S.getRevisions().generateSuggestedMessage(branch.headRevisionId, snapshot.id);
    } catch (e) {
      return 'Save Version';
    }
  }

  /**
   * Checks invariants and returns any violations.
   * @returns {{ok, data, error}}
   */
  function checkIntegrity() {
    if (!S.isInitialized()) return S.err('Version control not initialized');
    try {
      return S.ok(S.getStore().checkInvariants());
    } catch (e) {
      return S.err(e.message || String(e));
    }
  }

  /**
   * Saves the current repository to AE via the bridge.
   * @returns {Promise<void>}
   */
  function saveRepository() {
    if (!S.isInitialized()) return;
    try {
      var branch = S.getStore().getActiveBranch();
      if (branch && S.getStore().isBranchDirty(branch.id)) {
        S.getBranches().saveWorkingSnapshot(branch.id);
      }
      var repoJSON = JSON.stringify(S.getStore().getRepository());
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
    if (!S.isInitialized()) return null;
    try {
      var branch2 = S.getStore().getActiveBranch();
      if (branch2 && S.getStore().isBranchDirty(branch2.id)) {
        S.getBranches().saveWorkingSnapshot(branch2.id);
      }
      return S.getStore().getRepository();
    } catch (e) {
      return null;
    }
  }

  return {
    getSuggestedVersionMessage: getSuggestedVersionMessage,
    checkIntegrity: checkIntegrity,
    saveRepository: saveRepository,
    serializeRepository: serializeRepository
  };

})();
