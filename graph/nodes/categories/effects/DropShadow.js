// graph/nodes/categories/effects/DropShadow.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: graph/cycleChecker.js

var DropShadowNode = {
  type:      'effects/drop-shadow',
  label:     'Drop Shadow',
  category:  'Effects',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,

  ports: [
    { id: 'layer_in', category: 'input',  type: 'layer', extendable: true,  required: true  },
    { id: 'output',   category: 'output', type: 'layer', extendable: false }
  ],

  params: [
    { key: 'label',     type: 'string', default: 'Drop Shadow', label: 'Label'                         },
    { key: 'color',     type: 'color',  default: [0, 0, 0, 1],  label: 'Color'                         },
    { key: 'opacity',   type: 'number', default: 75,            label: 'Opacity',   min: 0, max: 100   },
    { key: 'direction', type: 'number', default: 135,           label: 'Direction', min: 0, max: 360   },
    { key: 'distance',  type: 'number', default: 5,             label: 'Distance',  min: 0, max: 30000 },
    { key: 'softness',  type: 'number', default: 5,             label: 'Softness',  min: 0, max: 30000 }
  ],

  onDrop: function(nodeData) {
    return null;
  },

  onAlive: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'applyEffect',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,
        matchName:       'ADBE Drop Shadow',
        props: {
          color:     nodeData.props.color,
          opacity:   nodeData.props.opacity,
          direction: nodeData.props.direction,
          distance:  nodeData.props.distance,
          softness:  nodeData.props.softness
        }
      }
    };
  },

  onGhost: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'removeEffect',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID
      }
    };
  },

  onDelete: function(nodeData) {
    if (nodeData.state === 'ghost') return null;
    return {
      action: 'removeEffect',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: nodeData.hostingComps[0] || null,
        layerNodeUUID:   null
      }
    };
  },

  onPropertyChange: function(key, value, nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'setEffectProperty',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,
        matchName:       'ADBE Drop Shadow',
        key:             key,
        value:           value
      }
    };
  }
};

nodeRegistry.register(DropShadowNode);
