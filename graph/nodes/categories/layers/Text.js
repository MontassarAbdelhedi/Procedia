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
  },
  propMatchNames: {
    content:  'ADBE Text Properties/ADBE Text Document/content',
    fontSize: 'ADBE Text Properties/ADBE Text Document/fontSize',
    color:    'ADBE Text Properties/ADBE Text Document/color'
  },
  params: [
    { key: 'content',  label: 'Content',   type: 'string' },
    { key: 'fontSize', label: 'Font Size', type: 'number', min: 1 },
    { key: 'color',    label: 'Color',     type: 'color'  }
  ]
});
