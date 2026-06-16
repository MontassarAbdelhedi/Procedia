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

    var posIndex = 0;

    // 1. Process footage items
    if (aeData.footage) {
      for (var fi = 0; fi < aeData.footage.length; fi++) {
        try {
          var fNode = nodes.buildFootageNode(aeData.footage[fi], posIndex++);
          nodeMap[fNode.id] = fNode;
          summary.footage++;
        } catch (e) {
          summary.errors.push('footage[' + fi + ']: ' + e.message);
        }
      }
    }

    // 2. Process comps
    if (aeData.comps) {
      for (var ci = 0; ci < aeData.comps.length; ci++) {
        var compData = aeData.comps[ci];
        try {
          var compNode = nodes.buildCompNode(compData, posIndex++);
          nodeMap[compNode.id] = compNode;
          allAliveUUIDs.push(compNode.id);
          summary.comps++;

          var layerNodes = [];
          var effectMap = {};
          var blendingMap = {};
          var matteMap = {};
          var effectCount = 0;

          // 3. Process layers bottom-to-top (AE index ascending)
          var layers = compData.layers || [];
          for (var li = 0; li < layers.length; li++) {
            var layerData = layers[li];

            if (layerData.type === 'camera' || layerData.type === 'light' || layerData.type === 'unknown') {
              continue;
            }

            if (layerData.type === 'precomp') {
              summary.errors.push('Precomp layer "' + layerData.name + '" skipped — precomp support coming later');
              continue;
            }

            if (!nodes.aeTypeToNodeType(layerData.type)) {
              summary.errors.push('Unsupported layer type "' + layerData.type + '" for "' + layerData.name + '"');
              continue;
            }

            try {
              var layerNode = nodes.buildLayerNode(layerData, compData.uuid, posIndex++);
              if (!layerNode) continue;
              nodeMap[layerNode.id] = layerNode;
              layerNodes.push({ node: layerNode, layerData: layerData });
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

              // Blending mode
              if (layerData.blendingMode && layerData.blendingMode !== 'NORMAL') {
                var blendNode = nodes.buildBlendingNode(layerData.blendingMode, posIndex++);
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
          var compWires = wires.buildCompWires(compData, compNode, layerNodes, effectMap, blendingMap, matteMap);
          for (var wi = 0; wi < compWires.length; wi++) {
            wireMap[compWires[wi].id] = compWires[wi];
          }

          // 5. Build parent wires for this comp's layers
          var parentWires = wires.buildParentWires(layerNodes);
          for (var pwi = 0; pwi < parentWires.length; pwi++) {
            wireMap[parentWires[pwi].id] = parentWires[pwi];
          }

        } catch (e) {
          summary.errors.push('comp ' + ci + ' "' + (compData.name || '') + '": ' + e.message);
        }
      }
    }

    // 6. Set hosting comps on all alive nodes
    for (var nid in nodeMap) {
      if (!nodeMap.hasOwnProperty(nid)) continue;
      var nd = nodeMap[nid];
      if (nd.type === 'core/comp') {
        nd.state = 'alive';
        continue;
      }
      // Find which comp this node connects to by checking wires
      for (var wid in wireMap) {
        if (!wireMap.hasOwnProperty(wid)) continue;
        var wd = wireMap[wid];
        if (wd.fromNode === nid && wd.type === 'layer' && wd._pathLayerUUID !== null) {
          var compId = wd.toNode;
          if (nodeMap[compId] && nodeMap[compId].type === 'core/comp') {
            if (nd.hostingComps.indexOf(compId) === -1) {
              nd.hostingComps.push(compId);
            }
            if (nd.state === 'ghost') {
              nd.state = 'alive';
            }
          }
        }
        if (wd.toNode === nid && wd.type === 'layer') {
          var fromId = wd.fromNode;
          if (fromId === nid) continue;
          var fromNode = nodeMap[fromId];
          if (fromNode && fromNode.hostingComps && fromNode.hostingComps.length > 0) {
            for (var hi = 0; hi < fromNode.hostingComps.length; hi++) {
              var hc = fromNode.hostingComps[hi];
              if (nd.hostingComps.indexOf(hc) === -1) {
                nd.hostingComps.push(hc);
              }
            }
            if (nd.state === 'ghost') {
              nd.state = 'alive';
            }
          }
        }
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

    // 8. Verify stamps (fire-and-forget)
    stamp.verifyStamps(allAliveUUIDs);

    return Promise.resolve(summary);
  }

  return {
    importProject: importProject
  };

})();
