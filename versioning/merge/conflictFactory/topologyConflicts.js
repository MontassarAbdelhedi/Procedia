/**
 * Topology and reference conflict factories.
 * @module vcConflictFactoryTopology
 * @dependencies vcConflictFactoryShared
 */
// versioning/merge/conflictFactory/topologyConflicts.js
// DEPENDS ON: versioning/merge/conflictFactory/shared.js
// MUST LOAD BEFORE: versioning/merge/conflictFactory.js

var vcConflictFactoryTopology = (function() {

  var shared = vcConflictFactoryShared;

  /**
   * Creates a topology conflict (cycle, missing endpoint, invalid port, etc.).
   */
  function topologyConflict(code, entityType, entityId, description) {
    return {
      id: shared._nextId(),
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
   * Creates an external reference conflict.
   */
  function externalReferenceConflict(entityType, entityId, description) {
    return {
      id: shared._nextId(),
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
      id: shared._nextId(),
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
    topologyConflict: topologyConflict,
    externalReferenceConflict: externalReferenceConflict,
    unknownNodeTypeConflict: unknownNodeTypeConflict
  };

})();
