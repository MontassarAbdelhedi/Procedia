// graph/nodes/categories/data/Color.js
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
    { key: 'label', type: 'string', default: 'Color',      label: 'Label' },
    { key: 'color', type: 'color',  default: [1, 1, 1, 1], label: 'Color' }
  ],

  onDrop:           function(nodeData)                              { return null; },
  onAlive:          function(nodeData, hostingCompUUID)             { return null; },
  onGhost:          function(nodeData, hostingCompUUID)             { return null; },
  onDelete:         function(nodeData)                              { return null; },
  onPropertyChange: function(key, value, nodeData, hostingCompUUID) { return null; }
};

nodeRegistry.register(ColorNode);
