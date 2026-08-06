/**
 * @file Cloner node definition (instances/cloner).
 * Creates visual clones of a source layer inside a Procedia-managed internal comp.
 * Clone transforms are computed from mode + properties; force field input drives
 * per-instance transformation offsets.
 * Ports: main_input (layer, required), field (secondaryInput), output (layer).
 * Params: mode + mode-specific sub-params (21 total + label).
 * Dispatches: createCloner, removeCloner, updateCloner.
 */

// graph/nodes/categories/Instances/Cloner.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var ClonerNode = {
  type:     'instances/cloner',
  label:    'Cloner',
  category: 'Instances',
  version:  '1.0.0',
  nodeKind: 'effector',
  dedicated: false,

  ports: [
    { id: 'main_input', category: 'mainInput',      type: 'layer', required: true },
    { id: 'field',      category: 'secondaryInput',  type: 'field'                },
    { id: 'output',     category: 'output',          type: 'layer'                }
  ],

  params: [
    { key: 'mode', type: 'enum', default: 'Linear', label: 'Mode',
      options: ['Linear', 'Radial', 'Grid'] },

    // Linear mode
    { key: 'linear_count',   type: 'number',  default: 3,        label: 'Count',             min: 1, max: 999,   enableWhen: { key: 'mode', value: 'Linear' } },
    { key: 'linear_offset',  type: 'vector2', default: [100, 0],  label: 'Offset (px)',                            enableWhen: { key: 'mode', value: 'Linear' } },
    { key: 'linear_3d',      type: 'boolean', default: false,     label: '3D Mode',                                 enableWhen: { key: 'mode', value: 'Linear' } },
    { key: 'linear_inc_pos', type: 'vector2', default: [0, 0],    label: 'Inc Position',                            enableWhen: { key: 'mode', value: 'Linear' } },
    { key: 'linear_inc_scl', type: 'vector2', default: [0, 0],    label: 'Inc Scale',                               enableWhen: { key: 'mode', value: 'Linear' } },
    { key: 'linear_inc_rot', type: 'number',  default: 0,         label: 'Inc Rotation',                            enableWhen: { key: 'mode', value: 'Linear' } },
    { key: 'linear_inc_op',  type: 'number',  default: 0,         label: 'Inc Opacity',   min: -100, max: 100,      enableWhen: { key: 'mode', value: 'Linear' } },

    // Radial mode
    { key: 'radial_count',   type: 'number',  default: 6,         label: 'Count',           min: 1, max: 999,        enableWhen: { key: 'mode', value: 'Radial' } },
    { key: 'radial_radius',  type: 'number',  default: 200,       label: 'Radius',           min: 0,                 enableWhen: { key: 'mode', value: 'Radial' } },
    { key: 'radial_start',   type: 'number',  default: 0,         label: 'Start Angle',                              enableWhen: { key: 'mode', value: 'Radial' } },
    { key: 'radial_end',     type: 'number',  default: 360,       label: 'End Angle',                                enableWhen: { key: 'mode', value: 'Radial' } },
    { key: 'radial_offset',  type: 'vector2', default: [0, 0],    label: 'Offset',                                   enableWhen: { key: 'mode', value: 'Radial' } },

    // Grid mode
    { key: 'grid_3d',        type: 'boolean', default: false,     label: '3D Mode',                                  enableWhen: { key: 'mode', value: 'Grid' } },
    { key: 'grid_count_x',   type: 'number',  default: 3,         label: 'Count X',         min: 1, max: 999,        enableWhen: { key: 'mode', value: 'Grid' } },
    { key: 'grid_count_y',   type: 'number',  default: 3,         label: 'Count Y',         min: 1, max: 999,        enableWhen: { key: 'mode', value: 'Grid' } },
    { key: 'grid_count_z',   type: 'number',  default: 1,         label: 'Count Z',         min: 1, max: 999,        enableWhen: { key: 'mode', value: 'Grid' } },
    { key: 'grid_distance',  type: 'vector2', default: [150, 150], label: 'Distance',                                 enableWhen: { key: 'mode', value: 'Grid' } },

    { key: 'label', type: 'string', default: 'Cloner', label: 'Label' }
  ],

  getParams: function(nodeData) {
    return this.params;
  },

  /** @return {null} No AE action on drop — cloner activates when wired through a comp. */
  onDrop: function(nodeData) {
    return null;
  },

  /**
   * Creates the cloner's internal comp, clones the source layer, and hosts it.
   * @param {Object} nodeData
   * @param {string} hostingCompUUID
   * @param {string} upstreamNodeUUID — terminal wire UUID of the source layer
   * @return {Object} createCloner action
   */
  onAlive: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'createCloner',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,
        mode:            nodeData.props.mode,
        props:           nodeData.props
      }
    };
  },

  /**
   * Removes the pre-comp layer, recovers the source layer, deletes the internal comp.
   * @param {Object} nodeData
   * @param {string} hostingCompUUID
   * @param {string} upstreamNodeUUID
   * @return {Object} removeCloner action
   */
  onGhost: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'removeCloner',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID
      }
    };
  },

  /** @return {null} No AE action — source layer handled by ghost cascade. */
  onDelete: function(nodeData) {
    return null;
  },

  /**
   * Updates clone transforms when a property changes. Reads stored JSON,
   * recomputes, applies deltas — no full rebuild.
   * @param {string} key — param key that changed
   * @param {*} value — new value
   * @param {Object} nodeData
   * @param {string} hostingCompUUID
   * @param {string} upstreamNodeUUID
   * @return {Object} updateCloner action
   */
  onPropertyChange: function(key, value, nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'updateCloner',
      params: {
        nodeUUID:  nodeData.id,
        key:       key,
        value:     value,
        mode:      nodeData.props.mode,
        props:     nodeData.props
      }
    };
  }
};

nodeRegistry.register(ClonerNode);
