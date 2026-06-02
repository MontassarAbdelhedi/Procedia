/**
 * @fileoverview Utility functions for canvas input handling.
 * Provides offset calculations, coordinate conversion, and editable-target detection.
 * @dependencies (none)
 * @exports inputUtils { wrapOffset, clientToWrap, isEditableTarget }
 */

// graph/canvas/input/utils.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: input/rubberband.js,
//                   input/handlers/titleEdit.js, input/handlers/mouse.js,
//                   input/handlers/keyboard.js, input/handlers/wheel.js,
//                   input/handlers/index.js, input/index.js

var inputUtils = (function() {

  /**
   * Returns the canvas-wrap element's bounding rect offset.
   * @returns {{ left: number, top: number }}
   */
  function wrapOffset() {
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return { left: 0, top: 0 };
    var r = wrap.getBoundingClientRect();
    return { left: r.left, top: r.top };
  }

  /**
   * Converts client-space coordinates to wrap-relative coordinates.
   * @param {number} clientX
   * @param {number} clientY
   * @returns {{ x: number, y: number }}
   */
  function clientToWrap(clientX, clientY) {
    var off = wrapOffset();
    return { x: clientX - off.left, y: clientY - off.top };
  }

  /**
   * Checks whether a DOM target is an editable element (input, textarea, contenteditable).
   * @param {EventTarget} target
   * @returns {boolean}
   */
  function isEditableTarget(target) {
    if (!target || !target.tagName) return false;
    var tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
  }

  return {
    wrapOffset:      wrapOffset,
    clientToWrap:    clientToWrap,
    isEditableTarget: isEditableTarget
  };

})();
