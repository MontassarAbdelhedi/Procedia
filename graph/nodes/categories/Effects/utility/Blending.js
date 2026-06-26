/**
 * @file Blending utility node definition (utility/blending).
 * A blending-mode utility node that controls how a layer composites with those below it.
 * Ports: mainInput (layer, required), output (layer).
 * Params: label, mode (enum, e.g. NORMAL).
 * All lifecycle handlers return null — blending is handled natively by the layer.
 */

// graph/nodes/categories/Effects/utility/Blending.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var BlendingNode = {
  type:      'utility/blending',
  label:     'Blending',
  category:  'Utility',
  version:   '1.0.0',
  nodeKind:  'blending',
  dedicated: false,

  ports: [
    { id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true },
    { id: 'output',     category: 'output',    type: 'layer', capacity: 'single' }
  ],

  params: [
    { key: 'label', type: 'string', default: 'Blending', label: 'Label' },
    { key: 'mode',  type: 'enum',   default: 'NORMAL',   label: 'Mode' }
  ],

  getParams: function(nodeData) {
    return this.params;
  },

  /** @return {null} Blending handled natively — no AE action on drop. */
  onDrop:           function() { return null; },
  /** @return {null} Blending handled natively — no AE action when alive. */
  onAlive:          function() { return null; },
  /** @return {null} Blending handled natively — no AE action when ghosted. */
  onGhost:          function() { return null; },
  /** @return {null} Blending handled natively — no AE action on delete. */
  onDelete:         function() { return null; },
  /** @return {null} Blending handled natively — no AE action on property change. */
  onPropertyChange: function() { return null; }
};

nodeRegistry.register(BlendingNode);
