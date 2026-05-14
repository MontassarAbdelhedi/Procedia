// ─── Keyboard: delete selected node ──────────────────────────────────────────

function initKeyboard() {
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    // Don't fire when user is typing in a text input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    var uuid = graphState.getSelection();
    if (!uuid) return;

    var n = graphState.getNode(uuid);
    if (n && n.state === 'alive') {
      if (n.type === 'core/comp') {
        // Collect nodes feeding into this comp before removeNode strips the wires.
        // removeNode deletes wires silently (no onWireRemoved), so we snapshot now.
        var feedingNodes = [];
        var allWires = graphState.getAllWires();
        for (var wid in allWires) {
          if (allWires.hasOwnProperty(wid) && allWires[wid].toNode === uuid) {
            feedingNodes.push(allWires[wid].fromNode);
          }
        }

        callDeleteComp(uuid);
        graphState.removeNode(uuid);
        notificationBar.dismiss(uuid);

        // Re-evaluate feeding nodes — they lose their downstream comp and go ghost.
        for (var fi = 0; fi < feedingNodes.length; fi++) {
          if (graphState.getNode(feedingNodes[fi])) {
            nodeState.evaluateNodeState(feedingNodes[fi]);
          }
        }
      } else {
        // Non-comp: delete the AE layer before removing from graphState so
        // callMakeNodeGhost can still read _hostingCompUUID synchronously.
        callMakeNodeGhost(uuid);
        graphState.removeNode(uuid);
        notificationBar.dismiss(uuid);
      }
    } else {
      graphState.removeNode(uuid);
      notificationBar.dismiss(uuid);
    }
  });
}
