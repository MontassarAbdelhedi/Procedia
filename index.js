// index.js
// DEPENDS ON: everything
// MUST LOAD BEFORE: nothing
// Entry point. Initializes: evalBridge → canvas → ui → initial render

(function init() {

  // 1-2. graphState and nodeRegistry are self-initializing
  console.log('[Procedia] registered nodes:', nodeRegistry.listTypes());

  // 4. Viewport
  viewport.reset();

  // 7. Canvas input
  canvasInput.init();

  // 8. Wire interaction
  wireInteraction.init();

  // 9. Node list (palette search)
  nodeList.init();

  // 10. Drag from palette
  drag.init();

  // 12. Keyboard shortcuts
  keyboard.init();

  // 13. Consolidated selection change callback
  // inspector.init() does not register this — it is consolidated here
  graphState.onSelectionChange(function(uuid) {
    renderer.render();
    wireRenderer.render();
    inspector.renderInspector(uuid);
  });

  // 15. Ready
  console.log('[Procedia] Panel initialized.');

  // 16. Initial render
  renderer.render();
  wireRenderer.render();

})();
