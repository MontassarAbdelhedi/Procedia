/**
 * @file Color data node definition (data/color).
 * A simple data-only node that exposes an RGBA color value.
 * Ports: output (data).
 * Params: label, color (RGBA array).
 * All lifecycle handlers return null — no AE actions are dispatched.
 */

// graph/nodes/categories/Data/Color.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var ColorNode = {
  type:      'data/color',
  label:     'Color',
  category:  'Data',
  version:   '1.0.0',
  nodeKind:  'data',
  dedicated: false,

  ports: [
    { id: 'output', category: 'output', type: 'data' }
  ],

  params: [
    { key: 'label', type: 'string', default: 'Color', label: 'Label' },
    { key: 'color', type: 'color',  default: [1, 1, 1, 1], label: 'Color', animatable: true }
  ],

  getParams: function(nodeData) {
    return this.params;
  },

  /** @return {null} Data node — no AE action on drop. */
  onDrop:           function(nodeData)                              { return null; },
  /** @return {null} Data node — no AE action when alive. */
  onAlive:          function(nodeData, hostingCompUUID)             { return null; },
  /** @return {null} Data node — no AE action when ghosted. */
  onGhost:          function(nodeData, hostingCompUUID)             { return null; },
  /** @return {null} Data node — no AE action on delete. */
  onDelete:         function(nodeData)                              { return null; },
  /** @return {null} Data node — no AE action on property change. */
  onPropertyChange: function(key, value, nodeData, hostingCompUUID) { return null; },
  /** @return {null} Data node — handled via JS propagation. */
  onDisable: function(nodeData) { return null; },
  /** @return {null} Data node — handled via JS propagation. */
  onEnable:  function(nodeData) { return null; }
};

nodeRegistry.register(ColorNode);
