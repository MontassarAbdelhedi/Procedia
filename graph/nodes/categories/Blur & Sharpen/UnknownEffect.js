/**
 * @file Unknown blur node definition (blur-sharpen/unknown).
 * Placeholder for AE effects not registered in Procedia. Sits in the wire
 * path so topology is complete, but all lifecycle handlers return null —
 * the effect can only be edited directly in After Effects.
 * Ports: mainInput (layer, required), output (layer).
 * Params: label, effectName, effectMatchName (read-only display values).
 */

// graph/nodes/categories/Blur & Sharpen/UnknownEffect.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var UnknownEffectNode = {
  type:      'blur-sharpen/unknown',
  label:     'Unknown Effect',
  category:  'Effects',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,

  ports: [
    { id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true },
    { id: 'output',     category: 'output',    type: 'layer', capacity: 'single' }
  ],

  getParams: function(nodeData) {
    return [
      { key: 'label',            type: 'string', default: 'Unknown Effect', label: 'Label' },
      { key: 'effectName',       type: 'string', default: '',               label: 'Effect Name' },
      { key: 'effectMatchName',  type: 'string', default: '',               label: 'Match Name' }
    ];
  },

  onDrop:           function() { return null; },
  onAlive:          function() { return null; },
  onGhost:          function() { return null; },
  onDelete:         function() { return null; },
  onPropertyChange: function() { return null; }
};

nodeRegistry.register(UnknownEffectNode);
