TWO TASKS. Do them in order. Stop after each for verification.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK A — BUG FIX: Wire positions break on pan, zoom, and node drag
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FILE: graph/canvas/input/input.js

Find the single-node drag section inside onMouseMove. It runs when
isMovingNode === true and uses moveLastX / moveLastY to compute a delta.

The delta is currently applied directly to node.position (world space)
without compensating for zoom scale.

FIX: divide dx and dy by transform.scale before applying to node.position.

  var transform = canvasViewport.getTransform();
  var dx = (e.clientX - moveLastX) / transform.scale;
  var dy = (e.clientY - moveLastY) / transform.scale;
  moveLastX = e.clientX;
  moveLastY = e.clientY;
  graphState.setNodePosition(movingNodeId,
    node.position.x + dx,
    node.position.y + dy
  );

Do NOT change group drag — it already uses screenToWorld correctly.
Do NOT touch wireRenderer, nodeGeometry, or renderer.

VERIFICATION:
- [ ] Drag a node at zoom 1.0 → node follows cursor exactly
- [ ] Drag a node at zoom 0.5 → node still follows cursor exactly (previously moved too slow)
- [ ] Drag a node at zoom 2.0 → node still follows cursor exactly (previously moved too fast)
- [ ] All wires connected to the dragged node follow the node
- [ ] Pan the canvas → all wires stay correctly attached
- [ ] Zoom in/out → all wires stay correctly attached
STOP. Report results before Task B.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK B — FEATURE: Auto-wire suggestion when dragging effecter over a wire
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is a new interaction. Read the full algorithm before touching any file.

FILES TO TOUCH:
  ui/drag.js            — detection + drop handler
  graph/Wire/wireRenderer.js  — visual suggestion rendering
  graph/graphState/    — wire commit/delete (existing functions, just call them)

─── STEP 1 — Shared drag state (drag.js) ───

Add a module-level variable:
  var autoWireSuggestState = {
    active:  false,
    wireId:  null,
    midX:    0,    // screen coords of insertion point
    midY:    0
  };

Expose a getter on the drag module:
  getAutoWireSuggest: function() { return autoWireSuggestState; }

─── STEP 2 — Detection in drag.js mousemove ───

During mousemove while activeDef exists (a node is being dragged from the list):

  1. Check if activeDef.nodeKind === 'effector'.
     If not, skip auto-wire logic entirely.

  2. Get transform from canvas.getTransform().

  3. Call wireRenderer.hitTestNearest(screenX, screenY, transform).
     If null → clear autoWireSuggestState.active = false, return.

  4. Get the wire: graphState.getWire(wireId).
  
  5. Compatibility check:
     The effecter's inputs array must contain at least one port whose type
     matches wire.type ('layer', 'data', or 'parent').
     If not compatible → clear autoWireSuggestState.active = false, return.

  6. If compatible:
     autoWireSuggestState.active = true;
     autoWireSuggestState.wireId = wireId;
     autoWireSuggestState.midX   = wire._midX;  // already computed by wireRenderer each frame
     autoWireSuggestState.midY   = wire._midY;

─── STEP 3 — Rendering in wireRenderer.drawAll() ───

At the end of drawAll(), after all confirmed wires are drawn:

  var suggest = (typeof initDrag !== 'undefined') 
    ? ui_drag.getAutoWireSuggest()  // use whatever the module exposes
    : null;

  if (suggest && suggest.active) {
    var suggestWire  = allWires[suggest.wireId];
    var fromNode     = allNodes[suggestWire.fromNode];
    var toNode       = allNodes[suggestWire.toNode];
    if (suggestWire && fromNode && toNode) {

      // 1. Highlight the target wire — draw it again on top, brighter
      // Use color #ffffff, lineWidth 2.5, no dash

      // 2. Draw ghost wire A: fromNode output → midpoint
      var fromPos = get the same fromPos computed above for this wire;
      drawBezier(ctx,
        fromPos.x, fromPos.y,
        suggest.midX, suggest.midY,
        calcCpOffset(...), 'rgba(255,255,255,0.4)', 1.5, 0, false
      );

      // 3. Draw ghost wire B: midpoint → toNode input
      var toPos = get the same toPos computed above for this wire;
      drawBezier(ctx,
        suggest.midX, suggest.midY,
        toPos.x, toPos.y,
        calcCpOffset(...), 'rgba(255,255,255,0.4)', 1.5, 0, false
      );

      // 4. Draw insertion circle at midpoint
      ctx.save();
      ctx.beginPath();
      ctx.arc(suggest.midX, suggest.midY, 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

─── STEP 4 — Drop handler in drag.js ───

In the mouseup handler, BEFORE the normal graphState.onDrop():

  if (autoWireSuggestState.active) {
    var wireId    = autoWireSuggestState.wireId;
    var wire      = graphState.getWire(wireId);
    var worldPos  = canvas.screenToWorld(screenX, screenY);
    var wx        = worldPos.x - nodeGeometry.NODE_WIDTH  / 2;
    var wy        = worldPos.y - nodeGeometry.NODE_HEIGHT / 2;

    // 1. Create the new effecter node
    var newId = graphState.onDrop(def.type, wx, wy);

    // 2. Delete the original wire
    graphState.removeWire(wireId);

    // 3. Find the compatible input port on the new node
    var newNode     = graphState.getNode(newId);
    var newDef      = nodeRegistry.getByType(newNode.type);
    var matchPort   = first port in newDef.inputs where type === wire.type;

    // 4. Wire A: original fromNode → new effecter
    graphState.addWire({
      fromNode: wire.fromNode,
      fromPort: wire.fromPort,
      toNode:   newId,
      toPort:   matchPort.name,
      type:     wire.type
    });

    // 5. Wire B: new effecter → original toNode
    var outPort = first port in newDef.outputs where type === wire.type;
    graphState.addWire({
      fromNode: newId,
      fromPort: outPort.port,
      toNode:   wire.toNode,
      toPort:   wire.toPort,
      type:     wire.type
    });

    autoWireSuggestState.active = false;
    return;  // skip normal onDrop — node was already created above
  }

─── Cleanup ───

On drag cancel (mouseup outside canvas, or Escape):
  autoWireSuggestState.active = false;

VERIFICATION:
- [ ] Drag a FillEffect (effector) over a wire connecting TextNode → CompNode
      → Wire highlights white, two ghost preview wires appear, insertion circle visible
- [ ] Drop it → FillEffect node created, original wire replaced with two wires
      → TextNode → FillEffect → CompNode
- [ ] FillEffect correctly goes alive (fill applied to TextNode's layer)
- [ ] Drag a CompNode (affected, not effector) over a wire → no highlight, no suggestion
- [ ] Drag FillEffect over a parent wire → no suggestion (type mismatch)
- [ ] Drag FillEffect, hover wire, then move away → suggestion clears, wire returns to normal
STOP. Report results.