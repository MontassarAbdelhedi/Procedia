/**
 * Semantic diff engine — pure JavaScript module with no UI, DOM, graph-state,
 * bridge, or AE dependencies. Operates on two canonical graph snapshots
 * and returns structured changes.
 * @module vcSemanticDiff
 * @dependencies none
 */
// versioning/diff/semanticDiff.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: versioning/diff/nodeDiff.js, versioning/diff/wireDiff.js

var vcSemanticDiff = (function() {

  /**
   * Computes the full structured diff between two snapshots.
   * @param {Object} fromSnapshot
   * @param {Object} toSnapshot
   * @returns {{fromSnapshotId, toSnapshotId, nodes, wires, groups, notes, metadata, summary}}
   */
  function diff(fromSnapshot, toSnapshot) {
    if (!fromSnapshot || !toSnapshot || !fromSnapshot.graph || !toSnapshot.graph) {
      var result = {
        fromSnapshotId: fromSnapshot ? fromSnapshot.id : null,
        toSnapshotId: toSnapshot ? toSnapshot.id : null,
        nodes: { added: [], removed: [], modified: [] },
        wires: { added: [], removed: [], modified: [] },
        groups: { added: [], removed: [], modified: [] },
        notes: { added: [], removed: [], modified: [] },
        metadata: [],
        summary: { nodesAdded: 0, nodesRemoved: 0, nodesChanged: 0, wiresAdded: 0, wiresRemoved: 0, wiresChanged: 0,
          groupsAdded: 0, groupsRemoved: 0, groupsChanged: 0, notesAdded: 0, notesRemoved: 0, notesChanged: 0,
          metadataChanges: 0, totalChanges: 0 }
      };
      return result;
    }

    var fromGraph = fromSnapshot.graph;
    var toGraph = toSnapshot.graph;

    var result = {
      fromSnapshotId: fromSnapshot.id,
      toSnapshotId: toSnapshot.id,
      nodes: _diffCollection(fromGraph.nodes || {}, toGraph.nodes || {}, _diffNode),
      wires: _diffCollection(fromGraph.wires || {}, toGraph.wires || {}, _diffWire),
      groups: _diffCollection(fromGraph.groups || {}, toGraph.groups || {}, _diffGeneric),
      notes: _diffCollection(fromGraph.notes || {}, toGraph.notes || {}, _diffGeneric),
      metadata: _diffMetadata(fromGraph.metadata || {}, toGraph.metadata || {}),
      summary: {}
    };

    result.summary = _buildSummary(result);
    return result;
  }

  /**
   * Generic collection diff: identifies added, removed, and modified entities.
   * @param {Object} fromCollection — map keyed by UUID
   * @param {Object} toCollection — map keyed by UUID
   * @param {Function} diffFn — (fromEntity, toEntity, entityId) => { added, removed, modified }
   */
  function _diffCollection(fromCollection, toCollection, diffFn) {
    var fromIds = _sortedKeys(fromCollection);
    var toIds = _sortedKeys(toCollection);
    var added = [];
    var removed = [];
    var modified = [];

    for (var i = 0; i < fromIds.length; i++) {
      var fid = fromIds[i];
      if (!(fid in toCollection)) {
        removed.push({ entityType: 'node', entityId: fid, before: fromCollection[fid] });
        continue;
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
  }

  /**
   * Diffs two node objects property-by-property.
   */
  function _diffNode(fromNode, toNode, nodeId) {
    return _diffObjects(fromNode, toNode, ['dirty', 'dynamicSchema', 'secondaryPorts', '_transplantLayerUUID', 'hasParkedLayer', 'hostingComps', 'error', '_flushCount']);
  }

  /**
   * Diffs two wire objects property-by-property.
   */
  function _diffWire(fromWire, toWire, wireId) {
    return _diffObjects(fromWire, toWire, ['_pathLayerUUID']);
  }

  /**
   * Generic entity diff. Compares all properties recursively.
   */
  function _diffGeneric(fromEntity, toEntity, entityId) {
    return _diffObjects(fromEntity, toEntity, []);
  }

  /**
   * Recursive object diff producing path-level changes.
   * @returns {Array} of { path, before, after, category }
   */
  function _diffObjects(fromObj, toObj, skipKeys, basePath) {
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
          category: _classifyChange(path)
        });
      } else if (fromVal !== undefined && toVal === undefined) {
        changes.push({
          path: path,
          before: fromVal,
          after: undefined,
          category: _classifyChange(path)
        });
      } else if (typeof fromVal === 'object' && typeof toVal === 'object' && fromVal !== null && toVal !== null) {
        if (Array.isArray(fromVal) && Array.isArray(toVal)) {
          if (!_arraysEqual(fromVal, toVal)) {
            changes.push({
              path: path,
              before: fromVal,
              after: toVal,
              category: _classifyChange(path)
            });
          }
        } else if (!Array.isArray(fromVal) && !Array.isArray(toVal)) {
          var subChanges = _diffObjects(fromVal, toVal, skipKeys, path);
          for (var sc = 0; sc < subChanges.length; sc++) {
            changes.push(subChanges[sc]);
          }
        } else {
          if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
            changes.push({
              path: path,
              before: fromVal,
              after: toVal,
              category: _classifyChange(path)
            });
          }
        }
      } else if (fromVal !== toVal && JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
        changes.push({
          path: path,
          before: fromVal,
          after: toVal,
          category: _classifyChange(path)
        });
      }
    }

    return changes;
  }

  function _arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (var ai = 0; ai < a.length; ai++) {
      if (JSON.stringify(a[ai]) !== JSON.stringify(b[ai])) return false;
    }
    return true;
  }

  /**
   * Classifies a change path into a semantic category.
   */
  function _classifyChange(path) {
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
  }

  /**
   * Computes a wire semantic key for detecting duplicate connections.
   */
  function wireSemanticKey(wire) {
    return [wire.type, wire.fromNode, wire.fromPort, wire.toNode, wire.toPort, wire.boundParam || ''].join('|');
  }

  /**
   * Diffs metadata objects.
   */
  function _diffMetadata(fromMeta, toMeta) {
    return _diffObjects(fromMeta, toMeta, []);
  }

  /**
   * Builds a change summary from the diff result.
   */
  function _buildSummary(diff) {
    return {
      nodesAdded: diff.nodes.added.length,
      nodesRemoved: diff.nodes.removed.length,
      nodesChanged: diff.nodes.modified.length,
      wiresAdded: diff.wires.added.length,
      wiresRemoved: diff.wires.removed.length,
      wiresChanged: diff.wires.modified.length,
      groupsAdded: diff.groups.added.length,
      groupsRemoved: diff.groups.removed.length,
      groupsChanged: diff.groups.modified.length,
      notesAdded: diff.notes.added.length,
      notesRemoved: diff.notes.removed.length,
      notesChanged: diff.notes.modified.length,
      metadataChanges: diff.metadata.length,
      totalChanges: diff.nodes.added.length + diff.nodes.removed.length + diff.nodes.modified.length +
        diff.wires.added.length + diff.wires.removed.length + diff.wires.modified.length +
        diff.groups.added.length + diff.groups.removed.length + diff.groups.modified.length +
        diff.notes.added.length + diff.notes.removed.length + diff.notes.modified.length +
        diff.metadata.length
    };
  }

  function _sortedKeys(obj) {
    var keys = [];
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) keys.push(k);
    }
    keys.sort();
    return keys;
  }

  return {
    diff: diff,
    wireSemanticKey: wireSemanticKey
  };

})();
