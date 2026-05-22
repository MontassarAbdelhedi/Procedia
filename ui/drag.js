// ui/drag.js
// DEPENDS ON: graph/nodeRegistry.js, graph/engine.js, graph/canvas/viewport.js,
//             graph/canvas/renderer.js, graph/wire/wireRenderer.js
// MUST LOAD BEFORE: index.js

var drag = (function() {

  function init() {
    var items = document.querySelectorAll('.palette-item');
    var i;
    for (i = 0; i < items.length; i++) {
      items[i].addEventListener('dragstart', function(e) {
        var nodeType = e.currentTarget.getAttribute('data-node-type');
        if (!nodeType) return;
        e.dataTransfer.setData('text/plain', nodeType);
        e.dataTransfer.effectAllowed = 'copy';
      });
    }

    var canvasWrap = document.getElementById('canvas-wrap');
    if (!canvasWrap) return;

    canvasWrap.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    canvasWrap.addEventListener('drop', function(e) {
      e.preventDefault();
      var nodeType = e.dataTransfer.getData('text/plain');
      if (!nodeType) return;
      if (!nodeRegistry.getDefinition(nodeType)) {
        console.error('[drag] Unknown node type: ' + nodeType);
        return;
      }
      var wrap     = document.getElementById('canvas-wrap');
      var wrapRect = wrap.getBoundingClientRect();
      var canvasPos = viewport.screenToCanvas(
        e.clientX - wrapRect.left,
        e.clientY - wrapRect.top
      );
      engine.dropNode(nodeType, canvasPos.x, canvasPos.y);
      renderer.render();
      wireRenderer.render();
    });
  }

  return { init: init };

})();
