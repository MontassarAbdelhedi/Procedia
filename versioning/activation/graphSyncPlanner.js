/**
 * Graph sync planner — compares source and target snapshots and produces
 * an ordered plan of AE operations. Pure JS — never touches AE or graphState.
 * @module vcGraphSyncPlanner
 * @dependencies none
 */
// versioning/activation/graphSyncPlanner.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: versioning/activation/activationCoordinator.js

var vcGraphSyncPlanner = (function() {

  /**
   * Produces a minimal-delta plan to synchronize AE from source → target.
   * @param {Object} sourceSnapshot — current active graph snapshot
   * @param {Object} targetSnapshot — target graph snapshot to transition to
   * @returns {{phases: Array<{name, operations: Array<{op, entityType, entityId, data}>}>}}
   */
  function plan(sourceSnapshot, targetSnapshot) {
    if (!sourceSnapshot || !targetSnapshot) {
      return { phases: [], sourceSnapshotId: null, targetSnapshotId: null };
    }

    var srcNodes = sourceSnapshot.graph.nodes || {};
    var tgtNodes = targetSnapshot.graph.nodes || {};
    var srcWires = sourceSnapshot.graph.wires || {};
    var tgtWires = targetSnapshot.graph.wires || {};

    var planResult = {
      sourceSnapshotId: sourceSnapshot.id,
      targetSnapshotId: targetSnapshot.id,
      phases: []
    };

    // Phase 1: Archive outgoing nodes (those in source but not in target)
    var outgoingNodes = [];
    for (var nid in srcNodes) {
      if (srcNodes.hasOwnProperty(nid) && !tgtNodes.hasOwnProperty(nid)) {
        outgoingNodes.push({ entityType: 'node', entityId: nid, data: srcNodes[nid] });
      }
    }
    if (outgoingNodes.length > 0) {
      planResult.phases.push({ name: 'archive', operations: outgoingNodes });
    }

    // Phase 2: Update persisted nodes (present in both, with changes)
    var updateOps = [];
    var unchangedNodes = [];
    for (var nid2 in tgtNodes) {
      if (!tgtNodes.hasOwnProperty(nid2)) continue;
      if (srcNodes.hasOwnProperty(nid2)) {
        if (JSON.stringify(srcNodes[nid2]) !== JSON.stringify(tgtNodes[nid2])) {
          updateOps.push({ entityType: 'node', entityId: nid2, data: tgtNodes[nid2], op: 'update' });
        } else {
          unchangedNodes.push({ entityType: 'node', entityId: nid2, data: tgtNodes[nid2], op: 'preserve' });
        }
      }
    }
    if (updateOps.length > 0) {
      planResult.phases.push({ name: 'update', operations: updateOps });
    }
    if (unchangedNodes.length > 0) {
      planResult.phases.push({ name: 'preserve', operations: unchangedNodes });
    }

    // Phase 3: Materialize incoming nodes (in target but not in source)
    var incomingNodes = [];
    for (var nid3 in tgtNodes) {
      if (tgtNodes.hasOwnProperty(nid3) && !srcNodes.hasOwnProperty(nid3)) {
        incomingNodes.push({ entityType: 'node', entityId: nid3, data: tgtNodes[nid3], op: 'materialize' });
      }
    }
    if (incomingNodes.length > 0) {
      planResult.phases.push({ name: 'materialize', operations: incomingNodes });
    }

    // Phase 4: Wire changes (added/removed wires)
    var wireOps = [];
    // Removed wires
    for (var wid in srcWires) {
      if (srcWires.hasOwnProperty(wid) && !tgtWires.hasOwnProperty(wid)) {
        wireOps.push({ entityType: 'wire', entityId: wid, data: srcWires[wid], op: 'remove' });
      }
    }
    // Added wires
    for (var wid2 in tgtWires) {
      if (tgtWires.hasOwnProperty(wid2) && !srcWires.hasOwnProperty(wid2)) {
        wireOps.push({ entityType: 'wire', entityId: wid2, data: tgtWires[wid2], op: 'add' });
      }
    }
    // Changed wires
    for (var wid3 in tgtWires) {
      if (tgtWires.hasOwnProperty(wid3) && srcWires.hasOwnProperty(wid3)) {
        if (JSON.stringify(srcWires[wid3]) !== JSON.stringify(tgtWires[wid3])) {
          wireOps.push({ entityType: 'wire', entityId: wid3, data: tgtWires[wid3], op: 'update' });
        }
      }
    }
    if (wireOps.length > 0) {
      planResult.phases.push({ name: 'wires', operations: wireOps });
    }

    return planResult;
  }

  /**
   * Returns a human-readable summary of the plan.
   */
  function summarize(planResult) {
    if (!planResult || !planResult.phases) return 'Empty plan';
    var counts = {};
    for (var pi = 0; pi < planResult.phases.length; pi++) {
      var phase = planResult.phases[pi];
      if (!counts[phase.name]) counts[phase.name] = 0;
      counts[phase.name] += phase.operations.length;
    }
    var parts = [];
    for (var key in counts) {
      if (counts.hasOwnProperty(key)) {
        parts.push(counts[key] + ' ' + key);
      }
    }
    return parts.join(', ') || 'No changes';
  }

  return {
    plan: plan,
    summarize: summarize
  };

})();
