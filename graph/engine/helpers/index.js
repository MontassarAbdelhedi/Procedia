/**
 * graph/engine/helpers/index.js
 *
 * Barrel module for engine helpers. Registers the hlp namespace in the
 * internal registry and monkey-patches graphState.rebuildTempGraph to
 * invalidate the path layer cache on every graph rebuild.
 *
 * Dependencies: helpers/buildInitialProps.js, helpers/refreshUI.js,
 *               helpers/pathLayer.js, helpers/dynamicSchema.js,
 *               helpers/expressionDispatch.js, helpers/dataPropagation.js,
 *               helpers/deepCopyNode.js
 * Load before: graph/engine/lifecycle.js
 *
 * Exports (via window.__procedia_internal.hlp): buildInitialProps,
 *          refreshNodeUI, deepCopyNode, resolveDynamicSchema,
 *          applyDynamicSchema, findPathLayerUUID, invalidatePathLayerCache,
 *          propagateDataValue, propagateDataDefaults, repropagateDataValues
 */
// graph/engine/helpers/index.js
// DEPENDS ON: graph/engine/helpers/buildInitialProps.js,
//             graph/engine/helpers/refreshUI.js,
//             graph/engine/helpers/pathLayer.js,
//             graph/engine/helpers/dynamicSchema.js,
//             graph/engine/helpers/expressionDispatch.js,
//             graph/engine/helpers/dataPropagation.js,
//             graph/engine/helpers/deepCopyNode.js
// MUST LOAD BEFORE: graph/engine/lifecycle.js

window.__procedia_internal.registry.register('hlp', window.__procedia_internal.hlp);

var _origRebuild = graphState.rebuildTempGraph;
graphState.rebuildTempGraph = function() {
  window.__procedia_internal.hlp.invalidatePathLayerCache();
  _origRebuild();
};
