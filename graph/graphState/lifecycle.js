// graph/graphState/lifecycle.js
// DEPENDS ON: graph/graphState/store.js, graph/nodes/nodeRegistry.js,
//             data/uuidGenerator.js, graph/Wire/nodeState.js
// MUST LOAD BEFORE: ae/graphHooks.js
// Attaches lifecycle and persistence methods to the graphState object.

// ─── onDrop ───────────────────────────────────────────────────────────────────
// Creates a node from a registry type at world coords (x, y).
// T5.1 expands this with AE lifecycle calls (makeCompAlive, etc.).

graphState.onDrop = function(nodeType, x, y) {
  var def = nodeRegistry.getByType(nodeType);
  if (!def) return null;
  var id     = uuidGenerator.generateNodeId();
  var isComp = (nodeType === 'CompNode' || nodeType === 'core/comp');
  var state  = isComp ? 'alive' : 'ghost';
  // Deep-copy defaultProps so each node gets its own props object
  var props = {};
  if (def.defaultProps) {
    for (var k in def.defaultProps) {
      if (def.defaultProps.hasOwnProperty(k)) props[k] = def.defaultProps[k];
    }
  }
  var hostingComps = isComp ? [id] : [];
  graphState.addNode({
    id:           id,
    type:         nodeType,
    nodeKind:     def.nodeKind || 'affected',
    state:        state,
    dirty:        false,
    x:            x,
    y:            y,
    props:        props,
    hostingComps: hostingComps
  });
  // CompNode: fire AE comp creation (guarded — fails silently until T6.1 JSX is ready)
  if (isComp && typeof callMakeNodeAlive === 'function') {
    callMakeNodeAlive(id);
  }
  return id;
};

// ─── onGhost ──────────────────────────────────────────────────────────────────
// Called by cascadeGhost for each node that has lost its comp path.
// AE parkLayer call is driven by the onNodeStateChange hook in ae/graphHooks.js —
// do NOT call callMakeNodeGhost here to avoid duplicate parkLayer calls.

graphState.onGhost = function(uuid) {
  var n = graphState.nodeMap[uuid];
  if (!n) return;
  graphState.updateNode(uuid, { state: 'ghost', hostingComps: [] });
};

// ─── onAlive ──────────────────────────────────────────────────────────────────
// Called when a node gains a comp path (wire committed, or cascaded).
// Updates state + hostingComps. AE layer creation is guarded until T6.1.

graphState.onAlive = function(uuid) {
  var reachableComps = nodeState.getReachableComps(uuid);
  if (reachableComps.length === 0) return;
  // AE call is driven by the onNodeStateChange hook in ae/graphHooks.js.
  // Do NOT call callMakeNodeAlive here — updateNode fires stateChange which
  // triggers the hook, so a direct call here would create duplicate AE layers.
  graphState.updateNode(uuid, { state: 'alive', hostingComps: reachableComps });
};

// ─── onDelete ─────────────────────────────────────────────────────────────────
// Removes a node and all its wires. Full AE teardown per architecture §3d.

graphState.onDelete = function(uuid) {
  var n = graphState.getNode(uuid);
  if (!n) return;
  var isCompNode = (n.type === 'CompNode' || n.type === 'core/comp');

  // Step 1 — AE teardown before removing from nodeMap.
  if (n.state === 'alive') {
    if (isCompNode) {
      // CompNode has no ghost state — delete the AE comp directly.
      if (typeof callDeleteComp === 'function') {
        callDeleteComp(uuid);
      }
    } else {
      // Non-comp alive: ghost first (parks layer for affected, clears effector state).
      graphState.onGhost(uuid);
    }
  }

  // Step 2 — Permanently delete the parked layer from reserved comp.
  // Only for affected non-comp nodes (now in ghost state after step 1, or was already ghost).
  if (!isCompNode && n.nodeKind === 'affected') {
    if (typeof callDeleteParkedLayer === 'function') {
      callDeleteParkedLayer(uuid);
    }
  }

  // Step 3 — Collect connected peers before wires are gone.
  var connectedNodes = [];
  var toRemove       = [];
  var wires          = graphState.wireMap;
  for (var wid in wires) {
    if (!wires.hasOwnProperty(wid)) continue;
    var w = wires[wid];
    if (w.fromNode === uuid || w.toNode === uuid) {
      toRemove.push(wid);
      var peer = (w.fromNode === uuid) ? w.toNode : w.fromNode;
      if (peer !== uuid) connectedNodes.push(peer);
    }
  }

  // Step 4+5 — Remove wires (fires wireRemoved per wire), remove node,
  // reset selection if needed, rebuild tempGraph, fire change — all batched once.
  graphState._deleteNodeBatch(uuid, toRemove);

  // Step 6 — Re-evaluate connected peers: they may have lost their comp path.
  for (var j = 0; j < connectedNodes.length; j++) {
    var cid = connectedNodes[j];
    if (!graphState.getNode(cid)) continue;
    var newState = nodeState.evaluateNodeState(cid);
    if (graphState.getNode(cid).state !== newState) {
      if (newState === 'ghost') {
        graphState.onGhost(cid);
      } else {
        graphState.updateNode(cid, { state: newState });
      }
    }
  }
};

// ─── flushToPersistence ───────────────────────────────────────────────────────
// Serializes nodeMap + wireMap to AE text layers. Called on panel unload.
// Fire-and-forget — no await, no UI feedback needed.

graphState.flushToPersistence = function() {
  if (typeof callWriteNodeRegistry !== 'function') return;

  // Serialize nodes — strip internal tracking fields (_hostingCompUUID etc.)
  var nodesOut = {};
  for (var uid in graphState.nodeMap) {
    if (!graphState.nodeMap.hasOwnProperty(uid)) continue;
    var n = graphState.nodeMap[uid];
    nodesOut[uid] = {
      type:         n.type,
      nodeKind:     n.nodeKind,
      state:        n.state,
      x:            n.x,
      y:            n.y,
      props:        n.props,
      hostingComps: n.hostingComps,
      label:        n.label || ''
    };
  }
  var nodesJson = JSON.stringify({ version: '2.0', nodes: nodesOut });
  callWriteNodeRegistry(nodesJson);

  // Serialize wires.
  var wiresOut = [];
  for (var wid in graphState.wireMap) {
    if (!graphState.wireMap.hasOwnProperty(wid)) continue;
    var wire = graphState.wireMap[wid];
    wiresOut.push({ id: wid, fromNode: wire.fromNode, fromPort: wire.fromPort, toNode: wire.toNode, toPort: wire.toPort });
  }
  var wiresJson = JSON.stringify({ version: '2.0', wires: wiresOut });
  callWriteWireRegistry(wiresJson);

  // Write comp membership for each alive CompNode.
  for (var cid in graphState.nodeMap) {
    if (!graphState.nodeMap.hasOwnProperty(cid)) continue;
    var cn = graphState.nodeMap[cid];
    if ((cn.type !== 'CompNode' && cn.type !== 'core/comp') || cn.state !== 'alive') continue;
    var members = [];
    for (var wid2 in graphState.wireMap) {
      if (!graphState.wireMap.hasOwnProperty(wid2)) continue;
      var cw = graphState.wireMap[wid2];
      if (cw.toNode === cid) members.push(cw.fromNode);
    }
    callWriteCompMembership(cid, JSON.stringify(members));
  }
};
