import { loadGlobalScript } from './setup.js';

var STUB = function() { return { ok: false, error: 'stub — not implemented in test' }; };

var _handlerNames = [
  'createComp', 'deleteComp', 'createTextLayer', 'createNullLayer',
  'createCameraLayer', 'createLightLayer', 'createSolidLayer',
  'createAdjustmentLayer', 'createShapeLayer', 'createRectangleLayer',
  'createEllipseLayer', 'createStarLayer', 'createSquircleLayer',
  'createGearLayer', 'createWaveLayer', 'createFlowerLayer',
  'createPolygonLayer',
  'addCompAsLayer', 'clearLayerParent', 'parkLayer', 'unparkLayer',
  'deleteParkedLayer', 'deletePathLayer', 'setLayerProperty',
  'setCompProperty', 'setLayerParent', 'setLayerOrder', 'moveLayerBefore',
  'renameNode', 'focusComp', 'listComps', 'focusCompByName',
  'applyDynamicEffect', 'pollAliveEffects', 'removeEffect',
  'setEffectProperty', 'setExpression', 'renameEffect', 'setEffectEnabled',
  'reorderEffect', 'reorderEffectChain', 'setLayerEnabled', 'setLayerShy',
  'setCompHideShyLayers',
  'restampLayer', 'pollAliveNodes', 'pollExternalDeletions',
  'setBlendingMode', 'setLumaMatte', 'setAlphaMatte', 'clearMatte',
  'getMasksForLayer', 'batchGetLayerProperties', 'batchGetEffectProperties',
  'readSchemaCache', 'writeSchemaCache', 'getAEVersion',
  'introspectEffect', 'readGraph', 'writeGraph', 'writeGraphExport',
  'saveGraphToFile', 'openGraphFile', 'ensureReservedComp',
  'browseAndImportFootage', 'createFootageLayer', 'deleteFootageItem',
  'addKeyframe', 'removeKeyframe', 'removeAllKeyframes',
  'getKeyframeTimes', 'getCurrentTime', 'setCurrentTime',
  'batchGetKeyframeTimes', 'getKeyframeData', 'writeCmdChunk',
  'executeCmdFile', 'cleanupCmdFile', 'enumerateAllEffects',
  'buildFullEffectCatalog', 'writeTextFile', 'getProjectIdentifier',
  'beginUndoGroup', 'endUndoGroup', 'importScanComps', 'importScanFootage',
  'importScanCompLayers', 'stampImportUUIDs', 'saveAsDialog',
  'createCloner', 'removeCloner', 'updateCloner',
  'writeRepo', 'readRepo'
];

_handlerNames.forEach(function(name) {
  window['_handle' + name.charAt(0).toUpperCase() + name.slice(1)] = STUB;
});

function _buildHandlers() {
  window._handlers = {};
  _handlerNames.forEach(function(name) {
    var handlerName = '_handle' + name.charAt(0).toUpperCase() + name.slice(1);
    window._handlers[name] = window[handlerName];
  });
}

_buildHandlers();

export function loadJSXScript(relativePath) {
  loadGlobalScript(relativePath);
}

export function mockHandler(action, fn) {
  window._handlers[action] = fn;
}

export function resetHandlers() {
  _buildHandlers();
  delete window._cmdParams;
  delete window._handleGeneric;
  delete window._route;
  delete window.dispatch;
  delete window.dispatchBatch;
}
