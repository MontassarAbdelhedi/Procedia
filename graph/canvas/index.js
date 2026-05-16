// graph/canvas/index.js
// DEPENDS ON: graph/canvas/viewport.js, graph/canvas/renderer.js, graph/canvas/input.js
// MUST LOAD BEFORE: index.js

var canvas = (function() {

  function init() {
    canvasViewport.init(function onResize() {
      canvasRenderer.render(null);
    });

    canvasInput.init();
    canvasRenderer.startRenderLoop();
  }

  return {
    init: init,

    render: function() {
      canvasRenderer.render(null);
    },

    screenToWorld: function(sx, sy) {
      return canvasViewport.screenToWorld(sx, sy);
    },

    worldToScreen: function(wx, wy) {
      return canvasViewport.worldToScreen(wx, wy);
    },

    getTransform: function() {
      return canvasViewport.getTransform();
    },

    getDimensions: function() {
      return canvasViewport.getDimensions();
    },

    setTransformOffset: function(x, y) {
      canvasViewport.setTransformOffset(x, y);
      canvasRenderer.render(null);
    },

    onAfterRender: function(fn) {
      canvasRenderer.onAfterRender(fn);
    },

    setWireDrag: function(active) {
      canvasInput.setWireDrag(active);
    },

    getHoveredPort: function() {
      return canvasInput.getHoveredPort();
    },

    getSelectedWire: function() {
      return canvasInput.getSelectedWire();
    },

    clearWireSelection: function() {
      canvasInput.clearWireSelection();
    }
  };

}());
