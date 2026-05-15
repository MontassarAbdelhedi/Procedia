// graph/nodes/categories/layers/Text.js
// DEPENDS ON: graph/nodes/nodeRegistry.js
// MUST LOAD BEFORE: index.js

nodeRegistry.register('TextNode', {
  nodeKind:  'affected',
  category:  'layers',
  label:     'Text',
  inputs: [
    { port: 'data_content',  name: 'data_content',  type: 'data', accepts: 'string' },
    { port: 'data_fontSize', name: 'data_fontSize', type: 'data', accepts: 'number' },
    { port: 'data_color',    name: 'data_color',    type: 'data', accepts: 'color'  }
  ],
  outputs: [
    { port: 'output', name: 'output', type: 'layer' }
  ],
  defaultProps: {
    content:  'Text',
    fontSize: 72,
    color:    [1, 1, 1, 1]
  }
});
