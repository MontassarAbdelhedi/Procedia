import { loadGlobalScript } from './setup.js';

var STUB = function() { return { ok: false, error: 'stub — not implemented in test' }; };

var _handlerNames = [
  'createComp', 'deleteComp', 'createTextLayer', 'createNullLayer',
  'createAdjustmentLayer', 'createShapeLayer', 'createRectangleLayer',
  'createEllipseLayer', 'createStarLayer', 'createSquircleLayer',
  'createGearLayer', 'createWaveLayer', 'createFlowerLayer',
  'addCompAsLayer', 'clearLayerParent', 'parkLayer', 'unparkLayer',
  'deleteParkedLayer', 'deletePathLayer', 'setLayerProperty',
  'setCompProperty', 'setLayerParent', 'setLayerOrder', 'moveLayerBefore',
  'renameNode', 'focusComp', 'listComps', 'focusCompByName',
  'applyDynamicEffect', 'pollAliveEffects', 'removeEffect',
  'setEffectProperty', 'renameEffect', 'setEffectEnabled',
  'reorderEffect', 'reorderEffectChain', 'setLayerEnabled',
  'restampLayer', 'pollAliveNodes', 'pollExternalDeletions',
  'setBlendingMode', 'setLumaMatte', 'setAlphaMatte', 'clearMatte',
  'getMasksForLayer', 'batchGetLayerProperties', 'batchGetEffectProperties',
  'readSchemaCache', 'writeSchemaCache', 'getAEVersion',
  'introspectEffect', 'readGraph', 'writeGraph', 'writeGraphExport',
  'saveGraphToFile', 'openGraphFile', 'ensureReservedComp',
  'browseAndImportFootage', 'createFootageLayer', 'deleteFootageItem',
  'importProject', 'addKeyframe', 'removeKeyframe', 'removeAllKeyframes',
  'getKeyframeTimes', 'getCurrentTime', 'setCurrentTime',
  'batchGetKeyframeTimes', 'getKeyframeData', 'writeCmdChunk',
  'executeCmdFile', 'cleanupCmdFile'
];

_handlerNames.forEach(function(name) {
  window['_handle' + name.charAt(0).toUpperCase() + name.slice(1)] = STUB;
});

export function loadJSXScript(relativePath) {
  loadGlobalScript(relativePath);
}

export function mockHandler(action, fn) {
  if (typeof window._handlers === 'undefined') window._handlers = {};
  window._handlers[action] = fn;
}

export function resetHandlers() {
  delete window._handlers;
  delete window._cmdParams;
  delete window._handleGeneric;
  delete window._route;
  delete window.dispatch;
  delete window.dispatchBatch;
}
