/**
 * @fileoverview onClick handler — handles click-to-focus on comp nodes.
 * @dependencies input/state.js, bridge/evalBridge.js, graph/graphState.js
 */

// graph/canvas/input/handlers/mouse/click.js
// DEPENDS ON: input/state.js, bridge/evalBridge.js, graph/graphState.js
// MUST LOAD AFTER: input/handlers/mouse/mousedown.js
// MUST LOAD BEFORE: input/handlers/index.js

(function() {

  var _FOCUS_DELAY_MS = 280;

  _handlersMouse.onClick = function onClick(e) {
    if (e.button !== 0) return;
    if (_pendingFocusTimer) {
      clearTimeout(_pendingFocusTimer);
      _pendingFocusTimer = null;
    }
    if (e.target.classList && e.target.classList.contains('port-dot')) return;
    var target = e.target;
    var nodeEl = null;
    var boundary = document.getElementById('canvas-nodes');
    while (target && target !== boundary) {
      if (target.classList && target.classList.contains('node')) { nodeEl = target; break; }
      target = target.parentElement;
    }
    if (!nodeEl) return;
    var nodeId = nodeEl.getAttribute('data-node-id');
    if (!nodeId) return;
    var nodeData = graphState.getNode(nodeId);
    if (nodeData && nodeData.type === 'core/comp' && typeof evalBridge !== 'undefined') {
      _pendingFocusTimer = setTimeout(function() {
        _pendingFocusTimer = null;
        evalBridge.dispatch({
          action: 'focusComp',
          params: { nodeUUID: nodeId }
        }).catch(function(err) {
          console.warn('[handlers] click focusComp failed:', err);
        });
      }, _FOCUS_DELAY_MS);
    }
  };

})();
