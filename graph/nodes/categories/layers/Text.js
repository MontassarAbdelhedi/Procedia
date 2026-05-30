// graph/nodes/categories/layers/Text.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var TextNode = {
  type:     'layers/text',
  label:    'Text',
  category: 'Layers',
  version:  '1.0.0',
  nodeKind: 'affected',
  dedicated: false,

  ports: [
    { id: 'output',    category: 'output', type: 'layer', capacity: 'single' },
    { id: 'child_of',  category: 'parent', role: 'child',  type: 'parent'  },
    { id: 'parent_of', category: 'parent', role: 'parent', type: 'parent'  }
  ],

  params: [
    { key: 'label',    type: 'string',  default: 'Text',      label: 'Label'                        },
    { key: 'content',  type: 'string',  default: 'New Text',  label: 'Content'                      },
    { key: 'fontSize', type: 'number',  default: 72,          label: 'Font Size', min: 1, max: 999  },
    { key: 'color',    type: 'color',   default: [1, 1, 1, 1], label: 'Color'                       },
    { key: 'position', type: 'vector2', default: [0, 0],      label: 'Position'                     },
    { key: 'rotation', type: 'number',  default: 0,           label: 'Rotation'                     },
    { key: 'opacity',  type: 'number',  default: 100,         label: 'Opacity',   min: 0, max: 100  }
  ],

  onDrop: function(nodeData) {
    return null;
  },

  onAlive: function(nodeData, hostingCompUUID) {
    return {
      action: 'createTextLayer',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        content:         nodeData.props.content,
        fontSize:        nodeData.props.fontSize,
        color:           nodeData.props.color,
        position:        nodeData.props.position,
        rotation:        nodeData.props.rotation,
        opacity:         nodeData.props.opacity,
        label:           nodeData.props.label
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
      action: 'deleteParkedLayer',
      params: {
        nodeUUID: nodeData.id
      }
    };
  },

  onPropertyChange: function(key, value, nodeData, hostingCompUUID) {
    return {
      action: 'setLayerProperty',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        key:             key,
        value:           value
      }
    };
  }
};

nodeRegistry.register(TextNode);
