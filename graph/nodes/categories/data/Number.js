// graph/nodes/categories/data/Number.js
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

  onDrop:           function(nodeData)                              { return null; },
  onAlive:          function(nodeData, hostingCompUUID)             { return null; },
  onGhost:          function(nodeData, hostingCompUUID)             { return null; },
  onDelete:         function(nodeData)                              { return null; },
  onPropertyChange: function(key, value, nodeData, hostingCompUUID) { return null; }
};

nodeRegistry.register(NumberNode);
