/**
 * Allowed actions whitelist for evalBridge dispatch.
 * The ONLY source of truth for which actions can cross the bridge.
 * Depends on: nothing
 * Exports: allowedActions object with getAllowedActions, isAllowed
 */
// bridge/allowedActions.js
// DEPENDS ON: nothing
// MUST LOAD BEFORE: bridge/evalBridge.js
//
// Exposes: allowedActions.getAllowedActions(), allowedActions.isAllowed(action)

var allowedActions = (function() {

  var _ALLOWED_ACTIONS = {
    'createComp': true, 'deleteComp': true, 'createTextLayer': true,
    'createCameraLayer': true, 'createLightLayer': true, 'createNullLayer': true, 'createAdjustmentLayer': true, 'createShapeLayer': true, 'createSolidLayer': true,
    'createRectangleLayer': true, 'createEllipseLayer': true, 'createStarLayer': true,
    'createSquircleLayer': true, 'createGearLayer': true, 'createWaveLayer': true,
    'createFlowerLayer': true, 'createPolygonLayer': true, 'addCompAsLayer': true, 'clearLayerParent': true,
    'parkLayer': true, 'unparkLayer': true, 'deleteParkedLayer': true,
    'deletePathLayer': true, 'setLayerProperty': true, 'setCompProperty': true,
    'setLayerParent': true, 'setLayerOrder': true, 'moveLayerBefore': true,
    'renameNode': true, 'focusComp': true, 'listComps': true,
    'focusCompByName': true, 'applyDynamicEffect': true, 'pollAliveEffects': true,
    'removeEffect': true, 'setEffectProperty': true, 'renameEffect': true,
    'setEffectEnabled': true, 'setExpression': true, 'reorderEffect': true, 'reorderEffectChain': true,
    'setLayerEnabled': true, 'setLayerShy': true, 'setCompHideShyLayers': true, 'restampLayer': true, 'pollAliveNodes': true,
    'pollExternalDeletions': true, 'setBlendingMode': true, 'setLumaMatte': true,
    'setAlphaMatte': true, 'clearMatte': true, 'getMasksForLayer': true,
    'batchGetLayerProperties': true, 'batchGetEffectProperties': true,
    'readSchemaCache': true, 'writeSchemaCache': true, 'getAEVersion': true,
    'introspectEffect': true, 'readGraph': true, 'writeGraph': true,
    'writeGraphExport': true, 'saveGraphToFile': true, 'openGraphFile': true,
    'ensureReservedComp': true, 'browseAndImportFootage': true,
    'createFootageLayer': true,
    'deleteFootageItem': true,
    'addKeyframe': true, 'removeKeyframe': true, 'removeAllKeyframes': true,
    'getKeyframeTimes': true, 'getCurrentTime': true, 'setCurrentTime': true,
    'batchGetKeyframeTimes': true, 'getKeyframeData': true, 'writeCmdChunk': true,
    'executeCmdFile': true, 'cleanupCmdFile': true,
    'beginUndoGroup': true, 'endUndoGroup': true,
    'getProjectIdentifier': true,
    'createCloner': true, 'removeCloner': true, 'updateCloner': true,
    'enumerateAllEffects': true,
    'buildFullEffectCatalog': true,
    'writeTextFile': true,
    'importScanComps': true,
    'importScanFootage': true,
    'importScanCompLayers': true,
    'stampImportUUIDs': true,
    'saveAsDialog': true,
    'writeRepo': true,
    'readRepo': true
  };

  function getAllowedActions() {
    return Object.keys(_ALLOWED_ACTIONS);
  }

  function isAllowed(action) {
    return !!_ALLOWED_ACTIONS[action];
  }

  return {
    getAllowedActions: getAllowedActions,
    isAllowed: isAllowed
  };

})();
