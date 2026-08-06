/**
 * @fileoverview Infinite-zoom dot grid system for the graph canvas.
 * Manages multi-level grid layers with per-level opacity based on zoom.
 * Provides snap-to-grid helper and SNAP_SIZE constant.
 * @dependencies (none)
 * @exports __vp_grid { initGrids, applyGridTransform, snapToGrid, SNAP_SIZE }
 */

// graph/canvas/viewport/grid.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: viewport.js

var __vp_grid = (function() {

  var GRID_LEVELS = [
    { base: 24,  radius: 1,   color: '34,34,32' },
    { base: 72,  radius: 1.5, color: '48,48,44' },
    { base: 216, radius: 2,   color: '62,62,55' }
  ];

  var SNAP_SIZE = GRID_LEVELS[0].base;

  var _gridLayers = [];

  function _clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function _gridOpacity(base, zoom) {
    var spacing = base * zoom;
    if (spacing < 4) return 0;
    if (spacing < 14) return (spacing - 4) / 10;
    if (spacing < 40) return 1;
    if (spacing < 120) return (120 - spacing) / 80;
    return 0;
  }

  function snapToGrid(value) {
    return Math.round(value / SNAP_SIZE) * SNAP_SIZE;
  }

  function initGrids() {
    var container = document.getElementById('canvas-grid');
    if (!container) return;
    if (_gridLayers.length > 0) return;
    for (var i = 0; i < GRID_LEVELS.length; i++) {
      var level = GRID_LEVELS[i];
      var el = document.createElement('div');
      el.className = 'grid-layer';
      el.style.backgroundImage =
        'radial-gradient(circle, rgba(' + level.color + ',1) ' + level.radius + 'px, transparent ' + level.radius + 'px)';
      container.appendChild(el);
      _gridLayers.push({ el: el, base: level.base });
    }
  }

  /**
   * Updates all grid layers with per-level opacity, size, and position.
   * @param {number} panX
   * @param {number} panY
   * @param {number} zoom
   */
  function applyGridTransform(panX, panY, zoom) {
    for (var i = 0; i < _gridLayers.length; i++) {
      var layer = _gridLayers[i];
      var size = layer.base * zoom;
      var ox = ((panX % size) + size) % size;
      var oy = ((panY % size) + size) % size;
      layer.el.style.opacity = _gridOpacity(layer.base, zoom);
      layer.el.style.backgroundSize = size + 'px ' + size + 'px';
      layer.el.style.backgroundPosition = ox + 'px ' + oy + 'px';
    }
  }

  return {
    initGrids:          initGrids,
    applyGridTransform: applyGridTransform,
    snapToGrid:         snapToGrid,
    SNAP_SIZE:          SNAP_SIZE
  };
})();
