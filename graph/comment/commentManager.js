/**
 * @fileoverview Canvas comment manager — sticky notes on the graph canvas.
 * Public API orchestrated from sub-modules: commentState, commentDOM,
 * commentColorPicker, commentEvents.
 * Handles state, DOM rendering, and interaction for comments (create, edit,
 * delete, color, collapse, drag). Comments are positioned in canvas space,
 * live inside #canvas-nodes alongside node cards, and have no AE presence.
 * @module commentManager
 * @dependencies comment/state, comment/DOM, comment/colorPicker, comment/events
 * @exports commentManager { init, create, remove, render, getAll, select,
 *                           deselect, getSelected, findByElement }
 */
// graph/comment/commentManager.js
// DEPENDS ON: graph/comment/commentState.js, graph/comment/commentDOM.js,
//             graph/comment/commentColorPicker.js, graph/comment/commentEvents.js
// MUST LOAD AFTER: all graph/comment/*.js except this one
// MUST LOAD BEFORE: graph/canvas/input/handlers/mouse/mousedown.js

var commentManager = (function() {
  var cm = window.__procedia_internal.cm;

  function init() {
    cm._render();
    document.addEventListener('mousemove', cm._onDragMove);
    document.addEventListener('mouseup', cm._onDragEnd);
    document.addEventListener('mousedown', cm._onDocMouseDown);
  }

  var api = {
    init: init,
    create: cm.create,
    remove: cm._remove,
    removeAll: cm.removeAll,
    render: cm._render,
    getAll: cm.getAll,
    getSelected: cm.getSelected,
    getEditing: cm.getEditing,
    select: cm.select,
    deselect: cm.deselect,
    findByElement: cm.findByElement,
    load: cm.load,
    setColor: cm._setColor,
    toggleCollapse: cm._toggleCollapse
  };

  delete window.__procedia_internal.cm;
  return api;
})();
