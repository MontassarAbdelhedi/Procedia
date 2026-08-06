/**
 * @fileoverview Wire and keyframe state utilities for the renderer.
 * Builds a cached wire-param lookup map and checks keyframe status.
 * @dependencies graph/graphState.js
 * @exports __r_hlp_wire { isParamWired, isParamKeyframed, clearWireParamCache }
 */

// graph/canvas/renderer/helpers/wireState.js
// DEPENDS ON: graph/graphState.js
// MUST LOAD BEFORE: helpers/display.js, helpers.js, renderer/index.js

var __r_hlp_wire = (function() {
  var _wireParamMap = null;

  function _buildWireParamMap() {
    var map = {};
    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      if (!wires.hasOwnProperty(wireId)) continue;
      var wire = wires[wireId];
      if (wire.type !== 'data') continue;
      if (!map[wire.toNode]) map[wire.toNode] = {};
      var key = wire.boundParam || wire.toPort;
      if (key) map[wire.toNode][key] = true;
    }
    return map;
  }

  function clearWireParamCache() {
    _wireParamMap = null;
  }

  function isParamWired(nodeId, paramKey) {
    if (!_wireParamMap) _wireParamMap = _buildWireParamMap();
    return !!(paramKey && _wireParamMap[nodeId] && _wireParamMap[nodeId][paramKey]);
  }

  function isParamKeyframed(nodeId, paramKey) {
    if (typeof keyframeState === 'undefined') return false;
    return keyframeState.isParamKeyframed(nodeId, paramKey);
  }

  return {
    isParamWired:       isParamWired,
    isParamKeyframed:   isParamKeyframed,
    clearWireParamCache: clearWireParamCache
  };
})();
