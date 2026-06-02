/**
 * @fileoverview Shared mutable state for the minimap module.
 * @dependencies graph/canvas/minimap/constants.js
 */

(function(m) {
  m.S = {
    lastFrame: null,
    panning:   false
  };
})(window.__minimap = window.__minimap || {});
