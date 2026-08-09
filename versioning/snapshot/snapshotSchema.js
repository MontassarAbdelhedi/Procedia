/**
 * Snapshot schema — defines the canonical graph snapshot format and validation.
 * A snapshot is a plain, immutable, JSON-safe representation of the Procedia
 * graph with all runtime fields stripped.
 * @module vcSnapshotSchema
 * @dependencies none
 */
// versioning/snapshot/snapshotSchema.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: versioning/snapshot/snapshotSerializer.js

var vcSnapshotSchema = (function() {

  var CURRENT_GRAPH_SCHEMA_VERSION = 1;

  var _nodeRequiredFields = ['id', 'type'];
  var _nodeSerializableFields = [
    'id', 'type', 'version', 'label', 'category', 'nodeKind',
    'dedicated', 'params', 'props', 'ports', 'matchName',
    'state', 'position', 'size', 'collapsed', 'disabled',
    '_cloneMasterId'
  ];

  var _nodeStrippedFields = {
    dirty: true,
    dynamicSchema: true,
    secondaryPorts: true,
    _transplantLayerUUID: true,
    hasParkedLayer: true,
    hostingComps: true,
    error: true,
    _flushCount: true
  };

  var _wireRequiredFields = ['id', 'fromNode', 'toNode', 'fromPort', 'toPort'];
  var _wireSerializableFields = [
    'id', 'fromNode', 'toNode', 'fromPort', 'toPort',
    'type', 'boundParam', 'slotId', 'order'
  ];

  var _wireStrippedFields = {
    _pathLayerUUID: true
  };

  function validateSnapshot(snapshot) {
    var errors = [];
    if (!snapshot || typeof snapshot !== 'object') {
      errors.push('Snapshot must be an object');
      return { ok: false, errors: errors };
    }
    if (!snapshot.graph || typeof snapshot.graph !== 'object') {
      errors.push('Snapshot must have a graph object');
      return { ok: false, errors: errors };
    }
    var graph = snapshot.graph;
    if (!graph.nodes || typeof graph.nodes !== 'object') {
      errors.push('Snapshot graph must have nodes map');
    } else {
      for (var nodeId in graph.nodes) {
        if (!graph.nodes.hasOwnProperty(nodeId)) continue;
        var node = graph.nodes[nodeId];
        for (var ri = 0; ri < _nodeRequiredFields.length; ri++) {
          if (node[_nodeRequiredFields[ri]] === undefined) {
            errors.push('Node ' + nodeId + ' missing required field: ' + _nodeRequiredFields[ri]);
          }
        }
      }
    }
    if (!graph.wires || typeof graph.wires !== 'object') {
      errors.push('Snapshot graph must have wires map');
    } else {
      for (var wireId in graph.wires) {
        if (!graph.wires.hasOwnProperty(wireId)) continue;
        var wire = graph.wires[wireId];
        for (var rj = 0; rj < _wireRequiredFields.length; rj++) {
          if (wire[_wireRequiredFields[rj]] === undefined) {
            errors.push('Wire ' + wireId + ' missing required field: ' + _wireRequiredFields[rj]);
          }
        }
      }
    }
    return { ok: errors.length === 0, errors: errors };
  }

  function isRuntimeField(fieldName, strippedFields) {
    return strippedFields.hasOwnProperty(fieldName);
  }

  function stripRuntimeFields(obj, strippedFields) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    for (var key in obj) {
      if (obj.hasOwnProperty(key) && isRuntimeField(key, strippedFields)) {
        delete obj[key];
      }
    }
  }

  function stripNodeRuntimeFields(node) {
    stripRuntimeFields(node, _nodeStrippedFields);
  }

  function stripWireRuntimeFields(wire) {
    stripRuntimeFields(wire, _wireStrippedFields);
  }

  return {
    CURRENT_GRAPH_SCHEMA_VERSION: CURRENT_GRAPH_SCHEMA_VERSION,
    _nodeRequiredFields: _nodeRequiredFields,
    _nodeSerializableFields: _nodeSerializableFields,
    _nodeStrippedFields: _nodeStrippedFields,
    _wireRequiredFields: _wireRequiredFields,
    _wireSerializableFields: _wireSerializableFields,
    _wireStrippedFields: _wireStrippedFields,
    validateSnapshot: validateSnapshot,
    stripNodeRuntimeFields: stripNodeRuntimeFields,
    stripWireRuntimeFields: stripWireRuntimeFields
  };

})();
