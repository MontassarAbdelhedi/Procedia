/**
 * Ordered list of JSX preamble files loaded into AE by evalBridge.
 * Depends on: nothing
 * Exports: jsxFiles object with getFiles()
 */
// bridge/jsxFiles.js
// DEPENDS ON: nothing
// MUST LOAD BEFORE: bridge/evalBridge.js
//
// Exposes: jsxFiles.getFiles()

var jsxFiles = (function() {

  var files = [
    '/jsx/json.jsx',
    '/jsx/utils.jsx',
    '/jsx/persistence/chunkUtils.jsx',
    '/jsx/persistence/readGraph.jsx',
    '/jsx/persistence/writeGraph.jsx',
    '/jsx/persistence/afterSave.jsx',
    '/jsx/persistence/vcsWriteRepo.jsx',
    '/jsx/persistence/vcsReadRepo.jsx',
    '/jsx/persistence.jsx',
    '/jsx/dispatcher/actions_schema.jsx',
    '/jsx/dispatcher/actions_comp.jsx',
    '/jsx/dispatcher/actions_layer.jsx',
    '/jsx/dispatcher/actions_footage.jsx',
    '/jsx/dispatcher/blend_map.jsx',
    '/jsx/dispatcher/actions_property.jsx',
    '/jsx/dispatcher/actions_parent.jsx',
    '/jsx/dispatcher/actions_order.jsx',
    '/jsx/dispatcher/actions_blending.jsx',
    '/jsx/dispatcher/actions_propertyGet.jsx',
    '/jsx/dispatcher/actions_park.jsx',
    '/jsx/dispatcher/actions_matte.jsx',
    '/jsx/dispatcher/actions_masks.jsx',
    '/jsx/dispatcher/actions_keyframe.jsx',
    '/jsx/dispatcher/actionEffect/apply.jsx',
    '/jsx/dispatcher/actionEffect/introspect/constants.jsx',
    '/jsx/dispatcher/actionEffect/introspect/walk.jsx',
    '/jsx/dispatcher/actionEffect/introspect.jsx',
    '/jsx/dispatcher/actionEffect/pollAlive.jsx',
    '/jsx/dispatcher/actionEffect/batchGetEffectProperties.jsx',
    '/jsx/dispatcher/actionEffect/buildCatalog.jsx',
    '/jsx/dispatcher/actionEffect/setExpression.jsx',
    '/jsx/dispatcher/actions_cmdChunk.jsx',
    '/jsx/dispatcher/actions_compList.jsx',
    '/jsx/dispatcher/actions_graphExport.jsx',
    '/jsx/dispatcher/actions_import.jsx',
    '/jsx/dispatcher/actionInstances/clonerTransforms.jsx',
    '/jsx/dispatcher/actionInstances/clonerUtils.jsx',
    '/jsx/dispatcher/actionInstances/cloner/setupSource.jsx',
    '/jsx/dispatcher/actionInstances/cloner/populateClones.jsx',
    '/jsx/dispatcher/actionInstances/cloner/finalizeCloner.jsx',
    '/jsx/dispatcher/actionInstances/cloner.jsx',
    '/jsx/dispatcher/actionInstances/clonerRemove.jsx',
    '/jsx/dispatcher/actionInstances/cloner/findDataLayer.jsx',
    '/jsx/dispatcher/actionInstances/cloner/rebuildClones.jsx',
    '/jsx/dispatcher/actionInstances/cloner/applyDelta.jsx',
    '/jsx/dispatcher/actionInstances/clonerUpdate.jsx',
    '/jsx/dispatcher/actions_undo.jsx',
    '/jsx/dispatcher/_handlers.jsx',
    '/jsx/dispatcher/dispatcher.jsx'
  ];

  function getFiles() {
    return files;
  }

  return {
    getFiles: getFiles
  };

})();
