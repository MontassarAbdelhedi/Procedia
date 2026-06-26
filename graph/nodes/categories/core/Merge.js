var MergeNode = {
  type:      'utility/merge',
  label:     'Merge',
  category:  'Core',
  version:   '1.0.0',
  nodeKind:  'merge',
  dedicated: false,

  ports: [
    { id: 'input_a', category: 'mainInput', type: 'layer', capacity: 'single', required: true, label: 'Foreground' },
    { id: 'input_b', category: 'mainInput', type: 'layer', capacity: 'single', required: true, label: 'Background' },
    { id: 'output',  category: 'output',    type: 'layer', capacity: 'single' }
  ],

  params: [
    { key: 'label', type: 'string', default: 'Merge', label: 'Label', hidden: true },
    { key: 'mode',  type: 'enum',   default: 'NORMAL', label: 'Mode', hidden: true }
  ],

  getParams: function(nodeData) {
    return this.params;
  },

  onDrop:           function() { return null; },
  onAlive:          function() { return null; },
  onGhost:          function() { return null; },
  onDelete:         function() { return null; },
  onPropertyChange: function() { return null; }
};
nodeRegistry.register(MergeNode);
