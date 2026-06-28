/**
 * @file Effect node metadata for category "Perspective".
 * @constant {Object<string,Object>} - Entry map keyed by node type.
 */
(function() {
  var NODE_METADATA = window.NODE_METADATA;
  if (!NODE_METADATA) { NODE_METADATA = window.NODE_METADATA = {}; }
  var entries = {
  "perspective/3d-glasses-2": {
    "type": "perspective/3d-glasses-2",
    "label": "3D Glasses 2",
    "category": "Perspective",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE 3D Glasses2",
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
  "perspective/3d-tracker": {
    "type": "perspective/3d-tracker",
    "label": "3D Tracker",
    "category": "Perspective",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE 3D Tracker",
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
  "perspective/bevel-alpha": {
    "type": "perspective/bevel-alpha",
    "label": "Bevel Alpha",
    "category": "Perspective",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Bevel Alpha",
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
  "perspective/bevel-edges": {
    "type": "perspective/bevel-edges",
    "label": "Bevel Edges",
    "category": "Perspective",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Bevel Edges",
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
  "perspective/cc-cylinder": {
    "type": "perspective/cc-cylinder",
    "label": "CC Cylinder",
    "category": "Perspective",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Cylinder",
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
  "perspective/cc-environment": {
    "type": "perspective/cc-environment",
    "label": "CC Environment",
    "category": "Perspective",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Environment",
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
  "perspective/cc-sphere": {
    "type": "perspective/cc-sphere",
    "label": "CC Sphere",
    "category": "Perspective",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Sphere",
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
  "perspective/cc-spotlight": {
    "type": "perspective/cc-spotlight",
    "label": "CC Spotlight",
    "category": "Perspective",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Spotlight",
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
  "perspective/drop-shadow": {
    "type": "perspective/drop-shadow",
    "label": "Drop Shadow",
    "category": "Perspective",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Drop Shadow",
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
  "perspective/radial-shadow": {
    "type": "perspective/radial-shadow",
    "label": "Radial Shadow",
    "category": "Perspective",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Radial Shadow",
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
