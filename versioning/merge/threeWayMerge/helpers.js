/**
 * Three-way merge helpers — union keys, deep equality, diff summary.
 * Pure JS, no AE or UI dependencies.
 * @module vcThreeWayMergeHelpers
 * @dependencies vcSemanticDiff
 */
// versioning/merge/threeWayMerge/helpers.js
// DEPENDS ON: versioning/diff/semanticDiff.js
// MUST LOAD BEFORE: versioning/merge/threeWayMerge/fieldMerge.js,
//                   versioning/merge/threeWayMerge/collectionMerge.js,
//                   versioning/merge/threeWayMerge/nodeMerge.js,
//                   versioning/merge/threeWayMerge/wireMerge.js

var vcThreeWayMergeHelpers = (function() {

  function _unionKeys(a, b, c) {
    var set = {};
    for (var k in a) { if (a.hasOwnProperty(k)) set[k] = true; }
    for (var k2 in b) { if (b.hasOwnProperty(k2)) set[k2] = true; }
    for (var k3 in c) { if (c.hasOwnProperty(k3)) set[k3] = true; }
    var keys = [];
    for (var ks in set) { if (set.hasOwnProperty(ks)) keys.push(ks); }
    keys.sort();
    return keys;
  }

  function _deepEqual(a, b) {
    if (a === b) return true;
    if (a === undefined && b === undefined) return true;
    if (a === undefined || b === undefined) return false;
    if (typeof a !== typeof b) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function _diffSummary(fromSnap, toSnap) {
    var diff = vcSemanticDiff.diff(fromSnap, toSnap);
    return diff.summary;
  }

  return {
    _unionKeys: _unionKeys,
    _deepEqual: _deepEqual,
    _diffSummary: _diffSummary
  };

})();
