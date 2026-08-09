/**
 * Node merge rules for three-way merge engine.
 * Pure JS, no AE or UI dependencies.
 * @module vcThreeWayMergeNodeMerge
 * @dependencies vcThreeWayMergeHelpers, vcThreeWayMergeFieldMerge, vcConflictFactory
 */
// versioning/merge/threeWayMerge/nodeMerge.js
// DEPENDS ON: versioning/merge/threeWayMerge/helpers.js,
//             versioning/merge/threeWayMerge/fieldMerge.js,
//             versioning/merge/conflictFactory.js
// MUST LOAD BEFORE: versioning/merge/threeWayMerge.js

var vcThreeWayMergeNodeMerge = (function() {

  var helpers = vcThreeWayMergeHelpers;
  var fieldMerge = vcThreeWayMergeFieldMerge;
  var cf = vcConflictFactory;

  function _mergeNodes(baseNodes, oursNodes, theirsNodes) {
    var result = {};
    var conflicts = [];

    var allIds = helpers._unionKeys(baseNodes, oursNodes, theirsNodes);

    for (var i = 0; i < allIds.length; i++) {
      var nid = allIds[i];
      var inBase = baseNodes.hasOwnProperty(nid);
      var inOurs = oursNodes.hasOwnProperty(nid);
      var inTheirs = theirsNodes.hasOwnProperty(nid);

      if (!inBase) {
        if (inOurs && !inTheirs) {
          result[nid] = oursNodes[nid];
        } else if (!inOurs && inTheirs) {
          result[nid] = theirsNodes[nid];
        } else if (inOurs && inTheirs) {
          if (oursNodes[nid].type !== theirsNodes[nid].type) {
            conflicts.push(cf.typeChangeConflict('node', nid, null, oursNodes[nid].type, theirsNodes[nid].type));
            result[nid] = oursNodes[nid];
          } else {
            var addMerge = fieldMerge._mergeFields(baseNodes[nid] || {}, oursNodes[nid], theirsNodes[nid]);
            result[nid] = addMerge.merged;
            for (var ac = 0; ac < addMerge.conflicts.length; ac++) conflicts.push(addMerge.conflicts[ac]);
          }
        }
      } else if (inOurs && !inTheirs) {
        if (JSON.stringify(oursNodes[nid]) !== JSON.stringify(baseNodes[nid])) {
          conflicts.push(cf.deleteModifyConflict('node', nid));
          result[nid] = oursNodes[nid];
        }
      } else if (!inOurs && inTheirs) {
        if (JSON.stringify(theirsNodes[nid]) !== JSON.stringify(baseNodes[nid])) {
          conflicts.push(cf.deleteModifyConflict('node', nid));
          result[nid] = theirsNodes[nid];
        }
      } else if (!inOurs && !inTheirs) {
        // deleted on both sides
      } else {
        if (oursNodes[nid].type !== theirsNodes[nid].type) {
          conflicts.push(cf.typeChangeConflict('node', nid, baseNodes[nid].type, oursNodes[nid].type, theirsNodes[nid].type));
          result[nid] = oursNodes[nid];
        } else {
          var fieldMergeResult = fieldMerge._mergeFields(baseNodes[nid], oursNodes[nid], theirsNodes[nid]);
          result[nid] = fieldMergeResult.merged;
          for (var fc = 0; fc < fieldMergeResult.conflicts.length; fc++) conflicts.push(fieldMergeResult.conflicts[fc]);
        }
      }
    }

    return { nodes: result, conflicts: conflicts };
  }

  return {
    _mergeNodes: _mergeNodes
  };

})();
