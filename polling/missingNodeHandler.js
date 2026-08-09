/**
 * Handles a single missing node: validates it, marks it as errored,
 * and pushes a notification. Extracted from polling/poller.js.
 * Depends on: graph/graphState.js, polling/notifications.js
 * Exports: pollerMissingHandler object with handleMissingNode
 */
// polling/missingNodeHandler.js
// DEPENDS ON: graph/graphState.js, polling/notifications.js
// MUST LOAD BEFORE: polling/poller.js

var pollerMissingHandler = (function() {

  function handleMissingNode(uuid) {
    var nd = graphState.getNode(uuid);
    if (!nd || nd.state !== 'alive') return false;

    // Skip effectors whose main_input was cascaded away — the effect was
    // intentionally removed as part of a ghost operation, not by the user.
    if (nd.nodeKind === 'effector') {
      var allWires = graphState.getAllWires();
      var hasMainInput = false;
      for (var wireId in allWires) {
        if (!allWires.hasOwnProperty(wireId)) continue;
        var wire = allWires[wireId];
        if (wire.toNode === uuid && wire.toPort === 'main_input') {
          hasMainInput = true;
          break;
        }
      }
      if (!hasMainInput) return false;
    }

    graphState.updateNode(uuid, { state: 'error' });
    pollerNotifier.pushMissingNotification(uuid);
    return true;
  }

  return {
    handleMissingNode: handleMissingNode
  };

})();
