// graph/nodes/categories/layers/Null.js
// DEPENDS ON: graph/nodes/nodeRegistry.js
// MUST LOAD BEFORE: index.js

// TODO v1.1.0 — add 3D toggle param and z-position/rotation props

nodeRegistry.register('NullNode', {
  nodeKind:  'affected',
  category:  'layers',
  label:     'Null',
  inputs: [
    { port: 'parent_in', name: 'parent_in', type: 'parent', multiplicity: 'unlimited' }
  ],
  outputs: [
    { port: 'output',    name: 'output',    type: 'layer'  },
    { port: 'child_out', name: 'child_out', type: 'parent', multiplicity: 'single' }
  ],
  defaultProps: {
    label:    'Null',
    position: null,      // null = not yet set; AE places addNull() at comp center on first alive
    scale:    [100, 100],
    rotation: 0,
    opacity:  100
  },
  propMatchNames: {
    position: 'ADBE Transform Group/ADBE Position',
    scale:    'ADBE Transform Group/ADBE Scale',
    rotation: 'ADBE Transform Group/ADBE Rotate Z',
    opacity:  'ADBE Transform Group/ADBE Opacity'
  },
  params: [
    { key: 'label',    label: 'Label',    type: 'string',  rename: true },
    { key: 'position', label: 'Position', type: 'vector2' },
    { key: 'scale',    label: 'Scale',    type: 'vector2' },
    { key: 'rotation', label: 'Rotation', type: 'number'  },
    { key: 'opacity',  label: 'Opacity',  type: 'number', min: 0, max: 100 }
  ]
});
