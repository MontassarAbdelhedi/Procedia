// ui/keyboard.js
// DEPENDS ON: graph/graphState/lifecycle.js, graph/Wire/wire.js, graph/canvas/index.js
// MUST LOAD BEFORE: index.js

function initKeyboard() {
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Wire selected — delete wire and cascade
    var selWire = canvas.getSelectedWire();
    if (selWire) {
      wire.deleteWire(selWire);
      canvas.clearWireSelection();
      return;
    }

    // Node(s) selected — full node delete (AE teardown added in T5.4)
    if (graphState.selectedNodeIds.size > 0) {
      var idsToDelete = [];
      graphState.selectedNodeIds.forEach(function(id) { idsToDelete.push(id); });
      graphState.clearSelection();
      for (var i = 0; i < idsToDelete.length; i++) {
        graphState.onDelete(idsToDelete[i]);
      }
    }
  });
}
