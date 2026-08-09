/**
 * @fileoverview Comp selection and filtering logic.
 * Handles graph traversal (calc upstream nodes), view filtering, AE comp focusing,
 * and active comp state management.
 * Depends on: evalBridge, graphState, renderer, wireRenderer, minimap, statusBar (globals)
 * Exports: __compList_logic.calcUpstreamNodes, __compList_logic.applyFilter,
 *          __compList_logic.selectAllProject, __compList_logic.selectComp
 */
// ui/compList/logic.js
// DEPENDS ON: bridge/evalBridge.js, graph/graphState.js, graph/canvas/renderer/index.js,
//             graph/wire/wire.js, graph/canvas/minimap/index.js, ui/statusBar.js
// MUST LOAD BEFORE: ui/compList/index.js

var __compList_logic = (function() {

  /**
   * Walks upstream from a comp node through layer wires to find all connected nodes.
   * @param {string} compId The comp node UUID.
   * @return {Array} Array of node UUIDs (includes the comp itself).
   */
  function calcUpstreamNodes(compId) {
    var visited = {};
    var queue = [compId];
    if (typeof graphState === 'undefined' || typeof graphState.getAllWires !== 'function') {
      return [];
    }
    var wires = graphState.getAllWires();
    while (queue.length > 0) {
      var nodeId = queue.shift();
      for (var wid in wires) {
        if (!wires.hasOwnProperty(wid)) continue;
        var w = wires[wid];
        if (w.type !== 'layer' && w.type !== 'data') continue;
        if (w.toNode === nodeId && !visited[w.fromNode]) {
          visited[w.fromNode] = true;
          queue.push(w.fromNode);
        }
      }
    }
    return Object.keys(visited);
  }

  /**
   * Applies the view filter and re-renders the canvas.
   * @param {string|null} compId Comp node UUID or null for all nodes.
   */
  function applyFilter(compId) {
    try {
      if (compId) {
        var nodeIds = calcUpstreamNodes(compId);
        graphState.setFilteredNodes(nodeIds);
      } else {
        graphState.clearFilter();
      }
      if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
      if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
      if (typeof minimap !== 'undefined' && minimap.render) minimap.render();
      if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
    } catch (e) {
      console.error('[compList] _applyFilter error: ' + e.message);
    }
  }

  /**
   * Selects "All project" — clears filter and active comp.
   * @param {HTMLElement} triggerLabel The comp list label element.
   */
  function selectAllProject(triggerLabel) {
    triggerLabel.textContent = 'All project';
    graphState.setActiveComp(null);
    if (typeof graphState.clearFilter === 'function') {
      applyFilter(null);
    }
  }

  /**
   * Selects a specific comp — focuses it in AE, filters canvas, sets active comp.
   * @param {string} name The comp name.
   * @param {string} comment The comp comment/UUID.
   * @param {HTMLElement} triggerLabel The comp list label element.
   */
  function selectComp(name, comment, triggerLabel) {
    triggerLabel.textContent = name;
    if (typeof evalBridge !== 'undefined' && evalBridge.dispatch) {
      if (comment) {
        evalBridge.dispatch({ action: 'focusComp', params: { nodeUUID: comment } });
      } else {
        evalBridge.dispatch({ action: 'focusCompByName', params: { name: name } });
      }
    }

    var compId = null;
    if (comment) {
      var node = graphState.getNode(comment);
      if (node && node.type === 'core/comp') {
        compId = comment;
      }
    }

    if (!compId) {
      var allNodes = graphState.getAllNodes();
      for (var nid in allNodes) {
        if (!allNodes.hasOwnProperty(nid)) continue;
        var n = allNodes[nid];
        if (n.type === 'core/comp' && n.props && n.props.label === name) {
          compId = nid;
          break;
        }
      }
    }

    if (compId) {
      graphState.setActiveComp(compId);
      applyFilter(compId);
    } else {
      graphState.setActiveComp(null);
      if (typeof graphState.clearFilter === 'function') {
        applyFilter(null);
      }
    }
  }

  return {
    calcUpstreamNodes: calcUpstreamNodes,
    applyFilter: applyFilter,
    selectAllProject: selectAllProject,
    selectComp: selectComp
  };

})();
