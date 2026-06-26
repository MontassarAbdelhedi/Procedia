/**
 * @file Rectangle shape node definition (shapes/rectangle).
 * A rectangle shape layer with size, roundness, fill, stroke, and transform properties.
 * Ports: output (layer), secondaryInput (data) for each param, child_of/parent_of (parent).
 * Params: label, width, height, roundness, roundCorners, fill, stroke, position, rotation, scale, opacity.
 * Dispatches: createRectangleLayer, parkLayer, deleteParkedLayer, setLayerProperty.
 */

// graph/nodes/categories/Shapes/Rectangle.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var RectangleNode = {
  type:     'shapes/rectangle',
  label:    'Rectangle',
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
    { id: 'roundness',     category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Roundness' },
    { id: 'roundCorners',  category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Round Corners' },
    { id: 'fill',          category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Fill' },
    { id: 'stroke',        category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Stroke' },
    { id: 'position',      category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Position' },
    { id: 'rotation',      category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Rotation' },
    { id: 'scale',         category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Scale' },
    { id: 'opacity',       category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Opacity' }
  ],

  params: [
    { key: 'label',        type: 'string',  default: 'Rectangle',            label: 'Label' },
    { key: 'width',        type: 'number',  default: 200,                    label: 'Width',        min: 0 },
    { key: 'height',       type: 'number',  default: 150,                    label: 'Height',       min: 0 },
    { key: 'roundness',    type: 'number',  default: 0,                      label: 'Roundness (px)', min: 0 },
    { key: 'roundCorners', type: 'boolean', default: false,                  label: 'Round Corners' },
    { key: 'fill',         type: 'color',   default: [1, 1, 1, 1],          label: 'Fill' },
    { key: 'stroke',       type: 'color',   default: [0, 0, 0, 0],          label: 'Stroke' },
    { key: 'position',     type: 'vector2', default: [960, 540],             label: 'Position' },
    { key: 'rotation',     type: 'number',  default: 0,                      label: 'Rotation' },
    { key: 'scale',        type: 'vector2', default: [100, 100],             label: 'Scale' },
    { key: 'opacity',      type: 'number',  default: 100,                    label: 'Opacity', min: 0, max: 100 }
  ],

  getParams: function(nodeData) {
    return this.params;
  },

  onDrop: function(nodeData) { return null; },

  onAlive: function(nodeData, hostingCompUUID) {
    return {
      action: 'createRectangleLayer',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        width:           nodeData.props.width,
        height:          nodeData.props.height,
        roundness:       nodeData.props.roundness,
        roundCorners:    nodeData.props.roundCorners,
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

nodeRegistry.register(RectangleNode);
