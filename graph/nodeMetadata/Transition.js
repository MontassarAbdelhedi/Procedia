/**
 * @file Effect node metadata for category "Transition".
 * @constant {Object<string,Object>} - Entry map keyed by node type.
 */
(function() {
  var NODE_METADATA = window.NODE_METADATA;
  if (!NODE_METADATA) { NODE_METADATA = window.NODE_METADATA = {}; }
  var entries = {
  "transition/apc-card-wipe-cam": {
    "type": "transition/apc-card-wipe-cam",
    "label": "APC Card Wipe Cam",
    "category": "Transition",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "APC CardWipeCam",
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
  "transition/block-dissolve": {
    "type": "transition/block-dissolve",
    "label": "Block Dissolve",
    "category": "Transition",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Block Dissolve",
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
  "transition/cc-glass-wipe": {
    "type": "transition/cc-glass-wipe",
    "label": "CC Glass Wipe",
    "category": "Transition",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Glass Wipe",
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
  "transition/cc-grid-wipe": {
    "type": "transition/cc-grid-wipe",
    "label": "CC Grid Wipe",
    "category": "Transition",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Grid Wipe",
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
  "transition/cc-image-wipe": {
    "type": "transition/cc-image-wipe",
    "label": "CC Image Wipe",
    "category": "Transition",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Image Wipe",
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
  "transition/cc-jaws": {
    "type": "transition/cc-jaws",
    "label": "CC Jaws",
    "category": "Transition",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Jaws",
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
  "transition/cc-light-wipe": {
    "type": "transition/cc-light-wipe",
    "label": "CC Light Wipe",
    "category": "Transition",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Light Wipe",
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
  "transition/cc-radial-scale-wipe": {
    "type": "transition/cc-radial-scale-wipe",
    "label": "CC Radial ScaleWipe",
    "category": "Transition",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Radial ScaleWipe",
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
  "transition/cc-scale-wipe": {
    "type": "transition/cc-scale-wipe",
    "label": "CC Scale Wipe",
    "category": "Transition",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Scale Wipe",
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
  "transition/cc-twister": {
    "type": "transition/cc-twister",
    "label": "CC Twister",
    "category": "Transition",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Twister",
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
  "transition/cc-warpo-matic": {
    "type": "transition/cc-warpo-matic",
    "label": "CC WarpoMatic",
    "category": "Transition",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC WarpoMatic",
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
  "transition/cs-line-sweep": {
    "type": "transition/cs-line-sweep",
    "label": "CS LineSweep",
    "category": "Transition",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CS LineSweep",
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
  "transition/gradient-wipe": {
    "type": "transition/gradient-wipe",
    "label": "Gradient Wipe",
    "category": "Transition",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Gradient Wipe",
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
  "transition/iris-wipe": {
    "type": "transition/iris-wipe",
    "label": "Iris Wipe",
    "category": "Transition",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE IRIS_WIPE",
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
  "transition/linear-wipe": {
    "type": "transition/linear-wipe",
    "label": "Linear Wipe",
    "category": "Transition",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Linear Wipe",
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
  "transition/radial-wipe": {
    "type": "transition/radial-wipe",
    "label": "Radial Wipe",
    "category": "Transition",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Radial Wipe",
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
  "transition/venetian-blinds": {
    "type": "transition/venetian-blinds",
    "label": "Venetian Blinds",
    "category": "Transition",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Venetian Blinds",
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
