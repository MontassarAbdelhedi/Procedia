/**
 * Shared internal state for graphState modules.
 * Holds nodeMap, wireMap, tempGraph, selection, and helper constants.
 * @module graphState/state
 * @dependencies none
 * @internal
 */
// graph/graphState/state.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: graph/graphState/tempGraph.js, graph/graphState/nodes.js,
//                   graph/graphState/wires.js, graph/graphState/props.js,
//                   graph/graphState/selection.js, graph/graphState/graphOps.js,
//                   graph/graphState/index.js

window.__gs = {
  nodeMap:   {},
  wireMap:   {},
  tempGraph: { version: '4.0', nodes: {}, wires: {} },
  selection: [],
  _onSelectionChangeCb: null,
  _graphChangeListeners: [],

  _activeCompId: null,
  _viewFilter:   null,

  _strippedNodeFields: {
    dirty:                true,
    dynamicSchema:        true,
    secondaryPorts:       true,
    _transplantLayerUUID: true,
    hasParkedLayer:       true
  },

  _strippedWireFields: {
    _pathLayerUUID: true
  },

  getCloneIds: function(masterId) {
    var ids = [];
    for (var _id in window.__gs.nodeMap) {
      if (window.__gs.nodeMap[_id]._cloneMasterId === masterId) ids.push(_id);
    }
    return ids;
  }
};
