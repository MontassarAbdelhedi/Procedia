// graph/nodes/categories/utility/Blending.js
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

  onDrop:           function() { return null; },
  onAlive:          function() { return null; },
  onGhost:          function() { return null; },
  onDelete:         function() { return null; },
  onPropertyChange: function() { return null; }
};

nodeRegistry.register(BlendingNode);
