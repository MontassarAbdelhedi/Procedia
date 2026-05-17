// jsx/nodeLifeCycle/nodeLayerOps/nodeLayerCreate.jsx
// DEPENDS ON: jsx/json.jsx, jsx/init.jsx (findOrCreateProcediaFolder),
//             nodeLayerLookup.jsx (findCompByUUID, findLayerByUUID, findReservedComp)
// Provides: makeLayerAlive, makeNodeAlive
// ES3 — var only, named functions, for loops, string concat

// ─── makeLayerAlive ────────────────────────────────────────────────────────────
// Creates the AE object for a node going alive.
// CompNode  → creates a new CompItem (is itself a hosting comp).
// All other → creates a layer inside the hosting comp.
// Sets layer/comp .comment = uuid for future lookups.

function makeLayerAlive(uuid, nodeType, hostingCompUUID, propsJson) {
  var result = { ok: false, data: null, error: null };
  try {
    var props = {};
    try { props = JSON.parse(propsJson); } catch (pe) { /* empty props */ }

    // ── CompNode: create a new AE comp ──────────────────────────────────────
    if (nodeType === 'CompNode' || nodeType === 'core/comp') {
      var compName = props.name      || 'New Comp';
      var width    = props.width     || 1920;
      var height   = props.height    || 1080;
      var fps      = props.frameRate || 24;
      var dur      = props.duration  || 5;
      var folder   = findOrCreateProcediaFolder();
      var newComp  = app.project.items.addComp(compName, width, height, 1, dur, fps);
      newComp.parentFolder = folder;
      newComp.comment      = uuid;
      result.ok   = true;
      result.data = { compId: uuid };
      return JSON.stringify(result);
    }

    // ── Non-comp: if parked in reserved comp, unpark instead of creating new ──
    var reservedComp0 = findReservedComp();
    if (reservedComp0) {
      var parkedCheck = findLayerByUUID(reservedComp0, uuid);
      if (parkedCheck) {
        return unparkLayer(uuid, hostingCompUUID);
      }
    }

    // ── All other nodes: create a layer inside the hosting comp ─────────────
    var hostComp = findCompByUUID(hostingCompUUID);
    if (!hostComp) {
      result.error = 'Hosting comp not found: ' + hostingCompUUID;
      return JSON.stringify(result);
    }

    var layer = null;

    if (nodeType === 'NullNode') {
      layer = hostComp.layers.addNull();

    } else if (nodeType === 'TextNode') {
      layer = hostComp.layers.addText(props.content || 'Text');

    } else if (nodeType === 'ShapeNode') {
      layer = hostComp.layers.addShape();

    } else if (nodeType === 'SolidNode') {
      var solidColor  = props.color || [0.5, 0.5, 0.5];
      var solidName   = props.name  || 'Solid';
      var solidSource = app.project.items.addSolid(
        solidColor, solidName, hostComp.width, hostComp.height, 1
      );
      solidSource.parentFolder = findOrCreateProcediaFolder();
      layer = hostComp.layers.add(solidSource);

    } else if (nodeType === 'AdjustmentNode') {
      // Adjustment layer — backed by a solid, adjustment flag set
      var adjSource = app.project.items.addSolid(
        [1, 1, 1], 'Adjustment', hostComp.width, hostComp.height, 1
      );
      adjSource.parentFolder = findOrCreateProcediaFolder();
      layer = hostComp.layers.add(adjSource);
      layer.adjustmentLayer = true;

    } else if (nodeType === 'FootageNode') {
      result.error = 'FootageNode: use the AE project panel to import footage, then wire it';
      return JSON.stringify(result);

    } else {
      result.error = 'makeLayerAlive: unknown nodeType: ' + nodeType;
      return JSON.stringify(result);
    }

    layer.comment = uuid;

    result.ok   = true;
    result.data = { layerIndex: layer.index };
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}

// ─── makeNodeAlive ─────────────────────────────────────────────────────────────
// Alias called by the panel (callMakeNodeAlive). Accepts optional nodeLabel arg
// (currently always '' from the panel — renaming deferred to renameNode/T7.4).

function makeNodeAlive(uuid, nodeType, hostingCompUUID, propsJson, nodeLabel) {
  return makeLayerAlive(uuid, nodeType, hostingCompUUID, propsJson);
}
