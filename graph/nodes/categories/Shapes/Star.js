/**
 * @file Star shape node definition (shapes/star).
 * A star shape layer with points, radii, roundness, fill, stroke, transform.
 * Ports: output (layer), secondaryInput (data) for each param, child_of/parent_of (parent).
 * Params: label, points, outerRadius, innerRadius, roundness, fill, stroke, position, rotation, scale, opacity.
 * Dispatches: createStarLayer, parkLayer, deleteParkedLayer, setLayerProperty.
 */

// graph/nodes/categories/Shapes/Star.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var StarNode = {
  type:     'shapes/star',
  label:    'Star',
  category: 'Shapes',
  version:  '1.0.0',
  nodeKind: 'affected',
  dedicated: false,

  ports: [
    { id: 'output',        category: 'output',         type: 'layer', capacity: 'single' },
    { id: 'child_of',      category: 'parent',         role: 'child',  type: 'parent', capacity: 'single' },
    { id: 'parent_of',     category: 'parent',         role: 'parent', type: 'parent' },
    { id: 'points',        category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Points' },
    { id: 'outerRadius',   category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Outer Radius' },
    { id: 'innerRadius',   category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Inner Radius' },
    { id: 'roundness',     category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Roundness' },
    { id: 'fill',          category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Fill' },
    { id: 'stroke',        category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Stroke' },
    { id: 'position',      category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Position' },
    { id: 'rotation',      category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Rotation' },
    { id: 'scale',         category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Scale' },
    { id: 'opacity',       category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Opacity' }
  ],

  params: [
    { key: 'label',       type: 'string',  default: 'Star',                label: 'Label' },
    { key: 'points',      type: 'number',  default: 5,                     label: 'Points',      min: 3, max: 64,       animatable: true },
    { key: 'outerRadius', type: 'number',  default: 100,                   label: 'Outer Radius', min: 1,                animatable: true },
    { key: 'innerRadius', type: 'number',  default: 40,                    label: 'Inner Radius', min: 1,                animatable: true },
    { key: 'roundness',   type: 'number',  default: 0,                     label: 'Roundness',    min: 0,                animatable: true },
    { key: 'fill',        type: 'color',   default: [1, 1, 1, 1],         label: 'Fill',                               animatable: true },
    { key: 'stroke',      type: 'color',   default: [0, 0, 0, 0],         label: 'Stroke',                             animatable: true },
    { key: 'position',    type: 'vector2', default: [960, 540],            label: 'Position',                           animatable: true },
    { key: 'rotation',    type: 'number',  default: 0,                     label: 'Rotation',                           animatable: true },
    { key: 'scale',       type: 'vector2', default: [100, 100],            label: 'Scale',                              animatable: true },
    { key: 'opacity',     type: 'number',  default: 100,                   label: 'Opacity', min: 0, max: 100,         animatable: true }
  ],

  getParams: function(nodeData) {
    return this.params;
  },

  onDrop: function(nodeData) { return null; },

  onAlive: function(nodeData, hostingCompUUID) {
    return {
      action: 'createStarLayer',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        points:          nodeData.props.points,
        outerRadius:     nodeData.props.outerRadius,
        innerRadius:     nodeData.props.innerRadius,
        roundness:       nodeData.props.roundness,
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
    return {
      action: 'setLayerProperty',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        key:             key,
        value:           value
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

nodeRegistry.register(StarNode);
