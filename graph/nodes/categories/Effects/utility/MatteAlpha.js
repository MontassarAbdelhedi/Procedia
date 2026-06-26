/**
 * @file Alpha Matte utility node definition (utility/matte-alpha).
 * Sets or clears an alpha matte on a layer using the upstream layer as the matte source.
 * Ports: mainInput (layer, required), output (layer).
 * Params: label, invert (boolean).
 * Dispatches: setAlphaMatte, clearMatte, setLayerProperty.
 */

// graph/nodes/categories/Effects/utility/MatteAlpha.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var MatteAlphaNode = {
  type:      'utility/matte-alpha',
  label:     'Alpha Matte',
  category:  'Utility',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,

  ports: [
    { id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true },
    { id: 'output',     category: 'output',    type: 'layer', capacity: 'single' }
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
   * Sets the upstream layer as an alpha matte on the host layer.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @param {string} upstreamNodeUUID - UUID of the layer to use as the matte source.
   * @return {Object} Action to set an alpha matte in AE.
   */
  onAlive: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'setAlphaMatte',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        topLayerUUID:    upstreamNodeUUID,
        invert:          nodeData.props.invert
      }
    };
  },

  /**
   * Clears the alpha matte from the upstream layer.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @param {string} upstreamNodeUUID - UUID of the layer to clear the matte from.
   * @return {Object} Action to clear a matte in AE.
   */
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

  /** @return {null} No AE action on delete — matte is cleared via onGhost first. */
  onDelete: function(nodeData) { return null; },

  /**
   * Updates the invert property on the alpha matte in AE.
   * @param {string} key - The property key to update.
   * @param {*} value - The new property value.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @param {string} upstreamNodeUUID - UUID of the layer owning the matte.
   * @return {Object} Action to set a layer property in AE.
   */
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

nodeRegistry.register(MatteAlphaNode);
