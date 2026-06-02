/**
 * @fileoverview Assembles the inputHandlers global from handler sub-modules.
 * Re-exports all event handler functions as a single object consumed by input/index.js.
 * @dependencies input/state.js, input/utils.js, input/rubberband.js,
 *               input/handlers/titleEdit.js, input/handlers/mouse.js,
 *               input/handlers/keyboard.js, input/handlers/wheel.js
 * @exports inputHandlers { onMouseDown, onMouseMove, onMouseUp, onClick,
 *                          onDblClick, onWheel, onKeyDown, onKeyUp }
 */

// graph/canvas/input/handlers/index.js
// DEPENDS ON: input/state.js, input/utils.js, input/rubberband.js,
//             input/handlers/titleEdit.js, input/handlers/mouse.js,
//             input/handlers/keyboard.js, input/handlers/wheel.js,
//             graph/graphState.js, graph/engine/index.js,
//             graph/canvas/viewport.js, graph/canvas/renderer/index.js
// MUST LOAD BEFORE: input/index.js

var inputHandlers = (function() {

  return {
    onMouseDown: _handlersMouse.onMouseDown,
    onMouseMove: _handlersMouse.onMouseMove,
    onMouseUp:   _handlersMouse.onMouseUp,
    onClick:     _handlersMouse.onClick,
    onDblClick:  _handlersTitleEdit.onDblClick,
    onWheel:     _handlersWheel.onWheel,
    onKeyDown:   _handlersKeyboard.onKeyDown,
    onKeyUp:     _handlersKeyboard.onKeyUp
  };

})();
