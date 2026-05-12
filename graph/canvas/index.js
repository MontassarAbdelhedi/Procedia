// index.js — assembly: initialises all canvas modules, exposes the canvas global
// deps: canvasViewport, canvasRenderer, canvasInput, graphState

var canvas = (function() {

  function init() {
    canvasViewport.init(function onResize() {
      canvasRenderer.render(null);
    });

    canvasInput.init();

    graphState.onChange(function() {
      canvasRenderer.render(null);
    });
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
    }
  };

}());
