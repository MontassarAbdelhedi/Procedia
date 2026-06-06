/**
 * Property and dirty-flag operations on nodes.
 * Provides updateProp and clearDirty.
 * @module graphState/props
 * @dependencies graphState/state
 */
// graph/graphState/props.js
// DEPENDS ON: graph/graphState/state.js
// MUST LOAD BEFORE: graph/graphState/index.js

(function(gs) {

  function updateProp(uuid, key, value) {
    if (!gs.nodeMap.hasOwnProperty(uuid)) return;
    var node = gs.nodeMap[uuid];
    if (!node.props) node.props = {};
    node.props[key] = value;
    node.dirty = true;

    for (var id in gs.nodeMap) {
      if (gs.nodeMap[id]._cloneMasterId === uuid) {
        if (!gs.nodeMap[id].props) gs.nodeMap[id].props = {};
        gs.nodeMap[id].props[key] = value;
        gs.nodeMap[id].dirty = true;
      }
    }
  }

  function clearDirty(uuid) {
    if (!gs.nodeMap.hasOwnProperty(uuid)) return;
    gs.nodeMap[uuid].dirty = false;
  }

  gs.updateProp = updateProp;
  gs.clearDirty = clearDirty;

})(window.__gs);
