/**
 * Bulk conflict operations — resolve multiple conflicts, check for
 * unresolved blocking conflicts, and tally conflict counts.
 * @module vcConflictResolverBulk
 * @dependencies vcConflictResolverSingle
 */
// versioning/merge/conflictResolver/bulkOps.js
// DEPENDS ON: versioning/merge/conflictResolver/singleConflict.js
// MUST LOAD BEFORE: versioning/merge/conflictResolver.js

var vcConflictResolverBulk = (function() {

  var _single = vcConflictResolverSingle;

  /**
   * Resolves multiple conflicts at once.
   * @param {Object[]} conflicts — array of conflict objects
   * @param {Object[]} resolutions — array of { conflictId, resolution, customValue }
   * @param {Object} candidateGraph — the merged graph (mutated in place)
   * @param {Object} oursGraph — our snapshot's graph
   * @param {Object} theirsGraph — their snapshot's graph
   * @returns {{ok: boolean, errors: string[]}}
   */
  function resolveConflicts(conflicts, resolutions, candidateGraph, oursGraph, theirsGraph) {
    var errors = [];
    var resolutionMap = {};
    for (var ri = 0; ri < resolutions.length; ri++) {
      resolutionMap[resolutions[ri].conflictId] = resolutions[ri];
    }

    for (var ci = 0; ci < conflicts.length; ci++) {
      var c = conflicts[ci];
      var res = resolutionMap[c.id];
      if (res) {
        var result = _single.resolveConflict(c, res.resolution, res.customValue, candidateGraph, oursGraph, theirsGraph);
        if (!result.ok) errors.push('Conflict ' + c.id + ': ' + result.error);
      }
    }

    return { ok: errors.length === 0, errors: errors };
  }

  /**
   * Checks whether there are unresolved blocking conflicts remaining.
   * @param {Object[]} conflicts
   * @returns {boolean}
   */
  function hasUnresolvedConflicts(conflicts) {
    for (var i = 0; i < conflicts.length; i++) {
      if (conflicts[i].severity === 'blocking' && conflicts[i].resolution === null) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns counts of conflict types.
   * @param {Object[]} conflicts
   * @returns {{blocking: number, warning: number, total: number}}
   */
  function getConflictCounts(conflicts) {
    var counts = { blocking: 0, warning: 0, total: 0 };
    for (var i = 0; i < conflicts.length; i++) {
      counts.total++;
      if (conflicts[i].severity === 'blocking') counts.blocking++;
      else counts.warning++;
    }
    return counts;
  }

  return {
    resolveConflicts: resolveConflicts,
    hasUnresolvedConflicts: hasUnresolvedConflicts,
    getConflictCounts: getConflictCounts
  };

})();
