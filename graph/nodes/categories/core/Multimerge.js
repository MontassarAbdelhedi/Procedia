var MultimergeNode = {
  type:      'utility/multimerge',
  label:     'Multimerge',
  category:  'Core',
  version:   '1.0.0',
  nodeKind:  'multimerge',
  dedicated: false,

  ports: [
    { id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'infinite' },
    { id: 'output',     category: 'output',    type: 'layer', capacity: 'single' }
  ],

  params: [
    { key: 'label', type: 'string', default: 'Multimerge', label: 'Label' },
    { key: 'mode',  type: 'enum',   default: 'NORMAL',     label: 'Mode' }
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
nodeRegistry.register(MultimergeNode);
