/**
 * Repository revisions — create and query revision records.
 * @module vcRepoRevisions
 * @dependencies vcRepoCore
 */
// versioning/repository/revisions.js
// DEPENDS ON: versioning/repository/storeCore.js

var vcRepoRevisions = (function() {

  function _repo() { return vcRepoCore._getRepo(); }

  /**
   * Creates a new revision.
   * @param {Object} opts — { message, snapshotId, parentIds, kind, branchId, summary }
   * @returns {string} revision ID
   */
  function createRevision(opts) {
    if (!_repo()) throw new Error('Repository not initialized');

    var snapshot = _repo().snapshots[opts.snapshotId];
    if (!snapshot) throw new Error('Snapshot not found: ' + opts.snapshotId);

    var revId = vcRepoCore._vcId('REV');
    var parentIds = opts.parentIds || [];

    var gen = 0;
    for (var i = 0; i < parentIds.length; i++) {
      var parent = _repo().revisions[parentIds[i]];
      if (parent && parent.generation >= gen) {
        gen = parent.generation + 1;
      }
    }

    var rev = {
      id: revId,
      parentIds: parentIds,
      snapshotId: opts.snapshotId,
      graphChecksum: snapshot.checksum,
      message: opts.message || '',
      kind: opts.kind || 'user',
      createdAt: vcRepoCore._now(),
      branchIdAtCreation: opts.branchId || null,
      summary: opts.summary || { nodesAdded: 0, nodesRemoved: 0, nodesChanged: 0, wiresAdded: 0, wiresRemoved: 0, wiresChanged: 0 },
      generation: gen
    };

    _repo().revisions[revId] = rev;
    _repo().updatedAt = vcRepoCore._now();
    return revId;
  }

  function getRevision(revId) {
    if (!_repo()) return null;
    return _repo().revisions[revId] || null;
  }

  function getAllRevisions() {
    if (!_repo()) return {};
    return _repo().revisions;
  }

  return {
    createRevision: createRevision,
    getRevision: getRevision,
    getAllRevisions: getAllRevisions
  };

})();
