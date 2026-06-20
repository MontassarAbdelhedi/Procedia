/**
 * @fileoverview Canvas node renderer.
 * Manages the lifecycle of node card DOM elements: creation, update, and removal.
 * Synchronises the DOM with graph state and node registry definitions.
 * @dependencies graph/graphState.js, graph/nodeRegistry.js,
 *               renderer/categories.js, renderer/helpers.js, renderer/builder.js
 * @exports renderer { render, updateNode, removeNode, getNodeElement }
 */

// graph/canvas/renderer/index.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js,
//             renderer/categories.js, renderer/helpers.js, renderer/builder.js
// MUST LOAD BEFORE: graph/canvas/input/index.js, index.js
// REPLACES: graph/canvas/renderer.js

var renderer = (function() {
  var _nodeElements = {};

  /**
   * Full render pass: removes stale elements, creates new ones, and updates existing ones.
   */
  function render() {
    var vp = __r_hlp.getViewport();
    if (!vp) return;
    __r_hlp.clearWireParamCache();
    var nodes = graphState.getAllNodes();

    for (var id in _nodeElements) {
      if (_nodeElements.hasOwnProperty(id) && (!nodes[id] || !graphState.isNodeVisible(id))) {
        removeNode(id);
      }
    }

    for (var nodeId in nodes) {
      if (!nodes.hasOwnProperty(nodeId)) continue;
      if (!graphState.isNodeVisible(nodeId)) continue;
      var nodeData = nodes[nodeId];
      var def = nodeRegistry.getDefinition(nodeData.type);
      if (!def) continue;

      if (_nodeElements[nodeId]) {
        __r_bld.updateNodeCard(_nodeElements[nodeId], nodeId, nodeData, def);
      } else {
        var el = __r_bld.buildNodeCard(nodeId, nodeData, def);
        vp.appendChild(el);
        _nodeElements[nodeId] = el;
      }
    }
  }

  /**
   * Updates a single node card (position, state, params).
   * @param {string} nodeId
   */
  function updateNode(nodeId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return;
    if (_nodeElements[nodeId]) {
      __r_bld.updateNodeCard(_nodeElements[nodeId], nodeId, nodeData, def);
    }
  }

  /**
   * Removes a node card from the DOM and internal map.
   * @param {string} nodeId
   */
  function removeNode(nodeId) {
    var el = _nodeElements[nodeId];
    if (el && el.parentNode) el.parentNode.removeChild(el);
    delete _nodeElements[nodeId];
  }

  /**
   * Returns the DOM element for a given node ID.
   * @param {string} nodeId
   * @returns {HTMLElement|null}
   */
  function getNodeElement(nodeId) {
    return _nodeElements[nodeId] || null;
  }

  return {
    render:         render,
    updateNode:     updateNode,
    removeNode:     removeNode,
    getNodeElement: getNodeElement
  };
})();
