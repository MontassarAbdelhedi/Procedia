/**
 * Conflict resolver hub — reassembles conflict resolution functions
 * from sub-modules into the public vcConflictResolver API. Pure JS.
 * @module vcConflictResolver
 * @dependencies vcConflictResolverSingle, vcConflictResolverBulk
 */
// versioning/merge/conflictResolver.js
// DEPENDS ON: versioning/merge/conflictResolver/singleConflict.js,
//             versioning/merge/conflictResolver/bulkOps.js

var vcConflictResolver = (function() {

  var single = vcConflictResolverSingle;
  var bulk = vcConflictResolverBulk;

  return {
    resolveConflict: single.resolveConflict,
    resolveConflicts: bulk.resolveConflicts,
    hasUnresolvedConflicts: bulk.hasUnresolvedConflicts,
    getConflictCounts: bulk.getConflictCounts
  };

})();
