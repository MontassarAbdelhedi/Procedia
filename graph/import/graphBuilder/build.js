/**
 * graph/import/graphBuilder/build.js
 *
 * Takes the import JSON and builds all nodes and wires in graphState.
 * Sets all nodes to 'alive' state since the AE objects already exist.
 * Positions nodes in a grid and runs autoLayout.
 *
 * Depends on: graph/graphState.js, graph/nodeRegistry.js, data/uuidGenerator.js
 * MUST LOAD BEFORE: graph/import/index.js
 * Exports: importGraphBuilder.build(importJSON, compUUIDs)
 */
// graph/import/graphBuilder/build.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, data/uuidGenerator.js,
//             graph/import/graphBuilder/helpers.js
// MUST LOAD BEFORE: graph/import/index.js

var importGraphBuilder = (function() {
  var I = __importGraphInternals;

  /**
   * Clears existing graph state and builds the full graph from import JSON.
   *
   * @param {Object} importJSON — { comps: {}, footage: {} }
   * @param {Object} compUUIDs — { compName: compUUID }
   */
  function build(importJSON, compUUIDs) {
    if (typeof graphState === 'undefined') {
      throw new Error('[importGraphBuilder] graphState not available');
    }

    // --- Clear existing graph ---
    graphState.clearGraph();
    if (typeof undoManager !== 'undefined') undoManager.reset();

    var comps = importJSON.comps || {};
    var footage = importJSON.footage || {};

    var col = 0;
    var compColumns = {}; // compUUID → column index

    // --- Step 1: Create CompNodes ---
    for (var compUUID in comps) {
      if (!comps.hasOwnProperty(compUUID)) continue;
      var c = comps[compUUID];
      var compDef = I.getDef('core/comp');
      var compNode = {
        id:           compUUID,
        type:         'core/comp',
        nodeKind:     'affected',
        dedicated:    true,
        state:        'alive',
        dirty:        false,
        x:            I.START_X + col * I.COL_SPACING,
        y:            I.START_Y,
        props:        I.buildProps(compDef, { label: c.label, width: c.width, height: c.height, frameRate: c.frameRate, duration: c.duration }),
        hostingComps: [],
        hasParkedLayer: false,
        dynamicSchema:  null,
        secondaryPorts: null,
        locked:       false,
        disabled:     false
      };
      graphState.addNode(compNode);
      compColumns[compUUID] = col;
      col++;
    }

    // --- Step 2: Create FootageNodes ---
    for (var footageUUID in footage) {
      if (!footage.hasOwnProperty(footageUUID)) continue;
      var f = footage[footageUUID];
      var footDef = I.getDef('core/footage');
      var footNode = {
        id:           footageUUID,
        type:         'core/footage',
        nodeKind:     'affected',
        dedicated:    true,
        state:        'alive',
        dirty:        false,
        x:            I.START_X + col * I.COL_SPACING,
        y:            I.START_Y,
        props:        I.buildProps(footDef, { label: f.label }),
        hostingComps: [],
        hasParkedLayer: false,
        dynamicSchema:  null,
        secondaryPorts: null,
        locked:       false,
        disabled:     false
      };
      graphState.addNode(footNode);
      col++;
    }

    // --- Step 3: Create layer nodes and effect nodes inside comps ---
    for (compUUID in comps) {
      if (!comps.hasOwnProperty(compUUID)) continue;
      var compData = comps[compUUID];
      var layers = compData.layers || [];
      var compX = I.START_X + compColumns[compUUID] * I.COL_SPACING;

      for (var li = 0; li < layers.length; li++) {
        var layer = layers[li];
        var def = I.getDef(layer.type);
        if (!def) {
          console.warn('[importGraphBuilder] node type not found: ' + layer.type);
          continue;
        }

        var nodeY = I.START_Y + 250 + (li + 1) * I.ROW_SPACING;

        // Create the layer node
        var layerNode = {
          id:           layer.uuid,
          type:         layer.type,
          nodeKind:     def.nodeKind,
          dedicated:    def.dedicated,
          state:        'alive',
          dirty:        false,
          x:            compX + 250,
          y:            nodeY,
          props:        I.buildProps(def, layer.properties),
          hostingComps: [compUUID],
          hasParkedLayer: false,
          dynamicSchema:  null,
          secondaryPorts: null,
          locked:       false,
          disabled:     !layer.enabled
        };
        graphState.addNode(layerNode);

        // --- Step 4: Add wire from layer → comp ---
        var wireId = layer.wireUUID;
        var wireData = {
          id:       wireId,
          fromNode: layer.uuid,
          fromPort: 'output',
          toNode:   compUUID,
          toPort:   'main_input',
          type:     'layer'
        };
        graphState.addWire(wireData);

        // --- Step 5: Create effect nodes and insert in chain ---
        var prevNodeId = layer.uuid;
        if (layer.effects && layer.effects.length > 0) {
          for (var ei = 0; ei < layer.effects.length; ei++) {
            var eff = layer.effects[ei];
            var effDef = I.getDef(eff.type);
            if (!effDef) {
              console.warn('[importGraphBuilder] effect type not found: ' + eff.type);
              continue;
            }

            var effNode = {
              id:           eff.uuid,
              type:         eff.type,
              nodeKind:     'effector',
              dedicated:    false,
              state:        'alive',
              dirty:        false,
              x:            compX + 250 + (ei + 1) * 250,
              y:            nodeY,
              props:        eff.props || {},
              hostingComps: [compUUID],
              hasParkedLayer: false,
              dynamicSchema:  null,
              secondaryPorts: null,
              locked:       false,
              disabled:     !eff.enabled
            };

            // Resolve dynamic schema from cache
            if (effDef.params === 'dynamic' && eff.matchName &&
                typeof schemaCache !== 'undefined' && schemaCache.hasSchema) {
              if (schemaCache.hasSchema(eff.matchName)) {
                var schema = schemaCache.getSchema(eff.matchName);
                if (schema) {
                  effNode.dynamicSchema = schema;
                }
              }
            }

            graphState.addNode(effNode);

            // Wire: previous node → effector
            var effWireId = uuidGenerator.wire();
            graphState.addWire({
              id:       effWireId,
              fromNode: prevNodeId,
              fromPort: 'output',
              toNode:   eff.uuid,
              toPort:   'main_input',
              type:     'layer'
            });

            prevNodeId = eff.uuid;
          }

          // Re-wire the final effector → comp (replace the original wire)
          graphState.removeWire(wireId);
          graphState.addWire({
            id:       wireId,
            fromNode: prevNodeId,
            fromPort: 'output',
            toNode:   compUUID,
            toPort:   'main_input',
            type:     'layer'
          });
        }

        // --- Step 6: Parent wires ---
        if (layer.parentIndex > 0) {
          // Find the parent layer in the same comp
          for (var pli = 0; pli < layers.length; pli++) {
            if (layers[pli].index === layer.parentIndex) {
              var parentWireId = uuidGenerator.wire();
              graphState.addWire({
                id:       parentWireId,
                fromNode: layer.uuid,
                fromPort: 'child_of',
                toNode:   layers[pli].uuid,
                toPort:   'parent_of',
                type:     'parent'
              });
              break;
            }
          }
        }

        // --- Step 7: Source wires (comp/footage source layers) ---
        if (layer.sourceUUID) {
          var srcNode = graphState.getNode(layer.sourceUUID);
          if (srcNode) {
            // Source node's output connects to this layer's hosting comp
            // For comp-as-layer: the source comp node already has a graph wire via addCompAsLayer pattern
            // Update source node's hosting comps to include this comp
            if (srcNode.hostingComps && Array.isArray(srcNode.hostingComps)) {
              var alreadyHosting = false;
              for (var hi = 0; hi < srcNode.hostingComps.length; hi++) {
                if (srcNode.hostingComps[hi] === compUUID) { alreadyHosting = true; break; }
              }
              if (!alreadyHosting) {
                srcNode.hostingComps.push(compUUID);
              }
            }
          }
        }

        // --- Step 8: Blending nodes ---
        if (layer.blendingMode && layer.blendingMode !== 'NORMAL') {
          var blendUUID = uuidGenerator.node();
          var blendNode = {
            id:           blendUUID,
            type:         'utility/blending',
            nodeKind:     'blending',
            dedicated:    false,
            state:        'alive',
            dirty:        false,
            x:            compX + 250,
            y:            nodeY - 60,
            props:        { label: 'Blending', mode: layer.blendingMode },
            hostingComps: [compUUID],
            hasParkedLayer: false,
            dynamicSchema:  null,
            secondaryPorts: null,
            locked:       false,
            disabled:     false
          };
          graphState.addNode(blendNode);

          // Replace original wire: layer → blend → comp
          graphState.removeWire(wireId);
          var blendWire1 = uuidGenerator.wire();
          graphState.addWire({
            id: blendWire1, fromNode: prevNodeId, fromPort: 'output',
            toNode: blendUUID, toPort: 'main_input', type: 'layer'
          });
          graphState.addWire({
            id: wireId, fromNode: blendUUID, fromPort: 'output',
            toNode: compUUID, toPort: 'main_input', type: 'layer'
          });
        }

        // --- Step 9: Track matte ---
        if (layer.trackMatteType && layer.trackMatteType !== 'NONE') {
          // Track mattes in AE reference the layer directly above.
          // For import, we create a note but cannot fully reconstruct the matte
          // relationship without knowing which layer is the matte source.
          // The scan already recorded the sourceItemName / parentIndex.
          // For now, we skip auto-creating matte nodes as the exact relationship
          // may not be reconstructable without the Procedia layer ordering model.
          // The blending mode and trackMatteType are already set on the AE layer.
        }
      }
    }

    // --- Step 10: Refresh graph state ---
    graphState.rebuildTempGraph();

    return { compCount: Object.keys(comps).length, footageCount: Object.keys(footage).length };
  }

  // Clean up internal namespace — it's no longer needed after build.js loads
  delete window.__importGraphInternals;

  return {
    build: build
  };

})();
