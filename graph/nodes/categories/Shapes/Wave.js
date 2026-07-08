/**
 * @file Wave shape node definition (shapes/wave).
 * A parametric wave shape layer with amplitude, frequency, width, height, fill, stroke, transform.
 * Ports: output (layer), secondaryInput (data) for each param, child_of/parent_of (parent).
 * Params: label, width, height, amplitude, frequency, fill, stroke, position, rotation, scale, opacity.
 * Dispatches: createWaveLayer, parkLayer, deleteParkedLayer, setLayerProperty.
 */

// graph/nodes/categories/Shapes/Wave.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var WaveNode = {
  type:     'shapes/wave',
  label:    'Wave',
  category: 'Shapes',
  version:  '1.0.0',
  nodeKind: 'affected',
  dedicated: false,

  ports: [
    { id: 'output',        category: 'output',         type: 'layer', capacity: 'single' },
    { id: 'child_of',      category: 'parent',         role: 'child',  type: 'parent', capacity: 'single' },
    { id: 'parent_of',     category: 'parent',         role: 'parent', type: 'parent' },
    { id: 'width',         category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Width' },
    { id: 'height',        category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Height' },
    { id: 'amplitude',     category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Amplitude' },
    { id: 'frequency',     category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Frequency' },
    { id: 'fill',          category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Fill' },
    { id: 'stroke',        category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Stroke' },
    { id: 'position',      category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Position' },
    { id: 'rotation',      category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Rotation' },
    { id: 'scale',         category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Scale' },
    { id: 'opacity',       category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Opacity' }
  ],

  params: [
    { key: 'label',      type: 'string',  default: 'Wave',               label: 'Label' },
    { key: 'width',      type: 'number',  default: 300,                   label: 'Width',        min: 1,             animatable: true },
    { key: 'height',     type: 'number',  default: 100,                   label: 'Height',       min: 1,             animatable: true },
    { key: 'amplitude',  type: 'number',  default: 30,                    label: 'Amplitude',    min: 0,             animatable: true },
    { key: 'frequency',  type: 'number',  default: 3,                     label: 'Frequency',    min: 1,             animatable: true },
    { key: 'fill',       type: 'color',   default: [1, 1, 1, 1],         label: 'Fill',                              animatable: true },
    { key: 'stroke',     type: 'color',   default: [0, 0, 0, 0],         label: 'Stroke',                            animatable: true },
    { key: 'position',   type: 'vector2', default: [960, 540],            label: 'Position',                          animatable: true },
    { key: 'rotation',   type: 'number',  default: 0,                     label: 'Rotation',                          animatable: true },
    { key: 'scale',      type: 'vector2', default: [100, 100],            label: 'Scale',                             animatable: true },
    { key: 'opacity',    type: 'number',  default: 100,                   label: 'Opacity', min: 0, max: 100,        animatable: true }
  ],

  getParams: function(nodeData) {
    return this.params;
  },

  onDrop: function(nodeData) { return null; },

  onAlive: function(nodeData, hostingCompUUID) {
    return {
      action: 'createWaveLayer',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        width:           nodeData.props.width,
        height:          nodeData.props.height,
        amplitude:       nodeData.props.amplitude,
        frequency:       nodeData.props.frequency,
        fill:            nodeData.props.fill,
        stroke:          nodeData.props.stroke,
        position:        nodeData.props.position,
        rotation:        nodeData.props.rotation,
        scale:           nodeData.props.scale,
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
    if (['position', 'rotation', 'scale', 'opacity'].indexOf(key) !== -1) {
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
    return {
      action: 'createWaveLayer',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        width:           nodeData.props.width,
        height:          nodeData.props.height,
        amplitude:       nodeData.props.amplitude,
        frequency:       nodeData.props.frequency,
        fill:            nodeData.props.fill,
        stroke:          nodeData.props.stroke,
        label:           nodeData.props.label
      }
    };
  },

  onDisable: function(nodeData, hostingCompUUID) {
    if (!hostingCompUUID) return null;
    return {
      action: 'setLayerEnabled',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        enabled:         false
      }
    };
  },

  onEnable: function(nodeData, hostingCompUUID) {
    if (!hostingCompUUID) return null;
    return {
      action: 'setLayerEnabled',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        enabled:         true
      }
    };
  }
};

nodeRegistry.register(WaveNode);
