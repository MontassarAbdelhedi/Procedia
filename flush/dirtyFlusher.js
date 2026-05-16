// flush/dirtyFlusher.js
// DEPENDS ON: graph/graphState.js, ae/nodeOps.js
// MUST LOAD BEFORE: index.js

var dirtyFlusher = (function() {

  var debounceTimer = null;
  var isWriting     = false;
  var DEBOUNCE_MS   = 300;

  // ─── flushDirtyNodes ────────────────────────────────────────────────────────
  // Collects all dirty alive nodes, fires callUpdateNodeProperty for each prop,
  // then clears dirty flags. Ghost and error nodes are skipped.

  function flushDirtyNodes() {
    if (isWriting) return;

    var nodes = graphState.getAllNodes();
    var toFlush = [];
    for (var uid in nodes) {
      if (!nodes.hasOwnProperty(uid)) continue;
      var n = nodes[uid];
      if (!n.dirty) continue;
      if (n.state !== 'alive') continue;
      if (n.type === 'CompNode' || n.type === 'core/comp') continue;
      toFlush.push(n);
    }

    if (toFlush.length === 0) return;

    isWriting = true;

    for (var i = 0; i < toFlush.length; i++) {
      var node = toFlush[i];
      var hostingCompUUID = node.hostingComps && node.hostingComps.length > 0
        ? node.hostingComps[0]
        : (node._hostingCompUUID || null);

      if (!hostingCompUUID) {
        graphState.updateNode(node.id, { dirty: false });
        continue;
      }

      var def = nodeRegistry.getByType(node.type);
      var matchNames = (def && def.propMatchNames) ? def.propMatchNames : {};
      var props = node.props || {};

      for (var key in props) {
        if (!props.hasOwnProperty(key)) continue;
        var matchName = matchNames[key];
        if (!matchName) continue;
        callUpdateNodeProperty(node.id, hostingCompUUID, matchName, props[key]);
      }

      graphState.updateNode(node.id, { dirty: false });
    }

    isWriting = false;
  }

  // ─── markDirty ──────────────────────────────────────────────────────────────
  // Marks a node dirty and resets the debounce timer.

  function markDirty(uuid) {
    graphState.updateNode(uuid, { dirty: true });
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      debounceTimer = null;
      flushDirtyNodes();
    }, DEBOUNCE_MS);
  }

  // ─── flushNow ───────────────────────────────────────────────────────────────
  // Bypasses debounce — used by structural events (layer order, parenting).

  function flushNow() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    flushDirtyNodes();
  }

  return {
    markDirty:       markDirty,
    flushNow:        flushNow,
    flushDirtyNodes: flushDirtyNodes,
    get isWriting()  { return isWriting; }
  };

}());
