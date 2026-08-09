/**
 * Wire merge rules for three-way merge engine.
 * Pure JS, no AE or UI dependencies.
 * @module vcThreeWayMergeWireMerge
 * @dependencies vcThreeWayMergeHelpers, vcThreeWayMergeFieldMerge, vcConflictFactory,
 *               vcSemanticDiff
 */
// versioning/merge/threeWayMerge/wireMerge.js
// DEPENDS ON: versioning/merge/threeWayMerge/helpers.js,
//             versioning/merge/threeWayMerge/fieldMerge.js,
//             versioning/merge/conflictFactory.js,
//             versioning/diff/semanticDiff.js
// MUST LOAD BEFORE: versioning/merge/threeWayMerge.js

var vcThreeWayMergeWireMerge = (function() {

  var helpers = vcThreeWayMergeHelpers;
  var fieldMerge = vcThreeWayMergeFieldMerge;
  var cf = vcConflictFactory;

  function _mergeWires(baseWires, oursWires, theirsWires, mergedNodes) {
    var result = {};
    var conflicts = [];

    var allIds = helpers._unionKeys(baseWires, oursWires, theirsWires);

    for (var i = 0; i < allIds.length; i++) {
      var wid = allIds[i];
      var inBase = baseWires.hasOwnProperty(wid);
      var inOurs = oursWires.hasOwnProperty(wid);
      var inTheirs = theirsWires.hasOwnProperty(wid);

      if (!inBase) {
        if (inOurs && !inTheirs) {
          result[wid] = oursWires[wid];
        } else if (!inOurs && inTheirs) {
          result[wid] = theirsWires[wid];
        } else if (inOurs && inTheirs) {
          var oursKey = vcSemanticDiff.wireSemanticKey(oursWires[wid]);
          var theirsKey = vcSemanticDiff.wireSemanticKey(theirsWires[wid]);
          if (oursKey === theirsKey) {
            result[wid] = oursWires[wid];
          } else {
            result[wid] = oursWires[wid];
            conflicts.push(cf.wireEndpointConflict(wid, ['semantic'], oursKey, null, theirsKey));
          }
        }
      } else if (inOurs && !inTheirs) {
        if (JSON.stringify(oursWires[wid]) !== JSON.stringify(baseWires[wid])) {
          conflicts.push(cf.deleteModifyConflict('wire', wid));
          result[wid] = oursWires[wid];
        }
      } else if (!inOurs && inTheirs) {
        if (JSON.stringify(theirsWires[wid]) !== JSON.stringify(baseWires[wid])) {
          conflicts.push(cf.deleteModifyConflict('wire', wid));
          result[wid] = theirsWires[wid];
        }
      } else if (!inOurs && !inTheirs) {
        // deleted on both sides
      } else {
        var wireMerge = fieldMerge._mergeFields(baseWires[wid], oursWires[wid], theirsWires[wid]);
        result[wid] = wireMerge.merged;
        for (var wc = 0; wc < wireMerge.conflicts.length; wc++) conflicts.push(wireMerge.conflicts[wc]);
      }
    }

    return { wires: result, conflicts: conflicts };
  }

  return {
    _mergeWires: _mergeWires
  };

})();
