/**
 * graph/engine/effectNodeFactory.js
 *
 * Generates full node definitions for effect nodes from minimal metadata stubs.
 * This eliminates the need to load 460+ individual effect node JS files at startup.
 * All effect nodes share the same lifecycle methods — the only variable is matchName.
 *
 * Dependencies: (none)
 * Load before: graph/engine/nodes/dropNode.js, graph/engine/helpers.js
 */

var effectNodeFactory = (function() {

  var STD_PORTS = [
    { id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true },
    { id: 'output',     category: 'output',    type: 'layer', capacity: 'single' }
  ];

  function upgradeStub(stub) {
    var matchName = stub.matchName;

    return {
      type:      stub.type,
      label:     stub.label,
      category:  stub.category,
      version:   stub.version || '1.0.0',
      nodeKind:  stub.nodeKind || 'effector',
      dedicated: stub.dedicated === true,
      matchName: matchName,
      params:    'dynamic',

      ports: STD_PORTS,

      getParams: function(nodeData) {
        if (!nodeData.dynamicSchema || !nodeData.dynamicSchema.properties) return null;
        var dyn = [];
        var props = nodeData.dynamicSchema.properties;
        for (var i = 0; i < props.length; i++) {
          var p = props[i];
          var param = {
            key:   p.matchName,
            label: p.label || p.matchName,
            type:  p.type
          };
          if (p.options) param.options = p.options;
          if (p.enableWhen) param.enableWhen = p.enableWhen;
          dyn.push(param);
        }
        return dyn;
      },

      onDrop: function(nodeData) { return null; },

      onAlive: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
        return {
          action: 'applyDynamicEffect',
          params: {
            nodeUUID:        nodeData.id,
            hostingCompUUID: hostingCompUUID,
            layerNodeUUID:   upstreamNodeUUID,
            matchName:       matchName,
            props:           nodeData.props
          }
        };
      },

      onGhost: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
        return {
          action: 'removeEffect',
          params: {
            nodeUUID:        nodeData.id,
            hostingCompUUID: hostingCompUUID,
            layerNodeUUID:   upstreamNodeUUID,
            matchName:       matchName
          }
        };
      },

      onDelete: function(nodeData) { return null; },

      onPropertyChange: function(key, value, nodeData, hostingCompUUID, upstreamNodeUUID) {
        return {
          action: 'setEffectProperty',
          params: {
            nodeUUID:        nodeData.id,
            hostingCompUUID: hostingCompUUID,
            layerNodeUUID:   upstreamNodeUUID,
            effectMatchName: matchName,
            propMatchName:   key,
            value:           value
          }
        };
      }
    };
  }

  function isEffectNode(def) {
    return def && def.params === 'dynamic';
  }

  return {
    upgradeStub: upgradeStub,
    isEffectNode: isEffectNode
  };

})();
