/**
 * graph/engine/helpers/expressionDispatch.js
 *
 * Dispatches a setExpression AE command for an Expression node wired to a
 * target. Handles both effector (effect property) and affected (layer property)
 * targets.
 *
 * Dependencies: graphState, nodeRegistry, evalBridge, helpers/pathLayer.js
 * Load before: graph/engine/helpers/dataPropagation.js, graph/engine/helpers/index.js
 *
 * Exports: _dispatchExpressionToTarget (internal helper)
 */
// graph/engine/helpers/expressionDispatch.js
// DEPENDS ON: graph/graphState, graph/nodeRegistry.js, bridge/evalBridge.js,
//             graph/engine/helpers/pathLayer.js
// MUST LOAD BEFORE: graph/engine/helpers/dataPropagation.js, graph/engine/helpers/index.js

window.__procedia_internal.hlp = window.__procedia_internal.hlp || {};

window.__procedia_internal.hlp._dispatchExpressionToTarget = function(targetNodeId, propMatchName, expression) {
  var targetNode = graphState.getNode(targetNodeId);
  if (!targetNode) return;
  var targetDef = nodeRegistry.getDefinition(targetNode.type);
  if (!targetDef) return;
  if (!targetNode.hostingComps || targetNode.hostingComps.length === 0) return;
  var hostingCompUUID = targetNode.hostingComps[0];
  var upstreamNodeUUID = window.__procedia_internal.hlp.findPathLayerUUID(targetNodeId);
  if (!upstreamNodeUUID) return;

  if (targetDef.nodeKind === 'effector' && targetDef.matchName) {
    evalBridge.dispatch({
      action: 'setExpression',
      params: {
        nodeUUID:        targetNodeId,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,
        effectMatchName: targetDef.matchName,
        propMatchName:   propMatchName,
        expression:      expression
      }
    });
  } else {
    evalBridge.dispatch({
      action: 'setExpression',
      params: {
        nodeUUID:        targetNodeId,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,
        effectMatchName: null,
        propMatchName:   propMatchName,
        expression:      expression
      }
    });
  }
};
