/**
 * @fileoverview Layer action handlers for the inspector.
 * Handles clicks on layer order buttons and fetches mask names for Fill nodes.
 * Depends on: __ins_events._findUpstreamLayerNode, graphState, evalBridge, inspector (globals).
 * Attaches to __ins_events.onLayerActionClick, ._fetchFillMasks.
 */
// ui/inspector/events/layerActions.js
// DEPENDS ON: ui/inspector/events/utils.js, graph/graphState.js, bridge/evalBridge.js

var __ins_events = __ins_events || {};

(function() {

  /**
   * Handles clicks on layer order buttons (Move Up / Move Down).
   * @param {Event} e The click event.
   */
  function _onLayerActionClick(e) {
    var btn = e.target;
    if (!btn || !btn.classList || !btn.classList.contains('inspector-layer-btn')) return;

    var nodeId = btn.getAttribute('data-node-id');
    var hostUUID = btn.getAttribute('data-host-uuid');
    var direction = btn.getAttribute('data-direction') || 'top';
    if (!nodeId || !hostUUID) return;

    evalBridge.dispatch({
      action: 'setLayerOrder',
      params: { layerUUID: nodeId, hostingCompUUID: hostUUID, direction: direction }
    });
  }

  /**
   * Fetches mask names from AE for a given Fill node and updates the node data.
   * Called when a Fill node is shown in the inspector.
   * @param {string} nodeId - Fill node UUID
   * @param {string} hostCompUUID - Hosting comp UUID
   */
  function _fetchFillMasks(nodeId, hostCompUUID) {
    if (!nodeId || !hostCompUUID) return;
    var upstreamId = __ins_events._findUpstreamLayerNode(nodeId);
    if (!upstreamId) return;

    // The upstream node's layer UUID may be stored in its props or we need to
    // resolve it from the wire path. Use the upstream node ID as the layer UUID
    // since the engine stores it that way.
    evalBridge.dispatch({
      action: 'getMasksForLayer',
      params: { hostingCompUUID: hostCompUUID, layerUUID: upstreamId }
    }).then(function(res) {
      if (res.ok && res.data && res.data.masks) {
        var nodeData = graphState.getNode(nodeId);
        if (nodeData) {
          nodeData._maskNames = res.data.masks;
          if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
        }
      }
    }).catch(function(err) {
      console.warn('[inspector] getMasksForLayer failed:', err);
    });
  }

  __ins_events.onLayerActionClick = _onLayerActionClick;
  __ins_events._fetchFillMasks = _fetchFillMasks;

})();
