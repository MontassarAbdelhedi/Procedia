/**
 * @file Effect node metadata for category "Channel".
 * @constant {Object<string,Object>} - Entry map keyed by node type.
 */
(function() {
  var NODE_METADATA = window.NODE_METADATA;
  if (!NODE_METADATA) { NODE_METADATA = window.NODE_METADATA = {}; }
  var entries = {
  "channel/arithmetic": {
    "type": "channel/arithmetic",
    "label": "Arithmetic",
    "category": "Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Arithmetic",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "channel/blend": {
    "type": "channel/blend",
    "label": "Blend",
    "category": "Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Blend",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "channel/calculations": {
    "type": "channel/calculations",
    "label": "Calculations",
    "category": "Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Calculations",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "channel/channel-combiner": {
    "type": "channel/channel-combiner",
    "label": "Channel Combiner",
    "category": "Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Channel Combiner",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "channel/compound-arithmetic": {
    "type": "channel/compound-arithmetic",
    "label": "Compound Arithmetic",
    "category": "Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Compound Arithmetic",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "channel/cs-composite": {
    "type": "channel/cs-composite",
    "label": "CS Composite",
    "category": "Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CS Composite",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "channel/invert": {
    "type": "channel/invert",
    "label": "Invert",
    "category": "Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Invert",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "channel/minimax": {
    "type": "channel/minimax",
    "label": "Minimax",
    "category": "Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Minimax",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "channel/remove-color-matting": {
    "type": "channel/remove-color-matting",
    "label": "Remove Color Matting",
    "category": "Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Remove Color Matting",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "channel/set-channels": {
    "type": "channel/set-channels",
    "label": "Set Channels",
    "category": "Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Set Channels",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "channel/set-matte-3": {
    "type": "channel/set-matte-3",
    "label": "Set Matte 3",
    "category": "Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Set Matte3",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "channel/shift-channels": {
    "type": "channel/shift-channels",
    "label": "Shift Channels",
    "category": "Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Shift Channels",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "channel/solid-composite": {
    "type": "channel/solid-composite",
    "label": "Solid Composite",
    "category": "Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Solid Composite",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  }
};
  for (var key in entries) {
    NODE_METADATA[key] = entries[key];
    if (typeof nodeRegistry !== 'undefined' && nodeRegistry.registerStub) nodeRegistry.registerStub(entries[key]);
  }
})();
