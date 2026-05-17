// graph/nodes/categories/core/Comp.js
// DEPENDS ON: graph/nodes/nodeRegistry.js
// MUST LOAD BEFORE: index.js

nodeRegistry.register('CompNode', {
  nodeKind:  'affected',
  category:  'core',
  label:     'Comp',
  inputs: [
    { port: 'layer_in',  name: 'layer_in',  type: 'layer',  multiplicity: 'unlimited' },
    { port: 'parent_in', name: 'parent_in', type: 'parent', multiplicity: 'unlimited' }
  ],
  outputs: [],
  defaultProps: {
    name:      'New Comp',
    width:     1920,
    height:    1080,
    duration:  5,
    frameRate: 24
  }
});

// Backward-compat alias — v2 files check n.type === 'core/comp' until rewritten
nodeRegistry.register('core/comp', nodeRegistry.lookup('CompNode'));
