/**
 * @file Expression data node definition (data/expression).
 * A data-only node that exposes a string expression.
 * Ports: output (data).
 * Params: label, expression.
 * All lifecycle handlers return null — no AE actions are dispatched.
 */

// graph/nodes/categories/Data/Expression.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var ExpressionNode = {
  type:      'data/expression',
  label:     'Expression',
  category:  'Data',
  version:   '1.0.0',
  nodeKind:  'data',
  dedicated: false,

  ports: [
    { id: 'output', category: 'output', type: 'data' }
  ],

  params: [
    { key: 'label',      type: 'string', default: 'Expression', label: 'Label' },
    { key: 'expression', type: 'string', default: '',           label: 'Expression' }
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

nodeRegistry.register(ExpressionNode);
