/**
 * @fileoverview Global mutable state for canvas input handling.
 * Exposes shared objects for drag, pan, rubber-band selection, and space-held flag.
 * @dependencies (none)
 * @exports (global variables) _inpDrag, _inpPan, _inpRubber, _inpSpaceHeld, INP_MIN_RUBBER
 */

// graph/canvas/input/state.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: input/utils.js, input/rubberband.js, input/handlers.js, input/index.js

var _inpDrag = {
  active:           false,
  nodeId:           null,
  dragStartCanvas:  null,
  nodeStartPos:     null,
  moved:            false,
  selectionStartPositions: null
};

var _inpPan = {
  active:      false,
  startScreen: null,
  startPan:    null
};

var _inpRubber = {
  active:      false,
  startX:      0,
  startY:      0,
  currentX:    0,
  currentY:    0,
  el:          null,
  ctrlKey:     false,
  shiftKey:    false,
  _highlights: []
};

var _inpSpaceHeld = false;
var _selectedWireId = null;
var _editingNodeId = null;
var INP_MIN_RUBBER = 5;
