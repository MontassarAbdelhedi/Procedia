/**
 * graph/import/builder.js
 *
 * Orchestrator for the AE project import. Processes the structured AE data
 * returned by the ExtendScript scanner, builds matching Procedia nodes and
 * wires, stamps UUIDs on AE objects, and loads the result into graph state.
 *
 * Dependencies: graphState, graph/import/mapNodes/helpers.js,
 *               graph/import/mapNodes/buildItems.js, graph/import/mapNodes/buildEffects.js,
 *               graph/import/mapWires.js,
 *               graph/import/stampUUIDs.js, evalBridge
 *
 * Exports: importProject
 */

var __imp_builder = (function() {

  var nodes = __imp_nodes;
  var wires = __imp_wires;
  var stamp = __imp_stamp;

  /**
   * Imports a full AE project structure into the Procedia graph.
   * Merges into the existing graph state (no clearing).
   *
   * @param {Object} aeData - Project structure from actionImport/handler.jsx
   *        { comps: [...], footage: [...] }
   * @returns {Promise<Object>} Resolves with summary { comps, layers, effects, footage }
   */
  function importProject(aeData) {
    var summary = {
      comps:   0,
      layers:  0,
      effects: 0,
      footage: 0,
      unknowns: 0,
      errors:  []
    };

    if (!aeData || (!aeData.comps && !aeData.footage)) {
      return Promise.resolve(summary);
    }

    var nodeMap = {};
    var wireMap = {};
    var allAliveUUIDs = [];
    var layerUUIDToNodeID = {};
    var allRestamps = [];
    var footageLayerIds = {};

    var posIndex = 0;

    // 1. Process footage items
    if (aeData.footage) {
      for (var fi = 0; fi < aeData.footage.length; fi++) {
        try {
          var fNode = nodes.buildFootageNode(aeData.footage[fi], posIndex++);
          nodeMap[fNode.id] = fNode;
          summary.footage++;
          footageLayerIds[fNode.id] = true;
        } catch (e) {
          summary.errors.push('footage[' + fi + ']: ' + e.message);
        }
      }
    }

    // 2. Process comps — two passes so precomp layers can reference any comp
    if (aeData.comps) {
      // Pass 1: Create all CompNodes first
      var compMetaList = [];
      for (var ci = 0; ci < aeData.comps.length; ci++) {
        var compData = aeData.comps[ci];
        try {
          var compNode = nodes.buildCompNode(compData, posIndex++);
          nodeMap[compNode.id] = compNode;
          allAliveUUIDs.push(compNode.id);
          summary.comps++;
          compMetaList.push({ compData: compData, compNode: compNode });
        } catch (e) {
          summary.errors.push('comp ' + ci + ': ' + e.message);
        }
      }

      // Pass 2: Process layers and build wires (all comp nodes now exist)
      for (var ci = 0; ci < compMetaList.length; ci++) {
        var compData = compMetaList[ci].compData;
        var compNode = compMetaList[ci].compNode;
        try {

          var layerNodes = [];
          var effectMap = {};
          var blendingMap = {};
          var matteMap = {};
          var effectCount = 0;

          // 3. Process layers bottom-to-top (AE index ascending)
          var layers = compData.layers || [];
          for (var li = 0; li < layers.length; li++) {
            var layerData = layers[li];

            if (layerData.type === 'light' || layerData.type === 'unknown') {
              continue;
            }

            var layerNode;
            var isFootageLayer = (layerData.type === 'solid' || layerData.type === 'footage');
            if (layerData.type === 'precomp') {
              var refCompId = layerData.source && layerData.source.ref;
              if (!refCompId || !nodeMap[refCompId]) {
                summary.errors.push('Precomp layer "' + layerData.name + '" skipped — source comp not found');
                continue;
              }
              layerNode = nodeMap[refCompId];
            } else if (isFootageLayer) {
              var refFootageId = layerData.source && layerData.source.ref;
              if (refFootageId && nodeMap[refFootageId]) {
                layerNode = nodeMap[refFootageId];
              } else {
                if (!nodes.aeTypeToNodeType(layerData.type)) {
                  summary.errors.push('Unsupported layer type "' + layerData.type + '" for "' + layerData.name + '"');
                  continue;
                }
              }
            } else {
              if (!nodes.aeTypeToNodeType(layerData.type)) {
                summary.errors.push('Unsupported layer type "' + layerData.type + '" for "' + layerData.name + '"');
                continue;
              }
            }

            try {
              if (layerData.type !== 'precomp' && !(isFootageLayer && layerNode)) {
                layerNode = nodes.buildLayerNode(layerData, compData.uuid, posIndex++);
                if (!layerNode) continue;
                nodeMap[layerNode.id] = layerNode;
              }
              layerNodes.push({ node: layerNode, layerData: layerData });
              layerUUIDToNodeID[layerData.uuid] = layerNode.id;
              summary.layers++;

              // Effects on this layer
              var effectNodes = [];
              if (layerData.effects) {
                for (var ei = 0; ei < layerData.effects.length; ei++) {
                  try {
                    var effNode = nodes.buildEffectNode(layerData.effects[ei], posIndex++);
                    nodeMap[effNode.id] = effNode;
                    effectNodes.push(effNode);
                    effectCount++;
                    if (effNode.type === 'effects/unknown') {
                      summary.unknowns++;
                    }
                  } catch (e) {
                    summary.errors.push('effect ' + ei + ' on "' + layerData.name + '": ' + e.message);
                  }
                }
              }
              effectMap[layerData.uuid] = effectNodes;

               // Blending mode — normalise in case AE enum prefix / whitespace survives
               var bm = layerData.blendingMode;
               if (bm && typeof bm === 'string') {
                 bm = bm.replace(/^\s+|\s+$/g, '');
                 var dotIdx = bm.lastIndexOf('.');
                 if (dotIdx !== -1) bm = bm.substr(dotIdx + 1);
                 if (bm.toUpperCase() === 'NORMAL') bm = 'NORMAL';
               }
               if (bm && bm !== 'NORMAL') {
                 var blendNode = nodes.buildBlendingNode(bm, posIndex++);
                 nodeMap[blendNode.id] = blendNode;
                 blendingMap[layerData.uuid] = blendNode;
               }

              // Track matte
              if (layerData.hasTrackMatte && layerData.trackMatteLayerUUID) {
                var inverted = layerData.trackMatteType === 'LUMA_INVERTED' || layerData.trackMatteType === 'ALPHA_INVERTED';
                var matteNode = nodes.buildMatteNode(layerData.trackMatteType, inverted, posIndex++);
                nodeMap[matteNode.id] = matteNode;
                matteMap[layerData.uuid] = {
                  matteNode: matteNode,
                  matteLayerUUID: layerData.trackMatteLayerUUID
                };
              }

            } catch (e) {
              summary.errors.push('layer "' + layerData.name + '": ' + e.message);
            }
          }

          summary.effects += effectCount;

          // 4. Build wires for this comp
          var compResult = wires.buildCompWires(compData, compNode, layerNodes, effectMap, blendingMap, matteMap, layerUUIDToNodeID);
          var compWires = compResult.wires;
          for (var wi = 0; wi < compWires.length; wi++) {
            wireMap[compWires[wi].id] = compWires[wi];
          }
          for (var ri = 0; ri < compResult.restamps.length; ri++) {
            allRestamps.push(compResult.restamps[ri]);
          }

          // 5. Build parent wires for this comp's layers
          var parentWires = wires.buildParentWires(layerNodes, layerUUIDToNodeID);
          for (var pwi = 0; pwi < parentWires.length; pwi++) {
            wireMap[parentWires[pwi].id] = parentWires[pwi];
          }

        } catch (e) {
          summary.errors.push('comp ' + ci + ' "' + (compData.name || '') + '": ' + e.message);
        }
      }
    }

    // 6. Set hosting comps on all alive nodes
    // Phase 1: mark comp nodes and directly connect their upstream layers
    var comps = {};
    for (var _nid in nodeMap) {
      if (!nodeMap.hasOwnProperty(_nid)) continue;
      if (nodeMap[_nid].type === 'core/comp') {
        nodeMap[_nid].state = 'alive';
        comps[_nid] = true;
      }
    }
    var queue = [];
    var queued = {};
    for (var _wid in wireMap) {
      if (!wireMap.hasOwnProperty(_wid)) continue;
      var _wd = wireMap[_wid];
      if (_wd.type !== 'layer' || _wd._pathLayerUUID === null) continue;
      var _compId = _wd.toNode;
      if (!comps[_compId]) continue;
      var _fromId = _wd.fromNode;
      var _fromNd = nodeMap[_fromId];
      if (!_fromNd) continue;
      if (_fromNd.hostingComps.indexOf(_compId) === -1) {
        _fromNd.hostingComps.push(_compId);
      }
      if (_fromNd.state === 'ghost') _fromNd.state = 'alive';
      if (!queued[_fromId]) { queued[_fromId] = true; queue.push(_fromId); }
    }
    // Phase 2: BFS upstream through layer wire chains
    while (queue.length > 0) {
      var _nodeId = queue.shift();
      var _nodeData = nodeMap[_nodeId];
      if (!_nodeData || !_nodeData.hostingComps || _nodeData.hostingComps.length === 0) continue;
      for (var _w2id in wireMap) {
        if (!wireMap.hasOwnProperty(_w2id)) continue;
        var _w2 = wireMap[_w2id];
        if (_w2.type !== 'layer') continue;
        if (_w2.toNode !== _nodeId) continue;
        var _upId = _w2.fromNode;
        if (_upId === _nodeId) continue;
        var _upNd = nodeMap[_upId];
        if (!_upNd) continue;
        var _changed = false;
        for (var _hi = 0; _hi < _nodeData.hostingComps.length; _hi++) {
          var _hc = _nodeData.hostingComps[_hi];
          if (_upNd.hostingComps.indexOf(_hc) === -1) {
            _upNd.hostingComps.push(_hc);
            _changed = true;
          }
        }
        if (_upNd.state === 'ghost') _upNd.state = 'alive';
        if (_changed && !queued[_upId]) { queued[_upId] = true; queue.push(_upId); }
      }
    }

    // 7. Merge into graph state
    var existingNodes = graphState.getAllNodes();
    var mergeCount = 0;
    for (nid in nodeMap) {
      if (!nodeMap.hasOwnProperty(nid)) continue;
      if (!existingNodes.hasOwnProperty(nid)) {
        graphState.addNode(nodeMap[nid]);
        mergeCount++;
      }
    }

    var existingWires = graphState.getAllWires();
    var wireMergeCount = 0;
    for (wid in wireMap) {
      if (!wireMap.hasOwnProperty(wid)) continue;
      if (!existingWires.hasOwnProperty(wid)) {
        graphState.addWire(wireMap[wid]);
        wireMergeCount++;
      }
    }

    summary.merged = {
      nodes: mergeCount,
      wires: wireMergeCount
    };

    // 8. Restamp AE layer comments from node UUIDs → terminal wire UUIDs
    if (allRestamps.length > 0 && typeof evalBridge !== 'undefined' && evalBridge.dispatchBatch) {
      var restampCmds = [];
      for (var rsi = 0; rsi < allRestamps.length; rsi++) {
        var rs = allRestamps[rsi];
        restampCmds.push({
          action: 'restampLayer',
          params: {
            hostingCompUUID: rs.compUUID,
            oldUUID:         rs.oldUUID,
            newUUID:         rs.newUUID
          }
        });
      }
      return evalBridge.dispatchBatch(restampCmds).then(function() {
        return summary;
      }).catch(function(err) {
        console.warn('[Procedia] import restamp error:', err);
        return summary;
      });
    }

    return Promise.resolve(summary);
  }

  return {
    importProject: importProject
  };

})();
