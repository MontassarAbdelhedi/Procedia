// graph/nodes/categories/effects/FillEffect.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var FillEffectNode = {
  type:      'effects/fill',
  label:     'Fill',
  category:  'Effects',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,
  matchName: 'ADBE Fill',
  params:    'dynamic',

  ports: [
    { id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true },
    { id: 'output',     category: 'output',    type: 'layer', capacity: 'single' }
  ],

  onDrop:           function() { return null; },
  onAlive:          function() { return null; },
  onGhost:          function() { return null; },
  onDelete:         function() { return null; },
  onPropertyChange: function() { return null; }
};

nodeRegistry.register(FillEffectNode);
