/**
 * Generic collection and metadata merge for three-way merge engine.
 * Pure JS, no AE or UI dependencies.
 * @module vcThreeWayMergeCollection
 * @dependencies vcThreeWayMergeHelpers, vcThreeWayMergeFieldMerge
 */
// versioning/merge/threeWayMerge/collectionMerge.js
// DEPENDS ON: versioning/merge/threeWayMerge/helpers.js,
//             versioning/merge/threeWayMerge/fieldMerge.js
// MUST LOAD BEFORE: versioning/merge/threeWayMerge/nodeMerge.js,
//                   versioning/merge/threeWayMerge/wireMerge.js,
//                   versioning/merge/threeWayMerge.js

var vcThreeWayMergeCollection = (function() {

  var helpers = vcThreeWayMergeHelpers;
  var fieldMerge = vcThreeWayMergeFieldMerge;

  function _mergeGenericCollection(baseCol, oursCol, theirsCol) {
    var result = {};
    var allIds = helpers._unionKeys(baseCol || {}, oursCol || {}, theirsCol || {});
    for (var i = 0; i < allIds.length; i++) {
      var gid = allIds[i];
      var inBase = (baseCol || {}).hasOwnProperty(gid);
      var inOurs = (oursCol || {}).hasOwnProperty(gid);
      var inTheirs = (theirsCol || {}).hasOwnProperty(gid);

      if (!inBase && inOurs && !inTheirs) { result[gid] = oursCol[gid]; }
      else if (!inBase && !inOurs && inTheirs) { result[gid] = theirsCol[gid]; }
      else if (!inBase && inOurs && inTheirs) { result[gid] = oursCol[gid]; }
      else if (inBase && inOurs && inTheirs) {
        var m = fieldMerge._mergeFields((baseCol || {})[gid], oursCol[gid], theirsCol[gid]);
        result[gid] = m.merged;
      } else if (inBase && inOurs && !inTheirs) {} // deleted on theirs
      else if (inBase && !inOurs && inTheirs) {} // deleted on ours
    }
    return result;
  }

  function _mergeMetadata(baseMeta, oursMeta, theirsMeta) {
    var m = _mergeGenericCollection({ meta: baseMeta || {} }, { meta: oursMeta || {} }, { meta: theirsMeta || {} });
    return m.meta || {};
  }

  return {
    _mergeGenericCollection: _mergeGenericCollection,
    _mergeMetadata: _mergeMetadata
  };

})();
