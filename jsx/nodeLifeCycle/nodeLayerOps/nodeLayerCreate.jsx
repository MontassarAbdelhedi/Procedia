// jsx/nodeLifeCycle/nodeLayerOps/nodeLayerCreate.jsx
// DEPENDS ON: jsx/json.jsx, jsx/init.jsx (findOrCreateProcediaFolder),
//             nodeLayerLookup.jsx (findCompByUUID, findLayerByUUID, findReservedComp)
// Provides: createNullLayer, applyNullTransform, makeLayerAlive, makeNodeAlive
// ES3 — var only, named functions, for loops, string concat

// ─── createNullLayer ──────────────────────────────────────────────────────────
// Creates a NullLayer inside the given comp and tags it with the node UUID.
// Returns { ok, data: { layerIndex }, error }.

function createNullLayer(compUUID, nodeUUID, label) {
  var result = { ok: false, data: null, error: null };
  try {
    app.beginUndoGroup('Procedia: create null layer');

    var comp = findCompByUUID(compUUID);
    if (!comp) {
      result.error = 'createNullLayer: comp not found: ' + compUUID;
      return JSON.stringify(result);
    }

    var layer = comp.layers.addNull(comp.duration);
    layer.name    = (label && label.length > 0) ? label : 'Null';
    layer.comment = nodeUUID;

    app.endUndoGroup();
    result.ok   = true;
    result.data = { layerIndex: layer.index };
  } catch (e) {
    result.error = e.toString();
    try { app.endUndoGroup(); } catch (ignored) {}
  }
  return JSON.stringify(result);
}

// ─── applyNullTransform ───────────────────────────────────────────────────────
// Applies transform values to the null layer identified by nodeUUID in the comp.
// position and scale are 2-element arrays; rotation and opacity are scalars.
// Returns { ok, data: null, error }.

function applyNullTransform(compUUID, nodeUUID, position, scale, rotation, opacity) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = findCompByUUID(compUUID);
    if (!comp) {
      result.error = 'applyNullTransform: comp not found: ' + compUUID;
      return JSON.stringify(result);
    }

    var layer = findLayerByUUID(comp, nodeUUID);
    if (!layer) {
      result.error = 'applyNullTransform: layer not found for uuid: ' + nodeUUID;
      return JSON.stringify(result);
    }

    var transform = layer.property('ADBE Transform Group');
    transform.property('ADBE Position').setValue([position[0], position[1]]);
    transform.property('ADBE Scale').setValue([scale[0], scale[1]]);
    transform.property('ADBE Rotate Z').setValue(rotation);
    transform.property('ADBE Opacity').setValue(opacity);

    result.ok = true;
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}

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
      var nullLabel      = props.label || 'Null';
      var createResult   = JSON.parse(createNullLayer(hostingCompUUID, uuid, nullLabel));
      if (!createResult.ok) { return JSON.stringify(createResult); }

      // Only apply transform if user has explicitly set position (non-null).
      // addNull() already places the layer at comp center — preserve that on first wire.
      if (props.position !== null && props.position !== undefined) {
        var pos  = props.position;
        var scl  = props.scale    || [100, 100];
        var rot  = (props.rotation !== undefined && props.rotation !== null) ? props.rotation : 0;
        var opac = (props.opacity  !== undefined && props.opacity  !== null) ? props.opacity  : 100;
        var txResult = JSON.parse(applyNullTransform(hostingCompUUID, uuid, pos, scl, rot, opac));
        if (!txResult.ok) { return JSON.stringify(txResult); }
      }

      // Read back actual AE values so the panel inspector shows the real position.
      var nullComp  = findCompByUUID(hostingCompUUID);
      var nullLayer = findLayerByUUID(nullComp, uuid);
      var xform     = nullLayer.property('ADBE Transform Group');
      var aePos     = xform.property('ADBE Position').value;
      var aeScale   = xform.property('ADBE Scale').value;
      var aeRot     = xform.property('ADBE Rotate Z').value;
      var aeOpac    = xform.property('ADBE Opacity').value;

      result.ok   = true;
      result.data = {
        layerIndex: createResult.data.layerIndex,
        props: {
          position: [aePos[0],   aePos[1]],
          scale:    [aeScale[0], aeScale[1]],
          rotation: aeRot,
          opacity:  aeOpac
        }
      };
      return JSON.stringify(result);

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
