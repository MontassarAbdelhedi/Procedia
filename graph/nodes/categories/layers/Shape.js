// graph/nodes/categories/layers/Shape.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var ShapeNode = {

  type:     'layers/shape',
  label:    'Shape',
  category: 'Layers',
  version:  '1.0.0',

  nodeKind:  'affected',
  dedicated: false,

  ports: [
    { id: 'output',    category: 'output', type: 'layer', extendable: false },
    { id: 'child_of',  category: 'parent', role: 'child',  type: 'parent'  },
    { id: 'parent_of', category: 'parent', role: 'parent', type: 'parent'  }
  ],

  params: [
    { key: 'label',    type: 'string',  default: 'Shape',    label: 'Label'                       },
    { key: 'position', type: 'vector2', default: [0, 0],     label: 'Position'                    },
    { key: 'rotation', type: 'number',  default: 0,          label: 'Rotation'                    },
    { key: 'opacity',  type: 'number',  default: 100,        label: 'Opacity',   min: 0, max: 100 },
    { key: 'scale',    type: 'vector2', default: [100, 100], label: 'Scale'                       }
  ],

  onDrop: function(nodeData) {
    return null;
  },

  onAlive: function(nodeData, hostingCompUUID) {
    return {
      action: 'createShapeLayer',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        position:        nodeData.props.position,
        rotation:        nodeData.props.rotation,
        opacity:         nodeData.props.opacity,
        scale:           nodeData.props.scale,
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

nodeRegistry.register(ShapeNode);
