// graph/nodes/categories/core/Comp.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var CompNode = {

  type:     'core/comp',
  label:    'Comp',
  category: 'Core',
  version:  '1.0.0',

  nodeKind:  'affected',
  dedicated: true,

  ports: [
    { id: 'layer_in',  category: 'input',  type: 'layer', extendable: true,  required: false },
    { id: 'output',    category: 'output', type: 'layer', extendable: false                  },
    { id: 'child_of',  category: 'parent', role: 'child',  type: 'parent'                   },
    { id: 'parent_of', category: 'parent', role: 'parent', type: 'parent'                   }
  ],

  params: [
    { key: 'label',    type: 'string', default: 'Comp',    label: 'Label'                        },
    { key: 'width',    type: 'number', default: 1920,      label: 'Width',    min: 1, max: 30000 },
    { key: 'height',   type: 'number', default: 1080,      label: 'Height',   min: 1, max: 30000 },
    { key: 'fps',      type: 'number', default: 24,        label: 'FPS',      min: 1, max: 99    },
    { key: 'duration', type: 'number', default: 10,        label: 'Duration', min: 0.1           },
    { key: 'bgColor',  type: 'color',  default: [0, 0, 0], label: 'Background'                   }
  ],

  onDrop: function(nodeData) {
    return {
      action: 'createComp',
      params: {
        nodeUUID: nodeData.id,
        label:    nodeData.props.label,
        width:    nodeData.props.width,
        height:   nodeData.props.height,
        fps:      nodeData.props.fps,
        duration: nodeData.props.duration,
        bgColor:  nodeData.props.bgColor
      }
    };
  },

  onAlive: function(nodeData, hostingCompUUID) {
    return {
      action: 'addCompAsLayer',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID
      }
    };
  },

  onGhost: function(nodeData, hostingCompUUID) {
    return {
      action: 'parkLayer',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID
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
        nodeUUID: nodeData.id,
        key:      key,
        value:    value
      }
    };
  }

};

nodeRegistry.register(CompNode);
