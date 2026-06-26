/**
 * @fileoverview Entry point for canvas input.
 * Binds event listeners to the canvas-wrap and document, delegating to inputHandlers.
 * @dependencies input/state.js, input/utils.js, input/rubberband.js,
 *               input/handlers/index.js
 * @exports canvasInput { init }
 */

// graph/canvas/input/index.js
// DEPENDS ON: input/state.js, input/utils.js, input/rubberband.js,
//             input/handlers/titleEdit/helpers.js, input/handlers/titleEdit/exit.js,
//             input/handlers/titleEdit/commit.js, input/handlers/titleEdit/cancel.js,
//             input/handlers/titleEdit/dblclick.js,
//             input/handlers/mouse/mousedown.js,
//             input/handlers/mouse/mouseup.js, input/handlers/mouse/click.js,
//             input/handlers/keyboard.js, input/handlers/wheel.js,
//             input/handlers/index.js
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
    wrap.addEventListener('click',     inputHandlers.onClick);
    wrap.addEventListener('dblclick',  inputHandlers.onDblClick);
    wrap.addEventListener('wheel',     inputHandlers.onWheel, { passive: false });

    wrap.addEventListener('mouseleave', function() {
      if (_hoveredWireId !== null) {
        _hoveredWireId = null;
        if (typeof wireRenderer !== 'undefined' && wireRenderer._updateInsertBtn) {
          wireRenderer._updateInsertBtn();
        }
      }
    });

    document.addEventListener('keydown', inputHandlers.onKeyDown);
    document.addEventListener('keyup',   inputHandlers.onKeyUp);
  }

  return { init: init };

})();
