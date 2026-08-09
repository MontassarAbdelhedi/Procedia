/**
 * Deep object diff utilities for semantic diff engine. Produces path-level
 * changes with semantic classification.
 * @module vcSemanticDiff
 * @dependencies versioning/diff/semanticDiffUtils.js
 */
// versioning/diff/diffObjects.js
// DEPENDS ON: versioning/diff/semanticDiffUtils.js
// MUST LOAD BEFORE: versioning/diff/semanticDiff.js

var vcSemanticDiff = vcSemanticDiff || {};

vcSemanticDiff._diffNode = function(fromNode, toNode, nodeId) {
  return vcSemanticDiff._diffObjects(fromNode, toNode, ['dirty', 'dynamicSchema', 'secondaryPorts', '_transplantLayerUUID', 'hasParkedLayer', 'hostingComps', 'error', '_flushCount']);
};

vcSemanticDiff._diffWire = function(fromWire, toWire, wireId) {
  return vcSemanticDiff._diffObjects(fromWire, toWire, ['_pathLayerUUID']);
};

vcSemanticDiff._diffGeneric = function(fromEntity, toEntity, entityId) {
  return vcSemanticDiff._diffObjects(fromEntity, toEntity, []);
};

vcSemanticDiff._diffObjects = function(fromObj, toObj, skipKeys, basePath) {
  basePath = basePath || [];
  if (!skipKeys) skipKeys = [];
  var changes = [];

  var skipSet = {};
  for (var si = 0; si < skipKeys.length; si++) { skipSet[skipKeys[si]] = true; }

  var allKeys = {};
  if (fromObj && typeof fromObj === 'object' && !Array.isArray(fromObj)) {
    for (var k in fromObj) { if (fromObj.hasOwnProperty(k) && !skipSet[k]) allKeys[k] = true; }
  }
  if (toObj && typeof toObj === 'object' && !Array.isArray(toObj)) {
    for (var k2 in toObj) { if (toObj.hasOwnProperty(k2) && !skipSet[k2]) allKeys[k2] = true; }
  }

  var sortedKeys = Object.keys(allKeys).sort();
  for (var ki = 0; ki < sortedKeys.length; ki++) {
    var key = sortedKeys[ki];
    if (skipSet[key]) continue;

    var fromVal = fromObj ? fromObj[key] : undefined;
    var toVal = toObj ? toObj[key] : undefined;
    var path = basePath.concat([key]);

    if (fromVal === undefined && toVal !== undefined) {
      changes.push({
        path: path,
        before: undefined,
        after: toVal,
        category: vcSemanticDiff._classifyChange(path)
      });
    } else if (fromVal !== undefined && toVal === undefined) {
      changes.push({
        path: path,
        before: fromVal,
        after: undefined,
        category: vcSemanticDiff._classifyChange(path)
      });
    } else if (typeof fromVal === 'object' && typeof toVal === 'object' && fromVal !== null && toVal !== null) {
      if (Array.isArray(fromVal) && Array.isArray(toVal)) {
        if (!vcSemanticDiff._arraysEqual(fromVal, toVal)) {
          changes.push({
            path: path,
            before: fromVal,
            after: toVal,
            category: vcSemanticDiff._classifyChange(path)
          });
        }
      } else if (!Array.isArray(fromVal) && !Array.isArray(toVal)) {
        var subChanges = vcSemanticDiff._diffObjects(fromVal, toVal, skipKeys, path);
        for (var sc = 0; sc < subChanges.length; sc++) {
          changes.push(subChanges[sc]);
        }
      } else {
        if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
          changes.push({
            path: path,
            before: fromVal,
            after: toVal,
            category: vcSemanticDiff._classifyChange(path)
          });
        }
      }
    } else if (fromVal !== toVal && JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
      changes.push({
        path: path,
        before: fromVal,
        after: toVal,
        category: vcSemanticDiff._classifyChange(path)
      });
    }
  }

  return changes;
};
