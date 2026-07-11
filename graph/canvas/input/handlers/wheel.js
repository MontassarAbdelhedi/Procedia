/**
 * @fileoverview Mouse wheel event handler for the graph canvas.
 * Zooms in/out centred on the cursor position.
 * @dependencies graph/canvas/viewport.js
 * @exports _handlersWheel { onWheel }
 */

// graph/canvas/input/handlers/wheel.js
// DEPENDS ON: graph/canvas/viewport.js
// MUST LOAD BEFORE: input/handlers/index.js

var _handlersWheel = (function() {

  function onWheel(e) {
    if (typeof nodePicker !== 'undefined' && nodePicker.isActive && nodePicker.isActive()) return;
    e.preventDefault();
    var delta = e.deltaY > 0 ? 0.9 : 1.1;
    var currentZoom = viewport.getTransform().zoom;
    viewport.setZoom(currentZoom * delta, e.clientX, e.clientY);
    if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
  }

  return {
    onWheel: onWheel
  };

})();
