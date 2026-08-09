/**
 * Repository managed artifacts — per-node managed artifact metadata.
 * @module vcRepoArtifacts
 * @dependencies vcRepoCore
 */
// versioning/repository/artifacts.js
// DEPENDS ON: versioning/repository/storeCore.js

var vcRepoArtifacts = (function() {

  function _repo() { return vcRepoCore._getRepo(); }

  function setManagedArtifact(nodeId, artifactData) {
    if (!_repo()) throw new Error('Repository not initialized');
    _repo().managedArtifacts[nodeId] = artifactData;
    _repo().updatedAt = vcRepoCore._now();
  }

  function getManagedArtifact(nodeId) {
    if (!_repo()) return null;
    return _repo().managedArtifacts[nodeId] || null;
  }

  function getAllManagedArtifacts() {
    if (!_repo()) return {};
    return _repo().managedArtifacts;
  }

  return {
    setManagedArtifact: setManagedArtifact,
    getManagedArtifact: getManagedArtifact,
    getAllManagedArtifacts: getAllManagedArtifacts
  };

})();
