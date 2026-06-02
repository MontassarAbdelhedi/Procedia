/**
 * @fileoverview Entry point for the minimap module.
 * Initialises the minimap container, bind mouse events, and exposes the public API.
 * @dependencies graph/canvas/minimap/constants.js, graph/canvas/minimap/state.js,
 *               graph/canvas/minimap/utils.js, graph/canvas/minimap/renderer.js,
 *               graph/canvas/minimap/interaction.js
 * @exports minimap { render, init, fitAll }
 */

(function(m) {
  function init() {
    var canvas = document.getElementById('minimap-canvas');
    if (!canvas) { console.warn('[minimap] canvas element not found'); return; }

    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return;

    var btn = document.createElement('button');
    btn.className = 'minimap-fit-btn';
    btn.title = 'Fit all nodes';
    btn.innerHTML = '<i class="ti ti-focus-2"></i>';
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      m.fitAll();
    });

    var container = document.createElement('div');
    container.className = 'minimap-container';
    canvas.parentNode.insertBefore(container, canvas);
    container.appendChild(canvas);
    container.appendChild(btn);

    canvas.addEventListener('mousedown', function(e) {
      m.S.panning = true;
      m.panTo(e);
      e.stopPropagation();
    });
    canvas.addEventListener('mousemove', function(e) {
      if (!m.S.panning) return;
      m.panTo(e);
    });
    document.addEventListener('mouseup', function() { m.S.panning = false; });
  }

  window.minimap = {
    render: m.render,
    init:   init,
    fitAll: m.fitAll
  };
})(window.__minimap);
