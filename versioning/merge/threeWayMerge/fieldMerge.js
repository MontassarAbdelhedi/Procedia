/**
 * Field-level merge for three-way merge engine.
 * Recursively merges individual object properties.
 * Pure JS, no AE or UI dependencies.
 * @module vcThreeWayMergeFieldMerge
 * @dependencies vcThreeWayMergeHelpers, vcConflictFactory
 */
// versioning/merge/threeWayMerge/fieldMerge.js
// DEPENDS ON: versioning/merge/threeWayMerge/helpers.js,
//             versioning/merge/conflictFactory.js
// MUST LOAD BEFORE: versioning/merge/threeWayMerge/collectionMerge.js,
//                   versioning/merge/threeWayMerge/nodeMerge.js,
//                   versioning/merge/threeWayMerge/wireMerge.js

var vcThreeWayMergeFieldMerge = (function() {

  var helpers = vcThreeWayMergeHelpers;
  var cf = vcConflictFactory;

  function _mergeFields(base, ours, theirs) {
    var merged = {};
    var conflicts = [];

    var allKeys = helpers._unionKeys(base, ours, theirs);

    for (var i = 0; i < allKeys.length; i++) {
      var key = allKeys[i];
      var baseVal = base ? base[key] : undefined;
      var oursVal = ours ? ours[key] : undefined;
      var theirsVal = theirs ? theirs[key] : undefined;

      var oursChanged = !helpers._deepEqual(baseVal, oursVal);
      var theirsChanged = !helpers._deepEqual(baseVal, theirsVal);

      if (!oursChanged && !theirsChanged) {
        if (baseVal !== undefined) merged[key] = baseVal;
      } else if (oursChanged && !theirsChanged) {
        if (oursVal !== undefined) merged[key] = oursVal;
      } else if (!oursChanged && theirsChanged) {
        if (theirsVal !== undefined) merged[key] = theirsVal;
      } else {
        if (typeof baseVal === 'object' && typeof oursVal === 'object' && typeof theirsVal === 'object' &&
            baseVal !== null && oursVal !== null && theirsVal !== null &&
            !Array.isArray(baseVal) && !Array.isArray(oursVal) && !Array.isArray(theirsVal)) {
          var subMerge = _mergeFields(baseVal, oursVal, theirsVal);
          merged[key] = subMerge.merged;
          for (var sc = 0; sc < subMerge.conflicts.length; sc++) {
            var subC = subMerge.conflicts[sc];
            subC.path = [key].concat(subC.path);
            conflicts.push(subC);
          }
        } else if (helpers._deepEqual(oursVal, theirsVal)) {
          if (oursVal !== undefined) merged[key] = oursVal;
        } else {
          var isLayout = (key === 'position' || key === 'size' || key === 'collapsed');
          if (isLayout) {
            merged[key] = oursVal;
            conflicts.push(cf.layoutConflict('node', ours.id, [key], oursVal, theirsVal));
          } else if (key === 'note' || key === 'label') {
            merged[key] = oursVal;
            conflicts.push(cf.propertyConflict('node', ours.id, [key], baseVal, oursVal, theirsVal, 'blocking'));
          } else {
            conflicts.push(cf.propertyConflict('node', ours.id, [key], baseVal, oursVal, theirsVal, 'blocking'));
            merged[key] = oursVal;
          }
        }
      }
    }

    return { merged: merged, conflicts: conflicts };
  }

  return {
    _mergeFields: _mergeFields
  };

})();
