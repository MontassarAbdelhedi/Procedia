/**
 * @fileoverview Rubber-band selection for the graph canvas.
 * Provides functions to create, update, and destroy the rubber-band overlay,
 * and to find nodes within a rectangular selection area.
 * @dependencies input/state.js, input/utils.js, graph/graphState.js, graph/canvas/renderer/index.js
 * @exports inputRubberband { getNodesInRect, createRubberEl, destroyRubberEl, updateRubberEl }
 */

// graph/canvas/input/rubberband.js
// DEPENDS ON: input/state.js, input/utils.js, graph/graphState.js, graph/canvas/renderer/index.js
// MUST LOAD BEFORE: input/handlers/titleEdit/helpers.js, input/handlers/titleEdit/exit.js,
//                   input/handlers/titleEdit/commit.js, input/handlers/titleEdit/cancel.js,
//                   input/handlers/titleEdit/dblclick.js,
//                   input/handlers/mouse/mousedown.js,
//                   input/handlers/mouse/mouseup.js, input/handlers/mouse/click.js,
//                   input/handlers/keyboard.js, input/handlers/wheel.js,
//                   input/handlers/index.js, input/index.js

var inputRubberband = (function() {

  /**
   * Returns IDs of nodes whose DOM elements intersect the given world-coordinate rectangle.
   * @param {number} wx1 - First corner canvas x.
   * @param {number} wy1 - First corner canvas y.
   * @param {number} wx2 - Second corner canvas x.
   * @param {number} wy2 - Second corner canvas y.
   * @returns {string[]} Array of node IDs.
   */
  function getNodesInRect(wx1, wy1, wx2, wy2) {
    var off = inputUtils.wrapOffset();
    var minX = Math.min(wx1, wx2) + off.left;
    var minY = Math.min(wy1, wy2) + off.top;
    var maxX = Math.max(wx1, wx2) + off.left;
    var maxY = Math.max(wy1, wy2) + off.top;

    var nodes = graphState.getAllNodes();
    var result = [];
    for (var id in nodes) {
      if (!nodes.hasOwnProperty(id)) continue;
      var el = renderer.getNodeElement(id);
      if (!el) continue;
      var rect = el.getBoundingClientRect();
      if (rect.left < maxX && rect.right > minX &&
          rect.top  < maxY && rect.bottom > minY) {
        result.push(id);
      }
    }
    return result;
  }

  /**
   * Creates the rubber-band overlay div and appends it to canvas-wrap.
   * @returns {HTMLElement} The rubber-band element.
   */
  function createRubberEl() {
    _inpRubber._highlights = [];
    var wrap = document.getElementById('canvas-wrap');
    var el = document.createElement('div');
    el.className = 'rubber-band';
    wrap.appendChild(el);
    return el;
  }

  /**
   * Removes the rubber-band overlay and clears node highlights.
   */
  function destroyRubberEl() {
    for (var i = 0; i < _inpRubber._highlights.length; i++) {
      var el = renderer.getNodeElement(_inpRubber._highlights[i]);
      if (el) el.classList.remove('rubber-hover');
    }
    _inpRubber._highlights = [];
    if (_inpRubber.el && _inpRubber.el.parentNode) {
      _inpRubber.el.parentNode.removeChild(_inpRubber.el);
    }
    _inpRubber.el = null;
    _inpRubber.active = false;
  }

  /**
   * Updates the 'rubber-hover' class on nodes as the selection rect changes.
   */
  function updateRubberHighlights() {
    var ids = getNodesInRect(_inpRubber.startX, _inpRubber.startY, _inpRubber.currentX, _inpRubber.currentY);
    var old = _inpRubber._highlights;
    for (var i = 0; i < old.length; i++) {
      if (ids.indexOf(old[i]) === -1) {
        var el = renderer.getNodeElement(old[i]);
        if (el) el.classList.remove('rubber-hover');
      }
    }
    for (var j = 0; j < ids.length; j++) {
      if (old.indexOf(ids[j]) === -1) {
        var el2 = renderer.getNodeElement(ids[j]);
        if (el2) el2.classList.add('rubber-hover');
      }
    }
    _inpRubber._highlights = ids;
  }

  /**
   * Updates the rubber-band element's position and size, and refreshes highlights.
   */
  function updateRubberEl() {
    var x = Math.min(_inpRubber.startX, _inpRubber.currentX);
    var y = Math.min(_inpRubber.startY, _inpRubber.currentY);
    var w = Math.abs(_inpRubber.currentX - _inpRubber.startX);
    var h = Math.abs(_inpRubber.currentY - _inpRubber.startY);
    _inpRubber.el.style.left   = x + 'px';
    _inpRubber.el.style.top    = y + 'px';
    _inpRubber.el.style.width  = w + 'px';
    _inpRubber.el.style.height = h + 'px';
    updateRubberHighlights();
  }

  return {
    getNodesInRect:  getNodesInRect,
    createRubberEl:  createRubberEl,
    destroyRubberEl: destroyRubberEl,
    updateRubberEl:  updateRubberEl
  };

})();
