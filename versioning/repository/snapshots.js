/**
 * Repository snapshots — store and retrieve snapshot objects.
 * @module vcRepoSnapshots
 * @dependencies vcRepoCore
 */
// versioning/repository/snapshots.js
// DEPENDS ON: versioning/repository/storeCore.js

var vcRepoSnapshots = (function() {

  function _repo() { return vcRepoCore._getRepo(); }

  /**
   * Stores a snapshot. If an identical snapshot already exists (by checksum),
   * reuses it instead of storing a duplicate.
   * @param {Object} snapshot
   * @returns {string} snapshot ID
   */
  function storeSnapshot(snapshot) {
    if (!_repo()) throw new Error('Repository not initialized');
    if (!snapshot || !snapshot.id) throw new Error('Snapshot must have an id');

    var existingId = snapshot.id;
    if (_repo().snapshots[existingId]) {
      return existingId;
    }

    _repo().snapshots[existingId] = snapshot;
    _repo().updatedAt = vcRepoCore._now();
    return existingId;
  }

  function getSnapshot(snapshotId) {
    if (!_repo()) return null;
    return _repo().snapshots[snapshotId] || null;
  }

  return {
    storeSnapshot: storeSnapshot,
    getSnapshot: getSnapshot
  };

})();
