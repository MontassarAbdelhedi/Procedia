/**
 * @file Camera layer node definition (layers/camera).
 * A camera layer that views the comp from a perspective.
 * Ports: output (layer), child_of/parent_of (parent).
 * Params: label, position, rotation, opacity, zoom, depthOfField, focusDistance, aperture, blurLevel.
 * Dispatches: createCameraLayer, parkLayer, deleteParkedLayer, setLayerProperty.
 */

// graph/nodes/categories/Layers/Camera.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var CameraNode = {
  type:     'layers/camera',
  label:    'Camera',
  category: 'Layers',
  version:  '1.0.0',
  nodeKind: 'affected',
  dedicated: false,

  ports: [
    { id: 'output',    category: 'output', type: 'layer', capacity: 'single' },
    { id: 'child_of',  category: 'parent', role: 'child',  type: 'parent', capacity: 'single'  },
    { id: 'parent_of', category: 'parent', role: 'parent', type: 'parent'  }
  ],

  params: [
    { key: 'label',        type: 'string',  default: 'Camera',                        label: 'Label'                       },
    { key: 'position',     type: 'vector3', default: [0, 0, 0],                      label: 'Position',                    animatable: true },
    { key: 'rotation',     type: 'number',  default: 0,                              label: 'Rotation',                    animatable: true },
    { key: 'opacity',      type: 'number',  default: 100,            min: 0, max: 100, label: 'Opacity',                     animatable: true },
    { key: 'zoom',         type: 'number',  default: 960,            min: 1, max: 10000, label: 'Zoom',                        animatable: true },
    { key: 'depthOfField', type: 'boolean', default: false,                             label: 'Depth of Field'              },
    { key: 'focusDistance',type: 'number',  default: 200,           min: 0, max: 10000, label: 'Focus Distance',               animatable: true },
    { key: 'aperture',     type: 'number',  default: 5,             min: 0.1, max: 500, label: 'Aperture',                     animatable: true },
    { key: 'blurLevel',    type: 'number',  default: 100,           min: 0, max: 100,   label: 'Blur Level',                   animatable: true }
  ],

  getParams: function(nodeData) {
    return this.params;
  },

  /** @return {null} No AE action on initial drop — layer is created onAlive. */
  onDrop: function(nodeData) {
    return null;
  },

  /**
   * Creates the camera layer in the hosting composition.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @return {Object} Action to create a camera layer in AE.
   */
  onAlive: function(nodeData, hostingCompUUID) {
    return {
      action: 'createCameraLayer',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        position:        nodeData.props.position,
        rotation:        nodeData.props.rotation,
        opacity:         nodeData.props.opacity,
        zoom:            nodeData.props.zoom,
        depthOfField:    nodeData.props.depthOfField,
        focusDistance:   nodeData.props.focusDistance,
        aperture:        nodeData.props.aperture,
        blurLevel:       nodeData.props.blurLevel,
        label:           nodeData.props.label
      }
    };
  },

  /**
   * Parks (removes from comp but retains) the camera layer.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @return {Object} Action to park a layer in AE.
   */
  onGhost: function(nodeData, hostingCompUUID) {
    return {
      action: 'parkLayer',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID
      }
    };
  },

  /**
   * Deletes the previously parked camera layer.
   * @param {Object} nodeData - The full node data object.
   * @return {Object} Action to delete a parked layer in AE.
   */
  onDelete: function(nodeData) {
    return {
      action: 'deleteParkedLayer',
      params: {
        nodeUUID: nodeData.id
      }
    };
  },

  /**
   * Updates a property on the camera layer in AE.
   * @param {string} key - The property key to update.
   * @param {*} value - The new property value.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @return {Object} Action to set a layer property in AE.
   */
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

nodeRegistry.register(CameraNode);
