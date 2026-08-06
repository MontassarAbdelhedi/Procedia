/**
 * @fileoverview Node switch mode for the floating action toolbar.
 * Handles entering/clearing the effector-switch target-highlight mode.
 * @dependencies graph/graphState.js, graph/canvas/renderer/index.js
 * @exports __ntb_switchMode { enter, clear, isActive }
 */

// graph/canvas/renderer/nodeToolbar/switchMode.js
// DEPENDS ON: graph/graphState.js, graph/canvas/renderer/index.js
// MUST LOAD BEFORE: nodeToolbar.js

var __ntb_switchMode = (function() {
  var _state = null;

  function enter(nodeId) {
    clear();
    if (!nodeId) return;
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData || nodeData.nodeKind !== 'effector') return;
    var siblings = engine.findSiblingEffectors(nodeId);
    if (siblings.length === 0) return;
    _state = { sourceId: nodeId, siblingIds: siblings };
    for (var i = 0; i < siblings.length; i++) {
      var el = renderer.getNodeElement(siblings[i]);
      if (el) el.classList.add('node--switch-target');
    }
  }

  function clear() {
    if (!_state) return;
    for (var i = 0; i < _state.siblingIds.length; i++) {
      var el = renderer.getNodeElement(_state.siblingIds[i]);
      if (el) el.classList.remove('node--switch-target');
    }
    _state = null;
  }

  function isActive() {
    return _state !== null;
  }

  function getState() {
    return _state;
  }

  return {
    enter:    enter,
    clear:    clear,
    isActive: isActive,
    getState: getState
  };
})();
