/**
 * @fileoverview Entry point for canvas input.
 * Binds event listeners to the canvas-wrap and document, delegating to inputHandlers.
 * @dependencies input/state.js, input/utils.js, input/rubberband.js, input/handlers.js
 * @exports canvasInput { init }
 */

// graph/canvas/input/index.js
// DEPENDS ON: input/state.js, input/utils.js, input/rubberband.js, input/handlers.js
// MUST LOAD BEFORE: index.js

var canvasInput = (function() {

  /**
   * Binds mouse and keyboard event listeners to the canvas wrap and document.
   */
  function init() {
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return;

    wrap.addEventListener('mousedown', inputHandlers.onMouseDown);
    wrap.addEventListener('mousemove', inputHandlers.onMouseMove);
    wrap.addEventListener('mouseup',   inputHandlers.onMouseUp);
    wrap.addEventListener('wheel',     inputHandlers.onWheel, { passive: false });

    document.addEventListener('keydown', inputHandlers.onKeyDown);
    document.addEventListener('keyup',   inputHandlers.onKeyUp);
  }

  return { init: init };

})();
