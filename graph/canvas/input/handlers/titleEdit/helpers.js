/**
 * @fileoverview Graph-traversal helpers for title-edit rename dispatch.
 * Also declares the _handlersTitleEdit container.
 * @dependencies input/state.js, graph/graphState.js
 */

// graph/canvas/input/handlers/titleEdit/helpers.js
// DEPENDS ON: input/state.js, graph/graphState.js
// MUST LOAD BEFORE: input/handlers/index.js
// FIRST IN LOAD ORDER among titleEdit/ sub-files

var _handlersTitleEdit = {};

(function() {

  _handlersTitleEdit._findInputWire = function _findInputWire(nodeId) {
    var wires = graphState.getAllWires();
    for (var wid in wires) {
      if (wires.hasOwnProperty(wid) && wires[wid].toNode === nodeId) {
        return wires[wid];
      }
    }
    return null;
  };

  _handlersTitleEdit._findOutputComp = function _findOutputComp(nodeId) {
    var wires = graphState.getAllWires();
    for (var wid in wires) {
      if (wires.hasOwnProperty(wid) && wires[wid].fromNode === nodeId && wires[wid].type === 'layer') {
        return wires[wid].toNode;
      }
    }
    return null;
  };

  _handlersTitleEdit._findLayerUUID = function _findLayerUUID(nodeId, visited) {
    if (!visited) visited = {};
    if (visited[nodeId]) return null;
    visited[nodeId] = true;
    var wires = graphState.getAllWires();
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid) || wires[wid].fromNode !== nodeId || wires[wid].type !== 'layer') continue;
      if (wires[wid]._pathLayerUUID !== null) return wires[wid]._pathLayerUUID;
      var found = _handlersTitleEdit._findLayerUUID(wires[wid].toNode, visited);
      if (found !== null) return found;
    }
    return null;
  };

  _handlersTitleEdit._renameDispatch = function _renameDispatch(action, params) {
    if (typeof evalBridge === 'undefined') return;
    evalBridge.dispatch({ action: action, params: params }).then(function(res) {
      if (!res.ok) {
        console.warn('[handlers] ' + action + ' failed:', res.error);
      }
    }).catch(function(err) {
      console.warn('[handlers] ' + action + ' error:', err);
    });
  };

})();
