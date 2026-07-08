/**
 * @fileoverview Settings modal settings application. Applies current settings
 * to minimap visibility and triggers wire / tip-field re-rendering.
 * Depends on: settings, wireRenderer, tipField (globals).
 * Exports: __sm_apply.apply
 */
// ui/settingsModal/apply.js
// MUST LOAD BEFORE: ui/settingsModal/index.js

var __sm_apply = (function() {

  /**
   * Applies current settings to the UI.
   */
  function apply() {
    var prefs = settings.getAll();

    var minimapCanvas = document.getElementById('minimap-canvas');
    if (minimapCanvas) {
      minimapCanvas.style.display = prefs.minimap ? '' : 'none';
    }
    var minimapContainer = document.querySelector('.minimap-container');
    if (minimapContainer) {
      minimapContainer.style.display = prefs.minimap ? '' : 'none';
    }

    var nodesLayer = document.getElementById('canvas-nodes');
    if (nodesLayer) {
      if (prefs.showPortLabels === false) {
        nodesLayer.classList.add('port-labels-off');
      } else {
        nodesLayer.classList.remove('port-labels-off');
      }
    }

    if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
    if (typeof tipField !== 'undefined' && tipField.reposition) tipField.reposition();
  }

  return { apply: apply };

})();
