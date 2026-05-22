// ui/keyboard.js
// DEPENDS ON: graph/graphState.js, graph/engine.js, graph/canvas/renderer.js,
//             graph/wire/wireRenderer.js, graph/wire/wire.js, ui/inspector.js
// MUST LOAD BEFORE: index.js

var keyboard = (function() {

  function _handleDelete(e) {
    // If a wire is selected, wire.js handles the deletion — do nothing here
    if (wireInteraction.getSelectedWire() !== null) return;

    var selectedId = graphState.getSelection();
    if (!selectedId) return;

    var active   = document.activeElement;
    var isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
    if (isTyping) return;

    engine.deleteNode(selectedId);
    renderer.render();
    wireRenderer.render();
    inspector.updateInspector();
  }

  function _handleEscape() {
    graphState.setSelection(null);
    renderer.render();
    inspector.updateInspector();
  }

  function _onKeyDown(e) {
    if (e.key === 'Delete' || e.key === 'Backspace') { _handleDelete(e); }
    if (e.key === 'Escape')                           { _handleEscape(); }
  }

  function init() {
    document.addEventListener('keydown', _onKeyDown);
  }

  return { init: init };

})();
