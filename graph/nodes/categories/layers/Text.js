/**
 * @file Text layer node definition (layers/text).
 * A text layer with content, font, color, and transform properties.
 * Ports: output (layer), child_of/parent_of (parent).
 * Params: label, content, fontSize, color, position, rotation, opacity.
 * Dispatches: createTextLayer, parkLayer, deleteParkedLayer, setLayerProperty.
 */

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

  /** @return {null} No AE action on initial drop — layer is created onAlive. */
  onDrop: function(nodeData) {
    return null;
  },

  /**
   * Creates the text layer in the hosting composition.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @return {Object} Action to create a text layer in AE.
   */
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

  /**
   * Parks (removes from comp but retains) the text layer.
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
   * Deletes the previously parked text layer.
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
   * Updates a property on the text layer in AE.
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

nodeRegistry.register(TextNode);
