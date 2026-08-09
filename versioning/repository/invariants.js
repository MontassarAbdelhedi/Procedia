/**
 * Repository invariants — structural integrity checks.
 * Does NOT auto-fix — only reports violations.
 * @module vcRepoInvariants
 * @dependencies vcRepoCore
 */
// versioning/repository/invariants.js
// DEPENDS ON: versioning/repository/storeCore.js

var vcRepoInvariants = (function() {

  function _repo() { return vcRepoCore._getRepo(); }

  /**
   * Checks all repository invariants. Returns structured report.
   * @returns {{ok: boolean, violations: string[]}}
   */
  function checkInvariants() {
    if (!_repo()) return { ok: true, violations: [] };
    var v = [];

    // Active branch exists
    if (!_repo().branches[_repo().activeBranchId]) {
      v.push('Active branch ID ' + _repo().activeBranchId + ' not found in branch map');
    }

    // Every branch head exists
    for (var bid in _repo().branches) {
      if (!_repo().branches.hasOwnProperty(bid)) continue;
      var br = _repo().branches[bid];
      if (!_repo().revisions[br.headRevisionId]) {
        v.push('Branch ' + bid + ' head revision ' + br.headRevisionId + ' not found');
      }
      if (br.workingSnapshotId && !_repo().snapshots[br.workingSnapshotId]) {
        v.push('Branch ' + bid + ' working snapshot ' + br.workingSnapshotId + ' not found');
      }
    }

    // Every revision snapshot exists
    for (var rid in _repo().revisions) {
      if (!_repo().revisions.hasOwnProperty(rid)) continue;
      var rev = _repo().revisions[rid];
      if (!_repo().snapshots[rev.snapshotId]) {
        v.push('Revision ' + rid + ' snapshot ' + rev.snapshotId + ' not found');
      }
      for (var pi = 0; pi < rev.parentIds.length; pi++) {
        if (!_repo().revisions[rev.parentIds[pi]]) {
          v.push('Revision ' + rid + ' parent ' + rev.parentIds[pi] + ' not found');
        }
      }
    }

    // Revision DAG is acyclic (simple generation check)
    for (var rid2 in _repo().revisions) {
      if (!_repo().revisions.hasOwnProperty(rid2)) continue;
      var rev2 = _repo().revisions[rid2];
      for (var pj = 0; pj < rev2.parentIds.length; pj++) {
        var parentRev = _repo().revisions[rev2.parentIds[pj]];
        if (parentRev && parentRev.generation >= rev2.generation) {
          v.push('Revision ' + rid2 + ' generation ' + rev2.generation + ' not greater than parent ' + rev2.parentIds[pj] + ' (' + parentRev.generation + ')');
        }
      }
    }

    // Exactly one active branch
    var activeCount = 0;
    for (var bid3 in _repo().branches) {
      if (!_repo().branches.hasOwnProperty(bid3)) continue;
      if (bid3 === _repo().activeBranchId) activeCount++;
    }
    if (activeCount === 0 && Object.keys(_repo().branches).length > 0) {
      v.push('No active branch in non-empty repository');
    }

    return { ok: v.length === 0, violations: v };
  }

  return {
    checkInvariants: checkInvariants
  };

})();
