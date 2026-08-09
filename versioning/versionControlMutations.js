/**
 * Version Control Mutations — version/branch creation and management
 * for the version control service.
 * @module vcVersionControlMutations
 * @dependencies vcVersionControlState
 */
// versioning/versionControlMutations.js
// DEPENDS ON: versioning/versionControlState.js
// MUST LOAD AFTER: versioning/versionControlState.js
// MUST LOAD BEFORE: versioning/versionControlService.js

var vcVersionControlMutations = (function() {

  var S = vcVersionControlState;

  /**
   * Creates a new immutable version from the current working graph.
   * @param {string} message
   * @returns {{ok, data, error, warnings}}
   */
  function createVersion(message) {
    if (!S.isInitialized()) return S.err('Version control not initialized');
    if (!message || message.trim() === '') return S.err('Version message is required');
    try {
      var result = S.getRevisions().createVersion({
        message: message.trim(),
        kind: 'user'
      });
      if (!result.ok) return S.err(result.error);
      return S.ok({ revisionId: result.revisionId });
    } catch (e) {
      return S.err(e.message || String(e));
    }
  }

  /**
   * Creates a new branch.
   * @param {Object} options — { name, fromRevisionId? }
   * @returns {{ok, data, error, warnings}}
   */
  function createBranch(options) {
    if (!S.isInitialized()) return S.err('Version control not initialized');
    if (!options || !options.name || options.name.trim() === '') return S.err('Branch name is required');
    try {
      var result = S.getBranches().createBranch({
        name: options.name,
        fromRevisionId: options.fromRevisionId || null
      });
      if (!result.ok) return S.err(result.error);
      return S.ok({ branchId: result.branchId });
    } catch (e) {
      return S.err(e.message || String(e));
    }
  }

  function renameBranch(branchId, name) {
    if (!S.isInitialized()) return S.err('Version control not initialized');
    if (!name || name.trim() === '') return S.err('Branch name is required');
    try {
      S.getStore().renameBranch(branchId, name);
      return S.ok({ renamed: true });
    } catch (e) {
      return S.err(e.message || String(e));
    }
  }

  function deleteBranch(branchId) {
    if (!S.isInitialized()) return S.err('Version control not initialized');
    try {
      S.getStore().deleteBranch(branchId);
      return S.ok({ deleted: true });
    } catch (e) {
      return S.err(e.message || String(e));
    }
  }

  return {
    createVersion: createVersion,
    createBranch: createBranch,
    renameBranch: renameBranch,
    deleteBranch: deleteBranch
  };

})();
