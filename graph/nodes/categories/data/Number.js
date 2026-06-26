/**
 * @file Number data node definition (data/number).
 * A simple data-only node that exposes a numeric value (0–100).
 * Ports: output (data).
 * Params: label, value.
 * All lifecycle handlers return null — no AE actions are dispatched.
 */

// graph/nodes/categories/Data/Number.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var NumberNode = {
  type:      'data/number',
  label:     'Number',
  category:  'Data',
  version:   '1.0.0',
  nodeKind:  'data',
  dedicated: false,

  ports: [
    { id: 'output', category: 'output', type: 'data' }
  ],

  params: [
    { key: 'label',  type: 'string', default: 'Number', label: 'Label' },
    { key: 'value',  type: 'number', default: 50,        label: 'Value', min: 0, max: 100 }
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

nodeRegistry.register(NumberNode);
