/**
 * Conflict factory — creates structured, serializable conflict objects.
 * Pure JS, no dependencies on AE, UI, or graph-state.
 * @module vcConflictFactory
 * @dependencies none
 */
// versioning/merge/conflictFactory.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: versioning/merge/threeWayMerge.js, versioning/merge/conflictResolver.js

var vcConflictFactory = (function() {

  var _conflictCounter = 0;

  function _nextId() {
    _conflictCounter++;
    return 'CONFLICT-' + Date.now() + '-' + _conflictCounter;
  }

  /**
   * Creates a property-vs-property conflict.
   */
  function propertyConflict(entityType, entityId, path, baseValue, oursValue, theirsValue, severity) {
    return {
      id: _nextId(),
      code: 'PROPERTY_PROPERTY',
      entityType: entityType,
      entityId: entityId,
      path: path,
      baseValue: baseValue,
      oursValue: oursValue,
      theirsValue: theirsValue,
      severity: severity || 'blocking',
      allowedResolutions: ['ours', 'theirs'],
      resolution: null,
      resolvedValue: null
    };
  }

  /**
   * Creates a delete-vs-modify conflict.
   */
  function deleteModifyConflict(entityType, entityId) {
    return {
      id: _nextId(),
      code: 'DELETE_MODIFY',
      entityType: entityType,
      entityId: entityId,
      path: [],
      baseValue: null,
      oursValue: null,
      theirsValue: null,
      severity: 'blocking',
      allowedResolutions: ['ours', 'theirs'],
      resolution: null,
      resolvedValue: null
    };
  }

  /**
   * Creates a type-change conflict.
   */
  function typeChangeConflict(entityType, entityId, baseType, oursType, theirsType) {
    return {
      id: _nextId(),
      code: 'TYPE_CHANGE',
      entityType: entityType,
      entityId: entityId,
      path: ['type'],
      baseValue: baseType,
      oursValue: oursType,
      theirsValue: theirsType,
      severity: 'blocking',
      allowedResolutions: ['ours', 'theirs'],
      resolution: null,
      resolvedValue: null
    };
  }

  /**
   * Creates a wire-endpoint conflict.
   */
  function wireEndpointConflict(wireId, path, baseValue, oursValue, theirsValue) {
    return {
      id: _nextId(),
      code: 'WIRE_ENDPOINT',
      entityType: 'wire',
      entityId: wireId,
      path: path,
      baseValue: baseValue,
      oursValue: oursValue,
      theirsValue: theirsValue,
      severity: 'blocking',
      allowedResolutions: ['ours', 'theirs'],
      resolution: null,
      resolvedValue: null
    };
  }

  /**
   * Creates a topology conflict (cycle, missing endpoint, invalid port, etc.).
   */
  function topologyConflict(code, entityType, entityId, description) {
    return {
      id: _nextId(),
      code: code,
      entityType: entityType || 'graph',
      entityId: entityId || null,
      path: [],
      baseValue: null,
      oursValue: null,
      theirsValue: null,
      severity: 'blocking',
      allowedResolutions: [],
      resolution: null,
      resolvedValue: null,
      description: description || ''
    };
  }

  /**
   * Creates a layout conflict (non-blocking).
   */
  function layoutConflict(entityType, entityId, path, oursValue, theirsValue) {
    return {
      id: _nextId(),
      code: 'LAYOUT',
      entityType: entityType,
      entityId: entityId,
      path: path,
      baseValue: null,
      oursValue: oursValue,
      theirsValue: theirsValue,
      severity: 'warning',
      allowedResolutions: ['ours', 'theirs'],
      resolution: 'ours',
      resolvedValue: oursValue
    };
  }

  /**
   * Creates an external reference conflict.
   */
  function externalReferenceConflict(entityType, entityId, description) {
    return {
      id: _nextId(),
      code: 'EXTERNAL_REFERENCE',
      entityType: entityType,
      entityId: entityId,
      path: [],
      baseValue: null,
      oursValue: null,
      theirsValue: null,
      severity: 'warning',
      allowedResolutions: [],
      resolution: null,
      resolvedValue: null,
      description: description || ''
    };
  }

  /**
   * Creates an unknown node type conflict.
   */
  function unknownNodeTypeConflict(entityId, nodeType) {
    return {
      id: _nextId(),
      code: 'UNKNOWN_NODE_TYPE',
      entityType: 'node',
      entityId: entityId,
      path: ['type'],
      baseValue: null,
      oursValue: nodeType,
      theirsValue: null,
      severity: 'blocking',
      allowedResolutions: [],
      resolution: null,
      resolvedValue: null,
      description: 'Unknown node type: ' + nodeType
    };
  }

  return {
    propertyConflict: propertyConflict,
    deleteModifyConflict: deleteModifyConflict,
    typeChangeConflict: typeChangeConflict,
    wireEndpointConflict: wireEndpointConflict,
    topologyConflict: topologyConflict,
    layoutConflict: layoutConflict,
    externalReferenceConflict: externalReferenceConflict,
    unknownNodeTypeConflict: unknownNodeTypeConflict
  };

})();
