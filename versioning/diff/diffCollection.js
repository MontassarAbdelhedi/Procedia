/**
 * Generic collection diff: identifies added, removed, and modified entities.
 * @module vcSemanticDiff
 * @dependencies versioning/diff/semanticDiffUtils.js
 */
// versioning/diff/diffCollection.js
// DEPENDS ON: versioning/diff/semanticDiffUtils.js
// MUST LOAD BEFORE: versioning/diff/semanticDiff.js

var vcSemanticDiff = vcSemanticDiff || {};

vcSemanticDiff._diffCollection = function(fromCollection, toCollection, diffFn) {
  var fromIds = vcSemanticDiff._sortedKeys(fromCollection);
  var toIds = vcSemanticDiff._sortedKeys(toCollection);
  var added = [];
  var removed = [];
  var modified = [];

  for (var i = 0; i < fromIds.length; i++) {
    var fid = fromIds[i];
    if (!(fid in toCollection)) {
      removed.push({ entityType: 'node', entityId: fid, before: fromCollection[fid] });
    }
  }

  for (var j = 0; j < toIds.length; j++) {
    var tid = toIds[j];
    if (!(tid in fromCollection)) {
      added.push({ entityType: 'node', entityId: tid, after: toCollection[tid] });
    } else {
      var entityDiff = diffFn(fromCollection[tid], toCollection[tid], tid);
      if (entityDiff.length > 0) {
        var modEntry = { entityType: 'node', entityId: tid, changes: entityDiff };
        if (fromCollection[tid].type) modEntry.nodeType = fromCollection[tid].type;
        if (toCollection[tid].type) modEntry.nodeType = modEntry.nodeType || toCollection[tid].type;
        modified.push(modEntry);
      }
    }
  }

  return { added: added, removed: removed, modified: modified };
};
