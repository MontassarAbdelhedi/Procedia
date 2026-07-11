/**
 * @file Alpha Matte utility node definition (utility/matte-alpha).
 * Sets or clears an alpha matte on a foreground layer using the matte layer as the mask source.
 * Ports: top_layer (Foreground, required), matte_layer (Matte, required), output (layer).
 * Params: label, invert (boolean).
 * Dispatches: setAlphaMatte, clearMatte, setLayerProperty.
 */

// graph/nodes/categories/Effects/utility/MatteAlpha.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var MatteAlphaNode = {
  type:      'utility/matte-alpha',
  label:     'Alpha Matte',
  category:  'Track Matte',
  version:   '1.0.0',
  nodeKind:  'matte',
  dedicated: false,

  ports: [
    { id: 'top_layer',   category: 'mainInput',      type: 'layer', capacity: 'single', required: true, label: 'Foreground' },
    { id: 'matte_layer', category: 'secondaryInput',  type: 'layer', capacity: 'single', required: true, label: 'Matte' },
    { id: 'output',      category: 'output',          type: 'layer', capacity: 'single' }
  ],

  params: [
    { key: 'label',  type: 'string',  default: 'Alpha Matte', label: 'Label' },
    { key: 'invert', type: 'boolean', default: false,          label: 'Invert' }
  ],

  getParams: function(nodeData) {
    return this.params;
  },

  /** @return {null} No AE action on initial drop — matte is applied onAlive. */
  onDrop: function(nodeData) { return null; },

  /**
   * Sets the foreground layer's track matte to the matte layer with alpha.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @param {string} topUUID - UUID of the foreground layer.
   * @param {string} matteUUID - UUID of the matte layer.
   * @return {Object} Action to set an alpha matte in AE.
   */
  onAlive: function(nodeData, hostingCompUUID, topUUID, matteUUID) {
    return {
      action: 'setAlphaMatte',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        topLayerUUID:    topUUID,
        matteLayerUUID:  matteUUID,
        invert:          nodeData.props.invert
      }
    };
  },

  /**
   * Clears the alpha matte from the foreground layer.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @param {string} topUUID - UUID of the foreground layer.
   * @return {Object} Action to clear a matte in AE.
   */
  onGhost: function(nodeData, hostingCompUUID, topUUID) {
    return {
      action: 'clearMatte',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        topLayerUUID:    topUUID
      }
    };
  },

  /** @return {null} No AE action on delete — matte is cleared via onGhost first. */
  onDelete: function(nodeData) { return null; },

  /**
   * Updates the invert property on the alpha matte in AE.
   * @param {string} key - The property key to update.
   * @param {*} value - The new property value.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @param {string} topUUID - UUID of the foreground layer.
   * @param {string} matteUUID - UUID of the matte layer (unused for property changes).
   * @return {Object} Action to set a layer property in AE.
   */
  onPropertyChange: function(key, value, nodeData, hostingCompUUID, topUUID, matteUUID) {
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

nodeRegistry.register(MatteAlphaNode);
