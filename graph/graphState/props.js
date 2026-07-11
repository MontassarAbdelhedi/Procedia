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

    var cloneIds = gs.getCloneIds(uuid);
    for (var ci = 0; ci < cloneIds.length; ci++) {
      if (!gs.nodeMap[cloneIds[ci]].props) gs.nodeMap[cloneIds[ci]].props = {};
      gs.nodeMap[cloneIds[ci]].props[key] = value;
      gs.nodeMap[cloneIds[ci]].dirty = true;
    }

    gs.rebuildTempGraph();
  }

  function clearDirty(uuid) {
    if (!gs.nodeMap.hasOwnProperty(uuid)) return;
    gs.nodeMap[uuid].dirty = false;
  }

  gs.updateProp = updateProp;
  gs.clearDirty = clearDirty;

})(window.__procedia_internal.gs);
