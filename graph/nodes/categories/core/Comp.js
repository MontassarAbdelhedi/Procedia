// graph/nodes/categories/core/Comp.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var CompNode = {
  type:     'core/comp',
  label:    'Comp',
  category: 'Core',
  version:  '1.0.0',
  nodeKind: 'affected',
  dedicated: true,

  ports: [
    { id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'infinite' },
    { id: 'output',    category: 'output',    type: 'layer', capacity: 'single' },
    { id: 'child_of',  category: 'parent',    role: 'child',  type: 'parent'  },
    { id: 'parent_of', category: 'parent',    role: 'parent', type: 'parent'  }
  ],

  params: [
    { key: 'label',     type: 'string', default: 'Comp', label: 'Label' },
    { key: 'width',     type: 'number', default: 1920,   label: 'Width',  min: 4, max: 16384 },
    { key: 'height',    type: 'number', default: 1080,   label: 'Height', min: 4, max: 16384 },
    { key: 'frameRate', type: 'number', default: 30,     label: 'Frame Rate', min: 1, max: 999 },
    { key: 'duration',  type: 'number', default: 10,     label: 'Duration (s)', min: 0.1, max: 3600 }
  ],

  onDrop: function(nodeData) {
    return {
      action: 'createComp',
      params: {
        nodeUUID:  nodeData.id,
        label:     nodeData.props.label,
        width:     nodeData.props.width,
        height:    nodeData.props.height,
        frameRate: nodeData.props.frameRate,
        duration:  nodeData.props.duration
      }
    };
  },

  onDelete: function(nodeData) {
    return {
      action: 'deleteComp',
      params: {
        nodeUUID: nodeData.id
      }
    };
  },

  onPropertyChange: function(key, value, nodeData, hostingCompUUID) {
    return {
      action: 'setCompProperty',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        key:             key,
        value:           value
      }
    };
  }
};

nodeRegistry.register(CompNode);
