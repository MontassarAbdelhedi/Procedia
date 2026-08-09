/**
 * Semantic diff utility helpers.
 * @module vcSemanticDiff
 * @dependencies none
 */
// versioning/diff/semanticDiffUtils.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: versioning/diff/diffObjects.js, versioning/diff/diffCollection.js, versioning/diff/buildSummary.js, versioning/diff/semanticDiff.js

var vcSemanticDiff = vcSemanticDiff || {};

vcSemanticDiff._sortedKeys = function(obj) {
  var keys = [];
  for (var k in obj) {
    if (obj.hasOwnProperty(k)) keys.push(k);
  }
  keys.sort();
  return keys;
};

vcSemanticDiff._arraysEqual = function(a, b) {
  if (a.length !== b.length) return false;
  for (var ai = 0; ai < a.length; ai++) {
    if (JSON.stringify(a[ai]) !== JSON.stringify(b[ai])) return false;
  }
  return true;
};

vcSemanticDiff._classifyChange = function(path) {
  if (!path || path.length === 0) return 'other';
  var top = path[0];
  if (top === 'props') return 'parameter';
  if (top === 'expression') return 'expression';
  if (top === 'position' || top === 'size' || top === 'collapsed') return 'layout';
  if (top === 'fromNode' || top === 'toNode' || top === 'fromPort' || top === 'toPort') return 'topology';
  if (top === 'type' || top === 'version' || top === 'nodeKind') return 'node-schema';
  if (top === 'group' || top === 'frame') return 'grouping';
  if (top === 'note' || top === 'message' || top === 'label') return 'notes-metadata';
  return 'other';
};
