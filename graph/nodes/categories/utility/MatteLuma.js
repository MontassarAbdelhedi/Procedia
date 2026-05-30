// graph/nodes/categories/utility/MatteLuma.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var MatteLumaNode = {
  type:      'utility/matte-luma',
  label:     'Luma Matte',
  category:  'Utility',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,

  ports: [
    { id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true },
    { id: 'output',     category: 'output',    type: 'layer', capacity: 'single' }
  ],

  params: [
    { key: 'label',  type: 'string',  default: 'Luma Matte', label: 'Label' },
    { key: 'invert', type: 'boolean', default: false,          label: 'Invert' }
  ],

  onDrop: function(nodeData) { return null; },

  onAlive: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'setLumaMatte',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        topLayerUUID:    upstreamNodeUUID,
        invert:          nodeData.props.invert
      }
    };
  },

  onGhost: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'clearMatte',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        topLayerUUID:    upstreamNodeUUID
      }
    };
  },

  onDelete: function(nodeData) { return null; },

  onPropertyChange: function(key, value, nodeData, hostingCompUUID, upstreamNodeUUID) {
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

nodeRegistry.register(MatteLumaNode);
